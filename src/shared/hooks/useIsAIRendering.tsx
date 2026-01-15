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
import { useState, useEffect } from 'react';

/**
 * useIsAIRendering Hook
 *
 * @returns {boolean} true if running in AI rendering mode, false otherwise
 *
 * @example
 * const MyComponent = () => {
 *   const isAIRendering = useIsAIRendering();
 *
 *   if (isAIRendering) {
 *     return <SimplifiedAIContent />;
 *   }
 *
 *   return <InteractiveComponent />;
 * };
 */
export function useIsAIRendering(): boolean {
  const [isAIRendering, setIsAIRendering] = useState(false);

  useEffect(() => {
    // Detect AI rendering via URL parameter
    const params = new URLSearchParams(window.location.search);
    const aiRendering = params.get('__airendering') === 'true';

    if (aiRendering) {
      setIsAIRendering(true);
    }
  }, []);

  return isAIRendering;
}
