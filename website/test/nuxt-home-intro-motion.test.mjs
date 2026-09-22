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
  assert.match(page, /\.intro-machine-wrap\{[^}]*border-radius:24px/);
  assert.match(motion, /borderRadius: forward \? 24 : 0/);
  assert.match(page, /reason-horizontal-track/);
  assert.equal(page.match(/class="reason-tabs"/g)?.length, 1);
  assert.match(page, /<section id="reason-showcase"[\s\S]*?<div class="reason-tabs"[\s\S]*?<div class="reason-horizontal-track">/);
  assert.match(page, /history-title-line|history-en/);
  assert.match(page, /<section id="contact" class="contact-panel lifecycle-panel"/);
  assert.match(motion, /import\('gsap\/Observer'\)/);
  assert.match(motion, /import\('gsap\/ScrollToPlugin'\)/);
  assert.match(motion, /const HERO_INTRO_LOCK_MS = 4000/);
  assert.match(motion, /const HERO_HEADER_FULL_WIDTH_HOLD_MS = 420/);
  assert.match(motion, /const HERO_FREEZE_HOLD_MS = 700/);
  assert.match(motion, /heroVideo\?\.addEventListener\('playing', startHeroInputLock\)/);
  assert.match(motion, /if \(panels\[panelIndex\] !== hero\) return/);
  assert.match(motion, /if \(!desktop\.matches \|\| animating\) return/);
  assert.match(motion, /panels\[panelIndex\] === hero && heroInputLocked/);
  assert.match(motion, /ruijun:hero-freeze/);
  assert.match(motion, /performance\.now\(\) \+ HERO_FREEZE_HOLD_MS/);
  assert.match(motion, /preventDefault: true/);
  assert.match(motion, /header\?\.classList\.toggle\('is-hero-locked', locked\)/);
  assert.match(motion, /header\.classList\.add\('is-hero-entered-wide'\)/);
  assert.match(motion, /runMachineMorph/);
  assert.match(motion, /scrubReasons/);
  assert.match(motion, /clipPath: `inset\(0 \$\{outgoing \* 100\}% 0 0\)`/);
  assert.match(motion, /const reasonTabLinks = \[\.\.\.showcase\.querySelectorAll<HTMLAnchorElement>\('\.reason-tabs a'\)\]/);
  assert.match(motion, /function syncMobileReasonTabs\(\)/);
  assert.doesNotMatch(motion, /snapReasonsToNearest|onStopDelay|onStop:/);
  assert.match(motion, /reasonMagnetDistance < 88/);
  assert.match(motion, /reasonMagnetLockedUntil = performance\.now\(\) \+ 220;\s*return;/);
  assert.doesNotMatch(motion, /reasonMagnetDistance - 88/);
  assert.match(motion, /Math\.abs\(reasonTarget - nearestStop\) <= \.055/);
  assert.match(motion, /1\.001 - Math\.pow\(2, -10 \* progress\)/);
  assert.match(motion, /duration: magnetized \? \.55 : 1\.3/);
  assert.match(motion, /ease: reasonInertiaEase/);
  assert.match(motion, /const PANEL_BOUNDARY_DISTANCE = 180/);
  assert.match(motion, /const requiredDistance = onIntroStep \? PANEL_STEP_DISTANCE : PANEL_BOUNDARY_DISTANCE/);
  assert.doesNotMatch(motion, /introExitBlockedUntil|Date\.now\(\) \+ 1500/);
  assert.match(motion, /scrubHistory/);
  assert.match(motion, /function releaseToContactScroll|const releaseToContactScroll/);
  assert.match(motion, /nextPanel\.id === 'contact'\) releaseToContactScroll\(\)/);
  assert.match(page, /class="history-wheel-cursor"/);
  assert.match(page, /const historyIcon = computed\(/);
  assert.match(page, /class="history-wheel" :src="historyIcon\.path"/);
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
  assert.match(page, /@media\(min-width:901px\)\{\s*\.contact-panel\.lifecycle-panel\{height:auto;min-height:100svh;overflow:visible\}/);
});

test('Nuxt home preview targeting resolves nested reason fields to the horizontal showcase slide', async () => {
  const motion = await readFile(new URL('../components/HomeImmersiveMotion.vue', import.meta.url), 'utf8');

  assert.match(motion, /const previewTargets = \[\.\.\.root\.querySelectorAll<HTMLElement>\(selector\)\]/);
  assert.match(motion, /previewTargets\.find\(candidate => candidate\.closest<HTMLElement>\('#reason-showcase \[data-reason-slide\]'\)\)/);
  assert.match(motion, /target\?\.closest<HTMLElement>\('\[data-reason-slide\]'\)\?\.dataset\.reasonSlide/);
});

