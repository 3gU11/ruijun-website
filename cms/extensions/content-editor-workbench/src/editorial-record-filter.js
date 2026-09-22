export function filterEditorialRecords(records, category = '') {
  const list = Array.isArray(records) ? records : [];
  return ['news', 'video'].includes(category) ? list.filter(record => record.category === category) : list;
}
