import { createError, getRouterParam } from 'h3';
import { useCmsArticleReader } from '../../../../utils/cms-article-reader';

export default defineEventHandler(async (event) => {
  try {
    return await useCmsArticleReader(useRuntimeConfig(event)).get(getRouterParam(event, 'slug'));
  } catch (error) {
    if (error instanceof TypeError) throw createError({ statusCode: 400, statusMessage: 'Invalid article slug' });
    throw error;
  }
});
