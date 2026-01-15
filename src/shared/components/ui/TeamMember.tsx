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
import { Grid, Column, Tile } from '@carbon/react';

// Shared modules
import { useLocale } from '@shared/hooks';
import { translate } from '@shared/translations';

// Styles
import './styles/TeamMember.scss';

export interface SocialLink {
  text: string;
  url: string;
}

export interface TeamMemberProps {
  name: string;
  title: string;
  image: string;
  links?: SocialLink[];
}

/**
 * TeamMember Component
 *
 * @example
 * ```tsx
 * <TeamMember
 *   name="John Doe"
 *   title="Senior Software Engineer"
 *   image="/assets/team/john-doe.jpg"
 *   links={[
 *     { text: "LinkedIn", url: "https://linkedin.com/in/johndoe" },
 *     { text: "Github", url: "https://github.com/johndoe" }
 *   ]}
 * />
 * ```
 */
const TeamMember: React.FC<TeamMemberProps> = ({ name, title, image, links = [] }) => {
  const { locale } = useLocale();
  const t = translate(locale);

  return (
    <Tile className="team-member">
      <Grid className="team-member-grid">
        <Column xlg={2} lg={2} md={2} sm={4} className="team-member-image-column">
          <div className="team-member-image-wrapper">
            <img
              src={image}
              alt={t.teamMember.imageAlt.replace('{name}', name)}
              className="team-member-image"
            />
          </div>
        </Column>

        <Column xlg={14} lg={14} md={6} sm={4} className="team-member-info-column">
          <div className="team-member-info">
            <h3>{name}</h3>
            <h4>{title}</h4>

            {links.length > 0 && (
              <div className="team-member-links" aria-label={t.teamMember.socialLinks}>
                {links.map((link, index) => (
                  <a
                    key={index}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="team-member-link"
                  >
                    {link.text}
                  </a>
                ))}
              </div>
            )}
          </div>
        </Column>
      </Grid>
    </Tile>
  );
};

export default TeamMember;
