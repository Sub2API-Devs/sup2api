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
// replaced is the Worker's rewrite decision, exactly as in direct: a value with
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

const whitespace = (raw, i) => {
  while (i < raw.length && /[\t\n\r ]/.test(raw[i])) i++;
  return i;
};
function stringEnd(raw, i) {
  if (raw[i++] !== '"') throw Error('Invalid identity JSON string');
  while (i < raw.length) {
    if (raw[i] === '\\') { i += 2; continue; }
    if (raw[i++] === '"') return i;
  }
  throw Error('Incomplete identity JSON string');
}
function valueEnd(raw, i) {
  if (raw[i] === '"') return stringEnd(raw, i);
  if (raw[i] === '{' || raw[i] === '[') {
    let depth = 0;
    for (; i < raw.length; i++) {
      if (raw[i] === '"') { i = stringEnd(raw, i) - 1; continue; }
      if (raw[i] === '{' || raw[i] === '[') depth++;
      if ((raw[i] === '}' || raw[i] === ']') && --depth === 0) return i + 1;
    }
    throw Error('Incomplete identity JSON value');
  }
  while (i < raw.length && !/[\t\n\r ,}\]]/.test(raw[i])) i++;
  return i;
}
function property(raw, start, name) {
  let i = whitespace(raw, start), found;
  if (raw[i++] !== '{') throw Error('Identity carrier must be an object');
  while ((i = whitespace(raw, i)) < raw.length && raw[i] !== '}') {
    const end = stringEnd(raw, i), key = JSON.parse(raw.slice(i, end));
    i = whitespace(raw, end);
    if (raw[i++] !== ':') throw Error('Invalid identity JSON property');
    const first = whitespace(raw, i), last = valueEnd(raw, first);
    if (key === name) {
      if (found) throw Error('Duplicate request identity property');
      found = { first, last };
    }
    i = whitespace(raw, last);
    if (raw[i] === '}') return found;
    if (raw[i++] !== ',') throw Error('Invalid identity JSON separator');
  }
  return found;
}

// Claude Code opens every system prompt with its own line, after the
// attribution header when there is one: 2.1.304 PAs builds
// [header, n1n(), ...prompt], n1n picks the line and t1n recognizes all of
// them. Upstream refuses OAuth Sonnet/Opus requests whose first system block
// is neither the header nor such a line with 429 rate_limit_error "Error"
// (verified 2026-10-21 in build and direct; a line merged into a longer block
// or placed after the prompt does not count). An OAuth request without the
// line where Claude Code puts it gets the CLI's own line inserted there; both
// the line and the check are the CLI's (isPrefix = t1n), never a copy.
const blockText = block => block?.type === 'text' && typeof block.text === 'string' ? block.text : undefined;

function checkedPrefix(prefix, isPrefix) {
  if (typeof prefix !== 'string' || !isPrefix(prefix)) throw Error('Missing native Claude Code system line');
  return prefix;
}

// prefixPosition is the index the line goes to, or -1 when the system already
// opens with it, directly or after the attribution header.
function prefixPosition(blocks, isPrefix) {
  const first = blockText(blocks[0]);
  if (first?.startsWith('x-anthropic-billing-header:')) return blocks.some(block => isPrefix(blockText(block))) ? -1 : 1;
  return isPrefix(first) ? -1 : 0;
}

// applyBuildCliPrefix puts the line the native builder made for this request
// into the built request, whose system is the client's.
export function applyBuildCliPrefix(built, prefix, isPrefix) {
  const block = { type: 'text', text: checkedPrefix(prefix, isPrefix) };
  if (built.system === undefined) built.system = [block];
  else if (Array.isArray(built.system)) {
    const at = prefixPosition(built.system, isPrefix);
    if (at >= 0) built.system = [...built.system.slice(0, at), block, ...built.system.slice(at)];
  }
  return built;
}

// directCliPrefix puts the line into a direct body, inserting bytes only: the
// rest of the body, a string system included, stays exactly as received.
export function directCliPrefix(raw, prefix, isPrefix) {
  const block = JSON.stringify({ type: 'text', text: checkedPrefix(prefix, isPrefix) });
  const system = property(raw, 0, 'system');
  if (!system) {
    const open = whitespace(raw, 0) + 1;
    return raw.slice(0, open) + `"system":[${block}]` + (raw[whitespace(raw, open)] === '}' ? '' : ',') + raw.slice(open);
  }
  const value = raw.slice(system.first, system.last);
  if (raw[system.first] === '"') {
    const text = JSON.parse(value) === '' ? '' : `,{"type":"text","text":${value}}`;
    return raw.slice(0, system.first) + `[${block}${text}]` + raw.slice(system.last);
  }
  if (raw[system.first] !== '[') return raw;
  const at = prefixPosition(JSON.parse(value), isPrefix);
  if (at < 0) return raw;
  let i = whitespace(raw, system.first + 1);
  for (let k = 0; k < at; k++) {
    i = whitespace(raw, valueEnd(raw, i));
    if (raw[i] === ',') i = whitespace(raw, i + 1);
  }
  const insert = raw[i] === ']' ? (at > 0 ? ',' : '') + block : block + ',';
  return raw.slice(0, i) + insert + raw.slice(i);
}

// rewriteDirectIdentity replaces only the identity span the client sent. Every
// other byte of the direct body, including unsafe integers and whitespace,
// stays exactly as received.
export function rewriteDirectIdentity(raw, nativeIdentity) {
  const mapped = identity();
  if (!mapped?.rewrite) return raw;
  const metadata = property(raw, 0, 'metadata');
  const user = metadata && raw[metadata.first] === '{' && property(raw, metadata.first, 'user_id');
  if (!user) return raw;
  const carrier = raw[user.first];
  if (carrier !== '"' && carrier !== '{') return raw;
  const replacement = JSON.stringify(encode(target(nativeIdentity()), mapped.carrier ?? (carrier === '{' ? 'object' : 'json')));
  return raw.slice(0, user.first) + replacement + raw.slice(user.last);
}
