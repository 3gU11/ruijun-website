const PDF_HEADER = '%PDF-';
const PDF_EOF = '%%EOF';

async function readText(file, start, end) {
  if (!file || typeof file.slice !== 'function') return '';
  try {
    return await file.slice(start, end).text();
  } catch {
    return '';
  }
}

export async function validateMediaFileContent(file, mediaType) {
  if (mediaType !== 'document') return '';
  const size = Number(file?.size);
  if (!Number.isFinite(size) || size < 1) return 'PDF 文件无法读取。';

  const [header, tail] = await Promise.all([
    readText(file, 0, 8),
    readText(file, Math.max(0, size - 1024), size)
  ]);
  if (!header.startsWith(PDF_HEADER) || !tail.includes(PDF_EOF)) {
    return 'PDF 文件无效：缺少 PDF 文件头或结束标记。';
  }
  return '';
}
