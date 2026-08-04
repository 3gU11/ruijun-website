<template>
  <private-view title="销售线索">
    <div class="lead-workbench">
      <div class="toolbar">
        <div class="toolbar-copy">
          <p class="eyebrow">SALES INBOX</p>
          <p>显示当前账号有权限查看的未领取线索和本人线索。</p>
        </div>
        <button class="secondary-action" type="button" :disabled="loading" @click="loadLeads">刷新</button>
      </div>

      <p v-if="message" class="status-message" role="status">{{ message }}</p>
      <p v-if="error" class="error-message" role="alert">{{ error }}</p>

      <div v-if="loading" class="empty-state">正在读取销售线索...</div>
      <div v-else-if="!leads.length" class="empty-state">暂无待处理线索。新线索提交后会自动出现在当前可见范围内。</div>

      <div v-else class="lead-grid">
        <article v-for="lead in leads" :key="lead.id" class="lead-card">
          <header>
            <div>
              <p class="reference">{{ lead.lead_reference || `#${lead.id}` }}</p>
              <h2>{{ lead.name || '未命名联系人' }}</h2>
            </div>
            <span class="status" :class="`status-${lead.status}`">{{ statusLabel(lead.status) }}</span>
          </header>

          <dl class="lead-details">
            <template v-for="detail in detailsFor(lead)" :key="detail.label">
              <dt>{{ detail.label }}</dt>
              <dd>{{ detail.value }}</dd>
            </template>
          </dl>
          <p v-if="lead.requirement" class="requirement">{{ lead.requirement }}</p>

          <div v-if="isNew(lead)" class="actions">
            <button class="primary-action" type="button" :disabled="savingId === lead.id" @click="updateLead(lead, { status: 'assigned' }, '已领取该线索。')">领取线索</button>
          </div>

          <div v-else-if="isActive(lead)" class="follow-up">
            <label :for="`note-${lead.id}`">跟进记录</label>
            <textarea :id="`note-${lead.id}`" v-model="notes[lead.id]" rows="3" maxlength="500" placeholder="记录本次联系、客户需求或下一步安排" />
            <div class="actions">
              <button v-if="lead.status === 'assigned'" class="secondary-action" type="button" :disabled="savingId === lead.id || !noteFor(lead).trim()" @click="updateLead(lead, { status: 'in_progress', follow_up_note: noteFor(lead) }, '已开始跟进并记录本次信息。')">开始跟进</button>
              <button v-else class="secondary-action" type="button" :disabled="savingId === lead.id || !noteFor(lead).trim()" @click="updateLead(lead, { follow_up_note: noteFor(lead) }, '已保存跟进记录。')">保存记录</button>
              <select v-if="lead.status === 'in_progress'" v-model="closingStatus[lead.id]" :aria-label="`选择 ${lead.lead_reference || lead.id} 的关闭结果`">
                <option value="converted">已转化</option>
                <option value="invalid">无效</option>
                <option value="duplicate">重复</option>
                <option value="spam">垃圾线索</option>
              </select>
              <button v-if="lead.status === 'in_progress'" class="close-action" type="button" :disabled="savingId === lead.id || !noteFor(lead).trim()" @click="updateLead(lead, { status: closeStatusFor(lead), follow_up_note: noteFor(lead) }, '线索已按所选结果关闭。')">关闭线索</button>
            </div>
          </div>

          <details v-if="activityFor(lead).length" class="activity">
            <summary>查看办理记录（{{ activityFor(lead).length }}）</summary>
            <ol>
              <li v-for="(entry, index) in activityFor(lead)" :key="`${entry.at || 'unknown'}-${index}`">
                <strong>{{ actionLabel(entry.action) }}</strong>
                <span>{{ formatTime(entry.at) }} · {{ entry.actor || '系统' }}</span>
                <p v-if="entry.note">{{ entry.note }}</p>
              </li>
            </ol>
          </details>
        </article>
      </div>
    </div>
  </private-view>
