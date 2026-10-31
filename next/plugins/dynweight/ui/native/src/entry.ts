import type { PluginHost } from '@sub2api/host'
import AccountWeight from './AccountWeight.vue'
import messages from './messages'
import { setHost } from './host'
import { lazyPage } from './lazy'
import './dynweight.css'

// Native UI entry of the dynweight plugin (manifest ui.native.entry). The
// component names match manifest ui.pages[].component and ui.slots[].component.
export function register(host: PluginHost) {
  setHost(host)
  host.addMessages(messages)
  host.registerComponent('DynweightDashboard', lazyPage(() => import('./DynweightDashboard.vue')))
  host.registerComponent('DynweightAccountWeight', AccountWeight)
}

export function unregister() {
  setHost(null)
}
