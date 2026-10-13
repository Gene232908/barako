import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ProjectItem, ServiceItem } from '../types/portfolio';

interface WorksSectionProps {
  projects: ProjectItem[];
  services?: ServiceItem[];
  roles?: string[];
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

const useClock = () => {
  const fmt = () => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };
  const [time, setTime] = useState(fmt);
  useEffect(() => {
    const id = window.setInterval(() => setTime(fmt()), 15000);
    return () => window.clearInterval(id);
  }, []);
  return time;
};

export const WorksSection: React.FC<WorksSectionProps> = ({ projects, services = [], roles = [], email }) => {
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
    overlay: useRef<HTMLDivElement>(null),
    nmL: useRef<HTMLDivElement>(null),
    nmR: useRef<HTMLDivElement>(null),
  };

  const [vp, setVp] = useState({ w: 1200, h: 820 });
  const [contentH, setContentH] = useState(0);
  const [nameSize, setNameSize] = useState({ lw: 1, lh: 1, rw: 1, rh: 1 });
  const [finish, setFinish] = useState<FinishKey>('titanium');
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
    portrait, G, scale, U1, U2, innerMax, innerPx, stageH, vw: vp.w, cy, halfH, nameSize, rRight, rAll,
  });
  params.current = {
    portrait, G, scale, U1, U2, innerMax, innerPx, stageH, vw: vp.w, cy, halfH, nameSize, rRight, rAll,
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
      set(el.leaf.current, 'visibility', leafUp ? 'visible' : 'hidden');
      set(
        el.leaf.current,
        'transform',
        d < 0.2
          ? 'none'
          : `perspective(${PERSPECTIVE}px) ${port ? `rotateX(${(-d).toFixed(3)}deg)` : `rotateY(${d.toFixed(3)}deg)`}`,
      );
      set(el.cover.current, 'visibility', leafUp ? 'hidden' : 'visible');
      set(
        el.cover.current,
        'transform',
        d > 179.8
          ? 'none'
          : `perspective(${PERSPECTIVE}px) ${port ? `rotateX(${(180 - d).toFixed(3)}deg)` : `rotateY(${(d - 180).toFixed(3)}deg)`}`,
      );
      set(el.rightH.current, 'visibility', d > 176 ? 'hidden' : 'visible');

      const rr = leafUp ? n.rRight : n.rAll;
      set(el.rBody.current, 'border-radius', rr);
      set(el.rGlass.current, 'border-radius', insetRadii(rr, g.f));
      set(el.rScreen.current, 'border-radius', insetRadii(rr, g.f + g.bz));
      set(el.shR.current, 'border-radius', rr);

      const contentVis = u > 0.985 ? 'hidden' : 'inherit';
      set(el.cL.current, 'visibility', contentVis);
      set(el.cR.current, 'visibility', contentVis);

      const m = d / 90;
      set(el.shF.current, 'opacity', String(leafUp ? +(m ** 1.6 * 0.8).toFixed(3) : 0));
      set(el.shB.current, 'opacity', String(leafUp ? 0 : +((2 - m) ** 1.6 * 0.7).toFixed(3)));
      set(el.shR.current, 'opacity', String(+(sinD ** 1.8 * 0.5).toFixed(3)));

      const ov = clamp((c - 0.975) * 40, 0, 1);
      set(el.overlay.current, 'opacity', String(+ov.toFixed(3)));
      set(el.overlay.current, 'visibility', ov > 0.01 ? 'visible' : 'hidden');

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

    if (lastInner.current !== inner || changed) {
      lastInner.current = inner;
      set(el.cL.current, 'top', `${(-inner).toFixed(2)}px`);
      set(el.cR.current, 'top', `${(port ? -n.halfH - inner : -inner).toFixed(2)}px`);
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
      if (r < 0 || reduced) r = s;
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

  const scrollToOpen = (ev: React.MouseEvent) => {
    const t = ev.target as HTMLElement;
    if (t.closest('a,button')) return;
    const s = sectionRef.current;
    if (!s || lastK.current < 0.9) return;
    const top = s.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: top + U1 + 2, behavior: 'smooth' });
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
      style={{ ...abs, left: landscape && which === 'R' ? -halfW : 0, top: portrait && which === 'R' ? -halfH : 0, width: D }}
    >
      <div ref={which === 'R' ? contentMeasureRef : undefined} style={{ width: D }}>
        <ScreenPage projects={projects} services={services} roles={roles} email={email} portrait={portrait} />
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
    <section
      id="works"
      ref={sectionRef}
      className="relative w-full select-none"
      style={{ height: totalH, background: pageBg, transition: 'background .6s ease' }}
    >
      <div className="sticky top-0 w-full overflow-hidden" style={{ height: stageH }}>
        {/* Flanking names behind the device */}
        <div style={{ ...fill, pointerEvents: 'none', overflow: 'hidden' }}>
          <div ref={el.nmL} style={{ ...abs, left: 0, top: 0, willChange: 'transform' }}>
            <div ref={nameLInner} className="font-hero-title font-black text-[#111] leading-[0.85] tracking-[-0.06em] whitespace-nowrap" style={{ fontSize: 200, width: 'max-content' }}>
              PROJ
            </div>
          </div>
          <div ref={el.nmR} style={{ ...abs, left: 0, top: 0, willChange: 'transform' }}>
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
                  transform: 'translateX(-50%)', pointerEvents: 'none',
                }}
              />
              <div
                ref={el.shadowC}
                style={{
                  ...abs, left: '50%', top: '100%', marginTop: G.H * 0.012, height: G.H * 0.03, width: G.W * 0.86, borderRadius: '50%',
                  background: 'radial-gradient(closest-side, rgba(0,0,0,.22), rgba(0,0,0,.07) 55%, rgba(0,0,0,0))',
                  transform: 'translateX(-50%)', pointerEvents: 'none',
                }}
              />

              {/* Static half (right / bottom) */}
              <div ref={el.rightH} style={rightStyle}>
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
                    <div ref={el.shR} style={{ ...fill, borderRadius: rRight, background: shade('right'), opacity: 0, pointerEvents: 'none', zIndex: 9, transition: radiusTransition }} />
                  </>,
                  [el.rBody, el.rGlass, el.rScreen],
                )}
              </div>

              {/* Folding leaf — inner face */}
              <div ref={el.leaf} style={{ ...leafStyle, willChange: 'transform' }}>
                {body(
                  rLeaf,
                  leafEdge,
                  <>
                    {screenContent('L')}
                    {statusBar(landscape ? 'left' : 'all')}
                    {crease(landscape ? 'left' : 'top')}
                    {glare('L')}
                  </>,
                  <div ref={el.shF} style={{ ...fill, borderRadius: rLeaf, background: shade('front'), opacity: 0, pointerEvents: 'none', zIndex: 9 }} />,
                )}
              </div>

              {/* Folding leaf — outer cover face */}
              <div ref={el.cover} style={{ ...rightStyle, visibility: 'hidden', willChange: 'transform' }}>
                <div style={{ ...fill, borderRadius: rAll, background: bodyBg, boxShadow: bodyShadow }} />
                <div style={{ ...abs, inset: G.f, borderRadius: R - G.f, background: '#050505' }} />
                <div style={{ ...abs, inset: E, borderRadius: R - E, background: SCREEN_BG, overflow: 'hidden', contain: 'paint' }}>
                  <div style={{ ...fill, cursor: 'pointer', isolation: 'isolate' }} onClick={scrollToOpen}>
                    <LockScreen time={time} projects={projects} portrait={portrait} />
                  </div>
                  <div ref={el.call} style={{ ...fill, opacity: 0, zIndex: 4, isolation: 'isolate' }}>
                    <CallScreen email={email} portrait={portrait} />
                  </div>
                  {glare()}
                </div>
                {sideButtons}
                <div ref={el.shB} style={{ ...fill, borderRadius: rAll, background: shade('back'), opacity: 0, pointerEvents: 'none', zIndex: 9 }} />
              </div>

              {/* Fully-open overlay with nav pill */}
              <div
                ref={el.overlay}
                style={{ ...abs, left: E, top: E, width: D, height: O, borderRadius: R - E, overflow: 'hidden', pointerEvents: 'none', opacity: 0, zIndex: 10 }}
              >
                <div style={{ ...abs, left: 0, right: 0, bottom: portrait ? 16 : 20, display: 'flex', justifyContent: 'center', pointerEvents: 'auto' }}>
                  <nav className="flex items-center gap-1 p-1 rounded-full bg-[#111]/90 backdrop-blur-md shadow-[0_10px_30px_-10px_rgba(0,0,0,.5)]">
                    {[
                      ['Works', '#works'],
                      ['About', '#about'],
                      ['Services', '#services'],
                      ['Contact', '#contact'],
                    ].map(([label, href], i) => (
                      <a
                        key={href}
                        href={href}
                        className={`px-3.5 py-2 rounded-full text-[13px] font-medium tracking-tight transition-colors ${
                          i === 0 ? 'bg-white text-black' : 'text-white/80 hover:text-white'
                        }`}
                      >
                        {label}
                      </a>
                    ))}
                  </nav>
                </div>
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
  );
};

