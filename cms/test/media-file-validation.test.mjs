import assert from 'node:assert/strict';
import test from 'node:test';

import { validateMediaFileContent } from '../extensions/content-editor-workbench/src/media-file-validation.js';

test('document upload validation rejects a PDF header stub that cannot be opened as a document', async () => {
  const stub = new Blob(['%PDF-1.4'], { type: 'application/pdf' });
  assert.match(await validateMediaFileContent(stub, 'document'), /PDF 文件无效/);
});

test('document upload validation accepts a PDF with header and EOF marker without affecting non-documents', async () => {
  const pdf = new Blob(['%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF\n'], { type: 'application/pdf' });
  assert.equal(await validateMediaFileContent(pdf, 'document'), '');
  assert.equal(await validateMediaFileContent(new Blob(['plain image'], { type: 'image/png' }), 'image'), '');
});
