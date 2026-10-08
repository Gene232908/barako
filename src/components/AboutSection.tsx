import React from 'react';
import type { ServiceItem } from '../types/portfolio';

interface AboutSectionProps {
  aboutTitle: string;
  paragraphs: string[];
  highlight?: {
    title: string;
    description: string;
  };
  servicesTitle: string;
  services: ServiceItem[];
}

export const AboutSection: React.FC<AboutSectionProps> = ({
  aboutTitle,
  paragraphs,
  highlight,
  servicesTitle,
  services,
}) => {
  return (
    <section
      id="about"
      className="relative z-10 bg-white w-full py-24 md:py-36 px-5 md:px-10 border-t border-black/10"
    >
      <div className="max-w-[1200px] mx-auto flex flex-col gap-20 md:gap-28">
        {/* 1. INTRO ABOUT */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12">
          {/* Left Column Label */}
          <div className="md:col-span-4 lg:col-span-3">
            <p className="font-section-label text-black">{aboutTitle}</p>
          </div>

          {/* Right Column Body Text */}
          <div className="md:col-span-8 lg:col-span-9 flex flex-col gap-6 max-w-[800px]">
            {paragraphs.map((p, idx) => (
              <p key={idx} className="font-body-bold text-black leading-relaxed">
                {p}
              </p>
            ))}

            {/* AI Automation & Integration Highlight Box */}
            {highlight && (
              <div className="mt-4 pt-6 border-t border-black/10 flex flex-col gap-3">
                <h3 className="font-section-label text-black tracking-[-0.04em]">
                  {highlight.title}
                </h3>
                <p className="font-body-bold text-black/90 leading-relaxed">
                  {highlight.description}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 2. SERVICES */}
        <div id="services" className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 border-t border-black/10 pt-16 md:pt-20">
          {/* Left Column Label */}
          <div className="md:col-span-4 lg:col-span-3">
            <p className="font-section-label text-black">{servicesTitle}</p>
          </div>

          {/* Right Column Services List */}
          <div className="md:col-span-8 lg:col-span-9 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {services.map((service, idx) => (
              <div
                key={service.id || idx}
                className="font-body-bold text-black py-2.5 px-3 border border-black/10 hover:border-black transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] flex items-center justify-between group cursor-pointer"
              >
                <span>{service.title}</span>
                <span className="text-[9px] text-black/30 group-hover:text-black transition-colors duration-400">
                  0{idx + 1}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
