import { describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { h } from 'vue'
import SSettingRow from './SSettingRow.vue'
import SSwitch from './SSwitch.vue'
import SCheckbox from './SCheckbox.vue'
import SInput from './SInput.vue'

const BESIDE = 'max-sm:grid-cols-[minmax(0,1fr)_auto]'

async function besideLabel(controls: () => unknown, props: Record<string, unknown> = {}) {
  const w = mount(SSettingRow, { props: { label: 'Setting', ...props }, slots: { default: controls } })
  await flushPromises()
  return w.classes().includes(BESIDE)
}

describe('SSettingRow on narrow screens', () => {
  it('keeps a lone switch or checkbox beside the label', async () => {
    expect(await besideLabel(() => h(SSwitch, { modelValue: true }))).toBe(true)
    expect(await besideLabel(() => h(SCheckbox, { modelValue: true, label: 'Yes' }))).toBe(true)
    expect(await besideLabel(() => h(SCheckbox, { modelValue: true, bare: true }))).toBe(true)
  })

  it('stacks other controls, several controls and stacked rows', async () => {
    expect(await besideLabel(() => h(SInput, { modelValue: '' }))).toBe(false)
    expect(await besideLabel(() => [h(SSwitch, { modelValue: true }), h(SInput, { modelValue: '' })])).toBe(false)
    expect(await besideLabel(() => h(SSwitch, { modelValue: true }), { stacked: true })).toBe(false)
  })
})
