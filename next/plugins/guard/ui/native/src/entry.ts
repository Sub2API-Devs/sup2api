import type { PluginHost } from '@sub2api/host'
import BlockedTodayCard from './BlockedTodayCard.vue'
import messages from './messages'
import { setHost } from './host'
import { lazyPage } from './lazy'

// Native UI entry of the guard plugin (manifest ui.native.entry).
// Component names match manifest ui.pages.dashboard.component and
// ui.slots[dashboard.widgets].component.
export function register(host: PluginHost) {
  setHost(host)
  host.addMessages(messages)
  host.registerComponent('GuardDashboard', lazyPage(() => import('./GuardDashboard.vue')))
  host.registerComponent('BlockedTodayCard', BlockedTodayCard)
}

export function unregister() {
  setHost(null)
}
