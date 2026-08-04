const cmsPageSlug = document.body.dataset.cmsPage;

function setText(target, value) {
  if (target && typeof value === 'string' && value.trim()) target.textContent = value;
}

function applySection(target, section) {
  setText(target.querySelector('[data-cms-kicker]'), section.kicker);
  setText(target.querySelector('[data-cms-title]'), section.title);
  setText(target.querySelector('[data-cms-body]'), section.body);
}

async function loadCmsPageContent() {
  if (!cmsPageSlug) return;
  try {
    const response = await fetch(`/api/public/v1/pages/${encodeURIComponent(cmsPageSlug)}`, { headers: { Accept: 'application/json' } });
    if (!response.ok) return;
    const payload = await response.json();
    if (!Array.isArray(payload.data?.sections)) return;
    for (const target of document.querySelectorAll('[data-cms-section]')) {
      const section = payload.data.sections.find((candidate) => candidate?.id === target.dataset.cmsSection);
      if (section) applySection(target, section);
    }
    setText(document.querySelector('[data-cms-page-title]'), payload.data.title);
  } catch {
    // Static HTML remains available while CMS content is unavailable.
  }
}

loadCmsPageContent();
