// noinspection SqlDialectInspection
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
 * ARTEK AI Worker - Main Entry Point
 * @version 3.0.0
 */

import type { MessageParam, ToolUseBlock } from '@anthropic-ai/sdk/resources/messages';
import type { Env, ChatRequest, ClaudeResponse, TurnstileResponse } from './types';
import { CONFIG } from './config';
import {
	badRequest,
	badGateway,
	internalServerError,
	tooManyRequests,
	serviceUnavailable,
	notFound,
	methodNotAllowed,
	integrityViolationError,
} from './utils/errors';
import { logError, logInfo, logWarn } from './utils/logging';
import { validateChatRequest } from './validation/request';
import { checkRateLimits, checkTokenLimit, incrementTokenCount } from './middleware/ratelimit';
import { getTranslations, parseLocale, type Locale } from './translations';
import { KNOWLEDGE_SEARCH_TOOL, executeKnowledgeSearch } from './claude/tools/knowledge-search';
import { CLAUDE_SYSTEM_PROMPT } from './claude/prompts';
import { BlockchainIntegrityManager } from './integrity';
import { ClaudeManager } from './claude';

/**
 * CORS headers for all responses
 */
const CORS_HEADERS = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'POST, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type',
	'Access-Control-Max-Age': '86400',
};

// noinspection JSUnusedGlobalSymbols
/**
 * Main Worker Export
 */
