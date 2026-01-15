/// <reference types="@cloudflare/vitest-pool-workers" />

/**
 * ARTEK AI Worker - BlockchainIntegrityManager Integration Tests
 *
 * Tests the complete blockchain integrity system using REAL D1 database (Miniflare).
 *
 * Test Philosophy:
 * - Use REAL BlockchainIntegrityManager (production code)
 * - Use REAL D1 database (Miniflare SQLite)
 * - Setup helpers use REAL manager (not mocks)
 * - Tests verify actual behavior, not test doubles
 *
 * Coverage:
 * 1. Genesis block verification
 * 2. Continuation block verification
 * 3. Integrity violations (tamper detection)
 * 4. Blockchain logging to D1
 * 5. Chain validation
 * 6. Query utilities
 * 7. Edge cases
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import type { D1Database } from '@cloudflare/workers-types';
import { BlockchainIntegrityManager, type ChatMessage } from '../../integrity';
import { cleanDatabase, seedConversation } from '../helpers/d1-test-utils';
import type { Env } from '../../types';

// Type-safe access to test environment bindings
const testEnv = env as unknown as Env;

describe('BlockchainIntegrityManager - Integration Tests', () => {
	let manager: BlockchainIntegrityManager;
	let db: D1Database;

	beforeEach(async () => {
		// Get D1 database from test environment
		db = testEnv.AI_LOGS_DB;

		// Clean D1 database for test isolation
		await cleanDatabase(db);

		// Initialize manager with REAL D1
		manager = new BlockchainIntegrityManager(db);
	});

	// ============================================================================
	// TEST GROUP 1: Genesis Block Verification
	// ============================================================================

	describe('Genesis Block Verification', () => {
		it('should verify genesis block (single user message)', async () => {
			const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }];

			const blockInfo = await manager.verifyMessages(messages);

			expect(blockInfo.valid).toBe(true);
			expect(blockInfo.isGenesis).toBe(true);
			expect(blockInfo.blockIndex).toBe(0);
			expect(blockInfo.prevHash).toBeNull();
			expect(blockInfo.chainId).toMatch(/^0x[a-f0-9]{64}$/);
		});

		it('should generate unique chain_id for each genesis', async () => {
			const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }];

			const blockInfo1 = await manager.verifyMessages(messages);
			const blockInfo2 = await manager.verifyMessages(messages);

			expect(blockInfo1.chainId).not.toBe(blockInfo2.chainId);
			expect(blockInfo1.valid).toBe(true);
			expect(blockInfo2.valid).toBe(true);
		});

		it('should verify genesis with Turkish content', async () => {
			const messages: ChatMessage[] = [{ role: 'user', content: 'Merhaba, nasılsın? İyi günler!' }];

			const blockInfo = await manager.verifyMessages(messages);

			expect(blockInfo.valid).toBe(true);
			expect(blockInfo.isGenesis).toBe(true);
		});

		it('should verify genesis with emoji and special characters', async () => {
			const messages: ChatMessage[] = [{ role: 'user', content: '🚀 Hello! @#$%^&*() Special chars' }];

			const blockInfo = await manager.verifyMessages(messages);

			expect(blockInfo.valid).toBe(true);
			expect(blockInfo.isGenesis).toBe(true);
		});

		it('should verify genesis with markdown content', async () => {
			const messages: ChatMessage[] = [{ role: 'user', content: '# Title\n\n```typescript\nconst x = 1;\n```\n\nSome text.' }];

			const blockInfo = await manager.verifyMessages(messages);

			expect(blockInfo.valid).toBe(true);
			expect(blockInfo.isGenesis).toBe(true);
		});
	});

	// ============================================================================
	// TEST GROUP 2: Continuation Block Verification
	// ============================================================================

	describe('Continuation Block Verification', () => {
		it('should verify valid continuation (2-turn conversation)', async () => {
			// Setup: Insert genesis block using REAL manager
			const { lastContext } = await seedConversation(db, [{ user: 'Hello', assistant: 'Hi there!' }]);

			// Test: Verify continuation
			const continuationMessages: ChatMessage[] = [...lastContext, { role: 'user', content: 'How are you?' }];

			const blockInfo = await manager.verifyMessages(continuationMessages);

			expect(blockInfo.valid).toBe(true);
			expect(blockInfo.isGenesis).toBe(false);
			expect(blockInfo.blockIndex).toBe(1);
			expect(blockInfo.prevHash).toBeDefined();
			expect(blockInfo.prevHash).not.toBeNull();
		});

		it('should verify multi-turn conversation (5 turns)', async () => {
			// Setup: 4 turns
			const { lastContext } = await seedConversation(db, [
				{ user: 'Turn 1', assistant: 'Response 1' },
				{ user: 'Turn 2', assistant: 'Response 2' },
				{ user: 'Turn 3', assistant: 'Response 3' },
				{ user: 'Turn 4', assistant: 'Response 4' },
			]);

			// Test: 5th turn
			const messages: ChatMessage[] = [...lastContext, { role: 'user', content: 'Turn 5' }];

			const blockInfo = await manager.verifyMessages(messages);

			expect(blockInfo.valid).toBe(true);
			expect(blockInfo.blockIndex).toBe(4);
		});

		it('should verify continuation with large content', async () => {
			const largeContent = 'A'.repeat(10000); // 10KB

			const { lastContext } = await seedConversation(db, [{ user: 'Hello', assistant: largeContent }]);

			const messages: ChatMessage[] = [...lastContext, { role: 'user', content: 'Next message' }];

			const blockInfo = await manager.verifyMessages(messages);

			expect(blockInfo.valid).toBe(true);
		});

		it('should maintain same chain_id across continuation', async () => {
			const { chainId: genesisChainId, lastContext } = await seedConversation(db, [{ user: 'Hello', assistant: 'Hi!' }]);

			const messages: ChatMessage[] = [...lastContext, { role: 'user', content: 'How are you?' }];

			const blockInfo = await manager.verifyMessages(messages);

			expect(blockInfo.chainId).toBe(genesisChainId);
		});
	});

	// ============================================================================
	// TEST GROUP 3: Integrity Violations (Tamper Detection)
	// ============================================================================

	describe('Integrity Violations - Tamper Detection', () => {
		it('should detect modified user message', async () => {
			await seedConversation(db, [{ user: 'Original message', assistant: 'Response' }]);

			// Tamper: Modify first user message
			const tamperedMessages: ChatMessage[] = [
				{ role: 'user', content: 'MODIFIED MESSAGE' }, // ← Changed!
				{ role: 'assistant', content: 'Response' },
				{ role: 'user', content: 'New question' },
			];

			const blockInfo = await manager.verifyMessages(tamperedMessages);

			expect(blockInfo.valid).toBe(false);
			expect(blockInfo.error).toBe('INTEGRITY_VIOLATION');
		});

		it('should detect modified assistant response', async () => {
			await seedConversation(db, [{ user: 'Hello', assistant: 'Hi there!' }]);

			// Tamper: Modify assistant response
			const tamperedMessages: ChatMessage[] = [
				{ role: 'user', content: 'Hello' },
				{ role: 'assistant', content: 'MODIFIED RESPONSE' }, // ← Changed!
				{ role: 'user', content: 'Next' },
			];

			const blockInfo = await manager.verifyMessages(tamperedMessages);

			expect(blockInfo.valid).toBe(false);
			expect(blockInfo.error).toBe('INTEGRITY_VIOLATION');
		});

		it('should detect single character modification', async () => {
			await seedConversation(db, [{ user: 'Hello', assistant: 'Hi!' }]);

			// Tamper: Single character change (lowercase 'h')
			const tamperedMessages: ChatMessage[] = [
				{ role: 'user', content: 'hello' }, // ← lowercase!
				{ role: 'assistant', content: 'Hi!' },
				{ role: 'user', content: 'Next' },
			];

			const blockInfo = await manager.verifyMessages(tamperedMessages);

			expect(blockInfo.valid).toBe(false);
		});

		it('should detect injected fake message at beginning', async () => {
			const { lastContext } = await seedConversation(db, [{ user: 'Hello', assistant: 'Hi!' }]);

			// Tamper: Inject fake message at start
			const tamperedMessages: ChatMessage[] = [
				{ role: 'user', content: 'FAKE MESSAGE' }, // ← Injected!
				...lastContext,
				{ role: 'user', content: 'Next' },
			];

			const blockInfo = await manager.verifyMessages(tamperedMessages);

			expect(blockInfo.valid).toBe(false);
			expect(blockInfo.error).toBe('INTEGRITY_VIOLATION');
		});

		it('should detect injected message in middle', async () => {
			await seedConversation(db, [
				{ user: 'First', assistant: 'Response 1' },
				{ user: 'Second', assistant: 'Response 2' },
			]);

			// Tamper: Inject in middle
			const tamperedMessages: ChatMessage[] = [
				{ role: 'user', content: 'First' },
				{ role: 'assistant', content: 'FAKE INJECTION' }, // ← Injected!
				{ role: 'assistant', content: 'Response 1' },
				{ role: 'user', content: 'Second' },
				{ role: 'assistant', content: 'Response 2' },
				{ role: 'user', content: 'Third' },
			];

			const blockInfo = await manager.verifyMessages(tamperedMessages);

			expect(blockInfo.valid).toBe(false);
		});

		it('should detect deleted message', async () => {
			await seedConversation(db, [
				{ user: 'First', assistant: 'Response 1' },
				{ user: 'Second', assistant: 'Response 2' },
			]);

			// Tamper: Delete first assistant message
			const tamperedMessages: ChatMessage[] = [
				{ role: 'user', content: 'First' },
				// Missing: { role: 'assistant', content: 'Response 1' },
				{ role: 'user', content: 'Second' },
				{ role: 'assistant', content: 'Response 2' },
				{ role: 'user', content: 'Third' },
			];

			const blockInfo = await manager.verifyMessages(tamperedMessages);

			expect(blockInfo.valid).toBe(false);
		});

		it('should detect reordered messages', async () => {
			await seedConversation(db, [{ user: 'First', assistant: 'Response 1' }]);

			// Tamper: Swap order
			const tamperedMessages: ChatMessage[] = [
				{ role: 'assistant', content: 'Response 1' }, // ← Swapped!
				{ role: 'user', content: 'First' },
				{ role: 'user', content: 'Second' },
			];

			const blockInfo = await manager.verifyMessages(tamperedMessages);

			expect(blockInfo.valid).toBe(false);
		});

		it('should detect changed role (user→assistant)', async () => {
			await seedConversation(db, [{ user: 'Hello', assistant: 'Hi!' }]);

			// Tamper: Change role
			const tamperedMessages: ChatMessage[] = [
				{ role: 'assistant', content: 'Hello' }, // ← Role changed!
				{ role: 'assistant', content: 'Hi!' },
				{ role: 'user', content: 'Next' },
			];

			const blockInfo = await manager.verifyMessages(tamperedMessages);

			expect(blockInfo.valid).toBe(false);
		});

		it('should reject context from different chain', async () => {
			// Setup chain 1
			await seedConversation(db, [{ user: 'Chain 1', assistant: 'Response 1' }]);

			// Try to continue with completely different context
			const unknownMessages: ChatMessage[] = [
				{ role: 'user', content: 'Unknown chain' },
				{ role: 'assistant', content: 'Never logged' },
				{ role: 'user', content: 'Continuation?' },
			];

			const blockInfo = await manager.verifyMessages(unknownMessages);

			expect(blockInfo.valid).toBe(false);
			expect(blockInfo.error).toBe('INTEGRITY_VIOLATION');
		});
	});

	// ============================================================================
	// TEST GROUP 4: Blockchain Logging
	// ============================================================================

	describe('Blockchain Logging', () => {
		it('should log genesis block to D1', async () => {
			const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }];

			const blockInfo = await manager.verifyMessages(messages);

			await manager.logConversationBlock({
				blockInfo,
				messages,
				assistantResponse: 'Hi there!',
				metadata: {
					locale: 'tr',
					ipHash: 'test-ip-hash',
					model: 'claude-sonnet-4-test',
					tokensIn: 10,
					tokensOut: 20,
					latencyMs: 1200,
					toolCalls: null,
				},
			});

			// Verify logged to D1
			const fullContext: ChatMessage[] = [...messages, { role: 'assistant', content: 'Hi there!' }];

			const nextBlockInfo = await manager.verifyMessages([...fullContext, { role: 'user', content: 'Next' }]);

			expect(nextBlockInfo.valid).toBe(true);
			expect(nextBlockInfo.blockIndex).toBe(1);
		});

		it('should log continuation block to D1', async () => {
			const { lastContext, chainId } = await seedConversation(db, [{ user: 'First', assistant: 'Response 1' }]);

			const messages: ChatMessage[] = [...lastContext, { role: 'user', content: 'Second' }];

			const blockInfo = await manager.verifyMessages(messages);

			await manager.logConversationBlock({
				blockInfo,
				messages,
				assistantResponse: 'Response 2',
				metadata: {
					locale: 'en',
					ipHash: 'test-hash',
					model: 'claude-test',
					tokensIn: 50,
					tokensOut: 100,
					latencyMs: 2000,
					toolCalls: [{ tool: 'test', input: {}, output: {} }],
				},
			});

			// Verify chain has 2 blocks
			const chainBlocks = await manager.getChainBlocks(chainId);
			expect(chainBlocks.length).toBe(2);
			expect(chainBlocks[0].blockIndex).toBe(0);
			expect(chainBlocks[1].blockIndex).toBe(1);
		});

		it('should preserve metadata in D1', async () => {
			const messages: ChatMessage[] = [{ role: 'user', content: 'Test' }];

			const blockInfo = await manager.verifyMessages(messages);

			await manager.logConversationBlock({
				blockInfo,
				messages,
				assistantResponse: 'Response',
				metadata: {
					locale: 'tr',
					ipHash: 'custom-hash',
					model: 'claude-custom',
					tokensIn: 123,
					tokensOut: 456,
					latencyMs: 789,
					toolCalls: [{ tool: 'search', input: { q: 'test' }, output: { result: 'found' } }],
				},
			});

			// Query back
			const blocks = await manager.getChainBlocks(blockInfo.chainId);
			expect(blocks[0].locale).toBe('tr');
			expect(blocks[0].ipHash).toBe('custom-hash');
			expect(blocks[0].model).toBe('claude-custom');
			expect(blocks[0].tokensIn).toBe(123);
			expect(blocks[0].tokensOut).toBe(456);
			expect(blocks[0].latencyMs).toBe(789);
			expect(blocks[0].toolCalls).toContain('search');
		});
	});

	// ============================================================================
	// TEST GROUP 5: Chain Validation
	// ============================================================================

	describe('Chain Validation', () => {
		it('should detect invalid genesis block (blockIndex !== 0)', async () => {
			// Manually corrupt genesis block in D1
			const messages: ChatMessage[] = [{ role: 'user', content: 'Test' }];
			const blockInfo = await manager.verifyMessages(messages);

			await manager.logConversationBlock({
				blockInfo,
				messages,
				assistantResponse: 'Response',
				metadata: {
					locale: 'tr',
					ipHash: 'test',
					model: 'test',
					tokensIn: 1,
					tokensOut: 1,
					latencyMs: 1,
					toolCalls: null,
				},
			});

			// Corrupt: Change blockIndex to 1 (should be 0 for genesis)
			await db
				.prepare(
					`
				UPDATE conversation_logs
				SET block_index = 1
				WHERE chain_id = ?
			`,
				)
				.bind(blockInfo.chainId)
				.run();

			const validation = await manager.verifyChainIntegrity(blockInfo.chainId);

			expect(validation.valid).toBe(false);
			expect(validation.error).toBe('Invalid genesis block');
		});

		it('should detect invalid genesis block (prevHash !== null)', async () => {
			// Manually corrupt genesis block in D1
			const messages: ChatMessage[] = [{ role: 'user', content: 'Test' }];
			const blockInfo = await manager.verifyMessages(messages);

			await manager.logConversationBlock({
				blockInfo,
				messages,
				assistantResponse: 'Response',
				metadata: {
					locale: 'tr',
					ipHash: 'test',
					model: 'test',
					tokensIn: 1,
					tokensOut: 1,
					latencyMs: 1,
					toolCalls: null,
				},
			});

			// Corrupt: Set prevHash to non-null (should be null for genesis)
			await db
				.prepare(
					`
				UPDATE conversation_logs
				SET prev_hash = 'corrupted_hash'
				WHERE chain_id = ?
			`,
				)
				.bind(blockInfo.chainId)
				.run();

			const validation = await manager.verifyChainIntegrity(blockInfo.chainId);

			expect(validation.valid).toBe(false);
			expect(validation.error).toBe('Invalid genesis block');
		});

		it('should detect block index gap in chain', async () => {
			const { chainId } = await seedConversation(db, [
				{ user: 'Turn 1', assistant: 'Response 1' },
				{ user: 'Turn 2', assistant: 'Response 2' },
				{ user: 'Turn 3', assistant: 'Response 3' },
			]);

			// Corrupt: Skip block index (0, 1, 3 instead of 0, 1, 2)
			await db
				.prepare(
					`
				UPDATE conversation_logs
				SET block_index = 3
				WHERE chain_id = ? AND block_index = 2
			`,
				)
				.bind(chainId)
				.run();

			const validation = await manager.verifyChainIntegrity(chainId);

			expect(validation.valid).toBe(false);
			expect(validation.error).toContain('Block index gap');
		});

		it('should detect broken chain (prev_hash mismatch)', async () => {
			const { chainId } = await seedConversation(db, [
				{ user: 'Turn 1', assistant: 'Response 1' },
				{ user: 'Turn 2', assistant: 'Response 2' },
			]);

			// Corrupt: Change prev_hash of block 1
			await db
				.prepare(
					`
				UPDATE conversation_logs
				SET prev_hash = 'corrupted_hash'
				WHERE chain_id = ? AND block_index = 1
			`,
				)
				.bind(chainId)
				.run();

			const validation = await manager.verifyChainIntegrity(chainId);

			expect(validation.valid).toBe(false);
			expect(validation.error).toContain('Chain broken');
		});

		it('should validate 5-block chain integrity', async () => {
			const { chainId } = await seedConversation(db, [
				{ user: 'Turn 1', assistant: 'Response 1' },
				{ user: 'Turn 2', assistant: 'Response 2' },
				{ user: 'Turn 3', assistant: 'Response 3' },
				{ user: 'Turn 4', assistant: 'Response 4' },
				{ user: 'Turn 5', assistant: 'Response 5' },
			]);

			const validation = await manager.verifyChainIntegrity(chainId);

			expect(validation.valid).toBe(true);
			expect(validation.blockCount).toBe(5);
			expect(validation.error).toBeUndefined();
		});

		it('should validate 50-block chain (stress test)', async () => {
			const conversation = Array.from({ length: 50 }, (_, i) => ({
				user: `User message ${i + 1}`,
				assistant: `Assistant response ${i + 1}`,
			}));

			const { chainId } = await seedConversation(db, conversation);

			const validation = await manager.verifyChainIntegrity(chainId);

			expect(validation.valid).toBe(true);
			expect(validation.blockCount).toBe(50);
		});

		it('should return error for non-existent chain', async () => {
			const validation = await manager.verifyChainIntegrity('0xnonexistent');

			expect(validation.valid).toBe(false);
			expect(validation.error).toBe('Chain not found');
			expect(validation.blockCount).toBe(0);
		});

		it('should verify all blocks are properly linked', async () => {
			const { chainId } = await seedConversation(db, [
				{ user: 'A', assistant: 'B' },
				{ user: 'C', assistant: 'D' },
				{ user: 'E', assistant: 'F' },
			]);

			const blocks = await manager.getChainBlocks(chainId);

			// Verify linkage manually
			expect(blocks[0].prevHash).toBeNull(); // Genesis
			expect(blocks[1].prevHash).toBe(blocks[0].blockHash); // Block 1 → Block 0
			expect(blocks[2].prevHash).toBe(blocks[1].blockHash); // Block 2 → Block 1
		});
	});

	// ============================================================================
	// TEST GROUP 6: Query Utilities
	// ============================================================================

	describe('Query Utilities', () => {
		it('should query block by context hash', async () => {
			const { lastContext, chainId } = await seedConversation(db, [{ user: 'Hello', assistant: 'Hi!' }]);

			// Calculate context hash
			const { hashContext } = await import('../../integrity');
			const contextHash = hashContext(lastContext);

			const block = await manager.getBlockByContextHash(contextHash);

			expect(block).not.toBeNull();
			expect(block?.chainId).toBe(chainId);
			expect(block?.blockIndex).toBe(0);
		});

		it('should return null for unknown context hash', async () => {
			const block = await manager.getBlockByContextHash('nonexistent_hash');

			expect(block).toBeNull();
		});

		it('should get all blocks in chain ordered by index', async () => {
			const { chainId } = await seedConversation(db, [
				{ user: 'A', assistant: 'B' },
				{ user: 'C', assistant: 'D' },
				{ user: 'E', assistant: 'F' },
			]);

			const blocks = await manager.getChainBlocks(chainId);

			expect(blocks.length).toBe(3);
			expect(blocks[0].blockIndex).toBe(0);
			expect(blocks[1].blockIndex).toBe(1);
			expect(blocks[2].blockIndex).toBe(2);
			expect(blocks[0].userMessage).toBe('A');
			expect(blocks[1].userMessage).toBe('C');
			expect(blocks[2].userMessage).toBe('E');
		});

		it('should return empty array for unknown chain', async () => {
			const blocks = await manager.getChainBlocks('0xunknown');

			expect(blocks.length).toBe(0);
		});

		it('should retrieve full context from block', async () => {
			await seedConversation(db, [
				{ user: 'First', assistant: 'Response 1' },
				{ user: 'Second', assistant: 'Response 2' },
			]);

			const { hashContext } = await import('../../integrity');
			const fullContext: ChatMessage[] = [
				{ role: 'user', content: 'First' },
				{ role: 'assistant', content: 'Response 1' },
				{ role: 'user', content: 'Second' },
				{ role: 'assistant', content: 'Response 2' },
			];
			const contextHash = hashContext(fullContext);

			const block = await manager.getBlockByContextHash(contextHash);

			expect(block?.context).toEqual(fullContext);
			expect(block?.blockIndex).toBe(1);
		});
	});

	// ============================================================================
	// TEST GROUP 7: Edge Cases
	// ============================================================================

	describe('Edge Cases', () => {
		it('should handle empty context (hashContext with empty array)', async () => {
			// Test edge case: hashContext([]) should return ZERO_HASH without prefix
			const { hashContext } = await import('../../integrity');
			const emptyHash = hashContext([]);

			expect(emptyHash).toBe('0000000000000000000000000000000000000000000000000000000000000000');
			expect(emptyHash.length).toBe(64);
		});

		it('should handle empty string messages', async () => {
			const messages: ChatMessage[] = [{ role: 'user', content: '' }];

			const blockInfo = await manager.verifyMessages(messages);

			expect(blockInfo.valid).toBe(true);
			expect(blockInfo.isGenesis).toBe(true);
		});

		it('should handle very long message (50KB)', async () => {
			const longContent = 'A'.repeat(50000);
			const messages: ChatMessage[] = [{ role: 'user', content: longContent }];

			const blockInfo = await manager.verifyMessages(messages);

			expect(blockInfo.valid).toBe(true);
		});

		it('should handle messages with only whitespace', async () => {
			const messages: ChatMessage[] = [{ role: 'user', content: '   \t\n   ' }];

			const blockInfo = await manager.verifyMessages(messages);

			expect(blockInfo.valid).toBe(true);
		});

		it('should handle special regex characters', async () => {
			const specialChars = '.*+?^${}()|[]\\';
			const messages: ChatMessage[] = [{ role: 'user', content: specialChars }];

			const blockInfo = await manager.verifyMessages(messages);

			expect(blockInfo.valid).toBe(true);
		});

		it('should handle Unicode normalization (NFC vs NFD)', async () => {
			// café - NFC (precomposed é)
			await seedConversation(db, [{ user: 'café', assistant: 'Coffee!' }]);

			// café - NFD (e + combining acute)
			const messages: ChatMessage[] = [
				{ role: 'user', content: 'cafe\u0301' }, // NFD
				{ role: 'assistant', content: 'Coffee!' },
				{ role: 'user', content: 'How much?' },
			];

			const blockInfo = await manager.verifyMessages(messages);

			// Should find it because normalization happens before hashing
			expect(blockInfo.valid).toBe(true);
		});

		it('should handle mixed Turkish, emoji, and markdown', async () => {
			const complexContent = `
# Başlık 🚀

Türkçe içerik: ş, ğ, ü, ö, ç, ı, İ

\`\`\`typescript
const x = "test";
\`\`\`

✅ Başarılı!
			`;

			const messages: ChatMessage[] = [{ role: 'user', content: complexContent }];

			const blockInfo = await manager.verifyMessages(messages);

			expect(blockInfo.valid).toBe(true);
		});

		it('should handle null bytes in message', async () => {
			const messageWithNull = 'Hello\x00World';
			const messages: ChatMessage[] = [{ role: 'user', content: messageWithNull }];

			const blockInfo = await manager.verifyMessages(messages);

			expect(blockInfo.valid).toBe(true);
		});
	});
});
