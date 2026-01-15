#!/usr/bin/env node
// noinspection DuplicatedCode

/**
 *  █████╗ ██████╗  █████╗ ███████╗
 * ██╔══██╗██╔══██╗██╔══██╗██╔════╝
 * ███████║██████╔╝███████║███████╗
 * ██╔══██║██╔══██╗██╔══██║╚════██║
 * ██║  ██║██║  ██║██║  ██║███████║
 * ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝
 *
 * Copyright (C) 2025 Rıza Emre ARAS <r.emrearas@proton.me>
 *
 * This file is part of ARTEK Homepage.
 *
 * ARTEK Homepage is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 *
 * Usage:
 *     npm run render4ai
 * Requirements:
 *     npm install -D @playwright/test js-yaml turndown
 *     npx playwright install chromium
 */

import { chromium } from '@playwright/test';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import yaml from 'js-yaml';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import pLimit from 'p-limit';

// Setup paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// scripts/utils/render4ai/ → scripts/utils/ → scripts/ → project root
const PROJECT_ROOT = join(__dirname, '..', '..', '..');
const CONFIG_PATH = join(__dirname, 'config.yaml');
const ROUTES_PATH = join(PROJECT_ROOT, 'routes.yaml');

// Path utilities
/**
 * Normalize route path by removing leading/trailing slashes
 * @param {string} route - Route path (e.g., '/', '/consultancy/', '/about')
 * @returns {string} - Normalized path ('index', 'consultancy', 'about')
 */
function normalizeRoutePath(route) {
  return route === '/' ? 'index' : route.replace(/^\/+|\/+$/g, '');
}

/**
 * Get relative path by removing base directory
 * @param {string} fullPath - Full path
 * @param {string} basePath - Base path to remove
 * @returns {string} - Relative path
 */
function getRelativePath(fullPath, basePath) {
  return fullPath.replace(basePath + '/', '');
}

/**
 * Extract locale from file path
 * @param {string} filePath - File path containing locale
 * @param {string[]} locales - Available locales
 * @returns {string} - Detected locale (or first locale as fallback)
 */
function extractLocaleFromPath(filePath, locales) {
  for (const locale of locales) {
    if (filePath.includes(`/${locale}/`)) {
      return locale;
    }
  }
  return locales[0]; // Fallback to first locale
}

// Logging utilities
const log = {
  info: (msg) => console.log(`\x1b[36m[RENDER4AI]\x1b[0m ${msg}`),
  success: (msg) => console.log(`\x1b[32m[RENDER4AI]\x1b[0m ${msg}`),
  error: (msg) => console.error(`\x1b[31m[RENDER4AI]\x1b[0m ${msg}`),
  warning: (msg) => console.log(`\x1b[33m[RENDER4AI]\x1b[0m ${msg}`),
};

/**
 * @typedef {Object} DatasetSchema
 * @property {string} name - Dataset name (required)
 * @property {string} [description] - Dataset description (optional)
 * @property {string} [file] - File URL path for fetch mode (optional, mutually exclusive with jsonContent/mdContent)
 * @property {Array|Object} [jsonContent] - Inline JSON data for conversion mode (optional, requires keyMaps)
 * @property {Object.<string, string>} [keyMaps] - Key to label mapping for JSON→MD conversion (optional, requires jsonContent)
 * @property {string} [mdContent] - Raw markdown content for direct save mode (optional, no conversion needed)
 */

