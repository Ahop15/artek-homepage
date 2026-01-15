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
 * Usage:
 *     npm run minify:html
 *     node scripts/minify_html.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { minify } from 'html-minifier-terser';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Define paths
const PROJECT_ROOT = path.resolve(__dirname, '..');
const DIST_DIR = path.join(PROJECT_ROOT, 'dist');

// Minification options - React-safe configuration
const MINIFY_OPTIONS = {
  // Core options
  collapseWhitespace: true,              // Remove unnecessary whitespace
  removeComments: true,                  // Remove HTML comments (keep IE conditionals)
  conservativeCollapse: true,            // Conservative whitespace removal for React hydration

  // Attribute optimization - React safe
  removeAttributeQuotes: false,          // Keep quotes to preserve React attributes
  removeEmptyAttributes: false,          // Keep empty attributes (React may need them)
  removeRedundantAttributes: true,       // Remove default attributes
  useShortDoctype: true,                 // Use HTML5 doctype
  removeScriptTypeAttributes: true,      // Remove type="text/javascript"
  removeStyleLinkTypeAttributes: true,   // Remove type="text/css"

  // Content optimization
  minifyCSS: true,                          // Minify inline CSS
  minifyJS: false,                          // Don't minify JS (already minified by Vite)
  processScripts: ['application/ld+json'],  // Process JSON-LD scripts

  // Safety options - React critical
  keepClosingSlash: true,               // Keep self-closing slash for compatibility
  preventAttributesEscaping: false,     // Allow escaping when needed
  quoteCharacter: '"',                  // Use double quotes consistently
  caseSensitive: true,                  // Preserve case for React attributes

  // Advanced optimizations - disabled for React
  sortAttributes: false,                // Keep original attribute order
  sortClassName: false,                 // Keep original class order
  removeOptionalTags: false,            // Keep all tags for safety
  removeTagWhitespace: false,           // Preserve some formatting
  collapseInlineTagWhitespace: false,   // Don't collapse inline tag whitespace

  // React-specific safety
  customAttrAssign: [/\$?data-react[\-\w]+/], // Preserve React data attributes
  customAttrSurround: [                       // Preserve attributes around React markers
    [/data-react[\-\w]+/, /=/],
    [/\s*=\s*/, /^["'].*["']$/]
  ],

  // Error handling
  continueOnParseError: false,          // Stop on parse errors
  html5: true                           // Parse as HTML5
};

/**
 * Recursively find all HTML files in a directory
 * @param {string} dir - Directory to search
 * @param {string[]} files - Accumulated file list
 * @returns {string[]} Array of HTML file paths
 */
function findHtmlFiles(dir, files = []) {
  // Check if directory exists
  if (!fs.existsSync(dir)) {
    return files;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Recursively search subdirectories
      findHtmlFiles(fullPath, files);
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      // Add HTML files to the list
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Format bytes to human readable format
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size string
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * Calculate compression percentage
 * @param {number} original - Original size
 * @param {number} minified - Minified size
 * @returns {string} Percentage saved
 */
function calculateSavings(original, minified) {
  const saved = ((original - minified) / original * 100).toFixed(1);
  return `${saved}%`;
}

/**
 * Minify a single HTML file
 * @param {string} filePath - Path to HTML file
 * @returns {Object} Processing result
 */
async function minifyHtmlFile(filePath) {
  try {
    // Read original file
    const originalContent = fs.readFileSync(filePath, 'utf8');
    const originalSize = Buffer.byteLength(originalContent);

    // Skip if file is already minified (simple heuristic)
    const lines = originalContent.split('\n').length;
    const avgLineLength = originalSize / lines;
    if (lines <= 5 && avgLineLength > 500) {
      return {
        filePath,
        skipped: true,
        reason: 'Already minified',
        originalSize
      };
    }

    // Minify the content
    const minifiedContent = await minify(originalContent, MINIFY_OPTIONS);
    const minifiedSize = Buffer.byteLength(minifiedContent);

    // Only write if there's actual savings
    if (minifiedSize < originalSize) {
      fs.writeFileSync(filePath, minifiedContent, 'utf8');

      return {
        filePath,
        success: true,
        originalSize,
        minifiedSize,
        saved: originalSize - minifiedSize
      };
    } else {
      return {
        filePath,
        skipped: true,
        reason: 'No savings',
        originalSize
      };
    }

  } catch (error) {
    return {
      filePath,
      error: true,
      message: error.message
    };
  }
}

/**
 * Main minification process
 */
async function main() {
  console.log('\n[HTML Minifier]');
  console.log('---------------\n');

  // Check if dist directory exists
  if (!fs.existsSync(DIST_DIR)) {
    console.error('[ERROR] dist/ directory not found');
    console.error('Run "npm run build" first');
    process.exit(1);
  }

  // Find all HTML files
  console.log('Searching for HTML files...');
  const htmlFiles = findHtmlFiles(DIST_DIR);

  if (htmlFiles.length === 0) {
    console.log('[INFO] No HTML files found in dist/');
    process.exit(0);
  }

  console.log(`Found ${htmlFiles.length} HTML file(s)\n`);
  console.log('Processing files...');
  console.log('------------------');

  // Process statistics
  let totalOriginalSize = 0;
  let totalMinifiedSize = 0;
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  // Process each file
  for (const filePath of htmlFiles) {
    const relativePath = path.relative(DIST_DIR, filePath);
    const result = await minifyHtmlFile(filePath);

    if (result.success) {
      console.log(`[OK] ${relativePath}`);
      console.log(`     ${formatBytes(result.originalSize)} → ${formatBytes(result.minifiedSize)} (saved ${calculateSavings(result.originalSize, result.minifiedSize)})`);

      totalOriginalSize += result.originalSize;
      totalMinifiedSize += result.minifiedSize;
      successCount++;

    } else if (result.skipped) {
      console.log(`[SKIP] ${relativePath} - ${result.reason}`);
      totalOriginalSize += result.originalSize;
      totalMinifiedSize += result.originalSize;
      skipCount++;

    } else if (result.error) {
      console.error(`[ERROR] ${relativePath}`);
      console.error(`        ${result.message}`);
      errorCount++;
    }
  }

  // Display summary
  console.log('\n[Summary]');
  console.log('---------');
  console.log(`Total files: ${htmlFiles.length}`);
  console.log(`Minified: ${successCount}`);
  console.log(`Skipped: ${skipCount}`);
  if (errorCount > 0) {
    console.log(`Errors: ${errorCount}`);
  }

  if (totalOriginalSize > 0) {
    const totalSaved = totalOriginalSize - totalMinifiedSize;
    console.log(`\nOriginal size: ${formatBytes(totalOriginalSize)}`);
    console.log(`Minified size: ${formatBytes(totalMinifiedSize)}`);
    console.log(`Total saved: ${formatBytes(totalSaved)} (${calculateSavings(totalOriginalSize, totalMinifiedSize)})`);
  }

  // Exit with appropriate code
  if (errorCount > 0) {
    console.log('\n[WARNING] Completed with errors');
    process.exit(1);
  } else {
    console.log('\n[SUCCESS] HTML minification completed');
    process.exit(0);
  }
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('\n[FATAL] Unhandled error:', error.message);
  process.exit(1);
});

// Execute main function
main().catch(error => {
  console.error('\n[FATAL] Process failed:', error.message);
  process.exit(1);
});