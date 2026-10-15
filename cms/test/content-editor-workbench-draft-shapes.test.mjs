import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);

// The workbench's pure data-shape layer was extracted out of a 5600-line
// single-file component. These checks pin the split so it cannot silently rot:
// the module must keep exporting the layer, and module.vue must not grow a second
// copy of it back.
const EXTRACTED = [
  'parseObject', 'parseArray', 'clone', 'textList', 'contentListText', 'knowledgeSteps',
  'normalizeSections', 'normalizePagination', 'normalizePageMedia', 'normalizeMediaReferences',
  'normalizeSeries', 'normalizeModel', 'normalizeSettings', 'normalizeKnowledge', 'normalizeArticle',
  'normalizeRepairPage', 'normalizeReviewRecord', 'normalizeFooterTextStyles', 'normalizeOptionalSortOrder',
  'normalizeLink', 'boundedFooterStyleNumber', 'emptyMediaDraft', 'emptyParameter', 'nextServiceKey',
  'nextDraftSlug', 'mediaTypeForFile', 'greatestCommonDivisor', 'defaultPageMediaRole',
  'remapVisualListPath', 'cloneVisualState', 'apiStatus', 'registeredSectionList',
  'reviewedMediaAssetsForPlacement', 'isPageMediaOption', 'isPageMediaOptionForSection'
];

test('draft-shapes.js exports the whole extracted data-shape layer', async () => {
  const shapes = await import('../extensions/content-editor-workbench/src/draft-shapes.js');
  const missing = EXTRACTED.filter((name) => typeof shapes[name] !== 'function');
  assert.deepEqual(missing, [], `draft-shapes.js is missing: ${missing.join(', ')}`);
});

test('module.vue no longer re-declares the extracted layer', async () => {
  const module = await readFile(new URL('../extensions/content-editor-workbench/src/module.vue', import.meta.url), 'utf8');
  const duplicated = EXTRACTED.filter((name) => new RegExp(`^function ${name}\\s*\\(`, 'm').test(module));
  assert.deepEqual(duplicated, [], `module.vue declares these again instead of importing them: ${duplicated.join(', ')}`);
  // It must actually import them, not merely stop declaring them.
  assert.match(module, /from '\.\/draft-shapes\.js'/);
});

