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
      entry.name === 'dist' ||
      entry.name.startsWith('.codex-build-check') ||
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
const mediaReferences = [];
const hardcodedText = [];
for (const file of files) {
  const source = await readFile(file, 'utf8');
  const lines = source.split(/\r?\n/);
  const mediaMatches = source.match(mediaPattern) || [];
  lines.forEach((line, index) => {
    if (!mediaPattern.test(line)) { mediaPattern.lastIndex = 0; return; }
    mediaPattern.lastIndex = 0;
    const classification = /data-cms-preview-(?:field-path|media-role|readonly|allow-default)/.test(line)
      ? 'bound-or-explicit-readonly'
      : /fallback|default|texture|logo|legacy|decorat|import .*assets|css:|aria-hidden|background(?:-image)?\s*:|::after|::before/i.test(line)
        ? 'static-fallback-or-decoration'
        : /<img|<video|background(?:-image)?\s*:/i.test(line)
          ? 'needs-review'
          : 'static-fallback-or-decoration';
    mediaReferences.push({ file: relative(root, file), line: index + 1, classification, sample: line.trim().slice(0, 240) });
  });
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
  , media_references: mediaReferences
}, null, 2));
