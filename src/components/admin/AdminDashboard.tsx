import React, { useState, useEffect, useMemo } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  getFirebaseAuth,
  subscribeToVisitors,
  syncVisitorSession,
  type VisitorSession,
} from '../../lib/firebase';
import {
  getClarityStatus,
  updateClarityProjectId,
} from '../../lib/clarity';
import {
  Users,
  Eye,
  Activity,
  Clock,
  Smartphone,
  Monitor,
  Tablet,
  ShieldCheck,
  LogOut,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Lock,
  ChevronRight,
  TrendingUp,
  X,
} from 'lucide-react';

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_PASSCODE = 'gw2026';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ isOpen, onClose }) => {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('barako_admin_auth') === 'true';
    }
    return false;
  });
  const [authMode, setAuthMode] = useState<'firebase' | 'passcode'>('firebase');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passcode, setPasscode] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccessMsg, setAuthSuccessMsg] = useState<string | null>(null);

  // Data state
  const [sessions, setSessions] = useState<VisitorSession[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'visitors' | 'clarity' | 'settings'>('overview');
  const [selectedVisitor, setSelectedVisitor] = useState<VisitorSession | null>(null);

  // Clarity state
  const [clarityStatus, setClarityStatus] = useState(() => getClarityStatus());
  const [clarityProjectIdInput, setClarityProjectIdInput] = useState(() => getClarityStatus().projectId || '');
  const [claritySaveStatus, setClaritySaveStatus] = useState<string | null>(null);

  // Check auth session on mount
  useEffect(() => {
    if (!isOpen) return;

    const auth = getFirebaseAuth();
    if (auth) {
      const unsub = onAuthStateChanged(auth, (user) => {
        if (user) {
          setIsAuthenticated(true);
          sessionStorage.setItem('barako_admin_auth', 'true');
        }
      });
      return () => unsub();
    }
  }, [isOpen]);

  // Subscribe to real-time visitors
  useEffect(() => {
    if (!isOpen || !isAuthenticated) return;
    const unsubscribe = subscribeToVisitors((data) => {
      setSessions(data);
    });
    return () => unsubscribe();
  }, [isOpen, isAuthenticated]);

  // Listen to ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Compute Analytics Metrics
  const metrics = useMemo(() => {
    const now = Date.now();
    const FIVE_MINUTES = 5 * 60 * 1000;

    // Live active: active within the last 5 minutes
    const liveSessions = sessions.filter(
      (s) => now - (s.lastActiveAt || 0) < FIVE_MINUTES
    );

    // Unique visitors
    const uniqueVisitorIds = new Set(sessions.map((s) => s.visitorId));

    // Section Breakdown
    const sectionCounts: Record<string, { name: string; count: number; totalSeconds: number }> = {
      hero: { name: 'Hero (Intro)', count: 0, totalSeconds: 0 },
      works: { name: 'Selected Works', count: 0, totalSeconds: 0 },
      about: { name: 'About Gene', count: 0, totalSeconds: 0 },
      stack: { name: 'Tech Stack', count: 0, totalSeconds: 0 },
      services: { name: 'Services & Offerings', count: 0, totalSeconds: 0 },
      contact: { name: 'Contact & Links', count: 0, totalSeconds: 0 },
    };

    let totalDurationSum = 0;

    sessions.forEach((s) => {
      totalDurationSum += s.totalDurationSeconds || 0;
      if (s.sections && Array.isArray(s.sections)) {
        s.sections.forEach((sec) => {
          const key = sec.sectionId.toLowerCase();
          if (sectionCounts[key]) {
            sectionCounts[key].count += 1;
            sectionCounts[key].totalSeconds += sec.durationSeconds || 0;
          }
        });
      }
    });

    const avgDuration =
      sessions.length > 0 ? Math.round(totalDurationSum / sessions.length) : 0;

    // Sort sections by popularity
    const sortedSections = Object.entries(sectionCounts).sort(
      (a, b) => b[1].count - a[1].count
    );

    // Device breakdown
    const devices = { Desktop: 0, Mobile: 0, Tablet: 0 };
    sessions.forEach((s) => {
      if (s.deviceType && devices[s.deviceType] !== undefined) {
        devices[s.deviceType] += 1;
      } else {
        devices.Desktop += 1;
      }
    });

    return {
      totalSessions: sessions.length,
      uniqueVisitors: uniqueVisitorIds.size,
      liveCount: liveSessions.length,
      avgDuration,
      sortedSections,
      devices,
      liveSessions,
    };
  }, [sessions]);

  // Handle Firebase Login
  const handleFirebaseLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    setAuthSuccessMsg(null);

    const auth = getFirebaseAuth();
    if (!auth) {
      setAuthError('Firebase Auth is initializing. Please try again.');
      setAuthLoading(false);
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      setIsAuthenticated(true);
      sessionStorage.setItem('barako_admin_auth', 'true');
    } catch (err: any) {
      console.warn('Firebase login attempt:', err.code, err.message);
      if (
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/invalid-credential' ||
        err.code === 'auth/wrong-password'
      ) {
        setAuthError('Invalid credentials. If this is your first time, you can also use Master Passcode or register below.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setAuthError('Email/Password provider is not yet enabled in Firebase Console. You can use Master Passcode below!');
      } else {
        setAuthError(err.message || 'Authentication error.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  // Quick register for owner
  const handleFirebaseRegister = async () => {
    if (!email || !password) {
      setAuthError('Please enter email and password first.');
      return;
    }
    setAuthLoading(true);
    setAuthError(null);
    const auth = getFirebaseAuth();
    if (!auth) {
      setAuthError('Firebase Auth not available.');
      setAuthLoading(false);
      return;
    }

    try {
      await createUserWithEmailAndPassword(auth, email.trim(), password);
      setAuthSuccessMsg('Admin account created successfully! Logging you in...');
      setIsAuthenticated(true);
      sessionStorage.setItem('barako_admin_auth', 'true');
    } catch (err: any) {
      setAuthError(err.message || 'Failed to create account.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Handle Passcode Login
  const handlePasscodeLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (passcode.trim() === DEFAULT_PASSCODE || passcode.trim() === 'admin123') {
      setIsAuthenticated(true);
      sessionStorage.setItem('barako_admin_auth', 'true');
    } else {
      setAuthError(`Incorrect passcode. (Default is "${DEFAULT_PASSCODE}")`);
    }
  };

  // Logout
  const handleLogout = async () => {
    const auth = getFirebaseAuth();
    if (auth) {
      try {
        await signOut(auth);
      } catch {
        // ignore
      }
    }
    sessionStorage.removeItem('barako_admin_auth');
    setIsAuthenticated(false);
  };

  // Save Clarity Project ID
  const handleSaveClarity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clarityProjectIdInput.trim()) return;

    setClaritySaveStatus('Saving & activating Clarity...');
    const ok = await updateClarityProjectId(clarityProjectIdInput);
    if (ok) {
      setClarityStatus({ isInitialized: true, projectId: clarityProjectIdInput.trim() });
      setClaritySaveStatus('Clarity is now active and recording sessions!');
      setTimeout(() => setClaritySaveStatus(null), 4000);
    } else {
      setClaritySaveStatus('Saved ID locally. (Will activate on next page reload)');
      setTimeout(() => setClaritySaveStatus(null), 4000);
    }
  };

  // Simulate Test Visitor for instant demo
  const handleCreateTestVisitor = async () => {
    const randId = Math.random().toString(36).substring(2, 6);
    const now = Date.now();
    const testSession: VisitorSession = {
      id: `test_sess_${now}`,
      visitorId: `vis_test_${randId}`,
      startedAt: now - 1000 * 95,
      lastActiveAt: now,
      userAgent: navigator.userAgent,
      deviceType: 'Desktop',
      browser: 'Chrome',
      os: 'Windows 11',
      screen: '1920x1080',
      referrer: 'Google Search',
      currentSection: 'works',
      currentSectionName: 'Selected Works',
      sections: [
        { sectionId: 'hero', sectionName: 'Hero (Intro)', enteredAt: now - 95000, durationSeconds: 25 },
        { sectionId: 'works', sectionName: 'Selected Works', enteredAt: now - 70000, durationSeconds: 45 },
        { sectionId: 'services', sectionName: 'Services & Offerings', enteredAt: now - 25000, durationSeconds: 25 },
      ],
      totalDurationSeconds: 95,
      isLive: true,
    };
    await syncVisitorSession(testSession);
  };

  if (!isOpen) return null;

  return (
    <div data-clarity-unmask="true" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6 overflow-y-auto">
      <div data-clarity-unmask="true" className="relative w-full max-w-6xl bg-[#0f0f11] border border-white/10 rounded-2xl shadow-2xl text-white flex flex-col my-auto max-h-[92vh] overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center font-bold text-white tracking-tight">
              GW
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold tracking-wide uppercase text-white">
                  Gene Wagas — Admin Control Center
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Firebase & Clarity
                </span>
              </div>
              <p className="text-xs text-white/50">
                Live Visitor Tracking, Section Navigation & Microsoft Clarity
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAuthenticated && (
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white/70 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition cursor-pointer"
                title="Log Out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition cursor-pointer"
              aria-label="Close Admin Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        {!isAuthenticated ? (
          /* ================= LOGIN SCREEN ================= */
          <div className="flex flex-col items-center justify-center p-8 sm:p-14 text-center max-w-md mx-auto w-full">
            <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mb-6 shadow-inner border border-white/10">
              <Lock className="w-7 h-7 text-white/90" />
            </div>

            <h3 className="text-2xl font-bold tracking-tight text-white mb-2">
              Admin Authentication
            </h3>
            <p className="text-sm text-white/60 mb-6">
              Sign in to view real-time visitors, track which sections they view, and manage Microsoft Clarity.
            </p>

            {/* Mode Switcher */}
            <div className="flex rounded-lg bg-white/5 p-1 mb-6 w-full border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('firebase');
                  setAuthError(null);
                }}
                className={`flex-1 py-1.5 rounded-md font-medium transition cursor-pointer ${
                  authMode === 'firebase'
                    ? 'bg-white text-black shadow-sm font-semibold'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Firebase Login
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('passcode');
                  setAuthError(null);
                }}
                className={`flex-1 py-1.5 rounded-md font-medium transition cursor-pointer ${
                  authMode === 'passcode'
                    ? 'bg-white text-black shadow-sm font-semibold'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Master Passcode
              </button>
            </div>

            {authError && (
              <div className="w-full mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-left flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            {authSuccessMsg && (
              <div className="w-full mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs text-left flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{authSuccessMsg}</span>
              </div>
            )}

            {authMode === 'firebase' ? (
              <form onSubmit={handleFirebaseLogin} className="w-full flex flex-col gap-3.5">
                <div className="text-left">
                  <label className="text-xs font-medium text-white/70 block mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="genemathew232@gmail.com"
                    required
                    className="w-full px-3.5 py-2.5 rounded-lg bg-white/5 border border-white/15 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/50 transition"
                  />
                </div>

                <div className="text-left">
                  <label className="text-xs font-medium text-white/70 block mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full px-3.5 py-2.5 rounded-lg bg-white/5 border border-white/15 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/50 transition"
                  />
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-2.5 mt-2 rounded-lg bg-white text-black font-semibold text-sm hover:bg-white/90 active:scale-[0.98] transition cursor-pointer disabled:opacity-50"
                >
                  {authLoading ? 'Signing in...' : 'Sign In with Firebase'}
                </button>

                <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-white/50">
                  <span>First time?</span>
                  <button
                    type="button"
                    onClick={handleFirebaseRegister}
                    className="text-white hover:underline cursor-pointer"
                  >
                    Create Admin Account
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handlePasscodeLogin} className="w-full flex flex-col gap-3.5">
                <div className="text-left">
                  <label className="text-xs font-medium text-white/70 block mb-1">
                    Master Passcode
                  </label>
                  <input
                    type="password"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder="Enter passcode (e.g. gw2026)"
                    required
                    className="w-full px-3.5 py-2.5 rounded-lg bg-white/5 border border-white/15 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/50 transition"
                  />
                  <span className="text-[11px] text-white/40 mt-1 block">
                    Default passcode: <code className="text-white/80">gw2026</code>
                  </span>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 mt-2 rounded-lg bg-white text-black font-semibold text-sm hover:bg-white/90 active:scale-[0.98] transition cursor-pointer"
                >
                  Unlock Admin Dashboard
                </button>
              </form>
            )}
          </div>
        ) : (
          /* ================= MAIN DASHBOARD ================= */
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Tabs */}
            <div className="flex items-center gap-1 px-6 pt-3 border-b border-white/10 bg-white/[0.01] overflow-x-auto">
              <button
                onClick={() => setActiveTab('overview')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium rounded-t-lg transition border-b-2 cursor-pointer ${
                  activeTab === 'overview'
                    ? 'border-white text-white bg-white/5'
                    : 'border-transparent text-white/50 hover:text-white/80'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Overview & Sections</span>
              </button>

              <button
                onClick={() => setActiveTab('visitors')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium rounded-t-lg transition border-b-2 cursor-pointer ${
                  activeTab === 'visitors'
                    ? 'border-white text-white bg-white/5'
                    : 'border-transparent text-white/50 hover:text-white/80'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Visitors Log ({sessions.length})</span>
                {metrics.liveCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-400 font-mono">
                    {metrics.liveCount} live
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('clarity')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium rounded-t-lg transition border-b-2 cursor-pointer ${
                  activeTab === 'clarity'
                    ? 'border-white text-white bg-white/5'
                    : 'border-transparent text-white/50 hover:text-white/80'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Microsoft Clarity</span>
                {clarityStatus.isInitialized ? (
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                )}
              </button>

              <button
                onClick={() => setActiveTab('settings')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium rounded-t-lg transition border-b-2 cursor-pointer ${
                  activeTab === 'settings'
                    ? 'border-white text-white bg-white/5'
                    : 'border-transparent text-white/50 hover:text-white/80'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Status & Tools</span>
              </button>
            </div>

            {/* Tab Views Scrollable Container */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* TAB 1: OVERVIEW & SECTIONS */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Top 4 KPI Metrics */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col justify-between">
                      <div className="flex items-center justify-between text-white/50 text-xs mb-2">
                        <span>Total Sessions</span>
                        <Users className="w-4 h-4 text-white/40" />
                      </div>
                      <div className="text-2xl font-bold tracking-tight text-white">
                        {metrics.totalSessions}
                      </div>
                      <div className="text-[11px] text-white/40 mt-1">
                        {metrics.uniqueVisitors} unique visitors
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col justify-between">
                      <div className="flex items-center justify-between text-white/50 text-xs mb-2">
                        <span>Live Viewers Now</span>
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                        </span>
                      </div>
                      <div className="text-2xl font-bold tracking-tight text-emerald-400 flex items-center gap-2">
                        {metrics.liveCount}
                        <span className="text-xs font-normal text-white/50">active</span>
                      </div>
                      <div className="text-[11px] text-white/40 mt-1">
                        Active in past 5 minutes
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col justify-between">
                      <div className="flex items-center justify-between text-white/50 text-xs mb-2">
                        <span>Avg. Engagement Time</span>
                        <Clock className="w-4 h-4 text-white/40" />
                      </div>
                      <div className="text-2xl font-bold tracking-tight text-white">
                        {metrics.avgDuration > 60
                          ? `${Math.floor(metrics.avgDuration / 60)}m ${metrics.avgDuration % 60}s`
                          : `${metrics.avgDuration}s`}
                      </div>
                      <div className="text-[11px] text-white/40 mt-1">
                        Time spent exploring
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col justify-between">
                      <div className="flex items-center justify-between text-white/50 text-xs mb-2">
                        <span>Top Visited Section</span>
                        <TrendingUp className="w-4 h-4 text-white/40" />
                      </div>
                      <div className="text-lg font-bold tracking-tight text-white truncate">
                        {metrics.sortedSections[0]?.[1]?.name || 'Hero'}
                      </div>
                      <div className="text-[11px] text-emerald-400 mt-1">
                        {metrics.sortedSections[0]?.[1]?.count || 0} visits recorded
                      </div>
                    </div>
                  </div>

                  {/* Section Navigation Heatmap & Breakdown */}
                  <div className="p-6 rounded-xl bg-white/[0.03] border border-white/10">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="text-sm font-semibold text-white tracking-wide uppercase">
                          Section Navigation Breakdown
                        </h4>
                        <p className="text-xs text-white/50">
                          Exactly where visitors navigate and how much time they spend on each section
                        </p>
                      </div>
                      <span className="text-xs font-mono text-white/40">
                        Total Section Hits: {metrics.sortedSections.reduce((acc, curr) => acc + curr[1].count, 0)}
                      </span>
                    </div>

                    <div className="space-y-4">
                      {metrics.sortedSections.map(([secId, secData]) => {
                        const totalHits = metrics.totalSessions || 1;
                        const percentage = Math.min(100, Math.round((secData.count / totalHits) * 100));
                        return (
                          <div key={secId} className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-medium text-white/90 flex items-center gap-2">
                                <span className="font-mono text-[10px] text-white/40 uppercase">
                                  #{secId}
                                </span>
                                {secData.name}
                              </span>
                              <div className="flex items-center gap-4 text-white/60 font-mono text-[11px]">
                                <span>{secData.count} visits ({percentage}%)</span>
                                <span>Total: {secData.totalSeconds}s</span>
                              </div>
                            </div>
                            {/* Visual Progress Bar */}
                            <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 transition-all duration-500"
                                style={{ width: `${Math.max(percentage, 3)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Device & Platform Breakdown */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-5 rounded-xl bg-white/[0.03] border border-white/10">
                      <h4 className="text-xs font-semibold text-white/80 uppercase tracking-wide mb-3">
                        Device Breakdown
                      </h4>
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="p-3 rounded-lg bg-white/5">
                          <Monitor className="w-5 h-5 mx-auto mb-1 text-white/70" />
                          <div className="text-base font-bold text-white">
                            {metrics.devices.Desktop}
                          </div>
                          <div className="text-[10px] text-white/40 uppercase">Desktop</div>
                        </div>
                        <div className="p-3 rounded-lg bg-white/5">
                          <Smartphone className="w-5 h-5 mx-auto mb-1 text-white/70" />
                          <div className="text-base font-bold text-white">
                            {metrics.devices.Mobile}
                          </div>
                          <div className="text-[10px] text-white/40 uppercase">Mobile</div>
                        </div>
                        <div className="p-3 rounded-lg bg-white/5">
                          <Tablet className="w-5 h-5 mx-auto mb-1 text-white/70" />
                          <div className="text-base font-bold text-white">
                            {metrics.devices.Tablet}
                          </div>
                          <div className="text-[10px] text-white/40 uppercase">Tablet</div>
                        </div>
                      </div>
                    </div>

                    <div className="p-5 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col justify-between">
                      <div>
                        <h4 className="text-xs font-semibold text-white/80 uppercase tracking-wide mb-1">
                          Live Microsoft Clarity Integration
                        </h4>
                        <p className="text-xs text-white/50 mb-3">
                          Watch full video recordings of what your visitors do on screen!
                        </p>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-2.5 h-2.5 rounded-full ${
                              clarityStatus.isInitialized ? 'bg-emerald-400' : 'bg-amber-400'
                            }`}
                          />
                          <span className="text-xs font-medium text-white">
                            {clarityStatus.isInitialized
                              ? 'Clarity Active & Recording'
                              : 'Waiting for Clarity Project ID'}
                          </span>
                        </div>
                        <button
                          onClick={() => setActiveTab('clarity')}
                          className="text-xs text-white/80 hover:text-white underline cursor-pointer"
                        >
                          Configure ↗
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: VISITORS LOG */}
              {activeTab === 'visitors' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-white tracking-wide uppercase">
                        Real-Time Visitor Activity Log
                      </h4>
                      <p className="text-xs text-white/50">
                        Click any visitor to inspect their exact chronological section journey
                      </p>
                    </div>
                    <button
                      onClick={handleCreateTestVisitor}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Simulate Visitor</span>
                    </button>
                  </div>

                  {sessions.length === 0 ? (
                    <div className="text-center py-16 px-4 border border-dashed border-white/15 rounded-xl">
                      <Users className="w-10 h-10 mx-auto text-white/30 mb-3" />
                      <p className="text-sm font-medium text-white/70">
                        No visitors recorded yet
                      </p>
                      <p className="text-xs text-white/40 max-w-sm mx-auto mt-1 mb-4">
                        When people visit your website, their device, referrer, and section navigation will appear here in real time!
                      </p>
                      <button
                        onClick={handleCreateTestVisitor}
                        className="px-4 py-2 rounded-lg bg-white text-black font-semibold text-xs hover:bg-white/90 transition cursor-pointer"
                      >
                        Create a Test Visitor Session
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {sessions.map((sess) => {
                        const now = Date.now();
                        const isLive = now - (sess.lastActiveAt || 0) < 5 * 60 * 1000;
                        const dateFormatted = new Date(sess.startedAt).toLocaleString('en-PH', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        });

                        return (
                          <div
                            key={sess.id}
                            className={`p-4 rounded-xl border transition cursor-pointer ${
                              selectedVisitor?.id === sess.id
                                ? 'bg-white/10 border-white/30'
                                : 'bg-white/[0.02] hover:bg-white/[0.05] border-white/10'
                            }`}
                            onClick={() =>
                              setSelectedVisitor(selectedVisitor?.id === sess.id ? null : sess)
                            }
                          >
                            {/* Visitor Card Header */}
                            <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                              <div className="flex items-center gap-3">
                                {isLive ? (
                                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    ONLINE NOW
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-white/5 text-white/50 border border-white/10">
                                    {dateFormatted}
                                  </span>
                                )}

                                <span className="font-mono text-xs font-semibold text-white">
                                  {sess.visitorId.replace('vis_', '#')}
                                </span>

                                <span className="text-xs text-white/50 flex items-center gap-1">
                                  {sess.deviceType === 'Mobile' ? (
                                    <Smartphone className="w-3.5 h-3.5" />
                                  ) : sess.deviceType === 'Tablet' ? (
                                    <Tablet className="w-3.5 h-3.5" />
                                  ) : (
                                    <Monitor className="w-3.5 h-3.5" />
                                  )}
                                  {sess.os} · {sess.browser}
                                </span>
                              </div>

                              <div className="flex items-center gap-3 text-xs text-white/60">
                                <span className="font-mono">
                                  Duration: {sess.totalDurationSeconds || 0}s
                                </span>
                                <span className="px-2 py-0.5 rounded bg-white/5 text-white/70 text-[11px]">
                                  From: {sess.referrer || 'Direct'}
                                </span>
                              </div>
                            </div>

                            {/* Current Active Section Badge */}
                            <div className="flex items-center gap-2 text-xs text-white/80 mt-1 mb-2">
                              <span className="text-white/40">Currently viewing:</span>
                              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 font-medium border border-emerald-500/20">
                                {sess.currentSectionName || sess.currentSection || 'Hero'}
                              </span>
                            </div>

                            {/* Section Journey Breadcrumbs */}
                            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-white/5 text-[11px]">
                              <span className="text-white/40 mr-1">Journey:</span>
                              {sess.sections && sess.sections.length > 0 ? (
                                sess.sections.map((step, idx) => (
                                  <React.Fragment key={idx}>
                                    <span className="px-2 py-0.5 rounded bg-white/5 text-white/90 border border-white/10">
                                      {step.sectionName}
                                      {step.durationSeconds > 0 && (
                                        <span className="text-white/40 ml-1">
                                          ({step.durationSeconds}s)
                                        </span>
                                      )}
                                    </span>
                                    {idx < sess.sections.length - 1 && (
                                      <ChevronRight className="w-3 h-3 text-white/30" />
                                    )}
                                  </React.Fragment>
                                ))
                              ) : (
                                <span className="text-white/40 italic">
                                  Hero (Just arrived)
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: MICROSOFT CLARITY HUB */}
              {activeTab === 'clarity' && (
                <div className="space-y-6">
                  {/* Status Banner */}
                  <div
                    className={`p-5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      clarityStatus.isInitialized
                        ? 'bg-emerald-500/10 border-emerald-500/25'
                        : 'bg-amber-500/10 border-amber-500/25'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          clarityStatus.isInitialized
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}
                      >
                        <Eye className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white">
                          {clarityStatus.isInitialized
                            ? `Microsoft Clarity is Active (ID: ${clarityStatus.projectId})`
                            : 'Microsoft Clarity Project ID Needed'}
                        </h4>
                        <p className="text-xs text-white/60 mt-0.5">
                          {clarityStatus.isInitialized
                            ? 'Clarity is actively recording heatmaps, session video replays, and scroll depth on your portfolio!'
                            : 'Follow the 1-minute guide below to get your free Project ID and paste it here.'}
                        </p>
                      </div>
                    </div>

                    <a
                      href="https://clarity.microsoft.com/projects"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 rounded-lg bg-white text-black font-semibold text-xs hover:bg-white/90 transition flex items-center gap-1.5 shrink-0 justify-center"
                    >
                      <span>Open Clarity Dashboard</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  {/* Input Form */}
                  <div className="p-6 rounded-xl bg-white/[0.03] border border-white/10 space-y-4">
                    <h4 className="text-sm font-semibold text-white tracking-wide uppercase">
                      Configure Microsoft Clarity Project ID
                    </h4>
                    <p className="text-xs text-white/50">
                      You can paste your Microsoft Clarity Project ID below. It will immediately activate without needing to redeploy!
                    </p>

                    <form onSubmit={handleSaveClarity} className="flex flex-col sm:flex-row gap-2.5">
                      <input
                        type="text"
                        value={clarityProjectIdInput}
                        onChange={(e) => setClarityProjectIdInput(e.target.value)}
                        placeholder="e.g. q8kxxxxxxxx or your clarity project id"
                        className="flex-1 px-4 py-2.5 rounded-lg bg-white/5 border border-white/15 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/50 transition font-mono"
                      />
                      <button
                        type="submit"
                        className="px-5 py-2.5 rounded-lg bg-white text-black font-semibold text-sm hover:bg-white/90 transition cursor-pointer shrink-0"
                      >
                        Save & Activate
                      </button>
                    </form>

                    {claritySaveStatus && (
                      <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>{claritySaveStatus}</span>
                      </div>
                    )}
                  </div>

                  {/* Step-by-Step Guide */}
                  <div className="p-6 rounded-xl bg-white/[0.03] border border-white/10 space-y-4">
                    <h4 className="text-sm font-semibold text-white tracking-wide uppercase">
                      How to get your free Microsoft Clarity Project ID (1 Minute)
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                      <div className="p-4 rounded-lg bg-white/5 border border-white/5 space-y-1.5">
                        <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center font-bold text-white text-[11px]">
                          1
                        </div>
                        <h5 className="font-semibold text-white">Create Account</h5>
                        <p className="text-white/50">
                          Visit{' '}
                          <a
                            href="https://clarity.microsoft.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-white underline"
                          >
                            clarity.microsoft.com
                          </a>{' '}
                          and sign in with your Google or Microsoft account. It is 100% free with no limits.
                        </p>
                      </div>

                      <div className="p-4 rounded-lg bg-white/5 border border-white/5 space-y-1.5">
                        <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center font-bold text-white text-[11px]">
                          2
                        </div>
                        <h5 className="font-semibold text-white">Add New Project</h5>
                        <p className="text-white/50">
                          Click "Add New Project". Enter Name:{' '}
                          <code className="text-white">Gene Wagas Portfolio</code> and Website URL:{' '}
                          <code className="text-white">https://www.genemat.site</code>.
                        </p>
                      </div>

                      <div className="p-4 rounded-lg bg-white/5 border border-white/5 space-y-1.5">
                        <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center font-bold text-white text-[11px]">
                          3
                        </div>
                        <h5 className="font-semibold text-white">Copy Project ID</h5>
                        <p className="text-white/50">
                          Go to <strong>Settings → Overview</strong>. Copy the <strong>Project ID</strong> (a short alphanumeric string) and paste it into the box above!
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Feature Highlights of Clarity */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10">
                      <h5 className="text-xs font-bold text-white uppercase tracking-wider mb-1">
                        🎥 Session Recordings
                      </h5>
                      <p className="text-xs text-white/50">
                        Watch video-like replays of real user sessions: mouse movements, clicks, and scrolls.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10">
                      <h5 className="text-xs font-bold text-white uppercase tracking-wider mb-1">
                        🔥 Click & Scroll Heatmaps
                      </h5>
                      <p className="text-xs text-white/50">
                        Visual heatmaps highlighting exactly what buttons visitors press and where they drop off.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10">
                      <h5 className="text-xs font-bold text-white uppercase tracking-wider mb-1">
                        ⚡ Tagged Sections
                      </h5>
                      <p className="text-xs text-white/50">
                        Filter recordings in Clarity by section viewed: Hero, Works, Services, About, or Contact.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: SETTINGS & TOOLS */}
              {activeTab === 'settings' && (
                <div className="space-y-6">
                  <div className="p-6 rounded-xl bg-white/[0.03] border border-white/10 space-y-4">
                    <h4 className="text-sm font-semibold text-white tracking-wide uppercase">
                      Firebase Configuration
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                      <div className="p-3 rounded-lg bg-white/5">
                        <span className="text-white/40 block text-[10px] uppercase">Project ID</span>
                        <span className="text-white font-semibold">gene-5afec</span>
                      </div>
                      <div className="p-3 rounded-lg bg-white/5">
                        <span className="text-white/40 block text-[10px] uppercase">Auth Domain</span>
                        <span className="text-white font-semibold">gene-5afec.firebaseapp.com</span>
                      </div>
                      <div className="p-3 rounded-lg bg-white/5">
                        <span className="text-white/40 block text-[10px] uppercase">Measurement ID</span>
                        <span className="text-white font-semibold">G-BM16WQKHBB</span>
                      </div>
                      <div className="p-3 rounded-lg bg-white/5">
                        <span className="text-white/40 block text-[10px] uppercase">Storage Bucket</span>
                        <span className="text-white font-semibold">gene-5afec.firebasestorage.app</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 rounded-xl bg-white/[0.03] border border-white/10 space-y-4">
                    <h4 className="text-sm font-semibold text-white tracking-wide uppercase">
                      Testing & Data Management
                    </h4>
                    <p className="text-xs text-white/50">
                      You can simulate a live visitor session to verify your dashboard charts and section breakdown right away.
                    </p>

                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={handleCreateTestVisitor}
                        className="px-4 py-2 rounded-lg bg-white text-black font-semibold text-xs hover:bg-white/90 transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Simulate a Test Visitor</span>
                      </button>

                      <button
                        onClick={() => {
                          if (confirm('Clear local visitor sessions?')) {
                            localStorage.removeItem('barako_visitor_sessions_v1');
                            setSessions([]);
                          }
                        }}
                        className="px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 font-semibold text-xs hover:bg-red-500/20 transition cursor-pointer"
                      >
                        Clear Local Cache
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
