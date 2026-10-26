import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { installSupport, linkNatives } from './support.mjs';

// request_capture_v1 through the command: the request command with the real
// transport (model-request.js), a CC client stand-in that hands the fetch
// boundary its final headers, and a transport stand-in (mle) that keeps the
// bytes it was given. The record must be exactly what the transport got.
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const recordKeys = ['schema', 'mode', 'attempts', 'sent_at', 'method', 'url', 'headers', 'body_encoding', 'body_bytes', 'body_sha256', 'content_sha256', 'model', 'stream'];
const trimmed = bytes => { let end = bytes.length; while (end > 0 && ' \t\r\n'.includes(String.fromCharCode(bytes[end - 1]))) end--; return bytes.subarray(0, end); };
const secrets = new Set(['authorization', 'proxy-authorization', 'x-api-key', 'cookie']);

test('the command records what the transport sent, for direct and build', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ccg-request-capture-'));
  try {
    await fs.writeFile(path.join(dir, 'package.json'), '{"type":"module"}');
    await installSupport(dir, ['request-command', 'model-request', 'request-options', 'request-headers', 'request-output', 'request-error', 'request-policy', 'request-agent']);
    for (const [name, code] of Object.entries({
      // CC's client: the SDK's two routes, each handing the fetch boundary the
      // headers CC writes (authentication included) and the serialized body.
      'stub-transport.js': `import fs from 'node:fs';
        export class AnthropicClient {
          constructor(init) { this.init = init; }
          post(route, request) { return { asResponse: () => this.send(route, request, request.body) }; }
          get beta() { return { messages: { create: (body, request) => ({ asResponse: () => this.send('/v1/messages?beta=true', request, JSON.stringify(body)) }) } }; }
          send(route, request, body) {
            const headers = new Headers(request.headers);
            if (process.env.ANTHROPIC_API_KEY) headers.set('X-Api-Key', process.env.ANTHROPIC_API_KEY); else headers.set('Authorization', 'Bearer native-secret');
            headers.set('Cookie', 'c=secret-cookie');
            headers.set('X-Claude-Code-Session-Id', 'session-fixture');
            headers.set('User-Agent', 'claude-cli/2.1.304 (external, sdk-cli)');
            return this.init.fetchOverride('https://api.anthropic.com' + route, { method: 'POST', headers, body, signal: request.signal });
          }
        }
        export const createClient = async init => new AnthropicClient(init);
        // The transport keeps exactly what it was handed.
        export const modelFetch = async (url, init) => {
          fs.writeFileSync('wire.body', Buffer.from(init.body));
          fs.writeFileSync('wire.json', JSON.stringify({ url: String(url), method: init.method, headers: [...new Headers(init.headers)] }));
          return new Response('{"ok":true}', { status: 200, headers: { 'content-type': 'application/json' } });
        };`,
      'stub-context.js': 'export const mainAgentContext=()=>({});export const modelBetas=()=>[];',
      'stub-betas.js': 'export const betasAllowed=()=>true;',
      'stub-session.js': 'export const getRootSession=()=>({});export const setEntrypointOnRequests=()=>{};',
      // Build assembles a body around the client's components; the kept number
      // goes back at the fetch boundary.
      'ccgateway-request-build.js': "export const buildRequest=async c=>({body:{model:c.model,max_tokens:c.parameters.max_tokens,messages:c.messages,stream:c.stream},headers:{},identityLine:{line:'none'},clientBetas:[],addedBetas:['fixture-added-2026-01-01']});",
      'run.mjs': `import {runRequestCommand} from './ccgateway-request-command.js';
        process.exitCode=await runRequestCommand(process.argv.slice(2));`,
    })) await fs.writeFile(path.join(dir, name), code);
    await linkNatives(dir);

    const run = (args, input, env = {}) => new Promise((resolve, reject) => {
      const childEnv = { ...process.env, ...env };
      for (const name of ['CCG_DIRECT_POLICY', 'CCG_REQUEST_AGENT', 'CCG_REQUEST_IDENTITY']) delete childEnv[name];
      if (!env.ANTHROPIC_API_KEY) delete childEnv.ANTHROPIC_API_KEY;
      const child = spawn(process.execPath, ['run.mjs', ...args], { cwd: dir, env: childEnv });
      const out = [], err = [];
      child.stdout.on('data', b => out.push(b)); child.stderr.on('data', b => err.push(b));
      child.on('error', reject);
      child.on('close', code => resolve({ code, stdout: Buffer.concat(out).toString(), stderr: Buffer.concat(err).toString() }));
      child.stdin.end(input);
    });
    const file = name => path.join(dir, name);
    const exists = name => fs.access(file(name)).then(() => true, () => false);
    const clean = async () => { for (const name of await fs.readdir(dir)) if (/^(wire|sent)\./.test(name)) await fs.rm(file(name)); };

    // checkRecord compares the record with what the transport was handed.
    const checkRecord = async (mode, expect) => {
      const record = JSON.parse(await fs.readFile(file('sent.json'), 'utf8'));
      const wire = JSON.parse(await fs.readFile(file('wire.json'), 'utf8'));
      const bytes = await fs.readFile(file('wire.body'));
      assert.deepEqual(Object.keys(record), recordKeys);
      assert.equal(record.schema, 1);
      assert.equal(record.mode, mode);
      assert.equal(record.attempts, 1);
      assert.equal(new Date(record.sent_at).toISOString(), record.sent_at);
      assert.equal(record.method, wire.method);
      assert.equal(record.url, wire.url);
      assert.deepEqual(record.headers, Object.fromEntries(wire.headers.map(([name, value]) => [name, secrets.has(name) ? '[REDACTED]' : value])));
      assert.deepEqual(Object.keys(record.headers), Object.keys(record.headers).toSorted());
      assert.equal(record.body_encoding, 'identity');
      assert.equal(record.body_bytes, bytes.length);
      assert.equal(record.body_sha256, sha256(bytes));
      assert.equal(record.content_sha256, sha256(trimmed(bytes)));
      assert.equal(record.model, expect.model);
      assert.equal(record.stream, expect.stream);
      assert.equal(record.headers['x-claude-code-session-id'], 'session-fixture');
      const text = await fs.readFile(file('sent.json'), 'utf8');
      for (const secret of ['native-secret', 'secret-cookie', 'key-secret']) assert.equal(text.includes(secret), false, secret);
      return { record, bytes };
    };

    // Direct, OAuth: the body goes as the client wrote it, byte for byte.
    const direct = '{ "model":"fixture-direct", "stream":true, "n":9007199254740993, "messages":[{"role":"user","content":"中文 🙂"}] }';
    let result = await run(['--direct', '--capture-request', 'sent', '--capture-body'], direct);
    assert.equal(result.code, 0, result.stderr);
    assert.equal(result.stdout, '{"ok":true}');
    let { record, bytes } = await checkRecord('direct', { model: 'fixture-direct', stream: true });
    assert.deepEqual(await fs.readFile(file('sent.body')), bytes);
    assert.equal(bytes.toString('utf8'), direct);
    assert.equal(record.headers.authorization, '[REDACTED]');
    assert.equal(record.headers.cookie, '[REDACTED]');
    // Unpatched, direct's endpoint is empty (patch-cli-2.1.304.cjs fills it).
    assert.equal(record.url, 'https://api.anthropic.com');

    // The padding CC's transport adds after a large body is not content.
    await clean();
    result = await run(['--direct', '--capture-request', 'sent'], direct + '\n \t ');
    assert.equal(result.code, 0, result.stderr);
    ({ record } = await checkRecord('direct', { model: 'fixture-direct', stream: true }));
    assert.notEqual(record.body_sha256, record.content_sha256);
    assert.equal(record.content_sha256, sha256(Buffer.from(direct)));

    // Build, API key: the assembled body with the client's number restored.
    await clean();
    const build = '{"model":"fixture-build","parameters":{"max_tokens":1.0},"messages":[{"role":"user","content":"hi"}]}';
    result = await run(['--build', '--capture-request', 'sent', '--capture-body'], build, { ANTHROPIC_API_KEY: 'key-secret' });
    assert.equal(result.code, 0, result.stderr);
    ({ record, bytes } = await checkRecord('build', { model: 'fixture-build', stream: false }));
    assert.deepEqual(await fs.readFile(file('sent.body')), bytes);
    assert.match(bytes.toString('utf8'), /"max_tokens":1\.0,/, 'the record is the restored body that went out');
    assert.equal(record.headers['x-api-key'], '[REDACTED]');
    assert.equal(record.headers['anthropic-beta'], 'fixture-added-2026-01-01');

    // Without --capture-body there is a record and no body file; a body file
    // left by an earlier request under the same prefix is gone.
    await clean();
    await fs.writeFile(file('sent.body'), 'stale');
    result = await run(['--direct', '--capture-request', 'sent'], direct);
    assert.equal(result.code, 0, result.stderr);
    await checkRecord('direct', { model: 'fixture-direct', stream: true });
    assert.equal(await exists('sent.body'), false);

    // Without the option nothing is recorded.
    await clean();
    result = await run(['--direct'], direct);
    assert.equal(result.code, 0, result.stderr);
    assert.equal(await exists('wire.body'), true);
    assert.deepEqual((await fs.readdir(dir)).filter(name => name.startsWith('sent')), []);

    // A record that cannot be written changes nothing about the request.
    await clean();
    result = await run(['--build', '--capture-request', path.join('missing', 'sent'), '--capture-body'], build);
    assert.equal(result.code, 0, result.stderr);
    assert.equal(result.stdout, '{"ok":true}');
    assert.equal(result.stderr, '');
    assert.equal(await exists('wire.body'), true);
    assert.equal(await exists('missing'), false);

    // The body file alone is refused before anything is sent.
    await clean();
    result = await run(['--direct', '--capture-body'], direct);
    assert.equal(result.code, 1);
    assert.match(result.stderr, /--capture-body requires --capture-request/);
    assert.equal(await exists('wire.body'), false);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});
