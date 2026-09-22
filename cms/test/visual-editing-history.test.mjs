import assert from 'node:assert/strict';
import test from 'node:test';

import { createVisualHistory, recordVisualSnapshot, stepVisualHistory } from '../extensions/content-editor-workbench/src/visual-editing-history.js';

test('history starts from an immutable saved baseline and ignores duplicate snapshots', () => {
  const draft = { title: '初始标题', sections: [{ title: '第一段' }] };
  const history = createVisualHistory(draft);
  draft.sections[0].title = '外部修改';
  assert.equal(history.entries[0].sections[0].title, '第一段');
  assert.deepEqual(recordVisualSnapshot(history, history.entries[0]), history);
});

test('undo and redo return cloned states without mutating stored history', () => {
  let history = createVisualHistory({ title: 'A' });
  history = recordVisualSnapshot(history, { title: 'B' });
  history = recordVisualSnapshot(history, { title: 'C' });
  const undone = stepVisualHistory(history, -1);
  assert.equal(undone.state.title, 'B');
  undone.state.title = '外部修改';
  assert.equal(undone.history.entries[1].title, 'B');
  const redone = stepVisualHistory(undone.history, 1);
  assert.equal(redone.state.title, 'C');
});

test('a new edit after undo removes the abandoned redo branch', () => {
  let history = createVisualHistory({ title: 'A' });
  history = recordVisualSnapshot(history, { title: 'B' });
  history = recordVisualSnapshot(history, { title: 'C' });
  history = stepVisualHistory(history, -1).history;
  history = recordVisualSnapshot(history, { title: 'D' });
  assert.deepEqual(history.entries.map((entry) => entry.title), ['A', 'B', 'D']);
  assert.equal(stepVisualHistory(history, 1), null);
});

test('history is bounded while retaining the current state', () => {
  let history = createVisualHistory({ value: 0 });
  for (let value = 1; value <= 110; value += 1) history = recordVisualSnapshot(history, { value });
  assert.equal(history.entries.length, 100);
  assert.equal(history.entries.at(-1).value, 110);
  assert.equal(history.index, 99);
});
