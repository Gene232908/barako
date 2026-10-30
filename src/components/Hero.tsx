import React, { useState, useEffect } from 'react';

interface HeroProps {
  fullName: string;
  roles: string[];
}

export const Hero: React.FC<HeroProps> = ({
  fullName,
  roles,
}) => {
  // Split name into words so we keep words grouped and wrap-safe
  const words = fullName.split(' ');
  let charCounter = 0;

  // Smoothly rotate through roles one at a time every 3 seconds (3000ms)
  const [currentRoleIdx, setCurrentRoleIdx] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (!roles || roles.length <= 1) return;

    const interval = setInterval(() => {
      // 1. Fade out and slide up current role
      setIsTransitioning(true);

      // 2. After 300ms, change to next role and glide in
      setTimeout(() => {
        setCurrentRoleIdx((prev) => (prev + 1) % roles.length);
        setIsTransitioning(false);
      }, 300);
    }, 3000);

    return () => clearInterval(interval);
  }, [roles]);

  return (
    <>
      {/* 
        Hero Helper spacer in normal flow:
        Occupies 100vh on desktop so content below doesn't overlap the fixed hero initially.
      */}
      <div className="w-full h-screen hidden md:block" aria-hidden="true" />

      {/* 
        Hero Section:
        Fixed at z-0 on desktop so the next section rolls up over it.
        Relative on mobile for smooth scrolling.
      */}
      <section className="relative md:fixed md:top-0 md:left-0 w-full min-h-[80vh] md:min-h-screen bg-white z-0 flex flex-col justify-center items-center px-4 sm:px-6 md:px-10 pt-24 md:pt-0 overflow-hidden">
        {/* Title & Subtext Wrapper */}
        <div className="w-full max-w-[94vw] flex flex-col items-center select-none">
          {/* 
            Main Title H1:
            px-2 prevents any glyph clipping.
            overflow-hidden provides the vertical mask so characters emerge from beneath.
          */}
          <div className="overflow-hidden px-1 sm:px-2 md:px-3">
            <h1
              className="font-hero-title text-black text-center whitespace-nowrap leading-[0.9] tracking-[-0.055em]"
              style={{ fontSize: 'clamp(2.5rem, 11.5vw, 8.25rem)' }}
            >
              {words.map((word, wordIdx) => {
                const wordElement = (
                  <span
                    key={wordIdx}
                    className="inline-block whitespace-nowrap"
                  >
                    {word.split('').map((char) => {
                      const currentCharIdx = charCounter++;
                      // Starts at 80ms, steps by 50ms per letter for a leisurely, luxurious wave
                      const delayMs = 80 + currentCharIdx * 50;

                      return (
                        <span
                          key={currentCharIdx}
                          className="animate-hero-char"
                          style={{
                            animationDelay: `${delayMs}ms`,
                          }}
                        >
                          {char}
                        </span>
                      );
                    })}
                  </span>
                );

                return (
                  <React.Fragment key={wordIdx}>
                    {wordElement}
                    {wordIdx < words.length - 1 && (
                      <span className="inline-block">&nbsp;</span>
                    )}
                  </React.Fragment>
                );
              })}
            </h1>
          </div>

          {/* 
            Subtexts: 
            Mobile / Small Screens: Rotating role on left + PORTFOLIO 2026 on right with guaranteed gap
            Desktop / Wide Screens: All roles centered with wrap safety
          */}
          {/* Mobile view (< md) */}
          <div className="w-full max-w-[min(92vw,440px)] flex md:hidden justify-between items-center gap-x-4 sm:gap-x-6 mt-2.5 sm:mt-3 px-1 sm:px-2 animate-smooth-subtext">
            {/* Rotating Role (Left Column) */}
            <div className="h-[20px] sm:h-[24px] flex items-center overflow-hidden shrink min-w-0">
              <span
                className={`font-body-bold text-black text-[10px] min-[360px]:text-[11px] sm:text-[13px] leading-none whitespace-nowrap tracking-[-0.04em] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  isTransitioning
                    ? 'opacity-0 -translate-y-2'
                    : 'opacity-100 translate-y-0'
                }`}
              >
                {roles[currentRoleIdx]}
              </span>
            </div>

            {/* Portfolio Year (Right Column) */}
            <span className="font-body-bold text-black text-[10px] min-[360px]:text-[11px] sm:text-[13px] leading-none whitespace-nowrap tracking-[-0.04em] text-right shrink-0">
              PORTFOLIO 2026
            </span>
          </div>

          {/* Desktop / Medium / Bigger screens (>= md): Centered roles, wraps gracefully on intermediate widths */}
          <div className="w-full max-w-[94vw] hidden md:flex justify-center items-center mt-3 md:mt-4 px-2 sm:px-4 animate-smooth-subtext">
            {/* All Roles Centered with wrap safety */}
            <div className="flex flex-wrap items-center justify-center gap-x-2 lg:gap-x-2.5 xl:gap-x-3 gap-y-1">
              {roles.map((role, idx) => (
                <React.Fragment key={idx}>
                  <span className="font-body-bold text-black text-[10px] md:text-[11px] lg:text-[12px] xl:text-[13px] 2xl:text-[14px] leading-none tracking-[-0.04em] whitespace-nowrap">
                    {role}
                  </span>
                  {idx < roles.length - 1 && (
                    <span className="text-black/30 font-normal select-none" aria-hidden="true">
                      •
                    </span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
};
