/**
 * BackupService
 * Layanan cadangan dan pemulihan data lokal Money Tracker:
 * - Ekspor JSON berversi dengan envelope metadata (meta + data)
 * - Pemulihan atomik (ACID) dengan validasi Valibot di memori dan migrasi otomatis
 * - Penolakan file rusak/tidak valid tanpa merusak atau menimpa data aktif
 * - Prekalkulasi saldo dompet via domain/balance sebelum penulisan database
 * - Ekspor CSV transaksi sesuai spesifikasi RFC 4180 dengan UTF-8 BOM untuk kompatibilitas Excel
 * - Reset total seluruh data lokal
 */

import * as v from 'valibot';
import { db } from '../db/schema';
import { calculateWalletBalances } from '../domain/balance';
import type {
	Budget,
	Category,
	Notification,
	RecurringRule,
	Setting,
	Transaction,
	Wallet
} from '../domain/types';
import { categoryService } from './categoryService';

export const CURRENT_BACKUP_VERSION = 1;
export const APP_NAME = 'Money Tracker';
export const APP_VERSION = '0.0.1';

export interface BackupMeta {
	version: number;
	appName: string;
	appVersion: string;
	exportedAt: string;
}

export interface BackupData {
	wallets: Wallet[];
	categories: Category[];
	transactions: Transaction[];
	budgets: Budget[];
	settings: Setting[];
	recurringRules?: RecurringRule[];
	notifications?: Notification[];
}

export interface BackupEnvelope {
	meta: BackupMeta;
	data: BackupData;
}

export interface RestoreResult {
	success: boolean;
	meta: BackupMeta;
	counts: {
		wallets: number;
		categories: number;
		transactions: number;
		budgets: number;
		settings: number;
		recurringRules?: number;
		notifications?: number;
	};
}

// ==========================================
// Skema Validasi Valibot di Batas Memori
// ==========================================

export const BackupMetaSchema = v.object({
	version: v.pipe(
		v.number('Versi harus berupa angka'),
		v.integer(),
		v.minValue(1, 'Versi minimal 1')
	),
	appName: v.string('Nama aplikasi wajib diisi'),
	appVersion: v.string('Versi aplikasi wajib diisi'),
	exportedAt: v.string('Waktu ekspor wajib diisi')
});

export const WalletBackupSchema = v.object({
	id: v.string(),
	name: v.string(),
	type: v.picklist(['ewallet', 'bank', 'cash']),
	openingBalance: v.pipe(v.number(), v.integer()),
	balance: v.pipe(v.number(), v.integer()),
	color: v.string(),
	icon: v.string(),
	includeInTotal: v.boolean(),
	archivedAt: v.nullable(v.number()),
	createdAt: v.number(),
	updatedAt: v.number(),
	deletedAt: v.nullable(v.number())
});

export const CategoryBackupSchema = v.object({
	id: v.string(),
	name: v.string(),
	kind: v.picklist(['income', 'expense']),
	parentId: v.nullable(v.string()),
	icon: v.string(),
	color: v.string(),
	order: v.number(),
	createdAt: v.number(),
	updatedAt: v.number(),
	deletedAt: v.nullable(v.number())
});

export const TransactionBackupSchema = v.object({
	id: v.string(),
	type: v.picklist(['income', 'expense', 'transfer']),
	amount: v.pipe(v.number(), v.integer(), v.minValue(1)),
	walletId: v.string(),
	toWalletId: v.nullable(v.string()),
	fee: v.pipe(v.number(), v.integer()),
	categoryId: v.nullable(v.string()),
	date: v.string(),
	note: v.nullable(v.string()),
	tagIds: v.optional(v.array(v.string()), []),
	attachmentId: v.nullable(v.string()),
	recurringId: v.nullable(v.string()),
	createdAt: v.number(),
	updatedAt: v.number(),
	deletedAt: v.nullable(v.number())
});

export const BudgetBackupSchema = v.object({
	id: v.string(),
	categoryId: v.nullable(v.string()),
	period: v.string(),
	limit: v.pipe(v.number(), v.integer()),
	alertAt: v.number(),
	createdAt: v.number(),
	updatedAt: v.number(),
	deletedAt: v.nullable(v.number())
});

