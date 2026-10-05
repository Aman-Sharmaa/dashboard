// ─── Section Type Definitions ─────────────────────────────────────────────────

export type SectionType =
  // Layout
  | "frame" | "section" | "stack" | "grid" | "columns" | "spacer" | "divider"
  // Basic Elements
  | "text" | "heading" | "paragraph" | "rich-text" | "image" | "video" | "icon" | "code-block"
  // Buttons & Forms
  | "button" | "link" | "input" | "textarea" | "select"
  // Navigation
  | "navbar" | "sidebar" | "breadcrumb" | "footer"
  // Cards
  | "card" | "feature-card" | "pricing-card" | "testimonial"
  // CMS Components
  | "collection-list" | "repeater" | "dynamic-text" | "dynamic-image" | "blogs" | "team-card"
  // Media
  | "gallery" | "carousel" | "masonry-grid"
  // Interactive Components
  | "modal" | "tooltip" | "tabs" | "accordion"
  // Animation Components
  | "scroll-animation" | "hover-animation"
  // Marketing
  | "hero" | "cta" | "newsletter" | "pricing-table" | "faq" | "features"
  // Kalp Brand Components (use existing homepage components, exact design preserved)
  | "kalp-hero" | "kalp-products" | "kalp-services" | "kalp-testimonials" | "kalp-faq" | "kalp-about"
  | "kalp-rapydlaunch"
  | "kalp-founders"
  | "kalp-rapydlaunch-hero" | "kalp-rapydlaunch-process";

export interface SectionStyles {
  width?: string;
  height?: string;
  minWidth?: string;
  minHeight?: string;
  maxWidth?: string;
  maxHeight?: string;
  padding?: string;
  margin?: string;
  gap?: string;
  borderRadius?: string;
  border?: string;
  background?: string;
  backgroundColor?: string;
  backgroundImage?: string;
  color?: string;
  display?: string;
  flexDirection?: string;
  alignItems?: string;
  justifyContent?: string;
  gridTemplateColumns?: string;
  position?: string;
  zIndex?: string;
  opacity?: string;
  boxShadow?: string;
  overflow?: string;
  textAlign?: string;
  fontSize?: string;
  fontWeight?: string;
}

export interface GenericProps {
  content?: string;
  src?: string;
  alt?: string;
  href?: string;
  label?: string;
  placeholder?: string;
  title?: string;
  subtitle?: string;
  items?: any[];
  [key: string]: any;
}

// ─── Per-type props ────────────────────────────────────────────────────────────
export interface HeroProps extends GenericProps {
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
  secondaryCtaLabel: string;
  secondaryCtaHref: string;
  align: "left" | "center" | "right";
  bgColor: string;
  textColor: string;
  bgImage: string;
  badge: string;
}

export interface TextProps extends GenericProps {
  content: string; // HTML from rich text
  align: "left" | "center" | "right";
  maxWidth: "sm" | "md" | "lg" | "full";
  textColor: string;
  bgColor: string;
}

export interface ImageProps extends GenericProps {
  src: string;
  alt: string;
  caption: string;
  layout: "full" | "split-left" | "split-right" | "contained";
  splitText: string;
  rounded: boolean;
}

export interface CtaProps extends GenericProps {
  headline: string;
  subtext: string;
  buttonLabel: string;
  buttonHref: string;
  buttonStyle: "filled" | "outline" | "ghost";
  align: "left" | "center" | "right";
  bgColor: string;
  textColor: string;
  bgImage?: string;
}

export interface FeatureItem {
  icon: string;
  title: string;
  description: string;
}

