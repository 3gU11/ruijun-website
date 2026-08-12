import { createError, getRouterParam } from 'h3';
import { useCmsProductReader } from '../../../../utils/cms-product-reader';

export default defineEventHandler(async (event) => {
  try {
    const result = await useCmsProductReader(useRuntimeConfig(event)).getModel(getRouterParam(event, 'slug'));
    if (!result.data && result.source === 'cms' && result.cache !== 'unavailable') {
      throw createError({ statusCode: 410, statusMessage: 'Product is no longer published' });
    }
    return result;
  } catch (error) {
    if (error instanceof TypeError) throw createError({ statusCode: 400, statusMessage: 'Invalid product slug' });
    throw error;
  }
});
