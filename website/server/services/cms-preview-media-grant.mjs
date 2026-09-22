export async function authorizePreviewMediaGrant({ session, input, consume }) {
  const primary = session && input?.collection === session.data.collection && String(input?.itemId) === String(session.data.itemId);
  const related = session?.data?.preview?.related;
  const candidates = input?.collection && Object.hasOwn(related || {}, input.collection) ? related[input.collection] : [];
  const issuedRelated = Array.isArray(candidates) && candidates.some(record => record?.id != null && String(record.id) === String(input?.itemId));
  if (!session || (!primary && !issuedRelated)) throw Error('Preview target mismatch');
  const grant = await consume(input);
  if (grant?.collection !== input.collection || String(grant?.itemId) !== String(input.itemId) || !/^[1-9]\d*$/.test(String(grant?.assetId || ''))) throw Error('Invalid media grant');
  const assets = session.data.preview.authorized_media || [];
  if (!assets.some(asset => String(asset.media_asset_id) === String(grant.assetId))) {
    session.data.preview.authorized_media = [...assets.slice(-99), { media_asset_id: String(grant.assetId) }];
  }
  return String(grant.assetId);
}
