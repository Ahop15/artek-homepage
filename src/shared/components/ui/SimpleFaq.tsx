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
import React, { useState, useMemo } from 'react';

// External libraries
import { Grid, Column, Accordion, AccordionItem, PaginationNav } from '@carbon/react';

// Internal modules
import { useLocale, useIsAIRendering } from '@shared/hooks';

// Styles
import './styles/SimpleFaq.scss';

export interface SimpleFaqItem {
  question: string;
  answer: string;
}

export interface SimpleFaqProps {
  content: SimpleFaqItem[];
}

const SimpleFaq: React.FC<SimpleFaqProps> = ({ content }) => {
  const isAIRendering = useIsAIRendering();
  const { locale } = useLocale();
  const PAGE_SIZE = 10;

  const [currentPage, setCurrentPage] = useState(0); // PaginationNav 0-indexed kullanır

  const totalPages = useMemo(() => {
    return Math.ceil(content.length / PAGE_SIZE);
  }, [content.length]);

  const paginatedFaqs = useMemo(() => {
    const startIndex = currentPage * PAGE_SIZE;
    const endIndex = startIndex + PAGE_SIZE;
    return content.slice(startIndex, endIndex);
  }, [content, currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  if (isAIRendering) {
    return (
      <Grid>
        <Column xlg={16} lg={16} md={8} sm={4}>
          <div
            style={{
              minHeight: '300px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
            }}
            aria-hidden="true"
          >
            {locale === 'tr'
              ? `Bu alan üzerinde ${content.length} adet soru-cevap içeren SSS (Sıkça Sorulan Sorular) bileşeni bulunmaktadır. Bu bileşenin içerdiği verinin tam yolu frontmatter'da bulunan metadata üzerinde datasets: anahtarının değerleridir. Bu alandaki içeriği anlamak için datasets: alanındaki verilerin yollarını takip etmen gerekir.`
              : `This area contains a FAQ (Frequently Asked Questions) component with ${content.length} questions and answers. The full path to the data contained in this component is the values of the datasets: key in the frontmatter metadata. To understand the content in this area, you need to follow the paths of the data in the datasets: field.`}
          </div>
        </Column>
      </Grid>
    );
  }

  return (
    <Grid>
      <Column xlg={16} lg={16} md={8} sm={4}>
        <div className="simple-faq-accordion-wrapper">
          <Accordion className="simple-faq-accordion">
            {paginatedFaqs.map((faq: SimpleFaqItem, index: number) => (
              <AccordionItem key={index} title={faq.question} className="simple-faq-accordion-item">
                <p>{faq.answer}</p>
              </AccordionItem>
            ))}
          </Accordion>

          {content.length > PAGE_SIZE && (
            <div className="simple-faq-pagination">
              <PaginationNav
                itemsShown={5}
                totalItems={totalPages}
                page={currentPage}
                onChange={handlePageChange}
                className="simple-faq-pagination"
              />
            </div>
          )}
        </div>
      </Column>
    </Grid>
  );
};

export default SimpleFaq;
