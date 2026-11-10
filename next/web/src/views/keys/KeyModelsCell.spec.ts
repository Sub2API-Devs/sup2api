import { afterEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import type { Group } from '@/api/types'
import KeyModelsCell from './KeyModelsCell.vue'

enableAutoUnmount(afterEach)
afterEach(() => (document.body.innerHTML = ''))

const render = (group?: Partial<Group>) => {
  i18n.global.locale.value = 'zh'
  return mount(KeyModelsCell, { props: { group: group as Group | undefined }, global: { plugins: [i18n] }, attachTo: document.body })
}
type Cell = ReturnType<typeof render>
/** The vendors whose marks lead the chip. */
const marks = (w: Cell) => w.findAll('[data-brand]').map(m => m.attributes('data-brand'))
/** The models listed in the tooltip, opened by keyboard focus. */
async function listed(w: Cell) {
  w.get<HTMLElement>('[tabindex="0"]').element.focus()
  await w.vm.$nextTick()
  return [...document.querySelectorAll('[role="tooltip"] [data-testid="model-badge"]')].map(m => m.textContent)
}

describe('API key models cell', () => {
  it('reads "unlimited" when the group lists no models', () => {
    for (const w of [render({ model_allowlist: [] }), render({ model_allowlist: [], model_filter_mode: 'blacklist' }), render({})]) {
      expect(w.text()).toBe('无限制')
      expect(marks(w)).toEqual([])
    }
  })

  it('shows a dash, not "unlimited", for a key whose group is not known: deleted, closed to the owner, or not loaded', () => {
    const w = render()
    expect(w.text()).toBe('—')
    expect(w.find('[tabindex="0"]').exists()).toBe(false)
  })

  it('counts the allowed entries behind one mark per vendor and lists them in the tooltip', async () => {
    const w = render({ model_allowlist: ['claude-sonnet-4-5', 'claude-opus-4-1', 'gpt-5'] })
    expect(w.text()).toBe('3 项')
    expect(marks(w)).toEqual(['anthropic', 'openai'])
    expect(await listed(w)).toEqual(['claude-sonnet-4-5', 'claude-opus-4-1', 'gpt-5'])
  })

  it('counts the entries a blocklist excludes', () => {
    expect(render({ model_allowlist: ['gpt-5', 'gpt-5-mini'], model_filter_mode: 'blacklist' }).text()).toBe('排除 2 项')
  })

  it('counts a pattern as one entry, not as the models it stands for', () => {
    expect(render({ model_allowlist: ['claude-*'] }).text()).toBe('1 项')
  })

  it('leads with at most three marks, a model of no known vendor by its own', () => {
    const w = render({ model_allowlist: ['claude-sonnet-4-5', 'gpt-5', 'gemini-2.5-pro', 'my-model', 'other-model'] })
    expect(marks(w)).toHaveLength(3)
    expect(render({ model_allowlist: ['my-model'] }).findAll('[data-brand]')).toHaveLength(1)
  })
})
