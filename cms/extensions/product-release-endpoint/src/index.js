import {
  buildProductReleaseSnapshot,
  buildRestoredProductReleaseSnapshot,
  diffProductReleaseSnapshots,
  parseProductReleaseSnapshot,
  validateProductReleaseSnapshot
} from '../../../product-release/product-release-snapshot.mjs';
import { invalidateProductReleaseCache } from '../../../product-release/product-release-cache-invalidation.mjs';

const allowedRoleNames = new Set(['系统管理员']);
const releaseKey = 'main';

async function actorFor(database, accountability) {
  if (!accountability?.user) return null;
  if (accountability.admin) return { id: accountability.user };
  const role = accountability.role ? await database('directus_roles').where({ id: accountability.role }).first() : null;
  return allowedRoleNames.has(role?.name) ? { id: accountability.user } : null;
}

function view(row) {
  if (!row) return null;
  return {
    id: row.id, release_key: row.release_key, version: row.version, source_hash: row.source_hash,
    snapshot: parseProductReleaseSnapshot(row.snapshot), release_note: row.release_note || null,
    published_by: row.published_by || null, published_at: row.published_at || null,
    status: row.status, publication_state: row.publication_state,
    cache_invalidation_status: row.cache_invalidation_status || 'not_configured',
    cache_invalidation_attempts: Number(row.cache_invalidation_attempts || 0),
    cache_invalidation_last_attempt_at: row.cache_invalidation_last_attempt_at || null,
    cache_invalidated_at: row.cache_invalidated_at || null,
    cache_invalidation_error: row.cache_invalidation_error || null,
    restored_from_release_id: row.restored_from_release_id || null,
    restored_from_version: row.restored_from_version == null ? null : Number(row.restored_from_version),
    restore_note: row.restore_note || null
  };
}

