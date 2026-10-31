import type { PluginHost } from '@sub2api/host'
import messages from './messages'
import { setHost } from './host'
import { lazyPage } from './lazy'
import './growth.css'

export function register(host: PluginHost) {
  setHost(host)
  host.addMessages(messages)
  host.registerComponent('MyReferral', lazyPage(() => import('./MyReferral.vue')))
  host.registerComponent('Checkin', lazyPage(() => import('./Checkin.vue')))
  host.registerComponent('GrowthAdmin', lazyPage(() => import('./GrowthAdmin.vue')))
}

export function unregister() {
  setHost(null)
}
