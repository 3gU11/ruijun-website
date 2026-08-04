import { createRequire } from 'node:module';
import { access, readdir, readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';

const require = createRequire(import.meta.url);
const nativeModules = ['sqlite3', 'isolated-vm'];
const loopbackHosts = new Set(['127.0.0.1', 'localhost', '[::1]', '::1']);
const extensionsDirectory = resolve(import.meta.dirname, '../extensions');

export function normalizeLocalCmsBaseUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new TypeError('CMS_BASE_URL must be a valid HTTP URL');
  }
  if (url.protocol !== 'http:' || !loopbackHosts.has(url.hostname)) {
    throw new TypeError('CMS_BASE_URL must use a loopback HTTP endpoint');
  }
  url.pathname = '';
  url.search = '';
  url.hash = '';
  return url.toString().replace(/\/$/, '');
}

export function probeNativeModule(name) {
  try {
    require(name);
    return { name, loaded: true };
  } catch {
    return { name, loaded: false };
  }
}

export async function probeBuiltExtensions(directory = extensionsDirectory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const extensions = await Promise.all(entries.filter((entry) => entry.isDirectory()).map(async (entry) => {
    const extensionDirectory = resolve(directory, entry.name);
    const manifestPath = resolve(extensionDirectory, 'package.json');
    let manifest;
    try {
      manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    } catch {
      return null;
    }
    try {
      const outputPath = manifest?.['directus:extension']?.path;
      if (typeof outputPath !== 'string' || !outputPath) return { name: entry.name, built: false };
      const bundlePath = resolve(extensionDirectory, outputPath);
      if (!bundlePath.startsWith(`${extensionDirectory}${sep}`)) return { name: entry.name, built: false };
      await access(bundlePath);
      return { name: entry.name, built: true };
    } catch {
      return { name: entry.name, built: false };
    }
  }));
  return extensions.filter(Boolean).sort((left, right) => left.name.localeCompare(right.name));
}

export async function verifyLocalCmsRuntime({
  baseUrl = process.env.CMS_BASE_URL || 'http://127.0.0.1:8055',
  fetchImpl = fetch,
  nativeProbe = probeNativeModule,
  extensionProbe = probeBuiltExtensions
} = {}) {
  const normalizedBaseUrl = normalizeLocalCmsBaseUrl(baseUrl);
  const runtime = { nodeMajor: Number(process.versions.node.split('.')[0]), supported: Number(process.versions.node.split('.')[0]) === 22 };
  const nativeDependencies = nativeModules.map((name) => nativeProbe(name));
  let directus = { healthy: false, status: null };
  try {
    const response = await fetchImpl(`${normalizedBaseUrl}/server/health`);
    directus = { healthy: response.ok, status: response.status };
  } catch {
    // A stopped local service is a reportable readiness failure, not a reason to mutate it.
  }
  const extensionResults = await extensionProbe();
  const extensions = {
    total: extensionResults.length,
    built: extensionResults.filter((extension) => extension.built).length,
    missingBuild: extensionResults.filter((extension) => !extension.built).map((extension) => extension.name)
  };
  return {
    runtime,
    nativeModules: nativeDependencies,
    directus,
    extensions,
    ready: runtime.supported && nativeDependencies.every((module) => module.loaded) && directus.healthy && extensions.missingBuild.length === 0
  };
}

if (import.meta.main) {
  const result = await verifyLocalCmsRuntime();
  console.log(JSON.stringify(result));
  if (!result.ready) process.exitCode = 1;
}
