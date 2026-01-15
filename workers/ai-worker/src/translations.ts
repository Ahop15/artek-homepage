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
 * Translations for ARTEK AI Worker
 * Server-side localization for error messages, validation, and responses
 */

export type Locale = 'tr' | 'en';

/**
 * Error messages for different HTTP status codes
 */
export interface ErrorMessages {
	// 400 errors
	invalidRequest: string;
	requestBodyTooLarge: string;
	invalidJson: string;
	validationFailed: string;
	turnstileMissing: string;
	turnstileFailed: string;

	// 403 Forbidden
	accessDenied: string;

	// 404 Not Found
	endpointNotFound: string;

	// 405 Method Not Allowed
	methodNotAllowed: string;

	// 429 Rate Limit
	rateLimitExceeded: string;
	rateLimitRetry: string;

	// 502 Bad Gateway
	upstreamError: string;
	upstreamConnectionFailed: string;
	upstreamInvalidResponse: string;

	// 503 Service Unavailable
	serviceUnavailable: string;
	tokenQuotaExceeded: string;

	// 500 Internal Server Error
	internalError: string;
	unexpectedError: string;

	// Empty response error
	emptyResponse: string;

	// Integrity violation
	integrityViolation: string;
}

/**
 * Validation error messages
 */
export interface ValidationMessages {
	// Validation summary
	validationSummary: string;

	// Messages array validation
	messagesRequired: string;
	messagesArrayRequired: string;
	messagesEmpty: string;
	messagesLimitExceeded: (limit: number) => string;

	// Individual message validation
	messageObjectRequired: (index: number) => string;
	roleRequired: (index: number) => string;
	roleInvalid: (index: number) => string;
	contentRequired: (index: number) => string;
	contentStringRequired: (index: number) => string;
	contentEmpty: (index: number) => string;
	contentTooLong: (index: number, limit: number) => string;

	// Stream validation
	streamBooleanRequired: string;
	streamNotSupported: string;

	// max_tokens validation
	maxTokensNumberRequired: string;
	maxTokensMinimum: string;
	maxTokensExceeded: (limit: number) => string;

	// temperature validation
	temperatureNumberRequired: string;
	temperatureOutOfRange: (min: number, max: number) => string;
}

/**
 * Knowledge search messages
 */
export interface KnowledgeSearchMessages {
	// Tool description (for Claude)
	toolDescription: string;

	// Response messages
	noResults: string;
	resultsHeader: string;
	resultsCount: (count: number) => string;
	dataFilesHeader: string;
	matchScore: (filename: string, score: number) => string;

	// Error messages
	searchError: (message: string) => string;
}

export interface Translations {
	errors: ErrorMessages;
	validation: ValidationMessages;
	knowledgeSearch: KnowledgeSearchMessages;
}

