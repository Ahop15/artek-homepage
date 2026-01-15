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
import React, { useState, useEffect } from 'react';

// External libraries
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';

interface GoogleMapComponentProps {
  lat: number;
  lng: number;
  zoom?: number;
  title: string;
  companyName: string;
  address: string;
  getDirectionsButtonText: string;
}

const MARKER_COLORS = {
  background: '#0f62fe',
  border: '#ffffff',
  glyph: '#ffffff',
} as const;

const POPUP_COLORS = {
  dark: {
    background: '#262626',
    text: '#f4f4f4',
    subtext: '#c6c6c6',
    border: '#393939',
    shadow: 'rgba(0, 0, 0, 0.5)',
  },
  light: {
    background: '#ffffff',
    text: '#161616',
    subtext: '#525252',
    border: '#e0e0e0',
    shadow: 'rgba(0, 0, 0, 0.2)',
  },
} as const;

const BUTTON_COLORS = {
  primary: '#0f62fe',
  primaryHover: '#0353e9',
  text: '#ffffff',
} as const;

export const GoogleMapComponent: React.FC<GoogleMapComponentProps> = ({
  lat,
  lng,
  zoom = 16,
  title,
  companyName,
  address,
  getDirectionsButtonText,
}) => {
  const [showInfo, setShowInfo] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const position = { lat, lng };

  // Listen for Carbon Design System theme changes
  // noinspection DuplicatedCode
  useEffect(() => {
    const checkTheme = () => {
      const theme = document.documentElement.getAttribute('data-carbon-theme');
      setIsDarkMode(theme === 'g100' || theme === 'g90');
    };

    checkTheme();

    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-carbon-theme'],
    });

    return () => observer.disconnect();
  }, []);

  // Add slide-up animation CSS
  useEffect(() => {
    const styleId = 'google-maps-popup-animation';
    let styleElement = document.getElementById(styleId) as HTMLStyleElement;

    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      document.head.appendChild(styleElement);

      styleElement.textContent = `
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
      `;
    }

    return () => {
      const element = document.getElementById(styleId);
      if (element) {
        element.remove();
      }
    };
  }, []);

  const handleGetDirections = () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isMac = /Macintosh/.test(navigator.userAgent);

    if (isIOS || isMac) {
      window.open(`https://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`, '_blank');
    } else {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`,
        '_blank'
      );
    }
  };

  return (
    <div style={{ width: '100%', height: '450px', borderRadius: '4px', overflow: 'hidden' }}>
      <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''}>
        <Map
          defaultCenter={position}
          defaultZoom={zoom}
          mapId={import.meta.env.VITE_GOOGLE_MAP_ID || ''}
          colorScheme={isDarkMode ? 'DARK' : 'LIGHT'}
          gestureHandling="cooperative"
          disableDefaultUI={true}
          zoomControl={true}
          fullscreenControl={false}
          streetViewControl={false}
          mapTypeControl={false}
          clickableIcons={false}
        >
          <AdvancedMarker position={position} onClick={() => setShowInfo(!showInfo)} title={title}>
            <Pin
              background={MARKER_COLORS.background}
              borderColor={MARKER_COLORS.border}
              glyphColor={MARKER_COLORS.glyph}
              scale={1.2}
            />
          </AdvancedMarker>

          {showInfo && (
            <AdvancedMarker position={position}>
              <div
                style={{
                  position: 'absolute',
                  bottom: '35px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  maxWidth: '340px',
                  minWidth: '240px',
                  backgroundColor: isDarkMode
                    ? POPUP_COLORS.dark.background
                    : POPUP_COLORS.light.background,
                  border: `1px solid ${isDarkMode ? POPUP_COLORS.dark.border : POPUP_COLORS.light.border}`,
                  borderRadius: '8px',
                  boxShadow: `0 4px 16px ${isDarkMode ? POPUP_COLORS.dark.shadow : POPUP_COLORS.light.shadow}`,
                  padding: '16px',
                  boxSizing: 'border-box',
                  zIndex: 10000000,
                  animation: 'slideUp 0.3s ease-out',
                }}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowInfo(false);
                  }}
                  style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    color: isDarkMode ? POPUP_COLORS.dark.subtext : POPUP_COLORS.light.subtext,
                    fontSize: '20px',
                    lineHeight: '1',
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = isDarkMode
                      ? POPUP_COLORS.dark.text
                      : POPUP_COLORS.light.text;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = isDarkMode
                      ? POPUP_COLORS.dark.subtext
                      : POPUP_COLORS.light.subtext;
                  }}
                  title="Kapat"
                >
                  ×
                </button>

                <h4
                  style={{
                    margin: '0 24px 12px 0',
                    fontSize: '18px',
                    fontWeight: '600',
                    color: isDarkMode ? POPUP_COLORS.dark.text : POPUP_COLORS.light.text,
                  }}
                >
                  {companyName}
                </h4>

                <p
                  style={{
                    margin: '0 0 16px 0',
                    fontSize: '14px',
                    color: isDarkMode ? POPUP_COLORS.dark.subtext : POPUP_COLORS.light.subtext,
                    lineHeight: '1.5',
                  }}
                  dangerouslySetInnerHTML={{ __html: address }}
                />

                <button
                  onClick={handleGetDirections}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    backgroundColor: BUTTON_COLORS.primary,
                    color: BUTTON_COLORS.text,
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = BUTTON_COLORS.primaryHover;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = BUTTON_COLORS.primary;
                  }}
                >
                  {getDirectionsButtonText}
                </button>

                <div
                  style={{
                    position: 'absolute',
                    bottom: '-10px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '0',
                    height: '0',
                    borderLeft: '10px solid transparent',
                    borderRight: '10px solid transparent',
                    borderTop: `10px solid ${isDarkMode ? POPUP_COLORS.dark.background : POPUP_COLORS.light.background}`,
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    bottom: '-11px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '0',
                    height: '0',
                    borderLeft: '11px solid transparent',
                    borderRight: '11px solid transparent',
                    borderTop: `11px solid ${isDarkMode ? POPUP_COLORS.dark.border : POPUP_COLORS.light.border}`,
                    zIndex: -1,
                  }}
                />
              </div>
            </AdvancedMarker>
          )}
        </Map>
      </APIProvider>
    </div>
  );
};

export default GoogleMapComponent;
