/// <reference types="@cloudflare/vitest-pool-workers" />

/**
 * ARTEK AI Worker - Rate Limiting Middleware Integration Tests
 *
 * Tests KV-based rate limiting using REAL KV namespace (Miniflare).
 *
 * Test Philosophy:
 * - Use REAL KV (Miniflare)
 * - Test actual rate limit logic
 * - No mocks for KV operations
 * - Verify TTL expiration behavior
 *
 * Coverage:
 * 1. Minute rate limit (5 requests/minute)
 * 2. Hour rate limit (50 requests/hour)
 * 3. Day rate limit (200 requests/day)
 * 4. Combined rate limits (checkRateLimits)
 * 5. Token quota tracking
 * 6. Development mode bypass
 * 7. Edge cases
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import type { Env } from '../../types';
import {
	checkMinuteRateLimit,
	checkHourRateLimit,
	checkDayRateLimit,
	checkRateLimits,
	checkTokenLimit,
	incrementTokenCount,
} from '../../middleware/ratelimit';
import { CONFIG } from '../../config';

// Type-safe access to test environment bindings
const testEnv = env as unknown as Env;

/**
 * Create a mock Request with CF-Connecting-IP header
 */
function createMockRequest(ip: string = '1.2.3.4'): Request {
	return new Request('http://localhost/', {
		method: 'POST',
		headers: {
			'CF-Connecting-IP': ip,
		},
	});
}

/**
 * Clean all rate limit keys from KV
 */
async function cleanRateLimitKV(): Promise<void> {
	const kv = testEnv.AI_WORKER_KV;

	// List all keys (miniflare supports this)
	const keys = await kv.list();

	// Delete all keys
	for (const key of keys.keys) {
		await kv.delete(key.name);
	}
}

/**
 * Create production-like environment (not development)
 */
function createProductionEnv(): Env {
	return {
		...testEnv,
		ENVIRONMENT: 'production',
	};
}

/**
 * Create development environment
 */
function createDevelopmentEnv(): Env {
	return {
		...testEnv,
		ENVIRONMENT: 'development',
	};
}

