import puppeteer, { Browser } from 'puppeteer';
import db from '../db';
import { buildInvoiceCsv, buildInvoiceHtml } from './html';
import { invoiceCsvPath, invoicePdfPath } from './paths';
import {
  deleteExportFile,
  exportExists,
  isS3Configured,
  readExport,
  writeExport,
} from './storage';

let browserPromise: Promise<Browser> | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = puppeteer
      .launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--font-render-hinting=none',
        ],
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      })
      .catch((err) => {
        browserPromise = null;
        throw err;
      });
  }
  return browserPromise;
}

const inFlight = new Map<number, Promise<void>>();

export function generateExportsAsync(invoiceId: number): Promise<void> {
  const existing = inFlight.get(invoiceId);
  if (existing) return existing;
  const p = (async () => {
    try {
      await runGeneration(invoiceId);
    } finally {
      inFlight.delete(invoiceId);
    }
  })();
  inFlight.set(invoiceId, p);
  p.catch((err) => console.error(`[exports] invoice ${invoiceId} failed:`, err));
  return p;
}

async function runGeneration(invoiceId: number): Promise<void> {
  const invoice = await db('invoices')
    .join('clients', 'invoices.client_id', 'clients.id')
    .select(
      'invoices.*',
      db.raw('COALESCE(clients.name, clients.company) as client_name'),
      'clients.company as client_company',
      'clients.email as client_email',
      'clients.address1 as client_address1',
      'clients.address2 as client_address2',
      'clients.city as client_city',
      'clients.state as client_state',
      'clients.zip as client_zip',
    )
    .where('invoices.id', invoiceId)
    .first();
  if (!invoice) return;

  await db('invoices').where('id', invoiceId).update({ export_status: 'generating', export_error: null });

  try {
    const lineItems = await db('invoice_line_items').where('invoice_id', invoiceId).orderBy('id');
    const settings =
      (await db('user_settings').where('user_id', invoice.user_id).first()) || {};

    const html = buildInvoiceHtml(invoice, lineItems, settings);
    const csv = buildInvoiceCsv(invoice, lineItems);

    await writeExport(invoice.user_id, invoice.client_id, invoiceId, 'csv', Buffer.from(csv, 'utf8'));

    const browser = await getBrowser();
    const page = await browser.newPage();
    try {
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdfBuf = Buffer.from(
        await page.pdf({
          format: 'a4',
          printBackground: true,
          margin: { top: '12mm', right: '12mm', bottom: '12mm', left: '12mm' },
        }),
      );
      await writeExport(invoice.user_id, invoice.client_id, invoiceId, 'pdf', pdfBuf);
    } finally {
      await page.close().catch(() => {});
    }

    await db('invoices').where('id', invoiceId).update({
      export_status: 'ready',
      export_error: null,
      export_generated_at: new Date().toISOString(),
    });
  } catch (err: any) {
    const message = err?.message || String(err);
    await db('invoices').where('id', invoiceId).update({
      export_status: 'failed',
      export_error: message,
    });
    throw err;
  }
}

export async function deleteInvoiceExports(
  userId: number,
  clientId: number,
  invoiceId: number,
): Promise<void> {
  await Promise.all([
    deleteExportFile(userId, clientId, invoiceId, 'pdf'),
    deleteExportFile(userId, clientId, invoiceId, 'csv'),
  ]);
}

export async function ensureExportsReady(invoiceId: number): Promise<void> {
  const invoice = await db('invoices').where('id', invoiceId).first();
  if (!invoice) return;
  const havePdf = await exportExists(invoice.user_id, invoice.client_id, invoiceId, 'pdf');
  const haveCsv = await exportExists(invoice.user_id, invoice.client_id, invoiceId, 'csv');
  if (invoice.export_status === 'ready' && havePdf && haveCsv) return;
  await generateExportsAsync(invoiceId);
}

export async function readExportFile(
  userId: number,
  clientId: number,
  invoiceId: number,
  kind: 'pdf' | 'csv',
): Promise<Buffer | null> {
  return readExport(userId, clientId, invoiceId, kind);
}

export { isS3Configured };

export async function resetStaleGeneratingStatus(): Promise<void> {
  // After a server restart, any 'generating' rows are stale.
  await db('invoices').where('export_status', 'generating').update({ export_status: 'pending' });
}

export async function backfillPendingExports(): Promise<void> {
  const rows = await db('invoices').where('export_status', 'pending').select('id');
  for (const r of rows) {
    generateExportsAsync(r.id);
  }
}

export { invoicePdfPath, invoiceCsvPath };
