import * as v from 'valibot';

export const WalletInputSchema = v.object({
	name: v.pipe(v.string(), v.trim(), v.minLength(1, 'Nama dompet wajib diisi')),
	type: v.picklist(['ewallet', 'bank', 'cash'], 'Tipe dompet tidak valid'),
	openingBalance: v.pipe(
		v.number('Saldo awal harus berupa angka'),
		v.integer('Saldo awal harus berupa bilangan bulat Rupiah'),
		v.minValue(0, 'Saldo awal tidak boleh negatif')
	),
	color: v.pipe(v.string(), v.minLength(1, 'Warna dompet wajib dipilih')),
	icon: v.pipe(v.string(), v.minLength(1, 'Ikon dompet wajib dipilih')),
	includeInTotal: v.boolean()
});

export type WalletInput = v.InferInput<typeof WalletInputSchema>;

export const UpdateWalletInputSchema = v.partial(
	v.object({
		name: v.pipe(v.string(), v.trim(), v.minLength(1, 'Nama dompet wajib diisi')),
		type: v.picklist(['ewallet', 'bank', 'cash'], 'Tipe dompet tidak valid'),
		color: v.pipe(v.string(), v.minLength(1, 'Warna dompet wajib dipilih')),
		icon: v.pipe(v.string(), v.minLength(1, 'Ikon dompet wajib dipilih')),
		includeInTotal: v.boolean()
	})
);

export type UpdateWalletInput = v.InferInput<typeof UpdateWalletInputSchema>;

export const CategoryInputSchema = v.object({
	name: v.pipe(v.string(), v.trim(), v.minLength(1, 'Nama kategori wajib diisi')),
	kind: v.picklist(['income', 'expense'], 'Jenis kategori harus pemasukan atau pengeluaran'),
	parentId: v.nullable(v.string()),
	icon: v.pipe(v.string(), v.minLength(1, 'Ikon kategori wajib dipilih')),
	color: v.pipe(v.string(), v.minLength(1, 'Warna kategori wajib dipilih')),
	order: v.pipe(v.number(), v.integer())
});

export type CategoryInput = v.InferInput<typeof CategoryInputSchema>;

export const UpdateCategoryInputSchema = v.partial(
	v.object({
		name: v.pipe(v.string(), v.trim(), v.minLength(1, 'Nama kategori wajib diisi')),
		kind: v.picklist(['income', 'expense'], 'Jenis kategori tidak valid'),
		parentId: v.nullable(v.string()),
		icon: v.pipe(v.string(), v.minLength(1, 'Ikon kategori wajib dipilih')),
		color: v.pipe(v.string(), v.minLength(1, 'Warna kategori wajib dipilih')),
		order: v.pipe(v.number(), v.integer())
	})
);

export type UpdateCategoryInput = v.InferInput<typeof UpdateCategoryInputSchema>;

export const TransactionInputSchema = v.object({
	type: v.picklist(['income', 'expense', 'transfer'], 'Tipe transaksi tidak valid'),
	amount: v.pipe(
		v.number('Nominal harus berupa angka'),
		v.integer('Nominal harus bilangan bulat Rupiah'),
		v.minValue(1, 'Nominal transaksi harus lebih dari 0')
	),
	walletId: v.pipe(v.string(), v.minLength(1, 'Dompet wajib dipilih')),
	toWalletId: v.optional(v.nullable(v.string())),
	fee: v.optional(
		v.pipe(
			v.number('Biaya admin harus angka'),
			v.integer('Biaya admin harus bilangan bulat'),
			v.minValue(0, 'Biaya admin tidak boleh negatif')
		)
	),
	categoryId: v.optional(v.nullable(v.string())),
	date: v.pipe(v.string(), v.minLength(1, 'Tanggal wajib diisi')),
	note: v.optional(v.nullable(v.string())),
	tagIds: v.optional(v.array(v.string())),
	attachmentId: v.optional(v.nullable(v.string())),
	recurringId: v.optional(v.nullable(v.string()))
});

export type TransactionInput = v.InferInput<typeof TransactionInputSchema>;

export const UpdateTransactionInputSchema = v.partial(
	v.object({
		type: v.picklist(['income', 'expense', 'transfer'], 'Tipe transaksi tidak valid'),
		amount: v.pipe(
			v.number('Nominal harus berupa angka'),
			v.integer('Nominal harus bilangan bulat Rupiah'),
			v.minValue(1, 'Nominal transaksi harus lebih dari 0')
		),
		walletId: v.pipe(v.string(), v.minLength(1, 'Dompet wajib dipilih')),
		toWalletId: v.nullable(v.string()),
		fee: v.pipe(
			v.number('Biaya admin harus angka'),
			v.integer('Biaya admin harus bilangan bulat'),
			v.minValue(0, 'Biaya admin tidak boleh negatif')
		),
		categoryId: v.nullable(v.string()),
		date: v.pipe(v.string(), v.minLength(1, 'Tanggal wajib diisi')),
		note: v.nullable(v.string()),
		tagIds: v.array(v.string()),
		attachmentId: v.nullable(v.string()),
		recurringId: v.nullable(v.string())
	})
);

export type UpdateTransactionInput = v.InferInput<typeof UpdateTransactionInputSchema>;

