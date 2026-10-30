import React, { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import type { ProjectItem, SampleSite } from '../types/portfolio';
import { OPEN_PHONE_CHAT } from '../lib/phoneChat';
import { isSmoothScrolling, lockScroll, smoothScrollTo } from '../lib/smoothScroll';

interface WorksSectionProps {
  projects: ProjectItem[];
  email?: string;
}

type FinishKey = 'titanium' | 'graphite' | 'coral' | 'sage';

// [base, dark, light, darkest] — same palette as the Foldfolio component.
const FINISHES: Record<FinishKey, { label: string; c: [string, string, string, string] }> = {
  titanium: { label: 'Titanium', c: ['#DCD9D3', '#A6A29B', '#F7F5F1', '#6F6B65'] },
  graphite: { label: 'Graphite', c: ['#3A3A3D', '#1B1B1D', '#6A6A6E', '#0E0E10'] },
  coral: { label: 'Coral', c: ['#EFA38C', '#C4664F', '#F9CDBE', '#9B4A37'] },
  sage: { label: 'Sage', c: ['#C3CBB7', '#76816B', '#E0E6D8', '#5A6450'] },
};

const GEO = {
  landscape: { W: 1000, H: 684, f: 4, bz: 8, R: 46 },
  portrait: { W: 380, H: 740, f: 4, bz: 7, R: 42 },
};

// Scroll lengths are in viewport heights.
const MOTION = { openLength: 1.15, holdLength: 0.4, closeLength: 1.1, smoothing: 0.12, float: true };
const LAYOUT = { top: 72, bottom: 32, maxScale: 1.3, portraitBelow: 700 };
const PERSPECTIVE = 2800;
const SCREEN_BG = '#FBFAF8';
const EASE = 'cubic-bezier(.16,1,.3,1)';

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

const mix = (a: string, b: string, t: number) => {
  const p = (h: string) => {
    const n = parseInt(h.replace('#', ''), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const x = p(a);
  const y = p(b);
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(',')})`;
};

const radii = (a: number, b: number, c: number, d: number) => `${a}px ${b}px ${c}px ${d}px`;
const insetRadii = (r: string, by: number) =>
  r
    .split(' ')
    .map((v) => (parseFloat(v) > 0 ? `${Math.max(0, parseFloat(v) - by)}px` : '0px'))
    .join(' ');

// Phone clock as one "HH:MM|Weekday, Month D" string, read through useSyncExternalStore so the
// prerendered HTML can carry a fixed placeholder (iOS's 9:41) and hydrate cleanly before the real
// time takes over.
const clockSnapshot = () => {
  const d = new Date();
  const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return `${hm}|${d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`;
};
const clockServerSnapshot = () => '9:41|';
const clockSubscribe = (onTick: () => void) => {
  const id = window.setInterval(onTick, 15000);
  return () => window.clearInterval(id);
};
const useNow = () => {
  const [time, date] = useSyncExternalStore(clockSubscribe, clockSnapshot, clockServerSnapshot).split('|');
  return { time, date };
};
const useClock = () => useNow().time;

// Whether the intro bulbs are lit. Kept outside React state so flipping it mid-fold re-renders only
// the bulbs, not the whole device and both copies of its screen.
type LitStore = { get: () => boolean; set: (v: boolean) => void; subscribe: (fn: () => void) => () => void };
const createLitStore = (): LitStore => {
  let on = false;
  const subs = new Set<() => void>();
  return {
    get: () => on,
    set: (v) => {
      if (v === on) return;
      on = v;
      subs.forEach((fn) => fn());
    },
    subscribe: (fn) => {
      subs.add(fn);
      return () => subs.delete(fn);
    },
  };
};
const LitContext = React.createContext<LitStore | null>(null);

export const WorksSection: React.FC<WorksSectionProps> = ({ projects, email }) => {
  const sectionRef = useRef<HTMLElement>(null);
  const contentMeasureRef = useRef<HTMLDivElement>(null);
  const nameLInner = useRef<HTMLDivElement>(null);
  const nameRInner = useRef<HTMLDivElement>(null);

  const el = {
    dev: useRef<HTMLDivElement>(null),
    leaf: useRef<HTMLDivElement>(null),
    cover: useRef<HTMLDivElement>(null),
    rightH: useRef<HTMLDivElement>(null),
    rBody: useRef<HTMLDivElement>(null),
    rGlass: useRef<HTMLDivElement>(null),
    rScreen: useRef<HTMLDivElement>(null),
    shR: useRef<HTMLDivElement>(null),
    shF: useRef<HTMLDivElement>(null),
    shB: useRef<HTMLDivElement>(null),
    cL: useRef<HTMLDivElement>(null),
    cR: useRef<HTMLDivElement>(null),
    shadow: useRef<HTMLDivElement>(null),
    shadowC: useRef<HTMLDivElement>(null),
    call: useRef<HTMLDivElement>(null),
    nmL: useRef<HTMLDivElement>(null),
    nmR: useRef<HTMLDivElement>(null),
  };

  const [vp, setVp] = useState({ w: 1200, h: 820 });
  const [contentH, setContentH] = useState(0);
  const [nameSize, setNameSize] = useState({ lw: 1, lh: 1, rw: 1, rh: 1 });
  const [finish, setFinish] = useState<FinishKey>('titanium');
  // Lights the intro bulb once the device is (nearly) open; resets when it folds shut so it replays.
  const [litStore] = useState(createLitStore);
  const litRef = useRef(false);
  const [chatSignal, setChatSignal] = useState(0);
  const time = useClock();

  // Viewport tracking; ignores small mobile URL-bar height changes to avoid jitter.
  useLayoutEffect(() => {
    const measure = () => {
      const w = sectionRef.current?.offsetWidth || window.innerWidth;
      const h = window.innerHeight;
      setVp((p) =>
        (p.w === w && Math.abs(p.h - h) < 110 && w < 900) || (p.w === w && p.h === h) ? p : { w, h },
      );
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const portrait = vp.w < LAYOUT.portraitBelow || vp.w / vp.h < 0.85;
  const G = portrait ? GEO.portrait : GEO.landscape;
  const E = G.f + G.bz;
  const D = G.W - 2 * E; // full open screen width
  const O = G.H - 2 * E; // full open screen height
  const halfW = portrait ? D : G.W / 2 - E;
  const halfH = portrait ? G.H / 2 - E : O;
  const landscape = !portrait;
  const R = G.R;
  const rLeaf = landscape ? radii(R, 0, 0, R) : radii(R, R, 0, 0);
  const rRight = landscape ? radii(0, R, R, 0) : radii(0, 0, R, R);
  const rAll = radii(R, R, R, R);

  const stageH = vp.h;
  const avail = Math.max(200, stageH - LAYOUT.top - LAYOUT.bottom - 40);
  const scale = Math.min((vp.w * (portrait ? 0.94 : 0.9)) / G.W, avail / G.H, LAYOUT.maxScale);
  const cy = Math.round(LAYOUT.top + avail / 2);
  const cx = Math.round(vp.w / 2);

  const innerMax = Math.max(0, contentH - O);
  const U1 = stageH * MOTION.openLength;
  const U2 = stageH * MOTION.closeLength;
  const U3 = stageH * MOTION.holdLength;
  const innerPx = innerMax * scale;
  const totalH = stageH + U1 + innerPx + U2 + U3;

  const fin = FINISHES[finish].c;
  const bodyBg = `linear-gradient(145deg, ${fin[2]} 0%, ${fin[0]} 30%, ${fin[1]} 55%, ${fin[0]} 75%, ${fin[3]} 100%)`;
  const bodyShadow =
    'inset 0 1px 1px rgba(255,255,255,.82), inset 0 -1px 1px rgba(0,0,0,.3), inset 0 0 0 1px rgba(255,255,255,.25)';
  const pageBg = mix(fin[0], '#FFFFFF', 0.8);

  // Measure scrollable screen content height.
  useLayoutEffect(() => {
    const node = contentMeasureRef.current;
    if (!node) return;
    const m = () => setContentH(node.offsetHeight);
    m();
    const ro = new ResizeObserver(m);
    ro.observe(node);
    return () => ro.disconnect();
  }, [portrait]);

  // Measure flanking names at their natural size.
  useLayoutEffect(() => {
    const m = () => {
      const l = nameLInner.current;
      const r = nameRInner.current;
      if (!l || !r) return;
      setNameSize({
        lw: Math.max(1, l.offsetWidth),
        lh: Math.max(1, l.offsetHeight),
        rw: Math.max(1, r.offsetWidth),
        rh: Math.max(1, r.offsetHeight),
      });
    };
    m();
    document.fonts?.ready.then(m);
  }, []);

  const params = useRef({
    portrait, G, scale, U1, U2, innerMax, innerPx, stageH, vw: vp.w, cy, nameSize, rRight, rAll,
  });
  params.current = {
    portrait, G, scale, U1, U2, innerMax, innerPx, stageH, vw: vp.w, cy, nameSize, rRight, rAll,
  };

  const styleCache = useRef(new WeakMap<HTMLElement, Record<string, string>>());
  const lastK = useRef(-1);
  const lastInner = useRef(-1);
  const cur = useRef(0);
  const kick = useRef<() => void>(() => {});

  const set = (node: HTMLElement | null, prop: string, val: string) => {
    if (!node) return;
    let c = styleCache.current.get(node);
    if (!c) styleCache.current.set(node, (c = {}));
    if (c[prop] === val) return;
    c[prop] = val;
    node.style.setProperty(prop, val);
  };

  // Core fold timeline: open → scroll the inner screen → close → hold.
  const apply = (e: number, now: number) => {
    const n = params.current;
    const { G: g, portrait: port } = n;
    const openT = n.U1 > 0 ? clamp(e / (n.U1 * 0.9), 0, 1) : 1;
    const inner = clamp((e - n.U1) / (n.scale || 1), 0, n.innerMax);
    const closeT = n.U2 > 0 ? clamp((e - n.U1 - n.innerPx - n.U2 * 0.08) / (n.U2 * 0.92), 0, 1) : 0;

    const c = easeInOutCubic(openT) * (1 - easeInOutCubic(closeT));
    const wantLit = litRef.current ? c > 0.3 : c > 0.85;
    if (wantLit !== litRef.current) {
      litRef.current = wantLit;
      litStore.set(wantLit);
    }
    const u = +(1 - c).toFixed(4);
    const d = 180 * u;
    const sinD = Math.sin((d * Math.PI) / 180);
    const bob = MOTION.float && u > 0 ? Math.sin(now / 1500) * 5 * u : 0;
    const changed = lastK.current !== u;

    if (changed || bob) {
      set(
        el.dev.current,
        'transform',
        u < 0.003
          ? 'none'
          : port
            ? `translate(0px, ${((-u * g.H) / 4 + bob).toFixed(2)}px)`
            : `translate(${((-u * g.W) / 4).toFixed(2)}px, ${bob.toFixed(2)}px)`,
      );
    }

    if (changed) {
      lastK.current = u;
      const leafUp = d < 90;
      // Faces swap with opacity, not visibility: a visibility:hidden layer loses its raster and has
      // to be redrawn from scratch (a visible hitch) every time it comes back mid-fold.
      set(el.leaf.current, 'opacity', leafUp ? '1' : '0');
      set(el.leaf.current, 'pointer-events', leafUp ? 'auto' : 'none');
      set(
        el.leaf.current,
        'transform',
        d < 0.2
          ? 'none'
          : `perspective(${PERSPECTIVE}px) ${port ? `rotateX(${(-d).toFixed(3)}deg)` : `rotateY(${d.toFixed(3)}deg)`}`,
      );
      set(el.cover.current, 'opacity', leafUp ? '0' : '1');
      set(el.cover.current, 'pointer-events', leafUp ? 'none' : 'auto');
      set(
        el.cover.current,
        'transform',
        d > 179.8
          ? 'none'
          : `perspective(${PERSPECTIVE}px) ${port ? `rotateX(${(180 - d).toFixed(3)}deg)` : `rotateY(${(d - 180).toFixed(3)}deg)`}`,
      );
      set(el.rightH.current, 'opacity', d > 176 ? '0' : '1');
      set(el.rightH.current, 'pointer-events', d > 176 ? 'none' : 'auto');

      const rr = leafUp ? n.rRight : n.rAll;
      set(el.rBody.current, 'border-radius', rr);
      set(el.rGlass.current, 'border-radius', insetRadii(rr, g.f));
      set(el.rScreen.current, 'border-radius', insetRadii(rr, g.f + g.bz));
      set(el.shR.current, 'border-radius', rr);

      const m = d / 90;
      set(el.shF.current, 'opacity', String(leafUp ? +(m ** 1.6 * 0.8).toFixed(3) : 0));
      set(el.shB.current, 'opacity', String(leafUp ? 0 : +((2 - m) ** 1.6 * 0.7).toFixed(3)));
      set(el.shR.current, 'opacity', String(+(sinD ** 1.8 * 0.5).toFixed(3)));

      const sx = port ? 1 : 0.5 + 0.5 * c;
      const st = `translateX(-50%) translateX(${(port ? 0 : (g.W / 4) * u).toFixed(1)}px) scaleX(${sx.toFixed(4)})`;
      set(el.shadow.current, 'transform', st);
      set(el.shadowC.current, 'transform', st);

      const callO = clamp((closeT - 0.02) * 6, 0, 1);
      set(el.call.current, 'opacity', String(+callO.toFixed(3)));
      set(el.call.current, 'pointer-events', callO > 0.5 ? 'auto' : 'none');

      // Flanking names glide outward as the device opens.
      const v = n.vw;
      const y = g.W * n.scale;
      const x = g.H * n.scale;
      const ns = n.nameSize;
      const L = el.nmL.current;
      const Rn = el.nmR.current;
      if (L && Rn) {
        if (port) {
          const i = x / 2;
          const a = (n.stageH - i) / 2;
          const sl = Math.min((v * 0.86) / ns.lw, (a * 0.62) / ns.lh);
          const sr = Math.min((v * 0.86) / ns.rw, (a * 0.62) / ns.rh);
          const sn = Math.min(sl, sr); // equal scale for both
          const off = i / 2 + a * 0.1;
          const sh = v * 0.8 * easeOutCubic(c);
          set(L, 'transform', `translate(calc(${(v / 2 - sh).toFixed(1)}px - 50%), calc(${n.cy - off}px - 100%)) scale(${sn.toFixed(4)})`);
          set(L, 'transform-origin', '50% 100%');
          set(Rn, 'transform', `translate(calc(${(v / 2 + sh).toFixed(1)}px - 50%), ${n.cy + off}px) scale(${sn.toFixed(4)})`);
          set(Rn, 'transform-origin', '50% 0%');
        } else {
          const i = y / 2;
          const a = (v - i) / 2;
          const o = i * 0.06;
          const sl = Math.min((a - v * 0.03 + o) / ns.lw, (n.stageH * 0.42) / ns.lh);
          const sr = Math.min((a - v * 0.03 + o) / ns.rw, (n.stageH * 0.42) / ns.rh);
          const sn = Math.min(sl, sr); // equal scale for both
          const dd = i / 2 - o + (v * 0.22 + y / 4) * easeOutCubic(c);
          set(L, 'transform', `translate(calc(${(v / 2 - dd).toFixed(1)}px - 100%), ${n.cy}px) translateY(-50%) scale(${sn.toFixed(4)})`);
          set(L, 'transform-origin', '100% 50%');
          set(Rn, 'transform', `translate(${(v / 2 + dd).toFixed(1)}px, ${n.cy}px) translateY(-50%) scale(${sn.toFixed(4)})`);
          set(Rn, 'transform-origin', '0% 50%');
        }
        // fade to 0 gradually as scroll opens the phone
        const no = String(+(1 - c).toFixed(3));
        set(L, 'opacity', no);
        set(Rn, 'opacity', no);
      }
    }

    // The call screen stays hidden until shortly before the fold closes (otherwise its infinite
    // "slide to unlock" shimmer keeps repainting unseen), then unhides while still transparent so
    // it's rasterized in the background rather than in the frame it first fades in.
    set(el.call.current, 'visibility', e > n.U1 + n.innerPx - n.stageH * 0.6 ? 'visible' : 'hidden');

    // Scroll the screen content with a compositor-only transform (no per-frame layout); the
    // static `top` offset for the second half lives in screenContent's style.
    if (lastInner.current !== inner || changed) {
      lastInner.current = inner;
      const t = `translate3d(0, ${(-inner).toFixed(2)}px, 0)`;
      set(el.cL.current, 'transform', t);
      set(el.cR.current, 'transform', t);
    }
  };

  // Smoothed rAF loop driven by scroll.
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    let running = false;
    let last = 0;
    let r = -1;
    let visible = true;

    const target = () => {
      const s = sectionRef.current;
      return s ? Math.max(0, -s.getBoundingClientRect().top) : 0;
    };
    const needsFloat = () => visible && MOTION.float && !reduced && lastK.current > 5e-4;

    const tick = (now: number) => {
      const s = target();
      const dt = last ? Math.min(64, now - last) : 16.7;
      last = now;
      // Lenis already eases the page scroll; easing again here would make the fold trail behind.
      if (r < 0 || reduced || isSmoothScrolling()) r = s;
      else r += (s - r) * (1 - (1 - clamp(MOTION.smoothing, 0.02, 1)) ** (dt / 16.67));
      if (Math.abs(s - r) < 0.1) r = s;
      cur.current = r;
      apply(r, now);
      if (r !== s || needsFloat()) raf = requestAnimationFrame(tick);
      else {
        running = false;
        last = 0;
      }
    };
    const start = () => {
      if (!running) {
        running = true;
        raf = requestAnimationFrame(tick);
      }
    };
    kick.current = start;

    const io = new IntersectionObserver((entries) => {
      visible = entries.some((x) => x.isIntersecting);
      if (visible) start();
    });
    if (sectionRef.current) io.observe(sectionRef.current);

    r = target();
    cur.current = r;
    apply(r, performance.now());
    start();
    window.addEventListener('scroll', start, { passive: true });
    window.addEventListener('resize', start);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener('scroll', start);
      window.removeEventListener('resize', start);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-apply after any layout change (resize, orientation flip, content measured, finish swap).
  useLayoutEffect(() => {
    styleCache.current = new WeakMap();
    lastK.current = -1;
    lastInner.current = -1;
    apply(cur.current, performance.now());
    kick.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portrait, vp.w, vp.h, scale, contentH, nameSize, finish]);

  // OPEN_PHONE_CHAT (e.g. "Let's talk"): glide to the closed phone's call screen, then open the chat.
  useEffect(() => {
    let raf = 0;
    let timer = 0;
    const onOpen = () => {
      const s = sectionRef.current;
      if (!s) return;
      const p = params.current;
      const top = s.getBoundingClientRect().top + window.scrollY;
      const target = Math.round(top + p.U1 + p.innerPx + p.U2 + p.stageH * MOTION.holdLength * 0.5);
      smoothScrollTo(target);
      const t0 = performance.now();
      const wait = () => {
        if (Math.abs(window.scrollY - target) < 3 || performance.now() - t0 > 3000) {
          timer = window.setTimeout(() => setChatSignal((n) => n + 1), 350);
        } else raf = requestAnimationFrame(wait);
      };
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(wait);
    };
    window.addEventListener(OPEN_PHONE_CHAT, onOpen);
    return () => {
      window.removeEventListener(OPEN_PHONE_CHAT, onOpen);
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, []);

  const scrollToOpen = (ev: React.MouseEvent) => {
    const t = ev.target as HTMLElement;
    if (t.closest('a,button')) return;
    const s = sectionRef.current;
    if (!s || lastK.current < 0.9) return;
    const top = s.getBoundingClientRect().top + window.scrollY;
    smoothScrollTo(top + U1 + 2);
  };

  const abs: React.CSSProperties = { position: 'absolute' };
  const fill: React.CSSProperties = { position: 'absolute', inset: 0 };

  // Hinge-side inset is 0 so both screens meet seamlessly at the fold.
  const insets = (v: number, edge: 'T' | 'B' | 'L' | 'R' | 'none'): React.CSSProperties => ({
    top: edge === 'T' ? 0 : v,
    bottom: edge === 'B' ? 0 : v,
    left: edge === 'L' ? 0 : v,
    right: edge === 'R' ? 0 : v,
  });
  const leafEdge = landscape ? 'R' : 'B';
  const rightEdge = landscape ? 'L' : 'T';
  const radiusTransition = 'border-radius .35s cubic-bezier(.2,.7,.2,1)';

  const statusBar = (side: 'left' | 'right' | 'all') => (
    <div
      style={{
        ...abs,
        left: 0,
        right: 0,
        top: 0,
        height: portrait ? 36 : 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: side === 'right' ? 'flex-end' : 'space-between',
        padding: portrait ? '0 22px' : '0 26px',
        font: '600 13px/1 Inter, system-ui, sans-serif',
        color: '#111',
        letterSpacing: '-.01em',
        background: `linear-gradient(${SCREEN_BG} 55%, rgba(251,250,248,0))`,
        pointerEvents: 'none',
        zIndex: 6,
      }}
    >
      {side !== 'right' && <span>{time}</span>}
      {side !== 'left' && (
        <span style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12 }}>
          <span>5G</span>
          <svg width="25" height="12" viewBox="0 0 25 12" aria-hidden="true" style={{ display: 'block', opacity: 0.95 }}>
            <rect x="0.75" y="0.75" width="21.5" height="10.5" rx="3.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <rect x="2.75" y="2.75" width="13.5" height="6.5" rx="1.5" fill="currentColor" />
            <rect x="23.25" y="4.25" width="1.5" height="3.5" rx="0.75" fill="currentColor" opacity="0.55" />
          </svg>
        </span>
      )}
    </div>
  );

  const crease = (side: 'left' | 'right' | 'top' | 'bottom') => {
    const grad = (dir: string) =>
      `linear-gradient(${dir}, rgba(0,0,0,0) 0%, rgba(0,0,0,.008) 35%, rgba(0,0,0,.016) 50%, rgba(0,0,0,.008) 65%, rgba(0,0,0,0) 100%)`;
    const base: React.CSSProperties = { ...abs, pointerEvents: 'none', zIndex: 7 };
    if (side === 'left' || side === 'right')
      return (
        <div style={{ ...base, top: 0, bottom: 0, width: 72, left: side === 'left' ? 'calc(100% - 36px)' : -36, background: grad('90deg') }} />
      );
    return (
      <div style={{ ...base, left: 0, right: 0, height: 72, top: side === 'top' ? 'calc(100% - 36px)' : -36, background: grad('180deg') }} />
    );
  };

  const glare = (half?: 'L' | 'R') => (
    <div
      style={{
        ...fill,
        pointerEvents: 'none',
        zIndex: 8,
        background: 'linear-gradient(118deg, rgba(255,255,255,.08) 0%, rgba(255,255,255,.025) 22%, rgba(255,255,255,0) 38%)',
        backgroundSize: half ? (portrait ? '100% 200%' : '200% 100%') : '100% 100%',
        backgroundPosition: half === 'R' ? (portrait ? '50% 100%' : '100% 50%') : '0 0',
      }}
    />
  );

  const sideButtons = (
    <>
      {[
        [0.17, 0.1],
        [0.31, 0.06],
      ].map(([t, h], i) => (
        <div
          key={i}
          style={{
            ...abs,
            right: -3,
            width: 5,
            borderRadius: 3,
            top: landscape ? `${t * 100}%` : `${(t * 0.8 + 0.05) * 100}%`,
            height: `${h * (landscape ? 100 : 160)}%`,
            background: `linear-gradient(90deg, ${fin[3]}, ${fin[2]} 45%, ${fin[1]})`,
            boxShadow: '0 0 0 .5px rgba(0,0,0,.2)',
          }}
        />
      ))}
    </>
  );

  const shade = (kind: 'front' | 'back' | 'right') => {
    const dir = landscape ? '90deg' : '180deg';
    if (kind === 'front') return `linear-gradient(${dir}, rgba(0,0,0,.05) 0%, rgba(0,0,0,.55) 100%)`;
    if (kind === 'back') return `linear-gradient(${dir}, rgba(0,0,0,.5) 0%, rgba(0,0,0,.05) 100%)`;
    return `linear-gradient(${dir}, rgba(0,0,0,.6) 0%, rgba(0,0,0,0) 70%)`;
  };

  const body = (
    radius: string,
    edge: 'T' | 'B' | 'L' | 'R' | 'none',
    screen: React.ReactNode,
    extra: React.ReactNode,
    refs?: [React.RefObject<HTMLDivElement | null>, React.RefObject<HTMLDivElement | null>, React.RefObject<HTMLDivElement | null>],
  ) => (
    <>
      <div ref={refs?.[0]} style={{ ...abs, ...insets(0, edge), borderRadius: radius, background: bodyBg, boxShadow: bodyShadow, transition: refs ? radiusTransition : undefined }} />
      <div ref={refs?.[1]} style={{ ...abs, ...insets(G.f, edge), borderRadius: insetRadii(radius, G.f), background: '#050505', transition: refs ? radiusTransition : undefined }} />
      <div
        ref={refs?.[2]}
        style={{ ...abs, ...insets(E, edge), borderRadius: insetRadii(radius, E), background: SCREEN_BG, overflow: 'hidden', contain: 'paint', transition: refs ? radiusTransition : undefined }}
      >
        {screen}
      </div>
      {extra}
    </>
  );

  const screenContent = (which: 'L' | 'R') => (
    <div
      ref={which === 'L' ? el.cL : el.cR}
      aria-hidden={which === 'L' || undefined}
      style={{ ...abs, left: landscape && which === 'R' ? -halfW : 0, top: portrait && which === 'R' ? -halfH : 0, width: D, willChange: 'transform' }}
    >
      <div ref={which === 'R' ? contentMeasureRef : undefined} style={{ width: D }}>
        <ScreenPage projects={projects} portrait={portrait} />
      </div>
    </div>
  );

  const leafStyle: React.CSSProperties = landscape
    ? { ...abs, left: 0, top: 0, width: G.W / 2, height: G.H, transformOrigin: '100% 50%' }
    : { ...abs, left: 0, top: 0, width: G.W, height: G.H / 2, transformOrigin: '50% 100%' };
  const rightStyle: React.CSSProperties = landscape
    ? { ...abs, left: G.W / 2, top: 0, width: G.W / 2, height: G.H, transformOrigin: '0% 50%' }
    : { ...abs, left: 0, top: G.H / 2, width: G.W, height: G.H / 2, transformOrigin: '50% 0%' };

  return (
    <LitContext.Provider value={litStore}>
    <section
      id="works"
      ref={sectionRef}
      className="relative w-full select-none"
      style={{ height: totalH, background: pageBg, transition: 'background .6s ease' }}
    >
      <div className="sticky top-0 w-full overflow-hidden" style={{ height: stageH }}>
        {/* Flanking names behind the device */}
        <div style={{ ...fill, pointerEvents: 'none', overflow: 'hidden' }}>
          <div ref={el.nmL} style={{ ...abs, left: 0, top: 0, willChange: 'transform, opacity' }}>
            <div ref={nameLInner} className="font-hero-title font-black text-[#111] leading-[0.85] tracking-[-0.06em] whitespace-nowrap" style={{ fontSize: 200, width: 'max-content' }}>
              PROJ
            </div>
          </div>
          <div ref={el.nmR} style={{ ...abs, left: 0, top: 0, willChange: 'transform, opacity' }}>
            <div ref={nameRInner} className="font-hero-title font-black text-[#111] leading-[0.85] tracking-[-0.06em] whitespace-nowrap" style={{ fontSize: 200, width: 'max-content' }}>
              ECTS
            </div>
          </div>
        </div>

        {/* Device rig */}
        <div style={{ ...abs, left: cx, top: cy, width: 0, height: 0, zIndex: 3 }}>
          <div style={{ ...abs, left: 0, top: 0, transform: `scale(${scale})` }}>
            <div ref={el.dev} style={{ ...abs, left: -G.W / 2, top: -G.H / 2, width: G.W, height: G.H, willChange: 'transform' }}>
              {/* Ground shadows */}
              <div
                ref={el.shadow}
                style={{
                  ...abs, left: '50%', top: '100%', marginTop: G.H * 0.045, height: G.H * 0.09, width: G.W * 1.05, borderRadius: '50%',
                  background: 'radial-gradient(closest-side, rgba(0,0,0,.16), rgba(0,0,0,.06) 50%, rgba(0,0,0,0))',
                  transform: 'translateX(-50%)', pointerEvents: 'none', willChange: 'transform',
                }}
              />
              <div
                ref={el.shadowC}
                style={{
                  ...abs, left: '50%', top: '100%', marginTop: G.H * 0.012, height: G.H * 0.03, width: G.W * 0.86, borderRadius: '50%',
                  background: 'radial-gradient(closest-side, rgba(0,0,0,.22), rgba(0,0,0,.07) 55%, rgba(0,0,0,0))',
                  transform: 'translateX(-50%)', pointerEvents: 'none', willChange: 'transform',
                }}
              />

              {/* Static half (right / bottom) */}
              <div ref={el.rightH} style={{ ...rightStyle, willChange: 'opacity' }}>
                {body(
                  rRight,
                  rightEdge,
                  <>
                    {screenContent('R')}
                    {landscape && statusBar('right')}
                    {crease(landscape ? 'right' : 'bottom')}
                    {glare('R')}
                  </>,
                  <>
                    {sideButtons}
                    <div ref={el.shR} style={{ ...fill, borderRadius: rRight, background: shade('right'), opacity: 0, pointerEvents: 'none', zIndex: 9, transition: radiusTransition, willChange: 'opacity' }} />
                  </>,
                  [el.rBody, el.rGlass, el.rScreen],
                )}
              </div>

              {/* Folding leaf — inner face */}
              <div ref={el.leaf} style={{ ...leafStyle, willChange: 'transform, opacity' }}>
                {body(
                  rLeaf,
                  leafEdge,
                  <>
                    {screenContent('L')}
                    {statusBar(landscape ? 'left' : 'all')}
                    {crease(landscape ? 'left' : 'top')}
                    {glare('L')}
                  </>,
                  <div ref={el.shF} style={{ ...fill, borderRadius: rLeaf, background: shade('front'), opacity: 0, pointerEvents: 'none', zIndex: 9, willChange: 'opacity' }} />,
                )}
              </div>

              {/* Folding leaf — outer cover face */}
              <div ref={el.cover} style={{ ...rightStyle, opacity: 0, willChange: 'transform, opacity' }}>
                <div style={{ ...fill, borderRadius: rAll, background: bodyBg, boxShadow: bodyShadow }} />
                <div style={{ ...abs, inset: G.f, borderRadius: R - G.f, background: '#050505' }} />
                <div style={{ ...abs, inset: E, borderRadius: R - E, background: SCREEN_BG, overflow: 'hidden', contain: 'paint' }}>
                  <div style={{ ...fill, cursor: 'pointer', isolation: 'isolate' }} onClick={scrollToOpen}>
                    <LockScreen time={time} portrait={portrait} />
                  </div>
                  <div ref={el.call} style={{ ...fill, opacity: 0, visibility: 'hidden', zIndex: 4, isolation: 'isolate', willChange: 'opacity' }}>
                    <CallScreen email={email} portrait={portrait} time={time} openSignal={chatSignal} />
                  </div>
                  {glare()}
                </div>
                {sideButtons}
                <div ref={el.shB} style={{ ...fill, borderRadius: rAll, background: shade('back'), opacity: 0, pointerEvents: 'none', zIndex: 9, willChange: 'opacity' }} />
              </div>

            </div>
          </div>
        </div>

        {/* Finish switcher */}
        <div className="absolute left-0 right-0 z-20 flex justify-center" style={{ bottom: 18 }}>
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-full bg-white/70 backdrop-blur-md border border-black/5 shadow-sm">
            {(Object.keys(FINISHES) as FinishKey[]).map((k) => (
              <button
                key={k}
                type="button"
                title={FINISHES[k].label}
                aria-label={`${FINISHES[k].label} finish`}
                onClick={() => setFinish(k)}
                className="w-4 h-4 rounded-full cursor-pointer"
                style={{
                  background: `linear-gradient(145deg, ${FINISHES[k].c[2]}, ${FINISHES[k].c[0]} 50%, ${FINISHES[k].c[1]})`,
                  boxShadow: finish === k ? '0 0 0 2px #fff, 0 0 0 3.5px #111' : 'inset 0 0 0 1px rgba(0,0,0,.15)',
                  transition: 'box-shadow .3s',
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
    </LitContext.Provider>
  );
};

// Realistic light bulb beside the intro headline. Fades in, then flickers on when `on` flips true
// (see .idea-bulb in index.css).
const noopSubscribe = () => () => {};
const alwaysOff = () => false;

const IdeaBulb: React.FC<{ height: number }> = ({ height }) => {
  const store = React.useContext(LitContext);
  // The bulb is unlit in the prerendered HTML.
  const on = useSyncExternalStore(store?.subscribe ?? noopSubscribe, store?.get ?? alwaysOff, alwaysOff);
  const u = React.useId().replace(/:/g, '');
  const globe = 'M41 121C41 106 18 95 18 63a42 42 0 0 1 84 0c0 32-23 43-23 58z';
  const rays: [number, number, number, number][] = [
    [60, 4, 60, -10],
    [26, 14, 17, 3],
    [94, 14, 103, 3],
    [8, 44, -6, 39],
    [112, 44, 126, 39],
    [10, 80, -3, 87],
    [110, 80, 123, 87],
  ];
  return (
    <span className={`idea-bulb shrink-0 ${on ? 'is-on' : ''}`} aria-hidden="true" style={{ height, width: (height * 136) / 184 }}>
      <svg viewBox="-8 -14 136 184" width="100%" height="100%" overflow="visible">
        <defs>
          <radialGradient id={`${u}g`} cx="50%" cy="38%" r="60%">
            <stop offset="0" stopColor="#ffffff" stopOpacity=".95" />
            <stop offset=".55" stopColor="#f1f0ee" stopOpacity=".55" />
            <stop offset="1" stopColor="#c9c7c2" stopOpacity=".55" />
          </radialGradient>
          <radialGradient id={`${u}l`} cx="50%" cy="45%" r="62%">
            <stop offset="0" stopColor="#fffdf3" />
            <stop offset=".35" stopColor="#ffe9a8" />
            <stop offset=".8" stopColor="#ffc95a" />
            <stop offset="1" stopColor="#f2a93b" />
          </radialGradient>
          <radialGradient id={`${u}h`} cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#ffd77a" stopOpacity=".75" />
            <stop offset=".45" stopColor="#ffd77a" stopOpacity=".22" />
            <stop offset="1" stopColor="#ffd77a" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`${u}m`} x1="0" x2="1">
            <stop offset="0" stopColor="#6d6d70" />
            <stop offset=".3" stopColor="#d9d9dc" />
            <stop offset=".55" stopColor="#f7f7f8" />
            <stop offset="1" stopColor="#5a5a5d" />
          </linearGradient>
          <linearGradient id={`${u}r`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffb547" stopOpacity="0" />
            <stop offset="1" stopColor="#ffb547" />
          </linearGradient>
          <filter id={`${u}f`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.6" />
          </filter>
        </defs>

        {/* halo */}
        <circle className="glow" cx="60" cy="62" r="74" fill={`url(#${u}h)`} />

        {/* rays */}
        {rays.map(([x1, y1, x2, y2], i) => (
          <line
            key={i}
            className="ray"
            style={{ '--i': i } as React.CSSProperties}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#f2a93b"
            strokeWidth="4.5"
            strokeLinecap="round"
          />
        ))}

        {/* glass: unlit, then the warm lit layer on top */}
        <path d={globe} fill={`url(#${u}g)`} stroke="rgba(17,17,17,.28)" strokeWidth="1.6" />
        <path className="lit" d={globe} fill={`url(#${u}l)`} stroke="rgba(214,140,30,.55)" strokeWidth="1.6" />

        {/* stem + filament */}
        <path d="M52 121V96l-4-22M68 121V96l4-22" fill="none" stroke="#8c8a86" strokeWidth="1.6" strokeLinecap="round" />
        <path
          d="M48 74q3-7 6 0t6 0 6 0 6 0"
          fill="none"
          stroke="#5c5a57"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <g className="lit">
          <path d="M48 74q3-7 6 0t6 0 6 0 6 0" fill="none" stroke="#fff3c4" strokeWidth="5" strokeLinecap="round" filter={`url(#${u}f)`} />
          <path d="M48 74q3-7 6 0t6 0 6 0 6 0" fill="none" stroke="#ff9f1a" strokeWidth="2" strokeLinecap="round" />
        </g>

        {/* specular highlights */}
        <path d="M33 44c4-12 13-20 24-23" fill="none" stroke="#fff" strokeOpacity=".9" strokeWidth="5" strokeLinecap="round" />
        <circle cx="30" cy="57" r="2.6" fill="#fff" fillOpacity=".85" />

        {/* collar + screw base */}
        <rect x="39" y="119" width="42" height="9" rx="3" fill={`url(#${u}m)`} stroke="rgba(0,0,0,.35)" strokeWidth=".8" />
        {[130, 138, 146].map((y) => (
          <g key={y}>
            <rect x="40" y={y - 2} width="40" height="8" rx="4" fill={`url(#${u}m)`} stroke="rgba(0,0,0,.35)" strokeWidth=".8" />
            <path d={`M41 ${y + 5}h38`} stroke="rgba(0,0,0,.28)" strokeWidth="1" />
          </g>
        ))}
        <path d="M46 152h28l-4 9a5 5 0 0 1-4.6 3h-10.8a5 5 0 0 1-4.6-3z" fill="#1a1a1b" />
      </svg>
    </span>
  );
};

// Soft-blur slideshow through a project's screenshots, with small progress dots.
// Keep the screenshots the same aspect ratio so every slide is framed alike in the card.
const SLIDE_MS = 2000;
// The slide is derived from one shared page clock, so the two copies of the screen (one per fold
// half) always show the same slide even though each pauses on its own while off screen.
const SLIDE_T0 = performance.now();
const slideAt = (len: number) => Math.floor((performance.now() - SLIDE_T0) / SLIDE_MS) % len;

const Crossfade: React.FC<{ images: string[]; alt: string; sites?: SampleSite[] }> = ({ images, alt, sites }) => {
  const len = images.length;
  // Starts on the first slide (matching the prerendered HTML) and joins the shared clock on screen.
  const [{ i, prev }, setSlide] = useState({ i: 0, prev: -1 });
  const [zoom, setZoom] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);

  // Ticks only while the card is on screen and the tab is visible; keeps running while the lightbox is open.
  useEffect(() => {
    const node = ref.current;
    if (len < 2 || !node) return;
    let timer = 0;
    let onScreen = false;
    const sync = () => setSlide((o) => {
      const n = slideAt(len);
      return n === o.i ? o : { i: n, prev: o.i };
    });
    const schedule = () => {
      clearTimeout(timer);
      if (!onScreen || document.hidden) return;
      sync();
      timer = window.setTimeout(schedule, SLIDE_MS - ((performance.now() - SLIDE_T0) % SLIDE_MS) + 5);
    };
    const io = new IntersectionObserver(([e]) => {
      onScreen = e.isIntersecting;
      schedule();
    });
    io.observe(node);
    document.addEventListener('visibilitychange', schedule);
    return () => {
      clearTimeout(timer);
      io.disconnect();
      document.removeEventListener('visibilitychange', schedule);
    };
  }, [len]);

  return (
    <button
      ref={ref}
      type="button"
      onClick={() => setZoom(true)}
      aria-label={sites ? `View ${alt}: ${sites.map((s) => s.name).join(', ')}` : `View ${alt} full size`}
      className={`group relative block w-full h-full ${sites ? 'cursor-pointer' : 'cursor-zoom-in'}`}
    >
      {images.map((src, n) => {
        const on = n === i;
        return (
          <img
            key={src}
            src={src}
            alt={on ? alt : ''}
            draggable={false}
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              // Slightly above center keeps the device mockups framed in the 4:3 card.
              objectPosition: '50% 45%',
              opacity: on ? 1 : 0,
              filter: on ? 'blur(0px)' : 'blur(10px)',
              transform: on ? 'scale(1)' : 'scale(1.04)',
              // Only the incoming and outgoing slides are painted; the rest sit fully faded out.
              visibility: on || n === prev ? 'visible' : 'hidden',
              transition: `opacity .9s ${EASE}, filter .9s ${EASE}, transform 1.6s ${EASE}`,
            }}
          />
        );
      })}
      {images.length > 1 && (
        <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
          {images.map((src, n) => (
            <span
              key={src}
              className="h-1.5 rounded-full bg-black"
              style={{ width: n === i ? 16 : 6, opacity: n === i ? 0.7 : 0.2, transition: `width .5s ${EASE}, opacity .5s ${EASE}` }}
            />
          ))}
        </div>
      )}
      {sites && (
        <span className="pointer-events-none absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-white/90 backdrop-blur px-3 py-1.5 text-[11px] font-bold uppercase tracking-[-0.02em] text-[#111] shadow-[0_4px_14px_-6px_rgba(0,0,0,.3)] transition-colors duration-300 group-hover:bg-[#111] group-hover:text-white">
          View {sites.length} sites
          <Arrow dir={1} className="w-3.5 h-3.5" />
        </span>
      )}
      {zoom &&
        (sites ? (
          <SiteViewer title={alt} sites={sites} start={i} onClose={() => setZoom(false)} />
        ) : (
          <Lightbox images={images} alt={alt} start={i} onClose={() => setZoom(false)} />
        ))}
    </button>
  );
};

