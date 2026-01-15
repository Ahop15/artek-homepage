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

// External libraries - Carbon React
import { Grid, Column, Tile, Button } from '@carbon/react';

// External libraries - Carbon Icons
import {
  Rocket,
  Education,
  Report,
  Enterprise,
  Devices,
  DataAnalytics,
  Checkmark,
} from '@carbon/icons-react';

// Styles
import './styles/Services.scss';

export interface Service {
  title: string;
  description: string;
  icon: string;
  features: string[];
  link: {
    text: string;
    href: string;
  };
}

export interface ServicesContent {
  badge: string;
  title: string;
  description: string;
  services: Service[];
}

export interface ServicesProps {
  content: ServicesContent;
}

// Icon mapping
const iconMap: { [key: string]: React.ComponentType<any> } = {
  rocket: Rocket,
  'clipboard-list': Report,
  'graduation-cap': Education,
  building: Enterprise,
  devices: Devices,
  'brain-circuit': DataAnalytics,
};

const Services: React.FC<ServicesProps> = ({ content }) => {
  const getIcon = (iconName: string) => {
    const IconComponent = iconMap[iconName] || Rocket;
    return <IconComponent size={32} />;
  };

  return (
    <section className="services-section" id="services">
      <Grid className="services-grid-container">
        <Column xlg={16} lg={16} md={8} sm={4} className="services-header-column">
          <div className="services-header">
            <span className="services-badge">{content.badge}</span>
            <h2 className="services-title">{content.title}</h2>
            <p className="services-description">{content.description}</p>
          </div>
        </Column>

        {content.services.map((service: Service, index: number) => (
          <Column key={index} xlg={5} lg={5} md={4} sm={4} className="service-card-column">
            <Tile className="service-card">
              <div className="service-icon">{getIcon(service.icon)}</div>

              <h3 className="service-title">{service.title}</h3>
              <p className="service-description">{service.description}</p>

              <ul className="service-features">
                {service.features.map((feature: string, idx: number) => (
                  <li key={idx} className="service-feature-item">
                    <Checkmark size={16} className="service-feature-icon" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="service-button-wrapper">
                <Button kind="tertiary" size="md" href={service.link.href}>
                  {service.link.text}
                </Button>
              </div>
            </Tile>
          </Column>
        ))}
      </Grid>
    </section>
  );
};

export default Services;
