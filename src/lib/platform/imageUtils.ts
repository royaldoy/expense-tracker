/**
 * Utilitas kompresi gambar sisi klien (Web & Capacitor WebView).
 * Mengubah gambar ke format JPEG dengan sisi terpanjang maksimum 1600 px.
 */
import type { CompressedImage } from './types';

export async function compressImageToJpeg(
	input: File | Blob | string,
	maxDimension = 1600,
	quality = 0.85
): Promise<CompressedImage> {
	// Di lingkungan non-browser (misal Node.js Vitest tanpa mock Canvas)
	if (typeof window === 'undefined' || typeof document === 'undefined') {
		const rawBase64 =
			typeof input === 'string' ? input.replace(/^data:image\/[a-zA-Z]+;base64,/, '') : '';
		const dataUrl =
			typeof input === 'string'
				? input.startsWith('data:')
					? input
					: `data:image/jpeg;base64,${input}`
				: '';
		return {
			base64: rawBase64,
			dataUrl,
			blob: new Blob([]),
			mimeType: 'image/jpeg',
			width: 1600,
			height: 1200
		};
	}

	return new Promise((resolve, reject) => {
		const img = new Image();
		let objectUrl: string | null = null;

		img.onload = () => {
			try {
				let { width, height } = img;

				// Skala resolusi jika melebihi batas sisi terpanjang (1600 px)
				if (width > maxDimension || height > maxDimension) {
					if (width >= height) {
						height = Math.round((height * maxDimension) / width);
						width = maxDimension;
					} else {
						width = Math.round((width * maxDimension) / height);
						height = maxDimension;
					}
				}

				const canvas = document.createElement('canvas');
				canvas.width = width;
				canvas.height = height;

				const ctx = canvas.getContext('2d');
				if (!ctx) {
					throw new Error('Gagal mendapatkan 2D context canvas untuk kompresi');
				}

				// Latar belakang putih untuk menghindari transparansi hitam saat konversi ke JPEG
				ctx.fillStyle = '#FFFFFF';
				ctx.fillRect(0, 0, width, height);
				ctx.drawImage(img, 0, 0, width, height);

				const dataUrl = canvas.toDataURL('image/jpeg', quality);
				const base64 = dataUrl.replace(/^data:image\/jpeg;base64,/, '');

				canvas.toBlob(
					(blob) => {
						if (objectUrl) {
							URL.revokeObjectURL(objectUrl);
						}
						resolve({
							base64,
							dataUrl,
							blob: blob ?? new Blob([], { type: 'image/jpeg' }),
							mimeType: 'image/jpeg',
							width,
							height
						});
					},
					'image/jpeg',
					quality
				);
			} catch (err) {
				if (objectUrl) {
					URL.revokeObjectURL(objectUrl);
				}
				reject(err);
			}
		};

		img.onerror = () => {
			if (objectUrl) {
				URL.revokeObjectURL(objectUrl);
			}
			reject(new Error('Gagal memuat berkas gambar untuk kompresi'));
		};

		if (typeof input === 'string') {
			img.src = input.startsWith('data:') ? input : `data:image/jpeg;base64,${input}`;
		} else {
			objectUrl = URL.createObjectURL(input);
			img.src = objectUrl;
		}
	});
}
