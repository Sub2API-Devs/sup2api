// Copied beside the version-pinned restored modules by patch-cli-2.1.304.cjs.
import fs from 'node:fs/promises';
import { createClient, AnthropicClient, modelFetch, mainAgentContext, betasAllowed, setEntrypointOnRequests } from './native-command.js';
import { checkModelRequest, openModelRequest, readModelResponse, cancelModelResponse, defaultTimeout, requestCapture } from './ccgateway-model-request.js';
import { writeOutput as write } from './ccgateway-request-output.js';
import { parseRequestOptions, parseRequestJSON, parseBuildJSON } from './ccgateway-request-options.js';
import { normalizeBetas, finalBetas } from './ccgateway-request-headers.js';
import { betaOrder } from './ccgateway-request-betas.js';
import { validateDirectPolicy } from './ccgateway-request-policy.js';
import { readRequestAgent, resolveAgentContext, setClientUserAgent } from './ccgateway-request-agent.js';
import { httpErrorFrame, localErrorFrame, encodeErrorFrame, maxErrorBody } from './ccgateway-request-error.js';

const help = `Usage: claude request [--direct | --build] [--betas "a,b"] [file|-] [options]

Use CC's authenticated client to send either a Messages body or build components.
Successful responses (including SSE) use stdout. Errors use a structured stderr line.
HTTP error bytes are stored beside --response-meta as <file>.error-body, or in
the stderr frame as bodyBase64 when no metadata path is supplied.

  --direct                 Send the JSON body as written; only a missing or
                           Worker-owned billing header is filled (default)
  --build                  Assemble components through CC, then send once
  --input <file|->          Read JSON from a file; default: stdin
  --betas <a,b,...>         API beta features (repeatable; comma separated)
  --header <name:value>     anthropic-version or anthropic-beta only
  --timeout-ms <number>     Deadline including response body (default: 600000)
  --response-meta <file>    Save HTTP status and response headers as JSON
  --capture-request <prefix>
                           Record the request as sent upstream in <prefix>.json:
                           URL, headers (secrets redacted), body size and SHA-256
  --capture-body           Also save the sent body bytes as <prefix>.body
                           (requires --capture-request)
  --help                   Show this help

Exit codes: 0 success, 1 transport/input error, 2 HTTP error, 130 interrupted.

Build components: model, systemPrompt, messages, attachments, tools, parameters,
and stream. Custom tools use inputSchema. Generation fields go in parameters.
Authentication uses an explicit ANTHROPIC_API_KEY or CC's native OAuth login.
`;

// runRequestCommand runs `claude request`. natives are the native bindings its
// support module gathers (request-entry.js: the identity lines, the billing
// header, the direct builder and the client's kind of request); without them,
// as in a unit test or when run by hand, the request is CC's native main thread
// and direct forwards the body unchanged.
export async function runRequestCommand(args, natives = {}) {
  const controller = new AbortController();
  const ctx = {
    state: { phase: 'input', responseStarted: false },
    run: { interrupted: false, timedOut: false, outputError: undefined, deadline: undefined, response: undefined },
    controller, signal: controller.signal, options: undefined, apiKey: undefined, natives,
  };
  const customHeaders = process.env.ANTHROPIC_CUSTOM_HEADERS;
  const listeners = installListeners(controller, ctx.run);
  try {
    ctx.options = parseRequestOptions(args);
    if (ctx.options.help) { await write(process.stdout, help); return 0; }
    await clearMeta(ctx);
    ctx.capture = await openCapture(ctx.options);
    ctx.apiKey = process.env.ANTHROPIC_API_KEY;
    // Both createClient and the SDK constructor read this variable. Never let arbitrary
    // server environment headers override authentication or request betas.
    delete process.env.ANTHROPIC_CUSTOM_HEADERS;
    const { outgoing, agent } = await readRequest(ctx);
    ctx.state.phase = 'transport';
    if (ctx.capture) outgoing.capture = ctx.capture;
    ctx.run.response = await openModelRequest(outgoing, ctx.signal, init => openClient(init, ctx.apiKey, agent), modelFetch);
    if (!ctx.run.response.ok) {
      await writeHttpError(ctx, ctx.run.response);
      return 2;
    }
    ctx.state.phase = 'output';
    if (ctx.options.meta) await fs.writeFile(ctx.options.meta, JSON.stringify({ status: ctx.run.response.status, statusText: ctx.run.response.statusText, headers: ctx.run.response.headers, request: { mode: ctx.options.mode, ...ctx.run.response.request } }, null, 2) + '\n');
    await streamResponse(ctx, ctx.run.response);
    return 0;
  } catch (error) {
    if (ctx.run.outputError?.code === 'EPIPE') return 0;
    await write(process.stderr, encodeErrorFrame(localErrorFrame(error, { phase: ctx.state.phase, timedOut: ctx.run.timedOut, interrupted: ctx.run.interrupted, responseStarted: ctx.state.responseStarted })));
    return ctx.run.interrupted ? 130 : 1;
  } finally {
    clearTimeout(ctx.run.deadline);
    if (ctx.run.response) await cancelModelResponse(ctx.run.response);
    // The record of what was sent is written beside the send; the command
    // waits for it, and a failed write never changes the outcome.
    await ctx.capture?.settle();
    removeListeners(listeners);
    if (customHeaders === undefined) delete process.env.ANTHROPIC_CUSTOM_HEADERS;
    else process.env.ANTHROPIC_CUSTOM_HEADERS = customHeaders;
  }
}

