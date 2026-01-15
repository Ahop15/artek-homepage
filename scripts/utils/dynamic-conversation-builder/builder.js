#!/usr/bin/env node

/**
 * Dynamic Conversation Builder
 *
 * Continuously generates questions and sends them to the ARTEK AI Worker,
 * displaying responses in real-time on the terminal.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-... node builder.js
 *
 * Stop:
 *   CTRL+C (manual stop)
 *   Validation error from worker (auto stop)
 *   Max iterations reached (auto stop)
 */

import Anthropic from '@anthropic-ai/sdk';
import yaml from 'js-yaml';
import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * @typedef {Object} WorkerConfig
 * @property {string} url
 * @property {string} turnstile_token
 * @property {string} locale
 */

/**
 * @typedef {Object} ConversationAgentConfig
 * @property {string} model
 * @property {number} max_iterations
 * @property {boolean} thinking_enabled
 */

/**
 * @typedef {Object} OutputConfig
 * @property {boolean} show_thinking
 * @property {boolean} color_enabled
 */

/**
 * @typedef {Object} Config
 * @property {WorkerConfig} worker
 * @property {ConversationAgentConfig} conversation_agent
 * @property {OutputConfig} output
 */

// ============================================================================
// LOAD ENVIRONMENT VARIABLES
// ============================================================================

function loadEnv() {
  const envPath = join(__dirname, '.env');
  if (existsSync(envPath)) {
    const envContent = readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach((line) => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          process.env[key.trim()] = valueParts.join('=').trim();
        }
      }
    });
  }
}

loadEnv();

// ============================================================================
// CONFIGURATION
// ============================================================================

/** @type {Config} */
const config = yaml.load(readFileSync(join(__dirname, 'config.yaml'), 'utf8'));
const systemPrompt = readFileSync(join(__dirname, 'system-prompt.md'), 'utf8');

// ============================================================================
// ANTHROPIC CLIENT
// ============================================================================

const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;

if (!apiKey) {
  console.error('[ERROR] ANTHROPIC_API_KEY or CLAUDE_API_KEY environment variable is required');
  console.error('[INFO] Create a .env file in this directory with your API key');
  process.exit(1);
}

const anthropic = new Anthropic({
  apiKey: apiKey,
});

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

const conversationHistory = []; // Store full conversation for context
let messageCount = 0;
let stopped = false;

// ============================================================================
// CTRL+C HANDLER (GRACEFUL SHUTDOWN)
// ============================================================================

process.on('SIGINT', () => {
  if (stopped) {
    // Second CTRL+C = force exit
    console.log('\n[FORCE STOP] Forcing immediate exit...');
    process.exit(0);
  }

  console.log('\n[STOP] Stopping after current query completes...');
  console.log('[INFO] Press CTRL+C again to force exit');
  stopped = true;
});

// ============================================================================
// LOGGING UTILITIES
// ============================================================================

const colors = {
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  reset: '\x1b[0m',
};

/**
 * Log message with optional truncation for display
 * @param {string} prefix - Log prefix (USER, ASSISTANT, etc.)
 * @param {string} message - Message to log
 * @param {string} color - ANSI color code
 * @param {number} maxLength - Max length for display (0 = no truncation)
 */
function log(prefix, message, color = '', maxLength = 0) {
  let displayMessage = message;

  // Truncate if max length specified and message exceeds it
  if (maxLength > 0 && message.length > maxLength) {
    displayMessage = message.substring(0, maxLength) + `... (${message.length} chars total)`;
  }

  if (config.output.color_enabled && color) {
    console.log(`${color}[${prefix}]${colors.reset} ${displayMessage}`);
  } else {
    console.log(`[${prefix}] ${displayMessage}`);
  }
}

// ============================================================================
// MAIN CONVERSATION LOOP
// ============================================================================

