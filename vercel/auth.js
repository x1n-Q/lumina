import {
  createHash,
  createHmac,
  timingSafeEqual
} from 'node:crypto';

export const SESSION_COOKIE = 'lumina_session';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

function encode(value) {
  return Buffer.from(value).toString('base64url');
}

function safeEqual(left, right) {
  const leftDigest = createHash('sha256').update(String(left)).digest();
  const rightDigest = createHash('sha256').update(String(right)).digest();
  return timingSafeEqual(leftDigest, rightDigest);
}

export function getAuthConfig() {
  const username = String(process.env.LUMINA_USERNAME || '').trim();
  const password = String(process.env.LUMINA_PASSWORD || '').trim();
  const secret = String(process.env.LUMINA_SESSION_SECRET || '').trim();
  const problems = [];

  if (!username) problems.push('LUMINA_USERNAME is missing');
  if (!password) problems.push('LUMINA_PASSWORD is missing');
  if (!secret) {
    problems.push('LUMINA_SESSION_SECRET is missing');
  } else if (secret.length < 32) {
    problems.push(`LUMINA_SESSION_SECRET has ${secret.length} characters; it needs at least 32`);
  }

  if (problems.length > 0) throw new Error(problems.join('. '));
  return { username, password, secret };
}

export function credentialsMatch(input, config) {
  return safeEqual(input?.username, config.username)
    && safeEqual(input?.password, config.password);
}

export function createSession(username, secret) {
  const payload = encode(JSON.stringify({
    sub: username,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE
  }));
  const signature = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function readCookie(request, name = SESSION_COOKIE) {
  const cookies = String(request.headers.cookie || '').split(';');
  for (const cookie of cookies) {
    const [key, ...value] = cookie.trim().split('=');
    if (key === name) return decodeURIComponent(value.join('='));
  }
  return '';
}

export function verifySession(token, config) {
  try {
    const [payload, signature] = String(token).split('.');
    if (!payload || !signature) return false;
    const expected = createHmac('sha256', config.secret).update(payload).digest('base64url');
    if (!safeEqual(signature, expected)) return false;
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return session.sub === config.username
      && Number(session.exp) > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export function sessionCookie(value, request, maxAge = SESSION_MAX_AGE) {
  const forwardedProtocol = String(request.headers['x-forwarded-proto'] || '');
  const secure = forwardedProtocol === 'https' || process.env.VERCEL_ENV === 'production';
  return [
    `${SESSION_COOKIE}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    secure ? 'Secure' : '',
    `Max-Age=${maxAge}`
  ].filter(Boolean).join('; ');
}

export function setPrivateResponseHeaders(response) {
  response.setHeader('Cache-Control', 'no-store, max-age=0');
  response.setHeader('Pragma', 'no-cache');
  response.setHeader('X-Content-Type-Options', 'nosniff');
}
