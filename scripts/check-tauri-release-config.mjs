import { readFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const cargoPath = resolve(root, 'src-tauri/Cargo.toml');
const frontendPackagePath = resolve(root, 'frontend/package.json');

const errors = [];
const cargoToml = await readFile(cargoPath, 'utf8');
const frontendPackage = JSON.parse(await readFile(frontendPackagePath, 'utf8'));

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

if (errors.length > 0) {
  for (const error of errors) {
    console.error(`ERROR ${error}`);
  }
  process.exitCode = 1;
} else {
  console.log(`OK ${relative(root, cargoPath)}`);
  console.log(`OK ${relative(root, frontendPackagePath)}`);
}
