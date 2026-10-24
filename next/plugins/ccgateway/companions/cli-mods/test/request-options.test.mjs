import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeBetas, placeBetas, parseRequestOptions, parseRequestJSON, apiKeyRequestHeaders, authenticatedRequestHeaders } from '../request-options.js';

test('betas have one canonical representation across flags and differently cased headers', () => {
  const parsed = parseRequestOptions(['--build', '--betas', 'a, b,,a', '--header', 'Anthropic-Beta: c,b', '--header', 'anthropic-beta: D', 'body.json']);
  assert.equal(parsed.input, 'body.json');
  assert.deepEqual(parsed.betas, ['a', 'b', 'c', 'D']);
  assert.equal(parsed.headers['anthropic-beta'], 'a,b,c,D');
  assert.deepEqual(normalizeBetas('', ['a', 'a', 'B']), ['a', 'B']);
  assert.throws(() => normalizeBetas('a\r\nX-Test: x'), /tokens/);
  assert.throws(() => normalizeBetas('a，b'), /token/);
});

test('positional file, stdin and input conflicts are explicit', () => {
  assert.equal(parseRequestOptions(['--direct', '-']).input, '-');
  assert.equal(parseRequestOptions(['--direct']).input, '-');
  assert.equal(parseRequestOptions(['--input', 'x']).input, 'x');
  assert.throws(() => parseRequestOptions(['x', '--input', 'y']), /one input/);
  assert.throws(() => parseRequestOptions(['--build', '--direct']), /mutually/);
  for (const key of ['Authorization', 'X-Api-Key', 'X-Claude-Code-Session-Id', 'Content-Encoding', 'User-Agent']) {
    assert.throws(() => parseRequestOptions(['--header', `${key}:sentinel`]), /not a client protocol header/);
  }
});

// An API-key request carries the headers Claude Code built, as Claude Code sends
// them itself with an API key; the version and betas are the request's, and
// authentication must be exactly the configured key.
test('API-key header policy keeps the CC headers and checks authentication', () => {
  const native = new Headers({ 'x-api-key': 'fake', 'anthropic-beta': 'environment-beta,oauth-2025-04-20', 'x-app': 'cli', 'x-stainless-os': 'Linux', 'x-client-request-id': 'request-id', 'user-agent': 'claude-cli/2.1.304 (external, sdk-cli)', 'x-claude-code-request-class': 'subagent', 'anthropic-version': 'old' });
  const result = apiKeyRequestHeaders(native, { apiKey: 'fake', betas: ['client-beta'] });
  assert.equal(result.get('user-agent'), 'claude-cli/2.1.304 (external, sdk-cli)');
  for (const name of ['x-app', 'x-stainless-os', 'x-client-request-id', 'x-claude-code-request-class']) assert.equal(result.get(name), native.get(name), name);
  assert.equal(result.get('anthropic-beta'), 'client-beta');
  assert.equal(result.get('anthropic-version'), '2023-06-01');
  assert.equal(apiKeyRequestHeaders(native, { apiKey: 'fake', betas: [] }).has('anthropic-beta'), false);
  assert.equal(apiKeyRequestHeaders(native, { apiKey: 'fake', betas: ['client-beta', 'oauth-fixture'], oauthBeta: 'oauth-fixture' }).get('anthropic-beta'), 'client-beta', 'the login beta goes only with a login');
  assert.throws(() => apiKeyRequestHeaders(native, { apiKey: 'different' }), /authentication/);
  native.set('authorization', 'Bearer fake-subscription');
  assert.throws(() => apiKeyRequestHeaders(native, { apiKey: 'fake' }), /authentication/);
});

test('build rejects unsafe numbers before parsing, direct keeps raw-source eligibility', () => {
  const raw = '{"large":9007199254740993,"text":"9007199254740993"}';
  assert.throws(() => parseRequestJSON(raw, 'build'), /unsafe JSON number/);
  assert.doesNotThrow(() => parseRequestJSON(raw, 'direct'));
  assert.equal(parseRequestJSON('{"text":"9007199254740993","n":12.5}', 'build').n, 12.5);
});

test('OAuth retains native authentication and transport while selecting explicit and auth betas', () => {
  const native = new Headers({ authorization: 'Bearer native-fixture', 'user-agent': 'native-cc', 'x-app': 'cli', 'content-encoding': 'gzip', 'anthropic-beta': 'ambient-feature' });
  const result = authenticatedRequestHeaders(native, { betas: ['client-beta', 'oauth-fixture'], oauthBeta: 'oauth-fixture' });
  assert.equal(result.get('authorization'), 'Bearer native-fixture');
  assert.equal(result.get('user-agent'), 'native-cc');
  assert.equal(result.get('x-app'), 'cli');
  assert.equal(result.get('content-encoding'), 'gzip');
  assert.equal(result.get('anthropic-beta'), 'client-beta,oauth-fixture');
  assert.equal(result.get('anthropic-version'), '2023-06-01');
  assert.equal(result.has('x-api-key'), false);
  assert.equal(native.get('anthropic-beta'), 'ambient-feature');
  assert.throws(() => authenticatedRequestHeaders({}, {}), /OAuth authentication/);
  assert.throws(() => authenticatedRequestHeaders({ authorization: 'Basic invalid' }, {}), /OAuth authentication/);
  native.set('x-api-key', 'ambiguous');
  assert.throws(() => authenticatedRequestHeaders(native, {}), /OAuth authentication/);
});

