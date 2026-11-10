import { beforeEach, describe, expect, it, vi } from 'vitest'
import { i18n } from '@/i18n'
import { bulkToast } from './bulkToast'

const toast = vi.hoisted(() => vi.fn())
vi.mock('@sub2api/ui', async original => ({ ...(await original<typeof import('@sub2api/ui')>()), toast }))
vi.mock('@/utils/errors', () => ({ errorMessage: (e: Error) => e.message }))

const failure = (name: string, message: string) => ({ item: { name }, error: new Error(message) })

describe('bulk result toast', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    i18n.global.locale.value = 'zh'
  })

  it('counts the successes in the words of the page it is given', () => {
    bulkToast('accounts.bulk', 3, [])
    expect(toast).toHaveBeenLastCalledWith('已完成 3 个账号', 'success')
    bulkToast('apikeys.bulk', 2, [])
    expect(toast).toHaveBeenLastCalledWith('已处理 2 个密钥', 'success')
  })

  it('warns with both counts and the first failure by name', () => {
    bulkToast('apikeys.bulk', 1, [failure('ci-runner', 'key not found'), failure('laptop', 'forbidden')])
    expect(toast).toHaveBeenLastCalledWith('成功 1 个，失败 2 个（ci-runner：key not found）', 'warning')
    bulkToast('accounts.bulk', 0, [failure('acc-1', 'down')])
    expect(toast).toHaveBeenLastCalledWith('成功 0 个，失败 1 个；acc-1：down', 'warning')
  })

  it('speaks the language in use, with its plural forms', () => {
    i18n.global.locale.value = 'en'
    bulkToast('apikeys.bulk', 1, [failure('laptop', 'forbidden')])
    expect(toast).toHaveBeenLastCalledWith('1 succeeded, 1 failed (laptop: forbidden)', 'warning')
    bulkToast('apikeys.bulk', 1, [])
    expect(toast).toHaveBeenLastCalledWith('Processed 1 key', 'success')
    bulkToast('apikeys.bulk', 2, [])
    expect(toast).toHaveBeenLastCalledWith('Processed 2 keys', 'success')
  })
})