export const SettingBackupSchema = v.object({
	id: v.optional(v.string()),
	key: v.string(),
	value: v.any(),
	createdAt: v.optional(v.number()),
	updatedAt: v.optional(v.number()),
	deletedAt: v.optional(v.nullable(v.number()))
});

export const RecurringRuleBackupSchema = v.object({
	id: v.string(),
	template: v.record(v.string(), v.any()),
	frequency: v.picklist(['daily', 'weekly', 'monthly', 'yearly']),
	nextRunAt: v.string(),
	autoPost: v.boolean(),
	createdAt: v.number(),
	updatedAt: v.number(),
	deletedAt: v.nullable(v.number())
});

export const NotificationBackupSchema = v.object({
	id: v.string(),
	type: v.picklist(['recurring_due', 'budget_alert', 'daily_reminder', 'system']),
	title: v.string(),
	message: v.string(),
	readAt: v.nullable(v.number()),
	refId: v.nullable(v.string()),
	createdAt: v.number(),
	updatedAt: v.number(),
	deletedAt: v.nullable(v.number())
});

export const BackupDataSchema = v.object({
	wallets: v.array(WalletBackupSchema),
	categories: v.array(CategoryBackupSchema),
	transactions: v.array(TransactionBackupSchema),
	budgets: v.optional(v.array(BudgetBackupSchema), []),
	settings: v.optional(v.array(SettingBackupSchema), []),
	recurringRules: v.optional(v.array(RecurringRuleBackupSchema), []),
	notifications: v.optional(v.array(NotificationBackupSchema), [])
});

export const BackupEnvelopeSchema = v.object({
	meta: BackupMetaSchema,
	data: BackupDataSchema
});

// ==========================================
// Pipeline Migrasi Format Versi Lawas
// ==========================================

