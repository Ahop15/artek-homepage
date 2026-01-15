#!/usr/bin/env node

/**
 *  █████╗ ██████╗  █████╗ ███████╗
 * ██╔══██╗██╔══██╗██╔══██╗██╔════╝
 * ███████║██████╔╝███████║███████╗
 * ██╔══██║██╔══██╗██╔══██║╚════██║
 * ██║  ██║██║  ██║██║  ██║███████║
 * ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝
 * Transform Sectoral Distribution YAML to locale-specific JSON files
 *
 * Automatically generates:
 *   - Color palette (earth tones, based on group count)
 *   - show_label flags (items with >=15% of group total)
 *   - Locale translations from SectorNamesMap.yaml
 *
 * Generates 4 files:
 *   - {output-base}.tr.json                    (data for Turkish)
 *   - {output-base}.en.json                    (data for English)
 *   - {output-base}-color-scale.tr.json        (color scale for Turkish)
 *   - {output-base}-color-scale.en.json        (color scale for English)
 *
 * Usage:
 *   node transform-sectoral-distribution.js <input-yaml-path> <output-base-path>
 *
 * Example:
 *   node transform-sectoral-distribution.js ../data/RDCenters/SectoralDistribution.yaml ../../../../public/data/center-statistics/rd-centers/sectoral_distribution_data
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import yaml from 'js-yaml';

/**
 * Earth Tones Color Palette
 * Generates a color palette with warm, earthy tones suitable for data visualization
 */
const EARTH_TONES_PALETTE = [
  '#e8703e', // Burnt Orange
  '#8e6f20', // Olive Brown
  '#d73027', // Terra Cotta Red
  '#71ca36', // Leaf Green
  '#006837', // Forest Green
  '#526313', // Moss Green
  '#1a9850', // Emerald Green
  '#c97a30', // Copper
  '#9b5e3c', // Clay Brown
  '#5a8247', // Sage Green
  '#b85450', // Adobe Red
  '#7d9c65', // Fern Green
];

/**
 * Generate color palette for groups
 * @param {number} count - Number of colors needed
 * @returns {string[]} Array of hex colors
 */
function generateColorPalette(count) {
  if (count <= EARTH_TONES_PALETTE.length) {
    return EARTH_TONES_PALETTE.slice(0, count);
  }

  // If we need more colors than available, cycle through palette
  const colors = [];
  for (let i = 0; i < count; i++) {
    colors.push(EARTH_TONES_PALETTE[i % EARTH_TONES_PALETTE.length]);
  }
  return colors;
}

/**
 * Calculate show_label for items based on percentage threshold
 * Items with >=15% of group total get show_label: true
 *
 * @param {Array} items - Array of items with value property
 * @returns {Array} Items with showLabel property added
 */
function calculateShowLabels(items) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  const threshold = 0.15; // 15%

  return items.map((item) => {
    const percentage = item.value / total;
    return {
      ...item,
      showLabel: percentage >= threshold,
    };
  });
}

// Get command line arguments
const args = process.argv.slice(2);

if (args.length < 2) {
  console.error('Error: Missing required arguments');
  console.log(
    'Usage: node transform-sectoral-distribution.js <input-yaml-path> <output-base-path>'
  );
  process.exit(1);
}

const inputPath = args[0];
const outputBasePath = args[1];

console.log('Starting YAML to JSON transformation...');
console.log('Input:  ' + inputPath);
console.log('Output: ' + outputBasePath + '.{tr|en}.json');
console.log('        ' + outputBasePath + '-color-scale.{tr|en}.json');

