import { ulid } from 'ulid';
import type { ULID, Wallet, WalletType } from '../../domain/types';
import { db, MoneyTrackerDatabase } from '../schema';
import type { IWalletRepository } from './types';

export class DexieWalletRepository implements IWalletRepository {
	constructor(private database: MoneyTrackerDatabase = db) {}

	async getById(id: ULID): Promise<Wallet | undefined> {
		const wallet = await this.database.wallets.get(id);
		return wallet?.deletedAt === null ? wallet : undefined;
	}

	async getAll(options?: { includeDeleted?: boolean }): Promise<Wallet[]> {
		if (options?.includeDeleted) {
			return this.database.wallets.toArray();
		}
		return this.database.wallets.filter((w) => w.deletedAt === null).toArray();
	}

	async getByType(type: WalletType): Promise<Wallet[]> {
		return this.database.wallets
			.where('type')
			.equals(type)
			.filter((w) => w.deletedAt === null)
			.toArray();
	}

	async create(
		data: Omit<Wallet, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>
	): Promise<Wallet> {
		const now = Date.now();
		const wallet: Wallet = {
			...data,
			id: ulid(),
			createdAt: now,
			updatedAt: now,
			deletedAt: null
		};
		await this.database.wallets.add(wallet);
		return wallet;
	}

	async update(id: ULID, updates: Partial<Omit<Wallet, 'id' | 'createdAt'>>): Promise<Wallet> {
		const existing = await this.database.wallets.get(id);
		if (!existing || existing.deletedAt !== null) {
			throw new Error(`Wallet dengan ID ${id} tidak ditemukan.`);
		}
		const updated: Wallet = {
			...existing,
			...updates,
			updatedAt: Date.now()
		};
		await this.database.wallets.put(updated);
		return updated;
	}

	async softDelete(id: ULID): Promise<void> {
		const existing = await this.database.wallets.get(id);
		if (!existing || existing.deletedAt !== null) {
			return;
		}
		const now = Date.now();
		existing.deletedAt = now;
		existing.updatedAt = now;
		await this.database.wallets.put(existing);
	}
}

export const walletRepository = new DexieWalletRepository();
