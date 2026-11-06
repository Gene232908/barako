import { useState, useEffect, lazy, Suspense } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { WorksSection } from './components/WorksSection';
import { AboutSection } from './components/AboutSection';
import { StackSection } from './components/StackSection';
import { ServicesSection } from './components/ServicesSection';
import { Footer } from './components/Footer';
import { portfolioData } from './data/portfolioData';
import { initSmoothScroll } from './lib/smoothScroll';
import { useVisitorTracker } from './hooks/useVisitorTracker';

const AdminDashboard = lazy(() =>
  import('./components/admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard }))
);

export function App() {
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  // Initialize smooth scrolling with Lenis
  useEffect(initSmoothScroll, []);

  // Track visitor sessions, section navigation & Microsoft Clarity
  useVisitorTracker();

  // Gracefully dismiss preloader once fonts and layout have fully settled
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const dismissPreloader = () => {
      const el = document.getElementById('preloader');
      if (!el || el.classList.contains('preloader-hidden')) return;
      el.classList.add('preloader-hidden');
      setTimeout(() => {
        el.remove();
      }, 550);
    };

    if (document.fonts?.ready) {
      document.fonts.ready.then(() => {
        setTimeout(dismissPreloader, 400);
      });
    } else {
      setTimeout(dismissPreloader, 500);
    }

    const fallback = setTimeout(dismissPreloader, 1500);
    return () => clearTimeout(fallback);
  }, []);

  // Listen to #admin hash or keyboard shortcut (Alt + A) to open Admin Portal
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkHash = () => {
      if (window.location.hash === '#admin') {
        setIsAdminOpen(true);
      }
    };

    checkHash();
    window.addEventListener('hashchange', checkHash);

    const handleKeyDown = (e: KeyboardEvent) => {
      // Shortcut: Alt + A or Ctrl + Shift + A
      if ((e.altKey && e.key.toLowerCase() === 'a') || (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a')) {
        e.preventDefault();
        setIsAdminOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('hashchange', checkHash);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleCloseAdmin = () => {
    setIsAdminOpen(false);
    if (typeof window !== 'undefined' && window.location.hash === '#admin') {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  };

  return (
    <div className="min-h-screen bg-white text-black selection:bg-black selection:text-white">
      {/* Fixed Header Navbar */}
      <Navbar
        logoText={portfolioData.author.logoText}
        navLinks={portfolioData.navigation}
      />

      <main>
        {/* Parallax Fixed Hero Section */}
        <Hero
          fullName={portfolioData.author.fullName}
          roles={portfolioData.author.roles}
        />

        {/* Stacked Works Project Cards */}
        <WorksSection
          projects={portfolioData.projects}
          email={portfolioData.contacts.email}
        />

        {/* About Section */}
        <AboutSection
          aboutTitle={portfolioData.about.title}
          paragraphs={portfolioData.about.paragraphs}
          highlight={portfolioData.about.highlight}
        />

        {/* Tech stack — words burst apart when pressed */}
        <StackSection title={portfolioData.stack.title} groups={portfolioData.stack.groups} />

        {/* Services Section */}
        <ServicesSection
          servicesTitle={portfolioData.services.title}
          services={portfolioData.services.items}
        />
      </main>

      {/* Footer with Navigation, Socials, Contacts, and Discreet Admin Access */}
      <Footer
        navLinks={portfolioData.navigation}
        socials={portfolioData.socials}
        contacts={portfolioData.contacts}
        onOpenAdmin={() => setIsAdminOpen(true)}
      />

      {/* Admin Dashboard & Microsoft Clarity Control Modal (Loaded on demand) */}
      {isAdminOpen && (
        <Suspense fallback={null}>
          <AdminDashboard
            isOpen={isAdminOpen}
            onClose={handleCloseAdmin}
          />
        </Suspense>
      )}
    </div>
  );
}

export default App;
