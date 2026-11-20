# Diksha Real Estate CRM - Phase 1 Foundation

Enterprise Real Estate CRM & Operations Management System built specifically for **Diksha Real Estate**.

- **Project ID**: `012e3965-018a-44e8-9ccf-38c973e5eb89`
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript (Strict Mode)
- **Styling**: Tailwind CSS (Premium Real Estate Navy + Gold Theme)
- **Database & Auth & Storage**: Supabase (PostgreSQL with RLS, Auth, Private Storage Buckets)
- **Deployment**: Vercel

---

## 1. Project Architecture & Structure

```
diksha crm/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── layout.tsx             # Auth layout with Diksha branding
│   │   │   └── login/page.tsx         # Agent & Admin login screen
│   │   ├── (admin)/
│   │   │   ├── layout.tsx             # Main portal shell (Sidebar + Topbar)
│   │   │   ├── dashboard/page.tsx     # 6-Card metrics dashboard
│   │   │   ├── employees/page.tsx     # Admin employee & RBAC permission manager
│   │   │   ├── settings/page.tsx      # Diksha Real Estate company profile & logo
│   │   │   ├── leads/page.tsx         # Phase 2 mapped empty state
│   │   │   ├── properties/page.tsx    # Phase 2 mapped empty state
│   │   │   ├── follow-ups/page.tsx    # Phase 2 mapped empty state
│   │   │   ├── site-visits/page.tsx   # Phase 2 mapped empty state
│   │   │   ├── documents/page.tsx     # Phase 2 mapped empty state
│   │   │   ├── calls/page.tsx         # Phase 2 mapped empty state
│   │   │   ├── whatsapp/page.tsx      # Phase 2 mapped empty state
│   │   │   ├── brokerage/page.tsx     # Phase 2 mapped empty state
│   │   │   ├── accounts/page.tsx      # Phase 2 mapped empty state
│   │   │   └── reports/page.tsx       # Phase 2 mapped empty state
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── login/route.ts     # Email + password authentication
│   │   │   │   ├── logout/route.ts    # Session destruction
│   │   │   │   └── me/route.ts        # Current user profile & employee session
│   │   │   ├── dashboard/
│   │   │   │   └── stats/route.ts     # Real database counts (RLS enforced)
│   │   │   ├── employees/
│   │   │   │   ├── route.ts           # Roster listing & Admin account creation
│   │   │   │   └── [id]/route.ts      # Active status & permission matrix updates
│   │   │   ├── settings/
│   │   │   │   └── company/route.ts   # Company profile retrieval & updates
│   │   │   └── upload/route.ts        # File & logo uploads to Supabase Storage
│   │   ├── globals.css                # Real estate theme variables
│   │   ├── layout.tsx                 # Root HTML layout
│   │   └── page.tsx                   # Smart redirect to /dashboard or /login
│   ├── components/
│   │   ├── layout/
│   │   │   ├── sidebar.tsx            # Responsive 13-item left navigation
│   │   │   └── topbar.tsx             # Topbar with profile, role badge & logout
│   │   └── ui/
│   │       ├── badge.tsx              # Role & status badges
│   │       ├── button.tsx             # Standard buttons with loading states
│   │       ├── card.tsx               # Metric and container cards
│   │       ├── empty-state.tsx        # 'No data yet' empty states
│   │       └── modal.tsx              # Accessible dialogs
│   ├── lib/
│   │   └── supabase/
│   │       ├── admin.ts               # Service-role client for admin operations
│   │       ├── client.ts              # Browser client (@supabase/ssr)
│   │       ├── server.ts              # Server client with async cookie support
│   │       └── types.ts               # Complete TypeScript types for all models
│   ├── modules/
│   │   ├── auth/                      # React auth context & session synchronization
│   │   ├── dashboard/                 # 6 Real count cards & activity feed
│   │   ├── employees/                 # Employee directory & permission manager
│   │   └── settings/                  # Company profile & logo manager
│   └── middleware.ts                  # Route protection for /admin and /dashboard
├── supabase/
│   └── migrations/
│       ├── 20261120000001_initial_schema.sql    # Core tables, profiles, employees, RLS
│       ├── 20261120000002_audit_trigger.sql     # Automated audit logs for all mutations
│       ├── 20261120000003_future_tables.sql     # Leads, properties, visits, deals, calls...
│       ├── 20261120000004_storage_buckets.sql   # Private buckets & storage RLS policies
│       └── 20261120000005_seed_and_security.sql # Seed company data & default permissions
├── .env.example                       # Variable NAMES only
└── README.md                          # Architecture and setup guide
```