export default {
	/**
	 * Fetch handler - processes all incoming requests
	 *
	 * @param request - Incoming HTTP request
	 * @param env - Environment bindings (secrets, variables, KV)
	 * @param ctx - Execution context
	 * @returns HTTP response
	 */
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const startTime = Date.now();
		const url = new URL(request.url);
		const method = request.method;

		try {
			// 1. Handle OPTIONS preflight (CORS)
			if (method === 'OPTIONS') {
				return new Response(null, {
					status: 204,
					headers: CORS_HEADERS,
				});
			}

			// 2. Check endpoint path
			if (url.pathname !== '/api/v1/chat/completions' && url.pathname !== '/') {
				const defaultT = getTranslations('tr').errors;
				return notFound(defaultT.endpointNotFound);
			}

			// 3. Only accept POST requests
			if (method !== 'POST') {
				const defaultT = getTranslations('tr').errors;
				return methodNotAllowed(defaultT.methodNotAllowed);
			}

			// 4. Check request body size limit
			const contentLength = request.headers.get('Content-Length');
			if (contentLength && parseInt(contentLength) > CONFIG.validation.maxRequestBodySize) {
				logWarn(
					'[AI-WORKER-CLAUDE] Request body too large',
					{
						size: parseInt(contentLength),
						limit: CONFIG.validation.maxRequestBodySize,
					},
					env,
				);
				const defaultT = getTranslations('tr').errors;
				return badRequest(defaultT.requestBodyTooLarge);
			}

			// 5. Check rate limits
			const rateLimitResult = await checkRateLimits(request, env);
			if (!rateLimitResult.allowed) {
				logWarn(
					'[AI-WORKER-CLAUDE] Rate limit exceeded',
					{
						ip: request.headers.get('CF-Connecting-IP'),
						remaining: rateLimitResult.remaining,
						retryAfter: rateLimitResult.retryAfter,
					},
					env,
				);
				const defaultT = getTranslations('tr').errors;
				return tooManyRequests(defaultT.rateLimitExceeded, rateLimitResult.retryAfter);
			}

			// 7. Check daily token limit
			const tokenLimitOk = await checkTokenLimit(env);
			if (!tokenLimitOk) {
				logWarn('[AI-WORKER-CLAUDE] Daily token limit exceeded', undefined, env);
				const defaultT = getTranslations('tr').errors;
				return serviceUnavailable(defaultT.tokenQuotaExceeded);
			}

			// 8. Parse request body
			let body: unknown;
			try {
				body = await request.json();
			} catch (error) {
				logError('[AI-WORKER-CLAUDE] JSON parse error', error, env);
				const defaultT = getTranslations('tr').errors;
				return badRequest(defaultT.invalidJson, error instanceof Error ? error.message : 'Unknown error');
			}

			// 9. Extract locale from request
			const locale: Locale = parseLocale((body as any)?.locale);
			const t = getTranslations(locale).errors;

			// 10. Verify Turnstile token
			const turnstileToken = (body as any)?.turnstileToken;
			if (!turnstileToken) {
				return badRequest(t.turnstileMissing);
			}

			const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
			const turnstileValid = await verifyTurnstile(turnstileToken, clientIP, env.TURNSTILE_SECRET_KEY);

			if (!turnstileValid) {
				logWarn(
					'[AI-WORKER-CLAUDE] Turnstile verification failed',
					{
						ip: clientIP,
						hasToken: !!turnstileToken,
					},
					env,
				);
				return badRequest(t.turnstileFailed);
			}

			// 11. Validate request
			let chatRequest: ChatRequest;
			try {
				chatRequest = validateChatRequest(body, locale);
			} catch (error) {
				logError('[AI-WORKER-CLAUDE] Validation error', error, env);
				return badRequest(
					error instanceof Error ? error.message : t.validationFailed,
					(error as { validationErrors?: unknown }).validationErrors,
				);
			}

			// 11. Log request details
			logInfo(
				'[AI-WORKER-CLAUDE] Processing request',
				{
					locale,
					messagesCount: chatRequest.messages.length,
					maxTokens: chatRequest.max_tokens,
					temperature: chatRequest.temperature,
				},
				env,
			);

			// 12. Blockchain Integrity Verification (EIP-712 TypedData)
			const blockchain = new BlockchainIntegrityManager(env.AI_LOGS_DB);
			const blockInfo = await blockchain.verifyMessages(chatRequest.messages);

			if (!blockInfo.valid) {
				logWarn(
					'[AI-WORKER-CLAUDE] Blockchain integrity violation detected',
					{
						messagesCount: chatRequest.messages.length,
						isGenesis: blockInfo.isGenesis,
					},
					env,
				);
				return integrityViolationError(t.integrityViolation);
			}

			logInfo(
				'[AI-WORKER-CLAUDE] Blockchain integrity verified',
				{
					isGenesis: blockInfo.isGenesis,
					chainId: blockInfo.chainId.slice(0, 10) + '...',
					blockIndex: blockInfo.blockIndex,
					messagesCount: chatRequest.messages.length,
				},
				env,
			);

			// 13. Use Claude system prompt from file
			const systemPrompt = CLAUDE_SYSTEM_PROMPT;

			// 13. Build conversation messages for Claude
			const conversationMessages = chatRequest.messages.map((msg) => ({
				role: msg.role,
				content: msg.content,
			}));

			// 14. Call Claude API with tool support
			const claude = new ClaudeManager(env.ANTHROPIC_API_KEY, systemPrompt, CONFIG.claude.model);

			// Tool executor function
			const toolExecutor = async (toolName: string, toolUseBlock: ToolUseBlock): Promise<string> => {
				if (toolName === 'knowledge_search') {
					const searchQuery = (toolUseBlock.input as { query: string }).query;

					logInfo('[AI-WORKER-CLAUDE] Knowledge search executing', { query: searchQuery, toolId: toolUseBlock.id }, env);

					const result = await executeKnowledgeSearch(searchQuery, env, locale);

					logInfo('[AI-WORKER-CLAUDE] Knowledge search completed', { toolId: toolUseBlock.id }, env);

					return result;
				}

				return 'Unknown tool';
			};

			let claudeManagerResponse;

			try {
				// Call Claude with tools
				claudeManagerResponse = await claude.chatWithTools(
					conversationMessages as MessageParam[],
					[KNOWLEDGE_SEARCH_TOOL],
					toolExecutor,
					{
						maxTokens: chatRequest.max_tokens || CONFIG.claude.defaultMaxTokens,
						temperature: chatRequest.temperature ?? CONFIG.claude.defaultTemperature,
					},
					{
						maxIterations: CONFIG.aisearch.maxToolIterations,
					},
				);

				// Log tool usage
				if (claudeManagerResponse.iterations > 0) {
					logInfo(
						'[AI-WORKER-CLAUDE] Tool iterations completed',
						{
							iterations: claudeManagerResponse.iterations,
							toolUses: claudeManagerResponse.toolUses.length,
						},
						env,
					);
				}
			} catch (error) {
				logError('[AI-WORKER-CLAUDE] Claude API error', error, env);
				return badGateway(error instanceof Error ? `AI service error: ${error.message}` : t.upstreamConnectionFailed);
			}

			// 15. Increment token counter
			const tokensUsed = claudeManagerResponse.usage.totalTokens;
			if (tokensUsed > 0) {
				ctx.waitUntil(incrementTokenCount(env, tokensUsed));
			}

			// 16. Build native Claude response
			const duration = Date.now() - startTime;
			const response: ClaudeResponse = {
				id: claudeManagerResponse.id,
				type: 'message',
				role: 'assistant',
				content: claudeManagerResponse.content || getTranslations(locale).errors.emptyResponse,
				model: claudeManagerResponse.model,
				stop_reason: claudeManagerResponse.stopReason,
				usage: {
					input_tokens: claudeManagerResponse.usage.inputTokens,
					output_tokens: claudeManagerResponse.usage.outputTokens,
					total_tokens: claudeManagerResponse.usage.totalTokens,
				},
				metadata: {
					duration_ms: duration,
					timestamp: Date.now(),
				},
			};

			logInfo(
				'[AI-WORKER-CLAUDE] Request completed',
				{
					duration_ms: duration,
					tokens: tokensUsed,
					ip: request.headers.get('CF-Connecting-IP'),
				},
				env,
			);

			// 17. Log conversation block to blockchain (async, non-blocking)
			const ipHash = await hashIP(clientIP);

			ctx.waitUntil(
				blockchain
					.logConversationBlock({
						blockInfo,
						messages: chatRequest.messages,
						assistantResponse: response.content,
						metadata: {
							locale,
							ipHash,
							model: claudeManagerResponse.model,
							tokensIn: claudeManagerResponse.usage.inputTokens,
							tokensOut: claudeManagerResponse.usage.outputTokens,
							latencyMs: duration,
							toolCalls: claudeManagerResponse.toolUses.length > 0 ? claudeManagerResponse.toolUses : null,
						},
					})
					.catch((error: Error) => {
						logError('[AI-WORKER-CLAUDE] Blockchain logging failed', error, env);
					}),
			);

			// 18. Return successful response
			return new Response(JSON.stringify(response, null, 2), {
				status: 200,
				headers: {
					'Content-Type': 'application/json',
					...CORS_HEADERS,
				},
			});
		} catch (error) {
			// Unexpected error
			logError('[AI-WORKER-CLAUDE] Unexpected error', error, env);

			const defaultT = getTranslations('tr').errors;
			return internalServerError(defaultT.unexpectedError);
		}
	},
};

/**
 * Verify Cloudflare Turnstile token
 */
async function verifyTurnstile(token: string, ip: string, secret: string): Promise<boolean> {
	try {
		const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				secret,
				response: token,
				remoteip: ip,
			}),
		});

		const data: TurnstileResponse = await response.json();
		return data.success;
	} catch (error) {
		// Log error but fail closed (deny access on verification failure)
		return false;
	}
}

/**
 * Hash IP address (pseudonymization)
 * Uses SHA-256 without salt
 */
async function hashIP(ip: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(ip);
	const hashBuffer = await crypto.subtle.digest('SHA-256', data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
