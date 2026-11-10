import { afterEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import STable from './STable.vue'
import SRowAction from './SRowAction.vue'
import STableColumnSettings from './STableColumnSettings.vue'
import { useTableColumns } from './tableColumns'
import { mountPinned } from './testViewport'
import type { TableColumn } from './types'

enableAutoUnmount(afterEach)
afterEach(() => {
  document.body.innerHTML = ''
  localStorage.clear()
})

const rows = [
  {
    id: 1,
    name: 'Alpha',
    group: 'g1',
    status: 'active',
    region: 'eu',
    quota: 10,
    ip: '10.0.0.1',
    note: 'n1',
    owner: 'ann',
    zone: 'z1',
    extra: 'x1'
  },
  {
    id: 2,
    name: 'Beta',
    group: 'g2',
    status: 'disabled',
    region: 'us',
    quota: 20,
    ip: '10.0.0.2',
    note: 'n2',
    owner: 'bob',
    zone: 'z2',
    extra: 'x2'
  }
]
const declared: TableColumn[] = [
  { key: 'name', label: 'Name', mobile: 'title' },
  { key: 'group', label: 'Group', mobile: 'title' },
  { key: 'status', label: 'Status', mobile: 'status' },
  { key: 'region', label: 'Region', mobile: 'subtitle' },
  { key: 'quota', label: 'Quota', mobile: 'meta' },
  { key: 'ip', label: 'IP', format: 'ip', filterable: true, mobile: 'meta', mobileSpan: 2 },
  { key: 'note', label: 'Note' },
  { key: 'actions', label: 'Actions' }
]
const actionsSlot = { 'cell-actions': '<button class="act">Edit</button>' }
const cards = (w: ReturnType<typeof mount>) => w.findAll('ul[role="list"] > li')

describe('STable phone cards', () => {
  it('places declared fields in the title, status, subtitle, meta grid, details and footer', async () => {
    const w = mountPinned(STable, {
      props: { columns: declared, rows },
      slots: { ...actionsSlot, 'cell-status': '<b class="st">{{ params.value }}/{{ params.layout }}</b>' }
    })
    expect(w.find('table').exists()).toBe(false)
    const card = cards(w)[0]
    const title = card.get(`#${card.attributes('aria-labelledby')}`)
    expect(title.text()).toBe('Alpha · g1')
    expect(card.get('.st').text()).toBe('active/card')
    expect(card.text()).toContain('eu')
    const labels = card.findAll('dt').map(dt => dt.text())
    expect(labels).toEqual(['Quota', 'IP'])
    expect(card.findAll('dl > div')[1].classes()).toContain('col-span-2')
    await card.get('[data-testid="ip-address-filter"]').trigger('click')
    expect(w.emitted('filter')?.[0]).toEqual([declared[5], '10.0.0.1', rows[0]])
    expect(card.text()).not.toContain('n1')
    expect(card.get('.act').element.parentElement?.className).toContain('justify-end')
    const toggle = card.get('button[aria-expanded]')
    expect(toggle.text()).toBe('Details')
    await toggle.trigger('click')
    expect(toggle.attributes('aria-expanded')).toBe('true')
    expect(card.text()).toContain('n1')
    expect(card.findAll('dt').map(dt => dt.text())).toContain('Note')
    expect(w.emitted('expand')).toEqual([[rows[0], true]])
  })

  it('infers the layout when no column declares one and passes layout "table" on a wide screen', () => {
    const columns = ['name', 'status', 'region', 'quota', 'owner', 'zone', 'extra'].map(key => ({ key, label: key }))
    const w = mountPinned(STable, { props: { columns, rows } })
    const card = cards(w)[0]
    expect(card.get(`#${card.attributes('aria-labelledby')}`).text()).toBe('Alpha')
    expect(card.findAll('dt').map(dt => dt.text())).toEqual(['region', 'quota', 'owner', 'zone'])
    expect(card.text()).toContain('active')
    expect(card.text()).not.toContain('x1')
    const wide = mount(STable, { props: { columns, rows }, slots: { 'cell-name': '<i>{{ params.layout }}</i>' } })
    expect(wide.get('tbody td i').text()).toBe('table')
  })

  it('keeps the table on a phone with mobile scroll', () => {
    const w = mountPinned(STable, { props: { columns: declared, rows, mobile: 'scroll' } })
    expect(w.find('table').exists()).toBe(true)
  })

  it('selects cards one by one or the whole page, and tints selected cards', async () => {
    const w = mountPinned(STable, { props: { columns: declared, rows, selectable: true, selected: [2] } })
    expect(cards(w)[1].classes()).toContain('ring-primary-400')
    const all = w.get('input[type="checkbox"]')
    expect(all.element.parentElement?.textContent).toContain('Select this page')
    await all.setValue(true)
    expect(w.emitted('update:selected')?.[0]).toEqual([[1, 2]])
    await cards(w)[0].get('input[type="checkbox"]').setValue(true)
    expect(w.emitted('update:selected')?.[1]).toEqual([[2, 1]])
    expect(w.emitted('row-click')).toBeUndefined()
  })

  it('makes clickable cards focusable and clicks them with Enter / Space', async () => {
    const w = mountPinned(STable, { props: { columns: declared, rows, clickable: true } })
    const card = cards(w)[0]
    expect(card.attributes('tabindex')).toBe('0')
    await card.trigger('keydown', { key: 'Enter' })
    await card.trigger('keydown', { key: ' ' })
    await card.get('button[aria-expanded]').trigger('keydown', { key: 'Enter' })
    expect(w.emitted('row-click')).toEqual([[rows[0]], [rows[0]]])
  })

  it('shows skeletons while loading, the empty slot, and the error with retry', async () => {
    const loading = mountPinned(STable, { props: { columns: declared, rows: [], loading: true } })
    expect(loading.findAll('[aria-busy="true"] > div')).toHaveLength(3)
    expect(mountPinned(STable, { props: { columns: declared, rows: [] }, slots: { empty: 'Nothing here' } }).text()).toBe('Nothing here')
    const onRetry = vi.fn()
    const failed = mountPinned(STable, { props: { columns: declared, rows: [], error: true, onRetry } })
    expect(failed.get('[data-testid="table-error"]').text()).toContain('Failed to load')
    await failed.get('[data-testid="table-error"] button').trigger('click')
    expect(onRetry).toHaveBeenCalledOnce()
    const stale = mountPinned(STable, { props: { columns: declared, rows, error: true } })
    expect(stale.get('[data-testid="table-error"]').text()).toContain('Failed to load')
    expect(cards(stale)).toHaveLength(2)
  })

  it('divides items inside one card with the card prop and keeps toolbar and footer', () => {
    const w = mountPinned(STable, {
      props: { columns: declared, rows, card: true },
      slots: { toolbar: '<span class="tb">T</span>', footer: '<nav class="ft">F</nav>' }
    })
    expect(w.classes()).toContain('card')
    expect(w.get('ul').classes()).toContain('divide-y')
    expect(cards(w)[0].classes()).not.toContain('card')
    expect(w.find('.tb').exists()).toBe(true)
    expect(w.find('.ft').exists()).toBe(true)
    const separate = mountPinned(STable, { props: { columns: declared, rows } })
    expect(cards(separate)[0].classes()).toContain('card')
  })

  it('cuts a cell wider than its card at the card edge, in both card forms', async () => {
    const w = mountPinned(STable, { props: { columns: declared, rows } })
    expect(cards(w).map(c => c.classes('overflow-x-clip'))).toEqual([true, true])
    await w.setProps({ card: true })
    expect(cards(w).map(c => c.classes('overflow-x-clip'))).toEqual([true, true])
  })

  it('lets #card replace a card, with selection and expansion handles', async () => {
    const w = mountPinned(STable, {
      props: { columns: declared, rows, selectable: true, expandable: true },
      slots: {
        card: `<div class="custom">{{ params.row.name }} {{ params.selected }} {{ params.expanded }}
          <button class="sel" @click.stop="params.toggle()">s</button><button class="exp" @click.stop="params.toggleExpand()">e</button></div>`
      }
    })
    expect(cards(w)[0].get('.custom').text()).toContain('Alpha false false')
    expect(cards(w)[0].find('button[aria-expanded]').exists()).toBe(false)
    await cards(w)[0].get('.sel').trigger('click')
    expect(w.emitted('update:selected')).toEqual([[[1]]])
    await cards(w)[0].get('.exp').trigger('click')
    expect(w.emitted('expand')).toEqual([[rows[0], true]])
    expect(cards(w)[0].get('.custom').text()).toContain('true')
  })

  it('reorders cards from their handles', async () => {
    const list = [
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B' }
    ]
    const w = mountPinned(STable, {
      props: { columns: [{ key: 'name', label: 'Name' }], rows: list, reorderable: true }
    })
    expect(cards(w)[1].attributes('data-reorder-row')).toBe('1')
    await w.get('[data-reorder-handle="0"]').trigger('keydown', { key: 'ArrowDown' })
    expect(w.emitted('update:rows')?.[0]).toEqual([[list[1], list[0]]])
    await w.setProps({ rows: [list[1], list[0]] })
    await flushPromises()
    expect(document.activeElement).toBe(w.get('[data-reorder-handle="1"]').element)
  })

  it('renders SRowAction as an inline ghost button inside a card only', () => {
    const slots = { 'cell-actions': () => h(SRowAction, { icon: 'edit', label: 'Edit' }) }
    const card = mountPinned(STable, { props: { columns: declared, rows }, slots })
    const button = cards(card)[0].get('.justify-end button')
    expect(button.classes()).toEqual(expect.arrayContaining(['btn-ghost', 'btn-sm']))
    expect(button.text()).toBe('Edit')
    const table = mount(STable, { props: { columns: declared, rows }, slots })
    expect(table.get('td.s-table-actions button').classes()).toEqual(expect.arrayContaining(['btn-secondary', 'btn-xs']))
  })

  it('keeps SRowAction a table button in a scrolling table nested inside a card', async () => {
    const inner = () =>
      h(
        STable,
        { columns: [{ key: 'actions', label: 'Actions' }], rows: [{ id: 9 }], mobile: 'scroll' },
        {
          'cell-actions': () => h(SRowAction, { icon: 'edit', label: 'Nested' })
        }
      )
    const w = mountPinned(STable, { props: { columns: declared, rows, expandable: true }, slots: { expand: inner } })
    await cards(w)[0].get('button[aria-expanded]').trigger('click')
    expect(w.get('td.s-table-actions button').classes()).toContain('btn-xs')
  })

  it('re-renders card cells when the page passes new cell slots', async () => {
    const label = ref('one')
    // A page whose render passes new slot closures (or none) without reactive reads inside them.
    const w = mountPinned({
      render() {
        const text = label.value
        const slots = text === 'none' ? {} : { 'cell-name': () => `slot ${text}` }
        return h(STable, { columns: declared, rows: rows.slice(0, 1) }, slots)
      }
    })
    const title = () => w.get('li [id$="-title-0"]').text()
    expect(title()).toBe('slot one · g1')
    label.value = 'two'
    await nextTick()
    expect(title()).toBe('slot two · g1')
    label.value = 'none'
    await nextTick()
    expect(title()).toBe('Alpha · g1')
  })

  it('keeps the drag handle on a custom #card', async () => {
    const list = [
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B' }
    ]
    const w = mountPinned(STable, {
      props: { columns: [{ key: 'name', label: 'Name' }], rows: list, reorderable: true },
      slots: { card: '<p class="custom">{{ params.row.name }}</p>' }
    })
    expect(cards(w)[0].find('.custom').exists()).toBe(true)
    await w.get('li [data-reorder-handle="0"]').trigger('keydown', { key: 'End' })
    expect(w.emitted('update:rows')?.[0]).toEqual([[list[1], list[0]]])
  })
})

describe('STableColumnSettings on a phone', () => {
  it('opens a Fields bottom sheet with one checkbox row per column', async () => {
    let state!: ReturnType<typeof useTableColumns>
    const Host = defineComponent({
      setup() {
        state = useTableColumns(declared.slice(0, 3), 'phone')
        return () => h(STableColumnSettings, { state })
      }
    })
    const w = mountPinned(Host)
    const trigger = w.get('[data-testid="table-column-settings"]')
    expect(trigger.text()).toBe('Fields')
    await trigger.trigger('click')
    await nextTick()
    const sheet = document.querySelector<HTMLElement>('[role="dialog"]')!
    expect(sheet.className).toContain('s-drawer-bottom')
    expect(sheet.textContent).toContain('Fields')
    const boxes = sheet.querySelectorAll<HTMLInputElement>('li input[type="checkbox"]')
    expect(boxes).toHaveLength(3)
    expect(boxes[0].closest('label')?.className).toContain('min-h-11')
    boxes[1].click()
    await nextTick()
    expect(state.isVisible('group')).toBe(false)
  })
})
