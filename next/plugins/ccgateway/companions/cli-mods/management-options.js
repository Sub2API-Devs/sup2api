// Argument parsing for `claude ccgateway-mgmt`. Nothing here reaches the
// network: the route allowlist (management-route.js) and the login
// (management-credentials.js) check the parsed values next.
import { ManagementInputError } from './management-error.js';

export const managementMethods = ['GET', 'POST', 'PUT', 'DELETE'];
export const defaultManagementTimeout = 30000;

// A header name is an RFC 7230 token; a value has no control characters, so a
// caller cannot inject a second header through one argument.
const headerName = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;
const control = /[\0\r\n]/;

const valued = new Set(['--path', '--method', '--header', '--body', '--output', '--meta', '--timeout-ms', '--max-bytes']);

export function parseManagementOptions(args) {
  const options = { method: 'GET', headers: {}, timeoutMs: defaultManagementTimeout, maxBytes: 0 };
  const once = new Set();
  const setOnce = (name, value) => {
    if (once.has(name)) throw new ManagementInputError(`Specify ${name} once`);
    once.add(name);
    return value;
  };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') { options.help = true; continue; }
    if (!valued.has(arg)) throw new ManagementInputError(`Unknown management option: ${arg}`);
    const value = args[++i];
    if (value === undefined) throw new ManagementInputError(`Missing value for ${arg}`);
    switch (arg) {
      case '--path': options.path = setOnce(arg, value); break;
      case '--method': options.method = parseMethod(setOnce(arg, value)); break;
      case '--header': addHeader(options, value); break;
      case '--body': options.body = setOnce(arg, value); break;
      case '--output': options.output = setOnce(arg, value); break;
      case '--meta': options.meta = setOnce(arg, value); break;
      case '--timeout-ms': options.timeoutMs = parseTimeout(setOnce(arg, value)); break;
      case '--max-bytes': options.maxBytes = parseMaxBytes(setOnce(arg, value)); break;
    }
  }
  if (options.help) return options;
  if (options.path === undefined) throw new ManagementInputError('--path is required');
  if (!options.path.startsWith('/')) throw new ManagementInputError('--path must start with /');
  for (const name of ['output', 'meta']) {
    if (options[name] === undefined || options[name] === '') throw new ManagementInputError(`--${name} is required`);
  }
  return options;
}

function parseMethod(value) {
  const method = value.toUpperCase();
  if (!managementMethods.includes(method)) throw new ManagementInputError(`--method must be one of ${managementMethods.join(', ')}`);
  return method;
}

function parseTimeout(value) {
  if (!/^[0-9]+$/.test(value)) throw new ManagementInputError('--timeout-ms must be a positive integer');
  const timeout = Number(value);
  if (!Number.isSafeInteger(timeout) || timeout < 1) throw new ManagementInputError('--timeout-ms must be a positive integer');
  return timeout;
}

// parseMaxBytes is the response body limit; 0 means no limit.
function parseMaxBytes(value) {
  if (!/^[0-9]+$/.test(value)) throw new ManagementInputError('--max-bytes must be a non-negative integer');
  const maxBytes = Number(value);
  if (!Number.isSafeInteger(maxBytes)) throw new ManagementInputError('--max-bytes must be a non-negative integer');
  return maxBytes;
}

// addHeader takes a caller header. Claude Code owns authentication: an
// authorization or x-api-key argument is dropped, never sent.
function addHeader(options, value) {
  const colon = value.indexOf(':');
  if (colon < 1 || control.test(value)) throw new ManagementInputError('--header must be name:value without control characters');
  const name = value.slice(0, colon).trim().toLowerCase();
  if (!headerName.test(name)) throw new ManagementInputError('--header name is not an HTTP header name');
  if (name === 'authorization' || name === 'x-api-key') return;
  options.headers[name] = value.slice(colon + 1).trim();
}
