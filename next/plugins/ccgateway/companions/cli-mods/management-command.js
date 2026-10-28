// `claude ccgateway-mgmt`: one non-model management exchange (usage, profile,
// or a Files/Skills resource operation) sent by Claude Code's own runtime.
// Bun's fetch carries it, so the TLS fingerprint and the HTTP stack are the
// ones Anthropic sees from this CLI for every other management call, not the
// Go management client's.
//
// The answer goes to files: the body bytes as received to --output (binary
// safe, streamed), and {"status":<int>,"headers":{<lowercase name>: <value>}}
// to --meta.
// Exit codes: 0 response received (any HTTP status), 1 arguments, allowlist or
// output failure, 2 transport failure (DNS, connection, TLS, timeout),
// 3 response larger than --max-bytes, 4 not signed in / unusable credentials.
import fs from 'node:fs/promises';
import { parseManagementOptions, defaultManagementTimeout } from './management-options.js';
import { checkManagementRoute } from './management-route.js';
import { readManagementCredentials } from './management-credentials.js';
import { managementTarget, managementProxy } from './management-target.js';
import { managementUserAgent } from './management-natives.js';
import { ManagementInputError, ManagementResponseTooLarge, ManagementOutputError, encodeErrorFrame, managementErrorFrame } from './management-error.js';

const help = `Usage: claude ccgateway-mgmt --path <path> [--method GET|POST|PUT|DELETE]
                             [--header <name:value> ...] [--body <file>]
                             --output <file> --meta <file> [--timeout-ms <N>]
                             [--max-bytes <N>]

Send one non-model Anthropic management request through Claude Code's own
HTTP stack. The response body is streamed to --output byte for byte; --meta
receives {"status":<int>,"headers":{<lowercase name>: <value>}}.

  --path <path>            Route, with query, from a fixed allowlist: the
                           Files and Skills operations, GET /api/oauth/usage and
                           GET /api/oauth/profile (default: none)
  --method <method>        GET (default), POST, PUT or DELETE
  --header <name:value>    Repeatable; authorization and x-api-key are ignored
                           because Claude Code's own login is sent
  --body <file>            Request body read as bytes (Files/Skills uploads)
  --output <file>          Response body bytes
  --meta <file>            Response status and headers as JSON
  --timeout-ms <number>    Deadline including the response body (default: ${defaultManagementTimeout})
  --max-bytes <number>     Response size limit in bytes; 0 means no limit
                           (default: 0)
  --help                   Show this help

Exit codes: 0 response received (any HTTP status), 1 arguments, allowlist or
output failure, 2 transport failure, 3 response larger than --max-bytes,
4 not signed in or unusable credentials.
`;

// runManagementCommand runs the command and returns its exit code. deps exists
// for tests (a local origin, a fixed User-Agent); the patched entry passes none
// of it and the command uses the process's own environment and Claude Code's
// native User-Agent.
export async function runManagementCommand(args, deps = {}) {
  const env = deps.env ?? process.env;
  const fetchImpl = deps.fetch ?? globalThis.fetch;
  const userAgent = deps.userAgent ?? managementUserAgent;
  let phase = 'input';
  let options;
  try {
    options = parseManagementOptions(args);
    if (options.help) { process.stdout.write(help); return 0; }
    if (options.output === options.meta) throw new ManagementInputError('--output and --meta must be different files');
    const route = checkManagementRoute(options.path, options.method, options.body !== undefined);
    const credentials = readManagementCredentials(env);
    const target = managementTarget(route, credentials, env, deps.baseUrl);
    await clearOutput(options);
    const body = options.body === undefined ? undefined : await readBody(options.body);
    const init = {
      method: options.method,
      headers: managementHeaders(options.headers, credentials, userAgent, route),
      redirect: 'manual',
      signal: AbortSignal.timeout(options.timeoutMs),
    };
    if (body !== undefined) init.body = body;
    // A Worker-configured egress proxy is the Go management client's proxy too
    // (HTTPS_PROXY only, no ALL_PROXY); Bun's fetch takes it by name.
    const proxy = managementProxy(env);
    if (proxy) init.proxy = proxy;
    phase = 'transport';
    const response = await fetchImpl(target, init);
    await streamResponse(response, options);
    phase = 'output';
    await fs.writeFile(options.meta, JSON.stringify({ status: response.status, headers: headerObject(response.headers) }, null, 2) + '\n');
    return 0;
  } catch (error) {
    // A reused --meta path must not describe an earlier exchange: a failed
    // command leaves no answer at all.
    await fs.rm(options?.meta ?? '', { force: true }).catch(() => {});
    if (phase !== 'output' || options?.output === undefined) await fs.rm(options?.output ?? '', { force: true }).catch(() => {});
    await writeStderr(encodeErrorFrame(managementErrorFrame(error, { phase, timedOut: isTimeout(error) })));
    return exitCode(error, phase);
  }
}

