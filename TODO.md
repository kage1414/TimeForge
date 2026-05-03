# TimeForge Tasks

## 🔥 In Progress

## 🧠 Backlog

## ✅ Done

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
