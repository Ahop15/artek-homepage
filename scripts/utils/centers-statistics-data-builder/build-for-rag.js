#!/usr/bin/env node

/**
 *  █████╗ ██████╗  █████╗ ███████╗
 * ██╔══██╗██╔══██╗██╔══██╗██╔════╝
 * ███████║██████╔╝███████║███████╗
 * ██╔══██║██╔══██╗██╔══██║╚════██║
 * ██║  ██║██║  ██║██║  ██║███████║
 * ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝
 * AI-Powered RAG Data Generation Script
 *
 * This script uses Claude API to extract data from PDF files
 * and generate RAG-optimized markdown files (rag-data.md).
 *
 * Usage:
 *   ANTHROPIC_API_KEY=your_key AI_MODEL=sonnet node build-for-rag.js
 *   ANTHROPIC_API_KEY=your_key AI_MODEL=opus node build-for-rag.js
 */

import Anthropic from '@anthropic-ai/sdk';
import { writeFileSync, readFileSync, mkdirSync, existsSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const SOURCE_FILES = {
  'rd-centers': {
    pdf: join(__dirname, 'source/ArGeMerkeziIstatistik2025.pdf'),
    inputDataDir: join(__dirname, 'data/RDCenters'),
    outputDir: join(__dirname, 'output/rag/RDCenters'),
  },
  'design-centers': {
    pdf: join(__dirname, 'source/TasarimMerkezi2025.pdf'),
    inputDataDir: join(__dirname, 'data/DesignCenters'),
    outputDir: join(__dirname, 'output/rag/DesignCenters'),
  },
};

// Model Configurations
const MODELS = {
  opus: {
    id: 'claude-opus-4-1-20250805',
    name: 'Claude Opus 4.1',
    inputPrice: 15.0, // $15 per million
    outputPrice: 75.0, // $75 per million
  },
  sonnet: {
    id: 'claude-sonnet-4-5-20250929',
    name: 'Claude Sonnet 4.5',
    inputPrice: 3.0, // $3 per million
    outputPrice: 15.0, // $15 per million
  },
};

// Select model from environment variable or use default (Opus)
const MODEL_NAME = process.env.AI_MODEL || 'opus';
const SELECTED_MODEL = MODELS[MODEL_NAME];

if (!SELECTED_MODEL) {
  console.error(`ERROR: Invalid model name: ${MODEL_NAME}`);
  console.error(`Available models: ${Object.keys(MODELS).join(', ')}`);
  console.error('Usage: AI_MODEL=sonnet node ai.js  (or AI_MODEL=opus)');
  process.exit(1);
}

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Ensure output directories exist
 */
function ensureDataDirectories() {
  for (const config of Object.values(SOURCE_FILES)) {
    if (!existsSync(config.outputDir)) {
      mkdirSync(config.outputDir, { recursive: true });
      console.log(`  ✓ Created directory: ${config.outputDir}`);
    }
  }
}

/**
 * Read file and convert to base64
 */
function readFileAsBase64(filePath) {
  const buffer = readFileSync(filePath);
  // noinspection JSCheckFunctionSignatures
  const base64 = buffer.toString('base64');
  const stats = statSync(filePath);
  const sizeInMB = stats.size / 1024 / 1024;
  return { base64, sizeInMB };
}

/**
 * Load prompt from file
 */
function loadPrompt() {
  const promptPath = join(__dirname, 'prompts/generate-data.md');
  return readFileSync(promptPath, 'utf8');
}

/**
 * Extract all data from PDF using Claude (with streaming)
 */
async function extractAllData(pdfBase64, prompt) {
  console.log(`  Sending request to Claude API (streaming enabled)...`);
  console.log(`  - PDF document (base64)`);
  console.log(`  - Prompt (${prompt.length} chars)`);

  const stream = await anthropic.messages.create({
    model: SELECTED_MODEL.id,
    max_tokens: 32000,
    thinking: {
      type: 'enabled',
      budget_tokens: 20000, // Extended thinking budget
    },
    stream: true,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: pdfBase64,
            },
          },
          {
            type: 'text',
            text: prompt,
          },
        ],
      },
    ],
  });

  let responseText = '';
  let thinkingText = '';
  let inputTokens = 0;
  let outputTokens = 0;
  let thinkingInProgress = false;
  let thinkingBuffer = '';
  console.log(''); // New line before thinking

  // Process stream
  for await (const event of stream) {
    if (event.type === 'content_block_start') {
      if (event.content_block.type === 'thinking') {
        console.log('  [THINKING] Claude is reasoning...\n');
        thinkingInProgress = true;
      } else if (event.content_block.type === 'text') {
        if (thinkingInProgress) {
          // Flush any remaining buffered thinking text
          if (thinkingBuffer.trim()) {
            process.stdout.write(`  💭 ${thinkingBuffer.trim()}\n`);
            thinkingBuffer = '';
          }
          const wordCount = thinkingText.split(/\s+/).filter((w) => w).length;
          console.log(`\n  ✓ Thinking complete (${wordCount} words)\n`);
          thinkingInProgress = false;
        }
        console.log('  [OUTPUT] Generating response...');
      }
    } else if (event.type === 'content_block_delta') {
      if (event.delta.type === 'thinking_delta') {
        thinkingText += event.delta.thinking;
        thinkingBuffer += event.delta.thinking;

        // Show complete lines only (buffer incomplete lines)
        const lines = thinkingBuffer.split('\n');

        // Process all complete lines (all except the last one)
        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i].trim();
          if (line) {
            process.stdout.write(`  💭 ${line}\n`);
          }
        }

        // Keep the last incomplete line in buffer
        thinkingBuffer = lines[lines.length - 1];
      } else if (event.delta.type === 'text_delta') {
        responseText += event.delta.text;
        process.stdout.write('.'); // Show output progress
      }
    } else if (event.type === 'message_start') {
      inputTokens = event.message.usage.input_tokens;
    } else if (event.type === 'message_delta') {
      outputTokens = event.usage.output_tokens;
      if (event.delta && event.delta.stop_reason === 'max_tokens') {
        console.log('\n  ⚠ Warning: Reached max tokens limit');
      }
    }
  }

  console.log(''); // New line after progress dots
  console.log(`  ✓ Response received (${inputTokens} input, ${outputTokens} output tokens)`);

  return { responseText, inputTokens, outputTokens };
}

