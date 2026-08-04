export class CmsServiceEntryClickStoreUnavailable extends Error {
  constructor(cause) {
    super('CMS service entry click store is unavailable', { cause });
    this.name = 'CmsServiceEntryClickStoreUnavailable';
  }
}

export function createCmsServiceEntryClickStore({ endpoint, accessToken, fetchImpl = fetch }) {
  if (!endpoint || !accessToken) throw new TypeError('endpoint and accessToken are required');
  const headers = { Accept: 'application/json', Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

  return {
    async create(click) {
      try {
        const response = await fetchImpl(endpoint, {
          method: 'POST', headers,
          body: JSON.stringify({ entry_type: click.entryType, source_page: click.sourcePath })
        });
        if (!response.ok) throw new Error(`CMS responded ${response.status}`);
        return { stored: true };
      } catch (error) {
        throw new CmsServiceEntryClickStoreUnavailable(error);
      }
    }
  };
}
