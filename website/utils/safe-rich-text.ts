const allowedTags = new Set(['p', 'br', 'strong', 'em', 'u', 's', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'blockquote', 'a', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td']);

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character] || character));
}

function safeHref(value: string) {
  const href = value.trim();
  if (/^(?:https?:\/\/|mailto:|tel:|\/|#)/i.test(href) && !/^javascript:/i.test(href)) return href;
  return '#';
}

function safeMediaSrc(value: string) {
  const src = value.trim();
  // Word 导入的图片会先上传为受管媒体，只允许站内受管路径，不接受 data:、
  // javascript: 或外部域名，避免正文 HTML 变成任意外链/追踪载体。
  if (/^\/api\/public\/v1\/media\/asset\/[0-9a-f-]{36}$/i.test(src)) return src;
  if (/^\/api\/preview\/media\/[1-9]\d*$/.test(src)) return src;
  return '';
}

/** Render the small, governed subset of HTML accepted by article editors. */
export function renderSafeRichText(value: unknown) {
  if (value == null) return '';
  const source = typeof value === 'string' ? value : JSON.stringify(value);
  if (!source.trim()) return '';

  // Plain text remains readable with paragraphs and line breaks.
  if (!/<[a-z][\s\S]*>/i.test(source)) {
    return source.split(/\r?\n\s*\r?\n/).map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\r?\n/g, '<br>')}</p>`).join('');
  }

  const withoutDangerousBlocks = source
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\s*(script|style|iframe|object|embed|form|svg|math)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*(script|style|iframe|object|embed|form|svg|math)[^>]*\/?>/gi, '');

  return withoutDangerousBlocks.replace(/<\/?[a-z][^>]*>/gi, (tag) => {
    const match = tag.match(/^<\s*(\/?)\s*([a-z0-9]+)([^>]*)>$/i);
    if (!match) return '';
    const closing = Boolean(match[1]);
    const name = match[2].toLowerCase();
    if (!allowedTags.has(name)) return '';
    if (closing) return `</${name}>`;
    if (name === 'br') return '<br>';
    if (name === 'img') {
      const srcMatch = match[3].match(/\bsrc\s*=\s*["']([^"']*)["']/i);
      const altMatch = match[3].match(/\balt\s*=\s*["']([^"']*)["']/i);
      const assetMatch = match[3].match(/\bdata-cms-preview-media-asset-id\s*=\s*["']([1-9]\d*)["']/i);
      const roleMatch = match[3].match(/\bdata-cms-preview-media-role\s*=\s*["']([^"']*)["']/i);
      const fieldMatch = match[3].match(/\bdata-cms-preview-field-path\s*=\s*["']([^"']*)["']/i);
      const labelMatch = match[3].match(/\bdata-cms-preview-label\s*=\s*["']([^"']*)["']/i);
      const src = safeMediaSrc(srcMatch?.[1] || '');
      if (!src) return '';
      const binding = assetMatch
        && String(roleMatch?.[1] || '').trim().toLowerCase() === 'image'
        && String(fieldMatch?.[1] || '').trim() === 'body'
        ? ` data-cms-preview-media-role="image" data-cms-preview-field-path="body" data-cms-preview-editable="true" data-cms-preview-media-asset-id="${assetMatch[1]}" data-cms-preview-placement-key="news.article.body"${labelMatch ? ` data-cms-preview-label="${escapeHtml(labelMatch[1])}"` : ''}`
        : '';
      return `<img src="${escapeHtml(src)}" alt="${escapeHtml(altMatch?.[1] || '')}" loading="lazy"${binding}>`;
    }
    if (name !== 'a') return `<${name}>`;
    const hrefMatch = match[3].match(/\bhref\s*=\s*["']([^"']*)["']/i);
    const href = safeHref(hrefMatch?.[1] || '#');
    return `<a href="${escapeHtml(href)}" rel="noopener noreferrer">`;
  });
}
