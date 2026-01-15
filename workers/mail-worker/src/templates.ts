/**
 * Email HTML templates for ARTEK Contact Form
 */

import type { ContactFormData } from './types';
import contactNotificationTemplateTR from './templates/tr/contact-notification.html';
import contactNotificationTemplateEN from './templates/en/contact-notification.html';
import autoReplyTemplateTR from './templates/tr/auto-reply.html';
import autoReplyTemplateEN from './templates/en/auto-reply.html';

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Replace placeholders in template
 */
function replacePlaceholders(template: string, replacements: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(replacements)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  return result;
}

/**
 * Generate contact notification email (sent to ARTEK)
 */
export function generateContactEmail(data: ContactFormData): string {
  // Select template based on locale
  const template =
    data.locale === 'tr' ? contactNotificationTemplateTR : contactNotificationTemplateEN;

  // Format phone and company (show "-" if not provided)
  const phone = data.phone ? escapeHtml(data.phone) : '-';
  const company = data.company ? escapeHtml(data.company) : '-';

  // Format timestamp
  const timestamp = new Date().toLocaleString('tr-TR', {
    timeZone: 'Europe/Istanbul',
    dateStyle: 'long',
    timeStyle: 'short',
  });

  // Replace dynamic placeholders only
  const replacements = {
    NAME: escapeHtml(data.name),
    EMAIL: escapeHtml(data.email),
    PHONE: phone,
    COMPANY: company,
    SUBJECT: escapeHtml(data.subject),
    MESSAGE: escapeHtml(data.message).replace(/\n/g, '<br>'),
    TIMESTAMP: timestamp,
  };

  return replacePlaceholders(template, replacements);
}

/**
 * Generate auto-reply email (sent to user)
 */
export function generateAutoReplyEmail(data: ContactFormData): string {
  // Select template based on locale
  const template = data.locale === 'tr' ? autoReplyTemplateTR : autoReplyTemplateEN;

  // Replace dynamic placeholders only
  const replacements = {
    NAME: escapeHtml(data.name),
    SUBJECT: escapeHtml(data.subject),
  };

  return replacePlaceholders(template, replacements);
}
