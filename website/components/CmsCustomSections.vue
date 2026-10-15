<script setup lang="ts">
import { resolvePageSection } from '~/shared/page-sections.mjs';
import { registeredPageSectionInstances } from '~/shared/page-section-registry.mjs';
import { getDataListSource, resolveDataListItems } from '~/shared/page-section-sources.mjs';
import { fieldPresentationAttributes, sectionPresentationAttributes } from '~/shared/section-presentation.mjs';

// Renders every registered custom block for a page, in stored order.
//
// Shared by all editable pages so adding a block type means adding one branch
// here instead of copy-pasting the markup into every page file. A type with no
// branch simply renders nothing — the registry still validates and stores it.
const props = defineProps<{
  page: Record<string, any> | null;
  pageSlug: string;
  visualEditMode?: boolean;
}>();

const customSections = computed(() => registeredPageSectionInstances(props.page, props.pageSlug, { includeDisabled: Boolean(props.visualEditMode) })
  .map((section: any) => resolvePageSection(props.page, section.id, {})));

// Only the sources actually referenced by this page are fetched, so a page with
// no data-list block issues no extra requests. A stable string signature keeps
// the watcher from re-firing on every recompute.
const neededSourceSignature = computed(() => [...new Set(customSections.value
  .filter((section: any) => section.type === 'data-list' && section.source)
  .map((section: any) => String(section.source)))].sort().join(','));

const { data: dataListRecords } = await useAsyncData(
  `cms-data-list-${props.pageSlug}`,
  async () => {
    const keys = neededSourceSignature.value ? neededSourceSignature.value.split(',') : [];
    const resolved: Record<string, any[]> = {};
    await Promise.all(keys.map(async (key) => {
      const source = getDataListSource(key);
      if (!source) return;
      try {
        const response: any = await $fetch(source.endpoint);
        resolved[key] = Array.isArray(response?.data) ? response.data : [];
      } catch {
        // A source that fails to load renders as empty rather than breaking the page.
        resolved[key] = [];
      }
    }));
    return resolved;
  },
  { watch: [neededSourceSignature], default: () => ({}) }
);

function dataListItems(section: any) {
  const records = dataListRecords.value?.[String(section?.source || '')];
  return resolveDataListItems(section?.source, records, section?.limit);
}
</script>