/**
 * @typedef {Object} PrerendererConfig
 * @property {string} production_url - Production URL (e.g., https://artek.tc)
 * @property {number} preview_port - Vite preview port (e.g., 4173)
 * @property {string} default_locale - Default locale (e.g., 'tr')
 * @property {string[]} locales - Available locales (e.g., ['tr', 'en'])
 * @property {string[]} routes - Routes to render (e.g., ['/', '/contact'])
 * @property {number} page_load_timeout - Page load timeout in seconds
 * @property {number} wait_for_ready_timeout - Wait for ready timeout in seconds
 * @property {number} network_idle_timeout - Network idle timeout in seconds
 * @property {number} additional_wait - Additional wait in seconds
 * @property {number} server_start_timeout - Server start timeout in milliseconds
 * @property {number} server_stop_timeout - Server stop timeout in milliseconds
 * @property {number} dataset_fetch_timeout - Dataset fetch timeout in milliseconds
 * @property {number} root_ready_min_length - Minimum #root content length
 * @property {number} log_separator_length - Log separator line length
 * @property {Object} markdown - Markdown generation settings
 * @property {string} markdown.headingStyle - Heading style ('atx' or 'setext')
 * @property {string} markdown.hr - Horizontal rule style
 * @property {string} markdown.bulletListMarker - Bullet list marker
 * @property {string} markdown.codeBlockStyle - Code block style
 * @property {string} markdown.fence - Fence characters
 * @property {string} markdown.emDelimiter - Em delimiter
 * @property {string} markdown.strongDelimiter - Strong delimiter
 * @property {string} markdown.linkStyle - Link style
 * @property {string} markdown.linkReferenceStyle - Link reference style
 * @property {Object} playwright - Playwright settings
 * @property {boolean} playwright.headless - Headless browser mode
 * @property {Object} output - Output settings
 * @property {string} output.baseDir - Output base directory path
 * @property {boolean} output.generateMetadata - Generate metadata index file
 * @property {string} output_dir - Computed absolute output directory path
 */

/**
 * Load configuration from YAML files
 * Reads from:
 *   - render4ai/config.yaml (Markdown settings, locales, timeouts, etc.)
 *   - routes.yaml (routes only)
 * @returns {PrerendererConfig}
 */
function loadConfig() {
  try {
    // Load render4ai config
    const configContents = readFileSync(CONFIG_PATH, 'utf8');
    const config = yaml.load(configContents);

    // Load routes
    const routesContents = readFileSync(ROUTES_PATH, 'utf8');
    const routesData = yaml.load(routesContents);

    // Merge routes, apply defaults, and compute output directory
    const mergedConfig = {
      ...config,
      routes: routesData.routes || [],
      output_dir: join(PROJECT_ROOT, config.output.baseDir),
      // Apply defaults for timeout and UI settings
      server_start_timeout: config.server_start_timeout || 3000,
      server_stop_timeout: config.server_stop_timeout || 3000,
      dataset_fetch_timeout: config.dataset_fetch_timeout || 15000,
      root_ready_min_length: config.root_ready_min_length || 100,
      log_separator_length: config.log_separator_length || 60,
      page_load_timeout: config.page_load_timeout || 30,
      wait_for_ready_timeout: config.wait_for_ready_timeout || 15,
      network_idle_timeout: config.network_idle_timeout || 10,
      additional_wait: config.additional_wait || 2,
    };

    log.info(
      `Configuration loaded: ${mergedConfig.routes.length} routes, ${mergedConfig.locales.length} locales`
    );
    return mergedConfig;
  } catch (error) {
    log.error(`Failed to load config: ${error.message}`);
    throw error;
  }
}

/**
 * Start preview server as subprocess
 * @param {PrerendererConfig} config - Config
 * @returns {Promise<import('child_process').ChildProcess>}
 */
function startPreviewServer(config) {
  return new Promise((resolve, reject) => {
    log.info(`Starting preview server on port ${config.preview_port}`);

    const serverProcess = spawn(
      'npm',
      ['run', 'preview', '--', '--port', config.preview_port.toString()],
      {
        cwd: PROJECT_ROOT,
        stdio: 'pipe',
        shell: true,
      }
    );

    // Wait for server to initialize
    const timeout = setTimeout(() => {
      log.success(`Preview server started (PID: ${serverProcess.pid})`);
      resolve(serverProcess);
    }, config.server_start_timeout);

    serverProcess.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    // Check if process dies immediately
    serverProcess.on('exit', (code) => {
      if (code !== null && code !== 0) {
        clearTimeout(timeout);
        reject(new Error(`Server exited with code ${code}`));
      }
    });
  });
}

/**
 * Stop preview server
 * @param {import('child_process').ChildProcess} serverProcess
 * @param {PrerendererConfig} config - Config
 */
function stopPreviewServer(serverProcess, config) {
  if (serverProcess && !serverProcess.killed) {
    log.info('Stopping preview server');
    try {
      serverProcess.kill('SIGTERM');

      // Force kill after timeout
      setTimeout(() => {
        if (!serverProcess.killed) {
          serverProcess.kill('SIGKILL');
        }
      }, config.server_stop_timeout);
    } catch (error) {
      log.warning(`Server stop error: ${error.message}`);
    }
  }
}

