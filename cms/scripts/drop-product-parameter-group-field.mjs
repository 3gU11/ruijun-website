import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// One-off destructive schema migration: product_parameters no longer stores a
// group name. Schema apply never deletes fields, so this script is the explicit
// opt-in that drops the column (and every stored value) from a Directus instance.
// It is local/private-host only and defaults to a dry run.
const cmsRoot = new URL('../', import.meta.url);
const apply = process.argv.includes('--apply');

function parseEnvironment(source) {
  return Object.fromEntries(source.split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    return match ? [[match[1].trim(), match[2]]] : [];
  }));
}

function required(value, name) {
  if (!value || value === '<REPLACE_ME>') throw new Error(`${name} is required`);
  return value;
}

function isLocalOrPrivateHost(hostname) {
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') return true;
  if (/^10\./.test(hostname) || /^192\.168\./.test(hostname)) return true;
  const private172 = /^172\.(\d{1,3})\./.exec(hostname);
  return Boolean(private172 && Number(private172[1]) >= 16 && Number(private172[1]) <= 31);
}

const source = await readFile(new URL('.env.local', cmsRoot), 'utf8');
const settings = parseEnvironment(source);
const baseUrl = required(settings.CMS_BASE_URL || settings.PUBLIC_URL, 'CMS_BASE_URL');
const parsedBase = new URL(baseUrl);
if (!isLocalOrPrivateHost(parsedBase.hostname)) throw new Error('Schema migration is limited to localhost or RFC1918 private addresses');

const loginResponse = await fetch(new URL('/auth/login', baseUrl), {
  method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: required(settings.ADMIN_EMAIL, 'ADMIN_EMAIL'), password: required(settings.ADMIN_PASSWORD, 'ADMIN_PASSWORD') })
});
const loginPayload = await loginResponse.json();
if (!loginResponse.ok || !loginPayload?.data?.access_token) throw new Error(`Unable to obtain local Directus session: ${loginResponse.status}`);

const request = async (path, options = {}) => {
  const response = await fetch(new URL(path.replace(/^\//, ''), `${baseUrl.replace(/\/$/, '')}/`), {
    ...options,
    headers: { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}), Authorization: `Bearer ${loginPayload.data.access_token}` }
  });
  let payload = null;
  try { payload = await response.json(); } catch { /* Empty Directus response. */ }
  if (!response.ok) {
    const error = new Error(`${options.method || 'GET'} ${path} failed: ${payload?.errors?.[0]?.message || response.status}`);
    error.status = response.status;
    throw error;
  }
  return payload?.data;
};

let field;
try {
  field = await request('/fields/product_parameters/group_name');
} catch (error) {
  if (error.status === 404) {
    console.log(JSON.stringify({ field: 'product_parameters.group_name', exists: false, changed: false }));
    process.exit(0);
  }
  throw error;
}

const rows = await request('/items/product_parameters?filter[group_name][_nnull]=true&aggregate[count]=*').catch(() => null);
const storedValues = Number(rows?.[0]?.count ?? 0);

if (!apply) {
  console.log(JSON.stringify({
    field: 'product_parameters.group_name', exists: Boolean(field), storedValues, changed: false,
    hint: 'Re-run with --apply to delete the field and every stored group name.'
  }));
  process.exit(0);
}

// A destructive column drop must be recoverable: take a full, timestamped copy
// of product_parameters before the field (and its values) go away.
const backupRows = await request('/items/product_parameters?limit=-1&sort=id');
const backupDir = new URL('../backups/', import.meta.url);
await mkdir(backupDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupFile = new URL(`product-parameters-${stamp}.json`, backupDir);
await writeFile(backupFile, JSON.stringify({
  createdAt: new Date().toISOString(),
  baseUrl,
  field: 'product_parameters.group_name',
  rowCount: Array.isArray(backupRows) ? backupRows.length : 0,
  items: backupRows
}, null, 2), 'utf8');

await request('/fields/product_parameters/group_name', { method: 'DELETE' });
console.log(JSON.stringify({
  field: 'product_parameters.group_name', exists: false, removedValues: storedValues, changed: true,
  backup: fileURLToPath(backupFile), backupRows: Array.isArray(backupRows) ? backupRows.length : 0
}));
