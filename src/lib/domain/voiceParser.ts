/**
 * Voice Transaction Parser (Pure Domain - TypeScript Murni)
 * Mengurai teks ujaran bahasa Indonesia hasil speech recognition menjadi entitas transaksi:
 * tipe (expense/income/transfer), nominal integer Rupiah, kategori, dompet, tanggal, dan catatan,
 * dilengkapi flag "tidak yakin" (uncertainFlags) untuk setiap field.
 */
import type { Category, TransactionType, Wallet } from './types';

export interface VoiceUncertainFlags {
	type: boolean;
	amount: boolean;
	category: boolean;
	wallet: boolean;
	toWallet: boolean;
	date: boolean;
}

export interface ParsedVoiceTransaction {
	type: TransactionType;
	amount: number | null; // Integer Rupiah
	categoryId: string | null;
	walletId: string | null;
	toWalletId: string | null;
	date: Date;
	note: string | null;
	uncertainFlags: VoiceUncertainFlags;
	rawText: string;
}

export interface VoiceParserOptions {
	referenceDate?: Date;
}

export interface SpokenNumberMatch {
	value: number; // Integer Rupiah
	matchedText: string;
	startIndex: number;
	endIndex: number;
}

// Peta kata bilangan dasar bahasa Indonesia
const BASE_WORDS: Record<string, number> = {
	nol: 0,
	kosong: 0,
	satu: 1,
	se: 1,
	dua: 2,
	tiga: 3,
	empat: 4,
	lima: 5,
	enam: 6,
	tujuh: 7,
	delapan: 8,
	sembilan: 9,
	sepuluh: 10,
	sebelas: 11
};

// Slang nominal umum
const SLANG_WORDS: Record<string, number> = {
	goceng: 5000,
	ceban: 10000,
	gocap: 50000,
	seceng: 1000,
	noceng: 2000
};

// Kamus kata kunci semantik kategori default
const CATEGORY_KEYWORDS: Record<string, string[]> = {
	'Makanan & Minuman': [
		'kopi kenangan',
		'kopi',
		'ngopi',
		'makan siang',
		'makan malam',
		'makan pagi',
		'makan',
		'sarapan',
		'camilan',
		'snack',
		'boba',
		'martabak',
		'gorengan',
		'nasi padang',
		'nasi',
		'ayam',
		'mie',
		'bakso',
		'resto',
		'restoran',
		'kafe',
		'cafe',
		'minuman',
		'jus',
		'teh',
		'padang',
		'warteg',
		'gofood',
		'grabfood',
		'shopeefood',
		'mcd',
		'kfc',
		'starbucks'
	],
	Transportasi: [
		'bensin',
		'pertalite',
		'pertamax',
		'solar',
		'ojek',
		'gojek',
		'goride',
		'gocar',
		'grab',
		'taksi',
		'taxi',
		'parkir motor',
		'parkir mobil',
		'parkir',
		'tol',
		'servis motor',
		'servis mobil',
		'bengkel',
		'angkot',
		'kereta',
		'krl',
		'mrt',
		'transjakarta',
		'bus',
		'tiket pesawat'
	],
	Belanja: [
		'kaos kaki',
		'belanja',
		'supermarket',
		'minimarket',
		'indomaret',
		'alfamart',
		'baju',
		'kaos',
		'celana',
		'sepatu',
		'pakaian',
		'tas',
		'laptop',
		'hp',
		'gadget',
		'elektronik',
		'shopee',
		'tokopedia',
		'lazada',
		'pasar'
	],
	'Tagihan & Utilitas': [
		'listrik',
		'pln',
		'air',
		'pdam',
		'pulsa',
		'paket data',
		'kuota',
		'wifi',
		'internet',
		'indihome',
		'bpjs',
		'kos',
		'sewa kos',
		'kontrakan',
		'langganan netflix',
		'langganan spotify',
		'langganan',
		'netflix',
		'spotify',
		'youtube'
	],
	Hiburan: ['bioskop', 'cinema', 'xxi', 'film', 'game', 'steam', 'karaoke', 'wisata', 'liburan'],
	Kesehatan: ['obat', 'apotek', 'dokter', 'rumah sakit', 'klinik', 'vitamin', 'gym', 'fitness'],
	'Gaji Utama': ['gaji', 'salary', 'payroll'],
	'Bonus & THR': ['bonus', 'thr', 'hadiah', 'reward', 'angpao'],
	'Pemasukan Lainnya': ['cashback', 'pengembalian', 'refund', 'nemu', 'dikasih'],
	'Investasi & Bunga': ['dividen', 'saham', 'reksadana', 'crypto', 'bunga bank']
};

