#!/usr/bin/env node

/**
 *  █████╗ ██████╗  █████╗ ███████╗
 * ██╔══██╗██╔══██╗██╔══██╗██╔════╝
 * ███████║██████╔╝███████║███████╗
 * ██╔══██║██╔══██╗██╔══██║╚════██║
 * ██║  ██║██║  ██║██║  ██║███████║
 * ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝
 *
 * XLSX to CSV Converter
 *
 * This script converts XLSX files from the source directory to CSV format
 * and saves them to the appropriate data directories.
 *
 * Usage:
 *   node build-xlsx.js
 */

import XLSX from 'xlsx';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const CONVERSIONS = [
  {
    name: 'RD Centers',
    xlsxPath: join(__dirname, 'source/Ar-Gemerkezleri.xlsx'),
    csvPath: join(__dirname, 'data/RDCenters/Centers.csv'),
  },
  {
    name: 'Design Centers',
    xlsxPath: join(__dirname, 'source/Tasarimmerkeziistatistik.xlsx'),
    csvPath: join(__dirname, 'data/DesignCenters/Centers.csv'),
  },
];

/**
 * Ensure directory exists
 */
function ensureDirectory(filePath) {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
    console.log(`  ✓ Created directory: ${dir}`);
  }
}

/**
 * Normalize sector names - Basic cleanup
 *
 * Normalization rules:
 *   1. Trim whitespace from start/end
 *   2. Replace multiple spaces with single space
 *   3. Remove spaces around slashes
 *      Example: "Mühendislik/ Mimarlık Faaliyetleri" → "Mühendislik/Mimarlık Faaliyetleri"
 */
function normalizeSectorName(sector) {
  if (!sector) return '';

  // Remove spaces around slashes
  return sector
    .trim() // Remove leading/trailing whitespace
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/\s*\/\s*/g, '/');
}

/**
 * Convert XLSX to CSV with selected columns
 * Extracts: Column 2 (name), Column 3 (city), Column 4 (sector)
 */
function convertXlsxToCsv(xlsxPath) {
  console.log(`  Reading XLSX: ${xlsxPath}`);

  // Read the workbook
  const workbook = XLSX.readFile(xlsxPath);

  // Get the first sheet
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // Convert to JSON to manipulate data
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  // Extract columns: 2nd (index 1), 3rd (index 2), 4th (index 3)
  // First row is headers, rest are data
  const csvRows = [];

  // Add CSV header
  csvRows.push('name,city,sector');

  // Track normalization stats
  let normalizedCount = 0;

  // Process each row (skip first row if it's a header)
  const startRow = 1; // Skip header row in XLSX
  for (let i = startRow; i < data.length; i++) {
    const row = data[i];

    // Skip empty rows
    if (!row || row.length === 0) continue;

    // Extract columns 2, 3, 4 (indices 1, 2, 3)
    const name = row[1] || '';
    const city = row[2] || '';
    const sectorRaw = row[3] || '';

    // Skip if all fields are empty
    if (!name && !city && !sectorRaw) continue;

    // Normalize sector name
    const sector = normalizeSectorName(sectorRaw);
    if (sector !== sectorRaw) {
      normalizedCount++;
    }

    // Escape fields with commas or quotes
    const escapeCsvField = (field) => {
      const str = String(field).trim();
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    csvRows.push([escapeCsvField(name), escapeCsvField(city), escapeCsvField(sector)].join(','));
  }

  const csv = csvRows.join('\n');
  const rowCount = csvRows.length - 1; // Exclude header
  const sizeKB = (csv.length / 1024).toFixed(1);

  console.log(`  ✓ Converted: ${rowCount} data rows, ${sizeKB}KB`);
  if (normalizedCount > 0) {
    console.log(`  ✓ Normalized: ${normalizedCount} sector names`);
  }

  return csv;
}

/**
 * Main execution
 */
function main() {
  console.log('='.repeat(70));
  console.log('XLSX to CSV Converter');
  console.log('='.repeat(70));
  console.log('');

  let successCount = 0;
  let failCount = 0;

  for (const config of CONVERSIONS) {
    console.log(`\nProcessing: ${config.name}`);
    console.log('-'.repeat(70));

    try {
      // Ensure output directory exists
      ensureDirectory(config.csvPath);

      // Convert XLSX to CSV
      const csv = convertXlsxToCsv(config.xlsxPath);

      // Save CSV file
      writeFileSync(config.csvPath, csv, 'utf8');
      console.log(`  ✓ Saved: ${config.csvPath}`);

      successCount++;
      console.log(`  ✓✓✓ ${config.name} completed successfully! ✓✓✓`);
    } catch (error) {
      console.error(`  ✗ ${config.name} failed: ${error.message}`);
      if (error.stack) {
        console.error(`  Stack trace: ${error.stack}`);
      }
      failCount++;
    }
  }

  console.log('');
  console.log('='.repeat(70));
  console.log('Conversion Complete');
  console.log('='.repeat(70));
  console.log('');
  console.log(`Success: ${successCount}/${CONVERSIONS.length}`);
  console.log(`Failed:  ${failCount}/${CONVERSIONS.length}`);
  console.log('');

  if (failCount > 0) {
    process.exit(1);
  }
}

// Run
main();
