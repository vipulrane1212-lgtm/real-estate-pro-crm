# Diksha Real Estate CRM - Phase 1 Foundation (Local First)

Enterprise Real Estate CRM & Operations Management System built specifically for **Diksha Real Estate**.

- **Project ID**: `012e3965-018a-44e8-9ccf-38c973e5eb89`
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript (Strict Mode)
- **Styling**: Tailwind CSS (Dark Navy `#0f172a` + Gold `#c59b27` Accent Theme)
- **Database & Auth & Storage**: PostgreSQL 16 / Supabase (PostgreSQL with RLS, Auth, Storage Buckets)
- **Hosting Target**: Local (`http://localhost:3000`) for development & testing; cloud deployment to Vercel + Cloud Supabase is paused until local testing is complete.

---

## 1. Local Prerequisites & Setup

### Prerequisites
1. **Node.js**: v18.18+ or v20+ (tested on Node v24.15.0)
2. **Local PostgreSQL** or **Docker / Supabase CLI**:
   - If using **local PostgreSQL**: Ensure PostgreSQL is running on port 5432 with database `diksha_crm`.
   - If using **Supabase CLI**: Run `npx supabase start` (requires Docker Desktop).
   - If using **Docker directly**: Run `docker run --name diksha-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=diksha_crm -p 5432:5432 -d postgres:16`.

### Installation
```bash
# Clone or navigate to the project directory
cd "d:\diksha crm"

# Install dependencies
npm install
```

---

## 2. Environment Configuration

### Local Environment (`.env.local`)
Create `.env.local` in the root folder (this file is gitignored and will never be committed):

```env
# Local Development Environment
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=local-anon-key-placeholder
SUPABASE_SERVICE_ROLE_KEY=local-service-role-key-placeholder

# Local PostgreSQL Database URL
DATABASE_URL=postgresql://postgres:postgres@172.31.128.153:5432/diksha_crm

# Application Public Host URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> **Note**: For `.env.example`, only variable NAMES are listed (no credentials):
> - `NEXT_PUBLIC_SUPABASE_URL=`
> - `NEXT_PUBLIC_SUPABASE_ANON_KEY=`
> - `SUPABASE_SERVICE_ROLE_KEY=`
> - `DATABASE_URL=`
> - `NEXT_PUBLIC_APP_URL=`

---

## 3. Applying Database Migrations Locally

Apply the SQL migration files in `supabase/migrations/` sequentially to your local database:

```bash
# 1. Base auth & core schema (profiles, employees, role_permissions, company_settings, audit_logs, RLS)
psql -d diksha_crm -f supabase/migrations/20261120000001_initial_schema.sql

# 2. Universal audit trigger on insert/update/delete
psql -d diksha_crm -f supabase/migrations/20261120000002_audit_trigger.sql

# 3. Future business tables (leads, properties, follow_ups, site_visits, documents, calls, deals, brokerage, expenses, attendance)
psql -d diksha_crm -f supabase/migrations/20261120000003_future_tables.sql

# 4. Storage buckets & Storage RLS (property-photos, documents, call-recordings, company-assets)
psql -d diksha_crm -f supabase/migrations/20261120000004_storage_buckets.sql

# 5. Default company seed & role permissions matrix (Diksha Real Estate)
psql -d diksha_crm -f supabase/migrations/20261120000005_seed_and_security.sql

# 6. Seed initial Super Admin account for local testing
psql -d diksha_crm -f supabase/migrations/20261120000006_local_admin_seed.sql
```

*(These exact same migration files will be applied to cloud Supabase later with zero code rewrite).*

---

## 4. Local Test Accounts & Credentials

The database migration seeds the initial Super Admin account:

- **Super Admin Credentials**:
  - **Email**: `admin@diksharealestate.com`
  - **Password**: `AdminPassword123!`
  - **Role**: `super_admin` (Full access to all modules, employee management, and settings)

- **Test Employee Account** (Created via Admin `/employees` portal):
  - **Email**: `rohan@diksharealestate.com`
  - **Password**: `AgentPassword123!`
  - **Role**: `employee` (Assigned leads only, limited module permissions)

---

## 5. Running the Application Locally

```bash
# Start Next.js development server
npm run dev

# Open in browser:
# http://localhost:3000
```

### Verified Local Endpoints:
- `http://localhost:3000/login` — Agent authentication screen (white background, navy + gold accents)
- `http://localhost:3000/dashboard` — Dashboard with 6 real counts (`0 / empty state`, no demo data)
- `http://localhost:3000/employees` — Admin employee roster, account creation, activation toggling, and 8-module permission matrix
- `http://localhost:3000/settings` — Diksha Real Estate agency profile & branding
- `http://localhost:3000/leads` (and other Phase 2 routes) — Mapped with "Coming in next phase" empty states

---

## 6. Local Quality Gates & Production Build

```bash
# Run strict TypeScript and Next.js production build verification
npm run build
```

**Build Status**: Passing with 0 errors, 0 warnings.

---

## 7. Cloud Deployment Preparedness (Future Phase)

All application code, API routes, database helpers, and proxy middleware are **100% Vercel & Supabase Cloud ready**:
- No hardcoded `localhost` URLs in production runtime code.
- Dynamic environment variable resolution (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_APP_URL`).
- All 5 Supabase migrations ready to run on any cloud Supabase instance with zero rebuild.
- **Current status**: 0 cloud resources deployed; 0 Vercel deployments initiated. Ready for cloud release when testing concludes.
