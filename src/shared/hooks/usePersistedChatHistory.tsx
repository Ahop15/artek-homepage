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

import { useState, useEffect } from 'react';

import type { MessageRequest, MessageResponse } from '@carbon/ai-chat';

export interface HistoryItem {
  message: MessageRequest | MessageResponse;
  time: string; // ISO format
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * LocalStorage configuration
 */
const HISTORY_STORAGE_KEY = 'artek-ai-chat-history-items'; // Carbon UI format
const API_STORAGE_KEY = 'artek-ai-chat-api-context'; // API format
const MAX_MESSAGES = 50; // Maximum number of messages to store

/**
 * Return type for usePersistedChatHistory hook
 */
export interface UsePersistedChatHistoryReturn {
  /** Carbon AI Chat history items for UI */
  historyItems: HistoryItem[];
  /** API conversation messages */
  conversationHistory: Message[];
  /** Add new history item (for both UI and API) */
  addHistoryItem: (item: HistoryItem, apiMessage: Message) => void;
  /** Clear all history */
  clearHistory: () => void;
}

/**
 * @example
 * ```tsx
 * const { historyItems, conversationHistory, addHistoryItem, clearHistory } = usePersistedChatHistory();
 * ```
 */
export const usePersistedChatHistory = (): UsePersistedChatHistoryReturn => {
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [conversationHistory, setConversationHistory] = useState<Message[]>([]);

  // Load from localStorage on mount (client-side only)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      // Load Carbon UI history
      const storedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (storedHistory) {
        const parsed = JSON.parse(storedHistory) as HistoryItem[];
        if (Array.isArray(parsed)) {
          setHistoryItems(parsed);
        }
      }

      // Load API context
      const storedApi = localStorage.getItem(API_STORAGE_KEY);
      if (storedApi) {
        const parsed = JSON.parse(storedApi) as Message[];
        if (Array.isArray(parsed)) {
          setConversationHistory(parsed);
        }
      }

      if (import.meta.env.DEV && (storedHistory || storedApi)) {
        console.log('[ARTEK AI] Loaded chat history from localStorage');
      }
    } catch (error) {
      console.error('[ARTEK AI] Failed to load chat history:', error);
      // TR: Bozuk veriyi temizle | EN: Clear corrupted data
      try {
        localStorage.removeItem(HISTORY_STORAGE_KEY);
        localStorage.removeItem(API_STORAGE_KEY);
      } catch (removeError) {
        console.error('[ARTEK AI] Failed to clear corrupted data:', removeError);
      }
    }
  }, []);

  // Save Carbon UI history to localStorage
  useEffect(() => {
    if (typeof window === 'undefined' || historyItems.length === 0) return;

    try {
      const limited = historyItems.slice(-MAX_MESSAGES);
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(limited));

      if (import.meta.env.DEV) {
        console.log('[ARTEK AI] Saved UI history:', limited.length, 'items');
      }
    } catch (error) {
      console.error('[ARTEK AI] Failed to save UI history:', error);
    }
  }, [historyItems]);

  // Save API context to localStorage
  useEffect(() => {
    if (typeof window === 'undefined' || conversationHistory.length === 0) return;

    try {
      const limited = conversationHistory.slice(-MAX_MESSAGES);
      localStorage.setItem(API_STORAGE_KEY, JSON.stringify(limited));

      if (import.meta.env.DEV) {
        console.log('[ARTEK AI] Saved API context:', limited.length, 'messages');
      }
    } catch (error) {
      console.error('[ARTEK AI] Failed to save API context:', error);
    }
  }, [conversationHistory]);

  /**
   * Add new history item (both UI and API format)
   */
  const addHistoryItem = (item: HistoryItem, apiMessage: Message) => {
    setHistoryItems((prev) => [...prev, item]);
    setConversationHistory((prev) => [...prev, apiMessage]);
  };

  /**
   * Clear all history
   */
  const clearHistory = () => {
    setHistoryItems([]);
    setConversationHistory([]);

    if (typeof window === 'undefined') return;

    try {
      localStorage.removeItem(HISTORY_STORAGE_KEY);
      localStorage.removeItem(API_STORAGE_KEY);

      if (import.meta.env.DEV) {
        console.log('[ARTEK AI] Cleared all chat history');
      }
    } catch (error) {
      console.error('[ARTEK AI] Failed to clear localStorage:', error);
    }
  };

  return {
    historyItems,
    conversationHistory,
    addHistoryItem,
    clearHistory,
  };
};