/**
 * Generate Markdown filename from route and locale
 * Each route becomes a directory with index.md
 *
 * Examples:
 *   / (tr) → tr/index.md
 *   /company (en) → en/company/index.md
 *   /services/consultancy (tr) → tr/services/consultancy/index.md
 *
 * @param {string} route - Route path (e.g., '/services/consultancy/centers/setup')
 * @param {string} locale - Locale (e.g., 'tr')
 * @param {string} outputDir - Output directory path
 * @returns {string} - Markdown file path
 */
function getMarkdownPath(route, locale, outputDir) {
  const routePath = normalizeRoutePath(route);

  // Root route: {locale}/index.md
  if (route === '/') {
    return join(outputDir, locale, 'index.md');
  }

  // Other routes: {locale}/{route}/index.md
  return join(outputDir, locale, routePath, 'index.md');
}

/**
 * Create Markdown metadata frontmatter
 * Adds YAML frontmatter to the beginning of the Markdown file
 *
 * @param {string} route - Route path
 * @param {string} productionUrl - Production URL
 * @param {string} locale - Locale
 * @param {Array} datasets - Optional aiData datasets
 * @returns {string} - Frontmatter string
 */
function createMarkdownMetadata(route, productionUrl, locale, datasets = []) {
  const metadata = {
    route: route,
    locale: locale,
    generated_at: new Date().toISOString(),
    datasets: datasets.map((ds) => ({
      name: ds.name,
      description: ds.description,
      file: ds.file,
      size_bytes: ds.size,
    })),
  };

  // Create YAML frontmatter
  const frontmatter = yaml.dump(metadata, {
    indent: 2,
    lineWidth: -1,
    noRefs: true,
  });

  return `---\n${frontmatter}---\n\n`;
}

/**
 * Check if page has MDX content
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<boolean>}
 */
async function isMDXPage(page) {
  return await page.evaluate(() => {
    return document.querySelector('section.mdx-page') !== null;
  });
}

/**
 * Extract aiData from page
 * Reads AIKnowledgeBase schema from JSON-LD script tags
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<Array|null>}
 */
async function extractAiDataFromPage(page) {
  try {
    return await page.evaluate(() => {
      // JSON-LD script tags (AIKnowledgeBase schema)
      const scripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (const script of scripts) {
        try {
          const data = JSON.parse(script.textContent);
          // Look for AIKnowledgeBase schema
          if (data['@type'] === 'AIKnowledgeBase' && data.datasets) {
            return data.datasets;
          }
        } catch (e) {
          // JSON parse error, skip to next script
        }
      }

      return null;
    });
  } catch (error) {
    log.warning(`Failed to extract aiData: ${error.message}`);
    return null;
  }
}

/**
 * Fetch dataset from file URL using Playwright HTTP request API
 * Automatically detects file type from URL extension
 * @param {import('@playwright/test').BrowserContext} context
 * @param {string} fileUrl - File URL path
 * @param {PrerendererConfig} config - Config
 * @returns {Promise<{content: string, extension: string}|null>} - Returns null on failure
 */
async function fetchDatasetFromFile(context, fileUrl, config) {
  // Build full URL
  let fullUrl = fileUrl.startsWith('http') ? fileUrl : `${config.production_url}${fileUrl}`;

  // Manual DNS override: Replace production domain with localhost (keep HTTPS)
  // context.request doesn't respect browser --host-resolver-rules
  fullUrl = fullUrl.replace(config.production_url, `https://localhost:${config.preview_port}`);

  try {
    // Use Playwright's HTTP request API (no CORS issues, no download triggers)
    const response = await context.request.get(fullUrl);

    if (!response.ok()) {
      log.warning(
        `  Failed to fetch ${fileUrl}: HTTP ${response.status()} ${response.statusText()}`
      );
      return null;
    }

    // Get file extension from URL (e.g., '.json', '.md', '.jsonl')
    const urlPath = fileUrl.split('?')[0]; // Remove query params
    const extension = urlPath.substring(urlPath.lastIndexOf('.'));

    // Download content as-is
    const content = await response.text();

    return { content, extension };
  } catch (error) {
    log.warning(`  Failed to fetch ${fileUrl}: ${error.message}`);
    return null;
  }
}

