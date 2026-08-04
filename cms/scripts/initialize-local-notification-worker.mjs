import { randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { createDirectusSchemaApplier } from './apply-directus-schema.mjs';
import { createDirectusNotificationWorkerProvisioner } from './provision-notification-worker.mjs';

const environmentPath = new URL('../.env.local', import.meta.url);

function parseEnvironment(source) {
  const values = new Map();
  for (const line of source.split(/\r?\n/)) {
    const match = /^([^#=\s]+)=(.*)$/.exec(line);
    if (match) values.set(match[1], match[2]);
  }
  return values;
}

function required(values, key) {
  const value = values.get(key)?.trim();
  if (!value || value === '<REPLACE_ME>') throw new Error(`${key} must be set in cms/.env.local`);
  return value;
}

async function login(baseUrl, email, password, fetchImpl) {
  const response = await fetchImpl(new URL('/auth/login', baseUrl), {
    method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const payload = await response.json();
  if (!response.ok || !payload?.data?.access_token) throw new Error(`Unable to obtain a local Directus administrator session: ${response.status}`);
  return payload.data.access_token;
}

export async function initializeLocalNotificationWorker({ source, fetchImpl = fetch, writeEnvironment = async () => {}, randomToken = () => randomBytes(48).toString('base64url') }) {
  const values = parseEnvironment(source);
  const baseUrl = values.get('CMS_BASE_URL') || required(values, 'PUBLIC_URL');
  const adminToken = await login(baseUrl, required(values, 'ADMIN_EMAIL'), required(values, 'ADMIN_PASSWORD'), fetchImpl);
  const workerToken = values.get('CMS_NOTIFICATION_WORKER_TOKEN') || randomToken();
  const workerEmail = values.get('CMS_NOTIFICATION_WORKER_EMAIL') || 'notification-worker@ruijun.com';

  await createDirectusSchemaApplier({ baseUrl, accessToken: adminToken, fetchImpl }).apply();
  const provisioned = await createDirectusNotificationWorkerProvisioner({
    baseUrl, adminToken, serviceToken: workerToken, serviceEmail: workerEmail, fetchImpl
  }).provision();

  const updated = new Map(values);
  updated.set('CMS_BASE_URL', baseUrl);
  updated.set('CMS_NOTIFICATION_WORKER_TOKEN', workerToken);
  updated.set('CMS_NOTIFICATION_WORKER_EMAIL', workerEmail);
  const replacement = [...updated].map(([key, value]) => `${key}=${value}`).join('\n').concat('\n');
  await writeEnvironment(replacement);
  return { provisioned, generatedWorkerToken: !values.has('CMS_NOTIFICATION_WORKER_TOKEN') };
}

if (import.meta.main) {
  const source = await readFile(environmentPath, 'utf8');
  const result = await initializeLocalNotificationWorker({ source, writeEnvironment: (updated) => writeFile(environmentPath, updated, 'utf8') });
  console.log(JSON.stringify({ initialized: true, workerAccount: result.provisioned.created ? 'created' : 'updated', generatedWorkerToken: result.generatedWorkerToken }));
}
