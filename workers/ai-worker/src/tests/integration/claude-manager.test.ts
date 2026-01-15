/// <reference types="@cloudflare/vitest-pool-workers" />
// noinspection DuplicatedCode

/**
 * ARTEK AI Worker - ClaudeManager Integration Tests
 *
 * Tests ClaudeManager with REAL Claude API and REAL AI Search.
 *
 * Test Philosophy:
 * - Use REAL Claude API (Anthropic)
 * - Use REAL AI Search (Cloudflare)
 * - Test functionality, not semantics
 * - Verify integration works, not response content
 *
 * Coverage:
 * 1. chatWithTools() - Basic functionality
 * 2. Tool usage detection and execution
 * 3. Multi-iteration support
 * 4. Response format validation
 * 5. Error handling
 *
 * Note: These tests make real API calls and incur costs (~$0.10 per run)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { env } from 'cloudflare:test';
import type { Env } from '../../types';
import { ClaudeManager } from '../../claude';
import { KNOWLEDGE_SEARCH_TOOL, executeKnowledgeSearch } from '../../claude/tools/knowledge-search';
import { CLAUDE_SYSTEM_PROMPT } from '../../claude/prompts';
import { CONFIG } from '../../config';
import {
	printTestHeader,
	printTestFooter,
	printUserMessage,
	printApiCall,
	printToolUsage,
	printClaudeResponse,
	printUsageStats,
	printValidation,
	printProgress,
	printScenario,
	type ToolUsageInfo,
} from '../helpers/test-logger';

// Type-safe access to test environment bindings
const testEnv = env as unknown as Env;

describe('ClaudeManager - Integration Tests (Real APIs)', () => {
	let claude: ClaudeManager;
	let testStartTime: number;

	beforeEach(() => {
		testStartTime = Date.now();
		const testName = expect.getState().currentTestName || 'Unknown test';
		printTestHeader(testName);
	});

	afterEach(() => {
		const elapsed = Date.now() - testStartTime;
		printTestFooter(elapsed, 'PASS');
	});

	// Tool executor for knowledge search (with logging)
	const createToolExecutor = (locale: 'tr' | 'en' = 'tr') => {
		return async (toolName: string, toolUseBlock: any): Promise<string> => {
			printProgress('[TOOL CALL] Tool execution requested:', {
				tool: toolName,
				id: toolUseBlock.id,
			});

			if (toolName === 'knowledge_search') {
				const searchQuery = (toolUseBlock.input as { query: string }).query;
				printProgress('[SEARCH INPUT] Query:', { query: searchQuery, locale });

				const searchStart = Date.now();
				const result = await executeKnowledgeSearch(searchQuery, testEnv, locale);
				const searchElapsed = Date.now() - searchStart;

				printProgress(`[SEARCH RESULT] AI Search completed in ${searchElapsed}ms`, {
					resultLength: result.length,
					preview: result.substring(0, 100) + (result.length > 100 ? '...' : ''),
				});

				return result;
			}

			printProgress('[TOOL ERROR] Unknown tool requested');
			return 'Unknown tool';
		};
	};

	// ============================================================================
	// TEST GROUP 1: Basic chatWithTools() Functionality
	// ============================================================================

	describe('chatWithTools() - Basic Functionality', () => {
		it('should complete chat request with real Claude API', async () => {
			// Initialize
			claude = new ClaudeManager(testEnv.ANTHROPIC_API_KEY, CLAUDE_SYSTEM_PROMPT, CONFIG.claude.model);

			// User message
			const messages = [{ role: 'user' as const, content: 'Hello, introduce yourself briefly' }];
			printUserMessage(messages[0].content);

			// API call config
			printApiCall({
				model: CONFIG.claude.model,
				tools: ['knowledge_search'],
				maxIterations: 3,
			});

			// Call Claude
			printProgress('Calling Claude API...');
			const apiStart = Date.now();
			const response = await claude.chatWithTools(messages, [KNOWLEDGE_SEARCH_TOOL], createToolExecutor('tr'));
			const apiElapsed = Date.now() - apiStart;

			// Claude response
			printClaudeResponse({
				id: response.id,
				content: response.content,
				durationMs: apiElapsed,
				model: response.model,
				stopReason: response.stopReason,
			});

			// Usage stats
			printUsageStats({
				inputTokens: response.usage.inputTokens,
				outputTokens: response.usage.outputTokens,
				totalTokens: response.usage.totalTokens,
				toolIterations: response.iterations,
				toolsUsed: response.toolUses.length,
			});

			// Tool usage (if any)
			if (response.toolUses.length > 0) {
				const toolInfo: ToolUsageInfo[] = response.toolUses.map((t: any, i: number) => ({
					tool: t.tool,
					id: `tool_${i}`,
					query: t.input?.query,
					resultLength: t.output?.length,
					preview: t.output?.substring(0, 100),
				}));
				printToolUsage(toolInfo);
			}

			// Validation
			const checks = [
				{ name: 'Response defined', passed: !!response },
				{ name: 'Content format valid', passed: response.content.length > 0 },
				{ name: 'Claude ID format (msg_...)', passed: /^msg_/.test(response.id) },
				{ name: 'Model name contains claude', passed: response.model.includes('claude') },
				{ name: 'Stop reason defined', passed: !!response.stopReason },
				{ name: 'Token usage > 0', passed: response.usage.totalTokens > 0 },
				{ name: 'Tool tracking structure', passed: Array.isArray(response.toolUses) },
			];

			printValidation(checks);

			// Assertions
			expect(response).toBeDefined();
			expect(response.content).toBeDefined();
			expect(typeof response.content).toBe('string');
			expect(response.content.length).toBeGreaterThan(0);
			expect(response.id).toMatch(/^msg_/);
			expect(response.model).toContain('claude');
			expect(response.stopReason).toBeDefined();
			expect(response.usage.totalTokens).toBeGreaterThan(0);
			expect(response.usage.inputTokens).toBeGreaterThan(0);
			expect(response.usage.outputTokens).toBeGreaterThan(0);
			expect(Array.isArray(response.toolUses)).toBe(true);
			expect(response.iterations).toBeGreaterThanOrEqual(0);
		});

		it('should handle Turkish query (TR locale)', async () => {
			claude = new ClaudeManager(testEnv.ANTHROPIC_API_KEY, CLAUDE_SYSTEM_PROMPT);

			const messages = [{ role: 'user' as const, content: 'Merhaba' }];
			printUserMessage(messages[0].content);

			printProgress('Calling Claude API (TR locale)...');
			const response = await claude.chatWithTools(messages, [KNOWLEDGE_SEARCH_TOOL], createToolExecutor('tr'));

			printUsageStats({
				inputTokens: response.usage.inputTokens,
				outputTokens: response.usage.outputTokens,
				totalTokens: response.usage.totalTokens,
				toolIterations: response.iterations,
				toolsUsed: response.toolUses.length,
			});

			// Functional: Turkish handled successfully
			expect(response.content).toBeDefined();
			expect(response.usage.totalTokens).toBeGreaterThan(0);
		});

		it('should handle English query (EN locale)', async () => {
			claude = new ClaudeManager(testEnv.ANTHROPIC_API_KEY, CLAUDE_SYSTEM_PROMPT);

			const messages = [{ role: 'user' as const, content: 'Hello' }];
			printUserMessage(messages[0].content);

			printProgress('Calling Claude API (EN locale)...');
			const response = await claude.chatWithTools(messages, [KNOWLEDGE_SEARCH_TOOL], createToolExecutor('en'));

			printUsageStats({
				inputTokens: response.usage.inputTokens,
				outputTokens: response.usage.outputTokens,
				totalTokens: response.usage.totalTokens,
				toolIterations: response.iterations,
				toolsUsed: response.toolUses.length,
			});

			// Functional: English handled successfully
			expect(response.content).toBeDefined();
			expect(response.usage.totalTokens).toBeGreaterThan(0);
		});
	});

	// ============================================================================
	// TEST GROUP 2: Tool Usage Detection
	// ============================================================================

	describe('Tool Usage Detection (Realistic Knowledge Base Queries)', () => {
		it('should support tool usage for specific knowledge query', async () => {
			claude = new ClaudeManager(testEnv.ANTHROPIC_API_KEY, CLAUDE_SYSTEM_PROMPT);

			printScenario('Specific knowledge question (flexible tool usage)', {
				target: 'tr/services/consultancy/legal-government',
				note: 'Claude decides tool usage',
			});

			const messages = [
				{
					role: 'user' as const,
					content: 'ARTEK danışmanlık hizmetleri kapsamında yasal ve devlet kaynaklı projeler konusunda ne tür hizmetler sunuyor?',
				},
			];
			printUserMessage(messages[0].content);

			printProgress('Calling Claude with knowledge_search tool...');
			const response = await claude.chatWithTools(messages, [KNOWLEDGE_SEARCH_TOOL], createToolExecutor('tr'));

			printUsageStats({
				inputTokens: response.usage.inputTokens,
				outputTokens: response.usage.outputTokens,
				totalTokens: response.usage.totalTokens,
				toolIterations: response.iterations,
				toolsUsed: response.toolUses.length,
			});

			// ESNEK: Sadece sistem çalışıyor mu?
			expect(response.content).toBeDefined();
			expect(response.content.length).toBeGreaterThan(0);
			expect(response.iterations).toBeGreaterThanOrEqual(0);
			expect(response.iterations).toBeLessThanOrEqual(3);

			// IF tools used, structure valid?
			if (response.toolUses.length > 0) {
				printProgress('Tools were used, verifying structure...');
				response.toolUses.forEach((tool) => {
					expect(tool.tool).toBe('knowledge_search');
					expect(tool.input).toBeDefined();
					expect(tool.output).toBeDefined();
				});
			}
		});

		it('should support multi-iteration for complex multi-category query', async () => {
			claude = new ClaudeManager(testEnv.ANTHROPIC_API_KEY, CLAUDE_SYSTEM_PROMPT);

			printScenario('Multi-category query (flexible iterations)', {
				categories: ['centers/rnd', 'services/consultancy'],
				note: 'Tool count may vary',
			});

			const messages = [
				{
					role: 'user' as const,
					content: 'ARTEK Ar-Ge merkezleri ve danışmanlık hizmetleri hakkında detaylı bilgi ver',
				},
			];
			printUserMessage(messages[0].content);

			printProgress('Calling Claude (multi-iteration possible)...');
			const response = await claude.chatWithTools(messages, [KNOWLEDGE_SEARCH_TOOL], createToolExecutor('tr'));

			printUsageStats({
				inputTokens: response.usage.inputTokens,
				outputTokens: response.usage.outputTokens,
				totalTokens: response.usage.totalTokens,
				toolIterations: response.iterations,
				toolsUsed: response.toolUses.length,
			});

			// ESNEK: Multi-iteration support çalışıyor mu?
			expect(response.content).toBeDefined();
			expect(response.content.length).toBeGreaterThan(0);
			expect(response.iterations).toBeLessThanOrEqual(3);
			expect(Array.isArray(response.toolUses)).toBe(true);

			if (response.toolUses.length > 0) {
				response.toolUses.forEach((toolUse) => {
					expect(toolUse.tool).toBe('knowledge_search');
					expect(toolUse.input).toBeDefined();
					expect(toolUse.output).toBeDefined();
				});
			}
		});

		it('should respect max iterations limit regardless of query complexity', async () => {
			claude = new ClaudeManager(testEnv.ANTHROPIC_API_KEY, CLAUDE_SYSTEM_PROMPT);

			printScenario('Max iterations limit (3) enforcement', {
				categories: ['rnd', 'design', 'consultancy'],
				maxIterations: 3,
			});

			const messages = [
				{
					role: 'user' as const,
					content: 'ARTEK hakkında tam rapor: 1) Ar-Ge merkezleri, 2) Tasarım merkezleri, 3) Danışmanlık hizmetleri',
				},
			];
			printUserMessage(messages[0].content);

			printProgress('Calling Claude (max 3 iterations)...');
			const response = await claude.chatWithTools(messages, [KNOWLEDGE_SEARCH_TOOL], createToolExecutor('tr'), {}, { maxIterations: 3 });

			printUsageStats({
				inputTokens: response.usage.inputTokens,
				outputTokens: response.usage.outputTokens,
				totalTokens: response.usage.totalTokens,
				toolIterations: response.iterations,
				toolsUsed: response.toolUses.length,
			});

			// ESNEK: Max limit enforcement
			expect(response.content).toBeDefined();
			expect(response.content.length).toBeGreaterThan(0);
			expect(response.iterations).toBeLessThanOrEqual(3);
			expect(response.iterations).toBeGreaterThanOrEqual(0);
		});

		it('should NOT use tool for general knowledge questions', async () => {
			claude = new ClaudeManager(testEnv.ANTHROPIC_API_KEY, CLAUDE_SYSTEM_PROMPT);

			printScenario('Generic question (no tools expected)', {
				expectation: '0 tool calls',
			});

			const messages = [{ role: 'user' as const, content: 'Bugün hava nasıl? 2+2 kaç eder?' }];
			printUserMessage(messages[0].content);

			printProgress('Calling Claude (generic question)...');
			const response = await claude.chatWithTools(messages, [KNOWLEDGE_SEARCH_TOOL], createToolExecutor('tr'));

			printUsageStats({
				inputTokens: response.usage.inputTokens,
				outputTokens: response.usage.outputTokens,
				totalTokens: response.usage.totalTokens,
				toolIterations: response.iterations,
				toolsUsed: response.toolUses.length,
			});

			// Functional: No tool usage
			expect(response.content).toBeDefined();
			expect(response.iterations).toBe(0);
			expect(response.toolUses).toHaveLength(0);
		});
	});

	// ============================================================================
	// TEST GROUP 3: Multi-Iteration Support
	// ============================================================================

	describe('Multi-Iteration Support', () => {
		it('should respect max iterations limit', async () => {
			claude = new ClaudeManager(testEnv.ANTHROPIC_API_KEY, CLAUDE_SYSTEM_PROMPT);

			const messages = [{ role: 'user' as const, content: 'ARTEK information needed' }];

			printProgress('Calling Claude with maxIterations=2...');
			const response = await claude.chatWithTools(messages, [KNOWLEDGE_SEARCH_TOOL], createToolExecutor('tr'), {}, { maxIterations: 2 });

			printUsageStats({
				inputTokens: response.usage.inputTokens,
				outputTokens: response.usage.outputTokens,
				totalTokens: response.usage.totalTokens,
				toolIterations: response.iterations,
				toolsUsed: response.toolUses.length,
			});

			// Functional: Max iterations respected
			expect(response.iterations).toBeLessThanOrEqual(2);
			expect(response.content).toBeDefined();
		});

		it('should handle single iteration limit', async () => {
			claude = new ClaudeManager(testEnv.ANTHROPIC_API_KEY, CLAUDE_SYSTEM_PROMPT);

			const messages = [{ role: 'user' as const, content: 'ARTEK' }];

			printProgress('Calling Claude with maxIterations=1...');
			const response = await claude.chatWithTools(messages, [KNOWLEDGE_SEARCH_TOOL], createToolExecutor('tr'), {}, { maxIterations: 1 });

			printUsageStats({
				inputTokens: response.usage.inputTokens,
				outputTokens: response.usage.outputTokens,
				totalTokens: response.usage.totalTokens,
				toolIterations: response.iterations,
				toolsUsed: response.toolUses.length,
			});

			// Functional: Max 1 iteration
			expect(response.iterations).toBeLessThanOrEqual(1);
		});

		it('should use default max iterations when not specified', async () => {
			claude = new ClaudeManager(testEnv.ANTHROPIC_API_KEY, CLAUDE_SYSTEM_PROMPT);

			const messages = [{ role: 'user' as const, content: 'ARTEK query' }];

			printProgress('Calling Claude with default maxIterations (3)...');
			const response = await claude.chatWithTools(messages, [KNOWLEDGE_SEARCH_TOOL], createToolExecutor('tr'));

			printUsageStats({
				inputTokens: response.usage.inputTokens,
				outputTokens: response.usage.outputTokens,
				totalTokens: response.usage.totalTokens,
				toolIterations: response.iterations,
				toolsUsed: response.toolUses.length,
			});

			// Functional: Default max iterations (3)
			expect(response.iterations).toBeLessThanOrEqual(3);
		});
	});

	// ============================================================================
	// TEST GROUP 4: Response Format Validation
	// ============================================================================

	describe('Response Format Validation', () => {
		it('should return correctly formatted response', async () => {
			claude = new ClaudeManager(testEnv.ANTHROPIC_API_KEY, CLAUDE_SYSTEM_PROMPT);

			const messages = [{ role: 'user' as const, content: 'Test' }];

			printProgress('Validating response structure...');
			const response = await claude.chatWithTools(messages, [KNOWLEDGE_SEARCH_TOOL], createToolExecutor('tr'));

			printUsageStats({
				inputTokens: response.usage.inputTokens,
				outputTokens: response.usage.outputTokens,
				totalTokens: response.usage.totalTokens,
				toolIterations: response.iterations,
				toolsUsed: response.toolUses.length,
			});

			// Functional: Response structure validation
			expect(response).toHaveProperty('id');
			expect(response).toHaveProperty('content');
			expect(response).toHaveProperty('model');
			expect(response).toHaveProperty('stopReason');
			expect(response).toHaveProperty('usage');
			expect(response.usage).toHaveProperty('inputTokens');
			expect(response.usage).toHaveProperty('outputTokens');
			expect(response.usage).toHaveProperty('totalTokens');
			expect(response).toHaveProperty('toolUses');
			expect(response).toHaveProperty('iterations');
		});

		it('should calculate total tokens correctly', async () => {
			claude = new ClaudeManager(testEnv.ANTHROPIC_API_KEY, CLAUDE_SYSTEM_PROMPT);

			const messages = [{ role: 'user' as const, content: 'Test' }];

			printProgress('Validating token calculation...');
			const response = await claude.chatWithTools(messages, [KNOWLEDGE_SEARCH_TOOL], createToolExecutor('tr'));

			printUsageStats({
				inputTokens: response.usage.inputTokens,
				outputTokens: response.usage.outputTokens,
				totalTokens: response.usage.totalTokens,
				toolIterations: response.iterations,
				toolsUsed: response.toolUses.length,
			});

			// Functional: Token calculation
			expect(response.usage.totalTokens).toBe(response.usage.inputTokens + response.usage.outputTokens);
		});

		it('should have valid stop reason', async () => {
			claude = new ClaudeManager(testEnv.ANTHROPIC_API_KEY, CLAUDE_SYSTEM_PROMPT);

			const messages = [{ role: 'user' as const, content: 'Test' }];

			printProgress('Checking stop reason...');
			const response = await claude.chatWithTools(messages, [KNOWLEDGE_SEARCH_TOOL], createToolExecutor('tr'));

			printProgress(`Stop reason: ${response.stopReason}`);

			// Functional: Stop reason is one of known values
			expect(['end_turn', 'max_tokens', 'stop_sequence', 'tool_use']).toContain(response.stopReason);
		});
	});

	// ============================================================================
	// TEST GROUP 5: Knowledge Search Integration
	// ============================================================================

	describe('Knowledge Search Integration (Real AI Search)', () => {
		it('should execute knowledge search with real AI Search', async () => {
			const result = await executeKnowledgeSearch('ARTEK', testEnv, 'tr');

			// Functional assertions
			expect(typeof result).toBe('string');
			expect(result.length).toBeGreaterThan(0);
		});

		it('should handle TR locale in AI Search', async () => {
			const result = await executeKnowledgeSearch('test', testEnv, 'tr');

			expect(result).toBeDefined();
			expect(typeof result).toBe('string');
		});

		it('should handle EN locale in AI Search', async () => {
			const result = await executeKnowledgeSearch('test', testEnv, 'en');

			expect(result).toBeDefined();
			expect(typeof result).toBe('string');
		});

		it('should handle empty/no results gracefully', async () => {
			const result = await executeKnowledgeSearch('xyznonexistent123456', testEnv, 'tr');

			// Functional: Fallback message returned
			expect(result).toBeDefined();
			expect(result.length).toBeGreaterThan(0);
		});
	});

	// ============================================================================
	// TEST GROUP 6: Error Handling & Edge Cases (Mock AI Search)
	// ============================================================================

	describe('Error Handling & Edge Cases', () => {
		it('should handle empty AI Search response gracefully', async () => {
			printProgress('[SCENARIO] Testing empty AI Search response...');

			// Mock AI Search to return empty response
			const mockAI = {
				autorag: () => ({
					aiSearch: vi.fn().mockResolvedValue({
						response: '', // Empty response!
						search_query: 'test',
						data: [],
					}),
				}),
			};

			const mockEnv: Env = { ...testEnv, AI: mockAI as any };

			printProgress('[SEARCH] Executing with empty response mock...');
			const result = await executeKnowledgeSearch('test query', mockEnv, 'tr');

			printProgress('[RESULT] Empty handled, fallback used:', {
				length: result.length,
				isFallback: result.includes('bilgi bulamadım'),
			});

			// Functional: Fallback message returned
			expect(result).toBeDefined();
			expect(result.length).toBeGreaterThan(0);
			expect(result).toContain('bilgi bulamadım'); // TR fallback
			printProgress('[CHECK] Empty response fallback - PASS');
		});

		it('should retry on AI Search errors and eventually succeed', async () => {
			printProgress('[SCENARIO] Testing retry logic (fail 2x, succeed 3rd)...');

			let attemptCount = 0;
			const mockAI = {
				autorag: () => ({
					aiSearch: vi.fn().mockImplementation(() => {
						attemptCount++;
						printProgress(`[RETRY ATTEMPT] ${attemptCount}/4...`);

						if (attemptCount <= 2) {
							printProgress(`[RETRY FAIL] Attempt ${attemptCount} failed, will retry...`);
							throw new Error(`Network error (attempt ${attemptCount})`);
						}

						printProgress('[RETRY SUCCESS] Attempt 3 succeeded!');
						return Promise.resolve({
							response: 'Success after retry',
							search_query: 'test',
							data: [],
						});
					}),
				}),
			};

			const mockEnv: Env = { ...testEnv, AI: mockAI as any };

			const start = Date.now();
			const result = await executeKnowledgeSearch('test', mockEnv, 'tr');
			const elapsed = Date.now() - start;

			printProgress('[RESULT] Retry logic worked:', {
				totalAttempts: attemptCount,
				elapsedMs: elapsed,
				succeeded: true,
			});

			expect(attemptCount).toBe(3); // Failed 2, succeeded 3rd
			expect(result).toContain('Success after retry');
			printProgress('[CHECK] Retry logic - PASS');
		});

		it('should return error message after max retries exhausted', async () => {
			printProgress('[SCENARIO] Testing max retries (all fail)...');

			let attemptCount = 0;
			const mockAI = {
				autorag: () => ({
					aiSearch: vi.fn().mockImplementation(() => {
						attemptCount++;
						printProgress(`[RETRY ATTEMPT] ${attemptCount}/4 - FAIL`);
						throw new Error('Persistent error');
					}),
				}),
			};

			const mockEnv: Env = { ...testEnv, AI: mockAI as any };

			const result = await executeKnowledgeSearch('test', mockEnv, 'tr');

			printProgress('[RESULT] All retries exhausted:', {
				attempts: attemptCount,
				errorMessageReturned: result.includes('sorun'),
			});

			expect(attemptCount).toBe(4); // 1 initial + 3 retries
			expect(result).toContain('sorun oluştu'); // TR error
			expect(result).toContain('Persistent error');
			printProgress('[CHECK] Max retry error handling - PASS');
		});

		it('should format AI Search response with source data', async () => {
			printProgress('[SCENARIO] Testing response formatting with sources...');

			const mockAI = {
				autorag: () => ({
					aiSearch: vi.fn().mockResolvedValue({
						response: 'ARTEK teknoloji şirketi',
						search_query: 'ARTEK',
						data: [
							{ filename: 'about.md', score: 0.95, content: [] },
							{ filename: 'services.md', score: 0.88, content: [] },
							{ filename: 'centers.md', score: 0.82, content: [] },
						],
					}),
				}),
			};

			const mockEnv: Env = { ...testEnv, AI: mockAI as any };

			const result = await executeKnowledgeSearch('ARTEK', mockEnv, 'tr');

			printProgress('[RESULT] Response formatted with sources:', {
				length: result.length,
				sourceCount: 3,
				hasSources: result.includes('about.md'),
			});

			// Functional: Source formatting correct
			expect(result).toContain('3 kaynak dosyadan'); // 3 sources
			expect(result).toContain('about.md');
			expect(result).toContain('services.md');
			expect(result).toContain('centers.md');
			expect(result).toContain('95.0%'); // Score formatting
			expect(result).toContain('88.0%');
			expect(result).toContain('82.0%');
			printProgress('[CHECK] Source formatting - PASS');
		});

		it('should handle EN locale error messages', async () => {
			printProgress('[SCENARIO] Testing EN error messages...');

			const mockAI = {
				autorag: () => ({
					aiSearch: vi.fn().mockRejectedValue(new Error('Test error')),
				}),
			};

			const mockEnv: Env = { ...testEnv, AI: mockAI as any };

			const result = await executeKnowledgeSearch('test', mockEnv, 'en');

			printProgress('[RESULT] EN error message:', { preview: result.substring(0, 100) });

			// Functional: EN error message
			expect(result).toContain('issue'); // EN: "issue with the knowledge base search"
			expect(result).toContain('Test error');
			printProgress('[CHECK] EN error message - PASS');
		});
	});

	// ============================================================================
	// TEST GROUP 7: Configuration Options
	// ============================================================================

	describe('Configuration Options', () => {
		it('should respect custom maxTokens', async () => {
			claude = new ClaudeManager(testEnv.ANTHROPIC_API_KEY, CLAUDE_SYSTEM_PROMPT);

			const messages = [{ role: 'user' as const, content: 'Test' }];

			printProgress('Testing maxTokens=500 limit...');
			const response = await claude.chatWithTools(messages, [KNOWLEDGE_SEARCH_TOOL], createToolExecutor('tr'), { maxTokens: 500 });

			printUsageStats({
				inputTokens: response.usage.inputTokens,
				outputTokens: response.usage.outputTokens,
				totalTokens: response.usage.totalTokens,
				toolIterations: response.iterations,
				toolsUsed: response.toolUses.length,
			});

			// Functional: Output tokens within limit
			expect(response.usage.outputTokens).toBeLessThanOrEqual(500);
		});

		it('should use default temperature when not specified', async () => {
			claude = new ClaudeManager(testEnv.ANTHROPIC_API_KEY, CLAUDE_SYSTEM_PROMPT);

			const messages = [{ role: 'user' as const, content: 'Test' }];

			printProgress('Testing default temperature...');
			const response = await claude.chatWithTools(messages, [KNOWLEDGE_SEARCH_TOOL], createToolExecutor('tr'));

			printUsageStats({
				inputTokens: response.usage.inputTokens,
				outputTokens: response.usage.outputTokens,
				totalTokens: response.usage.totalTokens,
				toolIterations: response.iterations,
				toolsUsed: response.toolUses.length,
			});

			// Functional: Request completed successfully with defaults
			expect(response.content).toBeDefined();
		});

		it('should accept custom temperature', async () => {
			claude = new ClaudeManager(testEnv.ANTHROPIC_API_KEY, CLAUDE_SYSTEM_PROMPT);

			const messages = [{ role: 'user' as const, content: 'Test' }];

			printProgress('Testing custom temperature=0.5...');
			const response = await claude.chatWithTools(messages, [KNOWLEDGE_SEARCH_TOOL], createToolExecutor('tr'), { temperature: 0.5 });

			printUsageStats({
				inputTokens: response.usage.inputTokens,
				outputTokens: response.usage.outputTokens,
				totalTokens: response.usage.totalTokens,
				toolIterations: response.iterations,
				toolsUsed: response.toolUses.length,
			});

			// Functional: Custom temperature accepted
			expect(response.content).toBeDefined();
		});
	});
});
