import { defineConfig } from '@playwright/test';

export default defineConfig({
	webServer: {
		command: 'pnpm build && pnpm preview',
		port: 4173,
		reuseExistingServer: !process.env.CI
	},
	testMatch: '**/*.e2e.{ts,js}',
	workers: 1,
	use: {
		contextOptions: {
			reducedMotion: 'reduce'
		}
	}
});
