<template>
  <private-view title="通知异常处理">
    <div class="notification-workbench">
      <div class="toolbar">
        <div class="toolbar-copy">
          <p class="eyebrow">通知异常</p>
          <p>仅显示已达到人工处理状态的通知任务。操作说明会写入服务器审计记录。</p>
        </div>
        <button class="secondary-action" type="button" :disabled="loading" @click="loadJobs">刷新</button>
      </div>

      <p v-if="message" class="status-message" role="status">{{ message }}</p>
      <p v-if="error" class="error-message" role="alert">{{ error }}</p>

      <div v-if="loading" class="empty-state">正在读取异常通知任务...</div>
      <div v-else-if="!jobs.length" class="empty-state">当前没有需要人工处理的通知任务。</div>

      <div v-else class="job-grid">
        <article v-for="job in jobs" :key="job.id" class="job-card">
          <header>
            <div>
              <p class="reference">{{ job.lead_reference || `#${job.id}` }}</p>
              <h2>通知未自动送达</h2>
            </div>
            <span class="status">人工处理</span>
          </header>

          <dl class="job-details">
            <dt>通知渠道</dt><dd>{{ job.delivery_channel || '未指定' }}</dd>
            <dt>投递次数</dt><dd>{{ attemptLabel(job.attempts) }}</dd>
            <dt>最后失败时间</dt><dd>{{ formatTime(job.date_updated) }}</dd>
          </dl>
          <p v-if="job.last_error" class="last-error"><strong>失败原因</strong>{{ job.last_error }}</p>

          <section class="manual-action">
            <label :for="`note-${job.id}`">人工处理说明</label>
            <textarea :id="`note-${job.id}`" v-model="notes[job.id]" rows="3" maxlength="500" placeholder="例如：已确认渠道恢复，重新发送；或已通过电话/企业微信人工通知。" />
            <div class="actions">
              <button class="primary-action" type="button" :disabled="savingId === job.id || !noteFor(job).trim()" @click="handleJob(job, 'retrying', '任务已重新进入投递队列。')">重新投递</button>
              <button class="secondary-action" type="button" :disabled="savingId === job.id || !noteFor(job).trim()" @click="handleJob(job, 'manual_sent', '已记录人工通知完成。')">已人工通知</button>
              <button class="resolve-action" type="button" :disabled="savingId === job.id || !noteFor(job).trim()" @click="handleJob(job, 'resolved', '已记录任务解决，无需再次投递。')">标记解决</button>
            </div>
          </section>

          <details v-if="activityFor(job).length" class="activity">
            <summary>查看队列记录（{{ activityFor(job).length }}）</summary>
            <ol>
              <li v-for="(entry, index) in activityFor(job)" :key="`${entry.at || 'unknown'}-${index}`">
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
const jobs = ref([]);
const notes = ref({});
const loading = ref(false);
const savingId = ref(null);
const error = ref('');
const message = ref('');
const fields = [
  'id', 'lead_reference', 'delivery_channel', 'attempts', 'next_attempt_at', 'sent_at', 'last_error',
  'handled_by', 'handled_at', 'manual_note', 'activity_log', 'status', 'date_created', 'date_updated'
].join(',');

function errorMessage(reason, fallback) {
  return reason?.response?.data?.errors?.[0]?.message || fallback;
}

function formatTime(value) {
  if (typeof value !== 'string' || !value.trim()) return '时间未知';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '时间未知' : date.toLocaleString('zh-CN', { hour12: false });
}

function attemptLabel(value) {
  const attempts = Number(value);
  return Number.isFinite(attempts) && attempts >= 0 ? `${attempts} 次` : '未知';
}

function actionLabel(action) {
  return {
    worker_claimed: '开始投递', delivered: '自动投递成功', delivery_retry_scheduled: '安排重试',
    delivery_needs_manual_review: '转人工处理', manual_retry: '人工重新投递',
    manual_sent: '人工通知完成', manual_resolved: '人工标记解决'
  }[action] || action || '状态更新';
}

function activityFor(job) {
  const value = job?.activity_log;
  if (Array.isArray(value)) return value.filter((entry) => entry && typeof entry === 'object');
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((entry) => entry && typeof entry === 'object') : [];
  } catch {
    return [];
  }
}

function noteFor(job) {
  return notes.value[job.id] || '';
}

function resetNotes(records) {
  notes.value = Object.fromEntries(records.map((job) => [job.id, typeof job.manual_note === 'string' ? job.manual_note : '']));
}

