/**
 * Translations for ARTEK Mail Worker / Server-side validation messages and responses
 */

export type Locale = 'tr' | 'en';

export interface ValidationMessages {
  nameMinLength: string;
  invalidEmail: string;
  subjectMinLength: string;
  messageMinLength: string;
  captchaMissing: string;
}

export interface ErrorMessages {
  securityVerificationFailed: string;
  emailSendFailed: string;
  internalServerError: string;
}

export interface SuccessMessages {
  messageSent: string;
}

export interface EmailMessages {
  autoReplySubject: string;
}

export interface Translations {
  validation: ValidationMessages;
  errors: ErrorMessages;
  success: SuccessMessages;
  email: EmailMessages;
}

const translations: Record<Locale, Translations> = {
  tr: {
    validation: {
      nameMinLength: 'Ad Soyad en az 2 karakter olmalıdır',
      invalidEmail: 'Geçersiz e-posta adresi',
      subjectMinLength: 'Konu en az 3 karakter olmalıdır',
      messageMinLength: 'Mesaj en az 10 karakter olmalıdır',
      captchaMissing: 'Güvenlik doğrulama kodu eksik',
    },
    errors: {
      securityVerificationFailed: 'Güvenlik doğrulaması başarısız oldu.',
      emailSendFailed: 'Email gönderilemedi. Lütfen daha sonra tekrar deneyin.',
      internalServerError: 'Sunucu hatası oluştu',
    },
    success: {
      messageSent: 'Mesajınız başarıyla gönderildi. En kısa sürede size dönüş yapacağız.',
    },
    email: {
      autoReplySubject: 'Mesajınız Alındı - ARTEK',
    },
  },
  en: {
    validation: {
      nameMinLength: 'Name must be at least 2 characters',
      invalidEmail: 'Invalid email address',
      subjectMinLength: 'Subject must be at least 3 characters',
      messageMinLength: 'Message must be at least 10 characters',
      captchaMissing: 'Captcha token missing',
    },
    errors: {
      securityVerificationFailed: 'Security verification failed.',
      emailSendFailed: 'Failed to send email. Please try again later.',
      internalServerError: 'Internal server error',
    },
    success: {
      messageSent: 'Your message has been sent successfully. We will get back to you soon.',
    },
    email: {
      autoReplySubject: 'Your Message Received - ARTEK',
    },
  },
};

/**
 * Get translations for a given locale
 */
export function getTranslations(locale: Locale = 'tr'): Translations {
  return translations[locale] || translations.tr;
}
