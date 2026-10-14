/**
 * BudgetService - Use-case Pengelolaan Anggaran Finansial
 * Mengatur CRUD anggaran, validasi Valibot, dan sinkronisasi laporan penggunaan anggaran.
 */

import * as v from 'valibot';
import { budgetRepository, categoryRepository, transactionRepository } from '../db/repositories';
import type {
	IBudgetRepository,
	ICategoryRepository,
	ITransactionRepository
} from '../db/repositories/types';
import {
	calculateBudgetUsage,
	calculateOverallBudget,
	type BudgetUsageResult,
	type OverallBudgetSummary
} from '../domain/budget';
import type { Period } from '../domain/period';
import type { Budget, Category, ULID } from '../domain/types';
import {
	BudgetInputSchema,
	UpdateBudgetInputSchema,
	type BudgetInput,
	type UpdateBudgetInput
} from './schemas';
import { settingService, SettingService } from './settingService';

export interface BudgetWithCategoryDetail extends BudgetUsageResult {
	category?: Category;
}

export interface BudgetReportResult {
	items: BudgetWithCategoryDetail[];
	overall: OverallBudgetSummary;
	period: Period;
	periodKey: string;
}

export class BudgetService {
	constructor(
		private budgetRepo: IBudgetRepository = budgetRepository,
		private txRepo: ITransactionRepository = transactionRepository,
		private catRepo: ICategoryRepository = categoryRepository,
		private settingSvc: SettingService = settingService
	) {}

	/**
	 * Mengambil semua anggaran aktif untuk periode tertentu (misal "2026-10").
	 */
	async getBudgets(period?: string): Promise<Budget[]> {
		if (period) {
			return this.budgetRepo.getByPeriod(period);
		}
		return this.budgetRepo.getAll();
	}

	/**
	 * Mengambil anggaran berdasarkan ID.
	 */
	async getBudgetById(id: ULID): Promise<Budget | undefined> {
		return this.budgetRepo.getById(id);
	}

	/**
	 * Mengambil anggaran untuk kategori dan periode tertentu.
	 */
	async getBudgetByCategoryAndPeriod(
		categoryId: string | null,
		period: string
	): Promise<Budget | undefined> {
		return this.budgetRepo.getByCategoryAndPeriod(categoryId, period);
	}

	/**
	 * Menyimpan anggaran (Upsert: buat baru jika belum ada, perbarui jika sudah ada).
	 */
	async setBudget(input: BudgetInput): Promise<Budget> {
		const parsed = v.parse(BudgetInputSchema, input);

		const existing = await this.budgetRepo.getByCategoryAndPeriod(parsed.categoryId, parsed.period);

		if (existing) {
			return this.budgetRepo.update(existing.id, {
				limit: parsed.limit,
				alertAt: parsed.alertAt
			});
		}

		return this.budgetRepo.create({
			categoryId: parsed.categoryId,
			period: parsed.period,
			limit: parsed.limit,
			alertAt: parsed.alertAt
		});
	}

	/**
	 * Memperbarui anggaran berdasarkan ID.
	 */
	async updateBudget(id: ULID, input: UpdateBudgetInput): Promise<Budget> {
		const parsed = v.parse(UpdateBudgetInputSchema, input);
		return this.budgetRepo.update(id, parsed);
	}

	/**
	 * Soft delete anggaran berdasarkan ID.
	 */
	async deleteBudget(id: ULID): Promise<void> {
		return this.budgetRepo.softDelete(id);
	}

	/**
	 * Mengambil laporan lengkap realisasi anggaran untuk periode tertentu.
	 * Memanfaatkan fungsi domain murni calculateBudgetUsage & calculateOverallBudget.
	 */
	async getBudgetReport(period?: Period, periodKey?: string): Promise<BudgetReportResult> {
		const activePeriod = period ?? (await this.settingSvc.getCurrentReportPeriod());
		const activeKey =
			periodKey ??
			`${activePeriod.startDate.getFullYear()}-${String(activePeriod.startDate.getMonth() + 1).padStart(2, '0')}`;

		const [budgets, allTransactions, categories] = await Promise.all([
			this.budgetRepo.getByPeriod(activeKey),
			this.txRepo.getAllActive(),
			this.catRepo.getAll()
		]);

		const categoryMap = new Map<string, Category>();
		const subcategoryMap = new Map<string, string[]>();

		for (const cat of categories) {
			categoryMap.set(cat.id, cat);
			if (cat.parentId) {
				const existingSubs = subcategoryMap.get(cat.parentId) ?? [];
				existingSubs.push(cat.id);
				subcategoryMap.set(cat.parentId, existingSubs);
			}
		}

		const items: BudgetWithCategoryDetail[] = budgets.map((b) => {
			const subIds = b.categoryId ? subcategoryMap.get(b.categoryId) : undefined;
			const usage = calculateBudgetUsage(b, allTransactions, activePeriod, subIds);
			return {
				...usage,
				category: b.categoryId ? categoryMap.get(b.categoryId) : undefined
			};
		});

		// Urutkan anggaran berdasarkan persentase keterpakaian terbesar (prioritas perhatian)
		items.sort((a, b) => b.percentage - a.percentage);

		const overall = calculateOverallBudget(budgets, allTransactions, activePeriod, subcategoryMap);

		return {
			items,
			overall,
			period: activePeriod,
			periodKey: activeKey
		};
	}
}

export const budgetService = new BudgetService();