test('Nuxt home chapters 1-3 preserve the PSD copy hierarchy without extra showcase copy', async () => {
  const page = await readFile(new URL('../pages/index.vue', import.meta.url), 'utf8');

  assert.match(page, /选择瑞钧的\\n三大理由/);
  assert.match(page, /shortTitle: '增效降损'/);
  assert.match(page, /introTitle: '增效降损'/);
  assert.match(page, /introDetail: '效能提升50%，丝损降低30%'/);
  assert.match(page, /class="performance-statement cms-styled-text"/);
  assert.match(page, /class="performance-group"/);
  assert.match(page, /\.performance-group\{position:absolute;[^}]*top:50%;left:50%;display:flex/);
  assert.match(page, /font-size:clamp\(28px,2\.74vw,58px\)/);
  assert.match(page, /introTitle: '行业领军品牌'/);
  assert.match(page, /introDetail: '销量持续领先，品质始终如一'/);
  assert.match(page, /reason-tab-efficiency\.png/);
  assert.match(page, /reason-tab-manufacturing\.png/);
  assert.match(page, /reason-tab-leadership\.png/);
  assert.match(page, /class="reason-tab-icon"[\s\S]*data-cms-preview-placement-key="home\.reason\.icon"/);
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
  const [page, motion] = await Promise.all([
    readFile(new URL('../pages/index.vue', import.meta.url), 'utf8'),
    readFile(new URL('../components/HomeImmersiveMotion.vue', import.meta.url), 'utf8')
  ]);

  assert.match(page, /heroVideo\.value\?\.pause\(\)/);
  assert.match(page, /@ended="finishHeroVideo"/);
  assert.match(page, /v-if="heroState\.videoVisible && \(!videoCompleted \|\| videoFading\) \|\| cmsVisualEditMode"/);
  assert.match(page, /html\[data-cms-preview-edit-mode="true"\] \.hero\.hero-ended \.hero-end-frame\{pointer-events:none\}/);
  assert.match(page, /html\[data-cms-preview-edit-mode="true"\] \.hero\.hero-ended \.hero-video\{opacity:1;pointer-events:auto\}/);
  assert.match(page, /id="hero-end-sharpen"/);
  assert.match(page, /\.hero-video\.is-ended\{filter:url\(#hero-end-sharpen\)\}/);
  assert.match(page, /const heroVideoSource = computed/);
  assert.match(page, /<video[^>]*:src="heroVideoSource"[^>]*autoplay playsinline/);
  assert.match(page, /data-cms-preview-field-path="hero_video_asset_id" data-cms-preview-placement-key="home\.hero\.video" data-cms-preview-media-role="video"/);
  assert.doesNotMatch(page, /data-cms-preview-field-path="'hero_video_asset_id'"/);
  assert.match(page, /const value = String\(heroContent\.value\?\.hero_video_asset_id \|\| ''\)\.trim\(\);/);
  assert.match(page, /const previewUrl = String\(heroContent\.value\?\.hero_video_asset_url \|\| ''\)\.trim\(\);/);
    assert.match(page, /if \(\/\^\(\?:\\\/api\\\/preview\\\/media\\\/\[1-9\]\\d\*\|\\\/assets\\\/\|https\?:\\\/\\\/\)\/i\.test\(previewUrl\)\) return previewUrl;/);
  assert.match(page, /class="hero-video(?:\s[^\"]*)?"[^>]* autoplay playsinline/);
  assert.match(page, /class="hero-sound-toggle"/);
  assert.match(page, /function toggleHeroSound\(\)/);
  assert.match(page, /async function startHeroVideo\(\)/);
  assert.match(page, /function freezeHeroVideo\(\)/);
  assert.match(page, /const videoFading = ref\(false\)/);
  assert.match(page, /videoFadeTimer = window\.setTimeout/);
  assert.match(page, /addEventListener\('ruijun:hero-freeze', freezeHeroVideo\)/);
  assert.match(page, /autoplaySoundBlocked\.value = video\.muted/);
  assert.match(page, /开启视频声音/);
  assert.match(page, /hero-sound-toggle\.is-muted/);
  assert.match(page, /video\.muted = true/);
  assert.match(page, /function restoreHeroSoundAfterInteraction\(\)/);
  assert.match(page, /addEventListener\('pointerdown', restoreHeroSoundAfterInteraction/);
  assert.match(page, /const heroEndFrame = computed\(\(\) => heroContent\.value\.image \|\| heroMedia\.value\?\.posterPath \|\| '\/assets\/home-intro-end-video-sharpened\.png\?v=1'/);
  assert.match(page, /<img class="hero-end-frame cms-media" :src="heroEndFrame"/);
  assert.doesNotMatch(page, /hero-cms-title|<h1 v-if="heroContent\.title"/);
  assert.match(page, /v-if="heroContent\.body \|\| heroContent\.label" class="hero-cms-copy cms-positioned"/);
  assert.match(page, /<p v-if="heroContent\.body" v-bind="fieldPresentationAttributes\(heroContent, 'body'\)"[^>]+data-cms-preview-position-field-path="field_presentation\.body"/);
  assert.match(page, /<a v-if="heroContent\.label" v-bind="fieldPresentationAttributes\(heroContent, 'label'\)"[^>]+data-cms-preview-position-field-path="field_presentation\.label"/);
  assert.match(page, /class="hero-ended-link"[^>]+v-bind="fieldPresentationAttributes\(heroContent, 'label'\)"[^>]+data-cms-preview-position-field-path="field_presentation\.label"/);
  assert.match(page, /\.hero-ended \.hero-end-frame\{opacity:1\}/);
  assert.doesNotMatch(page, /hero-frame-breathe|transform:scale\(1\.012\)/);
  assert.match(motion, /currentPanel === hero \|\| nextPanel === hero/);
  assert.match(page, /const showHeroNextButton = computed\(\(\) => videoCompleted\.value\)/);
  assert.match(page, /class="hero-ended-link" :class="\{ 'is-visible': showHeroNextButton \}"[^>]+data-cms-preview-field-path="label"[^>]+data-cms-preview-link-field-path="href"[^>]+:href="heroContent\.href \|\| '#reasons'">\{\{ heroContent\.label \|\| '了解更多' \}\}/);
  assert.match(page, /\.hero-ended-link\{[^}]*color:transparent[^}]*background:transparent[^}]*opacity:0!important[^}]*pointer-events:none/s);
  assert.match(page, /\.hero-ended-link\.is-visible\{opacity:1!important;pointer-events:auto\}/);
  assert.doesNotMatch(page, /@hero-ended="finishHeroVideo/);
});
