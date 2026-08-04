import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

const maxAttachmentBytes = 10 * 1024 * 1024;
const uploadTtlMs = 15 * 60 * 1000;
const allowedAttachments = new Map([
  ['application/pdf', ['.pdf']],
  ['image/jpeg', ['.jpg', '.jpeg']],
  ['image/png', ['.png']],
  ['image/webp', ['.webp']]
]);

export class LeadAttachmentError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'LeadAttachmentError';
    this.code = code;
  }
}

function normalizedFileName(value) {
  const name = String(value || '').normalize('NFKC').trim().replace(/[\u0000-\u001F<>:"/\\|?*]+/g, '_').slice(0, 120);
  return name && name !== '.' && name !== '..' ? name : '';
}

function normalizedMimeType(value) {
  return String(value || '').trim().toLowerCase();
}

function extensionOf(fileName) {
  const position = fileName.lastIndexOf('.');
  return position >= 0 ? fileName.slice(position).toLowerCase() : '';
}

function validatedMetadata(payload) {
  const fileName = normalizedFileName(payload?.fileName);
  const mimeType = normalizedMimeType(payload?.mimeType);
  const byteSize = Number(payload?.byteSize);
  const extensions = allowedAttachments.get(mimeType);
  if (!fileName || !extensions || !extensions.includes(extensionOf(fileName))) {
    throw new LeadAttachmentError('UNSUPPORTED_ATTACHMENT', 'Only PDF, JPEG, PNG, and WebP attachments are supported');
  }
  if (!Number.isSafeInteger(byteSize) || byteSize < 1 || byteSize > maxAttachmentBytes) {
    throw new LeadAttachmentError('ATTACHMENT_TOO_LARGE', 'Attachments must be between 1 byte and 10 MiB');
  }
  return { fileName, mimeType, byteSize };
}

function beginsWith(bytes, prefix) {
  return bytes.length >= prefix.length && prefix.every((value, index) => bytes[index] === value);
}

export function validateAttachmentBytes(mimeType, value) {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value || []);
  const supported = {
    'application/pdf': () => beginsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d]),
    'image/jpeg': () => beginsWith(bytes, [0xff, 0xd8, 0xff]),
    'image/png': () => beginsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    'image/webp': () => beginsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && bytes.length >= 12 && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
  };
  if (!supported[normalizedMimeType(mimeType)]?.()) {
    throw new LeadAttachmentError('ATTACHMENT_CONTENT_MISMATCH', 'The uploaded file does not match its declared type');
  }
}

function ticketPayload({ attachmentReference, expiresAt, mimeType, byteSize }) {
  return `${attachmentReference}.${expiresAt}.${mimeType}.${byteSize}`;
}

function sign(secret, payload) {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

function sameSignature(expected, actual) {
  const actualBuffer = Buffer.from(String(actual || ''));
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

export function createLeadAttachmentUploadService({ store, signingSecret, idFactory = randomUUID, now = () => new Date(), basePath = '/api/public/v1/lead-attachments' }) {
  if (!store?.createSession || !store?.getSession || !signingSecret) {
    throw new TypeError('store.createSession, store.getSession, and signingSecret are required');
  }

  return {
    async createIntent(payload) {
      const metadata = validatedMetadata(payload);
      const createdAt = now();
      if (!(createdAt instanceof Date) || Number.isNaN(createdAt.getTime())) throw new TypeError('now must return a valid Date');
      const attachmentReference = String(idFactory());
      const expiresAt = new Date(createdAt.getTime() + uploadTtlMs).toISOString();
      const session = { attachmentReference, ...metadata, status: 'pending', expiresAt, createdAt: createdAt.toISOString() };
      await store.createSession(session);
      const token = sign(signingSecret, ticketPayload(session));
      return { attachmentReference, uploadUrl: `${basePath}/${encodeURIComponent(attachmentReference)}?token=${encodeURIComponent(token)}`, expiresAt };
    },

    async authorizeUpload({ attachmentReference, token, mimeType, byteSize }) {
      const session = await store.getSession(String(attachmentReference || ''));
      const current = now();
      if (!session || session.status !== 'pending' || Date.parse(session.expiresAt) <= current.getTime()) {
        throw new LeadAttachmentError('UPLOAD_SESSION_UNAVAILABLE', 'The upload session is unavailable or expired');
      }
      const expected = sign(signingSecret, ticketPayload(session));
      if (!sameSignature(expected, token)) throw new LeadAttachmentError('INVALID_UPLOAD_TICKET', 'The upload ticket is invalid');
      if (normalizedMimeType(mimeType) !== session.mimeType || Number(byteSize) !== session.byteSize) {
        throw new LeadAttachmentError('ATTACHMENT_METADATA_MISMATCH', 'The uploaded file does not match its approved metadata');
      }
      return session;
    }
  };
}

export const leadAttachmentPolicy = Object.freeze({ maxAttachmentBytes, uploadTtlMs, allowedMimeTypes: [...allowedAttachments.keys()] });
