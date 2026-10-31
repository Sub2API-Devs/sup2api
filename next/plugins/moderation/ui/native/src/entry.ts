import type { PluginHost } from '@sub2api/host'
import messages from './messages'
import { setHost } from './host'
import { lazyPage } from './lazy'
import { unwatchSession, watchSession } from './session'
import './moderation.css'

// Native UI entry of the moderation plugin (manifest ui.native.entry).
// The component name matches manifest ui.pages[].component.
export function register(host: PluginHost) {
  setHost(host)
  host.addMessages(messages)
  host.registerComponent('ModerationDashboard', lazyPage(() => import('./ModerationDashboard.vue')))
  watchSession()
}

export function unregister() {
  unwatchSession()
  setHost(null)
}
