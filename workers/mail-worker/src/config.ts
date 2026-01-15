/**
 * ARTEK Mail Worker Configuration
 * Centralized configuration for email settings
 */

export const CONFIG = {
	email: {
		/**
		 * Email address used for sending emails
		 * @example from: `ARTEK <${CONFIG.email.fromAddress}>`
		 */
		fromAddress: 'contactform@notifications.artek.tc',

		/**
		 * Display name for contact form notifications
		 * @example from: `${CONFIG.email.fromNameContactForm} <${CONFIG.email.fromAddress}>`
		 */
		fromNameContactForm: 'ARTEK Contact Form',

		/**
		 * Display name for auto-reply emails
		 * @example from: `${CONFIG.email.fromNameAutoReply} <${CONFIG.email.fromAddress}>`
		 */
		fromNameAutoReply: 'ARTEK',

		/**
		 * Subject prefix for contact notifications
		 * @example subject: `${CONFIG.email.subjectPrefix} ${data.subject}`
		 */
		subjectPrefix: '[ARTEK Contact]',

		/**
		 * Development test email for auto-reply
		 * Used in development to avoid sending emails to real users
		 * @example const autoReplyRecipient = env.ENVIRONMENT === 'development' ? CONFIG.email.devAutoReplyEmail : data.email
		 */
		devAutoReplyEmail: 'delivered+auto-reply@resend.dev',
	},
} as const;