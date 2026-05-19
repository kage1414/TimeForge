import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('invoices', (t) => {
    t.string('check_number').nullable();
    t.date('check_date').nullable();
    t.string('check_issuer').nullable();
    t.string('check_receiver').nullable();
    t.decimal('check_amount', 10, 2).nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('invoices', (t) => {
    t.dropColumn('check_number');
    t.dropColumn('check_date');
    t.dropColumn('check_issuer');
    t.dropColumn('check_receiver');
    t.dropColumn('check_amount');
  });
}
