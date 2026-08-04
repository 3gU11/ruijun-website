<script setup lang="ts">
const labels = ['品牌主张', '品牌起点', '企业概览', '发展历程', '厂区风貌', '认证证书', '荣誉证书', '专利证书', '合作伙伴', '客户现场', '联系我们'];
const activePanel = ref(0);
const visible = ref(false);
let jumpToPanel: (index: number) => void = () => {};
let cleanup: (() => void) | undefined;

onMounted(async () => {
  const root = document.querySelector<HTMLElement>('.about-page');
  if (!root) return;
  const panels = [...root.querySelectorAll<HTMLElement>('[data-about-panel]')];
  const desktop = window.matchMedia('(min-width: 901px) and (prefers-reduced-motion: no-preference)');
  const [{ gsap }, { ScrollToPlugin }] = await Promise.all([import('gsap'), import('gsap/ScrollToPlugin')]);
  gsap.registerPlugin(ScrollToPlugin);
  let hideTimer = 0;

  function sync() {
    const marker = window.scrollY + window.innerHeight * .45;
    let nearest = 0;
    panels.forEach((panel, index) => {
      if (panel.offsetTop <= marker) nearest = index;
    });
    activePanel.value = nearest;
  }

  function show() {
    if (!desktop.matches) return;
    visible.value = true;
    window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(() => { visible.value = false; }, 620);
    sync();
  }

  jumpToPanel = (index: number) => {
    const panel = panels[index];
    if (!panel) return;
    window.dispatchEvent(new CustomEvent('about-panel-jump', { detail: { panel } }));
    if (!desktop.matches) {
      panel.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    visible.value = true;
    gsap.to(window, {
      duration: .78,
      scrollTo: { y: panel.offsetTop, autoKill: false },
      ease: 'power3.inOut',
      overwrite: true,
      onUpdate: sync,
      onComplete: sync
    });
  };

  window.addEventListener('scroll', show, { passive: true });
  window.addEventListener('resize', sync);
  sync();
  cleanup = () => {
    window.removeEventListener('scroll', show);
    window.removeEventListener('resize', sync);
    window.clearTimeout(hideTimer);
    gsap.killTweensOf(window);
    jumpToPanel = () => {};
  };
});

onBeforeUnmount(() => cleanup?.());
</script>

<template>
  <nav class="about-indicator" :class="{ 'is-scrolling': visible }" aria-label="关于我们页面段落导航">
    <span class="about-indicator__thumb" :style="{ transform: `translate3d(0, calc((100vh - 38px) * ${activePanel / Math.max(1, labels.length - 1)}), 0)` }" aria-hidden="true"></span>
    <button v-for="(label, index) in labels" :key="label" type="button" :class="{ active: activePanel === index }" :style="{ top: `${index / labels.length * 100}%`, height: `${100 / labels.length}%` }" :aria-label="label" :aria-current="activePanel === index ? 'true' : undefined" @click="jumpToPanel(index)"></button>
  </nav>
</template>

<style scoped>
.about-indicator{position:fixed;z-index:110;top:0;right:0;bottom:0;width:12px;opacity:.2;transition:opacity .32s ease}.about-indicator::before{content:"";position:absolute;top:0;right:0;bottom:0;width:3px;background:rgb(5 13 9/78%)}.about-indicator:hover,.about-indicator:focus-within,.about-indicator.is-scrolling{opacity:1}.about-indicator__thumb{position:absolute;z-index:2;top:0;right:0;width:3px;height:38px;background:#e51b23;pointer-events:none;will-change:transform}.about-indicator button{position:absolute;z-index:1;left:0;width:12px;padding:0;border:0;background:transparent;cursor:pointer}.about-indicator button:focus-visible{outline:1px solid #e51b23;outline-offset:-2px}
@media(max-width:900px), (prefers-reduced-motion:reduce){.about-indicator{display:none}}
</style>
