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

import React from 'react';

import { MisuseOutline } from '@carbon/icons-react';

import { useLocale } from '@shared/hooks';
import { translate } from '@shared/translations';

import './styles/main.scss';

interface GenericErrorPageProps {
  error?: unknown;
}

const GenericErrorPage: React.FC<GenericErrorPageProps> = ({ error }) => {
  const { locale } = useLocale();
  const t = translate(locale);
  const getErrorMessage = (): string => {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    return t.errorPages.generic.defaultMessage;
  };
  return (
    <div className="error-page-container">
      <div className="error-page-content">
        <div className="error-icon-wrapper">
          <MisuseOutline className="error-icon" />
        </div>

        <h1 className="error-code">{t.errorPages.generic.code}</h1>
        <h2 className="error-title">{t.errorPages.generic.title}</h2>
        <p className="error-description">{getErrorMessage()}</p>

        {process.env.NODE_ENV === 'development' && error instanceof Error && (
          <details className="error-details">
            <summary>{t.errorPages.generic.technicalDetails}</summary>
            <pre className="error-stack">{error.stack}</pre>
          </details>
        )}
        <div className="error-actions"></div>
      </div>
    </div>
  );
};

export default GenericErrorPage;
