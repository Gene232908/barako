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
      <section className="relative md:fixed md:top-0 md:left-0 w-full min-h-[80vh] md:min-h-screen bg-white z-0 flex flex-col justify-center items-center px-3 sm:px-6 md:px-10 pt-24 md:pt-0 overflow-hidden">
        {/* Title & Subtext Wrapper: w-fit ensures the subtexts span the exact width of GENE WAGAS */}
        <div className="w-fit max-w-[94vw] flex flex-col items-center select-none">
          {/* 
            Main Title H1:
            overflow-hidden provides the vertical mask so characters emerge from beneath.
          */}
          <div className="overflow-hidden px-0.5">
            <h1
              className="font-hero-title text-black text-center whitespace-nowrap leading-[0.9] tracking-[-0.055em]"
              style={{ fontSize: 'clamp(2.85rem, 14.2vw, 8.5rem)' }}
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
            Mobile / Small Screens: Rotating role pinned to left ('G'), PORTFOLIO 2026 pinned to right ('S')
            Desktop / Wide Screens: All roles centered with wrap safety
          */}
          {/* Mobile view (< md) */}
          <div className="w-full flex md:hidden justify-between items-center gap-x-3 mt-2 sm:mt-2.5 px-0.5 animate-smooth-subtext">
            {/* Rotating Role (Left Column: lines up under first letter of GENE) */}
            <div className="h-[20px] sm:h-[24px] flex items-center overflow-hidden">
              <span
                className={`font-body-bold text-black text-[10px] min-[360px]:text-[11px] sm:text-[13px] leading-none whitespace-nowrap tracking-[-0.035em] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  isTransitioning
                    ? 'opacity-0 -translate-y-2'
                    : 'opacity-100 translate-y-0'
                }`}
              >
                {roles[currentRoleIdx]}
              </span>
            </div>

            {/* Portfolio Year (Right Column: lines up under the '6' of 2026 and 'S' of WAGAS) */}
            <span className="font-body-bold text-black text-[10px] min-[360px]:text-[11px] sm:text-[13px] leading-none whitespace-nowrap tracking-[-0.035em] text-right">
              PORTFOLIO 2026
            </span>
          </div>

          {/* Desktop / Medium / Bigger screens (>= md): Edge-to-edge ('dulo dulo') from 'G' of GENE to 'S' of WAGAS */}
          <div className="w-full hidden md:flex justify-between items-center mt-3 md:mt-4 px-0.5 animate-smooth-subtext">
            {roles.map((role, idx) => (
              <React.Fragment key={idx}>
                <span className="font-body-bold text-black text-[10.5px] md:text-[11px] lg:text-[12px] xl:text-[13px] 2xl:text-[14px] leading-none tracking-[-0.035em] whitespace-nowrap">
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
      </section>
    </>
  );
};
