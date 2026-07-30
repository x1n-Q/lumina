import {
  createSession,
  getAuthConfig,
  readCookie,
  sessionCookie,
  setPrivateResponseHeaders,
  verifySession
} from '../vercel/auth.js';

export default function handler(request, response) {
  setPrivateResponseHeaders(response);
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ authenticated: false, error: 'Method not allowed' });
  }

  try {
    const config = getAuthConfig();
    const authenticated = verifySession(readCookie(request), config);
    if (authenticated) {
      const renewedToken = createSession(config.username, config.secret);
      response.setHeader('Set-Cookie', sessionCookie(renewedToken, request));
    }
    return response.status(200).json({ authenticated, username: authenticated ? config.username : '' });
  } catch (error) {
    return response.status(503).json({
      authenticated: false,
      configured: false,
      error: error.message
    });
  }
}
