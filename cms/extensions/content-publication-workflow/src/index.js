import { ForbiddenError, InvalidPayloadError } from '@directus/errors';
import { ContentPublicationError, applyContentPublicationCreate, applyContentPublicationUpdate, publicationWorkflowCollections } from '../../../content-workflow/content-publication-workflow.mjs';
import { KnowledgeGovernanceError } from '../../../content-workflow/knowledge-governance.mjs';
import { buildContentVersion, databaseDateTime } from '../../../content-workflow/content-versioning.mjs';
import { MediaAssetGovernanceError, assertMediaAssetPlacement, assertMediaAssetRecord, assertPublishedMediaReferences, collectMediaAssetReferenceIds } from '../../../content-workflow/media-asset-governance.mjs';

const roleNames = new Map([
  ['内容编辑', 'content_editor'], ['审核管理', 'review_manager'], ['系统管理员', 'system_admin']
]);

async function actorFor(context) {
  const accountability = context.accountability;
  if (!accountability?.user) throw new ForbiddenError({ reason: 'An authenticated content role is required' });
  if (accountability.admin) return { role: 'system_admin', id: accountability.user };
  const role = accountability.role ? await context.database('directus_roles').where({ id: accountability.role }).first() : null;
  const roleKey = roleNames.get(role?.name);
  if (!roleKey) throw new ForbiddenError({ reason: 'Your role cannot change content publication state' });
  return { role: roleKey, id: accountability.user };
}

async function assertApprovedMediaReferences(context, next) {
  if (!['review', 'scheduled', 'published'].includes(next?.status)) return;
  const ids = collectMediaAssetReferenceIds(next);
  if (!ids.length) return;
  const assets = await context.database('media_assets')
    .whereIn('id', ids)
    .select('id', 'status', 'publication_state');
  assertPublishedMediaReferences(next, new Map((Array.isArray(assets) ? assets : []).map((asset) => [String(asset.id), asset])));
}

async function assertMediaAssetFileMetadata(context, collection, next) {
  if (collection !== 'media_assets') return;
  const file = await context.database('directus_files').where({ id: next.file_id }).first();
  assertMediaAssetRecord(next, file);
  assertMediaAssetPlacement(next, next.placement_key);
}

export function registerContentPublicationWorkflowHook({ filter }) {
  for (const collection of publicationWorkflowCollections) {
    filter(`${collection}.items.create`, async (payload, _meta, context) => {
      const actor = await actorFor(context);
      try {
        const next = applyContentPublicationCreate({ collection, input: payload, actor });
        await assertMediaAssetFileMetadata(context, collection, next);
        return next;
      } catch (error) {
        if (error instanceof ContentPublicationError && ['ACTOR_REQUIRED', 'ROLE_SCOPE'].includes(error.code)) throw new ForbiddenError({ reason: error.message });
        if (error instanceof ContentPublicationError || error instanceof KnowledgeGovernanceError || error instanceof MediaAssetGovernanceError) throw new InvalidPayloadError({ reason: error.message });
        throw error;
      }
    });
    filter(`${collection}.items.update`, async (payload, meta, context) => {
      if (!Array.isArray(meta.keys) || meta.keys.length !== 1) throw new InvalidPayloadError({ reason: 'Content publication updates must target exactly one record' });
      const [actor, current] = await Promise.all([
        actorFor(context),
        context.database(collection).whereIn('id', meta.keys).first()
      ]);
      try {
        const next = applyContentPublicationUpdate({ collection, current, input: payload, actor });
        const candidate = { ...current, ...next };
        await assertMediaAssetFileMetadata(context, collection, candidate);
        await assertApprovedMediaReferences(context, candidate);
        const action = next.publication_log?.at?.(-1)?.action || 'updated';
        const version = buildContentVersion({ collection, current, next, actorId: actor.id, action });
        await context.database('content_versions').insert({
          ...version, created_at: databaseDateTime(version.created_at), snapshot: JSON.stringify(version.snapshot), changed_fields: JSON.stringify(version.changed_fields),
          status: 'available', publication_state: 'private'
        });
        return next;
      } catch (error) {
        if (error instanceof ContentPublicationError && ['ACTOR_REQUIRED', 'ROLE_SCOPE'].includes(error.code)) throw new ForbiddenError({ reason: error.message });
        if (error instanceof ContentPublicationError || error instanceof KnowledgeGovernanceError || error instanceof MediaAssetGovernanceError) throw new InvalidPayloadError({ reason: error.message });
        throw error;
      }
    });
  }
}

export default registerContentPublicationWorkflowHook;
