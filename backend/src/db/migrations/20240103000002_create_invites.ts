import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('invites', (table) => {
    table.increments('id').primary();
    table.string('token').unique().notNullable();
    table.string('email');
    table.integer('created_by').unsigned().notNullable().references('id').inTable('users');
    table.integer('used_by').unsigned().references('id').inTable('users');
    table.timestamp('used_at');
    table.timestamp('expires_at').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('invites');
}
