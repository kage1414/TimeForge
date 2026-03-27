import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('user_settings', (table) => {
    table.integer('id').primary().defaultTo(1);
    table.string('name');
    table.string('email');
    table.text('address');
    table.string('phone');
    table.string('venmo');
    table.string('cashapp');
    table.string('paypal');
    table.string('zelle');
    table.timestamps(true, true);
  });

  await knex('user_settings').insert({ id: 1 });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('user_settings');
}
