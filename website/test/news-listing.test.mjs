import assert from 'node:assert/strict';
import test from 'node:test';

const { formatNewsDisplayDate, isVideoArticle, normalizeNewsPageSize, paginateNews, resolveNewsMediaPoster, sortNewsByDisplayDate, splitNewsArticles } = await import('../shared/news-listing.mjs');

test('news display dates never render Invalid Date in the CMS preview', () => {
  assert.equal(formatNewsDisplayDate('2026-08-24'), '2026年8月24日');
  assert.equal(formatNewsDisplayDate('2026-08-24T16:00:00.000Z'), '2026年8月25日');
  assert.equal(formatNewsDisplayDate(''), '日期待定');
  assert.equal(formatNewsDisplayDate('not-a-date'), '日期待定');
});

test('news listing classifies video shares separately and sorts both streams by display date', () => {
  const result = splitNewsArticles([
    { id: 1, category: 'news', display_date: '2026-08-01', title: '旧动态' },
    { id: 2, category: 'video', display_date: '2026-08-03', title: '新视频', video_url: '/video.mp4' },
    { id: 3, category: 'news', display_date: '2026-08-05', title: '新动态' },
    { id: 4, category: 'news', display_date: '2026-08-04', title: '另一条视频', video: '/other.mp4' }
  ]);

  assert.deepEqual(result.articles.map((item) => item.id), [3, 1]);
  assert.deepEqual(result.videoShares.map((item) => item.id), [4, 2]);
  assert.equal(isVideoArticle({ category: '视频分享' }), true);
  assert.equal(isVideoArticle({ category: 'news', video_url: '/video.mp4' }), true);
  assert.equal(isVideoArticle({ category: 'news', media: [{ mediaType: 'video', path: '/governed-video.mp4' }] }), true);
  assert.equal(isVideoArticle({ category: 'news', media: [{ mimeType: 'video/webm', path: '/governed-video.webm' }] }), true);
});

test('news with the same display date uses its controlled order then a stable record id fallback', () => {
  const records = sortNewsByDisplayDate([
    { id: 4, display_date: '2026-08-05', sort_order: 2 },
    { id: 11, display_date: '2026-08-05', sort_order: 0 },
    { id: 9, display_date: '2026-08-05', sort_order: 2 },
    { id: 13, display_date: '2026-08-05' },
    { id: 7, display_date: '2026-08-05' }
  ]);

  assert.deepEqual(records.map((record) => record.id), [11, 9, 4, 13, 7]);
});

test('news page size is bounded to one through six and pagination never returns an invalid page', () => {
  assert.equal(normalizeNewsPageSize(20), 6);
  assert.equal(normalizeNewsPageSize(0), 1);
  assert.equal(normalizeNewsPageSize('bad'), 6);
  const records = sortNewsByDisplayDate(Array.from({ length: 13 }, (_, index) => ({ id: index + 1, display_date: `2026-08-${String(index + 1).padStart(2, '0')}` })));
  assert.deepEqual(paginateNews(records, 3, 6), { items: [{ id: 1, display_date: '2026-08-01' }], page: 3, pageCount: 3 });
  assert.equal(paginateNews(records, 99, 6).page, 3);
  assert.equal(paginateNews(records, 0, 6).page, 1);
});

test('video share poster resolution accepts every governed video media shape before legacy cover fallback', () => {
  assert.equal(resolveNewsMediaPoster({ media: [{ media_type: 'video', posterPath: '/poster-by-type.jpg' }], cover_asset: '/legacy-cover.jpg' }), '/poster-by-type.jpg');
  assert.equal(resolveNewsMediaPoster({ media: [{ mimeType: 'video/mp4', poster_path: '/poster-by-mime.jpg' }] }), '/poster-by-mime.jpg');
  assert.equal(resolveNewsMediaPoster({ media: [{ mediaType: 'image', path: '/cover.jpg' }], cover_asset: '/legacy-cover.jpg' }), '/cover.jpg');
  assert.equal(resolveNewsMediaPoster({ media: [], cover_asset: '/legacy-cover.jpg' }), '/legacy-cover.jpg');
});
