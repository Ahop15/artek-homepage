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
import { useNavigate } from 'react-router-dom';

import { Button } from '@carbon/react';
import { ArrowLeft, ErrorFilled } from '@carbon/icons-react';

import { useLocale } from '@shared/hooks';
import { translate } from '@shared/translations';

import './styles/main.scss';

const ServerErrorPage: React.FC = () => {
  const navigate = useNavigate();
  const { locale } = useLocale();
  const t = translate(locale);
  return (
    <div className="error-page-container">
      <div className="error-page-content">
        <div className="error-icon-wrapper error-icon-wrapper--server">
          <ErrorFilled className="error-icon error-icon--server" />
        </div>

        <h1 className="error-code">{t.errorPages.serverError.code}</h1>
        <h2 className="error-title">{t.errorPages.serverError.title}</h2>
        <p className="error-description">{t.errorPages.serverError.description}</p>

        <div className="error-actions">
          <Button renderIcon={ArrowLeft} onClick={() => navigate('/')} size="lg">
            {t.errorPages.serverError.backHome}
          </Button>
          <Button kind="secondary" onClick={() => window.location.reload()} size="lg">
            {t.errorPages.serverError.reload}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ServerErrorPage;
