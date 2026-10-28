// Batch model test of the accounts list (selected rows, the plugin default
// model each): the run pool with its abort controller, the rows under test
// and the outcome toast. The selection itself is the list's (useSelection).
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { toast } from '@sub2api/ui'
import type { AccountLastTest, AccountTestResult } from '@/api/types'
import { errorMessage } from '@/utils/errors'
import { TEST_CONCURRENCY, lastTestOf } from './accountTest'
import { runPool } from './pool'

export interface BatchTestDeps {
  /** Records a test outcome on the row. */
  tested: (id: number, last: AccountLastTest) => void
}

export function useBatchTest(deps: BatchTestDeps) {
  const { t } = useI18n()
  const batchTesting = ref(new Set<number>())
  const batchRunning = ref(false)
  const batchDone = ref(0)
  const batchTotal = ref(0)
  let batchCtrl: AbortController | null = null
  async function batchTest(ids: number[]) {
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
    batchTesting, batchRunning, batchDone, batchTotal,
    batchTest, stopBatch
  }
}
