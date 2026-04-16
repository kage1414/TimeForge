import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('user_settings', (t) => {
    t.integer('resume_window_minutes').notNullable().defaultTo(60);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('user_settings', (t) => {
    t.dropColumn('resume_window_minutes');
  });
}
