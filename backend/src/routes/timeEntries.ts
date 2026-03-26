import { Router, Request, Response } from 'express';
import db from '../db';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  let query = db('time_entries')
    .join('projects', 'time_entries.project_id', 'projects.id')
    .join('clients', 'projects.client_id', 'clients.id')
    .select(
      'time_entries.*',
      'projects.name as project_name',
      'projects.default_rate',
      'clients.name as client_name',
      'clients.id as client_id'
    );

  if (req.query.project_id) {
    query = query.where('time_entries.project_id', req.query.project_id as string);
  }
  if (req.query.unbilled === 'true') {
    query = query.whereNull('time_entries.invoice_id').where('time_entries.is_billable', true);
  }
  if (req.query.billed === 'true') {
    query = query.whereNotNull('time_entries.invoice_id');
  }
  if (req.query.client_id) {
    query = query.where('clients.id', req.query.client_id as string);
  }

  const entries = await query.orderBy('time_entries.start_time', 'desc');
  res.json(entries);
});

router.get('/:id', async (req: Request, res: Response) => {
  const entry = await db('time_entries')
    .join('projects', 'time_entries.project_id', 'projects.id')
    .select('time_entries.*', 'projects.name as project_name', 'projects.default_rate')
    .where('time_entries.id', req.params.id)
    .first();
  if (!entry) return res.status(404).json({ error: 'Time entry not found' });
  res.json(entry);
});

router.post('/', async (req: Request, res: Response) => {
  const { project_id, description, start_time, end_time, duration_minutes, is_billable, rate_override } = req.body;

  let duration = duration_minutes;
  if (!duration && start_time && end_time) {
    duration = Math.round((new Date(end_time).getTime() - new Date(start_time).getTime()) / 60000);
  }

  const [entry] = await db('time_entries')
    .insert({ project_id, description, start_time: start_time || new Date(), end_time, duration_minutes: duration, is_billable: is_billable ?? true, rate_override })
    .returning('*');
  res.status(201).json(entry);
});

router.put('/:id', async (req: Request, res: Response) => {
  const { project_id, description, start_time, end_time, duration_minutes, is_billable, rate_override } = req.body;

  let duration = duration_minutes;
  if (!duration && start_time && end_time) {
    duration = Math.round((new Date(end_time).getTime() - new Date(start_time).getTime()) / 60000);
  }

  const [entry] = await db('time_entries')
    .where('id', req.params.id)
    .update({
      project_id, description, start_time, end_time,
      duration_minutes: duration, is_billable, rate_override,
      updated_at: db.fn.now(),
    })
    .returning('*');
  if (!entry) return res.status(404).json({ error: 'Time entry not found' });
  res.json(entry);
});

router.delete('/:id', async (req: Request, res: Response) => {
  await db('time_entries').where('id', req.params.id).del();
  res.status(204).send();
});

// Timer: start a new running entry
router.post('/start', async (req: Request, res: Response) => {
  const { project_id, description } = req.body;
  const [entry] = await db('time_entries')
    .insert({ project_id, description, start_time: new Date(), is_billable: true })
    .returning('*');
  res.status(201).json(entry);
});

// Timer: stop a running entry
router.post('/:id/stop', async (req: Request, res: Response) => {
  const entry = await db('time_entries').where('id', req.params.id).first();
  if (!entry) return res.status(404).json({ error: 'Time entry not found' });
  if (entry.end_time) return res.status(400).json({ error: 'Timer already stopped' });

  const end_time = new Date();
  const duration_minutes = Math.round((end_time.getTime() - new Date(entry.start_time).getTime()) / 60000);

  const [updated] = await db('time_entries')
    .where('id', req.params.id)
    .update({ end_time, duration_minutes, updated_at: db.fn.now() })
    .returning('*');
  res.json(updated);
});

// Restart: resume a completed timer by clearing end_time
router.post('/:id/restart', async (req: Request, res: Response) => {
  const entry = await db('time_entries').where('id', req.params.id).first();
  if (!entry) return res.status(404).json({ error: 'Time entry not found' });
  if (!entry.end_time) return res.status(400).json({ error: 'Timer is already running' });

  // Check no other timer is currently running
  const runningTimer = await db('time_entries').whereNull('end_time').first();
  if (runningTimer) {
    return res.status(400).json({ error: 'Another timer is already running. Stop it first.' });
  }

  const [updated] = await db('time_entries')
    .where('id', req.params.id)
    .update({ end_time: null, duration_minutes: null, updated_at: db.fn.now() })
    .returning('*');
  res.json(updated);
});

// Unbill: reset a billed time entry back to unbilled
router.post('/:id/unbill', async (req: Request, res: Response) => {
  const entry = await db('time_entries').where('id', req.params.id).first();
  if (!entry) return res.status(404).json({ error: 'Time entry not found' });
  if (!entry.invoice_id) return res.status(400).json({ error: 'Time entry is not billed' });

  // Check that the invoice is still a draft
  const invoice = await db('invoices').where('id', entry.invoice_id).first();
  if (invoice && invoice.status !== 'draft' && invoice.status !== 'cancelled') {
    return res.status(400).json({ error: 'Cannot unbill: invoice must be draft or cancelled' });
  }

  // Remove the associated line item
  await db('invoice_line_items')
    .where({ invoice_id: entry.invoice_id, time_entry_id: entry.id })
    .del();

  // Clear the invoice_id on the time entry
  const [updated] = await db('time_entries')
    .where('id', req.params.id)
    .update({ invoice_id: null, updated_at: db.fn.now() })
    .returning('*');

  // Recalculate invoice totals
  if (invoice) {
    const lineItems = await db('invoice_line_items').where('invoice_id', invoice.id);
    const subtotal = lineItems.reduce((sum: number, li: any) => sum + Number(li.amount), 0);
    const tax_amount = subtotal * (Number(invoice.tax_rate) / 100);
    const total = Math.max(0, subtotal + tax_amount - Number(invoice.credits_applied));

    await db('invoices').where('id', invoice.id).update({
      subtotal: parseFloat(subtotal.toFixed(2)),
      tax_amount: parseFloat(tax_amount.toFixed(2)),
      total: parseFloat(total.toFixed(2)),
      updated_at: db.fn.now(),
    });
  }

  res.json(updated);
});

// Credit: create a credit for a billed time entry's amount
router.post('/:id/credit', async (req: Request, res: Response) => {
  const entry = await db('time_entries')
    .join('projects', 'time_entries.project_id', 'projects.id')
    .join('clients', 'projects.client_id', 'clients.id')
    .select('time_entries.*', 'projects.default_rate', 'projects.name as project_name', 'clients.id as client_id')
    .where('time_entries.id', req.params.id)
    .first();
  if (!entry) return res.status(404).json({ error: 'Time entry not found' });
  if (!entry.invoice_id) return res.status(400).json({ error: 'Time entry is not billed' });

  const rate = entry.rate_override ?? entry.default_rate;
  const hours = (entry.duration_minutes || 0) / 60;
  const amount = parseFloat((hours * Number(rate)).toFixed(2));

  const [credit] = await db('credits')
    .insert({
      client_id: entry.client_id,
      amount,
      remaining_amount: amount,
      description: `Credit for: ${entry.project_name} - ${entry.description || 'Time entry'}`,
      source_invoice_id: entry.invoice_id,
    })
    .returning('*');

  res.status(201).json(credit);
});

export default router;
