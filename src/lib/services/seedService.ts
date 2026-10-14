import { categoryRepository, walletRepository } from '../db/repositories';
import { db, MoneyTrackerDatabase } from '../db/schema';
import { transactionService as dbTransactionService } from '../db/transactionService';
import { DEFAULT_CATEGORIES } from '../domain/defaultCategories';
import { generateSeedTransactions } from '../domain/seedData';
import type { Category } from '../domain/types';

export interface SeedResult {
	count: number;
	elapsedMs: number;
	walletsCount: number;
	categoriesCount: number;
}

export class SeedService {
	constructor(private database: MoneyTrackerDatabase = db) {}

	async seedTransactions(count = 1000): Promise<SeedResult> {
		const startTime = performance.now();

		// 1. Pastikan minimal ada 2 dompet
		let wallets = await walletRepository.getAll();
		if (wallets.length === 0) {
			const bca = await walletRepository.create({
				name: 'Bank BCA',
				type: 'bank',
				openingBalance: 10000000,
				balance: 10000000,
				color: '#0066AE',
				icon: 'account_balance',
				includeInTotal: true,
				archivedAt: null
			});
			const gopay = await walletRepository.create({
				name: 'GoPay',
				type: 'ewallet',
				openingBalance: 2000000,
				balance: 2000000,
				color: '#00AED6',
				icon: 'wallet',
				includeInTotal: true,
				archivedAt: null
			});
			const cash = await walletRepository.create({
				name: 'Tunai Dompet',
				type: 'cash',
				openingBalance: 500000,
				balance: 500000,
				color: '#10B981',
				icon: 'payments',
				includeInTotal: true,
				archivedAt: null
			});
			wallets = [bca, gopay, cash];
		}

		// 2. Pastikan kategori default terinisialisasi
		let categories = await categoryRepository.getAll();
		if (categories.length === 0) {
			const createdCats: Category[] = [];
			let groupOrder = 1;
			for (const group of DEFAULT_CATEGORIES) {
				const parent = await categoryRepository.create({
					name: group.name,
					kind: group.kind,
					parentId: null,
					icon: group.icon,
					color: group.color,
					order: groupOrder++
				});
				createdCats.push(parent);

				if (group.subcategories && group.subcategories.length > 0) {
					for (let i = 0; i < group.subcategories.length; i++) {
						const sub = group.subcategories[i];
						const subCat = await categoryRepository.create({
							name: sub.name,
							kind: group.kind,
							parentId: parent.id,
							icon: sub.icon,
							color: group.color,
							order: i + 1
						});
						createdCats.push(subCat);
					}
				}
			}
			categories = createdCats;
		}

		// 3. Hasilkan 1.000 transaksi acak murni
		const transactions = generateSeedTransactions({
			count,
			wallets,
			categories
		});

		// 4. Eksekusi bulkAdd + rebuildBalances secara atomik
		await this.database.transaction(
			'rw',
			[this.database.wallets, this.database.transactions],
			async () => {
				await this.database.transactions.bulkAdd(transactions);
				const freshBalances = await dbTransactionService.rebuildBalances();
				for (const w of wallets) {
					w.balance = freshBalances.get(w.id) ?? w.openingBalance;
				}
			}
		);

		const elapsedMs = Math.round(performance.now() - startTime);

		return {
			count,
			elapsedMs,
			walletsCount: wallets.length,
			categoriesCount: categories.length
		};
	}
}

export const seedService = new SeedService();
