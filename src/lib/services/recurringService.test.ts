import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import {
	DexieCategoryRepository,
	DexieRecurringRuleRepository,
	DexieTransactionRepository,
	DexieWalletRepository
} from '../db/repositories';
import { MoneyTrackerDatabase } from '../db/schema';
import { TransactionService as DbTransactionService } from '../db/transactionService';
import { RecurringService } from './recurringService';
import { TransactionAppService } from './transactionService';

describe('RecurringService Unit Tests (Dexie & Idempotency)', () => {
	let testDb: MoneyTrackerDatabase;
	let recurringRepo: DexieRecurringRuleRepository;
	let txRepo: DexieTransactionRepository;
	let walletRepo: DexieWalletRepository;
	let catRepo: DexieCategoryRepository;
	let dbTxService: DbTransactionService;
	let txAppService: TransactionAppService;
	let recurringSvc: RecurringService;

	beforeEach(async () => {
		testDb = new MoneyTrackerDatabase(`RecurringServiceTest_${Date.now()}_${Math.random()}`);
		recurringRepo = new DexieRecurringRuleRepository(testDb);
		txRepo = new DexieTransactionRepository(testDb);
		walletRepo = new DexieWalletRepository(testDb);
		catRepo = new DexieCategoryRepository(testDb);
		dbTxService = new DbTransactionService(testDb);
		txAppService = new TransactionAppService(dbTxService, txRepo, walletRepo, catRepo);
		recurringSvc = new RecurringService(recurringRepo, txRepo, walletRepo, catRepo, txAppService);
	});

	it('membuat aturan transaksi berulang dengan validasi Valibot', async () => {
		const wallet = await walletRepo.create({
			name: 'BCA',
			type: 'bank',
			openingBalance: 1000000,
			balance: 1000000,
			color: '#0058bc',
			icon: 'account_balance',
			includeInTotal: true,
			archivedAt: null
		});

		const rule = await recurringSvc.createRule({
			name: 'Langganan Netflix',
			type: 'expense',
			amount: 54000,
			walletId: wallet.id,
			frequency: 'monthly',
			startDate: '2026-10-15',
			autoPost: true
		});

		expect(rule.id).toBeDefined();
		expect(rule.frequency).toBe('monthly');
		expect(rule.nextRunAt).toBe('2026-10-15');
		expect(rule.autoPost).toBe(true);
		expect(rule.template.amount).toBe(54000);
		expect(rule.template.note).toBe('Langganan Netflix');
	});

	it('runDueRecurring dengan autoPost: true mencatat transaksi, memotong saldo, dan memajukan nextRunAt', async () => {
		const wallet = await walletRepo.create({
			name: 'GoPay',
			type: 'ewallet',
			openingBalance: 200000,
			balance: 200000,
			color: '#0070eb',
			icon: 'wallet',
			includeInTotal: true,
			archivedAt: null
		});

		// Buat aturan jatuh tempo hari ini: 2026-10-13
		const rule = await recurringRepo.create({
			frequency: 'monthly',
			nextRunAt: '2026-10-13',
			autoPost: true,
			template: {
				type: 'expense',
				amount: 50000,
				walletId: wallet.id,
				note: 'Spotify Premium'
			}
		});

		const result = await recurringSvc.runDueRecurring('2026-10-13');

		expect(result.postedCount).toBe(1);
		expect(result.postedTransactions[0].amount).toBe(50000);
		expect(result.postedTransactions[0].recurringId).toBe(rule.id);

		// Saldo dompet terpotong atomik: 200.000 - 50.000 = 150.000
		const updatedWallet = await walletRepo.getById(wallet.id);
		expect(updatedWallet?.balance).toBe(150000);

		// nextRunAt aturan maju ke bulan berikutnya (13 Nov 2026)
		const updatedRule = await recurringRepo.getById(rule.id);
		expect(updatedRule?.nextRunAt).toBe('2026-11-13');
	});

	it('runDueRecurring bersifat 100% IDEMPOTEN: membuka aplikasi dua kali berturut-turut tidak membuat transaksi ganda', async () => {
		const wallet = await walletRepo.create({
			name: 'BCA Tabungan',
			type: 'bank',
			openingBalance: 500000,
			balance: 500000,
			color: '#0058bc',
			icon: 'account_balance',
			includeInTotal: true,
			archivedAt: null
		});

		await recurringRepo.create({
			frequency: 'daily',
			nextRunAt: '2026-10-13',
			autoPost: true,
			template: {
				type: 'expense',
				amount: 20000,
				walletId: wallet.id,
				note: 'Kopi Harian'
			}
		});

		// Eksekusi pertama (aplikasi pertama kali dibuka)
		const run1 = await recurringSvc.runDueRecurring('2026-10-13');
		expect(run1.postedCount).toBe(1);

		let txs = await txRepo.getAllActive();
		expect(txs).toHaveLength(1);
		let w = await walletRepo.getById(wallet.id);
		expect(w?.balance).toBe(480000);

		// Eksekusi kedua (aplikasi dibuka kembali pada hari yang sama)
		const run2 = await recurringSvc.runDueRecurring('2026-10-13');
		expect(run2.postedCount).toBe(0); // Nol transaksi baru!

		txs = await txRepo.getAllActive();
		expect(txs).toHaveLength(1); // Tetap 1 transaksi

		w = await walletRepo.getById(wallet.id);
		expect(w?.balance).toBe(480000); // Saldo tetap konsisten tanpa duplikasi
	});

	it('runDueRecurring mencatat semua jadwal yang terlewat beberapa bulan (catch-up penuh)', async () => {
		const wallet = await walletRepo.create({
			name: 'Bank Mandiri',
			type: 'bank',
			openingBalance: 1000000,
			balance: 1000000,
			color: '#0058bc',
			icon: 'account_balance',
			includeInTotal: true,
			archivedAt: null
		});

		// Jadwal bulanan tanggal 1, terlewat sejak 1 Juli 2026
		const rule = await recurringRepo.create({
			frequency: 'monthly',
			nextRunAt: '2026-07-01',
			autoPost: true,
			template: {
				type: 'expense',
				amount: 100000,
				walletId: wallet.id,
				note: 'Iuran Hosting Bulanan'
			}
		});

		// Buka aplikasi per 13 Oktober 2026
		const result = await recurringSvc.runDueRecurring('2026-10-13');

		// 4 jadwal terlewat: 1 Juli, 1 Agu, 1 Sep, 1 Okt
		expect(result.postedCount).toBe(4);
		const dates = result.postedTransactions.map((t) => t.date);
		expect(dates).toEqual(['2026-07-01', '2026-08-01', '2026-09-01', '2026-10-01']);

		// Saldo terpotong 4 * 100.000 = 400.000 (sisa 600.000)
		const w = await walletRepo.getById(wallet.id);
		expect(w?.balance).toBe(600000);

		// nextRunAt maju ke 1 Nov 2026
		const updatedRule = await recurringRepo.getById(rule.id);
		expect(updatedRule?.nextRunAt).toBe('2026-11-01');
	});

	it('autoPost: false tidak mencatat otomatis melainkan meminta konfirmasi pengguna', async () => {
		const wallet = await walletRepo.create({
			name: 'Tunai',
			type: 'cash',
			openingBalance: 300000,
			balance: 300000,
			color: '#006e28',
			icon: 'payments',
			includeInTotal: true,
			archivedAt: null
		});

		const rule = await recurringRepo.create({
			frequency: 'monthly',
			nextRunAt: '2026-10-13',
			autoPost: false, // Minta konfirmasi
			template: {
				type: 'expense',
				amount: 75000,
				walletId: wallet.id,
				note: 'Donasi Yayasan'
			}
		});

		// Buka aplikasi
		const result = await recurringSvc.runDueRecurring('2026-10-13');

		// Nol transaksi otomatis
		expect(result.postedCount).toBe(0);
		expect(result.pendingCount).toBe(1);
		expect(result.pendingRules[0].rule.id).toBe(rule.id);
		expect(result.pendingRules[0].dueDates).toEqual(['2026-10-13']);

		// Saldo dompet belum berubah
		let w = await walletRepo.getById(wallet.id);
		expect(w?.balance).toBe(300000);

		// Pengguna mengonfirmasi pencatatan
		const confirmedTxs = await recurringSvc.confirmPendingRecurring(rule.id, ['2026-10-13']);
		expect(confirmedTxs).toHaveLength(1);
		expect(confirmedTxs[0].amount).toBe(75000);

		// Saldo dompet terpotong setelah konfirmasi
		w = await walletRepo.getById(wallet.id);
		expect(w?.balance).toBe(225000);

		// nextRunAt maju ke bulan depan
		const updatedRule = await recurringRepo.getById(rule.id);
		expect(updatedRule?.nextRunAt).toBe('2026-11-13');
	});
});
