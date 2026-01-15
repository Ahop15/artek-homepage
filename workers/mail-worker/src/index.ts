/**
 *  █████╗ ██████╗  █████╗ ███████╗
 * ██╔══██╗██╔══██╗██╔══██╗██╔════╝
 * ███████║██████╔╝███████║███████╗
 * ██╔══██║██╔══██╗██╔══██║╚════██║
 * ██║  ██║██║  ██║██║  ██║███████║
 * ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝
 *
 * ARTEK Mail Worker
 * Copyright (C) 2025 Rıza Emre ARAS <r.emrearas@proton.me>
 *
 */

import { Resend } from 'resend';
import type { ContactFormData, TurnstileResponse, Env } from './types';
import { generateContactEmail, generateAutoReplyEmail } from './templates';
import { getTranslations, type Locale } from './translations';
import { CONFIG } from './config';
import { logError, logInfo } from './utils/logging';

export default {
	async fetch(request, env, _ctx): Promise<Response> {
		const corsHeaders = {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'POST, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type',
		};

		if (request.method === 'OPTIONS') {
			return new Response(null, {
				status: 204,
				headers: corsHeaders,
			});
		}

		if (request.method !== 'POST') {
			return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
		}

		// Validate Content-Type
		const contentType = request.headers.get('Content-Type');
		if (!contentType || !contentType.includes('application/json')) {
			return jsonResponse({ error: 'Content-Type must be application/json' }, 400, corsHeaders);
		}

		try {
			const data: ContactFormData = await request.json();

			// Get translations for the user's locale
			const locale = (data.locale as Locale) || 'tr';
			const t = getTranslations(locale);

			// Validate required fields
			const validation = validateFormData(data, t);
			if (!validation.valid) {
				return jsonResponse({ error: validation.error }, 400, corsHeaders);
			}

			// Get client IP for Turnstile verification
			const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';

			// Verify Turnstile token
			const turnstileValid = await verifyTurnstile(data.turnstileToken, clientIP, env.TURNSTILE_SECRET_KEY);

			if (!turnstileValid) {
				return jsonResponse(
					{
						error: t.errors.securityVerificationFailed,
					},
					403,
					corsHeaders,
				);
			}

			// Parse recipient emails from comma-separated string
			const recipientEmails = parseRecipientEmails(env.RECIPIENT_EMAILS);

			// Validate recipient emails configuration
			if (!recipientEmails || recipientEmails.length === 0) {
				console.error('RECIPIENT_EMAILS is not configured or empty');
				return jsonResponse(
					{
						error: t.errors.internalServerError,
					},
					500,
					corsHeaders,
				);
			}

			// Initialize Resend
			const resend = new Resend(env.RESEND_API_KEY);

			// Send notification email to recipients
			const { error: sendError } = await resend.emails.send({
				from: `${CONFIG.email.fromNameContactForm} <${CONFIG.email.fromAddress}>`,
				to: recipientEmails,
				replyTo: data.email,
				subject: `${CONFIG.email.subjectPrefix} ${data.subject}`,
				html: generateContactEmail(data),
			});

			if (sendError) {
				logError('Resend error', sendError, env);
				return jsonResponse(
					{
						error: t.errors.emailSendFailed,
					},
					500,
					corsHeaders,
				);
			}

			// Send auto-reply to user
			// In development, use Resend test email to avoid sending to real users
			const autoReplyRecipient = env.ENVIRONMENT === 'development' ? CONFIG.email.devAutoReplyEmail : data.email;

			if (env.ENVIRONMENT === 'development') {
				logInfo(
					'Auto-reply redirect',
					{
						realRecipient: data.email,
						testRecipient: autoReplyRecipient,
					},
					env,
				);
			}

			await resend.emails
				.send({
					from: `${CONFIG.email.fromNameAutoReply} <${CONFIG.email.fromAddress}>`,
					to: autoReplyRecipient,
					subject: t.email.autoReplySubject,
					html: generateAutoReplyEmail(data),
				})
				.catch((err) => {
					logError('Auto-reply error', err, env);
					// Don't fail if auto-reply fails
				});

			// Success response
			return jsonResponse(
				{
					success: true,
					message: t.success.messageSent,
				},
				200,
				corsHeaders,
			);
		} catch (error) {
			logError('Contact form error', error, env);

			// Handle JSON parse errors
			if (error instanceof SyntaxError) {
				return jsonResponse(
					{
						error: 'Invalid JSON in request body',
					},
					400,
					corsHeaders,
				);
			}

			// Generic error
			return jsonResponse(
				{
					error: 'Internal server error',
				},
				500,
				corsHeaders,
			);
		}
	},
} satisfies ExportedHandler<Env>;

/**
 * Verify Cloudflare Turnstile token
 */
async function verifyTurnstile(token: string, ip: string, secret: string): Promise<boolean> {
	try {
		const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				secret,
				response: token,
				remoteip: ip,
			}),
		});

		const data: TurnstileResponse = await response.json();
		return data.success;
	} catch (error) {
		// console.error('Turnstile verification error:', error);
		return false;
	}
}

/**
 * Validate form data
 */
function validateFormData(data: ContactFormData, t: ReturnType<typeof getTranslations>): { valid: boolean; error?: string } {
	if (!data.name || data.name.trim().length < 2) {
		return { valid: false, error: t.validation.nameMinLength };
	}

	if (!data.email || !isValidEmail(data.email)) {
		return { valid: false, error: t.validation.invalidEmail };
	}

	if (!data.subject || data.subject.trim().length < 3) {
		return { valid: false, error: t.validation.subjectMinLength };
	}

	if (!data.message || data.message.trim().length < 10) {
		return { valid: false, error: t.validation.messageMinLength };
	}

	if (!data.turnstileToken) {
		return { valid: false, error: t.validation.captchaMissing };
	}

	return { valid: true };
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email);
}

/**
 * Parse recipient emails from comma-separated string
 */
function parseRecipientEmails(emailsString: string): string[] {
	if (!emailsString || emailsString.trim().length === 0) {
		return [];
	}
	return emailsString
		.split(',')
		.map((email) => email.trim())
		.filter((email) => email.length > 0);
}

/**
 * JSON response helper
 */
function jsonResponse(data: any, status: number = 200, headers: Record<string, string> = {}): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			'Content-Type': 'application/json',
			...headers,
		},
	});
}
