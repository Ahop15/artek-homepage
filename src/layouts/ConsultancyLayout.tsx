// noinspection DuplicatedCode
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
import React, { useMemo, useState, useEffect, Suspense, lazy } from 'react';

// External libraries
import { Content } from '@carbon/react';
import { Outlet } from 'react-router-dom';

// Internal modules
import Footer from '@shared/components/layout/Footer';
import AppHeaderSideNav from '@shared/components/layout/HeaderSideNav';
import { NavbarContent } from '@shared/components/layout/HeaderGlobals';
import { useLocale, useTheme, useIsClient, useIsAIRendering } from '@shared/hooks';
import { Locale } from '@shared/translations';

// Local data
import headerContentTr from '@content/layout/tr/header.json';
import headerContentEn from '@content/layout/en/header.json';
import { getSideNavContent } from '@pages/services/consultancy/_data/sideNav';

// Lazy load AI Chat - Code splitting for better performance
const ARTEKChatAssistant = lazy(() =>
  import('@shared/components/ai-chat').then((module) => ({
    default: module.ARTEKChatAssistant,
  }))
);

const HEADER_CONTENT_MAP: Record<Locale, NavbarContent> = {
  tr: headerContentTr as NavbarContent,
  en: headerContentEn as NavbarContent,
};

interface ConsultancyLayoutProps {
  navContent?: NavbarContent;
}

/**
 * ConsultancyLayout Component
 *
 * TR: Danışmanlık sayfaları için side navigation ve AI Chat asistan içeren layout bileşeni.
 * Header, side nav, content area, AI chat assistant ve footer içerir.
 *
 * EN: Layout component with side navigation and AI Chat assistant for consultancy pages.
 * Contains header, side nav, content area, AI chat assistant and footer.
 */
const ConsultancyLayout: React.FC<ConsultancyLayoutProps> = ({ navContent: navContentProp }) => {
  const { locale } = useLocale();
  const { theme, toggleTheme, isThemeTransitioning } = useTheme();
  const isClient = useIsClient();
  const isAIRendering = useIsAIRendering();
  const [shouldLoadChat, setShouldLoadChat] = useState(false);

  const navContent = useMemo(() => {
    return navContentProp || HEADER_CONTENT_MAP[locale];
  }, [navContentProp, locale]);

  const sideNavContent = useMemo(() => {
    return getSideNavContent(locale);
  }, [locale]);

  // This prevents Carbon AI Chat initialization issues and hydration mismatches
  useEffect(() => {
    if (!isClient || isAIRendering) return;

    const timer = setTimeout(() => {
      setShouldLoadChat(true);
    }, 2000); // 2 second delay for idle loading

    return () => clearTimeout(timer);
  }, [isClient, isAIRendering]);

  return (
    <>
      <AppHeaderSideNav
        theme={theme}
        toggleTheme={toggleTheme}
        isThemeTransitioning={isThemeTransitioning}
        sideNavContent={sideNavContent}
        navContent={navContent}
      />
      <Content id="main-content" className="main-content-with-sidenav">
        <Outlet />
      </Content>
      <Footer />

      {/* Lazy loaded AI Chat with idle loading strategy */}
      {shouldLoadChat && (
        <Suspense fallback={null}>
          <ARTEKChatAssistant />
        </Suspense>
      )}
    </>
  );
};

export default ConsultancyLayout;
