import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('backup_destinations', (t) => {
    t.increments('id').primary();
    t.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('name').notNullable();
    t.string('provider').notNullable(); // 's3' | 'nextcloud'
    t.text('config_encrypted').notNullable();
    t.datetime('last_run_at');
    t.string('last_run_status'); // 'ok' | 'error'
    t.text('last_run_error');
    t.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('backup_destinations');
}