const LockScreen: React.FC<{ time: string; projects: ProjectItem[]; portrait: boolean }> = ({ time, projects, portrait }) => {
  const notes = projects.slice(0, portrait ? 1 : 2);
  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden" style={{ padding: portrait ? '18px 16px 16px' : '34px 22px 22px' }}>
      <img src="/images/fold-portrait.jpg" alt="" className="absolute inset-0 w-full h-full object-cover object-top pointer-events-none" draggable={false} />
      <div className="relative z-10 flex flex-col items-center text-center">
        <span className="font-black text-[#0a0a0a] leading-none tracking-[-0.05em]" style={{ fontSize: portrait ? 64 : 96 }}>
          {time}
        </span>
        <span className="text-black/65 font-medium tracking-tight mt-2" style={{ fontSize: portrait ? 12 : 14 }}>
          Full stack developer · Philippines
        </span>
      </div>
      <div className="flex-1" />
      <div className="relative z-10 flex flex-col gap-2">
        {notes.map((p, i) => (
          <div key={p.id} className="rounded-2xl bg-white/75 backdrop-blur-2xl border border-white/90 shadow-[0_8px_20px_rgba(0,0,0,0.06)] p-2.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 bg-black/10">
              <img src={p.imageUrl} alt="" className="w-full h-full object-cover" draggable={false} />
            </div>
            <div className="flex flex-col text-left min-w-0">
              <span className="text-[13px] font-semibold text-black leading-tight truncate">
                {i === 0 ? `${p.title} is live` : `${p.title} — shipped`}
              </span>
              <span className="text-[10px] text-black/55 tracking-wider uppercase mt-0.5 truncate">
                {p.category} · {i === 0 ? 'now' : '2h ago'}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="relative z-10 flex items-center justify-between" style={{ marginTop: portrait ? 10 : 14 }}>
        <span className="w-11 h-11 rounded-full bg-white/85 backdrop-blur-md border border-white/90 flex items-center justify-center text-black/70">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
          </svg>
        </span>
        <span className="px-5 py-2.5 rounded-full bg-white/90 backdrop-blur-md border border-white/90 text-[12px] font-medium text-black tracking-tight">
          Scroll to unfold
        </span>
        <span className="w-11 h-11 rounded-full bg-white/85 backdrop-blur-md border border-white/90 flex items-center justify-center text-black/70">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </span>
      </div>
    </div>
  );
};

const CallScreen: React.FC<{ email?: string; portrait: boolean }> = ({ email, portrait }) => (
  <div className="absolute inset-0 flex flex-col items-center text-center overflow-hidden" style={{ padding: portrait ? '22px 16px 16px' : '48px 24px 26px' }}>
    <img src="/images/fold-portrait.jpg" alt="" className="absolute inset-0 w-full h-full object-cover object-top scale-110 blur-md" draggable={false} />
    <div className="absolute inset-0 bg-black/45" />
    <div className="relative z-10 flex flex-col items-center">
      <span className="text-white/70 font-medium tracking-tight" style={{ fontSize: portrait ? 11 : 13 }}>
        Incoming call · about your next project
      </span>
      <h3 className="text-white font-semibold tracking-[-0.04em] mt-2 leading-none" style={{ fontSize: portrait ? 32 : 44 }}>
        Gene Wagas
      </h3>
    </div>
    {!portrait && (
      <div className="relative z-10 mt-8 w-28 h-28 rounded-full overflow-hidden ring-4 ring-white/20">
        <img src="/images/fold-portrait.jpg" alt="" className="w-full h-full object-cover object-top" draggable={false} />
      </div>
    )}
    <div className="flex-1" />
    <a
      href="#contact"
      className="relative z-10 w-full flex items-center gap-3 rounded-full bg-white/20 backdrop-blur-xl border border-white/25 p-1.5 pr-5 text-white group"
    >
      <span className="w-11 h-11 rounded-full bg-[#34c759] flex items-center justify-center transition-transform duration-500 group-hover:translate-x-2" style={{ transitionTimingFunction: EASE }}>
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z" />
        </svg>
      </span>
      <span className="flex-1 text-center text-[14px] font-medium tracking-tight text-white/90">slide to talk</span>
    </a>
    {email && (
      <a href={`mailto:${email}`} className="relative z-10 mt-3 text-[12px] text-white/70 hover:text-white transition-colors">
        {email}
      </a>
    )}
  </div>
);

// The page shown across both inner screens. In landscape the hinge sits dead-center,
// so content is laid out in two columns with a gutter straddling the fold.
const ScreenPage: React.FC<{
  projects: ProjectItem[];
  services: ServiceItem[];
  roles: string[];
  email?: string;
  portrait: boolean;
}> = ({ projects, services, roles, email, portrait }) => {
  const pad = portrait ? 'px-5' : 'px-10';
  const cols = portrait ? 'grid grid-cols-1 gap-y-4' : 'grid grid-cols-2 gap-x-20 gap-y-8';
  const label = 'text-[11px] font-medium uppercase tracking-[0.14em] text-black/45';

  return (
    <div className={`text-[#111] ${pad}`} style={{ paddingTop: portrait ? 52 : 64, paddingBottom: portrait ? 90 : 110 }}>
      {/* Intro */}
      <div className={cols} style={{ minHeight: portrait ? 300 : 520, alignContent: 'end' }}>
        <div className="flex flex-col justify-end">
          <p className={label}>Full stack developer — Philippines</p>
          <h2 className="font-black tracking-[-0.065em] leading-[0.85] mt-3" style={{ fontSize: portrait ? 76 : 132 }}>
            Gene
          </h2>
        </div>
        <div className="flex flex-col justify-end">
          <h2 className="font-black tracking-[-0.065em] leading-[0.85]" style={{ fontSize: portrait ? 76 : 132 }}>
            Wagas
          </h2>
        </div>
        <p className="text-[15px] leading-[1.45] text-black/70 max-w-[360px]">
          I build websites, CRM platforms and automated workflows for businesses that would rather run smoothly than explain why they don't.
        </p>
        <div className="flex items-start gap-2">
          <a href="#about" className="px-5 py-3 rounded-full bg-[#111] text-white text-[13px] font-medium tracking-tight hover:-translate-y-0.5 transition-transform">
            About me ↗
          </a>
          <a href="#contact" className="px-5 py-3 rounded-full bg-black/5 text-[13px] font-medium tracking-tight hover:bg-black/10 transition-colors">
            Say hello
          </a>
        </div>
      </div>

      {/* Roles */}
      {roles.length > 0 && (
        <div className={`${cols} border-t border-black/10`} style={{ marginTop: portrait ? 40 : 64, paddingTop: portrait ? 20 : 28 }}>
          {roles.map((r, i) => (
            <div key={r} className="flex items-baseline gap-4">
              <span className="text-[44px] font-black tracking-[-0.06em] leading-none">0{i + 1}</span>
              <span className="text-[13px] uppercase tracking-[0.12em] text-black/60">{r}</span>
            </div>
          ))}
        </div>
      )}

      {/* Selected work */}
      <div className={`${cols} items-end`} style={{ marginTop: portrait ? 56 : 96 }}>
        <h3 className="font-black tracking-[-0.055em] leading-none" style={{ fontSize: portrait ? 40 : 56 }}>
          Selected work
        </h3>
        <div className={`flex items-end ${portrait ? 'justify-start' : 'justify-end'}`}>
          <span className={label}>({String(projects.length).padStart(2, '0')}) projects</span>
        </div>
      </div>
      <div className={cols} style={{ marginTop: portrait ? 20 : 32 }}>
        {projects.map((p, i) => (
          <a key={p.id} href={p.link || '#works'} className="group block hover:-translate-y-1 transition-transform duration-500" style={{ transitionTimingFunction: EASE }}>
            <div className="overflow-hidden rounded-[18px] bg-black/5 aspect-[4/3]">
              <img
                src={p.imageUrl}
                alt={p.title}
                className="w-full h-full object-cover transition-transform duration-[900ms] group-hover:scale-[1.06]"
                style={{ transitionTimingFunction: EASE }}
                draggable={false}
              />
            </div>
            <div className="flex items-baseline justify-between mt-3">
              <div>
                <span className={label}>
                  {String(i + 1).padStart(2, '0')} · {p.category}
                </span>
                <h4 className="text-[24px] font-bold tracking-[-0.04em] leading-tight mt-1">{p.title}</h4>
              </div>
              <span className="text-[13px] text-black/50">{p.year}</span>
            </div>
          </a>
        ))}
      </div>

      {/* Services */}
      {services.length > 0 && (
        <>
          <h3 className="font-black tracking-[-0.055em] leading-none" style={{ fontSize: portrait ? 40 : 56, marginTop: portrait ? 64 : 110 }}>
            Services
          </h3>
          <div className={`${cols}`} style={{ marginTop: portrait ? 16 : 28, rowGap: 0 }}>
            {services.map((s) => (
              <div key={s.id} className="border-t border-black/10 py-4 flex gap-4 hover:translate-x-2 transition-transform duration-500" style={{ transitionTimingFunction: EASE }}>
                <span className="text-[12px] text-black/40 pt-1 w-6 shrink-0">{s.number}</span>
                <div>
                  <h4 className="text-[17px] font-semibold tracking-[-0.02em] leading-snug">{s.title}</h4>
                  {s.description && <p className="text-[13px] text-black/55 leading-[1.45] mt-1">{s.description}</p>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* CTA */}
      <div className={`${cols} items-end`} style={{ marginTop: portrait ? 64 : 110 }}>
        <h3 className="font-black tracking-[-0.055em] leading-[0.95]" style={{ fontSize: portrait ? 40 : 52 }}>
          Have a project that needs building?
        </h3>
        <div className={`flex flex-col gap-3 ${portrait ? 'items-start' : 'items-end'}`}>
          <a href="#contact" className="px-6 py-3.5 rounded-full bg-[#111] text-white text-[14px] font-medium tracking-tight hover:-translate-y-0.5 transition-transform">
            Start a project ↗
          </a>
          {email && (
            <a href={`mailto:${email}`} className="text-[13px] text-black/55 hover:text-black transition-colors">
              {email}
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
