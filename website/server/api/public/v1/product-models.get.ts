import { createError, getQuery } from 'h3';
import { useCmsProductReader } from '../../../utils/cms-product-reader';

export default defineEventHandler(async (event) => {
  try {
    return await useCmsProductReader(useRuntimeConfig(event)).listModels(getQuery(event).series);
  } catch (error) {
    if (error instanceof TypeError) throw createError({ statusCode: 400, statusMessage: 'Invalid series code' });
    throw error;
  }
});
