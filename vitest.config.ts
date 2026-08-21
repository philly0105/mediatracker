import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    // LibraryView.test.tsx stubs IntersectionObserver three times and never
    // unstubs it — restoreAllMocks does not cover stubGlobal — which leaked a
    // fake constructor into whichever file the worker picked up next. That was
    // the intermittent full-suite failure.
    restoreMocks: true,
    unstubGlobals: true,
    clearMocks: true,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
})
