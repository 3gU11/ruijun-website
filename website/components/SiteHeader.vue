<script setup lang="ts">
import { resolveNavigation } from '~/shared/site-navigation.mjs';
import { getHeaderLifecycle } from '~/shared/header-lifecycle.mjs';
const props = withDefaults(defineProps<{ homePsd?: boolean }>(), { homePsd: false });
const contactCta = { label: '获取选型建议', href: '/contact' };
const fallback = [{ label: '网站首页', href: '/' }, { label: '产品中心', href: '/product' }, { label: '先进智造', href: '/manufacturing' }, { label: '关于我们', href: '/about' }, { label: '服务支持', href: '/service' }];
const videoNewsNavigation = { label: '视频新闻', href: '/news' };
const { data } = await useFetch('/api/public/v1/navigation', { default: () => ({ data: null }) });
const settings = computed(() => data.value?.data || null);
const navigation = computed(() => {
  const items = resolveNavigation(settings.value, fallback).filter((item) => item.href !== '/resources');
  if (items.some((item) => item.href === videoNewsNavigation.href)) return items;
  const insertionIndex = items.findIndex((item) => item.href === '/about');
  return insertionIndex < 0
    ? [...items, videoNewsNavigation]
    : [...items.slice(0, insertionIndex), videoNewsNavigation, ...items.slice(insertionIndex)];
});
const headerElement = ref<HTMLElement>();
const isWide = ref(false);
const menuOpen = ref(false);
const route = useRoute();
const isHomeRoute = computed(() => route.path === '/');
const headerEntryRoutes = new Set(['/product', '/manufacturing', '/news', '/about', '/service']);
const isEntryWide = ref(headerEntryRoutes.has(route.path));
let entryWideTimer = 0;
const compactPanelSelectors: Record<string, string> = {
  '/': '.home-page .hero.lifecycle-panel',
  '/product': '.product-detail-page > .product-overview',
  '/manufacturing': '.manufacturing > .hero',
  '/about': '.about-story > .about-hero',
  '/service': '.service-page > .psd-service-hero',
  '/news': '.news-page > .news-hero'
};
const isCompactRoute = computed(() => Boolean(compactPanelSelectors[route.path]));
const homeNavigation = [
  { label: '网站主页', href: '/' },
  { label: '产品展示', href: '/product' },
  { label: '先进制造', href: '/manufacturing' },
  { label: '视频新闻', href: '/news' },
  { label: '关于瑞钧', href: '/about' },
  { label: '服务支持', href: '/service' }
];
const visibleNavigation = computed(() => props.homePsd && isHomeRoute.value ? homeNavigation : navigation.value);
const visibleHeaderCta = computed(() => contactCta);

function syncHomeHeaderState(event: Event) {
  if (!isHomeRoute.value) return;
  isWide.value = Boolean((event as CustomEvent<boolean>).detail);
}

function getCompactPanel() {
  const selector = compactPanelSelectors[route.path];
  return selector ? document.querySelector<HTMLElement>(selector) : null;
}

function syncCompactHeaderState() {
  if (!isCompactRoute.value || isHomeRoute.value) return;
  const panel = getCompactPanel();
  if (!panel) {
    isWide.value = false;
    return;
  }
  const rect = panel.getBoundingClientRect();
  const lifecycle = getHeaderLifecycle({
    scrollY: window.scrollY,
    firstPanelTop: rect.top + window.scrollY,
    firstPanelHeight: rect.height,
    headerHeight: headerElement.value?.offsetHeight || 0
  });
  isWide.value = lifecycle.isWide;
}

function resetRouteHeaderState() {
  menuOpen.value = false;
  isWide.value = !isCompactRoute.value;
  if (headerEntryRoutes.has(route.path)) startWideEntry();
  else isEntryWide.value = false;
  nextTick(syncHeaderState);
}

function startWideEntry() {
  window.clearTimeout(entryWideTimer);
  isEntryWide.value = true;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      entryWideTimer = window.setTimeout(() => { isEntryWide.value = false; }, 420);
    });
  });
}

function syncHeaderState() {
  if (isHomeRoute.value) return;
  if (isCompactRoute.value) {
    syncCompactHeaderState();
    return;
  }
  isWide.value = true;
}

onMounted(() => {
  syncHeaderState();
  if (headerEntryRoutes.has(route.path)) startWideEntry();
  window.addEventListener('ruijun:header-wide', syncHomeHeaderState);
  window.addEventListener('scroll', syncHeaderState, { passive: true });
  window.addEventListener('resize', syncHeaderState);
  window.addEventListener('keydown', dismissMenu);
});

onBeforeUnmount(() => {
  window.clearTimeout(entryWideTimer);
  window.removeEventListener('ruijun:header-wide', syncHomeHeaderState);
  window.removeEventListener('scroll', syncHeaderState);
  window.removeEventListener('resize', syncHeaderState);
  window.removeEventListener('keydown', dismissMenu);
});

