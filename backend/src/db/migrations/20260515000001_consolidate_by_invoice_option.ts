import type { Knex } from 'knex';

// Replace the global user_settings.consolidate_hours boolean and its
// per-invoice snapshot with a per-invoice `consolidated` boolean chosen
// at invoice creation. When true, hourly time entries get rolled up to
// a single line item per (project, rate) on the invoice.

// Disable the per-migration transaction: knex's SQLite dropColumn implementation
// recreates the table inside its own transaction and needs to toggle the
// foreign_keys pragma, which SQLite forbids inside a nested transaction.
export const config = { transaction: false };

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('invoices', (t) => {
    t.boolean('consolidated').notNullable().defaultTo(false);
  });

  await knex('invoices').where('consolidate_hours', true).update({ consolidated: true });

  await knex.schema.alterTable('invoices', (t) => {
    t.dropColumn('consolidate_hours');
  });
  await knex.schema.alterTable('user_settings', (t) => {
    t.dropColumn('consolidate_hours');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('user_settings', (t) => {
    t.boolean('consolidate_hours').notNullable().defaultTo(false);
  });
  await knex.schema.alterTable('invoices', (t) => {
    t.boolean('consolidate_hours').notNullable().defaultTo(false);
  });
  await knex('invoices').where('consolidated', true).update({ consolidate_hours: true });
  await knex.schema.alterTable('invoices', (t) => {
    t.dropColumn('consolidated');
  });
}
