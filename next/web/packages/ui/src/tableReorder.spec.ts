import { afterEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import STable from './STable.vue'

enableAutoUnmount(afterEach)
afterEach(() => {
  document.body.innerHTML = ''
})

const columns = [{ key: 'name', label: 'Name' }]
const initial = () => [
  { id: 'a', name: 'A' },
  { id: 'b', name: 'B' },
  { id: 'c', name: 'C' }
]
const rect = (top: number, bottom: number) => ({
  top,
  bottom,
  left: 0,
  right: 400,
  width: 400,
  height: bottom - top,
  x: 0,
  y: top,
  toJSON: () => ({})
})
function setup(extra: Record<string, unknown> = {}) {
  const rows = initial()
  const wrapper = mount(STable, { attachTo: document.body, props: { columns, rows, reorderable: true, ...extra } })
  vi.spyOn(wrapper.get('table').element, 'getBoundingClientRect').mockReturnValue(rect(0, 180))
  wrapper.findAll('tr[data-reorder-row]').forEach((row, i) => {
    vi.spyOn(row.element, 'getBoundingClientRect').mockReturnValue(rect(30 + i * 50, 80 + i * 50))
  })
  return { wrapper, rows }
}
function pointer(target: EventTarget, type: string, y: number, extra: PointerEventInit = {}) {
  target.dispatchEvent(
    new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 1, button: 0, isPrimary: true, clientX: 15, clientY: y, ...extra })
  )
}

