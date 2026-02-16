import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    include: ['tests/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/playground/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: [
        'app/utils/**/*.ts',
        'app/composables/**/*.ts',
        'server/utils/**/*.ts',
      ],
    },
    clearMocks: true,
    restoreMocks: true,
  },
  resolve: {
    alias: {
      '~': resolve(__dirname),
      '#app': resolve(__dirname, 'tests/__mocks__/nuxt.ts'),
    },
  },
})
