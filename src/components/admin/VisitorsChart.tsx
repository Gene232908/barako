import React, { useEffect, useRef, useState } from 'react';

export interface DayPoint {
  /** Local midnight of the day, ms. */
  day: number;
  visitors: number;
  sessions: number;
}

interface VisitorsChartProps {
  points: DayPoint[];
}

const LINE = '#2a78d6'; // validated: >= 3:1 on white
const GRID = '#ecebe8';
const HEIGHT = 220;
const PAD = { top: 18, right: 44, bottom: 26, left: 30 };

const dayLabel = (ms: number) => new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const fullDayLabel = (ms: number) =>
  new Date(ms).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

// Round the y-axis top up to a friendly number so gridlines land on whole visitors.
const niceMax = (v: number) => {
  if (v <= 4) return 4;
  const step = 10 ** Math.floor(Math.log10(v));
  return Math.ceil(v / (step / 2)) * (step / 2);
};

export const VisitorsChart: React.FC<VisitorsChartProps> = ({ points }) => {
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const node = wrap.current;
    if (!node) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  const n = points.length;
  const max = niceMax(Math.max(0, ...points.map((p) => p.visitors)));
  const innerW = Math.max(0, width - PAD.left - PAD.right);
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (n > 1 ? (i / (n - 1)) * innerW : innerW / 2);
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH;

  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.visitors).toFixed(1)}`).join('');
  const ticks = [0, max / 2, max];
  const labelEvery = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(innerW / 64))));
  const last = n - 1;

  const pick = (clientX: number) => {
    const node = wrap.current;
    if (!node || n === 0) return;
    const rel = clientX - node.getBoundingClientRect().left - PAD.left;
    setHover(Math.max(0, Math.min(last, Math.round((rel / Math.max(1, innerW)) * last))));
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    setHover((h) => Math.max(0, Math.min(last, (h ?? last) + (e.key === 'ArrowRight' ? 1 : -1))));
  };

  const active = hover !== null ? points[hover] : null;

  return (
    <div ref={wrap} className="relative w-full select-none" style={{ height: HEIGHT }}>
      {width > 0 && n > 0 && (
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          aria-label={`Visitors per day for the last ${n} days. Today: ${points[last].visitors}.`}
          tabIndex={0}
          className="block outline-none focus-visible:ring-2 focus-visible:ring-black/20 rounded-lg touch-pan-y"
          onPointerMove={(e) => pick(e.clientX)}
          onPointerDown={(e) => pick(e.clientX)}
          onPointerLeave={() => setHover(null)}
          onKeyDown={onKey}
          onBlur={() => setHover(null)}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={PAD.left + innerW} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth={1} />
              <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={10} fill="rgba(0,0,0,.4)">
                {Number.isInteger(t) ? t : t.toFixed(1)}
              </text>
            </g>
          ))}

          {points.map((p, i) =>
            i % labelEvery === 0 || i === last ? (
              <text
                key={p.day}
                x={x(i)}
                y={HEIGHT - 6}
                textAnchor={i === last ? 'end' : i === 0 ? 'start' : 'middle'}
                fontSize={10}
                fill="rgba(0,0,0,.4)"
              >
                {i === last ? 'Today' : dayLabel(p.day)}
              </text>
            ) : null,
          )}

          {hover !== null && (
            <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + innerH} stroke="rgba(0,0,0,.22)" strokeWidth={1} />
          )}

          <path d={path} fill="none" stroke={LINE} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

          {/* Today's value, labelled at the line's end */}
          <circle cx={x(last)} cy={y(points[last].visitors)} r={4} fill={LINE} stroke="#fff" strokeWidth={2} />
          <text x={x(last) + 9} y={y(points[last].visitors)} dy="0.32em" fontSize={11} fontWeight={700} fill="#111">
            {points[last].visitors}
          </text>

          {hover !== null && active && (
            <circle cx={x(hover)} cy={y(active.visitors)} r={5} fill={LINE} stroke="#fff" strokeWidth={2} />
          )}
        </svg>
      )}

      {hover !== null && active && (
        <div
          className="pointer-events-none absolute top-0 z-10 rounded-xl bg-white px-3 py-2 shadow-[0_8px_28px_-10px_rgba(0,0,0,.35)] ring-1 ring-black/5 whitespace-nowrap"
          style={{
            left: Math.min(Math.max(x(hover), 70), width - 70),
            transform: 'translateX(-50%)',
          }}
        >
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-[2px] rounded-full" style={{ background: LINE }} />
            <span className="text-[13px] font-bold tabular-nums text-black">
              {active.visitors} {active.visitors === 1 ? 'visitor' : 'visitors'}
            </span>
          </div>
          <div className="text-[11px] text-black/50 mt-0.5">
            {fullDayLabel(active.day)} · {active.sessions} {active.sessions === 1 ? 'visit' : 'visits'}
          </div>
        </div>
      )}
    </div>
  );
};
