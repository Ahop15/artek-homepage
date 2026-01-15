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
 * ARTEK AI Worker - Type Definitions
 */

import type { D1Database } from '@cloudflare/workers-types';

// ========================================
// Cloudflare Workers Environment
// ========================================

export interface Env {
	ANTHROPIC_API_KEY: string;
	AISEARCH_NAME: string; // AI Search / AutoRAG index name
	ENVIRONMENT?: string; // 'production' | 'development'
	AI_WORKER_KV: KVNamespace; // KV namespace for rate limiting
	AI: Ai; // Cloudflare Workers AI binding for AutoRAG/AI Search
	AI_LOGS_DB: D1Database; // D1 database for conversation logging
	TURNSTILE_SECRET_KEY: string; // Cloudflare Turnstile secret key
}

// ========================================
// Request/Response Types
// ========================================

/**
 * Chat request from client
 */
export interface ChatRequest {
	messages: Array<{
		role: 'user' | 'assistant';
		content: string;
	}>;
	stream?: boolean;
	max_tokens?: number;
	temperature?: number;
	locale?: string; // 'tr' | 'en', defaults to 'tr'
	turnstileToken: string; // Cloudflare Turnstile token
}

// ========================================
// Claude Response Types
// ========================================

/**
 * Native Claude response format
 */
export interface ClaudeResponse {
	id: string;
	type: 'message';
	role: 'assistant';
	content: string;
	model: string;
	stop_reason: string | null; // Claude stop reasons
	usage: {
		input_tokens: number;
		output_tokens: number;
		total_tokens: number;
	};
	metadata: {
		duration_ms: number;
		timestamp: number;
	};
}

// ========================================
// Error Types
// ========================================

export interface ErrorResponse {
	error: {
		type: string;
		message: string;
		details?: unknown;
	};
	status: number;
	retryAfter?: number;
}

export interface ValidationError {
	field: string;
	message: string;
	value?: unknown;
}

// ========================================
// Rate Limiting Types
// ========================================

export interface RateLimitResult {
	allowed: boolean;
	remaining: number;
	resetAt: number;
	retryAfter?: number;
}

// ========================================
// AI Search Types
// ========================================

/**
 * AI Search response format
 */
export interface AISearchResult {
	object: string;
	search_query: string;
	response: string;
	data: Array<{
		file_id: string;
		filename: string;
		score: number;
		content: Array<{
			type: string;
			text: string;
		}>;
	}>;
}

// ========================================
// Turnstile Types
// ========================================

/**
 * Cloudflare Turnstile verification response
 */
export interface TurnstileResponse {
	success: boolean;
	'error-codes'?: string[];
	challenge_ts?: string;
	hostname?: string;
}