const translations: Record<Locale, Translations> = {
	tr: {
		errors: {
			// 400 errors
			invalidRequest: 'Geçersiz istek',
			requestBodyTooLarge: 'İstek boyutu çok büyük',
			invalidJson: 'Geçersiz JSON formatı',
			validationFailed: 'İstek doğrulaması başarısız',
			turnstileMissing: 'Güvenlik doğrulama kodu eksik',
			turnstileFailed: 'Güvenlik doğrulaması başarısız. Lütfen sayfayı yenileyin',

			// 403 Forbidden
			accessDenied: 'Erişim reddedildi',

			// 404 Not Found
			endpointNotFound: 'Endpoint bulunamadı. POST /api/v1/chat/completions kullanın',

			// 405 Method Not Allowed
			methodNotAllowed: 'Sadece POST ve OPTIONS istekleri kabul edilir',

			// 429 Rate Limit
			rateLimitExceeded: 'İstek limiti aşıldı. Lütfen daha sonra tekrar deneyin',
			rateLimitRetry: 'Lütfen {seconds} saniye sonra tekrar deneyin',

			// 502 Bad Gateway
			upstreamError: 'AI servis hatası',
			upstreamConnectionFailed: 'AI servisine bağlanılamadı',
			upstreamInvalidResponse: 'AI servisinden geçersiz yanıt alındı',

			// 503 Service Unavailable
			serviceUnavailable: 'Servis geçici olarak kullanılamıyor',
			tokenQuotaExceeded: 'Günlük token limiti aşıldı. Lütfen yarın tekrar deneyin',

			// 500 Internal Server Error
			internalError: 'Sunucu hatası oluştu',
			unexpectedError: 'Beklenmeyen bir hata oluştu',

			// Empty response error
			emptyResponse: 'Üzgünüm, yanıt oluşturulamadı. Lütfen tekrar deneyin.',

			// Integrity violation
			integrityViolation: 'Sohbet geçmişi doğrulanamadı. Lütfen sohbeti yeniden başlatın.',
		},
		validation: {
			// Validation summary
			validationSummary: 'İstek doğrulaması başarısız',

			// Messages array validation
			messagesRequired: 'messages alanı zorunludur',
			messagesArrayRequired: 'messages bir dizi olmalıdır',
			messagesEmpty: 'messages dizisi en az bir mesaj içermelidir',
			messagesLimitExceeded: (limit) => `messages dizisi maksimum ${limit} mesaj içerebilir`,

			// Individual message validation
			messageObjectRequired: (index) => `messages[${index}] bir nesne olmalıdır`,
			roleRequired: (index) => `messages[${index}].role zorunludur`,
			roleInvalid: (index) => `messages[${index}].role "user" veya "assistant" olmalıdır`,
			contentRequired: (index) => `messages[${index}].content zorunludur`,
			contentStringRequired: (index) => `messages[${index}].content bir metin olmalıdır`,
			contentEmpty: (index) => `messages[${index}].content boş olamaz`,
			contentTooLong: (index, limit) => `messages[${index}].content maksimum ${limit} karakter olabilir`,

			// Stream validation
			streamBooleanRequired: 'stream bir boolean değer olmalıdır',
			streamNotSupported: 'Streaming şu anda desteklenmiyor',

			// max_tokens validation
			maxTokensNumberRequired: 'max_tokens bir sayı olmalıdır',
			maxTokensMinimum: 'max_tokens en az 1 olmalıdır',
			maxTokensExceeded: (limit) => `max_tokens maksimum ${limit} olabilir`,

			// temperature validation
			temperatureNumberRequired: 'temperature bir sayı olmalıdır',
			temperatureOutOfRange: (min, max) => `temperature ${min} ile ${max} arasında olmalıdır`,
		},
		knowledgeSearch: {
			// Tool description (for Claude)
			toolDescription:
				'Search ARTEK knowledge base for information about R&D centers, design centers, consultancy services, statistics, and more. Use this tool when the user asks questions about ARTEK services, centers, or statistics.',

			// Response messages
			noResults: 'Üzgünüm, bu konuda bilgi bulamadım.',
			resultsHeader: '\n\n**Bulduğum Bilgiler:**\n',
			resultsCount: (count) => `${count} kaynak dosyadan bilgi toplandı.\n`,
			dataFilesHeader: '\n**Veri Dosyaları:**\n',
			matchScore: (filename, score) => `${filename} (eşleşme: ${score.toFixed(1)}%)`,

			// Error messages
			searchError: (message) =>
				`Bilgi tabanı aramasında bir sorun oluştu (${message}). Lütfen genel bilgilerimle yardımcı olmaya devam edeyim.`,
		},
	},
	en: {
		errors: {
			// 400 errors
			invalidRequest: 'Invalid request',
			requestBodyTooLarge: 'Request body too large',
			invalidJson: 'Invalid JSON format',
			validationFailed: 'Request validation failed',
			turnstileMissing: 'Security verification code missing',
			turnstileFailed: 'Security verification failed. Please refresh the page',

			// 403 Forbidden
			accessDenied: 'Access denied',

			// 404 Not Found
			endpointNotFound: 'Endpoint not found. Use POST /api/v1/chat/completions',

			// 405 Method Not Allowed
			methodNotAllowed: 'Only POST and OPTIONS requests are allowed',

			// 429 Rate Limit
			rateLimitExceeded: 'Rate limit exceeded. Please try again later',
			rateLimitRetry: 'Please try again in {seconds} seconds',

			// 502 Bad Gateway
			upstreamError: 'AI service error',
			upstreamConnectionFailed: 'Failed to connect to AI service',
			upstreamInvalidResponse: 'Invalid response from AI service',

			// 503 Service Unavailable
			serviceUnavailable: 'Service temporarily unavailable',
			tokenQuotaExceeded: 'Daily token quota exceeded. Please try again tomorrow',

			// 500 Internal Server Error
			internalError: 'Internal server error occurred',
			unexpectedError: 'An unexpected error occurred',

			// Empty response error
			emptyResponse: 'Sorry, unable to generate a response. Please try again.',

			// Integrity violation
			integrityViolation: 'Chat history could not be verified. Please restart the conversation.',
		},
		validation: {
			// Validation summary
			validationSummary: 'Request validation failed',

			// Messages array validation
			messagesRequired: 'messages field is required',
			messagesArrayRequired: 'messages must be an array',
			messagesEmpty: 'messages array must contain at least one message',
			messagesLimitExceeded: (limit) => `messages array cannot exceed ${limit} messages`,

			// Individual message validation
			messageObjectRequired: (index) => `messages[${index}] must be an object`,
			roleRequired: (index) => `messages[${index}].role is required`,
			roleInvalid: (index) => `messages[${index}].role must be "user" or "assistant"`,
			contentRequired: (index) => `messages[${index}].content is required`,
			contentStringRequired: (index) => `messages[${index}].content must be a string`,
			contentEmpty: (index) => `messages[${index}].content cannot be empty`,
			contentTooLong: (index, limit) => `messages[${index}].content cannot exceed ${limit} characters`,

			// Stream validation
			streamBooleanRequired: 'stream must be a boolean',
			streamNotSupported: 'Streaming is not currently supported',

			// max_tokens validation
			maxTokensNumberRequired: 'max_tokens must be a number',
			maxTokensMinimum: 'max_tokens must be at least 1',
			maxTokensExceeded: (limit) => `max_tokens cannot exceed ${limit}`,

			// temperature validation
			temperatureNumberRequired: 'temperature must be a number',
			temperatureOutOfRange: (min, max) => `temperature must be between ${min} and ${max}`,
		},
		knowledgeSearch: {
			// Tool description (for Claude)
			toolDescription:
				'Search ARTEK knowledge base for information about R&D centers, design centers, consultancy services, statistics, and more. Use this tool when the user asks questions about ARTEK services, centers, or statistics.',

			// Response messages
			noResults: 'Sorry, I could not find information about this topic.',
			resultsHeader: '\n\n**Information Found:**\n',
			resultsCount: (count) => `Information gathered from ${count} source files.\n`,
			dataFilesHeader: '\n**Data Files:**\n',
			matchScore: (filename, score) => `${filename} (match: ${score.toFixed(1)}%)`,

			// Error messages
			searchError: (message) =>
				`There was an issue with the knowledge base search (${message}). Let me continue helping you with my general knowledge.`,
		},
	},
};

/**
 * Get translations for a given locale
 * @param locale - Locale code ('tr' or 'en'), defaults to 'tr'
 * @returns Translations object for the specified locale
 */
export function getTranslations(locale: Locale = 'tr'): Translations {
	return translations[locale] || translations.tr;
}

/**
 * Parse and validate locale from request
 * @param locale - Locale string from request
 * @returns Valid Locale type
 */
export function parseLocale(locale?: unknown): Locale {
	if (typeof locale === 'string' && (locale === 'tr' || locale === 'en')) {
		return locale;
	}
	return 'tr'; // Default to Turkish
}
