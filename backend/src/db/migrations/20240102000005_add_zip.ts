import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('clients', (table) => {
    table.string('zip').after('state');
  });
  await knex.schema.alterTable('user_settings', (table) => {
    table.string('zip').after('state');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('clients', (table) => {
    table.dropColumn('zip');
  });
  await knex.schema.alterTable('user_settings', (table) => {
    table.dropColumn('zip');
  });
}
