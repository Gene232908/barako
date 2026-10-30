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
      title: 'Sample websites',
      category: 'Web Development',
      // Each site's mockups crossfade in order; clicking opens them with the site's intro and link.
      sites: [
        {
          name: 'Max Group',
          kind: 'Company website',
          intro:
            'The home of Max Group of Companies, the team behind an advanced aesthetics clinic, a tattoo studio, a skin clinic and a coffee bar. One site introduces every brand and lets clients book an appointment in a few taps.',
          features: ['One site for every brand', 'Online appointment booking', 'Dark, editorial look that fits the brand'],
          url: 'https://maxg-kappa.vercel.app',
          urlLabel: 'maxbeaut',
          images: ['/images/mockupwebsite.jpg'],
        },
        {
          name: 'MaxBeaut Attendance',
          kind: 'Staff attendance system',
          intro:
            "An attendance and staff management system for MaxBeaut's branches. Staff clock in from their phone with live camera verification, while managers follow attendance, schedules, leave requests and payroll from one dashboard.",
          features: ['Camera-verified clock in', 'Schedules and leave across branches', 'Live attendance dashboard and reports'],
          images: ['/images/mobilemockup-wide.jpg', '/images/tabletmockup-fit.jpg'],
        },
        {
          name: 'Zero Sixty Three',
          kind: 'Event production website',
          intro:
            'A website for Zero Sixty Three Productions, an events company in the United Arab Emirates that handles audio, video and live performance. Bold type and a neon accent give it the energy of a live show.',
          features: ['Services, portfolio and collaborations', 'High-energy, bold design', 'Looks sharp on every screen'],
          images: ['/images/laptopzero60-fit.jpg', '/images/mockuptablezero-fit.jpg'],
        },
        {
          name: 'Studium',
          kind: 'NCLEX learning platform',
          intro:
            'An adaptive review platform for Filipino nurses preparing for the NCLEX, the US nursing licensure exam. Students practise with traditional and Next Generation question banks, take exam simulations and track their progress over time.',
          features: ['Traditional and NGN question banks', 'Adaptive exam mode', 'Progress and topic analytics'],
          images: ['/images/studiumockup-fit.jpg', '/images/studiumpc-fit.jpg'],
        },
      ],
      link: '#works',
      year: '2026',
      description:
        "A few websites I've designed and built, from simple landing pages to full business sites. Each one is fast, responsive and easy to use on any screen.",
      stack: ['React', 'TypeScript', 'Tailwind CSS', 'Vite'],
    },
    {
      id: 'proj-2',
      title: 'Behind the posts',
      category: 'Social Media Management',
      visual: 'social',
      // Real screenshots from pages I manage. The card lays the first three out as a collage:
      // the first in front, the second as the window behind, the third as the small card.
      sites: [
        {
          name: 'Audience insights',
          kind: 'Facebook page · Meta Business Suite',
          intro:
            'A Facebook page I manage, with 166,772 followers. I keep an eye on who the audience really is (mostly women aged 25 to 44, led by the Philippines and Pakistan) and shape the content, timing and tone around them.',
          features: ['166,772 lifetime followers', 'Audience by age, gender, city and country', 'Content tuned to the top audiences'],
          note: 'Client page · details shared on request',
          stat: '166,772 followers',
          images: ['/images/social-insights.png'],
        },
        {
          name: 'Content calendar',
          kind: 'Planner · Meta Business Suite',
          intro:
            'A full month of posts planned and scheduled ahead across Facebook and Instagram. Several posts a day, spread over morning, afternoon and evening slots, so the page stays active without last-minute scrambling.',
          features: ['A month of posts scheduled ahead', 'Facebook and Instagram in one planner', 'A steady daily posting rhythm'],
          note: 'Client page · details shared on request',
          images: ['/images/social-calendar.png'],
        },
        {
          name: 'Creatives & Video Vault',
          kind: 'Google Drive · Post Creatives & Video Production',
          intro:
            'A complete, organized production drive for client marketing campaigns. Every folder contains production-ready marketing creatives, promotional posters, treatment reels, AI video edits, and announcement banners organized by branch and service.',
          features: [
            'All folders contain campaign posters, ad graphics, and video reels',
            'Organized by treatment: Botox, Hydrafacial, Fillers, Laser, and more',
            'Over 60+ categorized asset folders ready for multi-channel scheduling',
          ],
          note: 'Production drive · 60+ organized creative folders',
          stat: '60+ folders',
          images: ['/images/social-creatives-drive.png'],
        },
        {
          name: 'Meta Pixel Setup',
          kind: 'Pixel Installation · Website Tracking',
          intro:
            "Properly installing and configuring the Meta Pixel on a business's website so page visits, button clicks, and sign-ups are accurately captured. This gives their marketing team the tracking foundation they need to run targeted ads, expand their reach, and measure campaign results.",
          features: [
            'Clean base pixel installation and website integration',
            'Event tracking for page visits, button clicks, and inquiries',
            'Powers marketing campaigns and ad expansion without guessing',
          ],
          note: 'Technical setup · verified on client websites',
          images: ['/images/social-pixel.jpg'],
        },
      ],
      link: '#works',
      year: '2026',
      description:
        'I help businesses stay active online. From producing posters and promotional video reels across 60+ organized creative folders, to planning a full month of posts in Meta Business Suite, reading audience insights, and installing the Meta Pixel so marketing campaigns can track and expand their ads.',
      stack: ['Meta Business Suite', 'Content calendar', 'Posters & video reels', 'Audience insights', 'Meta Pixel Setup'],
    },
    {
      id: 'proj-3',
      title: 'Spreadsheets to Web Systems',
      category: 'Workflow Automation',
      link: '#works',
      year: '2026',
      description:
        "Don't worry about your existing messy Excel or Google Sheets data—I can transform and connect it into clean, organized web systems. From inventory and profit trackers with AI assistants to automated financial ledgers, everything is organized, auto-computed, and easy to read without spreadsheet stress.",
      stack: ['Spreadsheet Database', 'AI Store Assistant', 'Auto-Computed Profit', 'Stock Alerts'],
      sites: [
        {
          name: 'Tindahan Tracker',
          kind: 'Store & Inventory Web App · Spreadsheet Database',
          intro:
            "A smart store inventory and profit tracking web app powered by a live spreadsheet database. Don't worry about your existing messy Excel or Google Sheets files—I organize and connect your data into a clean, simple interface so it's effortless to read and never overwhelming. Store owners can track daily profit, sales, and inventory alerts in real time.",
          features: [
            'AI Store Assistant: Type or speak naturally (e.g. "Coke Mismo buy 15 sell 20 stock 24") to auto-insert inventory',
            'Live spreadsheet database: Seamlessly connects to your existing Excel/Sheets data',
            'Auto-computed profit: Real-time computation of Today\'s Profit, Monthly Sales, and Margins',
            'Smart inventory alerts: Instant warnings for Low Stock, Sold Out, and Loss-Making products',
          ],
          url: 'https://onlinetindahan.vercel.app/',
          urlLabel: 'onlinetindahan',
          images: ['/images/tindahan-spreadsheet-mockup.jpg', '/images/tindahan-tracker.png'],
        },
      ],
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
  stack: {
    title: 'Stack',
    groups: [
      { label: 'Frontend', items: ['Next.js', 'React', 'TypeScript', 'JavaScript', 'Tailwind CSS', 'HTML', 'CSS'] },
      { label: 'Backend & data', items: ['PHP', 'Java', 'Node.js', 'SQL', 'MySQL', 'Supabase', 'Firebase'] },
      { label: 'Tools', items: ['Git', 'GitHub', 'Figma', 'Google Apps Script', 'Vercel', 'XAMPP'] },
    ],
  },
  services: {
    title: 'Services',
    items: [
      {
        id: 'srv-1',
        number: '01',
        title: 'Full-Stack Web Development',
        tagline: 'Your idea, live on the web.',
        category: 'Web & Systems',
        description:
          'Custom websites, web applications, front-end and back-end development, APIs, and database integration.',
        deliverables: [
          'Custom Web Apps',
          'Frontend & Backend',
          'API Integration',
          'Database Architecture',
        ],
      },
      {
        id: 'srv-2',
        number: '02',
        title: 'Business Systems Development',
        tagline: 'Stop running your business on spreadsheets.',
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
        title: 'Workflow & System Automation',
        tagline: 'Turn messy spreadsheets into organized web systems.',
        category: 'Automation & Systems',
        description:
          'Transform manual spreadsheets, Jotforms, and repetitive tasks into unified web dashboards and automated data flows.',
        deliverables: [
          'Spreadsheet to Web Systems',
          'Form & Submission Pipelines',
          'Auto-Computed Dashboards',
          'Centralized Business Data',
        ],
      },
      {
        id: 'srv-4',
        number: '04',
        title: 'UI/UX & Web Design',
        tagline: 'Websites people actually enjoy using.',
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
        tagline: 'Nothing breaks on launch day.',
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
        tagline: 'Get found on Google.',
        category: 'Growth & Creative',
        description:
          'Website optimization, search visibility, and digital marketing support.',
        deliverables: [
          'Technical SEO',
          'Search Visibility',
          'Performance Optimization',
        ],
      },
      {
        id: 'srv-7',
        number: '07',
        title: 'IT Support & Troubleshooting',
        tagline: 'Tech problems? Handled.',
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
        tagline: 'Visuals that stop the scroll.',
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
    { id: 'soc-1', label: 'LinkedIn', url: 'https://www.linkedin.com/in/gene-mathew-d-wagas-9a1509382' },
  ],
  contacts: {
    email: 'genemathew232@gmail.com',
    phone: '09763331768',
    copyright: '© GENE WAGAS — ALL RIGHTS RESERVED',
  },
};
