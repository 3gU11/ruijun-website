import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('service buttons navigate to child pages while the header remains a single entry', async () => {
  const [header, service, download, topic] = await Promise.all([
    readFile(new URL('../components/SiteHeader.vue', import.meta.url), 'utf8'),
    readFile(new URL('../pages/service.vue', import.meta.url), 'utf8'),
    readFile(new URL('../pages/service/download.vue', import.meta.url), 'utf8'),
    readFile(new URL('../pages/service/[topic].vue', import.meta.url), 'utf8')
  ]);

  assert.doesNotMatch(header, /service-submenu|service-nav-item/);
  assert.match(header, /<NuxtLink v-for="item in visibleNavigation"/);
  for (const route of ['repair', 'warranty', 'process', 'video', 'download', 'faults', 'maintenance', 'knowledge']) {
    assert.match(service, new RegExp(`/service/${route}`));
  }
  assert.doesNotMatch(download, /navigateTo\('\/service'/);
  assert.doesNotMatch(topic, /navigateTo\('\/service'/);
  assert.match(topic, /\/api\/public\/v1\/knowledge-items/);
  assert.match(topic, /\/api\/public\/v1\/pages\/service/);
  assert.match(topic, /service-topic-\$\{topicKey\.value\}/);
  assert.match(topic, /Array\.isArray\(override\.steps\)/);
  assert.match(download, /\/api\/public\/v1\/pages\/service/);
  assert.match(download, /downloadContent/);
  assert.match(download, /:placeholder="searchPlaceholder"/);
  assert.match(topic, /item\.type === 'video'/);
  assert.match(topic, /常见故障分析/);
  assert.match(download, /产品技术手册/);
  assert.match(download, /<section id="service-download-list"[\s\S]*class="download-back" to="\/service"/);
  assert.match(download, /data-cms-preview-field-path="back_label">\{\{ backLabel \}\}[\s\S]*<span aria-hidden="true">→<\/span>/);
  assert.doesNotMatch(download, /FR-XS400/);
  assert.match(service, /aria-label="选择常熟总部导航软件"/);
  assert.match(service, /选择导航软件/);
  assert.match(service, /navigator\.geolocation\.getCurrentPosition/);
  assert.match(service, /https:\/\/uri\.amap\.com\/navigation\?from=/);
  assert.match(service, /baidumap:\/\/map\/direction\?origin=/);
  assert.match(service, /https:\/\/j\.map\.baidu\.com\/0c\/c51M/);
  assert.match(service, /geo:0,0\?q=/);
  assert.match(service, /https:\/\/maps\.apple\.com\/\?daddr=/);
  assert.doesNotMatch(service, /api\.map\.baidu\.com\/direction/);
});

test('service resource links use the protected preview path and browser download semantics', async () => {
  const download = await readFile(new URL('../pages/service/download.vue', import.meta.url), 'utf8');
  assert.match(download, /function serviceResourceUrl\(resource/);
  assert.match(download, /:href="serviceResourceUrl\(item\)"/);
  assert.match(download, /:download="[^"]*serviceResource/);
  assert.doesNotMatch(download, /:href="item\.asset"/);
});

test('service download preview hides incomplete records instead of rendering null links', async () => {
  const download = await readFile(new URL('../pages/service/download.vue', import.meta.url), 'utf8');
  assert.match(download, /visibleResources = computed[\s\S]*filter\(\(item\) => String\(item\.title \|\| ''\)\.trim\(\) && serviceResourceUrl\(item\)\)/);
});

test('service download page exposes controlled visual bindings for copy, category icons, and resource fields', async () => {
  const download = await readFile(new URL('../pages/service/download.vue', import.meta.url), 'utf8');
  assert.match(download, /sectionPresentationAttributes\(downloadContent\)/);
  assert.match(download, /data-cms-preview-field-path="title"/);
  assert.match(download, /data-cms-preview-field-path="search_placeholder"/);
  assert.match(download, /fieldPath: `categories\.\$\{category\.key\}`/);
  assert.match(download, /data-cms-preview-media-role="icon"/);
  assert.match(download, /data-cms-preview-collection="service_resources"/);
  assert.match(download, /data-cms-preview-field-path="title"/s);
  assert.match(download, /data-cms-preview-field-path="version"/);
  assert.match(download, /data-cms-preview-field-path="applicable_models"/);
  assert.match(download, /data-cms-preview-field-path="empty_label"/);
  assert.match(download, /data-cms-preview-field-path="back_label"/);
});

test('the service landing follows the supplied 3840px PSD geometry', async () => {
  const service = await readFile(new URL('../pages/service.vue', import.meta.url), 'utf8');
  assert.match(service, /Desktop geometry measured from the 3840px/);
  assert.match(service, /width:66\.6146vw/);
  assert.match(service, /grid-template-columns:repeat\(9,5\.7292vw\)/);
  assert.match(service, /width:13\.0469vw/);
  assert.match(service, /height:4\.5vw/);
  assert.match(service, /border-radius:\.94vw!important/);
  assert.match(service, /@media\(max-width:900px\).*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important/s);
  assert.doesNotMatch(service, /min-height:100svh;padding:86px/);
});
