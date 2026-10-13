import React, { useEffect, useRef, useState } from 'react';

// Math helpers
const NOW = () => performance.now();
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const E = {
  out: (t: number) => 1 - Math.pow(1 - t, 3),
  inOut: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  back: (t: number) => {
    const c1 = 1.7, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  lin: (t: number) => t,
};

const hexRgb = (h: string): [number, number, number] => {
  const clean = h.replace('#', '');
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
};

const rgba = (c: [number, number, number] | number[], a: number) =>
  `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

const mix = (
  a: [number, number, number],
  b: [number, number, number],
  t: number
): [number, number, number] => [
  lerp(a[0], b[0], t),
  lerp(a[1], b[1], t),
  lerp(a[2], b[2], t),
];

function rr(
  x: CanvasRenderingContext2D,
  X: number,
  Y: number,
  W: number,
  H: number,
  R: number
) {
  R = Math.max(0, Math.min(R, W / 2, H / 2));
  x.beginPath();
  x.moveTo(X + R, Y);
  x.arcTo(X + W, Y, X + W, Y + H, R);
  x.arcTo(X + W, Y + H, X, Y + H, R);
  x.arcTo(X, Y + H, X, Y, R);
  x.arcTo(X, Y, X + W, Y, R);
  x.closePath();
}

function heart(x: CanvasRenderingContext2D, s: number) {
  x.beginPath();
  x.moveTo(0, s * 0.38);
  x.bezierCurveTo(-s * 1.05, -s * 0.15, -s * 0.5, -s * 0.95, 0, -s * 0.38);
  x.bezierCurveTo(s * 0.5, -s * 0.95, s * 1.05, -s * 0.15, 0, s * 0.38);
  x.closePath();
}

function star(x: CanvasRenderingContext2D, ro: number, ri: number) {
  x.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? ri : ro;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    x.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  x.closePath();
}

/* Synthesized Web Audio Sound Library */
class SoundEngine {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  bus: GainNode | null = null;
  nb: AudioBuffer | null = null;
  enabled = true;

  init() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const c = (this.ctx = new AudioCtx());
    this.master = c.createGain();
    this.master.gain.value = 0.4;
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -18;
    this.master.connect(comp);
    comp.connect(c.destination);

    this.bus = c.createGain();
    this.bus.connect(this.master);

    const nb = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    this.nb = nb;
  }

  tone({
    f = 440,
    to = 0,
    d = 0.2,
    type = 'sine' as OscillatorType,
    g = 0.1,
    delay = 0,
    h = 0,
  }) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx || !this.bus) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const c = this.ctx;
    const t = c.currentTime + delay;
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (to) o.frequency.exponentialRampToValueAtTime(Math.max(1, to), t + d * 0.9);

    const gn = c.createGain();
    gn.gain.setValueAtTime(0.0001, t);
    gn.gain.exponentialRampToValueAtTime(g, t + 0.006);
    gn.gain.exponentialRampToValueAtTime(0.0001, t + d);

    o.connect(gn);
    gn.connect(this.bus);
    o.start(t);
    o.stop(t + d + 0.05);

    if (h) {
      const o2 = c.createOscillator();
      o2.frequency.setValueAtTime(f * h, t);
      const g2 = c.createGain();
      g2.gain.setValueAtTime(0.0001, t);
      g2.gain.exponentialRampToValueAtTime(g * 0.3, t + 0.006);
      g2.gain.exponentialRampToValueAtTime(0.0001, t + d * 0.35);
      o2.connect(g2);
      g2.connect(this.bus);
      o2.start(t);
      o2.stop(t + d);
    }
  }

  play(n: string) {
    if (!this.enabled) return;
    switch (n) {
      case 'pop':
        this.tone({ f: 480, to: 1150, d: 0.11, g: 0.06 });
        break;
      case 'love':
        this.tone({ f: 1046.5, d: 0.25, g: 0.05 });
        this.tone({ f: 1318.5, d: 0.4, g: 0.05, delay: 0.1 });
        break;
      case 'proud':
        [784, 988, 1175, 1568].forEach((f, i) =>
          this.tone({ f, d: 0.3, g: 0.04, delay: i * 0.05, h: 4 })
        );
        break;
      case 'wink':
        this.tone({ f: 1400, to: 1900, d: 0.09, g: 0.035 });
        break;
      case 'work':
        this.tone({ f: 880, d: 0.14, g: 0.03 });
        this.tone({ f: 1174.7, d: 0.18, g: 0.025, delay: 0.07 });
        break;
      case 'finish':
        this.tone({ f: 783.99, d: 0.4, g: 0.06, h: 4 });
        this.tone({ f: 1046.5, d: 0.6, g: 0.06, h: 4, delay: 0.1 });
        break;
      case 'yawn':
        this.tone({ f: 430, to: 250, d: 0.6, g: 0.04 });
        break;
      case 'blip':
      default:
        this.tone({ f: 1480, d: 0.07, g: 0.035 });
        break;
    }
  }
}

const Sound = new SoundEngine();

interface StateConfig {
  label: string;
  col: string;
  tint: number;
  eye: string;
  badge: [string, string] | null;
  glow: string;
  go: number;
  snd?: string;
  look?: [number, number];
  scan?: number;
  bounce?: number;
  tilt?: number;
  sweat?: number;
  breathe?: number;
  zz?: number;
}

const STATES: Record<string, StateConfig> = {
  working: {
    label: 'Working',
    col: '#3B9EFF',
    tint: 0.72,
    eye: 'pill',
    badge: ['dots', '#3B9EFF'],
    glow: '#3B9EFF',
    go: 0.55,
    snd: 'work',
  },
  idle: {
    label: 'Resting',
    col: '#E6E9EE',
    tint: 0,
    eye: 'pill',
    badge: null,
    glow: 'rgba(255,255,255,.35)',
    go: 0.25,
  },
  finished: {
    label: 'Done',
    col: '#34D399',
    tint: 0.35,
    eye: 'happy',
    badge: ['dot', '#34D399'],
    glow: '#34D399',
    go: 0.5,
    snd: 'finish',
  },
  thinking: {
    label: 'Thinking',
    col: '#8B5CF6',
    tint: 0.72,
    eye: 'pill',
    badge: ['dots', '#8B5CF6'],
    glow: '#8B5CF6',
    go: 0.5,
    look: [0.55, 0.55],
    snd: 'blip',
  },
  question: {
    label: 'Question',
    col: '#22D3EE',
    tint: 0.75,
    eye: 'pill',
    badge: ['q', '#22D3EE'],
    glow: '#22D3EE',
    go: 0.55,
    tilt: 0.17,
    snd: 'blip',
  },
  sleeping: {
    label: 'Sleeping',
    col: '#94A3B8',
    tint: 0.32,
    eye: 'closed',
    badge: null,
    glow: '#94A3B8',
    go: 0.2,
    breathe: 1,
    zz: 1,
    snd: 'yawn',
  },
};

const EMOTES: Record<string, { label: string; eye: string; snd: string; c: string }> = {
  love: { label: 'Love', eye: 'heart', snd: 'love', c: '#FF4D6D' },
  proud: { label: 'Proud', eye: 'star', snd: 'proud', c: '#F7B32B' },
  wink: { label: 'Wink', eye: 'wink', snd: 'wink', c: '#A78BFA' },
  yawn: { label: 'Yawn', eye: 'tired', snd: 'yawn', c: '#94A3B8' },
  happy: { label: 'Happy', eye: 'happy', snd: 'pop', c: '#34D399' },
};

// Coucou Mochi Character Geometry
const MOCHI_PISTE = {
  shape: 'mochi',
  eye: { w: 0.25, h: 0.27, sp: 0.37, p: -0.12 },
  base: ['#FFFAF5', '#DDCCBF'] as [string, string],
  ink: '#1A1412',
};

interface Particle {
  type: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  rot: number;
  sz: number;
}

interface AnimationTween {
  p: string;
  keys: [number, number, (t: number) => number][];
  i: number;
  from: number;
  t0: number;
  after?: () => void;
}

class CoucouRenderer {
  c: HTMLCanvasElement;
  x: CanvasRenderingContext2D;
  s: Record<string, number> = {
    yaw: 0,
    pitch: 0,
    roll: 0,
    tilt: 0,
    open: 1,
    sx: 1,
    sy: 1,
    oy: 0,
    ox: 0,
    tint: 0.72,
    morph: 0,
    hands: 0,
    blush: 0,
    es: 1,
    badgeS: 1,
  };
  tg: Record<string, number>;
  tw: AnimationTween[] = [];
  lock: Record<string, number> = {};
  col: [number, number, number] = [59, 158, 255];
  colT: [number, number, number] = [59, 158, 255];
  state = 'working';
  cfg = STATES.working;
  eyeOv: string | null = null;
  ovUntil = 0;
  badge: string | null = 'dots';
  badgeCol = '#3B9EFF';
  _bk = 'dots,#3B9EFF';
  _bt = 0;
  parts: Particle[] = [];
  nextBlink = NOW() + 2000;
  look = { x: 0, y: 0 };
  t0 = NOW();
  waveUntil = 0;
  lastAmb = 0;
  last = NOW();

  constructor(canvas: HTMLCanvasElement) {
    this.c = canvas;
    this.x = canvas.getContext('2d')!;
    this.tg = { ...this.s };
    this.initCanvasSize();
  }

  initCanvasSize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const px = 180;
    this.c.width = px * dpr;
    this.c.height = px * dpr;
  }

  anim(
    p: string,
    keys: [number, number, (t: number) => number][],
    after?: () => void
  ) {
    this.tw = this.tw.filter((t) => t.p !== p);
    this.tw.push({ p, keys, i: 0, from: this.s[p] ?? 0, t0: NOW(), after });
    this.lock[p] = 1;
  }

  setState(n: string) {
    if (!STATES[n]) return;
    this.state = n;
    const c = (this.cfg = STATES[n]);
    this.colT = hexRgb(c.col);
    this.tg.tint = c.tint;
    this.tg.tilt = c.tilt || 0;
    this.setBadge(c.badge);

    if (n === 'finished') {
      this.roll(950, 1);
      setTimeout(() => this.emit('spark', 5), 450);
    } else if (n === 'thinking') {
      this.anim('oy', [[-0.15, 180, E.out], [0, 320, E.back]]);
    }
    this.blink();
  }

  setBadge(b: [string, string] | null) {
    const key = b ? b.join() : 'none';
    if (key === this._bk) return;
    this._bk = key;
    const tok = ++this._bt;
    this.anim('badgeS', [[0, 90, E.inOut]]);
    setTimeout(() => {
      if (tok !== this._bt) return;
      this.badge = b ? b[0] : null;
      this.badgeCol = b ? b[1] : '#fff';
      if (b) this.anim('badgeS', [[1, 280, E.back]]);
    }, 100);
  }

  blink() {
    if (this.lock.open) return;
    this.anim('open', [[0.06, 70, E.inOut], [1, 130, E.out]]);
  }

  squash() {
    this.anim('sy', [[0.76, 70, E.out], [1.14, 130, E.out], [1, 170, E.inOut]]);
    this.anim('sx', [[1.18, 70, E.out], [0.94, 130, E.out], [1, 170, E.inOut]]);
  }

  roll(d = 900, turns = 1) {
    this.s.roll = 0;
    this.anim('roll', [[Math.PI * 2 * turns, d, E.inOut]], () => {
      this.s.roll = 0;
      this.tg.roll = 0;
    });
  }

  greet() {
    this.anim('hands', [[1, 280, E.back]]);
    this.waveUntil = NOW() + 1500;
    this.emote('happy', 1500);
    setTimeout(() => this.anim('hands', [[0, 240, E.inOut]]), 1550);
  }

  emote(n: string, d = 1800) {
    const em = EMOTES[n];
    if (!em) return;
    this.eyeOv = em.eye;
    this.ovUntil = NOW() + d;

    if (n === 'love') {
      this.anim('blush', [[1, 300, E.out], [1, d - 600, E.lin], [0, 300, E.inOut]]);
      this.emit('heart', 4);
      this.anim('oy', [[-0.1, 160, E.out], [0, 300, E.back]]);
    }
    if (n === 'proud') {
      this.emit('star', 5);
      this.anim('tilt', [[-0.14, 220, E.out], [-0.14, d - 500, E.lin], [0, 280, E.inOut]]);
    }
    if (n === 'wink') {
      this.anim('tilt', [[0.12, 160, E.out], [0.12, d - 400, E.lin], [0, 240, E.inOut]]);
    }
    if (n === 'yawn') {
      this.anim('sy', [[1.12, 500, E.inOut], [1, 500, E.inOut]]);
      this.anim('sx', [[0.94, 500, E.inOut], [1, 500, E.inOut]]);
      setTimeout(() => {
        this.eyeOv = 'closed';
        this.emit('z', 2);
      }, 650);
    }
    if (n === 'happy') {
      this.anim('blush', [[0.6, 200, E.out], [0, 600, E.inOut]]);
    }
    Sound.play(em.snd);
  }

  emit(type: string, n: number) {
    for (let i = 0; i < n; i++) {
      this.parts.push({
        type,
        x: (Math.random() - 0.5) * 0.9 + (type === 'z' ? 0.55 : 0),
        y: -0.7 - Math.random() * 0.2,
        vx: (Math.random() - 0.5) * 0.35 + (type === 'z' ? 0.18 : 0),
        vy: -(0.45 + Math.random() * 0.35),
        age: -i * 0.14,
        life: 1.3 + Math.random() * 0.5,
        rot: Math.random() * 6,
        sz: 0.15 + Math.random() * 0.08,
      });
    }
  }

  update() {
    const n = NOW();
    const dt = Math.min(0.05, (n - this.last) / 1000);
    this.last = n;
    const s = this.s;
    const tg = this.tg;
    const c = this.cfg;
    const t = (n - this.t0) / 1000;

    for (const tw of [...this.tw]) {
      const k = tw.keys[tw.i];
      const p = clamp((n - tw.t0) / k[1], 0, 1);
      s[tw.p] = tw.from + (k[0] - tw.from) * k[2](p);
      if (p >= 1) {
        tw.from = k[0];
        tw.i++;
        tw.t0 = n;
        if (tw.i >= tw.keys.length) {
          this.tw.splice(this.tw.indexOf(tw), 1);
          delete this.lock[tw.p];
          this.tg[tw.p] = tw.keys[tw.keys.length - 1][0];
          if (tw.after) tw.after();
        }
      }
    }

    let ty = this.look.x * 0.62;
    let tp = this.look.y * 0.5;
    if (c.look) {
      ty = ty * 0.35 + c.look[0] * 0.55;
      tp = tp * 0.3 + c.look[1] * 0.5;
    }
    if (c.scan) {
      ty = Math.sin(t * 2.6) * 0.6;
      tp = -0.06;
    }
    if (this.state === 'sleeping') {
      ty = 0;
      tp = -0.14;
    }

    tg.yaw = ty;
    tg.pitch = tp;
    tg.tilt = c.tilt || 0;
    tg.oy = c.bounce ? -Math.abs(Math.sin(t * 5.2)) * 0.07 : 0;
    tg.sy = c.breathe ? 1 + Math.sin(t * 1.8) * 0.035 : 1;
    tg.sx = c.breathe ? 1 - Math.sin(t * 1.8) * 0.02 : 1;

    const kLook = 1 - Math.pow(0.0025, dt);
    const kGen = 1 - Math.pow(0.0008, dt);
    for (const k in tg) {
      if (this.lock[k]) continue;
      s[k] += (tg[k] - s[k]) * (k === 'yaw' || k === 'pitch' ? kLook : kGen);
    }

    this.col = mix(this.col, this.colT, 1 - Math.pow(0.002, dt));

    if (n > this.nextBlink) {
      if (this.state !== 'sleeping') {
        this.blink();
        if (Math.random() < 0.22) setTimeout(() => this.blink(), 230);
      }
      this.nextBlink = n + 2200 + Math.random() * 3200;
    }

    if (this.eyeOv && n > this.ovUntil) this.eyeOv = null;
    if (n - this.lastAmb > 1300) {
      this.lastAmb = n;
      if (c.zz) this.emit('z', 1);
    }

    for (const p of this.parts) p.age += dt;
    this.parts = this.parts.filter((p) => p.age < p.life);
  }

  draw() {
    const x = this.x;
    const W = this.c.width;
    const H = this.c.height;
    const s = this.s;
    const P = MOCHI_PISTE;

    x.clearRect(0, 0, W, H);
    const R = W * 0.3;
    const rx = R * 1.14;
    const ry = R * 0.88;
    const cx = W / 2 + s.ox * R;
    const cy = H / 2 + s.oy * R + R * 0.06;

    x.save();
    x.translate(cx, cy);
    x.rotate(s.tilt);
    x.scale(s.sx, s.sy);

    // Mochi Path (superellipse)
    const path = new Path2D();
    for (let i = 0; i <= 72; i++) {
      const a = (i / 72) * Math.PI * 2;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      const px = rx * Math.sign(ca) * Math.pow(Math.abs(ca), 2 / 2.7);
      const py = ry * Math.sign(sa) * Math.pow(Math.abs(sa), 2 / 2.7);
      if (i) path.lineTo(px, py);
      else path.moveTo(px, py);
    }
    path.closePath();

    // Body shading
    const c0 = hexRgb(P.base[0]);
    const c1 = hexRgb(P.base[1]);
    const g = x.createLinearGradient(rx * 0.7, -ry * 0.85, -rx * 0.8, ry * 0.9);
    g.addColorStop(0, rgba(c0, 1));
    g.addColorStop(1, rgba(c1, 1));
    x.fillStyle = g;
    x.fill(path);

    // Subtle state tint
    if (s.tint > 0.01) {
      const tg2 = x.createLinearGradient(0, ry, 0, -ry * 0.25);
      tg2.addColorStop(0, rgba(this.col, 0.92 * s.tint));
      tg2.addColorStop(1, rgba(this.col, 0));
      x.fillStyle = tg2;
      x.fill(path);
    }

    // Specular highlight and shadow
    const sh = x.createRadialGradient(rx * 0.25, -ry * 0.32, R * 0.15, 0, 0, R * 1.25);
    sh.addColorStop(0, 'rgba(255,255,255,0)');
    sh.addColorStop(0.6, 'rgba(0,0,0,0)');
    sh.addColorStop(1, 'rgba(0,0,0,.2)');
    x.fillStyle = sh;
    x.fill(path);

    const hl = x.createRadialGradient(rx * 0.34, -ry * 0.46, 0, rx * 0.34, -ry * 0.46, R * 0.42);
    hl.addColorStop(0, 'rgba(255,255,255,.55)');
    hl.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = hl;
    x.fill(path);

    // Blush
    const bl = Math.max(s.blush, 0.35);
    if (bl > 0.01) {
      x.save();
      x.clip(path);
      const yo = Math.sin(s.yaw) * rx * 0.8;
      x.fillStyle = `rgba(255,120,150,${0.5 * bl})`;
      for (const sd of [-1, 1]) {
        x.beginPath();
        x.ellipse(sd * rx * 0.55 + yo, ry * 0.2, R * 0.17, R * 0.1, 0, 0, Math.PI * 2);
        x.fill();
      }
      x.restore();
    }

    // Eyes
    x.save();
    x.clip(path);
    x.fillStyle = P.ink;
    x.strokeStyle = P.ink;
    const shape = this.eyeOv || this.cfg.eye;
    for (const sd of [-1, 1]) {
      const yaw = sd * P.eye.sp + s.yaw;
      let pitch = P.eye.p + s.pitch + s.roll;
      pitch = (((pitch + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
      const cp = Math.cos(pitch);
      if (Math.cos(yaw) * cp < 0.04) continue;
      const px = Math.sin(yaw) * cp * rx;
      const py = -Math.sin(pitch) * ry;
      const fx = Math.max(0.18, Math.cos(yaw));
      const fy = Math.max(0.18, cp);
      x.save();
      x.translate(px, py);
      x.scale(fx, fy);
      this.drawEye(shape, R * P.eye.w * s.es, R * P.eye.h * s.es, s.open, sd);
      x.restore();
    }
    x.restore();
    x.restore();

    // Waving Hands
    if (s.hands > 0.01) {
      const hr = R * 0.2 * s.hands;
      const tt = NOW() / 1000;
      for (const sd of [-1, 1]) {
        let hx = cx + sd * rx * 1.25 * s.sx;
        let hy = cy + ry * 0.42;
        if (sd === 1 && NOW() < this.waveUntil) {
          hy -= R * 0.38 + Math.sin(tt * 13) * R * 0.16;
          hx += Math.cos(tt * 13) * R * 0.06;
        }
        const g2 = x.createLinearGradient(hx + hr, hy - hr, hx - hr, hy + hr);
        g2.addColorStop(0, rgba(c0, 1));
        g2.addColorStop(1, rgba(c1, 1));
        x.fillStyle = g2;
        x.beginPath();
        x.arc(hx, hy, hr, 0, Math.PI * 2);
        x.fill();
      }
    }

    // Badge (Notification icon e.g. blue dots from user's image)
    if (this.badge && s.badgeS > 0.01) {
      const bs = s.badgeS;
      const bx = cx - rx * 0.76 * s.sx;
      const by = cy - ry * 0.72 * s.sy;
      x.save();
      x.translate(bx, by);
      x.scale(bs, bs);
      const bcol = this.badgeCol;

      if (this.badge === 'dots') {
        const w = R * 0.74, h = R * 0.42;
        x.fillStyle = '#000';
        rr(x, -w / 2 - R * 0.07, -h / 2 - R * 0.07, w + R * 0.14, h + R * 0.14, (h + R * 0.14) / 2);
        x.fill();
        x.fillStyle = bcol;
        rr(x, -w / 2, -h / 2, w, h, h / 2);
        x.fill();

        // Pulsing dots
        const tt = NOW() / 1000;
        for (let i = 0; i < 3; i++) {
          const ph = (((tt * 2.4 - i * 0.22) % 1) + 1) % 1;
          const r = R * 0.06 * (1 + 0.4 * Math.max(0, Math.sin(ph * Math.PI * 2)));
          x.fillStyle = 'rgba(255,255,255,0.95)';
          x.beginPath();
          x.arc((i - 1) * R * 0.19, 0, r, 0, Math.PI * 2);
          x.fill();
        }
      } else if (this.badge === 'q') {
        x.fillStyle = '#000';
        x.beginPath();
        x.arc(0, 0, R * 0.3, 0, Math.PI * 2);
        x.fill();
        x.fillStyle = bcol;
        x.beginPath();
        x.arc(0, 0, R * 0.23, 0, Math.PI * 2);
        x.fill();
        x.fillStyle = '#fff';
        x.font = `800 ${R * 0.32}px -apple-system,system-ui,sans-serif`;
        x.textAlign = 'center';
        x.textBaseline = 'middle';
        x.fillText('?', 0, R * 0.02);
      } else {
        x.fillStyle = '#000';
        x.beginPath();
        x.arc(0, 0, R * 0.2, 0, Math.PI * 2);
        x.fill();
        x.fillStyle = bcol;
        x.beginPath();
        x.arc(0, 0, R * 0.135, 0, Math.PI * 2);
        x.fill();
      }
      x.restore();
    }

    // Particles (hearts, stars, zzz)
    for (const p of this.parts) {
      if (p.age < 0) continue;
      const k = p.age / p.life;
      const a = k < 0.2 ? k / 0.2 : 1 - (k - 0.2) / 0.8;
      const px = cx + (p.x + p.vx * p.age) * R * 1.3;
      const py = cy + (p.y + p.vy * p.age) * R * 1.3;
      const sz = R * p.sz * (1 + k * 0.4);

      x.save();
      x.translate(px, py);
      x.globalAlpha = clamp(a, 0, 1);

      if (p.type === 'heart') {
        x.fillStyle = '#FF4D6D';
        x.rotate(Math.sin(p.age * 6) * 0.3);
        heart(x, sz);
        x.fill();
      } else if (p.type === 'star') {
        x.fillStyle = '#F7B32B';
        x.rotate(p.rot + p.age * 2);
        star(x, sz, sz * 0.45);
        x.fill();
      } else if (p.type === 'spark') {
        x.fillStyle = '#fff';
        x.rotate(p.rot);
        star(x, sz * 0.8, sz * 0.18);
        x.fill();
      } else if (p.type === 'z') {
        x.fillStyle = 'rgba(18,20,24,0.85)';
        x.font = `700 ${sz * 1.8}px sans-serif`;
        x.fillText('z', 0, 0);
      }
      x.restore();
    }
  }

  drawEye(shape: string, w: number, h: number, open: number, sd: number) {
    const x = this.x;
    const t = NOW() / 1000;
    switch (shape) {
      case 'pill': {
        const hh = Math.max(h * open, w * 0.3);
        rr(x, -w / 2, -hh / 2, w, hh, Math.min(w / 2, hh / 2));
        x.fill();
        break;
      }
      case 'dot':
        x.beginPath();
        x.arc(0, 0, w * 0.45, 0, Math.PI * 2);
        x.fill();
        break;
      case 'happy':
        x.lineWidth = w * 0.5;
        x.lineCap = 'round';
        x.beginPath();
        x.arc(0, h * 0.18, w * 0.82, Math.PI * 1.12, Math.PI * 1.88);
        x.stroke();
        break;
      case 'closed':
        x.lineWidth = w * 0.36;
        x.lineCap = 'round';
        x.beginPath();
        x.arc(0, -h * 0.08, w * 0.78, Math.PI * 0.15, Math.PI * 0.85);
        x.stroke();
        break;
      case 'heart':
        x.fillStyle = '#FF4D6D';
        heart(x, w * 1.2);
        x.fill();
        x.fillStyle = MOCHI_PISTE.ink;
        break;
      case 'star':
        x.fillStyle = '#F7B32B';
        x.rotate(t * 1.5 * sd);
        star(x, w * 1.05, w * 0.46);
        x.fill();
        x.fillStyle = MOCHI_PISTE.ink;
        break;
      case 'tired':
        rr(x, -w / 2, -h * 0.02, w, h * 0.38, w / 2);
        x.fill();
        rr(x, -w * 0.62, -h * 0.1, w * 1.24, w * 0.22, w * 0.11);
        x.fill();
        break;
      case 'wink':
        if (sd < 0) {
          rr(x, -w / 2, -h / 2, w, h, w / 2);
          x.fill();
        } else {
          x.lineWidth = w * 0.5;
          x.lineCap = 'round';
          x.beginPath();
          x.arc(0, h * 0.18, w * 0.82, Math.PI * 1.12, Math.PI * 1.88);
          x.stroke();
        }
        break;
      default:
        rr(x, -w / 2, -h / 2, w, h, w / 2);
        x.fill();
    }
  }
}

export const CoucouCompanion: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const botRef = useRef<CoucouRenderer | null>(null);
  const [isOpenMenu, setIsOpenMenu] = useState(false);
  const [currentState, setCurrentState] = useState('working');
  const [speech, setSpeech] = useState<string>('Coucou is active!');
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;
    const bot = new CoucouRenderer(canvasRef.current);
    botRef.current = bot;
    bot.setState('working');

    // Pointer move listener to track cursor eyes
    const onPointerMove = (e: PointerEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / (window.innerWidth / 2);
      const dy = (e.clientY - cy) / (window.innerHeight / 2);
      bot.look.x = clamp(dx, -1, 1);
      bot.look.y = clamp(dy, -1, 1);
    };

    window.addEventListener('pointermove', onPointerMove);

    // Main 60fps render loop
    let reqId: number;
    const loop = () => {
      bot.update();
      bot.draw();
      reqId = requestAnimationFrame(loop);
    };
    reqId = requestAnimationFrame(loop);

    // Initial greeting after 1.5s
    const greetTimer = setTimeout(() => {
      bot.greet();
      setSpeech("Hi! I'm Coucou, Gene's AI Companion 👋");
    }, 1500);

    return () => {
      cancelAnimationFrame(reqId);
      window.removeEventListener('pointermove', onPointerMove);
      clearTimeout(greetTimer);
    };
  }, []);

  const handleClickCoucou = () => {
    if (!botRef.current) return;
    botRef.current.squash();
    Sound.play('pop');
    setIsOpenMenu((prev) => !prev);
    setSpeech("Tap my emotions to change how I feel!");
  };

  const handleSetState = (st: string) => {
    if (!botRef.current) return;
    botRef.current.setState(st);
    setCurrentState(st);
    Sound.play(STATES[st]?.snd || 'blip');

    switch (st) {
      case 'working':
        setSpeech("Keeping an eye on Gene's code 🤖");
        break;
      case 'finished':
        setSpeech("All tasks approved and finished! 🎉");
        break;
      case 'thinking':
        setSpeech("Deep thinking with Claude & Gemini...");
        break;
      case 'sleeping':
        setSpeech("Zzz... resting until next prompt...");
        break;
      case 'question':
        setSpeech("Need a code review or quick approval?");
        break;
      default:
        setSpeech(`Status: ${st}`);
    }
  };

  const handleEmote = (em: string) => {
    if (!botRef.current) return;
    botRef.current.emote(em);
    switch (em) {
      case 'love':
        setSpeech("Coucou loves this project! ❤️");
        break;
      case 'proud':
        setSpeech("Proud of Gene's work! 🌟");
        break;
      case 'wink':
        setSpeech("Let's build something epic! 😉");
        break;
      case 'yawn':
        setSpeech("Taking a little coffee break... ☕");
        break;
      default:
        break;
    }
  };

  const handleGreet = () => {
    if (!botRef.current) return;
    botRef.current.greet();
    Sound.play('pop');
    setSpeech("Hello there! Welcome to Gene's Portfolio 👋");
  };

  const toggleSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    Sound.enabled = !Sound.enabled;
    setIsMuted(!Sound.enabled);
  };

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 select-none flex flex-col items-end pointer-events-auto">
      {/* Speech Bubble */}
      {speech && (
        <div className="mb-2 bg-black/90 text-white text-[11px] sm:text-[12px] font-medium tracking-tight px-3 py-1.5 rounded-full shadow-lg border border-white/10 animate-fade-in-up flex items-center gap-2 max-w-[240px]">
          <span className="truncate">{speech}</span>
          <button
            onClick={() => setSpeech('')}
            className="text-white/40 hover:text-white text-xs leading-none cursor-pointer"
            aria-label="Dismiss speech bubble"
          >
            ✕
          </button>
        </div>
      )}

      {/* Emotion Control Toolbar (Appears when toggled or expanded) */}
      {isOpenMenu && (
        <div className="mb-2 p-2 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-black/10 flex flex-col gap-1.5 animate-fade-in-up">
          <div className="text-[10px] font-bold uppercase tracking-wider text-black/50 px-1 flex items-center justify-between">
            <span>Coucou Emotions</span>
            <button
              onClick={toggleSound}
              className="text-[10px] text-black/60 hover:text-black cursor-pointer lowercase"
            >
              {isMuted ? '🔇 sound off' : '🔊 sound on'}
            </button>
          </div>

          {/* Quick Emotion Pills */}
          <div className="grid grid-cols-4 gap-1">
            <button
              onClick={() => handleSetState('working')}
              className={`px-2 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                currentState === 'working'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'bg-black/5 hover:bg-black/10 text-black'
              }`}
              title="Working (Blue Dots Badge)"
            >
              🤖 Work
            </button>
            <button
              onClick={() => handleEmote('love')}
              className="px-2 py-1 rounded-lg text-xs font-medium bg-black/5 hover:bg-pink-100 text-black cursor-pointer transition-all"
              title="Love Heart Eyes"
            >
              ❤️ Love
            </button>
            <button
              onClick={() => handleEmote('proud')}
              className="px-2 py-1 rounded-lg text-xs font-medium bg-black/5 hover:bg-amber-100 text-black cursor-pointer transition-all"
              title="Proud Star Eyes"
            >
              🌟 Star
            </button>
            <button
              onClick={() => handleEmote('wink')}
              className="px-2 py-1 rounded-lg text-xs font-medium bg-black/5 hover:bg-purple-100 text-black cursor-pointer transition-all"
              title="Wink"
            >
              😉 Wink
            </button>
            <button
              onClick={() => handleSetState('finished')}
              className={`px-2 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                currentState === 'finished'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'bg-black/5 hover:bg-black/10 text-black'
              }`}
              title="Finished & Celebrate"
            >
              🎉 Done
            </button>
            <button
              onClick={() => handleSetState('thinking')}
              className={`px-2 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                currentState === 'thinking'
                  ? 'bg-purple-500 text-white shadow-sm'
                  : 'bg-black/5 hover:bg-black/10 text-black'
              }`}
              title="Thinking"
            >
              💭 Think
            </button>
            <button
              onClick={() => handleSetState('sleeping')}
              className={`px-2 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                currentState === 'sleeping'
                  ? 'bg-slate-500 text-white shadow-sm'
                  : 'bg-black/5 hover:bg-black/10 text-black'
              }`}
              title="Sleeping Zzz"
            >
              💤 Sleep
            </button>
            <button
              onClick={handleGreet}
              className="px-2 py-1 rounded-lg text-xs font-medium bg-black/5 hover:bg-blue-100 text-black cursor-pointer transition-all"
              title="Wave Hands"
            >
              👋 Wave
            </button>
          </div>
        </div>
      )}

      {/* Coucou Interactive Character Canvas Bubble */}
      <div
        onClick={handleClickCoucou}
        className="group relative cursor-pointer flex items-center justify-center p-1 rounded-3xl bg-white/80 hover:bg-white backdrop-blur-md shadow-2xl border border-black/10 hover:border-black/30 transition-all duration-300 transform hover:scale-105 active:scale-95"
        style={{ width: '84px', height: '84px' }}
        title="Click to interact with Coucou!"
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full block"
          style={{ width: '76px', height: '76px' }}
        />

        {/* Mini interactive hint tooltip on hover */}
        <span className="absolute -top-7 right-0 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white text-[9px] px-2 py-0.5 rounded-full pointer-events-none whitespace-nowrap">
          Click me!
        </span>
      </div>
    </div>
  );
};
