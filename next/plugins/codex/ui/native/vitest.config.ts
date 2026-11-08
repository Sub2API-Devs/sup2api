import { fileURLToPath, URL } from 'node:url'
import base from '../../../../web/vitest.config'

// The console's unit test setup (happy-dom, the @sub2api/* aliases), rooted
// here. vue and @vue/test-utils come from the console's node_modules so the
// form and the @sub2api/ui components it renders share one Vue.
const web = (p: string) => fileURLToPath(new URL(`../../../../web/${p}`, import.meta.url))

export default {
  ...base,
  root: fileURLToPath(new URL('.', import.meta.url)),
  resolve: {
    alias: [
      ...Object.entries(base.resolve?.alias ?? {}).map(([find, replacement]) => ({ find, replacement: replacement as string })),
      { find: /^vue$/, replacement: web('node_modules/vue') },
      { find: /^@vue\/test-utils$/, replacement: web('node_modules/@vue/test-utils') }
    ]
  }
}
