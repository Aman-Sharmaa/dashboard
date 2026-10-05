# Kalp.ltd — All-in-One Business Operating System

> A premium, full-stack business management platform built with **Next.js 15**, **TypeScript**, **MongoDB**, and **Tailwind CSS**. Manage your team, clients, projects, finances, and infrastructure — all from one beautiful dashboard.

---

## ✨ Features

### 🏢 Organization & People
- **Team Management** — Employee profiles, org tree, role-based access, custom fields
- **Attendance** — Check-in/check-out tracking, leave balances, and attendance history
- **Payslips & Reimbursements** — Generate payslips, manage expense reimbursements
- **Performance** — Goals, KPIs, routines, and performance reports

### 📁 Projects & Clients
- **Project Board** — Kanban task board with drag-and-drop (dnd-kit), milestones, and roadmaps
- **Client Management** — Detailed client profiles, project history, documents, and onboarding flows
- **Leads** — Lead pipeline tracking
- **Goals & Routines** — OKR-style goals with milestones, recurring routines, and KPI logging

### 💰 Finance
- **Invoices** — Full invoice generator with multiple templates, PDF export
- **Expenses** — Expense tracking and categorization
- **Khatabook** — Ledger-style credit/debit tracking
- **Profit & Loss** — Revenue charts, external revenue API integration
- **Debts** — Debt management and tracking

### 🌐 Infrastructure
- **Deployment Manager** — SSH-based server deployment with live terminal (xterm.js)
- **Uptime Monitor** — Website/service status monitoring with incident tracking
- **Drive** — File storage and management
- **Auto DM** — Automated messaging workflows

### 📝 Content & CMS
- **Blog CMS** — Rich-text editor (Tiptap) with image upload, password-protected posts
- **Page Builder** — Drag-and-drop page builder
- **Plan Pages** — Internal wiki/plan pages

### 🔔 Real-time & Notifications
- **Socket.io** — Real-time updates across the dashboard
- **Notification Bell** — In-app notification center
- **Meeting Reminders** — Scheduled meeting alerts

### 🌍 Public Website
- **Marketing Homepage** — Hero, products showcase, services, testimonials, FAQs, footer
- **Glassmorphism Header** — iOS-style navigation with dark/light mode
- **Public Roadmap** — Share your product roadmap publicly
- **Team Profile Pages** — Public profiles at `/@username`
- **Status Page** — Public service status page

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 15 (App Router) |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS v3 + `tailwindcss-animate` + `@tailwindcss/typography` |
| **UI Components** | Radix UI (Avatar, Dialog, Tabs, Select, Dropdown, Tooltip, etc.) |
| **Animations** | Framer Motion |
| **Icons** | Lucide React |
| **Forms** | React Hook Form + Zod |
| **Toasts** | Sonner |
| **Rich Text** | Tiptap (with Image, Link, Table, Placeholder extensions) |
| **Charts** | Recharts |
| **Drag & Drop** | dnd-kit (core, sortable, utilities) |
| **Terminal** | xterm.js + SSH2 |
| **Database** | MongoDB via Mongoose |
| **Auth** | JWT (jsonwebtoken) + bcryptjs |
| **Real-time** | Socket.io (server + client) |
| **Video** | Mux (upload + node SDK) |
| **Cron Jobs** | node-cron |
| **Date Utils** | date-fns |
| **Analytics** | SniffUrl |

---

## 📦 Getting Started

### Prerequisites

- Node.js `>= 18`
- MongoDB instance (local or Atlas)
- npm or yarn

### 1. Clone & Install

```bash
git clone https://github.com/your-org/kalp.ltd.git
cd kalp.ltd
npm install
```

### 2. Configure Environment

Copy the example environment file and fill in your values:

```bash
cp .env.example .env.local
```

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Your public domain (e.g. `https://kalp.ltd`) |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Long random string for JWT signing |
| `JWT_EXPIRES_IN` | JWT expiry duration (e.g. `7d`) |
| `CRON_SECRET` | Secret key to protect cron job endpoints |
| `SEED_ADMIN_EMAIL` | Admin email for the seed script |
| `SEED_ADMIN_PASSWORD` | Admin password for the seed script |
| `NEXT_PUBLIC_SNIFFURL_PROJECT_KEY` | SniffUrl analytics project key |

### 3. Seed the Database

Create your initial admin user:

