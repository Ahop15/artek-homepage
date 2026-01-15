/**
 * Test Logger Utilities
 *
 * Beautiful, chat-like test output formatting for AI integration tests.
 * Provides reusable print functions for consistent, readable test logs.
 * Uses 'boxen' for professional terminal boxes.
 *
 * @example
 * ```
 * ================================================================================
 * TEST: should complete chat request with real Claude API
 * Started: 12:34:56
 * ================================================================================
 *
 * ╭─ USER MESSAGE ────────────────────────────────────────────────────────────╮
 * │ Hello, introduce yourself briefly                                         │
 * ╰───────────────────────────────────────────────────────────────────────────╯
 *
 * ┌── CLAUDE API CALL ─────────────────────────────────────────────────────────┐
 * │ Model: claude-sonnet-4-20250514                                            │
 * │ Tools: knowledge_search                                                    │
 * │ Max Iterations: 3                                                          │
 * │                                                                            │
 * │ → Calling Claude API...                                                    │
 * └────────────────────────────────────────────────────────────────────────────┘
 *
 * [12:34:59] Calling Claude API...
 *
 * ┌── TOOL USAGE ──────────────────────────────────────────────────────────────┐
 * │ [1] knowledge_search (tool_0)                                              │
 * │     Query: "ARTEK information"                                             │
 * │     Duration: 2300ms (2.30s)                                               │
 * │     Result: 450 characters                                                 │
 * │     Preview: "ARTEK is a technology company..."                            │
 * └────────────────────────────────────────────────────────────────────────────┘
 *
 * ┌── CLAUDE RESPONSE ─────────────────────────────────────────────────────────┐
 * │ Duration: 5000ms (5.00s)                                                   │
 * │ ID: msg_abc123                                                             │
 * │ Model: claude-sonnet-4-20250514                                            │
 * │ Stop Reason: end_turn                                                      │
 * │                                                                            │
 * │ Content:                                                                   │
 * │   "Hello! I'm Claude, an AI assistant..."                                  │
 * │                                                                            │
 * │ Length: 350 characters                                                     │
 * └────────────────────────────────────────────────────────────────────────────┘
 *
 * ┌── USAGE STATS ─────────────────────────────────────────────────────────────┐
 * │ Input Tokens:        120                                                   │
 * │ Output Tokens:        85                                                   │
 * │ Total Tokens:        205                                                   │
 * │ Cost Estimate:   $0.000615                                                 │
 * │                                                                            │
 * │ Tool Iterations: 1                                                         │
 * │ Tools Used:      1                                                         │
 * └────────────────────────────────────────────────────────────────────────────┘
 *
 * ┌── VALIDATION ──────────────────────────────────────────────────────────────┐
 * │ ✓ Response defined                                                         │
 * │ ✓ Content format valid                                                     │
 * │ ✓ Claude ID format (msg_...)                                               │
 * │ ✓ Model name contains claude                                               │
 * │ ✓ Stop reason defined                                                      │
 * │ ✓ Token usage > 0                                                          │
 * │ ✓ Tool tracking structure                                                  │
 * └────────────────────────────────────────────────────────────────────────────┘
 *
 * PASS ✓ (5032ms / 5.03s)
 * ================================================================================
 * ```
 */

// ============================================================================
// FORMATTING UTILITIES
// ============================================================================

function timestamp(): string {
	return new Date().toISOString().split('T')[1].split('.')[0];
}

/**
 * Wrap text to fit within max width (word wrap, no mid-word breaks)
 */
function wrapText(text: string, maxWidth: number): string[] {
	const words = text.split(' ');
	const lines: string[] = [];
	let currentLine = '';

	words.forEach((word) => {
		// If adding this word exceeds max width
		if (currentLine && (currentLine + ' ' + word).length > maxWidth) {
			lines.push(currentLine);
			currentLine = word;
		} else {
			currentLine = currentLine ? currentLine + ' ' + word : word;
		}
	});

	if (currentLine) {
		lines.push(currentLine);
	}

	return lines.length > 0 ? lines : [''];
}

/**
 * Print a beautiful box with rounded corners (ASCII art)
 * Similar to Python Rich / boxen style
 * Automatically wraps long lines to fit within box width
 */
function box(title: string, content: string[], width: number = 80): void {
	const titlePadded = ` ${title} `;
	const titleLen = titlePadded.length;
	const leftDash = '─'.repeat(Math.floor((width - titleLen - 4) / 2));
	const rightDash = '─'.repeat(Math.ceil((width - titleLen - 4) / 2));

	// Top border with title
	console.log(`╭─${leftDash}${titlePadded}${rightDash}─╮`);

	// Content lines (wrap long lines)
	const maxContentWidth = width - 4; // 4 = border + padding

	content.forEach((line) => {
		if (line.length > maxContentWidth) {
			// Wrap long line
			const wrapped = wrapText(line, maxContentWidth);
			wrapped.forEach((wrappedLine) => {
				const padded = wrappedLine.padEnd(maxContentWidth);
				console.log(`│ ${padded} │`);
			});
		} else {
			// Normal line
			const padded = line.padEnd(maxContentWidth);
			console.log(`│ ${padded} │`);
		}
	});

	// Bottom border
	console.log(`╰${'─'.repeat(width - 2)}╯`);
}

function separator(char: string = '=', width: number = 80): void {
	console.log(char.repeat(width));
}

// ============================================================================
// TEST LIFECYCLE
// ============================================================================

export function printTestHeader(testName: string): void {
	console.log('\n');
	separator('=');
	console.log(`TEST: ${testName}`);
	console.log(`Started: ${timestamp()}`);
	separator('=');
	console.log('');
}

