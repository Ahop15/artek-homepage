/**
 * ARTEK AI Worker - Context Hashing using EIP-712 TypedData
 *
 * Provides deterministic hashing for:
 * 1. Block hashing (blockchain linking with prev_hash)
 * 2. Context hashing (previous context lookup)
 *
 * All hashing uses ethers.js TypedDataEncoder with keccak256 for
 * industry-standard, deterministic, and tamper-evident results.
 */

import { TypedDataEncoder } from 'ethers/hash';
import { DOMAIN, BLOCK_TYPES, CONTEXT_TYPES, ZERO_HASH, type ChatMessage } from './typed-data';
import { normalizeMessages, normalizeString } from './normalize';

/**
 * Calculate block hash for blockchain linking
 *
 * Creates a cryptographic hash that binds:
 * - New user message (normalized)
 * - AI assistant response (normalized)
 * - Previous block hash (chain linkage)
 *
 * This creates a tamper-evident chain where changing any past block
 * invalidates all subsequent blocks.
 *
 * @param userMessage - New user message
 * @param assistantResponse - AI response to the message
 * @param prevHash - Previous block's hash (null for genesis)
 * @returns Hex string hash without 0x prefix (64 chars)
 *
 * @example
 * ```typescript
 * // Genesis block
 * const genesisHash = hashBlock("Hello", "Hi there!", null);
 *
 * // Continuation block
 * const block2Hash = hashBlock("How are you?", "I'm good!", genesisHash);
 * ```
 */
export function hashBlock(userMessage: string, assistantResponse: string, prevHash: string | null): string {
	// Normalize strings (Unicode NFC + line endings)
	const blockData = {
		userMessage: normalizeString(userMessage),
		assistantResponse: normalizeString(assistantResponse),
		prevHash: prevHash || ZERO_HASH,
	};

	// Calculate EIP-712 hash using keccak256
	const hash = TypedDataEncoder.hash(DOMAIN, BLOCK_TYPES, blockData);

	// Remove 0x prefix for DB storage
	// Note: ethers TypedDataEncoder.hash() always returns 0x-prefixed hex string
	return hash.slice(2);
}

/**
 * Calculate full context hash for previous context lookup
 *
 * Used to find the previous block when continuing a conversation.
 * This hash represents the entire conversation state at a given point.
 *
 * @param messages - Array of chat messages
 * @returns Hex string hash without 0x prefix (64 chars)
 *
 * @example
 * ```typescript
 * const messages = [
 *   { role: 'user', content: 'Hello' },
 *   { role: 'assistant', content: 'Hi!' }
 * ];
 * const hash = hashContext(messages);
 * // Can be used to lookup: WHERE context_hash = hash
 * ```
 */
export function hashContext(messages: ChatMessage[]): string {
	if (messages.length === 0) {
		// Empty context returns zero hash without prefix
		return ZERO_HASH.slice(2);
	}

	// Normalize all messages (Unicode NFC + line endings)
	const normalized = normalizeMessages(messages);

	// Create typed data value
	const value = { messages: normalized };

	// Calculate EIP-712 hash using keccak256
	const hash = TypedDataEncoder.hash(DOMAIN, CONTEXT_TYPES, value);

	// Remove 0x prefix for DB storage
	// Note: ethers TypedDataEncoder.hash() always returns 0x-prefixed hex string
	return hash.slice(2);
}