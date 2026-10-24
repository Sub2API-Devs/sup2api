// Request-boundary parsing only. Native CC owns model feature handling and
// HTTP; the protocol headers are request-headers.js.
import { normalizeBetas } from './request-headers.js';

export function parseRequestOptions(args) {
  const options = { input: '-', headers: {}, betas: [] };
  let inputSet = false;
  const setInput = value => { if (inputSet) throw Error('Specify one input file, either positional or --input'); inputSet = true; options.input = value; };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') { options.help = true; continue; }
    if (arg === '--direct' || arg === '--build') {
      if (options.mode && options.mode !== arg.slice(2)) throw Error('--direct and --build are mutually exclusive');
      options.mode = arg.slice(2); continue;
    }
    if (arg === '--') { if (i + 2 !== args.length) throw Error('Expected one input file after --'); setInput(args[++i]); continue; }
    if (arg === '-' || !arg.startsWith('-')) { setInput(arg); continue; }
    if (!['--input', '--betas', '--header', '--timeout-ms', '--response-meta'].includes(arg)) throw Error(`Unknown request option: ${arg}`);
    const value = args[++i];
    if (value === undefined) throw Error(`Missing value for ${arg}`);
    if (arg === '--input') setInput(value);
    if (arg === '--betas') options.betas = normalizeBetas(options.betas, value);
    if (arg === '--timeout-ms') options.timeoutMs = Number(value);
    if (arg === '--response-meta') options.meta = value;
    if (arg === '--header') addHeader(options, value);
  }
  options.mode ??= 'direct';
  if (options.betas.length) options.headers['anthropic-beta'] = options.betas.join(',');
  return options;
}

// Only the client protocol headers are taken: the betas, and the one API version.
function addHeader(options, value) {
  const colon = value.indexOf(':');
  if (colon < 1 || /[\r\n\0]/.test(value)) throw Error('--header must be name:value without control characters');
  const name = value.slice(0, colon).trim().toLowerCase(), content = value.slice(colon + 1).trim();
  if (name === 'anthropic-beta') { options.betas = normalizeBetas(options.betas, content); return; }
  if (name !== 'anthropic-version') throw Error(`Header ${name} is not a client protocol header; CC owns authentication and transport`);
  if (content !== '2023-06-01') throw Error('Unsupported anthropic-version');
  options.headers[name] = content;
}

// JSON.parse may round a nonintegral token such as 1.00000000000000001 to 1.
// Check only that integer-looking Number result against the original decimal
// token; ordinary fractional values retain the established JSON Number rules.
function exactIntegerToken(token) {
  const match = /^-?(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/.exec(token);
  if (!match) return false;
  const fraction = match[2] ?? '', digits = match[1] + fraction;
  if (/^0+$/.test(digits)) return true;
  const removed = fraction.length - Number(match[3] ?? 0);
  if (removed <= 0) return true;
  if (removed > digits.length) return false;
  return /^0+$/.test(digits.slice(-removed));
}

export function parseRequestJSON(raw, mode) {
  if (mode === 'build') {
    // A native JS builder cannot round-trip an unsafe integer. Reject it
    // before JSON.parse loses the original digits; direct keeps raw JSON.
    const tokens = /"(?:[^"\\]|\\.)*"|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;
    for (const match of raw.matchAll(tokens)) {
      if (match[1] === undefined) continue;
      const value = Number(match[1]);
      if (!Number.isFinite(value) || Number.isInteger(value) && (!Number.isSafeInteger(value) || !exactIntegerToken(match[1]))) {
        throw Error('request --build cannot represent an unsafe JSON number; use --direct');
      }
    }
  }
  return JSON.parse(raw);
}
