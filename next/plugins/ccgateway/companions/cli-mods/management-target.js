// Where a management request goes: the API origin, the allowed path, and the
// egress proxy. The rules mirror the Worker's management client
// (companions/engine/resource_carrier.go resourceTarget and usage.go): HTTPS
// only, the first-party origin for an OAuth login, and HTTPS_PROXY as the one
// supported proxy.
import { ManagementInputError } from './management-error.js';

// managementTarget is the origin plus the allowed path.
export function managementTarget(route, credentials, env, override) {
  const base = managementBase(env, override);
  if (credentials.kind === 'oauth' && override === undefined) {
    let url;
    try { url = new URL(base); } catch { throw new ManagementInputError('ANTHROPIC_BASE_URL is not a valid URL'); }
    if (!(url.protocol === 'https:' && url.hostname === 'api.anthropic.com' && (url.port === '' || url.port === '443') &&
        (url.pathname === '' || url.pathname === '/'))) {
      throw new ManagementInputError('OAuth management requests require the first-party API origin');
    }
  }
  return base + route.path + (route.query ? '?' + route.query : '');
}

// managementBase is ANTHROPIC_BASE_URL when set, else Anthropic's own origin.
// An override exists for tests only; the patched entry passes none.
export function managementBase(env, override) {
  if (override !== undefined) return String(override).replace(/\/+$/, '');
  const raw = env.ANTHROPIC_BASE_URL;
  if (!raw) return 'https://api.anthropic.com';
  let url;
  try { url = new URL(raw); } catch { throw new ManagementInputError('ANTHROPIC_BASE_URL is not a valid URL'); }
  const segments = url.pathname.split('/');
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || segments.some(part => part === '.' || part === '..' || part.includes('\\'))) {
    throw new ManagementInputError('ANTHROPIC_BASE_URL is not a usable HTTPS API origin');
  }
  return url.origin + url.pathname.replace(/\/+$/, '');
}

// managementProxy is the single HTTPS proxy of the environment, resolved the
// way the Worker's management client resolves it: HTTPS_PROXY only, never
// ALL_PROXY, and a conflicting or malformed configuration is refused rather
// than silently sent direct.
export function managementProxy(env) {
  const values = new Set();
  for (const [name, value] of Object.entries(env)) {
    if (!value) continue;
    const key = name.toLowerCase();
    if (key === 'all_proxy') throw new ManagementInputError('ALL_PROXY is not supported for management requests');
    if (key === 'https_proxy') values.add(value);
  }
  if (values.size === 0) return undefined;
  if (values.size > 1) throw new ManagementInputError('conflicting HTTPS proxy configuration');
  const raw = [...values][0];
  let url;
  try { url = new URL(raw); } catch { throw new ManagementInputError('invalid management HTTPS proxy configuration'); }
  if (!['http:', 'https:', 'socks5:', 'socks5h:'].includes(url.protocol) || !url.hostname || url.search || url.hash ||
      (url.pathname !== '' && url.pathname !== '/')) {
    throw new ManagementInputError('invalid management HTTPS proxy configuration');
  }
  return raw;
}
