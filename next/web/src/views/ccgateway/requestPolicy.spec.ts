import { describe, expect, it } from 'vitest'
import { attachmentAction, attachmentGroups, setAttachmentAction, customizeLayer, defaultRequestPolicy, featureDifferenceCount, featureLayers, followLayer, injectionTools, layerCustomized, legacyLevel, levelHasEnvironment, levelHasIdentity, levelHasPromptAndTools, levelInjection, levelOf, mergeFeaturePolicy, normalizeRequestPolicy, relayModeForLevel, savedOverrides, validRequestPolicy, type BuildInjection, type FeatureOverrides, type RequestPolicy } from './requestPolicy'

describe('CCGateway request policy', () => {
  it.each(Object.keys(attachmentGroups) as Array<keyof typeof attachmentGroups>)('customizes %s children without changing siblings or other groups', group => {
    const policy = defaultRequestPolicy()
    setAttachmentAction(policy, group, 'gateway')
    const children = attachmentGroups[group]
    for (const child of children) expect(attachmentAction(policy, child)).toBe('gateway')
    setAttachmentAction(policy, children[0], 'keep')
    expect(attachmentAction(policy, group)).toBe('')
    expect(attachmentAction(policy, children[0])).toBe('keep')
    for (const child of children.slice(1)) expect(attachmentAction(policy, child)).toBe('gateway')
    expect(policy.replace_client_attachments).not.toContain(group)
    expect(validRequestPolicy(policy)).toBe(true)
    expect(normalizeRequestPolicy(JSON.parse(JSON.stringify(policy)))).toEqual(policy)
    setAttachmentAction(policy, group, 'erase')
    expect(policy.erase_client_attachments).toEqual([group])
    expect(policy.replace_client_attachments).toEqual([])
    setAttachmentAction(policy, children[0], 'gateway')
    expect(attachmentAction(policy, children[0])).toBe('gateway')
    for (const child of children.slice(1)) expect(attachmentAction(policy, child)).toBe('erase')
    expect(validRequestPolicy(policy)).toBe(true)
  })
  it('rejects contradictory parent and child choices', () => {
    expect(validRequestPolicy({ ...defaultRequestPolicy(), erase_client_attachments: ['platform'], replace_client_attachments: ['shell'] })).toBe(false)
  })
  it.each(['erase_client_attachments', 'replace_client_attachments'] as const)('expands saved environment in %s without changing the other choices', field => {
    const saved = { [field]: ['environment', 'model'] as Array<'environment' | 'model'> }
    const policy = normalizeRequestPolicy(saved)
    expect(policy[field]).toEqual(['working_directory', 'platform', 'environment_update', 'model'])
    expect(validRequestPolicy(policy)).toBe(true)
    expect(normalizeRequestPolicy(policy)).toEqual(policy)
    expect(saved[field]).toEqual(['environment', 'model'])
  })
  it('accepts every canonical tool search threshold including zero and rejects malformed ranges', () => {
    for (let threshold = 0; threshold <= 100; threshold++) {
      expect(validRequestPolicy({ ...defaultRequestPolicy(), tool_search: `auto:${threshold}` })).toBe(true)
    }
    for (const mode of ['auto:-1', 'auto:101', 'auto:1.5', 'auto:+1', 'auto:01', 'auto: 1', 'auto:', 'auto:999999999999999999999']) {
      expect(validRequestPolicy({ ...defaultRequestPolicy(), tool_search: mode })).toBe(false)
    }
  })
  it('validates tool-search modes and ignores legacy beta rules', () => {
    const p = defaultRequestPolicy()
    expect(p.tool_search).toBe('request')
    expect(validRequestPolicy(p)).toBe(true)
    p.tool_search = 'auto:100'
    expect(validRequestPolicy(p)).toBe(true)
    p.tool_search = 'auto:101'
    expect(validRequestPolicy(p)).toBe(false)
    p.tool_search = 'request'
    p.betas = [{ name: 'custom-beta', mapping: 'tool_search' }]
    expect(validRequestPolicy(p)).toBe(true)
  })
  it('defaults to the low level without a relay mode or account rollout lists', () => {
    const p = defaultRequestPolicy()
    expect(p.level).toBe('low')
    expect(p).not.toHaveProperty('relay_mode')
    expect(p).not.toHaveProperty('relay_native_accounts')
    expect(p).not.toHaveProperty('relay_passthrough_accounts')
    expect(p).not.toHaveProperty('pass_upstream_errors')
    expect(validRequestPolicy(p)).toBe(true)
  })
  it.each(['medium', 'direct', '', undefined])('rejects an unknown level %s', level => {
    expect(validRequestPolicy({ ...defaultRequestPolicy(), level } as unknown as RequestPolicy)).toBe(false)
  })
  it.each(['native', 'legacy', 'passthrough', ''])('rejects an unnormalized relay mode %s beside a level', relay_mode => {
    expect(validRequestPolicy({ ...defaultRequestPolicy(), relay_mode } as unknown as RequestPolicy)).toBe(false)
  })
  // The core reads a retired or empty mode as build before features.LegacyLevel:
  // converting nothing and adding nothing is micro.
  it.each(['legacy', 'passthrough', 'native', '', undefined])('normalizes historical mode %s like build and drops obsolete lists without mutating input', relay_mode => {
    const historical = {
      relay_mode, relay_native_accounts: [24], relay_passthrough_accounts: [23],
      custom_tool_prefix: 'mytools', pass_upstream_errors: true
    }
    const policy = normalizeRequestPolicy(historical)
    expect(policy).toEqual({ ...defaultRequestPolicy(), level: 'micro', custom_tool_prefix: 'mytools' })
    expect(policy).not.toHaveProperty('pass_upstream_errors')
    expect(policy).not.toHaveProperty('relay_mode')
    expect(policy).not.toHaveProperty('relay_native_accounts')
    expect(policy).not.toHaveProperty('relay_passthrough_accounts')
    expect(validRequestPolicy(policy)).toBe(true)
    expect(normalizeRequestPolicy(policy)).toEqual(policy)
    expect(historical).toEqual({
      relay_mode, relay_native_accounts: [24], relay_passthrough_accounts: [23],
      custom_tool_prefix: 'mytools', pass_upstream_errors: true
    })
  })
  // A retired mode converting the environment is low, its attachments off.
  it('normalizes a retired mode converting the environment to low without adding attachments', () => {
    expect(normalizeRequestPolicy({ relay_mode: 'native', build_attachment_sources: { platform_name: 'worker' } })).toEqual({ ...defaultRequestPolicy(),
      build_attachment_sources: { platform_name: 'worker' }, build_injection: { attachments: { environment: false, model: false, total_tokens: false, date: false } } })
  })
  it('drops legacy attachment and beta settings from defaults and normalized editor state', () => {
    const obsolete = {
      attachment_source: 'gateway' as const,
      attachment_sources: { environment: 'both' as const, date: 'gateway' as const },
      environment_fields: { platform: 'gateway' as const, workingDirectory: 'client' as const },
      unknown_client_attachment: 'ignore' as const,
      unknown_gateway_attachment: 'pass' as const,
      unknown_beta: 'reject' as const
    }
    const historical = { ...defaultRequestPolicy(), ...obsolete, tool_search: 'auto:0', unknown_field: 'ignore' as const }
    const before = structuredClone(historical)
    const policy = normalizeRequestPolicy(historical)
    for (const key of Object.keys(obsolete)) {
      expect(defaultRequestPolicy()).not.toHaveProperty(key)
      expect(policy).not.toHaveProperty(key)
    }
    expect(policy).toEqual({ ...defaultRequestPolicy(), tool_search: 'auto:0', unknown_field: 'ignore' })
    expect(normalizeRequestPolicy(JSON.parse(JSON.stringify(policy)))).toEqual(policy)
    expect(historical).toEqual(before)
    expect(validRequestPolicy(policy)).toBe(true)
  })
  it('validates the active unknown-field and tool-namespace policies', () => {
    expect(validRequestPolicy({ ...defaultRequestPolicy(), unknown_field: 'reject', custom_tool_prefix: 'my-tools_1' })).toBe(true)
    expect(validRequestPolicy({ ...defaultRequestPolicy(), custom_tool_prefix: 'my__tools' })).toBe(false)
    expect(validRequestPolicy({ ...defaultRequestPolicy(), unknown_field: 'pass' } as unknown as RequestPolicy)).toBe(false)
  })
  it('normalizes a missing policy to the defaults and an empty saved one by LegacyLevel', () => {
    expect(normalizeRequestPolicy()).toEqual(defaultRequestPolicy())
    expect(normalizeRequestPolicy({})).toEqual({ ...defaultRequestPolicy(), level: 'micro' })
  })
  it('preserves supported policy overrides when normalizing', () => {
    const saved: RequestPolicy = {
      ...defaultRequestPolicy(), schema_version: 1, allow_fast: false, allow_effort: false,
      tool_search: 'auto:0', thinking_disabled_compat: 'omit', betas: []
    }
    expect(normalizeRequestPolicy(saved)).toEqual(saved)
  })
  it('allows an explicitly empty beta whitelist', () => {
    const p = defaultRequestPolicy()
    p.betas = []
    expect(validRequestPolicy(p)).toBe(true)
  })
  it('does not use legacy editable beta rules', () => {
    const p = defaultRequestPolicy()
    p.betas.push({ name: p.betas[0]!.name, mapping: 'forward' })
    expect(validRequestPolicy(p)).toBe(true)
    p.betas = [{ name: 'custom-beta', mapping: 'fast' }]
    expect(validRequestPolicy(p)).toBe(true)
  })
  it('does not share mutable defaults between editors', () => {
    const first = defaultRequestPolicy()
    first.betas.splice(0)
    expect(defaultRequestPolicy().betas.length).toBeGreaterThan(0)
  })
  it('allows fast mode and effort by default: the official API supports them', () => {
    const p = defaultRequestPolicy()
    expect(p.allow_fast).toBe(true)
    expect(p.allow_effort).toBe(true)
  })
})

