import Dexie, { type Table } from 'dexie';
import type {
	Attachment,
	Budget,
	Category,
	Notification,
	RecurringRule,
	Setting,
	Transaction,
	Wallet
} from '../domain/types';

export class MoneyTrackerDatabase extends Dexie {
	wallets!: Table<Wallet, string>;
	categories!: Table<Category, string>;
	transactions!: Table<Transaction, string>;
	budgets!: Table<Budget, string>;
	recurringRules!: Table<RecurringRule, string>;
	attachments!: Table<Attachment, string>;
	settings!: Table<Setting, string>;
	notifications!: Table<Notification, string>;

	constructor(dbName = 'MoneyTrackerDB') {
		super(dbName);

		// Versi 1: Skema dasar tabel inti
		// Index wajib: transactions.date dan transactions.[walletId+date]
		this.version(1).stores({
			wallets: 'id, name, type, includeInTotal, deletedAt',
			categories: 'id, name, kind, parentId, [kind+order], deletedAt',
			transactions: 'id, type, walletId, toWalletId, categoryId, date, [walletId+date], deletedAt',
			recurringRules: 'id, nextRunAt, autoPost, deletedAt',
			attachments: 'id, deletedAt',
			settings: 'key'
		});

		// Versi 2: Penambahan tabel budgets dengan compound index [categoryId+period]
		this.version(2).stores({
			budgets: 'id, categoryId, period, [categoryId+period], deletedAt'
		});

		// Versi 3: Compound index transaksi [recurringId+date] dan index frequency aturan berulang
		this.version(3).stores({
			transactions:
				'id, type, walletId, toWalletId, categoryId, date, [walletId+date], recurringId, [recurringId+date], deletedAt',
			recurringRules: 'id, nextRunAt, autoPost, frequency, deletedAt'
		});

		// Versi 4: Penambahan tabel notifications untuk inbox notifikasi lokal
		this.version(4).stores({
			notifications: 'id, type, refId, readAt, createdAt, deletedAt, [type+refId]'
		});
	}
}

export const db = new MoneyTrackerDatabase();
