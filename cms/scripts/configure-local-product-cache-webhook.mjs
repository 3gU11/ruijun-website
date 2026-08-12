import { randomBytes } from 'node:crypto';
import { readFile, rename, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

function environmentValue(source, key) {
  return new RegExp(`^${key}=(.*)$`, 'm').exec(source)?.[1]?.trim() || '';
}

function withEnvironmentValues(source, values) {
  const keys = new Set(Object.keys(values));
  const newline = source.includes('\r\n') ? '\r\n' : '\n';
  const trailingNewline = source.endsWith('\n');
  const lines = source.split(/\r?\n/).filter((line) => {
    const match = /^\s*([^#=\s]+)=/.exec(line);
    return !match || !keys.has(match[1]);
  });
  if (lines.at(-1) === '') lines.pop();
  for (const [key, value] of Object.entries(values)) lines.push(`${key}=${value}`);
  return `${lines.join(newline)}${trailingNewline ? newline : ''}`;
}

function validLocalEndpoint(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' || url.username || url.password) return false;
    if (url.pathname !== '/api/internal/v1/cms/cache-invalidate') return false;
    const host = url.hostname;
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return true;
    if (/^10\./.test(host) || /^192\.168\./.test(host)) return true;
    const match = /^172\.(\d+)\./.exec(host);
    return Boolean(match && Number(match[1]) >= 16 && Number(match[1]) <= 31);
  } catch {
    return false;
  }
}

export function buildLocalProductCacheWebhookConfiguration({
  cmsSource,
  websiteSource,
  endpoint = 'http://127.0.0.1:4173/api/internal/v1/cms/cache-invalidate',
  secret = ''
}) {
  if (!validLocalEndpoint(endpoint)) throw new TypeError('local cache invalidation endpoint must use a loopback or RFC1918 HTTP address');
  const cmsSecret = environmentValue(cmsSource, 'CMS_WEBHOOK_SECRET');
  const websiteSecret = environmentValue(websiteSource, 'CMS_WEBHOOK_SECRET');
  if (cmsSecret && websiteSecret && cmsSecret !== websiteSecret) throw new Error('CMS and website webhook secrets do not match');
  const sharedSecret = secret || cmsSecret || websiteSecret || randomBytes(32).toString('hex');
  if (!/^[a-f0-9]{64}$/i.test(sharedSecret)) throw new TypeError('CMS webhook secret must be a 32-byte hexadecimal value');
  return {
    cmsSource: withEnvironmentValues(cmsSource, {
      WEBSITE_CACHE_INVALIDATION_URL: endpoint,
      CMS_WEBHOOK_SECRET: sharedSecret,
      PRODUCT_RELEASE_CACHE_INVALIDATION_TIMEOUT_MS: '5000'
    }),
    websiteSource: withEnvironmentValues(websiteSource, { CMS_WEBHOOK_SECRET: sharedSecret })
  };
}

async function atomicWrite(path, source) {
  const temporary = `${path}.tmp-${process.pid}`;
  await writeFile(temporary, source, 'utf8');
  await rename(temporary, path);
}

if (import.meta.main) {
  const cmsEnvironmentFile = process.env.CMS_ENV_FILE || resolve(import.meta.dirname, '../.env.local');
  const websiteEnvironmentFile = process.env.WEBSITE_ENV_FILE || resolve(import.meta.dirname, '../../website/.env.local');
  const [cmsSource, websiteSource] = await Promise.all([
    readFile(cmsEnvironmentFile, 'utf8'), readFile(websiteEnvironmentFile, 'utf8')
  ]);
  const configured = buildLocalProductCacheWebhookConfiguration({
    cmsSource,
    websiteSource,
    endpoint: process.env.WEBSITE_CACHE_INVALIDATION_URL || 'http://127.0.0.1:4173/api/internal/v1/cms/cache-invalidate'
  });
  await Promise.all([
    atomicWrite(cmsEnvironmentFile, configured.cmsSource),
    atomicWrite(websiteEnvironmentFile, configured.websiteSource)
  ]);
  console.log(JSON.stringify({ cmsEnvironmentUpdated: true, websiteEnvironmentUpdated: true, secretPrinted: false }));
}
