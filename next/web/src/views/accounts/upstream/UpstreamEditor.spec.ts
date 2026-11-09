import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
import { SchemaForm } from '@sub2api/ui'
import { i18n } from '@/i18n'
import type { AccountType, Upstream, UpstreamAccountLayer } from '@/api/types'
import { ACCOUNT_FORM_KEY } from '@/components/schema/accountForm'
import { schemaWidgets } from '@/components/schema/widgets'
import UpstreamEditor from './UpstreamEditor.vue'

enableAutoUnmount(afterEach)

const upstream: Upstream = {
  preset: 'anthropic',
  accountConfig: true,
  auth: { type: 'header', name: 'x-api-key', value: '{api_key}' },
  headers: { 'anthropic-version': { default: '2023-06-01' }, 'content-type': { set: 'application/json' } },
  routes: { 'anthropic.messages': { path: '/v1/messages' }, 'anthropic.count_tokens': { path: '/v1/messages/count_tokens' } },
  filterFields: ['service_tier', 'inference_geo', 'speed']
}
const accountType = { plugin_key: 'custom', type: 'custom_anthropic', upstream } as unknown as AccountType

function render(modelValue?: UpstreamAccountLayer, errors: Record<string, string> = {}, at: AccountType | null = accountType) {
  const errs = ref(errors)
  const w = mount(UpstreamEditor, {
    props: {
      modelValue,
      'onUpdate:modelValue': (v: UpstreamAccountLayer | undefined) => void w.setProps({ modelValue: v })
    },
    global: { plugins: [i18n], provide: { [ACCOUNT_FORM_KEY as symbol]: { accountType: ref(at), errors: errs } } }
  })
  return Object.assign(w, { errs })
}
type Wrapper = ReturnType<typeof render>

const last = (w: Wrapper) => w.emitted('update:modelValue')?.at(-1)?.[0]
/** The input of a testid: on the input itself (SInput) or inside it (a header row). */
const field = (w: Wrapper, id: string) => w.get(`input[data-testid="${id}"], [data-testid="${id}"] input`)
const typeIn = async (w: Wrapper, id: string, value: string) => {
  await field(w, id).setValue(value)
  await flushPromises()
}

