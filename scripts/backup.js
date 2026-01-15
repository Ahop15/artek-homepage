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
 *     npm run backup
 *     node scripts/backup.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import archiver from 'archiver';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '..');
const backupsDir = path.join(projectRoot, 'backups');

if (!fs.existsSync(backupsDir)) {
  fs.mkdirSync(backupsDir, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
const outputPath = path.join(backupsDir, `backup-${timestamp}.zip`);

const output = fs.createWriteStream(outputPath);
/** @type {import('archiver').Archiver} */
const archive = archiver('zip', {
  zlib: { level: 9 },
});

output.on('close', () => {
  const sizeInMB = (archive.pointer() / 1024 / 1024).toFixed(2);
  console.log('Backup completed successfully');
  console.log(`File: ${path.basename(outputPath)}`);
  console.log(`Size: ${sizeInMB} MB`);
  console.log(`Location: ${outputPath}`);
});

archive.on('error', (err) => {
  console.error('Backup failed:', err.message);
  process.exit(1);
});

archive.on('warning', (err) => {
  if (err.code === 'ENOENT') {
    console.warn('Warning:', err.message);
  } else {
    throw err;
  }
});

archive.pipe(output);

console.log('Starting backup process');
console.log('Scanning project files');

const excludePatterns = [
  'backups',
  'node_modules',
  '.claude',
  '.idea',
  '.wrangler',
  '.playwright-mcp',
  '.venv',
  '.git',
  '.DS_Store',
  'dist',
];

archive.directory(projectRoot, '', (entry) => {
  const relativePath = path.relative(projectRoot, entry.name);
  const pathSegments = relativePath.split(path.sep);

  for (const pattern of excludePatterns) {
    // Check if pattern exists in any path segment (recursive match)
    if (pathSegments.includes(pattern)) {
      return false;
    }
  }
  return entry;
});

archive.finalize().catch((err) => {
  console.error('Archive finalization failed:', err.message);
  process.exit(1);
});
