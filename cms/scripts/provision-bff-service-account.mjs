const WEBSITE_BFF_ROLE_NAME = '官网 BFF 服务账户';

function urlFor(baseUrl, path) {
  return new URL(path.replace(/^\//, ''), `${baseUrl.replace(/\/$/, '')}/`);
}

export function createDirectusBffServiceAccountProvisioner({ baseUrl, adminToken, serviceToken, serviceEmail = 'website-bff@ruijun.com', fetchImpl = fetch }) {
  if (!baseUrl || !adminToken || !serviceToken || !serviceEmail) {
    throw new TypeError('baseUrl, adminToken, serviceToken, and serviceEmail are required');
  }
  const headers = Object.freeze({ Accept: 'application/json', Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' });

  async function request(path, options = {}) {
    const response = await fetchImpl(urlFor(baseUrl, path), { ...options, headers: { ...headers, ...options.headers } });
    let body = null;
    try {
      body = await response.json();
    } catch {
      // Directus can return an empty successful response for an update.
    }
    if (!response.ok) throw new Error(`Directus request ${options.method || 'GET'} ${path} failed: ${response.status}${body?.errors?.[0]?.message ? ` (${body.errors[0].message})` : ''}`);
    return body?.data;
  }

  return {
    async provision() {
      const roles = await request('/roles?limit=-1&fields=id,name');
      const bffRole = Array.isArray(roles) ? roles.find((role) => role.name === WEBSITE_BFF_ROLE_NAME) : null;
      if (!bffRole?.id) throw new Error('Website BFF role is unavailable; apply the CMS schema before provisioning the service account');

      const usersUrl = new URL(urlFor(baseUrl, '/users'));
      usersUrl.searchParams.set('filter[email][_eq]', serviceEmail);
      usersUrl.searchParams.set('limit', '1');
      usersUrl.searchParams.set('fields', 'id,email');
      const usersResponse = await fetchImpl(usersUrl, { method: 'GET', headers });
      if (!usersResponse.ok) throw new Error(`Directus request GET /users failed: ${usersResponse.status}`);
      const usersPayload = await usersResponse.json();
      const existing = Array.isArray(usersPayload?.data) ? usersPayload.data[0] : null;
      const payload = { role: bffRole.id, status: 'active', token: serviceToken };

      if (existing?.id) {
        await request(`/users/${encodeURIComponent(existing.id)}`, { method: 'PATCH', body: JSON.stringify(payload) });
        return { created: false, updated: true, userId: existing.id };
      }

      const created = await request('/users', { method: 'POST', body: JSON.stringify({ email: serviceEmail, ...payload }) });
      if (!created?.id) throw new Error('Directus did not return the created BFF service account id');
      return { created: true, updated: false, userId: created.id };
    }
  };
}

if (import.meta.main) {
  const result = await createDirectusBffServiceAccountProvisioner({
    baseUrl: process.env.CMS_BASE_URL,
    adminToken: process.env.CMS_ADMIN_TOKEN,
    serviceToken: process.env.CMS_BFF_TOKEN,
    serviceEmail: process.env.CMS_BFF_SERVICE_EMAIL || 'website-bff@ruijun.com'
  }).provision();
  console.log(JSON.stringify(result));
}
