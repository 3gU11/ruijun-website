const panels = [
  ...document.querySelectorAll('.about-page main > .about-story > section, .about-page main > section'),
  document.querySelector('.about-footer')
].filter(Boolean);
const historyPanel = document.querySelector('.about-history');
const historyPanelIndex = panels.indexOf(historyPanel);
const overviewPanel = document.querySelector('.about-overview');
const overviewPanelIndex = panels.indexOf(overviewPanel);
const historyViewport = document.querySelector('#about-history-viewport');
const historyTrack = document.querySelector('#about-history-track');
const historyCopy = historyPanel.querySelector('.history-copy');
const historyCopyLines = [...historyCopy.querySelectorAll('.history-en span')];
const historyCopyCn = historyCopy.querySelector('.history-cn');
const historyCursor = historyPanel.querySelector('.history-cursor');
const historyEvents = [...historyPanel.querySelectorAll('.history-event')];
const historyProgress = [...historyPanel.querySelectorAll('.history-progress i')];
const storyBackdrop = document.querySelector('.about-story-backdrop');
const heroVisual = document.querySelector('.about-hero-visual');
const heroMachine = document.querySelector('.about-hero-machine');
const heroCopy = document.querySelector('.about-hero-copy');
const factorySlider = document.querySelector('.factory-slider');
const factorySlides = [...document.querySelectorAll('.factory-slide')];
const factoryDots = [...document.querySelectorAll('.factory-dots button')];
const factoryPrevious = document.querySelector('.factory-arrow-prev');
const factoryNext = document.querySelector('.factory-arrow-next');
const aboutSiteHeader = document.querySelector('.site-header');
const desktopImmersive = window.matchMedia('(min-width: 901px)');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const revealItems = [...document.querySelectorAll('.reveal')];

let activePanelIndex = 0;
let isAnimating = false;
let gestureDistance = 0;
let gestureObserver = null;
let indicatorHideTimer = 0;
let historyTargetProgress = 0;
let historyBoundaryDistance = 0;
let historyExitArmed = false;
let historyGestureStopped = true;
let immersiveDampingStartedAt = -Infinity;
let historyEntryAwaitingStop = false;
let historyEntryInputStopped = false;
let historyEntryAligning = false;
let historyEntryStopTimer = 0;
let lastScrollY = window.scrollY;
let factorySlideIndex = 0;
let factorySlideTimer = 0;
let factoryTransitioning = false;
let factoryVisible = false;
const FACTORY_HOLD_MS = 2600;
const HISTORY_ENTRY_CAPTURE_PX = 140;
const HISTORY_ENTRY_STOP_DELAY_MS = 300;
const historyMotion = { progress: 0 };
const heroMotion = { progress: 0 };

const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('is-visible');
    revealObserver.unobserve(entry.target);
  });
}, { threshold: .12, rootMargin: '0px 0px -8% 0px' });

revealItems.forEach(item => revealObserver.observe(item));

const indicator = document.createElement('nav');
indicator.className = 'immersive-indicator';
indicator.setAttribute('aria-label', '关于我们页面段落导航');
indicator.innerHTML = `<span class="immersive-indicator__thumb" aria-hidden="true"></span>${panels.map((panel, index) => `<button type="button" aria-label="前往第 ${index + 1} 屏" data-panel-index="${index}" style="top:${index / panels.length * 100}%;height:${100 / panels.length}%"></button>`).join('')}`;
document.body.append(indicator);
const indicatorThumb = indicator.querySelector('.immersive-indicator__thumb');

function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max));
}

function startImmersiveDamping() {
  immersiveDampingStartedAt = performance.now();
}

function immersiveDampingFactor() {
  const elapsed = performance.now() - immersiveDampingStartedAt;
  return clamp(.16 + elapsed / 600 * .84, .16, 1);
}

function finishHistoryEntryIfReady() {
  if (!historyEntryAwaitingStop || historyEntryAligning || !historyEntryInputStopped) return;
  historyEntryAwaitingStop = false;
  historyEntryInputStopped = false;
  historyGestureStopped = true;
  startImmersiveDamping();
}

function scheduleHistoryEntryStop() {
  window.clearTimeout(historyEntryStopTimer);
  historyEntryStopTimer = window.setTimeout(() => {
    historyEntryInputStopped = true;
    finishHistoryEntryIfReady();
  }, HISTORY_ENTRY_STOP_DELAY_MS);
}

