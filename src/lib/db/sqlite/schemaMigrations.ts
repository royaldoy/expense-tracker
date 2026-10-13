import type { ISqliteDriver } from './connection';
import {
	SQLITE_DDL_BUDGETS,
	SQLITE_DDL_CATEGORIES,
	SQLITE_DDL_NOTIFICATIONS,
	SQLITE_DDL_RECURRING_RULES,
	SQLITE_DDL_SETTINGS,
	SQLITE_DDL_TRANSACTIONS,
	SQLITE_DDL_WALLETS
} from './schema';

export const SQLITE_LATEST_VERSION = 4;

export interface SqliteMigration {
	version: number;
	name: string;
	up: (driver: ISqliteDriver) => Promise<void>;
}

export const SQLITE_MIGRATIONS: SqliteMigration[] = [
	{
		version: 1,
		name: 'init_core_tables',
		up: async (driver: ISqliteDriver) => {
			await driver.execute(SQLITE_DDL_WALLETS);
			await driver.execute(SQLITE_DDL_CATEGORIES);
			await driver.execute(SQLITE_DDL_TRANSACTIONS);
			await driver.execute(SQLITE_DDL_SETTINGS);
		}
	},
	{
		version: 2,
		name: 'add_budgets_table',
		up: async (driver: ISqliteDriver) => {
			await driver.execute(SQLITE_DDL_BUDGETS);
		}
	},
	{
		version: 3,
		name: 'add_recurring_rules_table',
		up: async (driver: ISqliteDriver) => {
			await driver.execute(SQLITE_DDL_RECURRING_RULES);
			await driver.execute(
				'CREATE INDEX IF NOT EXISTS idx_transactions_recurringId ON transactions(recurringId);'
			);
		}
	},
	{
		version: 4,
		name: 'add_notifications_table',
		up: async (driver: ISqliteDriver) => {
			await driver.execute(SQLITE_DDL_NOTIFICATIONS);
		}
	}
];

/**
 * Menjalankan migrasi DDL berversi SQLite secara atomik.
 * Menyimpan riwayat versi di tabel `schema_version`.
 */
export async function runSqliteMigrations(driver: ISqliteDriver): Promise<number> {
	await driver.execute(`
		CREATE TABLE IF NOT EXISTS schema_version (
			version INTEGER PRIMARY KEY,
			applied_at INTEGER NOT NULL
		);
	`);

	const rows = await driver.query<{ version: number }>(
		'SELECT version FROM schema_version ORDER BY version DESC'
	);
	const currentVersion = rows.length > 0 ? Number(rows[0].version) : 0;

	for (const migration of SQLITE_MIGRATIONS) {
		if (migration.version > currentVersion) {
			await driver.runTransaction(async (tx) => {
				await migration.up(tx);
				await tx.execute('INSERT INTO schema_version (version, applied_at) VALUES (?, ?);', [
					migration.version,
					Date.now()
				]);
			});
		}
	}

	return SQLITE_LATEST_VERSION;
}
