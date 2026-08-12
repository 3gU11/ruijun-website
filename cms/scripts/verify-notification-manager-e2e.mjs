import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const cmsRoot = new URL('../', import.meta.url);

function required(value, name) {
  if (!value || value === '<REPLACE_ME>') throw new Error(`${name} is required`);
  return value;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function localSettings() {
  const content = await readFile(new URL('.env.local', cmsRoot), 'utf8');
  return Object.fromEntries(content.split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    return match ? [[match[1].trim(), match[2]]] : [];
  }));
}

function client(baseUrl, token = '') {
  async function request(path, { method = 'GET', body, expected = [200] } = {}) {
    const response = await fetch(new URL(path.replace(/^\//, ''), `${baseUrl.replace(/\/$/, '')}/`), {
      method,
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body ? { 'Content-Type': 'application/json' } : {})
      },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
    let payload = null;
    try { payload = await response.json(); } catch { /* Directus deletes have no body. */ }
    if (!expected.includes(response.status)) {
      throw new Error(`${method} ${path} failed: ${payload?.errors?.[0]?.message || `HTTP ${response.status}`}`);
    }
    return { status: response.status, data: payload?.data };
  }
  return { request };
}

async function createUser(admin, roleId, suffix, label) {
  const token = randomUUID();
  const password = `E2E-${randomUUID()}-Aa1!`;
  const result = await admin.request('/users', {
    method: 'POST',
    body: {
      email: `${suffix.slice(0, 12)}.${label}@example.com`, password, role: roleId, token,
      status: 'active', first_name: 'E2E', last_name: 'Notification'
    }
  });
  return { id: result.data.id, token };
}

async function main() {
  const settings = await localSettings();
  const baseUrl = required(settings.CMS_BASE_URL || `http://${settings.HOST}:${settings.PORT}`, 'CMS_BASE_URL');
  const login = client(baseUrl);
  const session = await login.request('/auth/login', {
    method: 'POST',
    body: { email: required(settings.ADMIN_EMAIL, 'ADMIN_EMAIL'), password: required(settings.ADMIN_PASSWORD, 'ADMIN_PASSWORD') }
  });
  const admin = client(baseUrl, session.data.access_token);
  const suffix = randomUUID();
  const createdUsers = [];
  const createdJobs = [];

  try {
    const roles = await admin.request('/roles?fields=id,name&limit=-1');
    const rolesByName = new Map(roles.data.map((role) => [role.name, role.id]));
const manager = await createUser(admin, required(rolesByName.get('通知管理员'), '通知管理员角色'), suffix, 'manager');
    const editor = await createUser(admin, required(rolesByName.get('内容编辑'), 'content editor role'), suffix, 'editor');
    createdUsers.push(manager.id, editor.id);
    const managerApi = client(baseUrl, manager.token);
    const editorApi = client(baseUrl, editor.token);

    const createJob = async (label) => {
      const result = await admin.request('/items/lead_notification_jobs', {
        method: 'POST',
        body: {
          lead_reference: `E2E-NOTIFICATION-${label}-${suffix.slice(0, 8)}`,
          delivery_channel: 'sales', attempts: 3, status: 'manual_review',
          last_error: 'E2E webhook unavailable', activity_log: [{
            action: 'delivery_needs_manual_review', actor: 'worker-e2e', at: '2026-08-04T08:00:00.000Z'
          }]
        }
      });
      createdJobs.push(result.data.id);
      return result.data;
    };

    const listed = await managerApi.request('/items/lead_notification_jobs?filter[status][_eq]=manual_review&fields=id,lead_reference,status,attempts,last_error,manual_note,activity_log&limit=100');
assert(Array.isArray(listed.data), '通知管理员无法读取待人工处理的任务');
    const lockRead = await managerApi.request('/items/lead_notification_jobs?filter[status][_eq]=manual_review&fields=id,lock_token,locked_by,locked_at&limit=1', { expected: [400, 403] });
assert([400, 403].includes(lockRead.status), '通知管理员可读取服务账号锁定字段');

    const forbiddenLeads = await managerApi.request('/items/leads?limit=1', { expected: [403] });
assert(forbiddenLeads.status === 403, '通知管理员可读取私有销售线索');
    const forbiddenEditorRead = await editorApi.request('/items/lead_notification_jobs?limit=1', { expected: [403] });
    assert(forbiddenEditorRead.status === 403, 'Content editor can read notification jobs');

    const retryJob = await createJob('retry');
    const missingNote = await managerApi.request(`/items/lead_notification_jobs/${retryJob.id}`, {
      method: 'PATCH', body: { status: 'retrying' }, expected: [400]
    });
    assert(missingNote.status === 400, 'Manual retry without a note was accepted');
    const retried = await managerApi.request(`/items/lead_notification_jobs/${retryJob.id}`, {
      method: 'PATCH', body: { status: 'retrying', manual_note: 'E2E webhook restored; retry queued.', lock_token: 'forged-lock' }
    });
assert(retried.data.status === 'retrying', '通知管理员无法重新投递待人工处理的任务');
    assert(!('lock_token' in retried.data) && !('locked_by' in retried.data) && !('locked_at' in retried.data), 'Worker lock fields leaked in the manager response');
    const retriedAdmin = await admin.request(`/items/lead_notification_jobs/${retryJob.id}?fields=status,lock_token,locked_by,locked_at`);
    assert(retriedAdmin.data.lock_token === null && retriedAdmin.data.locked_by === null && retriedAdmin.data.locked_at === null, 'Server did not clear forged worker lock fields');
    assert(retried.data.handled_by === manager.id && retried.data.activity_log.at(-1).action === 'manual_retry', 'Manual retry audit fields were not generated by the server');

    const sentJob = await createJob('sent');
    const sent = await managerApi.request(`/items/lead_notification_jobs/${sentJob.id}`, {
      method: 'PATCH', body: { status: 'manual_sent', manual_note: 'E2E sales team notified by phone.' }
    });
    assert(sent.data.status === 'manual_sent' && sent.data.sent_at, 'Manual notification completion was not recorded');

    const resolvedJob = await createJob('resolved');
    const resolved = await managerApi.request(`/items/lead_notification_jobs/${resolvedJob.id}`, {
      method: 'PATCH', body: { status: 'resolved', manual_note: 'E2E duplicate task; no further delivery required.' }
    });
    assert(resolved.data.status === 'resolved' && resolved.data.activity_log.at(-1).action === 'manual_resolved', 'Manual resolution was not audited');

console.log('通知管理员角色本地演练通过。');
  } finally {
    for (const jobId of createdJobs) {
      try { await admin.request(`/items/lead_notification_jobs/${jobId}`, { method: 'DELETE', expected: [204] }); } catch { /* Cleanup is best effort. */ }
    }
    for (const userId of createdUsers) {
      try { await admin.request(`/users/${userId}`, { method: 'DELETE', expected: [204] }); }
      catch { try { await admin.request(`/users/${userId}`, { method: 'PATCH', body: { status: 'archived' } }); } catch { /* Best effort. */ } }
    }
  }
}

await main();
