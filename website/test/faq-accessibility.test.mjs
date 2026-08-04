import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);

test('FAQ dialogs announce dynamic answers politely and support Escape dismissal', async () => {
  const [globalAssistant, servicePage] = await Promise.all([
    readFile(new URL('components/GlobalFaqAssistant.vue', root), 'utf8'),
    readFile(new URL('pages/service.vue', root), 'utf8')
  ]);

  for (const source of [globalAssistant, servicePage]) {
    assert.match(source, /aria-live="polite"/);
    assert.match(source, /event\.key === 'Escape'/);
  }
});

test('global FAQ moves focus into the dialog and restores it to its trigger on close', async () => {
  const globalAssistant = await readFile(new URL('components/GlobalFaqAssistant.vue', root), 'utf8');
  assert.match(globalAssistant, /function openAssistant\(\)/);
  assert.match(globalAssistant, /questionInput\.value\?\.focus\(\)/);
  assert.match(globalAssistant, /function closeAssistant\(\)/);
  assert.match(globalAssistant, /trigger\.value\?\.focus\(\)/);
  assert.match(globalAssistant, /ref="questionInput"/);
  assert.match(globalAssistant, /ref="trigger"/);
});

test('service assistant moves focus into its dialog and restores the source action on close', async () => {
  const servicePage = await readFile(new URL('pages/service.vue', root), 'utf8');
  assert.match(servicePage, /let lastFocusTarget: HTMLElement \| null = null/);
  assert.match(servicePage, /document\.activeElement/);
  assert.match(servicePage, /document\.querySelector<HTMLInputElement>\('\.assistant-dialog input'\)\?\.focus\(\)/);
  assert.match(servicePage, /watch\(dialogOpen/);
  assert.match(servicePage, /lastFocusTarget\?\.focus\(\)/);
});
