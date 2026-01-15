/**
 * Type definitions for ARTEK Mail Worker
 */

export interface Env {
	RESEND_API_KEY: string;
	TURNSTILE_SECRET_KEY: string;
	RECIPIENT_EMAILS: string;
	ENVIRONMENT: 'development' | 'production';
}

export interface ContactFormData {
	name: string;
	email: string;
	phone?: string;
	company?: string;
	subject: string;
	message: string;
	turnstileToken: string;
	locale: 'tr' | 'en';
}

export interface TurnstileResponse {
	success: boolean;
	'error-codes': string[];
	challenge_ts?: string;
	hostname?: string;
}