/**
 * Create frontmatter for dataset files
 * Provides parent reference for bidirectional linking
 *
 * @param {string} route - Parent route path
 * @param {string} locale - Locale
 * @returns {string} - YAML frontmatter string
 */
function createDatasetFrontmatter(route, locale) {
  // Parent file: {locale}/{route}/index.md
  const routePath = normalizeRoutePath(route);
  const parentFile = route === '/' ? `${locale}/index.md` : `${locale}/${routePath}/index.md`;

  const metadata = {
    parent_route: route,
    parent_file: parentFile,
  };

  const frontmatter = yaml.dump(metadata, {
    indent: 2,
    lineWidth: -1,
    noRefs: true,
  });

  return `---\n${frontmatter}---\n\n`;
}

/**
 * Save dataset to file (co-located with route)
 * @param {string} name - Dataset name
 * @param {string} route - Route path (e.g., '/services/consultancy')
 * @param {string} locale - Locale
 * @param {string} content - Dataset content (as-is from download)
 * @param {string} extension - File extension (e.g., '.json', '.md', '.jsonl')
 * @param {string} outputDir - Output directory path
 * @param {boolean} [addFrontmatter=false] - Whether to add parent reference frontmatter
 * @returns {{path: string, size: number}} - Relative path and size
 */
function saveDataset(name, route, locale, content, extension, outputDir, addFrontmatter = false) {
  // Clean route path: remove leading/trailing slashes
  const routePath = normalizeRoutePath(route);

  // Create directory structure: {locale}/{route}/data/
  // Root route: {locale}/data/
  // Other routes: {locale}/{route}/data/
  let dataDir;
  if (route === '/') {
    dataDir = join(outputDir, locale, 'data');
  } else {
    dataDir = join(outputDir, locale, routePath, 'data');
  }

  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }

  // Use extension as-is from URL (e.g., '.json', '.md', '.jsonl')
  const fileName = `${name}${extension}`;
  const filePath = join(dataDir, fileName);

  // Prepend frontmatter if requested (only for .md files)
  let finalContent = content;
  if (addFrontmatter && extension === '.md') {
    const frontmatter = createDatasetFrontmatter(route, locale);
    finalContent = frontmatter + content;
  }

  // Write content
  writeFileSync(filePath, finalContent, 'utf-8');

  // Return relative path (route-aware) and size for metadata
  const relativePath =
    route === '/' ? `${locale}/data/${fileName}` : `${locale}/${routePath}/data/${fileName}`;

  return {
    path: relativePath,
    size: finalContent.length,
  };
}

/**
 * Convert JSON content to Markdown using keyMaps
 * @param {Array|Object} data - JSON data (array or single object)
 * @param {Object} keyMaps - Key to label mapping (e.g., { question: 'Soru', answer: 'Cevap' })
 * @returns {string} - Markdown content
 *
 * @example
 * // Input:
 * // data = [{ question: 'What is X?', answer: 'X is...' }]
 * // keyMaps = { question: 'Question', answer: 'Answer' }
 * //
 * // Output:
 * // Question: What is X?
 * // Answer: X is...
 */
function convertJsonToMarkdown(data, keyMaps) {
  const keys = Object.keys(keyMaps);
  const items = Array.isArray(data) ? data : [data];

  return items
    .map((item) => {
      return keys.map((key) => `${keyMaps[key]}: ${item[key]}`).join('\n');
    })
    .join('\n\n');
}

/**
 * Process aiData datasets for a route
 * Supports three modes:
 * 1. jsonContent + keyMaps: Convert inline JSON to Markdown
 * 2. mdContent: Save raw markdown directly (no conversion)
 * 3. file: Fetch from URL (existing behavior)
 *
 * @param {import('@playwright/test').BrowserContext} context - Browser context
 * @param {import('@playwright/test').Page} page - Current page
 * @param {string} route - Route path
 * @param {string} locale - Locale
 * @param {PrerendererConfig} config - Config
 * @returns {Promise<Array>} - Processed datasets
 */
