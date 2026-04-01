import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('user_settings', (t) => {
    t.text('default_email_template');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('user_settings', (t) => {
    t.dropColumn('default_email_template');
  });
}
