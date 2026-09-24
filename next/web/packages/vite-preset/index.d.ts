import type { UserConfig } from 'vite'
import type { Options as VueOptions } from '@vitejs/plugin-vue'

export interface Sub2apiPluginOptions {
  /** Entry module exporting register(host) / unregister(). Default "src/entry.ts". */
  entry?: string
  /** Output directory. Default "dist". */
  outDir?: string
  /** Options passed to @vitejs/plugin-vue. */
  vue?: VueOptions
  minify?: boolean
}

/** Modules provided by the console import map (always external). */
export declare const SHARED_MODULES: string[]
export declare const HOST_UI_VERSION: string
export declare function sub2apiPlugin(options?: Sub2apiPluginOptions): UserConfig
export default sub2apiPlugin