export interface FeaturesProps extends GenericProps {
  title: string;
  subtitle: string;
  items: FeatureItem[];
  columns: 2 | 3 | 4;
  bgColor: string;
  textColor: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface FaqProps extends GenericProps {
  title: string;
  subtitle: string;
  items: FaqItem[];
  bgColor: string;
}

export interface SpacerProps extends GenericProps {
  size: "xs" | "sm" | "md" | "lg" | "xl";
}

export interface ColumnItem {
  content: string;
}

export interface ColumnsProps extends GenericProps {
  columns: ColumnItem[];
  count: 2 | 3;
  gap: "sm" | "md" | "lg";
  bgColor: string;
}

export interface BlogsProps extends GenericProps {
  title: string;
  subtitle: string;
  categories: string[];
  limit: number;
}

export interface TeamCardProps extends GenericProps {
  title: string;
  subtitle: string;
  members: string[];
}

// ─── Union ────────────────────────────────────────────────────────────────────

export type SectionProps =
  | HeroProps
  | TextProps
  | ImageProps
  | CtaProps
  | FeaturesProps
  | FaqProps
  | SpacerProps
  | ColumnsProps
  | BlogsProps
  | TeamCardProps
  | GenericProps;

export interface PageSection {
  id: string; // nanoid
  type: SectionType;
  props: SectionProps;
  styles?: SectionStyles;
  children?: PageSection[];
}

// ─── Default props per type ───────────────────────────────────────────────────

export const DEFAULT_PROPS: Record<SectionType, SectionProps> = {
  hero: {
    title: "Your headline goes here",
    subtitle: "A short description supporting the headline.",
    ctaLabel: "Get Started",
    ctaHref: "#",
    secondaryCtaLabel: "Learn More",
    secondaryCtaHref: "#",
    align: "center",
    bgColor: "#ffffff",
    textColor: "#0a0a0a",
    bgImage: "",
    badge: "",
  } as HeroProps,

  text: {
    content: "<p>Add your content here.</p>",
    align: "left",
    maxWidth: "md",
    textColor: "#0a0a0a",
    bgColor: "#ffffff",
  } as TextProps,

  image: {
    src: "",
    alt: "Image",
    caption: "",
    layout: "contained",
    splitText: "Add your text alongside the image here.",
    rounded: true,
  } as ImageProps,

  cta: {
    headline: "Ready to get started?",
    subtext: "Join thousands of teams already using our platform.",
    buttonLabel: "Get Started",
    buttonHref: "#",
    buttonStyle: "filled",
    align: "center",
    bgColor: "#0a0a0a",
    textColor: "#ffffff",
    bgImage: "",
  } as CtaProps,

  features: {
    title: "Why choose us",
    subtitle: "Everything you need.",
    items: [],
    columns: 3,
    bgColor: "#f9f9f9",
    textColor: "#0a0a0a",
  } as FeaturesProps,

  faq: {
    title: "Frequently Asked Questions",
    subtitle: "Everything you need to know.",
    items: [],
    bgColor: "#ffffff",
  } as FaqProps,

  spacer: {
    size: "md",
  } as SpacerProps,

  columns: {
    columns: [{ content: "<p>Column 1</p>" }, { content: "<p>Column 2</p>" }],
    count: 2,
    gap: "md",
    bgColor: "#ffffff",
  } as ColumnsProps,

  // Add generic defaults for other types
  "frame": {}, "section": {}, "stack": {}, "grid": { columns: 2, gap: "md" }, "divider": {},
  "heading": { title: "Heading", tag: "h2", align: "left" },
  "paragraph": { content: "Paragraph text", align: "left" },
  "rich-text": { content: "<p>Rich text block</p>" },
  "video": { src: "https://www.youtube.com/embed/dQw4w9WgXcQ" },
  "icon": { icon: "Star", size: 24, color: "#000000" },
  "code-block": { content: "console.log('Hello world');", language: "javascript" },
  "button": { label: "Click Me", href: "#", variant: "default" },
  "link": { label: "Link", href: "#" },
  "input": { placeholder: "Enter text...", type: "text" },
  "textarea": { placeholder: "Enter long text..." },
  "select": { placeholder: "Select an option", items: [{ label: "Option 1", value: "1" }] },
  "navbar": { items: [{ label: "Home", href: "/" }] },
  "sidebar": {},
  "breadcrumb": {},
  "footer": {},
  "card": { title: "Card Title", content: "Card content", image: "" },
  "feature-card": { title: "Feature", content: "Description", icon: "Award" },
  "pricing-card": { title: "Pro Plan", price: "$99", features: ["Feature 1", "Feature 2"], buttonLabel: "Buy Now", buttonHref: "#" },
  "testimonial": { quote: "Great!", author: "John Doe", role: "CEO", avatar: "" },
  "collection-list": {}, "repeater": {}, "dynamic-text": {}, "dynamic-image": {},
  "blogs": { title: "Latest Blogs", subtitle: "Read our latest articles.", categories: [], limit: 3 } as BlogsProps,
  "team-card": { title: "Meet Our Team", subtitle: "The people behind our success.", members: [] } as TeamCardProps,
  "gallery": { items: [{ src: "https://placehold.co/600x400", alt: "Image 1" }, { src: "https://placehold.co/600x400", alt: "Image 2" }] },
  "carousel": { items: [{ src: "https://placehold.co/800x400", alt: "Slide 1" }] },
  "masonry-grid": { items: [] },
  "modal": { title: "Modal Title", content: "Modal content", buttonLabel: "Open Modal" },
  "tooltip": { content: "Tooltip text", label: "Hover me" },
  "tabs": { items: [{ label: "Tab 1", content: "Content 1" }, { label: "Tab 2", content: "Content 2" }] },
  "accordion": { items: [{ title: "Item 1", content: "Content 1" }, { title: "Item 2", content: "Content 2" }] },
  "scroll-animation": { animationType: "fade-up", duration: "1000", delay: "0" },
  "hover-animation": { animationType: "scale", scale: 1.05 },
  "newsletter": { title: "Subscribe to our newsletter", subtitle: "Get the latest updates", placeholder: "Enter your email", buttonLabel: "Subscribe" },
  "pricing-table": {
    title: "Pricing Plans",
    subtitle: "Choose the best plan for you",
    items: [
      { title: "Basic", price: "$10/mo", features: ["Feature 1", "Feature 2"], buttonLabel: "Start Basic", recommended: false },
      { title: "Pro", price: "$29/mo", features: ["Feature 1", "Feature 2", "Feature 3"], buttonLabel: "Start Pro", recommended: true }
    ]
  },
  // Kalp brand components ~ no extra props needed, they use CMS settings internally
  "kalp-hero": {
    announcementText: "Welcome to Webwrite",
    announcementHref: "#",
    announcementIcon: "Sparkles",
    titleStatic: "Built in India.",
    titleTyping: " Designed for the Future.",
    description: "Empowering businesses with modern software solutions and expert development services.",
    primaryCtaLabel: "Explore Services",
    primaryCtaTargetId: "services",
    secondaryCtaLabel: "Book a Call",
    secondaryCtaHref: "",
    trustedText: "Trusted by 100+ clients",
  },
  "kalp-products": {
    title: "Our Solutions",
    subtitle: "Thoughtfully designed tools that help teams move faster and smarter.",
    items: []
  },
  "kalp-services": {
    badge: "Our Service",
    title: "Rapydlaunch · launch anything in 45 days",
    subtitle: "A focused launch program for B2B SaaS and AI products, from idea and prototype to a production-ready launch in weeks, not months.",
    bullets: [
      {
        icon: "Rocket",
        title: "0 to 1 in production",
        description: "Design, build, and ship a real, usable product, not just a prototype or slide deck."
      },
      {
        icon: "CalendarCheck2",
        title: "45-day launch window",
        description: "Opinionated, time-boxed process that forces clarity on scope, priorities, and must-have features."
      },
      {
        icon: "Workflow",
        title: "Strategy + build, not just dev",
        description: "We shape the product, architecture, and go-to-market together so you are ready to sell on day one."
      }
    ],
    cardBadge: "Rapydlaunch",
    cardTitle: "Launch your next product with a proven playbook.",
    cardDescription: "Join founders who have shipped SaaS, AI tools, and platforms with us. We bring the same launch rigor that powers the dedicated Rapydlaunch offering.",
    cardTimeline: "<= 45 days",
    cardLaunches: "20+ products",
    exploreLabel: "Explore",
    exploreHref: "/rapydlaunch",
    launchLabel: "Launch",
    launchHref: ""
  },
  "kalp-testimonials": {
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
    ]
  },
  "kalp-faq": {},
  "kalp-about": {
    title: "We empower startups to scale smarter and faster",
    subtitle: "We are a team of designers and engineers driven by one goal ~ helping ambitious startups build products that grow.",
    ratingText: "Rated 5.0 by founders worldwide",
    mission: {
      title: "Our Mission",
      description: "Empower teams and founders with tools that reduce friction, simplify workflows, and enable sustainable growth."
    },
    stats: [
      { value: "250+", label: "Projects Supported" },
      { value: "85%", label: "Client Retention Rate" },
      { value: "98%", label: "Client Satisfaction" },
      { value: "30+", label: "Integrations Supported" }
    ],
    teamSectionTitle: "Our Founders & Team",
    teamSectionSubtitle: "Our team combines deep industry knowledge with hands-on experience to help startups grow smarter and faster.",
    founders: [],
    teamMembers: [],
    timeline: [],
    culture: {
      title: "Our Culture at Cycle",
      subtitle: "A culture shaped by trust, humility, and a shared mission to elevate software teams.",
      cards: [
        { icon: "ShieldCheck", title: "Strength & Integrity", description: "True impact starts with strong execution and honest action ~ we lead with." },
        { icon: "TrendingUp", title: "Continuous Growth", description: "We grow through feedback, failure, and progress ~ always learning, always evolving." },
        { icon: "Award", title: "Trust", description: "We build trust by handling every idea and interaction with care." },
        { icon: "Link", title: "Resilience in Adversity", description: "We face challenges with calm and clarity, knowing ease always follows." },
        { icon: "RefreshCw", title: "Change Starts With Us", description: "Change starts within ~ we improve for ourselves before improving for others." },
        { icon: "Layers", title: "Collaboration Over Ego", description: "We build together, valuing teamwork over ego ~ the mission comes first." }
      ]
    },
    hiring: [],
    clientLogos: [
      "/clients/dm.svg",
      "/clients/as.svg",
      "/clients/medone.svg",
      "/clients/zuari.svg",
      "/clients/dmca.svg",
      "/clients/flp.svg",
      "/clients/smep.svg",
      "/clients/floro.svg",
      "/clients/serrisvg.svg",
      "/clients/pmc.png"
    ]
  },
  "kalp-rapydlaunch": {},

