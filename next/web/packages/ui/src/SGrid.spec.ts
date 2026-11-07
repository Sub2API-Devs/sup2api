import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import SGrid from './SGrid.vue'

describe('SGrid', () => {
  it('stays single-column on phones by default', () => {
    expect(mount(SGrid, { props: { cols: 3 } }).classes()).toEqual(expect.arrayContaining(['grid-cols-1', 'sm:grid-cols-3']))
  })

  it('variant stats keeps two columns below md and starts `cols` at md', () => {
    const cls = mount(SGrid, { props: { variant: 'stats', cols: 3, xlCols: 4 } }).classes()
    expect(cls).toEqual(expect.arrayContaining(['grid-cols-2', 'max-md:gap-2', 'md:grid-cols-3', 'xl:grid-cols-4']))
    expect(cls.some(c => c.startsWith('sm:'))).toBe(false)
    expect(mount(SGrid, { props: { variant: 'stats', mdCols: 4 } }).classes()).toContain('md:grid-cols-4')
  })
})
