import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
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
  where,
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

let appInstance: FirebaseApp | null = null;
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

// Live feed of every visitor session active since `sinceMs`, newest first, for the admin view.
export function subscribeToRecentVisitors(
  sinceMs: number,
  onData: (sessions: VisitorSession[]) => void,
  onError: (message: string) => void,
): () => void {
  const db = getFirebaseDb();
  if (!db) return () => {};
  const q = query(
    collection(db, 'visitors'),
    where('lastActiveAt', '>=', sinceMs),
    orderBy('lastActiveAt', 'desc'),
    limit(3000),
  );
  return onSnapshot(
    q,
    (snapshot) => onData(snapshot.docs.map((d) => d.data() as VisitorSession)),
    (error) => onError(error.message),
  );
}
