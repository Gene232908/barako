import React from 'react';
import { CONTACT_HREF, onContactClick } from '../lib/phoneChat';

interface RollingLinkProps {
  href: string;
  label: string;
  target?: string;
  rel?: string;
  className?: string;
}

export const RollingLink: React.FC<RollingLinkProps> = ({
  href,
  label,
  target,
  rel,
  className = '',
}) => {
  return (
    <a
      href={href}
      target={target}
      rel={rel}
      onClick={href === CONTACT_HREF ? onContactClick : undefined}
      className={`magnetic-pill group ${className}`}
    >
      <div className="magnetic-pill-bg" />
      <div className="magnetic-pill-text-wrap font-nav-text">
        <div className="magnetic-pill-text-inner">
          <span className="magnetic-pill-top">{label}</span>
          <span className="magnetic-pill-bottom">{label}</span>
        </div>
      </div>
    </a>
  );
};
