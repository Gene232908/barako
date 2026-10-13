import React, { useState, useEffect, useRef } from 'react';
import type { ProjectItem } from '../types/portfolio';

interface WorksSectionProps {
  projects: ProjectItem[];
}

export const WorksSection: React.FC<WorksSectionProps> = ({ projects }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const [colorTheme, setColorTheme] = useState<'graphite' | 'titanium' | 'coral' | 'sage'>('graphite');
  const [manualOpen, setManualOpen] = useState<boolean | null>(null);

  // Track scroll position inside sticky works container
  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const totalScrollable = containerRef.current.offsetHeight - window.innerHeight;
      if (totalScrollable <= 0) return;

      const currentScroll = -rect.top;
      const progress = Math.min(Math.max(currentScroll / totalScrollable, 0), 1);
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fold angle d (180° = closed single phone, 0° = fully open flat dual-screen)
  // Stage 1 (0.00 to 0.35): Unfolds smoothly from 180° down to 0°
  // Stage 2 (0.35 to 0.85): Held flat open (0°), scrolls inner project contents
  // Stage 3 (0.85 to 1.00): Exit transition
  const foldAngle = (() => {
    if (manualOpen !== null) return manualOpen ? 0 : 180;
    if (scrollProgress <= 0.02) return 180;
    if (scrollProgress < 0.35) {
      const t = scrollProgress / 0.35;
      const eased = 1 - Math.pow(1 - t, 3); // smooth cubic ease out
      return Math.max(0, 180 * (1 - eased));
    }
    return 0;
  })();

  // Open ratio u: 0 = closed single phone, 1 = fully open dual-screen
  const openRatio = (180 - foldAngle) / 180;

  // Parallax separation & opacity for background typography: "PRO" // "JECTS"
  // As user scrolls, PRO moves further left, JECTS moves further right, and opacity fades out smoothly
  const parallaxX = scrollProgress * 260; // moves outward by up to 260px
  const textOpacity = Math.max(0, 1 - scrollProgress * 2.8);

  // Inner content scroll translation when open (0.35 to 0.85)
  const innerScrollY = (() => {
    if (manualOpen !== null) return manualOpen ? 260 : 0;
    if (scrollProgress <= 0.35) return 0;
    const t = Math.min((scrollProgress - 0.35) / 0.50, 1);
    return t * 560;
  })();

  // 3D Shadows & Lighting calculations
  const shadowOpacityOnBase = Math.sin((foldAngle * Math.PI) / 180) * 0.7;
  const creaseShadowLeft = foldAngle < 90 ? Math.pow(foldAngle / 90, 1.6) * 0.6 : 0;

  // Themes matching Foldfolio
  const themes = {
    graphite: {
      bg: '#e8e8e6',
      frame: '#262628',
      border: '#111112',
      button: '#38383c',
    },
    titanium: {
      bg: '#f4f3f0',
      frame: '#d8d5ce',
      border: '#a8a59f',
      button: '#bfbcb5',
    },
    coral: {
      bg: '#fbf5f2',
      frame: '#e8a593',
      border: '#c4664f',
      button: '#d17e6a',
    },
    sage: {
      bg: '#f3f5f0',
      frame: '#c3cbb7',
      border: '#76816b',
      button: '#a4ae96',
    },
  }[colorTheme];

  const handleUnfoldClick = () => {
    setManualOpen(true);
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const target = window.scrollY + rect.top + containerRef.current.offsetHeight * 0.4;
      window.scrollTo({ top: target, behavior: 'smooth' });
    }
  };

  // Dimensions of single phone panel
  const panelWidth = 440;
  const panelHeight = 680;

  // Center translation so the phone is 100% DEAD CENTERED when closed (openRatio=0),
  // and smoothly expands symmetrically as it opens (openRatio=1)
  const centerShiftX = -(1 - openRatio) * (panelWidth / 2);

  return (
    <section
      id="works"
      ref={containerRef}
      className="relative w-full min-h-[320vh] select-none transition-colors duration-500 overflow-clip"
      style={{ backgroundColor: themes.bg }}
    >
      {/* Sticky Viewport Stage: Phone is ALWAYS DEAD CENTERED */}
      <div className="sticky top-0 h-screen w-full flex items-center justify-center overflow-hidden">
        {/* Top Header Controls: Brand Logo & Color Dots */}
        <div className="absolute top-6 sm:top-8 left-6 sm:left-12 right-6 sm:right-12 z-50 flex items-center justify-between pointer-events-auto max-w-[1440px] mx-auto">
          <a
            href="#"
            className="font-black tracking-tight text-xl font-mono text-black hover:opacity-70 transition-opacity"
          >
            GW™
          </a>

          {/* Color Switcher Dots */}
          <div className="flex items-center gap-2 bg-black/5 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-black/10 shadow-sm">
            <button
              onClick={() => setColorTheme('graphite')}
              className={`w-4 h-4 rounded-full border transition-all cursor-pointer ${
                colorTheme === 'graphite' ? 'scale-125 border-black shadow' : 'border-transparent'
              }`}
              style={{ backgroundColor: '#262628' }}
              title="Graphite"
            />
            <button
              onClick={() => setColorTheme('titanium')}
              className={`w-4 h-4 rounded-full border transition-all cursor-pointer ${
                colorTheme === 'titanium' ? 'scale-125 border-black shadow' : 'border-transparent'
              }`}
              style={{ backgroundColor: '#D8D5CE' }}
              title="Titanium"
            />
            <button
              onClick={() => setColorTheme('coral')}
              className={`w-4 h-4 rounded-full border transition-all cursor-pointer ${
                colorTheme === 'coral' ? 'scale-125 border-black shadow' : 'border-transparent'
              }`}
              style={{ backgroundColor: '#E8A593' }}
              title="Coral"
            />
            <button
              onClick={() => setColorTheme('sage')}
              className={`w-4 h-4 rounded-full border transition-all cursor-pointer ${
                colorTheme === 'sage' ? 'scale-125 border-black shadow' : 'border-transparent'
              }`}
              style={{ backgroundColor: '#C3CBB7' }}
              title="Sage"
            />
          </div>
        </div>

        {/* ========================================================================= */}
        {/* HUGE SPLIT PARALLAX TYPOGRAPHY: "PRO" // "JECTS"                          */}
        {/* On scroll: PRO moves left, JECTS moves right, and opacity fades out!     */}
        {/* ========================================================================= */}
        <div className="absolute inset-0 flex items-center justify-between pointer-events-none px-4 sm:px-10 lg:px-20 z-0 select-none">
          {/* Left Word: PRO */}
          <h1
            className="font-hero-title font-black text-black leading-none tracking-[-0.07em] select-none whitespace-nowrap"
            style={{
              fontSize: 'clamp(5rem, 20vw, 19rem)',
              transform: `translateX(${-parallaxX}px)`,
              opacity: textOpacity,
              transition: 'transform 0.1s linear, opacity 0.15s linear',
            }}
          >
            PRO
          </h1>

          {/* Right Word: JECTS */}
          <h1
            className="font-hero-title font-black text-black leading-none tracking-[-0.07em] select-none whitespace-nowrap"
            style={{
              fontSize: 'clamp(5rem, 20vw, 19rem)',
              transform: `translateX(${parallaxX}px)`,
              opacity: textOpacity,
              transition: 'transform 0.1s linear, opacity 0.15s linear',
            }}
          >
            JECTS
          </h1>
        </div>

        {/* ========================================================================= */}
        {/* REAL 3D FOLDABLE PHONE (100% DEAD CENTERED)                               */}
        {/* Features true 3D perspective folding, dynamic lighting, and zero bugs!   */}
        {/* ========================================================================= */}
        <div className="relative z-10 flex items-center justify-center">
          {/* Realistic Elliptical Ground Shadow (Scales with open width) */}
          <div
            className="absolute -bottom-8 left-1/2 -translate-x-1/2 h-8 rounded-full blur-xl pointer-events-none transition-all duration-300"
            style={{
              width: `${panelWidth * (1 + openRatio)}px`,
              background:
                'radial-gradient(ellipse at center, rgba(0,0,0,0.32) 0%, rgba(0,0,0,0) 70%)',
            }}
          />

          {/* 3D Stage Container (Symmetrically Centered) */}
          <div
            className="relative flex items-center justify-center"
            style={{
              width: `${panelWidth * 2}px`,
              height: `${panelHeight}px`,
              perspective: '2600px',
              transformStyle: 'preserve-3d',
              transform: `translateX(${centerShiftX.toFixed(2)}px)`,
              transition: manualOpen !== null ? 'transform 0.8s cubic-bezier(0.16,1,0.3,1)' : 'none',
            }}
          >
            {/* --------------------------------------------------------------------- */}
            {/* 1. RIGHT PANEL (THE BASE / INNER RIGHT SCREEN)                        */}
            {/* Anchored on the right side of the hinge (left: 50%)                   */}
            {/* Covered by the folding leaf when closed (foldAngle = 180°)            */}
            {/* --------------------------------------------------------------------- */}
            <div
              className="absolute top-0 right-0 h-full rounded-r-[44px] overflow-hidden"
              style={{
                width: `${panelWidth}px`,
                backgroundColor: themes.frame,
                border: `3px solid ${themes.border}`,
                boxShadow:
                  '0 35px 85px rgba(0,0,0,0.18), 0 12px 32px rgba(0,0,0,0.08), inset 0 1px 2px rgba(255,255,255,0.4)',
              }}
            >
              {/* Physical Side Buttons on Right Edge */}
              <div
                className="absolute -right-[4px] top-28 w-[4px] h-12 rounded-r-sm transition-colors duration-500 shadow-sm"
                style={{ backgroundColor: themes.button }}
              />
              <div
                className="absolute -right-[4px] top-44 w-[4px] h-12 rounded-r-sm transition-colors duration-500 shadow-sm"
                style={{ backgroundColor: themes.button }}
              />
              <div
                className="absolute -right-[4px] top-64 w-[4px] h-16 rounded-r-sm transition-colors duration-500 shadow-sm"
                style={{ backgroundColor: themes.button }}
              />

              {/* Inner Right Screen Content */}
              <div className="relative w-full h-full p-1.5 bg-[#161618] flex overflow-hidden">
                <div className="relative w-full h-full rounded-r-[36px] bg-[#fdfbf9] overflow-hidden flex flex-col justify-between p-8">
                  {/* Status Bar Right */}
                  <div className="flex items-center justify-between text-xs font-mono font-medium text-black/60 pb-3 border-b border-black/5">
                    <span className="text-[10px] font-mono uppercase text-black/40">
                      SELECTED WORK
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span>5G</span>
                      <span>100% 🔋</span>
                    </div>
                  </div>

                  {/* Inner Right Showcase (Scrolls through projects) */}
                  <div
                    className="my-auto flex flex-col gap-4 transition-transform duration-300"
                    style={{
                      transform: `translateY(${-innerScrollY * 0.5}px)`,
                    }}
                  >
                    {projects.map((proj, idx) => (
                      <div
                        key={proj.id || idx}
                        className="relative w-full h-[280px] rounded-2xl overflow-hidden border border-black/10 group shadow-md shrink-0 bg-white"
                      >
                        <img
                          src={proj.imageUrl || `/images/project-${(idx % 3) + 1}.jpg`}
                          alt={proj.title}
                          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                          <div>
                            <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider">
                              0{idx + 1} // {proj.category}
                            </span>
                            <h3 className="text-xl font-bold text-white tracking-tight">
                              {proj.title}
                            </h3>
                          </div>
                          <span className="px-3 py-1 bg-white text-black text-xs font-mono font-bold rounded-full">
                            {proj.year || '2026'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Bottom Navigation Pill */}
                  <div className="pt-4 border-t border-black/5 flex items-center justify-center">
                    <div className="flex items-center gap-2 px-3 py-1 bg-black/5 rounded-full text-[11px] font-mono text-black/60">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>FOLIO EXPANDED // SCROLL TO BROWSE</span>
                    </div>
                  </div>

                  {/* Dynamic Drop Shadow Cast by the Swinging Leaf onto Base */}
                  <div
                    className="absolute inset-y-0 left-0 w-32 pointer-events-none transition-opacity duration-150"
                    style={{
                      background: 'linear-gradient(to right, rgba(0,0,0,0.65), transparent)',
                      opacity: shadowOpacityOnBase,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* --------------------------------------------------------------------- */}
            {/* 2. THE 3D FOLDING LEAF (THE LEFT FLAP)                                 */}
            {/* Anchored at the center hinge (transformOrigin: '100% 50%')            */}
            {/* Swings in 3D: Closed (rotateY: 180° on top of base) to Open (rotateY: 0°)*/}
            {/* --------------------------------------------------------------------- */}
            <div
              className="absolute top-0 left-0 h-full z-20"
              style={{
                width: `${panelWidth}px`,
                transformStyle: 'preserve-3d',
                transformOrigin: '100% 50%',
                // When foldAngle >= 90 (Cover visible): rotateY from 0° (closed) to -90° (half open)
                // When foldAngle < 90 (Inner visible): rotateY from 90° (half open) to 0° (flat open)
                transform:
                  foldAngle >= 90
                    ? `perspective(2600px) rotateY(${(foldAngle - 180).toFixed(2)}deg)`
                    : `perspective(2600px) rotateY(${foldAngle.toFixed(2)}deg)`,
                transition: manualOpen !== null ? 'transform 0.8s cubic-bezier(0.16,1,0.3,1)' : 'none',
              }}
            >
              {/* Outer Metallic Bezel of the Leaf */}
              <div
                className="relative w-full h-full rounded-[44px] overflow-hidden"
                style={{
                  backgroundColor: themes.frame,
                  border: `3px solid ${themes.border}`,
                  boxShadow:
                    foldAngle > 10
                      ? '0 25px 60px rgba(0,0,0,0.3), -10px 10px 40px rgba(0,0,0,0.2)'
                      : '0 35px 85px rgba(0,0,0,0.18)',
                }}
              >
                {/* Thin OLED Screen Border */}
                <div className="relative w-full h-full p-1.5 bg-[#161618] flex overflow-hidden">
                  {/* =============================================================== */}
                  {/* FACE 1: FRONT COVER LOCK SCREEN (VISIBLE WHEN foldAngle >= 90°) */}
                  {/* Facing forward at foldAngle = 180°! ZERO BLACK BUGS!             */}
                  {/* =============================================================== */}
                  {foldAngle >= 90 && (
                    <div
                      className="relative w-full h-full rounded-[36px] bg-[#f4f3f0] overflow-hidden flex flex-col justify-between p-6 cursor-pointer shadow-2xl"
                      onClick={handleUnfoldClick}
                    >
                      {/* Full-Bleed Wallpaper Photo Behind Screen Content */}
                      <img
                        src="/images/fold-portrait.jpg"
                        alt="Wallpaper Portrait"
                        className="absolute inset-0 w-full h-full object-cover object-top pointer-events-none select-none"
                      />

                      {/* Top Screen Area: Clock 14:32 & Subtitle */}
                      <div className="relative z-10 flex flex-col items-center pt-2 select-none">
                        <span className="text-6xl md:text-7xl font-black tracking-[-0.05em] text-[#0a0a0a] font-mono leading-none">
                          14:32
                        </span>
                        <span className="text-[13px] md:text-[14px] text-black/65 font-medium mt-2 tracking-tight">
                          Art director · Rotterdam
                        </span>
                      </div>

                      {/* Spacer to push notifications down over chest area */}
                      <div className="flex-1" />

                      {/* Lower Area: Frosted Glass Notification Cards */}
                      <div className="relative z-10 flex flex-col gap-2.5 pb-2">
                        {/* Notification 1: Rosso is live */}
                        <div className="rounded-2xl bg-white/75 backdrop-blur-2xl border border-white/90 shadow-[0_8px_20px_rgba(0,0,0,0.06)] p-3 flex items-center gap-3.5 transition-transform hover:scale-[1.01]">
                          <div className="w-10 h-10 rounded-xl overflow-hidden shadow-sm shrink-0 bg-black">
                            <img
                              src="/images/thumb-rosso.jpg"
                              alt="Rosso"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex flex-col text-left">
                            <span className="text-[13px] font-semibold text-black leading-tight">
                              Rosso is live
                            </span>
                            <span className="text-[10px] font-mono text-black/55 tracking-wider uppercase mt-0.5">
                              VELA MOTORS LAUNCH FILM · NOW
                            </span>
                          </div>
                        </div>

                        {/* Notification 2: Sole Study — shortlisted */}
                        <div className="rounded-2xl bg-white/75 backdrop-blur-2xl border border-white/90 shadow-[0_8px_20px_rgba(0,0,0,0.06)] p-3 flex items-center gap-3.5 transition-transform hover:scale-[1.01]">
                          <div className="w-10 h-10 rounded-xl overflow-hidden shadow-sm shrink-0 bg-amber-500">
                            <img
                              src="/images/thumb-shoe.jpg"
                              alt="Sole Study"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex flex-col text-left">
                            <span className="text-[13px] font-semibold text-black leading-tight">
                              Sole Study — shortlisted
                            </span>
                            <span className="text-[10px] font-mono text-black/55 tracking-wider uppercase mt-0.5">
                              ADC AWARDS 2026 · 2H AGO
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Bottom Action Row: Instagram Circle, Scroll to unfold Pill, X Circle */}
                      <div className="relative z-10 pt-2 flex items-center justify-between">
                        {/* Left: Instagram Button */}
                        <div className="w-11 h-11 rounded-full bg-white/85 backdrop-blur-md border border-white/90 shadow-sm flex items-center justify-center text-black/70 hover:text-black transition-colors">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                          </svg>
                        </div>

                        {/* Center: Scroll to unfold Pill */}
                        <button
                          onClick={handleUnfoldClick}
                          className="px-6 py-2.5 rounded-full bg-white/90 backdrop-blur-md border border-white/90 shadow-sm text-[12px] font-medium text-black tracking-tight hover:bg-black hover:text-white transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Scroll to unfold
                        </button>

                        {/* Right: X Button */}
                        <div className="w-11 h-11 rounded-full bg-white/85 backdrop-blur-md border border-white/90 shadow-sm flex items-center justify-center text-black/70 hover:text-black transition-colors">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* =============================================================== */}
                  {/* FACE 2: INNER LEFT DISPLAY (VISIBLE WHEN foldAngle < 90°)       */}
                  {/* Smoothly rotates down to 0° (flat dual-screen)                  */}
                  {/* =============================================================== */}
                  {foldAngle < 90 && (
                    <div className="relative w-full h-full rounded-l-[36px] bg-[#fdfbf9] border-r border-black/10 overflow-hidden flex flex-col justify-between p-8">
                      {/* Status Bar Left */}
                      <div className="flex items-center justify-between text-xs font-mono font-medium text-black/60 pb-3 border-b border-black/5">
                        <span>09:41</span>
                        <span className="text-[10px] uppercase tracking-wider text-black/40">
                          FULL STACK DEVELOPER
                        </span>
                      </div>

                      {/* Left Inner Page Body */}
                      <div
                        className="my-auto flex flex-col gap-5 transition-transform duration-300"
                        style={{
                          transform: `translateY(${-innerScrollY * 0.4}px)`,
                        }}
                      >
                        <p className="font-mono text-xs uppercase tracking-wider text-black/50">
                          DEVELOPER & IT SPECIALIST — PHILIPPINES
                        </p>

                        <h2 className="text-4xl lg:text-5xl font-black text-black tracking-[-0.05em] uppercase leading-none">
                          GENE WAGAS
                        </h2>

                        <p className="text-sm text-black/70 leading-relaxed font-normal max-w-[340px]">
                          I build custom websites, CRM platforms, and automated business workflows that deliver real value.
                        </p>

                        <div className="flex items-center gap-3 pt-2">
                          <a
                            href="#works"
                            className="px-5 py-2.5 bg-black text-white text-xs font-mono uppercase tracking-wider font-semibold rounded-full hover:bg-neutral-800 transition-colors flex items-center gap-1.5 shadow"
                          >
                            See the work <span>↗</span>
                          </a>
                          <a
                            href="#contact"
                            className="px-5 py-2.5 bg-black/5 hover:bg-black/10 text-black text-xs font-mono uppercase tracking-wider font-semibold rounded-full transition-colors"
                          >
                            Say hello
                          </a>
                        </div>
                      </div>

                      {/* Left Bottom Mini Details */}
                      <div className="pt-4 border-t border-black/5 flex items-center justify-between text-[11px] font-mono text-black/40">
                        <span>PHILIPPINES</span>
                        <span>PORTFOLIO 2026</span>
                      </div>

                      {/* Crease Shadow along Hinge on Left Panel */}
                      <div
                        className="absolute inset-y-0 right-0 w-24 pointer-events-none"
                        style={{
                          background: 'linear-gradient(to left, rgba(0,0,0,0.55), transparent)',
                          opacity: creaseShadowLeft,
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Center Metallic Hinge Seam Line (Active when unfolded) */}
            <div
              className="absolute inset-y-2 left-1/2 -translate-x-1/2 w-[2px] bg-black/25 z-30 pointer-events-none transition-opacity duration-200"
              style={{ opacity: foldAngle < 90 ? 0.7 : 0 }}
            />
          </div>
        </div>

        {/* Bottom Interactive Scroll Indicator */}
        <div className="absolute bottom-6 left-0 right-0 z-30 flex items-center justify-center pointer-events-none">
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/5 backdrop-blur-md border border-black/10 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-black/70">
              {foldAngle > 45 ? 'SCROLL DOWN TO UNFOLD 3D FOLIO' : 'DEVICE OPEN // BROWSE WORKS'}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
