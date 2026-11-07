import { useEffect } from 'react';
import type { VisitorSession, SectionVisit } from '../lib/firebase';

// Firebase and Clarity are loaded only after the page is up and the browser is idle, so they never
// compete with the first render (they were ~600 kB of the initial bundle).
const loadTrackingModules = () =>
  Promise.all([import('../lib/firebase'), import('../lib/clarity'), import('firebase/analytics')]);

const whenIdle = (fn: () => void) => {
  const run = () => {
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
    if (w.requestIdleCallback) w.requestIdleCallback(fn, { timeout: 4000 });
    else window.setTimeout(fn, 1500);
  };
  if (document.readyState === 'complete') window.setTimeout(run, 1500);
  else window.addEventListener('load', () => window.setTimeout(run, 1500), { once: true });
};

const SECTION_NAMES: Record<string, string> = {
  hero: 'Hero (Introduction)',
  works: 'Selected Works',
  about: 'About Gene',
  stack: 'Tech Stack',
  services: 'Services & Offerings',
  contact: 'Contact & Links',
};

function getDeviceInfo() {
  if (typeof window === 'undefined') {
    return {
      deviceType: 'Desktop' as const,
      browser: 'Unknown',
      os: 'Unknown',
      screen: 'Unknown',
      referrer: 'Direct',
    };
  }

  const ua = navigator.userAgent;
  let deviceType: 'Desktop' | 'Mobile' | 'Tablet' = 'Desktop';
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    deviceType = 'Tablet';
  } else if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(ua)) {
    deviceType = 'Mobile';
  } else if (window.innerWidth < 768) {
    deviceType = 'Mobile';
  } else if (window.innerWidth < 1024) {
    deviceType = 'Tablet';
  }

  // Browser
  let browser = 'Chrome';
  if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Edg/')) browser = 'Edge';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('OPR/') || ua.includes('Opera')) browser = 'Opera';

  // OS
  // iPhone/iPad user agents also say "like Mac OS X", so check them first.
  let os = 'Windows';
  if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  else if (ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('Linux')) os = 'Linux';

  // Referrer
  let referrer = 'Direct';
  if (document.referrer) {
    try {
      const url = new URL(document.referrer);
      if (url.hostname.includes('google')) referrer = 'Google Search';
      else if (url.hostname.includes('facebook') || url.hostname.includes('fb.com')) referrer = 'Facebook';
      else if (url.hostname.includes('linkedin')) referrer = 'LinkedIn';
      else if (url.hostname.includes('github')) referrer = 'GitHub';
      else if (url.hostname.includes('instagram')) referrer = 'Instagram';
      else if (url.hostname.includes('t.co') || url.hostname.includes('twitter') || url.hostname.includes('x.com')) referrer = 'X / Twitter';
      else referrer = url.hostname;
    } catch {
      referrer = document.referrer;
    }
  }

  const screen = `${window.innerWidth}x${window.innerHeight}`;

  return { deviceType, browser, os, screen, referrer };
}