function resetHistoryEntryGate() {
  window.clearTimeout(historyEntryStopTimer);
  historyEntryAwaitingStop = false;
  historyEntryInputStopped = false;
  historyEntryAligning = false;
}

function updateFactorySlideState() {
  factorySlides.forEach((slide, index) => {
    const active = index === factorySlideIndex;
    slide.classList.toggle('is-active', active);
    slide.setAttribute('aria-hidden', String(!active));
  });
  factoryDots.forEach((dot, index) => {
    const active = index === factorySlideIndex;
    dot.classList.toggle('is-active', active);
    dot.setAttribute('aria-selected', String(active));
  });
}

function scheduleFactorySlide() {
  window.clearTimeout(factorySlideTimer);
  if (!factoryVisible || reduceMotion || factorySlides.length < 2) return;
  factorySlideTimer = window.setTimeout(() => showFactorySlide(factorySlideIndex + 1, 1), FACTORY_HOLD_MS);
}

function showFactorySlide(requestedIndex, direction = 1) {
  if (!factorySlides.length || factoryTransitioning) return;
  const nextIndex = (requestedIndex + factorySlides.length) % factorySlides.length;
  if (nextIndex === factorySlideIndex) {
    scheduleFactorySlide();
    return;
  }

  window.clearTimeout(factorySlideTimer);
  const outgoing = factorySlides[factorySlideIndex];
  const incoming = factorySlides[nextIndex];
  factorySlideIndex = nextIndex;

  if (!window.gsap || reduceMotion) {
    updateFactorySlideState();
    scheduleFactorySlide();
    return;
  }

  factoryTransitioning = true;
  factorySlider.classList.add('is-transitioning');
  incoming.classList.add('is-revealing');
  gsap.killTweensOf([outgoing, incoming]);
  gsap.set(incoming, {
    autoAlpha: 1,
    visibility: 'visible',
    zIndex: 2,
    scale: 1.035,
    webkitMaskPosition: '100% 0%',
    maskPosition: '100% 0%'
  });
  gsap.set(outgoing, { zIndex: 1 });

  gsap.timeline({
    onComplete: () => {
      updateFactorySlideState();
      gsap.set(outgoing, { autoAlpha: 0, visibility: 'hidden', zIndex: 0, clearProps: 'transform' });
      gsap.set(incoming, {
        autoAlpha: 1,
        visibility: 'visible',
        zIndex: 1,
        clearProps: 'transform,maskPosition,webkitMaskPosition'
      });
      incoming.classList.remove('is-revealing');
      factorySlider.classList.remove('is-transitioning');
      factoryTransitioning = false;
      scheduleFactorySlide();
    }
  })
    .to(incoming, {
      webkitMaskPosition: '0% 0%',
      maskPosition: '0% 0%',
      duration: 1.68,
      ease: 'power1.inOut'
    }, 0)
    .to(incoming, { scale: 1, duration: 1.72, ease: 'power2.out' }, 0)
    .to(outgoing, { scale: 1.008, duration: 1.68, ease: 'sine.inOut' }, 0);
}

function renderHeroProgress(progress) {
  heroMotion.progress = clamp(progress, 0, 1);
  if (!window.gsap || reduceMotion) return;
  const visual = desktopImmersive.matches ? storyBackdrop : heroVisual;
  const travel = heroMotion.progress;
  gsap.set(visual, {
    y: -44 * travel,
    scale: 1 + .045 * travel,
    rotation: -.3 * travel,
    force3D: true
  });
  gsap.set(heroCopy, {
    y: -28 * travel,
    autoAlpha: 1 - .16 * travel,
    force3D: true
  });
}

function setHeroProgress(progress, { animate = true } = {}) {
  const nextProgress = clamp(progress, 0, 1);
  if (!window.gsap || reduceMotion) return;
  gsap.killTweensOf(heroMotion);
  if (!animate || Math.abs(heroMotion.progress - nextProgress) < .001) {
    renderHeroProgress(nextProgress);
    return;
  }
  gsap.to(heroMotion, {
    progress: nextProgress,
    duration: .88,
    ease: 'power2.out',
    overwrite: true,
    onUpdate: () => renderHeroProgress(heroMotion.progress),
    onComplete: () => renderHeroProgress(nextProgress)
  });
}

