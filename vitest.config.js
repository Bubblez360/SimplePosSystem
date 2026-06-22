import { defineConfig } from 'vitest/config'

// Separate from vite.config.js so the PWA plugin doesn't run under tests.
export default defineConfig({
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.test.{js,jsx}'],
  },
})
