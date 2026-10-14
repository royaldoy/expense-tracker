import * as v from 'valibot';
import { transactionRepository, walletRepository } from '../db/repositories';
import type { ITransactionRepository, IWalletRepository } from '../db/repositories/types';
import { calculateBalanceAdjustment } from '../domain/adjustment';
import type { Transaction, ULID, Wallet } from '../domain/types';
import { categoryService, CategoryService } from './categoryService';
import {
	type AdjustBalanceInput,
	type UpdateWalletInput,
	type WalletInput,
	AdjustBalanceInputSchema,
	UpdateWalletInputSchema,
	WalletInputSchema
} from './schemas';
import { transactionService, TransactionAppService } from './transactionService';

export class WalletService {
	constructor(
		private repository: IWalletRepository = walletRepository,
		private transactionRepo: ITransactionRepository = transactionRepository,
		private catService: CategoryService = categoryService,
		private txService: TransactionAppService = transactionService
	) {}

	async getWallets(options?: { includeArchived?: boolean }): Promise<Wallet[]> {
		const all = await this.repository.getAll();
		if (options?.includeArchived) {
			return all;
		}
		return all.filter((w) => w.archivedAt === null);
	}

	async getWalletById(id: ULID): Promise<Wallet | undefined> {
		return this.repository.getById(id);
	}

	async getTotalBalance(): Promise<number> {
		const wallets = await this.getWallets({ includeArchived: false });
		return wallets.filter((w) => w.includeInTotal !== false).reduce((sum, w) => sum + w.balance, 0);
	}

	async getTransactionsByWallet(id: ULID): Promise<Transaction[]> {
		return this.transactionRepo.getByWalletId(id);
	}

	async createWallet(input: WalletInput): Promise<Wallet> {
		const parsed = v.parse(WalletInputSchema, input);

		return this.repository.create({
			name: parsed.name,
			type: parsed.type,
			openingBalance: parsed.openingBalance,
			balance: parsed.openingBalance, // Cache saldo awal = saldo pembuka
			color: parsed.color,
			icon: parsed.icon,
			includeInTotal: parsed.includeInTotal,
			archivedAt: null
		});
	}

	async updateWallet(id: ULID, input: UpdateWalletInput): Promise<Wallet> {
		const parsed = v.parse(UpdateWalletInputSchema, input);
		return this.repository.update(id, parsed);
	}

	async archiveWallet(id: ULID): Promise<Wallet> {
		return this.repository.update(id, { archivedAt: Date.now() });
	}

	async unarchiveWallet(id: ULID): Promise<Wallet> {
		return this.repository.update(id, { archivedAt: null });
	}

	async deleteWallet(id: ULID): Promise<void> {
		return this.repository.softDelete(id);
	}

	/**
	 * Menyesuaikan saldo dompet ke nominal target tanpa menimpa balance secara langsung.
	 * Selisih dicatat sebagai transaksi income atau expense dengan kategori sistem "Koreksi saldo".
	 */
	async adjustBalance(
		input: AdjustBalanceInput
	): Promise<{ transaction: Transaction | null; wallet: Wallet }> {
		const parsed = v.parse(AdjustBalanceInputSchema, input);
		const wallet = await this.repository.getById(parsed.walletId);
		if (!wallet || wallet.deletedAt !== null) {
			throw new Error(`Dompet dengan ID ${parsed.walletId} tidak ditemukan.`);
		}

		const adjustment = calculateBalanceAdjustment(wallet.balance, parsed.targetBalance);
		if (adjustment.type === null) {
			return { transaction: null, wallet };
		}

		const systemCategory = await this.catService.getOrCreateSystemAdjustmentCategory(
			adjustment.type
		);

		const today = new Date().toISOString().substring(0, 10);
		const tx = await this.txService.addTransaction({
			walletId: wallet.id,
			type: adjustment.type,
			amount: adjustment.amount,
			categoryId: systemCategory.id,
			date: parsed.date ?? today,
			note: parsed.note || 'Koreksi saldo'
		});

		const updatedWallet = await this.repository.getById(wallet.id);
		return { transaction: tx, wallet: updatedWallet ?? wallet };
	}
}

export const walletService = new WalletService();
