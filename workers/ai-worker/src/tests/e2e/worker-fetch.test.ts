/// <reference types="@cloudflare/vitest-pool-workers" />
// noinspection DuplicatedCode

/**
 * ARTEK AI Worker - E2E Tests (Worker Fetch Handler)
 *
 * Tests complete request flow using SELF.fetch() (Cloudflare integration test pattern)
 *
 * Test Coverage:
 * 1. CORS handling (OPTIONS)
 * 2. Endpoint validation
 * 3. Method validation (POST only)
 * 4. Body size limits
 * 5. Rate limiting (KV)
 * 6. JSON parsing
 * 7. Turnstile verification
 * 8. Request validation
 * 9. Blockchain integrity (D1)
 * 10. Claude API integration
 * 11. Response formatting
 * 12. Locale support (TR/EN)
 *
 * Coverage Target: index.ts fetch handler → 80%+
 */

import { describe, it, expect, beforeEach, beforeAll, afterAll, afterEach } from 'vitest';
import { env, SELF } from 'cloudflare:test';
import type { Env, ClaudeResponse } from '../../types';
import type { ChatMessage } from '../../integrity';
import { printTestHeader, printTestFooter, printProgress } from '../helpers/test-logger';

// Type-safe access to test environment bindings
const testEnv = env as unknown as Env;

// Test endpoint URL
const TEST_URL = 'http://localhost/api/v1/chat/completions';

// Test utilities
let testStartTime: number;

beforeEach(() => {
	testStartTime = Date.now();
	const testName = expect.getState().currentTestName || 'Unknown test';
	printTestHeader(testName);
});

afterEach(() => {
	const elapsed = Date.now() - testStartTime;
	printTestFooter(elapsed, 'PASS');
});

// ============================================================================
// DATABASE SETUP
// ============================================================================

beforeAll(async () => {
	// Migration SQL embedded (same as other tests)
	const MIGRATION_SQL = `
		CREATE TABLE IF NOT EXISTS conversation_blocks (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			chain_id TEXT NOT NULL,
			block_index INTEGER NOT NULL,
			context_hash TEXT NOT NULL UNIQUE,
			block_hash TEXT NOT NULL UNIQUE,
			previous_hash TEXT,
			message_count INTEGER NOT NULL,
			full_context TEXT NOT NULL,
			assistant_response TEXT NOT NULL,
			metadata TEXT NOT NULL,
			timestamp INTEGER NOT NULL,
			ip_hash TEXT NOT NULL,
			UNIQUE(chain_id, block_index)
		);
		CREATE INDEX IF NOT EXISTS idx_context_hash ON conversation_blocks(context_hash);
		CREATE INDEX IF NOT EXISTS idx_chain_id ON conversation_blocks(chain_id);
		CREATE INDEX IF NOT EXISTS idx_block_hash ON conversation_blocks(block_hash);
	`;

	await testEnv.AI_LOGS_DB.prepare(MIGRATION_SQL).run();
	printProgress('[SETUP] D1 database initialized for E2E tests');
});