function publicationLog(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function invalidateWebsiteProductCache(database, release, actorId, config) {
  const outcome = await invalidateProductReleaseCache({
    ...config,
    release: { id: release.id, version: release.version, source_hash: release.source_hash }
  });
  const attemptedAt = new Date().toISOString();
  const attempts = Number(release.cache_invalidation_attempts || 0) + (outcome.attempted ? 1 : 0);
  const log = publicationLog(release.publication_log);
  const action = outcome.status === 'succeeded'
    ? 'product_cache_invalidated'
    : outcome.status === 'failed' ? 'product_cache_invalidation_failed' : 'product_cache_invalidation_not_configured';
  const update = {
    cache_invalidation_status: outcome.status,
    cache_invalidation_attempts: attempts,
    cache_invalidation_last_attempt_at: outcome.attempted ? attemptedAt : release.cache_invalidation_last_attempt_at || null,
    cache_invalidated_at: outcome.status === 'succeeded' ? attemptedAt : release.cache_invalidated_at || null,
    cache_invalidation_error: outcome.error,
    publication_log: JSON.stringify([...log, {
      action, actor: actorId, at: attemptedAt,
      changed_fields: ['cache_invalidation_status'],
      ...(outcome.error ? { error: outcome.error } : {})
    }])
  };
  await database('product_release_snapshots').where({ id: release.id }).update(update);
  return {
    status: outcome.status,
    attempts,
    last_attempt_at: update.cache_invalidation_last_attempt_at,
    invalidated_at: update.cache_invalidated_at,
    error: outcome.error
  };
}

async function productRows(database) {
  const [series, models, parameters] = await Promise.all([
    database('product_series').select('*'), database('product_models').select('*'), database('product_parameters').select('*')
  ]);
  return { series, models, parameters };
}

async function activeRelease(database) {
  return database('product_release_snapshots')
    .where({ release_key: releaseKey, status: 'published', publication_state: 'published' })
    .orderBy('version', 'desc').first();
}

async function latestRelease(database) {
  return database('product_release_snapshots')
    .where({ release_key: releaseKey })
    .orderBy('version', 'desc').first();
}

function historyView(row, activeId) {
  const snapshot = parseProductReleaseSnapshot(row.snapshot);
  const issues = validateProductReleaseSnapshot(row.snapshot);
  const restoreLog = publicationLog(row.publication_log).findLast?.((entry) => entry?.action === 'product_release_restored') || null;
  return {
    id: row.id,
    version: Number(row.version),
    source_hash: row.source_hash,
    counts: snapshot
      ? { series: snapshot.series.length, models: snapshot.models.length, parameters: snapshot.parameters.length }
      : { series: 0, models: 0, parameters: 0 },
    release_note: row.release_note || null,
    published_by: row.published_by || null,
    published_at: row.published_at || null,
    status: row.status,
    publication_state: row.publication_state,
    cache_invalidation_status: row.cache_invalidation_status || 'not_configured',
    restored_from_release_id: row.restored_from_release_id || null,
    restored_from_version: row.restored_from_version == null ? null : Number(row.restored_from_version),
    restore_note: row.restore_note || null,
    change_summary: restoreLog?.change_summary || null,
    is_active: String(row.id) === String(activeId ?? ''),
    can_restore: String(row.id) !== String(activeId ?? '') && issues.length === 0,
    restore_blockers: String(row.id) === String(activeId ?? '') ? ['ACTIVE_RELEASE'] : issues
  };
}

function validReleaseId(value) {
  const id = String(value || '');
  return /^[a-zA-Z0-9-]{1,64}$/.test(id) ? id : null;
}

function validatedRestoreNote(value) {
  const note = typeof value === 'string' ? value.normalize('NFKC').trim() : '';
  return note.length >= 5 && note.length <= 1000 ? note : null;
}

export function registerProductReleaseEndpoint(router, { database, env = process.env, fetchImpl = fetch }) {
  const cacheInvalidationConfig = {
    endpoint: env?.WEBSITE_CACHE_INVALIDATION_URL || '',
    secret: env?.CMS_WEBHOOK_SECRET || '',
    timeoutMs: env?.PRODUCT_RELEASE_CACHE_INVALIDATION_TIMEOUT_MS || 5_000,
    fetchImpl
  };
  router.get('/', async (req, res, next) => {
    try {
      const actor = await actorFor(database, req.accountability);
      if (!actor) return res.status(403).json({ errors: [{ message: 'Only publishers may view product releases' }] });
      return res.status(200).json({ data: view(await activeRelease(database)) });
    } catch (error) {
      return next(error);
    }
  });

  router.get('/readiness', async (req, res, next) => {
    try {
      const actor = await actorFor(database, req.accountability);
      if (!actor) return res.status(403).json({ errors: [{ message: 'Only publishers may view product release readiness' }] });
      const rows = await productRows(database);
      const [current, latest] = await Promise.all([activeRelease(database), latestRelease(database)]);
      const nextVersion = Number(latest?.version || 0) + 1;
      const result = buildProductReleaseSnapshot({ ...rows, version: nextVersion });
      return res.status(200).json({ data: { active: view(current), next_version: nextVersion, issues: result.issues, source_hash: result.sourceHash, counts: result.snapshot.counts } });
    } catch (error) {
      return next(error);
    }
  });

  router.get('/history', async (req, res, next) => {
    try {
      const actor = await actorFor(database, req.accountability);
      if (!actor) return res.status(403).json({ errors: [{ message: 'Only publishers may view product release history' }] });
      const current = await activeRelease(database);
      const rows = await database('product_release_snapshots')
        .where({ release_key: releaseKey })
        .orderBy('version', 'desc')
        .limit(50)
        .select('*');
      return res.status(200).json({ data: rows.map((row) => historyView(row, current?.id)) });
    } catch (error) {
      return next(error);
    }
  });

  router.post('/publish', async (req, res, next) => {
    try {
      const actor = await actorFor(database, req.accountability);
      if (!actor) return res.status(403).json({ errors: [{ message: 'Only publishers may publish product releases' }] });
      const note = typeof req.body?.releaseNote === 'string' ? req.body.releaseNote.normalize('NFKC').trim().slice(0, 1000) : '';
      const result = await database.transaction(async (trx) => {
        const previous = await activeRelease(trx);
        const latest = await latestRelease(trx);
        const rows = await productRows(trx);
        const built = buildProductReleaseSnapshot({ ...rows, version: Number(latest?.version || 0) + 1 });
        if (built.issues.length) {
          const error = new Error(`Product release is not ready: ${built.issues.join(', ')}`);
          error.code = 'PRODUCT_RELEASE_NOT_READY';
          error.issues = built.issues;
          throw error;
        }
        await trx('product_release_snapshots')
          .where({ release_key: releaseKey, status: 'published', publication_state: 'published' })
          .update({ status: 'archived', publication_state: 'private' });
        const publishedAt = new Date().toISOString();
        const inserted = await trx('product_release_snapshots').insert({
          release_key: releaseKey, version: built.snapshot.version, source_hash: built.sourceHash,
          snapshot: JSON.stringify(built.snapshot), release_note: note || null, published_by: actor.id,
          published_at: publishedAt, status: 'published', publication_state: 'published',
          cache_invalidation_status: 'pending', cache_invalidation_attempts: 0,
          publication_log: JSON.stringify([{ action: 'product_release_published', actor: actor.id, at: publishedAt, changed_fields: ['snapshot', 'version'] }])
        });
        const id = Array.isArray(inserted) ? inserted[0] : inserted;
        return {
          id, version: built.snapshot.version, source_hash: built.sourceHash, counts: built.snapshot.counts,
          published_at: publishedAt, cache_invalidation_attempts: 0,
          publication_log: JSON.stringify([{ action: 'product_release_published', actor: actor.id, at: publishedAt, changed_fields: ['snapshot', 'version'] }])
        };
      });
      let cacheInvalidation;
      try {
        cacheInvalidation = await invalidateWebsiteProductCache(database, result, actor.id, cacheInvalidationConfig);
      } catch {
        cacheInvalidation = {
          status: 'failed', attempts: Number(result.cache_invalidation_attempts || 0),
          last_attempt_at: null, invalidated_at: null, error: 'CACHE_INVALIDATION_STATE_WRITE_FAILED'
        };
      }
      return res.status(201).json({ data: { ...result, cache_invalidation: cacheInvalidation } });
    } catch (error) {
      if (error?.code === 'PRODUCT_RELEASE_NOT_READY') return res.status(400).json({ errors: [{ message: error.message, extensions: { code: error.code, issues: error.issues } }] });
      return next(error);
    }
  });

  router.post('/:id/restore', async (req, res, next) => {
    try {
      const actor = await actorFor(database, req.accountability);
      if (!actor) return res.status(403).json({ errors: [{ message: 'Only publishers may restore product releases' }] });
      const id = validReleaseId(req.params?.id);
      if (!id) return res.status(400).json({ errors: [{ message: 'Product release id is invalid', extensions: { code: 'PRODUCT_RELEASE_ID_INVALID' } }] });
      const note = validatedRestoreNote(req.body?.restoreNote);
      if (!note) return res.status(400).json({ errors: [{ message: 'Restore reason must contain 5 to 1000 characters', extensions: { code: 'PRODUCT_RESTORE_NOTE_INVALID' } }] });
      const result = await database.transaction(async (trx) => {
        const [source, current, latest] = await Promise.all([
          trx('product_release_snapshots').where({ id, release_key: releaseKey }).first(),
          activeRelease(trx),
          latestRelease(trx)
        ]);
        if (!source) {
          const error = new Error('Product release was not found');
          error.code = 'PRODUCT_RELEASE_NOT_FOUND';
          throw error;
        }
        if (String(source.id) === String(current?.id ?? '')) {
          const error = new Error('The active product release cannot be restored');
          error.code = 'PRODUCT_RELEASE_ALREADY_ACTIVE';
          throw error;
        }
        const built = buildRestoredProductReleaseSnapshot({
          source: source.snapshot,
          releaseKey,
          version: Number(latest?.version || 0) + 1
        });
        if (built.issues.length) {
          const error = new Error(`Historical product release is invalid: ${built.issues.join(', ')}`);
          error.code = 'PRODUCT_RELEASE_HISTORY_INVALID';
          error.issues = built.issues;
          throw error;
        }
        const publishedAt = new Date().toISOString();
        const changeSummary = diffProductReleaseSnapshots(current?.snapshot, built.snapshot);
        if (current) {
          await trx('product_release_snapshots').where({ id: current.id }).update({ status: 'archived', publication_state: 'private' });
        }
        const logEntry = {
          action: 'product_release_restored',
          actor: actor.id,
          at: publishedAt,
          changed_fields: ['snapshot', 'version', 'restored_from_release_id', 'restored_from_version', 'restore_note'],
          restored_from_release_id: String(source.id),
          restored_from_version: Number(source.version),
          restore_note: note,
          change_summary: changeSummary
        };
        const inserted = await trx('product_release_snapshots').insert({
          release_key: releaseKey,
          version: built.snapshot.version,
          source_hash: built.sourceHash,
          snapshot: JSON.stringify(built.snapshot),
          release_note: `恢复历史产品版本 v${Number(source.version)}`,
          published_by: actor.id,
          published_at: publishedAt,
          status: 'published',
          publication_state: 'published',
          restored_from_release_id: String(source.id),
          restored_from_version: Number(source.version),
          restore_note: note,
          cache_invalidation_status: 'pending',
          cache_invalidation_attempts: 0,
          publication_log: JSON.stringify([logEntry])
        });
        const restoredId = Array.isArray(inserted) ? inserted[0] : inserted;
        return {
          id: restoredId,
          version: built.snapshot.version,
          source_hash: built.sourceHash,
          counts: built.snapshot.counts,
          published_at: publishedAt,
          restored_from_release_id: String(source.id),
          restored_from_version: Number(source.version),
          restore_note: note,
          change_summary: changeSummary,
          cache_invalidation_attempts: 0,
          publication_log: JSON.stringify([logEntry])
        };
      });
      let cacheInvalidation;
      try {
        cacheInvalidation = await invalidateWebsiteProductCache(database, result, actor.id, cacheInvalidationConfig);
      } catch {
        cacheInvalidation = {
          status: 'failed', attempts: Number(result.cache_invalidation_attempts || 0),
          last_attempt_at: null, invalidated_at: null, error: 'CACHE_INVALIDATION_STATE_WRITE_FAILED'
        };
      }
      return res.status(201).json({ data: { ...result, cache_invalidation: cacheInvalidation } });
    } catch (error) {
      if (error?.code === 'PRODUCT_RELEASE_NOT_FOUND') return res.status(404).json({ errors: [{ message: error.message, extensions: { code: error.code } }] });
      if (error?.code === 'PRODUCT_RELEASE_ALREADY_ACTIVE') return res.status(409).json({ errors: [{ message: error.message, extensions: { code: error.code } }] });
      if (error?.code === 'PRODUCT_RELEASE_HISTORY_INVALID') return res.status(422).json({ errors: [{ message: error.message, extensions: { code: error.code, issues: error.issues } }] });
      return next(error);
    }
  });

  router.post('/:id/cache-invalidate', async (req, res, next) => {
    try {
      const actor = await actorFor(database, req.accountability);
      if (!actor) return res.status(403).json({ errors: [{ message: 'Only publishers may retry product cache invalidation' }] });
      const id = validReleaseId(req.params?.id);
      if (!id) return res.status(400).json({ errors: [{ message: 'Product release id is invalid' }] });
      const release = await database('product_release_snapshots').where({ id }).first();
      if (!release) return res.status(404).json({ errors: [{ message: 'Product release was not found' }] });
      if (release.release_key !== releaseKey || release.status !== 'published' || release.publication_state !== 'published') {
        return res.status(409).json({ errors: [{ message: 'Only the active product release may invalidate the public cache' }] });
      }
      const cacheInvalidation = await invalidateWebsiteProductCache(database, release, actor.id, cacheInvalidationConfig);
      return res.status(200).json({ data: { id: release.id, version: release.version, cache_invalidation: cacheInvalidation } });
    } catch (error) {
      return next(error);
    }
  });
}

export default {
  id: 'product-release',
  handler(router, context) {
    registerProductReleaseEndpoint(router, context);
  }
};
