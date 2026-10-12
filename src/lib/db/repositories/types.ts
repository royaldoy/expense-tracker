import type {
	Budget,
	Category,
	CategoryKind,
	Transaction,
	ULID,
	Wallet,
	WalletType
} from '../../domain/types';

export interface IWalletRepository {
	getById(id: ULID): Promise<Wallet | undefined>;
	getAll(options?: { includeDeleted?: boolean }): Promise<Wallet[]>;
	getByType(type: WalletType): Promise<Wallet[]>;
	create(wallet: Omit<Wallet, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<Wallet>;
	update(id: ULID, updates: Partial<Omit<Wallet, 'id' | 'createdAt'>>): Promise<Wallet>;
	softDelete(id: ULID): Promise<void>;
}

export interface ITransactionRepository {
	getById(id: ULID): Promise<Transaction | undefined>;
	getAllActive(): Promise<Transaction[]>;
	getByWalletId(
		walletId: ULID,
		options?: { startDate?: string; endDate?: string }
	): Promise<Transaction[]>;
	getByDateRange(startDate: string, endDate: string): Promise<Transaction[]>;
	getByCategory(categoryId: ULID): Promise<Transaction[]>;
	create(
		tx: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>
	): Promise<Transaction>;
	update(id: ULID, updates: Partial<Omit<Transaction, 'id' | 'createdAt'>>): Promise<Transaction>;
	softDelete(id: ULID): Promise<void>;
}

export interface ICategoryRepository {
	getById(id: ULID): Promise<Category | undefined>;
	getAll(options?: { includeDeleted?: boolean }): Promise<Category[]>;
	getByKind(kind: CategoryKind): Promise<Category[]>;
	create(
		category: Omit<Category, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>
	): Promise<Category>;
	update(id: ULID, updates: Partial<Omit<Category, 'id' | 'createdAt'>>): Promise<Category>;
	softDelete(id: ULID): Promise<void>;
}

export interface IBudgetRepository {
	getById(id: ULID): Promise<Budget | undefined>;
	getAll(options?: { includeDeleted?: boolean }): Promise<Budget[]>;
	getByPeriod(period: string): Promise<Budget[]>;
	getByCategoryAndPeriod(categoryId: ULID | null, period: string): Promise<Budget | undefined>;
	create(budget: Omit<Budget, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<Budget>;
	update(id: ULID, updates: Partial<Omit<Budget, 'id' | 'createdAt'>>): Promise<Budget>;
	softDelete(id: ULID): Promise<void>;
}
