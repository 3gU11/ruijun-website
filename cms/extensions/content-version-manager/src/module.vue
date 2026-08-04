<template>
  <private-view title="内容版本">
    <div class="version-manager">
      <div class="toolbar">
        <label>
          内容集合
          <select v-model="collection" :disabled="loading">
            <option value="">全部可发布内容</option>
            <option v-for="item in collections" :key="item" :value="item">{{ item }}</option>
          </select>
        </label>
        <button class="secondary-action" type="button" :disabled="loading" @click="loadVersions">刷新</button>
      </div>

      <p v-if="message" class="status-message" role="status">{{ message }}</p>
      <p v-if="error" class="error-message" role="alert">{{ error }}</p>

      <div v-if="loading" class="empty-state">正在读取版本记录...</div>
      <div v-else-if="!versions.length" class="empty-state">当前筛选条件下没有可恢复的内容版本。</div>

      <div v-else class="version-list">
        <article v-for="version in versions" :key="version.id" class="version-card">
          <header>
            <div>
              <p class="collection">{{ version.content_collection }} / #{{ version.content_item_id }}</p>
              <h2>{{ actionLabel(version.action) }}</h2>
            </div>
            <span class="state" :class="`state-${version.status}`">{{ statusLabel(version.status) }}</span>
          </header>
          <p class="metadata">{{ formatTime(version.created_at) }} · 操作人 {{ version.actor || '系统' }}</p>
          <p class="metadata">原状态：{{ version.source_status }} / {{ version.source_publication_state }}</p>
          <div class="field-summary">
            <span v-for="field in version.changed_fields" :key="field">{{ field }}</span>
          </div>
          <details>
            <summary>查看快照内容</summary>
            <pre>{{ formatSnapshot(version.snapshot) }}</pre>
          </details>
          <button class="secondary-action" type="button" :disabled="loading || diffLoading === version.id" @click="loadDiff(version)">查看与当前内容差异</button>
          <section v-if="comparison?.version?.id === version.id" class="diff-panel" :aria-label="`版本 ${version.id} 字段差异`">
            <p v-if="!diffFields(comparison).length" class="metadata">此版本的快照内容与当前记录一致。</p>
            <dl v-else class="diff-list">
              <template v-for="field in diffFields(comparison)" :key="field.name">
                <dt>{{ field.name }}</dt>
                <dd>
                  <strong>历史快照</strong>
                  <pre>{{ formatValue(field.before) }}</pre>
                  <strong>当前内容</strong>
                  <pre>{{ formatValue(field.after) }}</pre>
                </dd>
              </template>
            </dl>
          </section>
          <p v-if="version.restore_note" class="restore-note">已恢复：{{ version.restore_note }}</p>
          <button
            class="restore-action"
            type="button"
            :disabled="version.status === 'restored' || loading"
            @click="selectForRestore(version)"
          >恢复为草稿</button>
        </article>
      </div>

      <section v-if="selectedVersion" class="restore-panel" aria-labelledby="restore-title">
        <div>
          <p class="eyebrow">恢复确认</p>
          <h2 id="restore-title">将版本 #{{ selectedVersion.id }} 恢复为未发布草稿</h2>
          <p>恢复不会直接发布内容，并会留下恢复人、时间和原因的审计记录。</p>
        </div>
        <label>
          恢复原因
          <textarea v-model="restoreNote" rows="3" maxlength="500" placeholder="说明恢复原因" />
        </label>
        <div class="restore-actions">
          <button class="secondary-action" type="button" :disabled="loading" @click="cancelRestore">取消</button>
          <button class="restore-action" type="button" :disabled="loading || !restoreNote.trim()" @click="restoreSelected">确认恢复为草稿</button>
        </div>
      </section>
    </div>
  </private-view>
</template>

<script setup>
import { useApi } from '@directus/extensions-sdk';
import { onMounted, ref, watch } from 'vue';

const api = useApi();
const collections = [
  'pages', 'product_series', 'product_models', 'product_parameters', 'case_studies', 'articles',
  'manufacturing_evidence', 'qualifications', 'milestones', 'service_resources', 'service_locations',
  'knowledge_items', 'external_service_entries', 'site_settings'
];
const collection = ref('');
const versions = ref([]);
const selectedVersion = ref(null);
const comparison = ref(null);
const restoreNote = ref('');
const loading = ref(false);
const diffLoading = ref(null);
const error = ref('');
const message = ref('');

function errorMessage(reason, fallback) {
  return reason?.response?.data?.errors?.[0]?.message || fallback;
}

function formatTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '时间未知' : date.toLocaleString('zh-CN', { hour12: false });
}

function formatSnapshot(snapshot) {
  return JSON.stringify(snapshot || {}, null, 2);
}

function formatValue(value) {
  return JSON.stringify(value ?? null, null, 2);
}