try {
  // Read SectoralDistribution YAML file
  if (!existsSync(inputPath)) {
    console.error('Error: Input file not found: ' + inputPath);
    process.exit(1);
  }

  const yamlContent = readFileSync(inputPath, 'utf-8');
  const rawData = yaml.load(yamlContent);

  if (!rawData || !rawData.data || !Array.isArray(rawData.data)) {
    console.error('Error: Invalid YAML structure - expected "data" array');
    process.exit(1);
  }

  console.log('Parsed ' + rawData.data.length + ' sector groups');

  // Read SectorNamesMap.yaml from same directory
  const inputDir = dirname(inputPath);
  const sectorNamesMapPath = join(inputDir, 'SectorNamesMap.yaml');

  if (!existsSync(sectorNamesMapPath)) {
    console.error('Error: SectorNamesMap.yaml not found in: ' + inputDir);
    process.exit(1);
  }

  const sectorNamesMapContent = readFileSync(sectorNamesMapPath, 'utf-8');
  const sectorNamesMapRaw = yaml.load(sectorNamesMapContent);

  if (!sectorNamesMapRaw || typeof sectorNamesMapRaw !== 'object') {
    console.error('Error: Invalid SectorNamesMap.yaml structure');
    process.exit(1);
  }

  // Type assertion after validation
  const sectorNamesMap = /** @type {Record<string, string>} */ (sectorNamesMapRaw);

  console.log('Loaded SectorNamesMap with ' + Object.keys(sectorNamesMap).length + ' entries');

  // Generate color palette for all groups
  const colors = generateColorPalette(rawData.data.length);
  console.log('Generated ' + colors.length + ' colors from earth tones palette');

  // Process for both locales
  const locales = ['tr', 'en'];
  const outputs = {};

  locales.forEach((locale) => {
    console.log('\nProcessing locale: ' + locale);

    // Build data structure with colors
    const data = rawData.data.map((group, index) => {
      // Get group name (TR for tr locale, translate via map for en)
      const groupNameTr = group.name;
      const groupName = locale === 'tr' ? groupNameTr : sectorNamesMap[groupNameTr] || groupNameTr;

      // Calculate show_label for items (based on 15% threshold)
      const itemsWithLabels = calculateShowLabels(
        group.items.map((item) => {
          const itemNameTr = item.name;
          const itemName = locale === 'tr' ? itemNameTr : sectorNamesMap[itemNameTr] || itemNameTr;

          return {
            name: itemName,
            value: item.value,
          };
        })
      );

      return {
        name: groupName,
        color: colors[index],
        children: itemsWithLabels,
      };
    });

    // Build color scale (using generated colors)
    const colorScale = {};
    rawData.data.forEach((group, index) => {
      const groupNameTr = group.name;
      const groupName = locale === 'tr' ? groupNameTr : sectorNamesMap[groupNameTr] || groupNameTr;
      colorScale[groupName] = colors[index];
    });

    outputs[locale] = { data, colorScale };

    console.log('  - Generated ' + data.length + ' groups with colors');
    console.log('  - Generated ' + Object.keys(colorScale).length + ' color mappings');
    console.log('  - Translated names using SectorNamesMap (' + locale + ')');

    // Count items with labels
    const labeledItems = data.reduce(
      (sum, group) => sum + group.children.filter((item) => item.showLabel).length,
      0
    );
    console.log('  - Applied show_label to ' + labeledItems + ' items (>=15% threshold)');
  });

  // Ensure output directory exists
  const outputDir = dirname(outputBasePath);
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
    console.log('\nCreated output directory: ' + outputDir);
  }

  // Write output files
  console.log('\nWriting output files...');

  locales.forEach((locale) => {
    // Write data file
    const dataPath = outputBasePath + '.' + locale + '.json';
    writeFileSync(dataPath, JSON.stringify(outputs[locale].data, null, 2), 'utf-8');
    console.log('  - ' + dataPath);

    // Write color scale file
    const colorScalePath = outputBasePath + '-color-scale.' + locale + '.json';
    writeFileSync(colorScalePath, JSON.stringify(outputs[locale].colorScale, null, 2), 'utf-8');
    console.log('  - ' + colorScalePath);
  });

  console.log('\nSuccess! Generated 4 files');

  // Show sample output (TR data, first 2 groups)
  console.log('\nSample output (TR data, first 2 groups):');
  console.log(JSON.stringify(outputs.tr.data.slice(0, 2), null, 2));

  console.log('\nSample color scale (TR):');
  const sampleColorScale = {};
  Object.keys(outputs.tr.colorScale)
    .slice(0, 3)
    .forEach((key) => {
      sampleColorScale[key] = outputs.tr.colorScale[key];
    });
  console.log(JSON.stringify(sampleColorScale, null, 2));
} catch (error) {
  console.error('Error: ' + error.message);
  process.exit(1);
}
