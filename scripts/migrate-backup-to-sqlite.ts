/**
 * CLI Skrip Migrasi: Cadangan JSON ke SQLite Database
 * Penggunaan:
 *   npx tsx scripts/migrate-backup-to-sqlite.ts <path-ke-backup.json>
 */

import * as fs from 'fs';
import * as path from 'path';
import { InMemorySqliteDriver } from '../src/lib/db/sqlite/connection';
import { migrateBackupJsonToSqlite } from '../src/lib/db/sqlite/migration';

async function main() {
	const args = process.argv.slice(2);
	if (args.length === 0) {
		console.error('Penggunaan: npx tsx scripts/migrate-backup-to-sqlite.ts <path-ke-backup.json>');
		process.exit(1);
	}

	const backupFilePath = path.resolve(process.cwd(), args[0]);
	if (!fs.existsSync(backupFilePath)) {
		console.error(`File tidak ditemukan: ${backupFilePath}`);
		process.exit(1);
	}

	console.log(`Membaca file cadangan dari: ${backupFilePath}`);
	const jsonContent = fs.readFileSync(backupFilePath, 'utf-8');

	console.log('Memulai migrasi data ke SQLite...');
	const driver = new InMemorySqliteDriver();

	try {
		const result = await migrateBackupJsonToSqlite(jsonContent, driver);
		console.log('Migrasi berhasil!');
		console.log(`- Dompet: ${result.counts.wallets}`);
		console.log(`- Kategori: ${result.counts.categories}`);
		console.log(`- Transaksi: ${result.counts.transactions}`);
		console.log(`- Anggaran: ${result.counts.budgets}`);
		console.log(`- Pengaturan: ${result.counts.settings}`);
	} catch (error) {
		console.error('Migrasi gagal:', error);
		process.exit(1);
	}
}

main().catch((err) => {
	console.error('Fatal error:', err);
	process.exit(1);
});