/**
 * Parse response by separators and extract YAML files and working report
 */
function parseResponse(responseText) {
  console.log(`  Parsing response...`);

  const files = {
    'rag-data.md': '',
    'rag-data-en.md': '',
  };

  const separators = ['=== rag-data.md ===', '=== rag-data-en.md ==='];

  // Split by separators
  for (let i = 0; i < separators.length; i++) {
    const currentSeparator = separators[i];
    const nextSeparator = separators[i + 1];

    if (!responseText.includes(currentSeparator)) {
      console.warn(`  ⚠ Warning: Separator not found: ${currentSeparator}`);
      continue;
    }

    const startIndex = responseText.indexOf(currentSeparator) + currentSeparator.length;
    const endIndex = nextSeparator ? responseText.indexOf(nextSeparator) : responseText.length;

    let content = responseText.substring(startIndex, endIndex).trim();

    // Clean up markdown code fences if present
    content = content
      .replace(/^```markdown?\n?/gm, '')
      .replace(/^```yaml?\n?/gm, '')
      .replace(/^```csv?\n?/gm, '')
      .replace(/^```\n?/gm, '')
      .replace(/```\s*$/gm, '')
      .trim();

    const fileName = currentSeparator.replace(/^=== /, '').replace(/ ===$/, '');
    files[fileName] = content;

    console.log(`  ✓ Extracted: ${fileName} (${content.length} chars)`);
  }

  return files;
}

/**
 * Save files to data directory
 */
function saveFiles(files, dataDir) {
  console.log(`  Saving files to: ${dataDir}`);

  let savedCount = 0;

  for (const [fileName, content] of Object.entries(files)) {
    if (!content) {
      console.warn(`  ⚠ Skipping empty file: ${fileName}`);
      continue;
    }

    const filePath = join(dataDir, fileName);
    writeFileSync(filePath, String(content), 'utf8');
    console.log(`  ✓ Saved: ${fileName}`);
    savedCount++;
  }

  console.log(`  ✓ Total files saved: ${savedCount}/2 (RAG Markdown TR+EN)`);

  return savedCount;
}

/**
 * Calculate cost based on token usage and selected model
 */
function calculateCost(inputTokens, outputTokens) {
  const inputCost = (inputTokens / 1_000_000) * SELECTED_MODEL.inputPrice;
  const outputCost = (outputTokens / 1_000_000) * SELECTED_MODEL.outputPrice;
  const totalCost = inputCost + outputCost;

  return {
    inputCost,
    outputCost,
    totalCost,
  };
}

/**
 * Format execution time
 */
function formatExecutionTime(milliseconds) {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Main execution
 */
async function main() {
  const startTime = Date.now();

  console.log('='.repeat(70));
  console.log('AI-Powered Centers Statistics Extraction (PDF Only)');
  console.log('='.repeat(70));
  console.log('');
  console.log(`Model: ${SELECTED_MODEL.name} (${SELECTED_MODEL.id})`);
  console.log(
    `Pricing: $${SELECTED_MODEL.inputPrice}/M input, $${SELECTED_MODEL.outputPrice}/M output`
  );
  console.log('');

  // Check API key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ERROR: ANTHROPIC_API_KEY environment variable is not set');
    console.error('Usage: ANTHROPIC_API_KEY=your_key node ai.js');
    process.exit(1);
  }

  // Track total costs and time
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  // Ensure data directories exist
  console.log('Step 1: Ensuring data directories exist...');
  ensureDataDirectories();
  console.log('');

  // Load prompt
  console.log('Step 2: Loading prompt...');
  const prompt = loadPrompt();
  console.log(`  ✓ Prompt loaded (${prompt.length} chars)`);
  console.log('');

  // Process both center types
  for (const [centerType, config] of Object.entries(SOURCE_FILES)) {
    console.log(`\nProcessing: ${centerType.toUpperCase()}`);
    console.log('='.repeat(70));

    try {
      // Step 3: Read PDF
      console.log('\nStep 3: Reading PDF...');
      const { base64: pdfBase64, sizeInMB: pdfSize } = readFileAsBase64(config.pdf);
      console.log(`  ✓ PDF loaded: ${pdfSize.toFixed(2)} MB`);

      // Step 4: Extract RAG data using Claude
      console.log('\nStep 4: Generating RAG data with Claude...');
      const { responseText, inputTokens, outputTokens } = await extractAllData(pdfBase64, prompt);

      // Track tokens
      totalInputTokens += inputTokens;
      totalOutputTokens += outputTokens;

      // Step 5: Parse response
      console.log('\nStep 5: Parsing response...');
      const files = parseResponse(responseText);

      // Step 6: Save files
      console.log('\nStep 6: Saving files...');
      const savedCount = saveFiles(files, config.outputDir);

      if (savedCount === 2) {
        console.log(`\n  ✓✓✓ ${centerType} RAG data completed successfully! ✓✓✓`);
      } else {
        console.log(`\n  ⚠ ${centerType} completed with warnings (${savedCount}/2 files saved)`);
      }

      // Step 7: Generate centers markdown from CSV (TR + EN)
      console.log('\nStep 7: Generating centers markdown from CSV (TR + EN)...');
      const csvPath = join(config.inputDataDir, 'Centers.csv');
      if (existsSync(csvPath)) {
        const { generateCentersMarkdown } = await import('./scripts/transform-centers-table.js');
        generateCentersMarkdown(csvPath, config.outputDir, centerType, 'tr');
        generateCentersMarkdown(csvPath, config.outputDir, centerType, 'en');
        console.log(
          `  ✓ Centers Markdown data generated: rag-centers-data.md + rag-centers-data-en.md`
        );
      } else {
        console.log(`  ⚠ Centers.csv not found - skipping centers data generation`);
      }
    } catch (error) {
      console.error(`\n  ✗ ${centerType} failed: ${error.message}`);
      if (error.stack) {
        console.error(`  Stack trace: ${error.stack}`);
      }
    }

    console.log('');
  }

  const endTime = Date.now();
  const executionTime = endTime - startTime;

  console.log('');
  console.log('='.repeat(70));
  console.log('Extraction Complete');
  console.log('='.repeat(70));

  // Calculate and display total cost and time
  if (totalInputTokens > 0 || totalOutputTokens > 0) {
    console.log('');
    console.log('SESSION SUMMARY');
    console.log('='.repeat(70));

    const { inputCost, outputCost, totalCost } = calculateCost(totalInputTokens, totalOutputTokens);

    // Model info
    console.log(`Model Used:  ${SELECTED_MODEL.name}`);
    console.log(`Execution Time: ${formatExecutionTime(executionTime)}`);
    console.log('');

    // Token usage
    console.log(`Total Input Tokens:  ${totalInputTokens.toLocaleString()}`);
    console.log(`Total Output Tokens: ${totalOutputTokens.toLocaleString()} (includes thinking)`);
    console.log('');

    // Cost breakdown
    console.log(
      `Input Cost:  $${inputCost.toFixed(4)} (${totalInputTokens.toLocaleString()} × $${SELECTED_MODEL.inputPrice}/M)`
    );
    console.log(
      `Output Cost: $${outputCost.toFixed(4)} (${totalOutputTokens.toLocaleString()} × $${SELECTED_MODEL.outputPrice}/M)`
    );
    console.log('-'.repeat(70));
    console.log(`TOTAL COST:  $${totalCost.toFixed(4)}`);
    console.log('='.repeat(70));

    // Additional stats
    const requestCount = Object.keys(SOURCE_FILES).length;
    const avgCostPerRequest = totalCost / requestCount;
    const avgTimePerRequest = executionTime / requestCount;

    console.log('');
    console.log('Per Request Average:');
    console.log(`  Cost: $${avgCostPerRequest.toFixed(4)}`);
    console.log(`  Time: ${formatExecutionTime(avgTimePerRequest)}`);
  }
}

// Run
main().catch(console.error);
