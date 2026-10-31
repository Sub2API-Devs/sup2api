import type { PluginHost } from '@sub2api/host'

// register() waits until the test calls the release function left on globalThis.
export async function register(host: PluginHost) {
  await new Promise<void>((resolve) => ((globalThis as any).__releaseSlowPlugin = resolve))
  host.registerComponent('SlowPage', { name: 'SlowPage', render: () => null })
}
