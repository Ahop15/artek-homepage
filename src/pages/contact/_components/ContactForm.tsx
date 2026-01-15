/**
 * Contact Form Component with Cloudflare Turnstile
 */

import React, { useState, useRef, useEffect } from 'react';
import { Form, TextInput, TextArea, Button, InlineNotification } from '@carbon/react';
import type { ContactFormData, ContactFormResponse, FormErrors } from './types';
import type { Locale } from '@shared/translations';

// Mail Worker Configuration
const MAIL_WORKER_MODE = import.meta.env.VITE_MAIL_WORKER_MODE || 'prod';
const MAIL_WORKER_ENDPOINT =
  MAIL_WORKER_MODE === 'dev'
    ? import.meta.env.VITE_MAIL_WORKER_DEV_ENDPOINT
    : import.meta.env.VITE_MAIL_WORKER_ENDPOINT;

// Turnstile Configuration
const TURNSTILE_SITE_KEY =
  MAIL_WORKER_MODE === 'dev'
    ? import.meta.env.VITE_TURNSTILE_DEV_SITE_KEY
    : import.meta.env.VITE_TURNSTILE_SITE_KEY;

interface ContactFormProps {
  locale: Locale;
  translations: {
    form: {
      title: string;
      name: { label: string; placeholder: string };
      email: { label: string; placeholder: string };
      phone: { label: string; placeholder: string };
      company: { label: string; placeholder: string };
      subject: { label: string; placeholder: string };
      message: { label: string; placeholder: string };
      submit: string;
      submitting: string;
      success: string;
      error: string;
      successTitle: string;
      errorTitle: string;
      validation: {
        nameMinLength: string;
        invalidEmail: string;
        phoneRequired: string;
        companyRequired: string;
        subjectMinLength: string;
        messageMinLength: string;
        securityCheck: string;
      };
    };
  };
}

