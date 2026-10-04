import type { PluginHost } from '@sub2api/host'
import MyReferral from './MyReferral.vue'
import Checkin from './Checkin.vue'
import GrowthAdmin from './GrowthAdmin.vue'
import messages from './messages'
import { setHost } from './host'
import './growth.css'

export function register(host: PluginHost) {
  setHost(host)
  host.addMessages(messages)
  host.registerComponent('MyReferral', MyReferral)
  host.registerComponent('Checkin', Checkin)
  host.registerComponent('GrowthAdmin', GrowthAdmin)
}

export function unregister() {
  setHost(null)
}
