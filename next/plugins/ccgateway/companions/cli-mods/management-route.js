// The allowlist of management routes `claude ccgateway-mgmt` will send. It is
// the same list the Worker admits for Files/Skills
// (companions/contracts/resources/operations.go, ValidateOperation), plus the
// two OAuth reads Claude Code makes for itself (`/api/oauth/usage`, from the
// usage reader, and `/api/oauth/profile`, from the profile reader). A path is
// matched part by part; the ID and version parts are any valid segment, so a
// UUID is never written down here.
import { ManagementInputError } from './management-error.js';

const segment = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,255}$/;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The usage read's query flags: at_wall=1&skip_spend=1, cedar_ember=1, and
// starry_waterfall=<surface>&skip_spend=1 (Claude Code's own values).
const usageFlags = new Map([
  ['at_wall', /^(1|[A-Za-z0-9_-]{1,64})$/],
  ['skip_spend', /^(1|[A-Za-z0-9_-]{1,64})$/],
  ['cedar_ember', /^(1|[A-Za-z0-9_-]{1,64})$/],
  ['starry_waterfall', /^[A-Za-z0-9_-]{1,64}$/],
]);

// checkManagementRoute validates one path and method against the allowlist and
// returns what the transport needs: the path without its query, the query as
// given, and the Accept header the native call sends when the caller supplied
// none. An upload route must have a body and every other route must not.
export function checkManagementRoute(path, method, hasBody = false) {
  if (typeof path !== 'string' || !path.startsWith('/') || path.includes('%') || path.includes('#') || path.includes('\\')) {
    throw new ManagementInputError('invalid resource path', 'cli_invalid_management_path');
  }
  const mark = path.indexOf('?');
  const pathname = mark < 0 ? path : path.slice(0, mark);
  const rawQuery = mark < 0 ? '' : path.slice(mark + 1);
  if (mark >= 0 && !validEncoding(rawQuery)) throw new ManagementInputError('invalid resource query', 'cli_invalid_management_path');
  const query = new URLSearchParams(rawQuery);
  if (pathname === '/api/oauth/usage') return oauthUsage(query, method, hasBody, pathname, rawQuery);
  if (pathname === '/api/oauth/profile') return oauthProfile(query, method, hasBody, pathname, rawQuery);
  return resourceRoute(pathname, rawQuery, query, method, hasBody);
}

// validEncoding rejects a query whose percent escapes are malformed, as Go's
// url.ParseQuery does.
function validEncoding(raw) {
  return !/%(?![0-9a-fA-F]{2})/.test(raw);
}

function single(query, key) {
  const values = query.getAll(key);
  return { present: values.length > 0, unique: values.length === 1, values };
}

function oauthUsage(query, method, hasBody, pathname, rawQuery) {
  if (method !== 'GET' || hasBody) throw new ManagementInputError('invalid oauth usage operation', 'cli_invalid_management_path');
  for (const key of new Set(query.keys())) {
    const pattern = usageFlags.get(key);
    const { unique, values } = single(query, key);
    if (!pattern || !unique || !pattern.test(values[0])) throw new ManagementInputError('unsupported resource query parameter', 'cli_invalid_management_path');
  }
  return { path: pathname, query: rawQuery, upload: false, accept: 'application/json, text/plain, */*' };
}

function oauthProfile(query, method, hasBody, pathname, rawQuery) {
  if (method !== 'GET' || hasBody) throw new ManagementInputError('invalid oauth profile operation', 'cli_invalid_management_path');
  for (const key of new Set(query.keys())) {
    const { unique, values } = single(query, key);
    if (key !== 'account_uuid' || !unique || !uuid.test(values[0])) throw new ManagementInputError('unsupported resource query parameter', 'cli_invalid_management_path');
  }
  return { path: pathname, query: rawQuery, upload: false, accept: 'application/json, text/plain, */*' };
}

// resourceRoute mirrors resources.ValidateOperation: the Files/Skills
// operations, their methods, which of them carry a payload, and the query
// parameters each one admits.
function resourceRoute(pathname, rawQuery, query, method, hasBody) {
  const parts = pathname.slice(1).split('/');
  if (parts.length < 2 || parts[0] !== 'v1' || (parts[1] !== 'files' && parts[1] !== 'skills')) {
    throw new ManagementInputError('unknown resource endpoint', 'cli_invalid_management_path');
  }
  if (!parts.every(part => segment.test(part))) throw new ManagementInputError('invalid resource path segment', 'cli_invalid_management_path');
  let allowed = false, upload = false;
  if (parts[1] === 'files') {
    if (parts.length === 2) { allowed = method === 'GET' || method === 'POST'; upload = method === 'POST'; }
    else if (parts.length === 3) allowed = method === 'GET' || method === 'DELETE';
    else if (parts.length === 4) allowed = parts[3] === 'content' && method === 'GET';
  } else {
    if (parts.length === 2) { allowed = method === 'GET' || method === 'POST'; upload = method === 'POST'; }
    else if (parts.length === 3) allowed = method === 'GET' || method === 'DELETE';
    else if (parts.length === 4) { allowed = parts[3] === 'versions' && (method === 'GET' || method === 'POST'); upload = allowed && method === 'POST'; }
    else if (parts.length === 5) allowed = parts[3] === 'versions' && (method === 'GET' || method === 'DELETE');
    else if (parts.length === 6) allowed = parts[3] === 'versions' && parts[5] === 'content' && method === 'GET';
  }
  if (!allowed) throw new ManagementInputError('unsupported resource method or path', 'cli_invalid_management_path');
  for (const key of new Set(query.keys())) {
    const { unique, values } = single(query, key);
    if (key === 'beta' && parts[1] === 'skills' && unique && values[0] === 'true') continue;
    // ids/ids[] are list parameters: repeats are the caller's format, as in
    // the Worker's own admission (only beta is required to appear once).
    const listed = method === 'GET' && (
      parts[1] === 'files' && parts.length === 2 && ['limit', 'page', 'before_id', 'after_id', 'ids', 'ids[]'].includes(key) ||
      parts[1] === 'skills' && ((parts.length === 2 || parts.length === 4) && (key === 'limit' || key === 'page') || parts.length === 2 && key === 'source'));
    if (!listed) throw new ManagementInputError('unsupported resource query parameter', 'cli_invalid_management_path');
  }
  if (upload !== hasBody) throw new ManagementInputError('invalid resource management payload', 'cli_invalid_management_path');
  // A download's native call asks for binary bytes by name; anything else uses
  // the client's default Accept.
  const accept = parts[1] === 'files' && parts.length === 4 ? 'application/binary' : 'application/json, text/plain, */*';
  return { path: pathname, query: rawQuery, upload, accept };
}
