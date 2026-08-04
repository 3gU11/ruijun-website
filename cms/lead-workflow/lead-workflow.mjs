const finalStatuses = new Set(['converted', 'invalid', 'duplicate', 'spam']);

export class LeadWorkflowError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'LeadWorkflowError';
    this.code = code;
  }
}

function text(value, maximum = 500) {
  return typeof value === 'string' ? value.normalize('NFKC').trim().replace(/\s+/g, ' ').slice(0, maximum) : '';
}

function existingActivityLog(value) {
  let entries = value;
  if (typeof value === 'string') {
    try {
      entries = JSON.parse(value);
    } catch {
      entries = [];
    }
  }
  return Array.isArray(entries) ? entries.filter((entry) => entry && typeof entry === 'object').slice(-199) : [];
}

function actionFor(currentStatus, targetStatus, hasNote) {
  if (currentStatus === 'new' && targetStatus === 'assigned') return 'claimed';
  if (currentStatus === 'assigned' && targetStatus === 'in_progress') return 'started_follow_up';
  if (currentStatus === 'in_progress' && finalStatuses.has(targetStatus)) return `closed_${targetStatus}`;
  if (currentStatus === targetStatus && hasNote && (currentStatus === 'assigned' || currentStatus === 'in_progress')) return 'note';
  return null;
}

export function applyLeadWorkflowUpdate({ current, input, actorId, now = () => new Date() }) {
  const actor = text(actorId, 128);
  const existing = current && typeof current === 'object' ? current : null;
  if (!actor) throw new LeadWorkflowError('ACTOR_REQUIRED', '当前销售人员身份无效');
  if (!existing || typeof existing.status !== 'string') throw new LeadWorkflowError('LEAD_NOT_FOUND', '线索不存在或状态无效');
  const currentStatus = existing.status;
  if (finalStatuses.has(currentStatus)) throw new LeadWorkflowError('FINALIZED_LEAD', '已关闭线索不能继续修改');
  if (currentStatus !== 'new' && existing.owner !== actor) throw new LeadWorkflowError('NOT_OWNER', '只能处理本人领取的线索');
  if (currentStatus === 'new' && existing.owner) throw new LeadWorkflowError('NOT_OWNER', '该线索已被其他销售人员领取');

  const payload = input && typeof input === 'object' ? input : {};
  const statusProvided = Object.hasOwn(payload, 'status');
  const targetStatus = statusProvided ? text(payload.status, 64) : currentStatus;
  const note = Object.hasOwn(payload, 'follow_up_note') ? text(payload.follow_up_note) : '';
  const action = actionFor(currentStatus, targetStatus, Boolean(note));
  if (!action) throw new LeadWorkflowError('INVALID_TRANSITION', '线索状态流转不符合办理流程');

  const timestamp = now();
  if (!(timestamp instanceof Date) || Number.isNaN(timestamp.getTime())) throw new TypeError('now must return a valid Date');
  const activity = { action, actor, at: timestamp.toISOString(), ...(note ? { note } : {}) };
  return {
    owner: actor,
    status: targetStatus,
    follow_up_note: note || (typeof existing.follow_up_note === 'string' ? existing.follow_up_note : null),
    activity_log: [...existingActivityLog(existing.activity_log), activity]
  };
}
