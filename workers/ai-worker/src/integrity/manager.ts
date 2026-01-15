/**
 *  █████╗ ██████╗  █████╗ ███████╗
 * ██╔══██╗██╔══██╗██╔══██╗██╔════╝
 * ███████║██████╔╝███████║███████╗
 * ██╔══██║██╔══██╗██╔══██║╚════██║
 * ██║  ██║██║  ██║██║  ██║███████║
 * ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝
 *
 * ARTEK AI Worker - Blockchain Integrity Manager
 *
 * TR:
 * ----
 * Konuşma context'i için blockchain-tarzı doğrulama ve kayıt yöneticisi.
 * Her blok, prev_hash ile önceki bloğa kriptografik olarak bağlanır ve
 * değiştirilmeye karşı korumalı bir zincir oluşturur.
 *
 * Ana İşlevler:
 * 	(1) Message Verification: Genesis veya continuation block doğrulaması
 * 	(2) Blockchain Logging: D1 veritabanına conversation block kaydetme
 * 	(3) Chain Queries: Zincir sorgulama ve doğrulama
 *
 * Doğrulama Kuralları:
 * 	(1) Genesis block (messages.length === 1) için ethers entropy kullanarak
 *      yeni chain_id oluşturulur, doğrulama gerekmez.
 * 	(2) Devam blokları (messages.length > 1) için önceki context veritabanında
 *      mevcut olmalı, context_hash lookup ile O(1) performansta bulunur,
 * 		yeni blok oluşturma için chain_id, prev_hash, block_index döndürülür.
 *
 * Avantajlar:
 * - Context manipülasyonunu önler (değişiklik tespiti)
 * - AI API maliyetlerini azaltır (geçersiz istekler API çağrısından önce reddedilir)
 * - Blockchain-tarzı denetim izi sağlar
 * - Merkezi ve test edilebilir mimari
 *
 * EN:
 * ----
 * Blockchain-style verification and logging manager for conversation context.
 * Each block is cryptographically linked to the previous block via prev_hash,
 * creating a tamper-evident chain.
 *
 * Main Functions:
 * 	(1) Message Verification: Genesis or continuation block verification
 * 	(2) Blockchain Logging: Save conversation blocks to D1 database
 * 	(3) Chain Queries: Query and validate chains
 *
 * Verification Rules:
 * 	(1) Genesis block (messages.length === 1) generates new chain_id using
 *      ethers entropy, no verification needed (new conversation).
 * 	(2) Continuation blocks (messages.length > 1) require previous context
 *      to exist in database, found via context_hash lookup with O(1) performance,
 * 		returns chain_id, prev_hash, block_index for new block creation.
 *
 * Benefits:
 * - Prevents context manipulation (tamper-evident)
 * - Reduces AI API costs (invalid requests rejected before API call)
 * - Provides blockchain-style audit trail
 * - Centralized and testable architecture
 */

import type { D1Database } from '@cloudflare/workers-types';
import { hashContext, hashBlock, generateChainId, type ChatMessage } from './index';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Block information returned after verification
 */
export interface BlockInfo {
	valid: boolean;
	isGenesis: boolean;
	chainId: string;
	prevHash: string | null;
	blockIndex: number;
	error?: 'INTEGRITY_VIOLATION';
}

/**
 * Metadata for conversation logging
 */
export interface ConversationMetadata {
	locale: string;
	ipHash: string;
	model: string;
	tokensIn: number;
	tokensOut: number;
	latencyMs: number;
	toolCalls?: Array<{ tool: string; input: unknown; output: unknown }> | null;
}

/**
 * Complete conversation block (for queries)
 */
export interface ConversationBlock {
	id: number;
	chainId: string;
	blockHash: string;
	prevHash: string | null;
	blockIndex: number;
	contextHash: string;
	context: ChatMessage[];
	userMessage: string;
	assistantResponse: string;
	locale: string;
	ipHash: string;
	model: string;
	tokensIn: number;
	tokensOut: number;
	latencyMs: number;
	toolCalls: string | null;
	createdAt: number;
}

// ============================================================================
// BLOCKCHAIN INTEGRITY MANAGER
// ============================================================================

/**
 * Manages all blockchain integrity operations
 *
 * @example
 * ```typescript
 * const blockchain = new BlockchainIntegrityManager(env.AI_LOGS_DB);
 *
 * // Verify incoming messages
 * const blockInfo = await blockchain.verifyMessages(messages);
 * if (!blockInfo.valid) {
 *   return error(409, 'Integrity violation');
 * }
 *
 * // Log conversation after Claude response
 * await blockchain.logConversationBlock({
 *   blockInfo,
 *   messages,
 *   assistantResponse: response.content,
 *   metadata: { locale, ipHash, model, tokens, latency }
 * });
 * ```
 */
