<script setup lang="ts">
import { resolvePageSection } from '~/shared/page-sections.mjs';
import { fieldPresentationAttributes, sectionPresentationAttributes } from '~/shared/section-presentation.mjs';

type Resource = { id?: string | number; source_key: string; type: string; title: string; summary?: string; version?: string; asset?: string | null; path?: string | null; url?: string | null; applicable_models?: string[] };

// Public resources normally expose `asset`; an authenticated CMS preview
// overlays private files as `path`. Keep the template independent from that
// transport detail so draft downloads never fall back to a missing/unsafe URL.
function serviceResourceUrl(resource: Resource) {
  return String(resource?.path || resource?.asset || resource?.url || '').trim();
}

function serviceResourceDownloadName(resource: Resource) {
  const url = serviceResourceUrl(resource);
  const type = String(resource?.type || '').trim().toLowerCase();
  if (!url || type === 'video') return undefined;
  return String(resource?.title || '').trim() || undefined;
}

const query = ref('');
const activeCategory = ref<'product' | 'machine' | 'software'>('product');
const { data: resourceResponse } = await useFetch('/api/public/v1/service-resources', { default: () => ({ data: [] as Resource[] }) });
const { data: servicePageResponse } = await useFetch('/api/public/v1/pages/service', { default: () => ({ data: null as Record<string, any> | null }) });
const { overlayList, recordFor } = useCmsDraftPreview();
const resources = computed<Resource[]>(() => overlayList('service_resources', Array.isArray(resourceResponse.value?.data) ? resourceResponse.value.data as Resource[] : []));
const servicePage = computed(() => overlayList('pages', servicePageResponse.value?.data || null, (draft: any) => draft.slug === 'service'));
const downloadContent = computed(() => {
  const sections = Array.isArray(servicePage.value?.sections) ? servicePage.value.sections : [];
  const section = sections.find((candidate: any) => candidate?.id === 'download' || candidate?.id === 'service-download' || candidate?.section_key === 'service.download');
  return section ? resolvePageSection(servicePage.value, String(section.id || 'download'), section) : {};
});
const categoryMediaRoles = { product: ['category-product', 'product-icon', 'download-product'], machine: ['category-machine', 'machine-icon', 'download-machine'], software: ['category-software', 'software-icon', 'download-software'] } as const;
const categoryDefinitions = [
  { key: 'product' as const, label: '产品技术手册', icon: '/assets/service-action-5.png' },
  { key: 'machine' as const, label: '机床说明书', icon: '/assets/service-action-6.png' },
  { key: 'software' as const, label: '系统软件', icon: '/assets/service-action-3.png' }
];
const categories = computed(() => categoryDefinitions.map((category) => {
  const media = Array.isArray(downloadContent.value?.media) ? downloadContent.value.media : [];
  const mediaIndex = media.findIndex((entry: any) => categoryMediaRoles[category.key].includes(String(entry?.role || '').trim().toLowerCase()) && String(entry?.path || '').trim());
  const mediaEntry = mediaIndex >= 0 ? media[mediaIndex] : null;
  return {
    ...category,
    label: String(downloadContent.value?.categories?.[category.key] || category.label),
    fieldPath: `categories.${category.key}`,
    icon: String(mediaEntry?.path || category.icon),
    iconFieldPath: mediaIndex >= 0 ? `media.${mediaIndex}` : ''
  };
}));
const categoryTypes = {
  product: ['product_manual', 'product', 'technical_package'],
  machine: ['machine_manual', 'manual'],
  software: ['software']
} as const;
const visibleResources = computed(() => {
  const keyword = query.value.trim().toLowerCase();
  return resources.value.filter((item) => String(item.title || '').trim() && serviceResourceUrl(item))
    .filter((item) => categoryTypes[activeCategory.value].includes(item.type as never))
    .filter((item) => !keyword || [item.title, item.version, ...(item.applicable_models || [])].join(' ').toLowerCase().includes(keyword));
});
const sectionTitle = computed(() => categories.value.find(item => item.key === activeCategory.value)?.label || '产品技术手册');
const pageTitle = computed(() => String(downloadContent.value?.title || '资料下载'));
const searchPlaceholder = computed(() => String(downloadContent.value?.search_placeholder || '搜索机型或具体型号'));
const emptyLabel = computed(() => String(downloadContent.value?.empty_label || '暂无已发布资料。'));
const backLabel = computed(() => String(downloadContent.value?.back_label || '返回服务支持'));
onMounted(() => {
  const type = String(recordFor('service_resources')?.type || '');
  if (categoryTypes.machine.includes(type as never)) activeCategory.value = 'machine';
  if (categoryTypes.software.includes(type as never)) activeCategory.value = 'software';
});
useSeoMeta({ title: '技术文件下载 | 瑞钧智科', description: '瑞钧智科产品技术手册、机床说明书与系统软件下载。' });
</script>

