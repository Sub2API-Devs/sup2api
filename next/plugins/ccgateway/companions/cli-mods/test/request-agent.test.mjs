import test from 'node:test';
import assert from 'node:assert/strict';
import { readRequestAgent, resolveAgentContext, setClientUserAgent, clientUserAgent } from '../request-agent.js';
import { layers } from './vocabulary.mjs';

// Claude Code 2.1.304's own query source naming (Zoe).
const querySourceFor = (type, builtIn) => builtIn ? (type ? `agent:builtin:${type}` : 'agent:default') : (type ? `agent:custom:${type}` : 'agent:custom');
const key = 'ab'.repeat(32), otherKey = 'cd'.repeat(32);
const P = 'a606b757-b9e1-4f6f-8eb0-88ffd9569a8d';
const mapped = (client = {}, k = key) => ({ map: true, key: k, client });
// Claude Code 2.1.304's loop header names, rendered from the native constants.
const { loopHeaders } = layers;
const resolve = (context, billing, prompt = 'Reply with OK.') => resolveAgentContext(context, { billing, prompt, querySourceFor, loopHeaders });
const subagentHeader = { cc_version: '2.1.304.9a4', cc_entrypoint: 'sdk-cli', cc_is_subagent: 'true', cc_prompt_id: P };
const mainHeader = { cc_version: '2.1.304.1d1', cc_entrypoint: 'sdk-cli', cc_prompt_id: P };

