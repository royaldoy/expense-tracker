export type ULID = string;
export type Timestamp = number; // Unix timestamp in milliseconds

export interface BaseEntity {
	id: ULID;
	createdAt: Timestamp;
	updatedAt: Timestamp;
	deletedAt: Timestamp | null; // null jika aktif, timestamp jika soft-deleted
}

export type WalletType = 'ewallet' | 'bank' | 'cash';

export interface Wallet extends BaseEntity {
	name: string;
	type: WalletType;
	openingBalance: number; // Integer Rupiah
	balance: number; // Cache saldo aktual (Integer Rupiah)
	color: string;
	icon: string;
	includeInTotal: boolean;
	archivedAt: Timestamp | null;
}

export type CategoryKind = 'income' | 'expense';

export interface Category extends BaseEntity {
	name: string;
	kind: CategoryKind;
	parentId: ULID | null;
	icon: string;
	color: string;
	order: number;
}

export type TransactionType = 'income' | 'expense' | 'transfer';

export interface Transaction extends BaseEntity {
	type: TransactionType;
	amount: number; // Integer Rupiah (> 0)
	walletId: ULID; // Dompet asal (atau penerima untuk income)
	toWalletId: ULID | null; // Dompet tujuan untuk transfer
	fee: number; // Biaya admin/transfer (Integer Rupiah, default 0)
	categoryId: ULID | null;
	date: string; // Format YYYY-MM-DD atau ISO string untuk indexing
	note: string | null;
	tagIds: string[];
	attachmentId: ULID | null;
	recurringId: ULID | null;
}

export interface Budget extends BaseEntity {
	categoryId: ULID | null; // null = total anggaran semua kategori
	period: string; // Format periode e.g. "2026-10"
	limit: number; // Batas limit nominal Integer Rupiah
	alertAt: number; // Persentase ambang peringatan (misal 80 untuk 80%)
}

export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface RecurringRule extends BaseEntity {
	template: Partial<Omit<Transaction, keyof BaseEntity>>;
	frequency: RecurringFrequency;
	nextRunAt: string; // Tanggal eksekusi berikutnya (YYYY-MM-DD)
	autoPost: boolean;
}

export interface Attachment extends BaseEntity {
	blob: Uint8Array | string | null;
	uri: string | null;
	mime: string;
}

export interface Setting extends BaseEntity {
	key: string;
	value: unknown;
}
