import { readdir, readFile } from 'node:fs/promises';
import { extname, relative, resolve } from 'node:path';
import { TextDecoder } from 'node:util';

const root = resolve(import.meta.dirname, '..');
const decoder = new TextDecoder('utf-8', { fatal: true });
const ignoredDirs = new Set([
  '.git',
  '.idea',
  'node_modules',
  'dist',
  'target',
  '.vite',
]);
const checkedExtensions = new Set([
  '.css',
  '.html',
  '.js',
  '.json',
  '.md',
  '.mjs',
  '.ps1',
  '.rs',
  '.toml',
  '.ts',
  '.vue',
]);
const checkedFiles = new Set([
  '.editorconfig',
  '.gitignore',
]);

let hasError = false;
let checkedCount = 0;

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    const relativePath = relative(root, path).replaceAll('\\', '/');

    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name)) {
        await walk(path);
      }
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (!checkedFiles.has(relativePath) && !checkedExtensions.has(extname(entry.name))) {
      continue;
    }

    checkedCount += 1;
    const content = await readFile(path);

    try {
      decoder.decode(content);
    } catch (error) {
      hasError = true;
      console.error(`ERROR ${relativePath}: invalid UTF-8 (${error.message})`);
    }
  }
}

await walk(root);

if (hasError) {
  process.exitCode = 1;
} else {
  console.log(`OK UTF-8 (${checkedCount} files)`);
}