function revealIndicator() {
  if (!desktopImmersive.matches) return;
  indicator.classList.add('is-scrolling');
  window.clearTimeout(indicatorHideTimer);
  indicatorHideTimer = window.setTimeout(() => indicator.classList.remove('is-scrolling'), 520);
}

function updateIndicator() {
  const travel = Math.max(0, window.innerHeight - indicatorThumb.offsetHeight);
  const progress = panels.length > 1 ? activePanelIndex / (panels.length - 1) : 0;
  indicatorThumb.style.transform = `translate3d(0, ${progress * travel}px, 0)`;
  indicator.querySelectorAll('button').forEach((button, index) => {
    const active = index === activePanelIndex;
    button.classList.toggle('active', active);
    if (active) button.setAttribute('aria-current', 'true');
    else button.removeAttribute('aria-current');
  });
}

function historyTrackX(progress) {
  const distance = Math.max(0, historyTrack.scrollWidth - historyViewport.clientWidth);
  return -(distance * progress);
}

function renderHistoryProgress(progress) {
  historyMotion.progress = clamp(progress, 0, 1);
  const timelineProgress = historyMotion.progress;
  const trackProgress = timelineProgress;
  const trackStartX = historyPanel.clientWidth * .88;
  const trackEndX = historyTrackX(1);
  const trackX = trackStartX + (trackEndX - trackStartX) * trackProgress;
  const contentX = trackX - trackStartX;
  const cursorStart = historyCursor.offsetLeft;
  const cursorExitLeft = historyPanel.clientWidth + historyCursor.offsetWidth + 30;
  const cursorTravel = Math.max(0, cursorExitLeft - cursorStart);
  const cursorX = cursorTravel * timelineProgress;
  const cursorTipX = cursorStart + cursorX + historyCursor.offsetWidth + 25;
  const titleLeft = historyCopy.offsetLeft + contentX;
  const titleRevealProgress = clamp((cursorTipX - titleLeft) / historyCopy.offsetWidth, 0, 1);

  gsap.set(historyViewport, { autoAlpha: 1 });
  gsap.set(historyTrack, { x: trackX });
  gsap.set(historyCursor, { x: cursorX, y: 0, autoAlpha: 1 });
  gsap.set(historyCopy, { autoAlpha: 1, x: contentX, y: 0 });
  const lineWidths = historyCopyLines.map(line => Math.max(1, line.offsetWidth));
  const totalLineWidth = lineWidths.reduce((total, lineWidth) => total + lineWidth, 0);
  const revealedLineWidth = titleRevealProgress * totalLineWidth;
  let precedingLineWidth = 0;
  historyCopyLines.forEach((line, lineIndex) => {
    const lineProgress = clamp((revealedLineWidth - precedingLineWidth) / lineWidths[lineIndex], 0, 1);
    line.style.setProperty('--reveal-progress', `${lineProgress * 100}%`);
    precedingLineWidth += lineWidths[lineIndex];
  });
  gsap.set(historyCopyCn, {
    autoAlpha: .35 + titleRevealProgress * .65,
    y: (1 - titleRevealProgress) * 10
  });
  historyEvents.forEach(event => {
    event.removeAttribute('aria-hidden');
    gsap.set(event.querySelectorAll('b, span'), { autoAlpha: 1, y: 0 });
  });

  const progressIndex = Math.min(historyProgress.length - 1, Math.floor(trackProgress * historyProgress.length));
  historyProgress.forEach((item, itemIndex) => item.classList.toggle('active', trackProgress > 0 && itemIndex === progressIndex));
}

function setHistoryProgress(progress, { animate = true } = {}) {
  const nextProgress = clamp(progress, 0, 1);
  historyTargetProgress = nextProgress;
  historyBoundaryDistance = 0;
  if (!window.gsap || !desktopImmersive.matches) {
    historyEvents.forEach(event => event.removeAttribute('aria-hidden'));
    return;
  }

  gsap.killTweensOf(historyMotion);
  if (!animate || Math.abs(historyMotion.progress - nextProgress) < .001) {
    renderHistoryProgress(nextProgress);
    return;
  }

  isAnimating = true;
  gsap.to(historyMotion, {
    progress: nextProgress,
    duration: .72,
    ease: 'power3.inOut',
    overwrite: true,
    onUpdate: () => renderHistoryProgress(historyMotion.progress),
    onComplete: () => {
      isAnimating = false;
      renderHistoryProgress(nextProgress);
    }
  });
}

