import { readBody } from 'h3';
import { repairApi } from '../../../services/repair-api.mjs';
export default defineEventHandler(async (event) => repairApi(event, '/auth/register', { method: 'POST', body: await readBody(event) }));
