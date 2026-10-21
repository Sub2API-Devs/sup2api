// Copied beside the version-pinned restored modules by patch-cli.cjs.
import fs from 'node:fs/promises';
import { eF, rbe, Zre } from './chunk-gr4a0fky.js';
import { El } from './chunk-0ycjphb5.js';
import { YEr } from './chunk-6dwnw6av.js';
import { checkModelRequest, openModelRequest, readModelResponse, cancelModelResponse } from './ccgateway-model-request.js';
import { writeOutput as write } from './ccgateway-request-output.js';
import { parseRequestOptions, parseRequestJSON, normalizeBetas } from './ccgateway-request-options.js';
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

export async function runRequestCommand(args, { oauthBeta, identityBuild, prefixBuild } = {}) {
  const controller = new AbortController();
  let response, interrupted = false, timedOut = false, outputError, deadline;
  let phase = 'input', responseStarted = false;
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
      phase = 'output';
      await fs.rm(options.meta, { force: true });
      await fs.rm(options.meta + '.error-body', { force: true });
      phase = 'input';
    }
    const apiKey = process.env.ANTHROPIC_API_KEY;
    // Both eF and the SDK constructor read this variable. Never let arbitrary
    // server environment headers override authentication or request betas.
    delete process.env.ANTHROPIC_CUSTOM_HEADERS;
    if (options.input === '-' && process.stdin.isTTY) throw Error('Provide a Messages JSON body on stdin or use --input <file>');
    let json;
    if (options.input === '-') {
      const parts = [];
      for await (const chunk of process.stdin) parts.push(chunk);
      json = Buffer.concat(parts).toString('utf8');
    } else json = await fs.readFile(options.input, 'utf8');
    if (controller.signal.aborted) throw controller.signal.reason;
    const rawBody = json.replace(/^\uFEFF/, '');
    const body = parseRequestJSON(rawBody, options.mode);
    const invalid = checkModelRequest({ body, headers: options.headers, timeoutMs: options.timeoutMs });
    if (invalid) throw Error(invalid);
    const timeout = options.timeoutMs ?? 600000;
    if (!Number.isSafeInteger(timeout) || timeout < 1 || timeout > 2147483647) throw Error('--timeout-ms must be a positive 32-bit integer');
    deadline = setTimeout(() => { timedOut = true; controller.abort(new Error('request timed out')); }, timeout);
    deadline.unref?.();
    let outgoing = { body, rawBody, headers: options.headers, timeoutMs: timeout };
    if (options.mode === 'build') {
      phase = 'build';
      const { buildRequest } = await import('./ccgateway-request-build.js');
      outgoing = { ...await buildRequest(body, options.headers, controller.signal), timeoutMs: timeout };
      // Build always invents metadata; the identity source decides what the
      // upstream request really carries, and a client that sent none gets none.
      if (identityBuild) outgoing.body = identityBuild(outgoing.body, body.parameters?.metadata);
      // OAuth only: upstream requires Claude Code's system line there. Direct
      // is a pure passthrough and changes nothing (2026-10-21 decision).
      if (!apiKey && prefixBuild) outgoing.body = prefixBuild(outgoing.body);
    }
    const betas = normalizeBetas(outgoing.headers?.['anthropic-beta']);
    if (betas.length && !YEr(betas)) throw Error('Experimental betas are disabled by the active CC policy');
    outgoing.headerPolicy = { apiKey, betas, oauthBeta, version: options.headers['anthropic-version'] ?? '2023-06-01' };
    phase = 'transport';
    response = await openModelRequest(outgoing, 'cli-request', controller.signal, async init => {
      const client = await eF({ ...init, apiKey, ccgatewayAPIKeyOnly: Boolean(apiKey), maxRetries: 0, source: 'sdk', querySource: 'sdk', agentContext: El() });
      if (!(client instanceof rbe)) throw Error('claude request currently supports Anthropic-compatible Messages routes only');
      return client;
    }, Zre);
    if (!response.ok) {
      const parts = [], preview = [];
      let size = 0, previewBytes = 0, file;
      try {
        phase = 'output';
        if (options.meta) file = await fs.open(options.meta + '.error-body', 'wx', 0o600);
        for (;;) {
          phase = 'transport';
          const part = await readModelResponse(response.id, 'cli-request', controller.signal, true);
          const bytes = Buffer.from(part.bytes);
          size += bytes.length;
          if (previewBytes < maxErrorBody) {
            const sample = bytes.subarray(0, maxErrorBody - previewBytes);
            preview.push(sample); previewBytes += sample.length;
          }
          phase = 'output';
          if (file) await file.writeFile(bytes);
          else parts.push(bytes);
          if (part.done) break;
        }
      } finally { await file?.close(); }
      const frame = httpErrorFrame(response, Buffer.concat(preview).toString('utf8'));
      delete frame.body;
      frame.bodyBytes = size;
      if (options.meta) frame.bodyFile = true;
      else frame.bodyBase64 = Buffer.concat(parts).toString('base64');
      await write(process.stderr, encodeErrorFrame(frame));
      return 2;
    }
    phase = 'output';
    if (options.meta) await fs.writeFile(options.meta, JSON.stringify({ status: response.status, statusText: response.statusText, headers: response.headers, request: { mode: options.mode, ...response.request } }, null, 2) + '\n');
    for (;;) {
      phase = 'transport';
      const part = await readModelResponse(response.id, 'cli-request', controller.signal);
      phase = 'output';
      if (part.text) { responseStarted = true; await write(process.stdout, part.text, controller.signal); }
      if (part.done) break;
    }
    return 0;
  } catch (error) {
    if (outputError?.code === 'EPIPE') return 0;
    await write(process.stderr, encodeErrorFrame(localErrorFrame(error, { phase, timedOut, interrupted, responseStarted })));
    return interrupted ? 130 : 1;
  } finally {
    clearTimeout(deadline);
    if (response) await cancelModelResponse(response.id, 'cli-request');
    process.off('SIGINT', interrupt);
    process.off('SIGTERM', interrupt);
    process.stdout.off('error', failedOutput);
    if (customHeaders === undefined) delete process.env.ANTHROPIC_CUSTOM_HEADERS;
    else process.env.ANTHROPIC_CUSTOM_HEADERS = customHeaders;
  }
}
