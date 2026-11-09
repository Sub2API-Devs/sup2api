import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { ApiError } from '@sub2api/host'
import { i18n } from '@/i18n'
import GatewaySettingsCard from './GatewaySettingsCard.vue'
import { maxTokensMap, maxTokensRows } from './claudeMaxTokens'

const api = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }))
vi.mock('@sub2api/host', async original => ({ ...(await original<object>()), api }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ has: () => true }) }))
enableAutoUnmount(afterEach)

const saved = {
  max_attempts: 3,
  platform_call_timeout_ms: 2000,
  default_hook_timeout_ms: 300,
  platform_hotpath_timeout_ms: 300,
  queue_sticky_max_waiting: 3,
  queue_sticky_wait_seconds: 120,
  queue_fallback_max_waiting: 100,
  queue_fallback_wait_seconds: 30,
  claude_default_max_tokens: { 'claude-x': 4096, default: 16000 },
  media_download_max_mb: 32
}

beforeEach(() => {
  vi.clearAllMocks()
  i18n.global.locale.value = 'zh'
  api.get.mockResolvedValue(saved)
  api.put.mockImplementation((_path, body) => Promise.resolve(body))
})

async function render() {
  const w = mount(GatewaySettingsCard, { global: { plugins: [i18n] } })
  await flushPromises()
  return w
}

const rows = (w: Awaited<ReturnType<typeof render>>) => w.findAll('[data-testid="claude-max-tokens-row"]')
const inputs = (w: Awaited<ReturnType<typeof render>>, i: number) => rows(w)[i].findAll('input')
const save = async (w: Awaited<ReturnType<typeof render>>) => {
  await w.get('[data-testid="settings-save"]').trigger('click')
  await flushPromises()
}

describe('gateway conversion settings (CONVERT-MATRIX §6.1)', () => {
  it('lists the default row first, locked, and saves added models and the media cap', async () => {
    const w = await render()
    expect(rows(w).map(r => (r.find('input').element as HTMLInputElement).value)).toEqual(['default', 'claude-x'])
    expect(inputs(w, 0)[0].attributes('readonly')).toBeDefined()
    expect(rows(w)[0].find('[data-testid="claude-max-tokens-remove"]').exists()).toBe(false)
    expect((w.get('input[name="media_download_max_mb"]').element as HTMLInputElement).value).toBe('32')

    await rows(w)[1].get('[data-testid="claude-max-tokens-remove"]').trigger('click')
    await w.get('[data-testid="claude-max-tokens-add"]').trigger('click')
    await inputs(w, 1)[0].setValue(' gpt-5 ')
    await inputs(w, 1)[1].setValue('2048')
    await w.get('input[name="media_download_max_mb"]').setValue('128')
    await save(w)
    expect(api.put).toHaveBeenCalledWith(
      '/settings/gateway',
      expect.objectContaining({ claude_default_max_tokens: { default: 16000, 'gpt-5': 2048 }, media_download_max_mb: 128 })
    )
  })

  it('restores the loaded rows on reset', async () => {
    const w = await render()
    await w.get('[data-testid="claude-max-tokens-add"]').trigger('click')
    await inputs(w, 2)[0].setValue('gpt-5')
    await inputs(w, 2)[1].setValue('1')
    expect(rows(w)).toHaveLength(3)
    await w.get('[data-testid="settings-reset"]').trigger('click')
    expect(rows(w)).toHaveLength(2)
  })

  it('refuses invalid rows before saving and shows server field errors', async () => {
    const w = await render()
    await inputs(w, 1)[1].setValue('')
    await save(w)
    expect(api.put).not.toHaveBeenCalled()
    expect(w.get('[data-testid="gateway-claude-max-tokens"]').text()).toContain('每行都要填 0 到 1048576 之间的整数')

    await inputs(w, 1)[1].setValue('100')
    api.put.mockRejectedValueOnce(
      new ApiError(400, {
        code: 'invalid_argument',
        message: 'invalid',
        details: { fields: [{ field: 'media_download_max_mb', code: 'out_of_range', message: '取值范围为 1 到 1024' }] }
      })
    )
    await save(w)
    expect(w.text()).toContain('取值范围为 1 到 1024')
  })
})

describe('claude_default_max_tokens rows', () => {
  it('adds a missing default and checks names, duplicates and values', () => {
    expect(maxTokensRows(null)).toEqual([{ model: 'default', tokens: 8192 }])
    const base = maxTokensRows({ default: 1 })
    expect(maxTokensMap([...base, { model: '', tokens: null }])).toEqual({ map: { default: 1 } })
    expect(maxTokensMap([...base, { model: 'default', tokens: 2 }])).toEqual({ error: 'duplicate' })
    expect(maxTokensMap([...base, { model: '', tokens: 2 }])).toEqual({ error: 'model' })
    expect(maxTokensMap([...base, { model: 'm', tokens: -1 }])).toEqual({ error: 'value' })
    expect(maxTokensMap([...base, { model: 'm', tokens: 1.5 }])).toEqual({ error: 'value' })
    expect(maxTokensMap([...base, ...Array.from({ length: 200 }, (_, i) => ({ model: `m${i}`, tokens: 1 }))])).toEqual({
      error: 'too_many'
    })
  })
})
