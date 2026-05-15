import { gunzipSync } from 'zlib';
import db from '../db';
import type { UserBackup } from './export';

const SUPPORTED_SCHEMA_VERSIONS = new Set<number>([1]);

const RESTORABLE_TABLES = [
  'clients',
  'projects',
  'invoices',
  'invoice_line_items',
  'time_entries',
  'credits',
] as const;

export interface RestoreCounts {
  clients: number;
  projects: number;
  invoices: number;
  invoice_line_items: number;
  time_entries: number;
  credits: number;
  user_settings: number;
}

export function decodeBackup(buffer: Buffer): UserBackup {
  let raw: Buffer;
  try {
    raw = gunzipSync(buffer);
  } catch {
    // Maybe it's an uncompressed JSON file.
    raw = buffer;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.toString('utf8'));
  } catch (err: any) {
    throw new Error(`Backup file is not valid JSON: ${err?.message || err}`);
  }
  const data = parsed as UserBackup;
  if (!data || typeof data !== 'object') {
    throw new Error('Backup file is empty or malformed');
  }
  if (!SUPPORTED_SCHEMA_VERSIONS.has(data.schema_version)) {
    throw new Error(
      `Unsupported backup schema version: ${data.schema_version}. Expected one of ${[
        ...SUPPORTED_SCHEMA_VERSIONS,
      ].join(', ')}.`,
    );
  }
  return data;
}

function remapUserId<T extends Record<string, any>>(rows: T[] | undefined, userId: number): T[] {
  if (!rows?.length) return [];
  return rows.map((r) => ({ ...r, user_id: userId }));
}

export async function restoreUserBackup(
  userId: number,
  backup: UserBackup,
): Promise<RestoreCounts> {
  const counts: RestoreCounts = {
    clients: 0,
    projects: 0,
    invoices: 0,
    invoice_line_items: 0,
    time_entries: 0,
    credits: 0,
    user_settings: 0,
  };

  const clients = remapUserId(backup.clients, userId);
  const projects = remapUserId(backup.projects, userId);
  const invoices = remapUserId(backup.invoices, userId);
  // invoice_line_items has no user_id column; foreign-keyed via invoice_id only.
  const invoiceLineItems = backup.invoice_line_items ?? [];
  const timeEntries = remapUserId(backup.time_entries, userId);
  const credits = remapUserId(backup.credits, userId);
  const userSettings = backup.user_settings
    ? { ...backup.user_settings, user_id: userId }
    : null;

  // Defensively force export_status back to 'pending' so PDF/CSV gets regenerated
  // on disk under this server's EXPORT_DIR (the old files don't exist here yet).
  // Also map the retired `consolidate_hours` boolean onto the new `consolidated`
  // column for backups taken before the consolidation migration.
  for (const inv of invoices as any[]) {
    inv.export_status = 'pending';
    inv.export_error = null;
    inv.export_generated_at = null;
    if ('consolidate_hours' in inv) {
      if (inv.consolidated == null) {
        inv.consolidated = !!inv.consolidate_hours;
      }
      delete inv.consolidate_hours;
    }
  }
  if (userSettings && 'consolidate_hours' in (userSettings as any)) {
    delete (userSettings as any).consolidate_hours;
  }

  await db.transaction(async (trx) => {
    // Wipe all of this user's data in safe FK order.
    await trx('invoice_line_items')
      .whereIn(
        'invoice_id',
        trx('invoices').where('user_id', userId).select('id'),
      )
      .del();
    await trx('time_entries').where('user_id', userId).del();
    await trx('credits').where('user_id', userId).del();
    await trx('invoices').where('user_id', userId).del();
    await trx('projects').where('user_id', userId).del();
    await trx('clients').where('user_id', userId).del();

    // Reinsert in forward FK order, preserving original IDs.
    if (clients.length) {
      await trx.batchInsert('clients', clients, 100);
      counts.clients = clients.length;
    }
    if (projects.length) {
      await trx.batchInsert('projects', projects, 100);
      counts.projects = projects.length;
    }
    if (invoices.length) {
      await trx.batchInsert('invoices', invoices, 100);
      counts.invoices = invoices.length;
    }
    if (invoiceLineItems.length) {
      await trx.batchInsert('invoice_line_items', invoiceLineItems, 100);
      counts.invoice_line_items = invoiceLineItems.length;
    }
    if (timeEntries.length) {
      await trx.batchInsert('time_entries', timeEntries, 100);
      counts.time_entries = timeEntries.length;
    }
    if (credits.length) {
      await trx.batchInsert('credits', credits, 100);
      counts.credits = credits.length;
    }

    if (userSettings) {
      const existing = await trx('user_settings').where('user_id', userId).first();
      // Strip the auto-increment id so we don't fight the existing row.
      const { id: _ignoredId, ...settingsToWrite } = userSettings as any;
      if (existing) {
        await trx('user_settings').where('user_id', userId).update(settingsToWrite);
      } else {
        await trx('user_settings').insert(settingsToWrite);
      }
      counts.user_settings = 1;
    }

    // Bump SQLite's AUTOINCREMENT counters so future inserts don't collide
    // with the IDs we just restored.
    const hasSeqTable = await trx.schema.hasTable('sqlite_sequence');
    if (hasSeqTable) {
      for (const table of RESTORABLE_TABLES) {
        const row = await trx(table).max({ max: 'id' }).first<{ max: number | null }>();
        const max = row?.max ?? 0;
        if (max <= 0) continue;
        const seq = await trx('sqlite_sequence').where('name', table).first();
        if (seq) {
          await trx('sqlite_sequence').where('name', table).update({ seq: max });
        } else {
          await trx('sqlite_sequence').insert({ name: table, seq: max });
        }
      }
    }
  });

  return counts;
}
