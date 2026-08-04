import assert from 'node:assert/strict';
import test from 'node:test';

const { NotificationWorkflowError, applyNotificationWorkflowUpdate } = await import('../notifications/notification-workflow.mjs');

const now = () => new Date('2026-08-01T08:00:00.000Z');

test('notification worker atomically claims only due pending work and requires its lock token to finish delivery', () => {
  const claimed = applyNotificationWorkflowUpdate({
    current: { status: 'pending', attempts: 0, activity_log: [] },
    input: { status: 'processing', lock_token: 'worker-lock-1' }, actor: { kind: 'worker', id: 'worker-user' }, now
  });
  assert.deepEqual(claimed, {
    status: 'processing', lock_token: 'worker-lock-1', locked_by: 'worker-user', locked_at: '2026-08-01T08:00:00.000Z',
    activity_log: [{ action: 'worker_claimed', actor: 'worker-user', at: '2026-08-01T08:00:00.000Z' }]
  });

  const sent = applyNotificationWorkflowUpdate({
    current: { ...claimed, attempts: 0 },
    input: { status: 'sent', attempts: 1, sent_at: '2026-08-01T08:00:00.000Z', lock_token: 'worker-lock-1' },
    actor: { kind: 'worker', id: 'worker-user' }, now
  });
  assert.equal(sent.status, 'sent');
  assert.equal(sent.attempts, 1);
  assert.equal(sent.lock_token, null);
  assert.equal(sent.locked_at, null);
  assert.equal(sent.activity_log.at(-1).action, 'delivered');

  assert.throws(() => applyNotificationWorkflowUpdate({
    current: { ...claimed, attempts: 0 }, input: { status: 'sent', attempts: 1, lock_token: 'other-worker-lock' },
    actor: { kind: 'worker', id: 'worker-user' }, now
  }), (error) => error instanceof NotificationWorkflowError && error.code === 'LOCK_MISMATCH');
});

test('manual reviewers may retry or resolve only manual-review jobs and every action gets a server audit entry', () => {
  const current = { status: 'manual_review', attempts: 3, activity_log: '[]', last_error: 'Delivery endpoint unavailable' };
  const retried = applyNotificationWorkflowUpdate({
    current, input: { status: 'retrying', manual_note: 'Webhook restored; retry after verification.' }, actor: { kind: 'manager', id: 'manager-1' }, now
  });
  assert.deepEqual(retried, {
    status: 'retrying', next_attempt_at: '2026-08-01T08:00:00.000Z', manual_note: 'Webhook restored; retry after verification.',
    handled_by: 'manager-1', handled_at: '2026-08-01T08:00:00.000Z', last_error: null, lock_token: null, locked_at: null, locked_by: null,
    activity_log: [{ action: 'manual_retry', actor: 'manager-1', at: '2026-08-01T08:00:00.000Z', note: 'Webhook restored; retry after verification.' }]
  });

  const resolved = applyNotificationWorkflowUpdate({
    current, input: { status: 'resolved', manual_note: 'Sales team notified manually.' }, actor: { kind: 'manager', id: 'manager-1' }, now
  });
  assert.equal(resolved.status, 'resolved');
  assert.equal(resolved.sent_at, null);
  assert.equal(resolved.activity_log.at(-1).action, 'manual_resolved');

  assert.throws(() => applyNotificationWorkflowUpdate({
    current: { status: 'sent', attempts: 1 }, input: { status: 'retrying', manual_note: 'retry' }, actor: { kind: 'manager', id: 'manager-1' }, now
  }), (error) => error instanceof NotificationWorkflowError && error.code === 'FINALIZED_JOB');
});
