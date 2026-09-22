import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Execute the actual workbench upload action with injected HTTP/UI dependencies.
const source = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
const action = source.slice(source.indexOf('async function createMediaCandidate()'), source.indexOf('\nfunction nextDraftSlug('));

async function uploadScenario({ registrationFails = false, refreshFails = false } = {}) {
 const deleted = [];
 const error = { value: '' };
 const message = { value: '' };
 const saving = { value: false };
 const mediaDraft = { value: { file: {name:'test.pdf'}, media_type:'document', usage_scope:'service', placement_key:'service.document', enabled:true } };
 const deps = {
  mediaDraft, saving, error, message,
  validateMediaCandidate: () => '', validateMediaFileContent: async () => '',
  FormData: class { append() {} },
  api: {
   async post(path) {
    if (path === '/files') return {data:{data:{id:'uploaded-file',filename_download:'test.pdf',type:'application/pdf',filesize:585}}};
    if (registrationFails) throw new Error('registration failed');
    return {data:{data:{id:88}}};
   },
   async delete(path) { deleted.push(path); }
  },
  emptyMediaDraft: () => ({}), mediaFileInput: {value:null},
  loadMediaCandidates: async () => { if (refreshFails) throw Object.assign(new Error('refresh failed'), {response:{data:{errors:[{message:'backend unavailable'}]}}}); },
  loadMediaAssets: async () => {}, markDraftSaved: () => {},
  apiError: (reason, fallback) => reason?.response?.data?.errors?.[0]?.message || fallback
 };
 await new Function(...Object.keys(deps), `${action}; return createMediaCandidate();`)(...Object.values(deps));
 return {deleted,error:error.value,message:message.value,saving:saving.value};
}

test('list refresh failure never deletes a successfully registered upload', async () => {
 const result = await uploadScenario({refreshFails:true});
 assert.deepEqual(result.deleted, []);
 assert.match(result.error, /已登记.*刷新/);
 assert.equal(result.saving, false);
});

test('registration failure removes the unattached upload', async () => {
 const result = await uploadScenario({registrationFails:true});
 assert.deepEqual(result.deleted, ['/files/uploaded-file']);
 assert.equal(result.saving, false);
});

test('successful upload keeps its file and reports completion', async () => {
 const result = await uploadScenario();
 assert.deepEqual(result.deleted, []);
 assert.equal(result.error, '');
 assert.match(result.message, /已登记/);
});
