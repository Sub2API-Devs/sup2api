import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, type EffectScope } from 'vue'
import type { ApiKey } from '@/api/types'
import { i18n } from '@/i18n'
import { useKeyBulk } from './keyBulk'

const { post, patch, del, confirm, toast, copyText } = vi.hoisted(() => ({
  post: vi.fn(),
  patch: vi.fn(),
  del: vi.fn(),
  confirm: vi.fn(),
  toast: vi.fn(),
  copyText: vi.fn()
}))
vi.mock('@sub2api/host', () => ({ api: { post, patch, del } }))
vi.mock('@sub2api/ui', async original => ({ ...(await original<typeof import('@sub2api/ui')>()), confirm, toast }))
vi.mock('@/utils/format', () => ({ copyText }))
vi.mock('@/utils/errors', () => ({ errorMessage: (e: Error) => e.message }))

const key = (id: number, name: string, k: Partial<ApiKey> = {}) =>
  ({ id, name, group_id: 1, key_prefix: `sk-s2a-key0${id}`, status: 'active', created_at: '', copyable: true, ...k }) as ApiKey
const laptop = key(1, 'laptop')
const runner = key(2, 'ci-runner')
const legacy = key(3, 'old-script', { copyable: false })
/** The id of the key a per-key request was for. */
const idOf = (path: string) => Number(/api-keys\/(\d+)/.exec(path)![1])

/** The page the actions run for: stopping it is leaving the page. */
let page: EffectScope
function setup() {
  const hooks = { changed: vi.fn(), removed: vi.fn() }
  return { hooks, bulk: page.run(() => useKeyBulk(hooks))! }
}

