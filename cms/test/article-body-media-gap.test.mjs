import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('article body deliberately remains text-only until governed inline media is modeled', async () => {
 const source=await readFile(new URL('../../website/utils/safe-rich-text.ts',import.meta.url),'utf8');
 assert.doesNotMatch(source,/allowedTags\s*=.*img/);
 assert.match(source,/function safeHref/);
});
