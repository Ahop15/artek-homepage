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
import { Grid, Column, Accordion, AccordionItem } from '@carbon/react';

// Styles
import './styles/Faq.scss';

export interface FaqItem {
  question: string;
  answer: string;
}

export interface FaqContent {
  badge: string;
  title: string;
  description: string;
  faqs: FaqItem[];
}

export interface FaqProps {
  content: FaqContent;
}

/**
 * Faq Component
 *
 * @example
 * ```tsx
 * <Faq content={{
 *   badge: "FAQ",
 *   title: "Frequently Asked Questions",
 *   description: "Everything you need to know",
 *   faqs: [{ question: "What is...?", answer: "It is..." }]
 * }} />
 * ```
 */
const Faq: React.FC<FaqProps> = ({ content }) => {
  return (
    <section className="faq-section" id="faq">
      <Grid className="faq-grid-container">
        <Column xlg={16} lg={16} md={8} sm={4} className="faq-header-column">
          <div className="faq-header">
            <span className="faq-badge">{content.badge}</span>
            <h2 className="faq-title">{content.title}</h2>
            <p className="faq-description">{content.description}</p>
          </div>
        </Column>

        <Column xlg={16} lg={16} md={8} sm={4} className="faq-accordion-column">
          <Accordion className="faq-accordion">
            {content.faqs.map((faq: FaqItem, index: number) => (
              <AccordionItem key={index} title={faq.question} className="faq-accordion-item">
                <p className="faq-answer">{faq.answer}</p>
              </AccordionItem>
            ))}
          </Accordion>
        </Column>
      </Grid>
    </section>
  );
};

export default Faq;
