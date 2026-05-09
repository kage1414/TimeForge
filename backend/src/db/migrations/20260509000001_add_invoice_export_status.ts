import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('invoices', (t) => {
    t.string('export_status').notNullable().defaultTo('pending');
    t.text('export_error');
    t.timestamp('export_generated_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('invoices', (t) => {
    t.dropColumn('export_status');
    t.dropColumn('export_error');
    t.dropColumn('export_generated_at');
  });
}