export function migrateBackupData(raw: unknown): BackupEnvelope {
	if (typeof raw !== 'object' || raw === null) {
		throw new Error('Format data cadangan tidak valid (bukan objek JSON)');
	}

	const obj = raw as Record<string, unknown>;

	// Format V0 / Legacy: jika tidak memiliki envelope meta tapi memiliki array wallets
	if (!obj.meta && Array.isArray(obj.wallets)) {
		const rawWallets = (obj.wallets as Array<Record<string, unknown>>) || [];
		const rawCategories = (obj.categories as Array<Record<string, unknown>>) || [];
		const rawTransactions = (obj.transactions as Array<Record<string, unknown>>) || [];
		const rawBudgets = (obj.budgets as Array<Record<string, unknown>>) || [];
		const rawSettings = (obj.settings as Array<Record<string, unknown>>) || [];

		const now = Date.now();

		const migratedWallets = rawWallets.map((w) => ({
			id: String(w.id ?? ''),
			name: String(w.name ?? 'Dompet'),
			type: (['ewallet', 'bank', 'cash'].includes(w.type as string)
				? w.type
				: 'cash') as Wallet['type'],
			openingBalance: Number(w.openingBalance ?? 0),
			balance: Number(w.balance ?? w.openingBalance ?? 0),
			color: String(w.color ?? '#0058BC'),
			icon: String(w.icon ?? 'account_balance_wallet'),
			includeInTotal: Boolean(w.includeInTotal ?? true),
			archivedAt: (w.archivedAt as number | null) ?? null,
			createdAt: Number(w.createdAt ?? now),
			updatedAt: Number(w.updatedAt ?? now),
			deletedAt: (w.deletedAt as number | null) ?? null
		}));

		const migratedCategories = rawCategories.map((c) => ({
			id: String(c.id ?? ''),
			name: String(c.name ?? 'Kategori'),
			kind: (c.kind === 'income' ? 'income' : 'expense') as Category['kind'],
			parentId: (c.parentId as string | null) ?? null,
			icon: String(c.icon ?? 'category'),
			color: String(c.color ?? '#0058BC'),
			order: Number(c.order ?? 0),
			createdAt: Number(c.createdAt ?? now),
			updatedAt: Number(c.updatedAt ?? now),
			deletedAt: (c.deletedAt as number | null) ?? null
		}));

		const migratedTransactions = rawTransactions.map((t) => ({
			id: String(t.id ?? ''),
			type: (['income', 'expense', 'transfer'].includes(t.type as string)
				? t.type
				: 'expense') as Transaction['type'],
			amount: Number(t.amount ?? 0),
			walletId: String(t.walletId ?? ''),
			toWalletId: (t.toWalletId as string | null) ?? null,
			fee: Number(t.fee ?? 0),
			categoryId: (t.categoryId as string | null) ?? null,
			date: String(t.date ?? new Date().toISOString().substring(0, 10)),
			note: (t.note as string | null) ?? null,
			tagIds: Array.isArray(t.tagIds) ? (t.tagIds as string[]) : [],
			attachmentId: (t.attachmentId as string | null) ?? null,
			recurringId: (t.recurringId as string | null) ?? null,
			createdAt: Number(t.createdAt ?? now),
			updatedAt: Number(t.updatedAt ?? now),
			deletedAt: (t.deletedAt as number | null) ?? null
		}));

		const migratedBudgets = rawBudgets.map((b) => ({
			id: String(b.id ?? ''),
			categoryId: (b.categoryId as string | null) ?? null,
			period: String(b.period ?? ''),
			limit: Number(b.limit ?? 0),
			alertAt: Number(b.alertAt ?? 80),
			createdAt: Number(b.createdAt ?? now),
			updatedAt: Number(b.updatedAt ?? now),
			deletedAt: (b.deletedAt as number | null) ?? null
		}));

		const migratedSettings = rawSettings.map((s) => ({
			id: String(s.id ?? ''),
			key: String(s.key ?? ''),
			value: s.value,
			createdAt: Number(s.createdAt ?? now),
			updatedAt: Number(s.updatedAt ?? now),
			deletedAt: (s.deletedAt as number | null) ?? null
		}));

		return {
			meta: {
				version: CURRENT_BACKUP_VERSION,
				appName: APP_NAME,
				appVersion: APP_VERSION,
				exportedAt: new Date().toISOString()
			},
			data: {
				wallets: migratedWallets,
				categories: migratedCategories,
				transactions: migratedTransactions,
				budgets: migratedBudgets,
				settings: migratedSettings
			}
		};
	}

	// Format dengan envelope: periksa jika ada versi terdahulu
	if (obj.meta && typeof obj.meta === 'object') {
		const meta = obj.meta as Record<string, unknown>;
		const data = (obj.data as Record<string, unknown>) || {};

		// Migrasi bertingkat jika version < CURRENT_BACKUP_VERSION
		if (Number(meta.version) === 0) {
			meta.version = 1;
		}

		return {
			meta: {
				version: Number(meta.version ?? CURRENT_BACKUP_VERSION),
				appName: String(meta.appName ?? APP_NAME),
				appVersion: String(meta.appVersion ?? APP_VERSION),
				exportedAt: String(meta.exportedAt ?? new Date().toISOString())
			},
			data: {
				wallets: (data.wallets as Wallet[]) || [],
				categories: (data.categories as Category[]) || [],
				transactions: (data.transactions as Transaction[]) || [],
				budgets: (data.budgets as Budget[]) || [],
				settings: (data.settings as Setting[]) || [],
				recurringRules: (data.recurringRules as RecurringRule[]) || [],
				notifications: (data.notifications as Notification[]) || []
			}
		};
	}

	throw new Error('Format berkas cadangan tidak dikenali atau tidak memiliki struktur yang valid');
}

// ==========================================
// Escaping RFC 4180 untuk Ekspor CSV
// ==========================================

export function escapeCsvCell(val: unknown): string {
	if (val === null || val === undefined) return '';
	const str = String(val);
	if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
		return `"${str.replace(/"/g, '""')}"`;
	}
	return str;
}

// ==========================================
// BackupService Class
// ==========================================

