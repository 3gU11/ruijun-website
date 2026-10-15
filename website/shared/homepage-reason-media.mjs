// The homepage reason scenes render `reason.image` / `reason.icon`. Those were
// sourced only from the section's plain text fields, so a governed media asset
// bound to the section (the very binding the canvas exposes for replacement)
// never reached the rendered page: a swap showed up in the live preview, which
// patches the element directly, but not on the public site.
//
// These helpers close that gap. The role lists mirror `mediaFieldForRoles` so
// anything the canvas treats as editable is also something the page renders.
export const REASON_IMAGE_ROLES = Object.freeze(['background', 'foreground', 'image', 'photo', 'primary']);
export const REASON_ICON_ROLES = Object.freeze(['icon', 'tab-icon', 'thumbnail']);

function isManagedEntry(entry) {
  return Boolean(entry && typeof entry === 'object'
    && (entry.managed === true || entry.media_asset_id != null || entry.file_id));
}

// Matches the canvas binding exactly: an explicit role from the given set, on a
// managed entry. `selectSectionMediaEntry` is deliberately not used here because
// it falls back to an entry with a blank role — an asset would then render while
// the canvas still reported the slot as static. Draft assets carry no `path`
// until the reader resolves them, so an unresolved binding falls through.
export function selectReasonMediaPath(section, roles = REASON_IMAGE_ROLES) {
  const media = Array.isArray(section?.media) ? section.media : [];
  const wanted = new Set(roles.map((role) => String(role).trim().toLowerCase()));
  const entry = media.find((candidate) => isManagedEntry(candidate)
    && wanted.has(String(candidate.role || '').trim().toLowerCase()));
  return String(entry?.path || '').trim();
}

export function resolveReasonImage(section, fallback = {}) {
  return selectReasonMediaPath(section, REASON_IMAGE_ROLES)
    || String(section?.image || '').trim()
    || String(fallback.image || '').trim();
}

export function resolveReasonIcon(section, fallback = {}) {
  return selectReasonMediaPath(section, REASON_ICON_ROLES)
    || String(section?.icon || '').trim()
    || String(fallback.icon || '').trim();
}
