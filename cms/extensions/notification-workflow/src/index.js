import { ForbiddenError, InvalidPayloadError } from '@directus/errors';
import { NotificationWorkflowError, applyNotificationWorkflowUpdate } from '../../../notifications/notification-workflow.mjs';

const WORKER_ROLE_NAME = '通知任务服务账号';
const MANAGER_ROLE_NAME = '通知管理员';

async function actorFor(context) {
  const accountability = context.accountability;
  if (!accountability?.user) throw new ForbiddenError({ reason: '只有已登录的通知任务服务账号或通知管理员可以更新通知任务' });
  if (accountability.admin) return { kind: 'manager', id: accountability.user };
  const role = accountability.role
    ? await context.database('directus_roles').where({ id: accountability.role }).first()
    : null;
  if (role?.name === WORKER_ROLE_NAME) return { kind: 'worker', id: accountability.user };
  if (role?.name === MANAGER_ROLE_NAME) return { kind: 'manager', id: accountability.user };
  throw new ForbiddenError({ reason: '当前角色不能处理通知任务' });
}

export function registerNotificationWorkflowHook({ filter }) {
  filter('lead_notification_jobs.items.update', async (payload, meta, context) => {
    if (!Array.isArray(meta.keys) || meta.keys.length !== 1) throw new InvalidPayloadError({ reason: 'Notification updates must target exactly one record' });
    const [actor, current] = await Promise.all([
      actorFor(context),
      context.database('lead_notification_jobs').whereIn('id', meta.keys).first()
    ]);
    try {
      return applyNotificationWorkflowUpdate({ current, input: payload, actor });
    } catch (error) {
      if (error instanceof NotificationWorkflowError && ['ACTOR_REQUIRED', 'LOCK_MISMATCH'].includes(error.code)) {
        throw new ForbiddenError({ reason: error.message });
      }
      if (error instanceof NotificationWorkflowError) throw new InvalidPayloadError({ reason: error.message });
      throw error;
    }
  });
}

export default registerNotificationWorkflowHook;
