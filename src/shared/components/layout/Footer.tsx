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
import { Grid, Column } from '@carbon/react';

// Internal modules
import FooterLogo from './FooterLogo';
import { useLocale } from '@shared/hooks';
import { Locale } from '@shared/translations';

// Local components/data
import footerContentTr from '@content/layout/tr/footer.json';
import footerContentEn from '@content/layout/en/footer.json';

// Styles
import './styles/Footer.scss';

interface NavigationLink {
  label: string;
  href: string;
}

interface FooterContent {
  navigation: NavigationLink[];
  copyright: {
    text: string;
    additionalText: string;
  };
}

// Locale-based footer content mapping
const FOOTER_CONTENT_MAP: Record<Locale, FooterContent> = {
  tr: footerContentTr as FooterContent,
  en: footerContentEn as FooterContent,
};

const Footer: React.FC = () => {
  const { locale } = useLocale();
  const content = FOOTER_CONTENT_MAP[locale];

  return (
    <footer className="footer">
      <div className="footer-separator" />

      <Grid className="footer-grid">
        <Column xlg={4} lg={4} md={8} sm={4} className="footer-logo-column">
          <FooterLogo />
        </Column>

        <Column xlg={12} lg={12} md={8} sm={4} className="footer-content-column">
          <nav className="footer-nav" aria-label="Footer navigation">
            <ul className="footer-nav-list">
              {content.navigation.map((link, index) => (
                <li key={index} className="footer-nav-item">
                  <a href={link.href} className="footer-nav-link">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="footer-nav-separator" />

          <div className="footer-copyright">
            <p className="footer-copyright-text">{content.copyright.text}</p>
            <p
              className="footer-copyright-additional"
              dangerouslySetInnerHTML={{ __html: content.copyright.additionalText }}
            />
          </div>
        </Column>
      </Grid>
    </footer>
  );
};

export default Footer;
