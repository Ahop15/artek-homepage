/**
 *  █████╗ ██████╗  █████╗ ███████╗
 * ██╔══██╗██╔══██╗██╔══██╗██╔════╝
 * ███████║██████╔╝███████║███████╗
 * ██╔══██║██╔══██╗██╔══██║╚════██║
 * ██║  ██║██║  ██║██║  ██║███████║
 * ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝
 *
 * ARTEK AI Worker - Claude AI Manager
 *
 * TR:
 * ----
 * Claude API etkileşimlerini yöneten merkezi sınıf.
 *
 * Ana İşlevler:
 * 	(1) Basic Chat: Basit sohbet tamamlama
 * 	(2) Chat with Tools: Çok iterasyonlu tool desteği
 * 	(3) Response Formatting: Yanıt formatlama
 * 	(4) Error Handling: Hata yönetimi
 *
 * Tool Loop:
 * - Claude tool kullanmak isterse (stop_reason='tool_use')
 * - Tool'lar execute edilir
 * - Sonuçlar Claude'a geri gönderilir
 * - Maksimum iterasyon sayısına kadar devam eder
 *
 * EN:
 * ----
 * Centralized manager for Claude API interactions.
 *
 * Main Functions:
 * 	(1) Basic Chat: Simple chat completion
 * 	(2) Chat with Tools: Multi-iteration tool support
 * 	(3) Response Formatting: Format responses
 * 	(4) Error Handling: Error management
 *
 * Tool Loop:
 * - When Claude wants to use tools (stop_reason='tool_use')
 * - Tools are executed
 * - Results sent back to Claude
 * - Continues up to max iterations
 */

import Anthropic from '@anthropic-ai/sdk';
import type { Message, MessageParam, ToolUseBlock } from '@anthropic-ai/sdk/resources/messages';
import type { Tool } from '@anthropic-ai/sdk/resources/messages';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Claude configuration options
 */
export interface ClaudeOptions {
	maxTokens?: number;
	temperature?: number;
	systemPrompt?: string;
	model?: string;
}

/**
 * Tool configuration for multi-iteration support
 */
export interface ToolOptions {
	maxIterations?: number;
}

/**
 * Tool use tracking
 */
export interface ToolUse {
	tool: string;
	input: unknown;
	output: unknown;
}

/**
 * Tool executor function type
 * Takes tool name and input, returns tool result
 */
export type ToolExecutor = (toolName: string, toolUseBlock: ToolUseBlock) => Promise<string>;

/**
 * Claude response (formatted)
 */
export interface ClaudeResponse {
	id: string;
	content: string;
	model: string;
	stopReason: string;
	usage: {
		inputTokens: number;
		outputTokens: number;
		totalTokens: number;
	};
	toolUses: ToolUse[];
	iterations: number;
}

// ============================================================================
// CLAUDE MANAGER
// ============================================================================

/**
 * Manages all Claude API interactions
 *
 * @example
 * ```typescript
 * const claude = new ClaudeManager(env.ANTHROPIC_API_KEY, systemPrompt);
 *
 * // Basic chat
 * const response = await claude.chat(messages, { maxTokens: 1000 });
 *
 * // Chat with tools
 * const responseWithTools = await claude.chatWithTools(
 *   messages,
 *   [KNOWLEDGE_SEARCH_TOOL],
 *   toolExecutor,
 *   { maxIterations: 3 }
 * );
 * ```
 */
export class ClaudeManager {
	private readonly client: Anthropic;
	private readonly defaultSystemPrompt: string;
	private readonly defaultModel: string;

	constructor(apiKey: string, systemPrompt: string = '', model: string = 'claude-sonnet-4-20250514') {
		this.client = new Anthropic({ apiKey });
		this.defaultSystemPrompt = systemPrompt;
		this.defaultModel = model;
	}

