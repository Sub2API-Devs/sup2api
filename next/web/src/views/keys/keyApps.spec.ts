import { describe, expect, it } from 'vitest'
import { keyAppsFor, magpieFields, magpieLink } from './keyApps'
import { CLIENTS, ccSwitchLink } from './keyClients'

const base = 'https://gw.example.com'
const key = 'sk-s2a-test'
const all = ['anthropic', 'openai', 'gemini']
const params = (link: string) => Object.fromEntries(new URL(link).searchParams)
const app = (platforms: string[], id: string) => keyAppsFor(platforms).find(a => a.id === id)!

describe('Magpie import link', () => {
  it('carries the key, every endpoint the platforms speak and the balance query, without models', () => {
    const link = magpieLink(all, base, 'gw.example.com', key)
    expect(link.startsWith('magpie://import?')).toBe(true)
    expect(params(link)).toEqual({
      name: 'gw.example.com',
      key,
      anthropic: base,
      chat: `${base}/v1`,
      responses: `${base}/v1`,
      gemini: `${base}/v1beta`,
      website: base,
      balance: `${base}/v1/usage`,
      balance_path: 'remaining'
    })
  })
  it.each([
    [['anthropic'], ['anthropic']],
    [['openai'], ['chat', 'responses']],
    [['gemini'], ['gemini']],
    [
      ['gemini', 'volcengine', 'anthropic'],
      ['anthropic', 'gemini']
    ]
  ])('names only the protocols of %j', (platforms, endpoints) => {
    const got = Object.keys(params(magpieLink(platforms, base, 'n', key)))
    expect(got).toEqual(['name', 'key', ...endpoints, 'balance', 'balance_path', 'website'])
  })
  it.each(['laptop key', '我的 网关', 'a&b=c', 'x#y?z', '100%+1'])('encodes the name %j so it reads back whole', name => {
    const link = magpieLink(all, base, name, 'sk-s2a+/=&k')
    expect(link).not.toMatch(/[\s#]|[^\x20-\x7e]/)
    expect(params(link)).toMatchObject({ name, key: 'sk-s2a+/=&k' })
    expect(new URL(link).searchParams.getAll('name')).toEqual([name])
  })
  it('spells a space as %20 and keeps a literal plus apart from it', () => {
    expect(magpieLink(['anthropic'], base, 'my relay', 'a+b')).toContain('?name=my%20relay&key=a%2Bb&')
  })
  it.each(['https://gw.example.com/', 'https://gw.example.com//'])('joins paths onto %s with one slash', slashed => {
    expect(magpieLink(all, slashed, 'n', key)).toBe(magpieLink(all, base, 'n', key))
    expect(magpieFields(['openai'], slashed, key)).toEqual({
      key,
      chat: `${base}/v1`,
      responses: `${base}/v1`,
      balance: `${base}/v1/usage`,
      balance_path: 'remaining'
    })
  })
  it('keeps a path the gateway is served under', () => {
    expect(params(magpieLink(all, 'https://example.com/gw/', 'n', key))).toMatchObject({
      anthropic: 'https://example.com/gw',
      chat: 'https://example.com/gw/v1',
      gemini: 'https://example.com/gw/v1beta',
      balance: 'https://example.com/gw/v1/usage'
    })
  })
})

describe('quick setups of a key', () => {
  it('offers CC Switch for each client of the platforms, then Magpie', () => {
    expect(keyAppsFor(all).map(({ id, app, label, client }) => ({ id, app, label, client }))).toEqual([
      { id: 'ccswitch:claude', app: 'CC Switch', label: 'CC Switch · Claude Code', client: 'claude' },
      { id: 'ccswitch:codex', app: 'CC Switch', label: 'CC Switch · Codex CLI', client: 'codex' },
      { id: 'ccswitch:gemini', app: 'CC Switch', label: 'CC Switch · Gemini CLI', client: 'gemini' },
      { id: 'magpie', app: 'Magpie', label: 'Magpie', client: undefined }
    ])
    expect(keyAppsFor(['openai', 'volcengine']).map(a => a.id)).toEqual(['ccswitch:codex', 'magpie'])
  })
  it.each([[['volcengine']], [[]], [null], [undefined]])('offers nothing for %j', platforms => {
    expect(keyAppsFor(platforms)).toEqual([])
  })
  it.each(CLIENTS)('links CC Switch · $label as the client does', client => {
    expect(app(all, `ccswitch:${client.id}`).link(base, 'gw.example.com', key)).toBe(ccSwitchLink(client, base, 'gw.example.com', key))
  })
  it('links Magpie with the endpoints of the platforms it was offered for', () => {
    expect(app(['openai', 'volcengine'], 'magpie').link(base, 'gw.example.com', key)).toBe(
      magpieLink(['openai'], base, 'gw.example.com', key)
    )
  })
})
