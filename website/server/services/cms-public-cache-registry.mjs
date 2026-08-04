const registryKey = Symbol.for('ruijun.cms.public-cache-clearers');

function registry() {
  if (!globalThis[registryKey]) globalThis[registryKey] = new Map();
  return globalThis[registryKey];
}

export function registerCmsPublicCache(name, clear) {
  if (!name || typeof clear !== 'function') throw new TypeError('name and clear callback are required');
  const entries = registry();
  entries.set(name, clear);
  return () => {
    if (entries.get(name) === clear) entries.delete(name);
  };
}

export function getCmsPublicCacheClearers() {
  return Object.fromEntries(registry());
}
