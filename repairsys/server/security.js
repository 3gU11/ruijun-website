import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const SESSION_MAX_AGE = 8 * 60 * 60;

function authSecret() {
  const secret = String(process.env.AUTH_SECRET || '').trim();
  if (secret) return secret;
  if (String(process.env.NODE_ENV || '').toLowerCase() === 'production') {
    throw new Error('生产环境必须配置 AUTH_SECRET');
  }
  return 'local-only-change-this-auth-secret-before-production';
}

const encode = (value) => Buffer.from(value).toString('base64url');
const decode = (value) => Buffer.from(value, 'base64url').toString('utf8');

function normalizedSessionVersion(value) {
  const version = Number(value);
  return Number.isSafeInteger(version) && version >= 0 ? version : 0;
}

export function nextSessionVersion(value) {
  return normalizedSessionVersion(value) + 1;
}

export function sessionVersionMatches(payload, user) {
  return normalizedSessionVersion(payload?.sv) === normalizedSessionVersion(user?.sessionVersion);
}

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const derived = await scrypt(String(password), salt, 32, { N: 16384, r: 8, p: 1 });
  return `scrypt$1$${salt.toString('base64url')}$${Buffer.from(derived).toString('base64url')}`;
}

export async function verifyPassword(password, stored) {
  const value = String(stored || '');
  if (!value.startsWith('scrypt$1$')) {
    return { valid: value.length > 0 && value === String(password), needsRehash: value.length > 0 && value === String(password) };
  }
  const [, version, saltText, hashText] = value.split('$');
  if (version !== '1' || !saltText || !hashText) return { valid: false, needsRehash: false };
  try {
    const derived = await scrypt(String(password), Buffer.from(saltText, 'base64url'), 32, { N: 16384, r: 8, p: 1 });
    const expected = Buffer.from(hashText, 'base64url');
    return { valid: expected.length === derived.length && timingSafeEqual(expected, Buffer.from(derived)), needsRehash: false };
  } catch {
    return { valid: false, needsRehash: false };
  }
}

export function createSessionToken(user) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: user.id,
    type: user.userType || 'admin',
    sv: normalizedSessionVersion(user.sessionVersion),
    iat: now,
    exp: now + SESSION_MAX_AGE,
    nonce: randomBytes(12).toString('base64url')
  };
  const body = encode(JSON.stringify(payload));
  const signature = createHmac('sha256', authSecret()).update(body).digest('base64url');
  return `${body}.${signature}`;
}

export function verifySessionToken(token) {
  if (!token || !token.includes('.')) return null;
  const [body, signature] = token.split('.');
  const expected = createHmac('sha256', authSecret()).update(body).digest();
  const received = Buffer.from(signature, 'base64url');
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;
  try {
    const payload = JSON.parse(decode(body));
    if (!payload.sub || !payload.type || Number(payload.exp) <= Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function parseCookies(header = '') {
  return String(header)
    .split(';')
    .map((part) => part.trim().split('='))
    .filter(([name, value]) => name && value)
    .reduce((cookies, [name, ...parts]) => {
      cookies[name] = decodeURIComponent(parts.join('='));
      return cookies;
    }, {});
}

export function sessionCookieName(type) {
  return type === 'client' ? 'repair_client_session' : 'repair_admin_session';
}

export function sessionCookie(token, type) {
  const secure = String(process.env.COOKIE_SECURE || '').toLowerCase() === 'true' || String(process.env.NODE_ENV || '').toLowerCase() === 'production';
  return `${sessionCookieName(type)}=${encodeURIComponent(token)}; Max-Age=${SESSION_MAX_AGE}; Path=/; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`;
}

export function clearSessionCookie(type) {
  const secure = String(process.env.COOKIE_SECURE || '').toLowerCase() === 'true' || String(process.env.NODE_ENV || '').toLowerCase() === 'production';
  return `${sessionCookieName(type)}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`;
}
