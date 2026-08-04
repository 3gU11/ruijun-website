import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('Nuxt about page joins the opening story into one desktop scroll composition', async () => {
  const page = await readFile(new URL('../pages/about.vue', import.meta.url), 'utf8');
  assert.match(page, /getStoryMotion/);
  assert.match(page, /ref="storySection" class="about-story"/);
  assert.match(page, /ref="storyBackdrop" class="about-story-backdrop"/);
  assert.match(page, /trigger: storySection\.value/);
  assert.match(page, /@media \(min-width: 901px\).*\.about-story-backdrop/s);
  assert.match(page, /height:200svh/);
  assert.match(page, /data-about-panel/);
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
  assert.doesNotMatch(page, /class="history-guide"/);
  assert.match(page, /Observer\.create/);
  assert.match(page, /historyBoundaryDistance/);
  assert.match(page, /historyBoundaryDirection !== direction/);
  assert.match(page, /onStopDelay: \.2/);
  assert.match(page, /window\.location\.hash === '#history'/);
  assert.match(page, /historyExitUnlockTimer/);
  assert.match(page, /外贸：177 5111 9936/);
  assert.match(page, /kylewuedm@gmail\.com/);
  assert.match(page, /你有量<br>我有价/);
  assert.match(page, /client-domestic-/);
  assert.match(page, /client-global-/);
  assert.match(indicator, /关于我们页面段落导航/);
  assert.match(indicator, /ScrollToPlugin/);
  assert.match(indicator, /about-panel-jump/);
});
