import { getRouterParam, readBody } from 'h3';
import { repairApi } from '../../../services/repair-api.mjs';
export default defineEventHandler(async (event) => {
  const requestNo = encodeURIComponent(String(getRouterParam(event, 'requestNo') || '').trim());
  if (!requestNo) throw createError({ statusCode: 400, statusMessage: 'Request number is required' });
  return repairApi(event, `/repair-requests/${requestNo}/supplement`, { method: 'POST', body: await readBody(event) });
});
