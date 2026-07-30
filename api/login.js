import {
  createSession,
  credentialsMatch,
  getAuthConfig,
  sessionCookie,
  setPrivateResponseHeaders
} from '../vercel/auth.js';

export default async function handler(request, response) {
  setPrivateResponseHeaders(response);
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ authenticated: false, error: 'Method not allowed' });
  }

  try {
    const config = getAuthConfig();
    const body = typeof request.body === 'string'
      ? JSON.parse(request.body || '{}')
      : request.body || {};
    const credentials = {
      username: String(body.username || '').slice(0, 128),
      password: String(body.password || '').slice(0, 512)
    };

    if (!credentialsMatch(credentials, config)) {
      await new Promise((resolve) => setTimeout(resolve, 350));
      return response.status(401).json({
        authenticated: false,
        error: 'Incorrect username or password.'
      });
    }

    const token = createSession(config.username, config.secret);
    response.setHeader('Set-Cookie', sessionCookie(token, request));
    return response.status(200).json({ authenticated: true, username: config.username });
  } catch (error) {
    return response.status(503).json({
      authenticated: false,
      configured: false,
      error: error.message
    });
  }
}
