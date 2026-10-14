// True in a Vite dev server. Typed loosely so plugin builds whose tsconfig
// lacks vite/client still type-check the shared sources.
export const isDev = Boolean((import.meta as { env?: { DEV?: boolean } }).env?.DEV)