<template>
  <main class="download-page">
    <SiteHeader />
    <section class="download-content" v-bind="sectionPresentationAttributes(downloadContent)" data-cms-preview-key="download">
      <div class="download-shell">
        <h1 v-bind="fieldPresentationAttributes(downloadContent, 'title')" data-cms-preview-field="title" data-cms-preview-field-path="title" data-cms-preview-position-field-path="field_presentation.title">{{ pageTitle }}</h1>
        <label class="download-search"><span class="sr-only" data-cms-preview-field-path="search_placeholder">{{ searchPlaceholder }}</span><input v-model="query" type="search" :placeholder="searchPlaceholder" data-cms-preview-field-path="search_placeholder"></label>
        <nav class="download-categories" aria-label="资料分类">
          <button v-for="category in categories" :key="category.key" type="button" :class="{ 'is-active': activeCategory === category.key }" @click="activeCategory = category.key">
            <span :data-cms-preview-field-path="category.fieldPath">{{ category.label }}</span><img :src="category.icon" alt="" :data-cms-preview-field-path="category.iconFieldPath || undefined" data-cms-preview-placement-key="service.download.category.icon" data-cms-preview-media-role="icon">
          </button>
        </nav>
        <section id="service-download-list" class="download-list">
          <h2 :data-cms-preview-field-path="`categories.${activeCategory}`">{{ sectionTitle }}</h2>
          <div class="download-group">
            <ul v-if="visibleResources.length">
              <li v-for="item in visibleResources" :key="item.source_key || item.title" :data-cms-preview-key="item.source_key" data-cms-preview-collection="service_resources" :data-cms-preview-item-id="item.id || undefined">
                <b data-cms-preview-field-path="title">{{ item.title }}</b><span v-if="item.version" data-cms-preview-field-path="version">{{ item.version }}</span><span v-else data-cms-preview-field-path="applicable_models">{{ item.applicable_models?.join(' / ') || '' }}</span>
                <a :href="serviceResourceUrl(item)" :download="serviceResourceDownloadName(item)" :target="serviceResourceUrl(item).startsWith('https://') ? '_blank' : undefined" :rel="serviceResourceUrl(item).startsWith('https://') ? 'noreferrer' : undefined" :aria-label="`下载 ${item.title}`">↓</a>
              </li>
            </ul>
          </div>
          <p v-if="!visibleResources.length" class="download-empty" data-cms-preview-field-path="empty_label">{{ emptyLabel }}</p>
        </section>
        <NuxtLink class="download-back" to="/service">
          <span data-cms-preview-field-path="back_label">{{ backLabel }}</span>
          <span aria-hidden="true">→</span>
        </NuxtLink>
      </div>
    </section>
    <SiteFooter variant="full" home-psd />
  </main>
</template>

<style scoped>
.download-page{min-height:100vh;background:#f1f1f0;color:#252628}.download-shell{width:min(78vw,2820px);margin:0 auto}.download-content{padding:154px 0 110px}.download-content h1{margin:0;font-size:clamp(38px,3vw,58px);font-weight:500}.download-search{width:min(420px,100%);height:46px;display:block;margin-top:34px}.download-search input{width:100%;height:100%;padding:0 18px;border:1px solid #77797b;border-radius:5px;outline:0;background:transparent;font-size:14px}.download-search input:focus{border-color:#d8202a}.download-categories{display:flex;gap:5%;margin:58px 0 72px}.download-categories button{width:min(238px,28%);height:78px;display:flex;align-items:center;justify-content:space-between;padding:0 24px;border:0;border-radius:4px;background:#3b3c3c;color:#fff;cursor:pointer}.download-categories button:hover,.download-categories button.is-active{background:#272829}.download-categories img{width:44px;height:44px;object-fit:contain}.download-list h2{margin:0 0 32px;font-size:26px;font-weight:500}.download-group{margin:0 0 28px}.download-group h3{margin:0 0 12px;font-size:14px;font-weight:500}.download-group ul{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:0;margin:0;padding:18px 24px;border:1px solid #c8c9c8;border-radius:3px;list-style:none}.download-group li{min-width:0;display:flex;align-items:center;gap:10px;min-height:46px}.download-group b{min-width:118px;padding:8px 10px;border-radius:4px;background:#f3ae00;color:#3b3321;font-size:13px;font-weight:500;text-align:center;white-space:nowrap}.download-group span{font-size:12px;white-space:nowrap}.download-group a,.download-group i{width:22px;color:#dd6870;font-size:20px;font-style:normal;text-align:center;text-decoration:none}.download-group i{opacity:.34}.download-empty{color:#737577}.download-back{width:260px;height:56px;display:flex;align-items:center;justify-content:space-between;margin-top:72px;padding:0 22px;border-radius:3px;background:#343536;color:#fff;font-size:15px;font-weight:500;text-decoration:none;transition:background .2s ease}.download-back:hover,.download-back:focus-visible{background:#242526}.download-back:focus-visible{outline:2px solid #d8202a;outline-offset:3px}.download-back span:last-child{font-size:20px;font-weight:300;line-height:1}@media(max-width:900px){.download-shell{width:min(100% - 44px,720px)}.download-content{padding:110px 0 72px}.download-categories{display:grid;grid-template-columns:1fr;margin:42px 0 52px;gap:12px}.download-categories button{width:100%}.download-group ul{grid-template-columns:repeat(2,minmax(0,1fr));padding:12px}.download-group li{gap:7px}.download-group b{min-width:0;font-size:12px}.download-back{width:min(260px,100%);margin-top:52px}}@media(max-width:520px){.download-group ul{grid-template-columns:1fr}}
.download-content{padding-top:148px}.download-content h1{line-height:1.1}.download-search{margin-top:18px}.download-categories{margin-top:100px}@media(max-width:900px){.download-content{padding-top:110px}.download-categories{margin-top:42px}}
</style>
