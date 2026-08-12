<template>
  <private-view title="内容发布队列">
    <div class="publication-page">
      <header class="toolbar">
        <div>
          <p class="eyebrow">内容发布</p>
          <h2>内容发布队列</h2>
          <p>仅处理已经通过审核的非产品快照内容。产品系列、型号和参数必须通过<a href="/admin/ruijun-product-release-workbench">产品统一发布</a>生成同一份公开版本；发布、下线和归档均由服务端状态机复核，不能在流转时修改内容字段。</p>
        </div>
        <button type="button" :disabled="loading || saving" @click="loadQueue">{{ loading ? '正在刷新...' : '刷新队列' }}</button>
      </header>

      <p v-if="error" class="message error" role="alert">{{ error }}</p>
      <p v-else-if="message" class="message success" role="status">{{ message }}</p>

      <nav class="mode-tabs" aria-label="发布状态队列">
        <button v-for="mode in modes" :key="mode.id" type="button" :class="{ active: activeMode === mode.id }" @click="setMode(mode.id)">
          <span>{{ mode.label }}</span><strong>{{ queues[mode.id].length }}</strong>
        </button>
      </nav>

      <section class="workspace" aria-label="内容发布工作区">
        <aside class="record-list">
          <p class="list-help">{{ activeModeDefinition.help }}</p>
          <button v-for="record in activeQueue" :key="recordKey(record)" type="button" class="record-choice" :class="{ active: recordKey(record) === selectedKey }" @click="selectRecord(record)">
            <span>{{ record.label }}</span>
            <small>{{ record.collectionLabel }}<template v-if="record.secondary"> · {{ record.secondary }}</template></small>
            <i :data-status="record.status">{{ statusLabel(record.status) }}</i>
          </button>
          <p v-if="loading" class="empty">正在读取可处理内容...</p>
          <p v-else-if="!activeQueue.length" class="empty">{{ activeModeDefinition.empty }}</p>
        </aside>

        <section v-if="selectedRecord" class="publication-detail">
          <div class="detail-heading">
            <div><p class="eyebrow">{{ activeModeDefinition.eyebrow }}</p><h3>{{ selectedRecord.label }}</h3></div>
            <span class="status" :data-status="selectedRecord.status">{{ statusLabel(selectedRecord.status) }}</span>
          </div>
          <div class="metadata"><span>{{ selectedRecord.collectionLabel }}</span><span v-if="selectedRecord.secondary">{{ selectedRecord.secondary }}</span></div>
          <p v-if="selectedRecord.review_note" class="note-display"><strong>{{ activeMode === 'scheduled' ? '审核说明' : '最近流转说明' }}</strong><span>{{ selectedRecord.review_note }}</span></p>
          <p class="detail-copy">{{ activeModeDefinition.detail }}</p>
          <label class="note-field">{{ activeModeDefinition.noteLabel }}<textarea v-model.trim="actionNote" rows="5" maxlength="2000" :placeholder="activeModeDefinition.placeholder" /></label>
          <div class="actions">
            <a :href="nativeItemPath(selectedRecord.collection, selectedRecord.id)">打开原始内容</a>
            <button type="button" class="primary-action" :class="{ danger: activeMode !== 'scheduled' }" :disabled="saving" @click="runTransition">
              {{ saving ? '正在处理...' : activeModeDefinition.action }}
            </button>
          </div>
        </section>
        <div v-else class="empty detail-empty">请从左侧选择一条内容。</div>
      </section>
    </div>
  </private-view>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useApi } from '@directus/extensions-sdk';

