import type { Knex } from 'knex';

// Defensive convergence migration. The previous migration in this batch
// shifted from a `consolidate_by` text column to a `consolidated` boolean,
// but if an environment applied the intermediate version it will be left
// with `consolidate_by` and no `consolidated`. Reconcile both states here.

export const config = { transaction: false };

export async function up(knex: Knex): Promise<void> {
  const hasConsolidated = await knex.schema.hasColumn('invoices', 'consolidated');
  if (!hasConsolidated) {
    await knex.schema.alterTable('invoices', (t) => {
      t.boolean('consolidated').notNullable().defaultTo(false);
    });
  }

  const hasConsolidateBy = await knex.schema.hasColumn('invoices', 'consolidate_by');
  if (hasConsolidateBy) {
    await knex('invoices').whereNot('consolidate_by', 'none').update({ consolidated: true });
    await knex.schema.alterTable('invoices', (t) => {
      t.dropColumn('consolidate_by');
    });
  }

  const hasConsolidateHoursOnInvoices = await knex.schema.hasColumn('invoices', 'consolidate_hours');
  if (hasConsolidateHoursOnInvoices) {
    await knex('invoices').where('consolidate_hours', true).update({ consolidated: true });
    await knex.schema.alterTable('invoices', (t) => {
      t.dropColumn('consolidate_hours');
    });
  }

  const hasConsolidateHoursOnUserSettings = await knex.schema.hasColumn(
    'user_settings',
    'consolidate_hours',
  );
  if (hasConsolidateHoursOnUserSettings) {
    await knex.schema.alterTable('user_settings', (t) => {
      t.dropColumn('consolidate_hours');
    });
  }
}

export async function down(_knex: Knex): Promise<void> {
  // Convergence migration only; no exact inverse since the source state
  // could have been any of several historical shapes.
}
