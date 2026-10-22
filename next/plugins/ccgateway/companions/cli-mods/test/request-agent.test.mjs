import test from 'node:test';
import assert from 'node:assert/strict';
import { readRequestAgent, resolveAgentContext } from '../request-agent.js';

// Claude Code 2.1.304's own query source naming (Zoe).
const querySourceFor = (type, builtIn) => builtIn ? (type ? `agent:builtin:${type}` : 'agent:default') : (type ? `agent:custom:${type}` : 'agent:custom');
const key = 'ab'.repeat(32), otherKey = 'cd'.repeat(32);
const P = 'a606b757-b9e1-4f6f-8eb0-88ffd9569a8d';
const mapped = (client = {}, k = key) => ({ map: true, key: k, client });
const resolve = (context, billing, prompt = 'Reply with OK.') => resolveAgentContext(context, { billing, prompt, querySourceFor });
const subagentHeader = { cc_version: '2.1.304.9a4', cc_entrypoint: 'sdk-cli', cc_is_subagent: 'true', cc_prompt_id: P };
const mainHeader = { cc_version: '2.1.304.1d1', cc_entrypoint: 'sdk-cli', cc_prompt_id: P };

test('a mapped subagent keeps every equality the client requests had', () => {
  const sub = resolve(mapped({ request_class: 'subagent', agent_id: 'a12268251d7ed891f', agent_type: 'general-purpose', prompt_id: P }), subagentHeader);
  assert.equal(sub.querySource, 'agent:builtin:general-purpose');
  assert.match(sub.agentContext.agentId, /^a[0-9a-f]{16}$/);
  assert.notEqual(sub.agentContext.agentId, 'a12268251d7ed891f');
  assert.match(sub.promptId, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.notEqual(sub.promptId, P);
  // Header and billing header name one prompt.
  assert.equal(sub.billingPromptId, sub.promptId);
  assert.equal(sub.agentContext.parentPromptId, sub.promptId);
  // The same subagent on its next turn.
  assert.deepEqual(resolve(mapped({ request_class: 'subagent', agent_id: 'a12268251d7ed891f', agent_type: 'general-purpose', prompt_id: P }), subagentHeader, 'later turn'), sub);
  // A nested subagent's parent is that agent's own mapped ID.
  const child = resolve(mapped({ request_class: 'subagent', agent_id: 'a99', parent_agent_id: 'a12268251d7ed891f', agent_type: 'Explore', prompt_id: P }), subagentHeader);
  assert.equal(child.agentContext.parentAgentId, sub.agentContext.agentId);
  assert.notEqual(child.agentContext.agentId, sub.agentContext.agentId);
  // The main thread of the same prompt carries the same prompt ID.
  const main = resolve(mapped({ request_class: 'main', prompt_id: P }), mainHeader);
  assert.equal(main.promptId, sub.promptId);
  assert.equal(main.querySource, 'sdk');
  assert.equal(main.agentContext, undefined);
  // Another session's key maps the same client IDs elsewhere.
  const elsewhere = resolve(mapped({ request_class: 'subagent', agent_id: 'a12268251d7ed891f', prompt_id: P }, otherKey), subagentHeader);
  assert.notEqual(elsewhere.agentContext.agentId, sub.agentContext.agentId);
  assert.notEqual(elsewhere.promptId, sub.promptId);
});

test('without headers the body decides: CC main, CC subagent, anything else a custom subagent', () => {
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

  const other = resolve(mapped(), null, 'hello');
  assert.equal(other.requestClass, 'subagent');
  assert.equal(other.querySource, 'agent:custom');
  assert.equal(other.billingPromptId, undefined, 'there is no client header to rewrite');
  assert.match(other.promptId, /^[0-9a-f-]{36}$/);
  assert.equal(other.agentContext.parentPromptId, other.promptId, 'the header CC fills names the same prompt');
  assert.deepEqual(resolve(mapped(), null, 'hello'), other);
});

test('direct and API-key accounts send the client IDs unchanged', () => {
  const client = { request_class: 'subagent', agent_id: 'a12268251d7ed891f', parent_agent_id: 'aparent', agent_type: 'general-purpose', prompt_id: P };
  for (const context of [{ map: false, key, client }, { map: false, client }]) {
    const sub = resolve(context, subagentHeader);
    assert.equal(sub.agentContext.agentId, 'a12268251d7ed891f');
    assert.equal(sub.agentContext.parentAgentId, 'aparent');
    assert.equal(sub.promptId, P);
    assert.equal(sub.billingPromptId, undefined, 'the body keeps its own value');
    // A request that is not Claude Code's still gets stable IDs it never sent.
    const other = resolve({ ...context, client: {} }, null, 'hello');
    assert.match(other.agentContext.agentId, /^a[0-9a-f]{16}$/);
    assert.deepEqual(resolve({ ...context, client: {} }, null, 'hello'), other);
  }
  assert.notEqual(resolve({ map: false, key, client: {} }, null, 'hello').agentContext.agentId, resolve({ map: false, client: {} }, null, 'hello').agentContext.agentId);
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