export function printTestFooter(durationMs: number, status: 'PASS' | 'FAIL' = 'PASS'): void {
	console.log('');
	const statusSymbol = status === 'PASS' ? '✓' : '✗';
	const durationSec = (durationMs / 1000).toFixed(2);
	console.log(`${status} ${statusSymbol} (${durationMs}ms / ${durationSec}s)`);
	separator('=');
	console.log('');
}

// ============================================================================
// MESSAGE FORMATTING
// ============================================================================

export function printUserMessage(content: string): void {
	box('USER MESSAGE', [content], 80);
	console.log('');
}

// ============================================================================
// API CALL FORMATTING
// ============================================================================

export interface ApiCallConfig {
	model: string;
	tools: string[];
	maxIterations: number;
	maxTokens?: number;
	temperature?: number;
}

export function printApiCall(config: ApiCallConfig): void {
	const lines = [`Model: ${config.model}`, `Tools: ${config.tools.join(', ')}`, `Max Iterations: ${config.maxIterations}`];

	if (config.maxTokens) {
		lines.push(`Max Tokens: ${config.maxTokens}`);
	}

	if (config.temperature !== undefined) {
		lines.push(`Temperature: ${config.temperature}`);
	}

	lines.push('');
	lines.push('→ Calling Claude API...');

	box('CLAUDE API CALL', lines, 80);
	console.log('');
}

// ============================================================================
// TOOL USAGE FORMATTING
// ============================================================================

export interface ToolUsageInfo {
	tool: string;
	id: string;
	query?: string;
	durationMs?: number;
	resultLength?: number;
	preview?: string;
}

export function printToolUsage(tools: ToolUsageInfo[]): void {
	if (tools.length === 0) {
		console.log('  [INFO] No tools used');
		console.log('');
		return;
	}

	const lines: string[] = [];

	tools.forEach((tool, index) => {
		lines.push(`[${index + 1}] ${tool.tool} (${tool.id})`);

		if (tool.query) {
			lines.push(`    Query: "${tool.query}"`);
		}

		if (tool.durationMs) {
			lines.push(`    Duration: ${tool.durationMs}ms (${(tool.durationMs / 1000).toFixed(2)}s)`);
		}

		if (tool.resultLength) {
			lines.push(`    Result: ${tool.resultLength} characters`);
		}

		if (tool.preview) {
			lines.push(`    Preview: "${tool.preview}"`);
		}

		if (index < tools.length - 1) {
			lines.push('');
		}
	});

	box('TOOL USAGE', lines, 80);
	console.log('');
}

// ============================================================================
// RESPONSE FORMATTING
// ============================================================================

export interface ClaudeResponseInfo {
	id: string;
	content: string;
	durationMs: number;
	model: string;
	stopReason: string;
}

export function printClaudeResponse(response: ClaudeResponseInfo): void {
	const preview = response.content.length > 200 ? response.content.substring(0, 200) + '...' : response.content;

	const lines = [
		`Duration: ${response.durationMs}ms (${(response.durationMs / 1000).toFixed(2)}s)`,
		`ID: ${response.id}`,
		`Model: ${response.model}`,
		`Stop Reason: ${response.stopReason}`,
		'',
		'Content:',
		`  "${preview}"`,
		'',
		`Length: ${response.content.length} characters`,
	];

	box('CLAUDE RESPONSE', lines, 80);
	console.log('');
}

// ============================================================================
// USAGE STATS FORMATTING
// ============================================================================

export interface UsageStats {
	inputTokens: number;
	outputTokens: number;
	totalTokens: number;
	toolIterations: number;
	toolsUsed: number;
}

export function printUsageStats(stats: UsageStats): void {
	const costEstimate = (stats.totalTokens * 0.000003).toFixed(6);

	const lines = [
		`Input Tokens:    ${stats.inputTokens.toString().padStart(6)}`,
		`Output Tokens:   ${stats.outputTokens.toString().padStart(6)}`,
		`Total Tokens:    ${stats.totalTokens.toString().padStart(6)}`,
		`Cost Estimate:   $${costEstimate}`,
		'',
		`Tool Iterations: ${stats.toolIterations}`,
		`Tools Used:      ${stats.toolsUsed}`,
	];

	box('USAGE STATS', lines, 80);
	console.log('');
}

// ============================================================================
// VALIDATION FORMATTING
// ============================================================================

export function printValidation(checks: Array<{ name: string; passed: boolean }>): void {
	const lines = checks.map((check) => {
		const symbol = check.passed ? '✓' : '✗';
		return `${symbol} ${check.name}`;
	});

	box('VALIDATION', lines, 80);
	console.log('');
}

// ============================================================================
// PROGRESS MESSAGES
// ============================================================================

export function printProgress(message: string, data?: any): void {
	const ts = timestamp();
	if (data) {
		console.log(`[${ts}] ${message}`);
		console.log(`       ${JSON.stringify(data, null, 2).split('\n').join('\n       ')}`);
	} else {
		console.log(`[${ts}] ${message}`);
	}
}

// ============================================================================
// SCENARIO MARKERS
// ============================================================================

export function printScenario(description: string, details?: any): void {
	console.log('');
	console.log(`┌─ SCENARIO ${'─'.repeat(67)}┐`);
	console.log(`│ ${description.padEnd(76)} │`);

	if (details) {
		Object.entries(details).forEach(([key, value]) => {
			const line = `  ${key}: ${JSON.stringify(value)}`;
			console.log(`│ ${line.padEnd(76)} │`);
		});
	}

	console.log(`└${'─'.repeat(78)}┘`);
	console.log('');
}
