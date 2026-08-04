<script setup lang="ts">
import { getHeaderLifecycle } from '~/shared/header-lifecycle.mjs';
import { resolveHeaderCta, resolveNavigation } from '~/shared/site-navigation.mjs';
const fallbackCta = { label: '获取方案', href: '/service' };
const fallback = [{ label: '网站首页', href: '/' }, { label: '产品中心', href: '/product' }, { label: '先进智造', href: '/manufacturing' }, { label: '关于我们', href: '/about' }, { label: '服务支持', href: '/service' }];
const { data } = await useFetch('/api/public/v1/navigation', { default: () => ({ data: null }) });
const settings = computed(() => data.value?.data || null);
const resourceFallback = { label: '资料与网点', href: '/resources' };
const navigation = computed(() => resolveNavigation(settings.value, [...fallback, resourceFallback]));
const headerCta = computed(() => resolveHeaderCta(settings.value, fallbackCta));
const headerElement = ref<HTMLElement>();
const isWide = ref(false);
const menuOpen = ref(false);
const route = useRoute();

function syncLifecycle() {
  const header = headerElement.value;
  const firstPanel = header?.nextElementSibling as HTMLElement | null;
  if (!header || !firstPanel || !window.matchMedia('(min-width: 761px)').matches) {
    isWide.value = false;
    return;
  }
  isWide.value = getHeaderLifecycle({
    scrollY: window.scrollY,
    firstPanelTop: firstPanel.offsetTop,
    firstPanelHeight: firstPanel.offsetHeight,
    headerHeight: header.offsetHeight
  }).isWide;
}

onMounted(() => {
  syncLifecycle();
  window.addEventListener('scroll', syncLifecycle, { passive: true });
  window.addEventListener('resize', syncLifecycle);
  window.addEventListener('keydown', dismissMenu);
});

onBeforeUnmount(() => {
  window.removeEventListener('scroll', syncLifecycle);
  window.removeEventListener('resize', syncLifecycle);
  window.removeEventListener('keydown', dismissMenu);
});

watch(() => route.fullPath, () => { menuOpen.value = false; });
function dismissMenu(event: KeyboardEvent) {
  if (event.key === 'Escape') menuOpen.value = false;
}
</script>
<template>
  <header ref="headerElement" class="site-header" :class="{ 'is-wide': isWide }">
    <NuxtLink class="brand" to="/" aria-label="返回瑞钧智科首页">
      <img src="/assets/ruijun-logo.png" alt="瑞钧智科 RUIJUN" width="184" height="54">
    </NuxtLink>
    <button class="menu-toggle" type="button" :aria-expanded="menuOpen" aria-controls="site-navigation" aria-label="打开主导航" @click="menuOpen = !menuOpen"><span aria-hidden="true">☰</span></button>
    <nav id="site-navigation" :class="{ open: menuOpen }" aria-label="主导航">
      <NuxtLink v-for="item in navigation" :key="item.href" :to="item.href">{{ item.label }}</NuxtLink>
      <button class="lang-switch" type="button" title="英文版规划中" aria-label="切换语言">EN</button>
      <NuxtLink class="contact-button" :to="headerCta.href">{{ headerCta.label }} <span aria-hidden="true">→</span></NuxtLink>
    </nav>
  </header>
</template>

<style scoped>
.site-header { position: fixed; z-index: 100; top: 16px; right: max(6.2%, calc((100% - 1554px) / 2)); left: max(6.2%, calc((100% - 1554px) / 2)); min-height: 62px; padding: 0 16px 0 20px; display: flex; align-items: center; justify-content: space-between; color: #fff; background: rgb(18 18 19 / 86%); border: 1px solid rgb(255 255 255 / 13%); border-radius: 4px; backdrop-filter: blur(16px); box-shadow: 0 8px 30px rgb(0 0 0 / 16%); font-family: var(--ruijun-font-cn); transition: top .58s cubic-bezier(.22, .8, .24, 1), right .58s cubic-bezier(.22, .8, .24, 1), left .58s cubic-bezier(.22, .8, .24, 1), padding .58s cubic-bezier(.22, .8, .24, 1), border-radius .4s ease; }
.site-header.is-wide { top: 0; right: 0; left: 0; padding-right: 6.2%; padding-left: 6.2%; border-right: 0; border-left: 0; border-radius: 0; }
.brand { flex: 0 0 auto; display: block; }
.brand img { width: auto; height: 44px; object-fit: contain; }
nav { display: flex; align-items: center; gap: clamp(18px, 2vw, 32px); }
nav a { position: relative; color: rgb(255 255 255 / 76%); font-size: clamp(12px, .88vw, 17px); font-weight: 400; line-height: 1.25; text-decoration: none; white-space: nowrap; }
nav > a:not(.contact-button)::after { content: ""; position: absolute; right: 50%; bottom: -20px; left: 50%; height: 2px; background: var(--ruijun-red); transition: right .25s ease, left .25s ease; }
nav > a:hover::after, nav > a.router-link-active::after { right: 0; left: 0; }
nav a.router-link-active, nav a:hover { color: #fff; }
.lang-switch, .menu-toggle { border: 0; cursor: pointer; }
.lang-switch { min-width: 32px; height: 26px; padding: 0; color: #fff; background: #4a4d51; border-radius: 2px; font-size: 10px; }
.contact-button { min-height: 34px; padding: 7px 14px; color: #fff !important; background: var(--ruijun-red); border-radius: 2px; font-size: 11px; font-weight: 600; }
.contact-button::after { display: none; }
.menu-toggle { display: none; color: #fff; background: transparent; font-size: 22px; }
@media (max-width: 920px) and (min-width: 761px) { nav { gap: 14px; } nav a { font-size: 11px; } .brand img { height: 38px; } }
@media (max-width: 760px) {
  .site-header { position: relative; top: 0; right: 0; left: 0; min-height: 58px; padding: 0 14px; border-right: 0; border-left: 0; border-radius: 0; }
  .brand img { width: auto; height: 36px; }
  .menu-toggle { width: 42px; height: 42px; display: grid; place-items: center; padding: 0; }
  nav { position: absolute; top: 58px; right: 0; left: 0; display: none; padding: 16px 20px 22px; flex-direction: column; align-items: stretch; gap: 0; background: rgb(18 18 19 / 97%); border-top: 1px solid rgb(255 255 255 / 12%); box-shadow: 0 20px 40px rgb(0 0 0 / 28%); }
  nav.open { display: flex; }
  nav a { min-height: 46px; display: flex; align-items: center; font-size: 14px; border-bottom: 1px solid rgb(255 255 255 / 10%); }
  nav > a::after { display: none; }
  .lang-switch { width: 42px; margin-top: 14px; }
  .contact-button { margin-top: 12px; justify-content: center; border-bottom: 0; }
}
@media (prefers-reduced-motion: reduce) { .site-header { transition: none; } }
</style>
