import { mediaPlacementSpecs } from '../content-workflow/media-asset-governance.mjs';

const pageScopes = Object.freeze({home:'homepage',product:'product',manufacturing:'manufacturing',news:'article',about:'brand',service:'service'});

export function pageAllowsPreviewMedia(page, asset) {
 const slug = String(page?.slug || '');
 const scope = pageScopes[slug];
 if (!scope || asset?.usage_scope !== scope || asset?.page_key !== slug) return false;
 const placement = String(asset?.placement_key || '');
 if (!placement.startsWith(`${slug}.`)) return false;
 const spec = mediaPlacementSpecs[placement];
 if (!spec || !['image','video'].includes(spec.mediaType) || asset?.media_type !== spec.mediaType) return false;
 const section = String(asset?.section_key || '');
 if (section && !(Array.isArray(page.sections) && page.sections.some(item => String(item?.id || '') === section))) return false;
 return true;
}
