import assert from 'node:assert/strict';
import test from 'node:test';
import { contentCollections } from '../schema/content-model.mjs';
import { buildDirectusSchemaPlan } from '../schema/directus-schema-plan.mjs';

test('CMS exposes a published repair page configuration collection', () => {
  const config = contentCollections.find((collection) => collection.name === 'repair_page_configs');
  assert.ok(config);
  assert.deepEqual(config.defaultValues, { status: 'draft', publication_state: 'unpublished' });
  for (const field of ['page_key', 'title', 'intro', 'hero_asset', 'model_cards', 'action_cards', 'process_steps', 'notices', 'faq_refs', 'seo']) {
    assert.ok(config.fields.some((candidate) => candidate.name === field), `${field} is required`);
  }
  const plan = buildDirectusSchemaPlan();
  assert.deepEqual(plan.collections.find((collection) => collection.collection === 'repair_page_configs').meta.translations, [{ language: 'zh-CN', translation: '售后页面配置' }]);
});
