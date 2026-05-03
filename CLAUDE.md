# TimeForge

# Claude Operating Instructions

You are responsible for maintaining project state.

ALWAYS do the following on every meaningful response:

1. Update TODO.md

- Move completed items to Done
- Add new tasks if discovered
- Break large tasks into smaller ones
- Commit completed items before moving to the next.

2. Update CLAUDE.md
   - Add any new architectural decisions
   - Track patterns, conventions, or constraints
   - Keep it concise and organized

3. Output BOTH updated files at the end of your response:
   - Full updated TASKS.md
   - Full updated CLAUDE.md
   - Commit changes before moving on to the next item

4. Never skip updates, even if not explicitly asked.
5. Treat these files as the source of truth.

## Project Overview

Full-stack invoicing and time-tracking application.

## Tech Stack

- **Backend**: Node.js, Express, TypeScript, Apollo Server (GraphQL), Knex (query builder/migrations), PostgreSQL
- **Frontend**: React, TypeScript, Vite, Tailwind CSS, TanStack React Query, React Router, react-hot-toast
- **Package Manager**: Yarn
- **Deployment**: Docker Compose (production + dev with hot reload)

## Project Structure

```
├── backend/
│   ├── src/
│   │   ├── index.ts              # Express server entry point (port 4000)
│   │   ├── db/
│   │   │   ├── index.ts          # Knex database connection
│   │   │   ├── knexfile.ts       # Knex configuration
│   │   │   └── migrations/       # Database migrations
│   │   └── graphql/
│   │       ├── schema.ts         # GraphQL type definitions
│   │       └── resolvers.ts      # GraphQL resolvers (queries + mutations)
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── main.tsx              # React entry point
│   │   ├── App.tsx               # Router + nav layout
│   │   ├── api/client.ts         # GraphQL client (gql helper)
│   │   ├── types/index.ts        # TypeScript interfaces
│   │   └── pages/
│   │       ├── DashboardPage.tsx
│   │       ├── ClientsPage.tsx
│   │       ├── ProjectsPage.tsx
│   │       ├── TimeEntriesPage.tsx
│   │       ├── InvoicesPage.tsx
│   │       ├── InvoiceDetailPage.tsx
│   │       ├── CreateInvoicePage.tsx
│   │       ├── CreditsPage.tsx
│   │       └── SettingsPage.tsx
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── tsconfig.json
├── docker-compose.yml            # Production deployment
└── docker-compose.dev.yml        # Dev with hot reloading
```

## Database Schema

- **clients**: id, name, email, address1, address2, city, state, phone
- **projects**: id, client_id, name, description, default_rate, is_active
- **time_entries**: id, project_id, description, start_time, end_time, duration_minutes, is_billable, invoice_id, rate_override, flat_amount (when non-null, the entry is a flat-amount item; start_time/end_time are an optional date range — stored as ISO at UTC midnight, formatted with `timeZone: 'UTC'` to avoid off-by-one in local time. Flat entries are excluded from running-timer queries and UI filters, and `duration_minutes` is forced to 0 for flat entries — never derive hours/amount from duration × rate for flat rows; always use `flat_amount` directly)
- **backup_destinations**: id, user_id, name, provider ('s3' | 'nextcloud'), config_encrypted (AES-256-GCM via `BACKUP_ENCRYPTION_KEY` env var; never log or surface the secret fields to the client), last_run_at, last_run_status, last_run_error. Backup is a gzipped JSON snapshot of the user's rows across all data tables; orchestration in `src/backup/`. S3 uses raw Sig V4 (no SDK dep); Nextcloud uses WebDAV PUT/PROPFIND. No scheduler or restore yet.
- **invoices**: id, client_id, invoice_number, status (draft/sent/paid/overdue/cancelled), issue_date, due_date, subtotal, tax_rate, tax_amount, credits_applied, total, notes
- **invoice_line_items**: id, invoice_id, description, quantity, rate, amount, time_entry_id
- **credits**: id, client_id, amount, remaining_amount, description, source_invoice_id, applied_invoice_id
- **user_settings**: id (single row, id=1), first_name, last_name, email, address1, address2, city, state, phone, venmo, cashapp, paypal, zelle, show_earnings_on_timer, resume_window_minutes (default 60), consolidate_hours (default false — when true, invoice creation merges same-day time entries per project+rate into one line item)
- **invoices** stores a `consolidate_hours` boolean snapshot captured from user settings at creation time; unbillTimeEntry rebuilds consolidated line items (time_entry_id=NULL) when invoice was created with consolidation on

## Key Commands

```bash
# Backend
cd backend && yarn install
yarn dev           # Dev server with hot reload (tsx watch)
yarn build         # TypeScript compile
yarn migrate       # Run database migrations
yarn seed          # Seed database

# Frontend
cd frontend && yarn install
yarn dev           # Vite dev server
yarn build         # Production build

# Docker
docker-compose up --build              # Production
docker-compose -f docker-compose.dev.yml up --build  # Dev with hot reload
```

## GraphQL API

Single endpoint at `/graphql` (Apollo Server).

### Queries

- `clients`, `client(id)` - Client CRUD
- `projects(client_id, is_active)`, `project(id)` - Project CRUD
- `timeEntries(project_id, client_id, unbilled, billed)`, `timeEntry(id)` - Time entry queries
- `invoices(client_id, status)`, `invoice(id)` - Invoice queries (invoice includes line_items and credits)
- `credits(client_id, available)` - Credit queries
- `userSettings` - Single-row user profile (personal details + payment methods)
- `dashboard` - Summary stats (running timers, unbilled hours/amount, recent invoices, outstanding amount)

### Mutations

- `createClient`, `updateClient`, `deleteClient`
- `createProject`, `updateProject`, `deleteProject`
- `createTimeEntry`, `updateTimeEntry`, `deleteTimeEntry`, `stopTimeEntry`, `restartTimeEntry` (labeled "Resume" in UI; blocked for billed entries or after `resume_window_minutes` since end_time), `unbillTimeEntry`, `creditTimeEntry`
- `createInvoice(input)` - Creates invoice; accepts `time_entry_ids` (to bill), `credit_time_entry_ids` (to create credits applied to invoice)
- `updateInvoiceStatus`, `deleteInvoice`
- `createCredit`, `deleteCredit`
- `updateUserSettings(input)` - Update user profile and payment methods

## Environment Variables

- `DATABASE_URL` - PostgreSQL connection string (default: postgresql://postgres:postgres@db:5432/invoicer)
- `PORT` - Backend port (default: 4000)
