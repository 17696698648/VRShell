import { readFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const files = [
  'package.json',
  'frontend/package.json',
  'src-tauri/tauri.conf.json',
  'src-tauri/capabilities/dialog.json',
  'src-tauri/capabilities/events.json',
];

let hasError = false;

for (const file of files) {
  const path = resolve(root, file);

  try {
    JSON.parse(await readFile(path, 'utf8'));
    console.log(`OK ${relative(root, path)}`);
  } catch (error) {
    hasError = true;
    console.error(`ERROR ${relative(root, path)}: ${error.message}`);
  }
}

if (hasError) {
  process.exitCode = 1;
}
