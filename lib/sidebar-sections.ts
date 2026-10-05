/** Default sidebar group order (after Shortcuts). Overview (home + tasks) first, then ops. */
export const DEFAULT_SIDEBAR_SECTION_ORDER = [
  "Overview",
  "DevOps",
  "Work",
  "Finance",
  "User & Access",
  "Content",
  "Personal",
] as const;

export type SidebarSectionLabel = (typeof DEFAULT_SIDEBAR_SECTION_ORDER)[number] | string;

export function sortSidebarSections<T extends { label: string }>(
  sections: T[],
  customOrder?: string[] | null
): T[] {
  const order =
    customOrder && customOrder.length > 0
      ? customOrder
      : [...DEFAULT_SIDEBAR_SECTION_ORDER];
  const rank = (label: string) => {
    // Home + task board stay at top for every user, even with legacy custom orders.
    if (label === "Overview") return -1;
    const i = order.indexOf(label);
    return i === -1 ? 1000 + label.charCodeAt(0) : i;
  };
  return [...sections].sort((a, b) => rank(a.label) - rank(b.label));
}