async function processAiData(context, page, route, locale, config) {
  const aiData = await extractAiDataFromPage(page);

  if (!aiData || aiData.length === 0) {
    return [];
  }

  log.info(`  Found ${aiData.length} datasets for ${route} [${locale}]`);

  const processedDatasets = [];

  for (const dataset of /** @type {DatasetSchema[]} */ (aiData)) {
    // Mode 1: jsonContent + keyMaps → Convert JSON to Markdown
    if (dataset.jsonContent && dataset.keyMaps) {
      if (!dataset.name) {
        log.warning(`  ⊘ Invalid dataset schema (missing name for jsonContent), skipping`);
        continue;
      }

      log.info(`  • Converting: ${dataset.name} (JSON → MD)`);

      const markdown = convertJsonToMarkdown(dataset.jsonContent, dataset.keyMaps);

      const { path: savedPath, size } = saveDataset(
        dataset.name,
        route,
        locale,
        markdown,
        '.md',
        config.output_dir,
        true // Add frontmatter with parent reference
      );

      processedDatasets.push({
        name: dataset.name,
        description: dataset.description || '',
        file: savedPath,
        source: 'inline-json',
        size: size,
      });

      log.success(`  ✓ ${dataset.name} (JSON→MD) saved as ${savedPath} (${size} bytes)`);
      continue;
    }

    // Mode 2: mdContent → Save raw markdown directly (no conversion)
    if (dataset.mdContent) {
      if (!dataset.name) {
        log.warning(`  ⊘ Invalid dataset schema (missing name for mdContent), skipping`);
        continue;
      }

      log.info(`  • Saving: ${dataset.name} (raw MD)`);

      const { path: savedPath, size } = saveDataset(
        dataset.name,
        route,
        locale,
        dataset.mdContent,
        '.md',
        config.output_dir,
        true // Add frontmatter with parent reference
      );

      processedDatasets.push({
        name: dataset.name,
        description: dataset.description || '',
        file: savedPath,
        source: 'inline-markdown',
        size: size,
      });

      log.success(`  ✓ ${dataset.name} (raw MD) saved as ${savedPath} (${size} bytes)`);
      continue;
    }

    // Mode 3: file → Fetch from URL (existing behavior)
    if (!dataset.name || !dataset.file) {
      log.warning(`  ⊘ Invalid dataset schema (missing name or file), skipping`);
      continue;
    }

    log.info(`  • Fetching: ${dataset.name} from ${dataset.file}`);

    const result = await fetchDatasetFromFile(context, dataset.file, config);

    if (!result) {
      log.error(`  ✗ ${dataset.name}: Failed to fetch`);
      continue;
    }

    const { content, extension } = result;

    // Extract original filename from path and remove extension
    // e.g., '/data/path/file.json' → 'file.json' → 'file'
    const originalFileName = dataset.file.split('/').pop();
    const baseName = originalFileName.substring(0, originalFileName.lastIndexOf('.'));

    // Add frontmatter only for .md files (saveDataset handles extension check)
    const { path: savedPath, size } = saveDataset(
      baseName,
      route,
      locale,
      content,
      extension,
      config.output_dir,
      true // Add frontmatter with parent reference (only applies to .md files)
    );

    processedDatasets.push({
      name: dataset.name,
      description: dataset.description || '',
      file: savedPath,
      source: dataset.file,
      size: size,
    });

    log.success(`  ✓ ${dataset.name} saved as ${savedPath} (${size} bytes)`);
  }

  return processedDatasets;
}

/**
 * Extract MDX content as HTML
 * Only extracts <section class="mdx-page"> content
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<string>}
 */
async function extractMDXContentAsHTML(page) {
  return await page.evaluate(() => {
    const mdxSection = document.querySelector('section.mdx-page');
    if (!mdxSection) {
      return '';
    }
    return mdxSection.innerHTML;
  });
}

/**
 * Sanitize HTML before Markdown conversion
 * Cleans up Carbon Design System specific markup that breaks Turndown
 *
 * @param {string} html - Raw HTML content
 * @returns {string} - Sanitized HTML
 */
