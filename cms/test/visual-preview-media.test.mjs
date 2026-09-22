import assert from 'node:assert/strict';
import test from 'node:test';

import { materializeVisualMediaRecord } from '../extensions/content-editor-workbench/src/visual-preview-media.js';

function resolver(records) {
  const map = new Map(Object.entries(records));
  return (id) => map.get(String(id)) || null;
}

test('materializes governed page media and nested content references for the live preview snapshot', () => {
  const record = {
    id: 1,
    slug: 'home',
    sections: [{
      id: 'hero',
      media: [{ media_asset_id: 7, role: 'background' }, { media_asset_id: '8', role: 'video', poster_asset_id: 9 }],
      content: { items: [{ media_asset_id: 7, media_role: 'background', title: '首屏' }] }
    }]
  };

  const result = materializeVisualMediaRecord(record, resolver({
    7: { path: 'http://127.0.0.1:8055/assets/hero.jpg', alt: '首屏背景', mediaType: 'image' },
    8: { path: 'http://127.0.0.1:8055/assets/hero.mp4', alt: '首屏视频', mediaType: 'video' },
    9: { path: 'http://127.0.0.1:8055/assets/hero-poster.jpg', alt: '视频海报', mediaType: 'image' }
  }));

  assert.deepEqual(result.sections[0].media, [
    { media_asset_id: '7', role: 'background', path: 'http://127.0.0.1:8055/assets/hero.jpg', managed: true, alt: '首屏背景', mediaType: 'image' },
    { media_asset_id: '8', role: 'video', poster_asset_id: '9', path: 'http://127.0.0.1:8055/assets/hero.mp4', managed: true, alt: '首屏视频', mediaType: 'video', posterPath: 'http://127.0.0.1:8055/assets/hero-poster.jpg' }
  ]);
  assert.deepEqual(result.sections[0].content.items[0], {
    media_asset_id: '7', media_role: 'background', title: '首屏', path: 'http://127.0.0.1:8055/assets/hero.jpg', managed: true, alt: '首屏背景', mediaType: 'image', image: 'http://127.0.0.1:8055/assets/hero.jpg'
  });
  assert.equal(record.sections[0].media[0].media_asset_id, 7, 'preview materialization must not mutate the draft record');
});

test('materializes collection cover fields, product configuration images, and video posters', () => {
  const result = materializeVisualMediaRecord({
    cover_asset: 11,
    hero_video_asset_id: 18,
    media: [{ media_asset_id: 12, role: 'video', poster_asset_id: 13 }],
    configuration: {
      machine_asset_id: 14,
      labels: { technical_image_asset_id: 15 },
      features: [{ label: '精度', media_asset_id: 16 }],
      drawings: [{ title: '尺寸图', media_asset_id: 17 }]
    }
  }, resolver({
    11: { path: '/assets/cover.jpg', alt: '封面', mediaType: 'image' },
    12: { path: '/assets/video.mp4', alt: '视频', mediaType: 'video' },
    13: { path: '/assets/poster.jpg', alt: '海报', mediaType: 'image' },
    14: { path: '/assets/machine.png', alt: '机床', mediaType: 'image' },
    15: { path: '/assets/technical.png', alt: '技术参数', mediaType: 'image' },
    16: { path: '/assets/feature.png', alt: '精度', mediaType: 'image' },
    17: { path: '/assets/drawing.png', alt: '尺寸图', mediaType: 'image' },
    18: { path: '/assets/home-hero.mp4', alt: '首页首屏视频', mediaType: 'video' }
  }));

  assert.equal(result.cover_asset, '/assets/cover.jpg');
  assert.equal(result.hero_video_asset_id, 18, 'the persisted homepage video ID must remain available to the preview authorizer');
  assert.equal(result.hero_video_asset_url, '/assets/home-hero.mp4');
  assert.deepEqual(result.media[0], {
    media_asset_id: '12', role: 'video', poster_asset_id: '13', path: '/assets/video.mp4', managed: true, alt: '视频', mediaType: 'video', posterPath: '/assets/poster.jpg', video: '/assets/video.mp4'
  });
  assert.equal(result.configuration.machine_asset_id, '/assets/machine.png');
  assert.equal(result.configuration.labels.technical_image_asset_id, '/assets/technical.png');
  assert.equal(result.configuration.features[0].image, '/assets/feature.png');
  assert.equal(result.configuration.drawings[0].image, '/assets/drawing.png');
});

test('materializes product download attachments as protected resource URLs in the live preview', () => {
  const result = materializeVisualMediaRecord({
    resources: [{ title: '设备说明书', type: 'PDF', media_asset_id: 19 }]
  }, resolver({
    19: { path: '/assets/manual.pdf', alt: '设备说明书', mediaType: 'document' }
  }));

  assert.deepEqual(result.resources, [{
    title: '设备说明书', type: 'PDF', media_asset_id: '19', path: '/assets/manual.pdf',
    managed: true, mediaType: 'document', alt: '设备说明书', url: '/assets/manual.pdf'
  }]);
});

test('preserves same-origin private preview media paths when materializing a product attachment', () => {
  const result = materializeVisualMediaRecord({
    resources: [{ title: '内部说明书', type: 'PDF', media_asset_id: 84 }]
  }, resolver({
    84: { path: '/api/preview/media/84', alt: '内部说明书', mediaType: 'document' }
  }));

  assert.equal(result.resources[0].url, '/api/preview/media/84');
  assert.equal(result.resources[0].path, '/api/preview/media/84');
  assert.equal(result.resources[0].managed, true);
});

test('keeps unresolved or unsafe media references unchanged and does not invent paths', () => {
  const record = { cover_asset: 'missing-asset', media: [{ media_asset_id: 'missing-asset' }], sections: [{ id: 'hero', media: [{ media_asset_id: 'missing-asset' }] }] };
  const result = materializeVisualMediaRecord(record, resolver({
    'unsafe id': { path: 'javascript:alert(1)', mediaType: 'image' }
  }));
  assert.deepEqual(result, record);
  assert.notStrictEqual(result, record);
});
