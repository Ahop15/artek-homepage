/**
 * Common utilities for data transformation scripts
 *
 * This module provides shared functionality for CSV/YAML to JSON transformations.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

/**
 * Parse command line arguments
 *
 * @param {number} requiredCount - Number of required arguments
 * @param {string} usageMessage - Usage message to display on error
 * @returns {{inputPath: string, outputPath: string}} Parsed paths
 */
export function parseArgs(requiredCount, usageMessage) {
  const args = process.argv.slice(2);

  if (args.length < requiredCount) {
    console.error('Error: Missing required arguments');
    console.log(usageMessage);
    process.exit(1);
  }

  return {
    inputPath: args[0],
    outputPath: args[1]
  };
}

/**
 * Validate that input file exists
 *
 * @param {string} inputPath - Path to input file
 */
export function validateInputFile(inputPath) {
  if (!existsSync(inputPath)) {
    console.error('Error: Input file not found: ' + inputPath);
    process.exit(1);
  }
}

/**
 * Ensure output directory exists (create if needed)
 *
 * @param {string} outputPath - Path to output file
 */
export function ensureOutputDirectory(outputPath) {
  const outputDir = dirname(outputPath);

  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
    console.log('Created output directory: ' + outputDir);
  }
}

/**
 * Write data to JSON file
 *
 * @param {string} outputPath - Path to output file
 * @param {*} data - Data to write
 */
export function writeJsonFile(outputPath, data) {
  ensureOutputDirectory(outputPath);
  writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf-8');
  console.log('Successfully wrote JSON file: ' + outputPath);
}

/**
 * Read file content
 *
 * @param {string} filePath - Path to file
 * @param {string} encoding - File encoding (default: 'utf-8')
 * @returns {string} File content
 */
export function readFile(filePath, encoding = 'utf-8') {
  validateInputFile(filePath);
  return readFileSync(filePath, encoding);
}

/**
 * Print header with separator
 *
 * @param {string} title - Header title
 */
export function printHeader(title) {
  console.log('Starting ' + title + '...');
}

/**
 * Print input/output paths
 *
 * @param {string} inputPath - Input file path
 * @param {string} outputPath - Output file path
 */
export function printPaths(inputPath, outputPath) {
  console.log('Input:  ' + inputPath);
  console.log('Output: ' + outputPath);
}

/**
 * Handle errors and exit
 *
 * @param {Error} error - Error object
 */
export function handleError(error) {
  console.error('Error: ' + error.message);
  process.exit(1);
}