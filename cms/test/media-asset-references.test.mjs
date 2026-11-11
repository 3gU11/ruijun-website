import assert from 'node:assert/strict';
import test from 'node:test';
import { collectMediaAssetReferences } from '../content-preview/media-asset-references.mjs';

function mockDatabase(rows) {
  return (table) => ({ select: async () => rows[table] || [] });
}

test('delete scan finds governed media and poster references', async () => {
  const database = mockDatabase({
    articles: [{ id: 7, title: '测试2', media: [{ media_asset_id: '8' }] }],
    pages: [{ id: 1, slug: 'news', sections: [{ id: 'video-sharing', media: [{ role: 'background', media_asset_id: 8 }] }] }],
    media_assets: [{ id: 8, title: '一处间隙' }, { id: 9, title: '封面', poster_asset_id: '8' }]
  });
  const references = await collectMediaAssetReferences(database, 8);
  assert.equal(references.length, 3);
  assert.ok(references.some((reference) => reference.collection === 'articles' && reference.fields.includes('media[0].media_asset_id')));
  assert.ok(references.some((reference) => reference.collection === 'pages' && reference.fields.includes('sections[0].media[0].media_asset_id')));
  assert.ok(references.some((reference) => reference.collection === 'media_assets' && reference.fields.includes('poster_asset_id')));
});

test('delete scan ignores the asset row itself and unrelated text', async () => {
  const database = mockDatabase({
    articles: [{ id: 1, title: '8', summary: '素材 8 的说明' }],
    media_assets: [{ id: 8, title: '一处间隙' }]
  });
  assert.deepEqual(await collectMediaAssetReferences(database, '8'), []);
});

test('delete scan tolerates missing or unreadable collections', async () => {
  const database = (table) => ({
    select: async () => {
      if (table === 'articles') throw new Error('no table');
      return [];
    }
  });
  assert.deepEqual(await collectMediaAssetReferences(database, 8), []);
});