const api = useApi();
const definitions = Object.freeze([
  { collection: 'pages', label: '页面文案', fields: ['title', 'slug'] },
  { collection: 'case_studies', label: '客户案例', fields: ['slug', 'model_code'] },
  { collection: 'articles', label: '新闻与文章', fields: ['title', 'slug'] },
  { collection: 'manufacturing_evidence', label: '制造证据', fields: ['process', 'source_key'] },
  { collection: 'qualifications', label: '资质证书', fields: ['name', 'certificate_number'] },
  { collection: 'milestones', label: '发展历程', fields: ['event', 'year'] },
  { collection: 'service_resources', label: '服务资料', fields: ['source_key', 'type'] },
  { collection: 'service_locations', label: '服务网点', fields: ['city', 'region'] },
  { collection: 'knowledge_items', label: '常见问题知识', fields: ['question_title', 'source_key'] },
  { collection: 'external_service_entries', label: '售后入口', fields: ['entry_type', 'url'] },
  { collection: 'media_assets', label: '媒体资产', fields: ['original_file_name', 'usage_scope'] },
  { collection: 'site_settings', label: '全站设置', fields: ['setting_key'] }
]);
const modes = Object.freeze([
  { id: 'scheduled', status: 'scheduled', target: 'published', label: '待发布', eyebrow: '已审批内容发布', action: '正式发布', noteLabel: '发布说明（可选）', placeholder: '说明本次发布范围或业务确认信息', help: '仅显示审核通过、等待发布的内容。发布后会进入公开 API 和官网缓存刷新流程。', detail: '发布动作会由服务端重新校验内容、受控媒体和发布前置条件；不满足条件时记录保持待发布。', empty: '当前没有待发布内容。' },
  { id: 'published', status: 'published', target: 'unpublished', label: '已发布', eyebrow: '已发布内容下线', action: '下线内容', noteLabel: '下线说明（建议填写）', placeholder: '例如：证书到期、资料替换或业务调整', help: '仅显示当前已公开内容。下线后公开 API 不再返回该记录。', detail: '下线不会删除历史版本；之后可由内容编辑恢复为草稿并重新走审核。', empty: '当前没有已发布内容。' },
  { id: 'unpublished', status: 'unpublished', target: 'archived', label: '已下线', eyebrow: '已下线内容归档', action: '归档内容', noteLabel: '归档说明（建议填写）', placeholder: '说明归档原因和后续替代内容', help: '仅显示已经下线且不再需要恢复编辑的内容。', detail: '归档后内容不可在本工作流中修改；如需复用，请从受控版本恢复为新的未发布草稿。', empty: '当前没有可归档内容。' }
]);

const activeMode = ref('scheduled');
const queues = ref({ scheduled: [], published: [], unpublished: [] });
const selectedKey = ref('');
const actionNote = ref('');
const loading = ref(false);
const saving = ref(false);
const error = ref('');
const message = ref('');
const activeModeDefinition = computed(() => modes.find((mode) => mode.id === activeMode.value) || modes[0]);
const activeQueue = computed(() => queues.value[activeMode.value] || []);
const selectedRecord = computed(() => activeQueue.value.find((record) => recordKey(record) === selectedKey.value) || null);

