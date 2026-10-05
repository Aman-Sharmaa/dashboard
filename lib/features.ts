/**
 * All assignable dashboard features.
 * Admins always have full access ~ this list is used to control employee access.
 */

export type FeatureDefinition = {
  key: string;
  label: string;
  description: string;
  group: string;
  /** If true, this feature is always available and cannot be revoked */
  alwaysOn?: boolean;
};

export const FEATURE_FAMILIES: Record<string, { parent: string; children: string[] }> = {
  todo: {
    parent: "todo",
    children: ["todo_tasks", "todo_goals", "todo_routines", "todo_reports"],
  },
  cms: {
    parent: "cms",
    children: ["cms_pages", "cms_posts", "cms_categories", "website"],
  },
};

export function effectiveFeatureEnabled(access: string[], featureKey: string): boolean {
  for (const family of Object.values(FEATURE_FAMILIES)) {
    if (!family.children.includes(featureKey)) continue;
    const hasExplicitChildren = family.children.some((key) => access.includes(key));
    return hasExplicitChildren ? access.includes(featureKey) : access.includes(family.parent);
  }
  return access.includes(featureKey);
}

export const ALL_FEATURES: FeatureDefinition[] = [
  // Main
  { key: "dashboard", label: "Overview", description: "Main dashboard overview", group: "Main", alwaysOn: true },
  { key: "todo", label: "Work", description: "Tasks, goals, routines, and reports navigation", group: "Main" },
  { key: "todo_tasks", label: "Work · Tasks", description: "Tasks option inside the Work navigation", group: "Work navigation" },
  { key: "todo_goals", label: "Work · Goals & KPIs", description: "Goals & KPIs option inside the Work navigation", group: "Work navigation" },
  { key: "todo_routines", label: "Work · Routines", description: "Routines option inside the Work navigation", group: "Work navigation" },
  { key: "todo_reports", label: "Work · Reports", description: "Reports & Analytics option inside the Work navigation", group: "Work navigation" },
  { key: "monitor", label: "Monitor", description: "Service monitoring dashboard", group: "Main" },
  { key: "deployments", label: "Deployments", description: "Deployment management and tracking", group: "Main" },

  // CRM
  { key: "leads", label: "Leads", description: "Lead management and tracking", group: "CRM" },
  { key: "clients", label: "Clients", description: "Client management", group: "CRM" },
  { key: "products", label: "Businesses", description: "Business and product management", group: "CRM" },

  // Work
  { key: "projects", label: "Projects", description: "Project management and tracking", group: "Work" },
  { key: "plans", label: "Documents", description: "Document and plan creation and management", group: "Work" },
  { key: "drive", label: "Drive", description: "File storage, folders, and sharing", group: "Work" },

  // Finance
  { key: "invoices", label: "Invoices", description: "Invoice creation and management", group: "Finance" },
  { key: "expenses", label: "Expenses", description: "Monthly recurring expenses and breakdown", group: "Finance" },
  { key: "proposals", label: "Proposals", description: "Proposal creation and sending", group: "Finance" },
  { key: "khatabook", label: "Gram Books", description: "Daily revenue and expense ledger", group: "Finance" },
  { key: "debts", label: "Debts", description: "Debt tracking and management", group: "Finance" },

  // Team & HR
  { key: "team", label: "Team Members", description: "View team members and directory", group: "Team & HR" },
  { key: "attendance", label: "Attendance", description: "Attendance tracking and logs", group: "Team & HR" },
  { key: "assets", label: "Assets", description: "Company asset management", group: "Team & HR" },

  // Personal
  { key: "reimbursements", label: "Reimbursements", description: "Submit and track reimbursements", group: "Personal" },
  { key: "payslips", label: "Payslips", description: "View salary payslips", group: "Personal" },

  // Content
  { key: "roadmap", label: "Roadmap", description: "Product roadmap and planning board", group: "Content" },
  { key: "movies", label: "Movie Party", description: "Movie party feature and events", group: "Content" },
  { key: "cms", label: "CMS", description: "Content management ~ Pages, Posts, Categories", group: "Content" },
  { key: "cms_pages", label: "CMS · Pages", description: "Pages option inside CMS navigation", group: "Content navigation" },
  { key: "cms_posts", label: "CMS · Posts", description: "Posts option inside CMS navigation", group: "Content navigation" },
  { key: "cms_categories", label: "CMS · Categories", description: "Categories option inside CMS navigation", group: "Content navigation" },
  { key: "website", label: "Website", description: "Website content and settings navigation", group: "Content navigation" },
];

/** Default features assigned to new employees (backward-compatible with the old hardcoded sidebar) */
export const DEFAULT_EMPLOYEE_FEATURES = [
  "dashboard",
  "todo",
  "todo_tasks",
  "todo_goals",
  "todo_routines",
  "todo_reports",
  "roadmap",
  "projects",
  "plans",
  "drive",
  "expenses",
  "khatabook",
  "debts",
  "attendance",
  "reimbursements",
  "payslips",
  "team",
  "cms",
  "cms_pages",
  "cms_posts",
  "cms_categories",
  "website",
];

/** Get grouped features for UI display */
export function getGroupedFeatures() {
  const groups: Record<string, FeatureDefinition[]> = {};
  for (const f of ALL_FEATURES) {
    if (!groups[f.group]) groups[f.group] = [];
    groups[f.group].push(f);
  }
  return groups;
}
