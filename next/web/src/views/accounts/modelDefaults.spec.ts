import { describe, expect, it } from 'vitest'
import type { AccountType } from '@/api/types'
import { hasDefaults, shouldPrefillOnEdit } from './modelDefaults'

const at = (over: Partial<AccountType> = {}) => ({ plugin_key: 'p', type: 't', default_models: ['m1'], default_model_mapping: { a: 'm1' }, ...over }) as AccountType

describe('plugin model defaults', () => {
  it('hasDefaults needs a model or a mapping entry', () => {
    expect(hasDefaults(null)).toBe(false)
    expect(hasDefaults(at({ default_models: [], default_model_mapping: {} }))).toBe(false)
    expect(hasDefaults(at({ default_models: undefined, default_model_mapping: undefined }))).toBe(false)
    expect(hasDefaults(at({ default_models: [] }))).toBe(true)
    expect(hasDefaults(at({ default_model_mapping: {} }))).toBe(true)
  })

  it('prefills an edited account only when both lists are empty', () => {
    expect(shouldPrefillOnEdit({ models: [], model_mapping: {} }, at())).toBe(true)
    // legacy rows without the fields count as empty
    expect(shouldPrefillOnEdit({ models: undefined as unknown as string[], model_mapping: undefined as unknown as Record<string, string> }, at())).toBe(true)
    expect(shouldPrefillOnEdit({ models: ['x'], model_mapping: {} }, at())).toBe(false)
    expect(shouldPrefillOnEdit({ models: [], model_mapping: { a: 'b' } }, at())).toBe(false)
  })

  it('never prefills without defaults, without an account or for orphaned accounts', () => {
    expect(shouldPrefillOnEdit({ models: [], model_mapping: {} }, at({ default_models: [], default_model_mapping: {} }))).toBe(false)
    expect(shouldPrefillOnEdit({ models: [], model_mapping: {} }, null)).toBe(false)
    expect(shouldPrefillOnEdit(null, at())).toBe(false)
    expect(shouldPrefillOnEdit({ models: [], model_mapping: {}, orphaned: true }, at())).toBe(false)
  })
})
