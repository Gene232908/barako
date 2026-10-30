import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { BlurReveal } from './BlurReveal';
import { BrandIcon } from './BrandIcon';

interface StackSectionProps {
  title: string;
  groups: { label: string; items: string[] }[];
}

type Ring = { rx: number; ry: number };
type Geo = { W: number; H: number; icon: number; rings: Ring[]; slots: { ring: number; base: number }[] };

const BURST = 'cubic-bezier(.12,.75,.3,1)';
const OPEN_MS = 1050;
const CLOSE_MS = 750;
const TAU = Math.PI * 2;
// Share of the stack that has to be on screen before it scatters by itself.
const AUTO_SCATTER_AT = 0.35;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const easeOutBack = (t: number) => 1 + 2.2 * (t - 1) ** 3 + 1.2 * (t - 1) ** 2; // small overshoot
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Where the logos land, as rings around the core. Wide fields get three elliptical rings, one per
// group with the smallest group innermost; phone-width fields get two taller ovals. Neighbouring rings
// sit a fixed step apart, wide enough that logos on them clear each other whatever angle each
// ring is turned to (a step of ~1.42 tiles), and the inner ring clears the core's corners. Item
// order is the flattened groups.
const measure = (W: number, H: number, tile: number, icon: number, groups: string[][]): Geo => {
  const ids: number[][] = [];
  let n = 0;
  groups.forEach((g) => ids.push(g.map(() => n++)));
  const step = tile * 1.42 + 4;

  let rings: Ring[];
  let members: number[][];
  if (W < 560) {
    // Phones are taller than they are wide, so the rings stretch upward to give the logos room.
    const rx = W / 2 - tile / 2 - 12;
    const ry = Math.min(H / 2 - tile / 2 - 12, rx * 1.35);
    const clear = (icon / 2 + tile / 2 + 6) * Math.SQRT2;
    rings = [{ rx: Math.max(rx - step, clear), ry: Math.max(ry - step, clear) }, { rx, ry }];
    const flat = ids.flat();
    const split = Math.round(flat.length * 0.44);
    members = [flat.slice(0, split), flat.slice(split)];
  } else {
    const ry = H / 2 - tile / 2 - 22;
    const rx = Math.min(W / 2 - tile / 2 - 22, ry * 1.9);
    rings = [2, 1, 0].map((k) => ({ rx: rx - k * step, ry: ry - k * step }));
    // If the inner orbit would clip the icon's corners (the point (c, c) lies outside it), grow it
    // until it clears and put the middle orbit halfway out.
    const c = icon / 2 + tile / 2 + 8;
    const [inner, , outer] = rings;
    const grow = c * Math.hypot(1 / inner.rx, 1 / inner.ry);
    if (grow > 1) {
      rings[0] = { rx: inner.rx * grow, ry: inner.ry * grow };
      rings[1] = { rx: (rings[0].rx + outer.rx) / 2, ry: (rings[0].ry + outer.ry) / 2 };
    }
    if (ids.length === 3) {
      members = [...ids].sort((a, b) => a.length - b.length);
    } else {
      const flat = ids.flat();
      const third = Math.ceil(flat.length / 3);
      members = [flat.slice(0, third), flat.slice(third, third * 2), flat.slice(third * 2)];
    }
  }

  const slots: Geo['slots'] = [];
  members.forEach((m, ring) =>
    m.forEach((item, k) => {
      slots[item] = { ring, base: (k / m.length) * TAU + ring * 0.6 - Math.PI / 2 };
    }),
  );
  return { W, H, icon, rings, slots };
};

// Gathered, the tiles sit shrunk in a tight ring hugging the icon, logos still readable, each
// tipped a few degrees so the cluster looks collected rather than gridded.
const PILE_SCALE = 0.55;
const pileSpot = (i: number, n: number, icon: number) => {
  const a = -Math.PI / 2 + (i / n) * TAU;
  const d = icon * 0.78;
  return { x: Math.cos(a) * d, y: Math.sin(a) * d, r: ((i * 37) % 17) - 8 };
};

