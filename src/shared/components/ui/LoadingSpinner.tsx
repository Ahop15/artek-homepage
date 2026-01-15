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
import React from 'react';

// External libraries
import { Loading } from '@carbon/react';

// Internal modules
import { useLocale } from '@shared/hooks';
import { translate } from '@shared/translations';

// Styles
import './styles/LoadingSpinner.scss';

interface LoadingSpinnerProps {
  /** Optional loading text */
  text?: string;
  /** Fullscreen mode (for route lazy loading) */
  fullscreen?: boolean;
  /** Small mode (for inline component lazy loading) */
  small?: boolean;
}

/**
 * LoadingSpinner Component
 *
 * @example
 * // Route lazy loading
 * <Suspense fallback={<LoadingSpinner fullscreen />}>
 *   <Routes />
 * </Suspense>
 *
 * @example
 * // Component lazy loading
 * <Suspense fallback={<LoadingSpinner small />}>
 *   <LazyComponent />
 * </Suspense>
 */
const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  text,
  fullscreen = false,
  small = false,
}) => {
  const { locale } = useLocale();
  const t = translate(locale);

  const loadingText =
    text || (fullscreen ? t.loadingSpinner.pageLoading : t.loadingSpinner.loading);

  if (fullscreen) {
    return (
      <div className="loading-spinner-container">
        <div className="loading-spinner-content">
          <Loading withOverlay={false} description={loadingText} className="loading-spinner-icon" />
          <p className="loading-spinner-text">{loadingText}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`loading-spinner-inline ${small ? 'loading-spinner-inline--small' : ''}`}>
      <Loading withOverlay={false} small={small} description={loadingText} />
    </div>
  );
};

export default LoadingSpinner;