function sanitizeHTMLForMarkdown(html) {
  // Carbon DataTable: Clean up complex th structure
  // <th><div class="cds--table-header-label">Text<div class="...decorator..."></div></div></th>
  // → <th>Text</th>
  html = html.replace(
    /<th([^>]*)>\s*<div[^>]*class="[^"]*cds--table-header-label[^"]*"[^>]*>([^<]*)<div[^>]*><\/div><\/div>\s*<\/th>/gi,
    '<th$1>$2</th>'
  );

  // Carbon Button inside Link: Clean up nested button/paragraph structure
  // <a href="..."><button...><p>Text</p></button></a>
  // → <a href="...">Text</a>
  html = html.replace(
    /<a([^>]*)>\s*<button[^>]*>\s*<p[^>]*>([^<]*)<\/p>\s*<\/button>\s*<\/a>/gi,
    '<a$1>$2</a>'
  );

  return html;
}

/**
 * Create and configure TurndownService with custom rules
 * Includes GFM (GitHub Flavored Markdown) support for tables, strikethrough, etc.
 * @param {Object} options - Turndown options
 * @returns {TurndownService} - Configured Turndown service
 */
function createTurndownService(options = {}) {
  const turndownService = new TurndownService(options);
  turndownService.use(gfm);
  return turndownService;
}

/**
 * Convert HTML to Markdown
 * @param {string} html - HTML content
 * @param {Object} options - Turndown options
 * @returns {string} - Markdown content
 */
function convertHTMLToMarkdown(html, options = {}) {
  // Sanitize HTML before conversion (clean Carbon-specific markup)
  const sanitizedHTML = sanitizeHTMLForMarkdown(html);
  const turndownService = createTurndownService(options);
  return turndownService.turndown(sanitizedHTML);
}

/**
 * Wait for page to be fully loaded and ready
 * @param {import('@playwright/test').Page} page - Playwright page
 * @param {string} url - URL to navigate to
 * @param {PrerendererConfig} config - Config
 * @returns {Promise<void>}
 */
async function waitForPageReady(page, url, config) {
  // Navigate to production URL (DNS override routes to localhost)
  await page.goto(url, {
    waitUntil: 'domcontentloaded',
    timeout: config.page_load_timeout * 1000,
  });

  // Wait for React app ready
  await page.waitForFunction(
    `document.querySelector('#root')?.innerHTML?.length > ${config.root_ready_min_length}`,
    {
      timeout: config.wait_for_ready_timeout * 1000,
    }
  );

  // Wait for network idle
  await page.waitForLoadState('networkidle', {
    timeout: config.network_idle_timeout * 1000,
  });

  // Additional wait for content
  await page.waitForTimeout(config.additional_wait * 1000);
}

/**
 * Save Markdown content to file
 * Creates parent directories if they don't exist
 * @param {string} content - Markdown content
 * @param {string} filePath - File path
 * @returns {void}
 */
function saveMarkdownFile(content, filePath) {
  const fileDir = dirname(filePath);
  if (!existsSync(fileDir)) {
    mkdirSync(fileDir, { recursive: true });
  }
  writeFileSync(filePath, content, 'utf-8');
}

/**
 * Create visual page directive message
 * Used for non-MDX pages that contain visual/interactive components
 *
 * @param {string} locale - Locale
 * @returns {string} - Directive message
 */
function createVisualPageDirective(locale) {
  if (locale === 'tr') {
    return `Bu sayfa doğrudan anlaşılır yazılı içerik yerine görsel ağırlıklı bileşenlerden oluşmaktadır. Sayfanın içeriğini anlamak için yukarıdaki datasets alanındaki verilerin yollarını takip etmeniz gerekmektedir.`;
  }
  return `This page consists of visually-oriented components rather than directly readable text content. To understand the content of this page, you need to follow the paths of the data in the datasets field above.`;
}

/**
 * Render single route to Markdown
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} route - Route path (e.g., '/consultancy')
 * @param {string} locale - Locale (e.g., 'tr')
 * @param {PrerendererConfig} config - Prerenderer config
 * @returns {Promise<{success: boolean, path: string, skipped: boolean, datasets: Array}>}
 */
