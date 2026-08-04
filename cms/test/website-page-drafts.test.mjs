import assert from 'node:assert/strict';
import test from 'node:test';

const { buildWebsitePageDrafts } = await import('../import/website-page-drafts.mjs');

test('website page drafts preserve home, about, and service content as non-public CMS records', () => {
  const drafts = buildWebsitePageDrafts();

  assert.deepEqual(drafts.map((page) => page.slug), ['home', 'about', 'service']);
  for (const page of drafts) {
    assert.equal(page.status, 'draft');
    assert.equal(page.publication_state, 'unpublished');
    assert.ok(page.source_document);
    assert.ok(page.review_note);
    assert.ok(Array.isArray(page.sections));
  }
});

test('website page drafts retain unverified promotional numbers as explicit review-required claims', () => {
  const home = buildWebsitePageDrafts().find((page) => page.slug === 'home');
  const claim = home.sections.find((section) => section.id === 'industry-leadership');

  assert.equal(claim.requires_claim_review, true);
  assert.match(claim.title, /全国第一/);
});
