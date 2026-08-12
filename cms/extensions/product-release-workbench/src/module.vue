<template>
  <private-view title="产品统一发布">
    <div class="release-page">
      <header class="toolbar">
        <div>
          <p class="eyebrow">产品发布</p>
          <h2>产品统一发布</h2>
          <p>将产品系列、型号和独立参数固定为同一份公开快照，避免列表、详情和对比出现版本混用。</p>
        </div>
        <button type="button" :disabled="loading" @click="load">刷新</button>
      </header>

      <p v-if="error" class="message error" role="alert">{{ error }}</p>
      <p v-else-if="message" class="message success" role="status">{{ message }}</p>
      <p v-else-if="loading" class="message" role="status">正在读取产品发布状态...</p>
      <template v-else>
        <section class="summary" aria-label="产品发布摘要">
          <div><span>当前快照</span><strong>{{ report.active?.version ? `v${report.active.version}` : '未发布' }}</strong></div>
          <div><span>产品系列</span><strong>{{ report.counts.series }}</strong></div>
          <div><span>型号</span><strong>{{ report.counts.models }}</strong></div>
          <div><span>独立参数</span><strong>{{ report.counts.parameters }}</strong></div>
        </section>

        <section class="release-card">
          <div class="card-heading">
          <div><p class="eyebrow">下一份快照</p><h3>下一份公开快照</h3></div>
            <span class="hash" v-if="report.source_hash">{{ report.source_hash.slice(0, 12) }}...</span>
          </div>
          <p v-if="report.issues.length" class="blocked">发布被阻断：{{ report.issues.join('、') }}</p>
          <p v-else class="ready">当前产品内容满足快照发布条件。</p>
          <label class="note-field">
            发布说明
            <textarea v-model="releaseNote" maxlength="1000" rows="3" placeholder="例如：完成 FR 系列参数复核"></textarea>
          </label>
          <button class="publish-button" type="button" :disabled="report.issues.length > 0 || publishing" @click="publish">
            {{ publishing ? '正在发布...' : `发布 v${report.next_version}` }}
          </button>
        </section>

        <section v-if="report.active" class="active-card">
          <div class="card-heading"><div><p class="eyebrow">当前发布</p><h3>当前线上版本</h3></div><time>{{ formatDate(report.active.published_at) }}</time></div>
          <div class="cache-state" :class="`is-${report.active.cache_invalidation_status || 'not_configured'}`">
            <div>
              <span>官网产品缓存</span>
              <strong>{{ cacheStatusLabel(report.active.cache_invalidation_status) }}</strong>
              <small v-if="report.active.cache_invalidation_error">{{ report.active.cache_invalidation_error }}</small>
              <small v-else-if="report.active.cache_invalidated_at">完成于 {{ formatDate(report.active.cache_invalidated_at) }}</small>
            </div>
            <button
              v-if="report.active.cache_invalidation_status !== 'succeeded'"
              type="button"
              :disabled="retryingCache"
              @click="retryCacheInvalidation"
            >{{ retryingCache ? '正在刷新...' : '重试刷新' }}</button>
          </div>
          <dl><div><dt>版本</dt><dd>v{{ report.active.version }}</dd></div><div><dt>快照摘要</dt><dd>{{ report.active.source_hash }}</dd></div><div><dt>发布说明</dt><dd>{{ report.active.release_note || '未填写' }}</dd></div></dl>
        </section>

        <section class="history-card" aria-labelledby="release-history-title">
          <div class="card-heading">
          <div><p class="eyebrow">发布历史</p><h3 id="release-history-title">产品快照历史</h3></div>
            <span>{{ history.length }} 个版本</span>
          </div>
          <p v-if="!history.length" class="empty">尚无产品发布历史。</p>
          <div v-else class="history-table-wrap">
            <table>
              <thead><tr><th>版本</th><th>内容数量</th><th>发布时间</th><th>缓存</th><th>恢复来源</th><th>操作</th></tr></thead>
              <tbody>
                <tr v-for="release in history" :key="release.id">
                  <td><strong>v{{ release.version }}</strong><span v-if="release.is_active" class="active-label">当前</span><small>{{ release.source_hash.slice(0, 10) }}...</small></td>
                  <td>{{ release.counts.series }} / {{ release.counts.models }} / {{ release.counts.parameters }}<small>系列 / 型号 / 参数</small></td>
                  <td>{{ formatDate(release.published_at) }}<small>{{ release.release_note || '未填写发布说明' }}</small></td>
                  <td><span :class="`cache-label is-${release.cache_invalidation_status}`">{{ cacheStatusLabel(release.cache_invalidation_status) }}</span></td>
                  <td>{{ release.restored_from_version == null ? '原始发布' : `来自 v${release.restored_from_version}` }}<small v-if="release.restore_note">{{ release.restore_note }}</small></td>
                  <td><button type="button" :disabled="!release.can_restore || restoring" @click="selectRestore(release)">{{ release.is_active ? '当前版本' : '选择恢复' }}</button></td>
                </tr>
              </tbody>
            </table>
          </div>

          <form v-if="selectedRestore" class="restore-panel" @submit.prevent="restoreSelected">
            <div>
          <p class="eyebrow">受控恢复</p>
              <h4>将 v{{ selectedRestore.version }} 恢复为新的 v{{ report.next_version }}</h4>
              <p>历史记录保持归档；系统会复制其产品内容生成新版本，并刷新官网产品缓存。</p>
            </div>
            <label class="note-field">
              恢复原因
              <textarea v-model="restoreNote" minlength="5" maxlength="1000" rows="3" required placeholder="说明恢复原因、影响范围和核对结论"></textarea>
            </label>
            <div class="restore-actions">
              <button type="button" :disabled="restoring" @click="cancelRestore">取消</button>
              <button class="restore-button" type="submit" :disabled="restoreNote.trim().length < 5 || restoring">{{ restoring ? '正在恢复...' : `确认生成 v${report.next_version}` }}</button>
            </div>
          </form>
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
const publishing = ref(false);
const retryingCache = ref(false);
const restoring = ref(false);
const error = ref('');
const message = ref('');
const releaseNote = ref('');
const restoreNote = ref('');
const selectedRestore = ref(null);
const history = ref([]);
const report = ref({ active: null, next_version: 1, source_hash: '', issues: [], counts: { series: 0, models: 0, parameters: 0 } });

