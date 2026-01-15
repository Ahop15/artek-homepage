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
 *   node scripts/convert_translations.js
 *
 * Input:  ./translations.yaml
 * Output: ./src/shared/translations/translations.json
 */

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Define file paths relative to project root
const PROJECT_ROOT = path.resolve(__dirname, '..');
const INPUT_FILE = path.join(PROJECT_ROOT, 'translations.yaml');
const OUTPUT_FILE = path.join(PROJECT_ROOT, 'src', 'shared', 'translations', 'translations.json');

/**
 * Main conversion function
 * Handles the complete YAML to JSON transformation process
 */
function convertYamlToJson() {
  console.log('\n[YAML to JSON Converter]');
  console.log('------------------------\n');

  // Verify input file exists before proceeding
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`ERROR: Input file not found: ${INPUT_FILE}`);
    process.exit(1);
  }

  console.log(`Input:  ${path.relative(PROJECT_ROOT, INPUT_FILE)}`);
  console.log(`Output: ${path.relative(PROJECT_ROOT, OUTPUT_FILE)}`);
  console.log('');

  try {
    // Read the YAML file content
    console.log('Reading YAML file...');
    const yamlContent = fs.readFileSync(INPUT_FILE, 'utf8');

    // Parse YAML to JavaScript object
    console.log('Parsing YAML content...');
    const parsedData = yaml.load(yamlContent);

    // Validate that parsed data is an object
    if (typeof parsedData !== 'object' || parsedData === null) {
      console.error('[ERROR] Invalid YAML structure: Root element must be an object');
      process.exit(1);
    }

    // Type assertion - we know it's an object after validation
    /** @type {Record<string, any>} */
    const jsonData = parsedData;

    // Format JSON with 2-space indentation for readability
    const jsonContent = JSON.stringify(jsonData, null, 2);

    // Ensure output directory exists
    const outputDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(outputDir)) {
      console.log(`Creating output directory: ${path.relative(PROJECT_ROOT, outputDir)}`);
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Create backup of existing file if it exists
    if (fs.existsSync(OUTPUT_FILE)) {
      const backupFile = OUTPUT_FILE + '.backup';
      console.log(`Creating backup: ${path.relative(PROJECT_ROOT, backupFile)}`);
      fs.copyFileSync(OUTPUT_FILE, backupFile);
    }

    // Write the JSON file
    console.log('Writing JSON file...');
    fs.writeFileSync(OUTPUT_FILE, jsonContent, 'utf8');

    // Calculate and display statistics
    const stats = {
      yamlSize: (yamlContent.length / 1024).toFixed(2),
      jsonSize: (jsonContent.length / 1024).toFixed(2),
      // Count languages excluding the _default key
      languages: Object.keys(jsonData).filter((key) => key !== '_default').length,
      defaultLang: jsonData['_default'] || 'Not specified',
    };

    console.log('\n[Statistics]');
    console.log('------------');
    console.log(`YAML size: ${stats.yamlSize} KB`);
    console.log(`JSON size: ${stats.jsonSize} KB`);
    console.log(`Languages: ${stats.languages}`);
    console.log(`Default language: ${stats.defaultLang}`);

    // List available languages with their metadata
    if (stats.languages > 0) {
      console.log('\n[Available Languages]');
      console.log('--------------------');
      Object.keys(jsonData).forEach((langCode) => {
        // Skip the _default key and check for _meta object
        if (langCode !== '_default') {
          const langData = jsonData[langCode];
          // Safely check for _meta property
          if (langData && typeof langData === 'object' && langData['_meta']) {
            const meta = langData['_meta'];
            // Safely access meta properties
            if (meta['nativeName'] && meta['code']) {
              console.log(`${meta['nativeName']} (${meta['code']})`);
            }
          }
        }
      });
    }

    console.log('\n[SUCCESS] Conversion completed successfully');
    console.log(`Output file: ${path.relative(PROJECT_ROOT, OUTPUT_FILE)}\n`);
  } catch (err) {
    // Handle specific YAML parsing errors
    if (err.name === 'YAMLException') {
      console.error(`\n[ERROR] YAML parsing failed`);
      console.error(`Message: ${err.message}`);
      if (err.mark) {
        console.error(`Line: ${err.mark.line + 1}, Column: ${err.mark.column + 1}`);
      }
    } else {
      // Handle general errors
      console.error(`\n[ERROR] ${err.message}`);
    }
    process.exit(1);
  }
}

// Execute the conversion
convertYamlToJson();