export class BlockchainIntegrityManager {
	constructor(private readonly db: D1Database) {}

	// ========================================================================
	// PUBLIC API: Message Verification
	// ========================================================================

	/**
	 * Verify incoming messages and get block info for logging
	 *
	 * Rules:
	 * 1. Genesis (single message): Generate new chain_id, no verification needed
	 * 2. Continuation (multiple messages): Verify previous context exists in D1
	 *
	 * @param messages - Incoming chat messages
	 * @returns Block information for logging
	 *
	 * @example
	 * ```typescript
	 * // Genesis block (first message)
	 * const blockInfo = await blockchain.verifyMessages([
	 *   { role: 'user', content: 'Hello' }
	 * ]);
	 * // → { valid: true, isGenesis: true, chainId: '0x...', blockIndex: 0 }
	 *
	 * // Continuation block
	 * const blockInfo = await blockchain.verifyMessages([
	 *   { role: 'user', content: 'Hello' },
	 *   { role: 'assistant', content: 'Hi!' },
	 *   { role: 'user', content: 'How are you?' }
	 * ]);
	 * // → { valid: true, isGenesis: false, chainId: '0x...', blockIndex: 1 }
	 * //    OR { valid: false, error: 'INTEGRITY_VIOLATION' } if context tampered
	 * ```
	 */
	async verifyMessages(messages: ChatMessage[]): Promise<BlockInfo> {
		// ═══════════════════════════════════════════════════════════════════════════
		// TR:
		// ----
		// KURAL 1: Genesis Block (İlk Mesaj)
		// Kullanıcı ilk mesajını gönderdiğinde yeni bir blockchain oluşturulur:
		// - ethers entropy kullanarak benzersiz chain_id oluştur (256 bit)
		// - Doğrulanacak önceki context yok
		// - Block indeksi 0'dan başlar
		// - Önceki hash yok (genesis)
		//
		// EN:
		// ----
		// RULE 1: Genesis Block (First Message)
		// When a user sends their first message, we create a new blockchain:
		// - Generate unique chain_id using ethers entropy (256 bits)
		// - No previous context to verify
		// - Block index starts at 0
		// - No previous hash (genesis)
		// ═══════════════════════════════════════════════════════════════════════════
		if (messages.length === 1) {
			const chainId = generateChainId();

			return {
				valid: true,
				isGenesis: true,
				chainId,
				prevHash: null,
				blockIndex: 0,
			};
		}

		// ═══════════════════════════════════════════════════════════════════════════
		// TR:
		// ----
		// KURAL 2+: Devam Bloğu (Birden Fazla Mesaj)
		// Devam eden konuşmalar için:
		// 1. Önceki context'i ayıkla (son kullanıcı mesajı hariç tüm mesajlar)
		// 2. Önceki context'i EIP-712 TypedData kullanarak hash'le
		// 3. Veritabanında context_hash kullanarak ara (O(1) indexed lookup)
		// 4. Bulunursa, bağlantılı blok oluşturma için chain bilgilerini döndür
		// 5. Bulunamazsa, context manipüle edilmiş → INTEGRITY_VIOLATION
		//
		// Örnek:
		// Gelen: [user1, assistant1, user2, assistant2, user3]
		// Önceki: [user1, assistant1, user2, assistant2]
		// Önceki context'i hash'leyip veritabanında arıyoruz.
		//
		// EN:
		// ----
		// RULE 2+: Continuation Block (Multiple Messages)
		// For continuing conversations:
		// 1. Extract previous context (all messages except the last user message)
		// 2. Hash the previous context using EIP-712 TypedData
		// 3. Lookup in database using context_hash (O(1) indexed lookup)
		// 4. If found, return chain info for creating linked block
		// 5. If not found, context has been manipulated → INTEGRITY_VIOLATION
		//
		// Example:
		// Incoming: [user1, assistant1, user2, assistant2, user3]
		// Previous: [user1, assistant1, user2, assistant2]
		// We hash the previous context and look for it in the database.
		// ═══════════════════════════════════════════════════════════════════════════

		// Extract previous context (all messages except the last one)
		const previousContext = messages.slice(0, -1);

		// Calculate hash of previous context using EIP-712 TypedData
		const previousContextHash = hashContext(previousContext);

		// Look up the previous context in database using context_hash
		const lastBlock = await this.db
			.prepare(
				`
				SELECT chain_id, block_hash, block_index
				FROM conversation_logs
				WHERE context_hash = ?
				LIMIT 1
			`,
			)
			.bind(previousContextHash)
			.first();

		// ═══════════════════════════════════════════════════════════════════════════
		// TR:
		// ----
		// KURAL 2a: Önceki context bulunamadı = INTEGRITY_VIOLATION
		// Veritabanında önceki context'i bulamazsak, şu durumlar olabilir:
		// - Context manipüle edilmiş (sahte mesajlar eklenmiş)
		// - Önceki kayıt sırasında veritabanı hatası oluşmuş (olası değil)
		// - Client fabrike edilmiş konuşma geçmişi gönderiyor
		// Tüm durumlarda, isteği reddediyoruz ve AI API'yi çağırmıyoruz.
		// Bu hem manipülasyonu önler HEM DE AI API maliyetlerini azaltır.
		//
		// EN:
		// ----
		// RULE 2a: Previous context not found = INTEGRITY_VIOLATION
		// If we can't find the previous context in our database, either:
		// - The context has been manipulated (fake messages injected)
		// - Database error occurred during previous save (unlikely)
		// - Client is sending fabricated conversation history
		// In all cases, we reject the request and don't call the AI API.
		// This prevents manipulation AND saves AI API costs.
		// ═══════════════════════════════════════════════════════════════════════════
		if (!lastBlock) {
			return {
				valid: false,
				isGenesis: false,
				chainId: '',
				prevHash: null,
				blockIndex: 0,
				error: 'INTEGRITY_VIOLATION',
			};
		}

		// ═══════════════════════════════════════════════════════════════════════════
		// TR:
		// ----
		// KURAL 2b: Önceki context bulundu = geçerli devam
		// Önceki context veritabanımızdaki bir kayıtla eşleşiyor.
		// Yeni blok oluşturma için blockchain bilgilerini döndür:
		// - chain_id: Önceki blok ile aynı (konuşmayı gruplar)
		// - prev_hash: Önceki block'un hash'i (zincir bağlantısı oluşturur)
		// - block_index: Önceki bloktan artırılmış
		//
		// EN:
		// ----
		// RULE 2b: Previous context found = valid continuation
		// The previous context matches a record in our database.
		// Return blockchain info for creating the new block:
		// - chain_id: Same as previous block (groups conversation)
		// - prev_hash: Previous block's hash (creates chain linkage)
		// - block_index: Incremented from previous block
		// ═══════════════════════════════════════════════════════════════════════════
		return {
			valid: true,
			isGenesis: false,
			chainId: lastBlock.chain_id as string,
			prevHash: lastBlock.block_hash as string,
			blockIndex: (lastBlock.block_index as number) + 1,
		};
	}

