#!/usr/bin/env node

/**
 *  █████╗ ██████╗  █████╗ ███████╗
 * ██╔══██╗██╔══██╗██╔══██╗██╔════╝
 * ███████║██████╔╝███████║███████╗
 * ██╔══██║██╔══██╗██╔══██║╚════██║
 * ██║  ██║██║  ██║██║  ██║███████║
 * ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝
 * Transform CSV to JSON (General CSV to JSON converter)
 *
 * Usage:
 *   node transform-csv-json.js <input-csv-path> <output-json-path>
 *
 * Example:
 *   node transform-csv-json.js ../data/RDCenters/Centers.csv ../../../../public/data/center-statistics/rd-centers/rd_centers.json
 */

import {
  parseArgs,
  readFile,
  writeJsonFile,
  printHeader,
  printPaths,
  handleError,
} from './lib/transform-utils.js';

// Parse command line arguments
const { inputPath, outputPath } = parseArgs(
  2,
  'Usage: node transform-csv-json.js <input-csv-path> <output-json-path>'
);

printHeader('CSV to JSON transformation');
printPaths(inputPath, outputPath);

try {
  // Read CSV file
  const csvContent = readFile(inputPath);

  // Parse CSV
  const lines = csvContent.trim().split('\n');

  if (lines.length === 0) {
    console.error('Error: CSV file is empty');
    process.exit(1);
  }

  // Extract headers
  const headers = lines[0].split(',');
  console.log('Headers: ' + headers.join(', '));

  // Parse data rows
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();

    if (!line) continue; // Skip empty lines

    // Handle CSV values (including quoted values with commas)
    const values = [];
    let currentValue = '';
    let insideQuotes = false;

    for (let j = 0; j < line.length; j++) {
      const char = line[j];

      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        values.push(currentValue.trim());
        currentValue = '';
      } else {
        currentValue += char;
      }
    }

    // Push the last value
    values.push(currentValue.trim());

    // Create object from headers and values
    if (values.length === headers.length) {
      const row = {};
      headers.forEach((header, index) => {
        row[header.trim()] = values[index];
      });
      data.push(row);
    } else {
      console.warn(
        'Warning: Line ' +
          (i + 1) +
          ' has ' +
          values.length +
          ' values but ' +
          headers.length +
          ' headers expected - skipping'
      );
    }
  }

  console.log('Parsed ' + data.length + ' records');

  // Write JSON file
  writeJsonFile(outputPath, data);
  console.log('Total records: ' + data.length);

  // Show sample of first 3 records
  console.log('\nSample output (first 3 records):');
  console.log(JSON.stringify(data.slice(0, 3), null, 2));
} catch (error) {
  handleError(error);
}
