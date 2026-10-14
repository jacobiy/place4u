# Place4U — Platform Overview

> **Status:** Living document · **Version:** 2.0 · **Last updated:** 2026-10-13
>
> This document describes **what Place4U is** and **what the platform comprises of**
> as it exists in the codebase today. It also frames the **Decision Engine** —
> the next major build focus — and where it plugs into the system.

---

## 1. What Place4U Is

Place4U is a **relocation assistance and tenant–property matching platform**.

Instead of a tenant manually trawling dozens of classified sites and unreliable
listings, they submit **one application** describing what they need and who they
are. Place4U then works to identify suitable, verified housing options and make
a warm introduction to the landlord or the agent representing them.

The platform is built around three principles:

| Principle | What it means in the product |
|-----------|------------------------------|
| **Efficiency** | One application, many matches. No repetitive forms. |
| **Trust** | Identity and premises verification for landlords and agents; FICA-style document checks; scam reduction. |
| **Accessibility** | Serves the formal market *and* the informal one — backrooms, rooms, student accommodation, small rental units. |

### Positioning (important)

Place4U is **not an estate agency** and does **not act as a property
practitioner**. It is a **technology and assistance platform**:

- It does not negotiate leases.
- It does not handle rent or deposits.
- It does not guarantee placement.
- It charges a **non-refundable assistance/vetting fee** for application support,
  screening, and introductions only.

This positioning is enforced in the UI copy, the legal pages, and the consent
flow (POPIA-aligned).

---

## 2. The Business Problem

- Finding accommodation is slow, stressful, and opaque — especially when
  relocating to a new city.
- Listings are often unverified; scams are common.
- Trusted intermediaries are scarce.
- Tenants repeat the same paperwork across many landlords.
- Informal landlords struggle to reach **verified, serious** tenants consistently.

Place4U's answer is a single funnel: **one vetted application → curated,
verifiable matches → a tracked introduction.**

---

## 3. Platform at a Glance

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 (JavaScript), Vite 5, React Router 7 |
| **Styling** | Tailwind CSS 4 (via `@tailwindcss/vite` + PostCSS) |
| **Animation / UI** | Framer Motion, `react-countup`, `lucide-react`, `react-icons`, `react-outside-click-handler` |
| **Charts** | Recharts |
| **Backend / Data** | Supabase — Postgres, Auth, Storage, Realtime |
| **Payments** | PayPal (`@paypal/react-paypal-js`) for the application/vetting fee |
| **Hosting** | Vercel (`vercel.json`) |
| **Dev server** | `vite --host --port 1337` |

There is **no bespoke application server**: the client talks directly to
Supabase (Postgres + Row Level Security), and all "backend" business rules live
in SQL (tables, constraints, triggers, RPCs, views). Money logic specifically
lives in `database/agent_wallet_ledger.sql`.

---

## 4. System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     React + Vite SPA (client)                │
│  Landing · Auth · Tenant · Landlord · Agent · Admin dashboards│
│  Services: applicationSync · paypalService · walletService    │
│  Utils: jobAffordabilityMatcher · documentUrls · privacy      │
└───────────────┬───────────────────────────────┬──────────────┘
                │ supabase-js (anon key)        │ PayPal SDK
                ▼                               ▼
┌──────────────────────────────────┐   ┌──────────────────────┐
│            Supabase              │   │   PayPal (fees)      │
│  • Postgres + RLS policies       │   └──────────────────────┘
│  • Auth (email + OAuth callback) │
│  • Storage (documents, avatars)  │
│  • Realtime (live sync)          │
│  • SQL RPCs / triggers / views   │
└──────────────────────────────────┘
```

**Key architectural patterns**

- **Code-split routing.** Every dashboard is `lazy()`-loaded in `src/App.jsx`
  with a `Suspense` fallback and a `ChunkErrorBoundary` that auto-reloads once on
  stale-chunk / adblock failures.
- **Role-gated access.** `ProtectedRoute` + `useAuth` resolve the signed-in
  user's `user_type` and guard each area.
- **Resilient data access.** Dashboards use a **DB-authoritative + local-cache
  merge** strategy (see `applicationSync.js`): Supabase is the source of truth for
  status, payment, and assignment, while `localStorage` fills gaps and keeps the
  UI responsive offline / across tabs.
- **Live updates.** A `subscribeToApplicationUpdates` helper fans out Supabase
  Realtime `postgres_changes`, a custom in-page event, and a cross-tab
  `storage` ping, so a change made in one dashboard appears in others.

---

## 5. User Roles & Journeys

Place4U has **four roles**, all stored on `users.user_type` and routed to their
own portal.

### 5.1 Tenant
- Registers / logs in, submits a **single application** (budget, preferred areas,
  accommodation category, employment & income, documents).
- Pays the **application/vetting fee** via PayPal.
- Tracks application status on the dashboard.
- Receives introductions / is matched to verified listings.

### 5.2 Landlord
- Registers, submits a **landlord application** with proof of ownership / FICA
  documents to be approved.
- Manages **properties**, **units**, and **tenants**.
- Uploads and tracks documents (ID, proof of residence, title deed, etc.).
- Once approved, their listings can surface as verified matches.

### 5.3 Agent
- Applies and passes **agent verification** (FICA + interview) to be activated.
- Receives **assigned tenant applications ("jobs")** from Admin.
- **Accepts or rejects** each assignment, with a rejection reason.
- Uses the **Job & Affordability matcher** to underwrite a tenant against a
  property before introducing them.
- Earns a **commission share** (currently 50% of the application fee) tracked in
  the agent **Wallet**.

### 5.4 Admin
- Central operations console: applications, users, properties, submissions,
  payments, leases, messages, notifications, reports, analytics, compliance,
  and settings.
- **Assigns tenant applications to agents**, monitors the **needs-reassignment
  queue** when an agent rejects a job, and re-assigns.
- Reviews and approves **agent applications**, **landlord applications**, and
  **property submissions**.

**End-to-end flow**

```
Tenant registers ──▶ Submits application ──▶ Pays fee (PayPal)
      │
      ▼
