import assert from 'node:assert/strict';
import test from 'node:test';
import { originGuardDecision } from '../server/origin-guard.js';

const allowedOrigins = new Set([
  'https://repair.ruijun.example',
  'https://repair-admin.ruijun.example'
]);

test('requires an exact trusted Origin on every state-changing API request', () => {
  assert.deepEqual(
    originGuardDecision({ method: 'POST', origin: 'https://repair.ruijun.example', allowedOrigins }),
    { allowed: true }
  );
  assert.deepEqual(
    originGuardDecision({ method: 'PATCH', origin: 'https://repair-admin.ruijun.example', allowedOrigins }),
    { allowed: true }
  );
  assert.deepEqual(
    originGuardDecision({ method: 'DELETE', origin: 'https://repair.ruijun.example.evil.test', allowedOrigins }),
    { allowed: false, reason: 'untrusted_origin' }
  );
  assert.deepEqual(
    originGuardDecision({ method: 'PUT', origin: '', allowedOrigins }),
    { allowed: false, reason: 'missing_origin' }
  );
});

test('does not impose an Origin header requirement on safe reads or CORS preflight', () => {
  assert.deepEqual(originGuardDecision({ method: 'GET', origin: '', allowedOrigins }), { allowed: true });
  assert.deepEqual(originGuardDecision({ method: 'OPTIONS', origin: '', allowedOrigins }), { allowed: true });
  assert.deepEqual(
    originGuardDecision({ method: 'GET', origin: 'https://repair.ruijun.example.evil.test', allowedOrigins }),
    { allowed: false, reason: 'untrusted_origin' }
  );
});
