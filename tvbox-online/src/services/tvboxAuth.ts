/**
 * tvbox-online access gate (client-side).
 *
 * This is a standalone static viewer with no backend auth, so this gate is
 * CLIENT-SIDE only: it keeps casual viewers out, not a determined attacker.
 *
 * "Log out ALL devices": a device counts as logged-in only while its stored
 * token equals AUTH_VERSION. Bump AUTH_VERSION and redeploy → every device's
 * stored token becomes stale → all are forced to log in again on next load.
 */

// ⬆️ BUMP THIS to force re-login on every device (then rebuild + deploy).
export const AUTH_VERSION = '2026-05-25.1';

const STORAGE_KEY = 'tvbox_auth_v';

// Fixed credentials (per request). Change here + bump AUTH_VERSION to rotate.
const USERNAME = 'tvbox';
const PASSWORD = '015166';

export function isAuthed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === AUTH_VERSION;
  } catch {
    return false;
  }
}

/** Returns true on success and persists the session on this device. */
export function login(username: string, password: string): boolean {
  if (username.trim() === USERNAME && password === PASSWORD) {
    try {
      localStorage.setItem(STORAGE_KEY, AUTH_VERSION);
    } catch {
      /* storage unavailable — session lasts for this page load only */
    }
    return true;
  }
  return false;
}

export function logout(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
