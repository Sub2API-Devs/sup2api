import { useI18n } from 'vue-i18n'
import { toast } from '@sub2api/ui'
import type { KeyApp } from './keyApps'
import { gatewayBase } from './keyClients'

/**
 * Opens an app's import link of a key, named after this console's host. The
 * page keeps focus when nothing handles the link's scheme, which is then
 * pointed out.
 */
export function useOpenApp() {
  const { t } = useI18n()
  return function open(app: Pick<KeyApp, 'app' | 'link'>, key: string) {
    window.location.href = app.link(gatewayBase(), window.location.hostname, key)
    setTimeout(() => document.hasFocus() && toast(t('apikeys.apps.notOpened', { app: app.app }), 'info'), 1500)
  }
}