function setActivePanel(index, { animate = true } = {}) {
  activePanelIndex = clamp(index, 0, panels.length - 1);
  if (desktopImmersive.matches) aboutSiteHeader?.classList.toggle('is-wide', activePanelIndex > 0);
  panels.forEach((panel, panelIndex) => {
    panel.classList.toggle('is-active', panelIndex === activePanelIndex);
    panel.classList.toggle('is-before', panelIndex < activePanelIndex);
    panel.classList.toggle('is-after', panelIndex > activePanelIndex);
  });

  const activePanel = panels[activePanelIndex];
  activePanel?.querySelectorAll('.reveal:not(.story-reveal)').forEach(item => item.classList.add('is-visible'));
  if (animate && window.gsap && activePanel && activePanel !== historyPanel) {
    const content = [...activePanel.children].filter(item => !item.matches('.about-history-sticky, .about-hero-visual, .about-hero-copy'));
    if (content.length) {
      gsap.fromTo(content, { autoAlpha: .55, y: 18 }, {
        autoAlpha: 1,
        y: 0,
        duration: .58,
        stagger: .04,
        ease: 'power3.out',
        overwrite: true
      });
    }
    const heading = activePanel.querySelector('.about-inner > h2');
    const visualItems = [...activePanel.querySelectorAll('.about-photo-row img, .about-document-row img, .about-partners img')];
    if (heading) {
      gsap.fromTo(heading, { autoAlpha: .25, x: -54 }, {
        autoAlpha: 1,
        x: 0,
        duration: .66,
        ease: 'power3.out',
        overwrite: true
      });
    }
    if (visualItems.length) {
      gsap.fromTo(visualItems, { autoAlpha: .35, y: 42 }, {
        autoAlpha: 1,
        y: 0,
        duration: .68,
        stagger: .045,
        ease: 'power3.out',
        overwrite: true
      });
    }
  }
  updateIndicator();
}

function goToPanel(index) {
  if (!desktopImmersive.matches || reduceMotion || isAnimating || !window.gsap) return;
  const nextIndex = clamp(index, 0, panels.length - 1);
  if (nextIndex === activePanelIndex) return;

  const enteringFromBelow = nextIndex < activePanelIndex;
  if (panels[nextIndex] === historyPanel) {
    historyExitArmed = false;
    historyGestureStopped = false;
    setHistoryProgress(enteringFromBelow ? 1 : 0, { animate: false });
  }

  isAnimating = true;
  gestureDistance = 0;
  if (activePanelIndex === 0 || nextIndex === 0) {
    setHeroProgress(nextIndex === 0 ? 0 : 1);
  }
  setActivePanel(nextIndex);
  gsap.to(window, {
    duration: .72,
    scrollTo: { y: panels[nextIndex].offsetTop, autoKill: false },
    ease: 'power3.inOut',
    overwrite: true,
    onComplete: () => {
      isAnimating = false;
      window.scrollTo(0, panels[activePanelIndex].offsetTop);
      setupGestureObserver();
      if (panels[activePanelIndex] === historyPanel || panels[activePanelIndex] === overviewPanel) {
        startImmersiveDamping();
      }
    }
  });
}

