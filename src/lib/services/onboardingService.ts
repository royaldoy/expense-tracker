import type { Wallet } from '../domain/types';
import { categoryService, type CategoryService } from './categoryService';
import type { WalletInput } from './schemas';
import { walletService, type WalletService } from './walletService';

export class OnboardingService {
	constructor(
		private wService: WalletService = walletService,
		private cService: CategoryService = categoryService
	) {}

	async isCompleted(): Promise<boolean> {
		const wallets = await this.wService.getWallets({ includeArchived: true });
		return wallets.length > 0;
	}

	async complete(input: WalletInput): Promise<Wallet> {
		await this.cService.initDefaultCategories();
		return this.wService.createWallet(input);
	}
}

export const onboardingService = new OnboardingService();
