import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { ref } from 'vue'
import type { PluginHost } from '@sub2api/host'
import CodexAuthForm from './CodexAuthForm.vue'
import { setHost } from './host'

// A plugin host whose t() returns the key, and whose plugin API answers
// POSTs from `answer` (calls are recorded).
type Answer = (path: string, body: any) => unknown
let answer: Answer
let calls: Array<{ path: string; body: any }>

function fakeHost(): PluginHost {
  const post = vi.fn(async (path: string, body?: unknown) => {
    calls.push({ path, body })
    const r = answer(path, body)
    if (r instanceof Error) throw r
    return r
  })
  const notUsed = vi.fn(async () => {
    throw new Error('not used')
  })
  return {
    t: (key: string) => key,
    i18n: { locale: ref('en'), formatDateTime: (v: unknown) => `T(${Number(v)})`, t: (k: string) => k, text: (v: unknown) => String(v ?? '') },
    pluginApi: { get: notUsed, post, put: notUsed, patch: notUsed, delete: notUsed }
  } as unknown as PluginHost
}

const DEVICE_CREDS = { access_token: 'at', refresh_token: 'rt', id_token: 'it', expires_at: 1800000000, email: 'me@example.com', chatgpt_account_id: 'acc-1', plan_type: 'plus' }
const SIWC_CREDS = { access_token: 'at2', refresh_token: 'rt2', id_token: 'it2', expires_at: 1800000000, email: 'me@example.com', client_id: 'client-1', ext_agent_host_id: 'urn:uuid:h', scopes: 'openid' }

let wrapper: VueWrapper | null = null
function mountForm(props: Record<string, unknown>) {
  wrapper = mount(CodexAuthForm, { props: { modelValue: {}, mode: 'create', ...props }, attachTo: document.body })
  return wrapper
}
/** The last v-model value the form emitted. */
const lastValue = (w: VueWrapper) => (w.emitted('update:modelValue') as unknown[][] | undefined)?.at(-1)?.[0] as Record<string, unknown> | undefined

beforeEach(() => {
  vi.useFakeTimers()
  calls = []
  answer = () => {
    throw new Error('unexpected call')
  }
  setHost(fakeHost())
})
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  setHost(null)
  vi.useRealTimers()
})

describe('CodexAuthForm: flows by account type', () => {
  it('shows only the device flow for codex_device, without a tab bar', () => {
    const w = mountForm({ accountType: { type: 'codex_device' } })
    expect(w.find('[data-testid="codex-device-flow"]').exists()).toBe(true)
    expect(w.find('[data-testid="codex-siwc-flow"]').exists()).toBe(false)
    expect(w.find('[role="tablist"]').exists()).toBe(false)
  })

  it('takes the type from the account when the editor gives none', () => {
    const w = mountForm({ mode: 'edit', account: { id: 1, type: 'chatgpt_siwc' }, modelValue: {} })
    expect(w.find('[data-testid="codex-siwc-flow"]').exists()).toBe(true)
    expect(w.find('[data-testid="codex-device-flow"]').exists()).toBe(false)
  })

  it('offers both flows as tabs when the type is unknown', async () => {
    const w = mountForm({})
    expect(w.find('[role="tablist"]').exists()).toBe(true)
    expect(w.findAll('[role="tab"]').map((t) => t.text())).toEqual(['tabs.device', 'tabs.siwc'])
  })
})

