import crypto from 'crypto';

const ENV_VAR = 'BACKUP_ENCRYPTION_KEY';

function getKey(): Buffer {
  const hex = process.env[ENV_VAR];
  if (!hex) {
    throw new Error(
      `${ENV_VAR} is not set. Generate one with: openssl rand -hex 32 ` +
      `and add it to the backend env. Backups are disabled until this is configured.`
    );
  }
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error(`${ENV_VAR} must be a 64-character hex string (32 bytes).`);
  }
  return Buffer.from(hex, 'hex');
}

export function isBackupEncryptionConfigured(): boolean {
  const hex = process.env[ENV_VAR];
  return !!hex && /^[0-9a-fA-F]{64}$/.test(hex);
}

export function encryptJson(value: unknown): string {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const plaintext = Buffer.from(JSON.stringify(value), 'utf8');
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Storage format: base64(iv || tag || ciphertext)
  return Buffer.concat([iv, tag, ciphertext]).toString('base64');
}

export function decryptJson<T = unknown>(encoded: string): T {
  const key = getKey();
  const buf = Buffer.from(encoded, 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ciphertext = buf.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return JSON.parse(plaintext.toString('utf8')) as T;
}