function scrubHistoryProgress(deltaY) {
  const direction = Math.sign(deltaY);
  const atStart = historyTargetProgress <= .001 && historyMotion.progress <= .012;
  const atEnd = historyTargetProgress >= .999 && historyMotion.progress >= .988;

  if ((direction < 0 && atStart) || (direction > 0 && atEnd)) {
    if (direction > 0 && !historyExitArmed) {
      historyBoundaryDistance = 0;
      return;
    }
    const boundaryStep = direction > 0 ? 55 : 70;
    const boundaryThreshold = direction > 0 ? 110 : 140;
    historyBoundaryDistance += Math.min(Math.abs(deltaY), boundaryStep);
    if (historyBoundaryDistance >= boundaryThreshold) {
      historyBoundaryDistance = 0;
      gsap.killTweensOf(historyMotion);
      if (direction < 0) exitHistoryToPrelude();
      else goToPanel(activePanelIndex + direction);
    }
    return;
  }

  historyBoundaryDistance = 0;
  const pixelsForTimeline = Math.max(4000, window.innerHeight * 4.4);
  const boundedDelta = clamp(deltaY, -100, 100);
  const previousTarget = historyTargetProgress;
  historyTargetProgress = clamp(historyTargetProgress + boundedDelta / pixelsForTimeline, 0, 1);
  if (previousTarget < .999 && historyTargetProgress >= .999) {
    historyExitArmed = false;
  } else if (historyTargetProgress < .999) {
    historyExitArmed = false;
  }
  gsap.to(historyMotion, {
    progress: historyTargetProgress,
    duration: .3,
    ease: 'power2.out',
    overwrite: true,
    onUpdate: () => renderHistoryProgress(historyMotion.progress),
    onComplete: () => {
      renderHistoryProgress(historyTargetProgress);
      if (historyTargetProgress >= .999 && historyGestureStopped) historyExitArmed = true;
    }
  });
}

function exitHistoryToPrelude() {
  gestureObserver?.kill();
  gestureObserver = null;
  resetHistoryEntryGate();
  document.body.classList.remove('about-immersive-ready');
  isAnimating = true;
  historyBoundaryDistance = 0;
  const targetY = Math.max(0, historyPanel.offsetTop - window.innerHeight * .55);
  setActivePanel(overviewPanelIndex, { animate: false });
  gsap.to(window, {
    duration: .56,
    scrollTo: { y: targetY, autoKill: false },
    ease: 'power2.out',
    overwrite: true,
    onComplete: () => {
      isAnimating = false;
      syncPanelFromScroll();
      setupGestureObserver();
    }
  });
}

function moveForward() {
  revealIndicator();
  if (isAnimating) return;
  if (panels[activePanelIndex] === historyPanel && historyTargetProgress < .999) {
    setHistoryProgress(Math.min(1, historyTargetProgress + .25));
    return;
  }
  goToPanel(activePanelIndex + 1);
}

function moveBackward() {
  revealIndicator();
  if (isAnimating) return;
  if (panels[activePanelIndex] === historyPanel && historyTargetProgress > .001) {
    setHistoryProgress(Math.max(0, historyTargetProgress - .25));
    return;
  }
  goToPanel(activePanelIndex - 1);
}

function alignHistoryEntry() {
  if (!historyEntryAwaitingStop || historyEntryAligning || !window.gsap) return;
  historyEntryAligning = true;
  isAnimating = true;
  historyBoundaryDistance = 0;
  historyExitArmed = false;
  historyGestureStopped = false;
  setHistoryProgress(0, { animate: false });
  setActivePanel(historyPanelIndex, { animate: false });
  const distance = Math.abs(window.scrollY - historyPanel.offsetTop);
  gsap.to(window, {
    duration: clamp(.3 + distance / 2400, .3, .46),
    scrollTo: { y: historyPanel.offsetTop, autoKill: false },
    ease: 'power2.out',
    overwrite: true,
    onComplete: () => {
      window.scrollTo(0, historyPanel.offsetTop);
      historyEntryAligning = false;
      isAnimating = false;
      finishHistoryEntryIfReady();
    }
  });
}

function handleVerticalGesture(observer) {
  revealIndicator();
  const deltaY = observer.deltaY;
  if (!Number.isFinite(deltaY) || deltaY === 0) return;
  if (historyEntryAwaitingStop) {
    gestureDistance = 0;
    historyEntryInputStopped = false;
    scheduleHistoryEntryStop();
    return;
  }
  if (isAnimating) {
    gestureDistance = 0;
    return;
  }
  if (panels[activePanelIndex] === historyPanel) {
    gestureDistance = 0;
    historyGestureStopped = false;
    scrubHistoryProgress(deltaY * immersiveDampingFactor());
    return;
  }

  gestureDistance += deltaY;
  if (gestureDistance >= 38) {
    gestureDistance = 0;
    moveForward();
  } else if (gestureDistance <= -38) {
    gestureDistance = 0;
    moveBackward();
  }
}