// clearMeta runs first so a reused metadata path cannot describe an earlier
// successful request.
async function clearMeta(ctx) {
  if (!ctx.options.meta) return;
  ctx.state.phase = 'output';
  await fs.rm(ctx.options.meta, { force: true });
  await fs.rm(ctx.options.meta + '.error-body', { force: true });
  ctx.state.phase = 'input';
}

// openCapture is the request's record of what it sends (--capture-request),
// or undefined. A reused prefix cannot describe an earlier request: its files
// are removed first, and a failure to remove them is the record's, not the
// request's (the record never fails a request).
async function openCapture(options) {
  if (options.capture === undefined) return undefined;
  for (const suffix of ['.json', '.body']) await fs.rm(options.capture + suffix, { force: true }).catch(() => {});
  return requestCapture({ prefix: options.capture, body: options.captureBody === true, mode: options.mode });
}

// installListeners is the command's interruption, its output-error and its
// deadline: an interrupt or a failed stdout aborts the exchange, a deadline
// also marks the request as timed out. removeListeners takes them all off.
function installListeners(controller, run) {
  const interrupt = () => { run.interrupted = true; controller.abort(new Error('request interrupted')); process.stdin.destroy(); };
  const failedOutput = error => { run.outputError = error; controller.abort(error); };
  process.on('SIGINT', interrupt);
  process.on('SIGTERM', interrupt);
  process.stdout.on('error', failedOutput);
  return { interrupt, failedOutput };
}

function removeListeners({ interrupt, failedOutput }) {
  process.off('SIGINT', interrupt);
  process.off('SIGTERM', interrupt);
  process.stdout.off('error', failedOutput);
}

// readRequest is the body as it arrived and the request to send, and starts
// the overall deadline. The input is checked here, once: the transport sends
// what it is given (openModelRequest). apiKey was captured before the custom
// headers were removed (readInput may block on stdin).
async function readRequest(ctx) {
  const rawBody = await readInput(ctx.options.input, ctx.signal);
  // Build keeps the client's numbers as written (request-options.js); the sent
  // body gets them back at the fetch boundary (model-request.js).
  const { body, restoreNumbers } = ctx.options.mode === 'build' ? parseBuildJSON(rawBody) : { body: parseRequestJSON(rawBody, 'direct') };
  const invalid = checkModelRequest({ body, headers: ctx.options.headers, timeoutMs: ctx.options.timeoutMs });
  if (invalid) throw Error(invalid);
  const timeout = ctx.options.timeoutMs ?? defaultTimeout;
  ctx.run.deadline = setTimeout(() => { ctx.run.timedOut = true; ctx.controller.abort(new Error('request timed out')); }, timeout);
  ctx.run.deadline.unref?.();
  const prepared = await prepareOutgoing(ctx, { body, rawBody, timeout });
  if (restoreNumbers) prepared.outgoing.restoreNumbers = restoreNumbers;
  return prepared;
}

const messagesOf = body => Array.isArray(body.messages) ? body.messages : [];

// prepareOutgoing is the request to send, as the mode makes it, the client's
// kind of request (request-agent.js) it is sent as, and its betas.
async function prepareOutgoing(ctx, incoming) {
  const { options, natives } = ctx;
  const { oauthBeta, agentNative } = natives;
  const resolveAgent = agentResolver(agentNative);
  let outgoing = { body: incoming.body, rawBody: incoming.rawBody, headers: options.headers, timeoutMs: incoming.timeout };
  let agent, clientBetas, addedBetas = [];
  if (options.mode === 'direct') {
    agent = resolveAgent?.({ billing: agentNative.requestBilling(incoming.body.system), prompt: agentNative.prompt(messagesOf(incoming.body)) });
    outgoing = await prepareDirect(ctx, outgoing, agent);
    clientBetas = normalizeBetas(options.headers['anthropic-beta']);
  } else ({ outgoing, agent, clientBetas, addedBetas } = await prepareBuild(ctx, incoming.body, resolveAgent));
  // Build is sent through CC's own beta Messages call; direct as raw bytes.
  outgoing.nativeCreate = options.mode === 'build';
  if (agent?.headers) outgoing.headers = { ...outgoing.headers, ...agent.headers };
  // A request sent with the client's own header keeps the client's User-Agent
  // (build reads the client's system from its components).
  setClientUserAgent(agent, agentNative?.leadingBilling(options.mode === 'build' ? incoming.body.systemPrompt : incoming.body.system), agentNative?.leadingBilling(outgoing.body.system));
  const betas = requestBetas(outgoing.body?.model, clientBetas, [...addedBetas, ...(ctx.apiKey ? [] : [oauthBeta])]);
  if (betas.length && !betasAllowed(betas)) throw Error('Experimental betas are disabled by the active CC policy');
  outgoing.headerPolicy = { apiKey: ctx.apiKey, betas, oauthBeta, version: options.headers['anthropic-version'] ?? '2023-06-01' };
  return { outgoing, agent };
}

