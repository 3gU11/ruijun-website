<script setup lang="ts">
type DownloadItem = { label: string; size: string };
type DownloadGroup = { title: string; items: DownloadItem[] };

const query = ref('');
const activeCategory = ref<'product' | 'machine' | 'software' | null>(null);
const { data: resourceResponse } = await useFetch('/api/public/v1/service-resources', {
  default: () => ({ data: [] as Array<Record<string, unknown>> })
});
const resources = computed(() => Array.isArray(resourceResponse.value?.data) ? resourceResponse.value.data : []);
const makeItems = (labels: string[], size: string) => labels.map(label => ({ label, size }));

const productGroups: DownloadGroup[] = [
  { title: 'FR-XS(Pro)', items: makeItems(['FR-XS400', 'FR-XS500', 'FR-XS600', 'FR-XS1055', 'FR-XS8055', 'FR-XS8050', 'FR-XS1080'], '5.38M') },
  { title: 'FR-XS(Auto)', items: makeItems(['FR-XS400', 'FR-XS500', 'FR-XS600', 'FR-XS1055', 'FR-XS8055', 'FR-XS8050'], '5.38M') },
  { title: 'FL-XS(Pro)', items: makeItems(['FL-XS860', 'FL-XS1100', 'FL-XS1390', 'FL-XS1610'], '5.38M') },
  { title: 'FT-XS(Pro)', items: makeItems(['FT-XS400', 'FT-XS500', 'FT-XS600', 'FT-XS1055'], '5.38M') },
  { title: 'FR-Y', items: makeItems(['FY-XS8060', 'FR-Y1080'], '5.38M') },
  { title: 'FR-G', items: makeItems(['FR-400G', 'FR-500G', 'FR-600G', 'FR-7055G'], '5.38M') },
  { title: 'FH-C', items: makeItems(['FH-250C', 'FH-300C'], '5.38M') }
];
const machineGroups: DownloadGroup[] = [{ title: '机床说明书', items: makeItems(['FR-XS(Pro)说明书', 'FR-XS(Auto)说明书', 'FR-G说明书', 'FL-XS说明书'], '10.38M') }];
const softwareGroups: DownloadGroup[] = [{ title: '系统软件', items: makeItems(['瑞钧3.0', '瑞钧2.0', 'AUTOCAD'], '10.38M') }];

function visibleGroups(groups: DownloadGroup[]) {
  const keyword = query.value.trim().toLowerCase();
  return groups.map(group => ({ ...group, items: group.items.filter(item => !keyword || item.label.toLowerCase().includes(keyword)) })).filter(group => group.items.length);
}
function resourceUrl(item: DownloadItem) {
  const match = resources.value.find(resource => Array.isArray(resource.applicable_models) && resource.applicable_models.map(String).includes(item.label));
  const value = String(match?.asset || '').trim();
  return value.startsWith('/') || /^https?:\/\//i.test(value) ? value : '';
}
function scrollToSection(id: string) {
  activeCategory.value = id === 'product-guides' ? 'product' : id === 'machine-manuals' ? 'machine' : 'software';
}

useSeoMeta({ title: '资料下载 | 瑞钧智科', description: '瑞钧智科产品技术手册、机床说明书与系统软件资料下载。' });
</script>

