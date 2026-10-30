import React from 'react';
import {
  siCss,
  siFirebase,
  siGit,
  siGithub,
  siGoogleappsscript,
  siHtml5,
  siJavascript,
  siMysql,
  siNextdotjs,
  siNodedotjs,
  siPhp,
  siReact,
  siSupabase,
  siTailwindcss,
  siTypescript,
  siVercel,
  siXampp,
} from 'simple-icons';

type SimpleIcon = { path: string; hex: string };

// Tech names (as written in portfolioData) -> Simple Icons logo, drawn in the brand's own color.
const SIMPLE: Record<string, SimpleIcon> = {
  'Next.js': siNextdotjs,
  React: siReact,
  TypeScript: siTypescript,
  'Tailwind CSS': siTailwindcss,
  HTML: siHtml5,
  CSS: siCss,
  PHP: siPhp,
  'Node.js': siNodedotjs,
  MySQL: siMysql,
  Supabase: siSupabase,
  Git: siGit,
  GitHub: siGithub,
  'Google Apps Script': siGoogleappsscript,
  Vercel: siVercel,
  XAMPP: siXampp,
};

// Logos Simple Icons lacks or only has in one color, drawn by hand in their official colors.
const CUSTOM: Record<string, (id: string) => React.ReactNode> = {
  // The JS square's letters are cut out; a black backing gives the real black-on-yellow logo.
  JavaScript: () => (
    <>
      <rect x="2" y="2" width="20" height="20" fill="#000" />
      <path d={siJavascript.path} fill={`#${siJavascript.hex}`} />
    </>
  ),
  // Firebase's flame runs yellow to orange.
  Firebase: (id) => (
    <>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFC400" />
          <stop offset=".55" stopColor="#FF9100" />
          <stop offset="1" stopColor={`#${siFirebase.hex}`} />
        </linearGradient>
      </defs>
      <path d={siFirebase.path} fill={`url(#${id})`} />
    </>
  ),
  Figma: () => (
    <g transform="translate(4 0) scale(.42)">
      <path d="M19 0H9.5a9.5 9.5 0 0 0 0 19H19Z" fill="#F24E1E" />
      <path d="M19 0h9.5a9.5 9.5 0 0 1 0 19H19Z" fill="#FF7262" />
      <path d="M19 19H9.5a9.5 9.5 0 0 0 0 19H19Z" fill="#A259FF" />
      <circle cx="28.5" cy="28.5" r="9.5" fill="#1ABCFE" />
      <path d="M19 38H9.5a9.5 9.5 0 1 0 9.5 9.5Z" fill="#0ACF83" />
    </g>
  ),
  // Java's steaming cup.
  Java: () => (
    <>
      <path d="M12.6 1.8c1.7 1.8-2 3.1-.3 5.1M9.4 4.2c1.1 1.3-1.3 2.2-.2 3.5" fill="none" stroke="#E76F00" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M4.5 10h12v4.6A4.9 4.9 0 0 1 11.6 19.5h-2.2A4.9 4.9 0 0 1 4.5 14.6Z" fill="#5382A1" />
      <path d="M16.5 11.3h1.4a2.1 2.1 0 0 1 0 4.2h-1.6" fill="none" stroke="#5382A1" strokeWidth="1.5" />
      <path d="M3.5 21.8h14" stroke="#5382A1" strokeWidth="1.5" strokeLinecap="round" />
    </>
  ),
  // SQL isn't a brand; a database drum stands in.
  SQL: () => (
    <>
      <path d="M4 5.5v13c0 1.9 3.6 3.5 8 3.5s8-1.6 8-3.5v-13" fill="#4479A1" />
      <ellipse cx="12" cy="5.5" rx="8" ry="3.5" fill="#6A9BC9" />
      <path d="M4 10c0 1.9 3.6 3.5 8 3.5s8-1.6 8-3.5M4 14.5c0 1.9 3.6 3.5 8 3.5s8-1.6 8-3.5" fill="none" stroke="#fff" strokeWidth="1.1" opacity=".8" />
    </>
  ),
};

export const BrandIcon: React.FC<{ name: string; className?: string }> = ({ name, className }) => {
  const id = `brand-${React.useId().replace(/:/g, '')}`;
  const simple = SIMPLE[name];
  const custom = CUSTOM[name];
  if (!simple && !custom) {
    return (
      <span className={`grid place-items-center font-black text-[#111] ${className ?? ''}`} aria-hidden>
        {name.slice(0, 2)}
      </span>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={className} role="img" aria-label={name}>
      {simple ? <path d={simple.path} fill={`#${simple.hex}`} /> : custom(id)}
    </svg>
  );
};
