import type { PortfolioData } from '../types/portfolio';

export const portfolioData: PortfolioData = {
  author: {
    logoText: 'GW™',
    fullName: 'GENE WAGAS',
    roles: [
      'FULL STACK DEVELOPER',
      'IT SPECIALIST',
      'SOCIAL MEDIA MANAGER',
      'TECHNICAL SUPPORT',
    ],
    year: 'PORTFOLIO 2026',
  },
  navigation: [
    { label: 'Works', href: '#works' },
    { label: 'About', href: '#about' },
    { label: 'Services', href: '#services' },
    { label: 'Contact', href: '#contact' },
  ],
  projects: [
    {
      id: 'proj-1',
      title: 'Avery',
      category: 'Web Development',
      imageUrl: '/images/project-1.jpg',
      link: '#works',
      year: '2026',
    },
    {
      id: 'proj-2',
      title: 'Bruce',
      category: 'UI / UX Design',
      imageUrl: '/images/project-2.jpg',
      link: '#works',
      year: '2026',
    },
    {
      id: 'proj-3',
      title: 'Concrete',
      category: 'AI Workflow Integration',
      imageUrl: '/images/project-3.jpg',
      link: '#works',
      year: '2026',
    },
  ],
  about: {
    title: 'About',
    paragraphs: [
      'I design and develop websites that solve complex problems with clear, user-friendly interfaces. My focus is on clean code, fast performance, and visually coherent design.',
      'I ensure all sites are responsive and accessible, delivering a consistent experience across devices and browsers.',
      'Each project is approached with practical solutions that improve usability and achieve measurable results.',
    ],
    highlight: {
      title: 'AI AUTOMATION & INTEGRATION',
      description:
        'I also have working knowledge of AI automation and integration tools used for improving workflows, lead handling, and system efficiency. I apply these tools to support web and business process automation.',
    },
  },
  services: {
    title: 'My services',
    items: [
      { id: 'srv-1', title: 'AI Automation & Workflow Integration' },
      { id: 'srv-2', title: 'UI / UX Design' },
      { id: 'srv-3', title: 'Testing & QA' },
      { id: 'srv-4', title: 'Technical Support' },
      { id: 'srv-5', title: 'Video Editing' },
      { id: 'srv-6', title: 'Graphic Design' },
      { id: 'srv-7', title: 'Web Development' },
    ],
  },
  socials: [
    { id: 'soc-1', label: 'LinkedIn', url: 'https://linkedin.com' },
    { id: 'soc-2', label: 'GitHub', url: 'https://github.com' },
    { id: 'soc-3', label: 'Facebook', url: 'https://facebook.com' },
    { id: 'soc-4', label: 'Instagram', url: 'https://instagram.com' },
  ],
  contacts: {
    email: 'genewagas@gmail.com',
    phone: '+63 900 000 0000',
    copyright: '© GENE WAGAS — ALL RIGHTS RESERVED',
  },
};