---

## 2. Environment Variables

Create a `.env.local` file in the root folder with the following keys:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Application Host URL
NEXT_PUBLIC_APP_URL=
```

> **Security Note**: Never commit `.env` or `.env.local` files containing secret keys. Keep all service-role keys restricted to server environments.

---

## 3. Database & Supabase Setup

### Step A: Apply Migrations
Run each migration file sequentially in the **Supabase SQL Editor** or via the Supabase CLI (`supabase db push`):

1. `supabase/migrations/20261120000001_initial_schema.sql`  
   Creates `user_role` enum (`super_admin`, `admin`, `employee`), `profiles`, `employees`, `role_permissions`, `company_settings`, and `audit_logs` tables with initial RLS.
2. `supabase/migrations/20261120000002_audit_trigger.sql`  
   Installs the generic audit trigger capturing `actor_id`, `action`, `old_data`, and `new_data`.
3. `supabase/migrations/20261120000003_future_tables.sql`  
   Installs `leads`, `properties`, `follow_ups`, `site_visits`, `documents`, `calls`, `deals`, `brokerage`, `expenses`, and `attendance` with indexes, updated_at triggers, and comprehensive RLS policies.
4. `supabase/migrations/20261120000004_storage_buckets.sql`  
   Creates private storage buckets (`property-photos`, `documents`, `call-recordings`) and public bucket (`company-assets`), complete with storage object RLS.
5. `supabase/migrations/20261120000005_seed_and_security.sql`  
   Seeds default company profile for **Diksha Real Estate** and default permission matrix.

---

## 4. Role-Based Access Control (RBAC) & Testing Login

### Roles Defined:
1. **Super Admin**: Full unrestricted access across all modules, configuration, and employees.
2. **Admin**: Full access across all modules and employee management; cannot delete corporate company settings.
3. **Employee**: Restricted strictly to records assigned to their user ID or their direct team reporting line (via RLS).

### How to Create Initial Test Accounts in Supabase:
1. Go to your Supabase Project Dashboard -> **Authentication** -> **Users** -> **Add User**.
2. Create an admin user:
   - **Email**: `admin@diksharealestate.com`
   - **Password**: `<secure_password>`
   - Auto Confirm User: Checked
3. In the Supabase **SQL Editor**, run the helper function to assign the `admin` or `super_admin` role:
   ```sql
   SELECT public.promote_user_to_admin('admin@diksharealestate.com', 'admin');
   ```
4. Sign in to the CRM at `/login` with these credentials.
5. From the `/employees` screen in the CRM, the Admin can now seamlessly create additional employee accounts, assign designations, activate/deactivate accounts, and adjust module permissions with one click.

---

## 5. Local Development & Quality Gates

```bash
# Install dependencies
npm install

# Run local development server
npm run dev

# Verify production build & TypeScript validation
npm run build
```

---

## 6. Phase 1 Accomplishments & Phase 2 Roadmap

### Completed in Phase 1 (Foundation):
- [x] Next.js 16 App Router + TypeScript Strict + Tailwind CSS scaffolding
- [x] Full database schema & migrations with foreign key constraints, indexes, triggers, and audit logging
- [x] Complete Row Level Security (RLS) policies on all tables
- [x] Private Supabase Storage buckets (`property-photos`, `documents`, `call-recordings`, `company-assets`) with RLS
- [x] Email + Password authentication, session middleware, and role-based guards
- [x] Responsive layout with 13-item left sidebar, brand topbar, role badges, and logout
- [x] Dashboard shell wired to real database counts (no fake/demo numbers; shows 0 / 'No data yet')
- [x] Admin Employee Directory with account creation, activation toggle, and module permission matrix
- [x] Company Profile settings for Diksha Real Estate with logo upload to Supabase Storage
- [x] Zero build errors (`npm run build` passing cleanly)

### Scheduled for Phase 2:
- Leads Pipeline Board (Kanban view, status stages, CSV import/export)
- Property Inventory (Listing manager, specifications, photo gallery uploader)
- Follow-ups scheduler & automated client reminder notifications
- Site visits booking with GPS coordinates & customer feedback forms
- Telephony & Call recordings playback
- WhatsApp Business Cloud API integration
- Brokerage commission ledger & financial report exports
