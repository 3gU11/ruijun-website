import { repairApi } from '../../services/repair-api.mjs';

export default defineEventHandler((event) => repairApi(event, '/model-dictionary'));
