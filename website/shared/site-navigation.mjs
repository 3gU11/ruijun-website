function isInternalHref(value) {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//');
}

function isLink(value) {
  return typeof value?.label === 'string' && value.label.trim().length > 0 && isInternalHref(value.href);
}

export function resolveNavigation(settings, fallback) {
  const navigation = Array.isArray(settings?.navigation) ? settings.navigation.filter(isLink).map((item) => ({ label: item.label.trim(), href: item.href })) : [];
  return navigation.length > 0 ? navigation : fallback;
}

export function resolveHeaderCta(settings, fallback) {
  const cta = settings?.contacts?.header_cta;
  return isLink(cta) ? { label: cta.label.trim(), href: cta.href } : fallback;
}
