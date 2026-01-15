#!/usr/bin/env node

/**
 *  █████╗ ██████╗  █████╗ ███████╗
 * ██╔══██╗██╔══██╗██╔══██╗██╔════╝
 * ███████║██████╔╝███████║███████╗
 * ██╔══██║██╔══██╗██╔══██║╚════██║
 * ██║  ██║██║  ██║██║  ██║███████║
 * ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝
 *
 * Diagram to Prose - Mermaid to Natural Language Converter
 *
 * Converts Mermaid diagrams in markdown files to natural language prose
 * using Claude AI, optimized for RAG systems.
 *
 * Usage:
 *   diagram-to-prose <input-file.md>
 *   diagram-to-prose /path/to/diagram.md
 *
 * Output:
 *   Creates <input-file>.prose.md in the same directory
 */

import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname, basename, extname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

// Setup paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from tool directory
config({ path: join(__dirname, '.env') });

// Model Configuration
const MODEL = {
  id: 'claude-sonnet-4-5-20250929',
  name: 'Claude Sonnet 4.5',
  inputPrice: 3.0,
  outputPrice: 15.0,
};

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  dim: '\x1b[2m',
};

const log = {
  info: (msg) => console.log(`${colors.cyan}[DIAGRAM-TO-PROSE]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[DIAGRAM-TO-PROSE]${colors.reset} ${msg}`),
  error: (msg) => console.error(`${colors.red}[DIAGRAM-TO-PROSE]${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}[DIAGRAM-TO-PROSE]${colors.reset} ${msg}`),
  dim: (msg) => console.log(`${colors.dim}${msg}${colors.reset}`),
};

/**
 * Show usage help
 */
function showHelp() {
  console.log(`
${colors.cyan}Diagram to Prose${colors.reset} - Convert Mermaid diagrams to natural language

${colors.yellow}Usage:${colors.reset}
  diagram-to-prose <input-file.md>
  diagram-to-prose /path/to/diagram.md

${colors.yellow}Arguments:${colors.reset}
  input-file.md    Markdown file containing Mermaid diagram

${colors.yellow}Output:${colors.reset}
  Creates <input-file>.prose.md in the same directory as input

${colors.yellow}Environment:${colors.reset}
  CLAUDE_API_KEY   Claude API key (required)
                   Can be set in .env file or environment

${colors.yellow}Examples:${colors.reset}
  diagram-to-prose ./flow-chart.md
  diagram-to-prose /Users/project/data/process.md

${colors.yellow}Setup:${colors.reset}
  1. cd scripts/tools/diagram-to-prose
  2. npm install
  3. cp .env.example .env
  4. Edit .env and add your CLAUDE_API_KEY
  5. npm link (for global usage)
`);
}

/**
 * Load prompt from prompts directory
 */
function loadPrompt() {
  const promptPath = join(__dirname, 'prompts/mermaid-to-prose.md');

  if (!existsSync(promptPath)) {
    throw new Error(`Prompt file not found: ${promptPath}`);
  }

  return readFileSync(promptPath, 'utf8');
}

/**
 * Read input markdown file
 */
function readInputFile(filePath) {
  if (!existsSync(filePath)) {
    throw new Error(`Input file not found: ${filePath}`);
  }

  const content = readFileSync(filePath, 'utf8');

  if (!content.trim()) {
    throw new Error(`Input file is empty: ${filePath}`);
  }

  return content;
}

/**
 * Generate output file path (.prose.md)
 */
function getOutputPath(inputPath) {
  const dir = dirname(inputPath);
  const ext = extname(inputPath);
  const base = basename(inputPath, ext);

  return join(dir, `${base}.prose${ext}`);
}

/**
 * Convert diagram to prose using Claude API
 */
async function convertToProse(diagramContent, systemPrompt, apiKey) {
  const anthropic = new Anthropic({
    apiKey: apiKey,
  });

  log.info('Sending request to Claude API...');

  const startTime = Date.now();

  const response = await anthropic.messages.create({
    model: MODEL.id,
    max_tokens: 4096,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: `Convert the following Mermaid diagram to natural language prose:\n\n${diagramContent}`,
      },
    ],
  });

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(1);

  const inputTokens = response.usage.input_tokens;
  const outputTokens = response.usage.output_tokens;

  // Calculate cost
  const inputCost = (inputTokens / 1_000_000) * MODEL.inputPrice;
  const outputCost = (outputTokens / 1_000_000) * MODEL.outputPrice;
  const totalCost = inputCost + outputCost;

  log.success(`Response received in ${duration}s`);
  log.dim(`  Tokens: ${inputTokens} input, ${outputTokens} output`);
  log.dim(`  Cost: $${totalCost.toFixed(4)}`);

  // Extract text content
  const textContent = response.content.find((block) => block.type === 'text');

  if (!textContent) {
    throw new Error('No text content in Claude response');
  }

  return textContent.text;
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);

  // Handle help flag
  if (args.includes('--help') || args.includes('-h') || args.length === 0) {
    showHelp();
    process.exit(0);
  }

  const inputPath = args[0];

  // Resolve to absolute path
  const absoluteInputPath = inputPath.startsWith('/') ? inputPath : join(process.cwd(), inputPath);

  console.log('');
  log.info('Diagram to Prose Converter');
  console.log('='.repeat(60));
  console.log('');

  // Check API key
  const apiKey = process.env.CLAUDE_API_KEY;

  if (!apiKey) {
    log.error('CLAUDE_API_KEY is not set');
    log.dim('Set it in .env file or as environment variable');
    log.dim('See: diagram-to-prose --help');
    process.exit(1);
  }

  try {
    // Step 1: Read input file
    log.info(`Reading: ${absoluteInputPath}`);
    const diagramContent = readInputFile(absoluteInputPath);
    log.success(`Input loaded (${diagramContent.length} chars)`);

    // Step 2: Load prompt
    log.info('Loading prompt...');
    const systemPrompt = loadPrompt();
    log.success(`Prompt loaded (${systemPrompt.length} chars)`);

    // Step 3: Convert to prose
    log.info('Converting diagram to prose...');
    const proseContent = await convertToProse(diagramContent, systemPrompt, apiKey);

    // Step 4: Save output
    const outputPath = getOutputPath(absoluteInputPath);
    log.info(`Saving: ${outputPath}`);
    writeFileSync(outputPath, proseContent, 'utf8');
    log.success(`Output saved (${proseContent.length} chars)`);

    console.log('');
    console.log('='.repeat(60));
    log.success('Conversion complete!');
    console.log('');
    log.dim(`Input:  ${absoluteInputPath}`);
    log.dim(`Output: ${outputPath}`);
    console.log('');
  } catch (error) {
    console.log('');
    log.error(`Failed: ${error.message}`);

    if (error.status === 401) {
      log.dim('Invalid API key. Check your CLAUDE_API_KEY.');
    } else if (error.status === 429) {
      log.dim('Rate limited. Please wait and try again.');
    }

    process.exit(1);
  }
}

// Run
main().catch((error) => {
  log.error(`Unhandled error: ${error.message}`);
  process.exit(1);
});
