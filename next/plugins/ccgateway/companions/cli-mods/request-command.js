// Copied beside the version-pinned restored modules by patch-cli-2.1.304.cjs.
import fs from 'node:fs/promises';
import { sF, _ke, mle } from './chunk-38xgev2z.js';
import { Al } from './chunk-7p6jp6kj.js';
import { mBr } from './chunk-4qs43hr1.js';
import { setEntrypointOnRequests } from './chunk-72vwyp9d.js';
import { checkModelRequest, openModelRequest, readModelResponse, cancelModelResponse, defaultTimeout } from './ccgateway-model-request.js';
import { writeOutput as write } from './ccgateway-request-output.js';
import { parseRequestOptions, parseRequestJSON, normalizeBetas } from './ccgateway-request-options.js';
import { validateDirectPolicy } from './ccgateway-request-policy.js';
import { readRequestAgent, resolveAgentContext, keepClientUserAgent } from './ccgateway-request-agent.js';
import { httpErrorFrame, localErrorFrame, encodeErrorFrame, maxErrorBody } from './ccgateway-request-error.js';

const help = `Usage: claude request [--direct | --build] [--betas "a,b"] [file|-] [options]

Use CC's authenticated client to send either a Messages body or build components.
Successful responses (including SSE) use stdout. Errors use a structured stderr line.
HTTP error bytes are stored beside --response-meta as <file>.error-body, or in
the stderr frame as bodyBase64 when no metadata path is supplied.

  --direct                 Forward the original JSON body unchanged (default)
  --build                  Assemble components through CC, then send once
  --input <file|->          Read JSON from a file; default: stdin
  --betas <a,b,...>         API beta features (repeatable; comma separated)
  --header <name:value>     anthropic-version or anthropic-beta only
  --timeout-ms <number>     Deadline including response body (default: 600000)
  --response-meta <file>    Save HTTP status and response headers as JSON
  --help                   Show this help

Exit codes: 0 success, 1 transport/input error, 2 HTTP error, 130 interrupted.

Build components: model, systemPrompt, messages, attachments, tools, parameters,
and stream. Custom tools use inputSchema. Worker-extracted attachments use
references to preserve message/block positions. Generation fields go in parameters.
Authentication uses an explicit ANTHROPIC_API_KEY or CC's native OAuth login.
`;

// runRequestCommand runs `claude request`. natives are the patched entry's
// native bindings (request-entry.inc.js); without them the request is CC's
// native main thread and direct forwards the body unchanged.
export async function runRequestCommand(args, natives = {}) {
  const controller = new AbortController(), signal = controller.signal;
  // phase names the step that failed, for the error frame (request-error.js).
  const state = { phase: 'input', responseStarted: false };
  let response, interrupted = false, timedOut = false, outputError, deadline;
  const customHeaders = process.env.ANTHROPIC_CUSTOM_HEADERS;
  const interrupt = () => { interrupted = true; controller.abort(new Error('request interrupted')); process.stdin.destroy(); };
  const failedOutput = error => { outputError = error; controller.abort(error); };
  process.on('SIGINT', interrupt);
  process.on('SIGTERM', interrupt);
  process.stdout.on('error', failedOutput);
  try {
    const options = parseRequestOptions(args);
    if (options.help) { await write(process.stdout, help); return 0; }
    // A reused metadata path must not describe an earlier successful request.
    if (options.meta) {
      state.phase = 'output';
      await fs.rm(options.meta, { force: true });
      await fs.rm(options.meta + '.error-body', { force: true });
      state.phase = 'input';
    }
    const apiKey = process.env.ANTHROPIC_API_KEY;
    // Both sF and the SDK constructor read this variable. Never let arbitrary
    // server environment headers override authentication or request betas.
    delete process.env.ANTHROPIC_CUSTOM_HEADERS;
    const rawBody = await readInput(options.input, signal);
    const body = parseRequestJSON(rawBody, options.mode);
    // checkModelRequest also bounds --timeout-ms.
    const invalid = checkModelRequest({ body, headers: options.headers, timeoutMs: options.timeoutMs });
    if (invalid) throw Error(invalid);
    const timeout = options.timeoutMs ?? defaultTimeout;
    deadline = setTimeout(() => { timedOut = true; controller.abort(new Error('request timed out')); }, timeout);
    deadline.unref?.();
    const { outgoing, agent } = await prepareOutgoing(state, options, { body, rawBody, timeout, apiKey, signal }, natives);
    state.phase = 'transport';
    response = await openModelRequest(outgoing, signal, init => openClient(init, apiKey, agent), mle);
    if (!response.ok) {
      await writeHttpError(state, response, options.meta, signal);
      return 2;
    }
    state.phase = 'output';
    if (options.meta) await fs.writeFile(options.meta, JSON.stringify({ status: response.status, statusText: response.statusText, headers: response.headers, request: { mode: options.mode, ...response.request } }, null, 2) + '\n');
    await streamResponse(state, response, signal);
    return 0;
  } catch (error) {
    if (outputError?.code === 'EPIPE') return 0;
    await write(process.stderr, encodeErrorFrame(localErrorFrame(error, { phase: state.phase, timedOut, interrupted, responseStarted: state.responseStarted })));
    return interrupted ? 130 : 1;
  } finally {
    clearTimeout(deadline);
    if (response) await cancelModelResponse(response);
    process.off('SIGINT', interrupt);
    process.off('SIGTERM', interrupt);
    process.stdout.off('error', failedOutput);
    if (customHeaders === undefined) delete process.env.ANTHROPIC_CUSTOM_HEADERS;
    else process.env.ANTHROPIC_CUSTOM_HEADERS = customHeaders;
  }
}

