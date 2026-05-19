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
6. **Always reach for the TF component library before writing raw markup or one-off Tailwind classes.** Buttons, inputs, selects, textareas, cards, dialogs, badges, tables, dropdown menus, links, page headers, etc. all live in `frontend/src/components/tf/` and are exported from the `tf` barrel. Variants/colors are configured via cva (`tfButtonVariants`, `tfBadgeVariants`, `tfLinkVariants`, etc.) — use the existing semantic variants (`primary`, `success`, `danger`, `warning`, `secondary`, `outline`, `ghost`, `muted`, `link`, `linkDanger`) rather than reaching for raw `bg-*`/`text-*` classes. Add new variants to the cva config when a genuinely new style is needed; never duplicate inline styling. If a TF component is missing for a recurring pattern, add it to `frontend/src/components/tf/` (keeping it free of app-specific deps — see "Frontend Component Library" below).

## Project Overview

Full-stack invoicing and time-tracking application.

## Tech Stack

- **Backend**: Node.js, Express, TypeScript, Apollo Server (GraphQL), Knex (query builder/migrations), better-sqlite3 (single file at `DATABASE_PATH`)
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
- **backup_destinations**: id, user_id, name, provider ('s3' | 'nextcloud'), config_encrypted (AES-256-GCM via `BACKUP_ENCRYPTION_KEY` env var; never log or surface the secret fields to the client), last_run_at, last_run_status, last_run_error. Backup is a gzipped JSON snapshot of the user's rows across all data tables; orchestration in `src/backup/`. S3 uses raw Sig V4 (no SDK dep); Nextcloud uses WebDAV PUT/PROPFIND. Nextcloud `base_url` is normalized at use time — a trailing `/remote.php/...` segment is stripped — so users can paste either the Nextcloud root or the full WebDAV URL Nextcloud copies to clipboard. No scheduler or restore yet.
- **invoices**: id, client_id, invoice_number, status (draft/sent/paid/overdue/cancelled), issue_date, due_date, subtotal, tax_rate, tax_amount, credits_applied, total, notes
- **invoices**: id, client_id, invoice_number, status (draft/sent/paid/overdue/cancelled), issue_date, due_date, subtotal, tax_rate, tax_amount, credits_applied, total, notes, `payment_method` (label string written by `updateInvoiceStatus`, e.g. `Cash`, `Check`, `Venmo (...)`), `check_number`, `check_date`, `check_issuer`, `check_receiver`, `check_amount` (all five check_* fields nullable — populated only when paying by check; see migration `20260519000001_add_invoice_check_payment`), `export_status` ('pending' | 'generating' | 'ready' | 'failed'), `export_error`, `export_generated_at`
- **invoice_line_items**: id, invoice_id, description, quantity, rate, amount, time_entry_id
- **credits**: id, client_id, amount, remaining_amount, description, source_invoice_id, applied_invoice_id
- **user_settings**: id (single row, id=1), first_name, last_name, email, address1, address2, city, state, phone, venmo, cashapp, paypal, zelle, show_earnings_on_timer, resume_window_minutes (default 60), consolidate_hours (default false — when true, invoice creation merges same-day time entries per project+rate into one line item), default_rate (nullable decimal — user-level fallback hourly rate; pre-fills the new-project form on ProjectsPage and is used as the final rate fallback in amount calcs when both `time_entries.rate_override` and `projects.default_rate` are null/0)
- **invoices** stores a `consolidate_hours` boolean snapshot captured from user settings at creation time; unbillTimeEntry rebuilds consolidated line items (time_entry_id=NULL) when invoice was created with consolidation on

### Rate resolution