  "kalp-founders": { title: "Our Founders & Team", subtitle: "Our team combines deep industry knowledge with hands-on experience to help startups grow smarter and faster.", buttonLabel: "Learn more", buttonHref: "#", member1Id: "", member2Id: "" },
  "kalp-rapydlaunch-hero": { badge: "Powered by Rapydlaunch", title: "Your Full-Service Digital Partner", subtitle: "Video, design, development, marketing, AI, social media, influencer management, and everything in between - one team, one goal.", description: "Launch Anything in 45 Days", ratingText: "4.9/5 • 20+ reviews", trustedText: "Trusted by 50+ founders & businesses worldwide", deliveredText: "100+ projects delivered", ctaLabel: "Get Started", secondaryCtaLabel: "Book a Call", secondaryCtaHref: "" },
  "kalp-rapydlaunch-process": { title: "How We Work", subtitle: "A streamlined process designed for speed, quality, and transparency." },

};

// ─── Metadata for the Section Library panel ──────────────────────────────────

export type SectionCategory = "Layout" | "Basic" | "Forms" | "Navigation" | "Cards" | "CMS" | "Media" | "Interactive" | "Animation" | "Marketing" | "Kalp";

export interface SectionMeta {
  type: SectionType;
  label: string;
  description: string;
  icon: string; // lucide icon name
  category: SectionCategory;
}

