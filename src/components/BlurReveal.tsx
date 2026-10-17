import React, { useEffect, useRef, useState } from 'react';

interface BlurRevealProps {
  children: React.ReactNode;
  as?: React.ElementType;
  className?: string;
  delay?: number;
  /** Reveal word by word instead of as one block. */
  split?: boolean;
}

const BLOCK_STAGGER_MS = 110; // between blocks that scroll into view together
const WORD_STAGGER_MS = 32; // between words of a split reveal…
const WORD_STAGGER_TOTAL_MS = 900; // …squeezed so long paragraphs don't drag on
const REVEAL_MS = 1600; // matches the .blur-reveal / .split-word transition

// One observer shared by every reveal on the page. Blocks entering in the same batch get a
// staggered start, top-to-bottom then left-to-right, so they appear one after another.
const callbacks = new WeakMap<Element, (stagger: number) => void>();
let observer: IntersectionObserver | null = null;
const observe = (node: Element, onShow: (stagger: number) => void) => {
  observer ??= new IntersectionObserver(
    (entries) => {
      entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top || a.boundingClientRect.left - b.boundingClientRect.left)
        .forEach((entry, i) => {
          observer?.unobserve(entry.target);
          callbacks.get(entry.target)?.(i * BLOCK_STAGGER_MS);
          callbacks.delete(entry.target);
        });
    },
    { threshold: 0.15, rootMargin: '0px 0px -8% 0px' },
  );
  callbacks.set(node, onShow);
  observer.observe(node);
  return () => {
    observer?.unobserve(node);
    callbacks.delete(node);
  };
};

const countWords = (node: React.ReactNode): number => {
  if (typeof node === 'string') return node.split(/\s+/).filter(Boolean).length;
  if (typeof node === 'number') return 1;
  if (Array.isArray(node)) return node.reduce((n: number, c) => n + countWords(c), 0);
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) return countWords(node.props.children);
  return 0;
};

// Wraps every word (through nested elements like <span> and past <br />) in a .split-word span,
// keeping the spaces as plain text so lines still wrap naturally.
const splitWords = (node: React.ReactNode, step: number, next: { i: number }): React.ReactNode => {
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node)
      .split(/(\s+)/)
      .map((part, k) => {
        if (!part) return null;
        if (/^\s+$/.test(part)) return part;
        const i = next.i++;
        return (
          <span key={k} className="split-word" style={{ transitionDelay: `calc(var(--reveal-delay) + ${Math.round(i * step)}ms)` }}>
            {part}
          </span>
        );
      });
  }
  if (Array.isArray(node)) return node.map((c, k) => <React.Fragment key={k}>{splitWords(c, step, next)}</React.Fragment>);
  if (React.isValidElement<{ children?: React.ReactNode }>(node) && node.props.children != null) {
    return React.cloneElement(node, undefined, splitWords(node.props.children, step, next));
  }
  return node;
};

export const BlurReveal: React.FC<BlurRevealProps> = ({ children, as: Tag = 'div', className = '', delay = 0, split = false }) => {
  const ref = useRef<HTMLElement>(null);
  const [stagger, setStagger] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const shown = stagger !== null;
  const start = delay + (stagger ?? 0);

  const words = split ? countWords(children) : 0;
  const step = words > 1 ? Math.min(WORD_STAGGER_MS, WORD_STAGGER_TOTAL_MS / (words - 1)) : 0;

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    return observe(node, setStagger);
  }, []);

  // Split reveals end when their last word does; drop the filters and layers then.
  useEffect(() => {
    if (!split || !shown) return;
    const t = window.setTimeout(() => setDone(true), start + step * Math.max(0, words - 1) + REVEAL_MS + 100);
    return () => clearTimeout(t);
  }, [split, shown, start, step, words]);

  if (split) {
    return (
      <Tag
        ref={ref}
        className={`split-reveal ${className}`}
        data-shown={shown}
        data-done={done || undefined}
        style={{ '--reveal-delay': `${start}ms` } as React.CSSProperties}
      >
        {splitWords(children, step, { i: 0 })}
      </Tag>
    );
  }

  return (
    <Tag
      ref={ref}
      className={`blur-reveal ${className}`}
      data-shown={shown}
      data-done={done || undefined}
      // Drops the GPU layer once the reveal has finished.
      onTransitionEnd={(e: React.TransitionEvent) => {
        if (shown && e.target === e.currentTarget) setDone(true);
      }}
      style={start ? { transitionDelay: `${start}ms` } : undefined}
    >
      {children}
    </Tag>
  );
};
