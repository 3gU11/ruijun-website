import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createAttachmentDownloadAudit } from '../server/attachment-download-audit.js';

test('records a successful private attachment download without persisting its URL or filename', () => {
  const audit = createAttachmentDownloadAudit({
    requestNo: 'RQ-20260801-001',
    attachmentId: 'RQ-20260801-001-ATT-123456',
    url: '/uploads/repair-requests/RQ-20260801-001/component-abcdef12.png',
    fileName: 'customer-machine-photo.png'
  });

  assert.deepEqual(audit, {
    action: '下载维修附件',
    targetNo: 'RQ-20260801-001',
    note: '附件记录：RQ-20260801-001-ATT-123456'
  });
  assert.doesNotMatch(JSON.stringify(audit), /uploads|customer-machine-photo|\.png/i);
});

test('keeps the audit payload bounded when legacy attachment metadata is incomplete', () => {
  const audit = createAttachmentDownloadAudit({ requestNo: 'R'.repeat(200), attachmentId: '' });

  assert.equal(audit.targetNo.length, 120);
  assert.equal(audit.note, '附件记录：未知');
});

test('only sends registered files after persisting their download audit event', async () => {
  const source = await readFile(new URL('../server/index.js', import.meta.url), 'utf8');

  assert.match(source, /repairRequest\.attachments \|\| \[\]\)\.find/);
  assert.match(source, /if \(!attachment\) return res\.status\(404\)/);
  assert.match(source, /createAttachmentDownloadAudit\(/);
  assert.match(source, /await saveDb\(req\.db\);[\s\S]*return res\.sendFile\(filePath\)/);
});
