const products = [
  { id: 'workstation', name: '灵动切割工作站', sub: '无人化加工解决方案', feature: '自动穿丝 · 六轴协作机器人 · 多工位夹具', tag: '自动化', image: 'assets/psd/product-workstation.png' },
  { id: 'fr-xs-auto', name: 'FR-XS (AUTO)', sub: '自动穿丝系列', feature: '自动穿丝 · 伺服张力控制 · 连续加工', tag: '自动穿丝', image: 'assets/psd/product-auto.png' },
  { id: 'fr-xs-pro', name: 'FR-XS (PRO)', sub: '高精度伺服系列', feature: '伺服闭环 · 瑞钧控制系统 · 五轴数控', tag: '高精度', image: 'assets/psd/product-pro.png' },
  { id: 'ft-xs', name: 'FT-XS', sub: '机电一体机系列', feature: '机电一体化 · 稳定放电 · 精密加工', tag: '一体机', image: 'assets/psd/product-ft-xs.png' },
  { id: 'fr-y', name: 'FR-Y', sub: '大锥度摇摆系列', feature: '大锥度加工 · 多轴控制 · 螺距补偿', tag: '大锥度', image: 'assets/psd/product-fr-y.png' },
  { id: 'fl-xs', name: 'FL-XS', sub: '超大型高精度系列', feature: '大型工件 · 高强度承载 · 五轴数控', tag: '大型工件', image: 'assets/psd/product-fl-xs.png' },
];

const productGrid = document.querySelector('#product-grid');
const productDialog = document.querySelector('#product-dialog');
const dialogBody = document.querySelector('#dialog-body');
const quoteDialog = document.querySelector('#quote-dialog');
const quoteForm = document.querySelector('#quote-form');
const toast = document.querySelector('#toast');
const hero = document.querySelector('.hero');
const heroVideo = document.querySelector('.hero-video');
const heroStaticMachine = document.querySelector('.hero-static-machine');
const siteHeader = document.querySelector('.site-header');
const menuToggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.site-nav');

function endHero() {
  hero.classList.add('hero-ended');
  heroVideo.pause();
}

heroVideo.addEventListener('ended', endHero);
heroVideo.addEventListener('error', endHero);
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) endHero();

function renderProducts() {
  productGrid.innerHTML = products.map((product, index) => `
    <article class="product-card" tabindex="0" role="button" data-product="${product.id}" aria-label="查看 ${product.name}">
      <img src="${product.image}" alt="${product.name} 设备" />
      <div class="product-card-copy">
        <small>${String(index + 1).padStart(2, '0')} / ${product.tag}</small>
        <h3>${product.name}</h3>
        <p>${product.sub}</p>
      </div>
    </article>
  `).join('');

  productGrid.querySelectorAll('.product-card').forEach(card => {
    card.addEventListener('click', () => openProduct(card.dataset.product));
    card.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openProduct(card.dataset.product);
      }
    });
  });
}

function openProduct(id) {
  const product = products.find(item => item.id === id);
  if (!product) return;
  dialogBody.innerHTML = `
    <div class="dialog-product">
      <div class="dialog-product-media"><img src="${product.image}" alt="${product.name}" /></div>
      <div class="dialog-product-copy">
        <small>${product.tag.toUpperCase()} / RUIJUN SERIES</small>
        <h2>${product.name}</h2>
        <p>${product.sub}</p>
        <div class="dialog-specs">
          <span>核心能力</span><b>${product.feature}</b>
          <span>适用方向</span><b>${product.tag}加工任务</b>
          <span>资料状态</span><b>产品参数由后续内容后台维护</b>
        </div>
        <button class="button button-red" type="button" data-dialog-quote>咨询这款设备 <span aria-hidden="true">→</span></button>
      </div>
    </div>`;
  productDialog.showModal();
  productDialog.querySelector('[data-dialog-quote]').addEventListener('click', () => {
    productDialog.close();
    quoteDialog.showModal();
  });
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 2800);
}

document.querySelectorAll('[data-open-quote]').forEach(button => button.addEventListener('click', () => quoteDialog.showModal()));
document.querySelectorAll('.dialog-close').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
document.querySelector('.lang-switch').addEventListener('click', () => showToast('英文站入口将在正式版接入。'));