function setupGestureObserver() {
  const reachedHistory = window.scrollY >= historyPanel.offsetTop - 2;
  const enabled = desktopImmersive.matches
    && !reduceMotion
    && window.Observer
    && (reachedHistory || historyEntryAwaitingStop);
  if (isAnimating && !gestureObserver) {
    document.body.classList.remove('about-immersive-ready');
    return;
  }
  if (enabled && gestureObserver) return;
  if (!enabled && !gestureObserver) {
    document.body.classList.remove('about-immersive-ready');
    return;
  }
  gestureObserver?.kill();
  gestureObserver = null;
  document.body.classList.toggle('about-immersive-ready', Boolean(enabled));
  if (!enabled) return;

  gestureObserver = Observer.create({
    target: window,
    type: 'wheel,touch,pointer',
    tolerance: 3,
    preventDefault: true,
    allowClicks: true,
    onChangeY: handleVerticalGesture,
    onStopDelay: .2,
    onStop: () => {
      historyGestureStopped = true;
      if (historyEntryAwaitingStop) {
        historyEntryInputStopped = true;
        finishHistoryEntryIfReady();
        return;
      }
      if (panels[activePanelIndex] === historyPanel
        && historyTargetProgress >= .999
        && historyMotion.progress >= .988) {
        historyExitArmed = true;
      }
    }
  });
  if (window.scrollY <= historyPanel.offsetTop + 2 && panels[activePanelIndex] === historyPanel) {
    startImmersiveDamping();
  }
}

function syncPanelFromScroll() {
  if (isAnimating) return;
  const marker = window.scrollY + window.innerHeight * .45;
  let nearest = 0;
  panels.forEach((panel, index) => {
    if (panel.offsetTop <= marker) nearest = index;
  });
  if (nearest !== activePanelIndex) setActivePanel(nearest, { animate: false });
}

function renderHeroScrollMotion() {
  const visual = desktopImmersive.matches ? storyBackdrop : heroVisual;
  if (!heroCopy || !visual || reduceMotion) return;
  const heroProgress = clamp(window.scrollY / Math.max(1, window.innerHeight), 0, 1);
  if (desktopImmersive.matches) {
    renderHeroProgress(heroProgress);
    return;
  }
  gsap.set(visual, { y: -20 * heroProgress, scale: 1 + .025 * heroProgress, force3D: true });
  gsap.set(heroMachine, { y: -32 * heroProgress, scale: 1 + .035 * heroProgress, force3D: true });
  gsap.set(heroCopy, { y: -14 * heroProgress, force3D: true });
}

factoryPrevious?.addEventListener('click', () => showFactorySlide(factorySlideIndex - 1, -1));
factoryNext?.addEventListener('click', () => showFactorySlide(factorySlideIndex + 1, 1));
factoryDots.forEach((dot, index) => dot.addEventListener('click', () => {
  showFactorySlide(index, index >= factorySlideIndex ? 1 : -1);
}));

factorySlider?.addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft') {
    event.preventDefault();
    showFactorySlide(factorySlideIndex - 1, -1);
  } else if (event.key === 'ArrowRight') {
    event.preventDefault();
    showFactorySlide(factorySlideIndex + 1, 1);
  }
});

if (factorySlider) {
  const factoryVisibilityObserver = new IntersectionObserver(entries => {
    factoryVisible = entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= .5);
    if (factoryVisible) scheduleFactorySlide();
    else window.clearTimeout(factorySlideTimer);
  }, { threshold: [.5] });
  factoryVisibilityObserver.observe(factorySlider);
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) window.clearTimeout(factorySlideTimer);
  else scheduleFactorySlide();
});

indicator.querySelectorAll('button').forEach(button => button.addEventListener('click', () => {
  const index = Number(button.dataset.panelIndex);
  if (desktopImmersive.matches && !reduceMotion && index < historyPanelIndex) {
    gestureObserver?.kill();
    gestureObserver = null;
    resetHistoryEntryGate();
    document.body.classList.remove('about-immersive-ready');
    isAnimating = true;
    setActivePanel(index);
    gsap.to(window, {
      duration: .72,
      scrollTo: { y: panels[index].offsetTop, autoKill: false },
      ease: 'power3.inOut',
      overwrite: true,
      onComplete: () => {
        isAnimating = false;
        syncPanelFromScroll();
        setupGestureObserver();
      }
    });
  } else if (desktopImmersive.matches && !reduceMotion) goToPanel(index);
  else panels[index]?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
}));