// Motion runs outside React: an rAF loop writes each tile's transform while tiles are in flight,
// then stops. Per tile, progress goes 0 (in the pile) to 1 (scattered). Each burst turns every
// ring by a random angle, so the logos land in a different spread every time.
class Orbit {
  tiles: (HTMLElement | null)[] = [];
  private still = false;
  private geo: Geo | null = null;
  private open = false;
  private at = -1e9;
  private from: number[] = [];
  private delay: number[] = [];
  private turn: number[] = [];
  private raf = 0;
  private visible = false;

  private progress(i: number, now: number) {
    const from = this.from[i] ?? 0;
    const k = clamp01((now - this.at - (this.delay[i] ?? 0)) / (this.open ? OPEN_MS : CLOSE_MS));
    return from + ((this.open ? 1 : 0) - from) * (this.open ? easeOutBack(k) : easeInOutCubic(k));
  }

  // Positions every tile for `now`; returns true once nothing is mid-flight.
  private paint(now: number) {
    const g = this.geo;
    if (!g) return true;

    let settled = true;
    const n = g.slots.length;
    for (let i = 0; i < n; i++) {
      const el = this.tiles[i];
      if (!el) continue;
      if (now - this.at - (this.delay[i] ?? 0) < (this.open ? OPEN_MS : CLOSE_MS)) settled = false;
      const p = this.progress(i, now);
      const slot = g.slots[i];
      const ring = g.rings[slot.ring];
      const ang = slot.base + (this.turn[slot.ring] ?? 0);
      const ox = ring.rx * Math.cos(ang);
      const oy = ring.ry * Math.sin(ang);
      const pile = pileSpot(i, n, g.icon);
      const x = pile.x + (ox - pile.x) * p;
      const y = pile.y + (oy - pile.y) * p;
      // Tiles nearer the bottom of a ring sit a touch larger and in front: a hint of depth.
      const scale = PILE_SCALE + (1 + 0.06 * Math.sin(ang) - PILE_SCALE) * p;
      el.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px) rotate(${pile.r * (1 - p)}deg) scale(${scale})`;
      el.style.zIndex = String(p > 0.5 ? 400 + Math.round(oy) : 1 + i);
    }
    return settled;
  }

  private tick = (now: number) => {
    const settled = this.paint(now);
    this.raf = this.visible && !settled ? requestAnimationFrame(this.tick) : 0;
  };

  private kick() {
    if (this.raf || !this.visible) return;
    this.raf = requestAnimationFrame(this.tick);
  }

  setStill(still: boolean) {
    this.still = still;
  }

  setTile(i: number, el: HTMLElement | null) {
    this.tiles[i] = el;
  }

  setGeo(geo: Geo) {
    this.geo = geo;
    this.paint(performance.now());
  }

  setVisible(visible: boolean) {
    this.visible = visible;
    this.kick();
  }

  get scattered() {
    return this.open;
  }

  // Flips between pile and scattered, picking up from wherever each tile is; returns the new state.
  toggle() {
    const now = performance.now();
    const n = this.geo?.slots.length ?? this.tiles.length;
    this.from = Array.from({ length: n }, (_, i) => this.progress(i, now));
    this.open = !this.open;
    if (this.open) this.turn = (this.geo?.rings ?? []).map(() => Math.random() * TAU);
    this.at = this.still ? now - 1e6 : now;
    // Tiles leave the pile in a random order and come back in a quick sweep.
    const order = Array.from({ length: n }, (_, i) => i).sort(() => Math.random() - 0.5);
    this.delay = Array.from({ length: n }, (_, i) => (this.open ? 60 + order.indexOf(i) * (420 / n) : i * 12));
    this.kick();
    return this.open;
  }

  stop() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }
}

// A ring of small dots flung out from the middle of the icon.
const sparks = (layer: HTMLElement) => {
  for (let i = 0; i < 14; i++) {
    const dot = document.createElement('span');
    const size = 3 + Math.random() * 4;
    Object.assign(dot.style, {
      position: 'absolute',
      left: '50%',
      top: '50%',
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: '9999px',
      background: 'rgba(17,17,17,.75)',
    });
    layer.appendChild(dot);
    const a = Math.random() * TAU;
    const d = 70 + Math.random() * 140;
    dot.animate(
      [
        { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
        { transform: `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d}px)) scale(0)`, opacity: 0 },
      ],
      { duration: 650 + Math.random() * 400, easing: BURST },
    ).onfinish = () => dot.remove();
  }
};

// The core at the center of the orbits: the GW monogram from the navbar, with a thin arc turning
// slowly around it.
const Core: React.FC = () => (
  <>
    {/* The spinning box is a span stretched by inset, so the arc turns around the core's exact
        center in every browser; an absolutely placed <svg> alone isn't stretched by Safari. */}
    <span aria-hidden className="stack-spin pointer-events-none absolute inset-[5px] sm:inset-[7px]">
      <svg viewBox="0 0 100 100" className="block w-full h-full" fill="none">
        <circle cx="50" cy="50" r="48" stroke="rgba(255,255,255,.18)" strokeWidth="1.6" />
        <circle cx="50" cy="50" r="48" stroke="#fff" strokeWidth="2.4" strokeDasharray="44 258" strokeLinecap="round" />
      </svg>
    </span>
    {/* The trademark hangs outside the text box so "GW" itself sits dead center. */}
    <span className="relative font-black tracking-[-0.07em] leading-none text-[20px] min-[380px]:text-[22px] sm:text-[28px] lg:text-[34px]">
      GW
      <span className="absolute left-full top-0 ml-[0.04em] text-[0.34em] font-bold tracking-normal">™</span>
    </span>
  </>
);

export const StackSection: React.FC<StackSectionProps> = ({ title, groups }) => {
  const items = groups.flatMap((g) => g.items);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const field = useRef<HTMLDivElement>(null);
  const icon = useRef<HTMLButtonElement>(null);
  const sparkLayer = useRef<HTMLSpanElement>(null);
  const shock = useRef<HTMLSpanElement>(null);
  const [orbit] = useState(() => new Orbit());

  // Scatters (with the burst) or gathers the stack; no-op if it's already that way.
  const setScattered = useCallback(
    (on: boolean) => {
      if (orbit.scattered === on) return;
      orbit.toggle();
      setOpen(on);
      if (!on) setActive(null);
      if (!on || reducedMotion()) return;
      icon.current?.animate(
        [{ transform: 'scale(1)' }, { transform: 'scale(.86)', offset: 0.25 }, { transform: 'scale(1.08)', offset: 0.6 }, { transform: 'scale(1)' }],
        { duration: 550, easing: 'ease-out' },
      );
      shock.current?.animate(
        [
          { transform: 'translate(-50%, -50%) scale(.5)', opacity: 0.35 },
          { transform: 'translate(-50%, -50%) scale(4.5)', opacity: 0 },
        ],
        { duration: 900, easing: BURST },
      );
      if (sparkLayer.current) sparks(sparkLayer.current);
    },
    [orbit],
  );

  // Geometry follows the field's size; the loop only runs while the section is on screen. The
  // stack scatters by itself once enough of it scrolls into view, and quietly gathers again once
  // it's fully off screen, so it bursts afresh every time the visitor comes back to it.
  useLayoutEffect(() => {
    const node = field.current;
    if (!node) return;
    orbit.setStill(reducedMotion());
    const sets = groups.map((g) => g.items);
    const remeasure = () => {
      orbit.setGeo(measure(node.clientWidth, node.clientHeight, orbit.tiles[0]?.offsetWidth ?? 64, icon.current?.offsetWidth ?? 112, sets));
    };
    remeasure();
    const ro = new ResizeObserver(remeasure);
    ro.observe(node);
    const io = new IntersectionObserver(
      ([e]) => {
        orbit.setVisible(e.isIntersecting);
        if (e.intersectionRatio >= AUTO_SCATTER_AT) setScattered(true);
        else if (!e.isIntersecting) setScattered(false);
      },
      { threshold: [0, AUTO_SCATTER_AT] },
    );
    io.observe(node);
    return () => {
      ro.disconnect();
      io.disconnect();
      orbit.stop();
    };
  }, [groups, orbit, setScattered]);

  const label = 'font-body-bold text-[11px] md:text-[12px]';

  return (
    <section id="stack" className="relative z-10 bg-white w-full px-5 md:px-10 pb-24 md:pb-36">
      <div className="max-w-[1200px] mx-auto">
        <BlurReveal split className="flex items-center justify-between pb-6 md:pb-8">
          <h2 className="font-body-bold text-[12px] md:text-[13px]">({title})</h2>
          <span className="font-body-bold text-[12px] md:text-[13px] text-black/40">{items.length} tools I build with</span>
        </BlurReveal>

        <div
          ref={field}
          onClick={(e) => e.target === e.currentTarget && setActive(null)}
          className="relative h-[440px] sm:h-[680px] lg:h-[720px]"
        >
          {/* Corner hints, shown once the stack is spread out; phones need that space for the logos */}
          <div
            className={`pointer-events-none absolute inset-x-5 top-5 md:inset-x-7 md:top-6 hidden sm:flex items-start justify-between gap-4 text-black/40 transition-opacity duration-500 ${open ? 'opacity-100' : 'opacity-0'}`}
          >
            <span className={label}>Hover a logo for its name</span>
            <span className={label}>Tap the center to gather</span>
          </div>

          <ul aria-label="Tech stack">
            {items.map((item, i) => {
              const on = active === item;
              return (
                <li
                  key={item}
                  ref={(el) => orbit.setTile(i, el)}
                  onPointerEnter={(e) => e.pointerType === 'mouse' && setActive(item)}
                  onPointerLeave={(e) => e.pointerType === 'mouse' && setActive(null)}
                  onClick={() => setActive(on ? null : item)}
                  className={`absolute left-1/2 top-1/2 will-change-transform ${open ? 'cursor-default' : 'pointer-events-none'}`}
                >
                  <span
                    className={`grid place-items-center w-9 h-9 min-[380px]:w-10 min-[380px]:h-10 sm:w-[52px] sm:h-[52px] lg:w-16 lg:h-16 transition-transform duration-300 ${on ? 'scale-115' : ''}`}
                  >
                    <BrandIcon
                      name={item}
                      className="w-7 h-7 min-[380px]:w-8 min-[380px]:h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 drop-shadow-[0_8px_14px_rgba(0,0,0,.14)]"
                    />
                  </span>
                  <span
                    className={`pointer-events-none absolute left-1/2 bottom-full mb-2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#111] px-2.5 py-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.02em] text-white transition-all duration-300 ${on ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}`}
                  >
                    {item}
                  </span>
                </li>
              );
            })}
          </ul>

          {/* The core: press to scatter the stack, press again to gather it */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[1000]">
            <span ref={shock} aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 w-28 h-28 rounded-full border border-black opacity-0" />
            <span ref={sparkLayer} aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 w-0 h-0" />
            {!open && <span aria-hidden className="stack-halo pointer-events-none absolute inset-0 rounded-full border-2 border-black" />}
            <button
              ref={icon}
              type="button"
              onClick={() => setScattered(!open)}
              aria-expanded={open}
              aria-label={open ? 'Gather my tech stack' : 'Explode my tech stack'}
              className="relative grid place-items-center w-16 h-16 min-[380px]:w-[72px] min-[380px]:h-[72px] sm:w-24 sm:h-24 lg:w-28 lg:h-28 rounded-full bg-[#111] text-white cursor-pointer shadow-[0_24px_48px_-16px_rgba(0,0,0,.55)] transition-transform duration-500 hover:scale-[1.04] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black"
            >
              <Core />
            </button>
            <span
              className={`pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-9 sm:mt-11 lg:mt-14 whitespace-nowrap flex flex-col items-center gap-1 transition-opacity duration-300 ${open ? 'opacity-0' : 'opacity-100'}`}
            >
              <span className="font-body-bold text-[12px]">Dev stack</span>
              <span className="text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.12em] text-black/45">Tap to explode</span>
            </span>
          </div>
        </div>

        {/* Names by group; the hovered logo's name lights up */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10 pt-8 md:pt-10">
          {groups.map((g, gi) => (
            <div key={g.label} className="border-t border-black/15 pt-4">
              <p className="flex gap-3 font-body-bold text-[12px]">
                <span className="text-black/35 tabular-nums">{String(gi + 1).padStart(2, '0')}</span>
                {g.label}
              </p>
              <p className="mt-3 text-[15px] leading-[1.7] text-black/45">
                {g.items.map((it, k) => (
                  <React.Fragment key={it}>
                    <span className={`transition-colors duration-300 ${active === it ? 'text-black' : ''}`}>{it}</span>
                    {k < g.items.length - 1 && ', '}
                  </React.Fragment>
                ))}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
