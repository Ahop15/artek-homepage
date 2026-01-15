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
 *     node scripts/generate_development_certificate.js
 *
 * Output:
 *     certs/cert.pem - SSL certificate
 *     certs/key.pem  - Private key
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');
const CERTS_DIR = join(PROJECT_ROOT, 'certs');

const log = {
  info: (msg) => console.log(`\x1b[36m[CERT]\x1b[0m ${msg}`),
  success: (msg) => console.log(`\x1b[32m[CERT]\x1b[0m ${msg}`),
  error: (msg) => console.error(`\x1b[31m[CERT]\x1b[0m ${msg}`),
};

function main() {
  try {
    log.info('Generating development SSL certificates...');
    log.info('='.repeat(60));

    // Create certs directory
    if (!existsSync(CERTS_DIR)) {
      mkdirSync(CERTS_DIR, { recursive: true });
      log.info('Created certs/ directory');
    }

    // Generate certificate with OpenSSL
    const certPath = join(CERTS_DIR, 'cert.pem');
    const keyPath = join(CERTS_DIR, 'key.pem');

    const opensslCommand = [
      'openssl req -x509',
      '-newkey rsa:2048',
      `-keyout ${keyPath}`,
      `-out ${certPath}`,
      '-days 730',
      '-nodes',
      '-subj "/CN=www.artek.tc/O=ARTEK/C=TR"',
      '-addext "subjectAltName=DNS:www.artek.tc,DNS:artek.tc,DNS:localhost,IP:127.0.0.1"',
    ].join(' ');

    log.info('Generating certificate with OpenSSL...');
    execSync(opensslCommand, { cwd: PROJECT_ROOT, stdio: 'pipe' });

    log.success('Certificate generated successfully!');
    log.info('='.repeat(60));
    log.info('Files created:');
    log.info(`  - ${certPath}`);
    log.info(`  - ${keyPath}`);
    log.info('='.repeat(60));
    log.info('To trust this certificate on macOS:');
    log.info(
      `  sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain ${certPath}`
    );
    log.info('='.repeat(60));
  } catch (error) {
    log.error(`Failed to generate certificate: ${error.message}`);
    process.exit(1);
  }
}

main();
