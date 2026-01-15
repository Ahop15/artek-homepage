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
import React, { Suspense, lazy, useMemo } from 'react';

// External libraries
import { Grid, Column, Button } from '@carbon/react';

// Internal modules
import { useIsClient } from '@shared/hooks';

// Local components/data
import HeroVideoPlaceholder from './HeroVideoPlaceholder';

// Styles
import './styles/Hero.scss';

const HeroVideo = lazy(() => import('./HeroVideo'));

export interface HeroContent {
  title: string;
  highlight: string;
  description: string;
  primaryButton: {
    text: string;
    href: string;
    type: 'primary' | 'secondary' | 'tertiary';
  };
  secondaryButton: {
    text: string;
    href: string;
    type: 'primary' | 'secondary' | 'tertiary';
  };
  video: {
    src: string;
    poster: string;
  };
  stats: Array<{
    number: string;
    label: string;
  }>;
}

export interface HeroProps {
  content: HeroContent;
}

/**
 * Hero Component
 *
 * @example
 * ```tsx
 * <Hero content={{
 *   title: "Build the Future",
 *   highlight: "Future",
 *   description: "...",
 *   primaryButton: { text: "Get Started", href: "/start", type: "primary" },
 *   secondaryButton: { text: "Learn More", href: "/learn", type: "tertiary" },
 *   video: { src: "/video.mp4", poster: "/poster.jpg" },
 *   stats: []
 * }} />
 * ```
 */
const Hero: React.FC<HeroProps> = ({ content }) => {
  const isClient = useIsClient();

  const renderTitle = () => {
    const parts = content.title.split(content.highlight);
    return (
      <>
        {parts[0] && parts[0]}
        <span className="hero-title-gradient">{content.highlight}</span>
        {parts[1] && parts[1]}
      </>
    );
  };

  // Memoize video rendering to prevent duplicate instances and requests
  const videoElement = useMemo(() => {
    if (!isClient) {
      return <HeroVideoPlaceholder />;
    }
    return (
      <Suspense fallback={<HeroVideoPlaceholder />}>
        <HeroVideo
          video={content.video.src}
          poster={content.video.poster}
          className="hero-visual-image"
        />
      </Suspense>
    );
  }, [isClient, content.video.src, content.video.poster]);

  return (
    <section className="hero-section">
      <Grid className="hero-grid">
        {/* Single video column - repositioned via CSS for responsive layout */}
        <Column xlg={6} lg={16} md={8} sm={4} className="hero-visual-column">
          <div className="hero-visual">{videoElement}</div>
        </Column>

        <Column xlg={10} lg={16} md={8} sm={4} className="hero-content-column">
          <div className="hero-content">
            <h1 className="hero-title">{renderTitle()}</h1>
            <p className="hero-description">{content.description}</p>
            <div className="hero-actions">
              <Button size="lg" kind={content.primaryButton.type} href={content.primaryButton.href}>
                {content.primaryButton.text}
              </Button>
              <Button
                size="lg"
                kind={content.secondaryButton.type}
                href={content.secondaryButton.href}
              >
                {content.secondaryButton.text}
              </Button>
            </div>
          </div>
        </Column>
      </Grid>
    </section>
  );
};

export default Hero;
