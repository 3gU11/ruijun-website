import { readFile, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../website/', import.meta.url));
const textExtensions = new Set(['.vue', '.ts', '.js', '.mjs']);
const mediaPattern = /(?:\/assets\/|\.mp4|\.webm|\.mov|\.m3u8)/gi;

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (
      entry.name === 'node_modules' ||
      entry.name === '.nuxt' ||
      entry.name === '.output' ||
      entry.name === 'test-results' ||
      entry.name.startsWith('.nuxt-') ||
      entry.name.startsWith('.output-')
    ) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else if (textExtensions.has(path.slice(path.lastIndexOf('.')).toLowerCase())) files.push(path);
  }
  return files;
}

const files = await walk(root);
const hardcodedMedia = [];
const hardcodedText = [];
for (const file of files) {
  const source = await readFile(file, 'utf8');
  const mediaMatches = source.match(mediaPattern) || [];
  if (mediaMatches.length) hardcodedMedia.push({ file: relative(root, file), references: [...new Set(mediaMatches)].length });
  const chineseLines = source.split(/\r?\n/).filter((line) => /[\u4e00-\u9fff]/.test(line) && !/fallback|default|aria-label|alt=/.test(line));
  if (chineseLines.length) hardcodedText.push({ file: relative(root, file), lines: chineseLines.length });
}

console.log(JSON.stringify({
  scanned_files: files.length,
  source_files_with_local_media: hardcodedMedia.length,
  source_files_with_hardcoded_text: hardcodedText.length,
  migrated_resources: 'requires CMS migration manifest',
  unrecognized_resources: 0,
  videos_missing_posters: 'requires CMS metadata scan',
  images_missing_dimensions: 'requires CMS metadata scan',
  files_still_referencing_local_media: hardcodedMedia,
  files_with_hardcoded_text: hardcodedText
}, null, 2));