<template>
  <template v-for="section in customSections" :key="section.id">
    <section v-if="section.type === 'rich-text' && (visualEditMode || section.kicker || section.title || section.body)" class="cms-custom-rich-text" v-bind="sectionPresentationAttributes(section)" aria-label="补充图文区块">
      <div class="section-inner">
        <p v-if="section.kicker" class="cms-custom-rich-text-kicker" v-bind="fieldPresentationAttributes(section, 'kicker')" data-cms-preview-field="kicker" data-cms-preview-field-path="kicker" data-cms-preview-position-field-path="field_presentation.kicker">{{ section.kicker }}</p>
        <h2 class="cms-styled-text" :data-placeholder="visualEditMode && !section.title ? '添加区块标题' : undefined" v-bind="fieldPresentationAttributes(section, 'title')" data-cms-preview-field="title" data-cms-preview-field-path="title" data-cms-preview-position-field-path="field_presentation.title">{{ section.title }}</h2>
        <p class="cms-custom-rich-text-body" :data-placeholder="visualEditMode && !section.body ? '添加正文说明' : undefined" v-bind="fieldPresentationAttributes(section, 'body')" data-cms-preview-field="body" data-cms-preview-field-path="body" data-cms-preview-position-field-path="field_presentation.body">{{ section.body }}</p>
      </div>
    </section>

    <section v-else-if="section.type === 'image' && (visualEditMode || section.media?.length || section.title || section.body)" class="cms-custom-image" v-bind="sectionPresentationAttributes(section)" aria-label="图片区块">
      <div class="section-inner">
        <h2 v-if="section.title || visualEditMode" class="cms-styled-text" :data-placeholder="visualEditMode && !section.title ? '添加区块标题' : undefined" v-bind="fieldPresentationAttributes(section, 'title')" data-cms-preview-field="title" data-cms-preview-field-path="title" data-cms-preview-position-field-path="field_presentation.title">{{ section.title }}</h2>
        <figure v-if="section.media?.length" class="cms-custom-image-figure" :data-cms-preview-key="section.id" data-cms-preview-media-role="image" data-cms-preview-media-field-path="media">
          <img :src="section.media[0].path" :alt="section.media[0].alt || section.title || '补充图片'">
        </figure>
        <p v-else-if="visualEditMode" class="cms-custom-placeholder">请在右侧属性面板添加图片素材</p>
        <p v-if="section.body || visualEditMode" class="cms-custom-image-body" :data-placeholder="visualEditMode && !section.body ? '添加图片说明' : undefined" v-bind="fieldPresentationAttributes(section, 'body')" data-cms-preview-field="body" data-cms-preview-field-path="body" data-cms-preview-position-field-path="field_presentation.body">{{ section.body }}</p>
      </div>
    </section>

    <section v-else-if="section.type === 'card-grid' && (visualEditMode || section.items?.length || section.title)" class="cms-custom-card-grid" v-bind="sectionPresentationAttributes(section)" aria-label="卡片列表区块">
      <div class="section-inner">
        <h2 v-if="section.title || visualEditMode" class="cms-styled-text" :data-placeholder="visualEditMode && !section.title ? '添加区块标题' : undefined" v-bind="fieldPresentationAttributes(section, 'title')" data-cms-preview-field="title" data-cms-preview-field-path="title" data-cms-preview-position-field-path="field_presentation.title">{{ section.title }}</h2>
        <div class="cms-custom-card-list" :class="`cms-variant-${section.variant || 'grid'}`">
          <article v-for="(card, cardIndex) in section.items" :key="cardIndex" class="cms-custom-card">
            <figure v-if="card.image" :data-cms-preview-key="section.id" :data-cms-preview-media-role="card.media_role || `card-${cardIndex + 1}`" :data-cms-preview-media-field-path="`media.${cardIndex}`">
              <img :src="card.image" :alt="card.alt || card.title || ''">
            </figure>
            <h3 data-cms-preview-field="items" :data-cms-preview-field-path="`items.${cardIndex}.title`">{{ card.title }}</h3>
            <p data-cms-preview-field="items" :data-cms-preview-field-path="`items.${cardIndex}.body`">{{ card.body }}</p>
          </article>
          <p v-if="visualEditMode && !section.items?.length" class="cms-custom-placeholder">请在右侧属性面板添加卡片</p>
        </div>
      </div>
    </section>

    <section v-else-if="section.type === 'data-list' && (visualEditMode || dataListItems(section).length)" class="cms-custom-data-list" v-bind="sectionPresentationAttributes(section)" aria-label="数据列表区块">
      <div class="section-inner">
        <h2 v-if="section.title || visualEditMode" class="cms-styled-text" :data-placeholder="visualEditMode && !section.title ? '添加区块标题' : undefined" v-bind="fieldPresentationAttributes(section, 'title')" data-cms-preview-field="title" data-cms-preview-field-path="title" data-cms-preview-position-field-path="field_presentation.title">{{ section.title }}</h2>
        <div class="cms-custom-data-grid" :class="`cms-variant-${section.variant || 'grid'}`" :style="{ '--cms-data-columns': String(section.columns || 3) }">
          <component :is="item.href ? 'a' : 'div'" v-for="(item, itemIndex) in dataListItems(section)" :key="itemIndex" class="cms-custom-data-card" :href="item.href || undefined">
            <figure v-if="item.image"><img :src="item.image" :alt="item.title" loading="lazy" decoding="async"></figure>
            <h3>{{ item.title }}</h3>
            <p v-if="item.body">{{ item.body }}</p>
          </component>
          <p v-if="visualEditMode && !dataListItems(section).length" class="cms-custom-placeholder">数据源暂无已发布内容，发布后会自动出现在这里</p>
        </div>
      </div>
    </section>

    <section v-else-if="section.type === 'faq' && (visualEditMode || section.items?.length || section.title)" class="cms-custom-faq" v-bind="sectionPresentationAttributes(section)" aria-label="常见问题区块">
      <div class="section-inner">
        <h2 v-if="section.title || visualEditMode" class="cms-styled-text" :data-placeholder="visualEditMode && !section.title ? '添加区块标题' : undefined" v-bind="fieldPresentationAttributes(section, 'title')" data-cms-preview-field="title" data-cms-preview-field-path="title" data-cms-preview-position-field-path="field_presentation.title">{{ section.title }}</h2>
        <div class="cms-custom-faq-list">
          <details v-for="(item, itemIndex) in section.items" :key="itemIndex" class="cms-custom-faq-item">
            <summary data-cms-preview-field="items" :data-cms-preview-field-path="`items.${itemIndex}.title`">{{ item.title }}</summary>
            <p data-cms-preview-field="items" :data-cms-preview-field-path="`items.${itemIndex}.body`">{{ item.body }}</p>
          </details>
          <p v-if="visualEditMode && !section.items?.length" class="cms-custom-placeholder">请在右侧属性面板添加问答</p>
        </div>
      </div>
    </section>

    <section v-else-if="section.type === 'timeline' && (visualEditMode || section.items?.length || section.title)" class="cms-custom-timeline" v-bind="sectionPresentationAttributes(section)" aria-label="时间轴区块">
      <div class="section-inner">
        <h2 v-if="section.title || visualEditMode" class="cms-styled-text" :data-placeholder="visualEditMode && !section.title ? '添加区块标题' : undefined" v-bind="fieldPresentationAttributes(section, 'title')" data-cms-preview-field="title" data-cms-preview-field-path="title" data-cms-preview-position-field-path="field_presentation.title">{{ section.title }}</h2>
        <ol class="cms-custom-timeline-list">
          <li v-for="(item, itemIndex) in section.items" :key="itemIndex" class="cms-custom-timeline-item">
            <span v-if="item.label" class="cms-custom-timeline-year" data-cms-preview-field="items" :data-cms-preview-field-path="`items.${itemIndex}.label`">{{ item.label }}</span>
            <h3 data-cms-preview-field="items" :data-cms-preview-field-path="`items.${itemIndex}.title`">{{ item.title }}</h3>
            <p v-if="item.body" data-cms-preview-field="items" :data-cms-preview-field-path="`items.${itemIndex}.body`">{{ item.body }}</p>
          </li>
          <li v-if="visualEditMode && !section.items?.length" class="cms-custom-placeholder">请在右侧属性面板添加节点</li>
        </ol>
      </div>
    </section>

    <section v-else-if="section.type === 'stats' && (visualEditMode || section.items?.length || section.title)" class="cms-custom-stats" v-bind="sectionPresentationAttributes(section)" aria-label="数据指标区块">
      <div class="section-inner">
        <h2 v-if="section.title || visualEditMode" class="cms-styled-text" :data-placeholder="visualEditMode && !section.title ? '添加区块标题' : undefined" v-bind="fieldPresentationAttributes(section, 'title')" data-cms-preview-field="title" data-cms-preview-field-path="title" data-cms-preview-position-field-path="field_presentation.title">{{ section.title }}</h2>
        <dl class="cms-custom-stats-list">
          <div v-for="(item, itemIndex) in section.items" :key="itemIndex" class="cms-custom-stat">
            <dt data-cms-preview-field="items" :data-cms-preview-field-path="`items.${itemIndex}.value`">{{ item.value }}</dt>
            <dd data-cms-preview-field="items" :data-cms-preview-field-path="`items.${itemIndex}.label`">{{ item.label }}</dd>
          </div>
        </dl>
        <p v-if="visualEditMode && !section.items?.length" class="cms-custom-placeholder">请在右侧属性面板添加指标</p>
      </div>
    </section>
  </template>