describe('CodexAuthForm: device code', () => {
  function deviceAnswers(polls: unknown[]) {
    answer = (path) => {
      if (path === '/auth/device/start') return { session_id: 's1', verification_url: 'https://auth.openai.com/codex/device', user_code: 'ABCD-1234', interval: 5, expires_in: 900 }
      if (path === '/auth/device/poll') return polls.length > 1 ? polls.shift() : polls[0]
      throw new Error(`unexpected ${path}`)
    }
  }

  it('starts, polls every interval and writes the credentials when done', async () => {
    deviceAnswers([{ status: 'pending' }, { status: 'done', credentials: DEVICE_CREDS }])
    const w = mountForm({ accountType: { type: 'codex_device' } })
    await w.get('[data-testid="codex-device-start"]').trigger('click')
    await flushPromises()
    expect(w.get('[data-testid="codex-device-code"]').text()).toBe('ABCD-1234')
    expect(w.get('[data-testid="codex-device-url"]').attributes('href')).toBe('https://auth.openai.com/codex/device')
    expect(w.get('[data-testid="codex-device-url"]').attributes('target')).toBe('_blank')
    expect(w.get('[data-testid="codex-device-countdown"]').text()).toBe('device.expiresIn')
    expect(calls.filter((c) => c.path === '/auth/device/poll')).toHaveLength(0)

    await vi.advanceTimersByTimeAsync(5000)
    expect(calls.filter((c) => c.path === '/auth/device/poll')).toEqual([{ path: '/auth/device/poll', body: { session_id: 's1' } }])
    expect(lastValue(w)).toBeUndefined()

    await vi.advanceTimersByTimeAsync(5000)
    await flushPromises()
    expect(lastValue(w)).toEqual(DEVICE_CREDS)
    expect(w.get('[data-testid="codex-authorized"]').text()).toContain('done.detail')
    expect(w.find('[data-testid="codex-device-flow"]').exists()).toBe(false)

    // Nothing polls after done.
    const n = calls.length
    await vi.advanceTimersByTimeAsync(30000)
    expect(calls).toHaveLength(n)
  })

  it('stops polling when unmounted', async () => {
    deviceAnswers([{ status: 'pending' }])
    const w = mountForm({ accountType: { type: 'codex_device' } })
    await w.get('[data-testid="codex-device-start"]').trigger('click')
    await flushPromises()
    await vi.advanceTimersByTimeAsync(5000)
    const n = calls.length
    w.unmount()
    wrapper = null
    await vi.advanceTimersByTimeAsync(60000)
    expect(calls).toHaveLength(n)
  })

  it('reports an expired code and starts again', async () => {
    deviceAnswers([{ status: 'expired' }])
    const w = mountForm({ accountType: { type: 'codex_device' } })
    await w.get('[data-testid="codex-device-start"]').trigger('click')
    await flushPromises()
    await vi.advanceTimersByTimeAsync(5000)
    await flushPromises()
    expect(w.find('[data-testid="codex-device-expired"]').exists()).toBe(true)
    await w.get('[data-testid="codex-device-retry"]').trigger('click')
    await flushPromises()
    expect(calls.filter((c) => c.path === '/auth/device/start')).toHaveLength(2)
    expect(w.find('[data-testid="codex-device-code"]').exists()).toBe(true)
  })

  it('shows the error of a failed poll with its message', async () => {
    deviceAnswers([{ status: 'error', message: 'device code login is not enabled' }])
    const w = mountForm({ accountType: { type: 'codex_device' } })
    await w.get('[data-testid="codex-device-start"]').trigger('click')
    await flushPromises()
    await vi.advanceTimersByTimeAsync(5000)
    await flushPromises()
    expect(w.get('[data-testid="codex-device-error"]').text()).toContain('device code login is not enabled')
  })

  it('treats a code past its lifetime as expired without asking', async () => {
    answer = (path) => (path === '/auth/device/start' ? { session_id: 's1', verification_url: 'https://x', user_code: 'C', interval: 5, expires_in: 4 } : { status: 'pending' })
    const w = mountForm({ accountType: { type: 'codex_device' } })
    await w.get('[data-testid="codex-device-start"]').trigger('click')
    await flushPromises()
    await vi.advanceTimersByTimeAsync(5000)
    await flushPromises()
    expect(calls.filter((c) => c.path === '/auth/device/poll')).toHaveLength(0)
    expect(w.find('[data-testid="codex-device-expired"]').exists()).toBe(true)
  })
})

describe('CodexAuthForm: Sign in with ChatGPT', () => {
  it('generates a link, exchanges the pasted callback and writes the credentials', async () => {
    answer = (path, body) => {
      if (path === '/auth/siwc/start') return { session_id: 'w1', authorize_url: 'https://auth.openai.com/api/accounts/authorize?x=1' }
      if (path === '/auth/siwc/exchange') return body.callback_url.includes('code=') ? { credentials: SIWC_CREDS } : new Error('bad callback')
      throw new Error(`unexpected ${path}`)
    }
    const w = mountForm({ accountType: { type: 'chatgpt_siwc' } })
    await w.get('[data-testid="codex-siwc-start"]').trigger('click')
    await flushPromises()
    expect(calls[0]).toEqual({ path: '/auth/siwc/start', body: {} })
    expect((w.get('[data-testid="codex-siwc-url"]').element as HTMLInputElement).value).toBe('https://auth.openai.com/api/accounts/authorize?x=1')
    expect(w.get('[data-testid="codex-siwc-open"]').attributes('target')).toBe('_blank')
    expect(w.find('[data-testid="codex-siwc-note"]').exists()).toBe(true)

    await w.get('[data-testid="codex-siwc-callback"]').setValue('http://127.0.0.1:1455/auth/callback?state=s')
    expect(w.find('[data-testid="codex-siwc-shape"]').text()).toBe('siwc.shape.no_code')
    await w.get('[data-testid="codex-siwc-complete"]').trigger('click')
    await flushPromises()
    expect(w.get('[data-testid="codex-siwc-error"]').text()).toContain('bad callback')

    await w.get('[data-testid="codex-siwc-callback"]').setValue('http://127.0.0.1:1455/auth/callback?code=c&state=s')
    // The error of the previous paste goes away with the new one.
    expect(w.find('[data-testid="codex-siwc-error"]').exists()).toBe(false)
    await w.get('[data-testid="codex-siwc-complete"]').trigger('click')
    await flushPromises()
    expect(calls.at(-1)).toEqual({ path: '/auth/siwc/exchange', body: { session_id: 'w1', callback_url: 'http://127.0.0.1:1455/auth/callback?code=c&state=s' } })
    expect(lastValue(w)).toEqual(SIWC_CREDS)
    expect(w.find('[data-testid="codex-authorized"]').exists()).toBe(true)
  })
})

