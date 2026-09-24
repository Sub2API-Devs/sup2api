import { defineConfig, type Plugin, type UserConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url))

// Shared modules exposed to native plugins through the import map. The
// console imports the very same modules (they are rollup entries whose
// chunks the app code links to), so every singleton exists exactly once.
const SHARED: Record<string, string> = {
  vue: 'src/shared/vue.ts',
  'vue-router': 'src/shared/vue-router.ts',
  pinia: 'src/shared/pinia.ts',
  'vue-i18n': 'src/shared/vue-i18n.ts',
  '@sub2api/ui': 'packages/ui/src/index.ts',
  '@sub2api/host': 'packages/host/src/index.ts'
}
const entryName = (spec: string) => 'shared/' + spec.replace(/^@/, '').replace(/[^a-z0-9]+/gi, '-')

// Placeholder replaced by the server with a per-request CSP nonce.
const NONCE = '__CSP_NONCE__'

function importMap(): Plugin {
  return {
    name: 'sub2api:import-map',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const bundle = ctx.bundle || {}
        const imports: Record<string, string> = {}
        for (const spec of Object.keys(SHARED)) {
          const name = entryName(spec)
          const chunk = Object.values(bundle).find((c: any) => c.type === 'chunk' && c.isEntry && c.name === name) as any
          if (!chunk) throw new Error(`import map: missing shared entry ${name}`)
          imports[spec] = '/' + chunk.fileName
        }
        const json = JSON.stringify({ imports }, null, 2)
        return {
          html,
          tags: [
            {
              tag: 'script',
              attrs: { type: 'importmap', nonce: NONCE },
              children: json,
              injectTo: 'head-prepend'
            }
          ]
        }
      }
    }
  }
}

export default defineConfig(async ({ command, mode }): Promise<UserConfig> => {
  const plugins: Plugin[] = [vue(), importMap()]
  if (command === 'serve' && mode === 'mock') {
    const { mockApi } = await import('./mock/index')
    plugins.push(mockApi())
  }
  const target = process.env.VITE_API_TARGET || 'http://127.0.0.1:8080'
  return {
    base: '/',
    plugins,
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
    html: { cspNonce: NONCE },
    server: {
      port: 5173,
      proxy:
        mode === 'mock'
          ? undefined
          : {
              '/api': { target, changeOrigin: true },
              '/plugin-ui': { target, changeOrigin: true }
            }
    },
    build: {
      outDir: r('../server/web/dist'),
      emptyOutDir: true,
      target: 'es2022',
      chunkSizeWarningLimit: 1200,
      rollupOptions: {
        input: {
          index: r('./index.html'),
          ...Object.fromEntries(Object.entries(SHARED).map(([spec, file]) => [entryName(spec), r('./' + file)]))
        },
        // Keep every export of the shared entries: plugins may use any of them.
        preserveEntrySignatures: 'strict',
        output: {
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]'
        }
      }
    }
  }
})
