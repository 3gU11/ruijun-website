import { buildDirectusSchemaPlan } from '../schema/directus-schema-plan.mjs';

const editableContentCollections = new Set([
  'pages', 'product_series', 'product_models', 'product_parameters', 'case_studies', 'articles',
  'manufacturing_evidence', 'qualifications', 'milestones', 'service_resources', 'service_locations',
  'knowledge_items', 'external_service_entries', 'site_settings', 'media_assets'
]);

const roleCollectionScopes = Object.freeze({
  content_editor: [...editableContentCollections],
  technical_reviewer: ['product_series', 'product_models', 'product_parameters', 'service_resources', 'knowledge_items', 'media_assets'],
  brand_reviewer: ['pages', 'articles', 'case_studies', 'manufacturing_evidence', 'qualifications', 'milestones', 'service_locations', 'external_service_entries', 'site_settings', 'media_assets'],
  publisher: [...editableContentCollections],
  sales_user: ['leads'],
  read_only_manager: [...editableContentCollections, 'leads', 'lead_notification_jobs', 'service_entry_clicks'],
  content_audit_reader: ['product_series', 'product_models', 'service_resources', 'service_locations', 'external_service_entries']
});

const bffPublicReadFields = Object.freeze({
  pages: ['slug', 'title', 'language', 'sections', 'seo', 'status', 'publication_state', 'published_at'],
  product_series: ['series_code', 'slug', 'name', 'positioning', 'scenarios', 'capabilities', 'cover_asset', 'sort_order', 'language', 'status', 'publication_state', 'published_at'],
  product_models: ['series_code', 'model_code', 'slug', 'name', 'parameters', 'configuration', 'media', 'resources', 'case_studies', 'status', 'publication_state', 'published_at'],
  external_service_entries: ['entry_type', 'url', 'enabled', 'open_mode', 'fallback_phone', 'health_status', 'status', 'publication_state', 'published_at'],
  service_resources: ['source_key', 'type', 'applicable_models', 'version', 'language', 'asset', 'updated_at', 'status', 'publication_state', 'published_at'],
  service_locations: ['source_key', 'region', 'city', 'service_scope', 'contact', 'business_status', 'valid_until', 'status', 'publication_state', 'published_at'],
  milestones: ['source_key', 'year', 'event', 'evidence', 'sort_order', 'status', 'publication_state', 'published_at'],
  qualifications: ['source_key', 'type', 'name', 'assets', 'authorization_status', 'sort_order', 'status', 'publication_state', 'published_at'],
  manufacturing_evidence: ['source_key', 'process', 'description', 'media', 'inspection_evidence', 'sort_order', 'status', 'publication_state', 'published_at'],
  site_settings: ['setting_key', 'navigation', 'footer', 'brand', 'contacts', 'languages', 'status', 'publication_state', 'published_at'],
  articles: ['slug', 'category', 'title', 'summary', 'cover_asset', 'video_url', 'seo', 'status', 'publication_state', 'published_at'],
  media_assets: ['id', 'file_id', 'original_file_name', 'mime_type', 'byte_size', 'usage_scope', 'alt_text', 'status', 'publication_state', 'published_at']
});

const bffLeadFields = Object.freeze([
  'lead_reference', 'lead_type', 'source_page', 'source_campaign', 'name', 'phone', 'company', 'email', 'requirement',
  'product_series', 'product_model', 'attachment_ids', 'owner', 'activity_log', 'consent_at', 'status', 'publication_state'
]);

const bffNotificationFields = Object.freeze([
  'lead_reference', 'delivery_channel', 'attempts', 'next_attempt_at', 'sent_at', 'last_error', 'status', 'publication_state'
]);

const notificationJobFields = Object.freeze([
  'id', 'lead_reference', 'delivery_channel', 'attempts', 'next_attempt_at', 'sent_at', 'last_error', 'status', 'publication_state',
  'lock_token', 'locked_by', 'locked_at', 'handled_by', 'handled_at', 'manual_note', 'activity_log', 'date_created', 'date_updated'
]);

const bffDedupeFields = Object.freeze(['key_hash', 'expires_at', 'status', 'publication_state']);

const bffUploadSessionFields = Object.freeze([
  'id', 'upload_reference', 'file_name', 'mime_type', 'byte_size', 'file_id', 'expires_at', 'lead_reference', 'status', 'publication_state'
]);
const bffServiceEntryClickFields = Object.freeze(['entry_type', 'source_page']);
const contentAuditReadFields = Object.freeze({
  product_series: ['id', 'series_code', 'name', 'source_url', 'source_document', 'review_note', 'import_evidence', 'status', 'publication_state'],
  product_models: ['id', 'series_code', 'model_code', 'name', 'parameters', 'source_url', 'source_document', 'review_note', 'import_evidence', 'status', 'publication_state'],
  service_resources: ['id', 'source_key', 'type', 'applicable_models', 'version', 'language', 'asset', 'updated_at', 'source_url', 'source_document', 'review_note', 'status', 'publication_state'],
  service_locations: ['id', 'source_key', 'region', 'city', 'service_scope', 'contact', 'business_status', 'valid_until', 'source_url', 'source_document', 'review_note', 'status', 'publication_state'],
  external_service_entries: ['id', 'entry_type', 'url', 'enabled', 'open_mode', 'fallback_phone', 'health_status', 'source_document', 'review_note', 'status', 'publication_state']
});

