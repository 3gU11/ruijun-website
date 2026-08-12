import { cp, mkdir, readdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const websiteRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(websiteRoot, '../demo/assets');
const destination = resolve(websiteRoot, 'public/assets');

async function main() {
  const entries = await readdir(source, { withFileTypes: true });
  await mkdir(destination, { recursive: true });
  await Promise.all(entries.map(async (entry) => {
    const from = resolve(source, entry.name);
    const to = resolve(destination, entry.name);
    await cp(from, to, { recursive: entry.isDirectory(), force: true });
  }));
}

await main();
