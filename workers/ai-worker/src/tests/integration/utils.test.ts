/**
 * ARTEK AI Worker - Utils Tests (errors + logging)
 *
 * Tests utility functions for error responses and logging.
 *
 * Test Philosophy:
 * - Pure function testing
 * - Verify response structure
 * - Environment-aware logging behavior
 *
 * Coverage:
 * 1. Error response builders (errors.ts)
 * 2. Logging functions (logging.ts)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	createErrorResponse,
	badRequest,
	internalServerError,
	forbidden,
	tooManyRequests,
	badGateway,
	serviceUnavailable,
	notFound,
	methodNotAllowed,
	integrityViolationError,
} from '../../utils/errors';
import { logError, logInfo, logWarn } from '../../utils/logging';
import type { Env, ErrorResponse } from '../../types';

describe('Utils Tests', () => {
	// ============================================================================
	// TEST GROUP 1: Error Response Builders
	// ============================================================================

	describe('Error Response Builders', () => {
		it('should create basic error response', async () => {
			const response = createErrorResponse('test_error', 418, 'Test message');

			expect(response.status).toBe(418);
			expect(response.headers.get('Content-Type')).toBe('application/json');
			expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');

			const body = (await response.json()) as ErrorResponse;
			expect(body.error.type).toBe('test_error');
			expect(body.error.message).toBe('Test message');
			expect(body.status).toBe(418);
		});

		it('should include details when provided', async () => {
			const details = { field: 'email', reason: 'invalid format' };
			const response = createErrorResponse('validation_error', 400, 'Invalid input', details);

			const body = (await response.json()) as ErrorResponse;
			expect(body.error.details).toEqual(details);
		});

		it('should include retryAfter when provided', async () => {
			const response = createErrorResponse('rate_limit', 429, 'Too many requests', undefined, 60);

			expect(response.headers.get('Retry-After')).toBe('60');

			const body = (await response.json()) as ErrorResponse;
			expect(body.retryAfter).toBe(60);
		});

		it('should create 400 Bad Request', async () => {
			const response = badRequest('Invalid input');

			expect(response.status).toBe(400);
			const body = (await response.json()) as ErrorResponse;
			expect(body.error.type).toBe('invalid_request');
		});

		it('should create 500 Internal Server Error', async () => {
			const response = internalServerError();

			expect(response.status).toBe(500);
			const body = (await response.json()) as ErrorResponse;
			expect(body.error.type).toBe('internal_error');
		});

		it('should create 403 Forbidden', async () => {
			const response = forbidden('Access denied');

			expect(response.status).toBe(403);
			const body = (await response.json()) as ErrorResponse;
			expect(body.error.type).toBe('forbidden');
		});

		it('should create 429 Too Many Requests', async () => {
			const response = tooManyRequests('Rate limit exceeded', 120);

			expect(response.status).toBe(429);
			expect(response.headers.get('Retry-After')).toBe('120');

			const body = (await response.json()) as ErrorResponse;
			expect(body.error.type).toBe('rate_limit_exceeded');
		});

		it('should create 502 Bad Gateway', async () => {
			const response = badGateway('Upstream error');

			expect(response.status).toBe(502);
			const body = (await response.json()) as ErrorResponse;
			expect(body.error.type).toBe('bad_gateway');
		});

		it('should create 503 Service Unavailable', async () => {
			const response = serviceUnavailable('Quota exceeded');

			expect(response.status).toBe(503);
			const body = (await response.json()) as ErrorResponse;
			expect(body.error.type).toBe('service_unavailable');
		});

		it('should create 404 Not Found', async () => {
			const response = notFound('Endpoint not found');

			expect(response.status).toBe(404);
			const body = (await response.json()) as ErrorResponse;
			expect(body.error.type).toBe('not_found');
		});

		it('should create 405 Method Not Allowed with Allow header', async () => {
			const response = methodNotAllowed('Only POST allowed', 'POST');

			expect(response.status).toBe(405);
			expect(response.headers.get('Allow')).toBe('POST');

			const body = (await response.json()) as ErrorResponse;
			expect(body.error.type).toBe('method_not_allowed');
		});

		it('should create 409 Integrity Violation', async () => {
			const response = integrityViolationError('Context tampered');

			expect(response.status).toBe(409);
			const body = (await response.json()) as ErrorResponse;
			expect(body.error.type).toBe('INTEGRITY_VIOLATION');
		});

		it('should always include CORS headers', async () => {
			const response = badRequest('Test');

			expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
			expect(response.headers.get('Access-Control-Allow-Methods')).toBe('POST, OPTIONS');
			expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type');
		});

		// ====================================================================
		// Edge Case: Default Parameters Coverage
		// ====================================================================
		it('should use default message for internalServerError', async () => {
			const response = internalServerError(); // No message parameter

			const body = (await response.json()) as ErrorResponse;
			expect(body.error.message).toBe('Internal server error occurred');
		});

		it('should use default message for forbidden', async () => {
			const response = forbidden(); // No message parameter

			const body = (await response.json()) as ErrorResponse;
			expect(body.error.message).toBe('Access denied');
		});

		it('should use default message for tooManyRequests', async () => {
			const response = tooManyRequests(); // No message parameter

			const body = (await response.json()) as ErrorResponse;
			expect(body.error.message).toBe('Rate limit exceeded');
		});

		it('should use default message for badGateway', async () => {
			const response = badGateway(); // No message parameter

			const body = (await response.json()) as ErrorResponse;
			expect(body.error.message).toBe('Upstream service error');
		});

		it('should use default message for serviceUnavailable', async () => {
			const response = serviceUnavailable(); // No message parameter

			const body = (await response.json()) as ErrorResponse;
			expect(body.error.message).toBe('Service temporarily unavailable');
		});

		it('should use default message for notFound', async () => {
			const response = notFound(); // No message parameter

			const body = (await response.json()) as ErrorResponse;
			expect(body.error.message).toBe('Endpoint not found');
		});

		it('should use default parameters for methodNotAllowed', async () => {
			const response = methodNotAllowed(); // No parameters

			expect(response.headers.get('Allow')).toBe('POST, OPTIONS');

			const body = (await response.json()) as ErrorResponse;
			expect(body.error.message).toBe('Method not allowed');
		});
	});

	// ============================================================================
	// TEST GROUP 2: Logging Functions
	// ============================================================================

	describe('Logging Functions', () => {
		let consoleLogSpy: any;
		let consoleWarnSpy: any;
		let consoleErrorSpy: any;

		beforeEach(() => {
			// Spy on console methods
			consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
			consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
			consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		});

		afterEach(() => {
			// Restore console methods
			vi.restoreAllMocks();
		});

		describe('logError', () => {
			it('should log verbose error in development', () => {
				const env: Env = { ENVIRONMENT: 'development' } as Env;
				const error = new Error('Test error');

				logError('Test message', error, env);

				expect(consoleErrorSpy).toHaveBeenCalledWith(
					'[DEV] Test message',
					expect.objectContaining({
						error: error,
						stack: error.stack,
					}),
				);
			});

			it('should log minimal error in production', () => {
				const env: Env = { ENVIRONMENT: 'production' } as Env;
				const error = new Error('Test error');

				logError('Test message', error, env);

				expect(consoleErrorSpy).toHaveBeenCalledWith('[PROD] Test message', {
					message: 'Test error',
				});
			});

			it('should handle error without message', () => {
				const env: Env = { ENVIRONMENT: 'production' } as Env;

				logError('Test', {}, env);

				expect(consoleErrorSpy).toHaveBeenCalled();
			});
		});

		describe('logInfo', () => {
			it('should log in development', () => {
				const env: Env = { ENVIRONMENT: 'development' } as Env;

				logInfo('Test info', { key: 'value' }, env);

				expect(consoleLogSpy).toHaveBeenCalledWith('[INFO] Test info', { key: 'value' });
			});

			it('should NOT log in production', () => {
				const env: Env = { ENVIRONMENT: 'production' } as Env;

				logInfo('Test info', { key: 'value' }, env);

				expect(consoleLogSpy).not.toHaveBeenCalled();
			});

			it('should log when env is undefined (dev behavior)', () => {
				logInfo('Test info');

				expect(consoleLogSpy).toHaveBeenCalled();
			});

			it('should handle missing data parameter', () => {
				const env: Env = { ENVIRONMENT: 'development' } as Env;

				logInfo('Test info', undefined, env);

				expect(consoleLogSpy).toHaveBeenCalledWith('[INFO] Test info', '');
			});
		});

		describe('logWarn', () => {
			it('should log verbose warning in development', () => {
				const env: Env = { ENVIRONMENT: 'development' } as Env;

				logWarn('Test warning', { detail: 'info' }, env);

				expect(consoleWarnSpy).toHaveBeenCalledWith('[DEV] Test warning', { detail: 'info' });
			});

			it('should log minimal warning in production', () => {
				const env: Env = { ENVIRONMENT: 'production' } as Env;

				logWarn('Test warning', { sensitive: 'data' }, env);

				expect(consoleWarnSpy).toHaveBeenCalledWith('[PROD] Test warning');
			});

			it('should log when env is undefined (dev behavior)', () => {
				logWarn('Test warning');

				expect(consoleWarnSpy).toHaveBeenCalled();
			});

			it('should handle missing data parameter', () => {
				const env: Env = { ENVIRONMENT: 'development' } as Env;

				logWarn('Test warning', undefined, env);

				expect(consoleWarnSpy).toHaveBeenCalledWith('[DEV] Test warning', '');
			});
		});
	});
});