```bash
npm run seed
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🏗 Project Structure

```
kalp.ltd/
├── app/
│   ├── api/                  # API route handlers
│   ├── dashboard/            # Protected dashboard pages
│   │   ├── page.tsx          # Main dashboard overview
│   │   ├── layout.tsx        # Dashboard shell layout
│   │   ├── clients/          # Client management
│   │   ├── projects/         # Projects & kanban board
│   │   ├── people/           # Team & HR management
│   │   ├── attendance/       # Attendance tracking
│   │   ├── finance/          # P&L, revenue charts
│   │   ├── invoices/         # Invoice generator
│   │   ├── expenses/         # Expense tracking
│   │   ├── khatabook/        # Ledger / credit-debit
│   │   ├── goals/            # OKRs, routines, KPIs
│   │   ├── roadmap/          # Product roadmap board
│   │   ├── deployment/       # Server deployment & terminal
│   │   ├── monitor/          # Uptime monitoring
│   │   ├── drive/            # File storage
│   │   ├── content/          # Blog CMS
│   │   ├── autodm/           # Automated DM workflows
│   │   ├── leads/            # Lead pipeline
│   │   ├── assets/           # Asset management
│   │   ├── payslips/         # Payslip management
│   │   ├── reimbursements/   # Reimbursement requests
│   │   └── settings/         # Org & user settings
│   ├── login/                # Auth page
│   ├── layout.tsx            # Root layout (ThemeProvider, SocketProvider)
│   ├── page.tsx              # Public marketing homepage
│   └── globals.css           # Global styles & CSS variables
├── components/
│   ├── ui/                   # Shadcn-style base UI components
│   ├── app-sidebar.tsx       # Main navigation sidebar
│   ├── dashboard-topbar.tsx  # Top bar with search & user menu
│   ├── task-board.tsx        # Full Kanban board
│   ├── invoices-page-client.tsx
│   ├── deployment-page-client.tsx
│   ├── org-todo-client.tsx
│   └── ...                   # 140+ feature components
├── models/                   # Mongoose data models
├── lib/                      # Utilities (cn, db, auth helpers)
├── hooks/                    # Custom React hooks
├── pages/                    # Next.js Pages Router (legacy/API fallback)
├── scripts/                  # Seed & production start scripts
├── public/                   # Static assets
├── docs/                     # Design library & internal docs
├── middleware.ts              # Auth middleware + URL rewrites
├── next.config.js
├── tailwind.config.ts
└── vercel.json
```

---

## 🔐 Authentication

Authentication uses **JWT stored in HTTP-only cookies** (`kalp_auth_token`).

- Login at `/login`
- Middleware protects all `/dashboard/*` routes
- Public team profile pages are available at `/@username` (rewritten to `/team/[slug]`)

---

## 🔌 External Revenue API

Kalp.ltd exposes a REST API to push external revenue (from Stripe, Razorpay, etc.) into your dashboard.

**Quick example:**

```bash
curl -X POST "https://your-domain.com/api/products/{productId}/external-revenue" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 10000,
    "currency": "INR",
    "date": "2026-10-01T10:00:00Z",
    "source": "stripe",
    "metadata": { "transactionId": "txn_123" }
  }'
```

📖 See [EXTERNAL_REVENUE_QUICK_START.md](EXTERNAL_REVENUE_QUICK_START.md) for code examples in JS, Python, and PHP, plus Stripe/Razorpay webhook integration.
📖 See [EXTERNAL_REVENUE_API.md](EXTERNAL_REVENUE_API.md) for full API reference.

---

## 🚀 Deployment

### Vercel (Recommended)

Push to GitHub and connect to [Vercel](https://vercel.com). Add all `.env` variables in the Vercel dashboard.

```bash
npm run build   # Validate production build locally
```

### Self-hosted

```bash
npm run build
npm run start:prod   # Uses scripts/start-production.sh
```

> Cron job endpoints are protected by `CRON_SECRET`. Make sure to configure your cron scheduler to pass the secret in the request.

---

## 🎨 Design System

The design system is based on **CSS custom properties** with full dark/light mode support via `next-themes`.

- **Color tokens**: `--background`, `--foreground`, `--primary`, `--secondary`, `--muted`, `--accent`, `--border`, `--card`, `--ring`, etc.
- **Radius**: `--radius` variable for consistent border radii
- **Font**: Inter (Google Fonts)
- **Utility**: `lib/utils.ts` → `cn()` using `clsx` + `tailwind-merge`

Full package list, CSS variable reference, and component API docs → **[docs/DESIGN-LIBRARY.md](docs/DESIGN-LIBRARY.md)**

---

## 📜 Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run start:prod` | Start via production shell script |
| `npm run seed` | Seed database with admin user |
| `npm run lint` | Run ESLint |

---

## 📄 License

All rights reserved © Kalp.ltd
