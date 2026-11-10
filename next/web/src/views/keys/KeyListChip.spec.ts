import { afterEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { SChip } from '@sub2api/ui'
import { i18n } from '@/i18n'
import KeyListChip from './KeyListChip.vue'

enableAutoUnmount(afterEach)
afterEach(() => (document.body.innerHTML = ''))

const render = (items: string[] | null | undefined, slots: Record<string, string> = {}) => {
  i18n.global.locale.value = 'zh'
  return mount(KeyListChip, {
    props: { items, emptyLabel: 'Unrestricted', label: '2 entries' },
    slots,
    global: { plugins: [i18n] },
    attachTo: document.body
  })
}
type Chip = ReturnType<typeof render>
const tip = () => document.querySelector('[role="tooltip"]')
/** Tabs to the chip, as a keyboard user would: true when it took the focus. */
async function focus(w: Chip) {
  const stop = w.find<HTMLElement>('[tabindex="0"]')
  if (!stop.exists()) return false
  stop.element.focus()
  await w.vm.$nextTick()
  return document.activeElement === stop.element
}
/** The lines of the chip's tooltip once the keyboard reached it, undefined while the chip has no tooltip. */
async function listed(w: Chip) {
  await focus(w)
  return tip() ? [...tip()!.querySelectorAll('li')].map(li => li.textContent) : undefined
}

describe('API key restriction chip', () => {
  it('reads the empty label, plain and without a tooltip or a tab stop, when nothing restricts the key', async () => {
    for (const items of [[], null, undefined]) {
      const w = render(items)
      expect(w.text()).toBe('Unrestricted')
      expect(w.getComponent(SChip).props('tone')).toBe('neutral')
      expect(await focus(w)).toBe(false)
      expect(await listed(w)).toBeUndefined()
    }
  })

  it('reads the label, highlighted, and lists the entries in its tooltip', async () => {
    const w = render(['10.0.0.0/8', '203.0.113.7'])
    expect(w.text()).toBe('2 entries')
    expect(w.getComponent(SChip).props('tone')).toBe('info')
    expect(tip()).toBeNull()
    expect(await listed(w)).toEqual(['10.0.0.0/8', '203.0.113.7'])
  })

  it('opens the list for the keyboard and closes it when the focus moves on', async () => {
    const w = render(['10.0.0.0/8'])
    expect(await focus(w)).toBe(true)
    expect(tip()).not.toBeNull()
    ;(document.activeElement as HTMLElement).blur()
    await w.vm.$nextTick()
    expect(tip()).toBeNull()
  })

  it('lists ten entries at most and says how many more there are: the tooltip cannot be scrolled', async () => {
    const ips = Array.from({ length: 13 }, (_, i) => `10.0.0.${i + 1}`)
    expect(await listed(render(ips.slice(0, 10)))).toEqual(ips.slice(0, 10))
    document.body.innerHTML = ''
    expect(await listed(render(ips))).toEqual([...ips.slice(0, 10), '另 3 项'])
    expect(tip()!.querySelector('ul')!.className).not.toMatch(/overflow|max-h/)
  })

  it('draws #lead before the label and each entry through #item', async () => {
    const w = render(['a', 'b'], { lead: '<i data-testid="lead">*</i>', item: '<template #item="{ item }"><b>{{ item }}!</b></template>' })
    expect(w.text()).toBe('*2 entries')
    expect(await listed(w)).toEqual(['a!', 'b!'])
  })
})
