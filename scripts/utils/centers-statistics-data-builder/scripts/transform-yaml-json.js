#!/usr/bin/env node

/**
 *  █████╗ ██████╗  █████╗ ███████╗
 * ██╔══██╗██╔══██╗██╔══██╗██╔════╝
 * ███████║██████╔╝███████║███████╗
 * ██╔══██║██╔══██╗██╔══██║╚════██║
 * ██║  ██║██║  ██║██║  ██║███████║
 * ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝
 * Transform YAML to JSON (General YAML to JSON converter)
 *
 * Usage:
 *   node transform-yaml-json.js <input-yaml-path> <output-json-path>
 *
 * Examples:
 *   node transform-yaml-json.js ../data/RDCenters/SectorNamesMap.yaml ../../../../public/data/center-statistics/rd-centers/sector_names_map.json
 *   node transform-yaml-json.js ../data/RDCenters/CentersStatistics.yaml ../../../../public/data/center-statistics/rd-centers/rd_center_statistics.json
 *   node transform-yaml-json.js ../data/RDCenters/RegionalDistributionData.yaml ../../../../public/data/center-statistics/rd-centers/regional_distribution_raw_data.json
 */

import yaml from 'js-yaml';
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
  'Usage: node transform-yaml-json.js <input-yaml-path> <output-json-path>'
);

printHeader('YAML to JSON transformation');
printPaths(inputPath, outputPath);

try {
  // Read YAML file
  const yamlContent = readFile(inputPath);
  const data = yaml.load(yamlContent);

  if (!data) {
    console.error('Error: YAML file is empty or invalid');
    process.exit(1);
  }

  console.log('Parsed YAML successfully');

  // Write JSON file
  writeJsonFile(outputPath, data);

  // Show sample output
  console.log('\nSample output:');
  const sampleData = JSON.stringify(data, null, 2);
  const lines = sampleData.split('\n');
  console.log(lines.slice(0, Math.min(20, lines.length)).join('\n'));
  if (lines.length > 20) {
    console.log('... (' + (lines.length - 20) + ' more lines)');
  }
} catch (error) {
  handleError(error);
}
