import assert from 'node:assert/strict';
import test from 'node:test';

const { registerNotificationWorkflowHook } = await import('../extensions/notification-workflow/dist/index.js');

function hookContext({ roleName, job, user = 'user-1' }) {
  return {
    accountability: { user, role: 'role-1' },
    database(table) {
      return {
        where() { return this; },
        whereIn() { return this; },
        async first() {
          return table === 'directus_roles' ? { id: 'role-1', name: roleName } : job;
        }
      };
    }
  };
}

test('notification hook accepts only the worker role and replaces the client payload with a server-generated claim', async () => {
  let callback;
  registerNotificationWorkflowHook({ filter: (_event, handler) => { callback = handler; } });

  const result = await callback(
    { status: 'processing', lock_token: 'worker-lock', attempts: 99 },
    { keys: ['job-1'] },
hookContext({ roleName: '通知任务服务账号', job: { id: 'job-1', status: 'pending', attempts: 0, activity_log: [] } })
  );

  assert.deepEqual(result.status, 'processing');
  assert.equal(result.lock_token, 'worker-lock');
  assert.equal(result.attempts, undefined);
  assert.equal(result.activity_log.at(-1).action, 'worker_claimed');
});

test('notification hook blocks sales roles and requires a manual note for manager actions', async () => {
  let callback;
  registerNotificationWorkflowHook({ filter: (_event, handler) => { callback = handler; } });
  const job = { id: 'job-1', status: 'manual_review', attempts: 3, activity_log: [] };

  await assert.rejects(
    callback({ status: 'resolved', manual_note: 'Handled' }, { keys: ['job-1'] }, hookContext({ roleName: 'Salesperson', job })),
  /当前角色不能处理通知任务/
  );
  await assert.rejects(
callback({ status: 'resolved' }, { keys: ['job-1'] }, hookContext({ roleName: '通知管理员', job })),
    /manual handling note is required/
  );
});
