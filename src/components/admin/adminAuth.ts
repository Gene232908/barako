import {
  browserSessionPersistence,
  getAuth,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  type Auth,
} from 'firebase/auth';
import { getFirebaseApp } from '../../lib/firebase';

// The admin is a Firebase Auth account; the secret code typed in the dashboard is its password, so
// the code is checked by Firebase's servers (with their rate limiting) and never ships in the site.
// firestore.rules lets only this account read visitor data.
export const ADMIN_EMAIL = 'admin@genemat.site';

// Firebase passwords need 6+ characters; the prefix lets a short code still qualify.
const passwordFor = (code: string) => `gw-admin:${code.trim()}`;

let auth: Auth | null = null;
const getAdminAuth = () => {
  const app = getFirebaseApp();
  if (!app) return null;
  auth ??= getAuth(app);
  return auth;
};

export type UnlockResult = 'ok' | 'wrong' | 'too-many' | 'offline' | 'error';

export async function unlockAdmin(code: string): Promise<UnlockResult> {
  const a = getAdminAuth();
  if (!a) return 'error';
  try {
    // Signed out when the browser tab closes.
    await setPersistence(a, browserSessionPersistence);
    await signInWithEmailAndPassword(a, ADMIN_EMAIL, passwordFor(code));
    return 'ok';
  } catch (err) {
    const codeName = (err as { code?: string }).code ?? '';
    if (codeName === 'auth/too-many-requests') return 'too-many';
    if (codeName === 'auth/network-request-failed') return 'offline';
    if (/invalid-credential|wrong-password|user-not-found|invalid-login/.test(codeName)) return 'wrong';
    console.warn('[admin] sign-in failed:', codeName || err);
    return 'error';
  }
}

export function lockAdmin() {
  const a = getAdminAuth();
  return a ? signOut(a) : Promise.resolve();
}

/** Calls back with whether the admin is signed in, now and on every change. */
export function watchAdmin(cb: (signedIn: boolean) => void): () => void {
  const a = getAdminAuth();
  if (!a) {
    cb(false);
    return () => {};
  }
  return onAuthStateChanged(a, (user) => cb(user?.email === ADMIN_EMAIL));
}
