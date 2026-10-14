/**
 * RecurringService - Use-case Pengelolaan Transaksi Berulang & Scheduler Jatuh Tempo
 * Bertanggung jawab atas:
 * - CRUD aturan transaksi berulang dengan validasi Valibot
 * - Eksekusi idempoten jadwal jatuh tempo saat aplikasi dibuka (catch-up semua jadwal terlewat)
 * - Penanganan autoPost: true (langsung catat) vs autoPost: false (minta konfirmasi)
 */

import * as v from 'valibot';
import {
	categoryRepository,
	recurringRuleRepository,
	transactionRepository,
	walletRepository
} from '../db/repositories';
import type {
	ICategoryRepository,
	IRecurringRuleRepository,
	ITransactionRepository,
	IWalletRepository
} from '../db/repositories/types';
import { advanceNextRunAt, getDueDates } from '../domain/recurring';
import type { Category, RecurringRule, Transaction, ULID, Wallet } from '../domain/types';
import {
	RecurringRuleInputSchema,
	UpdateRecurringRuleInputSchema,
	type RecurringRuleInput,
	type UpdateRecurringRuleInput
} from './schemas';
import { transactionService, TransactionAppService } from './transactionService';

export interface PendingRecurringItem {
	rule: RecurringRule;
	dueDates: string[];
	wallet?: Wallet;
	category?: Category;
}

export interface RunDueRecurringResult {
	postedCount: number;
	postedTransactions: Transaction[];
	pendingCount: number;
	pendingRules: PendingRecurringItem[];
}

export interface RecurringRuleWithDetails extends RecurringRule {
	wallet?: Wallet;
	category?: Category;
}

export class RecurringService {
	private isRunning = false;

	constructor(
		private recurringRepo: IRecurringRuleRepository = recurringRuleRepository,
		private txRepo: ITransactionRepository = transactionRepository,
		private walletRepo: IWalletRepository = walletRepository,
		private catRepo: ICategoryRepository = categoryRepository,
		private txService: TransactionAppService = transactionService
	) {}

	async getRules(options?: { includeDeleted?: boolean }): Promise<RecurringRuleWithDetails[]> {
		const rules = await this.recurringRepo.getAll(options);
		const [wallets, categories] = await Promise.all([
			this.walletRepo.getAll(),
			this.catRepo.getAll()
		]);

		const walletMap = new Map<string, Wallet>();
		for (const w of wallets) walletMap.set(w.id, w);

		const catMap = new Map<string, Category>();
		for (const c of categories) catMap.set(c.id, c);

		return rules.map((r) => ({
			...r,
			wallet: r.template.walletId ? walletMap.get(r.template.walletId) : undefined,
			category: r.template.categoryId ? catMap.get(r.template.categoryId) : undefined
		}));
	}

	async getRuleById(id: ULID): Promise<RecurringRuleWithDetails | undefined> {
		const rule = await this.recurringRepo.getById(id);
		if (!rule) return undefined;

		const wallet = rule.template.walletId
			? await this.walletRepo.getById(rule.template.walletId)
			: undefined;
		const category = rule.template.categoryId
			? await this.catRepo.getById(rule.template.categoryId)
			: undefined;

		return {
			...rule,
			wallet,
			category
		};
	}

	async createRule(input: RecurringRuleInput): Promise<RecurringRule> {
		const parsed = v.parse(RecurringRuleInputSchema, input);

		const wallet = await this.walletRepo.getById(parsed.walletId);
		if (!wallet || wallet.deletedAt !== null) {
			throw new Error(`Dompet dengan ID ${parsed.walletId} tidak ditemukan.`);
		}

		return this.recurringRepo.create({
			frequency: parsed.frequency,
			nextRunAt: parsed.startDate.slice(0, 10),
			autoPost: parsed.autoPost,
			template: {
				type: parsed.type,
				amount: parsed.amount,
				walletId: parsed.walletId,
				categoryId: parsed.categoryId ?? null,
				note: parsed.note?.trim() || parsed.name.trim()
			}
		});
	}

