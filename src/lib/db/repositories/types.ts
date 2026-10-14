import type {
	Budget,
	Category,
	CategoryKind,
	Notification,
	NotificationType,
	RecurringRule,
	Transaction,
	TransactionType,
	ULID,
	Wallet,
	WalletType
} from '../../domain/types';

export interface TransactionFilterOptions {
	search?: string;
	startDate?: string;
	endDate?: string;
	walletIds?: ULID[];
	categoryIds?: ULID[];
	types?: TransactionType[];
	minAmount?: number;
	maxAmount?: number;
	walletId?: ULID;
	categoryId?: ULID;
	type?: TransactionType;
}

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
	queryTransactions(filter: TransactionFilterOptions): Promise<Transaction[]>;
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

export interface ISettingRepository {
	get<T = unknown>(key: string): Promise<T | null>;
	set<T = unknown>(key: string, value: T): Promise<void>;
	delete(key: string): Promise<void>;
}

export interface IRecurringRuleRepository {
	getById(id: ULID): Promise<RecurringRule | undefined>;
	getAll(options?: { includeDeleted?: boolean }): Promise<RecurringRule[]>;
	getDueRules(asOfDate: string): Promise<RecurringRule[]>;
	create(
		rule: Omit<RecurringRule, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>
	): Promise<RecurringRule>;
	update(
		id: ULID,
		updates: Partial<Omit<RecurringRule, 'id' | 'createdAt'>>
	): Promise<RecurringRule>;
	softDelete(id: ULID): Promise<void>;
}

export interface INotificationRepository {
	getById(id: ULID): Promise<Notification | undefined>;
	getAll(options?: { includeDeleted?: boolean; unreadOnly?: boolean }): Promise<Notification[]>;
	getByTypeAndRefId(type: NotificationType, refId: string): Promise<Notification | undefined>;
	getUnreadCount(): Promise<number>;
	create(
		notif: Omit<Notification, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>
	): Promise<Notification>;
	markAsRead(id: ULID): Promise<void>;
	markAllAsRead(): Promise<void>;
	softDelete(id: ULID): Promise<void>;
}
