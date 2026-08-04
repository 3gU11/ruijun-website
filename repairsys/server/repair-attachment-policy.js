const MAX_FILE_COUNT = 2;
const MAX_FILE_BYTES = 4 * 1024 * 1024;
const MAX_TOTAL_BYTES = 6 * 1024 * 1024;

function invalid(message) {
  const error = new Error(message);
  error.status = 400;
  throw error;
}

function imageType(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpeg';
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return 'webp';
  return '';
}

export function validateRepairAttachments(attachments) {
  const items = Array.isArray(attachments) ? attachments : invalid('附件格式无效');
  if (items.length > MAX_FILE_COUNT) invalid(`最多上传 ${MAX_FILE_COUNT} 张照片`);

  let totalBytes = 0;
  return items.map((attachment) => {
    const match = String(attachment?.dataUrl || '').match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/i);
    if (!match) invalid('只能上传 JPG、PNG 或 WebP 图片');
    const buffer = Buffer.from(match[2], 'base64');
    if (!buffer.length) invalid('照片内容无效');
    if (buffer.length > MAX_FILE_BYTES) invalid('单张照片不能超过 4MB');

    const declaredType = match[1].toLowerCase();
    if (imageType(buffer) !== declaredType) invalid('照片声明类型与实际内容不匹配');
    totalBytes += buffer.length;
    if (totalBytes > MAX_TOTAL_BYTES) invalid('照片总大小不能超过 6MB');

    return {
      buffer,
      extension: declaredType === 'jpeg' ? 'jpg' : declaredType,
      category: ['machine_nameplate', 'component_serial'].includes(attachment.category) ? attachment.category : 'other',
      name: String(attachment.name || '').slice(0, 160)
    };
  });
}
