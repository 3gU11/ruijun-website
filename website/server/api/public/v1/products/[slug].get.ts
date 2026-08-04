import { createError, getRouterParam } from 'h3';
import { useCmsProductReader } from '../../../../utils/cms-product-reader';

export default defineEventHandler(async (event) => {
  try {
    return await useCmsProductReader(useRuntimeConfig(event)).getModel(getRouterParam(event, 'slug'));
  } catch (error) {
    if (error instanceof TypeError) throw createError({ statusCode: 400, statusMessage: 'Invalid product slug' });
    throw error;
  }
});