describe('upstream editor widget', () => {
  beforeEach(() => {
    i18n.global.locale.value = 'zh'
  })

  it('shows the type defaults as placeholders and stores nothing until changed', async () => {
    const w = render()
    await flushPromises()
    expect(field(w, 'upstream-auth-name').attributes('placeholder')).toBe('x-api-key')
    expect(field(w, 'upstream-auth-value').attributes('placeholder')).toBe('{api_key}')
    expect(field(w, 'upstream-route-anthropic.messages').attributes('placeholder')).toBe('/v1/messages')
    expect(w.text()).toContain('Count Tokens')
    expect(w.findAll('[data-testid="upstream-allow"] input[type="checkbox"]')).toHaveLength(3)
    expect(w.emitted('update:modelValue')).toBeUndefined()
    expect(w.get('[data-testid="upstream-reset"]').attributes('disabled')).toBeDefined()
  })

  it('emits the account layer and undefined once back at the defaults', async () => {
    const w = render()
    await typeIn(w, 'upstream-route-anthropic.messages', '/messages')
    expect(last(w)).toEqual({ routes: { 'anthropic.messages': { path: '/messages' } } })
    await field(w, 'upstream-allow-speed').setValue(true)
    await flushPromises()
    expect(last(w)).toEqual({ routes: { 'anthropic.messages': { path: '/messages' } }, allowFields: ['speed'] })
    await w.get('[data-testid="upstream-routes"] [data-testid="upstream-section-reset"]').trigger('click')
    await flushPromises()
    expect(last(w)).toEqual({ allowFields: ['speed'] })
    await w.get('[data-testid="upstream-reset"]').trigger('click')
    await flushPromises()
    expect(last(w)).toBeUndefined()
  })

  it('loads a stored layer and removes / restores a default header', async () => {
    const w = render({ headers: { 'x-org': { set: 'acme' } } })
    await flushPromises()
    expect(field(w, 'upstream-header-new').element).toHaveProperty('value', 'x-org')
    await w.get('[data-testid="upstream-header-anthropic-version"] [data-testid="upstream-header-toggle"]').trigger('click')
    await flushPromises()
    expect(last(w)).toEqual({ headers: { 'anthropic-version': null, 'x-org': { set: 'acme' } } })
    await w.get('[data-testid="upstream-header-anthropic-version"] [data-testid="upstream-header-toggle"]').trigger('click')
    await w.get('[data-testid="upstream-header-new"] [data-testid="upstream-header-toggle"]').trigger('click')
    await flushPromises()
    expect(last(w)).toBeUndefined()
  })

  it('switches the auth type and hints at what the server will reject', async () => {
    const w = render()
    await w
      .findAll('[data-testid="upstream-auth"] label')
      .find(b => b.text() === '查询参数')!
      .get('input')
      .trigger('change')
    await flushPromises()
    expect(last(w)).toEqual({ auth: { type: 'query', name: null, value: '{api_key}' } })
    expect(w.get('[data-testid="upstream-auth"]').text()).toContain('必填')
    await w.get('[data-testid="upstream-header-add"]').trigger('click')
    await typeIn(w, 'upstream-header-new', 'Cookie')
    expect(w.get('[data-testid="upstream-headers"]').text()).toContain('cookie 是凭证、逐跳或网关控制头')
  })

  it('lets a header read only the client headers the type receives', async () => {
    const w = render(undefined, {}, { ...accountType, pass_headers: ['anthropic-beta'] })
    await w.get('[data-testid="upstream-header-add"]').trigger('click')
    await typeIn(w, 'upstream-header-new', 'x-beta')
    const value = w.findAll('[data-testid="upstream-header-new"] input').at(-1)!
    await value.setValue('{client_header.anthropic-beta}')
    await flushPromises()
    expect(w.get('[data-testid="upstream-headers"]').text()).not.toContain('不是该账号类型收到的客户端请求头')
    await value.setValue('{client_header.x-other}')
    await flushPromises()
    expect(w.get('[data-testid="upstream-headers"]').text()).toContain('x-other 不是该账号类型收到的客户端请求头')
  })

  it('shows server errors on their inputs', async () => {
    const w = render(
      { routes: { 'anthropic.count_tokens': { path: '/count' } } },
      {
        upstream: 'routes.anthropic.count_tokens.path: path is wrong',
        'upstream.auth.value': 'value is wrong',
        'upstream.allowFields': 'not filtered'
      }
    )
    await flushPromises()
    expect(w.get('[data-testid="upstream-routes"]').text()).toContain('path is wrong')
    expect(w.get('[data-testid="upstream-auth"]').text()).toContain('value is wrong')
    expect(w.get('[data-testid="upstream-allow"]').text()).toContain('not filtered')
    w.errs.value = {}
    await flushPromises()
    expect(w.text()).not.toContain('path is wrong')
  })

  it('stays read-only without the type defaults', async () => {
    const w = render({ allowFields: ['speed'] }, {}, null)
    await flushPromises()
    expect(w.find('[data-testid="upstream-editor-unavailable"]').exists()).toBe(true)
    expect(w.emitted('update:modelValue')).toBeUndefined()
  })

  it('is the upstream-editor widget of the console SchemaForm', async () => {
    const value = ref<Record<string, unknown>>({ api_key: 'k' })
    const w = mount(SchemaForm, {
      props: {
        modelValue: value.value,
        schema: { type: 'object', properties: { api_key: { type: 'string' }, upstream: { type: 'object', title: '上游' } } },
        uiSchema: { upstream: { 'ui:widget': 'upstream-editor' } },
        widgets: schemaWidgets,
        'onUpdate:modelValue': (v: Record<string, unknown>) => void w.setProps({ modelValue: (value.value = v) })
      },
      global: { plugins: [i18n], provide: { [ACCOUNT_FORM_KEY as symbol]: { accountType: ref(accountType), errors: ref({}) } } }
    })
    await flushPromises()
    await w.get('input[data-testid="upstream-auth-name"]').setValue('X-Key')
    await flushPromises()
    expect(value.value).toEqual({ api_key: 'k', upstream: { auth: { name: 'x-key' } } })
  })
})
