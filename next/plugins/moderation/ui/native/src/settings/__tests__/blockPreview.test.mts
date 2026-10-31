// cd ui/native && node --experimental-strip-types --test src/settings/__tests__/blockPreview.test.mts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { anthropicType, blockBody, blockResponse, googleStatus, openaiType, sortKeys } from '../blockPreview.ts'

test('error types follow the core per status', () => {
  assert.equal(openaiType(403), 'permission_error')
  assert.equal(openaiType(400), 'invalid_request_error')
  assert.equal(openaiType(451), 'invalid_request_error')
  assert.equal(openaiType(500), 'server_error')
  assert.equal(anthropicType(403), 'permission_error')
  assert.equal(anthropicType(451), 'invalid_request_error')
  assert.equal(anthropicType(503), 'overloaded_error')
  assert.equal(anthropicType(502), 'api_error')
  assert.equal(googleStatus(403), 'PERMISSION_DENIED')
  assert.equal(googleStatus(400), 'INVALID_ARGUMENT')
  assert.equal(googleStatus(451), 'UNKNOWN')
  assert.equal(googleStatus(500), 'INTERNAL')
})

test('bodies of the three formats', () => {
  assert.deepEqual(blockBody('openai', 403, 'no'), { error: { message: 'no', type: 'permission_error', code: 'moderation_blocked', param: null } })
  assert.deepEqual(blockBody('anthropic', 400, 'no'), { type: 'error', error: { type: 'invalid_request_error', message: 'no', code: 'moderation_blocked' } })
  assert.deepEqual(blockBody('gemini', 451, 'no'), {
    error: { code: 451, message: 'no', status: 'UNKNOWN', details: [{ '@type': 'type.googleapis.com/google.rpc.ErrorInfo', reason: 'moderation_blocked', domain: 'sub2api' }] }
  })
})

test('the response text has the status line and keys sorted like Go maps', () => {
  const r = blockResponse('openai', 403, 'no')
  assert.ok(r.startsWith('HTTP 403\nContent-Type: application/json\n\n'))
  const json = r.slice(r.indexOf('{'))
  assert.deepEqual(Object.keys(JSON.parse(json).error), ['code', 'message', 'param', 'type'])
})

test('sortKeys sorts nested objects and keeps arrays in order', () => {
  assert.equal(JSON.stringify(sortKeys({ b: 1, a: [{ d: 1, c: 2 }, 3] })), '{"a":[{"c":2,"d":1},3],"b":1}')
})
