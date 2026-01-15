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
  Header,
  HeaderContainer,
  HeaderName,
  HeaderMenu,
  HeaderMenuButton,
  HeaderMenuItem,
  SkipToContent,
  SideNav,
  SideNavItems,
  HeaderSideNavItems,
} from '@carbon/react';
import { ImproveRelevance } from '@carbon/icons-react';

// Internal modules
import {
  NavbarContent,
  HeaderContainerRenderProps,
  HeaderGlobalActions,
  HeaderNavigation,
} from './HeaderGlobals';

// Styles
import './styles/AppHeader.scss';

interface AppHeaderProps {
  theme: 'white' | 'g90' | 'g100';
  toggleTheme: () => void;
  isThemeTransitioning: boolean;
  navContent: NavbarContent;
}

const AppHeader: React.FC<AppHeaderProps> = ({
  theme,
  toggleTheme,
  isThemeTransitioning,
  navContent,
}) => {
  const location = useLocation();

  const isMenuItemActive = (href: string): boolean => {
    return location.pathname === href;
  };

  return (
    <HeaderContainer
      render={({ isSideNavExpanded, onClickSideNavExpand }: HeaderContainerRenderProps) => (
        <>
          <Header aria-label={`${navContent.brand.shortTitle} ${navContent.brand.tagline}`}>
            <SkipToContent href={navContent.accessibility.skipToContentTarget}>
              {navContent.accessibility.skipToContent}
            </SkipToContent>

            <HeaderMenuButton
              aria-label={
                isSideNavExpanded ? navContent.mobile.menuCloseLabel : navContent.mobile.menuLabel
              }
              onClick={onClickSideNavExpand}
              isActive={isSideNavExpanded}
            />

            <HeaderName href={navContent.brand.homeLink} prefix="">
              <ImproveRelevance
                size={20}
                style={{ marginRight: '0.5rem', verticalAlign: 'middle' }}
              />
              {navContent.brand.shortTitle} {navContent.brand.tagline}
            </HeaderName>

            <HeaderNavigation navContent={navContent} />

            <HeaderGlobalActions
              theme={theme}
              toggleTheme={toggleTheme}
              isThemeTransitioning={isThemeTransitioning}
              navContent={navContent}
            />

            <SideNav
              aria-label={navContent.accessibility.ariaLabels.mobileNavigation}
              expanded={isSideNavExpanded}
              isPersistent={false}
              onOverlayClick={onClickSideNavExpand}
            >
              <SideNavItems>
                <HeaderSideNavItems>
                  {navContent.navigation.map((item) =>
                    item.children ? (
                      <HeaderMenu
                        key={`sidenav-${item.label}`}
                        menuLinkName={item.label}
                        aria-label={item.label}
                      >
                        {item.children.map((child) => (
                          <HeaderMenuItem
                            key={`sidenav-${child.href}`}
                            href={child.href}
                            isActive={child.href ? isMenuItemActive(child.href) : false}
                            onClick={onClickSideNavExpand}
                          >
                            {child.label}
                          </HeaderMenuItem>
                        ))}
                      </HeaderMenu>
                    ) : (
                      <HeaderMenuItem
                        key={`sidenav-${item.href}`}
                        href={item.href}
                        isActive={item.href ? isMenuItemActive(item.href) : false}
                        onClick={onClickSideNavExpand}
                      >
                        {item.label}
                      </HeaderMenuItem>
                    )
                  )}
                </HeaderSideNavItems>
              </SideNavItems>
            </SideNav>
          </Header>
        </>
      )}
    />
  );
};

export default AppHeader;
