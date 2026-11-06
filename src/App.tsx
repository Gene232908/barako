import { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { WorksSection } from './components/WorksSection';
import { AboutSection } from './components/AboutSection';
import { StackSection } from './components/StackSection';
import { ServicesSection } from './components/ServicesSection';
import { Footer } from './components/Footer';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { portfolioData } from './data/portfolioData';
import { initSmoothScroll } from './lib/smoothScroll';
import { useVisitorTracker } from './hooks/useVisitorTracker';

export function App() {
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  // Initialize smooth scrolling with Lenis
  useEffect(initSmoothScroll, []);

  // Track visitor sessions, section navigation & Microsoft Clarity
  useVisitorTracker();

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

      {/* Admin Dashboard & Microsoft Clarity Control Modal */}
      <AdminDashboard
        isOpen={isAdminOpen}
        onClose={handleCloseAdmin}
      />
    </div>
  );
}

export default App;
