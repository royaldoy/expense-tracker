import * as v from 'valibot';
import { categoryRepository, transactionRepository, walletRepository } from '../db/repositories';
import type {
	ICategoryRepository,
	ITransactionRepository,
	IWalletRepository,
	TransactionFilterOptions
} from '../db/repositories/types';
import {
	transactionService as dbTransactionService,
	TransactionService as DbTransactionService,
	type CreateTransactionDTO,
	type TransferDTO,
	type UpdateTransactionDTO
} from '../db/transactionService';
import { calculateCashflow, type CashflowSummary } from '../domain/balance';
import type { Category, Transaction, ULID, Wallet } from '../domain/types';
import {
	type TransactionInput,
	TransactionInputSchema,
	type TransferInput,
	TransferInputSchema,
	type UpdateTransactionInput,
	UpdateTransactionInputSchema
} from './schemas';

export type TransactionFilter = TransactionFilterOptions;

export interface TransactionWithDetails extends Transaction {
	wallet?: Wallet;
	toWallet?: Wallet;
	category?: Category;
}

export interface TransactionGroupedByDate {
	date: string;
	totalExpense: number;
	totalIncome: number;
	transactions: TransactionWithDetails[];
}

export class TransactionAppService {
	constructor(
		private dbService: DbTransactionService = dbTransactionService,
		private transactionRepo: ITransactionRepository = transactionRepository,
		private walletRepo: IWalletRepository = walletRepository,
		private categoryRepo: ICategoryRepository = categoryRepository
	) {}

	async getTransactions(filter?: TransactionFilter): Promise<TransactionWithDetails[]> {
		let txs: Transaction[];
		if (filter && Object.keys(filter).length > 0) {
			txs = await this.transactionRepo.queryTransactions(filter);
		} else {
			txs = await this.transactionRepo.getAllActive();
			txs.sort((a, b) => {
				const dateCmp = b.date.localeCompare(a.date);
				if (dateCmp !== 0) return dateCmp;
				return b.createdAt - a.createdAt;
			});
		}

		// Hydrate relations
		const wallets = await this.walletRepo.getAll({ includeDeleted: true });
		const categories = await this.categoryRepo.getAll({ includeDeleted: true });

		const walletMap = new Map<string, Wallet>(wallets.map((w) => [w.id, w]));
		const categoryMap = new Map<string, Category>(categories.map((c) => [c.id, c]));

		return txs.map((tx) => ({
			...tx,
			wallet: walletMap.get(tx.walletId),
			toWallet: tx.toWalletId ? walletMap.get(tx.toWalletId) : undefined,
			category: tx.categoryId ? categoryMap.get(tx.categoryId) : undefined
		}));
	}

	async getTransactionsGroupedByDate(
		filter?: TransactionFilter
	): Promise<TransactionGroupedByDate[]> {
		const txs = await this.getTransactions(filter);
		const groupsMap = new Map<string, TransactionWithDetails[]>();

		for (const tx of txs) {
			const group = groupsMap.get(tx.date) ?? [];
			group.push(tx);
			groupsMap.set(tx.date, group);
		}

		const result: TransactionGroupedByDate[] = [];
		for (const [date, items] of groupsMap.entries()) {
			let totalExpense = 0;
			let totalIncome = 0;
			for (const item of items) {
				if (item.type === 'expense') {
					totalExpense += item.amount;
				} else if (item.type === 'income') {
					totalIncome += item.amount;
				} else if (item.type === 'transfer' && item.fee > 0) {
					totalExpense += item.fee;
				}
			}
			result.push({
				date,
				totalExpense,
				totalIncome,
				transactions: items
			});
		}

		return result;
	}

	async getTransactionById(id: ULID): Promise<TransactionWithDetails | undefined> {
		const tx = await this.transactionRepo.getById(id);
		if (!tx) return undefined;

		const wallet = await this.walletRepo.getById(tx.walletId);
		const toWallet = tx.toWalletId ? await this.walletRepo.getById(tx.toWalletId) : undefined;
		const category = tx.categoryId ? await this.categoryRepo.getById(tx.categoryId) : undefined;

		return {
			...tx,
			wallet,
			toWallet,
			category
		};
	}

	async addTransaction(input: TransactionInput): Promise<Transaction> {
		const parsed = v.parse(TransactionInputSchema, input);
		return this.dbService.addTransaction(parsed as CreateTransactionDTO);
	}

	async updateTransaction(id: ULID, input: UpdateTransactionInput): Promise<Transaction> {
		const parsed = v.parse(UpdateTransactionInputSchema, input);
		return this.dbService.updateTransaction(id, parsed as UpdateTransactionDTO);
	}

	async deleteTransaction(id: ULID): Promise<void> {
		return this.dbService.deleteTransaction(id);
	}

	async transfer(input: TransferInput): Promise<Transaction> {
		const parsed = v.parse(TransferInputSchema, input);
		return this.dbService.transfer(parsed as TransferDTO);
	}

	async getCashflowSummary(options?: {
		startDate?: string;
		endDate?: string;
	}): Promise<CashflowSummary> {
		let txs = await this.transactionRepo.getAllActive();
		if (options?.startDate) {
			txs = txs.filter((t) => t.date >= options.startDate!);
		}
		if (options?.endDate) {
			txs = txs.filter((t) => t.date <= options.endDate!);
		}
		return calculateCashflow(txs);
	}

	async rebuildBalances(): Promise<Map<string, number>> {
		return this.dbService.rebuildBalances();
	}
}

export const transactionService = new TransactionAppService();
export { type CreateTransactionDTO, type UpdateTransactionDTO, type TransferDTO };
