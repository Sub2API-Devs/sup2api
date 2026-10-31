import type { PluginHost } from '@sub2api/host'
import ModerationDashboard from './ModerationDashboard.vue'
import messages from './messages'
import { setHost } from './host'
import './moderation.css'

// Native UI entry of the moderation plugin (manifest ui.native.entry).
// The component name matches manifest ui.pages[].component.
export function register(host: PluginHost) {
  setHost(host)
  host.addMessages(messages)
  host.registerComponent('ModerationDashboard', ModerationDashboard)
}

export function unregister() {
  setHost(null)
}
