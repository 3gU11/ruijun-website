import { buildSiteSettingsDraft } from './site-settings-drafts.mjs';

export function createDirectusSiteSettingsSeeder({ baseUrl, accessToken, fetchImpl = fetch }) {
  if (!baseUrl || !accessToken) throw new TypeError('baseUrl and accessToken are required');
  const collectionUrl = new URL('items/site_settings', `${baseUrl.replace(/\/$/, '')}/`);
  const headers = { Accept: 'application/json', Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

  return {
    async seed() {
      const draft = buildSiteSettingsDraft();
      const lookupUrl = new URL(collectionUrl);
      lookupUrl.searchParams.set('filter[setting_key][_eq]', draft.setting_key);
      lookupUrl.searchParams.set('limit', '1');
      lookupUrl.searchParams.set('fields', 'id');
      const lookupResponse = await fetchImpl(lookupUrl, { method: 'GET', headers });
      if (!lookupResponse.ok) throw new Error(`Unable to query site settings: ${lookupResponse.status}`);
      const lookup = await lookupResponse.json();
      const existingId = Array.isArray(lookup?.data) ? lookup.data[0]?.id : null;
      const writeUrl = existingId ? new URL(`${collectionUrl.pathname}/${existingId}`, `${baseUrl.replace(/\/$/, '')}/`) : collectionUrl;
      const writeResponse = await fetchImpl(writeUrl, {
        method: existingId ? 'PATCH' : 'POST', headers, body: JSON.stringify(draft)
      });
      if (!writeResponse.ok) throw new Error(`Unable to write site settings: ${writeResponse.status}`);
      return { created: existingId ? 0 : 1, updated: existingId ? 1 : 0 };
    }
  };
}
