export function productResourceDownloadName(resource) {
 const url = String(resource?.url || resource?.path || '').trim();
 if (!url) return undefined;
 // Resource media IDs are governed document attachments. The type is editable
 // display text (e.g. 说明书), not a reliable MIME type or download switch.
 const attached = /^[1-9]\d*$/.test(String(resource?.media_asset_id || ''));
 const pdf = String(resource?.type || '').toLowerCase().includes('pdf') || /\.pdf(?:[?#]|$)/i.test(url);
 return attached || pdf ? String(resource?.title || '').trim() || '产品资料' : undefined;
}
