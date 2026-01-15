/**
 * Rate Limiting Middleware
 * KV-based rate limiting for API protection
 */

import type { Env, RateLimitResult } from '../types';
import { CONFIG } from '../config';
import { logInfo } from '../utils/logging';

/**
 * Extract client IP from Cloudflare headers
 */
function getClientIP(request: Request): string {
	return request.headers.get('CF-Connecting-IP') || 'unknown';
}

/**
 * Check rate limit for a specific time window
 */
async function checkWindow(
	kv: KVNamespace,
	key: string,
	limit: number,
	ttl: number
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
	const value = await kv.get(key);
	const count = value ? parseInt(value) : 0;
	const now = Date.now();

	if (count >= limit) {
		return {
			allowed: false,
			remaining: 0,
			resetAt: now + ttl * 1000,
		};
	}

	// Increment counter
	await kv.put(key, String(count + 1), {
		expirationTtl: ttl,
	});

	return {
		allowed: true,
		remaining: limit - count - 1,
		resetAt: now + ttl * 1000,
	};
}

/**
 * Check per-minute rate limit
 */
export async function checkMinuteRateLimit(
	request: Request,
	env: Env
): Promise<RateLimitResult> {
	// Skip rate limiting in development
	if (env.ENVIRONMENT === 'development') {
		return {
			allowed: true,
			remaining: CONFIG.rateLimit.requestsPerMinute,
			resetAt: Date.now() + 60000,
		};
	}

	const ip = getClientIP(request);
	const key = `ratelimit:minute:${ip}`;

	const result = await checkWindow(
		env.AI_WORKER_KV,
		key,
		CONFIG.rateLimit.requestsPerMinute,
		60 // 1 minute
	);

	return {
		...result,
		retryAfter: result.allowed ? undefined : Math.ceil((result.resetAt - Date.now()) / 1000),
	};
}

/**
 * Check per-hour rate limit
 */
export async function checkHourRateLimit(request: Request, env: Env): Promise<RateLimitResult> {
	// Skip rate limiting in development
	if (env.ENVIRONMENT === 'development') {
		return {
			allowed: true,
			remaining: CONFIG.rateLimit.requestsPerHour,
			resetAt: Date.now() + 3600000,
		};
	}

	const ip = getClientIP(request);
	const key = `ratelimit:hour:${ip}`;

	const result = await checkWindow(
		env.AI_WORKER_KV,
		key,
		CONFIG.rateLimit.requestsPerHour,
		3600 // 1 hour
	);

	return {
		...result,
		retryAfter: result.allowed ? undefined : Math.ceil((result.resetAt - Date.now()) / 1000),
	};
}

/**
 * Check per-day rate limit
 */
export async function checkDayRateLimit(request: Request, env: Env): Promise<RateLimitResult> {
	// Skip rate limiting in development
	if (env.ENVIRONMENT === 'development') {
		return {
			allowed: true,
			remaining: CONFIG.rateLimit.requestsPerDay,
			resetAt: Date.now() + 86400000,
		};
	}

	const ip = getClientIP(request);
	const key = `ratelimit:day:${ip}`;

	const result = await checkWindow(
		env.AI_WORKER_KV,
		key,
		CONFIG.rateLimit.requestsPerDay,
		86400 // 1 day
	);

	return {
		...result,
		retryAfter: result.allowed ? undefined : Math.ceil((result.resetAt - Date.now()) / 1000),
	};
}

/**
 * Check all rate limits (minute, hour, day)
 * Returns first limit that is exceeded
 */
export async function checkRateLimits(request: Request, env: Env): Promise<RateLimitResult> {
	// Check minute limit
	const minuteResult = await checkMinuteRateLimit(request, env);
	if (!minuteResult.allowed) {
		return minuteResult;
	}

	// Check hour limit
	const hourResult = await checkHourRateLimit(request, env);
	if (!hourResult.allowed) {
		return hourResult;
	}

	// Check day limit
	const dayResult = await checkDayRateLimit(request, env);
	if (!dayResult.allowed) {
		return dayResult;
	}

	// All checks passed, return minute result (most restrictive remaining)
	return minuteResult;
}

/**
 * Check daily token consumption limit
 * Returns true if within limit, false if exceeded
 */
export async function checkTokenLimit(env: Env): Promise<boolean> {
	// Skip in development
	if (env.ENVIRONMENT === 'development') {
		return true;
	}

	const key = 'tokens:daily:total';
	const value = await env.AI_WORKER_KV.get(key);
	const totalTokens = value ? parseInt(value) : 0;

	return totalTokens < CONFIG.rateLimit.tokensPerDay;
}

/**
 * Increment daily token counter
 * Call this after successful AI completion
 */
export async function incrementTokenCount(env: Env, tokens: number): Promise<void> {
	// Skip in development
	if (env.ENVIRONMENT === 'development') {
		return;
	}

	const key = 'tokens:daily:total';
	const value = await env.AI_WORKER_KV.get(key);
	const currentTokens = value ? parseInt(value) : 0;
	const newTotal = currentTokens + tokens;

	// Set with 24-hour expiration
	await env.AI_WORKER_KV.put(key, String(newTotal), {
		expirationTtl: 86400, // 1 day
	});

	logInfo(
		'[AI-WORKER] Token usage',
		{
			current: newTotal,
			limit: CONFIG.rateLimit.tokensPerDay,
			remaining: CONFIG.rateLimit.tokensPerDay - newTotal,
		},
		env,
	);
}