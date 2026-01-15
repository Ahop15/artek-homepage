/**
 * ARTEK AI Worker - EIP-712 TypedData Definitions
 *
 * Defines the structured data schema for deterministic hashing
 * using the EIP-712 standard (Ethereum Typed Structured Data Hashing and Signing).
 *
 * We use this standard not for Ethereum signing, but for its well-defined,
 * deterministic, and industry-standard approach to hashing structured data.
 *
 * @see https://eips.ethereum.org/EIPS/eip-712
 */

import { randomBytes } from 'ethers/crypto';
import { hexlify } from 'ethers/utils';

/**
 * EIP-712 Domain Separator
 *
 * Identifies the application/protocol to prevent hash collisions
 * between different applications using the same schema.
 */
export const DOMAIN = {
	name: 'ARTEK-AI-Chat',
	version: '1',
};

/**
 * Zero hash constant for genesis blocks
 * 32 bytes (64 hex characters) of zeros with 0x prefix
 */
export const ZERO_HASH = '0x0000000000000000000000000000000000000000000000000000000000000000';

/**
 * EIP-712 Type Definition for Blockchain Block
 *
 * Each block contains:
 * - userMessage: New user message
 * - assistantResponse: AI response
 * - prevHash: Previous block's hash (creates chain linkage)
 */
export const BLOCK_TYPES = {
	Block: [
		{ name: 'userMessage', type: 'string' },
		{ name: 'assistantResponse', type: 'string' },
		{ name: 'prevHash', type: 'string' },
	],
};

/**
 * EIP-712 Type Definition for Full Context
 *
 * Used for previous context lookup (context_hash in DB)
 */
export const CONTEXT_TYPES = {
	ChatMessage: [
		{ name: 'role', type: 'string' },
		{ name: 'content', type: 'string' },
	],
	ChatContext: [{ name: 'messages', type: 'ChatMessage[]' }],
};

/**
 * TypeScript interface for a chat message
 */
export interface ChatMessage {
	role: string;
	content: string;
}

/**
 * TypeScript interface for the full chat context
 */
export interface ChatContext {
	messages: ChatMessage[];
}

/**
 * Generate unique chain ID using ethers cryptographic entropy
 *
 * Returns a 32-byte (64 hex chars) random value with 0x prefix.
 * This provides 256 bits of entropy, making collisions astronomically unlikely.
 *
 * @returns Hex string chain ID (0x prefixed, 66 chars total)
 *
 * @example
 * ```typescript
 * const chainId = generateChainId();
 * // "0x1a2b3c4d5e6f7890abcdef..."
 * ```
 */
export function generateChainId(): string {
	return hexlify(randomBytes(32));
}