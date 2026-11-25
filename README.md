# Real Estate Pro CRM

> **Enterprise Real Estate CRM, Inventory & Field Operations Platform** built with Next.js 16 (App Router), TypeScript, Tailwind CSS, PostgreSQL 16 / Supabase, and a Capacitor Android Companion App.

![Dashboard Overview](screenshots/01_dashboard.png)

---

## Overview

**Real Estate Pro CRM** is a full-stack, role-based real estate operations system designed for brokerages, property consultants, and developer sales teams. It unifies lead capture, automated property matching, multi-room inventory with 360° virtual tours, follow-up queues, site visits, call logging, deals & brokerage payouts, rental management, live field-agent fleet tracking, and executive analytics into a single dark-navy & gold workspace.

---

## Key Modules & Capabilities

### 1. Lead Management & Pipeline (`/leads`)
- **Kanban Board & List View**: Drag-and-drop stage transitions across *New, Contacted, Follow-up, Site Visit, Negotiation, Closed Won, Closed Lost*.
- **Full CRUD & Bulk Operations**: Create/edit leads with budget range, preferred location, requirement (`1/2/3 BHK`, `Plot`, `Shop`, `Office`), source, and 1-click agent assignment.
- **Unified Lead Inbox & CSV Import/Export**: Downloadable CSV template, row-level validation, bulk import, and filtered CSV export.
- **Timeline & Audit History**: Chronological activity log (`lead_history` + `audit_logs`) tracking status changes, notes, calls, follow-ups, and reassignments.
- **Role-Based Access Control (RLS)**: Admins see all leads; agents see only assigned leads.

![Leads Kanban](screenshots/02_leads_kanban.png)

### 2. Property Inventory & 360° Viewer (`/properties`)
- **Multi-Category Listings**: Supports *New Project, Resale, Rental, Commercial, Plot/Land* with status tracking (*Available, Hold, Sold, Rented*).
- **Multi-Room Photo Gallery & Video Uploads**: Room-by-room photo explorer, video links/uploads, document links, and owner contact details.
- **Interactive 360° Panorama Viewer**: Supports equirectangular 360° image URLs with drag-to-pan and fullscreen controls.

![Property Inventory](screenshots/06_properties.png)

### 3. Auto-Matching & WhatsApp Integration
- **Weighted Matching Engine (`/api/properties/matched`)**: Automatically matches leads to properties using location, listing type, $\pm 15\%$ budget window, and BHK/requirement alignment with percentage match scores and reasons.
- **1-Click WhatsApp Share**: Generates pre-filled `wa.me` messages with property details for instant client sharing, plus a dedicated WhatsApp module (`/whatsapp`).

### 4. Follow-ups, Site Visits & Calls (`/follow-ups`, `/site-visits`, `/calls`)
- **Daily Follow-up Queue**: Today, Overdue (highlighted in red), Upcoming, and Completed tabs with outcome notes and alarm-ready schema fields (`reminder_at`, `snoozed_until`, `acknowledged_at`, `repeat_count`).
- **Site Visit Scheduling**: Property inspection scheduling with client interest level (*Hot / Warm / Cold*) and feedback.
- **Call Logging & Telephony Webhooks**: Incoming/outgoing/missed call tracking, duration, recording URLs, and webhook endpoint (`/api/webhooks/telephony`).

### 5. Deals, Brokerage, Rentals & Expenses (`/deals`, `/brokerage`, `/rentals`, `/accounts`, `/documents`)
- **Deals & Brokerage**: Transaction value tracking, commission calculation, and paid/pending brokerage ledger.
- **Rentals & Client Projects**: Lease management, tenant tracking, and client project submissions.
- **Office Expenses & Document Vault**: Categorized expense approvals and centralized property/lead document storage.

### 6. Field Operations, Live Fleet Radar & Neural Monitor (`/employees`, `/attendance`, `/neural-monitor`, `/reports`)
- **Employee Roster & 8-Module Permission Matrix**: Granular View/Create/Edit/Delete permissions per agent.
- **Attendance & Live Fleet Radar**: Check-in/out tracking with GPS location logs (`/api/location`).
- **Neural Monitor & Analytics Reports**: System health, pipeline conversion metrics, and agent performance reports.
- **Mobile Companion App (`/mobile-app`)**: Capacitor + TypeScript Android companion wrapper for field agents.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router, Turbopack) |
| **Language** | TypeScript (Strict Mode) |
| **UI & Styling** | Tailwind CSS 4, Lucide Icons (Navy `#0f172a` + Gold `#c59b27` Theme) |
| **Database** | PostgreSQL 16 (with Row Level Security, Triggers, and Indexes) |
| **Auth & Storage** | Local Session Auth + Supabase SSR / Storage Buckets (`property-photos`, `documents`, `call-recordings`, `company-assets`) |
| **Mobile Wrapper** | Capacitor (Android) in `mobile-app/` |

---

## Local Setup & Quick Start

### Prerequisites
- **Node.js** v18.18+ or v20+
- **PostgreSQL 16** running locally on port `5432` with database `diksha_crm` (or Docker / Supabase CLI)

### Installation
```bash
git clone https://github.com/vipulrane1212-lgtm/real-estate-pro-crm.git
cd real-estate-pro-crm
npm install
```

### Environment Configuration
Copy `.env.example` to `.env.local` and configure your local database and app URL:
```env
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=local-anon-key-placeholder
SUPABASE_SERVICE_ROLE_KEY=local-service-role-key-placeholder
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/diksha_crm
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Apply Database Migrations
Run the SQL migrations in `supabase/migrations/` sequentially against your local PostgreSQL database:
```bash
psql -d diksha_crm -f supabase/migrations/20261120000001_initial_schema.sql
psql -d diksha_crm -f supabase/migrations/20261120000002_audit_trigger.sql
psql -d diksha_crm -f supabase/migrations/20261120000003_future_tables.sql
psql -d diksha_crm -f supabase/migrations/20261120000004_storage_buckets.sql
psql -d diksha_crm -f supabase/migrations/20261120000005_seed_and_security.sql
psql -d diksha_crm -f supabase/migrations/20261120000006_local_admin_seed.sql
psql -d diksha_crm -f supabase/migrations/20261120000007_phase2_schema.sql
```

### Run Locally
```bash
npm run dev
# Open http://localhost:3000
```

### Production Build Check
```bash
npm run build
```

---

## Author

**Vipul Rane**  
GitHub: [@vipulrane1212-lgtm](https://github.com/vipulrane1212-lgtm)
