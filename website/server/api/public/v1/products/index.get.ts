import { createError, getQuery } from 'h3';
import { useCmsProductReader } from '../../../../utils/cms-product-reader';

export default defineEventHandler(async (event) => {
  const { series } = getQuery(event);
  if (series !== undefined && typeof series !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'Invalid series code' });
  }
  try {
    return await useCmsProductReader(useRuntimeConfig(event)).listProducts(series);
  } catch (error) {
    if (error instanceof TypeError) throw createError({ statusCode: 400, statusMessage: 'Invalid series code' });
    throw error;
  }
});
