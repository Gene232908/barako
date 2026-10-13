import React from 'react';
import { RollingLink } from './RollingLink';
import { BlurReveal } from './BlurReveal';
import type { SocialLink, ContactInfo } from '../types/portfolio';

interface FooterProps {
  navLinks: { label: string; href: string }[];
  socials: SocialLink[];
  contacts: ContactInfo;
}

export const Footer: React.FC<FooterProps> = ({
  navLinks,
  socials,
  contacts,
}) => {
  return (
    <footer
      id="contact"
      className="relative z-10 bg-white w-full border-t border-black/10 px-5 md:px-10 pt-16 md:pt-20 pb-10"
    >
      <div className="max-w-[1440px] mx-auto flex flex-col gap-16 md:gap-24">
        {/* Top 3 Columns: Navigation, Socials, Contacts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-10 md:gap-12">
          {/* 1. Navigation Column */}
          <BlurReveal className="flex flex-col gap-4">
            <p className="font-body-bold text-black px-1.5">Navigation</p>

            <div className="flex flex-col items-start gap-1">
              <RollingLink href="#" label="Home" />
              {navLinks.map((link) => (
                <RollingLink
                  key={link.label}
                  href={link.href}
                  label={link.label}
                />
              ))}
            </div>
          </BlurReveal>

          {/* 2. Socials Column */}
          <BlurReveal delay={150} className="flex flex-col gap-4">
            <p className="font-body-bold text-black px-1.5">Socials</p>

            <div className="flex flex-col items-start gap-1">
              {socials.map((social) => (
                <RollingLink
                  key={social.id}
                  href={social.url}
                  label={social.label}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              ))}
            </div>
          </BlurReveal>

          {/* 3. Contacts Column */}
          <BlurReveal delay={300} className="flex flex-col gap-4">
            <p className="font-body-bold text-black px-1.5">Contacts</p>

            <div className="flex flex-col items-start gap-1">
              <RollingLink
                href={`mailto:${contacts.email}`}
                label={contacts.email}
                target="_blank"
                rel="noopener noreferrer"
              />
              <RollingLink
                href={`tel:${contacts.phone.replace(/[^0-9+]/g, '')}`}
                label={contacts.phone}
                target="_blank"
                rel="noopener noreferrer"
              />
            </div>
          </BlurReveal>
        </div>

        {/* Bottom Bar: Copyright */}
        <BlurReveal delay={450} className="pt-6 border-t border-black/5 flex items-center justify-between">
          <p className="text-[13px] font-body-bold text-[#808080] uppercase tracking-[-0.04em]">
            {contacts.copyright}
          </p>

          <div className="text-[11px] font-mono tracking-tight text-black/40 uppercase">
            GENE WAGAS PORTFOLIO
          </div>
        </BlurReveal>
      </div>
    </footer>
  );
};
