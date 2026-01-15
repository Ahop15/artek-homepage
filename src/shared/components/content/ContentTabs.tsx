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
import { Tabs, TabList, Tab, TabPanels, TabPanel } from '@carbon/react';

// Internal modules
import { useLocale, useIsAIRendering } from '@shared/hooks';

// Styles
import './styles/ContentTabs.scss';

interface TabItem {
  label: string;
  content: React.ComponentType<any> | any;
}

interface ContentTabsProps {
  tabs: TabItem[];
  contained?: boolean;
  className?: string;
}

/**
 * ContentTabs Component
 *
 * @example
 * <ContentTabs
 *   tabs={[
 *     { label: 'Overview', content: OverviewComponent },
 *     { label: 'Details', content: DetailsComponent }
 *   ]}
 *   contained={true}
 *   className="my-tabs"
 * />
 */
const ContentTabs: React.FC<ContentTabsProps> = ({ tabs, contained = true, className = '' }) => {
  const isAIRendering = useIsAIRendering();
  const { locale } = useLocale();

  if (!tabs || tabs.length === 0) {
    console.warn('ContentTabs: No tabs provided');
    return null;
  }

  // Pre-rendering / RAG placeholder - provides context for AI agents (render4ai, ai-worker)
  if (isAIRendering) {
    return (
      <div
        style={{
          minHeight: '200px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}
        aria-hidden="true"
      >
        {locale === 'tr'
          ? "Bu alan üzerinde sekmeli içerik bileşeni bulunmaktadır. İçerik, kullanıcı etkileşimli öğeler içerebilir ve sekmelerle birbirinden ayrılmıştır. Bu alanda farklı bileşen veya bileşen grupları bir arada bulunabilir. Bu içeriği anlamak için frontmatter'da bulunan metadata üzerinde datasets: anahtarının değerlerini okuyarak verilerin yollarını takip etmen gerekir."
          : 'This area contains a tabbed content component. The content may include interactive user elements and is separated by tabs. This area may contain different components or component groups together. To understand this content, you need to follow the paths of the data by reading the values of the datasets: key in the frontmatter metadata.'}
      </div>
    );
  }

  return (
    <div className={`content-tabs ${className}`}>
      <Tabs>
        <TabList aria-label="Content Tabs" contained={contained}>
          {tabs.map((tab, index) => (
            <Tab key={`tab-${index}`}>{tab.label}</Tab>
          ))}
        </TabList>
        <TabPanels>
          {tabs.map((tab, index) => {
            const ContentComponent = tab.content;
            return (
              <TabPanel key={`panel-${index}`}>
                <div className="content-tabs__panel">
                  <ContentComponent />
                </div>
              </TabPanel>
            );
          })}
        </TabPanels>
      </Tabs>
    </div>
  );
};

export default ContentTabs;