const messagesOf = body => Array.isArray(body.messages) ? body.messages : [];

// prepareOutgoing is the request to send, as the mode makes it, and the
// client's kind of request (request-agent.js) it is sent as.
async function prepareOutgoing(state, options, { body, rawBody, timeout, apiKey, signal }, natives) {
  const { oauthBeta, agentNative } = natives;
  const resolveAgent = agentResolver(agentNative);
  let outgoing = { body, rawBody, headers: options.headers, timeoutMs: timeout }, agent;
  if (options.mode === 'direct') {
    agent = resolveAgent?.({ billing: agentNative.requestBilling(body.system), prompt: agentNative.prompt(messagesOf(body)) });
    outgoing = await prepareDirect(state, outgoing, agent, natives);
  } else ({ outgoing, agent } = await prepareBuild(state, body, options.headers, signal, resolveAgent, { ...natives, apiKey, timeout }));
  if (agent?.headers) outgoing.headers = { ...outgoing.headers, ...agent.headers };
  // A request sent with the client's own header keeps the client's User-Agent
  // (build reads the client's system from its components).
  keepClientUserAgent(agent, agentNative?.leadingBilling(options.mode === 'build' ? body.systemPrompt : body.system), agentNative?.leadingBilling(outgoing.body.system));
  const betas = normalizeBetas(outgoing.headers?.['anthropic-beta']);
  if (betas.length && !mBr(betas)) throw Error('Experimental betas are disabled by the active CC policy');
  outgoing.headerPolicy = { apiKey, betas, oauthBeta, version: options.headers['anthropic-version'] ?? '2023-06-01' };
  return { outgoing, agent };
}

// agentResolver resolves the client's kind of request from the Worker's agent
// context; without one the request is CC's native main thread (undefined).
function agentResolver(agentNative) {
  if (!process.env.CCG_REQUEST_AGENT || !agentNative) return undefined;
  const context = readRequestAgent();
  return facts => resolveAgentContext(context, { ...facts, querySourceFor: agentNative.querySourceFor, loopHeaders: agentNative.loopHeaders });
}

// readInput is the request JSON text, from a file or stdin, without a BOM.
async function readInput(input, signal) {
  if (input === '-' && process.stdin.isTTY) throw Error('Provide a Messages JSON body on stdin or use --input <file>');
  let json;
  if (input === '-') {
    const parts = [];
    for await (const chunk of process.stdin) parts.push(chunk);
    json = Buffer.concat(parts).toString('utf8');
  } else json = await fs.readFile(input, 'utf8');
  if (signal.aborted) throw signal.reason;
  return json.replace(/^\uFEFF/, '');
}

