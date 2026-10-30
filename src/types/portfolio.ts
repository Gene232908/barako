/** One piece of work in a project's showcase (a website, a dashboard, a planner…), introduced in
 *  the viewer next to its screenshots. */
export interface SampleSite {
  name: string;
  kind: string;
  intro: string;
  features: string[];
  /** Live address; leave out for private or unreleased builds. */
  url?: string;
  /** Shown instead of a link when there's no url (defaults to a "private build" note). */
  note?: string;
  /** A headline number to badge on the project card, e.g. "166,772 followers". */
  stat?: string;
  images: string[];
}

export interface ProjectItem {
  id: string;
  title: string;
  category: string;
  imageUrl?: string;
  /** Several screenshots shown as a slow crossfade (takes precedence over imageUrl). */
  images?: string[];
  /** Websites shown in the crossfade, each with an intro and link (takes precedence over images). */
  sites?: SampleSite[];
  /** Built-in visual used instead of an image. */
  visual?: 'social';
  link?: string;
  year?: string;
  description?: string;
  stack?: string[];
}

export interface ServiceItem {
  id: string;
  number?: string;
  title: string;
  tagline?: string;
  description?: string;
  category?: string;
  deliverables?: string[];
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
  stack: {
    title: string;
    groups: { label: string; items: string[] }[];
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