function recordKey(record) { return `${record.collection}:${record.id}`; }
function statusLabel(status) { return ({ scheduled: '待发布', published: '已发布', unpublished: '已下线', archived: '已归档' })[status] || status; }
function nativeItemPath(collection, id) { return `/content/${encodeURIComponent(collection)}/${encodeURIComponent(id)}`; }
function normalizeRecord(definition, record) {
  const [primary, secondary] = definition.fields;
  return {
    id: record.id,
    collection: definition.collection,
    collectionLabel: definition.label,
    label: String(record[primary] || record[secondary] || `${definition.label} ${record.id}`),
    secondary: String(record[secondary] || ''),
    status: String(record.status || ''),
    review_note: String(record.review_note || '')
  };
}
async function loadRecords(status) {
  const responses = await Promise.allSettled(definitions.map(async (definition) => {
    const fields = ['id', 'status', 'publication_state', 'review_note', ...definition.fields].join(',');
    const query = new URLSearchParams({ fields, limit: '-1', sort: definition.fields[0] });
    query.set('filter[status][_eq]', status);
    const response = await api.get(`/items/${definition.collection}?${query.toString()}`);
    const records = Array.isArray(response.data?.data) ? response.data.data : [];
    return records.map((record) => normalizeRecord(definition, record));
  }));
  return responses.flatMap((result) => result.status === 'fulfilled' ? result.value : []);
}
function selectRecord(record) { selectedKey.value = recordKey(record); actionNote.value = ''; message.value = ''; error.value = ''; }
function setMode(mode) {
  if (activeMode.value === mode) return;
  activeMode.value = mode;
  selectedKey.value = queues.value[mode]?.[0] ? recordKey(queues.value[mode][0]) : '';
  actionNote.value = '';
  message.value = '';
  error.value = '';
}
async function loadQueue() {
  loading.value = true;
  error.value = '';
  try {
    const [scheduled, published, unpublished] = await Promise.all(modes.map((mode) => loadRecords(mode.status)));
    queues.value = { scheduled, published, unpublished };
    if (!activeQueue.value.some((record) => recordKey(record) === selectedKey.value)) selectedKey.value = activeQueue.value[0] ? recordKey(activeQueue.value[0]) : '';
  } catch (reason) {
    queues.value = { scheduled: [], published: [], unpublished: [] };
    selectedKey.value = '';
    error.value = reason?.response?.data?.errors?.[0]?.message || '无法读取发布队列。请确认当前账号具有发布权限。';
  } finally {
    loading.value = false;
  }
}
async function runTransition() {
  const record = selectedRecord.value;
  if (!record) return;
  saving.value = true;
  error.value = '';
  message.value = '';
  try {
    const payload = { status: activeModeDefinition.value.target };
    if (actionNote.value) payload.review_note = actionNote.value;
    await api.patch(`/items/${encodeURIComponent(record.collection)}/${encodeURIComponent(record.id)}`, payload);
    message.value = `${record.label} 已${activeModeDefinition.value.action}。`;
    actionNote.value = '';
    await loadQueue();
  } catch (reason) {
    error.value = reason?.response?.data?.errors?.[0]?.message || '状态流转失败，内容没有被修改。';
  } finally {
    saving.value = false;
  }
}

onMounted(loadQueue);
</script>

