// noinspection DuplicatedCode

/**
 * Logging utilities with environment-aware verbosity
 * Prevents sensitive data leakage in production logs
 */
import type { Env } from '../types';

/**
 * Log error with environment-aware detail level
 *
 * Development: Full error object with stack trace
 * Production: Only error message (no sensitive data)
 *
 * @param message - Log message prefix
 * @param error - Error object to log
 * @param env - Environment bindings
 */
export function logError(message: string, error: any, env: Env): void {
	if (env.ENVIRONMENT === 'development') {
		// Verbose logging in development
		console.error(`[DEV] ${message}`, {
			error: error,
			stack: error?.stack,
			details: error,
		});
	} else {
		// Minimal logging in production (no stack trace, no sensitive data)
		console.error(`[PROD] ${message}`, {
			message: error?.message || 'Unknown error',
		});
	}
}

/**
 * Log info with environment-aware detail level
 *
 * Development: Full logging
 * Production: No info logs (reduce noise)
 *
 * @param message - Log message
 * @param data - Optional data to log
 * @param env - Environment bindings
 */
export function logInfo(message: string, data?: any, env?: Env): void {
	if (!env || env.ENVIRONMENT === 'development') {
		console.log(`[INFO] ${message}`, data || '');
	}
	// Production: No info logs (reduce log volume)
}
