import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('clients', (table) => {
    table.renameColumn('address', 'address1');
    table.string('address2').after('address1');
    table.string('city').after('address2');
    table.string('state').after('city');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('clients', (table) => {
    table.dropColumn('address2');
    table.dropColumn('city');
    table.dropColumn('state');
    table.renameColumn('address1', 'address');
  });
}
