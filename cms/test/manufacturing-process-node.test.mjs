import assert from 'node:assert/strict';
import test from 'node:test';
import { createManufacturingProcessNode } from '../extensions/content-editor-workbench/src/manufacturing-process-node.js';

test('a new manufacturing process node receives controlled canvas defaults', () => {
  assert.deepEqual(createManufacturingProcessNode(0), {
    label: '',
    title: '新工艺节点 1',
    body: '',
    description: '',
    connection_label: '',
    anchor: 'auto',
    media_role: 'process-node-1',
    alt: '',
    href: '',
    sort_order: 0
  });
});

test('a new manufacturing process node derives independent ordering metadata', () => {
  assert.deepEqual(createManufacturingProcessNode(5), {
    label: '',
    title: '新工艺节点 6',
    body: '',
    description: '',
    connection_label: '',
    anchor: 'auto',
    media_role: 'process-node-6',
    alt: '',
    href: '',
    sort_order: 5
  });
});

test('a new manufacturing process node rejects invalid ordering input', () => {
  assert.throws(() => createManufacturingProcessNode(-1), /non-negative integer/);
  assert.throws(() => createManufacturingProcessNode(1.5), /non-negative integer/);
});