export class BackupService {
	/**
	 * Ekspor seluruh data lokal ke format JSON berversi dengan envelope metadata.
	 */
	async exportBackupJson(): Promise<string> {
		const [wallets, categories, transactions, budgets, rawSettings, recurringRules, notifications] =
			await Promise.all([
				db.wallets.toArray(),
				db.categories.toArray(),
				db.transactions.toArray(),
				db.budgets.toArray(),
				db.settings.toArray(),
				db.recurringRules.toArray(),
				db.notifications.toArray()
			]);

		// Keamanan: Cadangan TIDAK BOLEH memuat hash/salt PIN keamanan pengguna
		const settings = rawSettings.filter((s) => s.key !== 'pin_security');

		const envelope: BackupEnvelope = {
			meta: {
				version: CURRENT_BACKUP_VERSION,
				appName: APP_NAME,
				appVersion: APP_VERSION,
				exportedAt: new Date().toISOString()
			},
			data: {
				wallets,
				categories,
				transactions,
				budgets,
				settings,
				recurringRules,
				notifications
			}
		};

		return JSON.stringify(envelope, null, 2);
	}

	/**
	 * Validasi ketat di memori dan pemulihan atomik (ACID transaction).
	 * Menjamin data lama TIDAK DISENTUH jika file rusak atau tidak lolos validasi.
	 */
	async restoreBackupJson(jsonString: string): Promise<RestoreResult> {
		// 1. Parsing JSON di memori
		let parsedRaw: unknown;
		try {
			parsedRaw = JSON.parse(jsonString);
		} catch (error) {
			const msg = error instanceof Error ? error.message : String(error);
			throw new Error(`File cadangan rusak atau format JSON tidak valid: ${msg}`, { cause: error });
		}

		// 2. Jalankan pipeline migrasi versi jika diperlukan
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
		const meta = validationResult.output.meta;

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

		// 5. Pre-kalkulasi integritas cache saldo dompet sebelum transaksi DB dimulai
		const calculatedBalances = calculateWalletBalances(validData.wallets, validData.transactions);
		const recalculatedWallets = validData.wallets.map((w) => ({
			...w,
			balance: calculatedBalances.get(w.id) ?? w.openingBalance
		}));

		// Keamanan: Ambil konfigurasi PIN aktif saat ini agar TIDAK tertimpa oleh pemulihan data
		const currentPinSetting = await db.settings.get('pin_security');

		const preparedSettings: Setting[] = (validData.settings ?? [])
			.filter((s) => s.key !== 'pin_security')
			.map((s, index) => ({
				id: s.id ?? `setting_${index}_${s.key}`,
				key: s.key,
				value: s.value,
				createdAt: s.createdAt ?? Date.now(),
				updatedAt: s.updatedAt ?? Date.now(),
				deletedAt: s.deletedAt ?? null
			}));

		if (currentPinSetting) {
			preparedSettings.push(currentPinSetting);
		}

		// 6. Eksekusi penulisan atomik Dexie dalam satu transaksi read-write tunggal
		// Jika terjadi kegagalan di tengah penulisan, Dexie otomatis membatalkan seluruh mutasi.
		await db.transaction(
			'rw',
			[
				db.wallets,
				db.categories,
				db.transactions,
				db.budgets,
				db.settings,
				db.recurringRules,
				db.notifications
			],
			async () => {
				await db.wallets.clear();
				await db.categories.clear();
				await db.transactions.clear();
				await db.budgets.clear();
				await db.settings.clear();
				await db.recurringRules.clear();
				await db.notifications.clear();

				if (recalculatedWallets.length > 0) {
					await db.wallets.bulkPut(recalculatedWallets);
				}
				if (validData.categories.length > 0) {
					await db.categories.bulkPut(validData.categories);
				}
				if (validData.transactions.length > 0) {
					await db.transactions.bulkPut(validData.transactions);
				}
				if (validData.budgets.length > 0) {
					await db.budgets.bulkPut(validData.budgets);
				}
				if (preparedSettings.length > 0) {
					await db.settings.bulkPut(preparedSettings);
				}
				if (validData.recurringRules && validData.recurringRules.length > 0) {
					await db.recurringRules.bulkPut(validData.recurringRules);
				}
				if (validData.notifications && validData.notifications.length > 0) {
					await db.notifications.bulkPut(validData.notifications);
				}
			}
		);

		return {
			success: true,
			meta,
			counts: {
				wallets: recalculatedWallets.length,
				categories: validData.categories.length,
				transactions: validData.transactions.length,
				budgets: validData.budgets.length,
				settings: validData.settings.length,
				recurringRules: validData.recurringRules?.length ?? 0,
				notifications: validData.notifications?.length ?? 0
			}
		};
	}

