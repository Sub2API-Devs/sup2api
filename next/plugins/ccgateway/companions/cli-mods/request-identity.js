// The identity source decides what metadata.user_id the upstream request
// carries. Only the verified Worker supplies this context; no account secret or
// client identifier enters the CLI environment.
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const modes = new Set(['client', 'worker', 'replace']);

function identity() {
  const raw = process.env.CCG_REQUEST_IDENTITY;
  if (!raw) return null;
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
// [header, n1n(), ...prompt], n1n picks the line and t1n recognizes all of
// them. Upstream refuses OAuth Sonnet/Opus requests whose first system block
// is neither the header nor such a line with 429 rate_limit_error "Error"
// (verified 2026-10-21; a line merged into a longer block or placed after the
// prompt does not count). The header alone is enough (2026-10-22), so the line
// is for looking like the client the entrypoint names: build inserts the one
// chosen for the request's entrypoint (request-policy.js identityLineFor) where
// Claude Code puts it, or none, unless the first block is not the header, where
// the entrypoint's default line keeps the request acceptable. Direct forwards
// the body unchanged. The lines and the checks are the CLI's, never a copy:
// lines are n1n's three (patch-cli-2.1.304.cjs), isPrefix is t1n and isBilling
// is B1s, CC's test for its attribution header block.
const blockText = block => block?.type === 'text' && typeof block.text === 'string' ? block.text : undefined;
// Without a choice (no policy) the line is the one `claude -p` sends, matching
// the request process's sdk-cli entrypoint.
const defaultChoice = { line: 'agent_sdk', fallback: 'agent_sdk' };

function checkedPrefix(lines, name, isPrefix) {
  const prefix = lines?.[name];
  if (typeof prefix !== 'string' || !isPrefix(prefix)) throw Error('Missing native Claude Code system line');
  return prefix;
}

// prefixPosition is the index the line goes to, or -1 when the system already
// opens with it, directly or after the attribution header.
function prefixPosition(blocks, isPrefix, isBilling) {
  const first = blockText(blocks[0]);
  if (first !== undefined && isBilling(blocks[0])) return blocks.some(block => isPrefix(blockText(block))) ? -1 : 1;
  return isPrefix(first) ? -1 : 0;
}

// applyBuildCliPrefix puts the chosen line into the built request, whose
// system is the client's. A client line is never replaced.
export function applyBuildCliPrefix(built, choice, lines, isPrefix, isBilling) {
  const { line, fallback } = choice ?? defaultChoice;
  if (built.system === undefined) built.system = [{ type: 'text', text: checkedPrefix(lines, fallback, isPrefix) }];
  else if (Array.isArray(built.system)) {
    const at = prefixPosition(built.system, isPrefix, isBilling);
    // After the header the line is optional; anywhere else it is required.
    const name = line === 'none' ? at === 0 ? fallback : undefined : line;
    if (at >= 0 && name) built.system = [...built.system.slice(0, at), { type: 'text', text: checkedPrefix(lines, name, isPrefix) }, ...built.system.slice(at)];
  }
  return built;
}
