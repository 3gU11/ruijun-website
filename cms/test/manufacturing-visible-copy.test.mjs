import assert from 'node:assert/strict';
import test from 'node:test';
import { materializeManufacturingVisibleCopy } from '../scripts/materialize-manufacturing-visible-copy.mjs';

test('manufacturing visible copy is materialized once without overwriting an intentional later clear', () => {
  const page = {
    id: 8,
    slug: 'manufacturing',
    sections: [
      { id: 'hero', title: '先进制造', body: '全产业链制造与严格质量控制。' },
      { id: 'precision-machining', title: 'CNC车间', description: '', body: '' },
      { id: 'sheet-metal', title: '钣金车间', description: '', body: '' }
    ]
  };

  const first = materializeManufacturingVisibleCopy(page);
  assert.equal(first.changed, true);
  assert.equal(first.record.sections[0].processTitle, 'World’s top class\nproduction process');
  assert.equal(first.record.sections[0].outputText, '年产量可达10000台');
  assert.equal(first.record.sections[1].description, '自动化数控设备替代了传统的机械加工，\n拥有 100 多台套加工母机');
  assert.equal(first.record.sections[1].detail, '核心设备：\n五面体龙门、五轴数控、立式、卧式等\n各类加工中心、平面磨床、导轨磨床');
  assert.equal(first.record.sections[2].detail, '智能核心设备：智能下料单元、智能成型单元、\n智能焊接与连接单元、静电喷涂产线');
  assert.equal(first.record.sections[1].visible_copy_materialized, true);

  const intentionallyCleared = structuredClone(first.record);
  intentionallyCleared.sections[1].description = '';
  const second = materializeManufacturingVisibleCopy(intentionallyCleared);
  assert.equal(second.changed, false);
  assert.equal(second.record.sections[1].description, '');
});

test('manufacturing visible copy leaves other pages and unrelated fields untouched', () => {
  const unrelated = { slug: 'home', sections: [{ id: 'precision-machining', description: '' }] };
  assert.deepEqual(materializeManufacturingVisibleCopy(unrelated), { changed: false, record: unrelated });
});