Admin reviews ──▶ Assigns "job" to an Agent ──▶ Agent accepts
      │                                            │
      │                                     Runs matching / underwriting
      ▼                                            │
Landlord listings ◀── verified & active ◀── Introduction / matching
      │
      ▼
Status updates propagate live to every dashboard
```

---

## 6. Feature Surface (Module Inventory)

### Landing & public
- `pages/landing/Landing.jsx` — hero, process steps, verified-listing browse
  (category / province / price filters), trust signals, business rules, and the
  required disclaimer.
- Shared components: `Navbar`, `Footer`, `Services`, `Values`,
  `PrivacyConsent`, `AlertModal`, and the legal page set.

### Authentication
- `Login`, `SignUp`, `resetpassword`, and an `/auth/callback` handler for OAuth
  that routes the user to the correct portal by role.

### Tenant portal — `src/pages/Tenant`
- `MainTenant`, `TenantDashboard`, `Profile`, `Settings`, `SideBar`, plus
  `Components/`, `Data/`, `db/`, `Styles/`.

### Landlord portal — `src/pages/Landlord`
- `MainLandLord`, `Dashboard`, `MyProperties`, `Tenants`, `Documents`,
  `Profile`, `Settings`, `SideBar`.

### Agent portal — `src/pages/Agent`
- `MainAgent`, `Dashboard`, `Applications`, `Properties`,
  `PropertyDetailView`, `Messages`, `Wallet`, `Profile`, `Settings`, `SideBar`.
- Components: `ApplicationDocumentsModal`, `JobLinkApproximationModal`,
  `JobResponseModal`, `AgentActivationModal`, `AgentActivationView`, `Modal`,
  `StatCard`, `Buttons`.

### Admin console — `src/pages/admin`
- `AdminDashboard`, `Dashboard`, `Applications`, `AgentApplications`,
  `LandlordApplications`, `PropertySubmissions`, `Properties`,
  `PropertyDetailView`, `Users`, `Payments`, `Transactions`, `Leases`,
  `Messages`, `Notifications`, `Reports`, `Analytics`, `Compliance`, `Settings`.

### Legal & compliance — `src/pages/legal`
- `DataProtectionNotice`, `TermsOfService`, `ComplianceNotice`,
  `DisputeResolution`, `StoragePreferences` (cookie preferences).

---

## 7. Data Model

Place4U's persistence lives in Supabase Postgres, defined by the SQL files in
`/database`. Core entities:

| Table / View | Purpose |
|--------------|---------|
| `users` | Every account; `user_type` = `tenant` \| `landlord` \| `agent` \| `admin`. |
| `tenant_profiles` | Employment, income, occupation, workplace, ID — the underwriting inputs. |
| `landlord_profiles` | Landlord identity, ownership proof, verification status. |
| `agent_profiles` | Agency, experience, FICA docs, verification status, payout banking. |
| `properties` | Listings: price, location, type, active/approval state. |
| `applications` | The tenant "job": budget, category, employment, documents, status, `assigned_to`, and assignment response columns. |
| `payments` | Application-fee payments, receipts, and refund state. |
| `messages` | Direct messaging between users (with `direct_messages` fallback). |
| `agent_payout_requests` | Withdrawal requests and their approval/payment lifecycle. |
| `agent_wallet_balances` (view) | Derived per-agent earnings, pipeline, reserved, and available balance. |

**Schema migrations present:** `tenant_schema`, `tenant_settings`,
`landlord_schema`, `landlord_application_schema`, `landlord_documents_bucket`,
`agent_schema`, `agent_application`, `agent_profile_settings`,
`agent_job_acceptance`, `agent_wallet_ledger`, `payments_and_applications_schema`,
`property_approval_schema`, `public_listings_read`, `storage_buckets`,
`profile_pictures_bucket`, and `fix_landlord_profiles_rls`.

---

## 8. Money Flow

- **Application fee:** `R100` (`VITE_APPLICATION_FEE_ZAR`, default `100`),
  collected through PayPal via `paypalService.js`.
- **Agent split:** 50% of the fee (`AGENT_SPLIT_RATE = 0.5`) — currently
  `R50` per completed file (`walletService.js`).
- **Wallet ledger:** `agent_wallet_balances` view + SQL RPCs
  (`request_agent_payout`, `process_agent_payout`, `admin_direct_agent_payout`,
  `refund_application_fee`). Money rules live **in the database**, not the client.
- **Refunds:** an admin refund of the application fee also removes the agent's
  share for that file.
- The platform charges for **assistance/vetting**; it never handles rent or
  deposits.

---

## 9. Matching & Decisioning — Current State

Today, "decisioning" exists in two places, and they are **not yet unified**:

### 9.1 Manual assignment (the operational path)
1. Admin assigns an application to an agent → `assigned_to` + `status = under_review`,
   `assignment_status = 'assigned'`.
2. Agent **accepts** or **rejects** (`assignment_status`, `assignment_responded_at`,
   `assignment_rejection_reason`), enforced by a DB trigger and RLS so an agent can
   only respond to their own assignments.
3. A rejected job enters the **needs-reassignment queue** for the admin.

### 9.2 The rule-based matcher (the analytical path)
`src/utils/jobAffordabilityMatcher.js` — an
**"Job & Affordability Linking & Approximation Engine"** — scores a tenant
*against a property* using four signals:

| Signal | Weight | Method |
|--------|:-----:|--------|
| **Affordability** | 45% | Rent-to-income multiplier; SA 33% norm; student/NSFAS bands. |
| **Commute proximity** | 30% | A SA suburb → metro **cluster proximity graph** (JHB/PTA/CPT/DBN) approximating distance, duration, and transit type. |
| **Employment stability** | 25%* | Permanent / contract / self-employed / student scoring, blended with document verification (ID, payslip, bank statement, bursary). |

\*Stability and document verification combine into a single
`verificationScore = 0.4 × stability + 0.6 × docs`.

It outputs a **composite score**, a **tier** (`Prime Candidate` → `Underwriting
Warning`), a **verdict** (`Fast-Track Approval` … `Affordability or Distance
Concern`), and human-readable **insights**. It is consumed by the agent portal
(`JobLinkApproximationModal`) to help an agent judge a file.

**The gap:** the matcher scores *tenant → property*, but nothing yet scores and
ranks *applications → agents*, and nothing auto-derives the best match. The
assignment decision is still manual and the matcher is advisory.

---

## 10. The Decision Engine — Next Focus

The **Decision Engine** is the next major workstream. It is the component that
turns raw signals (tenant profile + application + property inventory + agent
supply) into **ranked, explainable decisions**. It generalizes the existing
matcher from a single advisory score into the platform's core decision layer.

### 10.1 What it should decide
1. **Match** — which properties best fit a given tenant application (ranked, with
   reasons).
2. **Route** — which agent should receive which application (load-balanced,
   skill/capacity-aware, and commission-fair), replacing purely manual assignment.
3. **Qualify** — an honest go / no-go verdict per application, with the exact
   reason (affordability breach, verification gap, distance).
4. **Explain** — every decision carries its inputs and weights so a human can
   audit and override it.

### 10.2 Inputs it will consume
- Tenant application + `tenant_profiles` (budget, category, employment, income,
  documents, workplace, preferred areas).
- `properties` (price, location, type, approval/active state).
- `agent_profiles` (verification, capacity, active assignments, territory,
  history) and `agent_wallet_balances` (load / standing).
- Outcome feedback: accepted vs rejected assignments, completed files, refunds.

### 10.3 Design principles
- **Extend, don't replace.** Build on `jobAffordabilityMatcher.js`; keep its
  scoring model as the affordability/proximity/stability core.
- **Explainable by construction.** Every score decomposes into named,
  weighted factors and a plain-language reason.
- **Server-authoritative where it matters.** Decisions that drive money or
  assignment should ultimately be computable in SQL / an RPC so the client cannot
  diverge and RLS stays honest.
- **Human in the loop.** The engine *recommends*; Admin/Agent *approve*. The
  existing accept/reject + reassignment-queue flow remains the override surface.
- **Feedback-driven.** Log every recommendation and its outcome so weights can be
  tuned against reality.

### 10.4 Where it plugs in
- **New module:** a decisioning service (e.g. `src/services/decisionEngine.js`)
  that composes the matcher and adds agent-routing and ranking.
- **Admin console:** a "Recommended Assignments" / auto-route view that pre-fills
  the assignment action the admin already performs.
- **Agent portal:** ranked property suggestions per assigned application, upgrading
  the current single-file approximation modal.
- **Database:** a decision log table (inputs, scores, chosen action, outcome) to
  make decisions auditable and tunable.

### 10.5 Suggested phasing
1. **Extract & formalize** — lift the matcher's scoring into a documented,
   config-driven decision model (named factors, weights, thresholds).
2. **Property ranking** — score and rank all active properties for an application.
3. **Agent routing** — score applications against agents (verification, capacity,
   territory, fairness) and produce a ranked assignment recommendation.
4. **Wire into Admin** — surface recommendations in the assignment UI with a
   one-click apply + override.
5. **Audit & learn** — persist decisions and outcomes; expose tuning knobs;
   monitor precision against accept/reject and completion.

---

## 11. Compliance & Disclaimers

- **POPIA-aligned** data handling; explicit consent captured by
  `PrivacyConsent` and the legal pages.
- Place4U is **not an estate agency / property practitioner**.
- The service fee covers **application support, screening, and introductions
  only** and **does not guarantee placement**.
- Fees are **non-refundable** (except at the platform's discretion via the refund
  RPC).
- No lease negotiation and no rent/deposit handling by the platform.
- User data is stored securely and confidentially in Supabase with RLS.

---

## 12. Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Configure environment (copy the example and fill in credentials)
cp .env.example .env
#   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
#   VITE_PAYPAL_CLIENT_ID, VITE_PAYPAL_ENVIRONMENT, VITE_APPLICATION_FEE_ZAR

# 3. Run the dev server (http://localhost:1337)
npm run dev

# 4. Production build
npm run build
```

