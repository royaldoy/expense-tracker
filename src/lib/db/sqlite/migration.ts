import * as v from 'valibot';
import { calculateWalletBalances } from '../../domain/balance';
import type { Setting } from '../../domain/types';
import {
	BackupEnvelopeSchema,
	migrateBackupData,
	type BackupEnvelope
} from '../../services/backupService';
import { createSqliteDriver, type ISqliteDriver } from './connection';

export interface SqliteMigrationResult {
	success: boolean;
	counts: {
		wallets: number;
		categories: number;
		transactions: number;
		budgets: number;
		settings: number;
	};
}

/**
 * Memigrasikan data cadangan JSON ke dalam basis data SQLite secara atomik:
 * 1. Validasi struktur JSON dan skema Valibot di memori.
 * 2. Pre-kalkulasi saldo dompet via domain murni.
 * 3. Eksekusi batch INSERT atomik dalam transaksi SQLite tunggal.
 * 4. Rollback otomatis bila terjadi error integritas data.
 */
export async function migrateBackupJsonToSqlite(
	jsonString: string,
	driver: ISqliteDriver = createSqliteDriver()
): Promise<SqliteMigrationResult> {
	// 1. Parsing JSON di memori
	let parsedRaw: unknown;
	try {
		parsedRaw = JSON.parse(jsonString);
	} catch (error) {
		const msg = error instanceof Error ? error.message : String(error);
		throw new Error(`File cadangan rusak atau format JSON tidak valid: ${msg}`, { cause: error });
	}

	// 2. Jalankan pipeline migrasi versi jika file format lawas
	let migratedEnvelope: BackupEnvelope;
	try {
		migratedEnvelope = migrateBackupData(parsedRaw);
	} catch (error) {
		const msg = error instanceof Error ? error.message : String(error);
		throw new Error(`Gagal memproses data cadangan: ${msg}`, { cause: error });
	}

	// 3. Validasi skema ketat dengan Valibot v1.5 di memori
	const validationResult = v.safeParse(BackupEnvelopeSchema, migratedEnvelope);
	if (!validationResult.success) {
		const errorDetails = validationResult.issues
			.slice(0, 5)
			.map((issue) => {
				const path = issue.path?.map((p) => String(p.key)).join('.') || 'root';
				return `${path}: ${issue.message}`;
			})
			.join('; ');
		throw new Error(`Format data cadangan tidak sesuai skema sistem: ${errorDetails}`);
	}

	const validData = validationResult.output.data;

	// 4. Verifikasi integritas relasional (Referential Integrity Check)
	const walletIdSet = new Set(validData.wallets.map((w) => w.id));
	const activeTransactions = validData.transactions.filter((t) => t.deletedAt === null);

	for (const tx of activeTransactions) {
		if (!walletIdSet.has(tx.walletId)) {
			throw new Error(
				`Integritas data tidak terpenuhi: Transaksi ${tx.id} merujuk ke dompet yang tidak ditemukan (${tx.walletId})`
			);
		}
		if (tx.type === 'transfer' && tx.toWalletId && !walletIdSet.has(tx.toWalletId)) {
			throw new Error(
				`Integritas data tidak terpenuhi: Transfer ${tx.id} merujuk ke dompet tujuan yang tidak ditemukan (${tx.toWalletId})`
			);
		}
	}

	// 5. Pre-kalkulasi cache saldo dompet sebelum transaksi DB dimulai
	const calculatedBalances = calculateWalletBalances(validData.wallets, validData.transactions);
	const recalculatedWallets = validData.wallets.map((w) => ({
		...w,
		balance: calculatedBalances.get(w.id) ?? w.openingBalance
	}));

	const preparedSettings: Setting[] = (validData.settings ?? []).map((s, index) => ({
		id: s.id ?? `setting_${index}_${s.key}`,
		key: s.key,
		value: s.value,
		createdAt: s.createdAt ?? Date.now(),
		updatedAt: s.updatedAt ?? Date.now(),
		deletedAt: s.deletedAt ?? null
	}));

	// 6. Eksekusi penulisan atomik SQLite dalam satu transaksi
	await driver.runTransaction(async () => {
		// Bersihkan tabel
		await driver.execute('DELETE FROM transactions;');
		await driver.execute('DELETE FROM budgets;');
		await driver.execute('DELETE FROM categories;');
		await driver.execute('DELETE FROM wallets;');
		await driver.execute('DELETE FROM settings;');

		// Masukkan Settings
		for (const setting of preparedSettings) {
			await driver.execute(
				`INSERT INTO settings (id, key, value, createdAt, updatedAt, deletedAt)
				 VALUES (?, ?, ?, ?, ?, ?);`,
				[
					setting.id,
					setting.key,
					JSON.stringify(setting.value),
					setting.createdAt,
					setting.updatedAt,
					setting.deletedAt
				]
			);
		}

		// Masukkan Wallets
		for (const wallet of recalculatedWallets) {
			await driver.execute(
				`INSERT INTO wallets (id, name, type, openingBalance, balance, color, icon, includeInTotal, archivedAt, createdAt, updatedAt, deletedAt)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
				[
					wallet.id,
					wallet.name,
					wallet.type,
					wallet.openingBalance,
					wallet.balance,
					wallet.color,
					wallet.icon,
					wallet.includeInTotal ? 1 : 0,
					wallet.archivedAt,
					wallet.createdAt,
					wallet.updatedAt,
					wallet.deletedAt
				]
			);
		}

		// Masukkan Categories (urutkan parent dulu, lalu child)
		const sortedCategories = [...validData.categories].sort((a, b) => {
			if (a.parentId === null && b.parentId !== null) return -1;
			if (a.parentId !== null && b.parentId === null) return 1;
			return a.order - b.order;
		});

		for (const cat of sortedCategories) {
			await driver.execute(
				`INSERT INTO categories (id, name, kind, parentId, icon, color, display_order, createdAt, updatedAt, deletedAt)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
				[
					cat.id,
					cat.name,
					cat.kind,
					cat.parentId,
					cat.icon,
					cat.color,
					cat.order,
					cat.createdAt,
					cat.updatedAt,
					cat.deletedAt
				]
			);
		}

		// Masukkan Budgets
		for (const budget of validData.budgets ?? []) {
			await driver.execute(
				`INSERT INTO budgets (id, categoryId, period, limit_amount, alertAt, createdAt, updatedAt, deletedAt)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
				[
					budget.id,
					budget.categoryId,
					budget.period,
					budget.limit,
					budget.alertAt,
					budget.createdAt,
					budget.updatedAt,
					budget.deletedAt
				]
			);
		}

		// Masukkan Transactions
		for (const tx of validData.transactions) {
			await driver.execute(
				`INSERT INTO transactions (id, type, amount, walletId, toWalletId, fee, categoryId, date, note, tagIds, attachmentId, recurringId, createdAt, updatedAt, deletedAt)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
				[
					tx.id,
					tx.type,
					tx.amount,
					tx.walletId,
					tx.toWalletId,
					tx.fee,
					tx.categoryId,
					tx.date,
					tx.note,
					JSON.stringify(tx.tagIds ?? []),
					tx.attachmentId,
					tx.recurringId,
					tx.createdAt,
					tx.updatedAt,
					tx.deletedAt
				]
			);
		}
	});

	return {
		success: true,
		counts: {
			wallets: recalculatedWallets.length,
			categories: validData.categories.length,
			transactions: validData.transactions.length,
			budgets: validData.budgets?.length ?? 0,
			settings: preparedSettings.length
		}
	};
}