describe('STable controlled handle sorting', () => {
  it('is opt-in and preserves existing rowAttrs', () => {
    const wrapper = mount(STable, { props: { columns, rows: initial(), rowAttrs: () => ({ draggable: true }) } })
    expect(wrapper.find('[data-reorder-handle]').exists()).toBe(false)
    expect(wrapper.get('tbody tr').attributes('draggable')).toBe('true')
  })

  it.each(['mouse', 'touch'])('emits one immutable order after a %s handle drag', async pointerType => {
    const { wrapper, rows } = setup({ clickable: true, rowAttrs: () => ({ draggable: true }) })
    expect(wrapper.get('tbody tr').attributes('draggable')).toBe('false')
    const handle = wrapper.get('[data-reorder-handle="0"]')
    pointer(handle.element, 'pointerdown', 40, { pointerType })
    pointer(document, 'pointermove', 160, { pointerType })
    await flushPromises()
    expect(wrapper.get('[data-reorder-row="2"]').classes()).toContain('s-table-drop-after')
    expect(wrapper.emitted('update:rows')).toBeUndefined()
    pointer(document, 'pointerup', 160, { pointerType })
    await flushPromises()
    expect(wrapper.emitted('update:rows')).toEqual([[[rows[1], rows[2], rows[0]]]])
    expect(wrapper.emitted('reorder')?.[0]?.[0]).toMatchObject({ key: 'a', row: rows[0], from: 0, to: 2 })
    expect(rows.map(row => row.id)).toEqual(['a', 'b', 'c'])
    expect(wrapper.emitted('row-click')).toBeUndefined()
    expect(wrapper.find('.s-table-dragging').exists()).toBe(false)
  })

  it('does not start a drag from cells or commit a click / outside drop', () => {
    const { wrapper } = setup()
    pointer(wrapper.get('tbody td:last-child').element, 'pointerdown', 40)
    pointer(document, 'pointermove', 160)
    pointer(document, 'pointerup', 160)
    const handle = wrapper.get('[data-reorder-handle="0"]').element
    pointer(handle, 'pointerdown', 40)
    pointer(document, 'pointerup', 42)
    pointer(handle, 'pointerdown', 40)
    pointer(document, 'pointermove', 160)
    pointer(document, 'pointerup', 160, { clientX: 900 })
    expect(wrapper.emitted('reorder')).toBeUndefined()
  })

  it.each(['Escape', 'pointercancel', 'blur'])('cancels %s without emitting an order', async reason => {
    const { wrapper } = setup()
    const handle = wrapper.get('[data-reorder-handle="0"]')
    pointer(handle.element, 'pointerdown', 40)
    pointer(document, 'pointermove', 160)
    if (reason === 'Escape') await handle.trigger('keydown', { key: 'Escape' })
    else if (reason === 'blur') window.dispatchEvent(new Event('blur'))
    else pointer(document, 'pointercancel', 160)
    pointer(document, 'pointerup', 160)
    await flushPromises()
    expect(wrapper.emitted('reorder')).toBeUndefined()
    expect(wrapper.find('.s-table-dragging').exists()).toBe(false)
  })

  it('ignores other pointers and secondary buttons', () => {
    const { wrapper } = setup()
    const handle = wrapper.get('[data-reorder-handle="0"]').element
    pointer(handle, 'pointerdown', 40, { button: 2 })
    pointer(document, 'pointermove', 160)
    pointer(document, 'pointerup', 160)
    pointer(handle, 'pointerdown', 40)
    pointer(document, 'pointermove', 160, { pointerId: 2 })
    pointer(document, 'pointerup', 160, { pointerId: 2 })
    expect(wrapper.emitted('reorder')).toBeUndefined()
    pointer(document, 'pointercancel', 40)
  })

  it.each([{ loading: true }, { reorderDisabled: true }])('blocks disabled sorting: %j', async extra => {
    const { wrapper } = setup(extra)
    expect(wrapper.findAll('[data-reorder-handle]').every(h => h.attributes('disabled') !== undefined)).toBe(true)
    const handle = wrapper.get('[data-reorder-handle="0"]')
    pointer(handle.element, 'pointerdown', 40)
    pointer(document, 'pointermove', 160)
    pointer(document, 'pointerup', 160)
    await handle.trigger('keydown', { key: 'End' })
    expect(wrapper.emitted('reorder')).toBeUndefined()
  })

  it.each(
    [
      [
        { id: 'a', name: 'A' },
        { id: 'a', name: 'B' }
      ],
      [{ name: 'A' }, { name: 'B' }],
      [
        { id: 1, name: 'A' },
        { id: '1', name: 'B' }
      ]
    ].map(rows => ({ rows }))
  )('requires stable unique row keys', ({ rows }) => {
    const { wrapper } = setup({ rows })
    expect(wrapper.findAll('[data-reorder-handle]').every(h => h.attributes('disabled') !== undefined)).toBe(true)
  })

  it.each(['rows', 'loading', 'reorderDisabled'])('cancels an active drag when %s changes', async change => {
    const { wrapper } = setup()
    pointer(wrapper.get('[data-reorder-handle="0"]').element, 'pointerdown', 40)
    pointer(document, 'pointermove', 160)
    await wrapper.setProps(change === 'rows' ? { rows: initial().reverse() } : { [change]: true })
    pointer(document, 'pointerup', 160)
    expect(wrapper.emitted('reorder')).toBeUndefined()
  })

  it('supports keyboard sorting, parent adoption and focus without row-clicks', async () => {
    const { wrapper, rows } = setup({ clickable: true })
    await wrapper.get('[data-reorder-handle="0"]').trigger('keydown', { key: 'End' })
    expect(wrapper.emitted('update:rows')?.[0]).toEqual([[rows[1], rows[2], rows[0]]])
    await wrapper.setProps({ rows: [rows[1], rows[2], rows[0]] })
    await wrapper.get('[data-reorder-handle="2"]').trigger('keydown', { key: 'Home' })
    expect(wrapper.emitted('update:rows')?.[1]).toEqual([[rows[0], rows[1], rows[2]]])
    expect(wrapper.emitted('row-click')).toBeUndefined()
    expect(wrapper.get('[role="status"]').text()).toContain('position 1')
  })

  it('keeps expanded rows and selected identities across a reorder', async () => {
    const { wrapper, rows } = setup({ expandable: true, selectable: true, selected: ['a'] })
    await wrapper.get('[data-reorder-row="0"] button[aria-expanded]').trigger('click')
    await wrapper.get('[data-reorder-handle="0"]').trigger('keydown', { key: 'ArrowDown' })
    await wrapper.setProps({ rows: [rows[1], rows[0], rows[2]] })
    expect(wrapper.get('[data-reorder-row="1"] button[aria-expanded]').attributes('aria-expanded')).toBe('true')
    expect(wrapper.get('[data-reorder-row="1"]').classes()).toContain('s-table-selected')
    expect(wrapper.get('.s-table-expand td').attributes('colspan')).toBe('4')
  })

  it('removes active document listeners on unmount', () => {
    const { wrapper } = setup()
    pointer(wrapper.get('[data-reorder-handle="0"]').element, 'pointerdown', 40)
    pointer(document, 'pointermove', 160)
    wrapper.unmount()
    pointer(document, 'pointerup', 160)
    expect(wrapper.emitted('reorder')).toBeUndefined()
  })
})
