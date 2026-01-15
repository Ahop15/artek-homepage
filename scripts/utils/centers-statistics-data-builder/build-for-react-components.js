#!/usr/bin/env node

/**
 *  █████╗ ██████╗  █████╗ ███████╗
 * ██╔══██╗██╔══██╗██╔══██╗██╔════╝
 * ███████║██████╔╝███████║███████╗
 * ██╔══██║██╔══██╗██╔══██║╚════██║
 * ██║  ██║██║  ██║██║  ██║███████║
 * ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝
 *
 * Build Script for React Components - Centers Statistics Data
 *
 * This script orchestrates all transformation scripts to convert
 * source data files (YAML/CSV) into JSON files for React components.
 *
 * Input:
 *   - data/RDCenters/ (YAML files from AI processing)
 *   - data/DesignCenters/ (YAML files from AI processing)
 *
 * Output:
 *   - public/data/center-statistics/rd-centers/ (JSON for React)
 *   - public/data/center-statistics/design-centers/ (JSON for React)
 *
 * Usage:
 *   node build-for-react-components.js
 */

import { execSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SCRIPTS_DIR = join(__dirname, 'scripts');
const DATA_DIR = join(__dirname, 'data');
const OUTPUT_BASE = join(__dirname, 'output/for-react-components');

console.log('='.repeat(70));
console.log('Centers Statistics Data Builder');
console.log('='.repeat(70));
console.log('');

// Common transformations (same file names for both center types)
const commonTransformations = [
  {
    name: 'Centers (CSV → JSON)',
    script: 'transform-csv-json.js',
    input: 'Centers.csv',
    output: 'centers.json',
  },
  {
    name: 'Sector Names Map (YAML → JSON)',
    script: 'transform-yaml-json.js',
    input: 'SectorNamesMap.yaml',
    output: 'sector_names_map.json',
  },
  {
    name: 'Centers Statistics (YAML → JSON)',
    script: 'transform-yaml-json.js',
    input: 'CentersStatistics.yaml',
    output: 'center_statistics.json',
  },
  {
    name: 'Regional Distribution (YAML → JSON)',
    script: 'transform-yaml-json.js',
    input: 'RegionalDistributionData.yaml',
    output: 'regional_distribution_raw_data.json',
  },
  {
    name: 'Sectoral Distribution (YAML → locale-specific JSON)',
    script: 'transform-sectoral-distribution.js',
    input: 'SectoralDistribution.yaml',
    output: 'sectoral_distribution_data',
  },
];

// Define center types
const centerTypes = [
  {
    name: 'RD Centers',
    dataDir: join(DATA_DIR, 'RDCenters'),
    outputDir: join(OUTPUT_BASE, 'rd-centers'),
    transformations: commonTransformations,
  },
  {
    name: 'Design Centers',
    dataDir: join(DATA_DIR, 'DesignCenters'),
    outputDir: join(OUTPUT_BASE, 'design-centers'),
    transformations: commonTransformations,
  },
];

let totalSuccess = 0;
let totalFailure = 0;

// Execute transformations for each center type
centerTypes.forEach((centerType, centerIndex) => {
  console.log('');
  console.log(
    '[' + (centerIndex + 1) + '/' + centerTypes.length + '] Processing: ' + centerType.name
  );
  console.log('='.repeat(70));
  console.log('Source: ' + centerType.dataDir);
  console.log('Output: ' + centerType.outputDir);
  console.log('');

  centerType.transformations.forEach((task, taskIndex) => {
    const step = taskIndex + 1;
    const total = centerType.transformations.length;

    console.log('  [' + step + '/' + total + '] ' + task.name);
    console.log('  ' + '-'.repeat(66));

    try {
      const scriptPath = join(SCRIPTS_DIR, task.script);
      const inputPath = join(centerType.dataDir, task.input);
      const outputPath = join(centerType.outputDir, task.output);

      const command = 'node "' + scriptPath + '" "' + inputPath + '" "' + outputPath + '"';

      execSync(command, { stdio: 'inherit' });

      totalSuccess++;
      console.log('');
    } catch (error) {
      totalFailure++;
      console.error('  Failed to execute: ' + task.name);
      console.error('  Error: ' + error.message);
      console.log('');
    }
  });
});

// Summary
console.log('');
console.log('='.repeat(70));
console.log('Build Summary');
console.log('='.repeat(70));
console.log('Total tasks:  ' + (totalSuccess + totalFailure));
console.log('Successful:   ' + totalSuccess);
console.log('Failed:       ' + totalFailure);
console.log('');

if (totalFailure > 0) {
  console.error('Build completed with errors');
  process.exit(1);
} else {
  console.log('Build completed successfully');
  process.exit(0);
}
