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
  assert.match(motion, /runMachineMorph/);
  assert.match(motion, /scrubReasons/);
  assert.match(motion, /scrubHistory/);
  assert.match(page, /class="history-wheel-cursor"/);
  assert.match(page, /class="history-orbit-ring"/);
  assert.match(page, /class="history-orbit"/);
  assert.match(motion, /pulseHistoryCursor/);
  assert.match(motion, /rotation: historyOrbitRotation/);
  assert.match(motion, /direction \* 18/);
  assert.match(motion, /--wire-length/);
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

test('Nuxt home crossfades out of the opening video before its unsafe final frames', async () => {
  const page = await readFile(new URL('../pages/index.vue', import.meta.url), 'utf8');

  assert.match(page, /HERO_VIDEO_FADE_LEAD_SECONDS = \.65/);
  assert.match(page, /HERO_VIDEO_CROSSFADE_MS = 680/);
  assert.match(page, /@timeupdate="handleHeroVideoProgress"/);
  assert.match(page, /@ended="finishHeroVideo\(\)"/);
  assert.match(page, /v-if="heroState\.videoVisible \|\| videoFading"/);
  assert.match(page, /\.hero-video\.is-fading\{opacity:0/);
  assert.match(page, /\.hero-static-machine\{[^}]*opacity:0[^}]*transition:opacity \.68s/s);
  assert.match(page, /radial-gradient\(ellipse 58% 94% at 50% 108%/);
});
