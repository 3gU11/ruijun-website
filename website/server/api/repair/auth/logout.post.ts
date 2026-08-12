import { repairApi } from '../../../services/repair-api.mjs';
export default defineEventHandler((event) => repairApi(event, '/auth/logout', { method: 'POST', body: { type: 'client' } }));
