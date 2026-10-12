import Dexie, { type Table } from 'dexie';
import type {
	Attachment,
	Budget,
	Category,
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

	constructor(dbName = 'MoneyTrackerDB') {
		super(dbName);

		// Versi 1: Skema dasar tabel inti
		// Index wajib: transactions.date dan transactions.[walletId+date]
		this.version(1).stores({
			wallets: 'id, name, type, includeInTotal, deletedAt',
			categories: 'id, name, kind, parentId, [kind+order], deletedAt',
			transactions: 'id, type, walletId, toWalletId, categoryId, date, [walletId+date], deletedAt',
			budgets: 'id, categoryId, period, [categoryId+period], deletedAt',
			recurringRules: 'id, nextRunAt, autoPost, deletedAt',
			attachments: 'id, deletedAt',
			settings: 'key'
		});
	}
}

export const db = new MoneyTrackerDatabase();