quoteForm.noValidate = true;
quoteForm.addEventListener('submit', async event => {
  event.preventDefault();
  const missing = [...quoteForm.querySelectorAll('[required]')].find(field => field.type === 'checkbox' ? !field.checked : !field.value.trim());
  const status = document.querySelector('#form-status');
  if (missing) {
    status.style.color = 'var(--red)';
    status.textContent = '请填写称呼和联系电话后再提交。';
    missing.focus();
    return;
  }
  const submitButton = quoteForm.querySelector('[type="submit"]');
  submitButton.disabled = true;
  status.style.color = 'inherit';
  status.textContent = '正在提交…';
  try {
    const formData = new FormData(quoteForm);
    const response = await fetch('/api/public/v1/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: formData.get('name'),
        phone: formData.get('phone'),
        leadType: formData.get('leadType'),
        requirement: formData.get('requirement'),
        consent: formData.get('consent') === 'on',
        pagePath: window.location.pathname
      })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || '提交失败，请稍后再试。');
    status.style.color = '#1c8b58';
    status.textContent = '需求已提交，销售顾问将尽快与您联系。';
    quoteForm.reset();
  } catch (error) {
    status.style.color = 'var(--red)';
    status.textContent = error.message || '提交失败，请稍后再试。';
  } finally {
    submitButton.disabled = false;
  }
});

menuToggle.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(open));
});
nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  nav.classList.remove('open');
  menuToggle.setAttribute('aria-expanded', 'false');
}));

renderProducts();

const immersivePanels = [...document.querySelectorAll('main > .lifecycle-panel')];
const desktopImmersive = window.matchMedia('(min-width: 901px)');
const introPanel = document.querySelector('#reasons');
const introMachineWrap = document.querySelector('.intro-machine-wrap');
const introMachine = document.querySelector('.intro-machine-wrap img');
const introReasonItems = [...document.querySelectorAll('.reason-list li')];
const machineMorphOverlay = document.querySelector('.machine-morph-overlay');
const machineMorphBackground = machineMorphOverlay.querySelector('.machine-morph-bg');
const machineMorphImage = machineMorphOverlay.querySelector('img');
const reasonShowcase = document.querySelector('#reason-showcase');
const reasonTrack = document.querySelector('#reason-track');
const reasonSlides = [...document.querySelectorAll('[data-reason-slide]')];
const reasonProgress = [...document.querySelectorAll('.reason-progress i')];
const historyPanel = document.querySelector('#history');
const historyViewport = document.querySelector('#history-viewport');
const historyTrack = document.querySelector('#history-track');
const historyCopy = historyPanel.querySelector('.history-copy');
const historyCopyLines = [...historyCopy.querySelectorAll('.history-en span')];
const historyCopyCn = historyCopy.querySelector('.history-cn');
const historyCursor = historyPanel.querySelector('.history-cursor');
const historyEvents = [...historyPanel.querySelectorAll('.history-event')];
const historyProgress = [...document.querySelectorAll('.history-progress i')];
const navLinks = [...document.querySelectorAll('.site-nav a[href^="#"]')];
let activePanelIndex = 0;
let introRevealStage = 0;
let reasonSlideIndex = 0;
const reasonMotion = { progress: 0 };
let reasonTargetProgress = 0;
let reasonBoundaryDistance = 0;
let panelGestureDistance = 0;
const historyMotion = { progress: 0 };
let historyTargetProgress = 0;
let historyBoundaryDistance = 0;
let isAnimating = false;
let gestureObserver = null;

function createImmersiveIndicator() {
  const indicator = document.createElement('nav');
  indicator.className = 'immersive-indicator';
  indicator.setAttribute('aria-label', '页面段落导航');
  indicator.innerHTML = `<span class="immersive-indicator__thumb" aria-hidden="true"></span>${immersivePanels.map((panel, index) => `<button type="button" aria-label="${panel.dataset.panelLabel || `第 ${index + 1} 屏`}" data-panel-index="${index}" style="top:${index / immersivePanels.length * 100}%;height:${100 / immersivePanels.length}%"></button>`).join('')}`;
  document.body.append(indicator);
  indicator.querySelectorAll('button').forEach(button => button.addEventListener('click', () => goToPanel(Number(button.dataset.panelIndex))));
  return indicator;
}

