import { readdir, readFile } from 'node:fs/promises';
import { resolve, relative, sep } from 'node:path';
import { buildKnowledgeDrafts, createDirectusKnowledgeSeeder } from '../import/knowledge-drafts.mjs';

async function csvFiles(root) {
  const entries = await readdir(root, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = resolve(root, entry.name);
    if (entry.isDirectory()) files.push(...await csvFiles(path));
    if (entry.isFile() && entry.name.toLowerCase().endsWith('.csv')) files.push(path);
  }
  return files;
}

async function loadSources(sourceDirectory) {
  const root = resolve(sourceDirectory);
  const files = await csvFiles(root);
  return Promise.all(files.map(async (path) => {
    const pathFromRoot = relative(root, path);
    if (!pathFromRoot || pathFromRoot.startsWith(`..${sep}`)) throw new Error('FAQ source path escaped the configured directory');
    return { sourcePath: pathFromRoot.replaceAll('\\', '/'), content: await readFile(path, 'utf8') };
  }));
}

if (import.meta.main) {
  const sourceDirectory = process.env.FAQ_KNOWLEDGE_SOURCE_DIR;
  const baseUrl = process.env.CMS_BASE_URL;
  const accessToken = process.env.CMS_WRITE_TOKEN;
  if (!sourceDirectory || !baseUrl || !accessToken) {
    throw new Error('FAQ_KNOWLEDGE_SOURCE_DIR, CMS_BASE_URL, and CMS_WRITE_TOKEN are required');
  }
  const drafts = buildKnowledgeDrafts(await loadSources(sourceDirectory));
  const result = await createDirectusKnowledgeSeeder({ baseUrl, accessToken }).seed(drafts);
  console.log(JSON.stringify({ ...result, drafts: drafts.length }, null, 2));
}
