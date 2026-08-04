import { createLeadNotificationWorker } from '../notifications/lead-notification-worker.mjs';

const worker = createLeadNotificationWorker({
  baseUrl: process.env.CMS_BASE_URL,
  accessToken: process.env.CMS_NOTIFICATION_WORKER_TOKEN,
  notificationUrl: process.env.SALES_NOTIFICATION_WEBHOOK_URL,
  maxAttempts: Number(process.env.LEAD_NOTIFICATION_MAX_ATTEMPTS || 3)
});

console.log(JSON.stringify(await worker.runOnce(), null, 2));
