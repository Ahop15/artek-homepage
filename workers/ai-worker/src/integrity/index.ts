/**
 * ARTEK AI Worker - Context Integrity Module
 *
 * Provides EIP-712 based deterministic hashing for blockchain-style
 * conversation logging with integrity verification.
 *
 * @example
 * ```typescript
 * import { hashBlock, hashContext, generateChainId } from './integrity';
 *
 * // Genesis block
 * const chainId = generateChainId();
 * const blockHash = hashBlock("Hello", "Hi!", null);
 *
 * // Context lookup
 * const contextHash = hashContext([
 *   { role: 'user', content: 'Hello' },
 *   { role: 'assistant', content: 'Hi!' }
 * ]);
 * ```
 */

// Normalization utilities
export { normalizeString, normalizeMessage, normalizeMessages } from './normalize';

// EIP-712 type definitions and constants
export {
	DOMAIN,
	BLOCK_TYPES,
	CONTEXT_TYPES,
	ZERO_HASH,
	generateChainId,
	type ChatMessage,
	type ChatContext,
} from './typed-data';

// Hash functions
export { hashBlock, hashContext } from './hash';

// Blockchain Integrity Manager
export {
	BlockchainIntegrityManager,
	type BlockInfo,
	type ConversationMetadata,
	type ConversationBlock,
} from './manager';