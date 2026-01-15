/**
 * D1 Database Test Utilities
 *
 * Provides SETUP helpers for D1 integration tests:
 * - Database cleanup (test isolation)
 * - Seed data insertion (for setting up test scenarios)
 *
 * WHY:
 * - Tests should verify REAL code behavior, not helper functions
 * - Queries/verifications belong in BlockchainIntegrityManager (production code)
 * - These helpers only prepare test data (setup phase)
 */

import type { D1Database } from '@cloudflare/workers-types';
import { BlockchainIntegrityManager, type ConversationMetadata } from '../../integrity';
import type { ChatMessage } from '../../integrity';

/**
 * Clean all data from conversation_logs table
 * Call this in beforeEach to ensure test isolation
 *
 * @param db - D1 database instance
 *
 * @example
 * ```typescript
 * beforeEach(async () => {
 *   await cleanDatabase(env.AI_LOGS_DB);
 * });
 * ```
 */
export async function cleanDatabase(db: D1Database): Promise<void> {
	await db.prepare('DELETE FROM conversation_logs').run();
}

/**
 * Seed a complete conversation (genesis + continuation blocks) using REAL manager
 *
 * This helper uses BlockchainIntegrityManager.logConversationBlock() to insert test data,
 * ensuring test setup uses the same code path as production.
 *
 * @param db - D1 database instance
 * @param conversation - Array of turn pairs
 * @param metadata - Optional metadata overrides
 * @returns Chain metadata
 *
 * @example
 * ```typescript
 * const chainInfo = await seedConversation(db, [
 *   { user: 'Hello', assistant: 'Hi!' },
 *   { user: 'How are you?', assistant: 'Good!' }
 * ]);
 * // → chainInfo.chainId, chainInfo.blockCount
 * ```
 */
export async function seedConversation(
	db: D1Database,
	conversation: Array<{ user: string; assistant: string }>,
	metadata?: Partial<ConversationMetadata>,
): Promise<{
	chainId: string;
	blockCount: number;
	lastContext: ChatMessage[];
}> {
	const manager = new BlockchainIntegrityManager(db);
	let messages: ChatMessage[] = [];
	let chainId = '';

	for (let i = 0; i < conversation.length; i++) {
		const { user, assistant } = conversation[i];

		// Add user message
		messages.push({ role: 'user', content: user });

		// Verify messages (genesis or continuation)
		const blockInfo = await manager.verifyMessages(messages);
		if (!blockInfo.valid) {
			throw new Error(`Failed to verify messages at turn ${i}`);
		}

		// Store chain info from first bdlock
		if (i === 0) {
			chainId = blockInfo.chainId;
		}

		// Log conversation block
		await manager.logConversationBlock({
			blockInfo,
			messages,
			assistantResponse: assistant,
			metadata: {
				locale: metadata?.locale || 'tr',
				ipHash: metadata?.ipHash || 'test-ip-hash',
				model: metadata?.model || 'claude-sonnet-4-test',
				tokensIn: metadata?.tokensIn || 100,
				tokensOut: metadata?.tokensOut || 50,
				latencyMs: metadata?.latencyMs || 1000,
				toolCalls: metadata?.toolCalls || null,
			},
		});

		// Add assistant message for next iteration
		messages.push({ role: 'assistant', content: assistant });
	}

	return {
		chainId,
		blockCount: conversation.length,
		lastContext: messages,
	};
}
