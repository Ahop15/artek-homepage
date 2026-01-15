#!/usr/bin/env node

/**
 *  █████╗ ██████╗  █████╗ ███████╗
 * ██╔══██╗██╔══██╗██╔══██╗██╔════╝
 * ███████║██████╔╝███████║███████╗
 * ██╔══██║██╔══██╗██╔══██║╚════██║
 * ██║  ██║██║  ██║██║  ██║███████║
 * ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝
 *
 * Transform Centers.csv to RAG-optimized Markdown
 *
 * This script converts Centers.csv files to keyword-rich markdown sentences for RAG systems.
 * Creates natural language sentences optimized for embedding models.
 * Supports sector name mapping via SectorNamesMap.yaml.
 *
 * Output format:
 *   TR: "2m Kablo Sanayi ve Ticaret A.Ş., Tekirdağ şehrinde bulunan Elektronik sektöründe faaliyet gösteren bir Ar-Ge Merkezidir."
 *   EN: "2m Kablo Sanayi ve Ticaret A.Ş. is an R&D Center operating in the Electronics sector located in Tekirdağ city."
 *
 * Can be run standalone or imported as a module.
 *
 * Usage:
 *   node transform-centers-table.js
 *   or
 *   import { generateCentersMarkdown } from './transform-centers-table.js';
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Load sector name mapping from SectorNamesMap.yaml
 * @param {string} inputDir - Input data directory path (e.g., '../data/RDCenters')
 * @returns {Object} - Map of Turkish sector names to English sector names
 */
function loadSectorNamesMap(inputDir) {
  const mapPath = join(inputDir, 'SectorNamesMap.yaml');

  if (!existsSync(mapPath)) {
    console.warn(`  ⚠ SectorNamesMap.yaml not found: ${mapPath}`);
    return {};
  }

  try {
    const yamlContent = readFileSync(mapPath, 'utf8');
    const sectorMap = yaml.load(yamlContent);
    return sectorMap || {};
  } catch (error) {
    console.error(`  ✗ Failed to load SectorNamesMap.yaml: ${error.message}`);
    return {};
  }
}

/**
 * Parse a single CSV line (handles quoted fields with commas)
 */
function parseCsvLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  // Add last field
  fields.push(current.trim());

  return fields;
}

/**
 * Get center type name for templates
 * @param {string} centerType - 'rd-centers' or 'design-centers'
 * @param {string} locale - 'tr' or 'en'
 * @returns {string} - Localized center type name
 */
function getCenterTypeName(centerType, locale) {
  const names = {
    'rd-centers': {
      tr: 'Ar-Ge Merkezi',
      en: 'R&D Center',
    },
    'design-centers': {
      tr: 'Tasarım Merkezi',
      en: 'Design Center',
    },
  };

  return names[centerType]?.[locale] || names['rd-centers'][locale];
}

/**
 * Generate centers data in Markdown format from Centers.csv
 * Creates keyword-rich natural language sentences for embedding optimization
 * @param {string} csvPath - Path to Centers.csv
 * @param {string} outputDir - Output directory
 * @param {string} centerType - 'rd-centers' or 'design-centers'
 * @param {string} locale - 'tr' or 'en' (default: 'tr')
 * @returns {Object} - { success: boolean, centerCount: number, outputPath: string, locale: string }
 */
export function generateCentersMarkdown(csvPath, outputDir, centerType, locale = 'tr') {
  // Validate inputs
  if (!existsSync(csvPath)) {
    throw new Error(`CSV file not found: ${csvPath}`);
  }

  // Load sector names map if English locale - use input directory from csvPath
  const inputDir = dirname(csvPath);
  const sectorMap = locale === 'en' ? loadSectorNamesMap(inputDir) : {};

  // Read CSV file
  const csvContent = readFileSync(csvPath, 'utf8');
  const lines = csvContent.split('\n').filter((line) => line.trim());

  if (lines.length < 2) {
    throw new Error('CSV file must have at least header and one data row');
  }

  const centerTypeName = getCenterTypeName(centerType, locale);
  const centerCount = lines.length - 1; // Exclude header

  // Generate markdown content
  let markdownContent = '';

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const csvFields = parseCsvLine(line);
    if (csvFields.length >= 3) {
      const name = csvFields[0].replace(/^"|"$/g, '').trim();
      const city = csvFields[1].replace(/^"|"$/g, '').trim();
      let sector = csvFields[2].replace(/^"|"$/g, '').trim();

      // Translate sector name if English locale
      if (locale === 'en' && sectorMap[sector]) {
        sector = sectorMap[sector];
      }

      // Generate keyword-rich sentence
      let sentence;
      if (locale === 'tr') {
        sentence = `${name}, ${city} şehrinde bulunan ${sector} sektöründe faaliyet gösteren bir ${centerTypeName}dir.`;
      } else {
        sentence = `${name} is a ${centerTypeName} operating in the ${sector} sector located in ${city} city.`;
      }

      markdownContent += sentence + '\n\n';
    }
  }

  // Ensure output directory exists
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  // Save to file with locale suffix
  const fileName = locale === 'en' ? 'rag-centers-data-en.md' : 'rag-centers-data.md';
  const outputPath = join(outputDir, fileName);
  writeFileSync(outputPath, markdownContent.trim(), 'utf8');

  return {
    success: true,
    centerCount,
    outputPath,
    locale,
  };
}

/**
 * Main execution (when run as standalone script)
 */
async function main() {
  console.log('='.repeat(70));
  console.log('Centers CSV to Markdown Transformer (TR + EN)');
  console.log('='.repeat(70));
  console.log('');

  const centerTypes = {
    'rd-centers': {
      csvPath: join(__dirname, '../data/RDCenters/Centers.csv'),
      outputDir: join(__dirname, '../output/rag/RDCenters'),
    },
    'design-centers': {
      csvPath: join(__dirname, '../data/DesignCenters/Centers.csv'),
      outputDir: join(__dirname, '../output/rag/DesignCenters'),
    },
  };

  const locales = ['tr', 'en'];
  let successCount = 0;
  let totalCenters = 0;

  for (const [centerType, config] of Object.entries(centerTypes)) {
    console.log(`\nProcessing: ${centerType.toUpperCase()}`);
    console.log('-'.repeat(70));

    try {
      if (!existsSync(config.csvPath)) {
        console.log(`  ⚠ Centers.csv not found: ${config.csvPath}`);
        console.log(`  → Skipping...`);
        continue;
      }

      // Generate both Turkish and English markdown versions
      for (const locale of locales) {
        const mdResult = generateCentersMarkdown(
          config.csvPath,
          config.outputDir,
          centerType,
          locale
        );
        console.log(
          `  ✓ [${locale.toUpperCase()}] Generated Markdown with ${mdResult.centerCount} centers`
        );
        console.log(`  ✓ [${locale.toUpperCase()}] Saved to: ${mdResult.outputPath}`);

        successCount++;
        if (locale === 'tr') {
          totalCenters += mdResult.centerCount;
        }
      }
    } catch (error) {
      console.error(`  ✗ Failed: ${error.message}`);
      if (error.stack) {
        console.error(`  Stack: ${error.stack}`);
      }
    }
  }

  console.log('');
  console.log('='.repeat(70));
  console.log('Transformation Complete');
  console.log('='.repeat(70));
  console.log(
    `  Generated: ${successCount} markdown files (${Object.keys(centerTypes).length} center types × ${locales.length} locales)`
  );
  console.log(`  Total Centers: ${totalCenters.toLocaleString()}`);
  console.log('');
}

// Run main if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
