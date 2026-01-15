#!/usr/bin/env node
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
 * Interactive Demo Tool
 *
 * Opens a browser with DNS override for video recording and interactive demos
 *
 * Usage:
 *     1. Start preview server: npm run preview
 *     2. Run this tool: node scripts/utils/interactive-demo/interactive-demo.js
 *
 *     Optional CLI args:
 *     node scripts/utils/interactive-demo/interactive-demo.js --url https://www.artek.tc
 *
 * Requirements:
 *     npm install -D @playwright/test js-yaml
 *     npx playwright install chromium
 */

import { chromium } from '@playwright/test';
import yaml from 'js-yaml';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Setup paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CONFIG_PATH = join(__dirname, 'config.yaml');

// State
let browser = null;

// Logging utilities
const log = {
  info: (msg) => console.log(`\x1b[36m[DEMO]\x1b[0m ${msg}`),
  success: (msg) => console.log(`\x1b[32m[DEMO]\x1b[0m ${msg}`),
  error: (msg) => console.error(`\x1b[31m[DEMO]\x1b[0m ${msg}`),
  warning: (msg) => console.log(`\x1b[33m[DEMO]\x1b[0m ${msg}`),
};

/**
 * Parse CLI arguments
 * @param {string[]} argv - Process arguments
 * @returns {Object} Parsed arguments
 */
function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--url' && argv[i + 1]) {
      args.url = argv[i + 1];
      i++;
    }
  }
  return args;
}

/**
 * Load configuration from YAML and merge with CLI args
 * @returns {Object} Configuration object
 */
function loadConfig() {
  // Read YAML
  const config = yaml.load(readFileSync(CONFIG_PATH, 'utf8'));

  // Override with CLI args
  const args = parseArgs(process.argv.slice(2));

  return {
    production_url: args.url || config.production_url,
    preview_port: config.preview_port,
    browser: config.browser,
  };
}

/**
 * Launch browser with DNS override
 * @param {Object} config - Configuration object
 * @returns {Promise<Object>} Browser, context and page instances
 */
async function launchBrowser(config) {
  // noinspection HttpUrlsUsage
  const prodDomain = config.production_url.replace('https://', '').replace('http://', '');

  log.info(`Launching browser with DNS override...`);
  log.info(`  ${prodDomain} → localhost:${config.preview_port}`);

  browser = await chromium.launch({
    headless: false,
    args: [
      `--host-resolver-rules=MAP ${prodDomain}:443 localhost:${config.preview_port}`,
      '--ignore-certificate-errors',
    ],
  });

  const context = await browser.newContext({
    viewport: config.browser.viewport || null,
    ignoreHTTPSErrors: true,
  });

  const page = await context.newPage();

  // Navigate to production URL
  log.info(`Navigating to ${config.production_url}...`);

  await page.goto(config.production_url, {
    waitUntil: 'networkidle',
    timeout: 30000,
  });

  log.success(`Browser ready! You can now interact with the site.`);
  log.info(`Press Ctrl+C to exit.`);

  return { browser, context, page };
}

/**
 * Cleanup handler - closes browser
 */
async function cleanup() {
  log.info('Shutting down...');

  if (browser) {
    try {
      await browser.close();
      log.success('Browser closed');
    } catch (error) {
      log.warning(`Browser close error: ${error.message}`);
    }
  }

  process.exit(0);
}

/**
 * Main execution
 */
async function main() {
  try {
    // Load config
    const config = loadConfig();
    log.info(`Production URL: ${config.production_url}`);
    log.info(`Preview Port:   ${config.preview_port}`);
    // Launch browser
    await launchBrowser(config);

    // Keep process alive (wait for SIGINT)
    await new Promise(() => {}); // Never resolves
  } catch (error) {
    log.error(`Fatal error: ${error.message}`);
    await cleanup();
    process.exit(1);
  }
}

// Signal handlers (Ctrl+C, kill)
process.on('SIGINT', cleanup); // Ctrl+C
process.on('SIGTERM', cleanup); // kill command

// Run
main().catch((error) => {
  log.error(`Unhandled error: ${error.message}`);
  process.exit(1);
});
