import { readFile } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';

const [baseUrl, email, password, datasetId, sourceFile, originalName] = process.argv.slice(2);

if (![baseUrl, email, password, datasetId, sourceFile, originalName].every(Boolean)) {
  throw new Error('Usage: node replace_dify_document.mjs <baseUrl> <email> <password> <datasetId> <sourceFile> <originalName>');
}

const apiBase = `${baseUrl.replace(/\/$/, '')}/console/api`;
const loginResponse = await fetch(`${apiBase}/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password, remember_me: false }),
});
const login = await loginResponse.json();
if (!loginResponse.ok) {
  throw new Error(`Login failed: ${login.message ?? login.code ?? loginResponse.status}`);
}

const token = login.data?.access_token ?? login.data?.accessToken ?? login.access_token;
if (!token) {
  throw new Error('Login succeeded but no access token was returned.');
}
const headers = { Authorization: `Bearer ${token}` };

const documentResponse = await fetch(`${apiBase}/datasets/${datasetId}/documents?limit=100&fetch=true`, { headers });
const documentList = await documentResponse.json();
if (!documentResponse.ok) {
  throw new Error(`Cannot list dataset documents: ${documentList.message ?? documentResponse.status}`);
}
const originalDocument = documentList.data?.find((document) => document.name === originalName);
if (!originalDocument) {
  throw new Error(`Existing document '${originalName}' was not found; no changes were made.`);
}

const fileBuffer = await readFile(sourceFile);
const form = new FormData();
form.append('file', new Blob([fileBuffer], { type: 'text/markdown; charset=utf-8' }), basename(sourceFile));
form.append('source', 'datasets');
const uploadResponse = await fetch(`${apiBase}/files/upload`, {
  method: 'POST',
  headers,
  body: form,
});
const uploadedFile = await uploadResponse.json();
if (!uploadResponse.ok) {
  throw new Error(`Upload failed: ${uploadedFile.message ?? uploadResponse.status}`);
}

const payload = {
  original_document_id: originalDocument.id,
  duplicate: false,
  indexing_technique: 'high_quality',
  doc_form: 'text_model',
  doc_language: 'Chinese',
  is_multimodal: false,
  process_rule: { mode: 'automatic' },
  data_source: {
    info_list: {
      data_source_type: 'upload_file',
      file_info_list: { file_ids: [uploadedFile.id] },
    },
  },
};
const createResponse = await fetch(`${apiBase}/datasets/${datasetId}/documents`, {
  method: 'POST',
  headers: { ...headers, 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});
const created = await createResponse.json();
if (!createResponse.ok) {
  throw new Error(`Replacement import failed: ${created.message ?? created.code ?? createResponse.status}`);
}

console.log(JSON.stringify({
  replaced_document_id: originalDocument.id,
  imported_document_name: basename(sourceFile),
  batch: created.batch,
  document_ids: created.documents?.map((document) => document.id) ?? [],
}, null, 2));