export const SECTION_LIBRARY: SectionMeta[] = [
  // Layout
  { type: "frame", label: "Frame", description: "Container for elements", icon: "Box", category: "Layout" },
  { type: "section", label: "Section", description: "Full width section wrapper", icon: "LayoutTemplate", category: "Layout" },
  { type: "stack", label: "Stack", description: "Vertical or horizontal stack", icon: "Layers", category: "Layout" },
  { type: "grid", label: "Grid", description: "CSS Grid container", icon: "LayoutGrid", category: "Layout" },
  { type: "columns", label: "Columns", description: "2 or 3 column layout", icon: "Columns2", category: "Layout" },
  { type: "spacer", label: "Spacer", description: "Add vertical spacing", icon: "ArrowUpDown", category: "Layout" },
  { type: "divider", label: "Divider", description: "Horizontal line", icon: "Minus", category: "Layout" },

  // Basic Elements
  { type: "text", label: "Text Block", description: "Basic text", icon: "Type", category: "Basic" },
  { type: "heading", label: "Heading", description: "H1-H6 element", icon: "Heading", category: "Basic" },
  { type: "paragraph", label: "Paragraph", description: "Paragraph element", icon: "Pilcrow", category: "Basic" },
  { type: "rich-text", label: "Rich Text", description: "Formatted text", icon: "AlignLeft", category: "Basic" },
  { type: "image", label: "Image", description: "Image element", icon: "ImageIcon", category: "Basic" },
  { type: "video", label: "Video", description: "Video player", icon: "Video", category: "Basic" },
  { type: "icon", label: "Icon", description: "SVG Icon", icon: "Star", category: "Basic" },
  { type: "code-block", label: "Code Block", description: "Display source code", icon: "Code", category: "Basic" },

  // Buttons & Forms
  { type: "button", label: "Button", description: "Clickable button", icon: "MousePointer2", category: "Forms" },
  { type: "link", label: "Link", description: "Hyperlink", icon: "Link2", category: "Forms" },
  { type: "input", label: "Input", description: "Text input field", icon: "TextCursorInput", category: "Forms" },
  { type: "textarea", label: "Textarea", description: "Multiline input", icon: "FormInput", category: "Forms" },
  { type: "select", label: "Select", description: "Dropdown select", icon: "ListFilter", category: "Forms" },

  // Navigation
  { type: "navbar", label: "Navbar", description: "Top navigation", icon: "Menu", category: "Navigation" },
  { type: "sidebar", label: "Sidebar", description: "Side navigation", icon: "Sidebar", category: "Navigation" },
  { type: "breadcrumb", label: "Breadcrumb", description: "Navigation path", icon: "MoreHorizontal", category: "Navigation" },
  { type: "footer", label: "Footer", description: "Page footer", icon: "PanelBottom", category: "Navigation" },

  // Cards
  { type: "card", label: "Card", description: "Basic card", icon: "SquareSquare", category: "Cards" },
  { type: "feature-card", label: "Feature Card", description: "Card for features", icon: "Award", category: "Cards" },
  { type: "pricing-card", label: "Pricing Card", description: "Card for pricing", icon: "DollarSign", category: "Cards" },
  { type: "testimonial", label: "Testimonial", description: "User review", icon: "MessageSquareQuote", category: "Cards" },

  // CMS
  { type: "collection-list", label: "Collection List", description: "List of CMS items", icon: "Database", category: "CMS" },
  { type: "repeater", label: "Repeater", description: "Repeat elements", icon: "Repeat", category: "CMS" },
  { type: "dynamic-text", label: "Dynamic Text", description: "CMS text field", icon: "TextSelect", category: "CMS" },
  { type: "dynamic-image", label: "Dynamic Image", description: "CMS image field", icon: "ImagePlus", category: "CMS" },
  { type: "blogs", label: "Blogs", description: "List of blog posts", icon: "BookOpen", category: "CMS" },
  { type: "team-card", label: "Team", description: "Team members grid", icon: "Users", category: "CMS" },

  // Media
  { type: "gallery", label: "Gallery", description: "Image gallery", icon: "Images", category: "Media" },
  { type: "carousel", label: "Carousel", description: "Image slider", icon: "GalleryHorizontal", category: "Media" },
  { type: "masonry-grid", label: "Masonry", description: "Masonry layout", icon: "LayoutDashboard", category: "Media" },

  // Interactive
  { type: "modal", label: "Modal", description: "Popup modal", icon: "AppWindow", category: "Interactive" },
  { type: "tooltip", label: "Tooltip", description: "Hover info", icon: "MessageCircle", category: "Interactive" },
  { type: "tabs", label: "Tabs", description: "Tabbed content", icon: "FolderDown", category: "Interactive" },
  { type: "accordion", label: "Accordion", description: "Collapsible panels", icon: "ListCollapse", category: "Interactive" },

  // Animation
  { type: "scroll-animation", label: "Scroll Anim", description: "Animate on scroll", icon: "Mouse", category: "Animation" },
  { type: "hover-animation", label: "Hover Anim", description: "Animate on hover", icon: "Pointer", category: "Animation" },

  // Marketing
  { type: "hero", label: "Hero", description: "Large headline section", icon: "Sparkles", category: "Marketing" },
  { type: "cta", label: "Call to Action", description: "Conversion banner", icon: "MousePointerClick", category: "Marketing" },
  { type: "newsletter", label: "Newsletter", description: "Email signup", icon: "Mail", category: "Marketing" },
  { type: "pricing-table", label: "Pricing Table", description: "Compare plans", icon: "Table", category: "Marketing" },
  { type: "faq", label: "FAQ List", description: "Q&A list", icon: "MessageCircleQuestion", category: "Marketing" },

  // Kalp Brand Components
  { type: "kalp-hero", label: "Kalp Hero", description: "Homepage hero with typing animation", icon: "Zap", category: "Kalp" },
  { type: "kalp-products", label: "Kalp Products", description: "Product cards", icon: "Package", category: "Kalp" },
  { type: "kalp-services", label: "Kalp Services", description: "Rapydlaunch service section", icon: "Rocket", category: "Kalp" },
  { type: "kalp-testimonials", label: "Kalp Testimonials", description: "Scrolling testimonials marquee", icon: "MessageSquare", category: "Kalp" },
  { type: "kalp-faq", label: "Kalp FAQ", description: "Animated FAQ accordion", icon: "HelpCircle", category: "Kalp" },
  { type: "kalp-about", label: "Kalp About", description: "Team & mission section", icon: "Users", category: "Kalp" },
  { type: "kalp-founders", label: "Kalp Founders", description: "Left content, right team profiles", icon: "Users", category: "Kalp" },
  { type: "kalp-rapydlaunch", label: "Kalp RapydLaunch", description: "Full digital agency service page", icon: "Rocket", category: "Kalp" },
];