// 2026-10-24 account 31: an API-key client's betas sent through an OAuth
// account, against the official OAuth client's (prod31 ref-01 Haiku, ref-07
// Sonnet). CC's order (ccgatewayBetaOrder) puts the login beta after
// claude-code when its model list leads with it, and the 1-hour cache beta
// before cache-diagnosis.
test('the login and cache betas go where Claude Code writes them', () => {
  const native = new Headers({ authorization: 'Bearer native-fixture' });
  const cases = [{
    order: ['oauth-2025-04-20', 'interleaved-thinking-2025-05-14', 'thinking-token-count-2026-05-13', 'context-management-2025-06-27', 'prompt-caching-scope-2026-01-05', 'claude-code-20250219', 'extended-cache-ttl-2025-04-11', 'cache-diagnosis-2026-04-07'],
    client: 'interleaved-thinking-2025-05-14,thinking-token-count-2026-05-13,context-management-2025-06-27,prompt-caching-scope-2026-01-05,claude-code-20250219,advanced-tool-use-2025-11-20,thinking-binding-controls-2026-08-01,cache-diagnosis-2026-04-07',
    official: 'oauth-2025-04-20,interleaved-thinking-2025-05-14,thinking-token-count-2026-05-13,context-management-2025-06-27,prompt-caching-scope-2026-01-05,claude-code-20250219,advanced-tool-use-2025-11-20,thinking-binding-controls-2026-08-01,extended-cache-ttl-2025-04-11,cache-diagnosis-2026-04-07',
  }, {
    order: ['claude-code-20250219', 'oauth-2025-04-20', 'interleaved-thinking-2025-05-14', 'thinking-token-count-2026-05-13', 'context-management-2025-06-27', 'prompt-caching-scope-2026-01-05', 'per-turn-control-2026-07-01', 'mid-conversation-tool-changes-2026-07-01', 'extended-cache-ttl-2025-04-11', 'cache-diagnosis-2026-04-07'],
    client: 'claude-code-20250219,interleaved-thinking-2025-05-14,thinking-token-count-2026-05-13,context-management-2025-06-27,prompt-caching-scope-2026-01-05,per-turn-control-2026-07-01,mid-conversation-tool-changes-2026-07-01,advanced-tool-use-2025-11-20,mid-conversation-system-clear-at-2026-08-21,effort-2025-11-24,thinking-binding-controls-2026-08-01,cache-diagnosis-2026-04-07',
    official: 'claude-code-20250219,oauth-2025-04-20,interleaved-thinking-2025-05-14,thinking-token-count-2026-05-13,context-management-2025-06-27,prompt-caching-scope-2026-01-05,per-turn-control-2026-07-01,mid-conversation-tool-changes-2026-07-01,advanced-tool-use-2025-11-20,mid-conversation-system-clear-at-2026-08-21,effort-2025-11-24,thinking-binding-controls-2026-08-01,extended-cache-ttl-2025-04-11,cache-diagnosis-2026-04-07',
  }];
  for (const { order, client, official } of cases) {
    const built = placeBetas(normalizeBetas(client), ['extended-cache-ttl-2025-04-11'], order);
    const result = authenticatedRequestHeaders(native, { betas: built, oauthBeta: 'oauth-2025-04-20', betaOrder: order });
    assert.equal(result.get('anthropic-beta'), official);
  }
  // An OAuth client already sends both: its own order stands.
  const [{ order, official }] = cases;
  assert.equal(authenticatedRequestHeaders(native, { betas: normalizeBetas(official), oauthBeta: 'oauth-2025-04-20', betaOrder: order }).get('anthropic-beta'), official);
  // Without CC's order a beta goes last, as before.
  assert.deepEqual(placeBetas(['a', 'b'], ['c', 'a']), ['a', 'b', 'c']);
  assert.deepEqual(placeBetas(['a', 'b'], ['x'], ['b', 'x']), ['a', 'b', 'x']);
});

test('explicit API key does not select native OAuth even when OAuth metadata is available', () => {
  const result = authenticatedRequestHeaders({ 'x-api-key': 'fixture' }, { apiKey: 'fixture', betas: ['client-beta'], oauthBeta: 'oauth-fixture' });
  assert.equal(result.has('authorization'), false);
  assert.equal(result.get('anthropic-beta'), 'client-beta');
});