</template>

<script setup>
import { useApi } from '@directus/extensions-sdk';
import { onMounted, ref } from 'vue';

const api = useApi();
const leads = ref([]);
const notes = ref({});
const closingStatus = ref({});
const loading = ref(false);
const savingId = ref(null);
const error = ref('');
const message = ref('');
const fields = [
  'id', 'lead_reference', 'lead_type', 'source_page', 'source_campaign', 'name', 'phone', 'company', 'email',
  'requirement', 'product_series', 'product_model', 'owner', 'activity_log', 'follow_up_note', 'consent_at', 'status',
  'date_created', 'date_updated'
].join(',');

function errorMessage(reason, fallback) {
  return reason?.response?.data?.errors?.[0]?.message || fallback;
}

function statusLabel(status) {
  return {
    new: '待领取', assigned: '已领取', in_progress: '跟进中', converted: '已转化',
    invalid: '无效', duplicate: '重复', spam: '垃圾线索'
  }[status] || status || '未知';
}

function actionLabel(action) {
  return {
    created: '提交线索', claimed: '领取线索', started_follow_up: '开始跟进', note: '跟进记录',
    closed_converted: '转化完成', closed_invalid: '标记无效', closed_duplicate: '标记重复', closed_spam: '标记垃圾线索'
  }[action] || action || '状态更新';
}

function formatTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '时间未知' : date.toLocaleString('zh-CN', { hour12: false });
}

function activityFor(lead) {
  const value = lead?.activity_log;
  if (Array.isArray(value)) return value.filter((entry) => entry && typeof entry === 'object');
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((entry) => entry && typeof entry === 'object') : [];
  } catch {
    return [];
  }
}

function detailsFor(lead) {
  return [
    ['咨询类型', lead.lead_type], ['联系电话', lead.phone], ['企业', lead.company], ['邮箱', lead.email],
    ['产品系列', lead.product_series], ['产品型号', lead.product_model], ['来源页面', lead.source_page], ['提交时间', formatTime(lead.date_created)]
  ].filter(([, value]) => value).map(([label, value]) => ({ label, value }));
}

function isNew(lead) {
  return lead.status === 'new';
}

function isActive(lead) {
  return lead.status === 'assigned' || lead.status === 'in_progress';
}

function noteFor(lead) {
  return notes.value[lead.id] || '';
}

function closeStatusFor(lead) {
  return closingStatus.value[lead.id] || 'converted';
}

function resetEditors(records) {
  const nextNotes = {};
  const nextClosingStatus = {};
  for (const lead of records) {
    nextNotes[lead.id] = typeof lead.follow_up_note === 'string' ? lead.follow_up_note : '';
    nextClosingStatus[lead.id] = 'converted';
  }
  notes.value = nextNotes;
  closingStatus.value = nextClosingStatus;
}

async function loadLeads() {
  loading.value = true;
  error.value = '';
  try {
    const response = await api.get(`/items/leads?fields=${encodeURIComponent(fields)}&sort=-date_created&limit=100`);
    const records = Array.isArray(response.data?.data) ? response.data.data : [];
    leads.value = records;
    resetEditors(records);
  } catch (reason) {
    leads.value = [];
    error.value = errorMessage(reason, '无法读取线索。请确认当前账号属于销售人员或管理员。');
  } finally {
    loading.value = false;
  }
}

async function updateLead(lead, payload, successMessage) {
  savingId.value = lead.id;
  error.value = '';
  message.value = '';
  try {
    await api.patch(`/items/leads/${encodeURIComponent(lead.id)}`, payload);
    message.value = successMessage;
    await loadLeads();
  } catch (reason) {
    error.value = errorMessage(reason, '保存失败。线索状态未变更，请刷新后重试。');
  } finally {
    savingId.value = null;
  }
}

onMounted(loadLeads);
</script>

