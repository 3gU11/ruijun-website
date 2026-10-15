import test from 'node:test';
import assert from 'node:assert/strict';
import { overlayHomepageSectionDrafts } from '../shared/homepage-preview-sections.mjs';
import { resolvePageSection } from '../shared/page-sections.mjs';
import { sectionPresentationAttributes } from '../shared/section-presentation.mjs';

test('dedicated homepage drafts overlay only their section and retain actual record identity', () => {
  const page = { id: 1, sections: [{ id: 'performance', title: 'original' }, { id: 'history', title: 'untouched' }] };
  const record = { id: 42, page_key: 'home', section_key: 'performance', content: { title: 'draft' }, media: [{ role: 'foreground', media_asset_id: 89 }] };
  const result = overlayHomepageSectionDrafts(page, [record]);
  assert.equal(result.sections[0].cms_item_id, '42');
  assert.equal(result.sections[0].cms_collection, 'homepage_sections');
  assert.deepEqual(result.sections[0].content, record.content);
  assert.deepEqual(result.sections[0].media, record.media);
  assert.deepEqual(result.sections[1], page.sections[1]);
  assert.equal(page.sections[0].title, 'original');
  assert.equal(overlayHomepageSectionDrafts(page, [{ ...record, page_key: 'about' }]), page);
  assert.equal(overlayHomepageSectionDrafts(page, [{ ...record, id: null }]), page);
});

test('dedicated draft works when the public homepage is absent', () => {
  const result = overlayHomepageSectionDrafts(null, [{ id: 7, page_key: 'home', section_key: 'advanced-manufacturing', media: [] }]);
  assert.equal(result.slug, 'home');
  assert.equal(result.sections[0].id, 'advanced-manufacturing');
  assert.equal(result.sections[0].cms_item_id, '7');
});

test('standalone heading preview emits complete identity even without a parent page id', () => {
  const page = overlayHomepageSectionDrafts(null, [{ id: 11, page_key: 'home', section_key: 'why-ruijun', title: 'Draft heading' }]);
  const section = resolvePageSection(page, 'why-ruijun', { title: 'Fallback' });
  const attributes = sectionPresentationAttributes(section);
  assert.equal(attributes['data-cms-preview-collection'], 'homepage_sections');
  assert.equal(attributes['data-cms-preview-item-id'], '11');
  assert.equal(attributes['data-cms-preview-key'], 'why-ruijun');
  assert.equal(section.title, 'Draft heading');
});
