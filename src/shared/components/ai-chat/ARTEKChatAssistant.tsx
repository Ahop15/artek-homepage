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

// External dependencies
import React, { useEffect, useRef, useState } from 'react';

import type {
  ChatInstance,
  CustomSendMessageOptions,
  MessageRequest,
  MessageResponse,
} from '@carbon/ai-chat';
import { BusEventType, ChatCustomElement, MessageResponseTypes } from '@carbon/ai-chat';

// Internal modules
import { type HistoryItem, type Message, useLocale, usePersistedChatHistory } from '@shared/hooks';
import { translate } from '@shared/translations';
import { useSEO } from '@shared/contexts/SEOContext';

// Component styles
import './styles/ARTEKChatAssistant.scss';

/**
 * ARTEK AI Sohbet Asistanı
 *
 * Model: Claude Sonnet 4 (claude-sonnet-4-20250514)
 * - Bağlam Penceresi: 200K token
 * - Gelişmiş akıl yürütme ve analiz
 * - ASL-3 güvenlik korumaları
 * - Maksimum çıktı: 8000 token
 *
 * Ortam Değişkenleri:
 * - VITE_ARTEK_AI_MODE: Mod seçimi ("prod" | "dev")
 * - VITE_ARTEK_AI_URL: Üretim proxy URL'si (mode="prod" ise kullanılır)
 * - VITE_ARTEK_AI_URL_DEV: Geliştirme proxy URL'si (mode="dev" ise kullanılır)
 *
 * Kullanım:
 * <ARTEKChatAssistant />
 *
 * ---
 *
 * ARTEK AI Chat Assistant
 *
 * Model: Claude Sonnet 4 (claude-sonnet-4-20250514)
 * - Context Window: 200K tokens
 * - Enhanced reasoning and analysis
 * - ASL-3 safety protections
 * - Max output: 8000 tokens
 *
 * Environment Variables:
 * - VITE_ARTEK_AI_MODE: Mode selection ("prod" | "dev")
 * - VITE_ARTEK_AI_URL: Production proxy URL (used when mode="prod")
 * - VITE_ARTEK_AI_URL_DEV: Development proxy URL (used when mode="dev")
 *
 * Usage:
 * <ARTEKChatAssistant />
 */

/**
 * Claude Native API response structure
 */
interface ClaudeResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: string;
  model: string;
  stop_reason: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
  metadata: {
    duration_ms: number;
    timestamp: number;
  };
}

/**
 * Error response structure from worker
 */
interface WorkerErrorResponse {
  error: {
    type: string;
    message: string;
    details?: Array<{
      field: string;
      message: string;
      value?: unknown;
    }>;
  };
  status: number;
  retryAfter?: number;
}

/**
 * Cloudflare Turnstile global API type definition
 */
declare global {
  // noinspection JSUnusedGlobalSymbols
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          'error-callback'?: () => void;
          theme?: 'light' | 'dark' | 'auto';
          size?: 'normal' | 'compact';
        }
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

