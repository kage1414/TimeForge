import path from 'path';
import os from 'os';
import fs from 'fs';

export const EXPORT_DIR =
  process.env.EXPORT_DIR || path.join(os.tmpdir(), 'timeforge', 'exports');

export function invoiceExportDir(userId: number, clientId: number): string {
  return path.join(EXPORT_DIR, String(userId), String(clientId));
}

export function invoicePdfPath(userId: number, clientId: number, invoiceId: number): string {
  return path.join(invoiceExportDir(userId, clientId), `invoice-${invoiceId}.pdf`);
}

export function invoiceCsvPath(userId: number, clientId: number, invoiceId: number): string {
  return path.join(invoiceExportDir(userId, clientId), `invoice-${invoiceId}.csv`);
}

export async function ensureDir(dir: string): Promise<void> {
  await fs.promises.mkdir(dir, { recursive: true });
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.promises.access(filePath);
    return true;
  } catch {
    return false;
  }
}
