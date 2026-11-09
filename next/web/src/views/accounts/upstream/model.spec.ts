import { describe, expect, it } from 'vitest'
import type { Upstream, UpstreamAccountLayer } from '@/api/types'
import {
  authHints,
  authOfType,
  headerHint,
  layerErrors,
  newHeader,
  pathHint,
  readDraft,
  resetSection,
  sectionLayer,
  templateHint,
  writeLayer
} from './model'

// The resolved declaration of custom_openai (preset openai, default filter).
const up: Upstream = {
  preset: 'openai',
  accountConfig: true,
  baseURL: { required: true, stripSuffixes: ['/v1'] },
  credentials: { fields: ['org'] },
  auth: { type: 'header', name: 'authorization', value: 'Bearer {api_key}' },
  headers: { 'content-type': { set: 'application/json' }, 'x-trace': { default: 'on' } },
  routes: {
    'openai.chat': { path: '/v1/chat/completions' },
    'openai.responses': { path: '/v1/responses' },
    'openai.responses_ws': { path: '/v1/responses', transport: 'websocket' },
    'openai.gone': null
  },
  filterFields: ['service_tier', 'safety_identifier']
}

const roundTrip = (layer: UpstreamAccountLayer | undefined) => writeLayer(readDraft(layer, up), up)

describe('upstream account layer', () => {
  it('stores nothing for the defaults', () => {
    expect(roundTrip(undefined)).toBeUndefined()
    expect(roundTrip({ auth: {}, headers: {}, routes: {}, allowFields: [] })).toBeUndefined()
    // An override equal to the default is no override.
    expect(
      roundTrip({
        auth: { name: 'authorization' },
        headers: { 'content-type': { set: 'application/json' } },
        routes: { 'openai.chat': { path: '/v1/chat/completions' } }
      })
    ).toBeUndefined()
  })

  it('round-trips every part', () => {
    const layer: UpstreamAccountLayer = {
      auth: { value: 'Token {api_key}' },
      headers: { 'content-type': { default: 'application/json' }, 'x-trace': null, 'x-org': { set: '{credentials.org}' } },
      routes: { 'openai.chat': { path: '/chat?key={api_key}' } },
      allowFields: ['service_tier']
    }
    expect(roundTrip(layer)).toEqual(layer)
  })

  it('reads the draft with the defaults as placeholders', () => {
    const d = readDraft({ headers: { 'x-trace': null } }, up)
    expect(d.auth).toEqual({ type: 'header', name: '', value: '' })
    expect(d.headers.map(r => [r.name, r.mode, r.value, r.base, r.removed])).toEqual([
      ['content-type', 'set', '', { mode: 'set', value: 'application/json' }, false],
      ['x-trace', 'default', '', { mode: 'default', value: 'on' }, true]
    ])
    // Only declared routes; a deleted one (null) is no protocol.
    expect(d.paths).toEqual({ 'openai.chat': '', 'openai.responses': '', 'openai.responses_ws': '' })
  })

  it('drops what the account may not set', () => {
    expect(roundTrip({ routes: { 'anthropic.messages': { path: '/x' } }, allowFields: ['speed'] })).toBeUndefined()
  })

  it('writes a changed header mode with the default value and removes a default header with null', () => {
    const d = readDraft(undefined, up)
    d.headers[0].mode = 'append'
    d.headers[1].removed = true
    expect(writeLayer(d, up)).toEqual({ headers: { 'content-type': { append: 'application/json' }, 'x-trace': null } })
  })

  it('stores added header names lower-case and skips an empty row', () => {
    const d = readDraft(undefined, up)
    d.headers.push({ ...newHeader(), name: ' X-Org ', value: 'a' }, newHeader())
    expect(writeLayer(d, up)).toEqual({ headers: { 'x-org': { set: 'a' } } })
  })

  it('writes another auth type whole so nothing of the default merges into it', () => {
    const d = readDraft(undefined, up)
    d.auth = { ...authOfType('query', up), name: 'key' }
    expect(writeLayer(d, up)).toEqual({ auth: { type: 'query', name: 'key', value: '{api_key}' } })
    d.auth = authOfType('none', up)
    expect(writeLayer(d, up)).toEqual({ auth: { type: 'none', name: null, value: null } })
    expect(roundTrip({ auth: { type: 'none', name: null, value: null } })).toEqual({ auth: { type: 'none', name: null, value: null } })
    // Back to the type's own auth type: inherit again.
    d.auth = authOfType('header', up)
    expect(writeLayer(d, up)).toBeUndefined()
  })

  it('lower-cases an auth header name but not a query parameter', () => {
    const d = readDraft(undefined, up)
    d.auth.name = 'X-Key'
    expect(writeLayer(d, up)?.auth).toEqual({ name: 'x-key' })
    d.auth = { type: 'query', name: 'Key', value: '{api_key}' }
    expect(writeLayer(d, up)?.auth?.name).toBe('Key')
  })

  it('lets checked filtered fields through in declaration order', () => {
    const d = readDraft(undefined, up)
    d.allow = ['safety_identifier', 'service_tier']
    expect(writeLayer(d, up)).toEqual({ allowFields: ['service_tier', 'safety_identifier'] })
  })

  it('resets one section or all', () => {
    const d = readDraft({ auth: { value: 'x {api_key}' }, routes: { 'openai.chat': { path: '/c' } }, allowFields: ['service_tier'] }, up)
    resetSection(d, up, 'routes')
    expect(sectionLayer(d, up, 'routes')).toBeUndefined()
    expect(writeLayer(d, up)).toEqual({ auth: { value: 'x {api_key}' }, allowFields: ['service_tier'] })
    resetSection(d, up)
    expect(writeLayer(d, up)).toBeUndefined()
  })
})

