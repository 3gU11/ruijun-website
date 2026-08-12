import { createError, getRouterParam } from 'h3';
import { useCmsArticleReader } from '../../../../utils/cms-article-reader';

export default defineEventHandler(async (event) => {
  try {
    const result = await useCmsArticleReader(useRuntimeConfig(event)).get(getRouterParam(event, 'slug'));
    if (!result.data && result.source === 'cms' && result.cache !== 'unavailable') {
      throw createError({ statusCode: 410, statusMessage: 'Article is no longer published' });
    }
    return result;
  } catch (error) {
    if (error instanceof TypeError) throw createError({ statusCode: 400, statusMessage: 'Invalid article slug' });
    throw error;
  }
});
