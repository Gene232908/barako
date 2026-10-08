import React, { useState, useEffect } from 'react';
import { RollingLink } from './RollingLink';

interface NavbarProps {
  logoText: string;
  navLinks: { label: string; href: string }[];
}

export const Navbar: React.FC<NavbarProps> = ({
  logoText,
  navLinks,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Prevent background scrolling when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileMenuOpen]);

  return (
    <>
      {/* 
        Standard Header:
        Fixed at top of page with subtle ambient top gradient as shown in screenshot.
      */}
      <header className="fixed top-0 left-0 w-full z-50 bg-white/95 backdrop-blur-xs">
        {/* Subtle top shading gradient from Framer */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(180deg, rgba(0, 0, 0, 0.05) 0%, rgba(0, 0, 0, 0) 100%)',
          }}
        />

        <div className="relative max-w-[1440px] mx-auto px-5 sm:px-8 md:px-10 py-4 sm:py-5 flex items-center justify-between">
          {/* Brand Logo */}
          <a
            href="#"
            className="text-[14px] font-bold tracking-[-0.06em] uppercase text-black hover:opacity-75 transition-opacity"
          >
            {logoText}
          </a>

          {/* Desktop Nav Items (>= 1024px) */}
          <div className="hidden lg:flex items-center gap-6">
            <nav className="flex items-center gap-2">
              {navLinks.map((link) => (
                <RollingLink
                  key={link.label}
                  href={link.href}
                  label={link.label}
                />
              ))}
            </nav>
          </div>

          {/* Mobile / Tablet Menu Button (< 1024px) - Clean text without border box */}
          <div className="flex lg:hidden items-center">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="text-[14px] font-bold tracking-[-0.06em] uppercase text-black hover:opacity-70 transition-opacity cursor-pointer select-none"
              aria-label="Open mobile navigation menu"
            >
              MENU
            </button>
          </div>
        </div>
      </header>

      {/* 
        Dark Scrim Backdrop:
        Slower, calming fade in/out over 1.0s
      */}
      <div
        aria-hidden="true"
        onClick={() => setMobileMenuOpen(false)}
        className={`fixed inset-0 z-[90] bg-black/60 backdrop-blur-[2px] transition-opacity duration-1000 ease-out ${
          mobileMenuOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* 
        Physical Slide Drawer:
        Slower, ultra-smooth 1.1s slide-down and slide-up with synchronized opacity fade!
      */}
      <div
        role="dialog"
        aria-modal="true"
        className={`framer-slide-drawer text-white flex flex-col justify-between overflow-hidden ${
          mobileMenuOpen ? 'is-open' : ''
        }`}
      >
        {/* Ambient Top-to-Bottom Shading inside Drawer */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(180deg, rgba(30, 30, 30, 0.4) 0%, rgba(5, 5, 5, 0.98) 75%, rgba(0, 0, 0, 1) 100%)',
          }}
        />

        {/* Top Bar inside Drawer: Logo (Left) and Close (Right) */}
        <div className="relative z-10 w-full px-5 sm:px-8 md:px-10 py-4 sm:py-5 flex items-center justify-between">
          <a
            href="#"
            onClick={() => setMobileMenuOpen(false)}
            className="text-[14px] font-bold tracking-[-0.06em] uppercase text-white hover:opacity-75 transition-opacity"
          >
            {logoText}
          </a>

          {/* Close Button - Clean text without border box */}
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="text-[14px] font-bold tracking-[-0.06em] uppercase text-white hover:opacity-70 transition-opacity cursor-pointer select-none"
            aria-label="Close navigation menu"
          >
            CLOSE
          </button>
        </div>

        {/* 
          Center Links Area:
          Aligned to the right with huge 48px uppercase typography.
          Staggered entrance triggers gracefully as drawer lands!
        */}
        <nav className="relative z-10 flex flex-col items-end justify-center gap-4 sm:gap-6 px-6 sm:px-12 my-auto w-full">
          {navLinks.map((link, idx) => (
            <a
              key={link.label}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`font-footer-big text-white/90 hover:text-white transition-all transform hover:-translate-x-3 text-right font-medium tracking-[-0.06em] select-none ${
                mobileMenuOpen ? 'animate-drawer-link' : 'opacity-0'
              }`}
              style={{
                animationDelay: mobileMenuOpen ? `${450 + idx * 80}ms` : '0ms',
              }}
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Bottom Bar: Minimalist Footer info */}
        <div className="relative z-10 w-full px-6 sm:px-12 pb-8 pt-4 border-t border-white/10 flex items-center justify-between text-[11px] font-mono tracking-tight text-white/50 uppercase">
          <span>GENE WAGAS PORTFOLIO</span>
          <span>2026</span>
        </div>
      </div>
    </>
  );
};
