/**
 * Contact form types
 */

export interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  company: string;
  subject: string;
  message: string;
  turnstileToken: string;
  locale: 'tr' | 'en';
}

export interface ContactFormResponse {
  success: boolean;
  message: string;
  error?: string;
  retryAfter?: number;
}

export interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  subject?: string;
  message?: string;
  turnstile?: string;
  submit?: string;
}