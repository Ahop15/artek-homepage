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
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  ReactNode,
} from 'react';

export type AppTheme = 'white' | 'g90';

interface ThemeContextValue {
  theme: AppTheme;
  changeTheme: (newTheme: AppTheme) => void;
  toggleTheme: () => void;
  isThemeTransitioning: boolean;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const VALID_THEMES: AppTheme[] = ['white', 'g90'];
const DEFAULT_THEME: AppTheme = 'white';

/**
 * ThemeProvider Component
 *
 * @note Theme values: 'white' (light mode), 'g90' (dark mode)
 * @note Cookie: preferred_theme with 1 year max-age, SameSite=Lax
 * @note CRITICAL: data-carbon-theme attribute sync required by useCarbonTheme hook
 * @note toggleTheme has 800ms cooldown to prevent rapid theme changes
 *
 * @example
 * <ThemeProvider>
 *   <App />
 * </ThemeProvider>
 */
export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<AppTheme>(() => {
    try {
      // 1. URL parameter (pre-rendering control)
      const urlTheme = new URLSearchParams(window.location.search).get('theme');
      if (urlTheme && VALID_THEMES.includes(urlTheme as AppTheme)) {
        return urlTheme as AppTheme;
      }

      // 2. Cookie (user explicit choice - persistent)
      const cookieTheme = document.cookie.match(/preferred_theme=(white|g90)/)?.[1];
      if (cookieTheme && VALID_THEMES.includes(cookieTheme as AppTheme)) {
        return cookieTheme as AppTheme;
      }

      // 3. HTML data-carbon-theme attribute (server/worker decision)
      const htmlTheme = document.documentElement.getAttribute('data-carbon-theme');
      if (htmlTheme && VALID_THEMES.includes(htmlTheme as AppTheme)) {
        return htmlTheme as AppTheme;
      }

      // 4. Default
      return DEFAULT_THEME;
    } catch {
      return DEFAULT_THEME;
    }
  });

  const [isThemeTransitioning, setIsThemeTransitioning] = useState(false);

  const changeTheme = useCallback((newTheme: AppTheme) => {
    if (!VALID_THEMES.includes(newTheme)) return;

    setTheme(newTheme);

    try {
      // Update localStorage
      // localStorage.setItem('carbon-theme', newTheme);

      // Update cookie (for Cloudflare Worker)
      document.cookie = `preferred_theme=${newTheme}; path=/; max-age=31536000; SameSite=Lax`;

      // Update DOM attribute (CRITICAL - useCarbonTheme depends on this!)
      document.documentElement.setAttribute('data-carbon-theme', newTheme);
    } catch (error) {
      console.warn('Failed to persist theme:', error);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    if (isThemeTransitioning) return;

    setIsThemeTransitioning(true);

    // Existing toggle logic: white ↔ g90 (MUST PRESERVE)
    const newTheme = theme === 'white' ? 'g90' : 'white';
    changeTheme(newTheme);

    // Transition cooldown (existing behavior - 800ms)
    setTimeout(() => {
      setIsThemeTransitioning(false);
    }, 800);
  }, [theme, isThemeTransitioning, changeTheme]);

  // Sync DOM attribute on theme change (CRITICAL - useCarbonTheme relies on this!)
  useEffect(() => {
    document.documentElement.setAttribute('data-carbon-theme', theme);
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      changeTheme,
      toggleTheme,
      isThemeTransitioning,
    }),
    [theme, changeTheme, toggleTheme, isThemeTransitioning]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

/**
 * useTheme Hook
 *
 * @returns {ThemeContextValue} Object with theme, changeTheme, toggleTheme, isThemeTransitioning
 * @throws {Error} If used outside ThemeProvider
 *
 * @example
 * const MyComponent = () => {
 *   const { theme, changeTheme, toggleTheme, isThemeTransitioning } = useTheme();
 *
 *   return (
 *     <div>
 *       <button onClick={() => changeTheme('g90')}>Dark Mode</button>
 *       <button onClick={toggleTheme} disabled={isThemeTransitioning}>
 *         Toggle Theme
 *       </button>
 *       <p>Current: {theme}</p>
 *     </div>
 *   );
 * };
 */
export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }

  return context;
};