	// ========================================================================
	// PUBLIC API: Conversation Logging
	// ========================================================================

	/**
	 * Log conversation block to D1 database
	 *
	 * This method:
	 * 1. Builds full context (messages + assistant response)
	 * 2. Calculates context_hash (for next request's lookup)
	 * 3. Calculates block_hash (blockchain linking)
	 * 4. Inserts into D1 conversation_logs table
	 *
	 * @param params - Conversation block parameters
	 *
	 * @example
	 * ```typescript
	 * await blockchain.logConversationBlock({
	 *   blockInfo: { chainId: '0x...', blockIndex: 1, prevHash: 'abc...' },
	 *   messages: [
	 *     { role: 'user', content: 'Hello' },
	 *     { role: 'assistant', content: 'Hi!' },
	 *     { role: 'user', content: 'How are you?' }
	 *   ],
	 *   assistantResponse: 'I am good, thanks!',
	 *   metadata: {
	 *     locale: 'tr',
	 *     ipHash: 'hash...',
	 *     model: 'claude-sonnet-4',
	 *     tokensIn: 100,
	 *     tokensOut: 50,
	 *     latencyMs: 1200,
	 *     toolCalls: null
	 *   }
	 * });
	 * ```
	 */
	async logConversationBlock(params: {
		blockInfo: BlockInfo;
		messages: ChatMessage[];
		assistantResponse: string;
		metadata: ConversationMetadata;
	}): Promise<void> {
		const { blockInfo, messages, assistantResponse, metadata } = params;

		// Build full context (messages + assistant response)
		const fullContext: ChatMessage[] = [
			...messages,
			{ role: 'assistant', content: assistantResponse },
		];

		// Calculate context_hash (for next request's previous context lookup)
		const contextHash = hashContext(fullContext);

		// Calculate block_hash (blockchain linking with prev_hash)
		const newUserMessage = messages[messages.length - 1].content;
		const blockHash = hashBlock(newUserMessage, assistantResponse, blockInfo.prevHash);

		// Serialize tool calls if present
		const toolCallsJson = metadata.toolCalls && metadata.toolCalls.length > 0
			? JSON.stringify(metadata.toolCalls)
			: null;

		// Insert into D1
		await this.db
			.prepare(
				`
				INSERT INTO conversation_logs
				(chain_id, block_hash, prev_hash, block_index,
				 context_hash, context, user_message, locale, ip_hash, tool_calls,
				 assistant_response, model, tokens_in, tokens_out, latency_ms, created_at)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			`,
			)
			.bind(
				blockInfo.chainId,
				blockHash,
				blockInfo.prevHash,
				blockInfo.blockIndex,
				contextHash,
				JSON.stringify(fullContext),
				newUserMessage,
				metadata.locale,
				metadata.ipHash,
				toolCallsJson,
				assistantResponse,
				metadata.model,
				metadata.tokensIn,
				metadata.tokensOut,
				metadata.latencyMs,
				Date.now(),
			)
			.run();
	}

