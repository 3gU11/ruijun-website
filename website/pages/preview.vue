<script setup lang="ts">
type PreviewPayload = {
  collection: string;
  itemId: string;
  preview: Record<string, any>;
};

const { data: response, error } = await useFetch<{ data: PreviewPayload; expires_at: string }>('/api/preview/session', {
  default: () => ({ data: null as PreviewPayload | null, expires_at: '' })
});

const session = computed(() => response.value?.data || null);
const record = computed(() => session.value?.preview || null);
const collectionLabels: Record<string, string> = {
  pages: '官网页面', articles: '新闻文章', product_series: '产品系列', product_models: '产品型号',
  product_parameters: '技术参数', case_studies: '客户案例', manufacturing_evidence: '制造证据',
  qualifications: '资质证书', milestones: '发展历程', service_resources: '服务资料',
  service_locations: '服务网点', knowledge_items: 'FAQ 知识', external_service_entries: '售后入口', site_settings: '全站设置'
};
const collectionLabel = computed(() => collectionLabels[session.value?.collection || ''] || '内容草稿');
const title = computed(() => String(record.value?.title || record.value?.name || record.value?.question_title || record.value?.event || record.value?.process || '未命名内容'));
const sections = computed(() => Array.isArray(record.value?.sections) ? record.value.sections : []);
const parameters = computed(() => record.value?.parameters && typeof record.value.parameters === 'object' ? Object.entries(record.value.parameters) : []);
const expired = computed(() => Boolean(error.value));

async function closePreview() {
  await $fetch('/api/preview/session', { method: 'DELETE' }).catch(() => undefined);
  await navigateTo('/');
}

useSeoMeta({ title: () => `${title.value}｜草稿预览` });
</script>

<template>
  <main class="draft-preview-page">
    <header class="draft-preview-header">
      <div>
        <p class="preview-eyebrow">草稿预览 · 不会公开</p>
        <h1>{{ title }}</h1>
        <p class="preview-meta">{{ collectionLabel }} · 仅供内容审核使用</p>
      </div>
      <button type="button" @click="closePreview">退出预览</button>
    </header>

    <section v-if="expired" class="preview-empty" aria-live="polite">
      <p class="preview-eyebrow">预览已结束</p>
      <h2>预览会话不存在或已经过期</h2>
      <p>请回到 CMS 重新签发一个草稿预览。</p>
      <button type="button" @click="closePreview">返回官网</button>
    </section>

    <template v-else-if="record">
      <section v-if="record.summary" class="preview-lead"><p>{{ record.summary }}</p></section>
      <section v-if="sections.length" class="preview-sections" aria-label="页面段落">
        <article v-for="(section, index) in sections" :key="section.id || index" class="preview-section">
          <p v-if="section.kicker" class="preview-eyebrow">{{ section.kicker }}</p>
          <h2>{{ section.title || `段落 ${index + 1}` }}</h2>
          <p v-if="section.body" class="preview-body">{{ section.body }}</p>
          <span v-if="section.requires_claim_review" class="review-warning">该段内容仍需审核宣传主张</span>
        </article>
      </section>
      <article v-else-if="record.body" class="preview-article"><p class="preview-eyebrow">正文</p><div>{{ record.body }}</div></article>
      <section v-else-if="parameters.length" class="preview-parameters" aria-label="技术参数">
        <p class="preview-eyebrow">技术参数</p>
        <dl><template v-for="([key, value]) in parameters" :key="String(key)"><dt>{{ key }}</dt><dd>{{ String(value) }}</dd></template></dl>
      </section>
      <section v-else class="preview-record-summary"><p>这条草稿可以正常读取，具体字段将在正式页面模板中展示。</p></section>
    </template>
  </main>
</template>

<style scoped>
.draft-preview-page{min-height:100svh;padding:clamp(28px,6vw,92px) max(24px,7vw) 100px;background:#f2f2ef;color:#17191b;font-family:var(--ruijun-font-cn,Arial,"Microsoft YaHei",sans-serif)}
.draft-preview-header{display:flex;align-items:flex-start;justify-content:space-between;gap:32px;padding-bottom:48px;border-bottom:1px solid #cfd0cb}
.draft-preview-header h1{max-width:980px;margin:12px 0 0;font-size:clamp(38px,7vw,92px);font-weight:600;line-height:1.02;letter-spacing:0}
.preview-eyebrow{margin:0;color:#d51e27;font-size:12px;font-weight:700;letter-spacing:.08em}
.preview-meta{margin:18px 0 0;color:#767a7c;font-size:14px}
.draft-preview-header button,.preview-empty button{border:1px solid #17191b;padding:12px 18px;color:#17191b;background:transparent;cursor:pointer;font:inherit;white-space:nowrap}
.draft-preview-header button:hover,.preview-empty button:hover{color:#fff;background:#17191b}
.preview-lead{max-width:900px;padding:48px 0 10px;font-size:clamp(20px,2.5vw,32px);line-height:1.55}
.preview-sections{display:grid;gap:1px;margin-top:38px;background:#cfd0cb}
.preview-section{padding:34px clamp(20px,4vw,62px);background:#f2f2ef}.preview-section h2{margin:9px 0 0;font-size:clamp(26px,4vw,54px);line-height:1.12}.preview-body{max-width:850px;margin:20px 0 0;color:#45494d;font-size:18px;line-height:1.9;white-space:pre-wrap}.review-warning{display:inline-block;margin-top:20px;padding:7px 10px;color:#9e3a00;background:#fff0de;font-size:12px}
.preview-article{max-width:900px;padding-top:56px}.preview-article div{margin-top:22px;color:#45494d;font-size:18px;line-height:2;white-space:pre-wrap}.preview-parameters{max-width:860px;padding-top:56px}.preview-parameters dl{display:grid;grid-template-columns:1fr 1fr;gap:0 30px;margin-top:20px;border-top:1px solid #cfd0cb}.preview-parameters dt,.preview-parameters dd{margin:0;padding:14px 0;border-bottom:1px solid #cfd0cb}.preview-parameters dt{color:#767a7c}.preview-parameters dd{text-align:right}.preview-record-summary{padding:70px 0;color:#767a7c}.preview-empty{display:grid;place-items:start;gap:15px;min-height:65svh;padding-top:18vh}.preview-empty h2{margin:0;font-size:clamp(30px,5vw,60px);line-height:1.1}.preview-empty p:not(.preview-eyebrow){color:#5b6063;font-size:17px}
@media(max-width:680px){.draft-preview-header{display:grid;gap:24px}.draft-preview-header button{justify-self:start}.preview-parameters dl{grid-template-columns:1fr}.preview-parameters dd{text-align:left;padding-top:0;border-bottom:0}}
</style>