const immersiveIndicator = createImmersiveIndicator();
const immersiveIndicatorThumb = immersiveIndicator.querySelector('.immersive-indicator__thumb');
let indicatorHideTimer = 0;
document.body.classList.add('immersive-scroll-ready');

function updateImmersiveIndicator() {
  const scrollRange = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  const thumbTravel = Math.max(0, window.innerHeight - immersiveIndicatorThumb.offsetHeight);
  const progress = Math.min(1, Math.max(0, window.scrollY / scrollRange));
  immersiveIndicatorThumb.style.transform = `translate3d(0, ${progress * thumbTravel}px, 0)`;
}

function revealImmersiveIndicator() {
  if (!desktopImmersive.matches) return;
  immersiveIndicator.classList.add('is-scrolling');
  window.clearTimeout(indicatorHideTimer);
  indicatorHideTimer = window.setTimeout(() => immersiveIndicator.classList.remove('is-scrolling'), 620);
}

function setIntroRevealStage(index, { showHeading = true } = {}) {
  introRevealStage = Math.max(0, Math.min(index, introReasonItems.length));
  introPanel.classList.toggle('intro-heading-visible', showHeading);
  for (let stage = 1; stage <= introReasonItems.length; stage += 1) introPanel.classList.remove(`intro-stage-${stage}`);
  if (introRevealStage > 0) introPanel.classList.add(`intro-stage-${introRevealStage}`);
}

function heroMachineRect() {
  const rect = heroStaticMachine.getBoundingClientRect();
  const panelRect = hero.getBoundingClientRect();
  return { left: rect.left, top: rect.top - panelRect.top, width: rect.width, height: rect.height };
}

function introStageRect({ current = false } = {}) {
  const rect = introMachineWrap.getBoundingClientRect();
  if (current) return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
  return { left: introMachineWrap.offsetLeft, top: introMachineWrap.offsetTop, width: rect.width, height: rect.height };
}

function introMachineLocalRect() {
  const stageRect = introMachineWrap.getBoundingClientRect();
  const imageRect = introMachine.getBoundingClientRect();
  return { left: imageRect.left - stageRect.left, top: imageRect.top - stageRect.top, width: imageRect.width, height: imageRect.height };
}

