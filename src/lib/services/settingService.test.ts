import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { DexieSettingRepository } from '../db/repositories/settingRepository';
import { MoneyTrackerDatabase } from '../db/schema';
import { SettingService } from './settingService';

describe('SettingService Unit Test', () => {
	let testDb: MoneyTrackerDatabase;
	let settingRepo: DexieSettingRepository;
	let settingSvc: SettingService;

	beforeEach(() => {
		testDb = new MoneyTrackerDatabase(`SettingTest_${Date.now()}_${Math.random()}`);
		settingRepo = new DexieSettingRepository(testDb);
		settingSvc = new SettingService(settingRepo);
	});

	it('mengembalikan default salaryDay 1 saat belum diatur', async () => {
		const day = await settingSvc.getSalaryDay();
		expect(day).toBe(1);
	});

	it('menyimpan dan membaca salaryDay yang valid', async () => {
		await settingSvc.setSalaryDay(25);
		const day = await settingSvc.getSalaryDay();
		expect(day).toBe(25);
	});

	it('meng-clamp salaryDay jika di luar batas 1-31', async () => {
		await settingSvc.setSalaryDay(35);
		expect(await settingSvc.getSalaryDay()).toBe(31);

		await settingSvc.setSalaryDay(-5);
		expect(await settingSvc.getSalaryDay()).toBe(1);
	});

	it('menghasilkan periode aktif sesuai salaryDay yang tersimpan', async () => {
		await settingSvc.setSalaryDay(25);
		const period = await settingSvc.getCurrentReportPeriod();
		expect(period.startDay).toBe(25);
		expect(period.startDate).toBeInstanceOf(Date);
		expect(period.endDate).toBeInstanceOf(Date);
	});
});
