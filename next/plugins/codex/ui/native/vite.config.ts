import { defineConfig } from 'vite'
import { sub2apiPlugin } from '@sub2api/vite-preset'

// Output: dist/entry.js (+ entry.css). vue, vue-i18n, @sub2api/ui and
// @sub2api/host are provided by the console import map (external).
export default defineConfig(sub2apiPlugin({ entry: 'src/entry.ts' }))
