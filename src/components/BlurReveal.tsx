import React, { useEffect, useRef, useState } from 'react';

interface BlurRevealProps {
  children: React.ReactNode;
  as?: React.ElementType;
  className?: string;
  delay?: number;
}

// One observer shared by every reveal on the page instead of one per element.
const callbacks = new WeakMap<Element, () => void>();
let observer: IntersectionObserver | null = null;
const observe = (node: Element, onShow: () => void) => {
  observer ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer?.unobserve(entry.target);
        callbacks.get(entry.target)?.();
        callbacks.delete(entry.target);
      }
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

export const BlurReveal: React.FC<BlurRevealProps> = ({ children, as: Tag = 'div', className = '', delay = 0 }) => {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    return observe(node, () => setShown(true));
  }, []);

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
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
};
