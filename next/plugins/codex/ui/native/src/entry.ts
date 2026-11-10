import type { PluginHost } from '@sub2api/host'
import CodexAuthForm from './CodexAuthForm.vue'
import CodexResetTab from './CodexResetTab.vue'
import messages from './messages'
import { setHost } from './host'
import './codex.css'

// Native UI entry of the codex plugin (manifest ui.native.entry). The
// component name matches manifest accountTypes[].form.component. It is not
// wrapped in lazyPage: the account editor calls validate() through a template
// ref, which an async wrapper would not forward.
export function register(host: PluginHost) {
  setHost(host)
  host.addMessages(messages)
  host.registerComponent('CodexAuthForm', CodexAuthForm)
  host.registerComponent('CodexResetTab', CodexResetTab)
}

export function unregister() {
  setHost(null)
}
