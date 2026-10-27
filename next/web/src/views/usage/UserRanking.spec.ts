import { afterEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { ref, toValue, type MaybeRefOrGetter } from 'vue'
import { i18n } from '@/i18n'
import type { UsageSummaryRow } from '@/api/types'
import UserRanking from './UserRanking.vue'

const extras: Array<MaybeRefOrGetter<Record<string, unknown>>> = []
const rows = ref<UsageSummaryRow[]>([])
vi.mock('./useUsageSummary', () => ({
  useUsageSummary: (_p: string, _f: unknown, groupBy: string, _e: unknown, extra: MaybeRefOrGetter<Record<string, unknown>>) => {
    expect(groupBy).toBe('user')
    extras.push(extra)
    return { rows, loading: ref(false), error: ref(null), reload: vi.fn() }
  }
}))
enableAutoUnmount(afterEach)

const user = (key: string, cost: string, input: number, output: number): UsageSummaryRow => ({ key, user_email: `u${key}@x`, requests: 1, total_cost: cost, input_tokens: input, output_tokens: output })

describe('user ranking', () => {
  it('asks the server for the order and size, re-sorts the token columns itself, keeps "other" last', async () => {
    i18n.global.locale.value = 'zh'
    rows.value = [user('1', '9', 10, 900), user('2', '5', 500, 1), user('__other__', '1', 9999, 9999)]
    const w = mount(UserRanking, { props: { summaryPath: '/usage/summary', filters: {} }, global: { plugins: [i18n] } })
    expect(toValue(extras[0])).toEqual({ order: 'cost', limit: '20' })
    const names = () => w.findAll('tbody tr').map((tr) => tr.text())
    expect(names()[0]).toContain('u1@x')
    expect(names()[2]).toContain('其他')

    // Input is ranked here, from the rows the server ranked by tokens.
    await w.get('[data-testid="ranking-sort"]').findAll('input')[3].setValue(true)
    await flushPromises()
    expect(toValue(extras[0])).toEqual({ order: 'tokens', limit: '20' })
    expect(names()[0]).toContain('u2@x')
    expect(names()[2]).toContain('其他')

    await w.findAll('tbody tr')[1].trigger('click')
    await w.findAll('tbody tr')[2].trigger('click')
    expect(w.emitted('select')).toEqual([['1']])
  })
})
