import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import STable from './STable.vue'

enableAutoUnmount(afterEach)

const ROW = 40
const rows = Array.from({ length: 6 }, (_, i) => ({ id: i + 1, name: `r${i + 1}` }))

function render(selected: number[] = [], extra: Record<string, unknown> = {}) {
  const wrapper = mount(STable, {
    attachTo: document.body,
    props: {
      columns: [{ key: 'name', label: 'Name' }],
      rows,
      selectable: true,
      selected,
      rowSelectable: (r: Record<string, unknown>) => r.id !== 5,
      'onUpdate:selected': (keys: unknown[]) => wrapper.setProps({ selected: keys as number[] }),
      ...extra
    }
  })
  // happy-dom has no layout: row i spans [i*ROW, (i+1)*ROW).
  wrapper.findAll('tr[data-select-row]').forEach((tr) => {
    const i = Number(tr.attributes('data-select-row'))
    tr.element.getBoundingClientRect = () => ({ top: i * ROW, bottom: (i + 1) * ROW, left: 0, right: 500, width: 500, height: ROW, x: 0, y: i * ROW, toJSON: () => ({}) })
  })
  return wrapper
}
const selected = (w: ReturnType<typeof render>) => [...(w.props('selected') as number[])].sort()
const cell = (w: ReturnType<typeof render>, row: number, col = 1) => w.findAll('tr[data-select-row]')[row].findAll('td')[col]
function mouse(type: string, target: EventTarget, y: number, init: MouseEventInit = {}) {
  target.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, clientY: y, clientX: 10, button: 0, ...init }))
}

describe('STable selection gestures', () => {
  beforeEach(() => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0)
      return 0
    })
  })
  afterEach(() => vi.restoreAllMocks())

  it('drag from cell padding selects the covered rows, skipping unselectable ones, and shrinks back', async () => {
    const w = render()
    mouse('mousedown', cell(w, 1).element, 1 * ROW + 5)
    mouse('mousemove', document, 1 * ROW + 20)
    mouse('mousemove', document, 4 * ROW + 20)
    await nextTick()
    expect(selected(w)).toEqual([2, 3, 4])
    expect(document.querySelector('.s-table-swipe-band')).not.toBeNull()
    mouse('mousemove', document, 2 * ROW + 20)
    await nextTick()
    expect(selected(w)).toEqual([2, 3])
    mouse('mouseup', document, 2 * ROW + 20)
    expect(document.querySelector('.s-table-swipe-band')).toBeNull()
  })

  it('drag starting on a selected row deselects the range and leaves other rows as they were', async () => {
    const w = render([1, 2, 3, 6])
    mouse('mousedown', cell(w, 1, 0).element, 1 * ROW + 5)
    mouse('mousemove', document, 2 * ROW + 20)
    await nextTick()
    mouse('mouseup', document, 2 * ROW + 20)
    expect(selected(w)).toEqual([1, 6])
  })

  it('a press on cell content keeps text selection; a click without moving changes nothing', async () => {
    const w = render([], { columns: [{ key: 'name', label: 'Name' }] })
    const td = cell(w, 0)
    td.element.innerHTML = '<span>text</span>'
    mouse('mousedown', td.element.firstElementChild!, 5)
    mouse('mousemove', document, 3 * ROW)
    await nextTick()
    expect(selected(w)).toEqual([])
    mouse('mouseup', document, 3 * ROW)
    mouse('mousedown', cell(w, 0).element, 5)
    mouse('mouseup', document, 6)
    expect(selected(w)).toEqual([])
  })

  it('Shift+click selects the range from the previous click', async () => {
    const w = render()
    const box = (i: number) => w.findAll('tr[data-select-row]')[i].find('input[type="checkbox"]')
    await box(0).trigger('click')
    await box(5).trigger('click', { shiftKey: true })
    expect(selected(w)).toEqual([1, 2, 3, 4, 6])
    await box(3).trigger('click', { shiftKey: true })
    expect(selected(w)).toEqual([1, 2, 3])
  })

  it('swipe-select can be turned off', async () => {
    const w = render([], { swipeSelect: false })
    mouse('mousedown', cell(w, 0).element, 5)
    mouse('mousemove', document, 3 * ROW)
    await nextTick()
    mouse('mouseup', document, 3 * ROW)
    expect(selected(w)).toEqual([])
  })
})