describe('CodexAuthForm: editing', () => {
  const masked = { access_token: '******', refresh_token: '******', id_token: '******', email: 'old@example.com', expires_at: 1700000000, client_id: 'client-1', ext_agent_host_id: 'urn:uuid:h' }

  it('shows the current authorization and keeps the masked credentials until re-authorized', async () => {
    const w = mountForm({ mode: 'edit', account: { id: 7, type: 'chatgpt_siwc' }, modelValue: { ...masked } })
    expect(w.get('[data-testid="codex-current"]').text()).toContain('old@example.com')
    expect(w.find('[data-testid="codex-siwc-flow"]').exists()).toBe(false)
    expect(await (w.vm as unknown as { validate: () => Promise<boolean> }).validate()).toBe(true)
    expect(w.emitted('update:modelValue')).toBeUndefined()
  })

  it('re-authorizes with the issued client id and host id', async () => {
    answer = (path) => {
      if (path === '/auth/siwc/start') return { session_id: 'w2', authorize_url: 'https://auth.openai.com/a' }
      if (path === '/auth/siwc/exchange') return { credentials: { ...SIWC_CREDS, email: 'old@example.com' } }
      throw new Error(`unexpected ${path}`)
    }
    const w = mountForm({ mode: 'edit', account: { id: 7, type: 'chatgpt_siwc' }, modelValue: { ...masked, proxy_note: 'kept' } })
    await w.get('[data-testid="codex-reauth"]').trigger('click')
    await w.get('[data-testid="codex-siwc-start"]').trigger('click')
    await flushPromises()
    expect(calls[0]).toEqual({ path: '/auth/siwc/start', body: { client_id: 'client-1', ext_agent_host_id: 'urn:uuid:h' } })
    await w.get('[data-testid="codex-siwc-callback"]').setValue('http://127.0.0.1:1455/auth/callback?code=c&state=s')
    await w.get('[data-testid="codex-siwc-complete"]').trigger('click')
    await flushPromises()
    expect(lastValue(w)).toEqual({ ...SIWC_CREDS, email: 'old@example.com', proxy_note: 'kept' })
    expect(w.get('[data-testid="codex-authorized"]').text()).toContain('done.titleReauth')

    // "Authorize again" puts the loaded credentials back.
    await w.get('[data-testid="codex-again"]').trigger('click')
    expect(lastValue(w)).toEqual({ ...masked, proxy_note: 'kept' })
  })

  it('cancelling a re-authorization hides the flow', async () => {
    const w = mountForm({ mode: 'edit', account: { id: 7, type: 'codex_device' }, modelValue: { ...masked } })
    await w.get('[data-testid="codex-reauth"]').trigger('click')
    expect(w.find('[data-testid="codex-device-flow"]').exists()).toBe(true)
    await w.get('[data-testid="codex-reauth-cancel"]').trigger('click')
    expect(w.find('[data-testid="codex-device-flow"]').exists()).toBe(false)
  })
})

describe('CodexAuthForm: validate()', () => {
  it('refuses to create without an access token', async () => {
    const w = mountForm({ accountType: { type: 'codex_device' } })
    expect(await (w.vm as unknown as { validate: () => Promise<boolean> }).validate()).toBe(false)
    expect(w.get('[data-testid="codex-validate-error"]').text()).toBe('validate.required')
  })

  it('says the flow is unfinished while it runs, and drops the hint when a flow starts', async () => {
    answer = (path) => (path === '/auth/device/start' ? { session_id: 's1', verification_url: 'https://x', user_code: 'C', interval: 5, expires_in: 900 } : { status: 'pending' })
    const w = mountForm({ accountType: { type: 'codex_device' } })
    const vm = w.vm as unknown as { validate: () => Promise<boolean> }
    await vm.validate()
    await w.get('[data-testid="codex-device-start"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-testid="codex-validate-error"]').exists()).toBe(false)
    expect(await vm.validate()).toBe(false)
    expect(w.get('[data-testid="codex-validate-error"]').text()).toBe('validate.inProgress')
  })

  it('accepts once the editor holds the token', async () => {
    const w = mountForm({ accountType: { type: 'codex_device' }, modelValue: { ...DEVICE_CREDS } })
    expect(await (w.vm as unknown as { validate: () => Promise<boolean> }).validate()).toBe(true)
  })

  it('shows server field errors', () => {
    const w = mountForm({ accountType: { type: 'codex_device' }, errors: { access_token: 'token rejected' } })
    expect(w.get('[data-testid="codex-server-errors"]').text()).toContain('token rejected')
  })
})
