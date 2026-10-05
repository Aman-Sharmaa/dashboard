export type HomeSectionKey =
  | "hero"
  | "products"
  | "services"
  | "about"
  | "videoTestimonial"
  | "testimonials"
  | "faq";

export type HomeHeroSettings = {
  announcementText: string;
  announcementHref: string;
  announcementIcon?: string;
  titleStatic: string;
  titleTyping: string;
  description: string;
  primaryCtaLabel: string;
  primaryCtaTargetId: string;
  secondaryCtaLabel: string;
  secondaryCtaHref: string;
  trustedText: string;
  clientLogos: string[];
};

export type HomeAboutSettings = {
  title: string;
  description: string;
  linkLabel: string;
  linkHref: string;
};

export type HomeTestimonialItem = {
  quote: string;
  name: string;
  role: string;
  avatar?: string;
  companyLogo?: string;
  gender?: "male" | "female" | "any";
};

export type HomeTestimonialsSettings = {
  title: string;
  subtitle: string;
  items: HomeTestimonialItem[];
};

export type HomeFaqItem = {
  question: string;
  answer: string;
};

export type HomeFaqSettings = {
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
  items: HomeFaqItem[];
};

export type HomeVideoTestimonialSettings = {
  sectionLabel: string;
  title: string;
  founderName: string;
  founderRole: string;
  founderImage: string;
  quote: string;
  description: string;
  companyName: string;
  companyCategory: string;
  companyLink: string;
  companyImage: string;
  socialHandle: string;
  instagramFollowers: string;
  youtubeSubscribers: string;
  reelEmbedUrl: string;
};

export type HomePageSettings = {
  sectionOrder: HomeSectionKey[];
  hero: HomeHeroSettings;
  about: HomeAboutSettings;
  testimonials: HomeTestimonialsSettings;
  faq: HomeFaqSettings;
  videoTestimonial: HomeVideoTestimonialSettings;
};

