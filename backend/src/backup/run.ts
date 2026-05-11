import db from '../db';
import { decryptJson, encryptJson, isBackupEncryptionConfigured } from './encryption';
import { backupFilename, buildUserBackup, gzipBackup } from './export';
import {
  S3Config,
  deleteFromS3,
  downloadFromS3,
  listFromS3,
  s3KeyFor,
  testS3,
  uploadToS3,
} from './providers/s3';
import {
  NextcloudConfig,
  deleteFromNextcloud,
  downloadFromNextcloud,
  listFromNextcloud,
  testNextcloud,
  uploadToNextcloud,
} from './providers/nextcloud';

export type BackupProvider = 's3' | 'nextcloud';

export interface BackupDestinationRow {
  id: number;
  user_id: number;
  name: string;
  provider: BackupProvider;
  config_encrypted: string;
  last_run_at: Date | string | null;
  last_run_status: string | null;
  last_run_error: string | null;
  schedule_preset: string | null;
  schedule_cron: string | null;
  next_run_at: Date | string | null;
  retention_days: number | null;
  retention_cron: string | null;
  retention_last_run_at: Date | string | null;
  retention_last_error: string | null;
  retention_next_run_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface S3InputConfig extends S3Config {}
export interface NextcloudInputConfig extends NextcloudConfig {}

export type ProviderConfig =
  | { provider: 's3'; config: S3InputConfig }
  | { provider: 'nextcloud'; config: NextcloudInputConfig };

export function ensureBackupReady(): void {
  if (!isBackupEncryptionConfigured()) {
    throw new Error(
      'Backups are disabled: BACKUP_ENCRYPTION_KEY is not set. ' +
      'Generate one with `openssl rand -hex 32` and set it in the backend environment.'
    );
  }
}

function validateConfig(p: ProviderConfig): void {
  if (p.provider === 's3') {
    const c = p.config;
    if (!c.region || !c.bucket || !c.access_key_id || !c.secret_access_key) {
      throw new Error('S3 config requires region, bucket, access_key_id, secret_access_key');
    }
  } else if (p.provider === 'nextcloud') {
    const c = p.config;
    if (!c.base_url || !c.username || !c.password) {
      throw new Error('Nextcloud config requires base_url, username, password');
    }
  } else {
    throw new Error('Unknown provider');
  }
}

export function encryptProviderConfig(p: ProviderConfig): string {
  validateConfig(p);
  return encryptJson(p);
}

export function decryptProviderConfig(row: Pick<BackupDestinationRow, 'provider' | 'config_encrypted'>): ProviderConfig {
  const decrypted = decryptJson<{ provider: BackupProvider; config: unknown }>(row.config_encrypted);
  if (decrypted.provider !== row.provider) {
    throw new Error('Stored provider config does not match destination provider');
  }
  return decrypted as ProviderConfig;
}

export async function testDestination(row: BackupDestinationRow): Promise<void> {
  ensureBackupReady();
  const cfg = decryptProviderConfig(row);
  if (cfg.provider === 's3') await testS3(cfg.config);
  else await testNextcloud(cfg.config);
}

async function uploadWith(cfg: ProviderConfig, filename: string, body: Buffer): Promise<void> {
  if (cfg.provider === 's3') {
    await uploadToS3(cfg.config, filename, body, 'application/gzip');
  } else {
    await uploadToNextcloud(cfg.config, filename, body, 'application/gzip');
  }
}

export async function runBackup(row: BackupDestinationRow): Promise<{ filename: string; bytes: number }> {
  ensureBackupReady();
  const cfg = decryptProviderConfig(row);
  const user = await db('users').where('id', row.user_id).first();
  if (!user) throw new Error('User not found');
  const backup = await buildUserBackup(row.user_id);
  const body = gzipBackup(backup);
  const filename = backupFilename(row.user_id, user.email);
  try {
    await uploadWith(cfg, filename, body);
    await db('backup_destinations')
      .where('id', row.id)
      .update({
        last_run_at: db.fn.now(),
        last_run_status: 'ok',
        last_run_error: null,
        updated_at: db.fn.now(),
      });
    return { filename, bytes: body.length };
  } catch (err: any) {
    await db('backup_destinations')
      .where('id', row.id)
      .update({
        last_run_at: db.fn.now(),
        last_run_status: 'error',
        last_run_error: String(err?.message || err).slice(0, 1000),
        updated_at: db.fn.now(),
      });
    throw err;
  }
}

export interface RemoteBackupFile {
  filename: string;
  size: number;
  last_modified: string;
}

const BACKUP_FILE_RX = /^timeforge-backup-.+\.json\.gz$/i;

export async function listBackupsForDestination(row: BackupDestinationRow): Promise<RemoteBackupFile[]> {
  ensureBackupReady();
  const cfg = decryptProviderConfig(row);
  if (cfg.provider === 's3') {
    const objects = await listFromS3(cfg.config);
    return objects
      .map((o) => ({
        filename: o.key.split('/').pop() || o.key,
        size: o.size,
        last_modified: o.last_modified,
      }))
      .filter((o) => BACKUP_FILE_RX.test(o.filename));
  }
  const items = await listFromNextcloud(cfg.config);
  return items.filter((o) => BACKUP_FILE_RX.test(o.filename));
}

export async function downloadBackupFromDestination(
  row: BackupDestinationRow,
  filename: string,
): Promise<Buffer> {
  ensureBackupReady();
  if (!BACKUP_FILE_RX.test(filename)) {
    // Defensive: refuse to GET arbitrary paths chosen by the client.
    throw new Error('Refusing to download non-backup file');
  }
  const cfg = decryptProviderConfig(row);
  if (cfg.provider === 's3') {
    return downloadFromS3(cfg.config, s3KeyFor(cfg.config, filename));
  }
  return downloadFromNextcloud(cfg.config, filename);
}

export async function deleteBackupFromDestination(
  row: BackupDestinationRow,
  filename: string,
): Promise<void> {
  ensureBackupReady();
  if (!BACKUP_FILE_RX.test(filename)) {
    throw new Error('Refusing to delete non-backup file');
  }
  const cfg = decryptProviderConfig(row);
  if (cfg.provider === 's3') {
    return deleteFromS3(cfg.config, s3KeyFor(cfg.config, filename));
  }
  return deleteFromNextcloud(cfg.config, filename);
}
