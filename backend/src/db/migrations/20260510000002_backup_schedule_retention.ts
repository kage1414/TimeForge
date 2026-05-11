import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('backup_destinations', (t) => {
    // Scheduling: 'off' | 'daily' | 'every3days' | 'weekly' | 'monthly' | 'yearly' | 'custom'
    t.string('schedule_preset').notNullable().defaultTo('off');
    t.string('schedule_cron'); // only used when schedule_preset='custom'
    t.timestamp('next_run_at');
    // Retention: when set, backups older than retention_days are deleted on each retention tick.
    t.integer('retention_days');
    t.string('retention_cron'); // optional; defaults to daily when retention_days is set
    t.timestamp('retention_last_run_at');
    t.text('retention_last_error');
    t.timestamp('retention_next_run_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('backup_destinations', (t) => {
    t.dropColumn('schedule_preset');
    t.dropColumn('schedule_cron');
    t.dropColumn('next_run_at');
    t.dropColumn('retention_days');
    t.dropColumn('retention_cron');
    t.dropColumn('retention_last_run_at');
    t.dropColumn('retention_last_error');
    t.dropColumn('retention_next_run_at');
  });
}
