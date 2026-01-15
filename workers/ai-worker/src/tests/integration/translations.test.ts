/**
 * ARTEK AI Worker - Translations Tests
 *
 * Tests i18n translation functions.
 *
 * Test Philosophy:
 * - Pure function testing
 * - Verify TR/EN message support
 * - Locale parsing and fallback
 *
 * Coverage:
 * 1. getTranslations() - TR/EN messages
 * 2. parseLocale() - locale validation
 */

import { describe, it, expect } from 'vitest';
import { getTranslations, parseLocale } from '../../translations';

describe('Translations Tests', () => {
	// ============================================================================
	// TEST GROUP 1: getTranslations()
	// ============================================================================

	describe('getTranslations', () => {
		it('should return Turkish translations by default', () => {
			const t = getTranslations();

			expect(t.errors).toBeDefined();
			expect(t.validation).toBeDefined();
			expect(t.knowledgeSearch).toBeDefined();
		});

		it('should return Turkish translations when locale=tr', () => {
			const t = getTranslations('tr');

			expect(t.errors).toBeDefined();
			expect(t.validation).toBeDefined();
		});

		it('should return English translations when locale=en', () => {
			const t = getTranslations('en');

			expect(t.errors).toBeDefined();
			expect(t.validation).toBeDefined();
		});

		it('should fallback to Turkish for invalid locale', () => {
			const t = getTranslations('invalid' as any);

			expect(t.errors).toBeDefined();
		});

		it('should have all required error messages (TR)', () => {
			const t = getTranslations('tr');

			expect(t.errors.invalidJson).toBeDefined();
			expect(t.errors.validationFailed).toBeDefined();
			expect(t.errors.turnstileMissing).toBeDefined();
			expect(t.errors.rateLimitExceeded).toBeDefined();
		});

		it('should have all required error messages (EN)', () => {
			const t = getTranslations('en');

			expect(t.errors.invalidJson).toBeDefined();
			expect(t.errors.validationFailed).toBeDefined();
			expect(t.errors.turnstileMissing).toBeDefined();
			expect(t.errors.rateLimitExceeded).toBeDefined();
		});

		it('should have all required validation messages (TR)', () => {
			const t = getTranslations('tr');

			expect(t.validation.messagesRequired).toBeDefined();
			expect(t.validation.messagesEmpty).toBeDefined();
			expect(typeof t.validation.messagesLimitExceeded).toBe('function');
		});

		it('should have all required validation messages (EN)', () => {
			const t = getTranslations('en');

			expect(t.validation.messagesRequired).toBeDefined();
			expect(t.validation.messagesEmpty).toBeDefined();
			expect(typeof t.validation.messagesLimitExceeded).toBe('function');
		});

		it('should have knowledge search messages (TR)', () => {
			const t = getTranslations('tr');

			expect(t.knowledgeSearch.toolDescription).toBeDefined();
			expect(t.knowledgeSearch.noResults).toBeDefined();
			// Call TR knowledge search functions for coverage
			expect(t.knowledgeSearch.resultsCount(5)).toContain('5');
			expect(t.knowledgeSearch.matchScore('dosya.txt', 90.5)).toContain('90.5');
			expect(t.knowledgeSearch.searchError('hata')).toContain('hata');
		});

		it('should have knowledge search messages (EN)', () => {
			const t = getTranslations('en');

			expect(t.knowledgeSearch.toolDescription).toBeDefined();
			expect(t.knowledgeSearch.noResults).toBeDefined();
		});

		// ====================================================================
		// Full EN Message Coverage (for 100% coverage)
		// ====================================================================
		it('should have all EN error messages accessible', () => {
			const t = getTranslations('en');

			// Access all EN error messages
			expect(t.errors.invalidRequest).toBeDefined();
			expect(t.errors.requestBodyTooLarge).toBeDefined();
			expect(t.errors.invalidJson).toBeDefined();
			expect(t.errors.validationFailed).toBeDefined();
			expect(t.errors.turnstileMissing).toBeDefined();
			expect(t.errors.turnstileFailed).toBeDefined();
			expect(t.errors.accessDenied).toBeDefined();
			expect(t.errors.endpointNotFound).toBeDefined();
			expect(t.errors.methodNotAllowed).toBeDefined();
			expect(t.errors.rateLimitExceeded).toBeDefined();
			expect(t.errors.rateLimitRetry).toBeDefined();
			expect(t.errors.upstreamError).toBeDefined();
			expect(t.errors.upstreamConnectionFailed).toBeDefined();
			expect(t.errors.upstreamInvalidResponse).toBeDefined();
			expect(t.errors.serviceUnavailable).toBeDefined();
			expect(t.errors.tokenQuotaExceeded).toBeDefined();
			expect(t.errors.internalError).toBeDefined();
			expect(t.errors.unexpectedError).toBeDefined();
			expect(t.errors.emptyResponse).toBeDefined();
			expect(t.errors.integrityViolation).toBeDefined();
		});

		it('should have all EN validation messages accessible', () => {
			const t = getTranslations('en');

			// Access all EN validation messages (call all functions!)
			expect(t.validation.validationSummary).toBeDefined();
			expect(t.validation.messagesRequired).toBeDefined();
			expect(t.validation.messagesArrayRequired).toBeDefined();
			expect(t.validation.messagesEmpty).toBeDefined();
			expect(t.validation.messagesLimitExceeded(20)).toContain('20');
			expect(t.validation.messageObjectRequired(0)).toContain('[0]');
			expect(t.validation.roleRequired(0)).toContain('[0]');
			expect(t.validation.roleInvalid(0)).toContain('[0]');
			expect(t.validation.contentRequired(0)).toContain('[0]');
			expect(t.validation.contentStringRequired(0)).toContain('[0]');
			expect(t.validation.contentEmpty(0)).toContain('[0]');
			expect(t.validation.contentTooLong(0, 1000)).toContain('1000');
			expect(t.validation.streamBooleanRequired).toBeDefined();
			expect(t.validation.streamNotSupported).toBeDefined();
			expect(t.validation.maxTokensNumberRequired).toBeDefined();
			expect(t.validation.maxTokensMinimum).toBeDefined();
			expect(t.validation.maxTokensExceeded(1000)).toContain('1000');
			expect(t.validation.temperatureNumberRequired).toBeDefined();
			expect(t.validation.temperatureOutOfRange(0, 1)).toContain('0');
		});

		it('should have all EN knowledge search messages accessible', () => {
			const t = getTranslations('en');

			// Access all EN knowledge search messages
			expect(t.knowledgeSearch.toolDescription).toBeDefined();
			expect(t.knowledgeSearch.noResults).toBeDefined();
			expect(t.knowledgeSearch.resultsHeader).toBeDefined();
			expect(typeof t.knowledgeSearch.resultsCount).toBe('function');
			expect(t.knowledgeSearch.resultsCount(5)).toContain('5');
			expect(t.knowledgeSearch.dataFilesHeader).toBeDefined();
			expect(typeof t.knowledgeSearch.matchScore).toBe('function');
			expect(t.knowledgeSearch.matchScore('file.txt', 85.5)).toContain('85.5');
			expect(typeof t.knowledgeSearch.searchError).toBe('function');
			expect(t.knowledgeSearch.searchError('timeout')).toContain('timeout');
		});
	});

	// ============================================================================
	// TEST GROUP 2: parseLocale()
	// ============================================================================

	describe('parseLocale', () => {
		it('should parse valid tr locale', () => {
			const locale = parseLocale('tr');

			expect(locale).toBe('tr');
		});

		it('should parse valid en locale', () => {
			const locale = parseLocale('en');

			expect(locale).toBe('en');
		});

		it('should fallback to tr for undefined', () => {
			const locale = parseLocale(undefined);

			expect(locale).toBe('tr');
		});

		it('should fallback to tr for null', () => {
			const locale = parseLocale(null);

			expect(locale).toBe('tr');
		});

		it('should fallback to tr for invalid string', () => {
			const locale = parseLocale('fr');

			expect(locale).toBe('tr');
		});

		it('should fallback to tr for non-string (number)', () => {
			const locale = parseLocale(123);

			expect(locale).toBe('tr');
		});

		it('should fallback to tr for non-string (object)', () => {
			const locale = parseLocale({ lang: 'en' });

			expect(locale).toBe('tr');
		});

		it('should fallback to tr for non-string (boolean)', () => {
			const locale = parseLocale(true);

			expect(locale).toBe('tr');
		});

		it('should be case-sensitive (TR != tr)', () => {
			const locale = parseLocale('TR'); // Uppercase

			expect(locale).toBe('tr'); // Fallback
		});

		it('should be case-sensitive (EN != en)', () => {
			const locale = parseLocale('EN'); // Uppercase

			expect(locale).toBe('tr'); // Fallback
		});
	});
});