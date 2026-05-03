import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex('time_entries').whereNotNull('flat_amount').update({ duration_minutes: 0 });
}

export async function down(_knex: Knex): Promise<void> {
  // No-op: original durations were not meaningful for flat entries.
}