// exitCode is the command's answer for a failure: an oversized response is 3,
// a missing or unusable login is 4 (the caller can re-authorize), a transport
// phase is 2, and anything else is 1.
function exitCode(error, phase) {
  if (error instanceof ManagementResponseTooLarge || error?.code === 'response_too_large') return 3;
  if (error?.code === 'not_logged_in') return 4;
  if (error instanceof ManagementOutputError || error?.code === 'cli_output_error') return 1;
  return phase === 'transport' ? 2 : 1;
}

// streamResponse copies the body to --output as it arrives, so a large Files
// download never sits whole in memory. Once --max-bytes is passed the reader is
// cancelled and the partial file is left for the caller's catch to remove. A
// local write fault is an output error (exit 1), not a transport failure.
async function streamResponse(response, options) {
  const limit = options.maxBytes;
  let handle;
  try { handle = await fs.open(options.output, 'w', 0o600); }
  catch (error) { throw new ManagementOutputError(`The response could not be written: ${error?.message ?? error}`); }
  try {
    let total = 0;
    const body = response.body;
    if (body) {
      const reader = body.getReader();
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          total += value.byteLength;
          if (limit > 0 && total > limit) {
            await reader.cancel().catch(() => {});
            throw new ManagementResponseTooLarge();
          }
          await writeChunk(handle, value);
        }
      } finally { reader.releaseLock?.(); }
    }
  } finally {
    await handle.close().catch(() => {});
  }
}

async function writeChunk(handle, value) {
  try { await handle.write(value); }
  catch (error) { throw new ManagementOutputError(`The response could not be written: ${error?.message ?? error}`); }
}

// clearOutput removes an earlier answer before the exchange starts.
async function clearOutput(options) {
  await fs.rm(options.output, { force: true });
  await fs.rm(options.meta, { force: true });
}

// managementHeaders are the caller's headers (never authentication), Claude
// Code's User-Agent and Accept, then Claude Code's own login.
function managementHeaders(supplied, credentials, userAgent, route) {
  const headers = new Headers();
  for (const [name, value] of Object.entries(supplied)) headers.set(name, value);
  const ua = typeof userAgent === 'function' ? userAgent() : String(userAgent ?? '');
  if (ua) headers.set('user-agent', ua);
  if (!headers.has('accept')) headers.set('accept', route.accept);
  if (credentials.kind === 'apiKey') headers.set('x-api-key', credentials.token);
  else headers.set('authorization', `Bearer ${credentials.token}`);
  return headers;
}

// readBody is the payload file as bytes. Bun streams it (a Files upload can be
// large); elsewhere, as in the tests, it is read whole.
async function readBody(file) {
  let info;
  try { info = await fs.stat(file); } catch { throw new ManagementInputError('--body file cannot be read'); }
  if (!info.isFile()) throw new ManagementInputError('--body must be a file');
  if (typeof Bun !== 'undefined' && typeof Bun.file === 'function') return Bun.file(file);
  return fs.readFile(file);
}

// headerObject is the response's headers with lowercase names. A header that
// appears more than once is kept once, its values joined as a recipient may
// read them.
function headerObject(headers) {
  const out = {};
  for (const [name, value] of headers) {
    const key = name.toLowerCase();
    out[key] = Object.hasOwn(out, key) ? out[key] + ', ' + value : value;
  }
  return out;
}

function isTimeout(error) {
  return error?.name === 'TimeoutError' || error?.cause?.name === 'TimeoutError';
}

function writeStderr(text) {
  return new Promise(resolve => {
    try { process.stderr.write(text, () => resolve()); } catch { resolve(); }
  });
}
