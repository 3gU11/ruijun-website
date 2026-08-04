import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { validateRepairAttachments } from '../server/repair-attachment-policy.js';

function imageDataUrl(mime, bytes) {
  return `data:${mime};base64,${Buffer.from(bytes).toString('base64')}`;
}

test('accepts at most two real JPEG, PNG, or WebP verification images before persistence', () => {
  const uploads = validateRepairAttachments([
    {
      name: 'machine.jpg',
      category: 'machine_nameplate',
      dataUrl: imageDataUrl('image/jpeg', [0xff, 0xd8, 0xff, 0xd9])
    },
    {
      name: 'part.webp',
      category: 'component_serial',
      dataUrl: imageDataUrl('image/webp', Buffer.from('524946460000000057454250', 'hex'))
    }
  ]);

  assert.equal(uploads.length, 2);
  assert.deepEqual(uploads.map((item) => ({ extension: item.extension, category: item.category })), [
    { extension: 'jpg', category: 'machine_nameplate' },
    { extension: 'webp', category: 'component_serial' }
  ]);
});

test('rejects a MIME spoof, too many files, and oversized batch before any file can be written', () => {
  assert.throws(
    () => validateRepairAttachments([{ dataUrl: imageDataUrl('image/jpeg', [0x89, 0x50, 0x4e, 0x47]) }]),
    /实际内容不匹配/
  );
  assert.throws(
    () => validateRepairAttachments(Array.from({ length: 3 }, () => ({ dataUrl: imageDataUrl('image/png', [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) }))),
    /最多上传 2 张/
  );

  const largePng = Buffer.alloc(3 * 1024 * 1024 + 1);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(largePng);
  assert.throws(
    () => validateRepairAttachments([{ dataUrl: imageDataUrl('image/png', largePng) }, { dataUrl: imageDataUrl('image/png', largePng) }]),
    /总大小不能超过 6MB/
  );
});

test('keeps the client precheck aligned with the server total-size limit', async () => {
  const source = await readFile(new URL('../src/ClientApp.vue', import.meta.url), 'utf8');

  assert.match(source, /MAX_SUPPLEMENT_TOTAL_BYTES = 6 \* 1024 \* 1024/);
  assert.match(source, /existingBytes \+ file\.size > MAX_SUPPLEMENT_TOTAL_BYTES/);
});
