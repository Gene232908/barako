export interface ProjectItem {
  id: string;
  title: string;
  category: string;
  imageUrl: string;
  link?: string;
  year?: string;
  description?: string;
}

export interface ServiceItem {
  id: string;
  title: string;
}

export interface SocialLink {
  id: string;
  label: string;
  url: string;
}

export interface ContactInfo {
  email: string;
  phone: string;
  copyright: string;
}

export interface PortfolioData {
  author: {
    logoText: string;
    fullName: string;
    roles: string[];
    year?: string;
  };
  about: {
    title: string;
    paragraphs: string[];
    highlight?: {
      title: string;
      description: string;
    };
  };
  services: {
    title: string;
    items: ServiceItem[];
  };
  projects: ProjectItem[];
  navigation: {
    label: string;
    href: string;
  }[];
  socials: SocialLink[];
  contacts: ContactInfo;
}
