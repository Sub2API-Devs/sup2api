// The identity source decides what metadata.user_id the upstream request
// carries. Only the verified Worker supplies this context; no account secret or
// client identifier enters the CLI environment.
import { uuidV4Pattern as uuid, uuidPattern as anyUUID } from './shared.js';

const modes = new Set(['client', 'worker', 'replace']);

// requestIdentity parses CCG_REQUEST_IDENTITY once per distinct value: the
// process serves one request, and the session header, the metadata rewrite and
// the identity source all read the same context.
let cachedRaw, cachedValue;
function identity() {
  const raw = process.env.CCG_REQUEST_IDENTITY;
  if (!raw) return null;
  if (raw === cachedRaw) return cachedValue;
  let value;
  try { value = JSON.parse(raw); } catch { throw Error('Invalid Worker request identity'); }
  if (!value || value.version !== 2 || !modes.has(value.mode) ||
      typeof value.rewrite !== 'boolean' ||
      // A forwarded client value is never rewritten with this CLI's identity.
      value.mode === 'client' && value.rewrite ||
      value.session_id !== undefined && !uuid.test(value.session_id) ||
      value.device_id !== undefined && !/^[0-9a-f]{64}$/.test(value.device_id) ||
      value.parent_session_id !== undefined && !uuid.test(value.parent_session_id) ||
      Object.keys(value).some(key => !['version', 'mode', 'rewrite', 'session_id', 'device_id', 'parent_session_id', 'carrier', 'previous', 'spawn'].includes(key)) ||
      value.carrier !== undefined && !['json', 'object', 'flat'].includes(value.carrier) ||
      value.previous !== undefined && (value.session_id === undefined || !validPrevious(value.previous)) ||
      value.spawn !== undefined && (value.session_id === undefined || !validSpawn(value.spawn))) {
    throw Error('Invalid Worker request identity');
  }
  cachedRaw = raw; cachedValue = value;
  return value;
}

// validPrevious is the Worker's memory of the session thread (engine
// session_state.go): the thread (main, or a subagent's agent ID), the
// request-id Claude Code accepts as cc_prev_req (the native header's own
// test), and on the main thread a turn position the native count writes
// (promptIndex <= turnIndex <= 1e7) with its prompt's hash. For a request
// converted to the first-party shape (build_first_party_shape_v1) it may also
// hold the answer's message ID (the native cc_prev_msg test), the prompt ID
// the thread's header used and, for a subagent, its agent type.
const turnBound = 1e7;
const count = (value, least) => Number.isInteger(value) && value >= least && value <= turnBound;
const messageID = /^msg_[A-Za-z0-9_]{1,64}$/;
const agentType = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,63}$/;
const shapeFields = value => (value.message_id === undefined || typeof value.message_id === 'string' && messageID.test(value.message_id)) &&
  (value.prompt_id === undefined || typeof value.prompt_id === 'string' && anyUUID.test(value.prompt_id)) &&
  (value.agent_type === undefined || typeof value.agent_type === 'string' && agentType.test(value.agent_type));
function validPrevious(previous) {
  if (!previous || typeof previous !== 'object' || Array.isArray(previous) ||
      Object.keys(previous).some(key => !['thread', 'request_id', 'turn_position', 'prompt_hash', 'message_id', 'prompt_id', 'agent_type'].includes(key))) return false;
  const { thread, request_id: id, turn_position: turn, prompt_hash: hash } = previous;
  if (typeof thread !== 'string' || !/^[!-~]{1,256}$/.test(thread)) return false;
  if (id !== undefined && !/^req_[A-Za-z0-9_-]{1,36}$/.test(id)) return false;
  if (!shapeFields(previous) || thread === 'main' && previous.agent_type !== undefined) return false;
  if ((turn === undefined) !== (hash === undefined)) return false;
  if (turn === undefined) return true;
  return thread === 'main' && typeof hash === 'string' && /^[0-9a-f]{64}$/.test(hash) && turn !== null && typeof turn === 'object' &&
    Object.keys(turn).every(key => ['prompt_index', 'turn_index'].includes(key)) &&
    count(turn.turn_index, 1) && count(turn.prompt_index, 0) && turn.prompt_index <= turn.turn_index;
}

// validSpawn is what the Worker read off the parent thread's last answer for
// a subagent's first request (first-party shape): the Agent call whose
// prompt is this subagent's, with the parent's prompt ID and the agent type
// it asked for.
function validSpawn(spawn) {
  return spawn !== null && typeof spawn === 'object' && !Array.isArray(spawn) &&
    Object.keys(spawn).every(key => ['prompt_id', 'agent_type'].includes(key)) && spawn.message_id === undefined && shapeFields(spawn);
}

