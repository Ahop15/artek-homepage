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
import { CodeSnippet } from '@carbon/react';

// Internal modules
import SimpleTable from '@shared/components/data/SimpleTable';
import { useFootnoteNavigation } from '@shared/hooks/useFootnoteNavigation';

// Styles
import './styles/MDXComponents.scss';

const FootnoteLink: React.FC<React.AnchorHTMLAttributes<HTMLAnchorElement>> = (props) => {
  const { savePosition } = useFootnoteNavigation();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (props.href?.startsWith('#dipnot-')) {
      savePosition();
    }
    // Call original onClick if exists
    props.onClick?.(e);
  };

  return <a {...props} onClick={handleClick} />;
};
/**
 * MDXComponents Configuration
 *
 * @example
 * // In MDX files:
 * ```javascript
 * const foo = 'bar'; // Renders as CodeSnippet
 * ```
 *
 * | Header | Value | // Renders as SimpleTable/DataTable
 * | ------ | ----- |
 * | Cell   | Data  |
 */
// noinspection JSUnusedGlobalSymbols
export const components = {
  pre: (props: any) => {
    const code = props.children;
    if (code?.props?.children) {
      return <CodeSnippet type="multi">{code.props.children}</CodeSnippet>;
    }
    return <pre {...props} />;
  },
  code: (props: any) => <code {...props} />,
  table: (props: any) => <SimpleTable>{props.children}</SimpleTable>,
  a: FootnoteLink,
};
