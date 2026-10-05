/**
 * Curated discovery keywords for Webwrite products & services (Gram, SniffUrl, RapydLaunch, studio services).
 * Used by /ai-product-keywords.txt for crawlers and retrieval-friendly indexing.
 */
export const AI_PRODUCT_KEYWORD_COUNT = 500;

const PRODUCT_CORE = [
  "Webwrite",
  "Webwrite",
  "Webwrite",
  "Webwrite innovation studio",
  "Webwrite software company",
  "Webwrite India",
  "Webwrite Noida",
  "Webwrite Delhi NCR",
  "Gram",
  "Gram by Kalp",
  "Gram social media",
  "Gram scheduling",
  "Gram content calendar",
  "SniffUrl",
  "Sniff URL",
  "SniffUrl analytics",
  "SniffUrl deep linking",
  "SniffUrl SDK",
  "SniffUrl link shortener",
  "RapydLaunch",
  "Rapyd Launch",
  "RapydLaunch startups",
  "RapydLaunch platform",
  "Kalp workspace",
  "Kalp Gram Books",
  "Gram Books khata",
  "Kalp deployment console",
];

const SERVICE_CORE = [
  "SaaS development company",
  "SaaS maintenance services",
  "mobile app development India",
  "SaaS UI UX design",
  "marketing branding agency",
  "video editing services",
  "custom software development",
  "web application development",
  "API development services",
  "cloud application development",
  "digital agency India full stack",
  "startup MVP agency",
  "internal tools development",
  "employee task management software",
  "link management platform",
  "branded link shortener B2B",
];

const MODIFIERS_A = [
  "pricing",
  "features",
  "dashboard",
  "free tier",
  "login",
  "signup",
  "documentation",
  "API",
  "SDK",
  "integration",
  "iOS",
  "Android",
  "React Native",
  "Flutter",
  "web",
  "analytics",
  "campaign",
  "attribution",
  "deep link",
  "deferred deep linking",
  "URL shortener",
  "link tracking",
  "UTM",
  "conversion tracking",
  "social media management",
  "content scheduling",
  "post scheduler",
  "team collaboration",
  "startup launchpad",
  "fundraising tools",
  "task board",
  "workspace console",
  "role based access",
  "invoice automation",
  "client portal",
];

const MODIFIERS_B = [
  "for startups",
  "for enterprises",
  "for marketers",
  "for developers",
  "for mobile apps",
  "for e-commerce",
  "India",
  "SaaS",
  "B2B",
  "B2C",
  "2025",
  "2026",
  "best",
  "alternative",
  "review",
  "compare",
  "vs Branch",
  "vs AppsFlyer",
  "vs Bitly",
  "organic growth",
  "paid acquisition",
  "retention",
  "engagement",
  "Noida tech company",
  "Uttar Pradesh software",
  "global remote team",
];