export const DEFAULT_HOME_PAGE_SETTINGS: HomePageSettings = {
  sectionOrder: [
    "hero",
    "products",
    "about",
    "videoTestimonial",
    "testimonials",
    "faq",
  ],
  hero: {
    announcementText: "",
    announcementHref: "",
    announcementIcon: "Layers",
    titleStatic: "Built with Excellence.",
    titleTyping: " Designed for the Future.",
    description: "Building modern SaaS, AI solutions, and digital management tools.",
    primaryCtaLabel: "Explore Products",
    primaryCtaTargetId: "product",
    secondaryCtaLabel: "Book a Call",
    secondaryCtaHref: "",
    trustedText: "Trusted by 100+ clients",
    clientLogos: [
      "/clients/dm.svg",
      "/clients/as.svg",
      "/clients/medone.svg",
      "/clients/zuari.svg",
      "/clients/dmca.svg",
      "/clients/flp.svg",
      "/clients/serrisvg.svg",
      "/clients/smep.svg",
      "/clients/floro.svg",
      "/clients/pmc.png",
    ],
  },
  about: {
    title: "Our Founders",
    description:
      "Creating jobs, inspiring youth, and building businesses for a stronger, brighter future.",
    linkLabel: "Learn more about us",
    linkHref: "/about-us",
  },
  testimonials: {
    title: "What Our Clients Are Saying",
    subtitle: "Trusted by founders and teams worldwide.",
    items: [
      {
        quote: "Donation platform is seamless and easy to use. Our donors love it!",
        name: "Matt Elston",
        role: "Donor Money",
        avatar: "https://api.dicebear.com/7.x/notionists/svg?seed=Matt",
        companyLogo: "https://api.dicebear.com/7.x/initials/svg?seed=DM",
      },
      {
        quote: "Medicine delivered in minutes. Medone has truly transformed our service.",
        name: "Ankit Bist",
        role: "Medone",
        avatar: "https://api.dicebear.com/7.x/notionists/svg?seed=Ankit",
        companyLogo: "https://api.dicebear.com/7.x/initials/svg?seed=MO",
      },
      {
        quote: "VVD made learning engaging and fun. Students love the platform!",
        name: "Rishabh Shrivastav",
        role: "VVD",
        avatar: "https://api.dicebear.com/7.x/notionists/svg?seed=Rishabh",
        companyLogo: "https://api.dicebear.com/7.x/initials/svg?seed=VV",
      },
      {
        quote: "Our video showcase website looks professional and works flawlessly.",
        name: "Momita Jaisi",
        role: "Pinkfrogfilms",
        avatar: "https://api.dicebear.com/7.x/notionists/svg?seed=Momita",
        companyLogo: "https://api.dicebear.com/7.x/initials/svg?seed=PF",
      },
      {
        quote: "DMCA DENT simplifies managing digital content. Very user-friendly.",
        name: "William",
        role: "DMCA DENT",
        avatar: "https://api.dicebear.com/7.x/notionists/svg?seed=William",
        companyLogo: "https://api.dicebear.com/7.x/initials/svg?seed=DD",
      },
      {
        quote: "Couture Click allows our customers to book tailor services effortlessly.",
        name: "Anurag",
        role: "Couture Click",
        avatar: "https://api.dicebear.com/7.x/notionists/svg?seed=Anurag",
        companyLogo: "https://api.dicebear.com/7.x/initials/svg?seed=CC",
      },
      {
        quote: "Our sensor monitoring system is accurate and reliable, thanks to Duton.",
        name: "Rohith",
        role: "Duton",
        avatar: "https://api.dicebear.com/7.x/notionists/svg?seed=Rohith",
        companyLogo: "https://api.dicebear.com/7.x/initials/svg?seed=DU",
      },
      {
        quote: "Florosense website is clean, fast, and beautifully designed.",
        name: "Adarsh",
        role: "Florosense",
        avatar: "https://api.dicebear.com/7.x/notionists/svg?seed=Adarsh",
        companyLogo: "https://api.dicebear.com/7.x/initials/svg?seed=FS",
      },
    ],
  },
  faq: {
    title: "Frequently Asked Questions",
    subtitle:
      "Find answers about Webwrite, our products, operations, and how we empower businesses and youth in India.",
    ctaLabel: "Book a Call",
    ctaHref: "",
    items: [
      {
        question: "How many products does Webwrite have?",
        answer:
          "Webwrite currently has 3 main products: Gram, SniffUrl, and RapydLaunch, designed to empower businesses and individuals with innovative solutions.",
      },
      {
        question: "What does Kalp mean?",
        answer:
          "The word 'Kalp' signifies creation and innovation. It reflects our mission to build impactful products and generate opportunities for a better India.",
      },
      {
        question: "Where is Webwrite registered?",
        answer:
          "Webwrite is registered in Bangalore, Karnataka, with CIN U62013KA2025PTC203953. The company was incorporated on 10th June, 2025.",
      },
      {
        question: "Who are the key management personnel of Kalp?",
        answer:
          "The company has two directors/key management personnel: Aman Kumar and Muskan Sharma.",
      },
      {
        question: "What activities does Webwrite engage in?",
        answer:
          "Webwrite is involved in providing software support and maintenance to clients, along with building innovative SaaS and digital solutions.",
      },
      {
        question: "Where is Webwrite's registered office?",
        answer:
          "The registered office is located at 12, R.no. 402, BBMP Ward 191, Parappana Agrahara, Electronics City, Bangalore South, Karnataka, India, 560100.",
      },
      {
        question: "Does Webwrite support startups?",
        answer:
          "Yes. We provide end-to-end product strategy, rapid prototyping, development, and ongoing support to help startups scale faster and smarter.",
      },
      {
        question: "Is Webwrite listed for government projects?",
        answer:
          "Webwrite is a private non-government company, but we focus on delivering software solutions to businesses of all sizes, including startups and enterprises.",
      },
    ],
  },
  videoTestimonial: {
    sectionLabel: "Client Story",
    title: "Founders who trust us to build",
    founderName: "Kiran M.R",
    founderRole: "Founder, Flying Passport",
    founderImage: "/clients/kiran.png",
    quote:
      "We trusted Kalp for our mobile application.\nThey have a very strong team - and what we expected,\nAman delivered.",
    description:
      "From clarity in planning to precision in execution, the experience felt reliable, professional, and founder-driven. This is how real product teams operate.",
    companyName: "Flying Passport",
    companyCategory: "Travel & Creator Brand",
    companyLink: "https://www.instagram.com/flyingpassport_tours/",
    companyImage: "/clients/flp.png",
    socialHandle: "@flyingpassport_tours",
    instagramFollowers: "500K+",
    youtubeSubscribers: "1M+",
    reelEmbedUrl: "https://www.instagram.com/reel/DRXX1kfj9up/embed",
  },
};
