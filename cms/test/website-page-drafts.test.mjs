import assert from 'node:assert/strict';
import test from 'node:test';

const { buildWebsitePageDrafts } = await import('../import/website-page-drafts.mjs');

test('website page drafts preserve every governed website page as a non-public CMS record', () => {
  const drafts = buildWebsitePageDrafts();

  assert.deepEqual(drafts.map((page) => page.slug), ['home', 'product', 'manufacturing', 'news', 'about', 'service']);
  for (const page of drafts) {
    assert.equal(page.status, 'draft');
    assert.equal(page.publication_state, 'unpublished');
    assert.ok(page.source_document);
    assert.ok(page.review_note);
    assert.ok(Array.isArray(page.sections));
  }
});

test('product page draft exposes the three proof metrics shown above the product cards', () => {
  const product = buildWebsitePageDrafts().find((page) => page.slug === 'product');
  const proofIds = product.sections
    .filter((section) => section.id.startsWith('proof-'))
    .map((section) => section.id);

  assert.deepEqual(proofIds, ['proof-efficiency', 'proof-years', 'proof-champion']);
  assert.deepEqual(product.sections.find((section) => section.id === 'proof-efficiency'), {
    id: 'proof-efficiency',
    title: '增效降损',
    body: '效能提升50%，丝损降低30%',
    requires_claim_review: true
  });
});

test('home hero and about client galleries are present without a manual fill step', () => {
  const drafts = buildWebsitePageDrafts();
  const home = drafts.find((page) => page.slug === 'home');
  const about = drafts.find((page) => page.slug === 'about');

  assert.ok(home.sections.some((section) => section.id === 'hero'));
  assert.ok(home.sections.some((section) => section.id === 'products'));
  assert.ok(about.sections.some((section) => section.id === 'brand-story' && section.body));
  assert.ok(about.sections.some((section) => section.id === 'overview' && section.items.length === 6));
  assert.ok(about.sections.some((section) => section.id === 'clients-domestic'));
  assert.ok(about.sections.some((section) => section.id === 'clients-global'));
});

test('website page drafts retain unverified promotional numbers as explicit review-required claims', () => {
  const home = buildWebsitePageDrafts().find((page) => page.slug === 'home');
  const claim = home.sections.find((section) => section.id === 'industry-leadership');

  assert.equal(claim.requires_claim_review, true);
  assert.match(claim.title, /全国第一/);
});

test('about patent claim keeps the heading and supporting figure in separate fields', () => {
  const about = buildWebsitePageDrafts().find((page) => page.slug === 'about');
  const patents = about.sections.find((section) => section.id === 'patents');

  assert.equal(patents.title, '专利证书');
  assert.equal(patents.description, '79件专利，其中发明专利9件');
  assert.equal(patents.requires_claim_review, true);
});
