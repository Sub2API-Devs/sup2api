import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url))

// Unit tests (FE-P0-1): pure logic and composables, happy-dom for anything
// that touches the DOM. Kept apart from vite.config.ts so tests do not pull in
// the import-map / mock-server plugins.
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': r('./src'),
      '@sub2api/ui': r('./packages/ui/src/index.ts'),
      '@sub2api/host': r('./packages/host/src/index.ts')
    }
  },
  define: {
    __VUE_OPTIONS_API__: 'true',
    __VUE_PROD_DEVTOOLS__: 'false',
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false',
    __INTLIFY_JIT_COMPILATION__: 'true',
    __INTLIFY_DROP_MESSAGE_COMPILER__: 'false',
    __INTLIFY_PROD_DEVTOOLS__: 'false'
  },
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.spec.ts', 'packages/**/*.spec.ts'],
    restoreMocks: true
  }
})
