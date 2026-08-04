export class WebsiteBffUnavailable extends Error {
  constructor(cause) {
    super('Website lead BFF is unavailable', { cause });
    this.name = 'WebsiteBffUnavailable';
  }
}

export function createWebsiteBffLeadClient({ baseUrl, fetchImpl = fetch }) {
  if (!baseUrl) throw new TypeError('baseUrl is required');
  const endpoint = new URL('/api/public/v1/leads', baseUrl);

  return {
    async submit(payload) {
      try {
        const response = await fetchImpl(endpoint, {
          method: 'POST',
          headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const body = await response.json();
        if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('BFF response is invalid');
        return { status: response.status, body };
      } catch (error) {
        throw new WebsiteBffUnavailable(error);
      }
    }
  };
}