describe('upstream hints', () => {
  it('checks template variables by place', () => {
    expect(templateHint('Bearer {api_key}', 'auth', up)).toBeUndefined()
    expect(templateHint('{api_key}', 'header', up)).toEqual({ code: 'not_here', name: '{api_key}' })
    expect(templateHint('{client_header.x-a}', 'auth', up)).toEqual({ code: 'not_here', name: '{client_header.x-a}' })
    expect(templateHint('{client_header.cookie}', 'header', up, ['cookie'])).toEqual({ code: 'header_blocked', name: 'cookie' })
    expect(templateHint('{client_header.x-a}', 'header', up)).toEqual({ code: 'not_passed', name: 'x-a' })
    expect(templateHint('{client_header.x-a}', 'header', up, ['x-a'])).toBeUndefined()
    expect(templateHint('{credentials.nope}', 'header', up)).toEqual({ code: 'not_field', name: '{credentials.nope}' })
    expect(templateHint('{credentials.org} {model} {base_url}', 'header', up)).toBeUndefined()
    expect(templateHint('{foo}', 'header', up)).toEqual({ code: 'unknown_var', name: '{foo}' })
    expect(templateHint('{"literal": 1}', 'header', up)).toBeUndefined()
  })

  it('checks auth', () => {
    expect(authHints(readDraft(undefined, up).auth, up)).toEqual({ name: undefined, value: undefined })
    expect(authHints({ type: 'query', name: '', value: '' }, up)).toEqual({ name: { code: 'required' }, value: { code: 'required' } })
    expect(authHints({ type: 'header', name: 'bad name', value: '{client_header.a}' }, up)).toEqual({
      name: { code: 'header_name' },
      value: { code: 'not_here', name: '{client_header.a}' }
    })
    // A credential header can carry the key, a transport or gateway control header cannot.
    expect(authHints({ type: 'header', name: 'x-api-key', value: '{api_key}' }, up).name).toBeUndefined()
    expect(authHints({ type: 'header', name: 'host', value: '{api_key}' }, up).name).toEqual({ code: 'auth_blocked', name: 'host' })
    expect(authHints({ type: 'header', name: 'x-sub2api-key', value: '{api_key}' }, up).name).toEqual({
      code: 'auth_blocked',
      name: 'x-sub2api-key'
    })
  })

  it('checks headers: names, blocked, the auth header, duplicates and values', () => {
    const d = readDraft(undefined, up)
    const add = (name: string, value = 'v') => {
      const r = { ...newHeader(), name, value }
      d.headers.push(r)
      return r
    }
    expect(headerHint(add('x-api-key'), d, up)).toEqual({ code: 'header_blocked', name: 'x-api-key' })
    expect(headerHint(add('x-kin-route'), d, up)).toEqual({ code: 'header_blocked', name: 'x-kin-route' })
    expect(headerHint(add('bad name'), d, up)).toEqual({ code: 'header_name' })
    expect(headerHint(add('Content-Type'), d, up)).toEqual({ code: 'duplicate', name: 'content-type' })
    expect(headerHint(add('x-empty', ''), d, up)).toEqual({ code: 'required' })
    expect(headerHint(add(''), d, up)).toEqual({ code: 'required' })
    expect(headerHint(newHeader(), d, up)).toBeUndefined()
    expect(headerHint(add('x-agent', '{client_header.x-agent-id}'), d, up)).toEqual({ code: 'not_passed', name: 'x-agent-id' })
    expect(headerHint(d.headers.at(-1)!, d, up, ['x-agent-id'])).toBeUndefined()
    d.auth = { type: 'header', name: 'x-custom-auth', value: '{api_key}' }
    expect(headerHint(add('x-custom-auth'), d, up)).toEqual({ code: 'auth_header', name: 'x-custom-auth' })
    expect(headerHint(d.headers[0], d, up)).toBeUndefined()
  })

  it('checks paths and their query strings', () => {
    expect(pathHint('', up)).toBeUndefined()
    expect(pathHint('v1/x', up)).toEqual({ code: 'path_slash' })
    expect(pathHint('/v1/{model}?key={api_key}', up)).toBeUndefined()
    expect(pathHint('/v1/{api_key}', up)).toEqual({ code: 'not_here', name: '{api_key}' })
  })
})

describe('upstream server errors', () => {
  it('maps the core messages and nested fields to parts of the layer', () => {
    expect(
      layerErrors({
        upstream: 'routes.openai.chat.path: a path starts with /',
        'upstream.auth.name': 'auth.name must be a lower-case header name',
        'upstream.headers.x-foo': 'blocked',
        'upstream.allowFields': 'speed is not a filtered field',
        'upstream.extra': 'not allowed',
        api_key: 'required'
      })
    ).toEqual({
      'routes.openai.chat': 'a path starts with /',
      'auth.name': 'auth.name must be a lower-case header name',
      'headers.x-foo': 'blocked',
      allowFields: 'speed is not a filtered field',
      '': 'not allowed'
    })
    // A message naming no part stays with the field's frame.
    expect(layerErrors({ upstream: 'the account upstream must be a JSON object' })).toEqual({})
  })
})