async function renderRouteToMarkdown(page, route, locale, config) {
  // Add __airendering=true for AI/RAG optimized content rendering
  const renderUrl = `${config.production_url}${route}?__airendering=true&locale=${locale}`;
  const markdownPath = getMarkdownPath(route, locale, config.output_dir);

  log.info(`Checking: ${route} [${locale}]`);

  try {
    // Wait for page to be fully loaded
    await waitForPageReady(page, renderUrl, config);

    // Check if page has MDX content
    const hasMDX = await isMDXPage(page);

    // Process aiData datasets (if any) - for both MDX and non-MDX pages
    const datasets = await processAiData(page.context(), page, route, locale, config);

    if (!hasMDX) {
      // Non-MDX page: Check if it has AI schema data
      if (datasets.length === 0) {
        log.warning(`⊘ ${route} [${locale}] - No MDX content and no AI schema, skipping`);
        return { success: false, path: markdownPath, skipped: true, datasets: [] };
      }

      // Non-MDX page with AI schema: Create metadata + directive message
      log.info(`Rendering (visual): ${route} [${locale}]`);

      // Create metadata frontmatter
      const metadata = createMarkdownMetadata(route, config.production_url, locale, datasets);

      // Create directive message for visual pages
      const directiveMessage = createVisualPageDirective(locale);

      // Combine metadata and directive
      const finalMarkdown = metadata + directiveMessage + '\n';

      // Save Markdown file
      saveMarkdownFile(finalMarkdown, markdownPath);

      log.success(`✓ ${route} [${locale}] (visual) → ${markdownPath}`);

      return { success: true, path: markdownPath, skipped: false, datasets };
    }

    // MDX page: Full content extraction
    log.info(`Rendering: ${route} [${locale}]`);

    // Extract MDX content as HTML
    const htmlContent = await extractMDXContentAsHTML(page);

    // Convert HTML to Markdown
    const markdownContent = convertHTMLToMarkdown(htmlContent, {
      headingStyle: config.markdown.headingStyle,
      hr: config.markdown.hr,
      bulletListMarker: config.markdown.bulletListMarker,
      codeBlockStyle: config.markdown.codeBlockStyle,
      fence: config.markdown.fence,
      emDelimiter: config.markdown.emDelimiter,
      strongDelimiter: config.markdown.strongDelimiter,
      linkStyle: config.markdown.linkStyle,
      linkReferenceStyle: config.markdown.linkReferenceStyle,
    });

    // Create metadata frontmatter
    const metadata = createMarkdownMetadata(route, config.production_url, locale, datasets);

    // Combine metadata and content
    const finalMarkdown = metadata + markdownContent;

    // Save Markdown file
    saveMarkdownFile(finalMarkdown, markdownPath);

    log.success(`✓ ${route} [${locale}] → ${markdownPath}`);

    return { success: true, path: markdownPath, skipped: false, datasets };
  } catch (error) {
    log.error(`✗ ${route} [${locale}]: ${error.message}`);
    return { success: false, path: markdownPath, skipped: false, datasets: [] };
  }
}

/**
 * Render all routes to Markdown files
 *
 * @param {PrerendererConfig} config - Prerenderer config
 * @returns {Promise<{total: number, success: number, failed: number, skipped: number, files: string[], fileDatasets: Object}>}
 */
async function renderAll(config) {
  // noinspection HttpUrlsUsage
  const prodDomain = config.production_url.replace('https://', '').replace('http://', '');

  log.info(
    `Starting Markdown generation for ${config.routes.length} routes × ${config.locales.length} locales`
  );
  log.info(`DNS Override: ${prodDomain} → localhost:${config.preview_port}`);

  const browser = await chromium.launch({
    headless: config.playwright.headless,
    args: [
      `--host-resolver-rules=MAP ${prodDomain}:443 localhost:${config.preview_port}`,
      '--ignore-certificate-errors',
    ],
  });

  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
  });

  // Parallel rendering with concurrency limit
  const concurrency = config.playwright?.concurrency || 5;
  const limit = pLimit(concurrency);

  log.info(`Rendering with concurrency: ${concurrency} parallel pages`);

  // Create tasks for all route+locale combinations
  const tasks = [];
  for (const route of config.routes) {
    for (const locale of config.locales) {
      tasks.push({ route, locale });
    }
  }

  // Render all tasks in parallel (with concurrency limit)
  const results = await Promise.all(
    tasks.map(({ route, locale }) =>
      limit(async () => {
        const page = await context.newPage();
        try {
          return await renderRouteToMarkdown(page, route, locale, config);
        } finally {
          await page.close();
        }
      })
    )
  );

  await browser.close();

  // Process results
  let successCount = 0;
  let failedCount = 0;
  let skippedCount = 0;
  const generatedFiles = [];
  const fileDatasets = {}; // Map: filePath -> datasets[]

  for (const result of results) {
    if (result.skipped) {
      skippedCount++;
    } else if (result.success) {
      successCount++;
      generatedFiles.push(result.path);
      fileDatasets[result.path] = result.datasets || [];
    } else {
      failedCount++;
    }
  }

  return {
    total: config.routes.length * config.locales.length,
    success: successCount,
    failed: failedCount,
    skipped: skippedCount,
    files: generatedFiles,
    fileDatasets,
  };
}

