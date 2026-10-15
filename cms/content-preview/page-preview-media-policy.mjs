import { mediaPlacementSpecs } from '../content-workflow/media-asset-governance.mjs';

const pageScopes = Object.freeze({home:'homepage',product:'product',manufacturing:'manufacturing',news:'article',about:'brand',service:'service'});

export function homepageSectionAllowsPreviewMedia(record, asset) {
 const sections = ['performance', 'advanced-manufacturing', 'industry-leadership'];
 const placements = ['home.reason.background', 'home.reason.machine', 'home.reason.icon'];
 return record?.page_key === 'home' && sections.includes(record?.section_key)
  && asset?.page_key === 'home' && asset?.section_key === record.section_key
  && asset?.usage_scope === 'homepage' && asset?.media_type === 'image'
  && placements.includes(asset?.placement_key);
}

export function pageAllowsPreviewMedia(page, asset) {
 const slug = String(page?.slug || '');
 if (slug === 'home' && page.sections?.some(section => section?.id === 'history')
  && asset?.usage_scope === 'brand' && asset?.page_key === 'about' && asset?.section_key === 'history'
  && asset?.media_type === 'image' && ['about.timeline.background','about.timeline.icon'].includes(asset?.placement_key)) return true;
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
