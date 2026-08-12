<script setup lang="ts">
const route = useRoute();
const progress = ref(0);
const visible = ref(false);
let hideTimer = 0;

const showIndicator = computed(() => route.path !== '/' && route.path !== '/about');

function syncProgress() {
  const root = document.documentElement;
  const scrollableHeight = root.scrollHeight - window.innerHeight;
  progress.value = scrollableHeight > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollableHeight)) : 0;
}

function handleScroll() {
  syncProgress();
  visible.value = true;
  window.clearTimeout(hideTimer);
  hideTimer = window.setTimeout(() => { visible.value = false; }, 620);
}

watch(() => route.fullPath, async () => {
  await nextTick();
  syncProgress();
  visible.value = false;
});

onMounted(() => {
  syncProgress();
  window.addEventListener('scroll', handleScroll, { passive: true });
  window.addEventListener('resize', syncProgress);
});

onBeforeUnmount(() => {
  window.removeEventListener('scroll', handleScroll);
  window.removeEventListener('resize', syncProgress);
  window.clearTimeout(hideTimer);
});
</script>

<template>
  <aside v-if="showIndicator" class="global-page-indicator" :class="{ 'is-scrolling': visible }" aria-hidden="true">
    <span class="global-page-indicator__thumb" :style="{ transform: `translate3d(0, calc((100vh - 38px) * ${progress}), 0)` }" />
  </aside>
</template>

<style scoped>
.global-page-indicator{position:fixed;z-index:110;top:0;right:0;bottom:0;width:12px;opacity:.2;pointer-events:none;transition:opacity .32s ease}.global-page-indicator::before{content:"";position:absolute;top:0;right:0;bottom:0;width:3px;background:rgb(5 13 9/78%)}.global-page-indicator.is-scrolling{opacity:1}.global-page-indicator__thumb{position:absolute;top:0;right:0;width:3px;height:38px;background:#e51b23;will-change:transform}
@media(max-width:900px), (prefers-reduced-motion:reduce){.global-page-indicator{display:none}}
</style>
