import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import {
  getFirestore,
  type Firestore,
  collection,
  doc,
  setDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  getDoc,
} from 'firebase/firestore';
import { getAnalytics, isSupported as isAnalyticsSupported, type Analytics } from 'firebase/analytics';

// Firebase configuration provided by user
export const firebaseConfig = {
  apiKey: "AIzaSyA-dtqW6-g-SkTBiH-vhzPgRH1CL-WncPw",
  authDomain: "gene-5afec.firebaseapp.com",
  projectId: "gene-5afec",
  storageBucket: "gene-5afec.firebasestorage.app",
  messagingSenderId: "712357695490",
  appId: "1:712357695490:web:9212af788dedb61ee3971b",
  measurementId: "G-BM16WQKHBB"
};

export interface SectionVisit {
  sectionId: string;
  sectionName: string;
  enteredAt: number;
  durationSeconds: number;
}

export interface VisitorSession {
  id: string;
  visitorId: string;
  startedAt: number;
  lastActiveAt: number;
  userAgent: string;
  deviceType: 'Desktop' | 'Mobile' | 'Tablet';
  browser: string;
  os: string;
  screen: string;
  referrer: string;
  currentSection: string;
  currentSectionName: string;
  sections: SectionVisit[];
  totalDurationSeconds: number;
  isLive?: boolean;
}

const LOCAL_STORAGE_SESSIONS_KEY = 'barako_visitor_sessions_v1';
const LOCAL_STORAGE_CLARITY_KEY = 'barako_clarity_project_id';

let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;
let analyticsInstance: Analytics | null = null;

// SSR-Safe Initializer
export function getFirebaseApp(): FirebaseApp | null {
  if (typeof window === 'undefined') return null;
  if (!appInstance) {
    appInstance = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  }
  return appInstance;
}

export function getFirebaseAuth(): Auth | null {
  const app = getFirebaseApp();
  if (!app) return null;
  if (!authInstance) {
    authInstance = getAuth(app);
  }
  return authInstance;
}

export function getFirebaseDb(): Firestore | null {
  const app = getFirebaseApp();
  if (!app) return null;
  if (!dbInstance) {
    dbInstance = getFirestore(app);
  }
  return dbInstance;
}

export function initFirebaseAnalytics(): Promise<Analytics | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(null);
      return;
    }
    const app = getFirebaseApp();
    if (!app) {
      resolve(null);
      return;
    }
    if (analyticsInstance) {
      resolve(analyticsInstance);
      return;
    }
    isAnalyticsSupported()
      .then((supported) => {
        if (supported) {
          analyticsInstance = getAnalytics(app);
          resolve(analyticsInstance);
        } else {
          resolve(null);
        }
      })
      .catch(() => resolve(null));
  });
}

// Memory cache to avoid repeated JSON.parse/stringify on the scroll thread
let cachedLocalSessions: VisitorSession[] | null = null;
let saveDebounceTimer: any = null;

export function getLocalSessions(): VisitorSession[] {
  if (typeof window === 'undefined') return [];
  if (cachedLocalSessions) return cachedLocalSessions;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_SESSIONS_KEY);
    cachedLocalSessions = raw ? JSON.parse(raw) : [];
    return cachedLocalSessions || [];
  } catch {
    return [];
  }
}

export function saveLocalSession(session: VisitorSession) {
  if (typeof window === 'undefined') return;
  const sessions = getLocalSessions();
  const existingIdx = sessions.findIndex((s) => s.id === session.id);
  if (existingIdx >= 0) {
    sessions[existingIdx] = session;
  } else {
    sessions.unshift(session);
  }
  cachedLocalSessions = sessions.slice(0, 100);

  // Debounce saving to localStorage to prevent blocking main scroll thread
  clearTimeout(saveDebounceTimer);
  saveDebounceTimer = setTimeout(() => {
    try {
      if (cachedLocalSessions) {
        localStorage.setItem(LOCAL_STORAGE_SESSIONS_KEY, JSON.stringify(cachedLocalSessions));
      }
    } catch {
      // ignore quota
    }
  }, 1000);
}

// Record or update a visitor session in Firestore (with localStorage fallback)
export async function syncVisitorSession(session: VisitorSession): Promise<void> {
  // Always save locally for instant offline/local fallback
  saveLocalSession(session);

  const db = getFirebaseDb();
  if (!db) return;

  try {
    const sessionDocRef = doc(db, 'visitors', session.id);
    await setDoc(sessionDocRef, {
      ...session,
      updatedAt: Date.now(),
    }, { merge: true });
  } catch (err) {
    // If Firestore rules deny access or offline, local storage already captured it safely
    console.debug('[Firebase] session sync error:', err);
  }
}

// Subscribe to real-time visitor sessions for the Admin Dashboard
export function subscribeToVisitors(callback: (sessions: VisitorSession[]) => void): () => void {
  // Immediately supply local data so the dashboard is instant
  const localData = getLocalSessions();
  callback(localData);

  const db = getFirebaseDb();
  if (!db) return () => {};

  try {
    const q = query(collection(db, 'visitors'), orderBy('lastActiveAt', 'desc'), limit(100));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const firestoreSessions: VisitorSession[] = [];
        snapshot.forEach((docSnap) => {
          firestoreSessions.push(docSnap.data() as VisitorSession);
        });

        // Merge firestore with any local sessions not yet synced
        const mergedMap = new Map<string, VisitorSession>();
        localData.forEach((s) => mergedMap.set(s.id, s));
        firestoreSessions.forEach((s) => mergedMap.set(s.id, s));

        const merged = Array.from(mergedMap.values()).sort(
          (a, b) => (b.lastActiveAt || 0) - (a.lastActiveAt || 0)
        );
        callback(merged);
      },
      (error) => {
        console.warn('[Firebase] Snapshot error, falling back to local storage:', error.message);
        callback(getLocalSessions());
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn('[Firebase] subscribe error:', err);
    return () => {};
  }
}

// Save & retrieve Clarity Project ID from Firebase or LocalStorage
export async function fetchClarityProjectId(): Promise<string> {
  if (typeof window === 'undefined') return '';
  const localId = localStorage.getItem(LOCAL_STORAGE_CLARITY_KEY) || '';
  const envId = (import.meta as any).env?.VITE_CLARITY_PROJECT_ID || '';

  const db = getFirebaseDb();
  if (db) {
    try {
      const configDoc = await getDoc(doc(db, 'settings', 'clarity'));
      if (configDoc.exists() && configDoc.data()?.projectId) {
        return configDoc.data().projectId;
      }
    } catch {
      // fallback
    }
  }

  return localId || envId;
}

export async function storeClarityProjectId(projectId: string): Promise<void> {
  if (typeof window === 'undefined') return;
  const trimmed = projectId.trim();
  localStorage.setItem(LOCAL_STORAGE_CLARITY_KEY, trimmed);

  const db = getFirebaseDb();
  if (db) {
    try {
      await setDoc(doc(db, 'settings', 'clarity'), {
        projectId: trimmed,
        updatedAt: Date.now(),
      }, { merge: true });
    } catch {
      // ignore
    }
  }
}
