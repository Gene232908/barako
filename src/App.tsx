import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { WorksSection } from './components/WorksSection';
import { AboutSection } from './components/AboutSection';
import { ServicesSection } from './components/ServicesSection';
import { Footer } from './components/Footer';
import { portfolioData } from './data/portfolioData';

export function App() {
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
        />

        {/* About Section */}
        <AboutSection
          aboutTitle={portfolioData.about.title}
          paragraphs={portfolioData.about.paragraphs}
          highlight={portfolioData.about.highlight}
        />

        {/* Services Section */}
        <ServicesSection
          servicesTitle={portfolioData.services.title}
          services={portfolioData.services.items}
        />
      </main>

      {/* Footer with Navigation, Socials, and Contacts */}
      <Footer
        navLinks={portfolioData.navigation}
        socials={portfolioData.socials}
        contacts={portfolioData.contacts}
      />
    </div>
  );
}

export default App;
