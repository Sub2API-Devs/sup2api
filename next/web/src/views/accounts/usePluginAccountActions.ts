// Declarative plugin account actions (manifest `ui.accountActions`, CONTRACTS
// §23.3 UI 3.6): the row menu and the bulk bar both run one through `run`,
// which confirms, POSTs `{account_ids}` to the plugin's own route (a single
// row is a one-element array; at most `max_batch` ids per request, itself
// capped at MAX_ACCOUNT_BATCH) and reports like the other bulk actions.
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api, MAX_ACCOUNT_BATCH } from '@sub2api/host'
import { confirm, toast } from '@sub2api/ui'
import type { Account } from '@/api/types'
import { lt } from '@/i18n'
import type { PluginAccountActionEntry } from '@/stores/plugins'
import { bulkToast } from './bulkToast'

export function usePluginAccountActions(reload: () => unknown) {
  const { t } = useI18n()
  const running = ref(false)

  /** Runs `entry` on `accounts` (one for a row, the selection for the bulk bar). */
  async function run(entry: PluginAccountActionEntry, accounts: Account[]) {
    if (!accounts.length || running.value) return
    const name = lt(entry.label) || entry.id
    if (entry.confirm) {
      const message = lt(entry.confirm).replace(/\{n\}/g, String(accounts.length))
      if (!(await confirm({ title: name, message, confirmText: name, danger: entry.danger }))) return
    }
    // The manifest route is "POST /reset" or a bare "/reset" (both POST).
    const path = `/p/${entry.pluginKey}/${entry.route.replace(/^POST\s+/i, '').replace(/^\//, '')}`
    // The entry's max_batch (the server fills the default), clamped to 1..MAX_ACCOUNT_BATCH.
    const size = Math.min(MAX_ACCOUNT_BATCH, Math.max(1, Math.trunc(entry.max_batch || MAX_ACCOUNT_BATCH)))
    const batches: Account[][] = []
    for (let i = 0; i < accounts.length; i += size) batches.push(accounts.slice(i, i + size))
    running.value = true
    let ok = 0
    try {
      for (const batch of batches) {
        await api.post(path, { account_ids: batch.map((a) => a.id) })
        ok += batch.length
      }
      if (accounts.length === 1) toast(t('accounts.pluginActions.done', { name }), 'success')
      else bulkToast(t, ok, [])
    } catch (error) {
      // Batches run in order: the accounts from the failed one on were not processed.
      bulkToast(t, ok, accounts.slice(ok).map((item) => ({ item, error })))
    } finally {
      running.value = false
    }
    if (ok) reload()
  }

  return { running, run }
}
