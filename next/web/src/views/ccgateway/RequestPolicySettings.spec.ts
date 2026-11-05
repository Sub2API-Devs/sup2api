import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { i18n } from '@/i18n'
import RemoteSettings from './RemoteSettings.vue'
import { defaultRequestPolicy, type RequestPolicy } from './requestPolicy'

const mocks = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), post: vi.fn(), list: vi.fn() }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ has: () => true }) }))
vi.mock('@sub2api/host', () => ({ api: mocks }))

// A connected controller (per-account containers are the only mode, CONTRACTS §53.9): saving
// other settings sends the endpoint back unchanged.
function config(policy: Partial<RequestPolicy> | undefined) {
  return {
    account_runtimes: true, mode: 'controller', scheme: 'https', host: 'ccg.example.com', port: 443, user: '', auth_mode: '', host_key_fingerprint: '',
    has_password: false, has_private_key: false, has_passphrase: false, has_admin_key: true, has_api_key: false,
    request_policy: policy, images: null, network: { pool: '10.0.0.0/8', allocation: 'random' }
  }
}
const TABS = ['connection', 'network', 'cc', 'deployment'] as const
const tab = (w: VueWrapper, key: (typeof TABS)[number]) => w.findAll('[data-testid="settings-tabs"] [role="tab"]')[TABS.indexOf(key)]
// The billing sources and the level are segmented controls (radios in option
// order); the environment fields one radio matrix (client, worker, erase).
const radios = (w: VueWrapper, sel: string) => w.get(sel).findAll('input')
const picked = (w: VueWrapper, sel: string) => radios(w, sel).findIndex(i => (i.element as HTMLInputElement).checked)
const pick = (w: VueWrapper, sel: string, index: number) => radios(w, sel)[index]!.setValue(true)
const levels = ['none', 'micro', 'low', 'high']
const level = (w: VueWrapper, value: string) => w.get('[data-testid="request-level"]').setValue(String(levels.indexOf(value)))
const levelPicked = (w: VueWrapper) => levels[Number(w.get<HTMLSelectElement>('[data-testid="request-level"]').element.value)]
// Attachments and tools are toggle chips; the field matrix is folded under its summary.
const chip = (w: VueWrapper, sel: string) => w.get(`${sel} button`)
const pressed = (w: VueWrapper, sel: string) => chip(w, sel).attributes('aria-pressed') === 'true'
const openConvert = (w: VueWrapper) => w.get('[data-testid="environment-convert-edit"] button').trigger('click')
function storing() {
  let stored = config(defaultRequestPolicy())
  mocks.get.mockImplementation(async () => structuredClone(stored))
  mocks.put.mockImplementation(async (_url, body) => {
    stored = config(JSON.parse(JSON.stringify(body.request_policy)))
    return structuredClone(stored)
  })
  return () => stored.request_policy!
}

