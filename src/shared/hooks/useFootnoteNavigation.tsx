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

// React
import { useState, useCallback, createContext, useContext, ReactNode } from 'react';

interface FootnoteNavigationState {
  /** Saved scroll position before navigating to footnote */
  savedScrollY: number | null;
  /** Whether the back button should be visible */
  isVisible: boolean;
}

interface FootnoteNavigationContextValue extends FootnoteNavigationState {
  /** Save current scroll position and show back button */
  savePosition: () => void;
  /** Return to saved position and hide back button */
  returnToPosition: () => void;
  /** Clear saved position and hide back button */
  clearPosition: () => void;
}

const FootnoteNavigationContext = createContext<FootnoteNavigationContextValue | null>(null);

/**
 * FootnoteNavigationProvider Component
 *
 * @example
 * <FootnoteNavigationProvider>
 *   <App />
 * </FootnoteNavigationProvider>
 */
export const FootnoteNavigationProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<FootnoteNavigationState>({
    savedScrollY: null,
    isVisible: false,
  });

  const savePosition = useCallback(() => {
    setState({
      savedScrollY: window.scrollY,
      isVisible: true,
    });
  }, []);

  const returnToPosition = useCallback(() => {
    if (state.savedScrollY !== null) {
      window.scrollTo({
        top: state.savedScrollY,
        behavior: 'smooth',
      });

      // Clean up URL hash fragment (e.g., #dipnot-3 → clean URL)
      if (window.location.hash) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    }
    setState({
      savedScrollY: null,
      isVisible: false,
    });
  }, [state.savedScrollY]);

  const clearPosition = useCallback(() => {
    setState({
      savedScrollY: null,
      isVisible: false,
    });
  }, []);

  return (
    <FootnoteNavigationContext.Provider
      value={{
        ...state,
        savePosition,
        returnToPosition,
        clearPosition,
      }}
    >
      {children}
    </FootnoteNavigationContext.Provider>
  );
};

/**
 * useFootnoteNavigation Hook
 *
 * @example
 * const { savePosition, returnToPosition, isVisible } = useFootnoteNavigation();
 */
export const useFootnoteNavigation = (): FootnoteNavigationContextValue => {
  const context = useContext(FootnoteNavigationContext);
  if (!context) {
    throw new Error('useFootnoteNavigation must be used within FootnoteNavigationProvider');
  }
  return context;
};
