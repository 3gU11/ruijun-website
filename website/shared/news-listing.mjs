function displayDate(article) {
  return String(article?.display_date || article?.published_at || '').trim();
}

function sameDaySortOrder(article) {
  const value = Number(article?.sort_order);
  return Number.isInteger(value) && value >= 0 ? value : Number.POSITIVE_INFINITY;
}

function compareRecordIdsDescending(left, right) {
  const leftId = Number(left?.id);
  const rightId = Number(right?.id);
  if (Number.isSafeInteger(leftId) && Number.isSafeInteger(rightId)) return rightId - leftId;

  const leftValue = String(left?.id ?? '');
  const rightValue = String(right?.id ?? '');
  if (leftValue === rightValue) return 0;
  return leftValue > rightValue ? -1 : 1;
}

export function formatNewsDisplayDate(value, fallback = '日期待定') {
  const source = String(value || '').trim();
  if (!source) return fallback;

  const dateOnly = source.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) {
    const [, year, month, day] = dateOnly;
    const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    if (parsed.getUTCFullYear() !== Number(year) || parsed.getUTCMonth() !== Number(month) - 1 || parsed.getUTCDate() !== Number(day)) return fallback;
    return `${Number(year)}年${Number(month)}月${Number(day)}日`;
  }

  const timestamp = Date.parse(source);
  if (!Number.isFinite(timestamp)) return fallback;
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  }).formatToParts(new Date(timestamp));
  const values = Object.fromEntries(parts
    .filter((part) => ['year', 'month', 'day'].includes(part.type))
    .map((part) => [part.type, part.value]));
  return values.year && values.month && values.day ? `${values.year}年${values.month}月${values.day}日` : fallback;
}

export function isVideoArticle(article) {
  const category = String(article?.category || '').trim().toLowerCase();
  const media = Array.isArray(article?.media) ? article.media : [];
  const hasGovernedVideo = media.some((entry) => {
    const mediaType = String(entry?.mediaType || entry?.media_type || '').trim().toLowerCase();
    const mimeType = String(entry?.mimeType || entry?.mime_type || '').trim().toLowerCase();
    return mediaType === 'video' || mimeType.startsWith('video/');
  });
  return ['video', '视频', 'video-sharing', '视频分享'].includes(category) || hasGovernedVideo || Boolean(article?.video_url || article?.video);
}

function isImageMedia(entry) {
  const mediaType = String(entry?.mediaType || entry?.media_type || '').trim().toLowerCase();
  const mimeType = String(entry?.mimeType || entry?.mime_type || '').trim().toLowerCase();
  return mediaType === 'image' || mimeType.startsWith('image/');
}

function isVideoMedia(entry) {
  const mediaType = String(entry?.mediaType || entry?.media_type || '').trim().toLowerCase();
  const mimeType = String(entry?.mimeType || entry?.mime_type || '').trim().toLowerCase();
  return mediaType === 'video' || mimeType.startsWith('video/');
}

/**
 * Resolve the image shown before a news video starts. The media resolver emits
 * both camelCase and Directus snake_case keys, so keep this normalization in
 * the shared listing contract instead of making each page guess the shape.
 */
export function resolveNewsMediaPoster(article) {
  const media = Array.isArray(article?.media) ? article.media : [];
  const videoPoster = media.find(isVideoMedia);
  const posterPath = videoPoster?.posterPath || videoPoster?.poster_path;
  if (posterPath) return String(posterPath);
  const image = media.find(isImageMedia);
  if (image?.path || image?.url) return String(image.path || image.url);
  return String(article?.cover_asset || '');
}

export function sortNewsByDisplayDate(records) {
  return (Array.isArray(records) ? records : [])
    .map((record, index) => ({ record, index }))
    .sort((left, right) => {
      const rightTime = Date.parse(displayDate(right.record));
      const leftTime = Date.parse(displayDate(left.record));
      const rightValue = Number.isFinite(rightTime) ? rightTime : 0;
      const leftValue = Number.isFinite(leftTime) ? leftTime : 0;
      return rightValue - leftValue
        || sameDaySortOrder(left.record) - sameDaySortOrder(right.record)
        || compareRecordIdsDescending(left.record, right.record)
        || left.index - right.index;
    })
    .map(({ record }) => record);
}

export function splitNewsArticles(records) {
  const sorted = sortNewsByDisplayDate(records);
  return {
    articles: sorted.filter((record) => !isVideoArticle(record)),
    videoShares: sorted.filter(isVideoArticle)
  };
}

export function normalizeNewsPageSize(value, fallback = 6) {
  const numeric = Number(value);
  if (!Number.isInteger(numeric)) return Math.min(Math.max(Number(fallback) || 6, 1), 6);
  return Math.min(Math.max(numeric, 1), 6);
}

export function paginateNews(records, requestedPage, requestedPageSize = 6) {
  const pageSize = normalizeNewsPageSize(requestedPageSize);
  const source = Array.isArray(records) ? records : [];
  const pageCount = Math.max(1, Math.ceil(source.length / pageSize));
  const numericPage = Number.isInteger(Number(requestedPage)) ? Number(requestedPage) : 1;
  const page = Math.min(Math.max(numericPage, 1), pageCount);
  return { items: source.slice((page - 1) * pageSize, page * pageSize), page, pageCount };
}
