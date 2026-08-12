<template>
  <private-view title="常见问题知识审核">
    <div class="review-page">
      <header class="toolbar">
        <div>
          <p class="eyebrow">常见问题审核</p>
          <h2>技术审核准备</h2>
          <p>只显示审核所需的摘要和缺项；来源文档、排障步骤和安全说明不会在此列表回传。</p>
        </div>
        <button type="button" :disabled="loading" @click="load">刷新</button>
      </header>

      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <p v-else-if="loading" class="empty">正在读取常见问题审核摘要...</p>
      <template v-else>
        <section class="summary" aria-label="常见问题审核概览">
          <div><span>知识总数</span><strong>{{ report.summary.total }}</strong></div>
          <div><span>待补齐</span><strong>{{ report.summary.blocked }}</strong></div>
          <div><span>可送审</span><strong>{{ report.summary.ready_for_review }}</strong></div>
          <div><span>高风险</span><strong>{{ report.summary.high_risk }}</strong></div>
          <div><span>公开候选</span><strong>{{ report.summary.public }}</strong></div>
        </section>

        <section class="filters" aria-label="常见问题审核筛选">
          <label>
            风险等级
            <select v-model="selectedRisk">
              <option value="">全部风险</option>
              <option value="high">高风险</option>
              <option value="medium">中风险</option>
              <option value="low">低风险</option>
              <option value="unknown">未分类</option>
            </select>
          </label>
          <label>
            可见范围
            <select v-model="selectedVisibility">
              <option value="">全部范围</option>
              <option value="public">公开候选</option>
              <option value="support_internal">售后内部</option>
            </select>
          </label>
          <label class="check-label">
            <input v-model="blockedOnly" type="checkbox">
            只看待补齐
          </label>
        </section>

        <div v-if="!filteredItems.length" class="empty">当前筛选条件下没有常见问题记录。</div>
        <section v-else class="table-wrap" aria-label="常见问题审核明细">
          <table>
            <thead><tr><th>问题</th><th>分类</th><th>风险</th><th>范围</th><th>送审前待补</th><th>状态</th><th>操作</th></tr></thead>
            <tbody>
              <tr v-for="item in filteredItems" :key="itemKey(item)">
                <td>{{ item.title }}</td>
                <td>{{ item.category }}</td>
                <td><span class="risk" :data-risk="item.risk">{{ riskLabel(item.risk) }}</span></td>
                <td>{{ visibilityLabel(item.visibility) }}</td>
                <td><span v-if="item.missing.length" class="missing">{{ item.missing.join('；') }}</span><span v-else class="ready">可送审</span></td>
                <td>{{ item.status }}/{{ item.publication_state }}</td>
                <td><a v-if="item.edit_path" class="edit-link" :href="item.edit_path">打开内容</a><span v-else class="muted">暂无入口</span></td>
              </tr>
            </tbody>
          </table>
        </section>
      </template>
    </div>
  </private-view>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useApi } from '@directus/extensions-sdk';

const api = useApi();
const loading = ref(false);
const error = ref('');
const selectedRisk = ref('');
const selectedVisibility = ref('');
const blockedOnly = ref(false);
const report = ref({ summary: { total: 0, blocked: 0, ready_for_review: 0, high_risk: 0, public: 0 }, items: [] });
const filteredItems = computed(() => report.value.items.filter((item) => {
  if (selectedRisk.value && item.risk !== selectedRisk.value) return false;
  if (selectedVisibility.value && item.visibility !== selectedVisibility.value) return false;
  if (blockedOnly.value && item.ready_for_review) return false;
  return true;
}));

function itemKey(item) {
  return item.id ?? item.title;
}

function riskLabel(value) {
  return { high: '高风险', medium: '中风险', low: '低风险' }[value] || '未分类';
}

function visibilityLabel(value) {
  return { public: '公开候选', support_internal: '售后内部' }[value] || value;
}

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const response = await api.get('/knowledge-review');
    report.value = response.data?.data || { summary: { total: 0, blocked: 0, ready_for_review: 0, high_risk: 0, public: 0 }, items: [] };
  } catch (reason) {
    report.value = { summary: { total: 0, blocked: 0, ready_for_review: 0, high_risk: 0, public: 0 }, items: [] };
    error.value = reason?.response?.data?.errors?.[0]?.message || '无法读取常见问题审核数据。请确认当前账号具有技术审核权限。';
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.review-page{display:grid;gap:18px;max-width:1240px;padding:4px 0 32px}.toolbar{display:flex;justify-content:space-between;align-items:end;gap:16px;flex-wrap:wrap}.toolbar p,.toolbar h2{margin:0}.toolbar h2{margin:6px 0;font-size:24px}.toolbar>div>p:last-child{margin-top:8px;color:var(--theme--foreground-subdued)}.eyebrow{color:var(--theme--primary);font:600 12px ui-monospace,monospace;letter-spacing:.08em}.toolbar button{padding:9px 13px;border:1px solid var(--theme--border-color);border-radius:4px;background:var(--theme--background);color:var(--theme--foreground);cursor:pointer}.toolbar button:disabled{cursor:not-allowed;opacity:.55}.summary{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px}.summary>div,.filters,.table-wrap,.empty,.error{border:1px solid var(--theme--border-color);border-radius:6px;background:var(--theme--background);padding:16px}.summary span{display:block;color:var(--theme--foreground-subdued);font-size:13px}.summary strong{display:block;margin-top:8px;font-size:27px}.filters{display:flex;align-items:end;gap:20px;flex-wrap:wrap}.filters label{display:grid;gap:7px;color:var(--theme--foreground-subdued);font-size:13px}.filters select{min-width:150px;padding:8px 10px;border:1px solid var(--theme--border-color);border-radius:4px;background:var(--theme--background);color:var(--theme--foreground);font:inherit}.filters .check-label{display:flex;align-items:center;gap:8px;min-height:36px}.filters input{width:16px;height:16px}.table-wrap{overflow:auto;padding:4px}.table-wrap table{width:100%;border-collapse:collapse;text-align:left}.table-wrap th,.table-wrap td{padding:12px 10px;border-bottom:1px solid var(--theme--border-color);vertical-align:top}.table-wrap th{color:var(--theme--foreground-subdued);font-size:13px;font-weight:500;white-space:nowrap}.risk{white-space:nowrap}.risk[data-risk="high"],.missing{color:var(--theme--danger)}.risk[data-risk="medium"]{color:var(--theme--warning)}.ready{color:var(--theme--success)}.edit-link{color:var(--theme--primary);white-space:nowrap}.muted{color:var(--theme--foreground-subdued)}.empty{color:var(--theme--foreground-subdued)}.error{border-color:var(--theme--danger);color:var(--theme--danger)}@media(max-width:900px){.summary{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:620px){.toolbar{align-items:stretch}.toolbar button{width:100%}.summary{grid-template-columns:1fr 1fr}.filters{align-items:stretch;flex-direction:column;gap:12px}.filters select{width:100%}.table-wrap{padding:0}.table-wrap th,.table-wrap td{padding:11px 8px;white-space:normal;overflow-wrap:anywhere}}
</style>
