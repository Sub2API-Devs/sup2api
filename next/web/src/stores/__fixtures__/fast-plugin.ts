import type { PluginHost } from '@sub2api/host'

export function register(host: PluginHost) {
  host.registerComponent('FastPage', { name: 'FastPage', render: () => null })
}
