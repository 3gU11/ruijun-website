import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('Nuxt about page joins the opening story into one desktop scroll composition', async () => {
  const page = await readFile(new URL('../pages/about.vue', import.meta.url), 'utf8');
  assert.match(page, /getStoryMotion/);
  assert.match(page, /ref="storySection" class="about-story"/);
  assert.match(page, /ref="storyBackdrop" class="about-story-backdrop"/);
  assert.match(page, /const heroNumber = heroCopy\.querySelector<HTMLElement>\('strong'\)/);
  assert.match(page, /gsap\.fromTo\(heroNumber, \{ autoAlpha: 0, x: -72 \}/);
  assert.match(page, /gsap\.fromTo\(heroUnit, \{ autoAlpha: 0, x: 54 \}/);
  assert.match(page, /gsap\.fromTo\(heroTitle, \{ autoAlpha: 0, y: 34 \}/);
  assert.match(page, /trigger: storySection\.value/);
  assert.match(page, /@media \(min-width: 901px\).*\.about-story-backdrop/s);
  assert.match(page, /height:200svh/);
  assert.match(page, /data-about-panel/);
  assert.match(page, /class="legacy-copy"/);
  assert.match(page, /const heroBackdropStyle = computed/);
  assert.match(page, /:style="heroBackdropStyle"/);
  assert.match(page, /about-psd\/banner\.jpg/);
  assert.match(page, /const brandStoryKicker = computed\(\(\) => sectionText\('brand-story', 'kicker', 'Since'\)\)/);
  assert.match(page, /const brandStoryYear = computed\(\(\) => sectionText\('brand-story', 'description', '1997'\)\)/);
  assert.match(page, /<span[^>]*data-cms-preview-field-path="kicker"[^>]*>\{\{ brandStoryKicker \}\}<\/span><strong[^>]*data-cms-preview-field-path="description"[^>]*>\{\{ brandStoryYear \}\}<\/strong>/);
  assert.match(page, /class="legacy-story(?:\s|")/);
  assert.match(page, /aria-labelledby="brand-story-title"/);
  assert.match(page, /上世纪 90 年代初，二十来岁的年轻兄弟俩立足温州/);
  assert.match(page, /2023 年斥资数亿元在常熟建设 4\.0 智慧工厂/);
  assert.match(page, /const brandStoryTitle = computed\(\(\) => sectionText\('brand-story', 'title', '品牌故事'\)\)/);
  assert.match(page, /<h2 id="brand-story-title"[^>]*>\{\{ brandStoryTitle \}\}<\/h2>/);
  assert.match(page, /ScrollTrigger\.create\(/);
  assert.match(page, /trigger: legacySection,\s*start: 'top 88%',\s*end: 'bottom 16%',\s*scrub: 1\.2,\s*invalidateOnRefresh: true/s);
  assert.match(page, /const sinceProgress =/);
  assert.match(page, /const yearProgress =/);
  assert.match(page, /autoAlpha: sinceProgress, y: \(1 - sinceProgress\) \* 18/);
  assert.match(page, /autoAlpha: yearProgress, y: \(1 - yearProgress\) \* 18/);
  assert.doesNotMatch(page, /gsap\.from\('\.about-reveal'/);
  assert.match(page, /trigger: overview,\s*start: 'top 86%',\s*end: 'top 30%',\s*scrub: 1\.25/s);
  assert.match(page, /trigger: overview,\s*start: 'top 48%',\s*end: 'bottom 48%',\s*scrub: 1\.35/s);
  assert.match(page, /let aboutDisposed = false/);
  assert.match(page, /if \(aboutDisposed\) return/);
  assert.match(page, /aboutDisposed = true/);
  assert.match(page, /\.about-story,\.about-overview\{background:#fbfaf7\}/);
  assert.match(page, /\.about-story \.legacy\{isolation:isolate;contain:paint;clip-path:inset\(0\)\}/);
  assert.match(page, /\.about-overview\{position:relative;z-index:2;isolation:isolate\}/);
});

test('desktop-visible about hero backdrop carries the complete visual editing record context', async () => {
  const page = await readFile(new URL('../pages/about.vue', import.meta.url), 'utf8');
  const backdrop = page.match(/<div ref="storyBackdrop"[^>]*>/)?.[0] || '';
  assert.match(backdrop, /:data-cms-preview-collection="heroContent\.cms_collection \|\| undefined"/);
  assert.match(backdrop, /:data-cms-preview-item-id="heroContent\.cms_item_id \|\| undefined"/);
  assert.match(backdrop, /data-cms-preview-key="hero"/);
  assert.match(backdrop, /:data-cms-preview-field-path="heroBackdrop\.fieldPath"/);
  assert.match(backdrop, /data-cms-preview-media-role="background"/);
  assert.match(backdrop, /data-cms-preview-media-slot="background"/);
  assert.match(backdrop, /data-cms-preview-allow-default="true"/);
  assert.match(page, /const binding = pageSectionMediaBinding\(0\)/);
  assert.match(page, /html\[data-cms-preview-edit-mode="true"\] \.about-story>section\{pointer-events:none\}/);
  assert.match(page, /html\[data-cms-preview-edit-mode="true"\] \.about-story>section \[data-cms-preview-editable="true"\]\{pointer-events:auto\}/);
});

test('Nuxt about page retains every legacy content chapter and its dedicated footer', async () => {
  const [page, indicator] = await Promise.all([
    readFile(new URL('../pages/about.vue', import.meta.url), 'utf8'),
    readFile(new URL('../components/AboutSectionIndicator.vue', import.meta.url), 'utf8')
  ]);

  for (const heading of ['厂区风貌', '认证证书', '荣誉证书', '专利证书', '众多世界知名品牌厂家和供应商合作', '客户现场']) {
    assert.match(page, new RegExp(heading));
  }
  assert.match(page, /class="about-history history lifecycle-panel"/);
  assert.match(page, /class="history-event"/);
  assert.match(page, /class="history-orbit"/);
  assert.match(page, /history-guide-wheel\.png/);
  assert.match(page, /ref="historyWheelCursor" class="history-wheel-cursor"/);
  assert.match(page, /ref="historyOrbitRing" class="history-orbit-ring"/);
  assert.match(page, /ref="historyCursor" class="history-cursor"><\/i><\/div>/);
  assert.match(page, /function spinHistoryWheel/);
  assert.match(page, /rotation: historyWheelRotation/);
  assert.match(page, /rotation: historyOrbitRotation/);
  assert.match(page, /direction \* rotationStep/);
  assert.match(page, /gsap\.set\(wheelCursor, \{ x: motion\.cursorX/);
  assert.match(page, /wheelCursor\.style\.setProperty\('--wire-length'/);
  assert.match(page, /repeating-linear-gradient\(90deg,#aaa7a7/);
  assert.match(page, /direction \* 18/);
  assert.match(page, /x: 0, duration: \.3/);
  assert.match(page, /class="history-progress"/);
  assert.match(page, /SCROLL TO EXPLORE/);
  assert.match(page, /getSequentialLineReveal/);
  assert.match(page, /historyExitArmed/);
  for (const year of ['1997', '2003', '2006', '2014', '2016', '2025']) {
    assert.match(page, new RegExp(`'${year}'`));
  }
  assert.match(page, /\['2025', '启用瑞钧智科', '常熟基地'\]/);
  assert.doesNotMatch(page, /class="history-guide"/);
  assert.match(page, /Observer\.create/);
  assert.match(page, /historyBoundaryDistance/);
  assert.match(page, /historyBoundaryDirection !== direction/);
  assert.match(page, /onStopDelay: \.2/);
  assert.match(page, /window\.location\.hash === '#history'/);
  assert.match(page, /historyExitUnlockTimer/);
  assert.match(page, /外贸：17751119936/);
  assert.match(page, /kylewuedm@gmail\.com/);
  assert.match(page, /你有量<br>我有价/);
  assert.match(page, /专攻电加工卡脖子技术/);
  assert.match(page, /我们拥有完善的售前、售中、售后服务！/);
  assert.doesNotMatch(page, /Forerunner in/);
  assert.match(page, /client-domestic-/);
  assert.match(page, /client-global-/);
  assert.match(page, /openGallery\(domesticClients, index, domesticClientsContent\.title\)/);
  assert.match(page, /openGallery\(globalClients, index, globalClientsContent\.title\)/);
  assert.match(page, /factoryGalleryAssets\(findAboutSection\('factory'\), fallbackFactoryGallery\)/);
  assert.match(page, /:data-cms-preview-media-slot="asset.mediaSlot"/);
  assert.match(page, /partnerGalleryAssets\(findAboutSection\('partners'\)/);
  assert.match(page, /clientGalleryAssets\(findAboutSection\('clients-domestic'\), fallbackDomesticClients\)/);
  assert.match(page, /clientGalleryAssets\(findAboutSection\('clients-global'\), fallbackGlobalClients\)/);
  assert.match(page, /累计数万用户/);
  assert.doesNotMatch(page, /20000\+/);
  assert.match(page, /text-indent: 2em; text-align: justify/);
  assert.match(indicator, /关于我们页面段落导航/);
  assert.match(indicator, /ScrollToPlugin/);
  assert.match(indicator, /about-panel-jump/);
  assert.match(indicator, /document\.documentElement\.dataset\.aboutPanelJump = 'true'/);
  assert.match(indicator, /delete document\.documentElement\.dataset\.aboutPanelJump/);
  assert.match(page, /document\.documentElement\.dataset\.aboutPanelJump === 'true'/);
  assert.match(page, /if \(targetPanel === panel\) return;/);
  assert.match(page, /gsap\.killTweensOf\(window\);\s*historyObserver\.disable\(\);/);
  assert.doesNotMatch(page, /if \(!historyActive \|\| targetPanel === panel\) return;/);
});

test('about record-backed qualifications are editable while unowned PSD fallbacks stay read-only', async () => {
  const page = await readFile(new URL('../pages/about.vue', import.meta.url), 'utf8');
  assert.match(page, /qualificationAssetBinding\(qualification, asset\.sourceIndex \?\? assetIndex\)/);
  assert.match(page, /return assets\.length \? assets : fallback/);
  assert.match(page, /asset\.managed === true \? binding\?\.fieldPath : undefined/);
  assert.match(page, /asset\.managed === true && typeof asset\.path === 'string'/);
});