	/**
	 * Chat completion with tool support (multi-iteration)
	 *
	 * Supports Claude's multi-turn tool usage:
	 * 1. Claude requests tools (stop_reason='tool_use')
	 * 2. Tools are executed via toolExecutor
	 * 3. Results sent back to Claude
	 * 4. Repeat up to maxIterations
	 *
	 * @param messages - Conversation messages
	 * @param tools - Available tools
	 * @param toolExecutor - Function to execute tools
	 * @param claudeOptions - Claude options
	 * @param toolOptions - Tool iteration options
	 * @returns Formatted Claude response with tool usage tracking
	 */
	async chatWithTools(
		messages: MessageParam[],
		tools: Tool[],
		toolExecutor: ToolExecutor,
		claudeOptions?: ClaudeOptions,
		toolOptions?: ToolOptions,
	): Promise<ClaudeResponse> {
		const maxIterations = toolOptions?.maxIterations || 3;
		const toolUses: ToolUse[] = [];
		let allMessages = [...messages];
		let iterations = 0;

		// Initial Claude API call with tools
		let response = await this.client.messages.create({
			model: claudeOptions?.model || this.defaultModel,
			max_tokens: claudeOptions?.maxTokens || 16384,
			temperature: claudeOptions?.temperature ?? 0.7,
			system: claudeOptions?.systemPrompt || this.defaultSystemPrompt,
			messages: allMessages,
			tools,
		});

		// Tool use loop - Claude can call tools up to maxIterations times
		while (response.stop_reason === 'tool_use' && iterations < maxIterations) {
			// Find ALL tool use blocks (Claude can request multiple tools at once)
			const toolUseBlocks = response.content.filter((block): block is ToolUseBlock => block.type === 'tool_use');

			if (toolUseBlocks.length === 0) {
				// No tool blocks found, exit loop
				break;
			}

			iterations++;

			// Execute ALL tools
			const toolResults: Array<{
				type: 'tool_result';
				tool_use_id: string;
				content: string;
			}> = [];

			for (const toolUseBlock of toolUseBlocks) {
				// Execute tool via provided executor
				const toolResult = await toolExecutor(toolUseBlock.name, toolUseBlock);

				// Track tool usage for logging
				toolUses.push({
					tool: toolUseBlock.name,
					input: toolUseBlock.input,
					output: toolResult,
				});

				toolResults.push({
					type: 'tool_result',
					tool_use_id: toolUseBlock.id,
					content: toolResult,
				});
			}

			// Build tool result message with ALL results
			allMessages.push({
				role: 'assistant',
				content: response.content,
			});

			allMessages.push({
				role: 'user',
				content: toolResults,
			});

			// Call Claude again with ALL tool results
			response = await this.client.messages.create({
				model: claudeOptions?.model || this.defaultModel,
				max_tokens: claudeOptions?.maxTokens || 16384,
				temperature: claudeOptions?.temperature ?? 0.7,
				system: claudeOptions?.systemPrompt || this.defaultSystemPrompt,
				messages: allMessages,
				tools,
			});
		}

		return this.formatResponse(response, toolUses, iterations);
	}

	/**
	 * Format Claude API response to our standard format
	 *
	 * @param response - Raw Claude API response
	 * @param toolUses - Tool usage tracking
	 * @param iterations - Tool iteration count
	 * @returns Formatted response
	 */
	private formatResponse(response: Message, toolUses: ToolUse[], iterations: number): ClaudeResponse {
		// Extract text content from response
		const content = response.content
			.map((block) => (block.type === 'text' ? block.text : ''))
			.join('')
			.trim();

		return {
			id: response.id,
			content,
			model: response.model,
			stopReason: response.stop_reason || 'end_turn',
			usage: {
				inputTokens: response.usage.input_tokens,
				outputTokens: response.usage.output_tokens,
				totalTokens: response.usage.input_tokens + response.usage.output_tokens,
			},
			toolUses,
			iterations,
		};
	}
}
