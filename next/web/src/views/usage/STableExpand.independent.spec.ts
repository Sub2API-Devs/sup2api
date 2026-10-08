import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { STable } from '@sub2api/ui'
import { i18n } from '@/i18n'

describe('independent shared table expansion compatibility', () => {
  const props = { columns: [{ key: 'name', label: 'Name' }], rows: [{ id: 1, name: 'one' }, { id: 2, name: 'two' }], expandable: true }
  const slots = { expand: '<section data-testid="expanded-real-slot">unchanged slot</section>' }
  it('keeps default expanded slot directly in the cell and does not enable containment', async () => {
    const wrapper = mount(STable, { props, slots, global: { plugins: [i18n] } })
    await wrapper.find('tbody tr td button').trigger('click')
    expect(wrapper.find('.s-table-fit-expanded').exists()).toBe(false)
    expect(wrapper.find('.s-table-expand-content').exists()).toBe(false)
    expect(wrapper.get('[data-testid="expanded-real-slot"]').element.parentElement?.tagName).toBe('TD')
    wrapper.unmount()
  })
  it('opts in only the expanded content without changing row identity or collapse behavior', async () => {
    const wrapper = mount(STable, { props: { ...props, fitExpandedToContainer: true }, slots, global: { plugins: [i18n] } })
    expect(wrapper.classes()).toContain('s-table-fit-expanded')
    const toggle = wrapper.find('tbody tr td button')
    await toggle.trigger('click')
    expect(wrapper.findAll('.s-table-expand-content')).toHaveLength(1)
    expect(wrapper.get('.s-table-expand-content').text()).toBe('unchanged slot')
    expect(wrapper.findAll('tbody tr:not(.s-table-expand)')).toHaveLength(2)
    await wrapper.setProps({ fitExpandedToContainer: false })
    expect(wrapper.find('.s-table-expand-content').exists()).toBe(false)
    expect(wrapper.get('[data-testid="expanded-real-slot"]').element.parentElement?.tagName).toBe('TD')
    await toggle.trigger('click')
    expect(wrapper.find('[data-testid="expanded-real-slot"]').exists()).toBe(false)
    wrapper.unmount()
  })
})