test('draft-shapes.js holds no component state', async () => {
  const shapes = await readFile(new URL('../extensions/content-editor-workbench/src/draft-shapes.js', import.meta.url), 'utf8');
  // A reactive primitive here would mean a stateful function was moved by mistake,
  // and it would break the moment two components imported the module.
  for (const forbidden of [/\bref\(/, /\bcomputed\(/, /\bwatch\(/, /\bonMounted\(/, /\buseApi\(/]) {
    assert.doesNotMatch(shapes, forbidden);
  }
});

test('extracted normalizers keep their behaviour', async () => {
  const {
    parseArray, parseObject, normalizePagination, normalizeOptionalSortOrder,
    mediaTypeForFile, greatestCommonDivisor, apiStatus, nextDraftSlug
  } = await import('../extensions/content-editor-workbench/src/draft-shapes.js');

  // JSON columns arrive as strings or already-parsed values; both must work.
  assert.deepEqual(parseArray('[1,2]'), [1, 2]);
  assert.deepEqual(parseArray([1, 2]), [1, 2]);
  assert.deepEqual(parseArray('not json'), []);
  assert.deepEqual(parseArray(null), []);
  assert.deepEqual(parseObject('{"a":1}'), { a: 1 });
  assert.deepEqual(parseObject([1]), {});

  // Page size is clamped into the range the pager can render.
  assert.equal(normalizePagination({ page_size: 99 }).page_size, 6);
  assert.equal(normalizePagination({ page_size: 0 }).page_size, 6);
  assert.equal(normalizePagination({ page_size: 3 }).page_size, 3);

  // An unset sort order must stay unset rather than silently becoming 0, which
  // would reorder same-day articles. Unset is represented as null, not 0.
  assert.equal(normalizeOptionalSortOrder(undefined), null);
  assert.equal(normalizeOptionalSortOrder(''), null);
  assert.equal(normalizeOptionalSortOrder(null), null);
  assert.equal(normalizeOptionalSortOrder('4'), 4);
  assert.equal(normalizeOptionalSortOrder(-1), null);
  assert.notEqual(normalizeOptionalSortOrder(undefined), 0);

  assert.equal(mediaTypeForFile({ type: 'video/mp4', name: 'a.mp4' }), 'video');
  assert.equal(mediaTypeForFile({ type: 'image/png', name: 'a.png' }), 'image');
  assert.equal(greatestCommonDivisor(12, 18), 6);

  // apiStatus reads the status out of either an axios-style error or a bare one.
  assert.equal(apiStatus({ response: { status: 403 } }), 403);
  assert.equal(apiStatus({ status: 401 }), 401);
  assert.equal(apiStatus(new Error('boom')), 0);
  assert.equal(apiStatus(undefined), 0);

  assert.equal(typeof nextDraftSlug('home', []), 'string');
});

test('queue filters narrow a 600-item list down to what the operator is looking for', async () => {
  const { filterQueueRecords, queueCollectionOptions } = await import('../extensions/content-editor-workbench/src/draft-shapes.js');

  // Shape mirrors normalizeReviewRecord, which is what the queue actually holds.
  const queue = [
    { collection: 'articles', collectionLabel: '文章资讯', label: '测试1', secondary: 'test-1', status: 'draft' },
    { collection: 'articles', collectionLabel: '文章资讯', label: '测试2', secondary: 'test-2', status: 'draft' },
    { collection: 'knowledge_items', collectionLabel: '常见问题知识', label: '伺服报错 E-010', secondary: 'faq-10', status: 'draft' },
    { collection: 'media_assets', collectionLabel: '媒体资产', label: 'web测试素材.mp4', secondary: '', status: 'draft' },
    { collection: 'pages', collectionLabel: '页面文案', label: '服务支持', secondary: 'service', status: 'draft' }
  ];

  // The reported problem: "我做的测试内容根本就看不到". Searching the name finds it.
  const byName = filterQueueRecords(queue, { query: '测试' });
  assert.deepEqual(byName.map((r) => r.label), ['测试1', '测试2', 'web测试素材.mp4']);

  // Case-insensitive, and the secondary identifier is searchable too.
  assert.equal(filterQueueRecords(queue, { query: 'TEST-1' }).length, 1);
  assert.equal(filterQueueRecords(queue, { query: 'FAQ-10' }).length, 1);
  // The content type name is searchable as well.
  assert.equal(filterQueueRecords(queue, { query: '常见问题' }).length, 1);
  // Whitespace around the query must not change the result.
  assert.equal(filterQueueRecords(queue, { query: '  测试1  ' }).length, 1);

  // No query and no type means everything, which is what the unfiltered list shows.
  assert.equal(filterQueueRecords(queue, {}).length, queue.length);
  assert.equal(filterQueueRecords(queue, { query: '', collection: '' }).length, queue.length);

  // Type filter, and the two filters combine.
  assert.equal(filterQueueRecords(queue, { collection: 'articles' }).length, 2);
  assert.deepEqual(filterQueueRecords(queue, { collection: 'articles', query: '测试2' }).map((r) => r.label), ['测试2']);

  // A query that matches nothing yields an empty list, which the panel reports
  // distinctly from an empty queue — these must not be conflated.
  assert.deepEqual(filterQueueRecords(queue, { query: '不存在的内容' }), []);

  // Malformed input must not throw; the panel always renders.
  assert.deepEqual(filterQueueRecords(null, { query: 'x' }), []);
  assert.deepEqual(filterQueueRecords(undefined, {}), []);
  assert.equal(filterQueueRecords([{ label: null, collection: 'pages' }], { query: 'x' }).length, 0);

  // Type options carry counts and lead with the biggest group, which is how the
  // operator sees where the bulk of the queue is coming from.
  const options = queueCollectionOptions(queue);
  assert.deepEqual(options.map((o) => o.value), ['articles', 'knowledge_items', 'media_assets', 'pages']);
  assert.equal(options[0].count, 2);
  assert.equal(options[0].label, '文章资讯');
  assert.deepEqual(queueCollectionOptions(null), []);
});

test('every exported normalizer actually runs, so a missing dependency cannot hide', async () => {
  const shapes = await import('../extensions/content-editor-workbench/src/draft-shapes.js');

  // normalizeFooterTextStyles read footerTextStyleDefinitions, which had stayed in
  // module.vue after the extraction. Rollup treats an unresolved identifier as a
  // global, so the build succeeded and the failure only appeared at runtime on the
  // first loadSettings() call — far away from the code that caused it. Calling the
  // exported functions here turns that into a test failure.
  const footerStyles = shapes.normalizeFooterTextStyles({
    products: { enabled: true, weight: 700, size_desktop: 14, color: '#2f6fed' },
    honors: { enabled: false, weight: 900, size_desktop: 99, color: 'not-a-color' }
  });
  assert.equal(footerStyles.products.enabled, true);
  assert.equal(footerStyles.products.weight, 700);
  assert.equal(footerStyles.products.size_desktop, 14);
  assert.equal(footerStyles.products.color, '#2F6FED');
  // Out-of-range values are handled, not passed through: an unsupported weight
  // falls back to its default, a size is clamped into the allowed band, and a
  // malformed color is dropped entirely.
  assert.equal(footerStyles.honors.enabled, false);
  assert.equal(footerStyles.honors.weight, 400);
  assert.equal(footerStyles.honors.size_desktop, 72);
  assert.equal(footerStyles.honors.color, '');
  // Every catalogue entry is present, so the panel can iterate it.
  assert.equal(Object.keys(footerStyles).length, shapes.footerTextStyleDefinitions.length);

  // And the catalogue the template iterates is exported from the same module.
  assert.equal(shapes.footerTextStyleDefinitions.length, 22);
  assert.equal(shapes.footerTextStyleDefinitions[0].id, 'products');
  assert.equal(shapes.footerTextStyleDefinitions[0].label, '产品中心标题');

  // normalizeSettings is the caller that was throwing; run it over a realistic
  // record so any other unresolved reference fails here instead of in the UI.
  const settings = shapes.normalizeSettings({
    setting_key: 'global',
    navigation: [{ label: '首页', href: '/' }],
    footer: { primary_links: [{ label: '关于', href: '/about' }], columns: [{ title: '服务' }], requires_business_review: false, text_styles: {} },
    brand: { name: '瑞钧' }, contacts: { phone: '400-000-0000' }, languages: ['zh'], analytics: {}
  });
  assert.equal(settings.setting_key, 'global');
  assert.equal(settings.navigation.length, 1);
  // The footer style catalogue is filled in for every entry, which is proof that
  // normalizeFooterTextStyles ran inside normalizeSettings — the very call that
  // used to throw.
  assert.equal(Object.keys(settings.footer.text_styles).length, shapes.footerTextStyleDefinitions.length);
  assert.equal(settings.footer.text_styles.products.weight, 400);
  // A whole record must not throw, and must keep its fields.
  assert.equal(settings.brand.name, '瑞钧');

  // Every export must be callable/typed as expected — a typo'd export name in a
  // later refactor shows up here rather than as a silent undefined in the UI.
  for (const name of ['normalizeSections', 'normalizeModel', 'normalizeSeries', 'normalizeKnowledge',
    'normalizeArticle', 'normalizeRepairPage', 'normalizeReviewRecord', 'filterQueueRecords',
    'queueCollectionOptions', 'normalizeFooterTextStyles']) {
    assert.equal(typeof shapes[name], 'function', `${name} should be exported`);
  }
});
