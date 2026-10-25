import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeBetas, finalBetas, apiKeyRequestHeaders, authenticatedRequestHeaders } from '../request-headers.js';
import { parseRequestOptions, parseRequestJSON, parseBuildJSON, numberValue } from '../request-options.js';

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

// 2026-10-25: build sends the client's numbers as the client wrote them; a
// number in a string is text and is never touched.
test('build keeps every number as written, direct parses as JSON does', () => {
  const raw = '{"large":9007199254740993,"id":12345678901234567891,"one":1.0,"neg":-0,"exp":1e2,"half":0.5,"n":7,"text":"9007199254740993 1.0 \\" 1e2","nested":[{"x":[1.50,{"y":-12345678901234567891}]}]}';
  const { body, restoreNumbers } = parseBuildJSON(raw);
  assert.equal(body.half, 0.5);
  assert.equal(body.n, 7);
  assert.equal(body.text, '9007199254740993 1.0 " 1e2');
  assert.equal(numberValue(body.one), 1);
  // A double that would change the value is not given to the builder.
  assert.equal(numberValue(body.large), body.large);
  assert.equal(numberValue(body.exp), 100);
  assert.equal(numberValue('ccgnum_0123456789abcdef0123456789abcdef_0'), 'ccgnum_0123456789abcdef0123456789abcdef_0', 'another request\'s placeholder is text');
  assert.equal(restoreNumbers(JSON.stringify(body)), raw);
  // A placeholder copied into other text cannot be put back: never sent.
  assert.throws(() => restoreNumbers(JSON.stringify({ text: 'x' + body.large })), /could not keep a number/);
  assert.equal(parseBuildJSON('{"n":1,"x":0.5}').restoreNumbers, undefined, 'nothing kept, nothing to restore');
  assert.deepEqual(parseRequestJSON(raw, 'direct'), JSON.parse(raw));
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
// Sonnet). CC's order (request-betas.js betaOrder) puts the login beta after
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
    // The request command places the beta the request adds (the cache beta) and
    // the login's in one call; the header only writes the result.
    const built = finalBetas(normalizeBetas(client), ['extended-cache-ttl-2025-04-11', 'oauth-2025-04-20'], order);
    assert.equal(authenticatedRequestHeaders(native, { betas: built }).get('anthropic-beta'), official);
  }
  // An OAuth client already sends both: its own order stands.
  const [{ order, official }] = cases;
  assert.equal(finalBetas(normalizeBetas(official), ['extended-cache-ttl-2025-04-11', 'oauth-2025-04-20'], order).join(','), official);
  // Without CC's order a beta goes last, as before.
  assert.deepEqual(finalBetas(['a', 'b'], ['c', 'a']), ['a', 'b', 'c']);
  assert.deepEqual(finalBetas(['a', 'b'], ['x'], ['b', 'x']), ['a', 'b', 'x']);
});

test('explicit API key does not select native OAuth even when OAuth metadata is available', () => {
  const result = authenticatedRequestHeaders({ 'x-api-key': 'fixture' }, { apiKey: 'fixture', betas: ['client-beta'], oauthBeta: 'oauth-fixture' });
  assert.equal(result.has('authorization'), false);
  assert.equal(result.get('anthropic-beta'), 'client-beta');
});
