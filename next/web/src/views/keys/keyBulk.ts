import { onScopeDispose } from 'vue'
import { api } from '@sub2api/host'
import { confirm, toast } from '@sub2api/ui'
import type { ApiKey } from '@/api/types'
import { bulkToast } from '@/composables/bulkToast'
import { useBulkRun, type BulkOutcome } from '@/composables/useBulkRun'
import { i18n } from '@/i18n'
import { copyText } from '@/utils/format'
import { revealKey } from './reveal'

const t = i18n.global.t
const report = (out: BulkOutcome<ApiKey>) => bulkToast('apikeys.bulk', out.ok.length, out.failed)

/** What the list does after a bulk action: `changed` reloads it, `removed` gets the deleted keys. */
export interface KeyBulkHooks {
  changed: () => unknown
  removed: (keys: ApiKey[]) => unknown
}

/**
 * Bulk actions on the selected keys, one request per key (the per-key
 * endpoints, so each reveal and change is audited as usual).
 */
export function useKeyBulk(on: KeyBulkHooks) {
  const bulk = useBulkRun()
  // A run outlives the page only as far as the requests already sent.
  let left = false
  onScopeDispose(() => {
    left = true
    bulk.stop()
  })

  /** Copies "name<TAB>key" per line in the order given; keys kept only as a hash are skipped. */
  async function copy(keys: ApiKey[]) {
    const copyable = keys.filter(k => k.copyable)
    if (!copyable.length) return toast(t('apikeys.bulk.nothingToCopy'), 'warning')
    const revealed = new Map<number, string>()
    const out = await bulk.run(copyable, async k => revealed.set(k.id, await revealKey(k.id)))
    // Whoever left the page did not ask for keys on the clipboard any more.
    if (left) return
    const lines = copyable.filter(k => revealed.has(k.id)).map(k => `${k.name}\t${revealed.get(k.id)}`)
    if (!lines.length) return report(out)
    if (!(await copyText(lines.join('\n')))) return toast(t('common.copyFailed'), 'error')
    const skipped = keys.length - copyable.length
    toast(t(skipped ? 'apikeys.bulk.copiedSkipped' : 'apikeys.bulk.copied', { n: lines.length, skipped }), 'success')
    if (out.failed.length) report(out)
  }

  /** Switches the keys that are not in the state yet on or off; resolves with the ones it changed. */
  async function setStatus(keys: ApiKey[], status: 'active' | 'disabled') {
    const todo = keys.filter(k => k.status !== status)
    if (!todo.length) {
      toast(t('apikeys.bulk.nothingToChange'), 'info')
      return []
    }
    // The answer is the changed key: a selected key of another page, which no reload refreshes, takes it.
    const out = await bulk.run(todo, async k => Object.assign(k, await api.patch<ApiKey>(`/me/api-keys/${k.id}`, { status })))
    report(out)
    await on.changed()
    return out.ok
  }

  async function remove(keys: ApiKey[]) {
    if (!(await confirm({ title: t('apikeys.bulk.delete'), message: t('apikeys.bulk.confirmDelete', { n: keys.length }), danger: true })))
      return
    const out = await bulk.run(keys, k => api.del(`/me/api-keys/${k.id}`))
    report(out)
    on.removed(out.ok)
    await on.changed()
  }

  return { running: bulk.running, copy, setStatus, remove }
}