Hourly time-entry amount = `hours × effectiveRate`. The fallback chain is `rate_override → projects.default_rate (if > 0) → user_settings.default_rate (if > 0) → 0`. The `effectiveRate(rate_override, project_default, user_default)` helper at the top of `backend/src/graphql/resolvers.ts` is the single source of truth for the JS code paths (creditTimeEntry, createInvoice hourly + credit branches, unbillTimeEntry consolidate rebuild); the SQL dashboard aggregation uses `COALESCE(time_entries.rate_override, NULLIF(projects.default_rate, 0), ?)` with the user's default rate bound at query time. Flat-amount entries are unaffected — always use `flat_amount` directly. Frontend display rates still read `rate_override ?? default_rate` against the project's own rate; consider adding an `effective_rate` GraphQL field if UI display drift becomes a problem.

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

## Invoice Export Pipeline

- On `createInvoice` (and on `unbillTimeEntry` since line items change), the backend marks `invoices.export_status='pending'` and fires off a background generation in `backend/src/exports/generator.ts`. The generator builds invoice HTML server-side (`exports/html.ts`, mirrors the look of the on-screen render — never let client and server templates drift), writes a CSV, then renders the HTML to PDF with a long-lived `puppeteer` browser singleton (system `chromium` via `PUPPETEER_EXECUTABLE_PATH`, alpine packages installed in both Dockerfiles). Files are stored at `${EXPORT_DIR}/<user_id>/<client_id>/invoice-<invoice_id>.{pdf,csv}` and `EXPORT_DIR` defaults to `/data/exports` in containers (mounted via the `exportsdata` volume in `docker-compose.yml`).
- Generations are deduped per-invoice via an in-memory `inFlight` Map; on server restart `resetStaleGeneratingStatus` flips any leftover `generating` rows back to `pending`. Legacy invoices with `export_status='pending'` are kicked off lazily when `Query.invoice` is fetched. `deleteInvoice` deletes both export files.
- `Query.invoice` exposes `export_status`/`export_error`/`export_generated_at`; the frontend polls (`refetchInterval` 2s while pending/generating) and disables Export PDF / Export CSV / Send Email until status is `ready`. A `regenerateInvoiceExports(id)` mutation is the manual retry path (used by a "Retry" button when status is `failed`).
- Export downloads come from `GET /api/invoices/:id/export.pdf` and `.csv` (auth via `Authorization: Bearer` header or `?token=` query param). The route awaits `ensureExportsReady` so a missing file triggers regeneration synchronously. `sendInvoice(attachPdf: Boolean)` reads the on-disk PDF directly — no more base64 round-trip from the browser, and it errors if `export_status !== 'ready'`.

## Frontend Component Library (TF)

- All reusable UI primitives live in `frontend/src/components/tf/` and are re-exported from `frontend/src/components/tf/index.ts`. Pages should import from the barrel: `import { TFButton, TFCard, TFField, TFInput, ... } from '../components/tf'`.
- Stack: shadcn-style — `class-variance-authority` (cva) for variants, `clsx` + `tailwind-merge` exposed via `cn()` in `frontend/src/lib/utils.ts`, Radix UI primitives (`@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-slot`).
- **Hard rule: TF components must be reusable in any context with no app-level dependencies.** Concretely:
  - No imports from `react-router-dom`. `TFButton` and `TFLink` use Radix `Slot` and accept `asChild` so callers wrap a router `Link` themselves: `<TFButton asChild><Link to="...">…</Link></TFButton>`.
  - No imports from app modules (auth context, GraphQL client, query hooks, types). If a primitive needs domain logic to be useful, the domain logic lives outside the TF library — e.g. TimeForge's invoice/user status → badge tone mapping is in `frontend/src/lib/statusTone.ts` and just feeds `TFBadge tone={...}`.
  - Internal cross-references between TF components are fine (e.g. `TFField` uses `TFLabel`, `TFConfirm` composes `TFDialog` + `TFButton`, `TFButtonMenu` composes `TFDropdownMenu` + `TFButton`).