// previousSession is what the Worker remembers of the request's upstream
// session (request-session.js), or undefined.
export function previousSession() {
  return identity()?.previous;
}

// spawnContext is the parent's Agent call that spawned this subagent, as the
// Worker proved it (first-party shape), or undefined.
export function spawnContext() {
  return identity()?.spawn;
}

// requestSessionID is the root session the CLI must use, so the transport
// session header and metadata agree. Absent means the native random session.
export function requestSessionID() {
  return identity()?.session_id;
}

const flat = value => `user_${value.device_id}_account_${value.account_uuid ?? ''}_session_${value.session_id}`;

// target builds the identity object the upstream request must carry: the
// Worker's own identity, with the mapped fields when the source is replace.
function target(native) {
  const mapped = identity();
  if (!native || typeof native.user_id !== 'string') throw Error('Missing native request identity');
  const own = JSON.parse(native.user_id);
  if (mapped.mode !== 'replace') return own;
  return { ...own, ...(mapped.device_id && { device_id: mapped.device_id }),
    ...(mapped.session_id && { session_id: mapped.session_id }),
    ...(mapped.parent_session_id && { parent_session_id: mapped.parent_session_id }) };
}

// encode renders the identity object in the carrier the client used.
function encode(value, carrier) {
  if (carrier === 'object') return value;
  const text = JSON.stringify(value);
  return carrier === 'flat' ? flat(value) : text;
}

function hasUserID(metadata) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata) || !Object.hasOwn(metadata, 'user_id')) return false;
  const value = metadata.user_id;
  return typeof value === 'string' ? value !== '' : value !== null && typeof value === 'object' && Object.keys(value).length > 0;
}

// applyBuildMetadata owns metadata for build mode, by the Worker's decision
// (rewrite): a client value is mapped, and one with nothing to map (only
// unknown or empty fields) stays the client's, in its own carrier
// (2026-10-21). A request that sent no metadata.user_id gets the account's
// own identity when the Worker says so (2026-10-25: every Claude Code request
// carries one; such requests used to go without), next to any other metadata
// the client sent; otherwise it gets none.
export function applyBuildMetadata(built, clientMetadata, nativeIdentity) {
  const mapped = identity();
  // Without a Worker context (API-key accounts, older Workers) the native
  // builder keeps ownership of metadata.
  if (!mapped) return built;
  let metadata = clientMetadata && typeof clientMetadata === 'object' && !Array.isArray(clientMetadata)
    ? structuredClone(clientMetadata) : undefined;
  if (mapped.rewrite && hasUserID(metadata))
    metadata.user_id = encode(target(nativeIdentity()), mapped.carrier ?? (typeof metadata.user_id === 'string' ? 'json' : 'object'));
  else if (mapped.rewrite && mapped.mode === 'replace')
    metadata = { ...metadata, user_id: encode(target(nativeIdentity()), mapped.carrier ?? 'json') };
  if (!metadata || Object.keys(metadata).length === 0) delete built.metadata;
  else built.metadata = metadata;
  return built;
}

// Claude Code opens every system prompt with its own line, after the
// attribution header when there is one: 2.1.304 PAs builds
// [header, n1n(), ...prompt], the line chosen by n1n from three inputs
// (interactive; non-interactive with and without an appended prompt). Upstream
// refuses OAuth Sonnet/Opus requests whose first system block is neither the
// header nor such a line with 429 rate_limit_error "Error" (verified
// 2026-10-21; a line merged into a longer block or placed after the prompt does
// not count). The header alone is enough (2026-10-22), so the line is for
// looking like the client the entrypoint names.
//
// Build gets its line the native way: its query options record the chosen
// line's text (recordedCliPrefix), n1n returns it, and PAs puts it where it
// puts its own (request-build.js identityRequest; patch-cli-2.1.304.cjs
// captures the rendered line from PAs). Nothing about where a line goes is
// decided here. Direct forwards the body unchanged.
//
// The lines themselves are n1n's, never a copy: request-build.js renders them
// by passing n1n its three inputs, and the checks are t1n and B1s (CC's own
// tests for a line and for its attribution header block).
// Without a choice (no policy) the line is the one `claude -p` sends, matching
// the request process's sdk-cli entrypoint.
