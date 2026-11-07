import { afterEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import SPagination from './SPagination.vue'
import { mountCompact } from './testViewport'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('SPagination on a phone', () => {
  it('shows the total and ‹ page / pages › with 40px arrows', async () => {
    const w = mountCompact(SPagination, { page: 3, pageSize: 20, total: 240 })
    expect(w.text()).toContain('Total 240')
    expect(w.find('button[aria-current="page"]').exists()).toBe(false)
    const label = w.get('[data-testid="page-jump"]')
    expect(label.text()).toBe('3 / 12')
    expect(label.attributes('aria-label')).toBe('Page 3 of 12')
    const next = w.get('button[aria-label="Next"]')
    expect(next.classes()).toContain('h-10')
    await next.trigger('click')
    expect(w.emitted('update:page')).toEqual([[4]])
  })

  it('jumps to a typed page (clamped) and picks the page size from the sheet', async () => {
    const w = mountCompact(SPagination, { page: 3, pageSize: 20, total: 240 })
    await w.get('[data-testid="page-jump"]').trigger('click')
    const input = document.querySelector<HTMLInputElement>('[data-testid="page-jump-input"]')!
    expect(input.value).toBe('3')
    input.value = '99'
    input.dispatchEvent(new Event('input'))
    await nextTick()
    input.form!.dispatchEvent(new Event('submit'))
    await nextTick()
    expect(w.emitted('update:page')).toEqual([[12]])
    expect(document.querySelector('[data-testid="page-jump-input"]')).toBeNull()

    await w.get('[data-testid="page-jump"]').trigger('click')
    const radio = document.querySelector<HTMLInputElement>('input[type="radio"][value="50"]')!
    radio.checked = true
    radio.dispatchEvent(new Event('change'))
    expect(w.emitted('update:pageSize')).toEqual([[50]])
    expect(w.emitted('update:page')?.at(-1)).toEqual([1])
  })

  it('keeps the numbered pager with mode full', () => {
    const w = mountCompact(SPagination, { page: 3, pageSize: 20, total: 240, mode: 'full' })
    expect(w.find('[data-testid="page-jump"]').exists()).toBe(false)
    expect(w.find('button[aria-current="page"]').text()).toBe('3')
  })
})
