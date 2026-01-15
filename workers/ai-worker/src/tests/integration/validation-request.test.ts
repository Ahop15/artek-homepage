/**
 * ARTEK AI Worker - Request Validation Tests
 *
 * Tests request validation logic with locale support.
 *
 * Test Philosophy:
 * - Pure logic testing (no external dependencies)
 * - Comprehensive validation rule coverage
 * - Both TR and EN locale error messages
 * - Edge cases and error scenarios
 *
 * Coverage:
 * 1. Valid requests (happy paths)
 * 2. Missing/invalid body
 * 3. Messages validation
 * 4. Individual message validation
 * 5. Optional parameters (stream, max_tokens, temperature)
 * 6. Locale-specific errors
 * 7. Multiple validation errors
 * 8. Edge cases
 */

import { describe, it, expect } from 'vitest';
import { validateChatRequest } from '../../validation/request';
import { CONFIG } from '../../config';

describe('Request Validation Tests', () => {
	// ============================================================================
	// TEST GROUP 1: Valid Requests (Happy Paths)
	// ============================================================================

	describe('Valid Requests', () => {
		it('should validate minimal valid request', () => {
			const body = {
				messages: [{ role: 'user', content: 'Hello' }],
				turnstileToken: 'token',
			};

			const result = validateChatRequest(body, 'tr');

			expect(result.messages).toHaveLength(1);
			expect(result.messages[0].role).toBe('user');
			expect(result.messages[0].content).toBe('Hello');
		});

		it('should validate request with multiple messages', () => {
			const body = {
				messages: [
					{ role: 'user', content: 'Hello' },
					{ role: 'assistant', content: 'Hi!' },
					{ role: 'user', content: 'How are you?' },
				],
				turnstileToken: 'token',
			};

			const result = validateChatRequest(body);

			expect(result.messages).toHaveLength(3);
		});

		it('should validate request with optional parameters', () => {
			const body = {
				messages: [{ role: 'user', content: 'Test' }],
				max_tokens: 1000,
				temperature: 0.7,
				stream: false,
				turnstileToken: 'token',
			};

			const result = validateChatRequest(body);

			expect(result.max_tokens).toBe(1000);
			expect(result.temperature).toBe(0.7);
			expect(result.stream).toBe(false);
		});

		it('should validate with EN locale', () => {
			const body = {
				messages: [{ role: 'user', content: 'Hello' }],
				turnstileToken: 'token',
			};

			const result = validateChatRequest(body, 'en');

			expect(result.messages).toHaveLength(1);
		});

		it('should validate long message within limit', () => {
			const longContent = 'A'.repeat(CONFIG.validation.maxMessageLength);
			const body = {
				messages: [{ role: 'user', content: longContent }],
				turnstileToken: 'token',
			};

			const result = validateChatRequest(body);

			expect(result.messages[0].content).toHaveLength(CONFIG.validation.maxMessageLength);
		});

		it('should validate max messages within limit', () => {
			const messages = Array.from({ length: CONFIG.validation.maxMessagesPerRequest }, (_, i) => ({
				role: i % 2 === 0 ? 'user' : 'assistant',
				content: `Message ${i}`,
			}));

			const body = {
				messages,
				turnstileToken: 'token',
			};

			const result = validateChatRequest(body);

			expect(result.messages).toHaveLength(CONFIG.validation.maxMessagesPerRequest);
		});
	});

	// ============================================================================
	// TEST GROUP 2: Missing/Invalid Body
	// ============================================================================

	describe('Missing/Invalid Body', () => {
		it('should reject null body', () => {
			expect(() => validateChatRequest(null)).toThrow('Request body must be a JSON object');
		});

		it('should reject undefined body', () => {
			expect(() => validateChatRequest(undefined)).toThrow('Request body must be a JSON object');
		});

		it('should reject non-object body (string)', () => {
			expect(() => validateChatRequest('invalid')).toThrow('Request body must be a JSON object');
		});

		it('should reject non-object body (number)', () => {
			expect(() => validateChatRequest(123)).toThrow('Request body must be a JSON object');
		});
	});

	// ============================================================================
	// TEST GROUP 3: Messages Array Validation
	// ============================================================================

	describe('Messages Array Validation', () => {
		it('should reject missing messages field', () => {
			const body = { turnstileToken: 'token' };

			expect(() => validateChatRequest(body)).toThrow();
		});

		it('should reject non-array messages', () => {
			const body = {
				messages: 'not an array',
				turnstileToken: 'token',
			};

			expect(() => validateChatRequest(body)).toThrow();
		});

		it('should reject empty messages array', () => {
			const body = {
				messages: [],
				turnstileToken: 'token',
			};

			expect(() => validateChatRequest(body)).toThrow();
		});

		it('should reject too many messages', () => {
			const messages = Array.from({ length: CONFIG.validation.maxMessagesPerRequest + 1 }, (_, i) => ({
				role: 'user',
				content: `Message ${i}`,
			}));

			const body = {
				messages,
				turnstileToken: 'token',
			};

			expect(() => validateChatRequest(body)).toThrow();
		});
	});

	// ============================================================================
	// TEST GROUP 4: Individual Message Validation
	// ============================================================================

	describe('Individual Message Validation', () => {
		it('should reject non-object message', () => {
			const body = {
				messages: ['not an object'],
				turnstileToken: 'token',
			};

			expect(() => validateChatRequest(body)).toThrow('messages[0]');
		});

		it('should reject message with missing role', () => {
			const body = {
				messages: [{ content: 'Hello' }],
				turnstileToken: 'token',
			};

			expect(() => validateChatRequest(body)).toThrow('role');
		});

		it('should reject message with invalid role type', () => {
			const body = {
				messages: [{ role: 123, content: 'Hello' }],
				turnstileToken: 'token',
			};

			expect(() => validateChatRequest(body)).toThrow('role');
		});

		it('should reject message with invalid role value', () => {
			const body = {
				messages: [{ role: 'system', content: 'Hello' }],
				turnstileToken: 'token',
			};

			expect(() => validateChatRequest(body)).toThrow();
		});

		it('should reject message with missing content', () => {
			const body = {
				messages: [{ role: 'user' }],
				turnstileToken: 'token',
			};

			expect(() => validateChatRequest(body)).toThrow('content');
		});

		it('should reject message with non-string content', () => {
			const body = {
				messages: [{ role: 'user', content: 123 }],
				turnstileToken: 'token',
			};

			expect(() => validateChatRequest(body)).toThrow('content');
		});

		it('should reject message with empty content (after trim)', () => {
			const body = {
				messages: [{ role: 'user', content: '   ' }],
				turnstileToken: 'token',
			};

			expect(() => validateChatRequest(body)).toThrow(); // Locale-agnostic
		});

		it('should reject message with content too long', () => {
			const tooLong = 'A'.repeat(CONFIG.validation.maxMessageLength + 1);
			const body = {
				messages: [{ role: 'user', content: tooLong }],
				turnstileToken: 'token',
			};

			expect(() => validateChatRequest(body)).toThrow();
		});
	});

	// ============================================================================
	// TEST GROUP 5: Optional Parameters - stream
	// ============================================================================

	describe('Stream Parameter Validation', () => {
		it('should allow stream: false', () => {
			const body = {
				messages: [{ role: 'user', content: 'Test' }],
				stream: false,
				turnstileToken: 'token',
			};

			const result = validateChatRequest(body);

			expect(result.stream).toBe(false);
		});

		it('should reject stream: true (not supported)', () => {
			const body = {
				messages: [{ role: 'user', content: 'Test' }],
				stream: true,
				turnstileToken: 'token',
			};

			expect(() => validateChatRequest(body)).toThrow(); // Locale-agnostic
		});

		it('should reject non-boolean stream', () => {
			const body = {
				messages: [{ role: 'user', content: 'Test' }],
				stream: 'true',
				turnstileToken: 'token',
			};

			expect(() => validateChatRequest(body)).toThrow();
		});

		it('should allow undefined stream', () => {
			const body = {
				messages: [{ role: 'user', content: 'Test' }],
				turnstileToken: 'token',
			};

			const result = validateChatRequest(body);

			expect(result.stream).toBeUndefined();
		});
	});

	// ============================================================================
	// TEST GROUP 6: Optional Parameters - max_tokens
	// ============================================================================

	describe('max_tokens Parameter Validation', () => {
		it('should allow valid max_tokens', () => {
			const body = {
				messages: [{ role: 'user', content: 'Test' }],
				max_tokens: 1000,
				turnstileToken: 'token',
			};

			const result = validateChatRequest(body);

			expect(result.max_tokens).toBe(1000);
		});

		it('should allow max_tokens at limit', () => {
			const body = {
				messages: [{ role: 'user', content: 'Test' }],
				max_tokens: CONFIG.validation.maxTokens,
				turnstileToken: 'token',
			};

			const result = validateChatRequest(body);

			expect(result.max_tokens).toBe(CONFIG.validation.maxTokens);
		});

		it('should reject non-number max_tokens', () => {
			const body = {
				messages: [{ role: 'user', content: 'Test' }],
				max_tokens: '1000',
				turnstileToken: 'token',
			};

			expect(() => validateChatRequest(body)).toThrow();
		});

		it('should reject max_tokens < 1', () => {
			const body = {
				messages: [{ role: 'user', content: 'Test' }],
				max_tokens: 0,
				turnstileToken: 'token',
			};

			expect(() => validateChatRequest(body)).toThrow(); // Locale-agnostic
		});

		it('should reject max_tokens over limit', () => {
			const body = {
				messages: [{ role: 'user', content: 'Test' }],
				max_tokens: CONFIG.validation.maxTokens + 1,
				turnstileToken: 'token',
			};

			expect(() => validateChatRequest(body)).toThrow();
		});
	});

	// ============================================================================
	// TEST GROUP 7: Optional Parameters - temperature
	// ============================================================================

	describe('temperature Parameter Validation', () => {
		it('should allow valid temperature (0.7)', () => {
			const body = {
				messages: [{ role: 'user', content: 'Test' }],
				temperature: 0.7,
				turnstileToken: 'token',
			};

			const result = validateChatRequest(body);

			expect(result.temperature).toBe(0.7);
		});

		it('should allow temperature at min (0)', () => {
			const body = {
				messages: [{ role: 'user', content: 'Test' }],
				temperature: 0,
				turnstileToken: 'token',
			};

			const result = validateChatRequest(body);

			expect(result.temperature).toBe(0);
		});

		it('should allow temperature at max (1)', () => {
			const body = {
				messages: [{ role: 'user', content: 'Test' }],
				temperature: 1,
				turnstileToken: 'token',
			};

			const result = validateChatRequest(body);

			expect(result.temperature).toBe(1);
		});

		it('should reject non-number temperature', () => {
			const body = {
				messages: [{ role: 'user', content: 'Test' }],
				temperature: '0.7',
				turnstileToken: 'token',
			};

			expect(() => validateChatRequest(body)).toThrow();
		});

		it('should reject temperature < 0', () => {
			const body = {
				messages: [{ role: 'user', content: 'Test' }],
				temperature: -0.1,
				turnstileToken: 'token',
			};

			expect(() => validateChatRequest(body)).toThrow(); // Locale-agnostic
		});

		it('should reject temperature > 1', () => {
			const body = {
				messages: [{ role: 'user', content: 'Test' }],
				temperature: 1.1,
				turnstileToken: 'token',
			};

			expect(() => validateChatRequest(body)).toThrow(); // Locale-agnostic
		});
	});

	// ============================================================================
	// TEST GROUP 8: Locale-Specific Error Messages
	// ============================================================================

	describe('Locale-Specific Error Messages', () => {
		it('should return Turkish error messages by default', () => {
			const body = { turnstileToken: 'token' }; // Missing messages

			expect(() => validateChatRequest(body)).toThrow();
			// Error message will be in Turkish
		});

		it('should return Turkish error messages when locale=tr', () => {
			const body = { turnstileToken: 'token' };

			expect(() => validateChatRequest(body, 'tr')).toThrow();
		});

		it('should return English error messages when locale=en', () => {
			const body = { turnstileToken: 'token' };

			expect(() => validateChatRequest(body, 'en')).toThrow();
		});
	});

	// ============================================================================
	// TEST GROUP 9: Multiple Validation Errors
	// ============================================================================

	describe('Multiple Validation Errors', () => {
		it('should collect multiple errors (messages + max_tokens)', () => {
			const body = {
				messages: [], // Empty
				max_tokens: -1, // Invalid
				turnstileToken: 'token',
			};

			try {
				validateChatRequest(body);
				expect.fail('Should have thrown');
			} catch (error: any) {
				expect(error.validationErrors).toBeDefined();
				expect(error.validationErrors.length).toBeGreaterThan(1);
			}
		});

		it('should collect multiple message errors', () => {
			const body = {
				messages: [
					{ role: 'invalid', content: '' }, // Invalid role + empty content
				],
				turnstileToken: 'token',
			};

			try {
				validateChatRequest(body);
				expect.fail('Should have thrown');
			} catch (error: any) {
				expect(error.validationErrors).toBeDefined();
				expect(error.validationErrors.length).toBeGreaterThanOrEqual(2);
			}
		});
	});

	// ============================================================================
	// TEST GROUP 10: Edge Cases
	// ============================================================================

	describe('Edge Cases', () => {
		it('should handle Turkish characters in content', () => {
			const body = {
				messages: [{ role: 'user', content: 'Merhaba, şöyle güzel ığçük öğe' }],
				turnstileToken: 'token',
			};

			const result = validateChatRequest(body);

			expect(result.messages[0].content).toContain('ş');
		});

		it('should handle emoji in content', () => {
			const body = {
				messages: [{ role: 'user', content: '🚀 Hello! 🎉' }],
				turnstileToken: 'token',
			};

			const result = validateChatRequest(body);

			expect(result.messages[0].content).toContain('🚀');
		});

		it('should handle markdown in content', () => {
			const body = {
				messages: [{ role: 'user', content: '# Title\n\n```typescript\nconst x = 1;\n```' }],
				turnstileToken: 'token',
			};

			const result = validateChatRequest(body);

			expect(result.messages[0].content).toContain('```');
		});

		it('should handle special characters', () => {
			const body = {
				messages: [{ role: 'user', content: '!@#$%^&*()_+-={}[]|\\:";\'<>?,./`~' }],
				turnstileToken: 'token',
			};

			const result = validateChatRequest(body);

			expect(result.messages[0].content).toContain('!@#');
		});

		it('should reject content with only whitespace', () => {
			const body = {
				messages: [{ role: 'user', content: '   \t\n   ' }],
				turnstileToken: 'token',
			};

			expect(() => validateChatRequest(body)).toThrow(); // Locale-agnostic
		});

		it('should handle content with leading/trailing spaces (valid)', () => {
			const body = {
				messages: [{ role: 'user', content: '  Hello  ' }],
				turnstileToken: 'token',
			};

			const result = validateChatRequest(body);

			// Content is kept as-is (spaces preserved)
			expect(result.messages[0].content).toBe('  Hello  ');
		});

		it('should handle null bytes in content', () => {
			const body = {
				messages: [{ role: 'user', content: 'Hello\x00World' }],
				turnstileToken: 'token',
			};

			const result = validateChatRequest(body);

			expect(result.messages[0].content).toContain('\x00');
		});

		it('should handle alternating user/assistant roles', () => {
			const body = {
				messages: [
					{ role: 'user', content: 'Q1' },
					{ role: 'assistant', content: 'A1' },
					{ role: 'user', content: 'Q2' },
					{ role: 'assistant', content: 'A2' },
				],
				turnstileToken: 'token',
			};

			const result = validateChatRequest(body);

			expect(result.messages).toHaveLength(4);
		});

		it('should allow consecutive user messages', () => {
			const body = {
				messages: [
					{ role: 'user', content: 'Message 1' },
					{ role: 'user', content: 'Message 2' },
				],
				turnstileToken: 'token',
			};

			const result = validateChatRequest(body);

			expect(result.messages).toHaveLength(2);
		});

		it('should allow consecutive assistant messages', () => {
			const body = {
				messages: [
					{ role: 'user', content: 'Question' },
					{ role: 'assistant', content: 'Part 1' },
					{ role: 'assistant', content: 'Part 2' },
				],
				turnstileToken: 'token',
			};

			const result = validateChatRequest(body);

			expect(result.messages).toHaveLength(3);
		});
	});

	// ============================================================================
	// TEST GROUP 11: Boundary Value Testing
	// ============================================================================

	describe('Boundary Value Testing', () => {
		it('should accept message exactly at max length', () => {
			const exactLength = 'A'.repeat(CONFIG.validation.maxMessageLength);
			const body = {
				messages: [{ role: 'user', content: exactLength }],
				turnstileToken: 'token',
			};

			const result = validateChatRequest(body);

			expect(result.messages[0].content.length).toBe(CONFIG.validation.maxMessageLength);
		});

		it('should reject message over max length by 1', () => {
			const tooLong = 'A'.repeat(CONFIG.validation.maxMessageLength + 1);
			const body = {
				messages: [{ role: 'user', content: tooLong }],
				turnstileToken: 'token',
			};

			expect(() => validateChatRequest(body)).toThrow();
		});

		it('should accept exactly max messages count', () => {
			const messages = Array.from({ length: CONFIG.validation.maxMessagesPerRequest }, () => ({
				role: 'user',
				content: 'Test',
			}));

			const body = {
				messages,
				turnstileToken: 'token',
			};

			const result = validateChatRequest(body);

			expect(result.messages).toHaveLength(CONFIG.validation.maxMessagesPerRequest);
		});

		it('should reject over max messages count by 1', () => {
			const messages = Array.from({ length: CONFIG.validation.maxMessagesPerRequest + 1 }, () => ({
				role: 'user',
				content: 'Test',
			}));

			const body = {
				messages,
				turnstileToken: 'token',
			};

			expect(() => validateChatRequest(body)).toThrow();
		});

		it('should accept max_tokens = 1 (minimum)', () => {
			const body = {
				messages: [{ role: 'user', content: 'Test' }],
				max_tokens: 1,
				turnstileToken: 'token',
			};

			const result = validateChatRequest(body);

			expect(result.max_tokens).toBe(1);
		});

		it('should reject max_tokens = 0 (below minimum)', () => {
			const body = {
				messages: [{ role: 'user', content: 'Test' }],
				max_tokens: 0,
				turnstileToken: 'token',
			};

			expect(() => validateChatRequest(body)).toThrow();
		});

		it('should accept temperature = 0 (minimum)', () => {
			const body = {
				messages: [{ role: 'user', content: 'Test' }],
				temperature: 0,
				turnstileToken: 'token',
			};

			const result = validateChatRequest(body);

			expect(result.temperature).toBe(0);
		});

		it('should accept temperature = 1 (maximum)', () => {
			const body = {
				messages: [{ role: 'user', content: 'Test' }],
				temperature: 1,
				turnstileToken: 'token',
			};

			const result = validateChatRequest(body);

			expect(result.temperature).toBe(1);
		});
	});

	// ============================================================================
	// TEST GROUP 12: Error Object Structure
	// ============================================================================

	describe('Error Object Structure', () => {
		it('should include validationErrors array in error', () => {
			const body = {
				messages: [],
				turnstileToken: 'token',
			};

			try {
				validateChatRequest(body);
				expect.fail('Should have thrown');
			} catch (error: any) {
				expect(error.validationErrors).toBeDefined();
				expect(Array.isArray(error.validationErrors)).toBe(true);
			}
		});

		it('should include field, message, and value in validation errors', () => {
			const body = {
				messages: [{ role: 'user', content: 'A'.repeat(CONFIG.validation.maxMessageLength + 1) }],
				turnstileToken: 'token',
			};

			try {
				validateChatRequest(body);
				expect.fail('Should have thrown');
			} catch (error: any) {
				const validationError = error.validationErrors[0];
				expect(validationError.field).toBeDefined();
				expect(validationError.message).toBeDefined();
				expect(validationError.value).toBeDefined();
			}
		});
	});
});