// The same cases as contracts features/levels_test.go and identity_line.go.
describe('CCGateway request levels mirror the contracts', () => {
  it.each([
    ['none', 'direct', false, false, false],
    ['micro', 'build', true, false, false],
    ['low', 'build', true, true, false],
    ['high', 'build', true, true, true],
    ['', 'build', true, true, false]
  ] as const)('level %s includes the layers below it', (level, relay, identity, environment, high) => {
    expect([relayModeForLevel(level), levelHasIdentity(level), levelHasEnvironment(level), levelHasPromptAndTools(level)]).toEqual([relay, identity, environment, high])
  })
  it('adds a level\x27s layers at their defaults and nothing outside the level', () => {
    expect(levelInjection('micro', { system_prompt: true })).toBeUndefined()
    expect(levelInjection('none')).toBeUndefined()
    expect(levelInjection('low', { attachments: { date: false }, system_prompt: true, tools: { Read: true } })).toEqual({ attachments: { environment: true, model: true, total_tokens: true } })
    expect(levelInjection('high', { tools: { Bash: false, Agent: true } })).toEqual({ system_prompt: true, attachments: { environment: true, model: true, total_tokens: true, date: true }, tools: { Agent: true, Edit: true, Read: true, Write: true } })
    expect(levelInjection('low', { attachments: { environment: false, model: false, total_tokens: false, date: false } })).toBeUndefined()
  })
  it.each([
    ['direct', { platform_name: 'worker' }, { tools: { Read: true } }, 'none'],
    ['build', undefined, undefined, 'micro'],
    ['build', { platform_name: 'client' }, { system_prompt: false }, 'micro'],
    ['build', { platform_name: 'worker' }, undefined, 'low'],
    ['', undefined, { attachments: { date: true } }, 'low'],
    ['build', undefined, { system_prompt: true }, 'high'],
    ['build', undefined, { tools: { Read: true } }, 'high'],
    ['native', { platform_name: 'worker' }, undefined, '']
  ] as const)('maps legacy %s %j %j to %s', (relay, attachments, injection, want) => {
    expect(legacyLevel(relay, attachments, injection as BuildInjection | undefined)).toBe(want)
  })
  it('offers the seven tool candidates and drops the retired identity lines', () => {
    expect(injectionTools).toEqual(['Bash', 'Read', 'Edit', 'Write', 'Agent', 'WebSearch', 'NotebookEdit'])
    expect(validRequestPolicy({ ...defaultRequestPolicy(), build_injection: { tools: { ToolSearch: true } } } as unknown as RequestPolicy)).toBe(false)
    // The identity line is no longer configured: a saved value is not kept.
    expect(defaultRequestPolicy()).not.toHaveProperty('build_identity_lines')
    expect(normalizeRequestPolicy({ ...defaultRequestPolicy(), build_identity_lines: { cli: 'none' } } as never)).not.toHaveProperty('build_identity_lines')
    const legacy = { level: 'micro', build_identity_lines: { cli: 'none' } } as FeatureOverrides
    expect(savedOverrides(legacy)).toEqual({ level: 'micro' })
    expect(legacy).toHaveProperty('build_identity_lines')
    expect(mergeFeaturePolicy({ ...defaultRequestPolicy(), build_identity_lines: { cli: 'none' } } as never, legacy)).not.toHaveProperty('build_identity_lines')
  })
  // A group or an account follows or customizes each layer as a whole.
  it('customizes a layer with every inherited value explicit and follows it again by deleting them', () => {
    const parent: RequestPolicy = { ...defaultRequestPolicy(), level: 'high', build_billing_sources: { cc_version: 'worker' }, build_attachment_sources: { platform_name: 'worker', shell: 'erase' }, build_injection: { attachments: { date: false }, tools: { Agent: true } } }
    const base: FeatureOverrides = { unknown_field: 'ignore' }
    for (const layer of featureLayers) expect(layerCustomized(base, layer)).toBe(false)
    expect(customizeLayer(base, parent, 'level')).toEqual({ unknown_field: 'ignore', level: 'high' })
    expect(customizeLayer(base, parent, 'billing')).toEqual({ unknown_field: 'ignore', build_billing_entrypoint: 'sdk-cli', build_billing_sources: { cc_version: 'worker', cc_entrypoint: 'client' } })
    const env = customizeLayer(base, parent, 'environment')
    expect(env.build_attachment_sources).toEqual({ platform_name: 'worker', os_version: 'client', shell: 'erase', primary_directory: 'client', additional_directories: 'client', git_repository: 'client', worktree: 'client', scratchpad_directory: 'client', github_cli: 'client', agent_proxy: 'client' })
    expect(env.build_injection).toEqual({ attachments: { environment: true, model: true, total_tokens: true, date: false } })
    const all = customizeLayer(env, parent, 'prompt')
    expect(all.build_injection).toEqual({ attachments: { environment: true, model: true, total_tokens: true, date: false }, system_prompt: true, tools: { Bash: true, Read: true, Edit: true, Write: true, Agent: true, WebSearch: false, NotebookEdit: false } })
    for (const layer of ['environment', 'prompt'] as const) expect(layerCustomized(all, layer)).toBe(true)
    // Customizing changes nothing that applies; it only stops inheriting.
    const merged = mergeFeaturePolicy(parent, all)
    expect(levelInjection(merged.level, merged.build_injection)).toEqual(levelInjection(parent.level, parent.build_injection))
    expect(featureDifferenceCount(parent, all)).toBe(1) // unknown_field only
    expect(followLayer(all, 'environment')).toEqual({ unknown_field: 'ignore', build_injection: { system_prompt: true, tools: all.build_injection!.tools } })
    expect(followLayer(followLayer(all, 'environment'), 'prompt')).toEqual(base)
    expect(all.build_injection!.attachments).toBeDefined() // not mutated
    // A legacy override with some keys of a layer is customized; following drops a legacy mode too.
    expect(layerCustomized({ relay_mode: 'direct' }, 'level')).toBe(true)
    expect(layerCustomized({ build_injection: { system_prompt: false } }, 'prompt')).toBe(true)
    expect(layerCustomized({ build_injection: { tools: {} }, build_attachment_sources: {} }, 'prompt')).toBe(false)
    expect(followLayer({ level: 'none', relay_mode: 'direct' }, 'level')).toEqual({})
  })
  // A legacy build adding the prompt or a tool becomes high; the level's other
  // defaults are written off so it adds exactly what it did before.
  it('migrates a legacy high policy without adding anything it did not add', () => {
    const policy = normalizeRequestPolicy({ relay_mode: 'build', build_injection: { tools: { Read: true, ToolSearch: true } as Record<string, boolean>, attachments: { date: true } } })
    expect(policy.level).toBe('high')
    expect(policy).not.toHaveProperty('relay_mode')
    expect(policy.build_injection).toEqual({ system_prompt: false, attachments: { environment: false, model: false, total_tokens: false, date: true }, tools: { Bash: false, Read: true, Edit: false, Write: false } })
    expect(levelInjection(policy.level, policy.build_injection)).toEqual({ attachments: { date: true }, tools: { Read: true } })
    expect(validRequestPolicy(policy)).toBe(true)
    expect(normalizeRequestPolicy(policy)).toEqual(policy)
  })
  it('keeps a saved level and its omitted choices as they are', () => {
    const saved = { ...defaultRequestPolicy(), level: 'high' as const, relay_mode: 'build' as const, build_injection: { tools: { Agent: true } } }
    const policy = normalizeRequestPolicy(saved)
    expect(policy.level).toBe('high')
    expect(policy.build_injection).toEqual({ tools: { Agent: true } })
    expect(policy).not.toHaveProperty('relay_mode')
    expect(levelOf({ relay_mode: 'direct' })).toBe('none')
    expect(levelOf(undefined)).toBe('low')
  })
})