/**
 * Mengurai nominal angka dari teks ucapan bahasa Indonesia
 */
export function parseIndonesianSpokenNumber(text: string): SpokenNumberMatch | null {
	const normalized = text.toLowerCase().trim();

	// 1. Pola Angka Format Langsung (contoh: "Rp 125.500", "25.000", "12,500", "50000", "Rp1.250.000")
	const formattedRegex = /(?:rp\.?\s*)?((?:\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{2})?|\b\d+\b))/i;
	// 2. Pola Singkatan Desimal / Utuh (contoh: "1.5jt", "1,5 jt", "25rb", "50k", "8.5jt")
	const abbrRegex = /\b(\d+(?:[.,]\d+)?)\s*(k|rb|ribu|jt|juta|mio|miliar|milyar)\b/i;
	// 3. Pola Slang (contoh: "tiga ceban", "dua goceng", "goceng", "ceban", "gocap")
	const slangRegex =
		/\b(?:(satu|dua|tiga|empat|lima|enam|tujuh|delapan|sembilan|\d+)\s+)?(goceng|ceban|gocap|seceng|noceng)\b/i;
	// 4. Pola Pecahan Setengah (contoh: "setengah juta", "satu setengah juta", "dua setengah ribu", "setengah miliar")
	const fractionRegex =
		/\b(?:(satu|dua|tiga|empat|lima|enam|tujuh|delapan|sembilan|\d+)\s+)?setengah\s+(miliar|milyar|juta|jt|ribu|rb)\b/i;

	// Cek Pecahan Setengah terlebih dahulu
	const fracMatch = fractionRegex.exec(normalized);
	if (fracMatch) {
		const baseMultiplier = fracMatch[1]
			? (BASE_WORDS[fracMatch[1]] ?? parseInt(fracMatch[1], 10))
			: 0;
		const unitStr = fracMatch[2];
		let unit = 1000;
		if (unitStr.startsWith('j')) unit = 1000000;
		else if (unitStr.startsWith('m')) unit = 1000000000;

		const total = Math.round((baseMultiplier + 0.5) * unit);
		return {
			value: total,
			matchedText: fracMatch[0],
			startIndex: fracMatch.index,
			endIndex: fracMatch.index + fracMatch[0].length
		};
	}

	// Cek Slang
	const slangMatch = slangRegex.exec(normalized);
	if (slangMatch) {
		const multiplier = slangMatch[1]
			? (BASE_WORDS[slangMatch[1]] ?? parseInt(slangMatch[1], 10))
			: 1;
		const baseVal = SLANG_WORDS[slangMatch[2]] ?? 0;
		const total = multiplier * baseVal;
		return {
			value: total,
			matchedText: slangMatch[0],
			startIndex: slangMatch.index,
			endIndex: slangMatch.index + slangMatch[0].length
		};
	}

	// Cek Singkatan (k, rb, jt)
	const abbrMatch = abbrRegex.exec(normalized);
	if (abbrMatch) {
		const numPart = parseFloat(abbrMatch[1].replace(',', '.'));
		const unitPart = abbrMatch[2].toLowerCase();
		let multiplier = 1000;
		if (unitPart === 'k' || unitPart === 'rb' || unitPart === 'ribu') {
			multiplier = 1000;
		} else if (unitPart === 'jt' || unitPart === 'juta' || unitPart === 'mio') {
			multiplier = 1000000;
		} else if (unitPart === 'miliar' || unitPart === 'milyar') {
			multiplier = 1000000000;
		}

		const total = Math.round(numPart * multiplier);
		return {
			value: total,
			matchedText: abbrMatch[0],
			startIndex: abbrMatch.index,
			endIndex: abbrMatch.index + abbrMatch[0].length
		};
	}

	// Cek Format Angka Langsung
	const fmtMatch = formattedRegex.exec(normalized);
	if (fmtMatch) {
		// Bersihkan titik ribuan atau koma ribuan
		let cleanNum = fmtMatch[1].replace(/rp\.?\s*/i, '').trim();
		if (cleanNum.includes('.') && cleanNum.includes(',')) {
			cleanNum = cleanNum.replace(/\./g, '').replace(',', '.');
		} else if (cleanNum.includes('.')) {
			// e.g. 25.000 -> 25000, 1.250.000 -> 1250000
			cleanNum = cleanNum.replace(/\./g, '');
		} else if (cleanNum.includes(',')) {
			// e.g. 12,500
			cleanNum = cleanNum.replace(/,/g, '');
		}
		const val = parseInt(cleanNum, 10);
		if (!isNaN(val) && val > 0) {
			return {
				value: val,
				matchedText: fmtMatch[0],
				startIndex: fmtMatch.index,
				endIndex: fmtMatch.index + fmtMatch[0].length
			};
		}
	}

	// Cek Kata Bilangan Lengkap Bahasa Indonesia
	const wordsMatch = parseFullIndonesianWords(normalized);
	if (wordsMatch) {
		return wordsMatch;
	}

	return null;
}

