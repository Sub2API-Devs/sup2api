// The identity source decides what metadata.user_id the upstream request
// carries. Only the verified Worker supplies this context; no account secret or
// client identifier enters the CLI environment.
import { uuidV4Pattern as uuid } from './shared.js';

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
      Object.keys(value).some(key => !['version', 'mode', 'rewrite', 'session_id', 'device_id', 'parent_session_id', 'carrier'].includes(key)) ||
      value.carrier !== undefined && !['json', 'object', 'flat'].includes(value.carrier)) {
    throw Error('Invalid Worker request identity');
  }
  cachedRaw = raw; cachedValue = value;
  return value;
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

// applyBuildMetadata owns metadata for build mode: the native builder always
// invents one, but a client that sent no identity must not get one, and a
// client value must follow the configured source. Whether the client value is
// replaced is the Worker's rewrite decision: a value with
// nothing to map (only unknown or empty fields) stays the client's, in its own
// carrier (2026-10-21; build used to replace it with this CLI's identity).
export function applyBuildMetadata(built, clientMetadata, nativeIdentity) {
  const mapped = identity();
  // Without a Worker context (API-key accounts, older Workers) the native
  // builder keeps ownership of metadata.
  if (!mapped) return built;
  const metadata = clientMetadata && typeof clientMetadata === 'object' && !Array.isArray(clientMetadata)
    ? structuredClone(clientMetadata) : undefined;
  if (metadata && mapped.rewrite && hasUserID(metadata))
    metadata.user_id = encode(target(nativeIdentity()), mapped.carrier ?? (typeof metadata.user_id === 'string' ? 'json' : 'object'));
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