function diffFields(detail) {
  const before = detail?.version?.snapshot || {};
  const after = detail?.current || {};
  return [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .filter((name) => JSON.stringify(before[name]) !== JSON.stringify(after[name]))
    .sort()
    .map((name) => ({ name, before: before[name], after: after[name] }));
}

function actionLabel(action) {
  return {
    draft_updated: '草稿更新', submitted_for_review: '提交审核', approved_for_publication: '审核通过',
    rejected: '审核驳回', published: '已发布', unpublished: '已下线', archived: '已归档'
  }[action] || action || '内容更新';
}

function statusLabel(status) {
  return status === 'restored' ? '已恢复' : '可恢复';
}

async function loadVersions() {
  loading.value = true;
  error.value = '';
  try {
    const parameters = new URLSearchParams({ limit: '50' });
    if (collection.value) parameters.set('collection', collection.value);
    const response = await api.get(`/content-version-restore?${parameters.toString()}`);
    versions.value = Array.isArray(response.data?.data) ? response.data.data : [];
  } catch (reason) {
    versions.value = [];
    error.value = errorMessage(reason, '无法读取内容版本。请确认当前账号具有发布权限。');
  } finally {
    loading.value = false;
  }
}

function selectForRestore(version) {
  selectedVersion.value = version;
  restoreNote.value = '';
  message.value = '';
}

function cancelRestore() {
  selectedVersion.value = null;
  restoreNote.value = '';
}

async function loadDiff(version) {
  error.value = '';
  diffLoading.value = version.id;
  try {
    const response = await api.get(`/content-version-restore/${version.id}`);
    comparison.value = response.data?.data || null;
  } catch (reason) {
    comparison.value = null;
    error.value = errorMessage(reason, '无法读取该版本与当前内容的差异。');
  } finally {
    diffLoading.value = null;
  }
}

async function restoreSelected() {
  if (!selectedVersion.value || !restoreNote.value.trim()) return;
  loading.value = true;
  error.value = '';
  message.value = '';
  try {
    await api.post(`/content-version-restore/${selectedVersion.value.id}/restore`, { restoreNote: restoreNote.value.trim() });
    message.value = `版本 #${selectedVersion.value.id} 已恢复为未发布草稿。`;
    cancelRestore();
    await loadVersions();
  } catch (reason) {
    error.value = errorMessage(reason, '恢复失败，内容未被修改。');
  } finally {
    loading.value = false;
  }
}

watch(collection, () => { loadVersions(); });
onMounted(loadVersions);
</script>

<style scoped>
.version-manager { display: grid; gap: 20px; max-width: 1120px; padding: 4px 0 28px; }
.toolbar, .restore-actions { display: flex; align-items: end; gap: 12px; flex-wrap: wrap; }
label { display: grid; gap: 7px; color: var(--theme--foreground-subdued); font-size: 14px; }
select, textarea { min-width: 240px; border: 1px solid var(--theme--border-color); border-radius: 4px; background: var(--theme--background); color: var(--theme--foreground); font: inherit; padding: 9px 10px; }
textarea { width: min(560px, 100%); resize: vertical; }
button { border-radius: 4px; font: inherit; padding: 9px 13px; cursor: pointer; }
button:disabled { cursor: not-allowed; opacity: .55; }
.secondary-action { border: 1px solid var(--theme--border-color); background: var(--theme--background); color: var(--theme--foreground); }
.restore-action { border: 1px solid var(--theme--primary); background: var(--theme--primary); color: var(--theme--primary-foreground); }
.status-message, .error-message, .empty-state { margin: 0; padding: 12px 14px; border-radius: 4px; background: var(--theme--background-accent); }
.error-message { color: var(--theme--danger); }
.version-list { display: grid; gap: 12px; }
.version-card, .restore-panel { border: 1px solid var(--theme--border-color); border-radius: 6px; background: var(--theme--background); padding: 18px; }
.version-card header { display: flex; align-items: start; justify-content: space-between; gap: 16px; }
.collection, .metadata, .restore-note, .eyebrow { margin: 0; color: var(--theme--foreground-subdued); font-size: 13px; }
h2 { margin: 4px 0 8px; font-size: 18px; }
.state { border-radius: 999px; padding: 4px 8px; background: var(--theme--background-accent); font-size: 12px; white-space: nowrap; }
.state-restored { color: var(--theme--success); }
.field-summary { display: flex; flex-wrap: wrap; gap: 6px; margin: 12px 0; }
.field-summary span { border-radius: 999px; background: var(--theme--background-accent); padding: 3px 8px; font: 12px ui-monospace, monospace; }
details { margin: 12px 0; }
summary { cursor: pointer; color: var(--theme--primary); }
pre { max-height: 260px; overflow: auto; border-radius: 4px; background: var(--theme--background-accent); padding: 12px; font-size: 12px; white-space: pre-wrap; }
.diff-panel { margin-top: 12px; border-top: 1px solid var(--theme--border-color); padding-top: 12px; }
.diff-list { display: grid; gap: 8px; margin: 0; }
.diff-list dt { color: var(--theme--foreground); font: 600 13px ui-monospace, monospace; }
.diff-list dd { display: grid; gap: 5px; margin: 0; }
.diff-list strong { color: var(--theme--foreground-subdued); font-size: 12px; }
.diff-list pre { max-height: 130px; margin: 0; }
.restore-panel { display: grid; gap: 14px; border-color: var(--theme--primary); }
.restore-panel h2 { margin: 4px 0; }
@media (max-width: 600px) { .version-card header { display: grid; } select { min-width: 0; width: 100%; } }
</style>
