// Mock of a plugin that declares common controls (docs/COMMON-CONTROLS.md):
// one account type whose editor hides the priority and the parameter
// override, locks the weight, fixes the RPM limit, prefills header
// passthrough and a model mapping and needs a proxy; and an editor section
// (account.editor.section) whose native component edits a value of its own
// with the host's HeaderPassthroughEditor (host.components, UI 3.7). Its
// credential form also picks entities with the console's schema widgets
// (docs/COMMON-CONTROLS.md §6): `entity-select` (one user, up to three
// groups) and `proxy-select`.

export const controlsAccountTypes = [
  {
    plugin_key: 'controls_demo',
    plugin_name: { en: 'Common controls demo', zh: '通用配置演示' },
    plugin_version: '0.1.0',
    asset_base: '/plugin-ui/controls_demo/0.1.0-dev',
    trust: 'official',
    type: 'apikey',
    label: { en: 'API Key (declared controls)', zh: 'API Key（声明通用配置）' },
    description: { en: 'Hides, locks and prefills core fields through commonControls', zh: '通过 commonControls 隐藏、锁定、预填核心字段' },
    form: { mode: 'schema' },
    sensitive_fields: ['api_key'],
    supports: ['openai'],
    default_limits: { weight: 3, tpm_limit: 100000 },
    common_controls: {
      priority: { visible: false },
      weight: { locked: true, default: 5 },
      rpm_limit: { configurable: false, default: 60 },
      param_override: { visible: false },
      header_passthrough: { default: ['regex:^x-demo-'] },
      model_mapping: { default: { 'gpt-demo': 'gpt-4.1-mini' } },
      proxy: { required: true }
    }
  }
]

export const controlsForm = {
  schema: {
    type: 'object',
    required: ['api_key'],
    properties: {
      api_key: { type: 'string', title: 'API Key', writeOnly: true },
      billing_user_id: { type: ['integer', 'null'] },
      fallback_group_ids: { type: 'array', items: { type: 'integer' }, maxItems: 3 },
      probe_proxy_id: { type: ['integer', 'null'] }
    }
  },
  ui_schema: {
    api_key: { 'ui:widget': 'secret' },
    billing_user_id: { 'ui:widget': 'entity-select', 'ui:options': { kind: 'user' }, 'ui:title': { en: 'Billed user', zh: '计费用户' }, 'ui:help': { en: 'Usage of this account is billed to this user', zh: '该账号的用量记到这个用户名下' } },
    fallback_group_ids: { 'ui:widget': 'entity-select', 'ui:options': { kind: 'group', max: 3 }, 'ui:title': { en: 'Fallback groups', zh: '备用分组' }, 'ui:help': { en: 'Up to three', zh: '最多三个' } },
    probe_proxy_id: { 'ui:widget': 'proxy-select', 'ui:title': { en: 'Probe proxy', zh: '探测代理' } }
  }
}

export const controlsUIPlugin = {
  key: 'controls_demo',
  version: '0.1.0',
  name: { en: 'Common controls demo', zh: '通用配置演示' },
  asset_base: '/plugin-ui/controls_demo/0.1.0-dev',
  menus: [],
  pages: {},
  slots: [
    {
      slot: 'account.editor.section',
      component: 'ControlsDemoSection',
      label: { en: 'Demo section', zh: '演示分区' },
      icon: 'puzzle',
      accountTypes: ['apikey']
    }
  ],
  native_entry: 'ui/native/entry.js',
  trust: 'official',
  host_ui_compat: '^3.7'
}

// A hand-written native entry (no build step): the section keeps its value in memory.
const ENTRY = `
import { defineComponent, h, ref } from 'vue'
export function register(host) {
  host.registerComponent('ControlsDemoSection', defineComponent({
    props: { account: Object, accountType: Object, readonly: Boolean },
    setup(props) {
      const rules = ref(['x-demo-trace'])
      return () => h('div', { class: 'card space-y-3 p-4' }, [
        h('p', { class: 'text-sm text-fg-muted' }, 'Account #' + props.account?.id + ' · ' + (props.accountType?.type || '')),
        h(host.components.HeaderPassthroughEditor, { modelValue: rules.value, disabled: props.readonly, 'onUpdate:modelValue': v => (rules.value = v) })
      ])
    }
  }))
}
`

export function controlsAsset(path: string): { type: string; body: string } | null {
  return path === 'ui/native/entry.js' ? { type: 'text/javascript', body: ENTRY } : null
}

/** The server's common control checks (handlers.go applyCommonControls), on a create or patch body. */
export function checkControls(controls: Record<string, any> | undefined, body: Record<string, any>, current?: Record<string, any>) {
  for (const [field, c] of Object.entries(controls || {})) {
    if (field === 'proxy') continue
    const fixed = c.locked || c.configurable === false
    const expected = c.locked || !current ? c.default : current[field]
    if (fixed && body[field] !== undefined && JSON.stringify(body[field]) !== JSON.stringify(expected)) return { field, code: 'read_only' }
    if (body[field] === undefined && !current && c.default !== undefined) body[field] = c.default
  }
  const proxy = 'proxy_id' in body || 'proxy_url' in body ? (body.proxy_id ?? body.proxy_url) : current?.proxy_id
  if (controls?.proxy?.required && proxy == null) return { field: 'proxy_id', code: 'required' }
  return null
}
