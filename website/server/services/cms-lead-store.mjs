export class CmsLeadStoreUnavailable extends Error {
  constructor(cause) {
    super('CMS lead store is unavailable', { cause });
    this.name = 'CmsLeadStoreUnavailable';
  }
}

export class CmsLeadAttachmentInvalid extends Error {
  constructor(message) {
    super(message);
    this.name = 'CmsLeadAttachmentInvalid';
  }
}

export function createCmsLeadStore({ endpoint, dedupeKeysEndpoint, dedupeSecret, notificationJobsEndpoint, attachmentStore, accessToken, now = () => new Date(), fetchImpl = fetch }) {
  if (!endpoint || !dedupeKeysEndpoint || !dedupeSecret || !accessToken) throw new TypeError('endpoint, dedupeKeysEndpoint, dedupeSecret, and accessToken are required');
  const headers = { Accept: 'application/json', Authorization: `Bearer ${accessToken}` };
  const phoneHash = (phone) => createHmac('sha256', dedupeSecret).update(phone).digest('hex');

  async function resolveAttachments(references) {
    if (!Array.isArray(references) || references.length === 0) return [];
    if (!attachmentStore?.getSession) throw new CmsLeadAttachmentInvalid('Attachment sessions are unavailable');
    const currentTime = now().getTime();
    const entries = await Promise.all(references.map(async (reference) => {
      const session = await attachmentStore.getSession(reference);
      if (!session || session.status !== 'uploaded' || !session.fileId || session.leadReference || Date.parse(session.expiresAt) <= currentTime) {
        throw new CmsLeadAttachmentInvalid('Attachment session is invalid, expired, or already bound');
      }
      return { session, fileId: session.fileId };
    }));
    return entries;
  }

  return {
    async hasRecentPhone(phone, cutoff) {
      try {
        const url = new URL(dedupeKeysEndpoint);
        url.searchParams.set('filter[key_hash][_eq]', phoneHash(phone));
        url.searchParams.set('filter[expires_at][_gte]', cutoff);
        url.searchParams.set('limit', '1');
        // Presence is enough; request only a field explicitly granted to the BFF policy.
        url.searchParams.set('fields', 'key_hash');
        const response = await fetchImpl(url, { headers });
        if (!response.ok) throw new Error(`CMS responded ${response.status}`);
        const result = await response.json();
        if (!Array.isArray(result?.data)) throw new Error('CMS duplicate-check response is invalid');
        return result.data.length > 0;
      } catch (error) {
        throw new CmsLeadStoreUnavailable(error);
      }
    },
    async create(lead) {
      const expiresAt = new Date(Date.parse(lead.consentAt) + 24 * 60 * 60 * 1000).toISOString();
      try {
        const dedupeResponse = await fetchImpl(dedupeKeysEndpoint, {
          method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({
            key_hash: phoneHash(lead.phone), expires_at: expiresAt, status: 'active', publication_state: 'private'
          })
        });
        if (!dedupeResponse.ok) {
          if (dedupeResponse.status === 400 || dedupeResponse.status === 409) return { duplicate: true, status: 'duplicate' };
          throw new Error(`CMS responded ${dedupeResponse.status}`);
        }
      } catch (error) {
        if (error?.duplicate) return error;
        throw new CmsLeadStoreUnavailable(error);
      }
      const attachments = await resolveAttachments(lead.attachmentReferences);
      const body = {
        lead_reference: lead.leadReference, lead_type: lead.leadType, source_page: lead.pagePath, source_campaign: lead.source,
        name: lead.name, phone: lead.phone, requirement: lead.requirement || null, status: 'new', publication_state: 'private',
        owner: null, consent_at: lead.consentAt, attachment_ids: attachments.map(({ fileId }) => fileId),
        activity_log: [{ action: 'created', actor: 'official_site_bff', at: lead.consentAt }]
      };
      try {
        const response = await fetchImpl(endpoint, {
          method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(body)
        });
        if (!response.ok) throw new Error(`CMS responded ${response.status}`);
        // Directus returns 204 when this write-only service account cannot read back a private lead.
        const result = response.status === 204 ? null : await response.json();
        if (result && !result?.data?.id) throw new Error('CMS lead response is invalid');
        if (attachments.length > 0 && attachmentStore?.markAttached) {
          try {
            await attachmentStore.markAttached(attachments, lead.leadReference);
          } catch {
            // The durable lead retains its private file IDs; reconciliation can repair session state later.
          }
        }
        let notificationQueued = false;
        if (notificationJobsEndpoint) {
          try {
            const notificationResponse = await fetchImpl(notificationJobsEndpoint, {
              method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                lead_reference: lead.leadReference, delivery_channel: 'sales', attempts: 0, next_attempt_at: lead.consentAt,
                sent_at: null, last_error: null, status: 'pending', publication_state: 'private'
              })
            });
            notificationQueued = notificationResponse.ok;
          } catch {
            // The durable lead record remains available for manual follow-up.
          }
        }
        return { ...(result?.data?.id ? { id: result.data.id } : {}), status: 'new', notificationQueued };
      } catch (error) {
        throw new CmsLeadStoreUnavailable(error);
      }
    }
  };
}
import { createHmac } from 'node:crypto';
