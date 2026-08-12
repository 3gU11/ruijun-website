import assert from 'node:assert/strict';
import test from 'node:test';
import { createBoardQrToken, hashBoardQrToken, isBoardQrToken } from '../server/board-qr.js';

test('board QR tokens are opaque, random, and valid only in their intended format', () => {
  const first = createBoardQrToken();
  const second = createBoardQrToken();
  assert.match(first, /^[A-Za-z0-9_-]{32}$/);
  assert.notEqual(first, second);
  assert.equal(isBoardQrToken(first), true);
  assert.equal(isBoardQrToken('PCB-850-0001'), false);
  assert.equal(isBoardQrToken('short'), false);
});

test('the stored QR token fingerprint is deterministic without retaining the token', () => {
  const token = createBoardQrToken();
  assert.equal(hashBoardQrToken(token), hashBoardQrToken(token));
  assert.notEqual(hashBoardQrToken(token), token);
});
