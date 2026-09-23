import { buildRestoredDraft, contentSnapshot, databaseDateTime } from '../../../content-workflow/content-versioning.mjs';
import { publicationWorkflowCollections } from '../../../content-workflow/content-publication-workflow.mjs';

async function publisherActor(database, accountability) {
  if (!accountability?.user) return null;
  if (accountability.admin) return { id: accountability.user };
  const role = accountability.role ? await database('directus_roles').where({ id: accountability.role }).first() : null;
  return ['发布人员', '审核管理'].includes(role?.name) ? { id: accountability.user } : null;
}

function json(value, fallback) {
  if (value && typeof value === 'object') return value;
  if (typeof value !== 'string') return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function databasePayload(value) {
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [
    key,
    entry && typeof entry === 'object' ? JSON.stringify(entry) : entry
  ]));
}

function versionView(version) {
  return {
    id: version.id,
    content_collection: version.content_collection,
    content_item_id: String(version.content_item_id),
    source_status: version.source_status,
    source_publication_state: version.source_publication_state,
    snapshot: json(version.snapshot, {}),
    changed_fields: json(version.changed_fields, []),
    action: version.action,
    actor: version.actor,
    created_at: version.created_at,
    status: version.status,
    restore_note: version.restore_note || null,
    restored_by: version.restored_by || null,
    restored_at: version.restored_at || null
  };
}

export function registerContentVersionRestoreEndpoint(router, { database }) {
  router.get('/', async (req, res, next) => {
    try {
      const actor = await publisherActor(database, req.accountability);
      if (!actor) return res.status(403).json({ errors: [{ message: 'Only publishers may view content versions' }] });
      const collection = typeof req.query?.collection === 'string' ? req.query.collection.trim() : '';
      const itemId = typeof req.query?.itemId === 'string' ? req.query.itemId.trim() : '';
      if (collection && !publicationWorkflowCollections.includes(collection)) {
        return res.status(400).json({ errors: [{ message: 'Unsupported content collection' }] });
      }
      const requestedLimit = Number.parseInt(String(req.query?.limit || '50'), 10);
      const limit = Number.isInteger(requestedLimit) ? Math.max(1, Math.min(requestedLimit, 100)) : 50;
      let query = database('content_versions');
      if (collection) query = query.where({ content_collection: collection });
      if (itemId) query = query.where({ content_item_id: itemId });
      const versions = await query.orderBy('created_at', 'desc').limit(limit);
      return res.status(200).json({ data: versions.map(versionView) });
    } catch (error) {
      return next(error);
    }
  });

  router.get('/:versionId', async (req, res, next) => {
    try {
      const actor = await publisherActor(database, req.accountability);
      if (!actor) return res.status(403).json({ errors: [{ message: 'Only publishers may view content versions' }] });
      const version = await database('content_versions').where({ id: req.params.versionId }).first();
      if (!version || !publicationWorkflowCollections.includes(version.content_collection)) {
        return res.status(404).json({ errors: [{ message: 'Content version was not found' }] });
      }
      const current = await database(version.content_collection).where({ id: version.content_item_id }).first();
      if (!current) return res.status(404).json({ errors: [{ message: 'Original content record was not found' }] });
      return res.status(200).json({ data: { version: versionView(version), current: contentSnapshot(current) } });
    } catch (error) {
      return next(error);
    }
  });

  router.post('/:versionId/restore', async (req, res, next) => {
    try {
      const actor = await publisherActor(database, req.accountability);
      if (!actor) return res.status(403).json({ errors: [{ message: 'Only publishers may restore content versions' }] });
      const note = typeof req.body?.restoreNote === 'string' ? req.body.restoreNote : '';
      if (!note.trim()) return res.status(400).json({ errors: [{ message: 'restoreNote is required' }] });
      const version = await database('content_versions').where({ id: req.params.versionId }).first();
      if (!version || !publicationWorkflowCollections.includes(version.content_collection)) return res.status(404).json({ errors: [{ message: 'Content version was not found' }] });
      const current = await database(version.content_collection).where({ id: version.content_item_id }).first();
      if (!current) return res.status(404).json({ errors: [{ message: 'Original content record was not found' }] });
      const restored = buildRestoredDraft({ snapshot: version.snapshot, current, actorId: actor.id, versionId: version.id, restoreNote: note });
      await database(version.content_collection).where({ id: version.content_item_id }).update(databasePayload(restored));
      await database('content_versions').where({ id: version.id }).update({ status: 'restored', restored_by: actor.id, restored_at: databaseDateTime(new Date()), restore_note: note.trim() });
      return res.status(200).json({ data: { content_collection: version.content_collection, content_item_id: String(version.content_item_id), status: 'draft' } });
    } catch (error) {
      return next(error);
    }
  });
}

export default {
  id: 'content-version-restore',
  handler(router, context) {
    registerContentVersionRestoreEndpoint(router, context);
  }
};
