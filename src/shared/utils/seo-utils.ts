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

import { getSiteConfig } from '@shared/config/seoConfig';

/**
 * Generate page title with site name
 *
 * @param pageTitle - Optional page-specific title
 * @param locale - Language code ('tr' or 'en')
 * @returns Formatted title with site name
 *
 * @example
 * generateTitle('İstatistikler', 'tr') // "İstatistikler | ARTEK Ar-Ge İnovasyon"
 * generateTitle(undefined, 'en') // "ARTEK - R&D Center Setup Consultancy"
 */
export const generateTitle = (pageTitle?: string, locale: 'tr' | 'en' = 'tr'): string => {
  const siteConfig = getSiteConfig(locale);
  if (!pageTitle) return siteConfig.title;
  return `${pageTitle} | ${siteConfig.name}`;
};

/**
 * Generate full URL for a path
 *
 * @param path - Optional path (e.g., "/contact", "/about")
 * @param locale - Language code ('tr' or 'en')
 * @returns Full URL with site base
 *
 * @example
 * generateUrl('/contact', 'tr') // "https://artek.tc/contact"
 * generateUrl(undefined, 'en') // "https://artek.tc"
 */
export const generateUrl = (path?: string, locale: 'tr' | 'en' = 'tr'): string => {
  const siteConfig = getSiteConfig(locale);
  if (!path) return siteConfig.url;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${siteConfig.url}${cleanPath}`;
};

/**
 * Generate full image URL
 *
 * @param imagePath - Optional image path or full URL
 * @param locale - Language code ('tr' or 'en')
 * @returns Full image URL
 *
 * @example
 * generateImageUrl('/images/hero.jpg', 'tr') // "https://artek.tc/images/hero.jpg"
 * generateImageUrl('https://cdn.example.com/image.jpg') // "https://cdn.example.com/image.jpg"
 * generateImageUrl(undefined, 'en') // "https://artek.tc/og-image.png"
 */
export const generateImageUrl = (imagePath?: string, locale: 'tr' | 'en' = 'tr'): string => {
  const siteConfig = getSiteConfig(locale);
  if (!imagePath) return `${siteConfig.url}${siteConfig.defaultImage}`;
  if (imagePath.startsWith('http')) return imagePath;
  const cleanPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
  return `${siteConfig.url}${cleanPath}`;
};
