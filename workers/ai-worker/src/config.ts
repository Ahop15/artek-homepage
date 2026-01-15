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
	 */
	aisearch: {
		/**
		 * LLM model for AI Search response generation
		 * This model generates the final answer after retrieval
		 * @example model: CONFIG.aisearch.model
		 * @see https://developers.cloudflare.com/workers-ai/models/
		 */
		model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',

		/**
		 * Enable query rewriting for better search results
		 * Note: Query rewriting is technically handled by Claude's understanding,
		 * but this flag enables AI Search's built-in query optimization
		 * @example rewrite_query: CONFIG.aisearch.rewriteQuery
		 */
		rewriteQuery: true,

		/**
		 * Maximum number of search results to return (1-50)
		 * @example max_num_results: CONFIG.aisearch.maxResults
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
		 * @example reranking: CONFIG.aisearch.reranking
		 */
		reranking: {
			/**
			 * Enable semantic reranking
			 * When enabled, uses BGE reranker to reorder results by semantic relevance
			 */
			enabled: true,
		},

		/**
		 * Ranking options for search result filtering
		 */
		ranking: {
			/**
			 * Minimum score threshold for search results (0-1 range)
			 * Results with scores below this threshold will be filtered out
			 * Recommended: 0.4-0.5 for balanced precision/recall
			 * @example score_threshold: 0.45 means only results with 45%+ match score
			 */
			scoreThreshold: 0.4,
		},
	},
} as const;
