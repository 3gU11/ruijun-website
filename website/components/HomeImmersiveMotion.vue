<script setup lang="ts">
const emit = defineEmits<{ heroEnded: [] }>();

const labels = ['首页', '选择瑞钧', '三大理由', '产品中心', '发展历程', '联系瑞钧'];
const activePanel = ref(0);
const indicatorVisible = ref(false);
const indicatorProgress = ref(0);
let cleanupMotion: (() => void) | undefined;
let jumpPanel: (index: number) => void = () => {};

onMounted(async () => {
  const root = document.querySelector<HTMLElement>('.home-page');
  if (!root) return;

  const [{ gsap }, { Observer }, { ScrollToPlugin }] = await Promise.all([
    import('gsap'), import('gsap/Observer'), import('gsap/ScrollToPlugin')
  ]);
  gsap.registerPlugin(Observer, ScrollToPlugin);

  const panels = [...root.querySelectorAll<HTMLElement>('.lifecycle-panel')];
  const hero = root.querySelector<HTMLElement>('.hero')!;
  const heroMachine = root.querySelector<HTMLElement>('.hero-static-machine')!;
  const intro = root.querySelector<HTMLElement>('.reason-intro')!;
  const introStage = root.querySelector<HTMLElement>('.intro-machine-wrap')!;
  const introMachine = introStage.querySelector<HTMLElement>('img')!;
  const introItems = [...intro.querySelectorAll<HTMLElement>('.reason-list li')];
  const morph = root.querySelector<HTMLElement>('.machine-morph-overlay')!;
  const morphBg = morph.querySelector<HTMLElement>('.machine-morph-bg')!;
  const morphImage = morph.querySelector<HTMLElement>('img')!;
  const showcase = root.querySelector<HTMLElement>('.reason-showcase')!;
  const slides = [...showcase.querySelectorAll<HTMLElement>('[data-reason-slide]')];
  const reasonProgress = [...showcase.querySelectorAll<HTMLElement>('.reason-progress i')];
  const history = root.querySelector<HTMLElement>('.history')!;
  const historyViewport = history.querySelector<HTMLElement>('.history-viewport')!;
  const historyTrack = history.querySelector<HTMLElement>('.history-track')!;
  const historyCopy = history.querySelector<HTMLElement>('.history-copy')!;
  const historyLines = [...historyCopy.querySelectorAll<HTMLElement>('.history-en span')];
  const historyCn = historyCopy.querySelector<HTMLElement>('.history-cn')!;
  const historyCursor = history.querySelector<HTMLElement>('.history-cursor')!;
  const historyOrbitRing = history.querySelector<HTMLElement>('.history-orbit-ring')!;
  const historyWheelCursor = history.querySelector<HTMLElement>('.history-wheel-cursor')!;
  const historyWheel = history.querySelector<HTMLElement>('.history-wheel')!;
  const historyEvents = [...history.querySelectorAll<HTMLElement>('.history-event')];
  const historyProgress = [...history.querySelectorAll<HTMLElement>('.history-progress i')];
  const header = document.querySelector<HTMLElement>('.site-header');
  const desktop = window.matchMedia('(min-width: 901px) and (prefers-reduced-motion: no-preference)');
  const reasonMotion = { progress: 0 };
  const historyMotion = { progress: 0 };
  let panelIndex = 0;
  let introStageIndex = 0;
  let reasonIndex = 0;
  let reasonTarget = 0;
  let reasonBoundary = 0;
  let historyTarget = 0;
  let historyBoundary = 0;
  let historyWheelRotation = 0;
  let historyOrbitRotation = 0;
  let historyCursorPulseActive = false;
  let gestureDistance = 0;
  let animating = false;
  let hideTimer = 0;
  let observer: any;

  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

  function revealIndicator() {
    if (!desktop.matches) return;
    indicatorVisible.value = true;
    window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(() => { indicatorVisible.value = false; }, 620);
  }

  function updateIndicator() {
    const range = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    indicatorProgress.value = clamp(window.scrollY / range, 0, 1);
  }

  function setIntroStage(index: number, showHeading = true) {
    introStageIndex = clamp(index, 0, introItems.length);
    intro.classList.toggle('intro-heading-visible', showHeading);
    introItems.forEach((_, itemIndex) => intro.classList.remove(`intro-stage-${itemIndex + 1}`));
    if (introStageIndex) intro.classList.add(`intro-stage-${introStageIndex}`);
  }

  function machineRect(element: HTMLElement, relativeTo?: HTMLElement) {
    const rect = element.getBoundingClientRect();
    const parent = relativeTo?.getBoundingClientRect();
    return { left: rect.left - (parent?.left || 0), top: rect.top - (parent?.top || 0), width: rect.width, height: rect.height };
  }

  function runMachineMorph(direction: 'forward' | 'backward', duration: number) {
    const forward = direction === 'forward';
    const viewport = { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
    const introBox = forward
      ? { left: introStage.offsetLeft, top: introStage.offsetTop, width: introStage.offsetWidth, height: introStage.offsetHeight }
      : machineRect(introStage);
    const heroBox = machineRect(heroMachine, hero);
    const introMachineBox = machineRect(introMachine, introStage);
    const stageStart = forward ? viewport : introBox;
    const stageEnd = forward ? introBox : viewport;
    const imageStart = forward ? heroBox : introMachineBox;
    const imageEnd = forward ? introMachineBox : heroBox;

    gsap.killTweensOf([morph, morphBg, morphImage]);
    heroMachine.classList.add('is-morph-hidden');
    introMachine.classList.add('is-morph-hidden');
    introStage.classList.add('is-stage-morph-hidden');
    gsap.set(morph, { display: 'block', autoAlpha: 1, ...stageStart, borderRadius: forward ? 0 : 5 });
    gsap.set(morphBg, { autoAlpha: forward ? 1 : 0 });
    gsap.set(morphImage, imageStart);
    gsap.timeline({
      defaults: { duration, ease: 'power3.inOut', overwrite: true },
      onComplete: () => {
        gsap.set(morph, { display: 'none', autoAlpha: 0 });
        heroMachine.classList.remove('is-morph-hidden');
        introMachine.classList.remove('is-morph-hidden');
        introStage.classList.remove('is-stage-morph-hidden');
      }
    })
      .to(morph, { ...stageEnd, borderRadius: forward ? 5 : 0 }, 0)
      .to(morphImage, imageEnd, 0)
      .to(morphBg, { autoAlpha: forward ? 0 : 1, duration: duration * .72, ease: 'power2.inOut' }, duration * .16);
  }

  function renderReasons(progress: number) {
    const max = slides.length - 1;
    reasonMotion.progress = clamp(progress, 0, max);
    reasonIndex = Math.round(reasonMotion.progress);
    slides.forEach((slide, index) => {
      const incoming = index === 0 ? 1 : clamp(reasonMotion.progress - (index - 1), 0, 1);
      const outgoing = index < max ? clamp(reasonMotion.progress - index, 0, 1) : 0;
      gsap.set(slide, { x: 0, xPercent: index === 0 ? 0 : (1 - incoming) * 100 });
      slide.setAttribute('aria-hidden', String(index !== reasonIndex));
      const media = slide.querySelector<HTMLElement>('.scene-photo, .performance-machine');
      const tabs = slide.querySelector<HTMLElement>('.reason-tabs');
      const copy = slide.querySelector<HTMLElement>('.performance-content, .photo-copy');
      if (media && index > 0) gsap.set(media, { xPercent: (1 - incoming) * 3.5, scale: 1 + (1 - incoming) * .08, transformOrigin: '50% 50%' });
      if (tabs) gsap.set(tabs, { x: (1 - incoming) * 34 - outgoing * 14 });
      if (copy) gsap.set(copy, { x: (1 - incoming) * 82 - outgoing * 32, y: (1 - incoming) * 10, opacity: .68 + incoming * .32 - outgoing * .1 });
    });
    reasonProgress.forEach((item, index) => item.classList.toggle('active', index === reasonIndex));
  }

  function setReason(index: number, animate = true) {
    const next = clamp(index, 0, slides.length - 1);
    reasonTarget = next;
    reasonBoundary = 0;
    gsap.killTweensOf(reasonMotion);
    if (!desktop.matches || !animate || Math.abs(reasonMotion.progress - next) < .001) {
      renderReasons(next);
      return;
    }
    animating = true;
    gsap.to(reasonMotion, { progress: next, duration: .75, ease: 'power3.inOut', overwrite: true, onUpdate: () => renderReasons(reasonMotion.progress), onComplete: () => { animating = false; renderReasons(next); } });
  }

  function scrubReasons(delta: number) {
    const max = slides.length - 1;
    const direction = Math.sign(delta);
    const atBoundary = direction < 0
      ? reasonTarget <= .001 && reasonMotion.progress <= .012
      : reasonTarget >= max - .001 && reasonMotion.progress >= max - .012;
    if (atBoundary) {
      reasonBoundary += Math.abs(delta);
      if (reasonBoundary >= 140) { reasonBoundary = 0; gsap.killTweensOf(reasonMotion); goToPanel(panelIndex + direction); }
      return;
    }
    reasonBoundary = 0;
    reasonTarget = clamp(reasonTarget + delta / Math.max(720, window.innerHeight * .95), 0, max);
    gsap.to(reasonMotion, { progress: reasonTarget, duration: .28, ease: 'power2.out', overwrite: true, onUpdate: () => renderReasons(reasonMotion.progress), onComplete: () => renderReasons(reasonTarget) });
  }

  function renderHistory(progress: number) {
    historyMotion.progress = clamp(progress, 0, 1);
    const startX = history.clientWidth * .88;
    const endX = -Math.max(0, historyTrack.scrollWidth - historyViewport.clientWidth);
    const trackX = startX + (endX - startX) * historyMotion.progress;
    const contentX = trackX - startX;
    const cursorTravel = Math.max(0, history.clientWidth + historyWheelCursor.offsetWidth + 30 - historyWheelCursor.offsetLeft);
    const cursorX = cursorTravel * historyMotion.progress;
    const cursorTip = historyWheelCursor.offsetLeft + cursorX + historyWheelCursor.offsetWidth + 25;
    const reveal = clamp((cursorTip - (historyCopy.offsetLeft + contentX)) / Math.max(1, historyCopy.offsetWidth), 0, 1);
    gsap.set(historyViewport, { autoAlpha: 1 });
    gsap.set(historyTrack, { x: trackX });
    const wireStart = history.clientWidth * .062;
    const wheelCenter = historyWheelCursor.offsetLeft + cursorX + historyWheelCursor.offsetWidth / 2;
    historyWheelCursor.style.setProperty('--wire-length', `${Math.max(0, wheelCenter - wireStart)}px`);
    gsap.set(historyWheelCursor, { x: cursorX, y: 0, autoAlpha: 1 });
    gsap.set(historyCopy, { x: contentX, y: 0, autoAlpha: 1 });
    const widths = historyLines.map(line => Math.max(1, line.offsetWidth));
    const total = widths.reduce((sum, width) => sum + width, 0);
    let previous = 0;
    historyLines.forEach((line, index) => {
      line.style.setProperty('--reveal-progress', `${clamp((reveal * total - previous) / widths[index], 0, 1) * 100}%`);
      previous += widths[index];
    });
    gsap.set(historyCn, { autoAlpha: .35 + reveal * .65, y: (1 - reveal) * 10 });
    historyEvents.forEach(item => gsap.set(item.querySelectorAll('b, span'), { autoAlpha: 1, y: 0 }));
    const progressIndex = Math.min(historyProgress.length - 1, Math.floor(historyMotion.progress * historyProgress.length));
    historyProgress.forEach((item, index) => item.classList.toggle('active', historyMotion.progress > 0 && index === progressIndex));
  }

  function startHistoryCursorIdle() {
    if (!desktop.matches) return;
    gsap.killTweensOf(historyCursor);
    gsap.fromTo(historyCursor, { x: -5 }, { x: 5, duration: .9, ease: 'sine.inOut', repeat: -1, yoyo: true });
  }

  function pulseHistoryCursor(direction: -1 | 1, delta = 80) {
    const wheelStep = Math.max(48, Math.min(Math.abs(delta) * .9, 144));
    const orbitStep = Math.max(6, Math.min(Math.abs(delta) * .14, 22));
    historyWheelRotation += direction * wheelStep;
    historyOrbitRotation += direction * orbitStep;
    gsap.to(historyWheel, { rotation: historyWheelRotation, duration: .42, ease: 'power2.out', overwrite: true });
    gsap.to(historyOrbitRing, { rotation: historyOrbitRotation, duration: .42, ease: 'power2.out', overwrite: true });
    if (historyCursorPulseActive) return;
    historyCursorPulseActive = true;
    gsap.killTweensOf(historyCursor);
    gsap.timeline({ onComplete: () => { historyCursorPulseActive = false; startHistoryCursorIdle(); } })
      .to(historyCursor, { x: direction * 18, duration: .18, ease: 'power2.out' })
      .to(historyCursor, { x: 0, duration: .3, ease: 'back.out(1.7)' });
  }

  function setHistory(progress: number, animate = true) {
    const next = clamp(progress, 0, 1);
    historyTarget = next;
    historyBoundary = 0;
    gsap.killTweensOf(historyMotion);
    if (!desktop.matches || !animate || Math.abs(historyMotion.progress - next) < .001) { renderHistory(next); return; }
    animating = true;
    gsap.to(historyMotion, { progress: next, duration: .72, ease: 'power3.inOut', overwrite: true, onUpdate: () => renderHistory(historyMotion.progress), onComplete: () => { animating = false; renderHistory(next); } });
  }

  function scrubHistory(delta: number) {
    const direction = Math.sign(delta) as -1 | 1;
    pulseHistoryCursor(direction, delta);
    const atBoundary = direction < 0
      ? historyTarget <= .001 && historyMotion.progress <= .012
      : historyTarget >= .999 && historyMotion.progress >= .988;
    if (atBoundary) {
      historyBoundary += Math.abs(delta);
      if (historyBoundary >= 140) { historyBoundary = 0; gsap.killTweensOf(historyMotion); goToPanel(panelIndex + direction); }
      return;
    }
    historyBoundary = 0;
    historyTarget = clamp(historyTarget + clamp(delta, -100, 100) / Math.max(4000, window.innerHeight * 4.4), 0, 1);
    gsap.to(historyMotion, { progress: historyTarget, duration: .3, ease: 'power2.out', overwrite: true, onUpdate: () => renderHistory(historyMotion.progress), onComplete: () => renderHistory(historyTarget) });
  }

  function setActive(index: number, animate = true) {
    panelIndex = clamp(index, 0, panels.length - 1);
    activePanel.value = panelIndex;
    header?.classList.toggle('is-wide', panelIndex > 0);
    panels.forEach((panel, index) => {
      panel.classList.toggle('is-active', index === panelIndex);
      panel.classList.toggle('is-before', index < panelIndex);
      panel.classList.toggle('is-after', index > panelIndex);
      if (panel === showcase || panel === history) return;
      const items = [...panel.children].filter(item => !item.matches('.hero-static-machine, .intro-machine-wrap'));
      gsap.killTweensOf(items);
      if (!animate || index < panelIndex) gsap.set(items, { autoAlpha: 1, y: 0 });
      else if (index > panelIndex) gsap.set(items, { autoAlpha: .55, y: 18 });
      else gsap.fromTo(items, { autoAlpha: .35, y: 22 }, { autoAlpha: 1, y: 0, duration: .72, stagger: .06, ease: 'power3.out', overwrite: true });
    });
  }

  function goToPanel(index: number, options: { reasonIndex?: number; historyProgress?: number } = {}) {
    if (!desktop.matches || animating) return;
    const next = clamp(index, 0, panels.length - 1);
    if (next === panelIndex) {
      if (options.reasonIndex != null) setReason(options.reasonIndex);
      if (options.historyProgress != null) setHistory(options.historyProgress);
      return;
    }
    const currentPanel = panels[panelIndex];
    const nextPanel = panels[next];
    const fromBelow = next < panelIndex;
    const morphDirection = currentPanel === hero && nextPanel === intro ? 'forward' : currentPanel === intro && nextPanel === hero ? 'backward' : null;
    if (nextPanel === intro) setIntroStage(fromBelow ? introItems.length : 0, fromBelow);
    if (nextPanel === hero) setIntroStage(0, false);
    if (nextPanel === showcase) setReason(options.reasonIndex ?? (fromBelow ? slides.length - 1 : 0), false);
    if (nextPanel === history) setHistory(options.historyProgress ?? (fromBelow ? 1 : 0), false);
    animating = true;
    const duration = morphDirection ? 1.35 : .92;
    if (morphDirection) { emit('heroEnded'); runMachineMorph(morphDirection, duration); }
    setActive(next);
    gsap.to(window, { duration, scrollTo: { y: nextPanel.offsetTop, autoKill: false }, ease: 'power3.inOut', overwrite: true, onUpdate: updateIndicator, onComplete: () => { animating = false; if (morphDirection === 'forward') setIntroStage(0, true); } });
  }
  jumpPanel = (index: number) => goToPanel(index);

  function moveForward() {
    revealIndicator();
    if (animating) return;
    if (panels[panelIndex] === intro && introStageIndex < introItems.length) { setIntroStage(introStageIndex + 1); return; }
    if (panels[panelIndex] === showcase && reasonIndex < slides.length - 1) { setReason(reasonIndex + 1); return; }
    if (panels[panelIndex] === history) {
      pulseHistoryCursor(1);
      if (historyTarget < .999) { setHistory(Math.min(1, historyTarget + .25)); return; }
    }
    goToPanel(panelIndex + 1);
  }

  function moveBackward() {
    revealIndicator();
    if (animating) return;
    if (panels[panelIndex] === intro && introStageIndex > 0) { setIntroStage(introStageIndex - 1); return; }
    if (panels[panelIndex] === showcase && reasonIndex > 0) { setReason(reasonIndex - 1); return; }
    if (panels[panelIndex] === history) {
      pulseHistoryCursor(-1);
      if (historyTarget > .001) { setHistory(Math.max(0, historyTarget - .25)); return; }
    }
    goToPanel(panelIndex - 1);
  }

  function handleGesture(instance: any) {
    revealIndicator();
    const delta = instance.deltaY;
    if (!Number.isFinite(delta) || !delta) return;
    if (animating) { gestureDistance = 0; return; }
    if (panels[panelIndex] === showcase) { scrubReasons(delta); return; }
    if (panels[panelIndex] === history) { scrubHistory(delta); return; }
    gestureDistance += delta;
    if (gestureDistance >= 58) { gestureDistance = 0; moveForward(); }
    else if (gestureDistance <= -58) { gestureDistance = 0; moveBackward(); }
  }

  function setupObserver() {
    observer?.kill();
    observer = null;
    document.body.classList.toggle('immersive-scroll-ready', desktop.matches);
    if (!desktop.matches) return;
    observer = Observer.create({ target: window, type: 'wheel,touch,pointer', tolerance: 4, preventDefault: true, allowClicks: true, onChangeY: handleGesture });
  }

  function onKeydown(event: KeyboardEvent) {
    if (!desktop.matches || animating || document.querySelector('dialog[open]')) return;
    if (['ArrowDown', 'ArrowRight', 'PageDown', ' '].includes(event.key)) { event.preventDefault(); moveForward(); }
    if (['ArrowUp', 'ArrowLeft', 'PageUp'].includes(event.key)) { event.preventDefault(); moveBackward(); }
  }

  function onResize() {
    if (desktop.matches) { renderReasons(reasonMotion.progress); renderHistory(historyMotion.progress); startHistoryCursorIdle(); }
    else {
      historyWheelRotation = 0;
      historyOrbitRotation = 0;
      historyWheelCursor.style.removeProperty('--wire-length');
      gsap.set([...slides, historyTrack, historyCopy, historyCursor, historyOrbitRing, historyWheelCursor, historyWheel], { clearProps: 'transform,opacity,visibility' });
      slides.forEach(slide => slide.removeAttribute('aria-hidden'));
      header?.classList.toggle('is-wide', window.scrollY >= hero.offsetHeight - 1);
    }
    updateIndicator();
    setupObserver();
  }

  function onAnchorClick(event: Event) {
    const link = event.currentTarget as HTMLAnchorElement;
    if (!desktop.matches) return;
    const target = root.querySelector<HTMLElement>(link.hash);
    const targetPanel = target?.closest<HTMLElement>('.lifecycle-panel');
    const index = targetPanel ? panels.indexOf(targetPanel) : -1;
    if (index < 0) return;
    event.preventDefault();
    goToPanel(index, target?.dataset.reasonSlide != null ? { reasonIndex: Number(target.dataset.reasonSlide) } : {});
  }

  const anchors = [...root.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')];
  anchors.forEach(link => link.addEventListener('click', onAnchorClick));
  window.addEventListener('keydown', onKeydown);
  window.addEventListener('resize', onResize);
  window.addEventListener('scroll', updateIndicator, { passive: true });
  setIntroStage(0, false);
  renderReasons(0);
  renderHistory(0);
  startHistoryCursorIdle();
  setActive(0, false);
  updateIndicator();
  setupObserver();

  cleanupMotion = () => {
    anchors.forEach(link => link.removeEventListener('click', onAnchorClick));
    window.removeEventListener('keydown', onKeydown);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('scroll', updateIndicator);
    window.clearTimeout(hideTimer);
    observer?.kill();
    gsap.killTweensOf([window, reasonMotion, historyMotion, historyCursor, historyOrbitRing, historyWheelCursor, historyWheel, morph, morphBg, morphImage]);
    document.body.classList.remove('immersive-scroll-ready');
    jumpPanel = () => {};
  };
});

onBeforeUnmount(() => cleanupMotion?.());

function jumpTo(index: number) {
  jumpPanel(index);
}
</script>

<template>
  <div class="machine-morph-overlay" aria-hidden="true">
    <div class="machine-morph-bg"></div>
    <img src="/assets/psd/hero-machine.png" alt="">
  </div>
  <nav class="immersive-indicator" :class="{ 'is-scrolling': indicatorVisible }" aria-label="页面段落导航">
    <span class="immersive-indicator__thumb" :style="{ transform: `translate3d(0, calc((100vh - 38px) * ${indicatorProgress}), 0)` }" aria-hidden="true"></span>
    <button v-for="(label, index) in labels" :key="label" type="button" :class="{ active: activePanel === index }" :style="{ top: `${index / labels.length * 100}%`, height: `${100 / labels.length}%` }" :aria-label="label" :aria-current="activePanel === index ? 'true' : undefined" @click="jumpTo(index)"></button>
  </nav>
</template>

<style scoped>
.machine-morph-overlay{position:fixed;z-index:75;top:0;left:0;display:none;width:1px;height:1px;overflow:hidden;background:#0b0b0c;pointer-events:none;will-change:top,left,width,height,border-radius,opacity;box-shadow:0 22px 45px rgb(0 0 0/18%)}
.machine-morph-bg{position:absolute;inset:0;background:#050506 url('/assets/psd/hero-stage.jpg') center/cover no-repeat;will-change:opacity}
.machine-morph-overlay img{position:absolute;z-index:1;top:0;left:0;width:1px;height:auto;max-width:none;object-fit:contain;will-change:top,left,width,opacity;filter:drop-shadow(0 22px 30px rgb(0 0 0/22%))}
.immersive-indicator{position:fixed;z-index:110;top:0;right:0;bottom:0;width:12px;opacity:.2;transition:opacity .32s ease}
.immersive-indicator::before{content:"";position:absolute;top:0;right:0;bottom:0;width:3px;background:rgb(5 13 9/78%)}
.immersive-indicator:hover,.immersive-indicator:focus-within,.immersive-indicator.is-scrolling{opacity:1}
.immersive-indicator__thumb{position:absolute;z-index:2;top:0;right:0;width:3px;height:38px;background:#e51b23;pointer-events:none;will-change:transform}
.immersive-indicator button{position:absolute;z-index:1;left:0;width:12px;padding:0;border:0;background:transparent;cursor:pointer}
.immersive-indicator button:focus-visible{outline:1px solid #e51b23;outline-offset:-2px}
@media(max-width:900px), (prefers-reduced-motion:reduce){.machine-morph-overlay,.immersive-indicator{display:none!important}}
</style>