function formatDate(value) {
  if (!value) return '未记录';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { hour12: false });
}

function cacheStatusLabel(value) {
  return ({ succeeded: '已刷新', failed: '刷新失败', pending: '等待刷新', not_configured: '未配置' })[value] || '未配置';
}

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const [readinessResponse, historyResponse] = await Promise.all([
      api.get('/product-release/readiness'),
      api.get('/product-release/history')
    ]);
    report.value = readinessResponse.data?.data || report.value;
    history.value = historyResponse.data?.data || [];
  } catch (reason) {
    error.value = reason?.response?.data?.errors?.[0]?.message || '无法读取产品发布状态。';
  } finally {
    loading.value = false;
  }
}

async function publish() {
  publishing.value = true;
  error.value = '';
  message.value = '';
  try {
    await api.post('/product-release/publish', { releaseNote: releaseNote.value });
    releaseNote.value = '';
    await load();
    message.value = '产品快照已发布，并已记录官网缓存刷新状态。';
  } catch (reason) {
    error.value = reason?.response?.data?.errors?.[0]?.message || '产品快照发布失败。';
  } finally {
    publishing.value = false;
  }
}

async function retryCacheInvalidation() {
  if (!report.value.active?.id) return;
  retryingCache.value = true;
  error.value = '';
  message.value = '';
  try {
    await api.post(`/product-release/${report.value.active.id}/cache-invalidate`);
    await load();
    message.value = '官网产品缓存刷新已重新执行。';
  } catch (reason) {
    error.value = reason?.response?.data?.errors?.[0]?.message || '官网产品缓存刷新失败。';
  } finally {
    retryingCache.value = false;
  }
}

function selectRestore(release) {
  if (!release?.can_restore) return;
  selectedRestore.value = release;
  restoreNote.value = '';
  error.value = '';
  message.value = '';
}

function cancelRestore() {
  selectedRestore.value = null;
  restoreNote.value = '';
}

