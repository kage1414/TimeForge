import db from '../db';
import { decryptJson, encryptJson, isBackupEncryptionConfigured } from './encryption';
import { backupFilename, buildUserBackup, gzipBackup } from './export';
import { S3Config, testS3, uploadToS3 } from './providers/s3';
import { NextcloudConfig, testNextcloud, uploadToNextcloud } from './providers/nextcloud';

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
