import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('user_settings', (table) => {
    table.integer('default_due_days').defaultTo(30);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('user_settings', (table) => {
    table.dropColumn('default_due_days');
  });
}
