import { readBody, setResponseStatus } from 'h3';
import { createServiceEntryClick } from '~/shared/service-exit.mjs';
import { CmsServiceEntryClickStoreUnavailable, createCmsServiceEntryClickStore } from '../../../services/cms-service-entry-click-store.mjs';

export default defineEventHandler(async (event) => {
  let payload;
  try { payload = await readBody(event); } catch { payload = null; }
  const click = createServiceEntryClick(payload?.entryType, payload?.sourcePath);
  if (!click) {
    setResponseStatus(event, 400);
    return { code: 'INVALID_SERVICE_ENTRY_CLICK' };
  }

  const config = useRuntimeConfig(event);
  const endpoint = String(config.cmsServiceEntryClicksUrl || '');
  const accessToken = String(config.cmsBffToken || '');
  if (!endpoint || !accessToken) return { accepted: false, stored: false };

  try {
    return { accepted: true, ...(await createCmsServiceEntryClickStore({ endpoint, accessToken }).create(click)) };
  } catch (error) {
    if (error instanceof CmsServiceEntryClickStoreUnavailable) {
      setResponseStatus(event, 503);
      return { code: 'SERVICE_ENTRY_CLICK_STORE_UNAVAILABLE' };
    }
    throw error;
  }
});
