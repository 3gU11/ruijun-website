import assert from 'node:assert/strict';
import test from 'node:test';

import { setVisualTextStyle } from '../extensions/content-editor-workbench/src/visual-editing-text-style.js';
import { readVisualPosition, setVisualPosition } from '../extensions/content-editor-workbench/src/visual-editing-position.js';
import { setVisualAlignment } from '../extensions/content-editor-workbench/src/visual-editing-layout.js';
import { normalizeProductModelFeaturePresentation } from '../extensions/content-editor-workbench/src/product-model-presentation.js';
import { visualPresentationFieldPath } from '../extensions/content-editor-workbench/src/visual-editing-presentation-path.js';

const featurePath = 'configuration.features.0.label';
const introTitlePath = 'configuration.intro.title';

test('product model feature text style stores only the allowlisted visual values separately from its primitive content', () => {
  const record = { configuration: { features: [{ label: '五轴数控', detail: '精密控制' }] } };

  assert.equal(setVisualTextStyle(record, featurePath, {
    fontSize: 36,
    fontWeight: 700,
    lineHeight: 1.6,
    textColor: '#123456'
  }), true);
  assert.equal(record.configuration.features[0].label, '五轴数控');
  assert.deepEqual(record.configuration.field_presentation.features_0_label.text_style, {
    enabled: true,
    weight: 700,
    size_desktop: 36,
    line_height: 1.6,
    color: '#123456'
  });
  assert.equal(setVisualTextStyle(record, 'configuration.features.0.unknown', { fontSize: 36, fontWeight: 700 }), false);
});

test('product model feature position uses a bounded, allowlisted presentation key', () => {
  const record = { configuration: { features: [{ label: '五轴数控' }] } };

  assert.deepEqual(setVisualPosition(record, featurePath, { x: 44, y: -44 }), { x: 30, y: -30 });
  assert.equal(record.configuration.features[0].label, '五轴数控');
  assert.deepEqual(readVisualPosition(record, featurePath), { x: 30, y: -30 });
  assert.equal(setVisualPosition(record, 'configuration.features.__proto__.label', { x: 1, y: 1 }), null);
});

test('product model feature image position uses the same controlled presentation key', () => {
  const record = { configuration: { features: [{ image: '/assets/feature.png' }] } };
  assert.deepEqual(setVisualPosition(record, 'configuration.features.0.image', { x: 8, y: -4 }), { x: 8, y: -4 });
  assert.deepEqual(readVisualPosition(record, 'configuration.features.0.image'), { x: 8, y: -4 });
});

test('product model feature selection uses its content path to write the controlled presentation', () => {
  const selection = {
    collection: 'product_models',
    fieldPath: 'configuration.features.0.label',
    positionFieldPath: 'configuration.field_presentation.features_0_label'
  };
  const record = { configuration: { features: [{ label: '五轴数控' }] } };

  assert.equal(visualPresentationFieldPath(selection), featurePath);
  assert.deepEqual(setVisualPosition(record, visualPresentationFieldPath(selection), { x: 4, y: -2 }), { x: 4, y: -2 });
  assert.equal(setVisualTextStyle(record, visualPresentationFieldPath(selection), {
    fontSize: 26, fontWeight: 400, lineHeight: 1.5, textColor: '#123456'
  }), true);
  assert.equal(setVisualAlignment(record, visualPresentationFieldPath(selection), 'center'), true);
  assert.deepEqual(record.configuration.field_presentation.features_0_label, {
    layout: { enabled: true, desktop: { offset_x: 4, offset_y: -2 }, align_x: 'center' },
    text_style: { enabled: true, weight: 400, size_desktop: 26, line_height: 1.5, color: '#123456' }
  });
});

test('other fields continue to use their explicit presentation path', () => {
  assert.equal(visualPresentationFieldPath({
    collection: 'product_models', fieldPath: 'model_code', positionFieldPath: 'presentation.field_presentation.model_code'
  }), 'presentation.field_presentation.model_code');
  assert.equal(visualPresentationFieldPath({
    collection: 'pages', fieldPath: 'title', positionFieldPath: 'field_presentation.title'
  }), 'field_presentation.title');
});