**Environment variables** (`.env.example`):

| Variable | Purpose |
|----------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/publishable key |
| `VITE_PAYPAL_CLIENT_ID` | PayPal client ID (application fee) |
| `VITE_PAYPAL_ENVIRONMENT` | `live` or `sandbox` |
| `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` | Server-side PayPal credentials |
| `VITE_APPLICATION_FEE_ZAR` | Application fee in ZAR (default `100`) |

**Database setup:** run the SQL files in `/database` in the Supabase SQL Editor
(they are written to be additive and idempotent).

**Tests:** the `test-*.js` scripts at the repo root are plain Node scripts that
exercise Supabase flows directly:
```bash
npm test              # test-agent-dashboard.js
npm run test:agent    # agent dashboard
npm run test:properties
```

---

## 13. Repository Map

```
Place4U/
├─ src/
│  ├─ App.jsx                 # Routes, role guards, error boundary
│  ├─ component/              # Shared UI: Navbar, Footer, Services, Values, modals, consent
│  ├─ components/             # loading.jsx
│  ├─ hooks/useAuth.js        # Session + role resolution
│  ├─ pages/
│  │  ├─ landing/             # Public landing + listings browse
│  │  ├─ login/ Signup/ resetpassword/
│  │  ├─ legal/               # Terms, privacy, compliance, dispute, cookies
│  │  ├─ Tenant/ Landlord/ Agent/ admin/
│  ├─ services/
│  │  ├─ applicationSync.js   # DB + local cache merge, realtime sync
│  │  ├─ paypalService.js     # Application fee
│  │  └─ walletService.js     # Agent ledger over SQL RPCs/views
│  └─ utils/
│     ├─ jobAffordabilityMatcher.js   # ◀ seed of the Decision Engine
│     ├─ documentUrls.js · privacyConsent.js · Supabase.js
├─ database/                  # Supabase SQL schemas, triggers, RPCs, views
├─ docs/                      # BRD, implementation steps
├─ public/ · dist/            # Static assets / build output
└─ package.json · vite.config.js · vercel.json · .env.example
```

---

## 14. Related Documentation

- [`docs/BRD.md`](docs/BRD.md) — Business Requirements Document.
- [`docs/IMPLEMENTATION_STEPS.md`](docs/IMPLEMENTATION_STEPS.md) — implementation log.
- [`README.md`](README.md) — original quick-start readme.

---

*Place4U provides relocation assistance and tenant matching services only. It is
not an estate agency and does not act as a property practitioner.*
