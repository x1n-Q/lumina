import {
  sessionCookie,
  setPrivateResponseHeaders
} from '../vercel/auth.js';

export default function handler(request, response) {
  setPrivateResponseHeaders(response);
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ authenticated: false, error: 'Method not allowed' });
  }

  response.setHeader('Set-Cookie', sessionCookie('', request, 0));
  return response.status(200).json({ authenticated: false });
}
