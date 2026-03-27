import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('user_settings', (table) => {
    table.renameColumn('name', 'first_name');
    table.string('last_name').after('first_name');
    table.renameColumn('address', 'address1');
    table.string('address2').after('address1');
    table.string('city').after('address2');
    table.string('state').after('city');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('user_settings', (table) => {
    table.dropColumn('last_name');
    table.renameColumn('first_name', 'name');
    table.dropColumn('address2');
    table.dropColumn('city');
    table.dropColumn('state');
    table.renameColumn('address1', 'address');
  });
}
