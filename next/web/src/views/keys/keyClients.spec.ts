import { describe, expect, it } from 'vitest'
import { CLIENTS, ccSwitchLink, ccSwitchUsageScript, clientsFor } from './keyClients'

const client = (id: string) => CLIENTS.find(c => c.id === id)!
const base = 'https://gw.example.com'
const key = 'sk-s2a-test'

describe('API key clients', () => {
  it('reads the balance left from the /v1/usage of the gateway in CC Switch', () => {
    const script = ccSwitchUsageScript(base)
    expect(script).toContain(`url: "${base}/v1/usage"`)
    expect(script).not.toContain(key)
    // The script is an expression CC Switch evaluates and calls.
    const { extractor } = new Function(`return ${script}`)()
    expect(extractor({ isValid: true, remaining: 6.5, unit: 'USD' })).toEqual({ isValid: true, remaining: 6.5, unit: 'USD' })
    expect(extractor({ isValid: false, remaining: 0 })).toEqual({ isValid: false, remaining: 0, unit: 'USD' })
  })
  it('offers the clients of the platforms a key reaches', () => {
    expect(clientsFor(['openai', 'volcengine', 'anthropic']).map(c => c.id)).toEqual(['claude', 'codex'])
    expect(clientsFor(['volcengine'])).toEqual([])
    expect(clientsFor(undefined)).toEqual([])
  })
  it('writes the environment for each shell', () => {
    const run = (shell: 'unix' | 'powershell' | 'cmd') => client('claude').snippets(base, key, shell)[0].content
    expect(run('unix')).toBe(`export ANTHROPIC_BASE_URL="${base}"\nexport ANTHROPIC_AUTH_TOKEN="${key}"`)
    expect(run('powershell')).toBe(`$env:ANTHROPIC_BASE_URL="${base}"\n$env:ANTHROPIC_AUTH_TOKEN="${key}"`)
    expect(run('cmd')).toBe(`set ANTHROPIC_BASE_URL=${base}\nset ANTHROPIC_AUTH_TOKEN=${key}`)
    const settings = client('claude').snippets(base, key, 'unix')[1]
    expect(settings.path).toBe('~/.claude/settings.json')
    expect(JSON.parse(settings.content)).toEqual({ env: { ANTHROPIC_BASE_URL: base, ANTHROPIC_AUTH_TOKEN: key } })
  })
  it('points Codex at the /v1 responses API with the key in auth.json', () => {
    const [config, auth] = client('codex').snippets(base, key, 'cmd')
    expect(config.path).toBe(String.raw`%USERPROFILE%\.codex\config.toml`)
    expect(config.content).toContain(`base_url = "${base}/v1"`)
    expect(config.content).toContain('wire_api = "responses"')
    expect(JSON.parse(auth.content)).toEqual({ OPENAI_API_KEY: key })
  })
  it('builds the CC Switch import link', () => {
    const link = new URL(ccSwitchLink(client('codex'), base, 'gw.example.com', key))
    expect(link.protocol).toBe('ccswitch:')
    expect(Object.fromEntries(link.searchParams)).toEqual({
      resource: 'provider',
      app: 'codex',
      name: 'gw.example.com',
      homepage: base,
      endpoint: `${base}/v1`,
      apiKey: key,
      configFormat: 'json',
      usageEnabled: 'true',
      usageScript: btoa(ccSwitchUsageScript(base)),
      usageAutoInterval: '30'
    })
    expect(new URL(ccSwitchLink(client('claude'), base, 'n', key)).searchParams.get('endpoint')).toBe(base)
  })
  it.each([
    ['claude', 'claude', base],
    ['codex', 'codex', `${base}/v1`],
    ['gemini', 'gemini', base]
  ])('imports %s into CC Switch as its app %s at %s', (id, app, endpoint) => {
    const link = ccSwitchLink(client(id), base, 'gw.example.com', key)
    expect(link.startsWith('ccswitch://v1/import?resource=provider&')).toBe(true)
    expect(Object.fromEntries(new URL(link).searchParams)).toMatchObject({ app, endpoint, homepage: base, apiKey: key })
  })
  it.each(['laptop key', '我的 网关', 'a&b=c'])('encodes the name %j in the CC Switch link', name => {
    const link = ccSwitchLink(client('claude'), base, name, key)
    expect(link).not.toMatch(/\s|[^\x20-\x7e]/)
    expect(new URL(link).searchParams.getAll('name')).toEqual([name])
  })
  it('joins paths onto a gateway address ending in a slash with one slash', () => {
    expect(ccSwitchLink(client('codex'), `${base}/`, 'n', key)).toBe(ccSwitchLink(client('codex'), base, 'n', key))
  })
})