export const ContactForm: React.FC<ContactFormProps> = ({ locale, translations: t }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    subject: '',
    message: '',
  });

  const [turnstileToken, setTurnstileToken] = useState<string>('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });

  const turnstileRef = useRef<HTMLDivElement>(null);
  const turnstileContainerRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetId = useRef<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Turnstile widget responsive scaling
  useEffect(() => {
    const TURNSTILE_WIDTH = 300; // Turnstile widget default width

    const updateScale = () => {
      if (turnstileContainerRef.current) {
        const containerWidth = turnstileContainerRef.current.offsetWidth;
        const scale = containerWidth < TURNSTILE_WIDTH ? containerWidth / TURNSTILE_WIDTH : 1;
        turnstileContainerRef.current.style.setProperty('--turnstile-scale', scale.toString());
      }
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  // Listen for Carbon Design System theme changes
  // noinspection DuplicatedCode
  useEffect(() => {
    const checkTheme = () => {
      const theme = document.documentElement.getAttribute('data-carbon-theme');
      setIsDarkMode(theme === 'g100' || theme === 'g90');
    };

    checkTheme();

    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-carbon-theme'],
    });

    return () => observer.disconnect();
  }, []);

  // Load Turnstile script
  useEffect(() => {
    const initTurnstile = () => {
      if (window.turnstile && turnstileRef.current && !turnstileWidgetId.current) {
        try {
          turnstileWidgetId.current = window.turnstile.render(turnstileRef.current, {
            sitekey: TURNSTILE_SITE_KEY,
            theme: isDarkMode ? 'dark' : 'light',
            callback: (token: string) => {
              console.log('Turnstile token received:', token ? 'Yes' : 'No');
              setTurnstileToken(token);
              setErrors((prev) => ({ ...prev, turnstile: undefined }));
            },
            'error-callback': () => {
              console.error('Turnstile error');
              setTurnstileToken('');
            },
          });
        } catch (error) {
          console.error('Turnstile render error:', error);
        }
      }
    };

    // Check if Turnstile is already loaded
    if (window.turnstile) {
      initTurnstile();
    } else {
      // Check if script already exists
      const existingScript = document.querySelector(
        'script[src*="challenges.cloudflare.com/turnstile"]'
      );

      if (!existingScript) {
        // Load script for the first time
        const script = document.createElement('script');
        script.src =
          'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoadCallback';
        script.async = true;
        script.defer = true;

        (window as any).onTurnstileLoadCallback = initTurnstile;

        document.body.appendChild(script);
      } else {
        // Script exists but not loaded yet
        (window as any).onTurnstileLoadCallback = initTurnstile;
      }
    }

    return () => {
      if (window.turnstile && turnstileWidgetId.current) {
        try {
          window.turnstile.remove(turnstileWidgetId.current);
        } catch (e) {
          console.error('Error removing turnstile:', e);
        }
        turnstileWidgetId.current = null;
      }
    };
  }, [isDarkMode]); // Re-render when theme changes

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
    // Clear error for this field
    setErrors((prev) => ({ ...prev, [id]: undefined }));
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name || formData.name.trim().length < 2) {
      newErrors.name = t.form.validation.nameMinLength;
    }

    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t.form.validation.invalidEmail;
    }

    if (!formData.phone || formData.phone.trim().length === 0) {
      newErrors.phone = t.form.validation.phoneRequired;
    }

    if (!formData.company || formData.company.trim().length === 0) {
      newErrors.company = t.form.validation.companyRequired;
    }

    if (!formData.subject || formData.subject.trim().length < 3) {
      newErrors.subject = t.form.validation.subjectMinLength;
    }

    if (!formData.message || formData.message.trim().length < 10) {
      newErrors.message = t.form.validation.messageMinLength;
    }

    if (!turnstileToken) {
      newErrors.turnstile = t.form.validation.securityCheck;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus({ type: null, message: '' });

    try {
      const payload: ContactFormData = {
        ...formData,
        turnstileToken,
        locale,
      };

      const response = await fetch(MAIL_WORKER_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result: ContactFormResponse = await response.json();

      if (response.ok && result.success) {
        setSubmitStatus({
          type: 'success',
          message: result.message || t.form.success,
        });
        // Reset form
        setFormData({
          name: '',
          email: '',
          phone: '',
          company: '',
          subject: '',
          message: '',
        });
        // Reset Turnstile
        if (window.turnstile && turnstileWidgetId.current) {
          window.turnstile.reset(turnstileWidgetId.current);
        }
        setTurnstileToken('');
      } else {
        setSubmitStatus({
          type: 'error',
          message: result.error || t.form.error,
        });
        // Reset Turnstile on error
        if (window.turnstile && turnstileWidgetId.current) {
          window.turnstile.reset(turnstileWidgetId.current);
        }
        setTurnstileToken('');
      }
    } catch (error) {
      console.error('Form submission error:', error);
      setSubmitStatus({
        type: 'error',
        message: t.form.error,
      });
      // Reset Turnstile on error
      if (window.turnstile && turnstileWidgetId.current) {
        window.turnstile.reset(turnstileWidgetId.current);
      }
      setTurnstileToken('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="contact-form">
      <h2>{t.form.title}</h2>

      {submitStatus.type && (
        <InlineNotification
          kind={submitStatus.type === 'success' ? 'success' : 'error'}
          title={submitStatus.type === 'success' ? t.form.successTitle : t.form.errorTitle}
          subtitle={submitStatus.message}
          onClose={() => setSubmitStatus({ type: null, message: '' })}
          style={{ marginBottom: '2rem' }}
        />
      )}

      <Form onSubmit={handleSubmit}>
        <TextInput
          id="name"
          labelText={t.form.name.label}
          placeholder={t.form.name.placeholder}
          value={formData.name}
          onChange={handleChange}
          invalid={!!errors.name}
          invalidText={errors.name}
          required
        />

        <TextInput
          id="email"
          labelText={t.form.email.label}
          placeholder={t.form.email.placeholder}
          type="email"
          value={formData.email}
          onChange={handleChange}
          invalid={!!errors.email}
          invalidText={errors.email}
          required
        />

        <TextInput
          id="phone"
          labelText={t.form.phone.label}
          placeholder={t.form.phone.placeholder}
          type="tel"
          value={formData.phone}
          onChange={handleChange}
          invalid={!!errors.phone}
          invalidText={errors.phone}
          required
        />

        <TextInput
          id="company"
          labelText={t.form.company.label}
          placeholder={t.form.company.placeholder}
          value={formData.company}
          onChange={handleChange}
          invalid={!!errors.company}
          invalidText={errors.company}
          required
        />

        <TextInput
          id="subject"
          labelText={t.form.subject.label}
          placeholder={t.form.subject.placeholder}
          value={formData.subject}
          onChange={handleChange}
          invalid={!!errors.subject}
          invalidText={errors.subject}
          required
        />

        <TextArea
          id="message"
          labelText={t.form.message.label}
          placeholder={t.form.message.placeholder}
          rows={6}
          value={formData.message}
          onChange={handleChange}
          invalid={!!errors.message}
          invalidText={errors.message}
          required
        />

        {/* Turnstile Widget */}
        <div
          ref={turnstileContainerRef}
          style={{
            marginTop: '1rem',
            marginBottom: '1rem',
            maxWidth: '100%',
            overflow: 'hidden',
          }}
        >
          <div
            ref={turnstileRef}
            style={{
              maxWidth: '100%',
              transform: 'scale(var(--turnstile-scale, 1))',
              transformOrigin: 'left top',
            }}
          />
          {errors.turnstile && (
            <div style={{ color: '#da1e28', fontSize: '0.75rem', marginTop: '0.5rem' }}>
              {errors.turnstile}
            </div>
          )}
        </div>

        <Button
          kind="primary"
          type="submit"
          disabled={isSubmitting || !turnstileToken}
          style={{ marginTop: '1rem' }}
        >
          {isSubmitting ? t.form.submitting : t.form.submit}
        </Button>
      </Form>
    </div>
  );
};
