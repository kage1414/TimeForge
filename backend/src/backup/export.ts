import { gzipSync } from 'zlib';
import db from '../db';

const SCHEMA_VERSION = 1;

export interface UserBackup {
  schema_version: number;
  exported_at: string;
  user: {
    id: number;
    email: string;
    name: string | null;
    role: string;
    created_at: string | null;
  };
  user_settings: Record<string, unknown> | null;
  clients: Record<string, unknown>[];
  projects: Record<string, unknown>[];
  invoices: Record<string, unknown>[];
  invoice_line_items: Record<string, unknown>[];
  time_entries: Record<string, unknown>[];
  credits: Record<string, unknown>[];
}

export async function buildUserBackup(userId: number): Promise<UserBackup> {
  const user = await db('users').where('id', userId).first();
  if (!user) throw new Error('User not found');

  const [user_settings, clients, projects, invoices, time_entries, credits] = await Promise.all([
    db('user_settings').where('user_id', userId).first(),
    db('clients').where('user_id', userId).orderBy('id'),
    db('projects').where('user_id', userId).orderBy('id'),
    db('invoices').where('user_id', userId).orderBy('id'),
    db('time_entries').where('user_id', userId).orderBy('id'),
    db('credits').where('user_id', userId).orderBy('id'),
  ]);

  const invoiceIds = invoices.map((r) => r.id);
  const invoice_line_items = invoiceIds.length
    ? await db('invoice_line_items').whereIn('invoice_id', invoiceIds).orderBy('id')
    : [];

  return {
    schema_version: SCHEMA_VERSION,
    exported_at: new Date().toISOString(),
    user: {
      id: user.id,
      email: user.email,
      name: user.name ?? null,
      role: user.role,
      created_at: user.created_at ? new Date(user.created_at).toISOString() : null,
    },
    user_settings: user_settings ?? null,
    clients,
    projects,
    invoices,
    invoice_line_items,
    time_entries,
    credits,
  };
}

export function gzipBackup(backup: UserBackup): Buffer {
  return gzipSync(Buffer.from(JSON.stringify(backup), 'utf8'));
}

export function backupFilename(userId: number, email: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const safeEmail = email.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `timeforge-backup-${safeEmail}-${userId}-${timestamp}.json.gz`;
}
