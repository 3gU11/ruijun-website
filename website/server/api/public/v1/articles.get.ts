import { useCmsArticleReader } from '../../../utils/cms-article-reader';

export default defineEventHandler((event) => {
  return useCmsArticleReader(useRuntimeConfig(event)).list();
});
