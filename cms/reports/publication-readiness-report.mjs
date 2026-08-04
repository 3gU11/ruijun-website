function text(value) { return typeof value === 'string' ? value.trim() : ''; }
function readiness(type, record, label, extra = []) {
  const blockers = [];
  if (record?.status !== 'published' || record?.publication_state !== 'published') blockers.push('未完成发布');
  for (const issue of extra) if (text(issue)) blockers.push(issue);
  return { type, label: text(label) || '未命名内容', blockers };
}
export function buildPublicationReadiness({ products = [], services = [], articles = [] } = {}) {
  const items = [
    ...products.map((item) => readiness('product', item, item.name, item.issues || [])),
    ...services.map((item) => readiness('service', item, item.label, item.issues || [])),
    ...articles.map((item) => readiness('article', item, item.title, [...(item.issues || []), ...(text(item.body) ? [] : ['正文'])]))
  ];
  return { summary: { ready: items.filter((item) => !item.blockers.length).length, blocked: items.filter((item) => item.blockers.length).length }, items };
}
