import type { CategoryKind } from './types';

export interface DefaultCategoryDefinition {
	name: string;
	kind: CategoryKind;
	icon: string;
	color: string;
	subcategories?: Array<{
		name: string;
		icon: string;
	}>;
}

export const DEFAULT_CATEGORIES: DefaultCategoryDefinition[] = [
	// PENGELUARAN
	{
		name: 'Makanan & Minuman',
		kind: 'expense',
		icon: 'restaurant',
		color: '#bc000a',
		subcategories: [
			{ name: 'Kopi & Minuman', icon: 'local_cafe' },
			{ name: 'Makanan Harian', icon: 'lunch_dining' },
			{ name: 'Restoran', icon: 'dining' },
			{ name: 'Camilan', icon: 'bakery_dining' }
		]
	},
	{
		name: 'Transportasi',
		kind: 'expense',
		icon: 'directions_car',
		color: '#0058bc',
		subcategories: [
			{ name: 'Bensin', icon: 'local_gas_station' },
			{ name: 'Ojek / Transport Online', icon: 'local_taxi' },
			{ name: 'Parkir & Tol', icon: 'local_parking' }
		]
	},
	{
		name: 'Belanja',
		kind: 'expense',
		icon: 'shopping_bag',
		color: '#006e28',
		subcategories: [
			{ name: 'Kebutuhan Pokok', icon: 'shopping_cart' },
			{ name: 'Pakaian & Mode', icon: 'apparel' },
			{ name: 'Elektronik & Gadget', icon: 'devices' }
		]
	},
	{
		name: 'Tagihan & Utilitas',
		kind: 'expense',
		icon: 'receipt_long',
		color: '#904a00',
		subcategories: [
			{ name: 'Listrik & Air', icon: 'bolt' },
			{ name: 'Pulsa & Internet', icon: 'wifi' },
			{ name: 'Langganan Digital', icon: 'subscriptions' }
		]
	},
	{
		name: 'Hiburan',
		kind: 'expense',
		icon: 'movie',
		color: '#684fa2',
		subcategories: [
			{ name: 'Bioskop & Acara', icon: 'theaters' },
			{ name: 'Hobi & Game', icon: 'sports_esports' }
		]
	},
	{
		name: 'Kesehatan',
		kind: 'expense',
		icon: 'medical_services',
		color: '#006877',
		subcategories: [
			{ name: 'Obat & Rumah Sakit', icon: 'medication' },
			{ name: 'Olahraga & Gym', icon: 'fitness_center' }
		]
	},

	// PEMASUKAN
	{
		name: 'Gaji Utama',
		kind: 'income',
		icon: 'payments',
		color: '#006e28'
	},
	{
		name: 'Bonus & THR',
		kind: 'income',
		icon: 'card_giftcard',
		color: '#0058bc'
	},
	{
		name: 'Investasi & Bunga',
		kind: 'income',
		icon: 'trending_up',
		color: '#904a00'
	},
	{
		name: 'Pemasukan Lainnya',
		kind: 'income',
		icon: 'savings',
		color: '#684fa2'
	}
];

export const SYSTEM_CATEGORY_ADJUSTMENT = 'Koreksi saldo';