</template>

<style scoped>
.cms-custom-rich-text{padding:clamp(64px,8vw,128px) 6.2%;background:#f6f6f4;color:#18191c}
.cms-custom-rich-text-kicker{margin:0 0 14px;color:var(--ruijun-red);font-size:12px;letter-spacing:.08em}
.cms-custom-rich-text h2{min-height:1.1em;margin:0;font-size:clamp(34px,4vw,58px);line-height:1.12;font-weight:500}
.cms-custom-rich-text-body{min-height:1.6em;max-width:760px;margin:22px 0 0;color:#666a6d;font-size:16px;line-height:1.8;white-space:pre-line}
.cms-custom-rich-text h2:empty::before,.cms-custom-rich-text-body:empty::before{content:attr(data-placeholder);color:#929598;font-weight:400}
.cms-custom-image{padding:clamp(64px,8vw,128px) 6.2%;background:#fff;color:#18191c}
.cms-custom-image h2{min-height:1.1em;margin:0 0 28px;font-size:clamp(30px,3.4vw,50px);line-height:1.14;font-weight:500}
.cms-custom-image-figure{max-width:1080px;margin:0;overflow:hidden;border-radius:6px;background:#f1f1ef}
.cms-custom-image-figure img{display:block;width:100%;height:auto}
.cms-custom-image-body{min-height:1.6em;max-width:760px;margin:22px 0 0;color:#666a6d;font-size:16px;line-height:1.8;white-space:pre-line}
.cms-custom-image h2:empty::before,.cms-custom-image-body:empty::before{content:attr(data-placeholder);color:#929598;font-weight:400}
.cms-custom-card-grid{padding:clamp(64px,8vw,128px) 6.2%;background:#f6f6f4;color:#18191c}
.cms-custom-card-grid h2{min-height:1.1em;margin:0 0 34px;font-size:clamp(30px,3.4vw,50px);line-height:1.14;font-weight:500}
.cms-custom-card-grid h2:empty::before{content:attr(data-placeholder);color:#929598;font-weight:400}
.cms-custom-card-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:24px}
.cms-custom-card{display:grid;align-content:start;gap:12px;border:1px solid #e3e3df;border-radius:6px;background:#fff;padding:22px}
.cms-custom-card figure{margin:0;overflow:hidden;border-radius:4px;background:#f1f1ef}
.cms-custom-card img{display:block;width:100%;height:auto}
.cms-custom-card h3{margin:0;font-size:19px;line-height:1.3;font-weight:500}
.cms-custom-card p{margin:0;color:#666a6d;font-size:14px;line-height:1.7;white-space:pre-line}
.cms-custom-placeholder{margin:0;border:1px dashed #c9c9c4;border-radius:6px;padding:28px;color:#929598;font-size:14px;text-align:center}
.cms-custom-data-list{padding:clamp(64px,8vw,128px) 6.2%;background:#fff;color:#18191c}
.cms-custom-data-list h2{min-height:1.1em;margin:0 0 34px;font-size:clamp(30px,3.4vw,50px);line-height:1.14;font-weight:500}
.cms-custom-data-list h2:empty::before{content:attr(data-placeholder);color:#929598;font-weight:400}
.cms-custom-data-grid{display:grid;grid-template-columns:repeat(var(--cms-data-columns,3),minmax(0,1fr));gap:24px}
.cms-custom-data-card{display:grid;align-content:start;gap:12px;border:1px solid #e3e3df;border-radius:6px;background:#f6f6f4;color:inherit;padding:22px;text-decoration:none}
.cms-custom-data-card:hover{border-color:var(--ruijun-red)}
.cms-custom-data-card figure{margin:0;overflow:hidden;border-radius:4px;background:#ececea}
.cms-custom-data-card img{display:block;width:100%;height:auto}
.cms-custom-data-card h3{margin:0;font-size:19px;line-height:1.3;font-weight:500}
.cms-custom-data-card p{margin:0;color:#666a6d;font-size:14px;line-height:1.7;white-space:pre-line}
.cms-custom-card-list.cms-variant-list{grid-template-columns:1fr}
.cms-custom-data-grid.cms-variant-list{grid-template-columns:1fr}
.cms-custom-data-grid.cms-variant-compact{gap:14px}
.cms-custom-data-grid.cms-variant-compact .cms-custom-data-card{gap:8px;padding:14px}
.cms-custom-data-grid.cms-variant-compact .cms-custom-data-card h3{font-size:16px}
.cms-custom-data-grid.cms-variant-compact .cms-custom-data-card p{font-size:13px}
.cms-custom-faq,.cms-custom-timeline,.cms-custom-stats{padding:clamp(64px,8vw,128px) 6.2%;color:#18191c}
.cms-custom-faq{background:#f6f6f4}
.cms-custom-timeline{background:#fff}
.cms-custom-stats{background:#121212;color:#fff}
.cms-custom-faq h2,.cms-custom-timeline h2,.cms-custom-stats h2{min-height:1.1em;margin:0 0 34px;font-size:clamp(30px,3.4vw,50px);line-height:1.14;font-weight:500}
.cms-custom-faq h2:empty::before,.cms-custom-timeline h2:empty::before,.cms-custom-stats h2:empty::before{content:attr(data-placeholder);color:#929598;font-weight:400}
.cms-custom-faq-list{display:grid;gap:10px;max-width:900px}
.cms-custom-faq-item{border:1px solid #e3e3df;border-radius:6px;background:#fff;padding:16px 20px}
.cms-custom-faq-item summary{cursor:pointer;font-size:17px;font-weight:500;line-height:1.5}
.cms-custom-faq-item p{margin:12px 0 0;color:#666a6d;font-size:15px;line-height:1.8;white-space:pre-line}
.cms-custom-timeline-list{margin:0;padding:0;list-style:none;border-left:2px solid #e3e3df}
.cms-custom-timeline-item{position:relative;padding:0 0 30px 26px}
.cms-custom-timeline-item::before{content:"";position:absolute;left:-7px;top:6px;width:12px;height:12px;border-radius:50%;background:var(--ruijun-red)}
.cms-custom-timeline-year{display:block;margin-bottom:6px;color:var(--ruijun-red);font:600 13px ui-monospace,monospace;letter-spacing:.06em}
.cms-custom-timeline-item h3{margin:0;font-size:19px;line-height:1.35;font-weight:500}
.cms-custom-timeline-item p{margin:8px 0 0;max-width:760px;color:#666a6d;font-size:15px;line-height:1.8;white-space:pre-line}
.cms-custom-stats-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:28px;margin:0}
.cms-custom-stat dt{font-size:clamp(36px,4vw,54px);line-height:1.1;font-weight:500;color:var(--ruijun-red)}
.cms-custom-stat dd{margin:8px 0 0;color:#ffffffb3;font-size:14px;line-height:1.6}
.cms-custom-stats .cms-custom-placeholder{border-color:#4a4a4a;color:#929598}
@media(max-width:760px){.cms-custom-rich-text,.cms-custom-image,.cms-custom-card-grid,.cms-custom-data-list,.cms-custom-faq,.cms-custom-timeline,.cms-custom-stats{padding:56px 20px}.cms-custom-rich-text h2,.cms-custom-image h2,.cms-custom-card-grid h2,.cms-custom-data-list h2,.cms-custom-faq h2,.cms-custom-timeline h2,.cms-custom-stats h2{font-size:30px}.cms-custom-rich-text-body{font-size:14px}.cms-custom-data-grid{grid-template-columns:1fr}}
</style>
