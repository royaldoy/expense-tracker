/**
 * Konfigurasi Pengenalan Suara (Speech Recognition)
 *
 * Catatan Arsitektur:
 * Konstanta ini mengontrol perilaku pengenalan suara di seluruh aplikasi.
 * - popup: true  -> Menggunakan dialog Google Speech Recognition bawaan OS Android.
 * - popup: false -> Rekognisi berjalan di latar belakang (custom sheet/in-app UI).
 */
export const VOICE_RECOGNITION_CONFIG = {
	/**
	 * Mode UI rekognisi suara di Android:
	 * true: dialog popup Google Speech Recognizer native.
	 * false: rekognisi audio latar belakang / sheet sendiri.
	 */
	popup: true,
	/**
	 * Bahasa pengenalan suara default: Bahasa Indonesia (id-ID).
	 */
	language: 'id-ID',
	/**
	 * Teks prompt petunjuk yang tampil pada dialog popup rekognisi native.
	 */
	prompt: 'Sebutkan transaksimu',
	/**
	 * Jumlah kandidat hasil ucapan maksimum dari mesin rekognisi (maksimal 5 di Android).
	 */
	maxResults: 5
} as const;

export type VoiceRecognitionConfig = typeof VOICE_RECOGNITION_CONFIG;
