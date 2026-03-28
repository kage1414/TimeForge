import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('clients', (table) => {
    table.string('company').after('name');
  });
  await knex.schema.alterTable('user_settings', (table) => {
    table.string('company').after('id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('clients', (table) => {
    table.dropColumn('company');
  });
  await knex.schema.alterTable('user_settings', (table) => {
    table.dropColumn('company');
  });
}
