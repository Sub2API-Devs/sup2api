// Batch model test of the accounts list (selected rows, the plugin default
// model each): the selection, the run pool with its abort controller and the
// outcome toast.
import { computed, ref, type ComputedRef, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { toast } from '@sub2api/ui'
import type { Account, AccountLastTest, AccountTestResult } from '@/api/types'
import { errorMessage } from '@/utils/errors'
import { TEST_CONCURRENCY, lastTestOf } from './accountTest'
import { runPool } from './pool'

export interface BatchTestDeps {
  /** The rows of the current page. */
  items: ComputedRef<Account[]>
  /** Accounts the caller may test (and that still exist). */
  testable: (a: Account) => boolean
  /** Records a test outcome on the row. */
  tested: (id: number, last: AccountLastTest) => void
}

export function useBatchTest(deps: BatchTestDeps) {
  const { t } = useI18n()
  const picked = ref(new Set<number>())
  const batchTesting = ref(new Set<number>())
  const batchRunning = ref(false)
  const batchDone = ref(0)
  const batchTotal = ref(0)
  let batchCtrl: AbortController | null = null
  const pageTestable = computed(() => deps.items.value.filter(deps.testable))
  const allPicked = computed(() => pageTestable.value.length > 0 && pageTestable.value.every((a) => picked.value.has(a.id)))
  const somePicked = computed(() => !allPicked.value && pageTestable.value.some((a) => picked.value.has(a.id)))

  function pickRow(id: number, v: boolean) {
    const next = new Set(picked.value)
    if (v) next.add(id)
    else next.delete(id)
    picked.value = next
  }
  function pickPage(v: boolean) {
    const next = new Set(picked.value)
    for (const a of pageTestable.value) {
      if (v) next.add(a.id)
      else next.delete(a.id)
    }
    picked.value = next
  }
  function clear() {
    picked.value = new Set()
  }

  async function batchTest() {
    const ids = [...picked.value]
    if (batchRunning.value || !ids.length) return
    batchRunning.value = true
    batchDone.value = 0
    batchTotal.value = ids.length
    batchCtrl = new AbortController()
    let ok = 0
    let failed = 0
    try {
      await runPool(ids, TEST_CONCURRENCY, async (id) => {
        batchTesting.value = new Set(batchTesting.value).add(id)
        try {
          const r = await api.post<AccountTestResult>(`/accounts/${id}/test`, {}, { signal: AbortSignal.timeout(120000) })
          if (r.ok) ok++
          else failed++
          deps.tested(id, lastTestOf(r, ''))
        } catch (e) {
          failed++
          deps.tested(id, { at: new Date().toISOString(), ok: false, latency_ms: 0, model: '', message: errorMessage(e) })
        } finally {
          const next = new Set(batchTesting.value)
          next.delete(id)
          batchTesting.value = next
          batchDone.value++
        }
      }, batchCtrl.signal)
    } finally {
      batchRunning.value = false
      batchCtrl = null
    }
    toast(t('accounts.batchTest.done', { ok, fail: failed }), failed ? 'warning' : 'success')
  }
  function stopBatch() {
    batchCtrl?.abort()
  }

  return {
    picked: picked as Ref<Set<number>>,
    batchTesting, batchRunning, batchDone, batchTotal,
    pageTestable, allPicked, somePicked,
    pickRow, pickPage, clear, batchTest, stopBatch
  }
}
