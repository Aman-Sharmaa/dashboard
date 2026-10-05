# Webwrite Design Library ~ Full Product Overview

Use this document to replicate the same UI and design system in new projects. Copy the packages, tokens, and structure below.

---

## 1. Core packages (npm)

### UI primitives & components
| Package | Version | Purpose |
|--------|---------|---------|
| `@radix-ui/react-avatar` | ^1.1.11 | Avatar with fallback |
| `@radix-ui/react-checkbox` | ^1.3.3 | Checkbox |
| `@radix-ui/react-collapsible` | ^1.1.12 | Collapsible sections |
| `@radix-ui/react-dialog` | ^1.1.15 | Modal dialogs |
| `@radix-ui/react-dropdown-menu` | ^2.1.16 | Dropdown menus |
| `@radix-ui/react-label` | ^2.1.8 | Form labels |
| `@radix-ui/react-popover` | ^1.1.15 | Popovers |
| `@radix-ui/react-scroll-area` | ^1.2.10 | Custom scrollbars |
| `@radix-ui/react-select` | ^2.2.6 | Select dropdowns |
| `@radix-ui/react-separator` | ^1.1.8 | Dividers |
| `@radix-ui/react-slot` | ^1.2.4 | Polymorphic slot (e.g. Button asChild) |
| `@radix-ui/react-switch` | ^1.2.6 | Toggle switches |
| `@radix-ui/react-tabs` | ^1.1.13 | Tabs |
| `@radix-ui/react-tooltip` | ^1.2.8 | Tooltips |

### Styling & utilities
| Package | Version | Purpose |
|--------|---------|---------|
| `tailwindcss` | ^3.4.1 | Utility CSS |
| `tailwindcss-animate` | ^1.0.7 | Animations (e.g. accordion, dialog) |
| `@tailwindcss/typography` | ^0.5.19 | Prose styles |
| `class-variance-authority` (cva) | ^0.7.1 | Component variants (e.g. button variants) |
| `clsx` | ^2.1.1 | Conditional class names |
| `tailwind-merge` | ^3.4.0 | Merge Tailwind classes without conflicts |

### Icons & motion
| Package | Version | Purpose |
|--------|---------|---------|
| `lucide-react` | ^0.344.0 | Icon set |
| `react-icons` | ^5.5.0 | Additional icons (optional) |
| `framer-motion` | ^11.0.0 | Page and component animations |

### Forms & validation
| Package | Version | Purpose |
|--------|---------|---------|
| `react-hook-form` | ^7.71.1 | Form state & validation |
| `@hookform/resolvers` | ^5.2.2 | Zod (or other) schema resolvers |
| `zod` | ^4.3.6 | Schema validation |

### Theme & feedback
| Package | Version | Purpose |
|--------|---------|---------|
| `next-themes` | ^0.4.6 | Optional: system/light/dark (this project uses custom ThemeProvider) |
| `sonner` | ^2.0.7 | Toast notifications |

### Optional (used in this app)
| Package | Version | Purpose |
|--------|---------|---------|
| `react-day-picker` | ^9.13.1 | Date picker (Calendar) |
| `date-fns` | ^4.1.0 | Date formatting |
| `recharts` | ^3.7.0 | Charts |
| `@tiptap/*` | ^3.19.0 | Rich text editor |

---

## 2. Design tokens (CSS variables)

Define in `app/globals.css` under `:root` and `.dark`. All values are HSL without `hsl()` (e.g. `0 0% 9%`). Tailwind uses them via `hsl(var(--name))`.

### Semantic colors
| Token | Light (example) | Usage |
|-------|------------------|--------|
| `--background` | 0 0% 100% | Page background |
| `--foreground` | 0 0% 3.9% | Default text |
| `--card` / `--card-foreground` | 0 0% 100% / 0 0% 3.9% | Cards |
| `--popover` / `--popover-foreground` | 0 0% 100% / 0 0% 3.9% | Popovers, dropdowns |
| `--primary` / `--primary-foreground` | 0 0% 9% / 0 0% 98% | Primary buttons, links |
| `--secondary` / `--secondary-foreground` | 0 0% 96.1% / 0 0% 9% | Secondary buttons |
| `--muted` / `--muted-foreground` | 0 0% 96.1% / 0 0% 45.1% | Muted backgrounds, captions |
| `--accent` / `--accent-foreground` | 0 0% 96.1% / 0 0% 9% | Hover states, accents |
| `--destructive` / `--destructive-foreground` | 0 84.2% 60.2% / 0 0% 98% | Delete, errors |
| `--border` | 0 0% 89.8% | Borders |
| `--input` | 0 0% 89.8% | Input borders |
| `--ring` | 0 0% 3.9% | Focus ring |
| `--radius` | 0.5rem | Default border radius |

### Chart colors (optional)
`--chart-1` … `--chart-5` for recharts/visualizations.

### Sidebar (optional)
`--sidebar-background`, `--sidebar-foreground`, `--sidebar-primary`, `--sidebar-primary-foreground`, `--sidebar-accent`, `--sidebar-accent-foreground`, `--sidebar-border`, `--sidebar-ring`.

---

## 3. Tailwind config

