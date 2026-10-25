import { useI18n } from 'vue-i18n'
import { toast } from '@sub2api/ui'
import { ccSwitchLink, gatewayBase, type KeyClient } from './keyClients'

/**
 * Opens CC Switch on the import of a key for a client. The page keeps focus
 * when nothing handles ccswitch:// links, which is then pointed out.
 */
export function useCcSwitch() {
  const { t } = useI18n()
  return function open(client: KeyClient, key: string) {
    window.location.href = ccSwitchLink(client, gatewayBase(), window.location.hostname, key)
    setTimeout(() => document.hasFocus() && toast(t('apikeys.ccSwitch.notOpened'), 'info'), 1500)
  }
}