watch(() => route.fullPath, resetRouteHeaderState);
function dismissMenu(event: KeyboardEvent) {
  if (event.key === 'Escape') menuOpen.value = false;
}
</script>
<template>
  <header ref="headerElement" class="site-header" :class="{ 'is-wide': !isCompactRoute || isWide, 'is-entry-wide': isEntryWide, 'is-entry-breathe': route.path === '/product' }">
    <NuxtLink class="brand" to="/" aria-label="返回瑞钧智科首页">
      <img src="/assets/ruijun-logo.png" alt="瑞钧智科 RUIJUN" width="184" height="54">
    </NuxtLink>
    <button class="menu-toggle" type="button" :aria-expanded="menuOpen" aria-controls="site-navigation" aria-label="打开主导航" @click="menuOpen = !menuOpen"><span aria-hidden="true">☰</span></button>
    <nav id="site-navigation" :class="{ open: menuOpen }" aria-label="主导航">
      <template v-for="item in visibleNavigation" :key="item.href">
        <div v-if="item.href === '/service'" class="service-nav-item">
          <NuxtLink :to="item.href">{{ item.label }}</NuxtLink>
          <div class="service-submenu" aria-label="服务支持子页面">
            <NuxtLink to="/service">技术支持</NuxtLink>
            <NuxtLink to="/service/download">资料下载</NuxtLink>
          </div>
        </div>
        <NuxtLink v-else :to="item.href">{{ item.label }}</NuxtLink>
      </template>
      <button class="lang-switch" type="button" title="英文版规划中" aria-label="切换语言">EN</button>
      <NuxtLink class="contact-button" :to="visibleHeaderCta.href">{{ visibleHeaderCta.label }} <span aria-hidden="true">→</span></NuxtLink>
    </nav>
  </header>
</template>

<style scoped>
.site-header { position: fixed; z-index: 120; top: 16px; right: max(4.8%, calc((100% - 1554px) / 2)); left: max(4.8%, calc((100% - 1554px) / 2)); min-height: 62px; padding: 0 16px 0 20px; display: flex; align-items: center; justify-content: space-between; color: #fff; background: rgb(28 29 30 / 62%); border: 1px solid rgb(255 255 255 / 16%); border-radius: 16px; backdrop-filter: blur(16px); box-shadow: 0 8px 30px rgb(0 0 0 / 16%); font-family: var(--ruijun-font-cn); transition: top 1.82s cubic-bezier(.22, .8, .24, 1), right 1.82s cubic-bezier(.22, .8, .24, 1), left 1.82s cubic-bezier(.22, .8, .24, 1), padding 1.82s cubic-bezier(.22, .8, .24, 1), border-radius 1.82s ease, opacity .3s ease, transform .3s ease; }
.site-header.is-hero-locked { top: 0; right: 0; left: 0; padding-right: 6.2%; padding-left: 6.2%; border-right: 0; border-left: 0; border-radius: 0; opacity: 0; pointer-events: none; transform: translateY(-22px); }
.site-header.is-hero-entered-wide { top: 0; right: 0; left: 0; padding-right: 6.2%; padding-left: 6.2%; border-right: 0; border-left: 0; border-radius: 0; }
.site-header.is-entry-wide { top: 0; right: 0; left: 0; padding-right: 6.2%; padding-left: 6.2%; border-right: 0; border-left: 0; border-radius: 0; }
@keyframes header-breathe{0%{transform:scale(.97);opacity:.84}45%{transform:scale(1.012);opacity:1}100%{transform:scale(1);opacity:1}}
.site-header.is-entry-breathe{animation:header-breathe 1.25s cubic-bezier(.22,.8,.24,1) both}
.site-header.is-wide { top: 0; right: 0; left: 0; padding-right: 6.2%; padding-left: 6.2%; border-right: 0; border-left: 0; border-radius: 0; }
.brand { flex: 0 0 auto; display: block; }
.brand img { width: auto; height: 44px; object-fit: contain; }
nav { display: flex; align-items: center; gap: clamp(18px, 2vw, 32px); }
nav a { position: relative; color: rgb(255 255 255 / 76%); font-size: clamp(12px, .88vw, 17px); font-weight: 400; line-height: 1.25; text-decoration: none; white-space: nowrap; }
nav > a:not(.contact-button)::after { content: ""; position: absolute; right: 50%; bottom: -20px; left: 50%; height: 2px; background: var(--ruijun-red); transition: right .25s ease, left .25s ease; }
nav > a:hover::after, nav > a.router-link-active::after { right: 0; left: 0; }
nav a.router-link-active, nav a:hover { color: #fff; }
.service-nav-item{position:relative}.service-nav-item>a{display:block}.service-nav-item>a::after{content:"";position:absolute;right:50%;bottom:-20px;left:50%;height:2px;background:var(--ruijun-red);transition:right .25s ease,left .25s ease}.service-nav-item:hover>a::after,.service-nav-item:focus-within>a::after,.service-nav-item>a.router-link-active::after{right:0;left:0}.service-submenu{position:absolute;top:calc(100% + 20px);left:50%;width:112px;display:grid;gap:2px;padding:8px;transform:translateX(-50%);background:rgb(18 19 20 / 94%);border:1px solid rgb(255 255 255 / 14%);box-shadow:0 12px 24px rgb(0 0 0 / 18%);opacity:0;visibility:hidden;transition:opacity .18s ease,visibility .18s ease}.service-nav-item:hover .service-submenu,.service-nav-item:focus-within .service-submenu{opacity:1;visibility:visible}.service-submenu a{min-height:30px;display:flex;align-items:center;padding:0 9px;color:rgb(255 255 255 / 74%);font-size:12px;border-radius:2px}.service-submenu a:hover,.service-submenu a.router-link-exact-active{color:#fff;background:#e51b23}
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
  .service-nav-item{width:100%}.service-nav-item>a{min-height:46px;display:flex;align-items:center;border-bottom:1px solid rgb(255 255 255 / 10%)}.service-submenu{position:static;width:auto;display:grid;margin:0;padding:0 0 0 16px;transform:none;background:transparent;border:0;box-shadow:none;opacity:1;visibility:visible}.service-submenu a{min-height:38px;font-size:13px}
  nav > a::after { display: none; }
  .lang-switch { width: 42px; margin-top: 14px; }
  .contact-button { margin-top: 12px; justify-content: center; border-bottom: 0; }
}
@media (prefers-reduced-motion: reduce) { .site-header { transition: none; } }
</style>
