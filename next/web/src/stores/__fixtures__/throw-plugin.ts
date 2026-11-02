import type { PluginHost } from '@sub2api/host'

// register() registers one component and then throws; unregister() counts its calls.
export function register(host: PluginHost) {
  host.registerComponent('HalfPage', { name: 'HalfPage', render: () => null })
  throw new Error('register blew up')
}

export function unregister() {
  const g = globalThis as { __throwPluginUnregistered?: number }
  g.__throwPluginUnregistered = (g.__throwPluginUnregistered || 0) + 1
}
