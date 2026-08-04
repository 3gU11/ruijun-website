function apiUrl(baseUrl, path) {
  return new URL(path.replace(/^\//, ''), `${baseUrl.replace(/\/$/, '')}/`);
}

function isDue(job, now) {
  if (!job.next_attempt_at) return true;
  const nextAttemptAt = Date.parse(job.next_attempt_at);
  return !Number.isFinite(nextAttemptAt) || nextAttemptAt <= now.getTime();
}

function retryAt(now, attempts) {
  const delayMinutes = Math.min(60, 5 * (2 ** Math.max(0, attempts - 1)));
  return new Date(now.getTime() + delayMinutes * 60_000).toISOString();
}

class CmsRequestError extends Error {
  constructor(status, path) {
    super(`CMS responded ${status} for ${path}`);
    this.name = 'CmsRequestError';
    this.status = status;
  }
}

export function createLeadNotificationWorker({
  baseUrl, accessToken, notificationUrl, fetchImpl = fetch, notificationFetchImpl = fetch,
  now = () => new Date(), maxAttempts = 3, lockToken = () => crypto.randomUUID()
}) {
  if (!baseUrl || !accessToken || !notificationUrl) throw new TypeError('baseUrl, accessToken, and notificationUrl are required');
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) throw new TypeError('maxAttempts must be a positive integer');
  const headers = Object.freeze({ Accept: 'application/json', Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' });

  async function request(path, options = {}) {
    const response = await fetchImpl(apiUrl(baseUrl, path), { ...options, headers: { ...headers, ...options.headers } });
    if (!response.ok) throw new CmsRequestError(response.status, path);
    const payload = await response.json();
    return payload?.data;
  }

  async function updateJob(id, body) {
    await request(`/items/lead_notification_jobs/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(body) });
  }

  async function claimJob(job) {
    try {
      await updateJob(job.id, { status: 'processing', lock_token: lockToken(job) });
      return true;
    } catch (error) {
      if (error instanceof CmsRequestError && [400, 403, 409].includes(error.status)) return false;
      throw error;
    }
  }

  async function deliver(job) {
    const response = await notificationFetchImpl(notificationUrl, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadReference: job.lead_reference, channel: job.delivery_channel })
    });
    if (!response.ok) throw new Error(`Notification endpoint responded ${response.status}`);
  }

  return {
    async runOnce() {
      const jobs = await request('/items/lead_notification_jobs?filter[status][_in]=pending,retrying&limit=50&sort=next_attempt_at');
      if (!Array.isArray(jobs)) throw new Error('CMS notification job response is invalid');
      const outcome = { claimed: 0, delivered: 0, retrying: 0, manualReview: 0, skipped: 0 };
      const timestamp = now();
      for (const job of jobs.filter((candidate) => isDue(candidate, timestamp))) {
        const token = lockToken(job);
        let claimed;
        try {
          await updateJob(job.id, { status: 'processing', lock_token: token });
          claimed = true;
        } catch (error) {
          if (error instanceof CmsRequestError && [400, 403, 409].includes(error.status)) {
            outcome.skipped += 1;
            continue;
          }
          throw error;
        }
        if (!claimed) continue;
        outcome.claimed += 1;
        const attempts = Number(job.attempts || 0) + 1;
        try {
          await deliver(job);
          await updateJob(job.id, {
            status: 'sent', attempts, sent_at: timestamp.toISOString(), next_attempt_at: null, last_error: null, lock_token: token
          });
          outcome.delivered += 1;
        } catch (error) {
          const lastError = error instanceof Error ? error.message.slice(0, 500) : 'Notification delivery failed';
          if (attempts >= maxAttempts) {
            await updateJob(job.id, { status: 'manual_review', attempts, next_attempt_at: null, last_error: lastError, lock_token: token });
            outcome.manualReview += 1;
          } else {
            await updateJob(job.id, { status: 'retrying', attempts, next_attempt_at: retryAt(timestamp, attempts), last_error: lastError, lock_token: token });
            outcome.retrying += 1;
          }
        }
      }
      outcome.skipped += jobs.length - jobs.filter((candidate) => isDue(candidate, timestamp)).length;
      return outcome;
    }
  };
}
