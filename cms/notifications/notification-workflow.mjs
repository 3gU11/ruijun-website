const finalStatuses = new Set(['sent', 'manual_sent', 'resolved']);

export class NotificationWorkflowError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'NotificationWorkflowError';
    this.code = code;
  }
}

function text(value, maximum = 500) {
  return typeof value === 'string' ? value.normalize('NFKC').trim().replace(/\s+/g, ' ').slice(0, maximum) : '';
}

function activityLog(value) {
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

function validDate(value) {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

function error(message) {
  return text(message, 500) || 'Notification delivery failed';
}

function audit(current, action, actor, timestamp, note) {
  return [...activityLog(current.activity_log), { action, actor, at: timestamp.toISOString(), ...(note ? { note } : {}) }];
}

function lockFields() {
  return { lock_token: null, locked_at: null, locked_by: null };
}

function requireActor(actor) {
  const id = text(actor?.id, 128);
  if (!id || !['worker', 'manager'].includes(actor?.kind)) {
    throw new NotificationWorkflowError('ACTOR_REQUIRED', 'Only an authorized notification worker or manager can update this job');
  }
  return id;
}

export function applyNotificationWorkflowUpdate({ current, input, actor, now = () => new Date() }) {
  const existing = current && typeof current === 'object' ? current : null;
  if (!existing || typeof existing.status !== 'string') throw new NotificationWorkflowError('JOB_NOT_FOUND', 'Notification job is unavailable');
  if (finalStatuses.has(existing.status)) throw new NotificationWorkflowError('FINALIZED_JOB', 'A completed notification job cannot be changed');

  const actorId = requireActor(actor);
  const payload = input && typeof input === 'object' ? input : {};
  const target = text(payload.status, 64);
  const timestamp = now();
  if (!(timestamp instanceof Date) || Number.isNaN(timestamp.getTime())) throw new TypeError('now must return a valid Date');

  if (actor.kind === 'worker') {
    const providedLock = text(payload.lock_token, 128);
    if ((existing.status === 'pending' || existing.status === 'retrying') && target === 'processing') {
      if (!providedLock) throw new NotificationWorkflowError('LOCK_REQUIRED', 'A worker claim requires a lock token');
      return {
        status: 'processing', lock_token: providedLock, locked_by: actorId, locked_at: timestamp.toISOString(),
        activity_log: audit(existing, 'worker_claimed', actorId, timestamp)
      };
    }
    if (existing.status !== 'processing' || !providedLock || providedLock !== existing.lock_token) {
      throw new NotificationWorkflowError('LOCK_MISMATCH', 'The notification job is not locked by this worker');
    }
    const attempts = Number(payload.attempts);
    if (!Number.isInteger(attempts) || attempts !== Number(existing.attempts || 0) + 1) {
      throw new NotificationWorkflowError('INVALID_ATTEMPTS', 'Worker attempts must increase by exactly one');
    }
    if (target === 'sent') {
      return {
        status: 'sent', attempts, sent_at: validDate(payload.sent_at) ? payload.sent_at : timestamp.toISOString(), next_attempt_at: null, last_error: null,
        ...lockFields(), activity_log: audit(existing, 'delivered', actorId, timestamp)
      };
    }
    if (target === 'retrying' && validDate(payload.next_attempt_at)) {
      return {
        status: 'retrying', attempts, next_attempt_at: payload.next_attempt_at, last_error: error(payload.last_error),
        ...lockFields(), activity_log: audit(existing, 'delivery_retry_scheduled', actorId, timestamp)
      };
    }
    if (target === 'manual_review') {
      return {
        status: 'manual_review', attempts, next_attempt_at: null, last_error: error(payload.last_error),
        ...lockFields(), activity_log: audit(existing, 'delivery_needs_manual_review', actorId, timestamp)
      };
    }
    throw new NotificationWorkflowError('INVALID_TRANSITION', 'The requested worker transition is not permitted');
  }

  const note = text(payload.manual_note);
  if (!note) throw new NotificationWorkflowError('NOTE_REQUIRED', 'A manual handling note is required');
  if (existing.status !== 'manual_review') throw new NotificationWorkflowError('INVALID_TRANSITION', 'Only manual-review jobs can be handled manually');
  const common = {
    manual_note: note, handled_by: actorId, handled_at: timestamp.toISOString(), ...lockFields()
  };
  if (target === 'retrying') {
    return {
      status: 'retrying', next_attempt_at: timestamp.toISOString(), last_error: null, ...common,
      activity_log: audit(existing, 'manual_retry', actorId, timestamp, note)
    };
  }
  if (target === 'manual_sent') {
    return {
      status: 'manual_sent', sent_at: timestamp.toISOString(), next_attempt_at: null, ...common,
      activity_log: audit(existing, 'manual_sent', actorId, timestamp, note)
    };
  }
  if (target === 'resolved') {
    return {
      status: 'resolved', sent_at: null, next_attempt_at: null, ...common,
      activity_log: audit(existing, 'manual_resolved', actorId, timestamp, note)
    };
  }
  throw new NotificationWorkflowError('INVALID_TRANSITION', 'The requested manual transition is not permitted');
}