test('a mapped subagent keeps every equality the client requests had', () => {
  // Agent IDs stay the client's: the parent thread's messages name them.
  const sub = resolve(mapped({ request_class: 'subagent', agent_id: 'a12268251d7ed891f', agent_type: 'general-purpose', prompt_id: P }), subagentHeader);
  assert.equal(sub.querySource, 'agent:builtin:general-purpose');
  assert.equal(sub.agentContext.agentId, 'a12268251d7ed891f');
  assert.match(sub.promptId, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.notEqual(sub.promptId, P);
  // Header and billing header name one prompt.
  assert.equal(sub.billingPromptId, sub.promptId);
  assert.equal(sub.agentContext.parentPromptId, sub.promptId);
  // The same subagent on its next turn.
  assert.deepEqual(resolve(mapped({ request_class: 'subagent', agent_id: 'a12268251d7ed891f', agent_type: 'general-purpose', prompt_id: P }), subagentHeader, 'later turn'), sub);
  // A nested subagent's parent is that agent's own ID.
  const child = resolve(mapped({ request_class: 'subagent', agent_id: 'a99', parent_agent_id: 'a12268251d7ed891f', agent_type: 'Explore', prompt_id: P }), subagentHeader);
  assert.equal(child.agentContext.parentAgentId, sub.agentContext.agentId);
  assert.notEqual(child.agentContext.agentId, sub.agentContext.agentId);
  // The main thread of the same prompt carries the same prompt ID.
  const main = resolve(mapped({ request_class: 'main', prompt_id: P }), mainHeader);
  assert.equal(main.promptId, sub.promptId);
  assert.equal(main.querySource, 'sdk');
  assert.equal(main.agentContext, undefined);
  // Another session's key maps the same prompt elsewhere.
  const elsewhere = resolve(mapped({ request_class: 'subagent', agent_id: 'a12268251d7ed891f', prompt_id: P }, otherKey), subagentHeader);
  assert.notEqual(elsewhere.promptId, sub.promptId);
});

test('without headers the body decides: CC main, CC subagent, anything else the main thread', () => {
  const main = resolve(mapped(), mainHeader);
  assert.equal(main.requestClass, 'main');
  assert.equal(main.querySource, 'sdk');
  assert.equal(main.promptId, resolve(mapped({ prompt_id: P }), mainHeader).promptId, 'cc_prompt_id is the prompt ID');
  assert.equal(main.billingPromptId, main.promptId);

  const sub = resolve(mapped(), subagentHeader);
  assert.equal(sub.requestClass, 'subagent');
  assert.equal(sub.querySource, 'agent:custom', 'no agent-type header: CC reports custom');
  assert.equal(sub.agentContext.agentId, resolve(mapped(), subagentHeader).agentContext.agentId, 'stable across turns');
  assert.notEqual(sub.agentContext.agentId, resolve(mapped(), subagentHeader, 'another task').agentContext.agentId);
  assert.equal(sub.agentContext.parentAgentId, undefined, 'no parent is invented');

  // A request that is not Claude Code's is completed as its main thread
  // (2026-10-23): no agent, a prompt ID derived from its first prompt.
  const other = resolve(mapped(), null, 'hello');
  assert.equal(other.requestClass, 'main');
  assert.equal(other.querySource, 'sdk');
  assert.equal(other.agentContext, undefined);
  assert.equal(other.explicitClass, undefined);
  assert.equal(other.billingPromptId, undefined, 'there is no client header to rewrite');
  assert.match(other.promptId, /^[0-9a-f-]{36}$/);
  assert.deepEqual(resolve(mapped(), null, 'hello'), other);
  assert.notEqual(resolve(mapped(), null, 'another').promptId, other.promptId);
  // The loop header names are CC's, never assumed.
  assert.throws(() => resolveAgentContext(mapped(), { billing: null, prompt: 'x', querySourceFor }), /Missing native loop header names/);
});

test('direct and API-key accounts send the client IDs unchanged', () => {
  const client = { request_class: 'subagent', agent_id: 'a12268251d7ed891f', parent_agent_id: 'aparent', agent_type: 'general-purpose', prompt_id: P };
  for (const context of [{ map: false, key, client }, { map: false, client }]) {
    const sub = resolve(context, subagentHeader);
    assert.equal(sub.agentContext.agentId, 'a12268251d7ed891f');
    assert.equal(sub.agentContext.parentAgentId, 'aparent');
    assert.equal(sub.promptId, P);
    assert.equal(sub.billingPromptId, undefined, 'the body keeps its own value');
    // A request that is not Claude Code's still gets a stable prompt ID it never sent.
    const other = resolve({ ...context, client: {} }, null, 'hello');
    assert.match(other.promptId, /^[0-9a-f-]{36}$/);
    assert.deepEqual(resolve({ ...context, client: {} }, null, 'hello'), other);
  }
  assert.notEqual(resolve({ map: false, key, client: {} }, null, 'hello').promptId, resolve({ map: false, client: {} }, null, 'hello').promptId);
});

test('other request classes', () => {
  const compaction = resolve(mapped({ request_class: 'compaction', prompt_id: P }), mainHeader);
  assert.equal(compaction.querySource, 'compact');
  assert.equal(compaction.explicitClass, undefined);
  const auxiliary = resolve(mapped({ request_class: 'auxiliary' }), mainHeader);
  assert.equal(auxiliary.querySource, 'sdk');
  assert.equal(auxiliary.explicitClass, 'auxiliary');
  const workflow = resolve(mapped({ request_class: 'workflow', agent_id: 'a1', agent_type: 'custom' }), subagentHeader);
  assert.equal(workflow.querySource, 'agent:custom');
  assert.equal(workflow.explicitClass, 'workflow');
  assert.equal(workflow.agentContext.agentType, 'subagent');
});

test('the Worker context is validated', () => {
  assert.equal(readRequestAgent(''), null);
  assert.deepEqual(readRequestAgent(JSON.stringify({ version: 1, map: true, key, client: { agent_id: 'a1' } })), { map: true, key, client: { agent_id: 'a1' } });
  assert.deepEqual(readRequestAgent(JSON.stringify({ version: 1, map: false })), { map: false, key: undefined, client: {} });
  for (const bad of ['{', '{"version":2,"map":false}', `{"version":1,"map":true}`, `{"version":1,"map":false,"key":"xyz"}`,
    `{"version":1,"map":false,"client":{"agent_id":"a b"}}`, `{"version":1,"map":false,"client":{"unknown":"x"}}`, `{"version":1,"map":false,"extra":1}`]) {
    assert.throws(() => readRequestAgent(bad), /Invalid Worker agent context/, bad);
  }
});

// The client's own User-Agent (Claude Code's shape only) rides with the
// context, and the request keeps it only while it keeps the client's header:
// in CC the header's cc_version/cc_entrypoint and the User-Agent come from
// one place, so they must still agree after build or direct.
test('the client User-Agent is kept with the client billing header', () => {
  const ua = 'claude-cli/2.1.310 (external, sdk-ts, agent-sdk/0.2.71)';
  for (const good of [ua, 'claude-cli/2.1.304 (external, cli)', 'claude-cli/2.1.304 (external, claude-desktop, client-app/desktop/1.2, workload/x)']) {
    assert.equal(readRequestAgent(JSON.stringify({ version: 1, map: false, client: { user_agent: good } })).client.user_agent, good);
  }
  for (const bad of ['anthropic-sdk-python/0.40.0', 'claude-cli/2.1.304 (internal, cli)', 'claude-cli/2.1.304 (external, Cli)', 'claude-cli/2.1.304 (external, cli) x', 'claude-cli/2.1.304 (external, cli, agent-sdk/)']) {
    assert.throws(() => readRequestAgent(JSON.stringify({ version: 1, map: false, client: { user_agent: bad } })), /Invalid Worker agent context/, bad);
  }
  const agent = resolve(mapped({ request_class: 'main', user_agent: ua }), mainHeader);
  assert.equal(agent.userAgent, ua);
  assert.equal(resolve(mapped({ request_class: 'main' }), mainHeader).userAgent, undefined);
  const header = { cc_version: '2.1.310.b17', cc_entrypoint: 'sdk-ts', cc_prompt_id: 'x' };
  setClientUserAgent(agent, header, { ...header, cc_prompt_id: 'mapped' }); assert.equal(clientUserAgent(), ua, 'a mapped prompt ID does not change the User-Agent');
  assert.equal(clientUserAgent(), ua);
  setClientUserAgent(agent, header, { ...header, cc_version: '2.1.304.b17' }); assert.equal(clientUserAgent(), undefined, 'the Worker owns the version');
  assert.equal(clientUserAgent(), undefined);
  setClientUserAgent(agent, header, { ...header, cc_entrypoint: 'sdk-cli' }); assert.equal(clientUserAgent(), undefined, 'the Worker owns the entrypoint');
  setClientUserAgent(agent, null, header); assert.equal(clientUserAgent(), undefined, 'no header of its own');
  setClientUserAgent(agent, { cc_entrypoint: 'cli' }, { cc_version: '2.1.304.b17', cc_entrypoint: 'cli' }); assert.equal(clientUserAgent(), undefined, 'a filled field');
  setClientUserAgent(undefined, header, header); assert.equal(clientUserAgent(), undefined);
  setClientUserAgent({ requestClass: 'main' }, header, header); assert.equal(clientUserAgent(), undefined, 'no User-Agent of its own');
});

test('the previous turn tool timings go on unchanged', () => {
  const timed = resolve(mapped({ request_class: 'main', prompt_id: P, prev_tool_durations: 'Agent=76;Read=12' }), mainHeader);
  assert.deepEqual(timed.headers, { 'x-claude-code-prev-tool-durations': 'Agent=76;Read=12' });
  assert.equal(resolve(mapped({ request_class: 'main' }), mainHeader).headers, undefined);
  for (const bad of ['Agent', 'Agent=x', 'A=1;', 'a b=1', 'A=1,B=2', 'x='.padEnd(5000, '1')]) {
    assert.throws(() => readRequestAgent(JSON.stringify({ version: 1, map: false, client: { prev_tool_durations: bad } })), /Invalid Worker agent context/, bad);
  }
});

test('the compaction kind headers go on unchanged', () => {
  const compaction = resolve(mapped({ request_class: 'compaction', cc_compaction_request: 'manual', claude_code_compaction: 'manual' }), mainHeader);
  assert.equal(compaction.querySource, 'compact');
  assert.deepEqual(compaction.headers, { 'x-cc-compaction-request': 'manual', 'x-claude-code-compaction': 'manual' });
  const after = resolve(mapped({ request_class: 'main', cc_context_compacted: 'manual', claude_code_context_compacted: 'manual', prev_tool_durations: 'Read=3' }), mainHeader);
  assert.deepEqual(after.headers, { 'x-claude-code-prev-tool-durations': 'Read=3', 'x-cc-context-compacted': 'manual', 'x-claude-code-context-compacted': 'manual' });
  assert.throws(() => readRequestAgent(JSON.stringify({ version: 1, map: false, client: { cc_compaction_request: 'Manual Kind' } })), /Invalid Worker agent context/);
});
