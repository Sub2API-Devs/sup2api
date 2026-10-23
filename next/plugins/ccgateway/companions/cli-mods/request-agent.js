// The client's kind of request (main thread, subagent, compaction) and its
// agent and prompt IDs, rebuilt for Claude Code's own code. CC derives the
// request-class, agent-type, agent-id, parent-agent-id and prompt-id headers,
// the cache lifetime (and with it the extended-cache-ttl beta) and the billing
// header's cc_is_subagent and cc_prompt_id from four inputs: querySource,
// requestClass, agentContext and promptId (2.1.304 sF, PVs, IVs, OUe, kLo,
// zbe). This module only chooses those inputs; the headers stay CC's.
//
// The Worker supplies the client's CC headers and a key scoped to the client
// session (SUBAGENT-REQUEST-CONTEXT-DESIGN.md). Which kind of request it is
// comes from the client's request-class header, otherwise from the body:
// a first block that opens with CC's billing header is Claude Code's, a
// subagent when the header says cc_is_subagent=true; any other request is
// built as CC's main thread (2026-10-23: a request without the header is
// completed as the main agent's).
import { createHash, createHmac } from 'node:crypto';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const clientFields = {
  request_class: /^[a-z][a-z_]{0,31}$/,
  agent_id: /^[!-~]{1,256}$/,
  parent_agent_id: /^[!-~]{1,256}$/,
  agent_type: /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,63}$/,
  prompt_id: uuid,
  // CC 2.1.304 g4t: up to 32 "tool=ms" entries joined by ";".
  prev_tool_durations: /^(?=.{1,4096}$)[!-:<>-~]+=[0-9]+(;[!-:<>-~]+=[0-9]+){0,31}$/,
  // CC 2.1.304 Zmn2: the compaction kind, on the compaction request and on
  // the first request after one.
  cc_compaction_request: /^[a-z][a-z_]{0,31}$/,
  claude_code_compaction: /^[a-z][a-z_]{0,31}$/,
  cc_context_compacted: /^[a-z][a-z_]{0,31}$/,
  claude_code_context_compacted: /^[a-z][a-z_]{0,31}$/,
};
// The client's own loop state, sent on as the client sent it.
const loopFields = ['prev_tool_durations', 'cc_compaction_request', 'claude_code_compaction', 'cc_context_compacted', 'claude_code_context_compacted'];

// readRequestAgent is the Worker's context, or null without one (an older
// Worker, or the CLI run by hand), which keeps the native main-thread request.
export function readRequestAgent(raw = process.env.CCG_REQUEST_AGENT) {
  if (!raw) return null;
  let value;
  try { value = JSON.parse(raw); } catch { throw Error('Invalid Worker agent context'); }
  const client = value?.client ?? {};
  if (!value || value.version !== 1 || typeof value.map !== 'boolean' ||
      value.key !== undefined && !/^[0-9a-f]{64}$/.test(value.key) || value.map && value.key === undefined ||
      !client || typeof client !== 'object' || Array.isArray(client) ||
      Object.entries(client).some(([name, text]) => !Object.hasOwn(clientFields, name) || typeof text !== 'string' || !clientFields[name].test(text)) ||
      Object.keys(value).some(name => !['version', 'map', 'key', 'client'].includes(name))) {
    throw Error('Invalid Worker agent context');
  }
  return { map: value.map, key: value.key, client };
}

// derive maps one value, one label per kind of ID. An account without a key
// (API key) still gets stable IDs it never sent.
function derive(key, label, value) {
  const input = JSON.stringify(['ccgateway-agent-context-v1', label, value]);
  return key ? createHmac('sha256', Buffer.from(key, 'hex')).update(input).digest() : createHash('sha256').update(input).digest();
}
const agentID = bytes => 'a' + bytes.subarray(0, 8).toString('hex');
function uuidV4(bytes) {
  const b = Buffer.from(bytes.subarray(0, 16));
  b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
  const s = b.toString('hex');
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
}

// resolveAgentContext chooses CC's inputs. billing is the client's own leading
// billing header fields (null when the first block does not open with it),
// prompt the client's first user prompt (the text CC fingerprints), and
// querySourceFor CC's own query source naming (2.1.304 Zoe) and loopHeaders
// the names of the headers that carry the client's own loop state, by field
// (CC's constants, ccgatewayLayerVocabulary). Mapped values
// replace the client's only when the context says so; IDs the client never
// sent are derived in either mode.
export function resolveAgentContext(context, { billing, prompt = '', querySourceFor, loopHeaders }) {
  if (loopFields.some(field => typeof loopHeaders?.[field] !== 'string')) throw Error('Missing native loop header names');
  const { client, map, key } = context;
  const own = (label, value) => map ? derive(key, label, value) : undefined;
  const claudeCode = billing !== null && billing !== undefined;
  const requestClass = client.request_class ?? (claudeCode && billing.cc_is_subagent === 'true' ? 'subagent' : 'main');
  const clientPrompt = client.prompt_id ?? (claudeCode && uuid.test(billing.cc_prompt_id ?? '') ? billing.cc_prompt_id : undefined);
  const promptId = clientPrompt !== undefined ? (map ? uuidV4(own('prompt', clientPrompt)) : clientPrompt)
    : claudeCode ? undefined : uuidV4(derive(key, 'prompt-text', prompt));
  const result = { requestClass, promptId };
  // The previous turn's tool timings and the compaction kind are the client's
  // loop state; CC sends them as headers and so do we, unchanged.
  const headers = Object.fromEntries(loopFields.filter(field => client[field] !== undefined).map(field => [loopHeaders[field], client[field]]));
  if (Object.keys(headers).length) result.headers = headers;
  // The client's header says cc_prompt_id; the request header must agree.
  if (map && claudeCode && billing.cc_prompt_id !== undefined && promptId !== undefined) result.billingPromptId = promptId;
  if (requestClass === 'subagent' || requestClass === 'workflow') {
    // Agent IDs are the client's own in both modes (2026-10-22): the parent
    // thread's messages name the subagent by its ID (the Agent tool result
    // says agentId: ...), so a mapped header would no longer match them.
    // Only a request without one gets a derived ID.
    const agentId = client.agent_id ?? agentID(derive(key, 'agent-text', prompt));
    const parentAgentId = client.parent_agent_id;
    // A custom agent's type is never sent (CC reports "custom"); a built-in
    // one's is its name, which CC reads back from the query source.
    result.querySource = client.agent_type !== undefined && client.agent_type !== 'custom' ? querySourceFor(client.agent_type, true) : querySourceFor(undefined, false);
    result.agentContext = { agentType: 'subagent', agentId, ...parentAgentId !== undefined && { parentAgentId }, ...promptId !== undefined && { parentPromptId: promptId }, invocationKind: 'spawn' };
    // workflow needs a run CC would have; the class is stated instead.
    if (requestClass === 'workflow') result.explicitClass = 'workflow';
  } else {
    result.querySource = requestClass === 'compaction' ? 'compact' : 'sdk';
    if (requestClass !== 'main' && requestClass !== 'compaction') result.explicitClass = requestClass;
  }
  return result;
}
