import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import GroupModelPolicyEditor from './GroupModelPolicyEditor.vue'

describe('group model policy editor', () => {
  const render = () => mount(GroupModelPolicyEditor, { props: { modelValue: ['claude-haiku-*'], mode: 'whitelist', options: ['claude-opus-5-5'] }, global: { plugins: [i18n] } })
  it('switches policy mode without overwriting the patterns', async () => {
    const w = render()
    await w.get('[data-testid="policy-blacklist"]').trigger('click')
    expect(w.emitted('update:mode')).toEqual([['blacklist']])
    expect(w.emitted('update:modelValue')).toBeUndefined()
  })
  it('adds wildcard patterns and deduplicates pasted lists', async () => {
    const w = render()
    await w.get('[data-testid="policy-draft"]').trigger('paste', { clipboardData: { getData: () => 'claude-opus-*,claude-haiku-*\ngpt-*' } })
    await w.get('[data-testid="policy-draft"]').trigger('keydown', { key: 'Enter' })
    expect(w.emitted('update:modelValue')?.[0]).toEqual([['claude-haiku-*', 'claude-opus-*', 'gpt-*']])
  })
})
