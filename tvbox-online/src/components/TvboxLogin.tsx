/**
 * TvboxAuthGate — wraps the viewer behind a username/password screen.
 * Session is remembered per device (localStorage) until AUTH_VERSION changes
 * (see tvboxAuth.ts), which is how "log out all devices" works.
 */
import { useState, type FormEvent } from 'react';
import { useLang } from '../i18n';
import { isAuthed, login, logout } from '../services/tvboxAuth';

export function TvboxAuthGate({ children }: { children: React.ReactNode }) {
  const { t } = useLang();
  const [authed, setAuthed] = useState<boolean>(isAuthed);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  if (authed) {
    return (
      <>
        {children}
        <button
          type="button"
          className="tvbox-logout"
          onClick={() => {
            logout();
            setAuthed(false);
            setUsername('');
            setPassword('');
          }}
          title={t('login.title')}
        >
          ⏻
        </button>
      </>
    );
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (login(username, password)) {
      setAuthed(true);
      setError(false);
    } else {
      setError(true);
    }
  };

  return (
    <div className="tvbox-login-screen">
      <form className="tvbox-login-card" onSubmit={onSubmit}>
        <h1 className="tvbox-login-title">{t('login.title')}</h1>
        <input
          className="tvbox-login-input"
          type="text"
          autoComplete="username"
          placeholder={t('login.username')}
          value={username}
          onChange={(e) => { setUsername(e.target.value); setError(false); }}
          autoFocus
        />
        <input
          className="tvbox-login-input"
          type="password"
          autoComplete="current-password"
          placeholder={t('login.password')}
          value={password}
          onChange={(e) => { setPassword(e.target.value); setError(false); }}
        />
        {error && (
          <div className="tvbox-login-error">
            {t('login.error.invalid_credentials')}
          </div>
        )}
        <button type="submit" className="tvbox-login-button">
          {t('login.button')}
        </button>
      </form>
    </div>
  );
}
