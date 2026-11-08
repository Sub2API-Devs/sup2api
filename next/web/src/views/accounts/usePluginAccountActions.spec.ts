import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import type { Account } from '@/api/types'
import { i18n } from '@/i18n'
import { usePluginAccountActions } from './usePluginAccountActions'

const mocks = vi.hoisted(() => ({ post: vi.fn(), confirm: vi.fn(), toast: vi.fn(), reload: vi.fn() }))
vi.mock('@sub2api/host', async (original) => ({ ...(await original<typeof import('@sub2api/host')>()), api: { post: mocks.post } }))
vi.mock('@sub2api/ui', async (original) => ({ ...(await original<typeof import('@sub2api/ui')>()), confirm: mocks.confirm, toast: mocks.toast }))

const reset = { pluginKey: 'dynweight', id: 'reset', label: { en: 'Reset dynamic weight', zh: '重置动态权重' }, permission: 'dynweight:manage', route: 'POST /reset', bulk: true, confirm: { en: 'Reset {n} account(s)?', zh: '重置 {n} 个账号的动态权重？' } }
const accounts = (n: number) => Array.from({ length: n }, (_, i) => ({ id: i + 1, name: `acc-${i + 1}` }) as Account)

/** The composable needs a component scope for useI18n. */
function setup() {
  let out!: ReturnType<typeof usePluginAccountActions>
  mount(
    defineComponent({
      setup() {
        out = usePluginAccountActions(mocks.reload)
        return () => null
      }
    }),
    { global: { plugins: [i18n] } }
  )
  return out
}

describe('usePluginAccountActions (CONTRACTS §23.3 UI 3.6)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    i18n.global.locale.value = 'zh'
    mocks.confirm.mockResolvedValue(true)
    mocks.post.mockResolvedValue({})
  })

  it('confirms with the account count and sends one account as a one-element account_ids', async () => {
    const { run } = setup()
    await run(reset, accounts(1))
    expect(mocks.confirm).toHaveBeenCalledWith({ title: '重置动态权重', message: '重置 1 个账号的动态权重？', confirmText: '重置动态权重', danger: undefined })
    expect(mocks.post).toHaveBeenCalledWith('/p/dynweight/reset', { account_ids: [1] }, expect.objectContaining({ signal: expect.any(AbortSignal) }))
    expect(mocks.toast).toHaveBeenCalledWith('「重置动态权重」已完成', 'success')
    expect(mocks.reload).toHaveBeenCalledOnce()
  })

  it('does nothing when the confirmation is declined, and skips it for actions without one', async () => {
    const { run } = setup()
    mocks.confirm.mockResolvedValue(false)
    await run(reset, accounts(2))
    expect(mocks.post).not.toHaveBeenCalled()
    expect(mocks.reload).not.toHaveBeenCalled()
    await run({ ...reset, confirm: undefined, route: '/reset' }, accounts(2))
    expect(mocks.confirm).toHaveBeenCalledOnce()
    expect(mocks.post).toHaveBeenCalledWith('/p/dynweight/reset', { account_ids: [1, 2] }, expect.objectContaining({ signal: expect.any(AbortSignal) }))
  })

  it('sends nothing for a route the manifest would have rejected, and says so on the console', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { run } = setup()
    await run({ ...reset, route: 'reset' }, accounts(2))
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('dynweight:reset'))
    warn.mockRestore()
    expect(mocks.confirm).not.toHaveBeenCalled()
    expect(mocks.post).not.toHaveBeenCalled()
    expect(mocks.reload).not.toHaveBeenCalled()
  })

  it('sends a selection as account_ids in batches of MAX_ACCOUNT_BATCH', async () => {
    const { run, running } = setup()
    let release!: () => void
    mocks.post.mockImplementationOnce(() => new Promise<void>((resolve) => (release = resolve)))
    const pending = run(reset, accounts(1200))
    await flushPromises()
    expect(running.value).toBe(true)
    release()
    await pending
    expect(running.value).toBe(false)
    expect(mocks.post.mock.calls.map(([, body]) => (body as { account_ids: number[] }).account_ids.length)).toEqual([500, 500, 200])
    expect(mocks.post.mock.calls[2][1]).toEqual({ account_ids: accounts(1200).slice(1000).map((a) => a.id) })
    expect(mocks.toast).toHaveBeenCalledWith('已完成 1200 个账号', 'success')
    expect(mocks.reload).toHaveBeenCalledOnce()
  })

  it('reports a failed batch like the other bulk actions and still reloads what succeeded', async () => {
    const { run, running } = setup()
    mocks.post.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('boom'))
    await run(reset, accounts(700))
    expect(mocks.post).toHaveBeenCalledTimes(2)
    expect(mocks.toast).toHaveBeenCalledWith('成功 500 个，失败 200 个；acc-501：boom', 'warning')
    expect(mocks.reload).toHaveBeenCalledOnce()
    expect(running.value).toBe(false)
    mocks.reload.mockClear()
    mocks.post.mockRejectedValueOnce(new Error('down'))
    await run(reset, accounts(1))
    expect(mocks.toast).toHaveBeenLastCalledWith('成功 0 个，失败 1 个；acc-1：down', 'warning')
    expect(mocks.reload).not.toHaveBeenCalled()
  })
})
