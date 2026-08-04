import { randomBytes } from 'node:crypto';
import { readFile, rename, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createDirectusBffServiceAccountProvisioner } from './provision-bff-service-account.mjs';

const privateBffKeys = new Set([
  'CMS_WRITE_TOKEN', 'NUXT_CMS_WRITE_TOKEN', 'CMS_BFF_TOKEN', 'NUXT_CMS_BFF_TOKEN',
  'LEAD_DEDUPE_SECRET', 'NUXT_LEAD_DEDUPE_SECRET', 'CMS_LEAD_DEDUPE_KEYS_URL', 'NUXT_CMS_LEAD_DEDUPE_KEYS_URL',
  'CMS_WEBHOOK_SECRET', 'NUXT_CMS_WEBHOOK_SECRET',
  'CMS_SERVICE_RESOURCES_URL', 'NUXT_CMS_SERVICE_RESOURCES_URL', 'CMS_SERVICE_LOCATIONS_URL', 'NUXT_CMS_SERVICE_LOCATIONS_URL',
  'CMS_MILESTONES_URL', 'NUXT_CMS_MILESTONES_URL', 'CMS_QUALIFICATIONS_URL', 'NUXT_CMS_QUALIFICATIONS_URL',
  'CMS_MANUFACTURING_EVIDENCE_URL', 'NUXT_CMS_MANUFACTURING_EVIDENCE_URL', 'CMS_MEDIA_ASSETS_URL', 'NUXT_CMS_MEDIA_ASSETS_URL',
  'CMS_SERVICE_ENTRY_CLICKS_URL', 'NUXT_CMS_SERVICE_ENTRY_CLICKS_URL'
]);

export function buildBffEnvironment(source, serviceToken, dedupeSecret, webhookSecret) {
  if (!serviceToken || !dedupeSecret || !webhookSecret) throw new TypeError('serviceToken, dedupeSecret, and webhookSecret are required');
  const pagesUrl = /^\s*CMS_PAGES_URL=(.+)$/m.exec(source)?.[1]?.trim();
  if (!pagesUrl) throw new Error('CMS_PAGES_URL is required to configure the lead dedupe endpoint');
  const collectionUrl = (collection) => {
    const url = new URL(pagesUrl);
    url.pathname = `/items/${collection}`;
    url.search = '';
    return url.toString();
  };
  const dedupeUrl = collectionUrl('lead_dedupe_keys');
  const resourcesUrl = collectionUrl('service_resources');
  const locationsUrl = collectionUrl('service_locations');
  const milestonesUrl = collectionUrl('milestones');
  const qualificationsUrl = collectionUrl('qualifications');
  const manufacturingEvidenceUrl = collectionUrl('manufacturing_evidence');
  const mediaAssetsUrl = collectionUrl('media_assets');
  const serviceEntryClicksUrl = collectionUrl('service_entry_clicks');
  const newline = source.includes('\r\n') ? '\r\n' : '\n';
  const trailingNewline = source.endsWith('\n');
  const lines = source.split(/\r?\n/).filter((line) => {
    const match = /^\s*([^#=\s]+)=/.exec(line);
    return !match || !privateBffKeys.has(match[1]);
  });
  if (lines.at(-1) === '') lines.pop();
  lines.push(`CMS_BFF_TOKEN=${serviceToken}`);
  lines.push(`NUXT_CMS_BFF_TOKEN=${serviceToken}`);
  lines.push(`LEAD_DEDUPE_SECRET=${dedupeSecret}`);
  lines.push(`NUXT_LEAD_DEDUPE_SECRET=${dedupeSecret}`);
  lines.push(`CMS_LEAD_DEDUPE_KEYS_URL=${dedupeUrl}`);
  lines.push(`NUXT_CMS_LEAD_DEDUPE_KEYS_URL=${dedupeUrl}`);
  lines.push(`CMS_SERVICE_RESOURCES_URL=${resourcesUrl}`);
  lines.push(`NUXT_CMS_SERVICE_RESOURCES_URL=${resourcesUrl}`);
  lines.push(`CMS_SERVICE_LOCATIONS_URL=${locationsUrl}`);
  lines.push(`NUXT_CMS_SERVICE_LOCATIONS_URL=${locationsUrl}`);
  lines.push(`CMS_MILESTONES_URL=${milestonesUrl}`);
  lines.push(`NUXT_CMS_MILESTONES_URL=${milestonesUrl}`);
  lines.push(`CMS_QUALIFICATIONS_URL=${qualificationsUrl}`);
  lines.push(`NUXT_CMS_QUALIFICATIONS_URL=${qualificationsUrl}`);
  lines.push(`CMS_MANUFACTURING_EVIDENCE_URL=${manufacturingEvidenceUrl}`);
  lines.push(`NUXT_CMS_MANUFACTURING_EVIDENCE_URL=${manufacturingEvidenceUrl}`);
  lines.push(`CMS_MEDIA_ASSETS_URL=${mediaAssetsUrl}`);
  lines.push(`NUXT_CMS_MEDIA_ASSETS_URL=${mediaAssetsUrl}`);
  lines.push(`CMS_SERVICE_ENTRY_CLICKS_URL=${serviceEntryClicksUrl}`);
  lines.push(`NUXT_CMS_SERVICE_ENTRY_CLICKS_URL=${serviceEntryClicksUrl}`);
  lines.push(`CMS_WEBHOOK_SECRET=${webhookSecret}`);
  lines.push(`NUXT_CMS_WEBHOOK_SECRET=${webhookSecret}`);
  return `${lines.join(newline)}${trailingNewline ? newline : ''}`;
}

export async function configureLocalBffToken({ baseUrl, adminToken, serviceEmail, serviceToken, dedupeSecret, webhookSecret, environmentFile, fetchImpl = fetch }) {
  if (!environmentFile) throw new TypeError('environmentFile is required');
  const token = serviceToken || randomBytes(32).toString('hex');
  const secret = dedupeSecret || randomBytes(32).toString('hex');
  const webhook = webhookSecret || randomBytes(32).toString('hex');
  const provisioned = await createDirectusBffServiceAccountProvisioner({
    baseUrl, adminToken, serviceToken: token, serviceEmail, fetchImpl
  }).provision();
  const current = await readFile(environmentFile, 'utf8');
  const next = buildBffEnvironment(current, token, secret, webhook);
  const temporaryFile = `${environmentFile}.tmp-${process.pid}`;
  await writeFile(temporaryFile, next, 'utf8');
  await rename(temporaryFile, environmentFile);
  return { ...provisioned, environmentUpdated: true };
}

if (import.meta.main) {
  const environmentFile = process.env.WEBSITE_ENV_FILE || resolve(import.meta.dirname, '../../website/.env.local');
  const result = await configureLocalBffToken({
    baseUrl: process.env.CMS_BASE_URL,
    adminToken: process.env.CMS_ADMIN_TOKEN,
    serviceEmail: process.env.CMS_BFF_SERVICE_EMAIL || 'website-bff@ruijun.com',
    serviceToken: process.env.CMS_BFF_TOKEN || '',
    dedupeSecret: process.env.LEAD_DEDUPE_SECRET || '',
    webhookSecret: process.env.CMS_WEBHOOK_SECRET || '',
    environmentFile
  });
  console.log(JSON.stringify(result));
}