/**
 * Pengurai kata bilangan teks bahasa Indonesia (contoh: "seratus empat puluh dua ribu lima ratus")
 */
function parseFullIndonesianWords(text: string): SpokenNumberMatch | null {
	// Temukan substring kata bilangan dalam teks
	const numberTokens = [
		'nol',
		'kosong',
		'satu',
		'dua',
		'tiga',
		'empat',
		'lima',
		'enam',
		'tujuh',
		'delapan',
		'sembilan',
		'sepuluh',
		'sebelas',
		'belas',
		'puluh',
		'seratus',
		'ratus',
		'seribu',
		'ribu',
		'sejuta',
		'juta',
		'semiliar',
		'miliar',
		'milyar',
		'rupiah'
	];

	const tokensRegex = new RegExp(`\\b(${numberTokens.join('|')})\\b`, 'gi');
	const matches: Array<{ word: string; index: number; length: number }> = [];

	let m: RegExpExecArray | null;
	while ((m = tokensRegex.exec(text)) !== null) {
		matches.push({
			word: m[1].toLowerCase(),
			index: m.index,
			length: m[1].length
		});
	}

	if (matches.length === 0) return null;

	// Kelompokkan token yang bersebelahan (hanya terpisah spasi)
	const clusters: Array<typeof matches> = [];
	let currentCluster: typeof matches = [matches[0]];

	for (let i = 1; i < matches.length; i++) {
		const prev = matches[i - 1];
		const curr = matches[i];
		const gap = text.substring(prev.index + prev.length, curr.index).trim();
		if (gap === '' || gap === 'dan') {
			currentCluster.push(curr);
		} else {
			clusters.push(currentCluster);
			currentCluster = [curr];
		}
	}
	clusters.push(currentCluster);

	// Ambil cluster terpanjang / paling relevan yang memiliki nilai > 0
	for (const cluster of clusters) {
		const val = computeIndonesianWordsValue(cluster.map((c) => c.word));
		if (val > 0) {
			const startIdx = cluster[0].index;
			const last = cluster[cluster.length - 1];
			const endIdx = last.index + last.length;
			return {
				value: val,
				matchedText: text.substring(startIdx, endIdx),
				startIndex: startIdx,
				endIndex: endIdx
			};
		}
	}

	return null;
}

/**
 * Menghitung nilai dari token bilangan kata Indonesia
 */
function computeIndonesianWordsValue(tokens: string[]): number {
	let total = 0;
	let currentGroup = 0;
	let currentNumber = 0;

	for (const token of tokens) {
		if (token === 'rupiah') continue;

		if (token === 'miliar' || token === 'milyar') {
			currentGroup += currentNumber;
			if (currentGroup === 0) currentGroup = 1;
			total += currentGroup * 1000000000;
			currentGroup = 0;
			currentNumber = 0;
		} else if (token === 'semiliar') {
			total += 1000000000;
			currentGroup = 0;
			currentNumber = 0;
		} else if (token === 'juta') {
			currentGroup += currentNumber;
			if (currentGroup === 0) currentGroup = 1;
			total += currentGroup * 1000000;
			currentGroup = 0;
			currentNumber = 0;
		} else if (token === 'sejuta') {
			total += 1000000;
			currentGroup = 0;
			currentNumber = 0;
		} else if (token === 'ribu') {
			currentGroup += currentNumber;
			if (currentGroup === 0) currentGroup = 1;
			total += currentGroup * 1000;
			currentGroup = 0;
			currentNumber = 0;
		} else if (token === 'seribu') {
			currentGroup += 1000;
			currentNumber = 0;
		} else if (token === 'ratus') {
			currentGroup += (currentNumber || 1) * 100;
			currentNumber = 0;
		} else if (token === 'seratus') {
			currentGroup += 100;
			currentNumber = 0;
		} else if (token === 'puluh') {
			currentGroup += (currentNumber || 1) * 10;
			currentNumber = 0;
		} else if (token === 'sepuluh') {
			currentGroup += 10;
			currentNumber = 0;
		} else if (token === 'belas') {
			currentGroup += (currentNumber || 1) + 10;
			currentNumber = 0;
		} else if (token === 'sebelas') {
			currentGroup += 11;
			currentNumber = 0;
		} else if (BASE_WORDS[token] !== undefined) {
			currentNumber = BASE_WORDS[token];
		}
	}

	total += currentGroup + currentNumber;
	return total;
}

