export function createAttachmentDownloadAudit({ requestNo, attachmentId }) {
  const targetNo = String(requestNo || '').trim().slice(0, 120);
  const safeAttachmentId = String(attachmentId || '').trim().slice(0, 120) || '未知';
  return {
    action: '下载维修附件',
    targetNo,
    note: `附件记录：${safeAttachmentId}`
  };
}
