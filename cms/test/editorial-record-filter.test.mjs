import assert from 'node:assert/strict';
import test from 'node:test';
import { filterEditorialRecords } from '../extensions/content-editor-workbench/src/editorial-record-filter.js';
test('news and video navigation return only their category, including empty lists', () => {
 const records = [{id:1,category:'news'}, {id:2,category:'video'}];
 assert.deepEqual(filterEditorialRecords(records,'news'), [records[0]]);
 assert.deepEqual(filterEditorialRecords(records,'video'), [records[1]]);
 assert.deepEqual(filterEditorialRecords([records[1]],'news'), []);
 assert.deepEqual(filterEditorialRecords(records,''), records);
 assert.deepEqual(filterEditorialRecords(null,'news'), []);
});
