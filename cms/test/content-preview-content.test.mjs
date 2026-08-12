import assert from 'node:assert/strict';
import test from 'node:test';

import { previewCollectionFields, previewContentRecord } from '../content-preview/content-preview-content.mjs';

test('draft preview keeps public-facing fields and removes private evidence', () => {
  const preview = previewContentRecord('pages', {
    id: 'page-1', title: '页面标题', slug: 'about', status: 'draft', publication_state: 'unpublished',
    sections: [{ id: 'intro', title: '段落', body: '正文', requires_claim_review: true, source_url: 'https://private.example' }],
    source_document: 'internal.docx', source_url: 'https://private.example', contacts: { phone: '15000000000' }
  });
  assert.deepEqual(preview, {
    id: 'page-1', title: '页面标题', slug: 'about', status: 'draft', publication_state: 'unpublished',
    sections: [{ id: 'intro', title: '段落', body: '正文', requires_claim_review: true }]
  });
  assert.ok(!previewCollectionFields('pages').includes('source_document'));
});

test('service location draft preview excludes contact details', () => {
  const preview = previewContentRecord('service_locations', {
    id: 'location-1', region: '华东', city: '杭州', service_scope: '维修', contact: { phone: '15000000000' }, status: 'draft', publication_state: 'unpublished'
  });
  assert.equal(preview.city, '杭州');
  assert.equal('contact' in preview, false);
});

