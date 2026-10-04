import { defineConfig } from 'vite'
import { sub2apiPlugin } from '@sub2api/vite-preset'

export default defineConfig(sub2apiPlugin({ entry: 'src/entry.ts' }))
