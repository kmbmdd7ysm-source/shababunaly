import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const coverageScope = JSON.parse(
  readFileSync(new URL('./coverage-scope.json', import.meta.url), 'utf8'),
);

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/ui/setup.js'],
    include: ['tests/ui/**/*.test.{js,jsx,ts,tsx}'],
    restoreMocks: true,
    clearMocks: true,
    mockReset: true,
    testTimeout: 20_000,
    coverage: {
      provider: 'v8',
      enabled: false,
      all: true,
      include: coverageScope.include,
      exclude: Object.keys(coverageScope.exclude || {}),
      reporter: ['text', 'json', 'json-summary', 'html', 'lcov'],
      reportsDirectory: './coverage-project',
      thresholds: coverageScope.thresholds,
    },
  },
});