<template>
  <main class="download-page" :class="activeCategory ? `is-${activeCategory}` : ''">
    <SiteHeader />
    <button v-if="activeCategory" type="button" class="download-modal-close" aria-label="Close downloads" @click="activeCategory = null">&times;</button>
    <section class="download-intro" aria-labelledby="download-title">
      <div class="download-shell">
        <p class="download-eyebrow">SERVICE SUPPORT / DOWNLOADS</p>
        <h1 id="download-title">资料下载</h1>
        <nav class="download-page-switcher" aria-label="服务支持子页面">
          <NuxtLink to="/service">技术支持</NuxtLink>
          <NuxtLink to="/service/download">资料下载</NuxtLink>
        </nav>
        <label class="download-search"><span class="sr-only">搜索资料型号</span><input v-model="query" type="search" placeholder="搜索机型或资料名称"><span aria-hidden="true">⌕</span></label>
        <nav class="download-category-nav" aria-label="资料分类">
          <button type="button" @click="scrollToSection('product-guides')"><span class="category-icon category-icon--manual" aria-hidden="true"></span>产品技术手册</button>
          <button type="button" @click="scrollToSection('machine-manuals')"><span class="category-icon category-icon--machine" aria-hidden="true"></span>机床说明书</button>
          <button type="button" @click="scrollToSection('system-software')"><span class="category-icon category-icon--software" aria-hidden="true"></span>系统软件</button>
        </nav>
      </div>
    </section>

    <section id="product-guides" class="download-section" aria-labelledby="product-guides-title"><div class="download-shell"><h2 id="product-guides-title">产品技术手册</h2><div v-for="group in visibleGroups(productGroups)" :key="group.title" class="download-group"><h3>{{ group.title }}</h3><ul><li v-for="item in group.items" :key="item.label"><span class="download-model">{{ item.label }}</span><span class="download-size">{{ item.size }}</span><a v-if="resourceUrl(item)" class="download-control" :href="resourceUrl(item)" target="_blank" rel="noopener" :aria-label="`下载 ${item.label}`">⇩</a><span v-else class="download-control is-unavailable" :title="`${item.label} 暂无可下载文件`" aria-hidden="true">⇩</span></li></ul></div><p v-if="!visibleGroups(productGroups).length" class="download-empty">没有匹配的产品资料。</p></div></section>
    <section id="machine-manuals" class="download-section" aria-labelledby="machine-manuals-title"><div class="download-shell"><h2 id="machine-manuals-title">机床说明书</h2><div v-for="group in visibleGroups(machineGroups)" :key="group.title" class="download-group"><ul><li v-for="item in group.items" :key="item.label"><span class="download-model">{{ item.label }}</span><span class="download-size">{{ item.size }}</span><a v-if="resourceUrl(item)" class="download-control" :href="resourceUrl(item)" target="_blank" rel="noopener" :aria-label="`下载 ${item.label}`">⇩</a><span v-else class="download-control is-unavailable" aria-hidden="true">⇩</span></li></ul></div></div></section>
    <section id="system-software" class="download-section download-section--last" aria-labelledby="system-software-title"><div class="download-shell"><h2 id="system-software-title">系统软件</h2><div v-for="group in visibleGroups(softwareGroups)" :key="group.title" class="download-group"><ul><li v-for="item in group.items" :key="item.label"><span class="download-model">{{ item.label }}</span><span class="download-size">{{ item.size }}</span><a v-if="resourceUrl(item)" class="download-control" :href="resourceUrl(item)" target="_blank" rel="noopener" :aria-label="`下载 ${item.label}`">⇩</a><span v-else class="download-control is-unavailable" aria-hidden="true">⇩</span></li></ul></div></div></section>
    <SiteFooter variant="full" home-psd />
  </main>
</template>

