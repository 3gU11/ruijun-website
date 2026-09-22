import test from 'node:test';
import assert from 'node:assert/strict';
import { authorizePreviewMediaGrant } from '../server/services/cms-preview-media-grant.mjs';
test('a related article already issued with the session can receive its own media grant', async () => {
 const session={data:{collection:'pages',itemId:'5',preview:{id:5,related:{articles:[{id:42}]}}}};
 const input={token:'grant',collection:'articles',itemId:'42'};
 const consume=async()=>({collection:'articles',itemId:'42',assetId:'98'});
 await authorizePreviewMediaGrant({session,input,consume});
 assert.deepEqual(session.data.preview.authorized_media,[{media_asset_id:'98'}]);
 let consumed=false;
 await assert.rejects(authorizePreviewMediaGrant({session,input:{...input,itemId:'43'},consume:async()=>{consumed=true;return {};}}));
 assert.equal(consumed,false);
});
test('only a matching redeemed grant extends the existing session media allowlist', async () => {
 const session={data:{collection:'articles',itemId:'42',preview:{id:42}}};
 const input={token:'grant',collection:'articles',itemId:'42'};
 const consume=async()=>({collection:'articles',itemId:'42',assetId:'98'});
 await authorizePreviewMediaGrant({session,input,consume});
 assert.deepEqual(session.data.preview.authorized_media,[{media_asset_id:'98'}]);
 await assert.rejects(authorizePreviewMediaGrant({session,input:{...input,itemId:'43'},consume}));
 await assert.rejects(authorizePreviewMediaGrant({session:null,input,consume}));
 await assert.rejects(authorizePreviewMediaGrant({session,input,consume:async()=>({collection:'articles',itemId:'43',assetId:'99'})}));
 assert.deepEqual(session.data.preview.authorized_media,[{media_asset_id:'98'}]);
});
test('failed redemption leaves the preview session unchanged', async () => {
 const session={data:{collection:'articles',itemId:'42',preview:{id:42}}};
 await assert.rejects(authorizePreviewMediaGrant({session,input:{token:'bad',collection:'articles',itemId:'42'},consume:async()=>{throw Error('expired');}}));
 assert.deepEqual(session.data.preview,{id:42});
});