<style scoped>
.publication-page{display:grid;gap:18px;max-width:1280px;padding:4px 0 32px}.toolbar{display:flex;align-items:end;justify-content:space-between;gap:16px;flex-wrap:wrap}.toolbar p,.toolbar h2{margin:0}.toolbar h2{margin:6px 0;font-size:25px}.toolbar>div>p:last-child{max-width:720px;margin-top:8px;color:var(--theme--foreground-subdued)}.toolbar button,.primary-action{padding:9px 13px;border:1px solid var(--theme--border-color);border-radius:4px;background:var(--theme--background);color:var(--theme--foreground);font:inherit;cursor:pointer}.toolbar button:disabled,.primary-action:disabled{cursor:not-allowed;opacity:.55}.eyebrow{margin:0;color:var(--theme--primary);font:600 12px ui-monospace,monospace;letter-spacing:.08em}.message{margin:0;padding:12px 14px;border:1px solid var(--theme--border-color);border-radius:5px;background:var(--theme--background)}.message.error{border-color:var(--theme--danger);color:var(--theme--danger)}.message.success{border-color:var(--theme--success);color:var(--theme--success)}.mode-tabs{display:flex;gap:8px;border-bottom:1px solid var(--theme--border-color)}.mode-tabs button{display:flex;gap:8px;padding:10px 13px;color:var(--theme--foreground-subdued);background:transparent;border:0;border-bottom:2px solid transparent;font:inherit;cursor:pointer}.mode-tabs button.active{color:var(--theme--foreground);border-bottom-color:var(--theme--primary)}.mode-tabs strong{display:grid;min-width:20px;height:20px;place-items:center;border-radius:10px;background:var(--theme--background-accent);font-size:12px}.workspace{display:grid;grid-template-columns:minmax(260px,350px) minmax(0,1fr);min-height:530px;border:1px solid var(--theme--border-color);border-radius:6px;overflow:hidden;background:var(--theme--background)}.record-list{display:grid;align-content:start;gap:7px;padding:14px;border-right:1px solid var(--theme--border-color);background:var(--theme--background-accent);overflow:auto}.list-help{margin:0 0 5px;color:var(--theme--foreground-subdued);font-size:13px;line-height:1.55}.record-choice{position:relative;display:grid;gap:4px;width:100%;padding:11px 13px;text-align:left;color:var(--theme--foreground);background:var(--theme--background);border:1px solid var(--theme--border-color);border-radius:4px;cursor:pointer}.record-choice.active{border-color:var(--theme--primary);box-shadow:inset 3px 0 0 var(--theme--primary)}.record-choice span{overflow:hidden;font-weight:600;text-overflow:ellipsis;white-space:nowrap}.record-choice small{overflow:hidden;color:var(--theme--foreground-subdued);text-overflow:ellipsis;white-space:nowrap}.record-choice i{position:absolute;top:10px;right:10px;padding:2px 5px;border-radius:3px;background:var(--theme--background-accent);color:var(--theme--foreground-subdued);font-size:11px;font-style:normal}.record-choice span{padding-right:58px}.record-choice i[data-status='published']{color:var(--theme--success)}.record-choice i[data-status='unpublished']{color:var(--theme--danger)}.empty{align-self:center;margin:0;color:var(--theme--foreground-subdued);text-align:center}.publication-detail{display:grid;align-content:start;gap:16px;padding:24px}.detail-heading{display:flex;align-items:start;justify-content:space-between;gap:14px}.detail-heading h3{margin:6px 0 0;font-size:23px;overflow-wrap:anywhere}.status{padding:4px 8px;border-radius:3px;background:var(--theme--background-accent);font-size:12px;white-space:nowrap}.status[data-status='published']{color:var(--theme--success)}.status[data-status='unpublished']{color:var(--theme--danger)}.metadata{display:flex;flex-wrap:wrap;gap:7px}.metadata span{padding:4px 8px;border-radius:999px;background:var(--theme--background-accent);color:var(--theme--foreground-subdued);font-size:12px}.note-display{display:grid;gap:6px;margin:0;border-left:3px solid var(--theme--primary);padding:10px 12px;background:var(--theme--background-accent);color:var(--theme--foreground-subdued);font-size:13px;line-height:1.5;white-space:pre-wrap;overflow-wrap:anywhere}.note-display strong{color:var(--theme--foreground)}.detail-copy{max-width:680px;margin:0;color:var(--theme--foreground-subdued);line-height:1.6}.note-field{display:grid;gap:7px;color:var(--theme--foreground-subdued);font-size:13px}.note-field textarea{box-sizing:border-box;width:100%;max-width:680px;resize:vertical;padding:9px 10px;border:1px solid var(--theme--border-color);border-radius:4px;background:var(--theme--background);color:var(--theme--foreground);font:inherit;line-height:1.5}.actions{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}.actions a{color:var(--theme--primary);font-size:13px}.primary-action{border-color:var(--theme--primary);background:var(--theme--primary);color:var(--theme--primary-foreground)}.primary-action.danger{border-color:var(--theme--danger);background:var(--theme--danger);color:var(--theme--danger-foreground,#fff)}.detail-empty{display:grid;place-items:center}@media(max-width:760px){.workspace{grid-template-columns:1fr}.record-list{max-height:300px;border-right:0;border-bottom:1px solid var(--theme--border-color)}.publication-detail{padding:18px}.detail-heading{display:grid}.actions{align-items:stretch;flex-direction:column}.primary-action{width:100%}.mode-tabs{overflow-x:auto}.mode-tabs button{flex:0 0 auto}}
</style>