- **Dark mode:** `darkMode: ["class"]` (toggle via `.dark` on `html`).
- **Content:** `./pages/**/*.{js,ts,jsx,tsx,mdx}`, `./components/**/*.{js,ts,jsx,tsx,mdx}`, `./app/**/*.{js,ts,jsx,tsx,mdx}`.
- **Plugins:** `tailwindcss-animate`, `@tailwindcss/typography`.
- **Theme extend:**
  - **colors:** Map to CSS vars (e.g. `background: 'hsl(var(--background))'`, `primary`, `secondary`, `muted`, `accent`, `destructive`, `border`, `input`, `ring`, `card`, `popover`, `chart`, `sidebar`).
  - **fontFamily.sans:** `var(--font-inter), Inter, system-ui, ...`
  - **borderRadius:** `lg: 'var(--radius)'`, `md: 'calc(var(--radius) - 2px)'`, `sm: 'calc(var(--radius) - 4px)'`.
  - **container:** center, padding, max widths per breakpoint (e.g. xl/2xl: 1200px).

---

## 4. Utility: `cn()`

In `lib/utils.ts`:

```ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

Use for all component `className` merging.

---

## 5. UI components (shadcn-style)

Path: `components/ui/`. Each component uses `cn()`, Radix primitives where applicable, and Tailwind with semantic tokens.

| Component | File | Key dependencies |
|-----------|------|-------------------|
| Avatar | avatar.tsx | @radix-ui/react-avatar |
| Badge | badge.tsx | cva |
| Breadcrumb | breadcrumb.tsx | ~ |
| Button | button.tsx | @radix-ui/react-slot, cva |
| Calendar | calendar.tsx | react-day-picker, buttonVariants |
| Card | card.tsx | ~ |
| Checkbox | checkbox.tsx | @radix-ui/react-checkbox |
| Collapsible | collapsible.tsx | @radix-ui/react-collapsible |
| Dialog | dialog.tsx | @radix-ui/react-dialog |
| Dropdown Menu | dropdown-menu.tsx | @radix-ui/react-dropdown-menu |
| Form | form.tsx | react-hook-form, @radix-ui/react-label |
| Input | input.tsx | ~ |
| Label | label.tsx | @radix-ui/react-label |
| Popover | popover.tsx | @radix-ui/react-popover |
| Scroll Area | scroll-area.tsx | @radix-ui/react-scroll-area |
| Select | select.tsx | @radix-ui/react-select |
| Separator | separator.tsx | @radix-ui/react-separator |
| Sheet | sheet.tsx | @radix-ui/react-dialog (slide-out panel) |
| Sidebar | sidebar.tsx | Sheet, Button, Input, Separator, Skeleton, Tooltip |
| Skeleton | skeleton.tsx | ~ |
| Sonner | sonner.tsx | sonner (toast) |
| Switch | switch.tsx | @radix-ui/react-switch |
| Table | table.tsx | ~ |
| Tabs | tabs.tsx | @radix-ui/react-tabs |
| Textarea | textarea.tsx | ~ |
| Tooltip | tooltip.tsx | @radix-ui/react-tooltip |

---

## 6. Theme provider (dark/light)

- **Custom:** `components/theme-provider.tsx` ~ context with `theme`, `setTheme`, `resolvedTheme`; toggles `light` / `dark` class on `document.documentElement`; persists to `localStorage`; supports `"system"`.
- **Usage:** Wrap app in `<ThemeProvider>`, use `useTheme()` for toggle UI.

---

## 7. Global styles (globals.css)

- Base: Tailwind `@tailwind base/components/utilities`.
- Body: `font-family: var(--font-inter), Inter, ...`, `background: var(--background)`, `color: var(--foreground)`.
- Utility classes: `.glass` (backdrop blur), `.gradient-noise` (subtle gradient mesh), `.container` (max-width 1200px).
- Prose: Tighter margins for `.prose` (ul, ol, li, p, h1–h6) for editor/proposal views.
- Border color: `* { border-color: hsl(var(--border)); }`.

---

## 8. Project structure (recommended)

```
app/
  layout.tsx          # ThemeProvider, fonts, Toaster (Sonner)
  globals.css         # Tokens, base, utilities
  page.tsx
components/
  ui/                 # All design system components (above table)
  theme-provider.tsx
  header.tsx, footer.tsx, ...
lib/
  utils.ts            # cn()
```

Use path alias `@/` for `components`, `lib`, `app` (e.g. `@/components/ui/button`).

---

## 9. Quick install (new project)

1. Next.js + TypeScript + Tailwind.
2. Install Radix packages, cva, clsx, tailwind-merge, tailwindcss-animate, @tailwindcss/typography, lucide-react, framer-motion, react-hook-form, @hookform/resolvers, zod, sonner.
3. Copy `app/globals.css` (tokens + base + utilities), `tailwind.config.ts` (theme extend + plugins), `lib/utils.ts`, `components/theme-provider.tsx`, and entire `components/ui/` from this repo.
4. Wrap root layout with `<ThemeProvider>` and add `<Toaster />` if using Sonner.
5. Use `cn()` and semantic tokens in all components.

For a one-shot prompt you can hand to an AI or teammate, see the **Prompt for same UI** section in the project [README](./README.md).