describe('Rate Limiting Middleware - Integration Tests', () => {
	beforeEach(async () => {
		// Clean KV for test isolation
		await cleanRateLimitKV();
	});

	// ============================================================================
	// TEST GROUP 1: Minute Rate Limit
	// ============================================================================

	describe('Minute Rate Limit', () => {
		it('should allow first request', async () => {
			const request = createMockRequest('192.168.1.1');
			const productionEnv = createProductionEnv();

			const result = await checkMinuteRateLimit(request, productionEnv);

			expect(result.allowed).toBe(true);
			expect(result.remaining).toBe(CONFIG.rateLimit.requestsPerMinute - 1);
			expect(result.retryAfter).toBeUndefined();
		});

		it('should decrement remaining count on each request', async () => {
			const request = createMockRequest('192.168.1.2');
			const productionEnv = createProductionEnv();

			// First request
			const result1 = await checkMinuteRateLimit(request, productionEnv);
			expect(result1.remaining).toBe(4); // 5 - 1

			// Second request
			const result2 = await checkMinuteRateLimit(request, productionEnv);
			expect(result2.remaining).toBe(3); // 5 - 2

			// Third request
			const result3 = await checkMinuteRateLimit(request, productionEnv);
			expect(result3.remaining).toBe(2); // 5 - 3
		});

		it('should block request when limit exceeded', async () => {
			const request = createMockRequest('192.168.1.3');
			const productionEnv = createProductionEnv();

			// Exhaust limit (5 requests)
			for (let i = 0; i < CONFIG.rateLimit.requestsPerMinute; i++) {
				const result = await checkMinuteRateLimit(request, productionEnv);
				expect(result.allowed).toBe(true);
			}

			// 6th request should be blocked
			const blockedResult = await checkMinuteRateLimit(request, productionEnv);

			expect(blockedResult.allowed).toBe(false);
			expect(blockedResult.remaining).toBe(0);
			expect(blockedResult.retryAfter).toBeGreaterThan(0);
			expect(blockedResult.retryAfter).toBeLessThanOrEqual(60); // Max 60 seconds
		});

		it('should track different IPs separately', async () => {
			const request1 = createMockRequest('10.0.0.1');
			const request2 = createMockRequest('10.0.0.2');
			const productionEnv = createProductionEnv();

			// Exhaust IP1
			for (let i = 0; i < CONFIG.rateLimit.requestsPerMinute; i++) {
				await checkMinuteRateLimit(request1, productionEnv);
			}

			// IP1 blocked
			const ip1Result = await checkMinuteRateLimit(request1, productionEnv);
			expect(ip1Result.allowed).toBe(false);

			// IP2 still allowed
			const ip2Result = await checkMinuteRateLimit(request2, productionEnv);
			expect(ip2Result.allowed).toBe(true);
		});

		it('should bypass in development mode', async () => {
			const request = createMockRequest('192.168.1.4');
			const devEnv = createDevelopmentEnv();

			// Make 100 requests (way over limit)
			for (let i = 0; i < 100; i++) {
				const result = await checkMinuteRateLimit(request, devEnv);
				expect(result.allowed).toBe(true);
			}
		});
	});

	// ============================================================================
	// TEST GROUP 2: Hour Rate Limit
	// ============================================================================

	describe('Hour Rate Limit', () => {
		it('should allow first request', async () => {
			const request = createMockRequest('192.168.2.1');
			const productionEnv = createProductionEnv();

			const result = await checkHourRateLimit(request, productionEnv);

			expect(result.allowed).toBe(true);
			expect(result.remaining).toBe(CONFIG.rateLimit.requestsPerHour - 1);
			expect(result.retryAfter).toBeUndefined();
		});

		it('should track hourly requests correctly', async () => {
			const request = createMockRequest('192.168.2.2');
			const productionEnv = createProductionEnv();

			// First 10 requests
			for (let i = 0; i < 10; i++) {
				const result = await checkHourRateLimit(request, productionEnv);
				expect(result.allowed).toBe(true);
				expect(result.remaining).toBe(CONFIG.rateLimit.requestsPerHour - i - 1);
			}
		});

		it('should block when hourly limit exceeded', async () => {
			const request = createMockRequest('192.168.2.3');
			const productionEnv = createProductionEnv();

			// Exhaust limit
			for (let i = 0; i < CONFIG.rateLimit.requestsPerHour; i++) {
				await checkHourRateLimit(request, productionEnv);
			}

			// Should be blocked
			const blockedResult = await checkHourRateLimit(request, productionEnv);

			expect(blockedResult.allowed).toBe(false);
			expect(blockedResult.remaining).toBe(0);
			expect(blockedResult.retryAfter).toBeGreaterThan(0);
		});

		it('should bypass in development mode', async () => {
			const request = createMockRequest('192.168.2.4');
			const devEnv = createDevelopmentEnv();

			const result = await checkHourRateLimit(request, devEnv);

			expect(result.allowed).toBe(true);
		});
	});

	// ============================================================================
	// TEST GROUP 3: Day Rate Limit
	// ============================================================================

	describe('Day Rate Limit', () => {
		it('should allow first request', async () => {
			const request = createMockRequest('192.168.3.1');
			const productionEnv = createProductionEnv();

			const result = await checkDayRateLimit(request, productionEnv);

			expect(result.allowed).toBe(true);
			expect(result.remaining).toBe(CONFIG.rateLimit.requestsPerDay - 1);
		});

		it('should track daily requests correctly', async () => {
			const request = createMockRequest('192.168.3.2');
			const productionEnv = createProductionEnv();

			// First 20 requests
			for (let i = 0; i < 20; i++) {
				const result = await checkDayRateLimit(request, productionEnv);
				expect(result.allowed).toBe(true);
			}

			// Verify counter
			const kv = testEnv.AI_WORKER_KV;
			const count = await kv.get('ratelimit:day:192.168.3.2');
			expect(count).toBe('20');
		});

		it('should block when daily limit exceeded', async () => {
			const request = createMockRequest('192.168.3.3');
			const productionEnv = createProductionEnv();

			// Exhaust limit
			for (let i = 0; i < CONFIG.rateLimit.requestsPerDay; i++) {
				await checkDayRateLimit(request, productionEnv);
			}

			// Should be blocked
			const blockedResult = await checkDayRateLimit(request, productionEnv);

			expect(blockedResult.allowed).toBe(false);
			expect(blockedResult.remaining).toBe(0);
		});

		it('should bypass in development mode', async () => {
			const request = createMockRequest('192.168.3.4');
			const devEnv = createDevelopmentEnv();

			const result = await checkDayRateLimit(request, devEnv);

			expect(result.allowed).toBe(true);
		});
	});

	// ============================================================================
	// TEST GROUP 4: Combined Rate Limits (checkRateLimits)
	// ============================================================================

	describe('Combined Rate Limits', () => {
		it('should pass all limits on first request', async () => {
			const request = createMockRequest('192.168.4.1');
			const productionEnv = createProductionEnv();

			const result = await checkRateLimits(request, productionEnv);

			expect(result.allowed).toBe(true);
			expect(result.remaining).toBe(CONFIG.rateLimit.requestsPerMinute - 1);
		});

		it('should return minute limit error first (most restrictive)', async () => {
			const request = createMockRequest('192.168.4.2');
			const productionEnv = createProductionEnv();

			// Exhaust minute limit
			for (let i = 0; i < CONFIG.rateLimit.requestsPerMinute; i++) {
				await checkRateLimits(request, productionEnv);
			}

			// Should fail on minute limit
			const result = await checkRateLimits(request, productionEnv);

			expect(result.allowed).toBe(false);
			expect(result.retryAfter).toBeLessThanOrEqual(60); // Minute window
		});

		it('should return hour limit error when minute passes but hour fails', async () => {
			const productionEnv = createProductionEnv();
			const kv = testEnv.AI_WORKER_KV;

			// Manually exhaust hour limit (bypass minute for this IP)
			const ip = '192.168.4.5';
			await kv.put(`ratelimit:hour:${ip}`, String(CONFIG.rateLimit.requestsPerHour));

			const request = createMockRequest(ip);
			const result = await checkRateLimits(request, productionEnv);

			expect(result.allowed).toBe(false);
			expect(result.retryAfter).toBeGreaterThan(60); // Hour window > 60s
		});

		it('should return day limit error when minute and hour pass but day fails', async () => {
			const productionEnv = createProductionEnv();
			const kv = testEnv.AI_WORKER_KV;

			// Manually exhaust day limit (bypass minute and hour)
			const ip = '192.168.4.6';
			await kv.put(`ratelimit:day:${ip}`, String(CONFIG.rateLimit.requestsPerDay));

			const request = createMockRequest(ip);
			const result = await checkRateLimits(request, productionEnv);

			expect(result.allowed).toBe(false);
			expect(result.retryAfter).toBeGreaterThan(3600); // Day window > 1 hour
		});

		it('should increment all limit counters', async () => {
			const request = createMockRequest('192.168.4.3');
			const productionEnv = createProductionEnv();

			await checkRateLimits(request, productionEnv);

			// Verify all KV keys exist
			const kv = testEnv.AI_WORKER_KV;
			const minuteCount = await kv.get('ratelimit:minute:192.168.4.3');
			const hourCount = await kv.get('ratelimit:hour:192.168.4.3');
			const dayCount = await kv.get('ratelimit:day:192.168.4.3');

			expect(minuteCount).toBe('1');
			expect(hourCount).toBe('1');
			expect(dayCount).toBe('1');
		});

		it('should handle unknown IP gracefully', async () => {
			const request = new Request('http://localhost/'); // No CF-Connecting-IP header
			const productionEnv = createProductionEnv();

			const result = await checkRateLimits(request, productionEnv);

			// Should use 'unknown' as IP
			expect(result.allowed).toBe(true);

			// Verify KV key
			const kv = testEnv.AI_WORKER_KV;
			const count = await kv.get('ratelimit:minute:unknown');
			expect(count).toBe('1');
		});
	});

	// ============================================================================
	// TEST GROUP 5: Token Quota
	// ============================================================================

	describe('Token Quota', () => {
		it('should allow when below limit', async () => {
			const productionEnv = createProductionEnv();

			const allowed = await checkTokenLimit(productionEnv);

			expect(allowed).toBe(true);
		});

		it('should block when at limit', async () => {
			const productionEnv = createProductionEnv();
			const kv = testEnv.AI_WORKER_KV;

			// Set tokens to limit
			await kv.put('tokens:daily:total', String(CONFIG.rateLimit.tokensPerDay));

			const allowed = await checkTokenLimit(productionEnv);

			expect(allowed).toBe(false);
		});

		it('should block when over limit', async () => {
			const productionEnv = createProductionEnv();
			const kv = testEnv.AI_WORKER_KV;

			// Set tokens above limit
			await kv.put('tokens:daily:total', String(CONFIG.rateLimit.tokensPerDay + 1000));

			const allowed = await checkTokenLimit(productionEnv);

			expect(allowed).toBe(false);
		});

		it('should increment token count correctly', async () => {
			const productionEnv = createProductionEnv();
			const kv = testEnv.AI_WORKER_KV;

			// Start with 1000 tokens
			await kv.put('tokens:daily:total', '1000');

			// Increment by 500
			await incrementTokenCount(productionEnv, 500);

			// Should be 1500
			const newTotal = await kv.get('tokens:daily:total');
			expect(newTotal).toBe('1500');
		});

		it('should handle first token increment (no existing value)', async () => {
			const productionEnv = createProductionEnv();
			const kv = testEnv.AI_WORKER_KV;

			// Increment when no value exists
			await incrementTokenCount(productionEnv, 250);

			const total = await kv.get('tokens:daily:total');
			expect(total).toBe('250');
		});

		it('should accumulate tokens across multiple increments', async () => {
			const productionEnv = createProductionEnv();
			const kv = testEnv.AI_WORKER_KV;

			// Multiple increments
			await incrementTokenCount(productionEnv, 100);
			await incrementTokenCount(productionEnv, 200);
			await incrementTokenCount(productionEnv, 300);

			const total = await kv.get('tokens:daily:total');
			expect(total).toBe('600');
		});

		it('should bypass in development mode (checkTokenLimit)', async () => {
			const devEnv = createDevelopmentEnv();
			const kv = testEnv.AI_WORKER_KV;

			// Set tokens way over limit
			await kv.put('tokens:daily:total', String(CONFIG.rateLimit.tokensPerDay * 10));

			const allowed = await checkTokenLimit(devEnv);

			expect(allowed).toBe(true); // Still allowed in dev
		});

		it('should bypass in development mode (incrementTokenCount)', async () => {
			const devEnv = createDevelopmentEnv();
			const kv = testEnv.AI_WORKER_KV;

			// Increment in dev mode
			await incrementTokenCount(devEnv, 500);

			// Should NOT write to KV in dev
			const total = await kv.get('tokens:daily:total');
			expect(total).toBeNull();
		});
	});

	// ============================================================================
	// TEST GROUP 6: Development Mode Bypass
	// ============================================================================

	describe('Development Mode Bypass', () => {
		it('should bypass minute limit in development', async () => {
			const request = createMockRequest('192.168.5.1');
			const devEnv = createDevelopmentEnv();

			// Make 100 requests (way over limit)
			for (let i = 0; i < 100; i++) {
				const result = await checkMinuteRateLimit(request, devEnv);
				expect(result.allowed).toBe(true);
			}
		});

		it('should bypass hour limit in development', async () => {
			const request = createMockRequest('192.168.5.2');
			const devEnv = createDevelopmentEnv();

			const result = await checkHourRateLimit(request, devEnv);

			expect(result.allowed).toBe(true);
		});

		it('should bypass day limit in development', async () => {
			const request = createMockRequest('192.168.5.3');
			const devEnv = createDevelopmentEnv();

			const result = await checkDayRateLimit(request, devEnv);

			expect(result.allowed).toBe(true);
		});

		it('should bypass all limits in development (checkRateLimits)', async () => {
			const request = createMockRequest('192.168.5.4');
			const devEnv = createDevelopmentEnv();

			const result = await checkRateLimits(request, devEnv);

			expect(result.allowed).toBe(true);
		});
	});

	// ============================================================================
	// TEST GROUP 7: Edge Cases
	// ============================================================================

	describe('Edge Cases', () => {
		it('should handle missing CF-Connecting-IP header', async () => {
			const request = new Request('http://localhost/'); // No IP header
			const productionEnv = createProductionEnv();

			const result = await checkMinuteRateLimit(request, productionEnv);

			expect(result.allowed).toBe(true);

			// Should use 'unknown' as key
			const kv = testEnv.AI_WORKER_KV;
			const count = await kv.get('ratelimit:minute:unknown');
			expect(count).toBe('1');
		});

		it('should handle concurrent requests from same IP', async () => {
			const request = createMockRequest('192.168.6.1');
			const productionEnv = createProductionEnv();

			// Simulate concurrent requests
			const promises = Array.from({ length: 3 }, () => checkMinuteRateLimit(request, productionEnv));

			const results = await Promise.all(promises);

			// All should succeed (within limit)
			results.forEach((result) => {
				expect(result.allowed).toBe(true);
			});

			// Note: Due to KV race conditions, count may be less than 3
			// This is expected behavior (KV doesn't support atomic increment)
			const kv = testEnv.AI_WORKER_KV;
			const count = await kv.get('ratelimit:minute:192.168.6.1');
			expect(parseInt(count || '0')).toBeGreaterThanOrEqual(1);
			expect(parseInt(count || '0')).toBeLessThanOrEqual(3);
		});

		it('should handle zero tokens increment', async () => {
			const productionEnv = createProductionEnv();
			const kv = testEnv.AI_WORKER_KV;

			await incrementTokenCount(productionEnv, 0);

			const total = await kv.get('tokens:daily:total');
			expect(total).toBe('0');
		});

		it('should handle large token increment', async () => {
			const productionEnv = createProductionEnv();
			const kv = testEnv.AI_WORKER_KV;

			// Increment by 50000 tokens (large response)
			await incrementTokenCount(productionEnv, 50000);

			const total = await kv.get('tokens:daily:total');
			expect(total).toBe('50000');
		});
	});

	// ============================================================================
	// TEST GROUP 8: Retry-After Calculation
	// ============================================================================

	describe('Retry-After Calculation', () => {
		it('should calculate retryAfter correctly when blocked', async () => {
			const request = createMockRequest('192.168.7.1');
			const productionEnv = createProductionEnv();

			// Exhaust limit
			for (let i = 0; i < CONFIG.rateLimit.requestsPerMinute; i++) {
				await checkMinuteRateLimit(request, productionEnv);
			}

			// Get blocked result
			const blockedResult = await checkMinuteRateLimit(request, productionEnv);

			expect(blockedResult.retryAfter).toBeDefined();
			expect(blockedResult.retryAfter).toBeGreaterThan(0);
			expect(blockedResult.retryAfter).toBeLessThanOrEqual(60);
		});

		it('should not return retryAfter when allowed', async () => {
			const request = createMockRequest('192.168.7.2');
			const productionEnv = createProductionEnv();

			const result = await checkMinuteRateLimit(request, productionEnv);

			expect(result.retryAfter).toBeUndefined();
		});
	});
});