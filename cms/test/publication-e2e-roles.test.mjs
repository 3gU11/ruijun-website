import assert from 'node:assert/strict';
import test from 'node:test';

import { resolvePublicationWorkflowRoles } from '../scripts/publication-e2e-roles.mjs';

test('publication rehearsal resolves the current unified Chinese review role', () => {
  const roles = [
    { id: 'editor-1', name: '内容编辑' },
    { id: 'review-1', name: '审核管理' }
  ];
  assert.deepEqual(resolvePublicationWorkflowRoles(roles), {
    editorRoleId: 'editor-1',
    reviewerRoleId: 'review-1',
    publisherRoleId: 'review-1'
  });
});

test('publication rehearsal keeps compatibility with legacy split role labels', () => {
  const roles = [
    { id: 'editor-1', name: 'Content editor' },
    { id: 'review-1', name: '品牌审核人员' },
    { id: 'publisher-1', name: '发布人员' }
  ];
  assert.deepEqual(resolvePublicationWorkflowRoles(roles), {
    editorRoleId: 'editor-1',
    reviewerRoleId: 'review-1',
    publisherRoleId: 'publisher-1'
  });
});

test('publication rehearsal rejects an incomplete role set without guessing', () => {
  assert.throws(() => resolvePublicationWorkflowRoles([{ id: 'review-1', name: '审核管理' }]), /content editor role is not configured/);
  assert.throws(() => resolvePublicationWorkflowRoles([{ id: 'editor-1', name: '内容编辑' }]), /reviewer role is not configured/);
});