- Components and what they replaced:
  - `TFButton` (10 variants × 4 sizes via `tfButtonVariants`) — replaces all `bg-indigo-600 text-white px-4 py-2 rounded` patterns. `asChild` prop turns it into a slot for router links / file-upload labels.
  - `TFInput`, `TFTextarea`, `TFSelect` — form controls with `tone` (default/error) and `size` (sm/md/lg) variants.
  - `TFLabel`, `TFField` — `TFField` wraps label + control + hint/error and is the preferred way to render a form field. `required` prop adds the red asterisk.
  - `TFCheckbox` — checkbox with optional `label` + `description` text rendered as a clickable `<label>`.
  - `TFCard` (`padding`: none/sm/md/lg, `bordered`: bool), `TFCardHeader`, `TFCardTitle`, `TFCardContent` — replaces `bg-white rounded-lg shadow p-4`.
  - `TFBadge` (`tone`: neutral/primary/success/danger/warning/info/purple, `size`: xs/sm/md/lg) — replaces all `px-2 py-1 rounded text-xs font-medium ${color}` patterns.
  - `TFTable`, `TFTHead`, `TFTBody`, `TFTr`, `TFTh`, `TFTd` — table primitives with the standard `bg-gray-50` header + hover row styling baked in.
  - `TFDialog`, `TFDialogContent` (size: sm/md/lg/xl/2xl), `TFDialogHeader`, `TFDialogTitle`, `TFDialogDescription`, `TFDialogBody`, `TFDialogFooter` — Radix Dialog with TF chrome. **`TFConfirm`** is a thin wrapper for confirm-then-act prompts (the old `ConfirmModal` is now a backwards-compat shim that renders `TFConfirm`).
  - `TFDropdownMenu`, `TFDropdownMenuTrigger`, `TFDropdownMenuContent`, `TFDropdownMenuItem`, `TFDropdownMenuSeparator`, `TFDropdownMenuLabel` — Radix DropdownMenu with TF chrome. **`TFButtonMenu`** is a convenience wrapper that takes `{ trigger: TFButtonProps, items: { label, onSelect, destructive?, disabled? }[] }` and is what replaced the old hand-rolled `SplitDropdown` on the invoice detail page.
  - `TFLink` — styled anchor (also supports `asChild`) for inline text links; for button-styled router links use `<TFButton asChild><Link ...></TFButton>`.
  - `TFLoading`, `TFSpinner`, `TFEmpty`, `TFPageHeader` — display primitives for the common loading/empty/header patterns.
- TimeForge-specific helpers that are *not* part of TF: `frontend/src/lib/statusTone.ts` exports `statusTone(status)` which maps invoice statuses (`draft`/`sent`/`paid`/`overdue`/`cancelled`), backup run statuses, invoice export statuses, and user roles to a `TFBadgeTone`. Always feed the result of `statusTone(...)` into `<TFBadge tone={...}>` — don't hardcode tones at call sites.

## Backup Scheduling & Retention

- `backup_destinations` rows carry `schedule_preset` ('off' | 'daily' | 'every3days' | 'weekly' | 'monthly' | 'yearly' | 'custom'), optional `schedule_cron` (only for 'custom'), `next_run_at`, and retention fields `retention_days` / `retention_cron` / `retention_last_run_at` / `retention_last_error` / `retention_next_run_at` (migration `20260510000002_backup_schedule_retention`). Preset cron strings live in `backend/src/backup/scheduler.ts` (`PRESET_CRON`); retention defaults to `0 3 * * *` (03:00 daily) when only `retention_days` is set.
- `startBackupScheduler()` runs an in-process tick every 60 s (kicked off from `index.ts` after migrations). Each tick finds destinations whose `next_run_at` ≤ now and runs `runBackup`, then recomputes `next_run_at` via `nextRunAt(preset, cron)` (cron-parser via `CronExpressionParser.parse`). It separately finds destinations whose `retention_next_run_at` ≤ now, lists files via the destination's existing list helper, and deletes any whose `last_modified` is older than `retention_days * 86400_000`. Failures don't block subsequent destinations — they get logged + recorded in `last_run_error` / `retention_last_error`. The scheduler is a no-op when `BACKUP_ENCRYPTION_KEY` isn't configured.
- `createBackupDestination` / `updateBackupDestination` now accept an optional `schedule: BackupScheduleInput { schedule_preset, schedule_cron, retention_days, retention_cron }`; `applyScheduleInput` (in resolvers) validates the preset, drops `schedule_cron` unless preset='custom', drops `retention_cron` unless `retention_days > 0`, and after the write `refreshDestinationSchedule(id)` recomputes both `next_run_at` and `retention_next_run_at`. UI lives in `BackupSettings.tsx` — Schedule + Retention sections appear at the bottom of the create/edit form, and the destination list shows `Schedule: ... — next ...` and `Retention: delete after N days — next check ...` rows.

