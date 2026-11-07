import type { PluginHost } from '@sub2api/host'
import { lazyPage } from '@sub2api/ui'
import AccountWeight from './AccountWeight.vue'
import DegradedBadge from './DegradedBadge.vue'
import OverrideCard from './OverrideCard.vue'
import messages from './messages'
import { setHost } from './host'
import './dynweight.css'

// Native UI entry of the dynweight plugin (manifest ui.native.entry). The
// component names match manifest ui.pages[].component and ui.slots[].component.
// The page and the account detail tab are lazy (loaded when first shown); the
// account list and editor slots are small and bundled with the entry.
export function register(host: PluginHost) {
  setHost(host)
  host.addMessages(messages)
  host.registerComponent('DynweightDashboard', lazyPage(() => import('./DynweightDashboard.vue')))
  host.registerComponent('DynweightAccountWeight', AccountWeight)
  host.registerComponent('DynweightDegradedBadge', DegradedBadge)
  host.registerComponent('DynweightAccountTab', lazyPage(() => import('./AccountTab.vue')))
  host.registerComponent('DynweightOverrideCard', OverrideCard)
}

export function unregister() {
  setHost(null)
}
