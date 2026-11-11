import mammoth from 'mammoth/mammoth.browser.js';

const WORD_STYLE_MAP = [
  "p[style-name='Title'] => h1:fresh",
  "p[style-name='Subtitle'] => p.lead:fresh",
  "p[style-name='Heading 1'] => h2:fresh",
  "p[style-name='Heading 2'] => h3:fresh",
  "p[style-name='Heading 3'] => h4:fresh",
  "p[style-name='Quote'] => blockquote:fresh",
  "p[style-name='引用'] => blockquote:fresh",
  "p[style-name='标题 1'] => h2:fresh",
  "p[style-name='标题 2'] => h3:fresh",
  "p[style-name='标题 3'] => h4:fresh"
];

const ALLOWED_TAGS = new Set([
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'h2', 'h3', 'h4',
  'ul', 'ol', 'li', 'blockquote', 'a', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td'
]);

const SAFE_MEDIA_SRC = /^\/api\/(?:public\/v1\/media\/asset\/[0-9a-f-]{36}|preview\/media\/[1-9]\d*)$/i;
const SAFE_HREF = /^(?:https?:\/\/|mailto:|tel:|\/|#)/i;

function textContent(node) {
  return String(node?.textContent || '').replace(/\s+/g, ' ').trim();
}

function safeHref(value) {
  const href = String(value || '').trim();
  return SAFE_HREF.test(href) && !/^javascript:/i.test(href) ? href : '';
}

function cleanWordHtml(container) {
  container.querySelectorAll('script,style,iframe,object,embed,svg,math').forEach((node) => node.remove());
  for (const element of [...container.querySelectorAll('*')]) {
    const tag = String(element.tagName || '').toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) {
      element.replaceWith(...element.childNodes);
      continue;
    }
    const href = tag === 'a' ? safeHref(element.getAttribute('href')) : '';
    const src = tag === 'img' ? String(element.getAttribute('src') || '').trim() : '';
    const alt = tag === 'img' ? String(element.getAttribute('alt') || '').trim().slice(0, 300) : '';
    const mediaAssetId = tag === 'img' ? String(element.getAttribute('data-cms-preview-media-asset-id') || '').trim() : '';
    const mediaRole = tag === 'img' ? String(element.getAttribute('data-cms-preview-media-role') || '').trim() : '';
    const fieldPath = tag === 'img' ? String(element.getAttribute('data-cms-preview-field-path') || '').trim() : '';
    for (const attribute of [...element.attributes]) element.removeAttribute(attribute.name);
    if (tag === 'a' && href) element.setAttribute('href', href);
    if (tag === 'img') {
      if (!SAFE_MEDIA_SRC.test(src)) { element.remove(); continue; }
      element.setAttribute('src', src);
      element.setAttribute('alt', alt);
      element.setAttribute('loading', 'lazy');
      // 只有 Word 导入上传后拿到的真实 media_assets.id 才允许保留画布绑定；
      // 普通外链/无绑定图片仍然只是正文 HTML，不会被误当成可替换媒体。
      if (/^[1-9]\d*$/.test(mediaAssetId) && mediaRole === 'image' && fieldPath === 'body') {
        element.setAttribute('data-cms-preview-media-role', 'image');
        element.setAttribute('data-cms-preview-field-path', 'body');
        element.setAttribute('data-cms-preview-media-asset-id', mediaAssetId);
        element.setAttribute('data-cms-preview-placement-key', 'news.article.body');
        element.setAttribute('data-cms-preview-label', alt || '正文图片');
      }
    }
  }
}

export async function extractWordArticleFromHtml(html, {
  uploadImage = null,
  fallbackTitle = '',
  messages = []
} = {}) {
  const container = document.createElement('div');
  container.innerHTML = String(html || '');
  const warnings = (Array.isArray(messages) ? messages : [])
    .map((message) => String(message?.message || '').trim())
    .filter(Boolean)
    .slice(0, 8);

  container.querySelectorAll('script,style,iframe,object,embed,svg,math').forEach((node) => node.remove());

  const paragraphs = [...container.querySelectorAll('p')].filter((node) => textContent(node));
  let titleNode = container.querySelector('h1');
  // Word 文档不一定使用“标题”样式；只有当首段很短且明显是标题时才采用它，
  // 避免把正文导语误删成标题。
  if (!titleNode && paragraphs.length > 1 && textContent(paragraphs[0]).length <= 120) {
    titleNode = paragraphs[0];
  }
  const title = (titleNode ? textContent(titleNode) : String(fallbackTitle || '').trim()).slice(0, 240);
  if (titleNode) titleNode.remove();

  // 动态新闻不再使用单独摘要；Word 的所有段落都保留在正文中。
  // Word 的 Heading 1 有时被当成一篇文章的章节标题；正文中统一降为 h2，
  // h5/h6 归并为 h4，保证官网正文样式一致。
  for (const heading of [...container.querySelectorAll('h1')]) heading.tagName = 'h2';
  for (const heading of [...container.querySelectorAll('h5,h6')]) heading.tagName = 'h4';

  let imageCount = 0;
  let imageFailed = 0;
  for (const image of [...container.querySelectorAll('img')]) {
    const source = String(image.getAttribute('src') || '').trim();
    const match = source.match(/^data:([^;]+);base64,([\s\S]+)$/);
    if (!match || typeof uploadImage !== 'function') { image.remove(); continue; }
    try {
      const uploaded = await uploadImage({
        contentType: match[1] || 'image/png',
        base64: match[2],
        alt: String(image.getAttribute('alt') || '').trim(),
        index: imageCount
      });
      const path = typeof uploaded === 'string' ? uploaded : String(uploaded?.path || '').trim();
      const mediaAssetId = typeof uploaded === 'object' ? String(uploaded?.mediaAssetId || '').trim() : '';
      if (!path) throw new Error('图片没有返回受管路径');
      image.setAttribute('src', path);
      image.setAttribute('alt', String(image.getAttribute('alt') || '').trim().slice(0, 300));
      if (/^[1-9]\d*$/.test(mediaAssetId)) {
        image.setAttribute('data-cms-preview-media-role', 'image');
        image.setAttribute('data-cms-preview-field-path', 'body');
        image.setAttribute('data-cms-preview-media-asset-id', mediaAssetId);
        image.setAttribute('data-cms-preview-placement-key', 'news.article.body');
        image.setAttribute('data-cms-preview-label', String(image.getAttribute('alt') || '').trim() || '正文图片');
      }
      imageCount += 1;
    } catch {
      image.remove();
      imageFailed += 1;
    }
  }
  if (imageFailed) warnings.push(`${imageFailed} 张图片上传失败，已从正文移除。`);

  cleanWordHtml(container);
  let body = container.innerHTML.trim();
  if (body.length > 30000) {
    body = body.slice(0, 30000);
    warnings.push('正文超过 30000 字符，已截断，请检查后半部分。');
  }
  return { title, summary: '', body, imageCount, imageFailed, warnings };
}

export async function readWordArticle(file, options = {}) {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.convertToHtml({ arrayBuffer }, {
    styleMap: WORD_STYLE_MAP,
    convertImage: mammoth.images.imgElement(async (image) => {
      const base64 = await image.read('base64');
      return { src: `data:${image.contentType || 'image/png'};base64,${base64}` };
    })
  });
  return extractWordArticleFromHtml(result.value, {
    ...options,
    fallbackTitle: options.fallbackTitle || String(file.name || '').replace(/\.[^.]+$/, ''),
    messages: result.messages
  });
}
