import { fieldPresentationAttributes } from '../shared/section-presentation.mjs';

const fieldName = /^[A-Za-z_][A-Za-z0-9_]*$/;
const presentationPath = /^field_presentation\.([A-Za-z_][A-Za-z0-9_]*)$/;
const blockedNames = new Set(['__proto__', 'prototype', 'constructor']);
const styleKeys = [
  '--cms-offset-x-desktop', '--cms-offset-y-desktop', '--cms-offset-x-mobile', '--cms-offset-y-mobile',
  '--cms-text-weight', '--cms-text-line-height', '--cms-text-color', '--cms-text-size-desktop', '--cms-text-size-mobile'
];

function parsePresentations(value) {
  try {
    const parsed = JSON.parse(String(value || ''));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function resolveCmsFieldPresentationPath({ fieldPath = '', positionFieldPath = '' } = {}) {
  const position = String(positionFieldPath || '').trim();
  if (position) {
    const match = position.match(presentationPath);
    return match && !blockedNames.has(match[1]) ? match[1] : '';
  }
  const field = String(fieldPath || '').trim();
  return fieldName.test(field) && !blockedNames.has(field) ? field : '';
}

export function cmsFieldPresentationDomAttributes(presentation) {
  const attributes = fieldPresentationAttributes({ field_presentation: { value: presentation } }, 'value');
  return {
    className: 'cms-field-presentation',
    dataset: {
      cmsLayoutEnabled: attributes['data-cms-layout-enabled'],
      cmsTextEnabled: attributes['data-cms-text-enabled']
    },
    style: attributes.style
  };
}

function clearAppliedPresentation(element) {
  if (element.dataset.cmsFieldPresentationManaged !== 'true') return;
  element.classList.remove('cms-field-presentation');
  delete element.dataset.cmsLayoutEnabled;
  delete element.dataset.cmsTextEnabled;
  delete element.dataset.cmsFieldPresentationManaged;
  for (const key of styleKeys) element.style.removeProperty(key);
}

function applyPresentation(element, presentation) {
  const attributes = cmsFieldPresentationDomAttributes(presentation);
  element.classList.add(attributes.className);
  element.dataset.cmsLayoutEnabled = attributes.dataset.cmsLayoutEnabled;
  element.dataset.cmsTextEnabled = attributes.dataset.cmsTextEnabled;
  element.dataset.cmsFieldPresentationManaged = 'true';
  for (const [key, value] of Object.entries(attributes.style)) element.style.setProperty(key, value);
}

export function syncCmsFieldPresentations(documentObject = document) {
  const activeElements = new Set();
  for (const root of documentObject.querySelectorAll?.('[data-cms-field-presentations]') || []) {
    const presentations = parsePresentations(root.getAttribute('data-cms-field-presentations'));
    const fields = new Set(Object.keys(presentations).filter((field) => fieldName.test(field) && !blockedNames.has(field)));
    const candidates = [root, ...root.querySelectorAll('[data-cms-preview-field-path], [data-cms-preview-field]')];
    for (const element of candidates) {
      // A nested section owns its descendants and must not inherit the outer
      // section's field-level presentation accidentally.
      if (element !== root && element.closest?.('[data-cms-field-presentations]') !== root) continue;
      const field = resolveCmsFieldPresentationPath({
        fieldPath: element.getAttribute('data-cms-preview-field-path') || element.getAttribute('data-cms-preview-field'),
        positionFieldPath: element.getAttribute('data-cms-preview-position-field-path')
      });
      if (field && fields.has(field)) {
        applyPresentation(element, presentations[field]);
        activeElements.add(element);
      } else {
        clearAppliedPresentation(element);
      }
    }
  }
  for (const element of documentObject.querySelectorAll?.('[data-cms-field-presentation-managed="true"]') || []) {
    if (!activeElements.has(element)) clearAppliedPresentation(element);
  }
}

export function installCmsFieldPresentationRenderer(documentObject = document) {
  let frame = 0;
  const schedule = () => {
    if (frame) return;
    frame = window.requestAnimationFrame(() => {
      frame = 0;
      syncCmsFieldPresentations(documentObject);
    });
  };
  schedule();
  const observer = new MutationObserver(schedule);
  observer.observe(documentObject.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['data-cms-field-presentations']
  });
  return () => {
    observer.disconnect();
    if (frame) window.cancelAnimationFrame(frame);
  };
}