/** India / MMP / deep-link discovery phrases (prioritized in output order). */
const INDIA_ATTRIBUTION_DISCOVERY = [
  "free mobile measurement partner tool India",
  "free app attribution tool for startups India",
  "free mobile attribution analytics India",
  "free MMP platform for mobile apps India",
  "best free MMP tool for Android India",
  "free install tracking tool mobile India",
  "free mobile marketing measurement platform",
  "free app install attribution software India",
  "no cost MMP tool for Indian startups",
  "free campaign tracking tool mobile India",
  "free ROI measurement tool mobile apps India",
  "free user acquisition measurement tool India",
  "free alternative to AppsFlyer India",
  "free alternative to Adjust for Indian apps",
  "free app analytics attribution tool India 2024",
  "MMP tool free plan India small business",
  "free mobile app measurement tool no credit card",
  "lightweight free MMP solution India",
  "free mobile attribution tool SaaS India",
  "free MMP SDK integration India",
  "free open source mobile attribution tool India",
  "open source MMP alternative India",
  "open source app tracking tool India",
  "open source deep linking SDK India",
  "self hosted mobile attribution software India",
  "open source AppsFlyer alternative India",
  "free open source app install tracker India",
  "open source mobile marketing tool India",
  "free open source campaign attribution India",
  "GitHub mobile attribution tool India free",
  "open source branch.io alternative India",
  "free open source universal deep link tool",
  "free open source app growth tool India",
  "open source mobile measurement SDK India",
  "free self hosted MMP tool for startups India",
  "cheap deep linking tool India",
  "affordable deep link tool for apps India",
  "low cost deep linking solution India",
  "budget deep linking platform India startups",
  "cheaper alternative to Branch.io India",
  "cheaper deep link tool than Firebase India",
  "cost effective deep linking India small business",
  "deep linking tool cheap pricing India 2024",
  "affordable universal link tool Android iOS India",
  "low price mobile deep link SaaS India",
  "best value deep linking tool India",
  "deep linking cheaper than Appsflyer India",
  "inexpensive deep link attribution India",
  "economical deep linking solution for D2C India",
  "deep linking tool with free tier India",
  "free deep linking tool India",
  "free universal deep link tool Android India",
  "free deferred deep linking tool India",
  "free smart link tool India mobile",
  "free deep link generator India",
  "free branch.io alternative deep linking India",
  "free Firebase dynamic links alternative India",
  "free app link shortener with deep link India",
  "free deep linking for ecommerce India",
  "free deep link tool for D2C brands India",
  "free deferred deep link SDK India",
  "free mobile deep linking platform India startup",
  "free QR code deep link tool India",
  "free one link tool India attribution",
  "free custom deep link domain tool India",
  "MMP tool made in India",
  "Indian mobile attribution startup tool",
  "best MMP tool for Indian ecommerce apps",
  "mobile measurement tool India INR pricing",
  "app attribution tool India vernacular apps",
  "deep linking tool India D2C brands",
  "mobile attribution tool India fintech",
  "MMP tool India edtech startup affordable",
  "app tracking tool India gaming apps",
  "mobile measurement India UPI app attribution",
  "deep link tool India Hindi support",
  "install attribution tool India tier 2 cities",
  "mobile analytics MMP India rupee billing",
  "best app attribution tool India 2024",
  "MMP platform for Indian app developers free",
  "sniffurl vs AppsFlyer India comparison",
  "sniffurl vs Adjust India free plan",
  "sniffurl vs Branch.io deep linking India",
  "sniffurl vs CleverTap attribution India",
  "free AppsFlyer alternative India 2024",
  "free Adjust alternative mobile attribution India",
  "free Branch.io alternative deep link India",
  "Firebase dynamic links alternative free India",
  "cheap MMP India instead of AppsFlyer",
  "affordable Adjust alternative Indian startups",
  "free app attribution with fraud detection India",
  "deep link tool with retargeting India free",
  "free mobile attribution real time dashboard India",
  "deep linking tool with custom domain India free",
  "free MMP with Google Ads integration India",
  "free mobile attribution Meta ads India",
  "free app install tracking without SDK India",
  "free cohort analysis mobile attribution India",
  "deep linking tool with QR code free India",
  "free MMP tool with API access India",
];

const LONG_TAIL = [
  "Kalp Gram social scheduling tool",
  "Kalp SniffUrl deep link analytics",
  "SniffUrl app.sniffurl.com",
  "deep linking platform India",
  "mobile attribution without MMP bloat",
  "short link with click analytics",
  "branded short domain links",
  "multi-touch attribution links",
  "A B testing deep links",
  "React Native deep linking library",
  "Flutter deferred deep links",
  "iOS universal links setup",
  "Android App Links configuration",
  "Gram social media analytics",
  "schedule Instagram posts tool",
  "content calendar for teams",
  "RapydLaunch startup discovery",
  "innovation studio SaaS products",
  "Kalp products Gram SniffUrl",
  "software studio Noida Uttar Pradesh",
  "hire SaaS development team",
  "MVP development services",
  "product design sprint",
  "technical due diligence software",
  "legacy SaaS modernization",
  "performance optimization web app",
  "security audit SaaS",
  "CI CD pipeline setup",
  "PostgreSQL MongoDB backend",
  "Next.js development agency",
  "TypeScript full stack team",
  "headless CMS integration",
  "payment gateway integration India",
  "subscription billing SaaS",
  "multi-tenant architecture",
  "white label SaaS",
  "SniffUrl npm package",
  "install SniffUrl SDK",
  "track in-app purchases analytics",
  "funnel analysis mobile app",
  "cohort analysis links",
  "QR code campaign tracking",
  "email link tracking",
  "SMS marketing short links",
  "affiliate link management",
  "partner attribution links",
  "Gram content approval workflow",
  "social listening lite",
  "hashtag analytics",
  "best time to post scheduler",
  "cross platform social dashboard",
  "Kalp contact sales",
  "book demo Kalp products",
  "Kalp dashboard for teams",
  "Kalp task board todos",
  "SniffUrl vs Adjust deep links",
  "SniffUrl webhooks link events",
  "Gram approve posts workflow",
  "RapydLaunch 45 day launch",
  "offshore development team India",
  "Next.js SaaS boilerplate customization",
  "MongoDB Atlas Next.js stack",
  "Stripe Razorpay subscription India",
  "SOC2 readiness consulting SaaS",
  "observability uptime monitoring startup",
  "Kubernetes deployment consulting",
  "serverless API India development",
  "GraphQL REST API design",
  "React dashboard admin template custom",
  "employee reimbursement workflow software",
  "small business ledger app India",
  "influencer campaign tracking links",
  "organic social ROI measurement",
  "LinkedIn scheduling tool B2B",
  "multi brand social media suite",
  "Kalp sniffurl gram rapydlaunch stack",
  "hire product engineering studio",
  "fractional CTO technical advisory",
];