document.querySelectorAll('a[href^="#"]').forEach(link => link.addEventListener('click', event => {
  if (!desktopImmersive.matches || reduceMotion) return;
  const target = document.querySelector(link.getAttribute('href'));
  const panel = target?.closest('section, footer');
  const panelIndex = panels.indexOf(panel);
  if (panelIndex < 0) return;
  event.preventDefault();
  if (window.location.hash !== link.getAttribute('href')) {
    window.history.pushState(null, '', link.getAttribute('href'));
  }
  goToPanel(panelIndex);
}));

window.addEventListener('scroll', () => {
  const currentScrollY = window.scrollY;
  const historyTop = historyPanel.offsetTop;
  const enteringHistory = desktopImmersive.matches
    && !reduceMotion
    && !isAnimating
    && !gestureObserver
    && currentScrollY > lastScrollY
    && lastScrollY < historyTop
    && currentScrollY >= historyTop - HISTORY_ENTRY_CAPTURE_PX
    && historyTargetProgress <= .001;
  lastScrollY = currentScrollY;
  if (enteringHistory) {
    historyEntryAwaitingStop = true;
    historyEntryInputStopped = false;
    scheduleHistoryEntryStop();
  }
  syncPanelFromScroll();
  renderHeroScrollMotion();
  if (historyEntryAwaitingStop) {
    setupGestureObserver();
    alignHistoryEntry();
    return;
  }
  if (desktopImmersive.matches && !reduceMotion && !isAnimating && !gestureObserver && window.scrollY >= historyPanel.offsetTop) {
    window.scrollTo(0, historyPanel.offsetTop);
    setHistoryProgress(0, { animate: false });
    setActivePanel(historyPanelIndex, { animate: false });
  }
  setupGestureObserver();
}, { passive: true });

window.addEventListener('keydown', event => {
  if (!desktopImmersive.matches || reduceMotion || isAnimating) return;
  if (!gestureObserver && window.scrollY < historyPanel.offsetTop - 2) return;
  if (['ArrowDown', 'ArrowRight', 'PageDown', ' '].includes(event.key)) {
    event.preventDefault();
    moveForward();
  } else if (['ArrowUp', 'ArrowLeft', 'PageUp'].includes(event.key)) {
    event.preventDefault();
    moveBackward();
  }
});

window.addEventListener('resize', () => {
  if (desktopImmersive.matches && window.gsap) renderHistoryProgress(historyMotion.progress);
  updateIndicator();
  if (desktopImmersive.matches && !isAnimating && gestureObserver) {
    window.scrollTo(0, panels[activePanelIndex].offsetTop);
  }
  setupGestureObserver();
});

desktopImmersive.addEventListener('change', () => {
  if (desktopImmersive.matches) {
    setActivePanel(activePanelIndex, { animate: false });
    if (activePanelIndex >= historyPanelIndex) window.scrollTo(0, panels[activePanelIndex].offsetTop);
  } else if (window.gsap && historyTrack) {
    resetHistoryEntryGate();
    const historyAnimatedLayers = [
      historyTrack,
      historyCopy,
      historyCursor,
      ...historyEvents.flatMap(event => [event.querySelector('b'), event.querySelector('span')])
    ].filter(Boolean);
    gsap.set(historyAnimatedLayers, { clearProps: 'transform,opacity,visibility' });
    historyEvents.forEach(event => event.removeAttribute('aria-hidden'));
    renderHeroScrollMotion();
  }
  setupGestureObserver();
});

if (window.gsap && window.Observer && window.ScrollToPlugin) {
  gsap.registerPlugin(Observer, ScrollToPlugin);
}

const initialTarget = document.querySelector(window.location.hash || '.about-hero');
const initialPanel = initialTarget?.closest('section, footer') || panels[0];
activePanelIndex = Math.max(0, panels.indexOf(initialPanel));
if (initialPanel === historyPanel) setHistoryProgress(0, { animate: false });
setActivePanel(activePanelIndex, { animate: false });
if (desktopImmersive.matches && !reduceMotion) window.scrollTo(0, panels[activePanelIndex].offsetTop);
setupGestureObserver();
if (desktopImmersive.matches && window.gsap) renderHistoryProgress(historyMotion.progress);
if (desktopImmersive.matches && window.gsap) renderHeroProgress(activePanelIndex === 0 ? 0 : 1);
renderHeroScrollMotion();
