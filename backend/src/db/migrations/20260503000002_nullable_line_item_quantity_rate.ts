import { Knex } from 'knex';

// SQLite implements `.alter()` by recreating the table, which requires
// toggling `PRAGMA foreign_keys` — disallowed inside a transaction.
export const config = { transaction: false };

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('invoice_line_items', (t) => {
    t.decimal('quantity', 10, 2).nullable().alter();
    t.decimal('rate', 10, 2).nullable().alter();
  });
  // Blank out quantity/rate on line items that came from flat-amount time entries.
  const flatLineItems = await knex('invoice_line_items')
    .join('time_entries', 'invoice_line_items.time_entry_id', 'time_entries.id')
    .whereNotNull('time_entries.flat_amount')
    .select('invoice_line_items.id');
  if (flatLineItems.length) {
    await knex('invoice_line_items')
      .whereIn('id', flatLineItems.map((r) => r.id))
      .update({ quantity: null, rate: null });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex('invoice_line_items').whereNull('quantity').update({ quantity: 0 });
  await knex('invoice_line_items').whereNull('rate').update({ rate: 0 });
  await knex.schema.alterTable('invoice_line_items', (t) => {
    t.decimal('quantity', 10, 2).notNullable().alter();
    t.decimal('rate', 10, 2).notNullable().alter();
  });
}