	async updateRule(id: ULID, input: UpdateRecurringRuleInput): Promise<RecurringRule> {
		const parsed = v.parse(UpdateRecurringRuleInputSchema, input);
		const existing = await this.recurringRepo.getById(id);
		if (!existing) {
			throw new Error(`Jadwal transaksi berulang dengan ID ${id} tidak ditemukan.`);
		}

		const updatedTemplate = { ...existing.template };
		if (parsed.type) updatedTemplate.type = parsed.type;
		if (parsed.amount) updatedTemplate.amount = parsed.amount;
		if (parsed.walletId) updatedTemplate.walletId = parsed.walletId;
		if (parsed.categoryId !== undefined) updatedTemplate.categoryId = parsed.categoryId;
		if (parsed.note !== undefined) updatedTemplate.note = parsed.note;
		if (parsed.name) updatedTemplate.note = parsed.name;

		const updates: Partial<Omit<RecurringRule, 'id' | 'createdAt'>> = {};
		if (parsed.frequency) updates.frequency = parsed.frequency;
		if (parsed.nextRunAt) updates.nextRunAt = parsed.nextRunAt.slice(0, 10);
		if (parsed.autoPost !== undefined) updates.autoPost = parsed.autoPost;
		updates.template = updatedTemplate;

		return this.recurringRepo.update(id, updates);
	}

	async deleteRule(id: ULID): Promise<void> {
		return this.recurringRepo.softDelete(id);
	}

	/**
	 * Eksekusi seluruh jadwal berulang yang jatuh tempo per tanggal asOfDate.
	 * Aturan:
	 * - Dijalankan saat aplikasi dibuka tanpa background job.
	 * - Mencatat SEMUA jadwal yang terlewat (catch-up penuh).
	 * - 100% IDEMPOTEN: Membuka aplikasi dua kali atau berulang kali tidak membuat transaksi ganda.
	 * - autoPost: true langsung mencatat transaksi.
	 * - autoPost: false ditandai sebagai pendingRules untuk konfirmasi pengguna.
	 */
	async runDueRecurring(asOfDate?: Date | string): Promise<RunDueRecurringResult> {
		if (this.isRunning) {
			return {
				postedCount: 0,
				postedTransactions: [],
				pendingCount: 0,
				pendingRules: []
			};
		}

		this.isRunning = true;
		const postedTransactions: Transaction[] = [];
		const pendingRules: PendingRecurringItem[] = [];

		try {
			const targetDate = asOfDate
				? (typeof asOfDate === 'string' ? asOfDate : asOfDate.toISOString()).slice(0, 10)
				: new Date().toISOString().slice(0, 10);

			const dueRules = await this.recurringRepo.getDueRules(targetDate);
			const allActiveTxs = await this.txRepo.getAllActive();

			// Kumpulkan transaksi yang sudah pernah dicatat berdasarkan (recurringId, date)
			const existingTxMap = new Set<string>();
			for (const tx of allActiveTxs) {
				if (tx.recurringId) {
					existingTxMap.add(`${tx.recurringId}_${tx.date.slice(0, 10)}`);
				}
			}

			const [wallets, categories] = await Promise.all([
				this.walletRepo.getAll(),
				this.catRepo.getAll()
			]);
			const walletMap = new Map<string, Wallet>();
			for (const w of wallets) walletMap.set(w.id, w);
			const catMap = new Map<string, Category>();
			for (const c of categories) catMap.set(c.id, c);

			for (const rule of dueRules) {
				const advance = advanceNextRunAt(rule.nextRunAt, rule.frequency, targetDate);
				if (advance.dueDates.length === 0) continue;

				if (rule.autoPost) {
					// Catat transaksi otomatis untuk setiap tanggal yang belum tercatat (idempoten)
					for (const dueDate of advance.dueDates) {
						const key = `${rule.id}_${dueDate}`;
						if (!existingTxMap.has(key)) {
							const template = rule.template;
							if (template.walletId && template.type && template.amount) {
								const tx = await this.txService.addTransaction({
									type: template.type,
									amount: template.amount,
									walletId: template.walletId,
									toWalletId: template.toWalletId ?? null,
									fee: template.fee ?? 0,
									categoryId: template.categoryId ?? null,
									date: dueDate,
									note: template.note || 'Transaksi berulang otomatis',
									recurringId: rule.id
								});
								postedTransactions.push(tx);
								existingTxMap.add(key);
							}
						}
					}
					// Majukan nextRunAt ke masa depan
					await this.recurringRepo.update(rule.id, { nextRunAt: advance.nextRunAt });
				} else {
					// Mode minta konfirmasi: filter tanggal yang belum pernah dicatat
					const unpostedDates = advance.dueDates.filter(
						(d) => !existingTxMap.has(`${rule.id}_${d}`)
					);
					if (unpostedDates.length > 0) {
						pendingRules.push({
							rule,
							dueDates: unpostedDates,
							wallet: rule.template.walletId ? walletMap.get(rule.template.walletId) : undefined,
							category: rule.template.categoryId ? catMap.get(rule.template.categoryId) : undefined
						});
					} else {
						// Jika seluruh tanggal sudah dicatat sebelumnya, majukan nextRunAt
						await this.recurringRepo.update(rule.id, { nextRunAt: advance.nextRunAt });
					}
				}
			}
		} finally {
			this.isRunning = false;
		}

		return {
			postedCount: postedTransactions.length,
			postedTransactions,
			pendingCount: pendingRules.length,
			pendingRules
		};
	}