/**
 * Fungsi utama pengurai transaksi suara (pure domain)
 */
export function parseVoiceTransaction(
	text: string,
	wallets: Wallet[],
	categories: Category[],
	options: VoiceParserOptions = {}
): ParsedVoiceTransaction {
	const refDate = options.referenceDate ?? new Date();
	const rawText = text.trim();
	const lower = rawText.toLowerCase();

	const uncertainFlags: VoiceUncertainFlags = {
		type: false,
		amount: false,
		category: false,
		wallet: false,
		toWallet: false,
		date: false
	};

	// 1. Ekstraksi Nominal
	const numberMatch = parseIndonesianSpokenNumber(lower);
	let amount: number | null = null;
	if (numberMatch && numberMatch.value > 0) {
		amount = numberMatch.value;
	} else {
		uncertainFlags.amount = true;
	}

	// 2. Ekstraksi Tanggal
	const txDate = new Date(refDate);
	if (/\b(kemarin lusa|2 hari lalu|dua hari lalu)\b/i.test(lower)) {
		txDate.setDate(txDate.getDate() - 2);
	} else if (/\b(kemarin|semalam)\b/i.test(lower)) {
		txDate.setDate(txDate.getDate() - 1);
	} else if (/\b(lusa)\b/i.test(lower)) {
		txDate.setDate(txDate.getDate() + 2);
	} else if (/\b(hari ini|tadi|barusan)\b/i.test(lower)) {
		// Hari ini
	}

	// 3. Deteksi Tipe Transaksi
	let type: TransactionType = 'expense';
	const isExplicitTransfer =
		/\b(transfer|tf|pindah(?:kan)?|kirim(?:kan)?|top\s*up|tarik tunai)\b/i.test(lower);
	const isExplicitIncome =
		/\b(terima gaji|gaji|dapat bonus|dapat cashback|cashback|bonus|pemasukan|masuk ke|refund|pengembalian|penjualan|dikasih|nemu)\b/i.test(
			lower
		) ||
		(/\b(dapat|terima)\b/i.test(lower) && !isExplicitTransfer);
	const isExplicitExpense =
		/\b(beli|membeli|bayar|membayar|jajan|makan|ongkos|belanja|pesan|isi|ngopi)\b/i.test(lower);

	if (isExplicitTransfer) {
		type = 'transfer';
	} else if (isExplicitIncome) {
		type = 'income';
	} else if (isExplicitExpense) {
		type = 'expense';
	} else {
		// Tipe tidak jelas -> fallback expense dengan flag tidak yakin
		type = 'expense';
		uncertainFlags.type = true;
	}

	// 4. Deteksi Dompet & Dompet Tujuan
	let walletId: string | null = null;
	let toWalletId: string | null = null;

	// Siapkan daftar dompet untuk pencocokan nama
	const sortedWallets = [...wallets].sort((a, b) => b.name.length - a.name.length);

	if (type === 'transfer') {
		// Cek pola khusus transfer
		// Pola: "top up [dompet B] ... dari [dompet A]"
		const topUpMatch = /top\s*up\s+([a-z0-9\s]+?)\s+(?:dari|lewat|pakai)\s+([a-z0-9\s]+)/i.exec(
			lower
		);
		// Pola: "tarik tunai ... dari [dompet A]"
		const tarikTunaiMatch = /tarik\s*tunai\b.*?\b(?:dari\s+)?([a-z0-9\s]+)/i.exec(lower);
		// Pola: "dari [dompet A] ke [dompet B]"
		const dariKeMatch = /dari\s+([a-z0-9\s]+?)\s+ke\s+([a-z0-9\s]+)/i.exec(lower);
		// Pola: "ke [dompet B] (?:dari|pakai|lewat) [dompet A]"
		const keDariMatch = /ke\s+([a-z0-9\s]+?)\s+(?:dari|pakai|lewat)\s+([a-z0-9\s]+)/i.exec(lower);

		if (tarikTunaiMatch) {
			const srcCandidate = tarikTunaiMatch[1].trim();
			const srcWallet = matchWallet(srcCandidate, sortedWallets);
			const cashWallet = sortedWallets.find((w) => w.type === 'cash' || /tunai|cash/i.test(w.name));
			walletId = srcWallet?.id ?? null;
			toWalletId = cashWallet?.id ?? null;
		} else if (topUpMatch) {
			const destCandidate = topUpMatch[1].trim();
			const srcCandidate = topUpMatch[2].trim();
			walletId = matchWallet(srcCandidate, sortedWallets)?.id ?? null;
			toWalletId = matchWallet(destCandidate, sortedWallets)?.id ?? null;
		} else if (dariKeMatch) {
			const srcCandidate = dariKeMatch[1].trim();
			const destCandidate = dariKeMatch[2].trim();
			walletId = matchWallet(srcCandidate, sortedWallets)?.id ?? null;
			toWalletId = matchWallet(destCandidate, sortedWallets)?.id ?? null;
		} else if (keDariMatch) {
			const destCandidate = keDariMatch[1].trim();
			const srcCandidate = keDariMatch[2].trim();
			walletId = matchWallet(srcCandidate, sortedWallets)?.id ?? null;
			toWalletId = matchWallet(destCandidate, sortedWallets)?.id ?? null;
		} else {
			// Cari dompet yang muncul dalam teks
			const matched = findWalletsInText(lower, sortedWallets);
			if (matched.length >= 2) {
				walletId = matched[0].id;
				toWalletId = matched[1].id;
			} else if (matched.length === 1) {
				walletId = matched[0].id;
				uncertainFlags.toWallet = true;
			}
		}

		if (!walletId) uncertainFlags.wallet = true;
		if (!toWalletId) uncertainFlags.toWallet = true;
	} else {
		// Non-transfer: cari satu dompet yang cocok
		const matched = findWalletsInText(lower, sortedWallets);
		if (matched.length === 1) {
			walletId = matched[0].id;
		} else if (matched.length > 1) {
			// Ambigu beberapa dompet muncul
			walletId = matched[0].id;
			uncertainFlags.wallet = true;
		} else {
			walletId = null;
			uncertainFlags.wallet = true;
		}
	}

	// 5. Deteksi Kategori
	let categoryId: string | null = null;
	if (type === 'transfer') {
		categoryId = null; // Transfer tidak memiliki kategori
		uncertainFlags.category = false;
	} else {
		// Prioritaskan kategori yang cocok persis dengan jenis transaksi (income / expense)
		const candidateCategories = categories.filter((c) => c.kind === type);
		categoryId = matchCategory(
			lower,
			candidateCategories.length > 0 ? candidateCategories : categories
		);

		if (!categoryId) {
			uncertainFlags.category = true;
		}
	}

	// 6. Ekstraksi Catatan (Note)
	const note = extractNote(rawText, {
		type,
		amountMatch: numberMatch,
		wallets: sortedWallets.filter((w) => w.id === walletId || w.id === toWalletId),
		categoryName: categories.find((c) => c.id === categoryId)?.name ?? null
	});

	return {
		type,
		amount,
		categoryId,
		walletId,
		toWalletId,
		date: txDate,
		note,
		uncertainFlags,
		rawText
	};
}

