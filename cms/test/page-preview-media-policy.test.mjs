import test from 'node:test';
import assert from 'node:assert/strict';
import { pageAllowsPreviewMedia } from '../content-preview/page-preview-media-policy.mjs';

test('home history grants only the shared about timeline placements', () => {
 const page={slug:'home',sections:[{id:'history'}]};
 const asset={usage_scope:'brand',page_key:'about',section_key:'history',media_type:'image',placement_key:'about.timeline.background'};
 assert.equal(pageAllowsPreviewMedia(page,asset),true);
 assert.equal(pageAllowsPreviewMedia(page,{...asset,placement_key:'about.timeline.icon'}),true);
 assert.equal(pageAllowsPreviewMedia(page,{...asset,placement_key:'about.hero.background'}),false);
 assert.equal(pageAllowsPreviewMedia({...page,sections:[]},asset),false);
 assert.equal(pageAllowsPreviewMedia({...page,slug:'service'},asset),false);
});

test('page preview media belongs to a known page, usage scope and governed placement', () => {
 for(const [slug,scope,placement,type] of [
  ['home','homepage','home.hero.poster','image'],
  ['product','product','product.gallery.image','image'],
  ['manufacturing','manufacturing','manufacturing.hero.image','image'],
  ['news','article','news.hero.video','video'],
  ['about','brand','about.hero.background','image'],
  ['service','service','service.hero.image','image']
 ]) {
  const page={slug,sections:[{id:'hero'}]};
  const asset={usage_scope:scope,page_key:slug,section_key:'hero',placement_key:placement,media_type:type};
  assert.equal(pageAllowsPreviewMedia(page,asset),true,slug);
  assert.equal(pageAllowsPreviewMedia(page,{...asset,page_key:'unrelated'}),false);
  assert.equal(pageAllowsPreviewMedia(page,{...asset,usage_scope:'unrelated'}),false);
  assert.equal(pageAllowsPreviewMedia(page,{...asset,placement_key:`${slug}.unknown`}),false);
  assert.equal(pageAllowsPreviewMedia(page,{...asset,media_type:'document'}),false);
  assert.equal(pageAllowsPreviewMedia(page,{...asset,section_key:'not-in-page'}),false);
 }
 assert.equal(pageAllowsPreviewMedia({slug:'other'},{}),false);
});
