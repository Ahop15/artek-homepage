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

// Internal modules
import { translate, type Locale } from '@shared/translations';

interface FlagIconProps {
  /** Locale code (tr or en) */
  locale: Locale;

  /** Icon size in pixels (default: 20) */
  size?: number;

  /** Additional CSS class */
  className?: string;
}

/**
 * FlagIcon Component
 *
 * @example
 * <FlagIcon locale="tr" size={20} />
 * <FlagIcon locale="en" size={24} />
 *
 * @note Flag paths are defined in translations metadata: t._meta.flag
 */
export const FlagIcon: React.FC<FlagIconProps> = ({ locale, size = 20, className = '' }) => {
  const t = translate(locale);

  return (
    <img
      src={t._meta.flag}
      alt={`${t._meta.nativeName} flag`}
      width={size}
      height={size}
      className={`flag-icon ${className}`.trim()}
      style={{
        display: 'block',
        objectFit: 'cover',
        borderRadius: '2px', // Slight rounding for modern look
      }}
    />
  );
};

export default FlagIcon;