describe('API key bulk actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    i18n.global.locale.value = 'zh'
    copyText.mockResolvedValue(true)
    post.mockImplementation(async (path: string) => ({ key: `secret-${idOf(path)}` }))
    page = effectScope()
  })
  afterEach(() => page.stop())

  describe('copy', () => {
    it('reveals only the keys that can be copied and copies one "name<TAB>key" line each, saying how many it skipped', async () => {
      const { bulk, hooks } = setup()
      await bulk.copy([laptop, legacy, runner])
      expect(post.mock.calls.map(([path]) => path)).toEqual(['/me/api-keys/1/reveal', '/me/api-keys/2/reveal'])
      expect(copyText).toHaveBeenCalledWith('laptop\tsecret-1\nci-runner\tsecret-2')
      expect(toast).toHaveBeenCalledTimes(1)
      expect(toast).toHaveBeenCalledWith(expect.stringMatching(/已复制 2 个密钥.*跳过 1 个/), 'success')
      expect(hooks.changed).not.toHaveBeenCalled()
    })

    it('says nothing about skipped keys when every key was copied', async () => {
      await setup().bulk.copy([laptop, runner])
      expect(toast).toHaveBeenCalledWith(expect.not.stringContaining('跳过'), 'success')
    })

    it('keeps the lines in the order of the selection, whichever reveal answers first', async () => {
      let answerFirst!: () => void
      post.mockImplementation((path: string) =>
        idOf(path) === 1 ? new Promise(resolve => (answerFirst = () => resolve({ key: 'secret-1' }))) : Promise.resolve({ key: 'secret-2' })
      )
      const copying = setup().bulk.copy([laptop, runner])
      await vi.waitFor(() => expect(post).toHaveBeenCalledTimes(2))
      answerFirst()
      await copying
      expect(copyText).toHaveBeenCalledWith('laptop\tsecret-1\nci-runner\tsecret-2')
    })

    it('reveals nothing and warns when the selection is all legacy keys', async () => {
      await setup().bulk.copy([legacy])
      expect(post).not.toHaveBeenCalled()
      expect(copyText).not.toHaveBeenCalled()
      expect(toast).toHaveBeenCalledWith('所选都是旧密钥，无法复制', 'warning')
    })

    it('copies the keys it could reveal and names the first one it could not', async () => {
      post.mockImplementation(async (path: string) => {
        if (idOf(path) === 2) throw new Error('key not found')
        return { key: 'secret-1' }
      })
      await setup().bulk.copy([laptop, runner])
      expect(copyText).toHaveBeenCalledWith('laptop\tsecret-1')
      expect(toast).toHaveBeenCalledWith(expect.stringContaining('已复制 1 个密钥'), 'success')
      expect(toast).toHaveBeenLastCalledWith('成功 1 个，失败 1 个（ci-runner：key not found）', 'warning')
    })

    it('copies nothing and names the first failure when no key could be revealed', async () => {
      post.mockRejectedValue(new Error('unavailable'))
      await setup().bulk.copy([laptop, runner])
      expect(copyText).not.toHaveBeenCalled()
      expect(toast).toHaveBeenCalledTimes(1)
      expect(toast).toHaveBeenCalledWith('成功 0 个，失败 2 个（laptop：unavailable）', 'warning')
    })

    it('puts no key on the clipboard and says nothing once the page was left, and reveals no further key', async () => {
      const answers: (() => void)[] = []
      post.mockImplementation((path: string) => new Promise(resolve => answers.push(() => resolve({ key: `secret-${idOf(path)}` }))))
      const keys = Array.from({ length: 6 }, (_, i) => key(i + 1, `key-${i + 1}`))
      const copying = setup().bulk.copy(keys)
      await vi.waitFor(() => expect(post).toHaveBeenCalledTimes(4))
      page.stop()
      answers.forEach(answer => answer())
      await copying
      expect(post).toHaveBeenCalledTimes(4)
      expect(copyText).not.toHaveBeenCalled()
      expect(toast).not.toHaveBeenCalled()
    })

    it('says so when the clipboard refuses the keys', async () => {
      copyText.mockResolvedValue(false)
      await setup().bulk.copy([laptop])
      expect(toast).toHaveBeenCalledTimes(1)
      expect(toast).toHaveBeenCalledWith(expect.stringContaining('复制失败'), 'error')
    })
  })

  describe('enable and disable', () => {
    /** The server's answer to a status change: the key as it is now. */
    const answered = async (path: string, body: Partial<ApiKey>) => ({ id: idOf(path), ...body })

    it('sets the status of every selected key, then lets the list reload, and hands back the keys it changed', async () => {
      patch.mockImplementation(answered)
      const { bulk, hooks } = setup()
      const keys = [key(1, 'laptop'), key(3, 'old-script', { copyable: false })]
      expect(await bulk.setStatus(keys, 'disabled')).toEqual(keys)
      expect(patch.mock.calls).toEqual([
        ['/me/api-keys/1', { status: 'disabled' }],
        ['/me/api-keys/3', { status: 'disabled' }]
      ])
      expect(toast).toHaveBeenCalledWith('已处理 2 个密钥', 'success')
      expect(hooks.changed).toHaveBeenCalledTimes(1)
      expect(hooks.removed).not.toHaveBeenCalled()
    })

    it('skips the keys that are in the state already and counts only the ones it changed', async () => {
      patch.mockImplementation(answered)
      const { bulk } = setup()
      const off = key(2, 'paused', { status: 'disabled' })
      const on = key(1, 'laptop')
      expect(await bulk.setStatus([on, off], 'disabled')).toEqual([on])
      expect(patch.mock.calls).toEqual([['/me/api-keys/1', { status: 'disabled' }]])
      expect(toast).toHaveBeenCalledWith('已处理 1 个密钥', 'success')
    })

    it('asks nothing of the server and says so when every key is in the state already', async () => {
      const { bulk, hooks } = setup()
      expect(await bulk.setStatus([laptop, runner], 'active')).toEqual([])
      expect(patch).not.toHaveBeenCalled()
      expect(toast).toHaveBeenCalledTimes(1)
      expect(toast).toHaveBeenCalledWith('所选密钥已是该状态', 'info')
      expect(hooks.changed).not.toHaveBeenCalled()
    })

    it('keeps the answer on the selected key, so a key of another page can be switched back', async () => {
      patch.mockImplementation(answered)
      const { bulk } = setup()
      const elsewhere = key(9, 'on-page-2')
      await bulk.setStatus([elsewhere], 'disabled')
      expect(elsewhere.status).toBe('disabled')
      await bulk.setStatus([elsewhere], 'active')
      expect(patch).toHaveBeenLastCalledWith('/me/api-keys/9', { status: 'active' })
    })

    it('reloads the list after a partial failure too, naming the first key that failed', async () => {
      patch.mockImplementation(async (path: string) => {
        if (idOf(path) === 1) throw new Error('forbidden')
      })
      const { bulk, hooks } = setup()
      const off = [key(1, 'laptop', { status: 'disabled' }), key(2, 'ci-runner', { status: 'disabled' })]
      expect(await bulk.setStatus(off, 'active')).toEqual([off[1]])
      expect(toast).toHaveBeenCalledWith('成功 1 个，失败 1 个（laptop：forbidden）', 'warning')
      expect(off.map(k => k.status)).toEqual(['disabled', 'disabled'])
      expect(hooks.changed).toHaveBeenCalledTimes(1)
    })
  })

  describe('delete', () => {
    it('deletes nothing unless confirmed', async () => {
      confirm.mockResolvedValue(false)
      const { bulk, hooks } = setup()
      await bulk.remove([laptop, runner])
      expect(confirm).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('2 个 API Key'), danger: true }))
      expect(del).not.toHaveBeenCalled()
      expect(toast).not.toHaveBeenCalled()
      expect(hooks.changed).not.toHaveBeenCalled()
    })

    it('deletes each key once confirmed and hands over the ones that are gone', async () => {
      confirm.mockResolvedValue(true)
      del.mockImplementation(async (path: string) => {
        if (idOf(path) === 2) throw new Error('in use')
      })
      const { bulk, hooks } = setup()
      await bulk.remove([laptop, runner, legacy])
      expect(del.mock.calls.map(([path]) => path)).toEqual(['/me/api-keys/1', '/me/api-keys/2', '/me/api-keys/3'])
      expect(hooks.removed).toHaveBeenCalledWith([laptop, legacy])
      expect(hooks.changed).toHaveBeenCalledTimes(1)
      expect(toast).toHaveBeenCalledWith('成功 2 个，失败 1 个（ci-runner：in use）', 'warning')
    })
  })

  it('is running while its requests are in flight', async () => {
    let finish!: () => void
    patch.mockImplementation(() => new Promise<void>(resolve => (finish = resolve)))
    const { bulk } = setup()
    const run = bulk.setStatus([laptop], 'disabled')
    expect(bulk.running.value).toBe(true)
    finish()
    await run
    expect(bulk.running.value).toBe(false)
  })
})
