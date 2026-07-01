import { readdir, readFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const cargoPath = resolve(root, 'src-tauri/Cargo.toml');
const tauriConfigPath = resolve(root, 'src-tauri/tauri.conf.json');
const dialogCapabilitiesPath = resolve(root, 'src-tauri/capabilities/dialog.json');
const eventCapabilitiesPath = resolve(root, 'src-tauri/capabilities/events.json');
const frontendPackagePath = resolve(root, 'frontend/package.json');

const errors = [];
const cargoToml = await readFile(cargoPath, 'utf8');
const tauriConfig = JSON.parse(await readFile(tauriConfigPath, 'utf8'));
const dialogCapabilities = JSON.parse(await readFile(dialogCapabilitiesPath, 'utf8'));
const eventCapabilities = JSON.parse(await readFile(eventCapabilitiesPath, 'utf8'));
const frontendPackage = JSON.parse(await readFile(frontendPackagePath, 'utf8'));
const capabilityFiles = await readdir(resolve(root, 'src-tauri/capabilities'));
const capabilities = await Promise.all(
  capabilityFiles
    .filter((file) => file.endsWith('.json'))
    .map(async (file) => ({file, content: JSON.parse(await readFile(resolve(root, 'src-tauri/capabilities', file), 'utf8'))})),
);
const forbiddenPermissionPatterns = [
  /^core:window:allow-create$/,
  /^core:window:allow-create-webview$/,
  /^core:window:allow-new$/,
  /^fs:/,
  /^shell:/,
  /^updater:/,
  /^process:/,
  /^core:app:allow-default-window-icon$/,
];

const tauriDependencyLine = cargoToml
  .split(/\r?\n/)
  .find((line) => line.trim().startsWith('tauri ='));

if (!tauriDependencyLine) {
  errors.push('src-tauri/Cargo.toml must declare the tauri dependency explicitly.');
} else if (/features\s*=\s*\[[^\]]*devtools/.test(tauriDependencyLine)) {
  errors.push('Do not enable tauri/devtools on the default tauri dependency line.');
}

if (!/^devtools\s*=\s*\["tauri\/devtools"\]/m.test(cargoToml)) {
  errors.push('src-tauri/Cargo.toml must gate DevTools behind the explicit devtools feature.');
}

const tauriBuild = frontendPackage.scripts?.['tauri:build'] ?? '';
if (/--features\s+[^&|;]*devtools/.test(tauriBuild)) {
  errors.push('frontend tauri:build must not enable the devtools feature.');
}

assertExactArray(
  tauriConfig.app?.security?.capabilities,
  ['event-capabilities', 'dialog-capabilities'],
  'src-tauri/tauri.conf.json must only enable reviewed main-window capabilities.',
);
assertNoForbiddenPermissions(capabilities);
assertExactArray(dialogCapabilities.windows, ['main'], 'dialog capabilities must only target the main window.');
assertExactArray(dialogCapabilities.permissions, ['dialog:allow-open', 'dialog:allow-save'], 'dialog capabilities must stay limited to open/save dialogs.');
assertExactArray(eventCapabilities.windows, ['main'], 'event/window capabilities must only target the main window.');
assertExactArray(
  eventCapabilities.permissions,
  [
    'core:event:allow-listen',
    'core:window:allow-start-dragging',
    'core:window:allow-minimize',
    'core:window:allow-toggle-maximize',
    'core:window:allow-is-maximized',
    'core:window:allow-close',
  ],
  'event/window capabilities must stay limited to current titlebar and event workflows.',
);

if (errors.length > 0) {
  for (const error of errors) {
    console.error(`ERROR ${error}`);
  }
  process.exitCode = 1;
} else {
  console.log(`OK ${relative(root, cargoPath)}`);
  console.log(`OK ${relative(root, tauriConfigPath)}`);
  console.log(`OK ${relative(root, dialogCapabilitiesPath)}`);
  console.log(`OK ${relative(root, eventCapabilitiesPath)}`);
  console.log(`OK ${relative(root, frontendPackagePath)}`);
}

function assertExactArray(actual, expected, message) {
  if (!Array.isArray(actual) || actual.length !== expected.length || actual.some((item, index) => item !== expected[index])) {
    errors.push(`${message} Expected [${expected.join(', ')}].`);
  }
}

function assertNoForbiddenPermissions(items) {
  for (const {file, content} of items) {
    const permissions = Array.isArray(content.permissions) ? content.permissions : [];
    const windows = Array.isArray(content.windows) ? content.windows : [];
    if (windows.some((windowName) => windowName !== 'main')) {
      errors.push(`src-tauri/capabilities/${file} must not target non-main windows in release builds.`);
    }
    for (const permission of permissions) {
      if (typeof permission === 'string' && forbiddenPermissionPatterns.some((pattern) => pattern.test(permission))) {
        errors.push(`src-tauri/capabilities/${file} uses forbidden release permission ${permission}. Document and explicitly allow it before release.`);
      }
    }
  }
}
