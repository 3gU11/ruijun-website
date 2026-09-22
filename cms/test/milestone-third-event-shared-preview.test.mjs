import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('third milestone event verifier renders one record on both about and home previews without adjacent writes', async () => {
  const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  const script = await readFile(new URL('../scripts/verify-milestone-third-event-shared-preview.mjs', import.meta.url), 'utf8');

  assert.equal(packageJson.scripts['visual:verify-milestone-third-event'], 'node ./scripts/verify-milestone-third-event-shared-preview.mjs');
  assert.match(script, /milestoneId = '3'/);
  assert.match(script, /event = marker/);
  assert.match(script, /milestoneId: 1/);
  assert.match(script, /milestoneId: 2/);
  assert.match(script, /contentCollection: 'milestones'/);
  assert.match(script, /data-cms-preview-key="timeline-2006"/);
  assert.match(script, /home preview did not render/);
  assert.match(script, /restored: true/);
});
