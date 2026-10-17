import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

// Page-wide inertia scrolling (Lenis) for wheel and trackpad. Not started on touch-only devices
// (Lenis leaves touch native anyway) or for visitors who prefer reduced motion — everything below
// falls back to native there.
let lenis: Lenis | null = null;

export const initSmoothScroll = () => {
  const skip = window.matchMedia('(prefers-reduced-motion: reduce), (hover: none) and (pointer: coarse)').matches;
  if (lenis || skip) return () => {};
  const instance = new Lenis({ lerp: 0.085, smoothWheel: true, autoRaf: true });
  lenis = instance;

  // In-page anchors glide too. Links whose handler already called preventDefault (e.g. Contact,
  // which opens the phone chat) are left alone.
  const onClick = (e: MouseEvent) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const a = (e.target as Element | null)?.closest?.('a[href^="#"]');
    const href = a?.getAttribute('href');
    if (!href) return;
    const target = href === '#' ? 0 : document.getElementById(decodeURIComponent(href.slice(1)));
    if (target === null) return;
    e.preventDefault();
    // force: the mobile menu may still hold the scroll lock while it closes.
    instance.scrollTo(target, { force: true });
  };
  document.addEventListener('click', onClick);

  return () => {
    document.removeEventListener('click', onClick);
    instance.destroy();
    lenis = null;
  };
};

// True while Lenis itself is easing the page (wheel/trackpad or a smoothScrollTo), as opposed to
// native jumps such as the keyboard or dragging the scrollbar.
export const isSmoothScrolling = () => lenis?.isScrolling === 'smooth';

export const smoothScrollTo = (top: number) => {
  if (lenis) lenis.scrollTo(top, { force: true });
  else window.scrollTo({ top, behavior: 'smooth' });
};

// Freezes page scrolling under overlays (mobile menu, lightbox); the body overflow lock alone
// doesn't stop Lenis from consuming the wheel.
export const lockScroll = (locked: boolean) => {
  if (!lenis) return;
  if (locked) lenis.stop();
  else lenis.start();
};
