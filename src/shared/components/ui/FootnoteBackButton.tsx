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
import { IconButton } from '@carbon/react';
import { ArrowUp } from '@carbon/icons-react';

// Internal modules
import { useFootnoteNavigation, useLocale } from '@shared/hooks';
import { translate } from '@shared/translations';

// Styles
import './styles/FootnoteBackButton.scss';

const FootnoteBackButton: React.FC = () => {
  const { isVisible, returnToPosition } = useFootnoteNavigation();
  const { locale } = useLocale();
  const t = translate(locale);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="footnote-back-button">
      <IconButton
        kind="secondary"
        size="lg"
        label={t.footnoteBackButton.label}
        onClick={returnToPosition}
        className="footnote-back-button__icon"
      >
        <ArrowUp size={20} />
      </IconButton>
    </div>
  );
};

export default FootnoteBackButton;
