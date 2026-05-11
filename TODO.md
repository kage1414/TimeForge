# TimeForge Tasks

## 🔥 In Progress

## 🧠 Backlog

- [] Convert to an ORM that doesn't require migrations (deferred — large architectural change, needs design discussion before starting)

## ✅ Done

- [x] Split SettingsPage into tabs (Profile / Payment / Preferences / Email / Backups / Password / Users) using new TF library `TFTabs` family backed by `@radix-ui/react-tabs`. Single Save Settings button at the bottom of the form still saves Profile + Payment + Preferences + Email together. Backups, Password, Users tabs are independent.
- [x] Remove unused PostgreSQL references — deleted `backend/scripts/migrate-pg-to-sqlite.ts` (a stale one-time migration script that never had its `pg` dep installed); updated CLAUDE.md tech stack + env vars to drop `DATABASE_URL` and call out better-sqlite3.
- [x] CC option on invoice send (`sendInvoice(cc: [String!])`). Frontend send modal has a comma-separated CC input + "CC me ({email})" checkbox that prepends the user's own email to the list before sending.
- [x] Per-client default email template (`clients.default_email_template` via migration `20260510000001_add_client_email_template`). Surfaces as a textarea in the ClientsPage edit modal; InvoiceDetailPage's send-modal templating prefers `invoice.client_default_email_template` over `settings.default_email_template`.
- [x] Build a TF component library (`frontend/src/components/tf/`) on shadcn-style primitives: `class-variance-authority` for variants/colors, `clsx`+`tailwind-merge` via `cn()`, Radix UI for Dialog / DropdownMenu / Slot. Components: `TFButton`, `TFInput`, `TFTextarea`, `TFSelect`, `TFLabel`, `TFField`, `TFCheckbox`, `TFCard`/`TFCardTitle`, `TFBadge`, `TFTable`/`TFTHead`/`TFTBody`/`TFTr`/`TFTh`/`TFTd`, `TFDialog` (+ `TFConfirm` shim that the old `ConfirmModal` now re-exports), `TFDropdownMenu` (+ `TFButtonMenu` convenience that replaced the hand-rolled `SplitDropdown` on InvoiceDetailPage), `TFLink`, `TFSpinner`/`TFLoading`, `TFEmpty`, `TFPageHeader`. Variants: 10× `tfButtonVariants`, 7× `tfBadgeVariants`, plus `size` axes. Reusability rule enforced: TF components import nothing from the app (no `react-router-dom`, no GraphQL/types) — `TFButton`/`TFLink` use Radix `asChild` for slot composition, and TimeForge-specific status→tone mapping lives in `frontend/src/lib/statusTone.ts` outside the library. All 13 pages + `BackupSettings` rewritten against the library; CLAUDE.md updated to require TF before raw markup.
- [x] Restore from backup destination in Settings → Backups: dropdowns to pick destination → pick backup, listed with human-readable dates parsed from the filename + last-modified from S3/Nextcloud. `backupDestinationFiles(id)` query lists `timeforge-backup-*.json.gz` via S3 ListObjectsV2 / Nextcloud PROPFIND; `restoreBackup(destinationId, filename)` mutation downloads, gunzips, validates schema_version, then destructive-replaces all of the current user's rows in a transaction (clients, projects, invoices, line items, time entries, credits, user_settings) — preserving original IDs, remapping `user_id` to the logged-in user, bumping `sqlite_sequence`, and resetting invoice `export_status` so PDFs/CSVs regenerate. Confirm modal warns about destruction. Filename pattern is enforced server-side so clients can't coerce arbitrary GETs.
- [x] Background-generate invoice PDF + CSV on `createInvoice`/`unbillTimeEntry`, store at `${EXPORT_DIR}/<user_id>/<client_id>/invoice-<id>.{pdf,csv}` (default `/data/exports`, separate `exportsdata` docker volume). New `invoices.export_status` ('pending'|'generating'|'ready'|'failed') tracked via migration `20260509000001_add_invoice_export_status`. Express routes `/api/invoices/:id/export.{pdf,csv}` (Bearer/`?token=`) stream the cached files; `sendInvoice` now reads the on-disk PDF instead of accepting `pdfBase64`. Frontend polls `export_status` and disables Export PDF / Export CSV / Send Email until ready, with a Retry button on failure. Removed in-browser `html2canvas`/`jspdf` rendering. Dockerfiles install alpine `chromium` for puppeteer.
- [x] Disable transaction for the nullable-line-item migration on SQLite (it uses .alter() which requires PRAGMA foreign_keys toggling outside any transaction); unblocks subsequent migrations including backup_destinations
- [x] Accept full Nextcloud WebDAV URL (e.g. `https://host/remote.php/dav/files/<userid>`) in the Server URL field — backend strips a trailing `/remote.php/...` segment so users can paste either the root or the URL Nextcloud copies to clipboard; frontend hint added
- [x] Pass `backend/.env` into dev/prod containers via compose `env_file: [{ path, required: false }]`; without this, `BACKUP_ENCRYPTION_KEY` and other vars in the file never reach the container's `process.env`
- [x] Backend reads `.env` files via `dotenv/config` at both server entry (`src/index.ts`) and the knex CLI (`src/db/knexfile.ts`); `backend/.env.example` documents PORT, JWT_SECRET, ADMIN_EMAIL/PASSWORD, DATABASE_PATH, BACKUP_ENCRYPTION_KEY
- [x] Fix non-time-based "Add Entry" appearing as a running timer; flat-amount entries now have null start_time/end_time and are excluded from running timer lists/checks
- [x] Optional date range on non-time-based entries: Add Entry modal shows two optional date inputs when not time-based; entry list and invoice line items render the range (or single date) when present
- [x] Fix flat-amount entries with date range billing computed hours × rate instead of the flat amount; backend skips duration calc for flat entries, dashboard sums flat_amount separately, CreateInvoicePage renders flat entries as flat amount; migration zeros duration_minutes on pre-existing flat rows
- [x] Hide hours and rate on invoice line items for flat-amount entries; line item quantity/rate now nullable, resolver inserts null for flat rows (bill + credit), invoice HTML/PDF/CSV/on-screen render empty cells; migration backfills nullables on pre-existing flat line items
- [x] Avoid duplicate company name on invoices when a client has only a company (no individual name); skip rendering client_name when it equals client_company in invoice HTML, on-screen, and email "To" line
- [x] Per-user backups to S3-compatible storage and Nextcloud (WebDAV); destinations stored in backup_destinations with creds encrypted at rest (AES-256-GCM, key from BACKUP_ENCRYPTION_KEY env var); backup is gzipped JSON snapshot of the user's rows across all data tables; manual "Backup Now" + "Test" from Settings; no scheduling or restore in v1
- [x] Add "Consolidate hours" user setting; when enabled, invoice creation merges same-day time entries (per project + rate) into a single line item; unbill on consolidated invoices regenerates consolidated line items
- [x] Rename "Restart" to "Resume" on time entries; add configurable resume window (default 60 min, 1-min increments); block resume on billed entries and outside window
- [x] Setup to be sent to dockerhub (GitHub Actions workflow + docker-compose.hub.yml)

- [x] Allow not billed items to be credited without requiring an invoice
- [x] Run yarn install when starting docker container

- [x] Attach PDF to invoice emails (checkbox in send modal, generates PDF via html2pdf.js)
- [x] Don't show restart option if entry has end time
- [x] Don't allow end time before start time
- [x] SMTP: test connection button in settings, hide Send Email if SMTP not configured
- [x] Import time entries from Excel with column mapping, preview, and invoice linkage
- [x] Allow me to credit time that has previously been billed
- [x] Remove credits applied in bottom of invoice - credits are now negative line items

- [x] Project setup
- [x] Fix favicon - uses favicon.png in public folder with proper sizing
- [x] Fix credits - removed credits tab/page, removed available credits from dashboard, unbilled amount now only shows unbilled time entries
- [x] Consolidate tabs with dropdown menus (Clients > Projects, Time Tracking > Invoices, Settings > Invites)
- [x] Add Email SMTP settings with Gmail preset, send invoices from invoice detail page
