import test from 'node:test';
import assert from 'node:assert/strict';
import { createCmsPreviewFramePolicy } from '../server/utils/cms-preview-frame-policy.mjs';

test('preview responses allow only configured CMS origins to embed the Nuxt page', () => {
  const policy = createCmsPreviewFramePolicy({
    isPreview: true,
    allowedOrigins: 'http://127.0.0.1:8055, http://localhost:8055'
  });

  assert.equal(policy['x-frame-options'], undefined);
  assert.equal(policy['content-security-policy'], "frame-ancestors http://127.0.0.1:8055 http://localhost:8055");
});

test('public responses remain same-origin framed and do not inherit preview origins', () => {
  const policy = createCmsPreviewFramePolicy({
    isPreview: false,
    allowedOrigins: 'http://127.0.0.1:8055'
  });

  assert.equal(policy['x-frame-options'], 'SAMEORIGIN');
  assert.equal(policy['content-security-policy'], undefined);
});
