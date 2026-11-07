import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Monitor, Smartphone, Tablet, X, Lock, ArrowUpRight } from 'lucide-react';
import { subscribeToRecentVisitors, type VisitorSession } from '../../lib/firebase';
import { lockScroll } from '../../lib/smoothScroll';
import { VisitorsChart, type DayPoint } from './VisitorsChart';
import { lockAdmin, unlockAdmin, watchAdmin } from './adminAuth';

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const LIVE_WINDOW = 2 * MINUTE; // visitors ping every 30s while the page is open
const CHART_DAYS = 30;
const CLARITY_URL = 'https://clarity.microsoft.com/projects/view/z985sk1e91/dashboard';

const startOfDay = (ms: number) => {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const clock = (ms: number) => new Date(ms).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

const dayName = (ms: number, now: number) => {
  const today = startOfDay(now);
  if (ms >= today) return 'Today';
  if (ms >= today - DAY) return 'Yesterday';
  return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const duration = (seconds: number) => {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${String(s % 60).padStart(2, '0')}s`;
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;
};

const ago = (ms: number, now: number) => {
  const d = Math.max(0, now - ms);
  if (d < MINUTE) return 'just now';
  if (d < HOUR) return `${Math.floor(d / MINUTE)}m ago`;
  return `${Math.floor(d / HOUR)}h ago`;
};

const DeviceIcon: React.FC<{ type: VisitorSession['deviceType']; className?: string }> = ({ type, className }) =>
  type === 'Mobile' ? <Smartphone className={className} /> : type === 'Tablet' ? <Tablet className={className} /> : <Monitor className={className} />;

const sectionsOf = (s: VisitorSession) => {
  const seen: string[] = [];
  for (const sec of s.sections ?? []) if (!seen.includes(sec.sectionName)) seen.push(sec.sectionName);
  return seen;
};

// Visits recorded before the tracker's iPhone fix were saved as macOS; the user agent tells the truth.
const osOf = (s: VisitorSession) => (/iPhone|iPad|iPod/.test(s.userAgent || '') ? 'iOS' : s.os);

const shortSection = (name: string) => name.replace(/\s*\(.*\)$/, '');

/* ------------------------------------------------------------------------------------------- */

const UNLOCK_ERRORS: Record<string, string> = {
  wrong: 'Wrong username or password.',
  'too-many': 'Too many attempts. Try again in a few minutes.',
  offline: "Can't reach the server. Check your connection.",
  error: 'Something went wrong. Try again.',
};

const field =
  'w-full h-12 rounded-full border border-black/15 bg-white px-5 text-[15px] outline-none transition focus:border-black placeholder:text-black/30';

// Verified by Firebase; on success the dashboard sees the sign-in through watchAdmin.
const LoginForm: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const userInput = useRef<HTMLInputElement>(null);
  const passInput = useRef<HTMLInputElement>(null);

  useEffect(() => userInput.current?.focus(), []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !username.trim() || !password) return;
    setBusy(true);
    const result = await unlockAdmin(username, password);
    setBusy(false);
    if (result === 'ok') return;
    setPassword('');
    setError(UNLOCK_ERRORS[result]);
    passInput.current?.focus();
  };

  return (
    <form onSubmit={submit} className="flex flex-col items-center text-center w-full max-w-[320px] mx-auto py-16 sm:py-24">
      <div className="w-12 h-12 rounded-full bg-black text-white grid place-items-center mb-6">
        <Lock className="w-5 h-5" />
      </div>
      <h2 className="text-[22px] font-bold uppercase tracking-[-0.06em] leading-none">Admin</h2>
      <p className="text-[13px] text-black/50 mt-2">Sign in to view your visitors.</p>
      <label htmlFor="admin-user" className="sr-only">
        Username
      </label>
      <input
        ref={userInput}
        id="admin-user"
        type="text"
        autoComplete="username"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        value={username}
        onChange={(e) => {
          setUsername(e.target.value);
          setError(null);
        }}
        placeholder="Username"
        className={`mt-7 ${field}`}
      />
      <label htmlFor="admin-pass" className="sr-only">
        Password
      </label>
      <input
        ref={passInput}
        id="admin-pass"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
          setError(null);
        }}
        placeholder="Password"
        className={`mt-2.5 ${field}`}
      />
      <button
        type="submit"
        disabled={busy || !username.trim() || !password}
        className="mt-3 w-full h-12 rounded-full bg-black text-white text-[13px] font-bold uppercase tracking-[-0.02em] transition hover:bg-black/85 disabled:opacity-40 cursor-pointer disabled:cursor-default"
      >
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
      <p role="alert" className="min-h-5 mt-3 text-[12px] font-medium text-[#c0362c]">
        {error}
      </p>
    </form>
  );
};

/* ------------------------------------------------------------------------------------------- */

const Stat: React.FC<{ label: string; value: number; sub: string; live?: boolean }> = ({ label, value, sub, live }) => (
  <div className="rounded-2xl border border-black/7 bg-white p-4 sm:p-5">
    <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[-0.01em] text-black/50">
      {live && (
        <span className="relative flex w-2 h-2">
          {value > 0 && <span className="absolute inset-0 rounded-full bg-[#1f9d55] animate-ping opacity-60" />}
          <span className={`relative w-2 h-2 rounded-full ${value > 0 ? 'bg-[#1f9d55]' : 'bg-black/20'}`} />
        </span>
      )}
      {label}
    </div>
    <div className="mt-2 text-[32px] sm:text-[36px] font-bold leading-none tracking-tighter tabular-nums">{value}</div>
    <div className="mt-1.5 text-[11px] text-black/45">{sub}</div>
  </div>
);

const Card: React.FC<{ title: string; aside?: React.ReactNode; children: React.ReactNode }> = ({ title, aside, children }) => (
  <section className="min-w-0 rounded-2xl border border-black/7 bg-white">
    <header className="flex items-center justify-between gap-3 px-4 sm:px-5 pt-4 sm:pt-5">
      <h3 className="text-[13px] font-bold uppercase tracking-[-0.03em]">{title}</h3>
      {aside}
    </header>
    <div className="p-4 sm:p-5 pt-3 sm:pt-4">{children}</div>
  </section>
);

const VisitorLine: React.FC<{ s: VisitorSession }> = ({ s }) => (
  <div className="flex items-center gap-3 min-w-0">
    <span className="w-9 h-9 shrink-0 rounded-full bg-black/5 grid place-items-center">
      <DeviceIcon type={s.deviceType} className="w-4 h-4 text-black/70" />
    </span>
    <div className="min-w-0">
      <div className="text-[13px] font-semibold truncate">
        {s.browser} on {osOf(s)}
      </div>
      <div className="text-[11px] text-black/45 truncate">
        {s.deviceType} · from {s.referrer || 'Direct'}
      </div>
    </div>
  </div>
);

/* ------------------------------------------------------------------------------------------- */

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ isOpen, onClose }) => {
  // null while Firebase restores a previous sign-in, then whether the admin is signed in.
  const [unlocked, setUnlocked] = useState<boolean | null>(null);
  const [sessions, setSessions] = useState<VisitorSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // Freeze the page underneath while the panel is open.
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    lockScroll(true);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      lockScroll(false);
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    return watchAdmin((signedIn) => {
      setUnlocked(signedIn);
      // A listener cut off by signing out reports a permission error; don't carry it over.
      setError(null);
    });
  }, [isOpen]);

  // Live data: every session active in the chart window, kept in sync by Firestore.
  useEffect(() => {
    if (!isOpen || !unlocked) return;
    const since = startOfDay(Date.now() - (CHART_DAYS - 1) * DAY);
    let active = true;
    const unsubscribe = subscribeToRecentVisitors(
      since,
      (data) => {
        if (!active) return;
        setSessions(data.filter((s) => !/localhost|127\.0\.0\.1/.test(s.referrer || '')));
        setLoading(false);
        setError(null);
      },
      (message) => {
        if (!active) return;
        setError(message);
        setLoading(false);
      },
    );
    return () => {
      active = false;
      unsubscribe();
    };
  }, [isOpen, unlocked]);

  // Re-evaluate "viewing now" and relative times as the clock moves.
  useEffect(() => {
    if (!isOpen || !unlocked) return;
    const id = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, [isOpen, unlocked]);

  const data = useMemo(() => {
    const live = sessions.filter((s) => now - (s.lastActiveAt || 0) < LIVE_WINDOW).sort((a, b) => b.startedAt - a.startedAt);
    const lastDay = sessions.filter((s) => (s.lastActiveAt || 0) >= now - DAY).sort((a, b) => b.startedAt - a.startedAt);
    const uniq = (list: VisitorSession[]) => new Set(list.map((s) => s.visitorId)).size;
    const within = (ms: number) => sessions.filter((s) => (s.lastActiveAt || 0) >= now - ms);

    const today = startOfDay(now);
    const days: DayPoint[] = [];
    for (let i = CHART_DAYS - 1; i >= 0; i--) {
      // Step by calendar day, not 24h, so daylight-saving shifts don't skip or repeat a day.
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      days.push({ day: d.getTime(), visitors: 0, sessions: 0 });
    }
    const byDay = new Map(days.map((p) => [p.day, { point: p, ids: new Set<string>() }]));
    for (const s of sessions) {
      const bucket = byDay.get(startOfDay(s.startedAt || s.lastActiveAt));
      if (!bucket) continue;
      bucket.point.sessions += 1;
      bucket.ids.add(s.visitorId);
    }
    byDay.forEach(({ point, ids }) => (point.visitors = ids.size));

    return {
      live,
      lastDay,
      liveCount: uniq(live),
      dayCount: uniq(lastDay),
      weekCount: uniq(within(7 * DAY)),
      monthCount: uniq(sessions),
      days,
    };
  }, [sessions, now]);

  if (!isOpen) return null;

  const lock = () => {
    setSessions([]);
    setLoading(true);
    lockAdmin();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Admin — visitors"
      id="admin-panel"
      data-lenis-prevent
      className="fixed inset-0 z-300 overflow-y-auto overscroll-contain bg-[#f6f6f4] text-black"
    >
      <div className="sticky top-0 z-20 bg-[#f6f6f4]/95 border-b border-black/6">
        <div className="max-w-280 mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-3">
          <div className="flex items-baseline gap-3">
            <span className="text-[14px] font-bold uppercase tracking-[-0.06em]">GW™</span>
            <span className="text-[14px] font-medium uppercase tracking-[-0.06em] text-black/45">Visitors</span>
          </div>
          <div className="flex items-center gap-2">
            {unlocked && (
              <button
                type="button"
                onClick={lock}
                className="h-9 px-4 rounded-full border border-black/10 bg-white text-[12px] font-semibold uppercase tracking-[-0.02em] hover:border-black/30 transition cursor-pointer"
              >
                Lock
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close admin"
              className="w-9 h-9 rounded-full bg-black text-white grid place-items-center hover:bg-black/80 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-280 mx-auto px-4 sm:px-8 pb-16">
        {unlocked === null ? (
          <p className="py-24 text-center text-[13px] text-black/45">Loading…</p>
        ) : !unlocked ? (
          <LoginForm />
        ) : (
          <div className="flex flex-col gap-4 sm:gap-5 pt-6 sm:pt-8">
            {error && (
              <p role="alert" className="rounded-2xl bg-[#fdecea] text-[#8a2a22] text-[13px] px-4 py-3">
                Couldn't load visitors: {error}
              </p>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <Stat label="Viewing now" value={data.liveCount} sub="active in the last 2 min" live />
              <Stat label="Last 24 hours" value={data.dayCount} sub={`${data.lastDay.length} visits`} />
              <Stat label="Last 7 days" value={data.weekCount} sub="unique visitors" />
              <Stat label="Last 30 days" value={data.monthCount} sub="unique visitors" />
            </div>

            <Card
              title="Visitors per day"
              aside={<span className="text-[11px] font-medium text-black/45">Last {CHART_DAYS} days</span>}
            >
              {loading ? (
                <div className="h-55 rounded-xl skeleton-shimmer" />
              ) : (
                <>
                  <VisitorsChart points={data.days} />
                  <details className="mt-3 group">
                    <summary className="text-[11px] font-semibold uppercase tracking-[-0.01em] text-black/45 cursor-pointer hover:text-black w-fit">
                      View as table
                    </summary>
                    <div className="mt-3 max-h-64 overflow-y-auto rounded-xl border border-black/6">
                      <table className="w-full text-[12px]">
                        <thead className="sticky top-0 bg-[#fafaf9] text-black/45 text-left">
                          <tr>
                            <th className="font-semibold px-3 py-2">Day</th>
                            <th className="font-semibold px-3 py-2 text-right">Visitors</th>
                            <th className="font-semibold px-3 py-2 text-right">Visits</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...data.days].reverse().map((p) => (
                            <tr key={p.day} className="border-t border-black/5">
                              <td className="px-3 py-1.5">{dayName(p.day, now)}</td>
                              <td className="px-3 py-1.5 text-right tabular-nums font-semibold">{p.visitors}</td>
                              <td className="px-3 py-1.5 text-right tabular-nums text-black/55">{p.sessions}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                </>
              )}
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-4 sm:gap-5 items-start">
              <Card
                title="Viewing now"
                aside={
                  <span className="flex items-center gap-1.5 text-[11px] font-medium text-black/45">
                    <span className={`w-1.5 h-1.5 rounded-full ${data.live.length ? 'bg-[#1f9d55]' : 'bg-black/20'}`} />
                    Live
                  </span>
                }
              >
                {data.live.length === 0 ? (
                  <p className="text-[13px] text-black/45 py-6 text-center">{loading ? 'Loading…' : 'No one is on your site right now.'}</p>
                ) : (
                  <ul className="flex flex-col divide-y divide-black/6">
                    {data.live.map((s) => (
                      <li key={s.id} className="py-3 first:pt-0 last:pb-0">
                        <VisitorLine s={s} />
                        <div className="mt-2.5 ml-12 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-black/55">
                          <span>
                            Now on <strong className="font-semibold text-black">{shortSection(s.currentSectionName || 'Hero')}</strong>
                          </span>
                          <span>Arrived {clock(s.startedAt)}</span>
                          <span className="tabular-nums">{duration((now - s.startedAt) / 1000)} on site</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              <Card title="Last 24 hours" aside={<span className="text-[11px] font-medium text-black/45">{data.lastDay.length} visits</span>}>
                {data.lastDay.length === 0 ? (
                  <p className="text-[13px] text-black/45 py-6 text-center">{loading ? 'Loading…' : 'No visits in the last 24 hours.'}</p>
                ) : (
                  <ul className="flex flex-col divide-y divide-black/6 max-h-140 overflow-y-auto -mr-2 pr-2">
                    {data.lastDay.map((s) => {
                      const isLive = now - (s.lastActiveAt || 0) < LIVE_WINDOW;
                      const secs = sectionsOf(s);
                      return (
                        <li key={s.id} className="py-3 first:pt-0 last:pb-0 flex gap-3 sm:gap-4">
                          <div className="w-17 shrink-0 pt-0.5">
                            <div className="text-[13px] font-bold tabular-nums tracking-[-0.02em]">{clock(s.startedAt)}</div>
                            <div className="text-[11px] text-black/45">{dayName(s.startedAt, now)}</div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <VisitorLine s={s} />
                              <span
                                className={`shrink-0 mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                                  isLive ? 'bg-[#e7f6ec] text-[#16733e]' : 'bg-black/5 text-black/50'
                                }`}
                              >
                                {isLive ? '● Live' : ago(s.lastActiveAt, now)}
                              </span>
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                              <span className="text-[11px] text-black/55 tabular-nums mr-1">
                                {duration(s.totalDurationSeconds || (s.lastActiveAt - s.startedAt) / 1000)}
                              </span>
                              {secs.map((name) => (
                                <span key={name} className="rounded-full border border-black/8 px-2 py-0.5 text-[10px] text-black/60">
                                  {shortSection(name)}
                                </span>
                              ))}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Card>
            </div>

            <a
              href={CLARITY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="self-start flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[-0.02em] text-black/55 hover:text-black transition"
            >
              Session recordings & heatmaps in Microsoft Clarity
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
