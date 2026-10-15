import { isPublicMediaAssetPath } from './public-media-path.mjs';

export function normalizeArticleBodyMedia(value) {
 const list = Array.isArray(value) ? value : [];
 return list.flatMap((item, index) => {
  const path = String(item?.path || '').trim();
  const previewPath = /^\/api\/preview\/media\/[1-9]\d*$/.test(path);
  let publicPath = false;
  if (item?.managed === true) {
   publicPath = isPublicMediaAssetPath(path);
   if (!publicPath) {
    try {
     const url = new URL(path);
     const local = url.protocol === 'http:' && ['127.0.0.1','localhost','[::1]'].includes(url.hostname);
     publicPath = (url.protocol === 'https:' || local) && !url.username && !url.password && /^\/assets\/[^/]+$/.test(url.pathname);
    } catch {}
   }
  }
  if (!previewPath && !publicPath) return [];
  const width = Math.min(100, Math.max(20, Number(item?.width) || 100));
  const align = ['left','center','right'].includes(item?.align) ? item.align : 'center';
  return [{ ...item, sourceIndex: index, path, width, align, order: Number.isInteger(item?.order) ? item.order : index }];
 }).sort((a,b) => a.order - b.order);
}