## Backup Restore

- Restores read directly from a configured backup destination (S3 / Nextcloud) — there is no local-file upload path. `backupDestinationFiles(id: Int!)` query lists every `timeforge-backup-*.json.gz` object in the destination (S3: `ListObjectsV2` with the destination's `prefix`; Nextcloud: `PROPFIND` Depth: 1 against the destination's `path`). Each file is returned with `size`, `last_modified` (server-reported), and `exported_at` (parsed from the filename's `YYYY-MM-DDTHH-MM-SS-mmmZ` stamp). Provider list/download helpers live in `backend/src/backup/providers/{s3,nextcloud}.ts`; `backend/src/backup/run.ts` exposes `listBackupsForDestination` / `downloadBackupFromDestination`, the latter refusing any filename that doesn't match the `timeforge-backup-…json.gz` shape so the client can't coerce arbitrary GETs.
- `restoreBackup(destinationId: Int!, filename: String!)` mutation downloads the chosen file via the destination, gunzips, validates `schema_version` (=1), then performs a destructive replace **scoped to the logged-in user** in a single Knex transaction (`backend/src/backup/restore.ts`): deletes the user's rows from `clients`/`projects`/`invoices`/`invoice_line_items`/`time_entries`/`credits`, reinserts in forward FK order with original IDs preserved, updates the user's `user_settings` row in place, and bumps `sqlite_sequence` so future inserts don't collide with restored IDs. All `user_id` columns are forced to the current user — restoring someone else's backup file lands the data under your account, never overwrites theirs.
- Invoice rows have `export_status` reset to `pending` on restore; PDF/CSV files are regenerated in the background after the transaction commits (this server's `EXPORT_DIR` doesn't have the source files from wherever the backup came from).
- The UI lives in `BackupSettings.tsx` as a "Restore from Backup" card under the destinations list: pick destination → pick backup (dropdown shows human-readable date + size, sorted newest-first by `last_modified`) → confirm modal → restore. Hidden entirely when `backupConfigured` is false.

## Environment Variables

- `DATABASE_PATH` - SQLite path (containers default to `/data/db.sqlite`; locally falls back to `os.tmpdir()/timeforge/db.sqlite` per `knexfile.ts`)
- `EXPORT_DIR` - Where invoice export PDFs/CSVs are written when storing on disk (containers default to `/data/exports`)
- `INVOICE_S3_BUCKET` (+ `INVOICE_S3_REGION`, `INVOICE_S3_ACCESS_KEY_ID`, `INVOICE_S3_SECRET_ACCESS_KEY`, optional `INVOICE_S3_ENDPOINT`/`INVOICE_S3_PREFIX`/`INVOICE_S3_FORCE_PATH_STYLE`) - if `INVOICE_S3_BUCKET` is set, invoice PDF/CSV exports are stored in S3 instead of `EXPORT_DIR`. Falls back to disk when unset. Multi-tenant: every user's exports live under `<prefix>/<user_id>/<client_id>/invoice-<id>.{pdf,csv}` in the same bucket.
- `PUPPETEER_EXECUTABLE_PATH` - Chromium binary path used by puppeteer (`/usr/bin/chromium-browser` in the alpine images)
- `PORT` - Backend port (default: 4000)
