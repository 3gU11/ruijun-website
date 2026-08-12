<template>
  <private-view title="官网运营总览">
    <div class="overview-page">
      <header class="toolbar">
        <div>
          <p class="eyebrow">官网运营</p>
          <h2>官网内容运营总览</h2>
          <p>集中查看内容状态、常见问题风险和发布前待处理项；所有操作仍回到对应工作台完成。</p>
        </div>
        <button type="button" :disabled="loading" @click="load">刷新</button>
      </header>

      <p v-if="error" class="message error" role="alert">{{ error }}</p>
      <p v-else-if="loading" class="message" role="status">正在读取运营摘要...</p>
      <template v-else>
        <section class="summary" aria-label="内容运营摘要">
          <div><span>内容记录</span><strong>{{ report.summary.total_records }}</strong></div>
          <div><span>待处理记录</span><strong class="attention">{{ report.summary.attention_records }}</strong></div>
          <div><span>已发布记录</span><strong>{{ report.summary.published_records }}</strong></div>
          <div><span>有待处理集合</span><strong>{{ report.summary.collections_with_attention }}</strong></div>
        </section>

        <section class="focus-grid" aria-label="重点审核摘要">
          <article class="focus-card">
          <div class="card-heading"><div><p class="eyebrow">常见问题治理</p><h3>常见问题知识风险</h3></div><a href="/admin/ruijun-knowledge-review-workbench">打开审核</a></div>
            <dl class="stats"><div><dt>总数</dt><dd>{{ report.knowledge.total }}</dd></div><div><dt>高风险</dt><dd class="attention">{{ report.knowledge.high_risk }}</dd></div><div><dt>待补齐</dt><dd class="attention">{{ report.knowledge.blocked }}</dd></div><div><dt>可送审</dt><dd>{{ report.knowledge.ready_for_review }}</dd></div></dl>
          </article>
          <article class="focus-card">
          <div class="card-heading"><div><p class="eyebrow">快捷操作</p><h3>常用工作台</h3></div></div>
            <nav class="quick-links" aria-label="常用工作台">
              <a v-for="link in report.quick_links" :key="link.path" :href="link.path">{{ link.label }}<span aria-hidden="true">→</span></a>
            </nav>
          </article>
        </section>

        <section class="collection-panel" aria-label="内容集合状态">
          <div class="panel-heading"><div><p class="eyebrow">内容清单</p><h3>内容集合状态</h3></div><span>{{ report.collections.length }} 个集合</span></div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>集合</th><th>总数</th><th>草稿</th><th>待审核</th><th>已发布</th><th>待处理</th><th>入口</th></tr></thead>
              <tbody>
                <tr v-for="item in report.collections" :key="item.key">
                  <td><strong>{{ item.label }}</strong></td>
                  <td>{{ item.total }}</td><td>{{ item.draft }}</td><td>{{ item.review }}</td><td>{{ item.published }}</td>
                  <td><span :class="item.attention ? 'attention' : 'ready'">{{ item.attention }}</span></td>
                  <td><a :href="item.edit_path">打开集合</a></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </template>
    </div>
  </private-view>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { useApi } from '@directus/extensions-sdk';

const api = useApi();
const loading = ref(false);
const error = ref('');
const report = ref({ summary: { total_records: 0, attention_records: 0, published_records: 0, collections_with_attention: 0 }, knowledge: { total: 0, high_risk: 0, blocked: 0, ready_for_review: 0 }, collections: [], quick_links: [] });

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const response = await api.get('/operations-overview');
    report.value = response.data?.data || report.value;
  } catch (reason) {
    error.value = reason?.response?.data?.errors?.[0]?.message || '无法读取运营摘要，请确认当前账号具备后台工作台读取权限。';
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.overview-page{display:grid;gap:18px;max-width:1240px;padding:4px 0 32px}.toolbar{display:flex;justify-content:space-between;align-items:end;gap:16px;flex-wrap:wrap}.toolbar p,.toolbar h2{margin:0}.toolbar h2{margin:6px 0;font-size:25px}.toolbar>div>p:last-child{margin-top:8px;color:var(--theme--foreground-subdued)}.eyebrow{margin:0;color:var(--theme--primary);font:600 12px ui-monospace,monospace;letter-spacing:.08em}.toolbar button{padding:9px 13px;border:1px solid var(--theme--border-color);border-radius:4px;background:var(--theme--background);color:var(--theme--foreground);cursor:pointer}.toolbar button:disabled{cursor:not-allowed;opacity:.55}.message,.summary>div,.focus-card,.collection-panel{border:1px solid var(--theme--border-color);border-radius:6px;background:var(--theme--background);padding:16px}.error{border-color:var(--theme--danger);color:var(--theme--danger)}.summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.summary span,.stats dt,.panel-heading>span{display:block;color:var(--theme--foreground-subdued);font-size:13px}.summary strong{display:block;margin-top:8px;font-size:29px}.focus-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.focus-card{display:grid;gap:16px}.card-heading,.panel-heading{display:flex;justify-content:space-between;align-items:start;gap:12px}.card-heading h3,.panel-heading h3{margin:6px 0 0;font-size:18px}.card-heading a,.quick-links a,.collection-panel a{color:var(--theme--primary);text-decoration:none}.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:0}.stats>div{border-top:1px solid var(--theme--border-color);padding-top:10px}.stats dd{margin:7px 0 0;font-size:24px}.attention{color:var(--theme--danger)}.ready{color:var(--theme--success)}.quick-links{display:grid;grid-template-columns:1fr 1fr;gap:8px}.quick-links a{display:flex;justify-content:space-between;align-items:center;border:1px solid var(--theme--border-color);border-radius:4px;padding:11px 12px}.quick-links a span{font-size:18px}.collection-panel{padding:4px;overflow:hidden}.panel-heading{padding:12px}.table-wrap{overflow:auto}.table-wrap table{width:100%;border-collapse:collapse;text-align:left}.table-wrap th,.table-wrap td{padding:11px 10px;border-bottom:1px solid var(--theme--border-color);vertical-align:top;white-space:nowrap}.table-wrap th{color:var(--theme--foreground-subdued);font-size:13px;font-weight:500}.table-wrap td:first-child{min-width:150px;white-space:normal}.table-wrap td:first-child strong,.table-wrap td:first-child code{display:block}.table-wrap code{margin-top:3px;color:var(--theme--foreground-subdued);font-size:11px}.table-wrap tr:last-child td{border-bottom:0}@media(max-width:900px){.summary{grid-template-columns:repeat(2,1fr)}.focus-grid{grid-template-columns:1fr}}@media(max-width:620px){.toolbar{align-items:stretch}.toolbar button{width:100%}.summary{grid-template-columns:1fr}.stats{grid-template-columns:repeat(2,1fr)}.quick-links{grid-template-columns:1fr}.table-wrap th,.table-wrap td{padding:10px 8px}}
</style>