	// ========================================================================
	// PUBLIC API: Query Utilities (Optional - for future use)
	// ========================================================================

	/**
	 * Get conversation block by context hash
	 *
	 * @param contextHash - Context hash to lookup
	 * @returns Block data or null
	 */
	async getBlockByContextHash(contextHash: string): Promise<ConversationBlock | null> {
		const result = await this.db
			.prepare(
				`
				SELECT * FROM conversation_logs
				WHERE context_hash = ?
				LIMIT 1
			`,
			)
			.bind(contextHash)
			.first();

		if (!result) return null;

		return this.mapRowToBlock(result);
	}

	/**
	 * Get all blocks in a chain (ordered by block_index)
	 *
	 * @param chainId - Chain ID
	 * @returns Array of blocks
	 */
	async getChainBlocks(chainId: string): Promise<ConversationBlock[]> {
		const result = await this.db
			.prepare(
				`
				SELECT * FROM conversation_logs
				WHERE chain_id = ?
				ORDER BY block_index ASC
			`,
			)
			.bind(chainId)
			.all();

		return result.results.map((row) => this.mapRowToBlock(row));
	}

	/**
	 * Verify chain integrity in D1
	 * Checks that all blocks in a chain are properly linked
	 *
	 * @param chainId - Chain ID to verify
	 * @returns Validation result
	 */
	async verifyChainIntegrity(
		chainId: string,
	): Promise<{
		valid: boolean;
		blockCount: number;
		error?: string;
	}> {
		const blocks = await this.getChainBlocks(chainId);

		if (blocks.length === 0) {
			return { valid: false, blockCount: 0, error: 'Chain not found' };
		}

		// Check genesis block
		if (blocks[0].blockIndex !== 0 || blocks[0].prevHash !== null) {
			return { valid: false, blockCount: blocks.length, error: 'Invalid genesis block' };
		}

		// Check chain linkage
		for (let i = 1; i < blocks.length; i++) {
			const current = blocks[i];
			const previous = blocks[i - 1];

			// Check block index continuity
			if (current.blockIndex !== previous.blockIndex + 1) {
				return {
					valid: false,
					blockCount: blocks.length,
					error: `Block index gap at ${i}`,
				};
			}

			// Check prev_hash linkage
			if (current.prevHash !== previous.blockHash) {
				return {
					valid: false,
					blockCount: blocks.length,
					error: `Chain broken at block ${i}`,
				};
			}
		}

		return { valid: true, blockCount: blocks.length };
	}

	// ========================================================================
	// PRIVATE HELPERS
	// ========================================================================

	/**
	 * Map D1 row to ConversationBlock object
	 */
	private mapRowToBlock(row: any): ConversationBlock {
		return {
			id: row.id as number,
			chainId: row.chain_id as string,
			blockHash: row.block_hash as string,
			prevHash: row.prev_hash as string | null,
			blockIndex: row.block_index as number,
			contextHash: row.context_hash as string,
			context: JSON.parse(row.context as string) as ChatMessage[],
			userMessage: row.user_message as string,
			assistantResponse: row.assistant_response as string,
			locale: row.locale as string,
			ipHash: row.ip_hash as string,
			model: row.model as string,
			tokensIn: row.tokens_in as number,
			tokensOut: row.tokens_out as number,
			latencyMs: row.latency_ms as number,
			toolCalls: row.tool_calls as string | null,
			createdAt: row.created_at as number,
		};
	}
}