describe('CCGateway request levels', () => {
  beforeEach(() => { vi.resetAllMocks(); i18n.global.locale.value = 'zh' })
  async function render() {
    const w = mount(RemoteSettings, { global: { plugins: [i18n, createPinia()], stubs: { teleport: true } } })
    await flushPromises()
    await tab(w, 'cc').trigger('click')
    return w
  }
  it('preserves disabled group drafts and sends revision with the settings transaction', async () => {
    const saved = { ...config(defaultRequestPolicy()), feature_revision: 12, cc_feature_groups: { 3: { enabled: true, allow_account_override: true, overrides: { build_billing_sources: { cc_version: 'worker' } } } } }
    mocks.get.mockResolvedValue(saved)
    mocks.list.mockResolvedValue({ items: [{ id: 3, name: 'Group 3' }], paged: false })
    mocks.put.mockResolvedValue(saved)
    const w = await render()
    await w.get('[data-testid="feature-layer"] input[value="group"]').setValue(true)
    await flushPromises()
    await w.get('[data-testid="group-policy-3"] [data-testid="group-configure"]').trigger('click')
    await w.get('[data-testid="group-enabled"]').setValue(false)
    expect(w.find('[data-testid="billing-cc_version"]').exists()).toBe(false)
    await w.get('form').trigger('submit'); await flushPromises()
    expect(mocks.put).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ feature_revision: 12, cc_feature_groups: { 3: { enabled: false, allow_account_override: true, overrides: { build_billing_sources: { cc_version: 'worker' } } } } }), expect.anything())
    w.unmount()
  })
  // The relay mode and the non-CC card are gone: the level decides both.
  it('offers the four levels with what each includes, defaults to low and hides removed controls', async () => {
    mocks.get.mockResolvedValue(config(undefined))
    const w = await render()
    const cards = w.get('[data-testid="request-level"]')
    expect(cards.findAll('option').map(o => o.text())).toEqual(['0 注入', '微注入', '低注入（默认）', '高注入'])
    expect(levelPicked(w)).toBe('low')
    expect(w.get('[data-testid="level-desc"]').text()).toContain('缺的首轮附件补上')
    // The layers the level includes: from low the prompt layer too (its
    // system prompt is a choice there, 2026-11-02).
    const layers = w.get('[data-testid="level-layers"]').findAll('[data-on]').map(c => c.text())
    expect(layers).toEqual(['计费头', '身份行', '环境', '提示词与工具'])
    await level(w, 'none')
    expect(w.get('[data-testid="level-desc"]').text()).toContain('只处理开头的计费头（direct）')
    expect(w.get('[data-testid="level-layers"]').findAll('[data-on]').map(c => c.text())).toEqual(['计费头'])
    for (const id of ['relay-mode', 'direct-hint', 'build-injection', 'cli-request-mode', 'tool-search', 'client-attachments', 'custom-tool-prefix', 'thinking-disabled-compat', 'unknown-field', 'layer-mode-level']) {
      expect(w.find(`[data-testid="${id}"]`).exists()).toBe(false)
    }
    w.unmount()
  })
  it.each(['none', 'micro', 'low', 'high'] as const)('saves level %s with a pinned CLI version and no relay mode', async value => {
    mocks.get.mockResolvedValue(config({ ...defaultRequestPolicy(), level: value === 'low' ? 'high' : 'low' }))
    const w = await render()
    await level(w, value)
    mocks.put.mockResolvedValue(config({ ...defaultRequestPolicy(), level: value }))
    await w.get('form').trigger('submit'); await flushPromises()
    const sent = mocks.put.mock.calls[0]![1].request_policy
    expect(sent).toMatchObject({ level: value, cli_version: '2.1.312' })
    expect(sent).not.toHaveProperty('relay_mode')
    w.unmount()
  })
  // The core accepts request policy schema 1 only (contracts/features
  // PolicySchemaVersion); an edited global policy must still decode there.
  it('never sends a request policy schema the core rejects', async () => {
    mocks.get.mockResolvedValue(config({ ...defaultRequestPolicy(), schema_version: 1 }))
    const w = await render()
    await pick(w, '[data-testid="billing-cc_version"]', 1)
    await level(w, 'none')
    mocks.put.mockResolvedValue(config(defaultRequestPolicy()))
    await w.get('form').trigger('submit'); await flushPromises()
    const sent = mocks.put.mock.calls[0]![1].request_policy
    expect([undefined, 1]).toContain(sent.schema_version)
    w.unmount()
  })
  // Level 0 is the billing header alone: its entrypoint and both field sources
  // stay editable; the identity line and the environment fold with the level
  // they need, and come back as they were.
  it('folds the layers above the level and keeps the billing header at every level', async () => {
    mocks.get.mockResolvedValue(config({ ...defaultRequestPolicy(), level: 'none' }))
    const w = await render()
    expect(levelPicked(w)).toBe('none')
    for (const id of ['billing-cc_version', 'billing-cc_entrypoint', 'billing-entrypoint']) expect(w.find(`[data-testid="${id}"]`).exists()).toBe(true)
    expect(w.get('[data-testid="billing-sources"]').text()).toContain('请求没有计费头时补完整的主代理计费头')
    expect(w.get('[data-testid="billing-sources"]').text()).toContain('所有等级')
    for (const [id, needs] of [['identity-lines', '微注入'], ['build-attachments', '低注入'], ['prompt-tools', '低注入']] as const) {
      expect(w.get(`[data-testid="${id}"]`).attributes('data-locked')).toBe('true')
      expect(w.get(`[data-testid="${id}"]`).text()).toContain(`提升到${needs}后生效`)
    }
    for (const id of ['identity-adaptive', 'environment-convert', 'injection-attachments-date', 'injection-system_prompt']) expect(w.find(`[data-testid="${id}"]`).exists()).toBe(false)
    // Opened, a folded layer shows its kept choices read-only.
    await w.get('[data-testid="build-attachments"] button[aria-expanded]').trigger('click')
    expect(chip(w, '[data-testid="injection-attachments-date"]').attributes('disabled')).toBeDefined()
    await level(w, 'micro')
    expect(w.get('[data-testid="identity-lines"]').attributes('data-locked')).toBeUndefined()
    expect(w.get('[data-testid="identity-lines"]').text()).toContain('微注入起')
    expect(w.get('[data-testid="build-attachments"]').attributes('data-locked')).toBe('true')
    const billing = w.get('[data-testid="billing-sources"]')
    expect(billing.get('[data-testid="billing-cc_version"]').findAll('label').map(l => l.text())).toEqual(['客户端', '服务端'])
    expect(picked(w, '[data-testid="billing-cc_version"]')).toBe(0)
    w.unmount()
  })
  // The identity line has no settings any more: a read-only card with the
  // rules, and a saved choice is dropped on the next save (the core ignores it).
  it('picks the server entrypoint, shows the identity rules and drops saved identity lines', async () => {
    const stored = storing()
    mocks.get.mockImplementation(async () => config({ ...defaultRequestPolicy(), build_identity_lines: { cli: 'none' } } as Partial<RequestPolicy>))
    let w = await render()
    const select = (id: string) => w.get<HTMLSelectElement>(`[data-testid="${id}"]`).element
    const options = (id: string) => Array.from(select(id).options).filter(o => !o.disabled).map(o => o.textContent?.trim())
    const chosen = (id: string) => select(id).options[select(id).selectedIndex]?.textContent?.trim()
    expect(options('billing-entrypoint-select')).toEqual(['cli', 'sdk-cli', 'sdk-ts', 'sdk-py', 'claude-desktop', 'claude-vscode'])
    expect(chosen('billing-entrypoint-select')).toBe('sdk-cli')
    const identity = w.get('[data-testid="identity-lines"]')
    expect(identity.text()).toContain('自适应：请求没有身份行时按计费头里的入口补')
    expect(identity.find('select').exists()).toBe(false)
    expect(identity.find('input').exists()).toBe(false)
    await identity.get('[data-testid="identity-rules"] button').trigger('click')
    const rules = identity.findAll('dt').map((dt, i) => [dt.text(), identity.findAll('dd')[i]!.text()])
    expect(rules).toEqual([
      ['cli', 'Claude Code CLI（终端）'],
      ['claude-desktop、claude-vscode', 'Claude Code + Agent SDK'],
      ['sdk-cli、sdk-ts、sdk-py', '补了内置提示词时 Claude Code + Agent SDK，其余 Claude Agent SDK'],
      ['其他入口', '按服务端入口']
    ])
    await w.get('[data-testid="billing-entrypoint-select"]').setValue('5')
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(mocks.put.mock.calls[0]![1].request_policy).not.toHaveProperty('build_identity_lines')
    expect(stored().build_billing_entrypoint).toBe('claude-vscode')
    expect(stored()).not.toHaveProperty('build_identity_lines')
    w.unmount()
    mocks.get.mockImplementation(async () => structuredClone(config(stored())))
    w = await render()
    expect(chosen('billing-entrypoint-select')).toBe('claude-vscode')
    w.unmount()
  })
  // Omitted choices are the level's defaults (LevelInjection): low adds every
  // first-turn attachment and offers the system prompt, off (2026-11-02);
  // high adds the prompt and Bash, Read, Edit, Write, the other tools off.
  it('shows the level defaults, saves the choices made and keeps them below their level', async () => {
    const stored = storing()
    let w = await render()
    const prompt = '[data-testid="injection-system_prompt"]', env = '[data-testid="injection-attachments-environment"]', date = '[data-testid="injection-attachments-date"]'
    const tool = (name: string) => `[data-testid="injection-tools-${name}"]`
    const promptOn = () => w.get<HTMLInputElement>(prompt).element.checked
    for (const name of ['environment', 'model', 'total_tokens', 'date']) expect(pressed(w, `[data-testid="injection-attachments-${name}"]`)).toBe(true)
    expect(w.get('[data-testid="environment-inject"]').text()).toContain('缺少时补')
    // Low: the prompt switch, off, says what it adds; the tools wait for high.
    expect(promptOn()).toBe(false)
    expect(w.get(prompt).attributes('disabled')).toBeUndefined()
    expect(w.get('[data-testid="system-prompt-row"]').text()).toContain('两块内置系统提示词')
    expect(w.get('[data-testid="system-prompt-row"]').text()).toContain('# Using your tools')
    expect(w.get('[data-testid="injection-tools"]').attributes('data-locked')).toBe('true')
    expect(w.get('[data-testid="tools-locked"]').text()).toContain('提升到高注入后生效')
    expect(chip(w, tool('Bash')).attributes('disabled')).toBeDefined()
    await w.get(prompt).setValue(true)
    await w.get('form').trigger('submit'); await flushPromises()
    expect(stored().level).toBe('low')
    expect(stored().build_injection).toEqual({ system_prompt: true })
    await level(w, 'high')
    expect(promptOn()).toBe(true)
    expect(w.get('[data-testid="prompt-tools"]').text()).toContain('客户端 system 并入 CC 动态块，与 --append-system-prompt 相同')
    expect(w.get('[data-testid="injection-tools"]').findAll('[data-testid^="injection-tools-"]').map(c => c.attributes('data-testid'))).toEqual(
      ['Bash', 'Read', 'Edit', 'Write', 'Agent', 'ListAgents', 'ReportFindings', 'ScheduleWakeup', 'Skill', 'ToolSearch', 'Workflow', 'WebSearch', 'NotebookEdit'].map(n => 'injection-tools-' + n))
    for (const name of ['Bash', 'Read', 'Edit', 'Write']) expect(pressed(w, tool(name))).toBe(true)
    for (const name of ['Agent', 'ListAgents', 'ReportFindings', 'ScheduleWakeup', 'Skill', 'ToolSearch', 'Workflow', 'WebSearch', 'NotebookEdit']) expect(pressed(w, tool(name))).toBe(false)
    const hints = w.get('[data-testid="tool-hints"]').findAll('li').map(li => li.text())
    expect(hints).toEqual([
      'Bash：后台运行的超时默认值按原生 -p 会话',
      'Agent：不补“可用代理类型”清单',
      'ListAgents：说明文字按工具池里有没有 SendMessage 生成',
      'Skill：不补技能清单',
      'ListAgents、ReportFindings、ScheduleWakeup、Skill、ToolSearch、Workflow：与官方 2.1.316 首轮一致，默认不选；只带定义，调用交回客户端。CLI 不支持（build_injection_tools_v2）的账号自动不带，其余照常',
      'ToolSearch：选中时按官方带上延迟加载的占位工具，WebSearch、NotebookEdit 改为延迟加载、不发送',
      'WebSearch、NotebookEdit：没有 ToolSearch 时按完整定义发送；选了 ToolSearch 时不发送，与官方首轮一致'
    ])
    expect(w.get('[data-testid="tools-client-note"]').text()).toBe('工具调用都交回客户端执行，客户端必须能执行')
    await chip(w, env).trigger('click')
    await chip(w, tool('Agent')).trigger('click')
    await chip(w, tool('Bash')).trigger('click')
    await chip(w, tool('Skill')).trigger('click')
    await w.get('form').trigger('submit'); await flushPromises()
    expect(stored().level).toBe('high')
    expect(stored().build_injection).toEqual({ system_prompt: true, attachments: { environment: false }, tools: { Agent: true, Bash: false, Skill: true } })
    w.unmount()
    w = await render()
    expect(levelPicked(w)).toBe('high')
    expect(promptOn()).toBe(true)
    expect(pressed(w, env)).toBe(false)
    expect(pressed(w, date)).toBe(true)
    expect(pressed(w, tool('Agent'))).toBe(true)
    expect(pressed(w, tool('Bash'))).toBe(false)
    // One choice for both levels: turned off at high, it is off at low too.
    await w.get(prompt).setValue(false)
    await level(w, 'low')
    expect(promptOn()).toBe(false)
    await level(w, 'micro')
    expect(w.find(prompt).exists()).toBe(false)
    expect(w.find(env).exists()).toBe(false)
    await w.get('form').trigger('submit'); await flushPromises()
    expect(stored()).toMatchObject({ level: 'micro', build_injection: { system_prompt: false, attachments: { environment: false }, tools: { Agent: true, Bash: false, Skill: true } } })
    w.unmount()
  })
  it('saves independent attachment sources in plugin settings and restores them after reload', async () => {
    const stored = storing()
    let w = await render()
    const platform = '[data-testid="build-attachment-platform_name"]'
    const os = '[data-testid="build-attachment-os_version"]'
    expect(w.get('[data-testid="environment-convert-summary"]').text()).toBe('全部保留客户端')
    await openConvert(w)
    expect(picked(w, platform)).toBe(0)
    await pick(w, platform, 1)
    expect(w.get('[data-testid="environment-convert-summary"]').text()).toBe('平台名称用服务端；其余保留客户端')
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(mocks.put).toHaveBeenCalled()
    expect(stored().build_attachment_sources).toEqual({ platform_name: 'worker' })
    w.unmount()
    w = await render()
    await openConvert(w)
    expect(picked(w, platform)).toBe(1)
    expect(picked(w, os)).toBe(0)
    await pick(w, os, 1)
    await level(w, 'micro')
    expect(w.find(platform).exists()).toBe(false)
    expect(w.text()).toContain('提升到低注入后生效')
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(stored().build_attachment_sources).toEqual({ platform_name: 'worker', os_version: 'worker' })
    await level(w, 'low')
    await openConvert(w)
    await pick(w, platform, 0)
    await pick(w, os, 0)
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(stored().build_attachment_sources).toEqual({ platform_name: 'client', os_version: 'client' })
    w.unmount()
  })
  // Session memory (2026-11-05): two lifetimes in seconds, 24 hours unless
  // chosen, quick choices of 1 hour, 24 hours and 7 days, at every level; a
  // value outside 60 s .. 30 days is not saved.
  it('sets the session memory lifetimes with the quick choices or in seconds', async () => {
    const stored = storing()
    let w = await render()
    const card = w.get('[data-testid="session-memory"]')
    expect(card.text()).toContain('线程状态有效期')
    expect(card.text()).toContain('工具清单有效期')
    const preset = (field: string) => `[data-testid="session-memory-${field}-preset"]`
    const input = (field: string) => w.get<HTMLInputElement>(`input[data-testid="session-memory-${field}-input"]`)
    expect(w.get(preset('thread_ttl_seconds')).findAll('label').map(l => l.text())).toEqual(['1 小时', '24 小时', '7 天'])
    expect(picked(w, preset('thread_ttl_seconds'))).toBe(1)
    expect(input('tools_ttl_seconds').element.value).toBe('86400')
    await w.get('form').trigger('submit'); await flushPromises()
    expect(stored()).not.toHaveProperty('session_memory')
    // At level 0 too.
    await level(w, 'none')
    await pick(w, preset('thread_ttl_seconds'), 0)
    input('tools_ttl_seconds').element.value = '120'
    await input('tools_ttl_seconds').trigger('change')
    expect(picked(w, preset('tools_ttl_seconds'))).toBe(-1)
    await w.get('form').trigger('submit'); await flushPromises()
    expect(stored().session_memory).toEqual({ thread_ttl_seconds: 3600, tools_ttl_seconds: 120 })
    w.unmount()
    w = await render()
    expect(picked(w, preset('thread_ttl_seconds'))).toBe(0)
    expect(input('tools_ttl_seconds').element.value).toBe('120')
    // Too short: shown as an error and not saved.
    mocks.put.mockClear()
    input('thread_ttl_seconds').element.value = '30'
    await input('thread_ttl_seconds').trigger('change')
    expect(w.get('[data-testid="session-memory-thread_ttl_seconds"]').text()).toContain('60 秒到 30 天')
    await w.get('form').trigger('submit'); await flushPromises()
    expect(mocks.put).not.toHaveBeenCalled()
    expect(w.text()).toContain('配置格式不正确')
    await pick(w, preset('thread_ttl_seconds'), 2)
    await w.get('form').trigger('submit'); await flushPromises()
    expect(stored().session_memory).toEqual({ thread_ttl_seconds: 604800, tools_ttl_seconds: 120 })
    w.unmount()
  })
  // A policy saved before levels gets the level features.LegacyLevel gives it
  // (a retired mode read as build, as the core does); saving writes that level
  // and no relay mode.
  it.each([['native', 'micro'], ['legacy', 'micro'], ['passthrough', 'micro'], ['', 'micro'], [undefined, 'micro'], ['direct', 'none'], ['build', 'micro']] as const)('migrates stored mode %s to level %s', async (mode, want) => {
    const saved = { ...defaultRequestPolicy(), relay_mode: mode } as Partial<RequestPolicy>
    delete saved.level
    mocks.get.mockResolvedValue(config(saved))
    const w = await render()
    expect(levelPicked(w)).toBe(want)
    mocks.put.mockResolvedValue(config(defaultRequestPolicy()))
    await w.get('form').trigger('submit'); await flushPromises()
    const sent = mocks.put.mock.calls[0]![1].request_policy
    expect(sent.level).toBe(want)
    expect(sent).not.toHaveProperty('relay_mode')
    w.unmount()
  })
})
