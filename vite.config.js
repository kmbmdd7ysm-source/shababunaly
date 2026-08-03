import { execSync } from 'node:child_process';
import { defineConfig } from 'vite';

// Build provenance, injected so a preview can prove which commit it serves.
const git = (cmd) => {
  try {
    return execSync(cmd, { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
};
process.env.VITE_BUILD_SHA ||= git('git rev-parse HEAD');
process.env.VITE_BUILD_BRANCH ||= git('git rev-parse --abbrev-ref HEAD');
process.env.VITE_BUILD_TIME ||= new Date().toISOString();
import react from '@vitejs/plugin-react';

const buildId = String(
  process.env.VITE_BUILD_ID ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.GITHUB_SHA ||
    Date.now(),
).slice(0, 80);

export default defineConfig({
  define: { 'import.meta.env.VITE_BUILD_ID': JSON.stringify(buildId) },
  plugins: [react()],
  build: {
    outDir: 'dist',
    target: 'es2020',
    sourcemap: false,
    cssCodeSplit: true,
    reportCompressedSize: true,
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 500,
    modulePreload: { polyfill: false },
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          helmet: ['react-helmet-async'],
        },
      },
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
  },
  server: { port: 3000, open: true },
  preview: { allowedHosts: ['127.0.0.1', 'localhost'] },
});