/**
 * Mencari kecocokan dompet dari kata atau substring
 */
function matchWallet(text: string, wallets: Wallet[]): Wallet | null {
	const clean = text.toLowerCase().trim();
	for (const w of wallets) {
		const wName = w.name.toLowerCase();
		if (clean.includes(wName)) return w;
		// Alias untuk tunai / cash
		if (
			(clean.includes('tunai') || clean.includes('cash')) &&
			(w.type === 'cash' || wName.includes('tunai'))
		) {
			return w;
		}
	}
	return null;
}

/**
 * Menemukan semua dompet yang disebutkan dalam kalimat
 */
function findWalletsInText(text: string, wallets: Wallet[]): Wallet[] {
	const found: Wallet[] = [];
	for (const w of wallets) {
		const wName = w.name.toLowerCase();
		const regex = new RegExp(`\\b(${wName}|${wName.replace(/\s+/g, '')})\\b`, 'i');
		if (regex.test(text)) {
			found.push(w);
		} else if (
			(w.type === 'cash' || wName.includes('tunai')) &&
			/\b(tunai|cash|uang tunai)\b/i.test(text)
		) {
			if (!found.includes(w)) found.push(w);
		}
	}
	return found;
}

/**
 * Mencari kategori yang paling relevan berdasarkan nama atau kata kunci semantik
 */