/**
 * Generate metadata index file
 * Creates a JSON manifest of all generated Markdown files with their datasets
 *
 * @param {string[]} files - List of generated Markdown paths
 * @param {Object} fileDatasets - Map of filePath to datasets array
 * @param {PrerendererConfig} config - Prerenderer config
 */
function generateMetadataIndex(files, fileDatasets, config) {
  const metadata = {
    generated_at: new Date().toISOString(),
    total_files: files.length,
    production_url: config.production_url,
    locales: config.locales,
    routes: config.routes,
    files: files.map((filePath) => {
      // Path relative to output_dir (e.g., 'tr/index.md' or 'tr/company/index.md')
      const relativePath = getRelativePath(filePath, config.output_dir);
      const locale = extractLocaleFromPath(filePath, config.locales);

      // Extract route from new path structure
      // tr/index.md → /
      // tr/company/index.md → /company
      // tr/services/consultancy/index.md → /services/consultancy
      let route;
      if (relativePath === `${locale}/index.md`) {
        route = '/';
      } else {
        // Remove locale prefix and /index.md suffix
        route =
          '/' +
          relativePath
            .replace(`${locale}/`, '') // Remove locale/
            .replace('/index.md', ''); // Remove /index.md
      }

      // Get datasets for this file
      const datasets = fileDatasets[filePath] || [];

      return {
        path: relativePath,
        locale,
        route,
        full_url: `${config.production_url}${route}`,
        datasets: datasets.map((ds) => ({
          name: ds.name,
          description: ds.description,
          file: ds.file,
        })),
      };
    }),
  };

  const metadataPath = join(config.output_dir, 'metadata.json');
  writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');

  log.success(`Metadata index created: ${metadataPath}`);
}

/**
 * Main execution
 */
async function main() {
  log.info('Markdown Knowledge Base Generator - Starting');

  let serverProcess = null;
  let config = null;

  try {
    // Load configuration from YAML
    config = loadConfig();

    // Create output directory
    if (!existsSync(config.output_dir)) {
      mkdirSync(config.output_dir, { recursive: true });
      log.info(`Created output directory: ${config.output_dir}`);
    }

    // Start preview server
    serverProcess = await startPreviewServer(config);

    // Render all routes to Markdown
    const results = await renderAll(config);

    // Generate metadata index
    if (config.output.generateMetadata) {
      generateMetadataIndex(results.files, results.fileDatasets, config);
    }

    // Summary
    log.info('━'.repeat(config.log_separator_length));
    log.success(`Complete: ${results.success}/${results.total} Markdown files generated`);
    if (results.skipped > 0) {
      log.info(`Skipped: ${results.skipped} routes (no MDX content)`);
    }
    if (results.failed > 0) {
      log.warning(`Failed: ${results.failed} files`);
    }
    log.info(`Output directory: ${config.output_dir}`);
    log.info('━'.repeat(config.log_separator_length));

    return results.failed === 0;
  } catch (error) {
    if (error.code === 'ENOENT') {
      log.error(`File not found: ${error.path}`);
    } else {
      log.error(`Fatal error: ${error.message}`);
      if (error.stack) {
        console.error(error.stack);
      }
    }
    return false;
  } finally {
    // Always stop server (cleanup)
    if (serverProcess && config) {
      stopPreviewServer(serverProcess, config);
    }
  }
}

// Run
main()
  .then((success) => process.exit(success ? 0 : 1))
  .catch((error) => {
    log.error(`Unhandled error: ${error}`);
    process.exit(1);
  });