async function loadJobs() {
  loading.value = true;
  error.value = '';
  try {
    const query = new URLSearchParams({ fields, limit: '100', sort: '-date_updated' });
    query.set('filter[status][_eq]', 'manual_review');
    const response = await api.get(`/items/lead_notification_jobs?${query.toString()}`);
    const records = Array.isArray(response.data?.data) ? response.data.data : [];
    jobs.value = records;
    resetNotes(records);
  } catch (reason) {
    jobs.value = [];
    error.value = errorMessage(reason, '无法读取通知任务。请确认当前账号属于通知管理员或系统管理员。');
  } finally {
    loading.value = false;
  }
}

async function handleJob(job, status, successMessage) {
  savingId.value = job.id;
  error.value = '';
  message.value = '';
  try {
    await api.patch(`/items/lead_notification_jobs/${encodeURIComponent(job.id)}`, {
      status,
      manual_note: noteFor(job)
    });
    message.value = successMessage;
    await loadJobs();
  } catch (reason) {
    error.value = errorMessage(reason, '保存失败。通知任务状态未变更，请刷新后重试。');
  } finally {
    savingId.value = null;
  }
}

onMounted(loadJobs);
</script>

<style scoped>
.notification-workbench { display: grid; gap: 20px; max-width: 1200px; padding: 4px 0 28px; }
.toolbar { display: flex; align-items: end; justify-content: space-between; gap: 16px; flex-wrap: wrap; }.toolbar-copy p { margin: 0; color: var(--theme--foreground-subdued); }.toolbar-copy .eyebrow { margin-bottom: 6px; color: var(--theme--primary); font: 600 12px ui-monospace, monospace; letter-spacing: .08em; }
button, textarea { border-radius: 4px; font: inherit; } button { padding: 9px 13px; cursor: pointer; } button:disabled { cursor: not-allowed; opacity: .55; }
.secondary-action { border: 1px solid var(--theme--border-color); background: var(--theme--background); color: var(--theme--foreground); }.primary-action { border: 1px solid var(--theme--primary); background: var(--theme--primary); color: var(--theme--primary-foreground); }.resolve-action { border: 1px solid var(--theme--danger); background: transparent; color: var(--theme--danger); }
.status-message, .error-message, .empty-state { margin: 0; padding: 12px 14px; border-radius: 4px; background: var(--theme--background-accent); }.error-message { color: var(--theme--danger); }
.job-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }.job-card { display: grid; gap: 16px; border: 1px solid var(--theme--border-color); border-radius: 6px; background: var(--theme--background); padding: 18px; }.job-card header { display: flex; align-items: start; justify-content: space-between; gap: 14px; }.reference { margin: 0; color: var(--theme--foreground-subdued); font: 12px ui-monospace, monospace; } h2 { margin: 5px 0 0; font-size: 20px; }.status { border-radius: 999px; background: var(--theme--background-accent); color: var(--theme--warning); padding: 4px 8px; font-size: 12px; white-space: nowrap; }
.job-details { display: grid; grid-template-columns: minmax(0, 112px) minmax(0, 1fr); gap: 7px 14px; margin: 0; font-size: 13px; }.job-details dt { color: var(--theme--foreground-subdued); }.job-details dd { margin: 0; overflow-wrap: anywhere; }.last-error { display: grid; gap: 5px; margin: 0; border-left: 2px solid var(--theme--danger); padding-left: 10px; color: var(--theme--foreground-subdued); line-height: 1.6; overflow-wrap: anywhere; }.last-error strong { color: var(--theme--foreground); }
.manual-action { display: grid; gap: 8px; border-top: 1px solid var(--theme--border-color); padding-top: 16px; } label { color: var(--theme--foreground-subdued); font-size: 13px; } textarea { width: 100%; box-sizing: border-box; resize: vertical; border: 1px solid var(--theme--border-color); background: var(--theme--background); color: var(--theme--foreground); padding: 9px 10px; }.actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.activity { border-top: 1px solid var(--theme--border-color); padding-top: 12px; }.activity summary { cursor: pointer; color: var(--theme--primary); font-size: 13px; }.activity ol { display: grid; gap: 8px; margin: 12px 0 0; padding-left: 20px; }.activity li { color: var(--theme--foreground-subdued); font-size: 13px; }.activity strong { display: block; color: var(--theme--foreground); }.activity span { display: block; margin-top: 2px; }.activity p { margin: 4px 0 0; white-space: pre-wrap; }
@media (max-width: 860px) { .job-grid { grid-template-columns: 1fr; } } @media (max-width: 520px) { .toolbar { align-items: stretch; }.toolbar > button { width: 100%; }.job-card { padding: 15px; }.job-card header { display: grid; }.status { width: max-content; }.job-details { grid-template-columns: 1fr; gap: 3px; }.job-details dd { margin-bottom: 7px; }.actions > button { width: 100%; } }
</style>