	/**
	 * Ekspor riwayat transaksi ke format CSV RFC 4180 lengkap dengan awalan UTF-8 BOM.
	 */
	async exportTransactionsCsv(): Promise<string> {
		const [transactions, wallets, categories] = await Promise.all([
			db.transactions.toArray(),
			db.wallets.toArray(),
			db.categories.toArray()
		]);

		const walletMap = new Map<string, string>();
		for (const w of wallets) {
			walletMap.set(w.id, w.name);
		}

		const categoryMap = new Map<string, Category>();
		for (const c of categories) {
			categoryMap.set(c.id, c);
		}

		const headers = [
			'ID',
			'Tanggal',
			'Tipe',
			'Nominal',
			'Biaya Admin',
			'Dompet Asal',
			'Dompet Tujuan',
			'Kategori',
			'Kategori Induk',
			'Catatan'
		];

		const rows: string[] = [];
		// UTF-8 BOM untuk memastikan Excel membuka encoding UTF-8 dengan tepat
		rows.push('﻿' + headers.map(escapeCsvCell).join(','));

		// Urutkan transaksi berdasarkan tanggal descending
		const sorted = [...transactions].sort((a, b) => b.date.localeCompare(a.date));

		for (const tx of sorted) {
			const typeLabel =
				tx.type === 'income' ? 'Pemasukan' : tx.type === 'expense' ? 'Pengeluaran' : 'Transfer';
			const fromWallet = walletMap.get(tx.walletId) ?? tx.walletId;
			const toWallet = tx.toWalletId ? (walletMap.get(tx.toWalletId) ?? tx.toWalletId) : '';

			let categoryName = '';
			let parentCategoryName = '';
			if (tx.categoryId) {
				const cat = categoryMap.get(tx.categoryId);
				if (cat) {
					categoryName = cat.name;
					if (cat.parentId) {
						const parent = categoryMap.get(cat.parentId);
						parentCategoryName = parent ? parent.name : '';
					}
				}
			}

			const line = [
				tx.id,
				tx.date,
				typeLabel,
				tx.amount,
				tx.fee ?? 0,
				fromWallet,
				toWallet,
				categoryName,
				parentCategoryName,
				tx.note ?? ''
			]
				.map(escapeCsvCell)
				.join(',');

			rows.push(line);
		}

		return rows.join('\r\n');
	}

	/**
	 * Reset total: bersihkan seluruh data lokal dan lakukan seeding ulang kategori bawaan.
	 */
	async resetAllData(): Promise<void> {
		await db.transaction(
			'rw',
			[
				db.wallets,
				db.categories,
				db.transactions,
				db.budgets,
				db.settings,
				db.recurringRules,
				db.attachments,
				db.notifications
			],
			async () => {
				await db.wallets.clear();
				await db.categories.clear();
				await db.transactions.clear();
				await db.budgets.clear();
				await db.settings.clear();
				await db.recurringRules.clear();
				await db.attachments.clear();
				await db.notifications.clear();
			}
		);

		// Seed ulang kategori bawaan
		await categoryService.initDefaultCategories();
	}

	/**
	 * Ambil ringkasan statistik database lokal untuk halaman Tentang.
	 */
	async getDatabaseStats(): Promise<{
		walletCount: number;
		categoryCount: number;
		transactionCount: number;
		budgetCount: number;
		estimatedBytes: number;
	}> {
		const [wallets, categories, transactions, budgets] = await Promise.all([
			db.wallets.count(),
			db.categories.count(),
			db.transactions.count(),
			db.budgets.count()
		]);

		// Estimasi ukuran penyimpanan kasar (rata-rata 250 bytes per transaksi + data lainnya)
		const estimatedBytes =
			wallets * 300 + categories * 200 + transactions * 250 + budgets * 150 + 1024;

		return {
			walletCount: wallets,
			categoryCount: categories,
			transactionCount: transactions,
			budgetCount: budgets,
			estimatedBytes
		};
	}
}

export const backupService = new BackupService();
