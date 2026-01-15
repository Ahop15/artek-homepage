#!/usr/bin/env node
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
 *
 * Usage:
 *     npm run licenses:report
 *     node scripts/sanitize_licenses.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const LICENSES_FILE = path.join(PROJECT_ROOT, 'licenses.json');

function sanitizeLicenses() {
  if (!fs.existsSync(LICENSES_FILE)) {
    console.error('[ERROR] licenses.json not found');
    process.exit(1);
  }

  try {
    const licensesContent = fs.readFileSync(LICENSES_FILE, 'utf8');
    const licenses = JSON.parse(licensesContent);
    const sanitizedLicenses = {};

    // Process each package and remove absolute paths
    for (const [packageName, licenseInfo] of Object.entries(licenses)) {
      const sanitizedInfo = { ...licenseInfo };

      // Remove path field entirely (not needed for reports)
      delete sanitizedInfo.path;

      // Simplify licenseFile to just the filename
      if (sanitizedInfo.licenseFile) {
        const parts = sanitizedInfo.licenseFile.split('/');
        sanitizedInfo.licenseFile = parts[parts.length - 1] || 'LICENSE';
      }

      sanitizedLicenses[packageName] = sanitizedInfo;
    }

    // Overwrite with sanitized version
    fs.writeFileSync(LICENSES_FILE, JSON.stringify(sanitizedLicenses, null, 2), 'utf8');
    console.log('[SUCCESS] License report generated and sanitized');

  } catch (error) {
    console.error(`[ERROR] ${error.message}`);
    process.exit(1);
  }
}

sanitizeLicenses();