function runMachineMorph(direction, duration) {
  if (!window.gsap || !desktopImmersive.matches) return;
  const forward = direction === 'forward';
  const viewportStage = { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
  const introStage = introStageRect({ current: !forward });
  const heroMachine = heroMachineRect();
  const introMachineLocal = introMachineLocalRect();
  const stageStart = forward ? viewportStage : introStage;
  const stageEnd = forward ? introStage : viewportStage;
  const imageStart = forward ? heroMachine : introMachineLocal;
  const imageEnd = forward ? introMachineLocal : heroMachine;
  gsap.killTweensOf([machineMorphOverlay, machineMorphBackground, machineMorphImage]);
  heroStaticMachine.classList.add('is-morph-hidden');
  introMachine.classList.add('is-morph-hidden');
  introMachineWrap.classList.add('is-stage-morph-hidden');
  gsap.set(machineMorphOverlay, { display: 'block', autoAlpha: 1, ...stageStart, borderRadius: forward ? 0 : 5 });
  gsap.set(machineMorphBackground, { autoAlpha: forward ? 1 : 0 });
  gsap.set(machineMorphImage, imageStart);
  gsap.timeline({
    defaults: { duration, ease: 'power3.inOut', overwrite: true },
    onComplete: () => {
      gsap.set(machineMorphOverlay, { display: 'none', autoAlpha: 0 });
      heroStaticMachine.classList.remove('is-morph-hidden');
      introMachine.classList.remove('is-morph-hidden');
      introMachineWrap.classList.remove('is-stage-morph-hidden');
    }
  })
    .to(machineMorphOverlay, { ...stageEnd, borderRadius: forward ? 5 : 0 }, 0)
    .to(machineMorphImage, imageEnd, 0)
    .to(machineMorphBackground, { autoAlpha: forward ? 0 : 1, duration: duration * .72, ease: 'power2.inOut' }, duration * .16);
}

function updateNavigation() {
  const activePanel = immersivePanels[activePanelIndex];
  let activeHash = `#${activePanel.id}`;
  if (activePanel === reasonShowcase) activeHash = `#${reasonSlides[reasonSlideIndex].id}`;
  navLinks.forEach(link => {
    const hash = link.getAttribute('href');
    const target = document.querySelector(hash);
    const controlledPanels = (link.dataset.navPanels || '').split(/\s+/).filter(Boolean);
    const active = controlledPanels.includes(activePanel.id)
      || hash === activeHash
      || target?.closest('.lifecycle-panel') === activePanel && activePanel !== reasonShowcase;
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
}

function renderReasonProgress(progress) {
  const maxProgress = reasonSlides.length - 1;
  reasonMotion.progress = Math.max(0, Math.min(progress, maxProgress));
  const nearestIndex = Math.round(reasonMotion.progress);
  const slideChanged = nearestIndex !== reasonSlideIndex;
  reasonSlideIndex = nearestIndex;

  reasonSlides.forEach((slide, slideIndex) => {
    const slideProgress = slideIndex === 0
      ? 1
      : Math.max(0, Math.min(reasonMotion.progress - (slideIndex - 1), 1));
    const outgoingProgress = slideIndex < maxProgress
      ? Math.max(0, Math.min(reasonMotion.progress - slideIndex, 1))
      : 0;
    gsap.set(slide, { x: 0, xPercent: slideIndex === 0 ? 0 : (1 - slideProgress) * 100 });
    slide.setAttribute('aria-hidden', String(slideIndex !== nearestIndex));

    const media = slideIndex > 0 ? slide.querySelector('.scene-photo, .performance-machine') : null;
    if (media) {
      const mediaLag = 1 - slideProgress;
      gsap.set(media, { xPercent: mediaLag * 3.5, scale: 1 + mediaLag * .08, transformOrigin: '50% 50%' });
    }

    const titleLayer = slide.querySelector('.reason-tabs');
    const copyLayer = slide.querySelector('.performance-content, .photo-copy');
    const incomingLag = 1 - slideProgress;
    if (titleLayer) gsap.set(titleLayer, { x: incomingLag * 34 - outgoingProgress * 14 });
    if (copyLayer) {
      gsap.set(copyLayer, {
        x: incomingLag * 82 - outgoingProgress * 32,
        y: incomingLag * 10,
        opacity: .68 + slideProgress * .32 - outgoingProgress * .1
      });
    }
  });
  reasonProgress.forEach((item, itemIndex) => item.classList.toggle('active', itemIndex === nearestIndex));
  if (slideChanged) updateNavigation();
}

function setReasonSlide(index, { animate = true } = {}) {
  const nextIndex = Math.max(0, Math.min(index, reasonSlides.length - 1));
  reasonTargetProgress = nextIndex;
  reasonBoundaryDistance = 0;

  if (!window.gsap || !desktopImmersive.matches) {
    reasonSlideIndex = nextIndex;
    reasonProgress.forEach((item, itemIndex) => item.classList.toggle('active', itemIndex === nextIndex));
    reasonSlides.forEach(slide => slide.removeAttribute('aria-hidden'));
    updateNavigation();
    return;
  }

  gsap.killTweensOf(reasonMotion);
  if (!animate || Math.abs(reasonMotion.progress - nextIndex) < .001) {
    renderReasonProgress(nextIndex);
    updateNavigation();
    return;
  }

  isAnimating = true;
  gsap.to(reasonMotion, {
    progress: nextIndex,
    duration: .75,
    ease: 'power3.inOut',
    overwrite: true,
    onUpdate: () => renderReasonProgress(reasonMotion.progress),
    onComplete: () => {
      isAnimating = false;
      renderReasonProgress(nextIndex);
      updateNavigation();
    }
  });
}

function scrubReasonProgress(deltaY) {
  const maxProgress = reasonSlides.length - 1;
  const direction = Math.sign(deltaY);
  const atStart = reasonTargetProgress <= .001 && reasonMotion.progress <= .012;
  const atEnd = reasonTargetProgress >= maxProgress - .001 && reasonMotion.progress >= maxProgress - .012;

  if ((direction < 0 && atStart) || (direction > 0 && atEnd)) {
    reasonBoundaryDistance += Math.abs(deltaY);
    if (reasonBoundaryDistance >= 140) {
      reasonBoundaryDistance = 0;
      gsap.killTweensOf(reasonMotion);
      goToPanel(activePanelIndex + direction);
    }
    return;
  }

  reasonBoundaryDistance = 0;
  const pixelsPerScene = Math.max(720, window.innerHeight * .95);
  reasonTargetProgress = Math.max(0, Math.min(reasonTargetProgress + deltaY / pixelsPerScene, maxProgress));
  gsap.to(reasonMotion, {
    progress: reasonTargetProgress,
    duration: .28,
    ease: 'power2.out',
    overwrite: true,
    onUpdate: () => renderReasonProgress(reasonMotion.progress),
    onComplete: () => renderReasonProgress(reasonTargetProgress)
  });
}

function historyTrackX(progress) {
  const distance = Math.max(0, historyTrack.scrollWidth - historyViewport.clientWidth);
  return -(distance * progress);
}

function renderHistoryProgress(progress) {
  historyMotion.progress = Math.max(0, Math.min(progress, 1));
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
  const titleRevealProgress = Math.max(0, Math.min((cursorTipX - titleLeft) / historyCopy.offsetWidth, 1));
  gsap.set(historyViewport, { autoAlpha: 1 });
  gsap.set(historyTrack, { x: trackX });
  gsap.set(historyCursor, {
    x: cursorX,
    y: 0,
    autoAlpha: 1
  });

  gsap.set(historyCopy, {
    autoAlpha: 1,
    x: contentX,
    y: 0
  });
  const lineWidths = historyCopyLines.map(line => Math.max(1, line.offsetWidth));
  const totalLineWidth = lineWidths.reduce((total, lineWidth) => total + lineWidth, 0);
  const revealedLineWidth = titleRevealProgress * totalLineWidth;
  let precedingLineWidth = 0;
  historyCopyLines.forEach((line, lineIndex) => {
    const lineProgress = Math.max(0, Math.min((revealedLineWidth - precedingLineWidth) / lineWidths[lineIndex], 1));
    line.style.setProperty('--reveal-progress', `${lineProgress * 100}%`);
    precedingLineWidth += lineWidths[lineIndex];
  });
  gsap.set(historyCopyCn, {
    autoAlpha: .35 + titleRevealProgress * .65,
    y: (1 - titleRevealProgress) * 10
  });

  historyEvents.forEach(event => {
    event.removeAttribute('aria-hidden');
    gsap.set(event.querySelectorAll('b, span'), {
      autoAlpha: 1,
      y: 0
    });
  });

  const progressIndex = Math.min(historyProgress.length - 1, Math.floor(trackProgress * historyProgress.length));
  historyProgress.forEach((item, itemIndex) => item.classList.toggle('active', trackProgress > 0 && itemIndex === progressIndex));
}

function setHistoryProgress(progress, { animate = true } = {}) {
  const nextProgress = Math.max(0, Math.min(progress, 1));
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

function scrubHistoryProgress(deltaY) {
  const direction = Math.sign(deltaY);
  const atStart = historyTargetProgress <= .001 && historyMotion.progress <= .012;
  const atEnd = historyTargetProgress >= .999 && historyMotion.progress >= .988;

  if ((direction < 0 && atStart) || (direction > 0 && atEnd)) {
    historyBoundaryDistance += Math.abs(deltaY);
    if (historyBoundaryDistance >= 140) {
      historyBoundaryDistance = 0;
      gsap.killTweensOf(historyMotion);
      goToPanel(activePanelIndex + direction);
    }
    return;
  }

  historyBoundaryDistance = 0;
  const pixelsForTimeline = Math.max(4000, window.innerHeight * 4.4);
  const boundedDelta = Math.max(-100, Math.min(deltaY, 100));
  historyTargetProgress = Math.max(0, Math.min(historyTargetProgress + boundedDelta / pixelsForTimeline, 1));
  gsap.to(historyMotion, {
    progress: historyTargetProgress,
    duration: .3,
    ease: 'power2.out',
    overwrite: true,
    onUpdate: () => renderHistoryProgress(historyMotion.progress),
    onComplete: () => renderHistoryProgress(historyTargetProgress)
  });
}

function setActivePanel(index, { animate = true } = {}) {
  activePanelIndex = Math.max(0, Math.min(index, immersivePanels.length - 1));
  siteHeader.classList.toggle('is-wide', activePanelIndex > 0);
  immersivePanels.forEach((panel, panelIndex) => {
    panel.classList.toggle('is-active', panelIndex === activePanelIndex);
    panel.classList.toggle('is-before', panelIndex < activePanelIndex);
    panel.classList.toggle('is-after', panelIndex > activePanelIndex);
    if (!window.gsap || panel === reasonShowcase || panel === historyPanel) return;
    const items = [...panel.children].filter(item => !item.matches('.hero-static-machine, .intro-machine-wrap'));
    gsap.killTweensOf(items);
    if (!animate || panelIndex < activePanelIndex) gsap.set(items, { autoAlpha: 1, y: 0 });
    else if (panelIndex > activePanelIndex) gsap.set(items, { autoAlpha: .55, y: 18 });
    else gsap.fromTo(items, { autoAlpha: .35, y: 22 }, { autoAlpha: 1, y: 0, duration: .72, stagger: .06, ease: 'power3.out', overwrite: true });
  });
  immersiveIndicator.querySelectorAll('button').forEach((button, buttonIndex) => {
    button.classList.toggle('active', buttonIndex === activePanelIndex);
    button.setAttribute('aria-current', buttonIndex === activePanelIndex ? 'true' : 'false');
  });
  updateNavigation();
}

function goToPanel(index, options = {}) {
  if (!desktopImmersive.matches || isAnimating || !window.gsap) return;
  const nextIndex = Math.max(0, Math.min(index, immersivePanels.length - 1));
  if (nextIndex === activePanelIndex) {
    if (typeof options.reasonIndex === 'number') setReasonSlide(options.reasonIndex);
    if (typeof options.historyProgress === 'number') setHistoryProgress(options.historyProgress);
    return;
  }

  const currentPanel = immersivePanels[activePanelIndex];
  const nextPanel = immersivePanels[nextIndex];
  const enteringFromBelow = nextIndex < activePanelIndex;
  const morphDirection = currentPanel === hero && nextPanel === introPanel ? 'forward' : currentPanel === introPanel && nextPanel === hero ? 'backward' : null;
  if (nextPanel === introPanel) {
    setIntroRevealStage(enteringFromBelow ? introReasonItems.length : 0, { showHeading: enteringFromBelow });
  }
  if (nextPanel === hero) setIntroRevealStage(0, { showHeading: false });
  if (immersivePanels[nextIndex] === reasonShowcase) {
    const destination = typeof options.reasonIndex === 'number' ? options.reasonIndex : enteringFromBelow ? reasonSlides.length - 1 : 0;
    setReasonSlide(destination, { animate: false });
  }
  if (immersivePanels[nextIndex] === historyPanel) {
    const destination = typeof options.historyProgress === 'number' ? options.historyProgress : enteringFromBelow ? 1 : 0;
    setHistoryProgress(destination, { animate: false });
  }

  isAnimating = true;
  const transitionDuration = morphDirection ? 1.35 : .92;
  if (morphDirection) {
    endHero();
    runMachineMorph(morphDirection, transitionDuration);
  }
  setActivePanel(nextIndex);
  gsap.to(window, {
    duration: transitionDuration,
    scrollTo: { y: immersivePanels[nextIndex].offsetTop, autoKill: false },
    ease: 'power3.inOut',
    overwrite: true,
    onComplete: () => {
      isAnimating = false;
      if (morphDirection === 'forward') setIntroRevealStage(0, { showHeading: true });
      if (typeof options.reasonIndex === 'number' && immersivePanels[nextIndex] === reasonShowcase) setReasonSlide(options.reasonIndex);
      if (typeof options.historyProgress === 'number' && immersivePanels[nextIndex] === historyPanel) setHistoryProgress(options.historyProgress);
    }
  });
}

function moveForward() {
  revealImmersiveIndicator();
  if (isAnimating) return;
  if (immersivePanels[activePanelIndex] === introPanel && introRevealStage < introReasonItems.length) {
    setIntroRevealStage(introRevealStage + 1);
    return;
  }
  if (immersivePanels[activePanelIndex] === reasonShowcase && reasonSlideIndex < reasonSlides.length - 1) {
    setReasonSlide(reasonSlideIndex + 1);
    return;
  }
  if (immersivePanels[activePanelIndex] === historyPanel && historyTargetProgress < .999) {
    setHistoryProgress(Math.min(1, historyTargetProgress + .25));
    return;
  }
  goToPanel(activePanelIndex + 1);
}

function moveBackward() {
  revealImmersiveIndicator();
  if (isAnimating) return;
  if (immersivePanels[activePanelIndex] === introPanel && introRevealStage > 0) {
    setIntroRevealStage(introRevealStage - 1);
    return;
  }
  if (immersivePanels[activePanelIndex] === reasonShowcase && reasonSlideIndex > 0) {
    setReasonSlide(reasonSlideIndex - 1);
    return;
  }
  if (immersivePanels[activePanelIndex] === historyPanel && historyTargetProgress > .001) {
    setHistoryProgress(Math.max(0, historyTargetProgress - .25));
    return;
  }
  goToPanel(activePanelIndex - 1);
}

function handleVerticalGesture(observer) {
  revealImmersiveIndicator();
  const deltaY = observer.deltaY;
  if (!Number.isFinite(deltaY) || deltaY === 0) return;
  if (isAnimating) {
    panelGestureDistance = 0;
    return;
  }
  if (immersivePanels[activePanelIndex] === reasonShowcase) {
    panelGestureDistance = 0;
    scrubReasonProgress(deltaY);
    return;
  }
  if (immersivePanels[activePanelIndex] === historyPanel) {
    panelGestureDistance = 0;
    scrubHistoryProgress(deltaY);
    return;
  }

  panelGestureDistance += deltaY;
  if (panelGestureDistance >= 58) {
    panelGestureDistance = 0;
    moveForward();
  } else if (panelGestureDistance <= -58) {
    panelGestureDistance = 0;
    moveBackward();
  }
}

function setupGestureObserver() {
  if (gestureObserver) gestureObserver.kill();
  gestureObserver = null;
  if (!desktopImmersive.matches || !window.Observer) return;
  gestureObserver = Observer.create({
    target: window,
    type: 'wheel,touch,pointer',
    tolerance: 4,
    preventDefault: true,
    allowClicks: true,
    onChangeY: handleVerticalGesture
  });
}

function syncPanelFromScroll() {
  if (isAnimating || !desktopImmersive.matches) return;
  const current = window.scrollY + window.innerHeight * .4;
  let nearest = 0;
  immersivePanels.forEach((panel, index) => { if (panel.offsetTop <= current) nearest = index; });
  if (nearest !== activePanelIndex) setActivePanel(nearest, { animate: false });
}

function syncMobileHeaderFromScroll() {
  if (desktopImmersive.matches) return;
  const hasLeftHero = window.scrollY >= hero.offsetTop + hero.offsetHeight - 1;
  siteHeader.classList.toggle('is-wide', hasLeftHero);
}

window.addEventListener('scroll', () => {
  syncPanelFromScroll();
  updateImmersiveIndicator();
  revealImmersiveIndicator();
}, { passive: true });
window.addEventListener('scroll', syncMobileHeaderFromScroll, { passive: true });
window.addEventListener('resize', () => {
  if (desktopImmersive.matches && window.gsap) setReasonSlide(reasonSlideIndex, { animate: false });
  if (desktopImmersive.matches && window.gsap) renderHistoryProgress(historyMotion.progress);
  updateImmersiveIndicator();
});
window.addEventListener('keydown', event => {
  if (!desktopImmersive.matches || isAnimating || document.querySelector('dialog[open]')) return;
  if (['ArrowDown', 'ArrowRight', 'PageDown', ' '].includes(event.key)) { event.preventDefault(); moveForward(); }
  if (['ArrowUp', 'ArrowLeft', 'PageUp'].includes(event.key)) { event.preventDefault(); moveBackward(); }
});

desktopImmersive.addEventListener('change', () => {
  gsap?.set(machineMorphOverlay, { display: 'none', autoAlpha: 0 });
  heroStaticMachine.classList.remove('is-morph-hidden');
  introMachine.classList.remove('is-morph-hidden');
  introMachineWrap.classList.remove('is-stage-morph-hidden');
  setupGestureObserver();
  if (!desktopImmersive.matches && window.gsap) {
    const reasonAnimatedLayers = reasonSlides.flatMap(slide => [
      slide,
      slide.querySelector('.scene-photo, .performance-machine'),
      slide.querySelector('.reason-tabs'),
      slide.querySelector('.performance-content, .photo-copy')
    ].filter(Boolean));
    gsap.set(reasonAnimatedLayers, { clearProps: 'transform,opacity' });
  }
  setReasonSlide(reasonSlideIndex, { animate: false });
  if (!desktopImmersive.matches && window.gsap) {
    const historyAnimatedLayers = [
      historyTrack,
      historyCopy,
      historyCursor,
      ...historyEvents.flatMap(event => [event.querySelector('b'), event.querySelector('span')])
    ].filter(Boolean);
    gsap.set(historyAnimatedLayers, { clearProps: 'transform,opacity,visibility' });
    historyEvents.forEach(event => {
      event.removeAttribute('aria-hidden');
    });
  } else setHistoryProgress(historyMotion.progress, { animate: false });
  setActivePanel(activePanelIndex, { animate: false });
  syncMobileHeaderFromScroll();
});

if (window.gsap && window.Observer && window.ScrollToPlugin) {
  gsap.registerPlugin(Observer, ScrollToPlugin);
  const initialTarget = document.querySelector(window.location.hash || '#home');
  const initialPanel = initialTarget?.closest('.lifecycle-panel') || hero;
  const initialPanelIndex = Math.max(0, immersivePanels.indexOf(initialPanel));
  const initialReasonIndex = initialTarget?.matches('[data-reason-slide]')
    ? Number(initialTarget.dataset.reasonSlide)
    : 0;
  setIntroRevealStage(0, { showHeading: false });
  setReasonSlide(initialReasonIndex, { animate: false });
  setHistoryProgress(0, { animate: false });
  setActivePanel(initialPanelIndex, { animate: false });
  window.scrollTo(0, immersivePanels[initialPanelIndex].offsetTop);
  updateImmersiveIndicator();
  setupGestureObserver();

  document.querySelectorAll('a[href^="#"]').forEach(link => link.addEventListener('click', event => {
    if (!desktopImmersive.matches) return;
    const target = document.querySelector(link.getAttribute('href'));
    if (!target) return;
    const panel = target.closest('.lifecycle-panel');
    const panelIndex = immersivePanels.indexOf(panel);
    if (panelIndex < 0) return;
    event.preventDefault();
    if (isAnimating) return;
    const hash = link.getAttribute('href');
    const reasonIndex = target.matches('[data-reason-slide]') ? Number(target.dataset.reasonSlide) : undefined;
    if (window.location.hash !== hash) window.history.pushState(null, '', hash);
    goToPanel(panelIndex, { reasonIndex });
  }));

  window.addEventListener('popstate', () => {
    const target = document.querySelector(window.location.hash || '#home');
    const panel = target?.closest('.lifecycle-panel');
    const panelIndex = immersivePanels.indexOf(panel);
    if (panelIndex < 0 || !desktopImmersive.matches) return;
    const reasonIndex = target.matches('[data-reason-slide]') ? Number(target.dataset.reasonSlide) : undefined;
    goToPanel(panelIndex, { reasonIndex });
  });
} else {
  document.body.classList.add('gsap-unavailable');
}