	/**
	 * Konfirmasi manual transaksi berulang yang jatuh tempo (autoPost: false).
	 */
	async confirmPendingRecurring(ruleId: ULID, dates?: string[]): Promise<Transaction[]> {
		const rule = await this.recurringRepo.getById(ruleId);
		if (!rule) throw new Error('Aturan transaksi berulang tidak ditemukan.');

		const today = new Date().toISOString().slice(0, 10);
		const targetDates =
			dates && dates.length > 0 ? dates : getDueDates(rule.nextRunAt, rule.frequency, today);

		const created: Transaction[] = [];
		const allActiveTxs = await this.txRepo.getAllActive();
		const existingKeys = new Set(
			allActiveTxs
				.filter((t) => t.recurringId === rule.id)
				.map((t) => `${t.recurringId}_${t.date.slice(0, 10)}`)
		);

		for (const d of targetDates) {
			const key = `${rule.id}_${d.slice(0, 10)}`;
			if (!existingKeys.has(key)) {
				const template = rule.template;
				if (template.walletId && template.type && template.amount) {
					const tx = await this.txService.addTransaction({
						type: template.type,
						amount: template.amount,
						walletId: template.walletId,
						toWalletId: template.toWalletId ?? null,
						fee: template.fee ?? 0,
						categoryId: template.categoryId ?? null,
						date: d.slice(0, 10),
						note: template.note || 'Transaksi berulang dikonfirmasi',
						recurringId: rule.id
					});
					created.push(tx);
					existingKeys.add(key);
				}
			}
		}

		// Majukan tanggal nextRunAt
		const advance = advanceNextRunAt(rule.nextRunAt, rule.frequency, today);
		await this.recurringRepo.update(rule.id, { nextRunAt: advance.nextRunAt });

		return created;
	}

	/**
	 * Melewati jadwal transaksi berulang tanpa mendebet saldo/mencatat transaksi.
	 */
	async skipPendingRecurring(ruleId: ULID): Promise<void> {
		const rule = await this.recurringRepo.getById(ruleId);
		if (!rule) throw new Error('Aturan transaksi berulang tidak ditemukan.');

		const today = new Date().toISOString().slice(0, 10);
		const advance = advanceNextRunAt(rule.nextRunAt, rule.frequency, today);
		await this.recurringRepo.update(rule.id, { nextRunAt: advance.nextRunAt });
	}
}

export const recurringService = new RecurringService();