afterAll(async () => {
	// Cleanup KV rate limit keys
	const keys = await testEnv.AI_WORKER_KV.list({ prefix: 'ratelimit:' });
	for (const key of keys.keys) {
		await testEnv.AI_WORKER_KV.delete(key.name);
	}
	await testEnv.AI_WORKER_KV.delete('daily_token_count');
	printProgress('[CLEANUP] KV namespace cleaned');
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Build valid chat request body
 */
function buildChatRequest(messages: ChatMessage[], locale: 'tr' | 'en' = 'tr', turnstileToken = 'XXXX.DUMMY.TOKEN.XXXX') {
	return {
		messages,
		locale,
		turnstileToken,
		max_tokens: 1000,
		temperature: 1.0,
	};
}

// Cloudflare Turnstile always-pass test token
// Pairs with secret key: 1x0000000000000000000000000000000AA (.dev.vars)
const VALID_TURNSTILE_TOKEN = 'XXXX.DUMMY.TOKEN.XXXX';

// ============================================================================
// TEST GROUP 1: HTTP Protocol & CORS
// ============================================================================

describe('Worker Fetch Handler - E2E Tests (SELF.fetch)', () => {
	describe('HTTP Protocol & CORS', () => {
		it('should handle OPTIONS preflight request (CORS)', async () => {
			printProgress('Testing CORS preflight with SELF.fetch()...');

			const response = await SELF.fetch(TEST_URL, {
				method: 'OPTIONS',
			});

			printProgress(`Response status: ${response.status}`);

			// Assertions
			expect(response.status).toBe(204);
			expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
			expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
			expect(response.headers.get('Access-Control-Allow-Headers')).toContain('Content-Type');
		});

		it('should reject invalid endpoint path', async () => {
			printProgress('Testing invalid endpoint...');

			const response = await SELF.fetch('http://localhost/api/invalid', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({}),
			});

			printProgress(`Response status: ${response.status}`);

			expect(response.status).toBe(404);
			const body: any = await response.json();
			expect(body).toHaveProperty('error');
		});

		it('should reject non-POST methods', async () => {
			printProgress('Testing GET method rejection...');

			const response = await SELF.fetch(TEST_URL, {
				method: 'GET',
			});

			printProgress(`Response status: ${response.status}`);

			expect(response.status).toBe(405);
		});

		it('should reject oversized request body', async () => {
			printProgress('Testing request body size limit...');

			const largeBody = 'x'.repeat(2 * 1024 * 1024); // 2MB
			const response = await SELF.fetch(TEST_URL, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Content-Length': largeBody.length.toString(),
				},
				body: largeBody,
			});

			printProgress(`Response status: ${response.status}`);

			expect(response.status).toBe(400);
		});
	});

	// ============================================================================
	// TEST GROUP 2: Request Parsing & Validation
	// ============================================================================

	describe('Request Parsing & Validation', () => {
		it('should reject invalid JSON', async () => {
			printProgress('Testing invalid JSON handling...');

			const response = await SELF.fetch(TEST_URL, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: 'invalid json {',
			});

			printProgress(`Response status: ${response.status}`);

			expect(response.status).toBe(400);
			const body: any = await response.json();
			expect(body.error).toBeDefined();
		});

		it('should reject request with missing turnstile token', async () => {
			printProgress('Testing missing Turnstile token...');

			const requestBody = {
				messages: [{ role: 'user', content: 'Test' }],
				locale: 'tr',
				// turnstileToken missing!
			};

			const response = await SELF.fetch(TEST_URL, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(requestBody),
			});

			printProgress(`Response status: ${response.status}`);

			expect(response.status).toBe(400);
			const body: any = await response.json();
			expect(body.error).toBeDefined(); // Turnstile error (locale may vary)
		});

		it('should reject request with invalid message format', async () => {
			printProgress('Testing invalid message format...');

			const requestBody = {
				messages: [{ role: 'invalid_role', content: 'Test' }], // Invalid role
				locale: 'tr',
				turnstileToken: VALID_TURNSTILE_TOKEN,
			};

			const response = await SELF.fetch(TEST_URL, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(requestBody),
			});

			printProgress(`Response status: ${response.status}`);

			expect(response.status).toBe(400);
		});

		it('should reject empty messages array', async () => {
			printProgress('Testing empty messages validation...');

			const requestBody = {
				messages: [], // Empty!
				locale: 'tr',
				turnstileToken: VALID_TURNSTILE_TOKEN,
			};

			const response = await SELF.fetch(TEST_URL, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(requestBody),
			});

			printProgress(`Response status: ${response.status}`);

			expect(response.status).toBe(400);
		});
	});

	// ============================================================================
	// TEST GROUP 3: Blockchain Integrity
	// ============================================================================

	describe('Blockchain Integrity Verification', () => {
		it('should accept genesis block (single message)', async () => {
			printProgress('Testing genesis block acceptance...');

			const messages: ChatMessage[] = [{ role: 'user', content: 'Hello ARTEK' }];
			const requestBody = buildChatRequest(messages, 'tr', VALID_TURNSTILE_TOKEN);

			const response = await SELF.fetch(TEST_URL, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'CF-Connecting-IP': '127.0.0.1',
				},
				body: JSON.stringify(requestBody),
			});

			printProgress(`Response status: ${response.status}`);

			// Genesis block should be accepted
			expect(response.status).toBe(200);
			const body = (await response.json()) as ClaudeResponse;
			expect(body.content).toBeDefined();
		}, 120000);

		it('should reject invalid continuation (missing context)', async () => {
			printProgress('Testing blockchain integrity violation...');

			// Send continuation WITHOUT creating genesis
			const messages: ChatMessage[] = [
				{ role: 'user', content: 'Non-existent context' },
				{ role: 'assistant', content: 'Some response' },
				{ role: 'user', content: 'Follow-up' },
			];

			const requestBody = buildChatRequest(messages, 'tr', VALID_TURNSTILE_TOKEN);

			const response = await SELF.fetch(TEST_URL, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'CF-Connecting-IP': '127.0.0.1',
				},
				body: JSON.stringify(requestBody),
			});

			printProgress(`Response status: ${response.status}`);

			// Should reject with 409 (integrity violation)
			expect(response.status).toBe(409);
		});

		// Note: Valid continuation test covered in "Full Happy Path > Genesis + Continuation"
		// Real conversation flow test (more realistic than manual D1 insert)
	});

	// ============================================================================
	// TEST GROUP 4: Locale Support
	// ============================================================================

	describe('Locale Support (TR/EN)', () => {
		it('should handle Turkish request with TR locale', async () => {
			printProgress('Testing Turkish locale request...');

			const messages: ChatMessage[] = [{ role: 'user', content: 'Merhaba' }];
			const requestBody = buildChatRequest(messages, 'tr', VALID_TURNSTILE_TOKEN);

			const response = await SELF.fetch(TEST_URL, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'CF-Connecting-IP': '127.0.0.1',
				},
				body: JSON.stringify(requestBody),
			});

			printProgress(`Response status: ${response.status}`);

			expect(response.status).toBe(200);
			const body = (await response.json()) as ClaudeResponse;
			expect(body.content).toBeDefined();
			expect(body.usage.total_tokens).toBeGreaterThan(0);
		}, 120000);

		it('should handle English request with EN locale', async () => {
			printProgress('Testing English locale request...');

			const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }];
			const requestBody = buildChatRequest(messages, 'en', VALID_TURNSTILE_TOKEN);

			const response = await SELF.fetch(TEST_URL, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'CF-Connecting-IP': '127.0.0.1',
				},
				body: JSON.stringify(requestBody),
			});

			printProgress(`Response status: ${response.status}`);

			expect(response.status).toBe(200);
			const body = (await response.json()) as ClaudeResponse;
			expect(body.content).toBeDefined();
		}, 120000);

		it('should default to TR locale when not specified', async () => {
			printProgress('Testing default locale (TR)...');

			const messages: ChatMessage[] = [{ role: 'user', content: 'Test' }];
			const requestBody = {
				messages,
				// locale not specified
				turnstileToken: VALID_TURNSTILE_TOKEN,
			};

			const response = await SELF.fetch(TEST_URL, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'CF-Connecting-IP': '127.0.0.1',
				},
				body: JSON.stringify(requestBody),
			});

			expect(response.status).toBe(200);
		}, 120000);
	});

	// ============================================================================
	// TEST GROUP 5: Response Format
	// ============================================================================

	describe('Response Format Validation', () => {
		it('should return properly formatted Claude response', async () => {
			printProgress('Testing response format...');

			const messages: ChatMessage[] = [{ role: 'user', content: 'Hi' }];
			const requestBody = buildChatRequest(messages, 'tr', VALID_TURNSTILE_TOKEN);

			const response = await SELF.fetch(TEST_URL, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'CF-Connecting-IP': '127.0.0.1',
				},
				body: JSON.stringify(requestBody),
			});

			expect(response.status).toBe(200);

			const body = (await response.json()) as ClaudeResponse;
			printProgress('Validating response structure...');

			// Response structure validation
			expect(body).toHaveProperty('id');
			expect(body).toHaveProperty('type');
			expect(body).toHaveProperty('role');
			expect(body).toHaveProperty('content');
			expect(body).toHaveProperty('model');
			expect(body).toHaveProperty('stop_reason');
			expect(body).toHaveProperty('usage');
			expect(body).toHaveProperty('metadata');

			// Usage structure
			expect(body.usage).toHaveProperty('input_tokens');
			expect(body.usage).toHaveProperty('output_tokens');
			expect(body.usage).toHaveProperty('total_tokens');

			// Metadata structure
			expect(body.metadata).toHaveProperty('duration_ms');
			expect(body.metadata).toHaveProperty('timestamp');

			// Value validations
			expect(body.type).toBe('message');
			expect(body.role).toBe('assistant');
			expect(body.content.length).toBeGreaterThan(0);
			expect(body.model).toContain('claude');
		}, 120000);

		it('should include CORS headers in response', async () => {
			printProgress('Testing CORS headers in response...');

			const messages: ChatMessage[] = [{ role: 'user', content: 'Test' }];
			const requestBody = buildChatRequest(messages, 'tr', VALID_TURNSTILE_TOKEN);

			const response = await SELF.fetch(TEST_URL, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'CF-Connecting-IP': '127.0.0.1',
				},
				body: JSON.stringify(requestBody),
			});

			// CORS headers validation
			expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
			expect(response.headers.get('Content-Type')).toBe('application/json');
		}, 120000);
	});

	// ============================================================================
	// TEST GROUP 6: Full Happy Path (End-to-End)
	// ============================================================================

	describe('Full Happy Path Integration', () => {
		it('should complete full request flow: Genesis → Claude → Response', async () => {
			printProgress('Testing full E2E flow (genesis block)...');

			const messages: ChatMessage[] = [{ role: 'user', content: 'ARTEK hizmetleri nelerdir?' }];
			const requestBody = buildChatRequest(messages, 'tr', VALID_TURNSTILE_TOKEN);

			printProgress('Sending request via SELF.fetch()...');
			const startTime = Date.now();
			const response = await SELF.fetch(TEST_URL, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'CF-Connecting-IP': '127.0.0.1',
				},
				body: JSON.stringify(requestBody),
			});
			const duration = Date.now() - startTime;

			printProgress(`Response received in ${duration}ms`);

			// Success response
			expect(response.status).toBe(200);

			const body = (await response.json()) as ClaudeResponse;
			printProgress('Response body:', {
				id: body.id,
				contentLength: body.content.length,
				model: body.model,
				stopReason: body.stop_reason,
				tokens: body.usage.total_tokens,
			});

			// Full validation
			expect(body.id).toMatch(/^msg_/);
			expect(body.content).toBeDefined();
			expect(body.content.length).toBeGreaterThan(0);
			expect(body.model).toContain('claude');
			expect(body.usage.total_tokens).toBeGreaterThan(0);
			expect(body.metadata.duration_ms).toBeGreaterThan(0);
		}, 120000);

		it('should complete full conversation flow: Genesis + Continuation', async () => {
			printProgress('Testing full conversation flow (2 turns)...');

			// Turn 1: Genesis
			const genesisMessages: ChatMessage[] = [{ role: 'user', content: 'ARTEK nedir?' }];
			const genesisBody = buildChatRequest(genesisMessages, 'tr', VALID_TURNSTILE_TOKEN);

			printProgress('[Turn 1] Sending genesis request...');
			const genesisResponse = await SELF.fetch(TEST_URL, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'CF-Connecting-IP': '127.0.0.1',
				},
				body: JSON.stringify(genesisBody),
			});

			expect(genesisResponse.status).toBe(200);
			const genesisResponseBody = (await genesisResponse.json()) as ClaudeResponse;
			printProgress(`[Turn 1] Genesis response: ${genesisResponseBody.content.substring(0, 100)}...`);

			// Turn 2: Continuation
			const continuationMessages: ChatMessage[] = [
				{ role: 'user', content: 'ARTEK nedir?' },
				{ role: 'assistant', content: genesisResponseBody.content },
				{ role: 'user', content: 'Ar-Ge merkezleri hakkında bilgi?' },
			];

			const continuationBody = buildChatRequest(continuationMessages, 'tr', VALID_TURNSTILE_TOKEN);

			printProgress('[Turn 2] Sending continuation request...');
			const continuationResponse = await SELF.fetch(TEST_URL, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'CF-Connecting-IP': '127.0.0.1',
				},
				body: JSON.stringify(continuationBody),
			});

			expect(continuationResponse.status).toBe(200);
			const continuationResponseBody = (await continuationResponse.json()) as ClaudeResponse;
			printProgress(`[Turn 2] Continuation response: ${continuationResponseBody.content.substring(0, 100)}...`);

			// Conversation flow successful
			expect(continuationResponseBody.content).toBeDefined();
			expect(continuationResponseBody.usage.total_tokens).toBeGreaterThan(0);
		}, 180000);
	});

	// ============================================================================
	// TEST GROUP 7: Error Handling
	// ============================================================================

	describe('Error Handling', () => {
		it('should handle unexpected errors gracefully', async () => {
			printProgress('Testing unexpected error handling...');

			const response = await SELF.fetch(TEST_URL, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: null as any,
			});

			// Should return error response, not crash
			expect(response.status).toBeGreaterThanOrEqual(400);
			expect(response.status).toBeLessThan(600);
		});
	});
});
