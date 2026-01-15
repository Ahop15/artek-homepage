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

import { Theme } from '@carbon/react';

import { LocaleProvider, ThemeProvider, useTheme } from '@shared/hooks';
import { SEOProvider } from '@shared/contexts/SEOContext';

import AppRouter from './router';

const AppContent: React.FC = () => {
  const { theme } = useTheme();

  return (
    <Theme theme={theme}>
      <div className="app">
        <AppRouter />
      </div>
    </Theme>
  );
};

const App: React.FC = () => {
  return (
    <LocaleProvider>
      <ThemeProvider>
        <SEOProvider>
          <AppContent />
        </SEOProvider>
      </ThemeProvider>
    </LocaleProvider>
  );
};

export default App;