// prepareDirect fills the billing header, the only change direct makes
// (2026-10-23, level none): a missing header is filled as the main thread's,
// a missing field or one the Worker owns gets the native value, and only with
// the Worker's context; without it, as when run by hand, the body goes as it is.
async function prepareDirect(state, outgoing, agent, { directBuild, agentNative }) {
  const policy = validateDirectPolicy(process.env.CCG_DIRECT_POLICY);
  if (!policy || !directBuild) return outgoing;
  state.phase = 'build';
  const { body, rawBody } = outgoing;
  // The request's entrypoint, the one its header will carry, is set the way
  // CC sets it for a request (setEntrypointOnRequests): the native header and
  // User-Agent both read it. A main thread's header names its prompt's turn,
  // as CC's query loop counts it (the terminal entrypoint is a human typing).
  const main = !agent || agent.requestClass === 'main';
  const entrypoint = agentNative.entrypoint(body.system, policy);
  setEntrypointOnRequests(entrypoint);
  const turn = main ? agentNative.turn(messagesOf(body), entrypoint === 'cli') : undefined;
  const sent = await directBuild(rawBody, body, { policy, agentContext: agent?.agentContext, promptId: agent?.promptId, ...turn });
  return sent === rawBody ? outgoing : { ...outgoing, body: parseRequestJSON(sent, 'direct'), rawBody: sent };
}

// prepareBuild has CC build the request from the components.
async function prepareBuild(state, body, headers, signal, resolveAgent, { identityBuild, prefixBuild, apiKey, timeout }) {
  state.phase = 'build';
  const { buildRequest } = await import('./ccgateway-request-build.js');
  const { identityLine, agent, ...built } = await buildRequest(body, headers, signal, resolveAgent);
  const outgoing = { ...built, timeoutMs: timeout };
  // Build always invents metadata; the identity source decides what the
  // upstream request really carries, and a client that sent none gets none.
  if (identityBuild) outgoing.body = identityBuild(outgoing.body, body.parameters?.metadata);
  // OAuth only: upstream requires the header or Claude Code's identity line
  // first; the line follows the request's entrypoint. Direct is a pure
  // passthrough and changes nothing (2026-10-21 decision).
  if (!apiKey && prefixBuild) outgoing.body = prefixBuild(outgoing.body, identityLine);
  return { outgoing, agent };
}

// openClient is CC's own authenticated client (sF) for the client's kind of
// request.
async function openClient(init, apiKey, agent) {
  const querySource = agent?.querySource ?? 'sdk';
  const client = await sF({ ...init, apiKey, ccgatewayAPIKeyOnly: Boolean(apiKey), maxRetries: 0, source: querySource, querySource,
    ...agent?.explicitClass !== undefined && { requestClass: agent.explicitClass }, agentContext: agent?.agentContext ?? Al(),
    ...agent?.promptId !== undefined && { promptId: agent.promptId } });
  if (!(client instanceof _ke)) throw Error('claude request currently supports Anthropic-compatible Messages routes only');
  return client;
}

// readErrorBody reads an HTTP error body whole: into <meta>.error-body when
// there is a metadata path, else in memory; the preview is its first bytes.
async function readErrorBody(state, response, meta, signal) {
  const parts = [], preview = [];
  let size = 0, previewBytes = 0, file;
  try {
    state.phase = 'output';
    if (meta) file = await fs.open(meta + '.error-body', 'wx', 0o600);
    for (let done = false; !done;) {
      state.phase = 'transport';
      const part = await readModelResponse(response, signal, true);
      const bytes = Buffer.from(part.bytes);
      size += bytes.length;
      if (previewBytes < maxErrorBody) {
        const sample = bytes.subarray(0, maxErrorBody - previewBytes);
        preview.push(sample); previewBytes += sample.length;
      }
      state.phase = 'output';
      if (file) await file.writeFile(bytes);
      else parts.push(bytes);
      done = part.done;
    }
  } finally { await file?.close(); }
  return { preview: Buffer.concat(preview).toString('utf8'), size, parts };
}

// writeHttpError reports an HTTP error as a stderr frame, with the body's
// bytes beside it or inside it.
async function writeHttpError(state, response, meta, signal) {
  const { preview, size, parts } = await readErrorBody(state, response, meta, signal);
  const frame = httpErrorFrame(response, preview);
  delete frame.body;
  frame.bodyBytes = size;
  if (meta) frame.bodyFile = true;
  else frame.bodyBase64 = Buffer.concat(parts).toString('base64');
  await write(process.stderr, encodeErrorFrame(frame));
}

// streamResponse copies a successful response to stdout as it arrives.
async function streamResponse(state, response, signal) {
  for (let done = false; !done;) {
    state.phase = 'transport';
    const part = await readModelResponse(response, signal);
    state.phase = 'output';
    if (part.text) { state.responseStarted = true; await write(process.stdout, part.text, signal); }
    done = part.done;
  }
}
