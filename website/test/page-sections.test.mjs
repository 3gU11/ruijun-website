import assert from 'node:assert/strict';
import test from 'node:test';

const { resolvePageSection } = await import('../shared/page-sections.mjs');

test('page section resolver overlays only valid published CMS copy onto visual fallbacks', () => {
  const fallback = { kicker: 'WHY RUIJUN', title: '默认标题', body: '默认说明' };
  const page = { sections: [{ id: 'why-ruijun', kicker: 'WHY', title: '已审核标题', body: '已审核说明' }] };

  assert.deepEqual(resolvePageSection(page, 'why-ruijun', fallback), { kicker: 'WHY', title: '已审核标题', body: '已审核说明' });
  assert.deepEqual(resolvePageSection({ sections: [{ id: 'why-ruijun', title: '  ' }] }, 'why-ruijun', fallback), fallback);
});

test('page section resolver never renders a section still marked for claim review', () => {
  const fallback = { title: '默认标题', body: '默认说明' };
  const page = { sections: [{ id: 'industry-leadership', title: '未经审核的排名主张', requires_claim_review: true }] };

  assert.deepEqual(resolvePageSection(page, 'industry-leadership', fallback), fallback);
});
