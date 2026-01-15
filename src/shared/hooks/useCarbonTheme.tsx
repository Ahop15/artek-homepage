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
import { useState, useEffect, useCallback } from 'react';

export type CarbonTheme = 'white' | 'g90' | 'g100';

/**
 * useCarbonTheme Hook
 *
 * @returns {CarbonTheme} Current theme: 'white' (light), 'g90' (dark), 'g100' (darker)
 *
 * @example
 * const MyComponent = () => {
 *   const theme = useCarbonTheme();
 *   const isDark = theme !== 'white';
 *
 *   return <div>Current theme: {theme}</div>;
 * };
 */
export const useCarbonTheme = (): CarbonTheme => {
  const getCurrentTheme = useCallback((): CarbonTheme => {
    const carbonTheme = document.documentElement.getAttribute('data-carbon-theme');
    return (carbonTheme as CarbonTheme) || 'white';
  }, []);

  const [currentTheme, setCurrentTheme] = useState<CarbonTheme>(getCurrentTheme());

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setCurrentTheme(getCurrentTheme());
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-carbon-theme'],
    });

    return () => observer.disconnect();
  }, [getCurrentTheme]);

  return currentTheme;
};