const hostOf = (url: string) => new URL(url).hostname.replace(/^www\./, '');

// Shared behaviour for the full-screen viewers: fade in on mount, lock the page scroll, Esc and
// arrow keys, and hand focus back to whatever opened the viewer once it closes.
const useViewer = (onClose: () => void, step: (d: number) => void) => {
  const [shown, setShown] = useState(false);
  const close = () => {
    setShown(false);
    window.setTimeout(onClose, 450);
  };

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const raf = requestAnimationFrame(() => setShown(true));
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    lockScroll(true);
    return () => {
      cancelAnimationFrame(raf);
      document.body.style.overflow = prev;
      lockScroll(false);
      opener?.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') step(1);
      else if (e.key === 'ArrowLeft') step(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return { shown, close };
};

// Horizontal swipe on touch screens steps through the images; returns true from `swiped()` right
// after one so the click that ends the swipe can be ignored.
const useSwipe = (step: (d: number) => void) => {
  const x = useRef<number | null>(null);
  const moved = useRef(false);
  return {
    swiped: () => {
      const m = moved.current;
      moved.current = false;
      return m;
    },
    handlers: {
      onPointerDown: (e: React.PointerEvent) => (x.current = e.clientX),
      onPointerUp: (e: React.PointerEvent) => {
        if (x.current === null) return;
        const dx = e.clientX - x.current;
        x.current = null;
        moved.current = Math.abs(dx) > 50;
        if (moved.current) step(dx < 0 ? 1 : -1);
      },
    },
  };
};

// Full-screen viewer for a project's screenshots. Portaled to <body> so the phone's 3D transforms
// don't trap it; Esc / backdrop closes, arrow keys or swipes step through.
const Lightbox: React.FC<{
  images: string[];
  alt: string;
  start: number;
  onClose: () => void;
}> = ({ images, alt, start, onClose }) => {
  const [index, setIndex] = useState(start);
  const many = images.length > 1;
  const step = (d: number) => {
    if (many) setIndex((n) => (n + d + images.length) % images.length);
  };
  const { shown, close } = useViewer(onClose, step);
  const swipe = useSwipe(step);

  const ui = 'text-[12px] md:text-[13px] font-bold tracking-[-0.04em] uppercase text-white/70 hover:text-white transition-colors cursor-pointer select-none';

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      // Stop clicks reaching the card button that rendered us (React events bubble through portals).
      onClick={(e) => {
        e.stopPropagation();
        if (!swipe.swiped() && e.target === e.currentTarget) close();
      }}
      {...swipe.handlers}
      className="fixed inset-0 z-[200] flex flex-col bg-black/85 backdrop-blur-md cursor-zoom-out"
      style={{ opacity: shown ? 1 : 0, transition: `opacity .45s ${EASE}` }}
    >
      <div className="flex items-center justify-between px-5 sm:px-8 md:px-10 py-4 sm:py-5 cursor-default">
        <span className="text-[11px] font-mono tracking-tight text-white/50 uppercase">
          {String(index + 1).padStart(2, '0')} / {String(images.length).padStart(2, '0')}
        </span>
        <button type="button" onClick={close} className={ui} aria-label="Close image viewer">
          Close
        </button>
      </div>

      <div className="relative flex-1 min-h-0 pointer-events-none">
        {images.map((src, n) => {
          const on = n === index;
          return (
            <img
              key={src}
              src={src}
              alt={on ? alt : ''}
              draggable={false}
              className="absolute inset-0 m-auto max-w-[calc(100%-40px)] md:max-w-[calc(100%-160px)] max-h-full w-auto h-auto rounded-[18px] object-contain"
              style={{
                opacity: on && shown ? 1 : 0,
                filter: on && shown ? 'blur(0px)' : 'blur(12px)',
                transform: on && shown ? 'scale(1)' : 'scale(.96)',
                transition: `opacity .6s ${EASE}, filter .6s ${EASE}, transform .8s ${EASE}`,
              }}
            />
          );
        })}
      </div>

      <div className="flex items-center justify-between px-5 sm:px-8 md:px-10 py-5 sm:py-6 cursor-default">
        {many ? (
          <button type="button" onClick={() => step(-1)} className={ui} aria-label="Previous image">
            ← Prev
          </button>
        ) : (
          <span />
        )}
        <span className="text-[11px] font-mono tracking-tight text-white/50 uppercase truncate px-4">{alt}</span>
        {many ? (
          <button type="button" onClick={() => step(1)} className={ui} aria-label="Next image">
            Next →
          </button>
        ) : (
          <span />
        )}
      </div>
    </div>,
    document.body,
  );
};

const Arrow: React.FC<{ dir: 1 | -1; className?: string }> = ({ dir, className }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {dir === 1 ? <path d="M5 12h14M13 6l6 6-6 6" /> : <path d="M19 12H5M11 6l-6 6 6 6" />}
  </svg>
);

// Case-study style viewer for the sample websites: a large image stage with thumbnails, the
// site's intro beside it, and tabs to jump between sites. Arrows step through every screenshot
// in order, crossing from one site into the next.
const SiteViewer: React.FC<{ title: string; sites: SampleSite[]; start: number; onClose: () => void }> = ({ title, sites, start, onClose }) => {
  const shots = sites.flatMap((s, si) => s.images.map((src, k) => ({ src, si, k })));
  const [index, setIndex] = useState(start);
  const step = (d: number) => setIndex((n) => (n + d + shots.length) % shots.length);
  const { shown, close } = useViewer(onClose, step);
  const swipe = useSwipe(step);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const { si, k } = shots[index];
  const site = sites[si];
  const firstOf = (n: number) => shots.findIndex((s) => s.si === n);

  useEffect(() => closeBtn.current?.focus({ preventScroll: true }), []);

  const enter = (delay: number): React.CSSProperties => ({
    opacity: shown ? 1 : 0,
    transform: shown ? 'none' : 'translateY(18px)',
    transition: `opacity .7s ${EASE} ${delay}ms, transform .9s ${EASE} ${delay}ms`,
  });
  const navBtn =
    'absolute top-1/2 -translate-y-1/2 grid place-items-center w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/90 backdrop-blur text-[#111] shadow-[0_8px_24px_-8px_rgba(0,0,0,.35)] transition-transform duration-300 hover:scale-105 active:scale-95 cursor-pointer';

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      // Stop clicks reaching the card button that rendered us (React events bubble through portals).
      onClick={(e) => e.stopPropagation()}
      className="fixed inset-0 z-[200] flex flex-col bg-[#FAFAF8] text-[#111]"
      style={{ opacity: shown ? 1 : 0, transition: `opacity .45s ${EASE}` }}
    >
      {/* Header */}
      <header className="shrink-0 flex items-center justify-between gap-4 px-5 sm:px-8 lg:px-12 h-16 lg:h-20" style={enter(0)}>
        <p className="flex items-center gap-3 font-body-bold text-[12px] md:text-[13px]">
          <span>({title})</span>
          <span className="text-black/35 tabular-nums">
            {String(si + 1).padStart(2, '0')} / {String(sites.length).padStart(2, '0')}
          </span>
        </p>
        <button
          ref={closeBtn}
          type="button"
          onClick={close}
          aria-label="Close"
          className="group flex items-center gap-3 font-body-bold text-[12px] cursor-pointer focus-visible:outline-none"
        >
          <span className="hidden sm:inline text-black/40 group-hover:text-black transition-colors">Close</span>
          <span className="grid place-items-center w-11 h-11 rounded-full bg-[#111] text-white transition-transform duration-500 group-hover:rotate-90 group-focus-visible:ring-2 group-focus-visible:ring-black group-focus-visible:ring-offset-2">
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </span>
        </button>
      </header>

      {/* Body: scrolls as one column on small screens, two fixed columns on large ones */}
      <div data-lenis-prevent className="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden overscroll-contain">
        <div className="lg:h-full grid lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_420px] gap-6 lg:gap-12 px-5 sm:px-8 lg:px-12 pb-6 lg:pb-8">
          {/* Image stage */}
          <div className="lg:h-full min-h-0 flex flex-col gap-3" style={enter(80)}>
            <div
              {...swipe.handlers}
              className="relative aspect-[4/3] lg:aspect-auto lg:flex-1 lg:min-h-0 rounded-[22px] lg:rounded-[32px] overflow-hidden bg-[#ECEAE6] select-none touch-pan-y"
            >
              {/* A blurred copy of each shot fills the space the screenshot itself doesn't */}
              {shots.map((s, n) => (
                <img
                  key={`bg-${s.src}`}
                  src={s.src}
                  alt=""
                  aria-hidden
                  draggable={false}
                  className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl"
                  style={{ opacity: n === index ? 0.55 : 0, transition: `opacity .8s ${EASE}` }}
                />
              ))}
              {shots.map((s, n) => {
                const on = n === index;
                return (
                  <img
                    key={s.src}
                    src={s.src}
                    alt={on ? `${site.name} — ${site.kind}` : ''}
                    draggable={false}
                    className="absolute inset-0 w-full h-full object-contain"
                    style={{
                      opacity: on ? 1 : 0,
                      filter: on ? 'blur(0px)' : 'blur(8px)',
                      transform: on ? 'scale(1)' : 'scale(1.03)',
                      transition: `opacity .7s ${EASE}, filter .7s ${EASE}, transform 1.1s ${EASE}`,
                    }}
                  />
                );
              })}
              <button type="button" onClick={() => step(-1)} aria-label="Previous screenshot" className={`${navBtn} left-3 md:left-5`}>
                <Arrow dir={-1} className="w-4 h-4 md:w-5 md:h-5" />
              </button>
              <button type="button" onClick={() => step(1)} aria-label="Next screenshot" className={`${navBtn} right-3 md:right-5`}>
                <Arrow dir={1} className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            </div>

            {/* This site's screenshots */}
            {site.images.length > 1 && (
              <div className="shrink-0 flex items-center gap-2">
                {site.images.map((src, n) => (
                  <button
                    key={src}
                    type="button"
                    onClick={() => setIndex(firstOf(si) + n)}
                    aria-label={`Screenshot ${n + 1} of ${site.name}`}
                    aria-current={n === k}
                    className={`relative w-16 h-12 md:w-[76px] md:h-14 rounded-[12px] overflow-hidden cursor-pointer transition-all duration-300 ${n === k ? 'ring-2 ring-[#111] ring-offset-2 ring-offset-[#FAFAF8]' : 'opacity-50 hover:opacity-100'}`}
                  >
                    <img src={src} alt="" draggable={false} className="w-full h-full object-cover" />
                  </button>
                ))}
                <span className="ml-2 font-body-bold text-[11px] text-black/35 tabular-nums">
                  {k + 1} / {site.images.length}
                </span>
              </div>
            )}
          </div>

          {/* Site intro */}
          <aside data-lenis-prevent className="lg:h-full lg:overflow-y-auto overscroll-contain flex flex-col" style={enter(160)}>
            {/* Keyed by site so the copy fades in afresh when moving to another site. */}
            <div key={site.name} className="animate-fade-in-up flex flex-col lg:pt-2">
              <p className="font-body-bold text-[12px] text-black/40">{site.kind}</p>
              <h2 className="font-black tracking-[-0.06em] leading-[0.9] mt-3 text-[40px] sm:text-[48px] xl:text-[60px]">{site.name}</h2>
              <p className="text-[15px] md:text-[16px] leading-[1.65] text-black/60 mt-5">{site.intro}</p>

              <ul className="order-1 mt-7 border-t border-black/10">
                {site.features.map((f, n) => (
                  <li key={f} className="flex items-center gap-4 py-3.5 border-b border-black/10 text-[14px] font-medium text-black/80">
                    <span className="font-mono text-[11px] text-black/30 tabular-nums">{String(n + 1).padStart(2, '0')}</span>
                    {f}
                  </li>
                ))}
              </ul>

              {site.url ? (
                <a
                  href={site.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group lg:order-2 mt-7 lg:mt-8 flex items-center justify-between gap-4 rounded-full bg-[#111] text-white pl-6 pr-2 py-2 transition-colors hover:bg-black"
                >
                  <span className="flex flex-col min-w-0 py-1">
                    <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/50">Visit website</span>
                    <span className="text-[15px] font-bold tracking-[-0.02em] truncate">{hostOf(site.url)}</span>
                  </span>
                  <span aria-hidden className="grid place-items-center w-11 h-11 shrink-0 rounded-full bg-white text-[#111] transition-transform duration-500 group-hover:-rotate-45">
                    <Arrow dir={1} className="w-[18px] h-[18px]" />
                  </span>
                </a>
              ) : (
                <p className="lg:order-2 mt-7 lg:mt-8 flex items-center gap-3 rounded-full border border-black/10 px-6 py-4 text-[13px] font-medium text-black/50">
                  <span className="w-2 h-2 rounded-full bg-black/25" />
                  {site.note ?? 'Private build · demo available on request'}
                </p>
              )}
            </div>

            <p className="hidden lg:block mt-auto pt-8 font-body-bold text-[11px] text-black/30">← → to browse · Esc to close</p>
          </aside>
        </div>
      </div>

      {/* Site tabs */}
      <nav
        aria-label={title}
        data-lenis-prevent
        className="shrink-0 border-t border-black/10 px-5 sm:px-8 lg:px-12 py-3 lg:py-4 overflow-x-auto overscroll-contain"
        style={enter(240)}
      >
        <div className="flex gap-2 lg:grid lg:grid-cols-4 lg:gap-3">
          {sites.map((s, n) => {
            const on = n === si;
            return (
              <button
                key={s.name}
                type="button"
                onClick={() => setIndex(firstOf(n))}
                aria-current={on}
                className={`flex items-center gap-3 shrink-0 rounded-[16px] p-2 pr-4 text-left cursor-pointer transition-all duration-300 ${on ? 'bg-white shadow-[0_6px_20px_-10px_rgba(0,0,0,.3)] ring-1 ring-black/10' : 'opacity-60 hover:opacity-100 hover:bg-black/[0.03]'}`}
              >
                <img src={s.images[0]} alt="" draggable={false} className="w-14 h-10 lg:w-16 lg:h-12 rounded-[10px] object-cover shrink-0" />
                <span className="min-w-0">
                  <span className="block text-[13px] font-bold tracking-[-0.02em] truncate">{s.name}</span>
                  <span className="block text-[11px] text-black/45 truncate">{s.kind}</span>
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>,
    document.body,
  );
};

// "Behind the posts" card: real Meta Business Suite screenshots laid out like windows on a desk.
// The second item sits behind as a browser window, the first floats in front on the right and the
// third is a small card on the left. Opens the same viewer as the sample websites.
const SocialShowcase: React.FC<{ items: SampleSite[]; title: string }> = ({ items, title }) => {
  const [open, setOpen] = useState(false);
  const [front, back, small] = items.map((it) => it.images[0]);
  const card = 'absolute overflow-hidden rounded-[10px] bg-white ring-1 ring-black/[0.06] transition-transform duration-700';

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label={`View ${title}: ${items.map((it) => it.name).join(', ')}`}
      className="group relative block w-full h-full overflow-hidden cursor-pointer bg-[#EDEFF3]"
      style={{ transitionTimingFunction: EASE }}
    >
      {/* Soft light behind the windows */}
      <span aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(circle at 70% 30%, #fff 0%, transparent 60%)' }} />

      {back && (
        <div className={`${card} left-[5%] top-[17%] w-[78%] h-[54%] shadow-[0_16px_36px_-18px_rgba(0,0,0,.4)] group-hover:-translate-y-1`}>
          <div className="flex items-center gap-[3px] h-[13%] px-[2.5%] bg-[#F6F7F9] border-b border-black/[0.06]">
            {['#FF5F57', '#FEBC2E', '#28C840'].map((c) => (
              <span key={c} className="w-[5px] h-[5px] rounded-full" style={{ background: c }} />
            ))}
            <span className="ml-[3%] text-[7px] font-semibold text-black/40 truncate">Meta Business Suite · Planner</span>
          </div>
          <img src={back} alt="" draggable={false} decoding="async" className="w-full h-[87%] object-cover object-left-top" />
        </div>
      )}
      {small && (
        <div className={`${card} left-[9%] bottom-[6%] w-[36%] h-[27%] shadow-[0_18px_36px_-16px_rgba(0,0,0,.45)] group-hover:-translate-y-1.5`}>
          <img src={small} alt="" draggable={false} decoding="async" className="w-full h-full object-contain" />
        </div>
      )}
      {front && (
        <div className={`${card} right-[5%] top-[31%] w-[41%] h-[62%] shadow-[0_24px_48px_-18px_rgba(0,0,0,.5)] group-hover:-translate-y-2`}>
          <img src={front} alt="" draggable={false} decoding="async" className="w-full h-full object-cover object-left-top" />
          {items[0].stat && (
            <span className="absolute left-[6%] bottom-[5%] rounded-full bg-[#111] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[-0.01em] text-white shadow-[0_6px_16px_-6px_rgba(0,0,0,.5)]">
              {items[0].stat}
            </span>
          )}
        </div>
      )}

      <span className="pointer-events-none absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-white/90 backdrop-blur px-3 py-1.5 text-[11px] font-bold uppercase tracking-[-0.02em] text-[#111] shadow-[0_4px_14px_-6px_rgba(0,0,0,.3)] transition-colors duration-300 group-hover:bg-[#111] group-hover:text-white">
        See the real work
        <Arrow dir={1} className="w-3.5 h-3.5" />
      </span>
      {open && <SiteViewer title={title} sites={items} start={0} onClose={() => setOpen(false)} />}
    </button>
  );
};

// iOS Messages app icon.
const MessagesIcon: React.FC<{ size: number }> = ({ size }) => {
  const id = React.useId();
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="shrink-0 block">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#67F27F" />
          <stop offset="1" stopColor="#0BBA2B" />
        </linearGradient>
      </defs>
      <rect width="24" height="24" rx="5.4" fill={`url(#${id})`} />
      <ellipse cx="12" cy="11.2" rx="7.4" ry="6.1" fill="#fff" />
      <path d="M7.4 14.9c-.2 1.6-1 2.7-2.3 3.4 2.2.3 3.9-.4 5-1.6z" fill="#fff" />
    </svg>
  );
};

const LOCK_MESSAGES = [
  {
    from: 'Someone messaged you',
    text: "Hi Gene! We need a website that actually brings in customers. Can you build it?",
    when: 'now',
  },
  {
    from: 'New project request',
    text: 'Saw your portfolio. Can you set up our CRM and automate our workflow?',
    when: '3m ago',
  },
];

const WALLPAPER = '/images/puss.jpg';
// The wallpaper with the glass blur/saturation pre-applied (blur(24px) at each layout's lock-screen size).
const WALLPAPER_FROST = { landscape: '/images/puss-frost.jpg', portrait: '/images/puss-frost-portrait.jpg' };
const LOCK_SHADE = 'linear-gradient(180deg, rgba(5,10,25,.35) 0%, rgba(5,10,25,0) 30%, rgba(5,10,25,0) 62%, rgba(5,10,25,.4) 100%)';

// Stand-in for `backdrop-filter: blur(24px) saturate(180%)` over the lock-screen wallpaper: the
// pre-blurred wallpaper, lined up with where this glass sits. A live backdrop filter is recomputed
// on every frame the phone folds or floats; this is just an image.
const Frosted: React.FC<{ portrait: boolean; radius: string; children: React.ReactNode }> = ({
  portrait,
  radius,
  children,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  useLayoutEffect(() => {
    const node = ref.current;
    // Looked up rather than passed as a ref: an ancestor's ref isn't attached yet when this runs.
    const r = node?.closest<HTMLElement>('[data-lock-screen]');
    if (!node || !r) return;
    // Layout offsets (unaffected by the device's 3D transforms) from the lock screen's padding box.
    const measure = () => {
      let x = 0;
      let y = 0;
      for (let n: HTMLElement | null = node; n && n !== r; n = n.offsetParent as HTMLElement | null) {
        x += n.offsetLeft;
        y += n.offsetTop;
      }
      const w = r.clientWidth;
      const h = r.clientHeight;
      setBox((b) => (b && b.x === x && b.y === y && b.w === w && b.h === h ? b : { x, y, w, h }));
    };
    measure();
    document.fonts?.ready.then(measure);
    const ro = new ResizeObserver(measure);
    ro.observe(r);
    ro.observe(node);
    return () => ro.disconnect();
  }, [portrait]);

  return (
    <div ref={ref} className="relative">
      <div aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none bg-[#0d1830]" style={{ borderRadius: radius }}>
        {box && (
          <div className="absolute" style={{ left: -box.x, top: -box.y, width: box.w, height: box.h }}>
            <img
              src={portrait ? WALLPAPER_FROST.portrait : WALLPAPER_FROST.landscape}
              alt=""
              draggable={false}
              className="absolute inset-0 w-full h-full object-cover"
              style={{ objectPosition: `50% ${portrait ? 35 : 45}%` }}
            />
            <div className="absolute inset-0" style={{ background: LOCK_SHADE }} />
          </div>
        )}
      </div>
      {children}
    </div>
  );
};

// Shown on the lock screen once a visitor has finished the iMessage chat.
const SENT_MESSAGES = [
  { from: 'Gene Mathew Wagas', text: "Thanks for reaching out! I'll reply to your email within 24–48 hours.", when: 'now' },
];

const LockScreen = React.memo<{ time: string; portrait: boolean; messages?: typeof LOCK_MESSAGES }>(({
  time,
  portrait,
  messages = LOCK_MESSAGES,
}) => {
  const notes = messages.slice(0, portrait ? 1 : 2);
  const { date } = useNow();
  return (
    <div data-lock-screen className="absolute inset-0 flex flex-col overflow-hidden" style={{ padding: portrait ? '16px 14px 10px' : '34px 22px 14px' }}>
      {/* Wallpaper, framed so the cat sits between the clock and the notifications */}
      <div className="absolute inset-0 pointer-events-none bg-[#0d1830]">
        <img src={WALLPAPER} alt="" draggable={false} className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: `50% ${portrait ? 35 : 45}%` }} />
        {/* Soft top and bottom shading keeps the clock and the glass legible, like iOS does */}
        <div className="absolute inset-0" style={{ background: LOCK_SHADE }} />
      </div>
      <div className="relative z-10 flex flex-col items-center text-center text-white">
        <span className="ios-lock-date" style={{ fontSize: portrait ? 13 : 17 }}>
          {date}
        </span>
        <span className="glass-time" style={{ fontSize: portrait ? 78 : 118, marginBottom: portrait ? 13 : 20 }}>
          {time}
        </span>
        <span className="ios-lock-date uppercase tracking-[0.16em]" style={{ fontSize: portrait ? 9 : 11, color: 'rgba(255,255,255,.78)' }}>
          Full Stack Website Developer · Philippines
        </span>
      </div>
      <div className="flex-1" />
      <div className="relative z-10 flex flex-col gap-2">
        {notes.map((m) => (
          <Frosted key={m.from} portrait={portrait} radius="24px">
            <div className="ios-glass rounded-[24px] px-3 py-2.5 flex items-center gap-3 text-white">
              <MessagesIcon size={38} />
              <div className="flex flex-col text-left min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-[13px] font-semibold leading-tight truncate flex-1">{m.from}</span>
                  <span className="text-[11px] text-white/60 shrink-0">{m.when}</span>
                </div>
                <span className="text-[12px] text-white/85 leading-snug mt-0.5 line-clamp-2">{m.text}</span>
              </div>
            </div>
          </Frosted>
        ))}
      </div>
      {/* Flashlight / swipe hint / camera, then the home indicator */}
      <div className="relative z-10 flex items-center justify-between text-white" style={{ marginTop: portrait ? 10 : 16 }}>
        <Frosted portrait={portrait} radius="9999px">
          <span className="ios-glass w-11 h-11 rounded-full flex items-center justify-center">
            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M8 2.5h8v3.2l-2 3V20a2 2 0 0 1-4 0V8.7l-2-3z" />
              <path d="M12 12.5v2" strokeLinecap="round" />
            </svg>
          </span>
        </Frosted>
        <span className="text-[12px] font-medium tracking-tight text-white/80">Scroll to unfold</span>
        <Frosted portrait={portrait} radius="9999px">
          <span className="ios-glass w-11 h-11 rounded-full flex items-center justify-center">
            <svg className="w-[19px] h-[19px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M4 7.5h3l1.8-2.5h6.4L17 7.5h3a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 20 19.5H4A1.5 1.5 0 0 1 2.5 18V9A1.5 1.5 0 0 1 4 7.5z" />
              <circle cx="12" cy="13" r="3.6" />
            </svg>
          </span>
        </Frosted>
      </div>
      <div className="relative z-10 mx-auto rounded-full bg-white/90" style={{ width: portrait ? 110 : 130, height: 5, marginTop: portrait ? 8 : 12 }} />
    </div>
  );
});

// iOS contact monogram (gray gradient circle with initials).
const Monogram: React.FC<{ size: number; className?: string }> = ({ size, className = '' }) => (
  <span
    className={`rounded-full flex items-center justify-center text-white font-semibold shrink-0 ${className}`}
    style={{
      width: size,
      height: size,
      fontSize: size * 0.4,
      letterSpacing: '-0.02em',
      background: 'linear-gradient(180deg, #a9aebb 0%, #878b97 100%)',
    }}
  >
    GW
  </span>
);

const PhoneGlyph: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z" />
  </svg>
);

// iOS "slide to answer": drag the knob to the end of the track to fire onDone.
const SlideToAnswer: React.FC<{ label: string; onDone: () => void; height: number }> = ({ label, onDone, height }) => {
  const track = useRef<HTMLDivElement>(null);
  const drag = useRef<{ start: number; ratio: number } | null>(null);
  const [x, setX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const pad = 5;
  const knob = height - pad * 2;
  const max = () => Math.max(1, (track.current?.clientWidth ?? 0) - knob - pad * 2);

  const finish = () => {
    setX(max());
    window.setTimeout(onDone, 180);
  };
  const onDown = (e: React.PointerEvent) => {
    const t = track.current;
    if (!t) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    // The device is CSS-scaled, so convert screen pixels back to local pixels.
    const ratio = t.getBoundingClientRect().width / t.clientWidth || 1;
    drag.current = { start: e.clientX / ratio - x, ratio };
    setDragging(true);
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    setX(clamp(e.clientX / d.ratio - d.start, 0, max()));
  };
  const onUp = () => {
    if (!drag.current) return;
    drag.current = null;
    setDragging(false);
    if (x > max() * 0.82) finish();
    else setX(0);
  };
  const progress = x / max();

  return (
    <div
      ref={track}
      className="relative w-full rounded-full select-none"
      style={{
        height,
        background: 'rgba(255,255,255,.13)',
        backdropFilter: 'blur(30px) saturate(160%)',
        WebkitBackdropFilter: 'blur(30px) saturate(160%)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,.16), inset 0 0 0 .5px rgba(255,255,255,.1)',
      }}
    >
      {/* Label is clipped at the knob's leading edge, so the knob "wipes" it away like on iOS */}
      <span
        className="slide-shimmer absolute inset-0 flex items-center justify-center font-normal tracking-[-0.01em] pointer-events-none"
        style={{
          fontSize: height * 0.29,
          paddingLeft: knob,
          opacity: Math.max(0, 1 - progress * 1.4),
          clipPath: `inset(0 0 0 ${x + knob + pad}px)`,
        }}
      >
        {label}
      </span>
      <button
        type="button"
        aria-label={label}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') {
            e.preventDefault();
            finish();
          }
        }}
        className="absolute rounded-full bg-white flex items-center justify-center text-[#34c759] cursor-grab active:cursor-grabbing touch-none outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
        style={{
          boxShadow: '0 1px 2px rgba(0,0,0,.12), 0 4px 14px rgba(0,0,0,.22)',
          top: pad,
          left: pad,
          width: knob,
          height: knob,
          transform: `translateX(${x}px)`,
          transition: dragging ? 'none' : `transform .45s ${EASE}`,
        }}
      >
        <PhoneGlyph className="w-[44%] h-[44%]" />
      </button>
    </div>
  );
};

type ChatMsg = { from: 'me' | 'gene'; text: string };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// Serverless function (api/contact.js) that emails the message to you via Nodemailer.
// If it fails, sending falls back to opening the visitor's email app with everything filled in.
const CONTACT_ENDPOINT: string = import.meta.env.VITE_CONTACT_ENDPOINT || '/api/contact';

type ChatStep = 'subject' | 'details' | 'email' | 'sending' | 'done' | 'note' | 'noteSending';

// iMessage-style thread. Gene asks what they want to build (→ email subject), for more detail
// (→ body) and for their email (→ reply-to), then sends it all via api/contact.js. Afterwards the
// thread locks; a glass prompt offers one follow-up note (threaded onto the same email) before
// handing back to the lock screen via onFinish.
const ChatScreen: React.FC<{
  email?: string;
  portrait: boolean;
  time: string;
  onBack: () => void;
  onFinish: () => void;
  active: boolean;
}> = ({ email, portrait, time, onBack, onFinish, active }) => {
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [typing, setTyping] = useState(false);
  const [step, setStep] = useState<ChatStep>('subject');
  const [draft, setDraft] = useState('');
  const [delivered, setDelivered] = useState(false);
  const [ask, setAsk] = useState(false);
  const answers = useRef({ subject: '', details: '', from: '', messageId: '' });
  const started = useRef(false);
  const list = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const timers = useRef<number[]>([]);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  // Queues Gene's lines with a typing indicator; returns when the last one lands (ms from now).
  const geneSays = (lines: string[], delay = 0) => {
    lines.forEach((text, i) => {
      const at = delay + i * 1100;
      later(() => setTyping(true), at);
      later(() => {
        setTyping(false);
        setMsgs((m) => [...m, { from: 'gene', text }]);
      }, at + 900);
    });
    return delay + (lines.length - 1) * 1100 + 900;
  };

  useEffect(() => {
    if (!active || started.current) return;
    started.current = true;
    geneSays(['Hi, nice to meet you! 👋', 'What would you like to build? Tell me about it.'], 500);
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  useEffect(() => {
    const l = list.current;
    if (l) l.scrollTo({ top: l.scrollHeight, behavior: 'smooth' });
  }, [msgs, typing]);

  const post = async (payload: Record<string, string | boolean>) => {
    try {
      const res = await fetch(CONTACT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) return null;
      const data = await res.json().catch(() => ({}));
      return { id: typeof data.id === 'string' ? data.id : '' };
    } catch {
      return null;
    }
  };

  // Server unavailable: hand the visitor a pre-filled email so nothing is lost.
  const mailFallback = (subject: string, text: string) => {
    if (!email) return;
    const body = encodeURIComponent(`${text}\n\nReply to: ${answers.current.from}`);
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${body}`;
  };

  const deliver = async () => {
    const { subject, details, from } = answers.current;
    setTyping(true);
    const [sent] = await Promise.all([
      post({ email: from, subject, message: details }),
      new Promise((r) => window.setTimeout(r, 1200)),
    ]);
    setTyping(false);
    setStep('done');

    if (sent) {
      answers.current.messageId = sent.id;
      setDelivered(true);
      const t = geneSays(
        [
          "Thank you! I've received your message 🙌",
          "I'll get back to you soon. Please check your email from time to time, I usually reply within 24–48 hours.",
        ],
        200,
      );
      later(() => setAsk(true), t + 900);
      return;
    }
    mailFallback(subject, details);
    const t = geneSays(["Sorry, my inbox didn't catch that one. Your email app should open with everything filled in, just hit send 🙏"], 200);
    later(onFinish, t + 3200);
  };

  const deliverNote = async (note: string) => {
    const { subject, from, messageId } = answers.current;
    setTyping(true);
    const [sent] = await Promise.all([
      post({ email: from, subject, message: note, followup: true, inReplyTo: messageId }),
      new Promise((r) => window.setTimeout(r, 1000)),
    ]);
    setTyping(false);
    setStep('done');
    if (sent) {
      setDelivered(true);
      const t = geneSays(["Got it, I've added that to your message 👍", 'Thanks again, talk soon!'], 200);
      later(onFinish, t + 1800);
    } else {
      mailFallback(`Re: ${subject}`, note);
      const t = geneSays(["Sorry, that one didn't go through. Your email app should open so you can send it directly 🙏"], 200);
      later(onFinish, t + 3200);
    }
  };

  const addNote = () => {
    setAsk(false);
    const t = geneSays(['Sure! What else should I know?'], 250);
    later(() => {
      setStep('note');
      later(() => input.current?.focus({ preventScroll: true }), 50);
    }, t);
  };

  const allSet = () => {
    setAsk(false);
    const t = geneSays(['Thanks again, talk soon! 👋'], 250);
    later(onFinish, t + 1400);
  };

  const canType = step === 'subject' || step === 'details' || step === 'email' || step === 'note';

  const send = () => {
    const text = draft.trim();
    if (!text || !canType) return;
    setDraft('');
    setDelivered(false);
    setMsgs((m) => [...m, { from: 'me', text }]);

    if (step === 'subject') {
      answers.current.subject = text;
      setStep('details');
      geneSays(['Thank you! To help me understand it better, can you explain it a bit more?'], 500);
    } else if (step === 'details') {
      answers.current.details = text;
      setStep('email');
      geneSays(['Got it. May I know your active email?'], 500);
    } else if (step === 'email') {
      if (!EMAIL_RE.test(text)) {
        geneSays(["Hmm, that doesn't look like an email. Mind checking it?"], 500);
        return;
      }
      answers.current.from = text;
      setStep('sending');
      void deliver();
    } else if (step === 'note') {
      setStep('noteSending');
      void deliverNote(text);
    }
  };

  const lastMe = msgs.map((m) => m.from).lastIndexOf('me');
  const s = portrait ? 0.86 : 1;
  const placeholder = step === 'email' ? 'Your active email' : step === 'note' ? 'Add a note' : 'iMessage';

  return (
    <div className="absolute inset-0 flex flex-col bg-white text-black overflow-hidden" style={{ ['--chat-bg' as string]: '#ffffff' }}>
      {/* status bar */}
      <div className="flex items-center justify-between shrink-0 font-semibold" style={{ padding: portrait ? '8px 18px 0' : '14px 24px 0', fontSize: 13 * s }}>
        <span>{time}</span>
        <svg width="25" height="12" viewBox="0 0 25 12" aria-hidden="true">
          <rect x="0.75" y="0.75" width="21.5" height="10.5" rx="3.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <rect x="2.75" y="2.75" width="13.5" height="6.5" rx="1.5" fill="currentColor" />
          <rect x="23.25" y="4.25" width="1.5" height="3.5" rx="0.75" fill="currentColor" opacity="0.55" />
        </svg>
      </div>

      {/* header */}
      <div className="relative shrink-0 flex flex-col items-center" style={{ paddingTop: portrait ? 4 : 10 }}>
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to call"
          className="absolute left-3 top-2 w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-[0_2px_14px_rgba(0,0,0,.12)] border border-black/5"
          style={{ transform: `scale(${s})` }}
        >
          <svg width="10" height="16" viewBox="0 0 10 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M8 2 2 8l6 6" />
          </svg>
        </button>
        <Monogram size={portrait ? 40 : 56} />
        <span
          className="-mt-1.5 relative px-3 py-1 rounded-full bg-white shadow-[0_2px_14px_rgba(0,0,0,.1)] border border-black/5 font-semibold tracking-[-0.01em] flex items-center gap-1"
          style={{ fontSize: 14 * s }}
        >
          Gene Mathew Wagas
          <svg width="6" height="10" viewBox="0 0 6 10" fill="none" stroke="currentColor" strokeOpacity=".35" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
            <path d="m1 1 4 4-4 4" />
          </svg>
        </span>
      </div>

      {/* thread */}
      <div ref={list} data-lenis-prevent className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain flex flex-col gap-[3px] px-4" style={{ paddingTop: portrait ? 8 : 14, paddingBottom: 8, fontSize: 15 * s }}>
        <p className="text-center text-black/45 leading-tight mb-2" style={{ fontSize: 11 * s }}>
          iMessage
          <br />
          Today {time}
        </p>
        {msgs.map((m, i) => {
          const tail = msgs[i + 1]?.from !== m.from && !(typing && m.from === 'gene' && i === msgs.length - 1);
          return (
            <React.Fragment key={i}>
              <div className={`imsg ${m.from === 'me' ? 'imsg-out' : 'imsg-in'} ${tail ? 'tail' : ''} ${msgs[i - 1] && msgs[i - 1].from !== m.from ? 'mt-2' : ''}`}>
                {m.text}
              </div>
              {i === lastMe && delivered && (
                <span className="self-end text-black/45 font-medium -mt-px mr-1" style={{ fontSize: 11 * s }}>
                  Delivered
                </span>
              )}
            </React.Fragment>
          );
        })}
        {typing && (
          <div className="imsg imsg-in tail imsg-typing mt-1" aria-label="Gene is typing">
            <span />
            <span />
            <span />
          </div>
        )}
      </div>

      {/* composer */}
      <form
        className="shrink-0 flex items-center gap-2"
        style={{ padding: portrait ? '6px 10px 10px' : '8px 14px 18px' }}
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <span className="w-9 h-9 rounded-full bg-[#f2f2f4] flex items-center justify-center text-black/70 shrink-0" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M8 2v12M2 8h12" />
          </svg>
        </span>
        <div className="flex-1 flex items-center rounded-full border border-black/10 bg-white pl-3.5 pr-1 h-9 min-w-0">
          <input
            ref={input}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={!canType}
            type={step === 'email' ? 'email' : 'text'}
            inputMode={step === 'email' ? 'email' : 'text'}
            autoComplete={step === 'email' ? 'email' : 'off'}
            placeholder={placeholder}
            aria-label={placeholder}
            className="flex-1 min-w-0 bg-transparent outline-none placeholder:text-black/35 disabled:opacity-50"
            style={{ fontSize: 15 * s }}
          />
          {draft.trim() && canType ? (
            <button type="submit" aria-label="Send" className="w-7 h-7 rounded-full bg-[#0a84ff] text-white flex items-center justify-center shrink-0">
              <svg width="12" height="14" viewBox="0 0 12 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 13V1.5M1 6.5l5-5 5 5" />
              </svg>
            </button>
          ) : (
            <svg className="mr-2 text-black/35 shrink-0" width="12" height="17" viewBox="0 0 12 17" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
              <rect x="3" y="1" width="6" height="10" rx="3" />
              <path d="M1 8a5 5 0 0 0 10 0M6 13v3" />
            </svg>
          )}
        </div>
      </form>

      {/* "Anything else?" glass prompt over a blurred thread */}
      <div
        className="absolute inset-0 z-20 flex items-end justify-center"
        style={{
          padding: portrait ? 10 : 18,
          background: ask ? 'rgba(255,255,255,.35)' : 'rgba(255,255,255,0)',
          backdropFilter: ask ? 'blur(8px)' : 'blur(0px)',
          WebkitBackdropFilter: ask ? 'blur(8px)' : 'blur(0px)',
          opacity: ask ? 1 : 0,
          pointerEvents: ask ? 'auto' : 'none',
          transition: `opacity .45s ease, background .45s ease, backdrop-filter .45s ease`,
        }}
        aria-hidden={!ask}
      >
        <div
          role="dialog"
          aria-label="Anything else I should know?"
          className="w-full rounded-[26px] bg-white/80 border border-white text-center shadow-[0_18px_50px_rgba(0,0,0,.18)]"
          style={{
            padding: portrait ? '16px 14px 12px' : '22px 20px 16px',
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            transform: ask ? 'translateY(0) scale(1)' : 'translateY(16px) scale(.97)',
            filter: ask ? 'blur(0px)' : 'blur(6px)',
            transition: `transform .55s ${EASE}, filter .45s ease`,
          }}
        >
          <Monogram size={portrait ? 34 : 42} className="mx-auto" />
          <p className="font-semibold tracking-[-0.01em] mt-2" style={{ fontSize: 16 * s }}>
            Anything else I should know?
          </p>
          <p className="text-black/55 leading-snug mt-1 mx-auto max-w-[280px]" style={{ fontSize: 13 * s }}>
            Add a note and I'll attach it to the message you just sent.
          </p>
          <button
            type="button"
            onClick={addNote}
            tabIndex={ask ? 0 : -1}
            className="w-full rounded-full bg-[#0a84ff] text-white font-semibold active:opacity-80 transition-opacity"
            style={{ marginTop: portrait ? 12 : 16, height: portrait ? 38 : 44, fontSize: 15 * s }}
          >
            Add a note
          </button>
          <button
            type="button"
            onClick={allSet}
            tabIndex={ask ? 0 : -1}
            className="w-full rounded-full text-[#0a84ff] font-medium active:opacity-60 transition-opacity"
            style={{ marginTop: 4, height: portrait ? 34 : 40, fontSize: 15 * s }}
          >
            No, I'm all set
          </button>
        </div>
      </div>
    </div>
  );
};

const CallScreen = React.memo<{ email?: string; portrait: boolean; time: string; openSignal: number }>(({
  email,
  portrait,
  time,
  openSignal,
}) => {
  const [chat, setChat] = useState(false);
  const [ended, setEnded] = useState(false); // conversation finished → back to the lock screen
  const [round, setRound] = useState(0); // remounts the slider so it resets after "back"

  // Opened from a CTA elsewhere on the page (see lib/phoneChat).
  useEffect(() => {
    if (openSignal) setChat(true);
  }, [openSignal]);
  const out: React.CSSProperties = { opacity: 0, filter: 'blur(16px)', transform: 'scale(1.06)', pointerEvents: 'none' };
  const inn: React.CSSProperties = { opacity: 0, filter: 'blur(16px)', transform: 'scale(.97)', pointerEvents: 'none' };
  const show: React.CSSProperties = { opacity: 1, filter: 'blur(0px)', transform: 'none' };
  const fx = `opacity .55s ease, filter .6s ${EASE}, transform .7s ${EASE}`;

  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      {/* incoming call */}
      <div
        className="absolute inset-0 flex flex-col items-center text-center"
        style={{ padding: portrait ? '22px 16px 18px' : '56px 24px 34px', transition: fx, ...(chat || ended ? out : show) }}
      >
        <img src={WALLPAPER} alt="" className="absolute inset-0 w-full h-full object-cover scale-110 blur-xl" draggable={false} />
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 flex flex-col items-center">
          <span className="text-white/65 font-medium tracking-tight" style={{ fontSize: portrait ? 12 : 15 }}>
            Incoming call · about your next project
          </span>
          <h3 className="text-white font-semibold tracking-[-0.03em] mt-1.5 leading-none" style={{ fontSize: portrait ? 32 : 46 }}>
            Gene Mathew Wagas
          </h3>
        </div>
        {!portrait && <Monogram size={112} className="relative z-10 mt-9 text-[44px] ring-4 ring-white/15" />}
        <div className="flex-1" />
        <div className="relative z-10 w-full">
          <SlideToAnswer key={round} label="slide to message" height={portrait ? 52 : 62} onDone={() => setChat(true)} />
        </div>
        {email && (
          <a href={`mailto:${email}`} className="relative z-10 mt-3 text-[12px] text-white/60 hover:text-white transition-colors">
            {email}
          </a>
        )}
      </div>

      {/* iMessage thread */}
      <div className="absolute inset-0" style={{ transition: fx, transitionDelay: chat && !ended ? '.12s' : '0s', ...(ended ? out : chat ? show : inn) }}>
        <ChatScreen
          email={email}
          portrait={portrait}
          time={time}
          active={chat}
          onBack={() => {
            setChat(false);
            setRound((r) => r + 1);
          }}
          onFinish={() => setEnded(true)}
        />
      </div>

      {/* back to the lock screen, with Gene's reply waiting as a notification */}
      <div className="absolute inset-0" style={{ transition: fx, transitionDelay: ended ? '.15s' : '0s', ...(ended ? show : inn) }}>
        {ended && <LockScreen time={time} portrait={portrait} messages={SENT_MESSAGES} />}
      </div>
    </div>
  );
});

// The page shown across both inner screens: a short intro, then one calm chapter per
// project. In landscape the hinge sits dead-center, so content is laid out in two
// columns with a gutter straddling the fold.
const ScreenPage = React.memo<{ projects: ProjectItem[]; portrait: boolean }>(({ projects, portrait }) => {
  const pad = portrait ? 'px-5' : 'px-10';
  const cols = portrait ? 'grid grid-cols-1 gap-y-6' : 'grid grid-cols-2 gap-x-20';
  const label = 'text-[11px] font-medium uppercase tracking-[0.14em] text-black/45';
  const body = 'text-[15px] leading-[1.6] text-black/65 max-w-[360px] text-justify hyphens-auto';
  const gap = portrait ? 64 : 104; // space between project chapters

  return (
    <div className={`text-[#111] ${pad}`} style={{ paddingTop: portrait ? 52 : 64, paddingBottom: portrait ? 100 : 140 }}>
      {/* Intro */}
      <div className={cols} style={{ minHeight: portrait ? 300 : 440, alignContent: 'end', rowGap: portrait ? 24 : 40 }}>
        {/* Headline reads across the fold in landscape: "I turn ideas | into reality." */}
        {portrait ? (
          <div className="flex flex-col justify-end">
            <p className={label}>Full stack website developer — Philippines</p>
            <div className="flex items-center gap-3 mt-3">
              <h2 className="font-black tracking-[-0.06em] leading-[0.9]" style={{ fontSize: 52 }}>
                I turn ideas into reality.
              </h2>
              <IdeaBulb height={104} />
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-col justify-end">
              <p className={label}>Full stack website developer — Philippines</p>
              <div className="flex items-center gap-5 mt-4">
                <h2 className="font-black tracking-[-0.06em] leading-[0.88]" style={{ fontSize: 88 }}>
                  I turn
                  <br />
                  ideas
                </h2>
                <IdeaBulb height={150} />
              </div>
            </div>
            <div className="flex flex-col justify-end">
              <h2 className="font-black tracking-[-0.06em] leading-[0.88]" style={{ fontSize: 88 }}>
                into
                <br />
                reality.
              </h2>
            </div>
          </>
        )}
        <p className={body}>
          I'm Gene, a full stack web developer. I take an idea from a rough sketch to a website that works, looks sharp and is
          ready for real people to use.
        </p>
        <div className="flex flex-col max-w-[360px]">
          <p className={label}>How I work</p>
          <p className={`${body} mt-2`}>
            AI is part of my toolkit. I build with Claude, Codex, Antigravity and Cursor, and I like testing which model handles
            each task best. Good prompt engineering lets me plan, prototype and debug faster, so more of my time goes into the
            details that need a human eye.
          </p>
        </div>
      </div>

      {/* Scroll cue — sits inside the first screenful so it's visible as soon as the device opens */}
      <p className={`${label} flex items-center gap-2`} style={{ marginTop: portrait ? 32 : 44 }}>
        A few proofs of concept, and the story behind each
        <span className="inline-block animate-bounce text-black/60">↓</span>
      </p>

      {/* One chapter per project */}
      {projects.map((p, i) => (
        <article key={p.id} className={`${cols} items-center`} style={{ marginTop: i === 0 ? (portrait ? 28 : 40) : gap }}>
          <div className="flex flex-col">
            <span className={label}>
              {String(i + 1).padStart(2, '0')} — {p.category}
            </span>
            <h3 className="font-black tracking-[-0.055em] leading-[0.9] mt-3" style={{ fontSize: portrait ? 44 : 64 }}>
              {p.title}
            </h3>
            {p.description && (
              <p className={body} style={{ marginTop: portrait ? 14 : 20 }}>
                {p.description}
              </p>
            )}
            {p.stack && p.stack.length > 0 && (
              <p className="text-[12px] text-black/40" style={{ marginTop: portrait ? 12 : 16 }}>
                {p.stack.join(' · ')}
              </p>
            )}
          </div>
          <div className="overflow-hidden rounded-[18px] bg-black/5 aspect-[4/3]">
            {p.visual === 'social' && p.sites ? (
              <SocialShowcase items={p.sites} title={p.title} />
            ) : p.sites && p.sites.length > 0 ? (
              <Crossfade images={p.sites.flatMap((s) => s.images)} alt={p.title} sites={p.sites} />
            ) : p.images && p.images.length > 0 ? (
              <Crossfade images={p.images} alt={p.title} />
            ) : (
              p.imageUrl && <img src={p.imageUrl} alt={p.title} className="w-full h-full object-cover" draggable={false} />
            )}
          </div>
        </article>
      ))}

      {/* Outro */}
      <p className={`${label} text-center`} style={{ marginTop: gap }}>
        More on the way — keep scrolling
      </p>
    </div>
  );
});
