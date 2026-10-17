import React from 'react';
import { BlurReveal } from './BlurReveal';

interface AboutSectionProps {
  aboutTitle: string;
  paragraphs: string[];
  highlight?: {
    title: string;
    description: string;
  };
}

export const AboutSection: React.FC<AboutSectionProps> = ({
  aboutTitle,
  paragraphs,
  highlight,
}) => {
  return (
    <section
      id="about"
      className="relative z-10 bg-white w-full py-24 md:py-36 px-5 md:px-10 border-t border-black/10"
    >
      <div className="max-w-[1200px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12">
          {/* Left Column Label */}
          <div className="md:col-span-4 lg:col-span-3">
            <BlurReveal split as="p" className="font-section-label text-black tracking-[-0.04em]">
              {aboutTitle}
            </BlurReveal>
          </div>

          {/* Right Column Body Text */}
          <div className="md:col-span-8 lg:col-span-9 flex flex-col gap-6 max-w-[820px]">
            {paragraphs.map((p, idx) => (
              <BlurReveal split as="p" key={idx} delay={150} className="font-body-bold text-black leading-relaxed">
                {p}
              </BlurReveal>
            ))}

            {/* Optional Highlight Box */}
            {highlight && (
              <BlurReveal split className="mt-4 pt-6 border-t border-black/10 flex flex-col gap-3">
                <h3 className="font-section-label text-black tracking-[-0.04em]">
                  {highlight.title}
                </h3>
                <p className="font-body-bold text-black/90 leading-relaxed">
                  {highlight.description}
                </p>
              </BlurReveal>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