const bffPrivateFileFields = Object.freeze(['id', 'title', 'filename_download', 'type', 'filesize', 'storage']);
const publicCandidateFileFields = bffPrivateFileFields;

  const salesLeadReadFields = Object.freeze([
    'id', 'lead_reference', 'lead_type', 'source_page', 'source_campaign', 'name', 'phone', 'company', 'email', 'requirement',
  'product_series', 'product_model', 'attachment_ids', 'owner', 'activity_log', 'follow_up_note', 'consent_at', 'status', 'publication_state',
  'date_created', 'date_updated'
]);

const claimableLeadFilter = Object.freeze({
  _or: [{ owner: { _null: true } }, { owner: { _eq: '$CURRENT_USER' } }]
});

function urlFor(baseUrl, path) {
  return new URL(path.replace(/^\//, ''), `${baseUrl.replace(/\/$/, '')}/`);
}

function permissionSpecs(roleKey, policyId) {
  if (roleKey === 'system_admin') return [];
  if (roleKey === 'website_bff') {
    const published = { status: { _eq: 'published' }, publication_state: { _eq: 'published' } };
    return [
      ...Object.entries(bffPublicReadFields).map(([collection, fields]) => ({
        policy: policyId, collection, action: 'read', permissions: published, validation: {}, fields
      })),
      { policy: policyId, collection: 'leads', action: 'create', permissions: {}, validation: {}, fields: bffLeadFields },
      { policy: policyId, collection: 'lead_dedupe_keys', action: 'read', permissions: {}, validation: {}, fields: ['key_hash', 'expires_at'] },
      { policy: policyId, collection: 'lead_dedupe_keys', action: 'create', permissions: {}, validation: {}, fields: bffDedupeFields },
      { policy: policyId, collection: 'lead_notification_jobs', action: 'create', permissions: {}, validation: {}, fields: bffNotificationFields },
      { policy: policyId, collection: 'lead_upload_sessions', action: 'read', permissions: {}, validation: {}, fields: bffUploadSessionFields },
      { policy: policyId, collection: 'lead_upload_sessions', action: 'create', permissions: {}, validation: {}, fields: bffUploadSessionFields },
      { policy: policyId, collection: 'lead_upload_sessions', action: 'update', permissions: {}, validation: {}, fields: ['file_id', 'lead_reference', 'status'] },
      { policy: policyId, collection: 'service_entry_clicks', action: 'create', permissions: {}, validation: {}, fields: bffServiceEntryClickFields },
      { policy: policyId, collection: 'directus_files', action: 'create', permissions: {}, validation: {}, fields: bffPrivateFileFields }
    ];
  }
  if (roleKey === 'sales_user') {
    return [
      { policy: policyId, collection: 'leads', action: 'read', permissions: claimableLeadFilter, validation: {}, presets: {}, fields: salesLeadReadFields },
      { policy: policyId, collection: 'leads', action: 'update', permissions: claimableLeadFilter, validation: { owner: { _eq: '$CURRENT_USER' } }, presets: { owner: '$CURRENT_USER' }, fields: ['owner', 'status', 'follow_up_note', 'activity_log'] }
    ];
  }
  if (roleKey === 'content_audit_reader') {
    return Object.entries(contentAuditReadFields).map(([collection, fields]) => ({
      policy: policyId, collection, action: 'read', permissions: {}, validation: {}, fields
    }));
  }
  if (roleKey === 'notification_worker' || roleKey === 'notification_manager') {
    return [
      { policy: policyId, collection: 'lead_notification_jobs', action: 'read', permissions: {}, validation: {}, fields: notificationJobFields },
      { policy: policyId, collection: 'lead_notification_jobs', action: 'update', permissions: {}, validation: {}, fields: notificationJobFields }
    ];
  }
  if (roleKey === 'content_editor') {
    return [
      ...roleCollectionScopes.content_editor.flatMap((collection) => ['read', 'create', 'update'].map((action) => ({
        policy: policyId, collection, action, permissions: {}, validation: {}, fields: ['*']
      }))),
      { policy: policyId, collection: 'directus_files', action: 'create', permissions: {}, validation: {}, fields: publicCandidateFileFields },
      { policy: policyId, collection: 'directus_files', action: 'read', permissions: { uploaded_by: { _eq: '$CURRENT_USER' } }, validation: {}, fields: publicCandidateFileFields }
    ];
  }
  const actions = roleKey === 'read_only_manager' || roleKey === 'content_audit_reader' ? ['read'] : ['read', 'create', 'update'];
  return roleCollectionScopes[roleKey].flatMap((collection) => actions.map((action) => ({
    policy: policyId,
    collection,
    action,
    permissions: {},
    validation: {},
    fields: ['*']
  })));
}

export function createDirectusSchemaApplier({ baseUrl, accessToken, fetchImpl = fetch, schemaPlan = buildDirectusSchemaPlan() }) {
  if (!baseUrl || !accessToken) throw new TypeError('baseUrl and accessToken are required');
  const headers = Object.freeze({ Accept: 'application/json', Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' });

  async function request(path, options = {}) {
    const response = await fetchImpl(urlFor(baseUrl, path), { ...options, headers: { ...headers, ...options.headers } });
    let body = null;
    try {
      body = await response.json();
    } catch {
      // A proxy can reject a write with an empty or non-JSON response.
    }
    if (!response.ok) return { ok: false, status: response.status, message: body?.errors?.[0]?.message };
    return { ok: true, data: body?.data };
  }

  async function create(path, body, description) {
    const response = await request(path, { method: 'POST', body: JSON.stringify(body) });
    if (!response.ok) throw new Error(`Unable to create ${description}: ${response.status}${response.message ? ` (${response.message})` : ''}`);
    return response.data;
  }

  async function applyCollections() {
    const response = await request('/collections');
    if (!response.ok) throw new Error(`Unable to list collections: ${response.status}`);
    const existing = new Set((Array.isArray(response.data) ? response.data : []).map((collection) => collection.collection));
    const result = { created: 0, skipped: 0 };
    for (const collection of schemaPlan.collections) {
      if (existing.has(collection.collection)) {
        result.skipped += 1;
      } else {
        await create('/collections', collection, `collection ${collection.collection}`);
        result.created += 1;
      }
    }
    return result;
  }

  async function applyFields() {
    const result = { created: 0, updated: 0, skipped: 0 };
    const grouped = Map.groupBy(schemaPlan.fields, (field) => field.collection);
    for (const [collection, fields] of grouped) {
      const response = await request(`/fields/${encodeURIComponent(collection)}`);
      if (!response.ok) throw new Error(`Unable to list fields for ${collection}: ${response.status}`);
      const existing = new Map((Array.isArray(response.data) ? response.data : []).map((field) => [field.field, field]));
      for (const field of fields) {
        const current = existing.get(field.field);
        if (current) {
          const managesStatusChoices = field.field === 'status' && field.meta?.options?.choices;
          const managesJsonCasting = field.type === 'json'
            && JSON.stringify(current.meta?.special || []) !== JSON.stringify(field.meta?.special || []);
          if (managesStatusChoices || managesJsonCasting) {
            const updateResponse = await request(`/fields/${encodeURIComponent(collection)}/${encodeURIComponent(field.field)}`, {
              method: 'PATCH', body: JSON.stringify({ meta: field.meta })
            });
            if (!updateResponse.ok) throw new Error(`Unable to update field ${collection}.${field.field}: ${updateResponse.status}`);
            result.updated += 1;
          }
          result.skipped += 1;
        } else {
          await create(`/fields/${encodeURIComponent(collection)}`, field, `field ${collection}.${field.field}`);
          result.created += 1;
        }
      }
    }
    return result;
  }

  async function applyRoles() {
    const response = await request('/roles');
    if (!response.ok) throw new Error(`Unable to list roles: ${response.status}`);
    const rolesByName = new Map((Array.isArray(response.data) ? response.data : []).map((role) => [role.name, role]));
    const result = { created: 0, skipped: 0, rolesByKey: new Map() };
    for (const role of schemaPlan.roles) {
      // Directus owns the Administrator role and prevents a custom role from acquiring admin access.
      if (role.key === 'system_admin') {
        result.skipped += 1;
        continue;
      }
      let directusRole = rolesByName.get(role.name);
      if (!directusRole) {
        directusRole = await create('/roles', { name: role.name, admin_access: role.admin }, `role ${role.key}`);
        if (!directusRole?.id) throw new Error(`Created role ${role.key} did not return an id`);
        result.created += 1;
      } else {
        result.skipped += 1;
      }
      result.rolesByKey.set(role.key, directusRole);
    }
    return result;
  }

  async function applyPolicies(rolesByKey) {
    const response = await request('/policies');
    if (!response.ok) throw new Error(`Unable to list policies: ${response.status}`);
    const accessResponse = await request('/access?fields=role,policy&limit=-1');
    if (!accessResponse.ok) throw new Error(`Unable to list policy access mappings: ${accessResponse.status}`);
    const policiesByName = new Map((Array.isArray(response.data) ? response.data : []).map((policy) => [policy.name, policy]));
    const accessKeys = new Set((Array.isArray(accessResponse.data) ? accessResponse.data : []).map((access) => `${access.role}:${access.policy}`));
    const result = { created: 0, attached: 0, policiesByKey: new Map() };
    for (const role of schemaPlan.roles) {
      if (role.key === 'system_admin') continue;
      const policyName = `Ruijun ${role.key}`;
      let policy = policiesByName.get(policyName);
      if (!policy) {
        policy = await create('/policies', { name: policyName, admin_access: Boolean(role.admin), app_access: role.key !== 'website_bff' }, `policy ${role.key}`);
        if (!policy?.id) throw new Error(`Created policy ${role.key} did not return an id`);
        result.created += 1;
      }
      const directusRole = rolesByKey.get(role.key);
      const accessKey = `${directusRole.id}:${policy.id}`;
      if (!accessKeys.has(accessKey)) {
        await create('/access', { role: directusRole.id, policy: policy.id }, `policy access ${role.key}`);
        accessKeys.add(accessKey);
        result.attached += 1;
      }
      result.policiesByKey.set(role.key, policy);
    }
    return result;
  }

  async function applyPermissions(policiesByKey) {
    const response = await request('/permissions?limit=-1');
    if (!response.ok) throw new Error(`Unable to list permissions: ${response.status}`);
    const desired = schemaPlan.roles.flatMap((role) => {
      if (role.key === 'system_admin') return [];
      const policy = policiesByKey.get(role.key);
      return permissionSpecs(role.key, policy.id);
    });
    const desiredKeys = new Set(desired.map((permission) => `${permission.policy}:${permission.collection}:${permission.action}`));
    const existing = new Map();
    const duplicateIds = [];
    for (const permission of Array.isArray(response.data) ? response.data : []) {
      const key = `${permission.policy ?? permission.role}:${permission.collection}:${permission.action}`;
      if (!desiredKeys.has(key)) continue;
      if (existing.has(key)) {
        if (permission.id) duplicateIds.push(permission.id);
      } else {
        existing.set(key, permission);
      }
    }
    const result = { created: 0, updated: 0, skipped: 0 };
    for (const id of duplicateIds) {
      const deleteResponse = await request(`/permissions/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!deleteResponse.ok) throw new Error(`Unable to remove duplicate permission ${id}: ${deleteResponse.status}`);
    }
    if (duplicateIds.length) result.deduplicated = duplicateIds.length;
    for (const role of schemaPlan.roles) {
      if (role.key === 'system_admin') continue;
      const policy = policiesByKey.get(role.key);
      for (const permission of permissionSpecs(role.key, policy.id)) {
        const key = `${permission.policy}:${permission.collection}:${permission.action}`;
        const current = existing.get(key);
        if (current) {
          const matches = JSON.stringify(current.permissions || {}) === JSON.stringify(permission.permissions || {})
            && JSON.stringify(current.validation || {}) === JSON.stringify(permission.validation || {})
            && JSON.stringify(current.presets || {}) === JSON.stringify(permission.presets || {})
            && JSON.stringify(current.fields || []) === JSON.stringify(permission.fields || []);
          if (!matches) {
            const updateResponse = await request(`/permissions/${encodeURIComponent(current.id)}`, {
              method: 'PATCH', body: JSON.stringify({
                permissions: permission.permissions || {}, validation: permission.validation || {}, presets: permission.presets || {}, fields: permission.fields || []
              })
            });
            if (!updateResponse.ok) throw new Error(`Unable to update permission ${role.key}.${permission.collection}.${permission.action}: ${updateResponse.status}`);
            result.updated += 1;
          } else {
            result.skipped += 1;
          }
        } else {
          await create('/permissions', permission, `permission ${role.key}.${permission.collection}.${permission.action}`);
          result.created += 1;
        }
      }
    }
    return result;
  }

  return {
    async apply() {
      const collections = await applyCollections();
      const fields = await applyFields();
      const roles = await applyRoles();
      const policies = await applyPolicies(roles.rolesByKey);
      const permissions = await applyPermissions(policies.policiesByKey);
      return { collections, fields, roles: { created: roles.created, skipped: roles.skipped }, policies: { created: policies.created, attached: policies.attached }, permissions };
    }
  };
}

if (import.meta.main) {
  const baseUrl = process.env.CMS_BASE_URL;
  const accessToken = process.env.CMS_WRITE_TOKEN;
  const result = await createDirectusSchemaApplier({ baseUrl, accessToken }).apply();
  console.log(JSON.stringify(result, null, 2));
}
