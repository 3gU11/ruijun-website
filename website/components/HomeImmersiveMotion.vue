<script setup lang="ts">
const labels = ['首页', '选择瑞钧', '三大理由', '产品中心', '发展历程', '联系瑞钧'];
const activePanel = ref(0);
const indicatorVisible = ref(false);
const indicatorProgress = ref(0);
const HERO_INTRO_LOCK_MS = 4000;
const HERO_HEADER_FULL_WIDTH_HOLD_MS = 420;
const HERO_FREEZE_HOLD_MS = 700;
const INTRO_FINAL_LOCK_MS = 1000;
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
  const heroVideo = root.querySelector<HTMLVideoElement>('.hero-video');
  const morphCover = root.querySelector<HTMLElement>('.machine-morph-cover')!;
  const morphStage = root.querySelector<HTMLElement>('.machine-morph-stage')!;
  const morphMachine = root.querySelector<HTMLImageElement>('.machine-model-morph')!;
  const intro = root.querySelector<HTMLElement>('.reason-intro')!;
  const introStage = root.querySelector<HTMLElement>('.intro-machine-wrap')!;
  const introMachine = introStage.querySelector<HTMLElement>('img')!;
  const introItems = [...intro.querySelectorAll<HTMLElement>('.reason-list li')];
  const showcase = root.querySelector<HTMLElement>('.reason-showcase')!;
  const reasonTrack = showcase.querySelector<HTMLElement>('.reason-horizontal-track')!;
  const slides = [...showcase.querySelectorAll<HTMLElement>('[data-reason-slide]')];
  const reasonTabLinks = [...showcase.querySelectorAll<HTMLAnchorElement>('.reason-tabs a')];
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
  let reasonMagnetDistance = 0;
  let reasonMagnetDirection = 0;
  let reasonMagnetLockedUntil = 0;
  let reasonMagnetArmed = false;
  let historyTarget = 0;
  let historyBoundary = 0;
  let historyWheelRotation = 0;
  let historyOrbitRotation = 0;
  let historyCursorPulseActive = false;
  let gestureDistance = 0;
  let gestureDirection = 0;
  let animating = false;
  let heroInputLocked = false;
  let heroFreezeHoldUntil = 0;
  let introFinalLockUntil = 0;
  let hideTimer = 0;
  let heroLockTimer = 0;
  let heroHeaderTimer = 0;
  let contactScrollReleased = false;
  let observer: any;

  const releaseToContactScroll = () => {
    observer?.kill();
    observer = null;
    contactScrollReleased = true;
    document.body.classList.remove('immersive-scroll-ready');
  };

  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));
  // NANFU uses Lenis 0.2.28 with duration 1.3 and this exponential ease.
  // Repeated wheel input moves reasonTarget while the rendered progress keeps
  // chasing it, so speed accumulates and then decays after input stops.
  const reasonInertiaEase = (progress: number) => Math.min(1, 1.001 - Math.pow(2, -10 * progress));
  const PANEL_STEP_DISTANCE = 58;
  const PANEL_BOUNDARY_DISTANCE = 180;
  const setHeaderWide = (wide: boolean) => {
    header?.classList.toggle('is-wide', wide);
    window.dispatchEvent(new CustomEvent('ruijun:header-wide', { detail: wide }));
  };

  const setHeroInputLocked = (locked: boolean) => {
    heroInputLocked = locked;
    header?.classList.toggle('is-hero-locked', locked);
    if (locked) indicatorVisible.value = false;
    if (observer) setupObserver();
  };

  const releaseHeroInputLock = () => {
    window.clearTimeout(heroLockTimer);
    if (!header) {
      setHeroInputLocked(false);
      return;
    }
    header.classList.add('is-hero-entered-wide');
    setHeroInputLocked(false);
    window.clearTimeout(heroHeaderTimer);
    heroHeaderTimer = window.setTimeout(() => header.classList.remove('is-hero-entered-wide'), HERO_HEADER_FULL_WIDTH_HOLD_MS);
  };

  const flushHeroInputLock = () => {
    if (!heroInputLocked) return;
    window.clearTimeout(heroLockTimer);
    releaseHeroInputLock();
  };

  const startHeroInputLock = () => {
    if (panels[panelIndex] !== hero) return;
    window.clearTimeout(heroLockTimer);
    setHeroInputLocked(true);
    heroLockTimer = window.setTimeout(releaseHeroInputLock, HERO_INTRO_LOCK_MS);
  };

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
    const previousIndex = introStageIndex;
    introStageIndex = clamp(index, 0, introItems.length);
    intro.classList.toggle('intro-heading-visible', showHeading);
    introItems.forEach((_, itemIndex) => intro.classList.remove(`intro-stage-${itemIndex + 1}`));
    if (introStageIndex) intro.classList.add(`intro-stage-${introStageIndex}`);
    if (!desktop.matches) return;

    introItems.forEach((item, itemIndex) => {
      const visible = itemIndex < introStageIndex;
      const entering = visible && itemIndex >= previousIndex;
      gsap.killTweensOf(item);
      if (!visible) {
        gsap.set(item, { autoAlpha: 0, y: 38, rotation: -8, transformOrigin: '100% 100%' });
      } else if (entering) {
        gsap.fromTo(item, { autoAlpha: 0, y: 38, rotation: -8, transformOrigin: '100% 100%' }, { autoAlpha: 1, y: 0, rotation: 0, duration: .96, ease: 'power3.out', overwrite: true });
      } else {
        gsap.set(item, { autoAlpha: 1, y: 0, rotation: 0, transformOrigin: '100% 100%' });
      }
    });
  }

  function machineRect(element: HTMLElement, relativeTo?: HTMLElement) {
    const rect = element.getBoundingClientRect();
    const parent = relativeTo?.getBoundingClientRect();
    return { left: rect.left - (parent?.left || 0), top: rect.top - (parent?.top || 0), width: rect.width, height: rect.height };
  }

  function runMachineMorph(direction: 'forward' | 'backward', duration: number) {
    const forward = direction === 'forward';
    const viewport = { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
    const introRect = introStage.getBoundingClientRect();
    const introMachineRect = introMachine.getBoundingClientRect();
    // The forward transition scrolls the intro panel into view at the same time
    // as the morph. Convert its document position to the final viewport space so
    // the black frame and machine remain in one coordinate system.
    const introScrollDelta = forward ? intro.offsetTop - window.scrollY : 0;
    const introBox = forward
      ? { left: introRect.left, top: introRect.top - introScrollDelta, width: introRect.width, height: introRect.height }
      : { left: introRect.left, top: introRect.top, width: introRect.width, height: introRect.height };
    const heroBox = { left: window.innerWidth * .1675, top: window.innerHeight * .336, width: window.innerWidth * .332, height: window.innerHeight * .44 };
    const introMachineBox = forward
      ? { left: introMachineRect.left, top: introMachineRect.top - introScrollDelta, width: introMachineRect.width, height: introMachineRect.height }
      : { left: introMachineRect.left, top: introMachineRect.top, width: introMachineRect.width, height: introMachineRect.height };
    const stageStart = forward ? viewport : introBox;
    const stageEnd = forward ? introBox : viewport;
    const imageStart = forward ? heroBox : introMachineBox;
    const imageEnd = forward ? introMachineBox : heroBox;

    if (forward) hero.classList.add('is-machine-morphing');
    introStage.classList.add('is-stage-morph-hidden');
    gsap.killTweensOf([morphCover, morphStage, morphMachine]);
    gsap.set(morphCover, { display: 'block', autoAlpha: 1 });
    gsap.set(morphStage, { display: 'block', autoAlpha: 1, ...stageStart, borderRadius: forward ? 0 : 24 });
    gsap.set(morphMachine, { display: 'block', ...imageStart, autoAlpha: 1 });
    gsap.timeline({
      defaults: { duration, ease: 'power3.inOut', overwrite: true },
      onComplete: () => {
        gsap.set([morphCover, morphStage, morphMachine], { display: 'none', autoAlpha: 0 });
        introStage.classList.remove('is-stage-morph-hidden');
        if (!forward) hero.classList.remove('is-machine-morphing');
      }
    })
      .to(morphStage, { ...stageEnd, borderRadius: forward ? 24 : 0 }, 0)
      .to(morphMachine, imageEnd, 0);
  }

  function renderReasons(progress: number) {
    const max = slides.length - 1;
    reasonMotion.progress = clamp(progress, 0, max);
    reasonIndex = Math.round(reasonMotion.progress);
    slides.forEach((slide, index) => {
      const incoming = index === 0 ? 1 : clamp(reasonMotion.progress - (index - 1), 0, 1);
      const outgoing = index < max ? clamp(reasonMotion.progress - index, 0, 1) : 0;
      // Keep every scene stacked at viewport size. Scroll continuously clips the
      // upper scene from right to left, revealing the next scene underneath.
      gsap.set(slide, {
        x: 0,
        xPercent: 0,
        zIndex: slides.length - index,
        clipPath: `inset(0 ${outgoing * 100}% 0 0)`
      });
      slide.setAttribute('aria-hidden', String(index !== reasonIndex));
      const media = slide.querySelector<HTMLElement>('.scene-photo, .performance-machine');
      const copy = slide.querySelector<HTMLElement>('.performance-content, .photo-copy');
      if (media && index > 0) gsap.set(media, { xPercent: (1 - incoming) * 3.5, scale: 1 + (1 - incoming) * .08, transformOrigin: '50% 50%' });
      if (copy) gsap.set(copy, { x: (1 - incoming) * 82 - outgoing * 32, y: (1 - incoming) * 10, opacity: .68 + incoming * .32 - outgoing * .1 });
    });
    reasonTabLinks.forEach((link, index) => {
      link.classList.toggle('active', index === reasonIndex);
      if (index === reasonIndex) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
    reasonProgress.forEach((item, index) => item.classList.toggle('active', index === reasonIndex));
  }

  function syncMobileReasonTabs() {
    if (desktop.matches) return;
    const index = clamp(Math.round(reasonTrack.scrollLeft / Math.max(1, reasonTrack.clientWidth)), 0, slides.length - 1);
    reasonTabLinks.forEach((link, tabIndex) => {
      link.classList.toggle('active', tabIndex === index);
      if (tabIndex === index) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
  }

  function setReason(index: number, animate = true) {
    const next = clamp(index, 0, slides.length - 1);
    reasonTarget = next;
    reasonBoundary = 0;
    reasonMagnetDistance = 0;
    reasonMagnetDirection = 0;
    reasonMagnetLockedUntil = 0;
    reasonMagnetArmed = false;
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
      if (reasonBoundary >= PANEL_BOUNDARY_DISTANCE) {
        reasonBoundary = 0;
        gsap.killTweensOf(reasonMotion);
        goToPanel(panelIndex + direction);
      }
      return;
    }
    reasonBoundary = 0;
    let appliedDelta = delta;
    const currentStop = Math.round(reasonTarget);
    const atMagneticStop = Math.abs(reasonTarget - currentStop) <= .001;
    const canContinue = direction > 0 ? currentStop < max : currentStop > 0;

    // A complete scene resists the next gesture briefly. This produces the
    // boundary weight of NANFU's scrubbed scroll without snapping on wheel stop.
    if (atMagneticStop && canContinue) {
      if (reasonMagnetDirection !== direction) {
        reasonMagnetDirection = direction;
        reasonMagnetDistance = 0;
        reasonMagnetLockedUntil = 0;
        reasonMagnetArmed = false;
      }
      if (performance.now() < reasonMagnetLockedUntil) return;
      if (reasonMagnetArmed) {
        reasonMagnetArmed = false;
      } else {
        reasonMagnetDistance += Math.abs(delta);
        if (reasonMagnetDistance < 88) return;
        // Edge can split one physical wheel notch into several Observer updates.
        // Hold the complete scene long enough to consume that whole input burst.
        reasonMagnetDistance = 0;
        reasonMagnetArmed = true;
        reasonMagnetLockedUntil = performance.now() + 220;
        return;
      }
    } else {
      reasonMagnetDistance = 0;
      reasonMagnetDirection = direction;
      reasonMagnetLockedUntil = 0;
      reasonMagnetArmed = false;
    }

    const previousTarget = reasonTarget;
    reasonTarget = clamp(reasonTarget + appliedDelta / Math.max(760, window.innerHeight * .95), 0, max);
    const nearestStop = Math.round(reasonTarget);
    const approachingStop = direction > 0 ? nearestStop > previousTarget : nearestStop < previousTarget;
    const magnetized = approachingStop && Math.abs(reasonTarget - nearestStop) <= .055;
    if (magnetized) {
      reasonTarget = nearestStop;
      reasonMagnetDistance = 0;
      reasonMagnetLockedUntil = 0;
      reasonMagnetArmed = false;
    }

    gsap.to(reasonMotion, {
      progress: reasonTarget,
      duration: magnetized ? .55 : 1.3,
      ease: reasonInertiaEase,
      overwrite: true,
      onUpdate: () => renderReasons(reasonMotion.progress),
      onComplete: () => renderReasons(reasonTarget)
    });
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
      if (historyBoundary >= PANEL_BOUNDARY_DISTANCE) { historyBoundary = 0; gsap.killTweensOf(historyMotion); goToPanel(panelIndex + direction); }
      return;
    }
    historyBoundary = 0;
    historyTarget = clamp(historyTarget + clamp(delta, -100, 100) / Math.max(4000, window.innerHeight * 4.4), 0, 1);
    gsap.to(historyMotion, { progress: historyTarget, duration: .3, ease: 'power2.out', overwrite: true, onUpdate: () => renderHistory(historyMotion.progress), onComplete: () => renderHistory(historyTarget) });
  }

  function setActive(index: number, animate = true) {
    panelIndex = clamp(index, 0, panels.length - 1);
    gestureDistance = 0;
    gestureDirection = 0;
    activePanel.value = panelIndex;
    setHeaderWide(panelIndex > 0);
    panels.forEach((panel, index) => {
      panel.classList.toggle('is-active', index === panelIndex);
      panel.classList.toggle('is-before', index < panelIndex);
      panel.classList.toggle('is-after', index > panelIndex);
      if (panel === showcase || panel === history) return;
      const items = [...panel.children].filter(item => !item.matches('.hero-video, .intro-machine-wrap'));
      gsap.killTweensOf(items);
      if (!animate || index < panelIndex) gsap.set(items, { autoAlpha: 1, y: 0 });
      else if (index > panelIndex) gsap.set(items, { autoAlpha: .55, y: 18 });
      else gsap.fromTo(items, { autoAlpha: .35, y: 22 }, { autoAlpha: 1, y: 0, duration: .72, stagger: .06, ease: 'power3.out', overwrite: true });
    });
  }

  function goToPanel(index: number, options: { reasonIndex?: number; historyProgress?: number; immediate?: boolean } = {}) {
    if (!desktop.matches || animating) return;
    flushHeroInputLock();
    const next = clamp(index, 0, panels.length - 1);
    if (next === panelIndex) {
      if (options.reasonIndex != null) setReason(options.reasonIndex, !options.immediate);
      if (options.historyProgress != null) setHistory(options.historyProgress, !options.immediate);
      if (options.immediate) {
        window.scrollTo({ left: 0, top: panels[next].offsetTop, behavior: 'auto' });
        updateIndicator();
      }
      return;
    }
    const currentPanel = panels[panelIndex];
    const nextPanel = panels[next];
    // Leaving or returning to the opening panel always resolves the video to its approved still.
    if (currentPanel === hero || nextPanel === hero) window.dispatchEvent(new Event('ruijun:hero-freeze'));
    const fromBelow = next < panelIndex;
    const morphDirection = currentPanel === hero && nextPanel === intro ? 'forward' : currentPanel === intro && nextPanel === hero ? 'backward' : null;
    if (nextPanel === intro) setIntroStage(fromBelow ? introItems.length : 0, fromBelow);
    if (nextPanel === hero) setIntroStage(0, false);
    if (nextPanel === showcase) setReason(options.reasonIndex ?? (fromBelow ? slides.length - 1 : 0), false);
    if (nextPanel === history) setHistory(options.historyProgress ?? (fromBelow ? 1 : 0), false);
    if (options.immediate) {
      gsap.killTweensOf([window, reasonMotion, historyMotion, morphCover, morphStage, morphMachine]);
      animating = false;
      setActive(next, false);
      window.scrollTo({ left: 0, top: nextPanel.offsetTop, behavior: 'auto' });
      if (nextPanel === intro) setIntroStage(introItems.length, true);
      if (nextPanel.id === 'contact') releaseToContactScroll();
      updateIndicator();
      return;
    }
    animating = true;
    const duration = morphDirection ? 1.35 : .92;
    if (morphDirection) {
      // The forward handoff already starts in the current viewport. Resetting
      // scroll here made a partial wheel gesture visibly jump backward before
      // the morph began. The reverse handoff still needs the intro panel fixed
      // in view while it morphs back into the hero.
      if (morphDirection === 'backward') window.scrollTo({ left: 0, top: currentPanel.offsetTop, behavior: 'auto' });
      runMachineMorph(morphDirection, duration);
    }
    setActive(next);
    if (morphDirection === 'forward') {
      gsap.delayedCall(duration, () => {
        window.scrollTo({ left: 0, top: nextPanel.offsetTop, behavior: 'auto' });
        animating = false;
        setIntroStage(0, true);
        updateIndicator();
      });
      return;
    }
    gsap.to(window, { duration, scrollTo: { y: nextPanel.offsetTop, autoKill: false }, ease: 'power3.inOut', overwrite: true, onUpdate: updateIndicator, onComplete: () => { animating = false; if (nextPanel === intro && !fromBelow) setIntroStage(0, true); if (nextPanel.id === 'contact') releaseToContactScroll(); } });
  }
  jumpPanel = (index: number) => goToPanel(index);

  function jumpToPreviewTarget(event?: Event) {
    const eventSelector = (event as CustomEvent<{ selector?: string }> | undefined)?.detail?.selector;
    const selector = String(eventSelector || document.documentElement.dataset.cmsPreviewTarget || '').trim();
    if (!selector) return;
    let target: HTMLElement | null = null;
    try {
      const previewTargets = [...root.querySelectorAll<HTMLElement>(selector)];
      // A reason field is rendered both in the intro list and in the horizontal
      // showcase. Prefer the showcase candidate so preview navigation selects the
      // visible slide instead of the first matching intro copy.
      target = previewTargets.find(candidate => candidate.closest<HTMLElement>('#reason-showcase [data-reason-slide]')) || previewTargets[0] || null;
    } catch { return; }
    const targetPanel = target?.closest<HTMLElement>('.lifecycle-panel');
    const index = targetPanel ? panels.indexOf(targetPanel) : -1;
    if (index < 0) return;
    animating = false;
    heroFreezeHoldUntil = 0;
    flushHeroInputLock();
    window.dispatchEvent(new Event('ruijun:hero-freeze'));
    const reasonSlide = target?.dataset.reasonSlide || target?.closest<HTMLElement>('[data-reason-slide]')?.dataset.reasonSlide;
    goToPanel(index, {
      immediate: true,
      ...(reasonSlide != null ? { reasonIndex: Number(reasonSlide) } : {}),
      ...(targetPanel === history ? { historyProgress: .35 } : {})
    });
  }

  function moveForward() {
    revealIndicator();
    if (animating) return;
    if (panels[panelIndex] === intro) {
      if (introStageIndex >= introItems.length && performance.now() < introFinalLockUntil) {
        gestureDistance = 0;
        gestureDirection = 0;
        return;
      }
      if (introStageIndex < introItems.length) {
        const nextStage = introStageIndex + 1;
        setIntroStage(nextStage);
        if (nextStage === introItems.length) {
          // The final intro copy must remain readable before the next panel
          // can consume any further wheel input.
          introFinalLockUntil = performance.now() + INTRO_FINAL_LOCK_MS;
        }
        return;
      }
    }
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
    introFinalLockUntil = 0;
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
    // The first wheel gesture interrupts playback and is consumed by the
    // approved still frame. A short hold prevents momentum from skipping it.
    if (panels[panelIndex] === hero && heroInputLocked) {
      window.dispatchEvent(new Event('ruijun:hero-freeze'));
      heroFreezeHoldUntil = performance.now() + HERO_FREEZE_HOLD_MS;
      flushHeroInputLock();
      gestureDistance = 0;
      gestureDirection = 0;
      return;
    }
    if (panels[panelIndex] === hero && performance.now() < heroFreezeHoldUntil) {
      gestureDistance = 0;
      gestureDirection = 0;
      return;
    }
    if (animating) { gestureDistance = 0; gestureDirection = 0; return; }
    if (panels[panelIndex] === showcase) { scrubReasons(delta); return; }
    if (panels[panelIndex] === history) { scrubHistory(delta); return; }
    const direction = Math.sign(delta);
    const onIntroStep = panels[panelIndex] === intro && (direction > 0 ? introStageIndex < introItems.length : introStageIndex > 0);
    const requiredDistance = onIntroStep ? PANEL_STEP_DISTANCE : PANEL_BOUNDARY_DISTANCE;
    if (gestureDirection !== direction) {
      gestureDistance = 0;
      gestureDirection = direction;
    }
    gestureDistance += Math.abs(delta);
    if (gestureDistance < requiredDistance) return;
    gestureDistance = 0;
    if (direction > 0) moveForward();
    else moveBackward();
  }

  function setupObserver() {
    observer?.kill();
    observer = null;
    document.body.classList.toggle('immersive-scroll-ready', desktop.matches);
    if (!desktop.matches) return;
    observer = Observer.create({
      target: window,
      type: 'wheel,touch,pointer',
      tolerance: 4,
      preventDefault: true,
      allowClicks: true,
      onChangeY: handleGesture
    });
  }

  function onKeydown(event: KeyboardEvent) {
    if (!desktop.matches || document.querySelector('dialog[open]')) return;
    const navigationKeys = ['ArrowDown', 'ArrowRight', 'PageDown', ' ', 'ArrowUp', 'ArrowLeft', 'PageUp'];
    if (heroInputLocked && navigationKeys.includes(event.key)) { event.preventDefault(); return; }
    if (animating) return;
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
      setHeaderWide(window.scrollY >= hero.offsetHeight - 1);
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
  reasonTrack.addEventListener('scroll', syncMobileReasonTabs, { passive: true });
  window.addEventListener('keydown', onKeydown);
  window.addEventListener('resize', onResize);
  window.addEventListener('ruijun:cms-preview-target', jumpToPreviewTarget);
  function onScroll() {
    updateIndicator();
    // The final contact panel permits ordinary scrolling through its footer.
    // Reclaim the observer once the user scrolls back into the previous panel.
    const contactIndex = panels.length - 1;
    const contactTop = panels[contactIndex].offsetTop;
    if (contactScrollReleased && window.scrollY < contactTop - 1) {
      contactScrollReleased = false;
      window.scrollTo({ left: 0, top: contactTop, behavior: 'auto' });
      setupObserver();
      setActive(contactIndex, false);
      requestAnimationFrame(() => goToPanel(contactIndex - 1, { historyProgress: 1 }));
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  setIntroStage(0, false);
  renderReasons(0);
  renderHistory(0);
  startHistoryCursorIdle();
  setActive(0, false);
  updateIndicator();
  setupObserver();
  heroVideo?.addEventListener('playing', startHeroInputLock);
  if (heroVideo && !heroVideo.paused && !heroVideo.ended) startHeroInputLock();
  requestAnimationFrame(() => jumpToPreviewTarget());

  cleanupMotion = () => {
    anchors.forEach(link => link.removeEventListener('click', onAnchorClick));
    reasonTrack.removeEventListener('scroll', syncMobileReasonTabs);
    window.removeEventListener('keydown', onKeydown);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('ruijun:cms-preview-target', jumpToPreviewTarget);
    window.clearTimeout(hideTimer);
    window.clearTimeout(heroLockTimer);
    window.clearTimeout(heroHeaderTimer);
    heroVideo?.removeEventListener('playing', startHeroInputLock);
    header?.classList.remove('is-hero-entered-wide');
    setHeroInputLocked(false);
    observer?.kill();
    contactScrollReleased = false;
    gsap.killTweensOf([window, reasonMotion, historyMotion, historyCursor, historyOrbitRing, historyWheelCursor, historyWheel, morphCover, morphStage, morphMachine]);
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
  <div class="machine-morph-cover" aria-hidden="true"></div>
  <div class="machine-morph-stage" aria-hidden="true"></div>
  <img class="machine-model-morph" src="/assets/psd/hero-machine.png" alt="" aria-hidden="true">
  <nav class="immersive-indicator" :class="{ 'is-scrolling': indicatorVisible }" aria-label="页面段落导航">
    <span class="immersive-indicator__thumb" :style="{ transform: `translate3d(0, calc((100vh - 38px) * ${indicatorProgress}), 0)` }" aria-hidden="true"></span>
    <button v-for="(label, index) in labels" :key="label" type="button" :class="{ active: activePanel === index }" :style="{ top: `${index / labels.length * 100}%`, height: `${100 / labels.length}%` }" :aria-label="label" :aria-current="activePanel === index ? 'true' : undefined" @click="jumpTo(index)"></button>
  </nav>
</template>

<style scoped>
.machine-morph-cover{position:fixed;z-index:74;inset:0;display:none;background:#f3f3f1;pointer-events:none}
.machine-morph-stage{position:fixed;z-index:75;top:0;left:0;display:none;width:1px;height:1px;background:#050506;pointer-events:none;will-change:top,left,width,height,border-radius,opacity}
.machine-model-morph{position:fixed;z-index:76;top:0;left:0;display:none;width:1px;height:auto;max-width:none;object-fit:contain;pointer-events:none;will-change:top,left,width,opacity;filter:drop-shadow(0 22px 30px rgb(0 0 0/22%))}
.immersive-indicator{position:fixed;z-index:110;top:0;right:0;bottom:0;width:12px;opacity:.2;transition:opacity .32s ease}
.immersive-indicator::before{content:"";position:absolute;top:0;right:0;bottom:0;width:3px;background:rgb(5 13 9/78%)}
.immersive-indicator:hover,.immersive-indicator:focus-within,.immersive-indicator.is-scrolling{opacity:1}
.immersive-indicator__thumb{position:absolute;z-index:2;top:0;right:0;width:3px;height:38px;background:#e51b23;pointer-events:none;will-change:transform}
.immersive-indicator button{position:absolute;z-index:1;left:0;width:12px;padding:0;border:0;background:transparent;cursor:pointer}
.immersive-indicator button:focus-visible{outline:1px solid #e51b23;outline-offset:-2px}
@media(max-width:900px), (prefers-reduced-motion:reduce){.machine-morph-cover,.machine-morph-stage,.machine-model-morph,.immersive-indicator{display:none!important}}
</style>
