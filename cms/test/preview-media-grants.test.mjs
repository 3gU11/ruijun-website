import test from 'node:test';
import assert from 'node:assert/strict';
import { createPreviewMediaGrantStore } from '../content-preview/preview-media-grants.mjs';

test('media grants bind an asset to one content target and can only be consumed once', () => {
 const store = createPreviewMediaGrantStore();
 const target = { collection: 'articles', itemId: '42' };
 const token = store.issue({ ...target, assetId: '98' });
 assert.equal(store.consume(token, { ...target, itemId: '43' }), null);
 assert.equal(store.consume(token, { ...target, collection: 'pages' }), null);
 assert.deepEqual(store.consume(token, target), { ...target, assetId: '98' });
 assert.equal(store.consume(token, target), null);
});

test('media grants expire and invalid targets cannot be issued', () => {
 let now = 0;
 const store = createPreviewMediaGrantStore({ now: () => now });
 const target = { collection: 'articles', itemId: '42' };
 const token = store.issue({ ...target, assetId: '98' });
 now = 60001;
 assert.equal(store.consume(token, target), null);
 assert.throws(() => store.issue({ ...target, assetId: '../files' }));
 assert.throws(() => store.issue({ collection: 'users', itemId: '42', assetId: '98' }));
 assert.equal(store.consume('unknown', target), null);
});

test('media grants keep independent tokens for parallel preview requests and bound storage', () => {
 const store = createPreviewMediaGrantStore({ maxEntries: 2 });
 const target = { collection: 'articles', itemId: '42' };
 const first = store.issue({ ...target, assetId: '1' });
 const second = store.issue({ ...target, assetId: '2' });
 const third = store.issue({ ...target, assetId: '3' });
 assert.equal(store.consume(first, target), null);
 assert.equal(store.consume(second, target).assetId, '2');
 assert.equal(store.consume(third, target).assetId, '3');
});
