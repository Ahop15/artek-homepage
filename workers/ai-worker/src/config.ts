// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 *  █████╗ ██████╗  █████╗ ███████╗
 * ██╔══██╗██╔══██╗██╔══██╗██╔════╝
 * ███████║██████╔╝███████║███████╗
 * ██╔══██║██╔══██╗██╔══██║╚════██║
 * ██║  ██║██║  ██║██║  ██║███████║
 * ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝
 *
 * Copyright (C) 2025 Rıza Emre ARAS <r.emrearas@proton.me>
 *
 * This file is part of ARTEK Homepage.
 *
 * ARTEK Homepage is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

/**
 * ARTEK AI Worker Configuration
 */

export const CONFIG = {
	/**
	 * Anthropic Claude AI Settings
	 */
	claude: {
		/**
		 * Claude model to use
		 * @example model: CONFIG.claude.model
		 */
		model: 'claude-sonnet-4-20250514',

		/**
		 * Default maximum tokens for completion
		 * @example max_tokens: chatRequest.max_tokens || CONFIG.claude.defaultMaxTokens
		 */
		defaultMaxTokens: 16384,

		/**
		 * Default temperature (0-1)
		 * For support: 0.7 provides balanced, helpful responses
		 * @example temperature: chatRequest.temperature ?? CONFIG.claude.defaultTemperature
		 */
		defaultTemperature: 0.7,
	},

	/**
	 * Request Validation Limits
	 */
	validation: {
		/**
		 * Maximum length of a single message content
		 * @example if (message.content.length > CONFIG.validation.maxMessageLength)
		 */
		maxMessageLength: 16384,

		/**
		 * Maximum number of messages in a single request
		 * @example if (messages.length > CONFIG.validation.maxMessagesPerRequest)
		 */
		maxMessagesPerRequest: 50,

		/**
		 * Maximum tokens per completion
		 * @example if (max_tokens > CONFIG.validation.maxTokens)
		 */
		maxTokens: 16384,

		/**
		 * Minimum temperature value
		 * @example if (temperature < CONFIG.validation.minTemperature)
		 */
		minTemperature: 0,

		/**
		 * Maximum temperature value (Claude supports 0-1)
		 * @example if (temperature > CONFIG.validation.maxTemperature)
		 */
		maxTemperature: 1,

		/**
		 * Maximum request body size in bytes (50KB)
		 * @example if (contentLength > CONFIG.validation.maxRequestBodySize)
		 */
		maxRequestBodySize: 51200,
	},

	/**
	 * Rate Limiting Configuration
	 */
	rateLimit: {
		/**
		 * Maximum requests per minute per IP
		 * @example if (requestCount > CONFIG.rateLimit.requestsPerMinute)
		 */
		requestsPerMinute: 5,

		/**
		 * Maximum requests per hour per IP
		 * @example if (hourlyCount > CONFIG.rateLimit.requestsPerHour)
		 */
		requestsPerHour: 50,

		/**
		 * Maximum requests per day per IP
		 * @example if (dailyCount > CONFIG.rateLimit.requestsPerDay)
		 */
		requestsPerDay: 200,

		/**
		 * Maximum tokens consumed per day (all users)
		 * @example if (totalTokens > CONFIG.rateLimit.tokensPerDay)
		 */
		tokensPerDay: 500000,
	},

	/**
	 * Localization Settings
	 */
	localization: {
		/**
		 * Default locale for error messages and responses
		 * @example locale: chatRequest.locale || CONFIG.localization.defaultLocale
		 */
		defaultLocale: 'tr' as 'tr' | 'en',

		/**
		 * Supported locales
		 * @example if (!CONFIG.localization.supportedLocales.includes(locale))
		 */
		supportedLocales: ['tr', 'en'] as const,
	},

	/**
	 * AI Search / AutoRAG Settings
	 * @see https://developers.cloudflare.com/ai-search/
	 */
	aisearch: {
		/**
		 * LLM model for AI Search response generation
		 * This model generates the final answer after retrieval
		 *
		 * Options:
		 * - @cf/meta/llama-3.3-70b-instruct-fp8-fast (recommended - better quality)
		 * - @cf/meta/llama-3.1-8b-instruct-fast (faster, lower cost)
		 *
		 * @example model: CONFIG.aisearch.model
		 * @see https://developers.cloudflare.com/ai-search/configuration/models/
		 */
		model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',

		/**
		 * Enable query rewriting for better search results
		 * Transforms user queries into search-optimized queries using an LLM
		 * Example: "how do i fix api errors?" → "API error troubleshooting authentication timeout"
		 *
		 * Recommended: true for conversational queries
		 * @example rewrite_query: CONFIG.aisearch.rewriteQuery
		 * @see https://developers.cloudflare.com/ai-search/configuration/query-rewriting/
		 */
		rewriteQuery: true,

		/**
		 * Maximum number of search results to return (1-50)
		 * Higher values = more context but higher latency and cost
		 *
		 * Recommended: 15-20 for balanced results
		 * @example max_num_results: CONFIG.aisearch.maxResults
		 * @see https://developers.cloudflare.com/ai-search/configuration/retrieval-configuration/
		 */
		maxResults: 20,

		/**
		 * Maximum number of tool iterations per request
		 * Claude can call knowledge_search up to this many times in a single conversation turn
		 * @example while (iterations < CONFIG.aisearch.maxToolIterations)
		 */
		maxToolIterations: 3,

		/**
		 * Semantic reranking configuration
		 * Reranks search results using specialized reranking models for improved relevance
		 * How it works: Retrieve results → Pass through reranker → Return reordered results
		 *
		 * Highly recommended for better result quality, especially with large datasets
		 * @example reranking: CONFIG.aisearch.reranking
		 * @see https://developers.cloudflare.com/ai-search/configuration/reranking/
		 */
		reranking: {
			/**
			 * Enable semantic reranking
			 * When enabled, uses BGE reranker to reorder results by semantic relevance
			 * Default: false (recommended: true)
			 */
			enabled: true,

			/**
			 * Reranking model to use
			 * @cf/baai/bge-reranker-base: Balanced performance (recommended)
			 *
			 * @see https://developers.cloudflare.com/ai-search/configuration/models/supported-models/
			 */
			model: '@cf/baai/bge-reranker-base',
		},

		/**
		 * Ranking options for search result filtering
		 */
		ranking: {
			/**
			 * Minimum score threshold for search results (0-1 range)
			 * Results with scores below this threshold will be filtered out
			 *
			 * Tuning guide:
			 * - 0.3-0.4: Higher recall (more results, some may be less relevant)
			 * - 0.4-0.5: Balanced precision/recall (recommended)
			 * - 0.5-0.6: Higher precision (fewer but more relevant results)
			 *
			 * @example score_threshold: 0.45 means only results with 45%+ match score
			 * @see https://developers.cloudflare.com/ai-search/configuration/retrieval-configuration/
			 */
			scoreThreshold: 0.4,
		},

		/**
		 * Indexing Configuration (set at AI Search instance level, not runtime)
		 *
		 * These settings are configured in Cloudflare Dashboard > AI Search > Settings
		 * or during instance creation:
		 *
		 * Chunk Size (64-512 tokens):
		 * - 128-192: Best for FAQ-style content (recommended for ARTEK)
		 * - 256-384: Good for technical documentation
		 * - 384-512: Best for narrative content
		 *
		 * Chunk Overlap (0-30%):
		 * - 15-20%: Balanced (recommended for ARTEK)
		 * - 20-30%: Better for flowing narrative content
		 * - 0-10%: Faster indexing, lower cost
		 *
		 * @see https://developers.cloudflare.com/ai-search/configuration/chunking/
		 */
	},
} as const;
