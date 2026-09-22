import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('Nuxt home and about pages map published CMS sections through the safe section resolver', async () => {
  const [home, about, manufacturing] = await Promise.all([
    readFile(new URL('../pages/index.vue', import.meta.url), 'utf8'),
    readFile(new URL('../pages/about.vue', import.meta.url), 'utf8'),
    readFile(new URL('../pages/manufacturing.vue', import.meta.url), 'utf8')
  ]);

  for (const source of [home, about]) {
    assert.match(source, /resolvePageSection/);
    assert.doesNotMatch(source, /CMS_PAGES_URL/);
  }
  assert.match(home, /'why-ruijun'/);
  assert.match(home, /'performance'/);
  assert.match(home, /introTitle: section\.introTitle \|\| section\.title/);
  assert.match(home, /introDetail: section\.introDetail \|\| section\.description/);
  assert.match(home, /id: 'performance',[^\n]*body: '效能提升50%，丝损降低30%'/);
  assert.match(home, /marqueeSection/);
  assert.match(home, /marqueeItems/);
  assert.match(home, /homepageReasonBinding/);
  assert.match(home, /data-cms-preview-collection="tab\.cmsBinding\?\.collection"/);
  assert.match(home, /data-cms-preview-item-id="tab\.cmsBinding\?\.itemId"/);
  assert.match(home, /product\.cmsBinding/);
  assert.match(home, /milestone\[3\]\.collection/);
  assert.match(home, /data-cms-preview-field-path="hero_video_asset_id"/);
  assert.match(home, /:data-cms-preview-field-path="heroContent\.image \? 'image' : undefined"/);
  assert.match(home, /imageFieldPath/);
  assert.match(home, /:data-cms-preview-field-path="product\.imageFieldPath"/);
  assert.match(home, /data-cms-preview-field-path="evidence"/);
  assert.match(about, /'hero'/);
  assert.match(about, /'history'/);
  assert.match(about, /historyBackground/);
  assert.match(about, /historyIcon/);
  assert.match(about, /backgroundImage: `url\(\$\{historyBackground\.path\}\)`/);
  assert.match(about, /useFetch\('\/api\/public\/v1\/milestones'/);
  assert.match(about, /useFetch\('\/api\/public\/v1\/qualifications'/);
  assert.doesNotMatch(about, /CMS_(?:MILESTONES|QUALIFICATIONS)_URL/);
  assert.match(manufacturing, /useFetch\('\/api\/public\/v1\/manufacturing-evidence'/);
  assert.match(manufacturing, /pageSectionMediaForLayer/);
  assert.doesNotMatch(manufacturing, /CMS_MANUFACTURING_EVIDENCE_URL/);
  assert.match(await readFile(new URL('../pages/product/detail/index.vue', import.meta.url), 'utf8'), /toggleComparedModel/);
  assert.match(await readFile(new URL('../pages/product/[slug].vue', import.meta.url), 'utf8'), /const resources/);
  const productDetail = await readFile(new URL('../pages/product/[slug].vue', import.meta.url), 'utf8');
  assert.match(productDetail, /const caseStudies/);
  assert.match(productDetail, /const resourcesCopy/);
  assert.match(productDetail, /dimensionsCopy\.body/);
  const service = await readFile(new URL('../pages/service.vue', import.meta.url), 'utf8');
  assert.match(service, /function contentText/);
  assert.match(service, /human_support_label/);
});

test('product resource links request browser downloads for PDF attachments', async () => {
  const product = await readFile(new URL('../pages/product/[slug].vue', import.meta.url), 'utf8');
  assert.match(product, /v-for="\(resource, resourceIndex\) in resources"[\s\S]{0,800}:download=/);
  assert.match(product, /function productResourceUrl\(resource/);
  assert.match(product, /:download="productResourceDownloadName\(resource\)"/);
  assert.doesNotMatch(product, /resource\.url\.startsWith\(/);
});

test('Nuxt homepage repeats expose exact Visual Editing field bindings for cards and milestones', async () => {
  const source = await (await import('node:fs/promises')).readFile(new URL('../pages/index.vue', import.meta.url), 'utf8');
  assert.match(source, /data-cms-preview-field-path/);
  assert.match(source, /homepageSectionItemBinding\(resolvedMarqueeSection, sourceSection, index\)/);
  assert.match(source, /cmsBinding\?\.fields\.shortTitle/);
  assert.match(source, /data-cms-preview-media-role/);
  assert.match(source, /milestones\.\$\{index\}/);
  assert.match(source, /historyBackgroundFieldPath/);
});

test('homepage product-series cover images declare the governed product gallery placement', async () => {
  const home = await readFile(new URL('../pages/index.vue', import.meta.url), 'utf8');
  assert.match(home, /useFetch\('\/api\/public\/v1\/product-series'/);
  assert.match(home, /resolveHomepageProducts\(publishedRecords, previewRecords, fallbackProducts\)/);
  assert.doesNotMatch(home, /cmsBinding: \{ collection: 'product_models', itemId: String\(record\.id \|\| ''\) \}/);
  assert.match(home, /data-cms-preview-media-role="cover"[^\n]*data-cms-preview-placement-key="product\.gallery\.image"/);
});

test('homepage timeline media declares the shared governed timeline placements', async () => {
  const home = await readFile(new URL('../pages/index.vue', import.meta.url), 'utf8');
  assert.match(home, /:data-cms-preview-placement-key="historyBackgroundFieldPath \? 'about\.timeline\.background' : undefined"/);
  assert.match(home, /data-cms-preview-media-role="icon"/);
  assert.match(home, /:data-cms-preview-placement-key="historyIcon\.fieldPath \? 'about\.timeline\.icon' : undefined"/);
});

test('homepage reason elements use explicit collection-specific field paths without fabricated media fields', async () => {
  const source = await readFile(new URL('../pages/index.vue', import.meta.url), 'utf8');
  assert.match(source, /import \{ homepageFieldPresentationPath, homepageReasonBinding, homepageSectionItemBinding \} from '~\/shared\/visual-binding-paths\.mjs'/);
  assert.match(source, /cmsBinding: homepageReasonBinding\(section, sourceSection\)/);
  assert.match(source, /:data-cms-preview-collection="reason\.cmsBinding\?\.collection"/);
  assert.match(source, /:data-cms-preview-item-id="reason\.cmsBinding\?\.itemId"/);
  assert.match(source, /:data-cms-preview-field-path="reason\.cmsBinding\?\.fields\.body"/);
  assert.match(source, /:data-cms-preview-field-path="reason\.cmsBinding\?\.fields\.introDetail"/);
  assert.match(source, /:data-cms-preview-field-path="reason\.cmsBinding\?\.fields\.image"/);
  assert.doesNotMatch(source, /reason\.cmsBinding\.fieldPath/);
  assert.doesNotMatch(source, /homepageSectionBinding/);
});

test('six visual editing pages expose explicit field paths and media roles for repeated content', async () => {
  const files = await Promise.all([
    readFile(new URL('../pages/news.vue', import.meta.url), 'utf8'),
    readFile(new URL('../pages/about.vue', import.meta.url), 'utf8'),
    readFile(new URL('../pages/service.vue', import.meta.url), 'utf8'),
    readFile(new URL('../pages/manufacturing.vue', import.meta.url), 'utf8'),
    readFile(new URL('../pages/product/[slug].vue', import.meta.url), 'utf8')
  ]);
  const [news, about, service, manufacturing, product] = files;
  assert.match(news, /data-cms-preview-field-path="title"/);
  assert.match(news, /articleBinding\(article, 'display_date'\)/);
  assert.match(news, /articleBinding\(item, 'display_date'\)/);
  assert.match(news, /articleBinding\(article, 'title'\)/);
  assert.match(news, /articleBinding\(article/);
  assert.match(news, /data-cms-preview-collection="article\.cmsBinding\.collection"/);
  assert.match(news, /data-cms-preview-media-role="cover"/);
  assert.match(about, /data-cms-preview-field-path="title"/);
  assert.match(about, /data-cms-preview-media-role="gallery"/);
  assert.match(about, /data-cms-preview-collection=.*milestones/);
  assert.match(about, /data-cms-preview-field-path="year"/);
  assert.match(about, /data-cms-preview-collection="qualifications"/);
  assert.match(about, /qualification\.name/);
  assert.match(about, /data-cms-preview-field-path="asset\.nameFieldPath"/);
  assert.match(about, /qualificationAssetBinding\(qualification, assetIndex\)/);
  assert.match(about, /data-cms-preview-field-path=\"asset\.fieldPath\" data-cms-preview-media-role=\"gallery\"/);
  assert.match(about, /pageSectionMediaBinding\(assetIndex\)/);
  assert.doesNotMatch(about, /data-cms-preview-field-path="`assets\.\$\{index\}`"/);
  assert.match(about, /partnerImages[\s\S]*?:data-cms-preview-field-path="asset\.fieldPath"/);
  assert.match(about, /domesticClients[\s\S]*?:data-cms-preview-field-path="asset\.fieldPath"/);
  assert.match(about, /globalClients[\s\S]*?:data-cms-preview-field-path="asset\.fieldPath"/);
  assert.match(service, /:data-cms-preview-field-path="action\.titleFieldPath"/);
  assert.match(service, /data-cms-preview-media-role="icon"/);
  assert.match(service, /serviceOfficeBinding/);
  assert.match(service, /:data-cms-preview-field-path="office\.binding\?\.address">\{\{ office\.address \}\}/);
  assert.match(service, /:data-cms-preview-field-path="office\.binding\?\.manager">\{\{ office\.manager \}\}/);
  assert.match(service, /:data-cms-preview-field-path="office\.binding\?\.phone">\{\{ office\.phone \}\}/);
  assert.match(service, /data-cms-preview-media-role=.*gallery/);
  assert.match(manufacturing, /items\.\$\{item\.sourceIndex\}/);
  assert.match(manufacturing, /node\.titleFieldPath/);
  assert.match(manufacturing, /data-cms-preview-media-role="equipment"/);
  assert.match(manufacturing, /manufacturingTextBinding\(text\.id\)/);
  assert.match(manufacturing, /:data-cms-preview-field-path="text\.fieldPath"/);
  assert.match(manufacturing, /data-cms-preview-collection.*text\.collection/);
  assert.match(manufacturing, /data-cms-preview-item-id.*text\.itemId/);
  assert.match(manufacturing, /mediaBindingForLayer\(layer\)/);
  assert.match(manufacturing, /data-cms-preview-field-path="mediaBinding\.fieldPath"/);
  assert.doesNotMatch(manufacturing, /text\.id\.endsWith\('-title'\)[\s\S]{0,180}\? 'title' : 'body'/);
  assert.match(product, /data-cms-preview-collection="product_series"/);
  assert.match(product, /data-cms-preview-field-path="name"/);
  assert.match(product, /data-cms-preview-media-role="drawing"/);
  assert.match(product, /configuration\.drawings\.\$\{activeDrawing\.sourceIndex\}\.media_asset_id/);
  assert.match(product, /productBinding\(/);
  assert.match(product, /data-cms-preview-collection="productBinding\('title'\)\.collection"/);
});

test('homepage scalar visual text fields expose exact paths for canvas editing', async () => {
  const page = await readFile(new URL('../pages/index.vue', import.meta.url), 'utf8');
  assert.match(page, /data-cms-preview-field="body"[^>]*data-cms-preview-field-path="body"/);
  assert.match(page, /data-cms-preview-field="label"[^>]*data-cms-preview-field-path="label"/);
  assert.match(page, /data-cms-preview-field="title"[^>]*data-cms-preview-field-path="title"/);
  assert.match(page, /data-cms-preview-field="kicker"[^>]*data-cms-preview-field-path="kicker"/);
});

test('about and service scalar visual text fields expose exact paths for canvas editing', async () => {
  const [about, service] = await Promise.all([
    readFile(new URL('../pages/about.vue', import.meta.url), 'utf8'),
    readFile(new URL('../pages/service.vue', import.meta.url), 'utf8')
  ]);
  for (const source of [about, service]) {
    assert.doesNotMatch(source, /data-cms-preview-field="(?:kicker|title|description|body|label)"(?![^>]*data-cms-preview-field-path)/);
  }
});

test('about page sections expose the owning pages visual binding', async () => {
  const about = await readFile(new URL('../pages/about.vue', import.meta.url), 'utf8');
  assert.match(about, /sectionPresentationAttributes\(heroContent\)/);
  assert.match(about, /data-cms-preview-key="hero"/);
  assert.match(about, /sectionPresentationAttributes\(brandStory\)/);
  assert.match(about, /sectionPresentationAttributes\(overviewContent\)/);
  assert.match(about, /sectionPresentationAttributes\(historyContent\)/);
  assert.match(about, /sectionPresentationAttributes\(factoryContent\)/);
  assert.match(about, /sectionPresentationAttributes\(certificatesContent\)/);
  assert.match(about, /sectionPresentationAttributes\(honorContent\)/);
  assert.match(about, /sectionPresentationAttributes\(patentContent\)/);
  assert.match(about, /sectionPresentationAttributes\(partnersContent\)/);
  assert.match(about, /sectionPresentationAttributes\(domesticClientsContent\)/);
  assert.match(about, /sectionPresentationAttributes\(globalClientsContent\)/);
});

test('about overview renders every nonempty CMS body instead of requiring a fallback-sized paragraph', async () => {
  const about = await readFile(new URL('../pages/about.vue', import.meta.url), 'utf8');
  assert.match(about, /const overviewBody = computed\(\(\) => String\(overviewContent\.value\.body \|\| overviewFallbackBody\)\);/);
  assert.doesNotMatch(about, /overviewContent\.value\.body \|\| ''\)\.length >= 180/);
});

test('about overview title keeps an independent visible canvas field beside its description and body', async () => {
  const about = await readFile(new URL('../pages/about.vue', import.meta.url), 'utf8');
  assert.match(about, /<section class="about-overview"[^>]*data-cms-preview-key="overview"[\s\S]*?<p class="cms-styled-text" data-cms-preview-field="title" data-cms-preview-field-path="title">\{\{ overviewContent\.title \}\}<\/p>/);
  assert.match(about, /<p data-cms-preview-field="description" data-cms-preview-field-path="description">\{\{ overviewContent\.description \}\}<\/p>/);
  assert.match(about, /<p data-cms-preview-field="body" data-cms-preview-field-path="body">\{\{ overviewBody \}\}<\/p>/);
});

test('about overview advantages retain their exact repeated item canvas paths', async () => {
  const about = await readFile(new URL('../pages/about.vue', import.meta.url), 'utf8');
  assert.match(about, /<ul><li v-for="\(item, index\) in overviewContent\.items" :key="item\.label" :data-cms-preview-field-path="`items\.\$\{index\}\.label`">\{\{ item\.label \}\}<\/li><\/ul>/);
});

test('about page exposes editable media fields for page-owned visual sections', async () => {
  const about = await readFile(new URL('../pages/about.vue', import.meta.url), 'utf8');
  assert.match(about, /const brandStory = computed\(\(\) => resolvePageSection\(pageContent\.value, 'brand-story'/);
  assert.match(about, /storyBackdrop[\s\S]{0,500}:data-cms-preview-field-path="heroBackdrop\.fieldPath"/);
  assert.match(about, /:data-cms-preview-field-path="heroBackground\.fieldPath"/);
  assert.match(about, /:data-cms-preview-field-path="heroMachine\.fieldPath"/);
  assert.match(about, /data-cms-preview-placement-key="about\.hero\.background"/);
  assert.match(about, /data-cms-preview-placement-key="about\.hero\.foreground"/);
  assert.match(about, /:data-cms-preview-field-path="overviewImage\.fieldPath"/);
  assert.match(about, /data-cms-preview-media-role="background"/);
  assert.match(about, /historyBackground\?\.fieldPath/);
  assert.match(about, /data-cms-preview-placement-key="about\.timeline\.background"/);
  assert.match(about, /data-cms-preview-field-path="evidence"/);
  assert.match(about, /historyIcon\.fieldPath/);
  assert.match(about, /data-cms-preview-placement-key="about\.timeline\.icon"/);
});

test('timeline scalar copy and managed icon expose exact Visual Editing fields', async () => {
  const [home, about] = await Promise.all([
    readFile(new URL('../pages/index.vue', import.meta.url), 'utf8'),
    readFile(new URL('../pages/about.vue', import.meta.url), 'utf8')
  ]);

  for (const source of [home, about]) {
    assert.match(source, /class="history-en"[^>]*data-cms-preview-field="kicker"[^>]*data-cms-preview-field-path="kicker"/);
    assert.match(source, /class="history-hint"[^>]*data-cms-preview-field="label"[^>]*data-cms-preview-field-path="label"/);
    assert.match(source, /historyIcon\.fieldPath/);
  }
  assert.match(home, /<img class="history-wheel"[^>]*:data-cms-preview-field-path="historyIcon\.fieldPath(?: \|\| undefined)?"/);
  assert.match(about, /<img ref="historyWheel"[^>]*:data-cms-preview-field-path="historyIcon\.fieldPath"/);
  assert.match(home, /const historyIcon = computed\(\(\) => \{[\s\S]*?fieldPath:/);
  assert.match(about, /const historyIcon = computed\(\(\) => \{[\s\S]*?fieldPath:/);
});