const ARTEKChatAssistant: React.FC = () => {
  // Persisted chat history with localStorage
  const { historyItems, conversationHistory, addHistoryItem, clearHistory } =
    usePersistedChatHistory();

  // Tracks whether history has been loaded to prevent duplicate insertHistory calls
  const historyLoadedRef = useRef(false);

  // Turnstile bot protection
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileWidgetRef = useRef<string | null>(null);

  const { locale } = useLocale();
  const t = translate(locale);
  const { metadata: seoMetadata } = useSEO();

  const mode = import.meta.env.VITE_ARTEK_AI_MODE as 'prod' | 'dev';

  // Select Turnstile site key based on mode
  const turnstileSiteKey =
    mode === 'dev'
      ? import.meta.env.VITE_ARTEK_AI_TURNSTILE_DEV_SITE_KEY
      : import.meta.env.VITE_ARTEK_AI_TURNSTILE_SITE_KEY;

  /**
   * Parses error response from worker and creates user-friendly message
   */
  const parseErrorMessage = async (response: Response): Promise<string> => {
    try {
      const errorData: WorkerErrorResponse = await response.json();

      // Handle rate limit error (429) with retry duration
      if (errorData.status === 429 && errorData.retryAfter) {
        const seconds = errorData.retryAfter;
        return locale === 'tr'
          ? `${errorData.error.message} ${seconds} saniye sonra tekrar deneyin.`
          : `${errorData.error.message} Please try again in ${seconds} seconds.`;
      }

      // Handle validation error (400) with details as markdown table
      if (
        errorData.status === 400 &&
        errorData.error.details &&
        Array.isArray(errorData.error.details)
      ) {
        const tableHeader =
          locale === 'tr'
            ? '| Alan | Hata Mesajı |\n|------|------------|'
            : '| Field | Error Message |\n|------|---------------|';

        const tableRows = errorData.error.details
          .map((d: any) => `| ${d.field} | ${d.message} |`)
          .join('\n');

        const detailsTable = `${tableHeader}\n${tableRows}`;

        return locale === 'tr'
          ? `${errorData.error.message}\n\n**Detaylar:**\n\n${detailsTable}`
          : `${errorData.error.message}\n\n**Details:**\n\n${detailsTable}`;
      }

      // For other errors, use localized message from worker
      return errorData.error.message || t.chatAI.errors.communicating;
    } catch (parseError) {
      // Return generic message if JSON parsing fails
      console.error('[ARTEK AI] Failed to parse error response:', parseError);
      return t.chatAI.errors.communicating;
    }
  };

  // Environment variables
  const PROXY_URL_PROD = import.meta.env.VITE_ARTEK_AI_URL;
  const PROXY_URL_DEV = import.meta.env.VITE_ARTEK_AI_URL_DEV;

  // Determine endpoint based on mode
  const getEndpointConfig = () => {
    switch (mode) {
      case 'prod':
        return {
          endpoint: `${PROXY_URL_PROD}/api/v1/chat/completions`,
        };
      case 'dev':
        return {
          endpoint: `${PROXY_URL_DEV}/api/v1/chat/completions`,
        };
      default:
        throw new Error(`Invalid VITE_ARTEK_AI_MODE: ${mode}. Must be "prod" or "dev"`);
    }
  };

  const { endpoint: apiEndpoint } = getEndpointConfig();

  // Log configuration in development only
  if (import.meta.env.DEV) {
    console.log('[ARTEK AI] Configuration:', {
      mode,
      endpoint: apiEndpoint,
    });
  }

  // Carbon AI Chat string overrides from translations.yaml
  const chatStrings = {
    input_placeholder: t.chatAI.input.placeholder,
    input_buttonLabel: t.chatAI.input.buttonLabel,
    input_ariaLabel: t.chatAI.input.ariaLabel,
    input_stopResponse: t.chatAI.input.stopResponse,
    launcher_chatNow: t.chatAI.launcher.chatNow,
    launcher_isOpen: t.chatAI.launcher.isOpen,
    launcher_isClosed: t.chatAI.launcher.isClosed,
    launcher_desktopGreeting: t.chatAI.launcher.desktopGreeting,
    launcher_mobileGreeting: t.chatAI.launcher.mobileGreeting,
    launcher_closeButton: t.chatAI.launcher.closeButton,
    message_labelYou: t.chatAI.message.labelYou,
    messages_youSaid: t.chatAI.messages.youSaid,
    messages_assistantSaid: t.chatAI.messages.assistantSaid,
    messages_assistantIsLoading: t.chatAI.messages.assistantIsLoading,
    messages_responseStopped: t.chatAI.messages.responseStopped,
    errors_communicating: t.chatAI.errors.communicating,
    errors_somethingWrong: t.chatAI.errors.somethingWrong,
    errors_generalContent: t.chatAI.errors.generalContent,
    buttons_restart: t.chatAI.buttons.restart,
    buttons_cancel: t.chatAI.buttons.cancel,
    buttons_retry: t.chatAI.buttons.retry,
    feedback_positiveLabel: t.chatAI.feedback.positiveLabel,
    feedback_negativeLabel: t.chatAI.feedback.negativeLabel,
    feedback_defaultTitle: t.chatAI.feedback.defaultTitle,
    feedback_defaultPrompt: t.chatAI.feedback.defaultPrompt,
    feedback_submitLabel: t.chatAI.feedback.submitLabel,
    feedback_cancelLabel: t.chatAI.feedback.cancelLabel,
    window_ariaChatRegion: t.chatAI.window.ariaChatRegion,
    window_ariaWindowOpened: t.chatAI.window.ariaWindowOpened,
    window_ariaWindowClosed: t.chatAI.window.ariaWindowClosed,
    // AI Slug - Custom AI explanation text
    ai_slug_label: t.chatAI.aiSlug.label,
    ai_slug_title: t.chatAI.aiSlug.title,
    ai_slug_description: t.chatAI.aiSlug.description,
    // Table - Localized table strings
    table_filterPlaceholder: t.chatAI.table.filterPlaceholder,
    table_previousPage: t.chatAI.table.previousPage,
    table_nextPage: t.chatAI.table.nextPage,
    table_itemsPerPage: t.chatAI.table.itemsPerPage,
    table_paginationSupplementalText: t.chatAI.table.paginationSupplementalText,
    table_paginationStatus: t.chatAI.table.paginationStatus,
  };

  /**
   * Initialize Turnstile widget in invisible mode
   * Auto-refreshes on each message send (single-use token)
   */
  useEffect(() => {
    // Initialize Turnstile widget
    const initTurnstile = () => {
      if (!window.turnstile || !turnstileSiteKey) {
        if (import.meta.env.DEV) {
          console.warn('[ARTEK AI] Turnstile not ready yet');
        }
        return;
      }

      // Create hidden container div with aggressive inline styles
      // This prevents Turnstile iframe from overlaying the page on mobile devices
      const container = document.createElement('div');
      container.style.display = 'none';
      document.body.appendChild(container);

      // Render Turnstile widget
      turnstileWidgetRef.current = window.turnstile.render(container, {
        sitekey: turnstileSiteKey,
        callback: (token: string) => {
          setTurnstileToken(token);
          if (import.meta.env.DEV) {
            console.log('[ARTEK AI] Turnstile token received');
          }
        },
        'error-callback': () => {
          setTurnstileToken(null);
          console.error('[ARTEK AI] Turnstile verification failed');
        },
      });

      if (import.meta.env.DEV) {
        console.log('[ARTEK AI] Turnstile widget initialized (invisible mode)');
      }

      // Cleanup function
      return () => {
        if (turnstileWidgetRef.current && window.turnstile) {
          window.turnstile.remove(turnstileWidgetRef.current);
        }
        container.remove();
      };
    };

    // Load Turnstile script dynamically
    if (window.turnstile) {
      // Script already loaded
      initTurnstile();
    } else {
      // Check if script exists
      const existingScript = document.querySelector(
        'script[src*="challenges.cloudflare.com/turnstile"]'
      );

      if (!existingScript) {
        // Load for the first time
        const script = document.createElement('script');
        script.src =
          'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoadCallbackAI&render=explicit';
        script.async = true;
        script.defer = true;

        (window as any).onTurnstileLoadCallbackAI = initTurnstile;

        document.body.appendChild(script);
      } else {
        // Script exists but not loaded yet
        (window as any).onTurnstileLoadCallbackAI = initTurnstile;
      }
    }

    return () => {
      if (turnstileWidgetRef.current && window.turnstile) {
        try {
          window.turnstile.remove(turnstileWidgetRef.current);
        } catch (e) {
          console.error('[ARTEK AI] Error removing Turnstile widget:', e);
        }
        turnstileWidgetRef.current = null;
      }
    };
  }, [turnstileSiteKey]);

  /**
   * Handle ChatInstance ready event
   * Called once when Carbon AI Chat component is initialized via onAfterRender
   * Loads conversation history from localStorage into Carbon UI
   * Shows welcome message on first visit
   * Sets up restart conversation event listener
   */
  const handleChatReady = async (instance: ChatInstance) => {
    // Already processed
    if (historyLoadedRef.current) return;

    // Register restart conversation event listener
    instance.on({
      type: BusEventType.RESTART_CONVERSATION,
      handler: async () => {
        // Clear localStorage when conversation is restarted
        clearHistory();

        // Reset history loaded flag to allow re-initialization
        historyLoadedRef.current = false;

        // Show welcome message after restart
        const welcomeMessage: MessageResponse = {
          id: crypto.randomUUID(),
          output: {
            generic: [
              {
                response_type: MessageResponseTypes.TEXT,
                text: t.chatAI.welcomeMessage,
              },
            ],
          },
        };

        await instance.messaging.addMessage(welcomeMessage);

        if (import.meta.env.DEV) {
          console.log('[ARTEK AI] Conversation restarted, localStorage cleared');
        }
      },
    });

    try {
      // Check if there's existing history
      if (historyItems.length > 0) {
        // Load existing conversation history
        await instance.messaging.insertHistory(historyItems);
        historyLoadedRef.current = true;

        if (import.meta.env.DEV) {
          console.log('[ARTEK AI] Chat history loaded into UI:', historyItems.length, 'items');
          console.log('[ARTEK AI] API context loaded:', conversationHistory.length, 'messages');
        }
      } else {
        // Show welcome message on first visit
        const welcomeMessage: MessageResponse = {
          id: crypto.randomUUID(),
          output: {
            generic: [
              {
                response_type: MessageResponseTypes.TEXT,
                text: t.chatAI.welcomeMessage,
              },
            ],
          },
        };

        await instance.messaging.addMessage(welcomeMessage);
        historyLoadedRef.current = true;

        if (import.meta.env.DEV) {
          console.log('[ARTEK AI] Welcome message displayed');
        }
      }
    } catch (error) {
      console.error('[ARTEK AI] Failed to initialize chat:', error);
    }
  };

  /**
   * Custom message handler called when user sends a message
   * This is the proper Carbon AI Chat way to handle messaging
   */
  const customSendMessage = async (
    request: MessageRequest,
    options: CustomSendMessageOptions,
    instance: ChatInstance
  ): Promise<void> => {
    try {
      // Extract user message text
      const userMessage = request.input.text || '';

      // Validate user message
      if (!userMessage.trim()) {
        console.warn('Empty message received, skipping API call');
        return;
      }

      // Add current page location to message for Claude context
      const currentPath = seoMetadata.path || window.location.pathname;
      const contextPrefix = `<current-location>${currentPath}</current-location>`;

      const messageWithContext = `${contextPrefix}\n\n${userMessage}`;

      // Save user message to history (both UI and API format)
      const userHistoryItem: HistoryItem = {
        message: request,
        time: new Date().toISOString(),
      };
      const userApiMessage: Message = {
        role: 'user',
        content: messageWithContext,
      };
      addHistoryItem(userHistoryItem, userApiMessage);

      // Build updated API conversation context
      const updatedHistory: Message[] = [...conversationHistory, userApiMessage];

      // Build request headers
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      // Check Turnstile token availability
      if (!turnstileToken) {
        const errorMessage =
          locale === 'tr'
            ? 'Güvenlik doğrulaması bekleniyor. Lütfen bir kaç saniye bekleyin.'
            : 'Security verification pending. Please wait a few seconds.';

        const errorResponse: MessageResponse = {
          id: crypto.randomUUID(),
          output: {
            generic: [
              {
                response_type: MessageResponseTypes.TEXT,
                text: errorMessage,
              },
            ],
          },
        };

        await instance.messaging.addMessage(errorResponse);
        return;
      }

      // Call AI API
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          messages: updatedHistory,
          stream: false,
          max_tokens: 4096,
          temperature: 0.7,
          locale: locale,
          turnstileToken: turnstileToken,
        }),
        signal: options.signal,
      });

      // Reset Turnstile token after use
      if (turnstileWidgetRef.current && window.turnstile) {
        window.turnstile.reset(turnstileWidgetRef.current);
      }

      if (!response.ok) {
        console.error(`API Error: ${response.status} ${response.statusText}`);

        // Parse error message from worker (localized and detailed)
        const errorMessage = await parseErrorMessage(response);

        // Add error message with markdown support
        const errorResponse: MessageResponse = {
          id: crypto.randomUUID(),
          output: {
            generic: [
              {
                response_type: MessageResponseTypes.TEXT,
                text: errorMessage,
              },
            ],
          },
        };

        await instance.messaging.addMessage(errorResponse);
        return;
      }

      const data: ClaudeResponse = await response.json();

      // Extract assistant message from Claude response
      const assistantMessage = data.content || '';

      if (!assistantMessage) {
        console.error('Empty response from AI');
      }

      // Log debug information in development
      if (import.meta.env.DEV) {
        console.log('[ARTEK AI] Claude Response:', {
          id: data.id,
          model: data.model,
          tokens: data.usage,
          duration_ms: data.metadata.duration_ms,
        });
      }

      // Create AI response for Carbon UI
      const aiResponse: MessageResponse = {
        id: crypto.randomUUID(),
        output: {
          generic: [
            {
              response_type: MessageResponseTypes.TEXT,
              text: assistantMessage,
            },
          ],
        },
      };

      // Save assistant message to history (both UI and API format)
      const assistantHistoryItem: HistoryItem = {
        message: aiResponse,
        time: new Date().toISOString(),
      };
      const assistantApiMessage: Message = {
        role: 'assistant',
        content: assistantMessage,
      };
      addHistoryItem(assistantHistoryItem, assistantApiMessage);

      // Add AI response to chat UI
      await instance.messaging.addMessage(aiResponse);
    } catch (error) {
      console.error('AI API Error:', error);

      // Add localized error message
      const errorResponse: MessageResponse = {
        id: crypto.randomUUID(),
        output: {
          generic: [
            {
              response_type: MessageResponseTypes.TEXT,
              text: t.chatAI.errors.generalContent,
            },
          ],
        },
      };

      await instance.messaging.addMessage(errorResponse);
    }
  };

  return (
    <ChatCustomElement
      className="artek-chat-container"
      debug={false}
      aiEnabled={true}
      // Carbon AI Chat only supports specific locales, tr not included
      locale="en"
      assistantName={t.chatAI.assistantName}
      strings={chatStrings}
      header={{
        title: t.chatAI.header.title,
        showAiLabel: true,
        showRestartButton: true,
      }}
      launcher={{
        isOn: true,
      }}
      messaging={{
        customSendMessage,
        skipWelcome: true,
      }}
      onAfterRender={handleChatReady}
    />
  );
};

export default ARTEKChatAssistant;