export const TransferInputSchema = v.object({
	walletId: v.pipe(v.string(), v.minLength(1, 'Dompet asal wajib dipilih')),
	toWalletId: v.pipe(v.string(), v.minLength(1, 'Dompet tujuan wajib dipilih')),
	amount: v.pipe(
		v.number('Nominal harus berupa angka'),
		v.integer('Nominal harus bilangan bulat Rupiah'),
		v.minValue(1, 'Nominal transfer harus lebih dari 0')
	),
	fee: v.optional(
		v.pipe(
			v.number('Biaya admin harus angka'),
			v.integer('Biaya admin harus bilangan bulat'),
			v.minValue(0, 'Biaya admin tidak boleh negatif')
		)
	),
	date: v.pipe(v.string(), v.minLength(1, 'Tanggal wajib diisi')),
	note: v.optional(v.nullable(v.string())),
	tagIds: v.optional(v.array(v.string())),
	attachmentId: v.optional(v.nullable(v.string()))
});

export type TransferInput = v.InferInput<typeof TransferInputSchema>;

export const AdjustBalanceInputSchema = v.object({
	walletId: v.pipe(v.string(), v.minLength(1, 'ID dompet wajib diisi')),
	targetBalance: v.pipe(
		v.number('Saldo target harus berupa angka'),
		v.integer('Saldo target harus bilangan bulat Rupiah'),
		v.minValue(0, 'Saldo target tidak boleh negatif')
	),
	date: v.optional(v.string()),
	note: v.optional(v.nullable(v.string()))
});

export type AdjustBalanceInput = v.InferInput<typeof AdjustBalanceInputSchema>;

export const BudgetInputSchema = v.object({
	categoryId: v.nullable(v.string()),
	period: v.pipe(v.string(), v.minLength(7, 'Format periode tidak valid (YYYY-MM)')),
	limit: v.pipe(
		v.number('Limit anggaran harus berupa angka'),
		v.integer('Limit anggaran harus bilangan bulat Rupiah'),
		v.minValue(1, 'Limit anggaran harus lebih dari Rp0')
	),
	alertAt: v.pipe(
		v.number('Ambang batas harus berupa angka'),
		v.integer('Ambang batas harus bilangan bulat'),
		v.minValue(1, 'Ambang batas minimal 1%'),
		v.maxValue(100, 'Ambang batas maksimal 100%')
	)
});

export type BudgetInput = v.InferInput<typeof BudgetInputSchema>;

export const UpdateBudgetInputSchema = v.partial(
	v.object({
		categoryId: v.nullable(v.string()),
		period: v.pipe(v.string(), v.minLength(7, 'Format periode tidak valid (YYYY-MM)')),
		limit: v.pipe(
			v.number('Limit anggaran harus berupa angka'),
			v.integer('Limit anggaran harus bilangan bulat Rupiah'),
			v.minValue(1, 'Limit anggaran harus lebih dari Rp0')
		),
		alertAt: v.pipe(
			v.number('Ambang batas harus berupa angka'),
			v.integer('Ambang batas harus bilangan bulat'),
			v.minValue(1, 'Ambang batas minimal 1%'),
			v.maxValue(100, 'Ambang batas maksimal 100%')
		)
	})
);

export type UpdateBudgetInput = v.InferInput<typeof UpdateBudgetInputSchema>;

export const RecurringRuleInputSchema = v.object({
	name: v.pipe(v.string(), v.trim(), v.minLength(1, 'Nama jadwal wajib diisi')),
	type: v.picklist(['income', 'expense'], 'Jenis transaksi tidak valid'),
	amount: v.pipe(
		v.number('Nominal harus berupa angka'),
		v.integer('Nominal harus berupa bilangan bulat Rupiah'),
		v.minValue(1, 'Nominal transaksi harus lebih dari Rp0')
	),
	walletId: v.pipe(v.string(), v.minLength(1, 'Dompet wajib dipilih')),
	categoryId: v.optional(v.nullable(v.string())),
	frequency: v.picklist(['daily', 'weekly', 'monthly', 'yearly'], 'Frekuensi tidak valid'),
	startDate: v.pipe(v.string(), v.minLength(10, 'Tanggal mulai wajib diisi')),
	autoPost: v.boolean(),
	note: v.optional(v.nullable(v.string()))
});

export type RecurringRuleInput = v.InferInput<typeof RecurringRuleInputSchema>;

export const UpdateRecurringRuleInputSchema = v.partial(
	v.object({
		name: v.pipe(v.string(), v.trim(), v.minLength(1, 'Nama jadwal wajib diisi')),
		type: v.picklist(['income', 'expense'], 'Jenis transaksi tidak valid'),
		amount: v.pipe(
			v.number('Nominal harus berupa angka'),
			v.integer('Nominal harus berupa bilangan bulat Rupiah'),
			v.minValue(1, 'Nominal transaksi harus lebih dari Rp0')
		),
		walletId: v.pipe(v.string(), v.minLength(1, 'Dompet wajib dipilih')),
		categoryId: v.nullable(v.string()),
		frequency: v.picklist(['daily', 'weekly', 'monthly', 'yearly'], 'Frekuensi tidak valid'),
		nextRunAt: v.pipe(v.string(), v.minLength(10, 'Tanggal eksekusi tidak valid')),
		autoPost: v.boolean(),
		note: v.nullable(v.string())
	})
);

export type UpdateRecurringRuleInput = v.InferInput<typeof UpdateRecurringRuleInputSchema>;

export const NotificationSettingsSchema = v.object({
	recurringDueEnabled: v.boolean(),
	budgetAlertEnabled: v.boolean(),
	dailyReminderEnabled: v.boolean(),
	dailyReminderTime: v.pipe(
		v.string(),
		v.regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Format jam tidak valid (HH:mm)')
	)
});

export type NotificationSettingsInput = v.InferInput<typeof NotificationSettingsSchema>;

export const UpdateNotificationSettingsSchema = v.partial(NotificationSettingsSchema);

export type UpdateNotificationSettingsInput = v.InferInput<typeof UpdateNotificationSettingsSchema>;
