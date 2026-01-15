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
import { FootnoteNavigationProvider } from '@shared/hooks';
import FootnoteBackButton from '@shared/components/ui/FootnoteBackButton';

// Local components
import MDXProvider from './MDXProvider';

// Styles
import '@shared/styles/mdx.scss';

interface MDXPageRendererProps {
  content: React.ComponentType;
  className?: string;
}

/**
 * MDXPageRenderer Component
 *
 * @example
 * import AboutMDX from '@content/about.mdx';
 *
 * <MDXPageRenderer
 *   content={AboutMDX}
 *   className="about-page"
 * />
 */
const MDXPageRenderer: React.FC<MDXPageRendererProps> = ({ content: Content, className = '' }) => {
  return (
    <FootnoteNavigationProvider>
      <section className={`mdx-page ${className}`}>
        <Grid>
          <Column lg={16} md={8} sm={4}>
            <MDXProvider>
              <article className="mdx-content">
                <Content />
              </article>
            </MDXProvider>
          </Column>
        </Grid>
      </section>
      <FootnoteBackButton />
    </FootnoteNavigationProvider>
  );
};

export default MDXPageRenderer;
