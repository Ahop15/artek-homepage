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
import { SkeletonPlaceholder, Column, Grid } from '@carbon/react';

// Styles
import './styles/ChartLoader.scss';

interface ChartLoaderProps {
  height?: string;
}

export const ChartLoader: React.FC<ChartLoaderProps> = ({ height = '600px' }) => {
  const topHeight = 48; // px
  const bottomHeight = 48; // px
  const contentHeight = `calc(${height} - ${topHeight + bottomHeight}px)`;

  return (
    <Grid className="chart-loader-grid-container">
      <Column className="chart-loader-grid-column" sm={4} md={8} lg={16}>
        <SkeletonPlaceholder style={{ width: '100%', height: topHeight }} />
      </Column>
      <Column className="chart-loader-grid-column" sm={4} md={8} lg={16}>
        <SkeletonPlaceholder style={{ width: '100%', height: contentHeight }} />
      </Column>
      <Column className="chart-loader-grid-column" sm={4} md={8} lg={16}>
        <SkeletonPlaceholder style={{ width: '100%', height: bottomHeight }} />
      </Column>
    </Grid>
  );
};

export default ChartLoader;
