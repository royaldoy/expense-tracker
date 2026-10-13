/**
 * Utilitas pengecekan fitur pengembang (Dev Tools).
 * Hanya aktif jika environment variable VITE_DEV_TOOLS bernilai 'true' (build debug).
 * Pada build rilis standar, fitur ini dinonaktifkan secara otomatis.
 */
export function isDevToolsEnabled(env: Record<string, unknown> = import.meta.env): boolean {
	return env.VITE_DEV_TOOLS === 'true';
}
