import React, { useEffect, useState } from 'react';
import { LockKeyhole, LogIn, UserRound } from 'lucide-react';
import App from '../App';
import LuminaLogo from './LuminaLogo';

const desktopRuntime = Boolean(window.luminaDesktop);
const localAuthBypass = import.meta.env.DEV
  && import.meta.env.VITE_LOCAL_AUTH_BYPASS === 'true';

export default function AuthGate() {
  const [status, setStatus] = useState(
    desktopRuntime || localAuthBypass ? 'authenticated' : 'checking'
  );
  const [error, setError] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (desktopRuntime || localAuthBypass) return undefined;
    let cancelled = false;
    fetch('/api/session', { credentials: 'same-origin', cache: 'no-store' })
      .then(async (response) => {
        const result = await response.json().catch(() => ({}));
        if (cancelled) return;
        if (result.authenticated) {
          setStatus('authenticated');
        } else {
          setError(response.status === 503 ? result.error || 'Login is not configured.' : '');
          setStatus(response.status === 503 ? 'unconfigured' : 'signed-out');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('The login service could not be reached. Run the web app with Vercel.');
          setStatus('signed-out');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogin = async (event) => {
    event.preventDefault();
    setStatus('signing-in');
    setError('');
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.authenticated) {
        setError(result.error || 'Sign in failed.');
        setStatus(response.status === 503 ? 'unconfigured' : 'signed-out');
        return;
      }
      setPassword('');
      setStatus('authenticated');
    } catch {
      setError('The login service could not be reached.');
      setStatus('signed-out');
    }
  };

  const handleLogout = async () => {
    await fetch('/api/logout', {
      method: 'POST',
      credentials: 'same-origin'
    }).catch(() => {});
    setPassword('');
    setStatus('signed-out');
  };

  if (status === 'authenticated') {
    return <App onLogout={desktopRuntime ? null : handleLogout} />;
  }

  return (
    <main className="auth-screen">
      <section className="auth-card" aria-labelledby="auth-title">
        <LuminaLogo className="auth-logo" />
        <div className="auth-kicker">
          <LockKeyhole size={13} />
          Private listening space
        </div>
        <h1 id="auth-title">Sign in to Lumina</h1>
        <p>
          This self-hosted web player accepts the single account configured by
          its deployment owner.
        </p>

        {status === 'checking' ? (
          <div className="auth-checking">Checking your session…</div>
        ) : (
          <form className="auth-form" onSubmit={handleLogin}>
            <label>
              <span>Username</span>
              <span className="auth-input">
                <UserRound size={16} />
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  autoComplete="username"
                  required
                />
              </span>
            </label>
            <label>
              <span>Password</span>
              <span className="auth-input">
                <LockKeyhole size={16} />
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                />
              </span>
            </label>
            {error && <div className="auth-error">{error}</div>}
            <button type="submit" disabled={status === 'signing-in' || status === 'unconfigured'}>
              <LogIn size={16} />
              {status === 'signing-in' ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        )}
        <div className="auth-credit">
          Lumina by <strong>x1n-Q</strong>
        </div>
      </section>
    </main>
  );
}
