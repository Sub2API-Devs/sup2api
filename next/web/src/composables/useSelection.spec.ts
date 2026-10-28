import { describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import { useSelection } from './useSelection'
import { useBulkRun } from './useBulkRun'

type Row = { id: number; name: string; ok?: boolean }

describe('useSelection', () => {
  const setup = (loadAll?: () => Promise<Row[]>) => {
    const items = ref<Row[]>([{ id: 1, name: 'a' }, { id: 2, name: 'b' }, { id: 3, name: 'c', ok: false }])
    const sel = useSelection<Row>({ items, key: (r) => r.id, selectable: (r) => r.ok !== false, loadAll })
    return { items, sel }
  }

  it('keeps rows selected on other pages and refreshes their snapshots', async () => {
    const { items, sel } = setup()
    sel.update([1])
    items.value = [{ id: 4, name: 'd' }]
    await nextTick()
    sel.update([1, 4])
    expect(sel.rows.value.map((r) => r.name)).toEqual(['a', 'd'])
    items.value = [{ id: 1, name: 'a2' }]
    await nextTick()
    expect(sel.rows.value.map((r) => r.name)).toEqual(['a2', 'd'])
  })

  it('selects the page without unselectable rows and drops deleted ones', () => {
    const { sel } = setup()
    sel.selectPage()
    expect(sel.keys.value).toEqual([1, 2])
    expect(sel.pageSelected.value).toBe(true)
    sel.drop([1])
    expect(sel.keys.value).toEqual([2])
    expect(sel.pageSelected.value).toBe(false)
  })

  it('selects every matching result and forgets a load that was cleared', async () => {
    let resolve!: (rows: Row[]) => void
    const loadAll = vi.fn(() => new Promise<Row[]>((r) => (resolve = r)))
    const { sel } = setup(loadAll)
    const pending = sel.selectAll()
    expect(sel.selectingAll.value).toBe(true)
    resolve([{ id: 1, name: 'a' }, { id: 7, name: 'g' }, { id: 8, name: 'h', ok: false }])
    await pending
    expect(sel.keys.value).toEqual([1, 7])
    expect(sel.allSelected.value).toBe(true)
    sel.update([7])
    expect(sel.allSelected.value).toBe(false)

    const again = sel.selectAll()
    sel.clear()
    resolve([{ id: 9, name: 'i' }])
    await again
    expect(sel.keys.value).toEqual([])
    expect(sel.selectingAll.value).toBe(false)
  })
})

describe('useBulkRun', () => {
  it('limits the requests in flight, collects failures and stops starting new ones', async () => {
    const bulk = useBulkRun(2)
    let inFlight = 0
    let peak = 0
    const out = await bulk.run([1, 2, 3, 4, 5], async (n) => {
      inFlight++
      peak = Math.max(peak, inFlight)
      await new Promise((r) => setTimeout(r, 1))
      inFlight--
      if (n === 3) throw new Error('boom')
    })
    expect(peak).toBe(2)
    expect(out.ok.sort()).toEqual([1, 2, 4, 5])
    expect(out.failed.map((f) => [f.item, (f.error as Error).message])).toEqual([[3, 'boom']])
    expect(bulk.done.value).toBe(5)

    const started: number[] = []
    const stopped = await bulk.run([1, 2, 3, 4], async (n) => {
      started.push(n)
      if (n === 1) bulk.stop()
    })
    expect(started.length).toBeLessThan(4)
    expect(stopped.skipped).toBe(4 - started.length)
    expect(bulk.running.value).toBe(false)
  })
})
