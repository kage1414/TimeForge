import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('user_settings', (t) => {
    t.boolean('consolidate_hours').notNullable().defaultTo(false);
  });
  await knex.schema.alterTable('invoices', (t) => {
    t.boolean('consolidate_hours').notNullable().defaultTo(false);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('user_settings', (t) => {
    t.dropColumn('consolidate_hours');
  });
  await knex.schema.alterTable('invoices', (t) => {
    t.dropColumn('consolidate_hours');
  });
}
