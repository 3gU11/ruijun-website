import assert from 'node:assert/strict';
import test from 'node:test';

const { LeadWorkflowError, applyLeadWorkflowUpdate } = await import('../lead-workflow/lead-workflow.mjs');
const { registerLeadWorkflowHook } = await import('../extensions/lead-workflow/dist/index.js');

const now = () => new Date('2026-08-01T08:00:00.000Z');

test('sales workflow claims a new lead for the active salesperson and appends a generated audit entry', () => {
  assert.deepEqual(applyLeadWorkflowUpdate({
    current: { status: 'new', owner: null, activity_log: [{ action: 'created', actor: 'official_site_bff', at: '2026-08-01T07:00:00.000Z' }] },
    input: { status: 'assigned' }, actorId: 'sales-1', now
  }), {
    owner: 'sales-1', status: 'assigned', follow_up_note: null,
    activity_log: [
      { action: 'created', actor: 'official_site_bff', at: '2026-08-01T07:00:00.000Z' },
      { action: 'claimed', actor: 'sales-1', at: '2026-08-01T08:00:00.000Z' }
    ]
  });
});

test('sales workflow permits follow-up notes and valid closing transitions only for the assigned salesperson', () => {
  const inProgress = applyLeadWorkflowUpdate({
    current: { status: 'assigned', owner: 'sales-1', activity_log: [] }, input: { status: 'in_progress', follow_up_note: '已电话确认加工材料' }, actorId: 'sales-1', now
  });
  assert.deepEqual(inProgress, {
    owner: 'sales-1', status: 'in_progress', follow_up_note: '已电话确认加工材料',
    activity_log: [{ action: 'started_follow_up', actor: 'sales-1', at: '2026-08-01T08:00:00.000Z', note: '已电话确认加工材料' }]
  });
  assert.deepEqual(applyLeadWorkflowUpdate({
    current: { status: 'in_progress', owner: 'sales-1', activity_log: [] }, input: { status: 'converted', follow_up_note: '客户确认下单' }, actorId: 'sales-1', now
  }), {
    owner: 'sales-1', status: 'converted', follow_up_note: '客户确认下单',
    activity_log: [{ action: 'closed_converted', actor: 'sales-1', at: '2026-08-01T08:00:00.000Z', note: '客户确认下单' }]
  });
  assert.throws(() => applyLeadWorkflowUpdate({
    current: { status: 'assigned', owner: 'sales-1', activity_log: [] }, input: { status: 'converted' }, actorId: 'sales-1', now
  }), (error) => error instanceof LeadWorkflowError && error.code === 'INVALID_TRANSITION');
  assert.throws(() => applyLeadWorkflowUpdate({
    current: { status: 'in_progress', owner: 'sales-1', activity_log: [] }, input: { follow_up_note: '越权跟进' }, actorId: 'sales-2', now
  }), (error) => error instanceof LeadWorkflowError && error.code === 'NOT_OWNER');
});

test('sales workflow preserves previously persisted JSON audit entries when the Directus hook reads from SQLite', () => {
  const result = applyLeadWorkflowUpdate({
    current: {
      status: 'assigned', owner: 'sales-1',
      activity_log: '[{"action":"claimed","actor":"sales-1","at":"2026-08-01T07:00:00.000Z"}]'
    },
    input: { status: 'in_progress', follow_up_note: 'E2E follow-up' }, actorId: 'sales-1', now
  });

  assert.deepEqual(result.activity_log.map((entry) => entry.action), ['claimed', 'started_follow_up']);
});

test('Directus lead workflow hook queries the current lead then replaces client activity data with the generated audit entry', async () => {
  let callback;
  registerLeadWorkflowHook({ filter: (event, handler) => { assert.equal(event, 'leads.items.update'); callback = handler; } });
  const current = { id: 'lead-1', status: 'new', owner: null, activity_log: [] };
  const database = () => ({ whereIn: () => ({ first: async () => current }) });

  const result = await callback({ status: 'assigned', activity_log: [{ action: 'spoofed' }] }, { keys: ['lead-1'] }, { accountability: { user: 'sales-1' }, database });
  assert.deepEqual(result, {
    owner: 'sales-1', status: 'assigned', follow_up_note: null,
    activity_log: [{ action: 'claimed', actor: 'sales-1', at: result.activity_log[0].at }]
  });
  assert.match(result.activity_log[0].at, /^\d{4}-\d{2}-\d{2}T/);
});

test('Directus administrators using the sales workflow still receive a server-generated owner and audit entry', async () => {
  let callback;
  registerLeadWorkflowHook({ filter: (event, handler) => { assert.equal(event, 'leads.items.update'); callback = handler; } });
  const current = { id: 'lead-1', status: 'new', owner: null, activity_log: [] };
  const database = () => ({ whereIn: () => ({ first: async () => current }) });

  const result = await callback({ status: 'assigned', owner: 'forged-owner', activity_log: [{ action: 'spoofed' }] }, { keys: ['lead-1'] }, {
    accountability: { admin: true, user: 'administrator-1' }, database
  });

  assert.equal(result.owner, 'administrator-1');
  assert.equal(result.status, 'assigned');
  assert.deepEqual(result.activity_log.map((entry) => entry.action), ['claimed']);
});
