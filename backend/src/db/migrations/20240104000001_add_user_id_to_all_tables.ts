import { Knex } from 'knex';

const TABLES = ['clients', 'projects', 'time_entries', 'invoices', 'credits'];

export async function up(knex: Knex): Promise<void> {
  const user = await knex('users').where('email', 'kylejohnson92294@gmail.com').first();
  const userId = user?.id;

  // Add user_id to main tables
  for (const table of TABLES) {
    await knex.schema.alterTable(table, (t) => {
      t.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
    });
    if (userId) {
      await knex(table).update({ user_id: userId });
    }
    await knex.schema.alterTable(table, (t) => {
      t.integer('user_id').notNullable().alter();
    });
  }

  // Add user_id to user_settings
  await knex.schema.alterTable('user_settings', (t) => {
    t.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE').unique();
  });
  if (userId) {
    await knex('user_settings').update({ user_id: userId });
  }
  await knex.schema.alterTable('user_settings', (t) => {
    t.integer('user_id').notNullable().alter();
  });

  // Replace invoice_number unique constraint with composite (user_id, invoice_number)
  await knex.schema.alterTable('invoices', (t) => {
    t.dropUnique(['invoice_number']);
    t.unique(['user_id', 'invoice_number']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('invoices', (t) => {
    t.dropUnique(['user_id', 'invoice_number']);
    t.unique(['invoice_number']);
  });

  for (const table of [...TABLES, 'user_settings']) {
    await knex.schema.alterTable(table, (t) => {
      t.dropColumn('user_id');
    });
  }
}
