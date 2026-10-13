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
      "I'm a full-stack developer experienced in building websites, web applications, and business systems such as CRM platforms, admin dashboards, and management systems. I focus on creating reliable, user-friendly solutions that help businesses manage their operations and improve efficiency.",
      "Beyond development, I also have knowledge and hands-on experience in digital marketing, computer hardware, software troubleshooting, system installation, and networking. This allows me to understand both the technical side of a project and the needs of the business behind it.",
      "I enjoy solving complex problems and turning ideas into practical solutions that deliver real value.",
    ],
    // Highlight removed to keep about section minimal and focused
  },
  services: {
    title: 'Services',
    items: [
      {
        id: 'srv-1',
        number: '01',
        title: 'Full-Stack Web Development',
        category: 'Web & Systems',
        description:
          'Custom websites, web applications, front-end and back-end development, APIs, and database integration.',
        deliverables: [
          'Custom Web Apps',
          'Frontend & Backend',
          'REST & GraphQL APIs',
          'Database Architecture',
        ],
      },
      {
        id: 'srv-2',
        number: '02',
        title: 'Business Systems Development',
        category: 'Web & Systems',
        description:
          'CRM platforms, admin dashboards, inventory systems, booking systems, and management tools.',
        deliverables: [
          'Custom CRM Platforms',
          'Admin Dashboards',
          'Inventory Systems',
          'Booking & Operations Tools',
        ],
      },
      {
        id: 'srv-3',
        number: '03',
        title: 'AI Automation & Integration',
        category: 'AI & Automation',
        description:
          'Workflow automation, API integrations, AI-powered features, and connecting business tools.',
        deliverables: [
          'Workflow Automation',
          'API & Webhook Pipelines',
          'AI-Powered Integrations',
          'Business Tool Sync',
        ],
      },
      {
        id: 'srv-4',
        number: '04',
        title: 'UI/UX & Web Design',
        category: 'Design & QA',
        description:
          'Website layouts, responsive interfaces, user-friendly navigation, and design implementation.',
        deliverables: [
          'Wireframing & Prototypes',
          'Responsive Interfaces',
          'Design Systems',
          'Design-to-Code Implementation',
        ],
      },
      {
        id: 'srv-5',
        number: '05',
        title: 'Website Testing & QA',
        category: 'Design & QA',
        description:
          'Functionality testing, bug fixing, responsive testing, and troubleshooting.',
        deliverables: [
          'Cross-Browser QA',
          'Responsive Testing',
          'Bug Fixing & Debugging',
          'Performance Audits',
        ],
      },
      {
        id: 'srv-6',
        number: '06',
        title: 'Digital Marketing & SEO',
        category: 'Growth & Creative',
        description:
          'Website optimization, search visibility, and digital marketing support.',
        deliverables: [
          'Technical SEO',
          'Search Visibility',
          'Performance Optimization',
          'Traffic & Growth Strategies',
        ],
      },
      {
        id: 'srv-7',
        number: '07',
        title: 'IT Support & Troubleshooting',
        category: 'IT & Hardware',
        description:
          'Computer hardware diagnostics, PC assembly, system installation, software troubleshooting, and networking.',
        deliverables: [
          'Hardware Diagnostics',
          'PC Assembly & Maintenance',
          'System & Software Setup',
          'Local Networking',
        ],
      },
      {
        id: 'srv-8',
        number: '08',
        title: 'Graphic Design & Video Editing',
        category: 'Growth & Creative',
        description:
          'Promotional posters, marketing creatives, social media graphics, video editing, and visual brand assets.',
        deliverables: [
          'Promotional Creatives',
          'Social Media Assets',
          'Video Editing',
          'Visual Brand Assets',
        ],
      },
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
