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
  SideNavMenu,
  SideNavMenuItem,
  SideNavLink,
} from '@carbon/react';
import { ImproveRelevance } from '@carbon/icons-react';

// Internal modules
import {
  NavbarContent,
  HeaderContainerRenderProps,
  HeaderGlobalActions,
  HeaderNavigation,
  SideNavContent,
} from './HeaderGlobals';

// Styles
import './styles/AppHeader.scss';

interface AppHeaderSideNavProps {
  theme: 'white' | 'g90' | 'g100';
  toggleTheme: () => void;
  isThemeTransitioning: boolean;
  sideNavContent: SideNavContent;
  navContent: NavbarContent;
}

const AppHeaderSideNav: React.FC<AppHeaderSideNavProps> = ({
  theme,
  toggleTheme,
  isThemeTransitioning,
  sideNavContent,
  navContent,
}) => {
  const location = useLocation();

  const isMenuItemActive = (href: string): boolean => {
    return location.pathname === href;
  };

  const isMenuItemActivePrefix = (href: string): boolean => {
    if (href === '/') {
      return location.pathname === '/';
    }
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  const hasActiveChild = (item: any): boolean => {
    if (item.href && isMenuItemActive(item.href)) {
      return true;
    }
    if (item.children) {
      return item.children.some((child: any) => hasActiveChild(child));
    }
    return false;
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
              aria-label="Side navigation"
              expanded={isSideNavExpanded}
              onSideNavBlur={onClickSideNavExpand}
              href="#main-content"
            >
              <SideNavItems>
                <HeaderSideNavItems hasDivider={true}>
                  {navContent.navigation.map((item) =>
                    item.children ? (
                      <HeaderMenu
                        key={item.label}
                        aria-label={item.label}
                        menuLinkName={item.label}
                      >
                        {item.children.map((child) => (
                          <HeaderMenuItem
                            key={child.href}
                            href={child.href}
                            isActive={child.href ? isMenuItemActivePrefix(child.href) : false}
                          >
                            {child.label}
                          </HeaderMenuItem>
                        ))}
                      </HeaderMenu>
                    ) : (
                      <HeaderMenuItem
                        key={item.href}
                        href={item.href}
                        isActive={item.href ? isMenuItemActivePrefix(item.href) : false}
                      >
                        {item.label}
                      </HeaderMenuItem>
                    )
                  )}
                </HeaderSideNavItems>

                {sideNavContent.items.map((item) =>
                  item.children ? (
                    <SideNavMenu
                      key={item.label}
                      title={item.label}
                      defaultExpanded={item.defaultExpanded}
                      isActive={hasActiveChild(item)}
                      tabIndex={0}
                    >
                      {item.children.map((child) =>
                        child.children ? (
                          <SideNavMenu
                            key={child.label}
                            title={child.label}
                            defaultExpanded={child.defaultExpanded}
                            isActive={hasActiveChild(child)}
                            tabIndex={0}
                          >
                            {child.children.map((grandchild) => (
                              <SideNavMenuItem
                                key={grandchild.href}
                                href={grandchild.href}
                                aria-current={
                                  grandchild.href && isMenuItemActive(grandchild.href)
                                    ? 'page'
                                    : undefined
                                }
                              >
                                {grandchild.label}
                              </SideNavMenuItem>
                            ))}
                          </SideNavMenu>
                        ) : (
                          <SideNavMenuItem
                            key={child.href}
                            href={child.href}
                            aria-current={
                              child.href && isMenuItemActive(child.href) ? 'page' : undefined
                            }
                          >
                            {child.label}
                          </SideNavMenuItem>
                        )
                      )}
                    </SideNavMenu>
                  ) : (
                    <SideNavLink
                      key={item.href}
                      href={item.href}
                      isActive={item.href ? isMenuItemActive(item.href) : false}
                    >
                      {item.label}
                    </SideNavLink>
                  )
                )}
              </SideNavItems>
            </SideNav>
          </Header>
        </>
      )}
    />
  );
};

export default AppHeaderSideNav;
