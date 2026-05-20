/**
 * LoginScreen — full-page sign-in. Rendered when AuthProvider.status is
 * 'anonymous'. Submitting calls useAuth().login which, on success, flips
 * status to 'authenticated' and the lobby mounts in its place.
 *
 * Mock-mode shows a small demo-credentials hint at the bottom. In http mode
 * the hint is hidden.
 */

import { useState, type FormEvent } from 'react';
import { AuthError } from '../services/auth';
import { useAuth } from '../state/auth';
import { useLang } from '../i18n';
import { LangToggle } from './LangToggle';

const isMockMode =
  ((import.meta.env.VITE_AUTH_MODE as string | undefined) ?? 'mock') === 'mock';

export function LoginScreen() {
  const { login } = useAuth();
  const { t } = useLang();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    setLoading(true);
    setError(null);
    try {
      await login(username, password);
    } catch (err) {
      if (err instanceof AuthError) {
        setError(t(`login.error.${err.code}`));
      } else {
        setError(t('login.error.unknown'));
      }
      setLoading(false);
    }
    // On success the component unmounts (status → authenticated), so no
    // need to clear loading here.
  };

  return (
    <div className="login-screen">
      <div className="login-screen-toolbar">
        <LangToggle />
      </div>

      <form className="login-card" onSubmit={onSubmit} noValidate>
        <img
          className="login-logo"
          src="/assets/virtualrace_logo.png"
          alt="Virtual Race"
        />
        <h1 className="login-title">{t('login.title')}</h1>
        <p className="login-subtitle">{t('login.subtitle')}</p>

        <label className="login-field">
          <span className="login-field-label">{t('login.username')}</span>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
            autoFocus
            disabled={loading}
          />
        </label>

        <label className="login-field">
          <span className="login-field-label">{t('login.password')}</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            disabled={loading}
          />
        </label>

        {error && (
          <div className="login-error" role="alert">
            {error}
          </div>
        )}

        <button
          type="submit"
          className="login-submit"
          disabled={loading || !username || !password}
        >
          {loading ? t('login.buttonLoading') : t('login.button')}
        </button>

        {isMockMode && (
          <div className="login-demo-hint">
            <span className="login-demo-label">{t('login.demoLabel')}:</span>
            <code>demo-player-01 / demo-pass-01</code>
          </div>
        )}
      </form>
    </div>
  );
}
