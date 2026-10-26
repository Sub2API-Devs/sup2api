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
    if (arg === '--capture-body') { options.captureBody = true; continue; }
    if (arg === '-' || !arg.startsWith('-')) { setInput(arg); continue; }
    if (!['--input', '--betas', '--header', '--timeout-ms', '--response-meta', '--capture-request'].includes(arg)) throw Error(`Unknown request option: ${arg}`);
    const value = args[++i];
    if (value === undefined) throw Error(`Missing value for ${arg}`);
    if (arg === '--input') setInput(value);
    if (arg === '--betas') options.betas = normalizeBetas(options.betas, value);
    if (arg === '--timeout-ms') options.timeoutMs = Number(value);
    if (arg === '--response-meta') options.meta = value;
    if (arg === '--capture-request') {
      if (!value) throw Error('--capture-request needs a file prefix');
      options.capture = value;
    }
    if (arg === '--header') addHeader(options, value);
  }
  options.mode ??= 'direct';
  // The body is part of a capture: without the record it has no file.
  if (options.captureBody && options.capture === undefined) throw Error('--capture-body requires --capture-request');
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

// A build is a JavaScript object, and JSON.parse keeps a number only as the
// double nearest to it: 12345678901234567891 would go upstream as
// 12345678901234567000, 1.0 as 1 (2026-10-25: the client's numbers are sent as
// the client wrote them, never refused or rounded). So build parses a body in
// which every number that JSON.stringify would not give back unchanged stands
// in as a placeholder string; the request is assembled around it, and the
// sent body gets the client's text back (model-request.js, at the fetch
// boundary). A number the builder reads (numberValue) is the double it
// denotes. Direct sends the raw bytes and parses only to read them.
const tokens = /"(?:[^"\\]|\\.)*"|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;

export function parseRequestJSON(raw, mode) {
  if (mode !== 'build') return JSON.parse(raw);
  return parseBuildJSON(raw).body;
}

// parseBuildJSON is the build input with its numbers kept: body, and
// restoreNumbers(text), which puts the client's numbers back into the JSON
// text of the request that is sent.
export function parseBuildJSON(raw) {
  let nonce;
  do nonce = crypto.randomUUID().replaceAll('-', ''); while (raw.includes(nonce));
  const kept = [];
  const text = raw.replace(tokens, (match, number) => {
    if (number === undefined || JSON.stringify(Number(number)) === number) return match;
    kept.push(number);
    return `"ccgnum_${nonce}_${kept.length - 1}"`;
  });
  const body = JSON.parse(text);
  const placeholder = new RegExp(`"ccgnum_${nonce}_(\\d+)"`, 'g');
  keptNumbers = kept.length ? { nonce, kept } : undefined;
  return {
    body,
    // Without a kept number the sent body is left alone.
    restoreNumbers: kept.length ? sent => {
      const restored = sent.replace(placeholder, (_, index) => kept[Number(index)]);
      // A placeholder that was copied into other text cannot be restored.
      if (restored.includes(`ccgnum_${nonce}_`)) throw Error('request --build could not keep a number as the client sent it');
      return restored;
    } : undefined,
  };
}

// numberValue is what a value the builder reads denotes: a kept number whose
// double is exactly the client's value (10.0 is ten) is that double; one the
// double would change (1.00000000000000001, 9007199254740993) stays the
// placeholder, so the builder does not get it and the client's text is sent
// (request-parameters.js generationControls). Any other value is itself.
let keptNumbers;
export function numberValue(value) {
  if (typeof value !== 'string' || !keptNumbers) return value;
  const match = /^ccgnum_([0-9a-f]{32})_(\d+)$/.exec(value);
  if (!match || match[1] !== keptNumbers.nonce) return value;
  const text = keptNumbers.kept[Number(match[2])], number = Number(text);
  return Number.isFinite(number) && decimal(text) === decimal(JSON.stringify(number)) ? number : value;
}

// decimal is a JSON number's exact value as digits and an exponent, so two
// spellings of one value (10.0, 1e1, 10) compare equal.
function decimal(text) {
  const [, sign, whole, fraction = '', exponent = '0'] = /^(-?)(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/.exec(text);
  let digits = (whole + fraction).replace(/^0+/, ''), power = Number(exponent) - fraction.length;
  if (!digits) return '0';
  const zeros = digits.length - digits.replace(/0+$/, '').length;
  digits = digits.slice(0, digits.length - zeros);
  power += zeros;
  return `${sign}${digits}e${power}`;
}
