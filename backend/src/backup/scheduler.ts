import { CronExpressionParser } from 'cron-parser';
import db from '../db';
import { isBackupEncryptionConfigured } from './encryption';
import {
  BackupDestinationRow,
  deleteBackupFromDestination,
  listBackupsForDestination,
  runBackup,
} from './run';

export type SchedulePreset =
  | 'off'
  | 'daily'
  | 'every3days'
  | 'weekly'
  | 'monthly'
  | 'yearly'
  | 'custom';

export const SCHEDULE_PRESETS: SchedulePreset[] = [
  'off',
  'daily',
  'every3days',
  'weekly',
  'monthly',
  'yearly',
  'custom',
];

const PRESET_CRON: Record<Exclude<SchedulePreset, 'off' | 'custom'>, string> = {
  daily: '0 2 * * *', // 02:00 every day
  every3days: '0 2 */3 * *', // 02:00 every 3rd day
  weekly: '0 2 * * 1', // 02:00 every Monday
  monthly: '0 2 1 * *', // 02:00 on the 1st
  yearly: '0 2 1 1 *', // 02:00 on Jan 1
};

export function nextRunAt(
  preset: SchedulePreset,
  customCron: string | null | undefined,
  fromDate: Date = new Date(),
): Date | null {
  if (preset === 'off') return null;
  let expr: string;
  if (preset === 'custom') {
    if (!customCron) return null;
    expr = customCron;
  } else {
    expr = PRESET_CRON[preset];
  }
  try {
    const it = CronExpressionParser.parse(expr, { currentDate: fromDate });
    return it.next().toDate();
  } catch {
    return null;
  }
}

const DEFAULT_RETENTION_CRON = '0 3 * * *'; // 03:00 daily

export function nextRetentionAt(
  retentionDays: number | null | undefined,
  cron: string | null | undefined,
  fromDate: Date = new Date(),
): Date | null {
  if (!retentionDays || retentionDays <= 0) return null;
  const expr = cron || DEFAULT_RETENTION_CRON;
  try {
    const it = CronExpressionParser.parse(expr, { currentDate: fromDate });
    return it.next().toDate();
  } catch {
    return null;
  }
}

async function processBackupRun(row: BackupDestinationRow): Promise<void> {
  try {
    await runBackup(row);
  } catch (err) {
    console.error(`[backup-scheduler] backup ${row.id} (${row.name}) failed:`, err);
  } finally {
    const next = nextRunAt(
      (row.schedule_preset as SchedulePreset) || 'off',
      row.schedule_cron,
    );
    await db('backup_destinations').where('id', row.id).update({
      next_run_at: next ? next.toISOString() : null,
      updated_at: db.fn.now(),
    });
  }
}

async function processRetention(row: BackupDestinationRow): Promise<void> {
  const days = row.retention_days as number | null;
  if (!days || days <= 0) return;
  const cutoff = new Date(Date.now() - days * 86400_000);
  let error: string | null = null;
  let deleted = 0;
  try {
    const files = await listBackupsForDestination(row);
    for (const f of files) {
      const ts = Date.parse(f.last_modified);
      if (Number.isFinite(ts) && ts < cutoff.getTime()) {
        try {
          await deleteBackupFromDestination(row, f.filename);
          deleted++;
        } catch (err: any) {
          console.error(
            `[backup-scheduler] retention: delete ${f.filename} on ${row.name} failed:`,
            err,
          );
        }
      }
    }
    if (deleted > 0) {
      console.log(
        `[backup-scheduler] retention: deleted ${deleted} expired backup(s) from ${row.name}`,
      );
    }
  } catch (err: any) {
    error = String(err?.message || err).slice(0, 1000);
    console.error(`[backup-scheduler] retention check on ${row.name} failed:`, err);
  } finally {
    const next = nextRetentionAt(days, row.retention_cron);
    await db('backup_destinations').where('id', row.id).update({
      retention_last_run_at: db.fn.now(),
      retention_last_error: error,
      retention_next_run_at: next ? next.toISOString() : null,
      updated_at: db.fn.now(),
    });
  }
}

let timer: NodeJS.Timeout | null = null;
let running = false;

async function tick(): Promise<void> {
  if (running) return;
  running = true;
  try {
    if (!isBackupEncryptionConfigured()) return;
    const now = new Date();

    // Backup runs
    const dueBackups: BackupDestinationRow[] = await db('backup_destinations')
      .whereNot('schedule_preset', 'off')
      .whereNotNull('next_run_at')
      .where('next_run_at', '<=', now.toISOString());
    for (const row of dueBackups) {
      await processBackupRun(row);
    }

    // Retention runs
    const dueRetention: BackupDestinationRow[] = await db('backup_destinations')
      .whereNotNull('retention_days')
      .whereNotNull('retention_next_run_at')
      .where('retention_next_run_at', '<=', now.toISOString());
    for (const row of dueRetention) {
      await processRetention(row);
    }
  } catch (err) {
    console.error('[backup-scheduler] tick error:', err);
  } finally {
    running = false;
  }
}

/**
 * Start the in-process backup scheduler. Wakes every minute and runs any
 * destinations whose next_run_at / retention_next_run_at have come due.
 *
 * Safe to call multiple times — only one timer will be active.
 */
export function startBackupScheduler(): void {
  if (timer) return;
  // First tick shortly after startup, then every minute.
  setTimeout(() => {
    void tick();
    timer = setInterval(tick, 60_000);
  }, 5_000).unref();
}

/**
 * Recompute next_run_at / retention_next_run_at for a destination based on its
 * current preset/cron. Called whenever the schedule changes.
 */
export async function refreshDestinationSchedule(id: number): Promise<void> {
  const row: BackupDestinationRow | undefined = await db('backup_destinations').where('id', id).first();
  if (!row) return;
  const next = nextRunAt(
    (row.schedule_preset as SchedulePreset) || 'off',
    row.schedule_cron,
  );
  const nextRet = nextRetentionAt(
    row.retention_days as number | null,
    row.retention_cron,
  );
  await db('backup_destinations').where('id', id).update({
    next_run_at: next ? next.toISOString() : null,
    retention_next_run_at: nextRet ? nextRet.toISOString() : null,
    updated_at: db.fn.now(),
  });
}
