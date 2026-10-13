import idDictionary from './id.json';

export type TranslationKey = string;

/**
 * Menerjemahkan kunci teks dari kamus bahasa Indonesia (id.json).
 * Mendukung dot notation: t('nav.beranda')
 * Mendukung parameter: t('greeting', { name: 'Budi' })
 */
export function t(key: string, params?: Record<string, string | number>): string {
	const segments = key.split('.');
	let current: unknown = idDictionary;

	for (const segment of segments) {
		if (current && typeof current === 'object' && segment in current) {
			current = (current as Record<string, unknown>)[segment];
		} else {
			return key;
		}
	}

	if (typeof current !== 'string') {
		return key;
	}

	if (!params) {
		return current;
	}

	let result = current;
	for (const [paramKey, paramValue] of Object.entries(params)) {
		result = result.replaceAll(`{${paramKey}}`, String(paramValue));
	}

	return result;
}

export default t;
