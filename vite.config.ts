import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// `vite build --mode hook` (npm run build:hook) produces a separate, instrumented bundle in gauntlet/scratch/dist-hook/ (git-ignored) that
// installs window.__MOLECULAR_SCENE__ (src/scene/testHook.ts) for automated draw-call / frame-time verification.
// The production bundle in dist/ never contains the hook.
export default defineConfig(({ mode }) => {
  const hook = mode === 'hook'
  return {
    plugins: [react(), tailwindcss()],
    define: hook ? { 'import.meta.env.VITE_TEST_HOOK': '"1"' } : undefined,
    build: { chunkSizeWarningLimit: 1600, ...(hook ? { outDir: 'gauntlet/scratch/dist-hook', emptyOutDir: true } : {}) },
    test: { environment: 'node', include: ['tests/**/*.test.ts'] },
  }
})
