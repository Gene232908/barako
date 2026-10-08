import React from 'react';
import type { ProjectItem } from '../types/portfolio';

interface WorksSectionProps {
  projects: ProjectItem[];
}

export const WorksSection: React.FC<WorksSectionProps> = ({
  projects,
}) => {
  return (
    <section
      id="works"
      className="relative z-10 bg-white w-full py-20 md:py-28 px-5 md:px-10"
    >
      <div className="max-w-[1200px] mx-auto flex flex-col gap-16 md:gap-24">
        {projects.map((project, index) => {
          // Sticky top offset so cards stack gracefully
          const stickyTopOffset = 80 + index * 14;

          return (
            <div
              key={project.id || index}
              className="sticky transition-all duration-300 w-full"
              style={{ top: `${stickyTopOffset}px` }}
            >
              <div className="group relative w-full h-[460px] sm:h-[600px] md:h-[750px] lg:h-[800px] overflow-hidden bg-[#0d0d0d] shadow-[0_20px_40px_rgba(0,0,0,0.08)] cursor-pointer select-none">
                {/* Background Image with Hover Zoom */}
                <img
                  src={project.imageUrl || `/images/project-${(index % 3) + 1}.jpg`}
                  alt={project.title}
                  loading="lazy"
                  className="project-card-image w-full h-full object-cover object-center"
                />

                {/* Framer Dark Gradient Overlay */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background:
                      'linear-gradient(180deg, rgba(0, 0, 0, 0) 65%, rgba(0, 0, 0, 0.65) 100%)',
                  }}
                />

                {/* Details in bottom-left */}
                <div className="absolute bottom-0 left-0 w-full p-6 md:p-10 flex flex-wrap items-baseline gap-3 md:gap-4 z-20">
                  <span className="font-section-label text-white/90">
                    {project.category}
                  </span>
                  <h2 className="font-project-title text-white">
                    {project.title}
                  </h2>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
