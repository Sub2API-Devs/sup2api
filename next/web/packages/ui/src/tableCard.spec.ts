import { describe, expect, it } from 'vitest'
import { cardFields } from './tableCard'
import type { TableColumn } from './types'

const col = (key: string, extra: Partial<TableColumn> = {}): TableColumn => ({ key, label: key, ...extra })
const keys = (fields: ReturnType<typeof cardFields>) =>
  Object.fromEntries(Object.entries(fields).map(([area, cs]) => [area, cs.map(c => c.key)]))

describe('cardFields', () => {
  it('infers title, status, four meta fields and details when no column declares a place', () => {
    const columns = ['actions', 'name', 'a', 'status', 'b', 'c', 'enabled', 'd', 'e'].map(k => col(k))
    expect(keys(cardFields(columns))).toEqual({
      title: ['name'],
      subtitle: [],
      status: ['status', 'enabled'],
      meta: ['a', 'b', 'c', 'd'],
      detail: ['e'],
      actions: ['actions']
    })
  })

  it('keeps declared places, drops hidden columns and sends undeclared ones to the details', () => {
    const columns = [
      col('id'),
      col('name', { mobile: 'title' }),
      col('state', { mobile: 'status' }),
      col('group', { mobile: 'subtitle' }),
      col('quota', { mobile: 'meta' }),
      col('secret', { mobile: 'hidden' }),
      col('actions')
    ]
    expect(keys(cardFields(columns))).toEqual({
      title: ['name'],
      subtitle: ['group'],
      status: ['state'],
      meta: ['quota'],
      detail: ['id'],
      actions: ['actions']
    })
  })

  it('treats placement as declared when a column hidden by the user declares one', () => {
    const all = [col('name', { mobile: 'title' }), col('a'), col('b')]
    expect(keys(cardFields(all.slice(1), all))).toMatchObject({ title: [], meta: [], detail: ['a', 'b'] })
  })
})
