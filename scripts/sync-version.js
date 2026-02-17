#!/usr/bin/env node

/**
 * Sync version from package.json to appinfo.json
 * This ensures version is managed in one place (package.json)
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const rootDir = join(__dirname, '..');
const packageJsonPath = join(rootDir, 'package.json');
const appinfoJsonPath = join(rootDir, 'public', 'appinfo.json');

try {
  // Read package.json
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  const version = packageJson.version;

  if (!version) {
    console.error('❌ Error: No version found in package.json');
    process.exit(1);
  }

  // Read appinfo.json
  const appinfo = JSON.parse(readFileSync(appinfoJsonPath, 'utf8'));

  // Update version
  const oldVersion = appinfo.version;
  appinfo.version = version;

  // Write back to appinfo.json
  writeFileSync(appinfoJsonPath, `${JSON.stringify(appinfo, null, 2)}\n`, 'utf8');

  if (oldVersion !== version) {
    console.log(`✅ Version synced: ${oldVersion} → ${version}`);
  } else {
    console.log(`✅ Version already in sync: ${version}`);
  }
} catch (error) {
  console.error('❌ Error syncing version:', error.message);
  process.exit(1);
}
