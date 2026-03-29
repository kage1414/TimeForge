import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('user_settings', (t) => {
    t.string('smtp_host');
    t.integer('smtp_port');
    t.string('smtp_user');
    t.string('smtp_pass');
    t.boolean('smtp_secure').defaultTo(true);
    t.string('smtp_from_email');
    t.string('smtp_from_name');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('user_settings', (t) => {
    t.dropColumn('smtp_host');
    t.dropColumn('smtp_port');
    t.dropColumn('smtp_user');
    t.dropColumn('smtp_pass');
    t.dropColumn('smtp_secure');
    t.dropColumn('smtp_from_email');
    t.dropColumn('smtp_from_name');
  });
}
