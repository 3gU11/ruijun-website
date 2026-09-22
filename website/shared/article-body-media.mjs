export function normalizeArticleBodyMedia(value) {
 const list = Array.isArray(value) ? value : [];
 return list.flatMap((item, index) => {
  const path = String(item?.path || '').trim();
  if (!path.startsWith('/api/preview/media/')) return [];
  const width = Math.min(100, Math.max(20, Number(item?.width) || 100));
  const align = ['left','center','right'].includes(item?.align) ? item.align : 'center';
  return [{ ...item, path, width, align, order: Number.isInteger(item?.order) ? item.order : index }];
 }).sort((a,b) => a.order - b.order);
}
