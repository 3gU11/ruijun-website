import { repairApi } from '../../../services/repair-api.mjs';
export default defineEventHandler((event) => repairApi(event, '/auth/me?type=client&optional=1'));