function getOrCreateVisitorId(): string {
  if (typeof window === 'undefined') return 'vis_ssr';
  const KEY = 'barako_visitor_token';
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = `vis_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`;
    localStorage.setItem(KEY, id);
  }
  return id;
}

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return 'sess_ssr';
  const KEY = 'barako_session_token';
  let id = sessionStorage.getItem(KEY);
  if (!id) {
    id = `sess_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
    sessionStorage.setItem(KEY, id);
  }
  return id;
}

export function useVisitorTracker() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Don't count the admin view or local development as visits.
    const { hash, hostname } = window.location;
    if (hash === '#admin' || import.meta.env.DEV || hostname === 'localhost' || hostname === '127.0.0.1') return;

    let disposed = false;
    let cleanup = () => {};
    whenIdle(() => {
      loadTrackingModules()
        .then(([firebase, clarity, analytics]) => {
          if (!disposed) cleanup = startTracking(firebase, clarity, analytics.logEvent);
        })
        .catch((err) => console.debug('[tracker] not started:', err));
    });

    return () => {
      disposed = true;
      cleanup();
    };
  }, []);
}

function startTracking(
  { syncVisitorSession, initFirebaseAnalytics }: typeof import('../lib/firebase'),
  { initClarity, tagClaritySection, identifyClarityVisitor }: typeof import('../lib/clarity'),
  logEvent: typeof import('firebase/analytics').logEvent,
) {
  const sessionRef: { current: VisitorSession | null } = { current: null };
  const currentSectionStartRef = { current: 0 };
  const activeSectionIdRef = { current: 'hero' };

  // 1. Initialize Microsoft Clarity
  initClarity();

  // 2. Initialize Firebase Analytics
  let analyticsObj: any = null;
  initFirebaseAnalytics().then((a) => {
    analyticsObj = a;
    if (analyticsObj) {
      logEvent(analyticsObj, 'page_view', { page_title: document.title });
    }
  });

  // 3. Create or resume session
  const visitorId = getOrCreateVisitorId();
  const sessionId = getOrCreateSessionId();
  const { deviceType, browser, os, screen, referrer } = getDeviceInfo();

  identifyClarityVisitor(visitorId, sessionId);

  const initialSession: VisitorSession = {
    id: sessionId,
    visitorId,
    startedAt: Date.now(),
    lastActiveAt: Date.now(),
    userAgent: navigator.userAgent,
    deviceType,
    browser,
    os,
    screen,
    referrer,
    currentSection: 'hero',
    currentSectionName: SECTION_NAMES.hero,
    sections: [
      {
        sectionId: 'hero',
        sectionName: SECTION_NAMES.hero,
        enteredAt: Date.now(),
        durationSeconds: 0,
      },
    ],
    totalDurationSeconds: 0,
  };

  sessionRef.current = initialSession;
  currentSectionStartRef.current = Date.now();
  activeSectionIdRef.current = 'hero';

  syncVisitorSession(initialSession);
  tagClaritySection('hero', SECTION_NAMES.hero);

  // 4. Track Section Navigation with IntersectionObserver
  const trackedSectionIds = ['hero', 'works', 'about', 'stack', 'services', 'contact'];
  let debounceTimer: any = null;

  const handleSectionIntersect = (entries: IntersectionObserverEntry[]) => {
    // Find the entry that has the highest intersection ratio
    const visibleEntries = entries.filter((e) => e.isIntersecting && e.intersectionRatio > 0.25);
    if (visibleEntries.length === 0) return;

    visibleEntries.sort((a, b) => b.intersectionRatio - a.intersectionRatio);
    const topEntry = visibleEntries[0];
    const sectionId = topEntry.target.id;
    if (!sectionId || sectionId === activeSectionIdRef.current) return;

    clearTimeout(debounceTimer);
    // Debounce slightly to ensure intentional lingering, not rapid skip
    debounceTimer = setTimeout(() => {
      const now = Date.now();
      const durationOnPrev = Math.max(1, Math.round((now - currentSectionStartRef.current) / 1000));
      const prevSectionId = activeSectionIdRef.current;

      const currentSession = sessionRef.current;
      if (!currentSession) return;

      // Update previous section's duration
      const lastVisit = currentSession.sections[currentSession.sections.length - 1];
      if (lastVisit && lastVisit.sectionId === prevSectionId) {
        lastVisit.durationSeconds = (lastVisit.durationSeconds || 0) + durationOnPrev;
      }

      // Add new section navigation
      const sectionName = SECTION_NAMES[sectionId] || sectionId;
      const newVisit: SectionVisit = {
        sectionId,
        sectionName,
        enteredAt: now,
        durationSeconds: 0,
      };

      const totalDuration = Math.round((now - currentSession.startedAt) / 1000);

      const updatedSession: VisitorSession = {
        ...currentSession,
        lastActiveAt: now,
        currentSection: sectionId,
        currentSectionName: sectionName,
        sections: [...currentSession.sections, newVisit],
        totalDurationSeconds: totalDuration,
      };

      sessionRef.current = updatedSession;
      activeSectionIdRef.current = sectionId;
      currentSectionStartRef.current = now;

      // Sync updates off the critical animation frame
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        (window as any).requestIdleCallback(() => syncVisitorSession(updatedSession));
      } else {
        setTimeout(() => syncVisitorSession(updatedSession), 50);
      }
      tagClaritySection(sectionId, sectionName);

      if (analyticsObj) {
        logEvent(analyticsObj, 'view_section', {
          section_id: sectionId,
          section_name: sectionName,
        });
      }
    }, 1000);
  };

  const observer = new IntersectionObserver(handleSectionIntersect, {
    rootMargin: '-10% 0px -25% 0px',
    threshold: 0.25,
  });

  trackedSectionIds.forEach((id) => {
    const el = document.getElementById(id);
    if (el) observer.observe(el);
  });

  // 5. Heartbeat timer: every 30 seconds, ping presence and duration without thrashing. Only while
  // the tab is actually on screen, so a tab left open in the background drops out of "viewing now".
  const heartbeatInterval = setInterval(() => {
    const currentSession = sessionRef.current;
    if (!currentSession || document.visibilityState !== 'visible') return;

    const now = Date.now();
    const currentSecDuration = Math.round((now - currentSectionStartRef.current) / 1000);
    const lastVisit = currentSession.sections[currentSession.sections.length - 1];
    if (lastVisit) {
      lastVisit.durationSeconds = currentSecDuration;
    }

    const totalDuration = Math.round((now - currentSession.startedAt) / 1000);

    const heartbeatSession: VisitorSession = {
      ...currentSession,
      lastActiveAt: now,
      totalDurationSeconds: totalDuration,
    };

    sessionRef.current = heartbeatSession;
    syncVisitorSession(heartbeatSession);
  }, 30000);

  // 6. Final flush on page unload or visibility change
  const handleVisibilityOrUnload = () => {
    const currentSession = sessionRef.current;
    if (!currentSession) return;

    const now = Date.now();
    const finalDuration = Math.round((now - currentSession.startedAt) / 1000);
    const updated: VisitorSession = {
      ...currentSession,
      lastActiveAt: now,
      totalDurationSeconds: finalDuration,
    };
    syncVisitorSession(updated);
  };

  window.addEventListener('visibilitychange', handleVisibilityOrUnload);
  window.addEventListener('beforeunload', handleVisibilityOrUnload);

  return () => {
    clearTimeout(debounceTimer);
    clearInterval(heartbeatInterval);
    observer.disconnect();
    window.removeEventListener('visibilitychange', handleVisibilityOrUnload);
    window.removeEventListener('beforeunload', handleVisibilityOrUnload);
  };
}