async function restoreSelected() {
  if (!selectedRestore.value?.id || restoreNote.value.trim().length < 5) return;
  restoring.value = true;
  error.value = '';
  message.value = '';
  const sourceVersion = selectedRestore.value.version;
  try {
    await api.post(`/product-release/${selectedRestore.value.id}/restore`, { restoreNote: restoreNote.value });
    cancelRestore();
    await load();
    message.value = `历史版本 v${sourceVersion} 已恢复为新的 v${report.value.active?.version || report.value.next_version - 1}。`;
  } catch (reason) {
    error.value = reason?.response?.data?.errors?.[0]?.message || '产品历史版本恢复失败。';
  } finally {
    restoring.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.release-page{display:grid;gap:18px;max-width:1180px;padding:4px 0 32px}.toolbar{display:flex;justify-content:space-between;align-items:end;gap:16px;flex-wrap:wrap}.toolbar p,.toolbar h2{margin:0}.toolbar h2{margin:6px 0;font-size:25px}.toolbar>div>p:last-child{margin-top:8px;color:var(--theme--foreground-subdued)}.eyebrow{margin:0;color:var(--theme--primary);font:600 12px ui-monospace,monospace;letter-spacing:.08em}.toolbar button,.publish-button,.cache-state button,.history-card button{padding:9px 13px;border:1px solid var(--theme--border-color);border-radius:4px;background:var(--theme--background);color:var(--theme--foreground);cursor:pointer}.toolbar button:disabled,.publish-button:disabled,.cache-state button:disabled,.history-card button:disabled{cursor:not-allowed;opacity:.55}.message,.summary>div,.release-card,.active-card,.history-card{border:1px solid var(--theme--border-color);border-radius:6px;background:var(--theme--background);padding:16px}.error{border-color:var(--theme--danger);color:var(--theme--danger)}.success{border-color:var(--theme--success);color:var(--theme--success)}.summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.summary span{display:block;color:var(--theme--foreground-subdued);font-size:13px}.summary strong{display:block;margin-top:8px;font-size:28px}.release-card,.active-card,.history-card{display:grid;gap:16px}.card-heading{display:flex;justify-content:space-between;align-items:start;gap:12px}.card-heading h3{margin:6px 0 0;font-size:19px}.card-heading>span,.hash,time{color:var(--theme--foreground-subdued);font:12px ui-monospace,monospace}.blocked{margin:0;color:var(--theme--danger)}.ready{margin:0;color:var(--theme--success)}.note-field{display:grid;gap:7px;color:var(--theme--foreground-subdued);font-size:13px}.note-field textarea{width:100%;resize:vertical;box-sizing:border-box;padding:9px 10px;border:1px solid var(--theme--border-color);border-radius:4px;background:var(--theme--background);color:var(--theme--foreground);font:inherit}.publish-button,.restore-button{justify-self:start;background:var(--theme--primary)!important;border-color:var(--theme--primary)!important;color:var(--theme--primary-foreground)!important}.cache-state{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:13px 14px;border:1px solid var(--theme--border-color);border-radius:4px}.cache-state span,.cache-state small{display:block;color:var(--theme--foreground-subdued);font-size:12px}.cache-state strong{display:block;margin:4px 0}.cache-state.is-succeeded strong,.cache-label.is-succeeded{color:var(--theme--success)}.cache-state.is-failed strong,.cache-state.is-not_configured strong,.cache-label.is-failed,.cache-label.is-not_configured{color:var(--theme--danger)}dl{display:grid;gap:10px;margin:0}dl>div{display:grid;grid-template-columns:130px 1fr;gap:12px;border-top:1px solid var(--theme--border-color);padding-top:10px}dt{color:var(--theme--foreground-subdued);font-size:13px}dd{margin:0;overflow-wrap:anywhere}.history-table-wrap{overflow:auto}.history-card table{width:100%;border-collapse:collapse;text-align:left}.history-card th,.history-card td{padding:11px 10px;border-bottom:1px solid var(--theme--border-color);vertical-align:top;white-space:nowrap}.history-card th{color:var(--theme--foreground-subdued);font-size:12px;font-weight:500}.history-card td small{display:block;max-width:240px;margin-top:4px;color:var(--theme--foreground-subdued);font-size:11px;overflow:hidden;text-overflow:ellipsis}.history-card tbody tr:last-child td{border-bottom:0}.active-label{display:inline-block;margin-left:7px;padding:2px 5px;border-radius:3px;background:var(--theme--primary-background);color:var(--theme--primary);font-size:11px}.empty{margin:0;color:var(--theme--foreground-subdued)}.restore-panel{display:grid;gap:14px;padding:16px;border:1px solid var(--theme--primary);border-radius:4px;background:var(--theme--primary-background)}.restore-panel h4,.restore-panel p{margin:0}.restore-panel h4{margin-top:5px;font-size:17px}.restore-panel>div>p:last-child{margin-top:7px;color:var(--theme--foreground-subdued)}.restore-actions{display:flex;gap:9px;flex-wrap:wrap}@media(max-width:700px){.summary{grid-template-columns:repeat(2,1fr)}.toolbar{align-items:stretch}.toolbar button,.cache-state button{width:100%}.publish-button{width:100%}.cache-state{align-items:stretch;flex-direction:column}dl>div{grid-template-columns:1fr;gap:5px}.history-card{padding:12px}.restore-actions{display:grid}.restore-actions button{width:100%}}@media(max-width:430px){.summary{grid-template-columns:1fr}}
</style>
