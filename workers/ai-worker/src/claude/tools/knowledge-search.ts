/**
 * Knowledge Base Search Tool for Claude
 * Uses Cloudflare AI Search to query ARTEK knowledge base
 */

import type { Env, AISearchResult } from '../../types';
import { AISEARCH_SYSTEM_PROMPT } from '../prompts';
import { getTranslations, type Locale } from '../../translations';
import { CONFIG } from '../../config';
import { logWarn, logError } from '../../utils/logging';

/**
 * Get Claude Tool Definition for Knowledge Base Search
 * Tool description is locale-independent (always English for Claude)
 */
export function getKnowledgeSearchTool() {
	const t = getTranslations('tr'); // Use TR for tool description baseline
	return {
		name: 'knowledge_search',
		description: t.knowledgeSearch.toolDescription,
		input_schema: {
			type: 'object' as const,
			properties: {
				query: {
					type: 'string' as const,
					description: 'Search query in natural language (Turkish or English)',
				},
			},
			required: ['query'],
		},
	};
}

// Export static tool for backward compatibility
export const KNOWLEDGE_SEARCH_TOOL = getKnowledgeSearchTool();

/**
 * Execute knowledge base search using AI Search with retry logic
 *
 * @param query - User's search query
 * @param env - Worker environment bindings
 * @param locale - User's locale (tr or en)
 * @returns AI Search response with sources, or error message (never throws)
 */
export async function executeKnowledgeSearch(query: string, env: Env, locale: Locale = 'tr'): Promise<string> {
	// Get translations for current locale
	const t = getTranslations(locale);

	// Retry configuration for transient errors (e.g., error 1031)
	const MAX_RETRIES = 3;
	const RETRY_DELAY_MS = 1000;

	for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
		try {
			// Build AI Search input with locale-aware filtering
			const searchInput = {
				query: query,
				model: CONFIG.aisearch.model,
				system_prompt: AISEARCH_SYSTEM_PROMPT,
				rewrite_query: CONFIG.aisearch.rewriteQuery,
				max_num_results: CONFIG.aisearch.maxResults,
				ranking_options: {
					score_threshold: CONFIG.aisearch.ranking.scoreThreshold,
				},
				reranking: {
					enabled: CONFIG.aisearch.reranking.enabled,
				},
				// Multitenancy: Locale-aware folder filtering
				// Ensures Turkish queries only return Turkish content, English only English
				// Pattern: hierarchical "starts with" using compound filter
				filters: {
					type: 'and' as const,
					filters: [
						{ type: 'gt' as const, key: 'folder' as const, value: `${locale}//` },
						{ type: 'lte' as const, key: 'folder' as const, value: `${locale}/\uffff` },
					],
				},
			};

			// Call AI Search via AutoRAG binding (using system prompt from file)
			const result = (await env.AI.autorag(env.AISEARCH_NAME).aiSearch(searchInput)) as AISearchResult;

			// Format response with sources (localized)
			// Ensure response is never empty, use fallback if needed
			let formattedResponse = result.response?.trim() || t.knowledgeSearch.noResults;

			// Log if we're using fallback
			if (!result.response?.trim()) {
				logWarn(
					'[KNOWLEDGE-SEARCH] Empty AI Search response, using fallback message',
					{
						resultsCount: result.data?.length || 0,
						searchQuery: result.search_query,
					},
					env,
				);
			}

			// Add source information if available (localized)
			if (result.data && result.data.length > 0) {
				formattedResponse += t.knowledgeSearch.resultsHeader;
				formattedResponse += t.knowledgeSearch.resultsCount(result.data.length);

				// Add individual source details with scores
				formattedResponse += t.knowledgeSearch.dataFilesHeader;
				result.data.forEach((item, index) => {
					formattedResponse += `${index + 1}. ${t.knowledgeSearch.matchScore(item.filename, item.score * 100)}\n`;
				});
			}

			return formattedResponse;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			const isLastAttempt = attempt === MAX_RETRIES;

			// Log retry attempts
			if (!isLastAttempt) {
				logWarn(
					`[KNOWLEDGE-SEARCH] AI Search error (attempt ${attempt + 1}/${MAX_RETRIES + 1}), retrying...`,
					{ error: errorMessage },
					env,
				);
				// Wait before retrying (exponential backoff)
				await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1)));
			} else {
				// Log final error
				logError('[KNOWLEDGE-SEARCH] AI Search error after retries', error, env);

				// Return error information to Claude so it can inform the user gracefully
				// This prevents the entire request from failing
				return t.knowledgeSearch.searchError(errorMessage);
			}
		}
	}

	// Should never reach here, but TypeScript needs a return
	return t.knowledgeSearch.searchError('Unexpected error');
}
