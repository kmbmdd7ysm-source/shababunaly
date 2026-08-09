import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

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
      include: ['src/**/*.{js,jsx,ts,tsx}', 'api/**/*.{js,ts}'],
      exclude: [
        'src/data/translations.js',
        'src/data/legal.ts',
        'src/data/sizeGuide.ts',
        'src/main.jsx',
      ],
      reporter: ['text', 'json', 'json-summary', 'html', 'lcov'],
      reportsDirectory: './coverage-project',
      thresholds: { lines: 100, branches: 100, functions: 100, statements: 100 },
    },
  },
});
