import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { useCheckboxModel } from './controlled'

describe('useCheckboxModel', () => {
  it('emits once for a real click, whose microtasks run between the click and change listeners', async () => {
    const emit = vi.fn()
    const { onClick, onChange } = useCheckboxModel({ modelValue: false }, emit, ref())
    onClick()
    await Promise.resolve()
    onChange({ target: { checked: true } } as unknown as Event)
    expect(emit).toHaveBeenCalledTimes(1)
    expect(emit).toHaveBeenCalledWith('update:modelValue', true)
  })

  it('emits for a change without a click', () => {
    const emit = vi.fn()
    const { onChange } = useCheckboxModel({ modelValue: false }, emit, ref())
    onChange({ target: { checked: true } } as unknown as Event)
    expect(emit).toHaveBeenCalledWith('update:modelValue', true)
  })

  it('does not swallow a later change when a click produced none', async () => {
    const emit = vi.fn()
    const { onClick, onChange } = useCheckboxModel({ modelValue: false }, emit, ref())
    onClick()
    await new Promise((r) => setTimeout(r))
    onChange({ target: { checked: true } } as unknown as Event)
    expect(emit).toHaveBeenCalledTimes(2)
  })
})