async function main() {
  log('START', 'Dynamic Conversation Builder', colors.green);
  log('CONFIG', `Worker: ${config.worker.url}`, colors.cyan);
  console.log('');

  while (!stopped && messageCount < config.conversation_agent.max_iterations) {
    try {
      // 1. Generate next question
      const question = await generateQuestion();
      log('USER', question, colors.cyan, 150); // Truncate at 150 chars

      // 2. Send to worker
      const response = await sendToWorker(question);

      // 3. Display response (truncated for console, full version in DB)
      if (response.content) {
        log('ASSISTANT', response.content, colors.green, 300); // Truncate at 300 chars
      } else {
        log('ASSISTANT', 'No content', colors.yellow);
      }

      // 4. Show thinking if enabled
      if (config.output.show_thinking && response.thinking) {
        log('THINKING', response.thinking, colors.yellow, 200); // Truncate at 200 chars
      }

      // 5. Check for errors (validation error from worker)
      if (response.error || response.status === 'error') {
        const errorMessage = response.error?.message || 'Unknown error';
        log('ERROR', `Validation error: ${errorMessage}`, colors.red);
        break;
      }

      // 6. Store in conversation history
      conversationHistory.push({
        user: question,
        assistant: response.content || 'No content',
      });

      messageCount++;
      console.log(''); // Blank line between exchanges
    } catch (error) {
      log('ERROR', error.message, colors.red);
      break;
    }
  }

  log('DONE', `Conversation completed. Total: ${messageCount} messages`, colors.green);
}

// ============================================================================
// GENERATE QUESTION
// ============================================================================

async function generateQuestion() {
  const messages = buildConversationContext();

  // Build API parameters
  const createParams = {
    model: config.conversation_agent.model,
    max_tokens: 5000, // Must be > thinking.budget_tokens
    system: systemPrompt,
    messages: messages,
  };

  // Add thinking if enabled
  if (config.conversation_agent.thinking_enabled) {
    createParams.thinking = {
      type: 'enabled',
      budget_tokens: 3000, // Thinking budget for question generation
    };
  }

  const response = await anthropic.messages.create(createParams);

  // Extract thinking and text from response
  let questionText = '';
  let thinkingText = '';

  response.content.forEach((block) => {
    if (block.type === 'thinking') {
      thinkingText = block.thinking;
    } else if (block.type === 'text') {
      questionText = block.text;
    }
  });

  // Log agent's thinking process if enabled
  if (thinkingText && config.output.show_thinking) {
    log('AGENT THINKING', thinkingText, colors.yellow, 200);
  }

  return questionText.trim();
}

// ============================================================================
// BUILD CONVERSATION CONTEXT (for question generator)
// ============================================================================

function buildConversationContext() {
  // If no history, start with empty context
  if (conversationHistory.length === 0) {
    return [
      {
        role: 'user',
        content: 'Generate the first test question for the ARTEK AI Worker.',
      },
    ];
  }

  // Otherwise, provide last 5 exchanges as context (10 messages: 5 Q + 5 A)
  const contextMessages = [];
  const recentHistory = conversationHistory.slice(-5);

  recentHistory.forEach((exchange) => {
    contextMessages.push({
      role: 'user',
      content: exchange.user,
    });
    contextMessages.push({
      role: 'assistant',
      content: exchange.assistant,
    });
  });

  // Request next question
  contextMessages.push({
    role: 'user',
    content:
      'Based on the conversation history above, generate the next contextually relevant test question.',
  });

  return contextMessages;
}

// ============================================================================
// SEND TO WORKER
// ============================================================================

async function sendToWorker(question) {
  // Build full message history for worker (like frontend does)
  const messageHistory = [];

  // Add all previous exchanges
  conversationHistory.forEach((exchange) => {
    messageHistory.push({ role: 'user', content: exchange.user });
    messageHistory.push({ role: 'assistant', content: exchange.assistant });
  });

  // Add current question
  messageHistory.push({ role: 'user', content: question });

  try {
    const response = await fetch(config.worker.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'CF-Connecting-IP': '127.0.0.1', // Dev server IP
      },
      body: JSON.stringify({
        messages: messageHistory, // ← Full conversation history (like frontend)
        turnstileToken: config.worker.turnstile_token,
        locale: config.worker.locale,
      }),
    });

    if (!response.ok) {
      // Try to get detailed error from response body
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorBody = await response.json();
        if (errorBody.error?.message) {
          errorMessage = errorBody.error.message;
        } else if (errorBody.message) {
          errorMessage = errorBody.message;
        }
      } catch (e) {
        // If body parsing fails, use status text
      }

      return {
        error: { message: errorMessage },
        status: 'error',
      };
    }

    return await response.json();
  } catch (error) {
    return {
      error: { message: error.message },
      status: 'error',
    };
  }
}

// ============================================================================
// ENTRY POINT
// ============================================================================

main().catch((error) => {
  log('FATAL', error.message, colors.red);
  process.exit(1);
});
