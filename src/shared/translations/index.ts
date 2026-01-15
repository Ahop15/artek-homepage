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

import translationsData from './translations.json';

/**
 * Supported locale type definition
 */
export type Locale = 'tr' | 'en';

/**
 * Default locale from translations.json
 */
export const DEFAULT_LOCALE: Locale = translationsData._default as Locale;

/**
 * UI Translations
 *
 * Loaded from translations.json with type-safe access to all translation strings.
 */
export const translations = translationsData as {
  _default: Locale;
  tr: typeof translationsData.tr;
  en: typeof translationsData.en;
};

/**
 * Returns translations for the specified locale
 *
 * @example
 * ```tsx
 * const { locale } = useLocale();
 * const t = translate(locale);
 *
 * <button onClick={handleLocaleToggle}>{t.language.switchTo}</button>
 * // Access metadata: t._meta.flag, t._meta.nativeName
 * ```
 */
export const translate = (locale: Locale) => {
  return translations[locale] || translations[DEFAULT_LOCALE];
};
