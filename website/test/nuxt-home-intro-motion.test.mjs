import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('Nuxt home restores the legacy GSAP immersive controller with a mobile document-flow fallback', async () => {
  const [page, motion] = await Promise.all([
    readFile(new URL('../pages/index.vue', import.meta.url), 'utf8'),
    readFile(new URL('../components/HomeImmersiveMotion.vue', import.meta.url), 'utf8')
  ]);
  assert.match(page, /HomeImmersiveMotion/);
  assert.match(page, /intro-machine-wrap/);
  assert.match(page, /reason-horizontal-track/);
  assert.match(page, /history-title-line|history-en/);
  assert.match(motion, /import\('gsap\/Observer'\)/);
  assert.match(motion, /import\('gsap\/ScrollToPlugin'\)/);
  assert.match(motion, /const HERO_INTRO_LOCK_MS = 4000/);
  assert.match(motion, /const HERO_HEADER_FULL_WIDTH_HOLD_MS = 420/);
  assert.match(motion, /heroVideo\?\.addEventListener\('playing', startHeroInputLock\)/);
  assert.match(motion, /if \(!desktop\.matches \|\| heroInputLocked \|\| animating\) return/);
  assert.match(motion, /if \(heroInputLocked\) return/);
  assert.match(motion, /header\?\.classList\.toggle\('is-hero-locked', locked\)/);
  assert.match(motion, /header\.classList\.add\('is-hero-entered-wide'\)/);
  assert.match(motion, /runMachineMorph/);
  assert.match(motion, /scrubReasons/);
  assert.match(motion, /scrubHistory/);
  assert.match(page, /class="history-wheel-cursor"/);
  assert.match(page, /class="history-orbit-ring"/);
  assert.match(page, /class="history-orbit"/);
  assert.match(motion, /pulseHistoryCursor/);
  assert.match(motion, /rotation: historyOrbitRotation/);
  assert.match(motion, /direction \* 18/);
  assert.match(motion, /autoAlpha: 0, y: 38, rotation: -8, transformOrigin: '100% 100%'/);
  assert.match(motion, /duration: \.96, ease: 'power3\.out'/);
  assert.match(motion, /--wire-length/);
  assert.match(page, /\.intro-copy \.section-kicker,\.intro-copy h2,\.reason-list li\{opacity:0;transform:translateY\(24px\);will-change:transform,opacity/);
  assert.match(page, /@media\(max-width:900px\).*\.reason-horizontal-track/s);
});

test('Nuxt home chapters 1-3 preserve the PSD copy hierarchy without extra showcase copy', async () => {
  const page = await readFile(new URL('../pages/index.vue', import.meta.url), 'utf8');

  assert.match(page, /选择瑞钧的\\n三大理由/);
  assert.match(page, /introTitle: '行业领军品牌'/);
  assert.match(page, /introDetail: '产品销量稳居全国第一（数据来源电加工协会）'/);
  assert.match(page, /reason-tab-efficiency\.png/);
  assert.match(page, /reason-tab-manufacturing\.png/);
  assert.match(page, /reason-tab-leadership\.png/);
  assert.match(page, /class="reason-tab-label"/);
  assert.doesNotMatch(page, /WHY RUIJUN/);
  assert.doesNotMatch(page, /\{\{ reason\.body \}\}/);
  assert.doesNotMatch(page, /\{\{ reason\.kicker \}\}/);
});

test('Nuxt home product chapter matches the supplied six-card reference', async () => {
  const page = await readFile(new URL('../pages/index.vue', import.meta.url), 'utf8');

  for (const series of ['无人化加工系列', '自动穿丝系列', '高速切割系列', '一体机系列', '大摇摆系列', '超大型系列']) {
    assert.match(page, new RegExp(series));
  }
  assert.match(page, /<span>我们的<\/span><em>产品<\/em>/);
  assert.match(page, /\{\{ index \+ 1 \}\} \/ \{\{ product\.series \}\}/);
  assert.match(page, /\.product-card\{aspect-ratio:420\/259/);
  assert.doesNotMatch(page, /String\(index \+ 1\)\.padStart/);
});

test('Nuxt home freezes the opening video on its final frame and exposes the embedded next-step action', async () => {
  const page = await readFile(new URL('../pages/index.vue', import.meta.url), 'utf8');

  assert.match(page, /heroVideo\.value\?\.pause\(\)/);
  assert.match(page, /@ended="finishHeroVideo"/);
  assert.match(page, /v-if="heroState\.videoVisible"/);
  assert.match(page, /:class="\{ 'is-ended': videoCompleted \}"/);
  assert.match(page, /id="hero-end-sharpen"/);
  assert.match(page, /\.hero-video\.is-ended\{filter:url\(#hero-end-sharpen\)\}/);
  assert.match(page, /<source src="\/assets\/home-intro\.mp4" type="video\/mp4">/);
  assert.match(page, /<img v-if="videoFailed" class="hero-end-frame" src="\/assets\/home-intro-end-aligned\.png\?v=3"/);
  assert.match(page, /\.hero-ended \.hero-end-frame\{opacity:1\}/);
  assert.match(page, /const showHeroNextButton = computed\(\(\) => videoCompleted\.value\)/);
  assert.match(page, /class="hero-ended-link" :class="\{ 'is-visible': showHeroNextButton \}" href="#reasons">了解更多/);
  assert.match(page, /\.hero-ended-link\{[^}]*color:transparent[^}]*background:transparent[^}]*opacity:0!important[^}]*pointer-events:none/s);
  assert.match(page, /\.hero-ended-link\.is-visible\{opacity:1!important;pointer-events:auto\}/);
  assert.doesNotMatch(page, /@hero-ended="finishHeroVideo/);
});
