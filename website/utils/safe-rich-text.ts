const allowedTags = new Set(['p', 'br', 'strong', 'em', 'u', 's', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'blockquote', 'a']);

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character] || character));
}

function safeHref(value: string) {
  const href = value.trim();
  if (/^(?:https?:\/\/|mailto:|tel:|\/|#)/i.test(href) && !/^javascript:/i.test(href)) return href;
  return '#';
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
    if (name !== 'a') return `<${name}>`;
    const hrefMatch = match[3].match(/\bhref\s*=\s*["']([^"']*)["']/i);
    const href = safeHref(hrefMatch?.[1] || '#');
    return `<a href="${escapeHtml(href)}" rel="noopener noreferrer">`;
  });
}
