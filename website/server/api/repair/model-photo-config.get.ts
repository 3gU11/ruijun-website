import { getQuery } from 'h3';
import { repairApi } from '../../services/repair-api.mjs';

export default defineEventHandler((event) => {
  const modelCode = String(getQuery(event).modelCode || '').trim();
  return repairApi(event, `/model-photo-config${modelCode ? `?modelCode=${encodeURIComponent(modelCode)}` : ''}`);
});
