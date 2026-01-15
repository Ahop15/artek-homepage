/**
 * Request Validation
 * Validates incoming chat completion requests with localization support
 */

import type { ChatRequest, ValidationError } from '../types';
import { CONFIG } from '../config';
import { getTranslations, type Locale } from '../translations';

/**
 * Validate chat completion request body
 *
 * @param body - Request body (unknown type)
 * @param locale - Locale for error messages ('tr' or 'en')
 * @returns Validated ChatRequest object
 * @throws Error with validation details if invalid
 */
export function validateChatRequest(body: unknown, locale: Locale = 'tr'): ChatRequest {
	const errors: ValidationError[] = [];
	const t = getTranslations(locale).validation;

	// Check if body exists and is an object
	if (!body || typeof body !== 'object') {
		throw new Error('Request body must be a JSON object');
	}

	const request = body as Record<string, unknown>;

	// Validate messages array
	if (!request.messages) {
		errors.push({
			field: 'messages',
			message: t.messagesRequired,
		});
	} else if (!Array.isArray(request.messages)) {
		errors.push({
			field: 'messages',
			message: t.messagesArrayRequired,
		});
	} else {
		// Validate messages array content
		if (request.messages.length === 0) {
			errors.push({
				field: 'messages',
				message: t.messagesEmpty,
			});
		}

		if (request.messages.length > CONFIG.validation.maxMessagesPerRequest) {
			errors.push({
				field: 'messages',
				message: t.messagesLimitExceeded(CONFIG.validation.maxMessagesPerRequest),
				value: request.messages.length,
			});
		}

		// Validate each message
		request.messages.forEach((msg, index) => {
			if (!msg || typeof msg !== 'object') {
				errors.push({
					field: `messages[${index}]`,
					message: t.messageObjectRequired(index),
				});
				return;
			}

			const message = msg as Record<string, unknown>;

			// Validate role
			if (!message.role) {
				errors.push({
					field: `messages[${index}].role`,
					message: t.roleRequired(index),
				});
			} else if (typeof message.role !== 'string' || !['user', 'assistant'].includes(message.role)) {
				errors.push({
					field: `messages[${index}].role`,
					message: t.roleInvalid(index),
					value: message.role,
				});
			}

			// Validate content
			if (!message.content) {
				errors.push({
					field: `messages[${index}].content`,
					message: t.contentRequired(index),
				});
			} else if (typeof message.content !== 'string') {
				errors.push({
					field: `messages[${index}].content`,
					message: t.contentStringRequired(index),
				});
			} else if (message.content.trim().length === 0) {
				errors.push({
					field: `messages[${index}].content`,
					message: t.contentEmpty(index),
				});
			} else if (message.content.length > CONFIG.validation.maxMessageLength) {
				errors.push({
					field: `messages[${index}].content`,
					message: t.contentTooLong(index, CONFIG.validation.maxMessageLength),
					value: message.content.length,
				});
			}
		});
	}

	// Validate stream (optional)
	if (request.stream !== undefined) {
		if (typeof request.stream !== 'boolean') {
			errors.push({
				field: 'stream',
				message: t.streamBooleanRequired,
				value: request.stream,
			});
		}

		// We don't support streaming yet
		if (request.stream === true) {
			errors.push({
				field: 'stream',
				message: t.streamNotSupported,
				value: true,
			});
		}
	}

	// Validate max_tokens (optional)
	if (request.max_tokens !== undefined) {
		if (typeof request.max_tokens !== 'number') {
			errors.push({
				field: 'max_tokens',
				message: t.maxTokensNumberRequired,
				value: request.max_tokens,
			});
		} else if (request.max_tokens < 1) {
			errors.push({
				field: 'max_tokens',
				message: t.maxTokensMinimum,
				value: request.max_tokens,
			});
		} else if (request.max_tokens > CONFIG.validation.maxTokens) {
			errors.push({
				field: 'max_tokens',
				message: t.maxTokensExceeded(CONFIG.validation.maxTokens),
				value: request.max_tokens,
			});
		}
	}

	// Validate temperature (optional)
	if (request.temperature !== undefined) {
		if (typeof request.temperature !== 'number') {
			errors.push({
				field: 'temperature',
				message: t.temperatureNumberRequired,
				value: request.temperature,
			});
		} else if (request.temperature < CONFIG.validation.minTemperature || request.temperature > CONFIG.validation.maxTemperature) {
			errors.push({
				field: 'temperature',
				message: t.temperatureOutOfRange(CONFIG.validation.minTemperature, CONFIG.validation.maxTemperature),
				value: request.temperature,
			});
		}
	}

	// If there are validation errors, throw
	if (errors.length > 0) {
		const errorMessage = t.validationSummary + ': ' + errors.map((e) => `${e.field}: ${e.message}`).join(', ');

		const error = new Error(errorMessage) as Error & {
			validationErrors: ValidationError[];
		};
		error.validationErrors = errors;
		throw error;
	}

	// Return validated request
	return request as unknown as ChatRequest;
}
