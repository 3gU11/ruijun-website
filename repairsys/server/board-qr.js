import { createHmac, randomBytes } from 'node:crypto';

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,128}$/;

function boardQrSecret() {
  const secret = String(process.env.BOARD_QR_SECRET || process.env.AUTH_SECRET || '').trim();
  if (secret) return secret;
  if (String(process.env.NODE_ENV || '').toLowerCase() === 'production') {
    throw new Error('BOARD_QR_SECRET is required when board QR codes are enabled in production');
  }
  return 'local-only-change-this-board-qr-secret-before-production';
}

export function createBoardQrToken() {
  return randomBytes(24).toString('base64url');
}

export function isBoardQrToken(value) {
  return TOKEN_PATTERN.test(String(value || ''));
}

export function hashBoardQrToken(token) {
  if (!isBoardQrToken(token)) return '';
  return createHmac('sha256', boardQrSecret()).update(String(token)).digest('base64url');
}
