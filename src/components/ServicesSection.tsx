import React, { useState } from 'react';
import type { ServiceItem } from '../types/portfolio';
import { BlurReveal } from './BlurReveal';
import { CONTACT_HREF, onContactClick } from '../lib/phoneChat';

interface ServicesSectionProps {
  servicesTitle: string;
  services: ServiceItem[];
}

const EASE = 'ease-[cubic-bezier(0.16,1,0.3,1)]';

export const ServicesSection: React.FC<ServicesSectionProps> = ({ servicesTitle, services }) => {
  const [openId, setOpenId] = useState<string | null>(null);

  const count = String(services.length).padStart(2, '0');

  return (
    <section
      id="services"
      className="relative z-10 bg-white w-full px-5 md:px-10 py-24 md:py-36"
    >
      <div className="max-w-[1400px] mx-auto">
        {/* Label row — same small bold caps as the hero subtext */}
        <BlurReveal split className="flex items-center justify-between pb-6 md:pb-8">
          <span className="font-body-bold text-[12px] md:text-[13px]">({servicesTitle})</span>
          <span className="font-body-bold text-[12px] md:text-[13px] text-black/40">
            {count} ways I can help
          </span>
        </BlurReveal>

        {/* Headline */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-10 items-end pb-14 md:pb-20">
          <BlurReveal split delay={120} className="md:col-span-8">
            <h2
              className="font-hero-title leading-[0.88] tracking-[-0.06em]"
              style={{ fontSize: 'clamp(2.75rem, 8.4vw, 8rem)' }}
            >
              You need it.
              <br />
              <span className="text-black/25">I build it.</span>
            </h2>
          </BlurReveal>
          <BlurReveal
            split
            as="p"
            delay={300}
            className="md:col-span-4 text-[15px] md:text-[16px] leading-[1.5] text-black/60 max-w-[34ch] md:justify-self-end"
          >
            One developer for your website, your business systems, and everything in between.
            Clear process, fast delivery, built to last.
          </BlurReveal>
        </div>

        {/* Service list — hovering one row dims the rest */}
        <ul className="group/list border-t border-black">
          {services.map((s, idx) => {
            const id = s.id || String(idx);
            const open = openId === id;
            const num = s.number || String(idx + 1).padStart(2, '0');

            return (
              <li
                key={id}
                className={`border-b border-black/15 transition-opacity duration-500 ${EASE} md:group-hover/list:opacity-35 md:hover:opacity-100! ${open ? 'opacity-100!' : ''}`}
              >
                <BlurReveal>
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : id)}
                    aria-expanded={open}
                    aria-controls={`srv-panel-${id}`}
                    className="group w-full cursor-pointer text-left grid grid-cols-[2.25rem_1fr_auto] md:grid-cols-12 items-center gap-x-3 md:gap-x-10 py-5 md:py-7"
                  >
                    <span className="font-body-bold text-[12px] md:text-[13px] text-black/35 tabular-nums md:col-span-1 self-start md:self-center pt-1 md:pt-0">
                      {num}
                    </span>

                    <span className="md:col-span-6 min-w-0">
                      <span
                        className={`block font-hero-title leading-[0.95] tracking-[-0.05em] transition-transform duration-500 ${EASE} md:group-hover:translate-x-2`}
                        style={{ fontSize: 'clamp(1.35rem, 2.6vw, 2.5rem)' }}
                      >
                        {s.title}
                      </span>
                      {s.tagline && (
                        <span className="md:hidden block mt-1.5 text-[14px] text-black/55">{s.tagline}</span>
                      )}
                    </span>

                    <span className="hidden md:block md:col-span-4 text-[16px] lg:text-[17px] text-black/55 leading-snug">
                      {s.tagline}
                    </span>

                    <span
                      aria-hidden="true"
                      className="md:col-span-1 justify-self-end relative w-4 h-4 md:w-5 md:h-5"
                    >
                      <span className="absolute left-0 right-0 top-1/2 h-[1.5px] -translate-y-1/2 bg-black" />
                      <span
                        className={`absolute top-0 bottom-0 left-1/2 w-[1.5px] -translate-x-1/2 bg-black transition-transform duration-500 ${EASE} ${
                          open ? 'scale-y-0' : 'scale-y-100'
                        }`}
                      />
                    </span>
                  </button>

                  {/* Details */}
                  <div
                    id={`srv-panel-${id}`}
                    role="region"
                    className={`grid transition-[grid-template-rows] duration-700 ${EASE} ${
                      open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div
                        className={`grid grid-cols-1 md:grid-cols-12 gap-x-10 gap-y-5 pb-7 md:pb-9 pl-[calc(2.25rem+0.75rem)] md:pl-0 transition-opacity duration-500 ${
                          open ? 'opacity-100 delay-150' : 'opacity-0'
                        }`}
                      >
                        {s.description && (
                          <p className="md:col-start-2 md:col-span-5 text-[15px] md:text-[16px] leading-[1.55] text-black/70 max-w-[46ch]">
                            {s.description}
                          </p>
                        )}
                        {s.deliverables && s.deliverables.length > 0 && (
                          <ul className="md:col-start-8 md:col-span-4 flex flex-col gap-2">
                            {s.deliverables.map((d) => (
                              <li key={d} className="font-body-bold text-[12px] md:text-[13px] flex items-center gap-2.5">
                                <span className="w-1 h-1 rounded-full bg-black shrink-0" aria-hidden="true" />
                                {d}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                </BlurReveal>
              </li>
            );
          })}
        </ul>

        {/* Closing CTA */}
        <BlurReveal className="mt-16 md:mt-24">
          <a
            href={CONTACT_HREF}
            onClick={onContactClick}
            className="group relative flex flex-col md:flex-row md:items-center justify-between gap-4 overflow-hidden border border-black px-5 py-6 md:px-10 md:py-10"
          >
            <span
              aria-hidden="true"
              className={`absolute inset-0 bg-black translate-y-full group-hover:translate-y-0 transition-transform duration-700 ${EASE}`}
            />
            <span className="relative flex flex-col gap-2 group-hover:text-white transition-colors duration-500">
              <span className="font-hero-title leading-[0.95]" style={{ fontSize: 'clamp(1.75rem, 4.2vw, 3.75rem)' }}>
                Got a project in mind?
              </span>
              <span className="text-[14px] md:text-[15px] text-black/55 group-hover:text-white/60 transition-colors duration-500">
                Not sure which service fits? Tell me the problem — I'll suggest the fix.
              </span>
            </span>
            <span className="relative font-body-bold text-[13px] md:text-[14px] whitespace-nowrap group-hover:text-white transition-colors duration-500 flex items-center gap-2">
              Let's talk
              <span className={`inline-block transition-transform duration-500 ${EASE} group-hover:translate-x-1 group-hover:-translate-y-1`}>
                ↗
              </span>
            </span>
          </a>
        </BlurReveal>
      </div>
    </section>
  );
};