<style scoped>
.download-page{min-height:100vh;background:#f4f4f3;color:#222326}.download-shell{width:min(1280px,78vw);margin:0 auto}.download-intro{padding:150px 0 68px}.download-eyebrow{margin:0 0 14px;color:#d31d27;font:600 11px/1 var(--ruijun-font-latin);letter-spacing:.08em}.download-intro h1{margin:0;color:#242528;font-size:44px;font-weight:500;line-height:1.12}.download-page-switcher{display:flex;gap:26px;margin-top:20px}.download-page-switcher a{color:#727477;font-size:14px;text-decoration:none}.download-page-switcher a.router-link-exact-active{color:#e51b23}.download-search{width:min(450px,100%);height:44px;display:flex;align-items:center;gap:10px;margin-top:28px;padding:0 14px;border:1px solid #696b6d;border-radius:6px;background:rgb(255 255 255/.2)}.download-search input{min-width:0;flex:1;border:0;outline:0;background:transparent;color:#252629;font:inherit;font-size:14px}.download-search input::placeholder{color:#b0b1b3}.download-search span{color:#838588;font-size:19px}.download-category-nav{display:flex;gap:46px;margin-top:58px}.download-category-nav button{width:184px;height:54px;display:flex;align-items:center;justify-content:space-between;padding:0 18px;border:0;border-radius:4px;color:#fff;background:linear-gradient(118deg,#262626,#4d4d4d);font:500 15px var(--ruijun-font-cn);cursor:pointer}.download-category-nav button:hover{background:#242528}.category-icon{position:relative;width:25px;height:25px;display:block;color:#d6c993}.category-icon::before,.category-icon::after{content:"";position:absolute}.category-icon--manual::before{inset:4px;border:1px solid currentColor;border-radius:3px}.category-icon--manual::after{top:0;right:0;width:9px;height:9px;border:1px solid currentColor;border-radius:50%;box-shadow:-9px 14px 0 -4px currentColor}.category-icon--machine::before{top:4px;left:8px;width:9px;height:17px;border:1px solid currentColor;border-radius:2px;box-shadow:-7px 7px 0 -3px currentColor}.category-icon--machine::after{right:1px;bottom:3px;width:12px;height:5px;border:1px solid currentColor;border-radius:50%}.category-icon--software::before{top:3px;left:9px;width:7px;height:18px;border:1px solid currentColor}.category-icon--software::after{top:0;left:5px;width:15px;height:5px;border:1px solid currentColor;border-radius:2px}.download-section{padding:0 0 42px;scroll-margin-top:92px}.download-section h2{margin:0 0 25px;font-size:23px;font-weight:500}.download-group{margin-top:21px}.download-group h3{margin:0 0 9px;color:#404144;font-size:14px;font-weight:500}.download-group ul{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:0;margin:0;padding:13px 24px;border:1px solid #d2d3d3;border-radius:3px;list-style:none}.download-group li{min-width:0;min-height:40px;display:flex;align-items:center;gap:10px}.download-model{min-width:96px;padding:6px 10px;border-radius:4px;color:#4a3b1b;background:#f6b500;font:500 13px/1.1 var(--ruijun-font-latin);text-align:center;white-space:nowrap}.download-size{color:#515254;font:13px var(--ruijun-font-latin);white-space:nowrap}.download-control{width:22px;height:24px;display:grid;place-items:center;color:#e8898e;font-size:21px;line-height:1;text-decoration:none}.download-control:not(.is-unavailable):hover{color:#d91d28}.is-unavailable{opacity:.38}.download-section--last{padding-bottom:100px}.download-empty{margin:0;color:#76787b;font-size:14px}@media(max-width:900px){.download-shell{width:min(100% - 44px,680px)}.download-intro{padding:98px 0 52px}.download-intro h1{font-size:35px}.download-category-nav{display:grid;grid-template-columns:1fr;gap:12px;margin-top:40px}.download-category-nav button{width:100%}.download-group ul{grid-template-columns:repeat(2,minmax(0,1fr));padding:12px}.download-group li{gap:7px}.download-model{min-width:0;padding:6px 8px;font-size:12px}.download-size{font-size:12px}.download-section{padding-bottom:34px}.download-section--last{padding-bottom:66px}}@media(max-width:520px){.download-group ul{grid-template-columns:1fr}.download-page-switcher{gap:18px}}
.download-page-switcher{display:none}
.download-section{display:none}.download-page.is-product #product-guides,.download-page.is-machine #machine-manuals,.download-page.is-software #system-software{position:fixed;z-index:200;inset:0;display:block;overflow:auto;padding:120px 0 90px;background:#f4f4f3}.download-modal-close{position:fixed;z-index:220;top:28px;right:32px;width:38px;height:38px;border:1px solid #707276;border-radius:50%;color:#35363a;background:#fff;font-size:25px;line-height:1;cursor:pointer}.download-modal-close:hover{color:#fff;background:#e51b23;border-color:#e51b23}
</style>