function matchCategory(text: string, categories: Category[]): string | null {
	// 1. Cek kecocokan langsung nama kategori
	for (const cat of categories) {
		const catName = cat.name.toLowerCase();
		const regex = new RegExp(`\\b${escapeRegExp(catName)}\\b`, 'i');
		if (regex.test(text)) {
			return cat.id;
		}
	}

	// 2. Kumpulkan semua kata kunci semantik dan urutkan berdasarkan panjang teks menurun (longest match first)
	const allKeywords: Array<{ keyword: string; categoryName: string }> = [];
	for (const [catName, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
		for (const kw of keywords) {
			allKeywords.push({ keyword: kw.toLowerCase(), categoryName: catName });
		}
	}
	allKeywords.sort((a, b) => b.keyword.length - a.keyword.length);

	for (const item of allKeywords) {
		const regex = new RegExp(`\\b${escapeRegExp(item.keyword)}\\b`, 'i');
		if (regex.test(text)) {
			const matchedCat = categories.find(
				(c) => c.name.toLowerCase() === item.categoryName.toLowerCase()
			);
			if (matchedCat) return matchedCat.id;
		}
	}

	return null;
}

/**
 * Ekstraksi deskripsi catatan (note) dengan membersihkan kata kunci teknis transaksi
 */
function extractNote(
	rawText: string,
	context: {
		type: TransactionType;
		amountMatch: SpokenNumberMatch | null;
		wallets: Wallet[];
		categoryName: string | null;
	}
): string | null {
	if (context.type === 'transfer') {
		const src = context.wallets[0]?.name ?? 'Dompet';
		const dest = context.wallets[1]?.name ?? 'Dompet';
		if (/top\s*up/i.test(rawText)) {
			return `Top up ${dest} dari ${src}`;
		}
		if (/tarik\s*tunai/i.test(rawText)) {
			return `Tarik tunai dari ${src}`;
		}
		return `Transfer ${src} ke ${dest}`;
	}

	let cleaned = rawText;

	// Hapus nominal yang cocok
	if (context.amountMatch) {
		const start = context.amountMatch.startIndex;
		const end = context.amountMatch.endIndex;
		cleaned = cleaned.substring(0, start) + ' ' + cleaned.substring(end);
	}

	// Hapus nama dompet yang cocok
	for (const w of context.wallets) {
		cleaned = cleaned.replace(new RegExp(`\\b${escapeRegExp(w.name)}\\b`, 'gi'), '');
	}
	cleaned = cleaned.replace(/\b(uang tunai|tunai|cash)\b/gi, '');

	// Hapus kata penunjuk tanggal
	cleaned = cleaned.replace(
		/\b(kemarin lusa|2 hari lalu|dua hari lalu|kemarin|semalam|hari ini|tadi siang|tadi pagi|tadi|lusa|barusan)\b/gi,
		''
	);

	// Hapus kata kerja dan preposisi transaksi
	cleaned = cleaned.replace(
		/\b(beli|membeli|bayar|membayar|terima|dapat|didapat|masuk ke|masuk|pakai|lewat|dengan|di|dari|ke|buat|untuk)\b/gi,
		''
	);

	// Hapus sisa kata "rupiah", "rp"
	cleaned = cleaned.replace(/\b(rupiah|rp)\b/gi, '');

	// Bersihkan spasi ganda
	cleaned = cleaned.replace(/\s+/g, ' ').trim();

	if (!cleaned) {
		// Fallback ke nama kategori bila ada
		return context.categoryName ?? (context.type === 'income' ? 'Pemasukan' : 'Pengeluaran');
	}

	// Huruf pertama kapital
	return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function escapeRegExp(string: string) {
	return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
