import React, { useState } from 'react';
import type { ServiceItem } from '../types/portfolio';

interface ServicesSectionProps {
  servicesTitle: string;
  services: ServiceItem[];
}

export const ServicesSection: React.FC<ServicesSectionProps> = ({
  servicesTitle,
  services,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('ALL');

  // Extract unique categories for filter tabs
  const categories = ['ALL', ...Array.from(new Set(services.map((s) => s.category).filter(Boolean))) as string[]];

  const filteredServices =
    activeCategory === 'ALL'
      ? services
      : services.filter((s) => s.category === activeCategory);

  return (
    <section
      id="services"
      className="relative z-10 bg-white w-full py-24 md:py-36 px-5 md:px-10 border-t border-black/10"
    >
      <div className="max-w-[1200px] mx-auto flex flex-col gap-12 md:gap-16">
        {/* Section Header: Swiss Minimalist Editorial */}
        <div className="flex flex-col gap-6 md:gap-8">
          {/* Top Label & Counter */}
          <div className="flex items-center justify-between border-b border-black/10 pb-4">
            <p className="font-section-label text-black tracking-[-0.04em]">
              {servicesTitle}
            </p>
            <span className="text-[11px] font-mono tracking-widest text-black/50 uppercase">
              {String(services.length).padStart(2, '0')} CAPABILITIES
            </span>
          </div>

          {/* Headline & Overview */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-10 items-baseline">
            <h2 className="md:col-span-7 font-hero-sub text-[26px] sm:text-[34px] md:text-[40px] font-bold text-black tracking-[-0.05em] leading-[1.08] uppercase">
              Technical Solutions & Specialized Services
            </h2>
            <p className="md:col-span-5 text-[14px] sm:text-[15px] text-black/70 leading-relaxed font-normal">
              High-performance web applications, custom business systems, intelligent AI automation, and dependable technical infrastructure built with precision.
            </p>
          </div>

          {/* Minimalist Category Filter Tabs */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            {categories.map((cat) => {
              const count =
                cat === 'ALL'
                  ? services.length
                  : services.filter((s) => s.category === cat).length;
              const isActive = activeCategory === cat;

              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`cursor-pointer px-3.5 py-1.5 text-[11px] sm:text-[12px] font-mono uppercase tracking-wider transition-all duration-200 border ${
                    isActive
                      ? 'bg-black text-white border-black font-semibold'
                      : 'bg-transparent text-black/60 border-black/10 hover:border-black/40 hover:text-black'
                  }`}
                >
                  {cat} <span className="opacity-60 ml-1">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Services Grid: High-Readability Minimalist Architectural Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
          {filteredServices.map((service, idx) => (
            <div
              key={service.id || idx}
              className="group relative bg-white border border-black/10 hover:border-black p-6 sm:p-8 flex flex-col justify-between transition-all duration-200 hover:shadow-[0_12px_28px_rgba(0,0,0,0.04)]"
            >
              {/* Top Row: Monospace Index & Category Label */}
              <div>
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-black/10">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[12px] font-bold text-black tabular-nums">
                      {service.number || String(idx + 1).padStart(2, '0')}
                    </span>
                    {service.category && (
                      <>
                        <span className="text-black/30 font-mono text-[11px]" aria-hidden="true">
                          /
                        </span>
                        <span className="text-[11px] font-mono uppercase tracking-wider text-black/50 group-hover:text-black transition-colors">
                          {service.category}
                        </span>
                      </>
                    )}
                  </div>

                  <span
                    className="text-black/30 group-hover:text-black transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 text-sm select-none"
                    aria-hidden="true"
                  >
                    ↗
                  </span>
                </div>

                {/* Service Title */}
                <h3 className="text-black font-bold text-[18px] sm:text-[20px] tracking-[-0.03em] leading-snug mb-3 group-hover:text-black transition-colors">
                  {service.title}
                </h3>

                {/* Service Description */}
                {service.description && (
                  <p className="text-black/65 text-[13px] sm:text-[14px] leading-relaxed font-normal mb-6">
                    {service.description}
                  </p>
                )}
              </div>

              {/* Bottom: Deliverables & Key Competencies (Immediate Readability) */}
              {service.deliverables && service.deliverables.length > 0 && (
                <div className="pt-4 border-t border-black/10 flex flex-col gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-black/40">
                    Key Deliverables
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {service.deliverables.map((item, itemIdx) => (
                      <span
                        key={itemIdx}
                        className="inline-flex items-center text-[11px] sm:text-[12px] font-medium text-black/80 bg-black/[0.03] group-hover:bg-black group-hover:text-white px-2.5 py-1 transition-colors duration-200 border border-black/[0.05]"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