<style scoped>
.lead-workbench { display: grid; gap: 20px; max-width: 1280px; padding: 4px 0 28px; }
.toolbar { display: flex; align-items: end; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.toolbar-copy p { margin: 0; color: var(--theme--foreground-subdued); }
.toolbar-copy .eyebrow { margin-bottom: 6px; color: var(--theme--primary); font: 600 12px ui-monospace, monospace; letter-spacing: .08em; }
.secondary-action, .primary-action, .close-action, select, textarea { border-radius: 4px; font: inherit; }
button { padding: 9px 13px; cursor: pointer; }
button:disabled { cursor: not-allowed; opacity: .55; }
.secondary-action { border: 1px solid var(--theme--border-color); background: var(--theme--background); color: var(--theme--foreground); }
.primary-action { border: 1px solid var(--theme--primary); background: var(--theme--primary); color: var(--theme--primary-foreground); }
.close-action { border: 1px solid var(--theme--danger); background: transparent; color: var(--theme--danger); }
.status-message, .error-message, .empty-state { margin: 0; padding: 12px 14px; border-radius: 4px; background: var(--theme--background-accent); }
.error-message { color: var(--theme--danger); }
.lead-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.lead-card { display: grid; gap: 16px; border: 1px solid var(--theme--border-color); border-radius: 6px; background: var(--theme--background); padding: 18px; }
.lead-card header { display: flex; align-items: start; justify-content: space-between; gap: 14px; }
.reference { margin: 0; color: var(--theme--foreground-subdued); font: 12px ui-monospace, monospace; }
h2 { margin: 5px 0 0; font-size: 20px; }
.status { flex: 0 0 auto; border-radius: 999px; background: var(--theme--background-accent); padding: 4px 8px; font-size: 12px; white-space: nowrap; }
.status-new { color: var(--theme--warning); }.status-in_progress { color: var(--theme--primary); }.status-converted { color: var(--theme--success); }
.lead-details { display: grid; grid-template-columns: minmax(0, 112px) minmax(0, 1fr); gap: 7px 14px; margin: 0; font-size: 13px; }
.lead-details dt { color: var(--theme--foreground-subdued); }.lead-details dd { margin: 0; overflow-wrap: anywhere; }
.requirement { margin: 0; border-left: 2px solid var(--theme--primary); padding-left: 10px; color: var(--theme--foreground-subdued); line-height: 1.65; white-space: pre-wrap; }
.follow-up { display: grid; gap: 8px; border-top: 1px solid var(--theme--border-color); padding-top: 16px; }
label { color: var(--theme--foreground-subdued); font-size: 13px; } textarea { width: 100%; box-sizing: border-box; resize: vertical; border: 1px solid var(--theme--border-color); background: var(--theme--background); color: var(--theme--foreground); padding: 9px 10px; }
.actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }.actions select { min-height: 36px; border: 1px solid var(--theme--border-color); background: var(--theme--background); color: var(--theme--foreground); padding: 7px 9px; }
.activity { border-top: 1px solid var(--theme--border-color); padding-top: 12px; }.activity summary { cursor: pointer; color: var(--theme--primary); font-size: 13px; }.activity ol { display: grid; gap: 8px; margin: 12px 0 0; padding-left: 20px; }.activity li { color: var(--theme--foreground-subdued); font-size: 13px; }.activity strong { display: block; color: var(--theme--foreground); }.activity span { display: block; margin-top: 2px; }.activity p { margin: 4px 0 0; white-space: pre-wrap; }
@media (max-width: 860px) { .lead-grid { grid-template-columns: 1fr; } }
@media (max-width: 520px) { .toolbar { align-items: stretch; }.toolbar > button { width: 100%; }.lead-card { padding: 15px; }.lead-card header { display: grid; }.status { width: max-content; }.lead-details { grid-template-columns: 1fr; gap: 3px; }.lead-details dd { margin-bottom: 7px; }.actions > button, .actions select { width: 100%; } }
</style>
