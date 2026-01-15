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
import { useLocation } from 'react-router-dom';

// External libraries
import {
  HeaderNavigation as CarbonHeaderNavigation,
  HeaderMenu,
  HeaderMenuItem,
  HeaderGlobalBar,
  HeaderGlobalAction,
} from '@carbon/react';
import { Light, Asleep, RotateClockwise } from '@carbon/icons-react';

// Internal modules
import FlagIcon from '@shared/components/ui/FlagIcon';
import { useLocale } from '@shared/hooks';
import { translate } from '@shared/translations';

export interface NavigationItem {
  href?: string;
  label: string;
  children?: NavigationItem[];
  defaultExpanded?: boolean;
}

export interface SideNavContent {
  items: NavigationItem[];
}

export interface NavbarContent {
  brand: {
    shortTitle: string;
    tagline: string;
    homeLink: string;
  };
  navigation: NavigationItem[];
  theme: {
    toggleLabels: {
      light: string;
      dark: string;
    };
  };
  mobile: {
    menuLabel: string;
    menuCloseLabel: string;
  };
  accessibility: {
    skipToContent: string;
    skipToContentTarget: string;
    ariaLabels: {
      mainNavigation: string;
      mobileNavigation: string;
      themeToggle: string;
    };
  };
}

export interface HeaderContainerRenderProps {
  isSideNavExpanded: boolean;
  onClickSideNavExpand: () => void;
}

interface HeaderGlobalActionsProps {
  theme: 'white' | 'g90' | 'g100';
  toggleTheme: () => void;
  isThemeTransitioning: boolean;
  navContent: NavbarContent;
}

export const HeaderGlobalActions: React.FC<HeaderGlobalActionsProps> = ({
  theme,
  toggleTheme,
  isThemeTransitioning,
  navContent,
}) => {
  const isDark = theme !== 'white';
  const { locale, changeLocale } = useLocale();
  const t = translate(locale);

  const handleLocaleToggle = () => {
    const newLocale = locale === 'tr' ? 'en' : 'tr';
    changeLocale(newLocale);
  };

  return (
    <HeaderGlobalBar>
      <HeaderGlobalAction
        aria-label={t.language.switchTo}
        tooltipAlignment="end"
        onClick={handleLocaleToggle}
        className="language-switcher"
      >
        <span className="lang-code">{locale.toUpperCase()}</span>
        <FlagIcon locale={locale} size={16} />
      </HeaderGlobalAction>

      <HeaderGlobalAction
        aria-label={
          isDark ? navContent.theme.toggleLabels.dark : navContent.theme.toggleLabels.light
        }
        tooltipAlignment="end"
        onClick={toggleTheme}
        className={`theme-switcher ${isThemeTransitioning ? 'theme-transitioning' : ''}`}
      >
        {isThemeTransitioning ? (
          <RotateClockwise size={20} className="spinner-icon" />
        ) : isDark ? (
          <Light size={20} />
        ) : (
          <Asleep size={20} />
        )}
      </HeaderGlobalAction>
    </HeaderGlobalBar>
  );
};

interface HeaderNavigationProps {
  navContent: NavbarContent;
  disableActiveStates?: boolean;
}

export const HeaderNavigation: React.FC<HeaderNavigationProps> = ({
  navContent,
  disableActiveStates = false,
}) => {
  const location = useLocation();

  const isMenuItemActive = (href: string): boolean => {
    // Exact match for root
    if (href === '/') {
      return location.pathname === '/';
    }
    // Prefix match for other routes (e.g., /services matches /services/centers/setup)
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  return (
    <CarbonHeaderNavigation aria-label={navContent.accessibility.ariaLabels.mainNavigation}>
      {navContent.navigation.map((item) =>
        item.children ? (
          <HeaderMenu key={item.label} menuLinkName={item.label} aria-label={item.label}>
            {item.children.map((child) => (
              <HeaderMenuItem
                key={child.href}
                href={child.href}
                isActive={
                  disableActiveStates ? false : child.href ? isMenuItemActive(child.href) : false
                }
              >
                {child.label}
              </HeaderMenuItem>
            ))}
          </HeaderMenu>
        ) : (
          <HeaderMenuItem
            key={item.href}
            href={item.href}
            isActive={disableActiveStates ? false : item.href ? isMenuItemActive(item.href) : false}
          >
            {item.label}
          </HeaderMenuItem>
        )
      )}
    </CarbonHeaderNavigation>
  );
};