function normalizePhrase(s: string): string {
  return s
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^[,.\s]+|[,.\s]+$/g, "")
    .slice(0, 120);
}

/** Prefer tier order (India attribution, then long-tail), then alphabetical fill to `target`. */
function mergePrioritizedKeywordLines(
  set: Set<string>,
  tiers: readonly (readonly string[])[],
  target: number
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const tier of tiers) {
    for (const raw of tier) {
      const n = normalizePhrase(raw).toLowerCase();
      if (n.length < 2 || seen.has(n) || !set.has(n)) continue;
      out.push(n);
      seen.add(n);
      if (out.length >= target) return out;
    }
  }
  const rest = Array.from(set)
    .filter((k) => !seen.has(k))
    .sort((a, b) => a.localeCompare(b));
  for (const k of rest) {
    out.push(k);
    if (out.length >= target) break;
  }
  return out;
}

const KEYWORD_PRIORITY_TIERS = [INDIA_ATTRIBUTION_DISCOVERY, LONG_TAIL] as const;

/** Returns exactly `target` unique lowercase keyword phrases (default AI_PRODUCT_KEYWORD_COUNT). */
export function buildAIProductKeywords(target = AI_PRODUCT_KEYWORD_COUNT): string[] {
  const set = new Set<string>();

  const add = (s: string) => {
    const n = normalizePhrase(s);
    if (n.length < 2) return;
    set.add(n.toLowerCase());
  };

  for (const t of INDIA_ATTRIBUTION_DISCOVERY) add(t);
  for (const t of LONG_TAIL) add(t);
  for (const t of PRODUCT_CORE) add(t);
  for (const t of SERVICE_CORE) add(t);

  for (const p of PRODUCT_CORE) {
    for (const m of MODIFIERS_A) {
      add(`${p} ${m}`);
      if (set.size >= target + 40) break;
    }
    if (set.size >= target + 40) break;
  }

  for (const p of PRODUCT_CORE) {
    for (const m of MODIFIERS_B) {
      add(`${p} ${m}`);
      if (set.size >= target + 40) break;
    }
    if (set.size >= target + 40) break;
  }

  for (const s of SERVICE_CORE) {
    for (const m of MODIFIERS_A) {
      add(`${s} ${m}`);
      if (set.size >= target + 80) break;
    }
    if (set.size >= target + 80) break;
  }

  for (const s of SERVICE_CORE) {
    for (const m of MODIFIERS_B) {
      add(`${s} ${m}`);
      if (set.size >= target + 120) break;
    }
    if (set.size >= target + 120) break;
  }

  // Extra compositional fillers until we hit target
  const verbs = ["build", "ship", "scale", "measure", "optimize", "automate", "secure", "deploy", "monitor", "grow"];
  const nouns = ["links", "campaigns", "funnels", "users", "revenue", "retention", "latency", "uptime", "dashboards", "workflows"];
  for (const p of ["SniffUrl", "Gram", "RapydLaunch", "Webwrite"]) {
    for (const v of verbs) {
      for (const n of nouns) {
        add(`${p} ${v} ${n}`);
        if (set.size >= target + 200) break;
      }
      if (set.size >= target + 200) break;
    }
    if (set.size >= target + 200) break;
  }

  return mergePrioritizedKeywordLines(set, KEYWORD_PRIORITY_TIERS, target);
}
