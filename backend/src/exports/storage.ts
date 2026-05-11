import fs from 'fs';
import path from 'path';
import {
  S3Config,
  deleteFromS3,
  downloadFromS3,
  s3KeyFor,
  s3ObjectExists,
  uploadToS3,
} from '../backup/providers/s3';
import { ensureDir, fileExists, invoiceCsvPath, invoicePdfPath } from './paths';

// Optional S3 storage for invoice exports. If `INVOICE_S3_BUCKET` is set in the
// environment we round-trip PDFs/CSVs through S3 (multi-tenant: every user's
// files live in the same bucket under prefix/<user_id>/<client_id>/...).
// If not set, we fall back to the existing on-disk EXPORT_DIR layout.

function s3ConfigFromEnv(): S3Config | null {
  const bucket = process.env.INVOICE_S3_BUCKET;
  if (!bucket) return null;
  const region = process.env.INVOICE_S3_REGION;
  const accessKey = process.env.INVOICE_S3_ACCESS_KEY_ID;
  const secret = process.env.INVOICE_S3_SECRET_ACCESS_KEY;
  if (!region || !accessKey || !secret) {
    throw new Error(
      'INVOICE_S3_BUCKET is set but INVOICE_S3_REGION / INVOICE_S3_ACCESS_KEY_ID / INVOICE_S3_SECRET_ACCESS_KEY are missing',
    );
  }
  return {
    endpoint: process.env.INVOICE_S3_ENDPOINT || undefined,
    region,
    bucket,
    access_key_id: accessKey,
    secret_access_key: secret,
    prefix: process.env.INVOICE_S3_PREFIX || undefined,
    force_path_style: process.env.INVOICE_S3_FORCE_PATH_STYLE === 'true',
  };
}

export type ExportKind = 'pdf' | 'csv';

const CONTENT_TYPES: Record<ExportKind, string> = {
  pdf: 'application/pdf',
  csv: 'text/csv',
};

function diskPath(userId: number, clientId: number, invoiceId: number, kind: ExportKind): string {
  return kind === 'pdf'
    ? invoicePdfPath(userId, clientId, invoiceId)
    : invoiceCsvPath(userId, clientId, invoiceId);
}

function s3Filename(userId: number, clientId: number, invoiceId: number, kind: ExportKind): string {
  // The s3 provider's `prefix` already prefixes the bucket layout; this is the
  // logical key path *under* that prefix.
  return `${userId}/${clientId}/invoice-${invoiceId}.${kind}`;
}

export async function writeExport(
  userId: number,
  clientId: number,
  invoiceId: number,
  kind: ExportKind,
  body: Buffer,
): Promise<void> {
  const cfg = s3ConfigFromEnv();
  if (cfg) {
    const key = s3KeyFor(cfg, s3Filename(userId, clientId, invoiceId, kind));
    await uploadToS3(cfg, key, body, CONTENT_TYPES[kind]);
    return;
  }
  const file = diskPath(userId, clientId, invoiceId, kind);
  await ensureDir(path.dirname(file));
  await fs.promises.writeFile(file, body);
}

export async function readExport(
  userId: number,
  clientId: number,
  invoiceId: number,
  kind: ExportKind,
): Promise<Buffer | null> {
  const cfg = s3ConfigFromEnv();
  if (cfg) {
    const key = s3KeyFor(cfg, s3Filename(userId, clientId, invoiceId, kind));
    try {
      return await downloadFromS3(cfg, key);
    } catch (err: any) {
      if (/\b404\b/.test(err?.message || '')) return null;
      throw err;
    }
  }
  const file = diskPath(userId, clientId, invoiceId, kind);
  if (!(await fileExists(file))) return null;
  return fs.promises.readFile(file);
}

export async function exportExists(
  userId: number,
  clientId: number,
  invoiceId: number,
  kind: ExportKind,
): Promise<boolean> {
  const cfg = s3ConfigFromEnv();
  if (cfg) {
    const key = s3KeyFor(cfg, s3Filename(userId, clientId, invoiceId, kind));
    return s3ObjectExists(cfg, key);
  }
  return fileExists(diskPath(userId, clientId, invoiceId, kind));
}

export async function deleteExportFile(
  userId: number,
  clientId: number,
  invoiceId: number,
  kind: ExportKind,
): Promise<void> {
  const cfg = s3ConfigFromEnv();
  if (cfg) {
    const key = s3KeyFor(cfg, s3Filename(userId, clientId, invoiceId, kind));
    await deleteFromS3(cfg, key);
    return;
  }
  const file = diskPath(userId, clientId, invoiceId, kind);
  try {
    await fs.promises.unlink(file);
  } catch {
    /* ignore missing */
  }
}

export function isS3Configured(): boolean {
  return !!process.env.INVOICE_S3_BUCKET;
}