// requestBetas is the beta list once: the client's betas keep the client's
// order, and the ones the request adds (build's per-request betas, a login's)
// go where Claude Code writes them. The native order is computed only when
// something is added; without it the beta is appended, as v24 did.
function requestBetas(model, client, additions) {
  const missing = [...new Set(additions.filter(beta => beta && !client.includes(beta)))];
  return missing.length ? finalBetas(client, missing, betaOrder(model)) : [...client];
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
async function prepareDirect(ctx, outgoing, agent) {
  const { agentNative, directBuild } = ctx.natives;
  const policy = validateDirectPolicy(process.env.CCG_DIRECT_POLICY);
  if (!policy || !agentNative || !directBuild) return outgoing;
  ctx.state.phase = 'build';
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

// prepareBuild has CC build the request from the components. It returns the
// client's betas and the ones the build adds, so the command places them once.
// The identity line choice is build's (its body already carries the line);
// it is not part of the request sent.
async function prepareBuild(ctx, body, resolveAgent) {
  ctx.state.phase = 'build';
  const { buildRequest } = await import('./ccgateway-request-build.js');
  const { identityLine: _line, agent, clientBetas, addedBetas, ...built } = await buildRequest(body, ctx.options.headers, ctx.signal, resolveAgent, { apiKey: Boolean(ctx.apiKey) });
  const outgoing = { ...built, timeoutMs: ctx.options.timeoutMs ?? defaultTimeout };
  // Build always invents metadata; the identity source decides what the
  // upstream request really carries, and a client that sent none gets none.
  if (ctx.natives.identityBuild) outgoing.body = ctx.natives.identityBuild(outgoing.body, body.parameters?.metadata);
  return { outgoing, agent, clientBetas, addedBetas };
}

// openClient is CC's own authenticated client (createClient) for the client's kind of
// request.
async function openClient(init, apiKey, agent) {
  const querySource = agent?.querySource ?? 'sdk';
  const client = await createClient({ ...init, apiKey, ccgatewayAPIKeyOnly: Boolean(apiKey), maxRetries: 0, source: querySource, querySource,
    ...agent?.explicitClass !== undefined && { requestClass: agent.explicitClass }, agentContext: agent?.agentContext ?? mainAgentContext(),
    ...agent?.promptId !== undefined && { promptId: agent.promptId } });
  if (!(client instanceof AnthropicClient)) throw Error('claude request currently supports Anthropic-compatible Messages routes only');
  return client;
}

// readErrorBody reads an HTTP error body whole: into <meta>.error-body when
// there is a metadata path, else in memory; the preview is its first bytes.
async function readErrorBody(ctx, response, meta) {
  const parts = [], preview = [];
  let size = 0, previewBytes = 0, file;
  try {
    ctx.state.phase = 'output';
    if (meta) file = await fs.open(meta + '.error-body', 'wx', 0o600);
    for (let done = false; !done;) {
      ctx.state.phase = 'transport';
      const part = await readModelResponse(response, ctx.signal, true);
      const bytes = Buffer.from(part.bytes);
      size += bytes.length;
      if (previewBytes < maxErrorBody) {
        const sample = bytes.subarray(0, maxErrorBody - previewBytes);
        preview.push(sample); previewBytes += sample.length;
      }
      ctx.state.phase = 'output';
      if (file) await file.writeFile(bytes);
      else parts.push(bytes);
      done = part.done;
    }
  } finally { await file?.close(); }
  return { preview: Buffer.concat(preview).toString('utf8'), size, parts };
}

// writeHttpError reports an HTTP error as a stderr frame, with the body's
// bytes beside it or inside it.
async function writeHttpError(ctx, response) {
  const { preview, size, parts } = await readErrorBody(ctx, response, ctx.options.meta);
  const frame = httpErrorFrame(response, preview);
  delete frame.body;
  frame.bodyBytes = size;
  if (ctx.options.meta) frame.bodyFile = true;
  else frame.bodyBase64 = Buffer.concat(parts).toString('base64');
  await write(process.stderr, encodeErrorFrame(frame));
}

// streamResponse copies a successful response to stdout as it arrives.
async function streamResponse(ctx, response) {
  for (let done = false; !done;) {
    ctx.state.phase = 'transport';
    const part = await readModelResponse(response, ctx.signal);
    ctx.state.phase = 'output';
    if (part.text) { ctx.state.responseStarted = true; await write(process.stdout, part.text, ctx.signal); }
    done = part.done;
  }
}
