import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
	test: {
		// Test file discovery
		include: ['./src/tests/**/*.test.ts'],

		// Global setup
		setupFiles: ['./src/tests/setup.ts'],

		// Longer timeout for stress tests and AI API calls
		testTimeout: 120000, // 120s for real API calls (multi-iteration with AI Search)

		// Coverage configuration
		coverage: {
			provider: 'istanbul',
			include: ['src/**/*.ts'],
			exclude: [
				'src/tests/**',
				'src/**/*.d.ts',
				'src/types.ts',
			],
			reportsDirectory: './coverage',
			reporter: ['text', 'text-summary', 'html', 'json', 'lcov'],
		},

		poolOptions: {
			workers: {
				wrangler: { configPath: './wrangler.jsonc' },
				miniflare: {
					// Enable Node.js compatibility for ethers.js
					compatibilityFlags: ['nodejs_compat'],
				},
			},
		},
	},
});