// noinspection JSUnusedGlobalSymbols

/**
 * Error Response Utilities
 * Simple error responses for the API
 */

import type { ErrorResponse } from '../types';

/**
 * CORS headers for error responses
 */
const CORS_HEADERS = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'POST, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type',
};

/**
 * Create a JSON error response
 *
 * @param errorType - Error type/code
 * @param status - HTTP status code
 * @param message - Human-readable error message
 * @param details - Optional additional details
 * @param retryAfter - Optional retry-after value in seconds
 * @returns Response object with error
 */
export function createErrorResponse(errorType: string, status: number, message: string, details?: unknown, retryAfter?: number): Response {
	const errorBody: ErrorResponse = {
		error: {
			type: errorType,
			message,
			details,
		},
		status,
	};

	if (retryAfter !== undefined) {
		errorBody.retryAfter = retryAfter;
	}

	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
		...CORS_HEADERS,
	};

	if (retryAfter !== undefined) {
		headers['Retry-After'] = String(retryAfter);
	}

	return new Response(JSON.stringify(errorBody, null, 2), {
		status,
		headers,
	});
}

/**
 * 400 Bad Request - Invalid request format
 */
export function badRequest(message: string, details?: unknown): Response {
	return createErrorResponse('invalid_request', 400, message, details);
}

/**
 * 500 Internal Server Error
 */
export function internalServerError(message = 'Internal server error occurred'): Response {
	return createErrorResponse('internal_error', 500, message);
}

/**
 * 403 Forbidden - Access denied
 */
export function forbidden(message = 'Access denied'): Response {
	return createErrorResponse('forbidden', 403, message);
}

/**
 * 429 Too Many Requests - Rate limit exceeded
 */
export function tooManyRequests(message = 'Rate limit exceeded', retryAfter?: number): Response {
	return createErrorResponse('rate_limit_exceeded', 429, message, undefined, retryAfter);
}

/**
 * 502 Bad Gateway - Upstream service error
 */
export function badGateway(message = 'Upstream service error'): Response {
	return createErrorResponse('bad_gateway', 502, message);
}

/**
 * 503 Service Unavailable - Quota exceeded
 */
export function serviceUnavailable(message = 'Service temporarily unavailable'): Response {
	return createErrorResponse('service_unavailable', 503, message);
}

/**
 * 404 Not Found - Endpoint not found
 */
export function notFound(message = 'Endpoint not found'): Response {
	return createErrorResponse('not_found', 404, message);
}

/**
 * 405 Method Not Allowed - Invalid HTTP method
 */
export function methodNotAllowed(message = 'Method not allowed', allowedMethods = 'POST, OPTIONS'): Response {
	const response = createErrorResponse('method_not_allowed', 405, message);

	// Add Allow header
	const headers = new Headers(response.headers);
	headers.set('Allow', allowedMethods);

	return new Response(response.body, {
		status: response.status,
		headers,
	});
}

/**
 * 400 Bad Request - Context Integrity Violation
 *
 * Returned when the conversation context cannot be verified against the database.
 * This indicates potential manipulation of conversation history.
 */
export function integrityViolationError(message: string): Response {
	return createErrorResponse('INTEGRITY_VIOLATION', 409, message);
}
