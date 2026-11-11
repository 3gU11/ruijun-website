import { mkdir, readFile, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const env = {};
for (const line of (await readFile(new URL('.env.local', root), 'utf8')).split(/\r?\n/)) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2];
}
const cms = String(env.CMS_BASE_URL || 'http://127.0.0.1:8055').replace(/\/$/, '');
const codes = ['fr-y1080', 'fr-g', '新机型-1', '新机型-6', '新机型-7', '新机型-8', '测试-1', '新机型-5'];
const apply = process.argv.includes('--apply');

const login = await fetch(`${cms}/auth/login`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD })
}).then((response) => response.json());
const auth = { Authorization: `Bearer ${login.data.access_token}`, 'Content-Type': 'application/json' };
const get = (path) => fetch(`${cms}${path}`, { headers: auth }).then((response) => response.json());
const parameters = (await get('/items/product_parameters?limit=-1&fields=*')).data
  .filter((row) => codes.includes(String(row.model_code || '')));
const models = (await get('/items/product_models?limit=-1&fields=*')).data
  .filter((row) => codes.includes(String(row.model_code || '')));
const seriesCodes = [...new Set(models.map((row) => String(row.series_code || '')).filter(Boolean))];
const series = (await get('/items/product_series?limit=-1&fields=*')).data
  .filter((row) => seriesCodes.includes(String(row.series_code || '')));
const submissions = (await get('/items/content_submissions?limit=-1&fields=*')).data
  .filter((row) => Array.isArray(row.items) && row.items.some((item) => item.collection === 'product_models'
    && models.some((model) => String(model.id) === String(item.id))));

const backup = {
  created_at: new Date().toISOString(),
  reason: '删除无法批准发布的测试草稿前备份',
  models,
  parameters,
  series,
  submissions
};
await mkdir(new URL('backups/', root), { recursive: true });
const file = new URL(`backups/test-drafts-${backup.created_at.replace(/[:.]/g, '-')}.json`, root);
await writeFile(file, JSON.stringify(backup, null, 2), 'utf8');
console.log(JSON.stringify({ file: file.pathname, models: models.length, parameters: parameters.length, submissions: submissions.length, apply }));

if (!apply) process.exit(0);

for (const row of parameters) {
  await fetch(`${cms}/items/product_parameters/${encodeURIComponent(row.id)}`, { method: 'DELETE', headers: auth });
}
for (const row of submissions) {
  await fetch(`${cms}/items/content_submissions/${encodeURIComponent(row.id)}`, { method: 'DELETE', headers: auth });
}
for (const row of models) {
  const response = await fetch(`${cms}/items/product_models/${encodeURIComponent(row.id)}`, { method: 'DELETE', headers: auth });
  if (!response.ok) console.log('delete failed', row.model_code, response.status, (await response.text()).slice(0, 200));
}
console.log(JSON.stringify({ deletedModels: models.length, deletedParameters: parameters.length, deletedSubmissions: submissions.length }));
