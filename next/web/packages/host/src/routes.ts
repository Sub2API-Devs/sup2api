// Core route prefixes, mirroring next/sdk/manifest/routes.go. The core owns
// the first segment of these paths and nothing else; everything else belongs
// to gateway endpoints and plugin routes (ARCHITECTURE 6.4).
//
// Keep this file free of browser APIs. vite.config.ts and the mock server
// still carry their own literals -- they live in tsconfig.node.json, which has
// no project reference to tsconfig.app.json -- but both are dev-only and never
// ship, and the day that reference exists this file is what they should import.

/** First path segments reserved by the core (manifest.CoreRouteSegments). */
export const ROUTE_API = 'api'
export const ROUTE_PLUGIN_UI = 'plugin-ui'
export const ROUTE_HEALTHZ = 'healthz'
export const CORE_ROUTE_SEGMENTS: readonly string[] = Object.freeze([ROUTE_API, ROUTE_PLUGIN_UI, ROUTE_HEALTHZ])

/** Console / admin API version served under /api. */
export const API_VERSION = 'v1'

/** Base path of the console API: every request of @sub2api/host goes here. */
export const API_BASE = `/${ROUTE_API}/${API_VERSION}`

/** Base path of plugin UI packages. Asset URLs come from the server
 *  (`UIPlugin.asset_base`); this is only for routing/proxy configuration. */
export const PLUGIN_UI_BASE = `/${ROUTE_PLUGIN_UI}`

/** Base path of a plugin's HTTP routes: /api/v1/p/<key>. */
export function pluginApiBase(key: string, apiBase: string = API_BASE): string {
  return `${apiBase}/p/${key}`
}