test('product model intro title stores position and text style in an allowlisted presentation key', () => {
  const record = { configuration: { intro: { title: '自动穿丝系列', subtitle: '精密加工' } } };

  assert.equal(setVisualTextStyle(record, introTitlePath, {
    fontSize: 36,
    fontWeight: 700,
    lineHeight: 1.6,
    textColor: '#123456'
  }), true);
  assert.deepEqual(setVisualPosition(record, introTitlePath, { x: 5, y: -4 }), { x: 5, y: -4 });
  assert.equal(record.configuration.intro.title, '自动穿丝系列');
  assert.deepEqual(record.configuration.field_presentation.intro_title, {
    text_style: { enabled: true, weight: 700, size_desktop: 36, line_height: 1.6, color: '#123456' },
    layout: { enabled: true, desktop: { offset_x: 5, offset_y: -4 } }
  });
});

test('product model code retains an independent, allowlisted presentation instead of writing display styles to the record root', () => {
  const record = { model_code: 'FL1610XS(pro)' };

  assert.equal(setVisualTextStyle(record, 'presentation.field_presentation.model_code', {
    fontSize: 24,
    fontWeight: 600,
    lineHeight: 1.4,
    textColor: '#123456'
  }), true);
  assert.deepEqual(setVisualPosition(record, 'presentation.field_presentation.model_code', { x: 4, y: -2 }), { x: 4, y: -2 });
  assert.equal(record.model_code, 'FL1610XS(pro)');
  assert.deepEqual(record.presentation, {
    field_presentation: {
      model_code: {
        text_style: { enabled: true, weight: 600, size_desktop: 24, line_height: 1.4, color: '#123456' },
        layout: { enabled: true, desktop: { offset_x: 4, offset_y: -2 } }
      }
    }
  });
  assert.equal(Object.hasOwn(record, 'text_style'), false);
});

test('product parameter fields retain independent, allowlisted visual presentation', () => {
  const record = { model_code: 'fl1390', field_name: 'XY 行程', value: '1300*900', unit: 'mm' };

  assert.equal(setVisualTextStyle(record, 'field_name', {
    fontSize: 20,
    fontWeight: 600,
    lineHeight: 1.5,
    textColor: '#123456'
  }), true);
  assert.deepEqual(setVisualPosition(record, 'field_name', { x: 8, y: -3 }), { x: 8, y: -3 });
  assert.deepEqual(record.presentation, {
    field_presentation: {
      field_name: {
        text_style: { enabled: true, weight: 600, size_desktop: 20, line_height: 1.5, color: '#123456' },
        layout: { enabled: true, desktop: { offset_x: 8, offset_y: -3 } }
      }
    }
  });
  assert.equal(setVisualTextStyle(record, 'status', { fontSize: 20, fontWeight: 600 }), false);
});

test('product model feature presentation survives the editor save payload and drops unsupported keys', () => {
  const presentation = normalizeProductModelFeaturePresentation({
    features: [{ label: '五轴数控', detail: '精密控制' }],
    field_presentation: {
      features_0_label: {
        text_style: { enabled: true, weight: 700, size_desktop: 36, line_height: 1.6, color: '#123456' },
        layout: { enabled: true, desktop: { offset_x: 5, offset_y: -4 } }
      },
      features_0_unknown: { text_style: { enabled: true, size_desktop: 99 } },
      features_9_label: { text_style: { enabled: true, size_desktop: 99 } }
    }
  });

  assert.deepEqual(presentation, {
    features_0_label: {
      text_style: { enabled: true, weight: 700, size_desktop: 36, line_height: 1.6, color: '#123456' },
      layout: { enabled: true, desktop: { offset_x: 5, offset_y: -4 } }
    }
  });
});
