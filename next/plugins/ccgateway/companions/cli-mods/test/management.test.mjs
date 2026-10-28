import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { installSupport, linkNatives } from './support.mjs';
import { parseManagementOptions } from '../management-options.js';
import { checkManagementRoute } from '../management-route.js';
import { readManagementCredentials, credentialsPath } from '../management-credentials.js';
import { managementBase, managementProxy, managementTarget } from '../management-target.js';
import { ManagementInputError } from '../management-error.js';

test('management options default and parse the documented flags', () => {
  const options = parseManagementOptions(['--path', '/v1/files?limit=2', '--output', 'out.bin', '--meta', 'meta.json']);
  assert.equal(options.method, 'GET');
  assert.equal(options.timeoutMs, 30000);
  assert.equal(options.maxBytes, 0);
  assert.equal(options.body, undefined);
  assert.deepEqual(options.headers, {});
  const full = parseManagementOptions(['--path', '/v1/files', '--method', 'post', '--header', 'Content-Type: multipart/form-data; boundary=x',
    '--header', 'Authorization: Bearer caller', '--header', 'X-API-Key: caller', '--body', 'body.bin', '--output', 'o', '--meta', 'm', '--timeout-ms', '5000', '--max-bytes', '1048576']);
  assert.equal(full.method, 'POST');
  assert.equal(full.timeoutMs, 5000);
  assert.equal(full.maxBytes, 1048576);
  assert.equal(full.body, 'body.bin');
  assert.deepEqual(full.headers, { 'content-type': 'multipart/form-data; boundary=x' });
});

test('management options refuse what the contract does not define', () => {
  const base = ['--path', '/v1/files', '--output', 'o', '--meta', 'm'];
  assert.throws(() => parseManagementOptions([]), /--path is required/);
  assert.throws(() => parseManagementOptions(['--path', 'v1/files', '--output', 'o', '--meta', 'm']), /must start with \//);
  assert.throws(() => parseManagementOptions([...base, '--method', 'PATCH']), /--method must be one of/);
  assert.throws(() => parseManagementOptions([...base, '--timeout-ms', '0']), /positive integer/);
  assert.throws(() => parseManagementOptions([...base, '--timeout-ms', '1e3']), /positive integer/);
  assert.throws(() => parseManagementOptions([...base, '--max-bytes', '-1']), /non-negative integer/);
  assert.throws(() => parseManagementOptions([...base, '--max-bytes', '1.5']), /non-negative integer/);
  assert.throws(() => parseManagementOptions([...base, '--nope']), /Unknown management option/);
  assert.throws(() => parseManagementOptions(['--path']), /Missing value/);
  assert.throws(() => parseManagementOptions(['--path', '/v1/files', '--path', '/v1/skills', '--output', 'o', '--meta', 'm']), /once/);
  assert.throws(() => parseManagementOptions(['--path', '/v1/files', '--meta', 'm']), /--output is required/);
  assert.throws(() => parseManagementOptions(['--path', '/v1/files', '--header', 'bad name:x', '--output', 'o', '--meta', 'm']), /not an HTTP header name/);
  assert.throws(() => parseManagementOptions(['--path', '/v1/files', '--header', 'x:y\r\nz:1', '--output', 'o', '--meta', 'm']), /control characters/);
  assert.throws(() => parseManagementOptions(['--path', '/v1/files', '--header', 'novalue', '--output', 'o', '--meta', 'm']), /name:value/);
});

test('the allowlist admits the Worker resource operations and the two oauth reads', () => {
  const accept = (path, method = 'GET', body = false) => checkManagementRoute(path, method, body);
  assert.equal(accept('/v1/files').upload, false);
  assert.equal(accept('/v1/files', 'POST', true).upload, true);
  assert.equal(accept('/v1/files?limit=5&ids[]=a&ids[]=b').path, '/v1/files');
  assert.equal(accept('/v1/files/file_01abc/content').accept, 'application/binary');
  assert.equal(accept('/v1/skills/skill_1', 'DELETE').path, '/v1/skills/skill_1');
  assert.equal(accept('/v1/skills?source=user&limit=1').query, 'source=user&limit=1');
  assert.equal(accept('/v1/skills/s1/versions?beta=true').path, '/v1/skills/s1/versions');
  assert.equal(accept('/v1/skills/s1/versions', 'POST', true).upload, true);
  assert.equal(accept('/v1/skills/s1/versions/v2', 'DELETE').path, '/v1/skills/s1/versions/v2');
  assert.equal(accept('/v1/skills/s1/versions/v2/content').path, '/v1/skills/s1/versions/v2/content');
  assert.equal(accept('/api/oauth/usage').query, '');
  assert.equal(accept('/api/oauth/usage?at_wall=1&skip_spend=1').query, 'at_wall=1&skip_spend=1');
  assert.equal(accept('/api/oauth/usage?cedar_ember=1&skip_spend=1').path, '/api/oauth/usage');
  assert.equal(accept('/api/oauth/usage?starry_waterfall=cli_menu&skip_spend=1').path, '/api/oauth/usage');
  assert.equal(accept('/api/oauth/profile').query, '');
  assert.equal(accept('/api/oauth/profile?account_uuid=0a1b2c3d-0000-4abc-8def-0123456789ab').path, '/api/oauth/profile');
});

test('the allowlist refuses anything else by exit-1 input error', () => {
  const reject = (path, method = 'GET', body = false) => assert.throws(() => checkManagementRoute(path, method, body), ManagementInputError);
  reject('/v1/messages', 'POST', true);
  reject('/v1/files', 'PUT', true);
  reject('/v1/files', 'POST');
  reject('/v1/files', 'GET', true);
  reject('/v1/files?beta=true');
  reject('/v1/skills?page=1&unknown=1');
  reject('/v1/files/../etc/passwd');
  reject('/v1/files/%2e%2e');
  reject('/v1/files#fragment');
  reject('/api/oauth/usage?surface=cli_menu');
  reject('/api/oauth/usage', 'POST', true);
  reject('/api/oauth/profile', 'POST', true);
  reject('/api/oauth/profile?account_uuid=nope');
  reject('/api/oauth/profile?account_uuid=0a1b2c3d-0000-4abc-8def-0123456789ab&x=1');
  reject('/v1/files?limit=%zz');
});

test('credentials come from Claude Code itself, never from the caller', () => {
  assert.deepEqual(readManagementCredentials({ ANTHROPIC_API_KEY: ' sk-ant-api ' }), { kind: 'apiKey', token: 'sk-ant-api' });
  assert.deepEqual(readManagementCredentials({ CLAUDE_CODE_OAUTH_TOKEN: 'headless' }), { kind: 'oauth', token: 'headless' });
  const storable = { CLAUDE_SECURESTORAGE_CONFIG_DIR: '/work/config' };
  assert.equal(credentialsPath(storable), path.join('/work/config', '.credentials.json'));
  const read = file => {
    assert.equal(file, path.join('/work/config', '.credentials.json'));
    return JSON.stringify({ claudeAiOauth: { accessToken: 'stored' } });
  };
  assert.deepEqual(readManagementCredentials(storable, read), { kind: 'oauth', token: 'stored' });
  assert.equal(credentialsPath({ CLAUDE_CONFIG_DIR: '/cfg' }), path.join('/cfg', '.credentials.json'));
  const empty = credentialsPath({ CLAUDE_SECURESTORAGE_CONFIG_DIR: '', CLAUDE_CONFIG_DIR: '/cfg', HOME: '/home/u' });
  assert.equal(empty, path.join('/home/u', '.claude', '.credentials.json'));
  assert.throws(() => readManagementCredentials({}, () => { throw Error('ENOENT'); }), error => error instanceof ManagementInputError && error.code === 'not_logged_in');
  assert.throws(() => readManagementCredentials({}, () => '{"claudeAiOauth":{"accessToken":"bad token"}}'), /not usable/);
  assert.throws(() => readManagementCredentials({}, () => 'not json'), /not readable/);
});

test('the target is a first-party HTTPS origin unless the account is an API key', () => {
  const apiKey = { kind: 'apiKey', token: 'k' }, oauth = { kind: 'oauth', token: 't' };
  const route = { path: '/v1/files', query: '' };
  assert.equal(managementTarget(route, apiKey, {}, undefined), 'https://api.anthropic.com/v1/files');
  assert.equal(managementTarget(route, apiKey, { ANTHROPIC_BASE_URL: 'https://gateway.example/base/' }, undefined), 'https://gateway.example/base/v1/files');
  assert.equal(managementTarget({ path: '/api/oauth/usage', query: 'at_wall=1&skip_spend=1' }, oauth, {}, undefined),
    'https://api.anthropic.com/api/oauth/usage?at_wall=1&skip_spend=1');
  assert.throws(() => managementTarget(route, oauth, { ANTHROPIC_BASE_URL: 'https://gateway.example' }, undefined), /first-party/);
  assert.throws(() => managementTarget(route, apiKey, { ANTHROPIC_BASE_URL: 'http://api.anthropic.com' }, undefined), /usable HTTPS/);
  assert.throws(() => managementTarget(route, apiKey, { ANTHROPIC_BASE_URL: 'https://api.anthropic.com/x?y=1' }, undefined), /usable HTTPS/);
  assert.throws(() => managementBase({ ANTHROPIC_BASE_URL: 'not a url' }), /not a valid URL/);
});

test('the egress proxy is HTTPS_PROXY only, and an ambiguous configuration is refused', () => {
  assert.equal(managementProxy({}), undefined);
  assert.equal(managementProxy({ HTTPS_PROXY: 'http://p.example:3128' }), 'http://p.example:3128');
  assert.equal(managementProxy({ https_proxy: 'socks5://p.example:1080' }), 'socks5://p.example:1080');
  assert.throws(() => managementProxy({ HTTPS_PROXY: 'http://a.example', https_proxy: 'http://b.example' }), /conflicting/);
  assert.throws(() => managementProxy({ ALL_PROXY: 'socks5://p.example' }), /ALL_PROXY/);
  assert.throws(() => managementProxy({ HTTPS_PROXY: 'http://p.example/path' }), /invalid management HTTPS proxy/);
  assert.throws(() => managementProxy({ HTTPS_PROXY: 'ftp://p.example' }), /invalid management HTTPS proxy/);
});

// The command itself, run the way the patched CLI runs it: support modules
// installed by name, the native User-Agent bound to a stub, and a local origin
// in deps (the production entry passes none).
const support = ['management-command', 'management-options', 'management-route', 'management-target', 'management-credentials', 'management-error', 'management-natives', 'request-error'];

// The child must not inherit a proxy the test did not configure.
function cleanEnvironment(env) {
  for (const name of ['HTTPS_PROXY', 'https_proxy', 'ALL_PROXY', 'all_proxy', 'HTTP_PROXY', 'http_proxy']) delete env[name];
  return env;
}

async function startServer() {
  const seen = [];
  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      const record = { method: req.method, url: req.url, headers: req.headers, body: Buffer.concat(chunks) };
      seen.push(record);
      if (req.url === '/v1/skills/slow') return; // never answers: the deadline does
      if (req.url === '/v1/files' && req.method === 'POST') {
        res.writeHead(201, { 'Content-Type': 'application/octet-stream', 'X-Request-Id': 'req-bin' });
        return res.end(Buffer.concat([Buffer.from([0x00, 0xff]), Buffer.concat(chunks)]));
      }
      if (req.url === '/v1/files/big/content') {
        const chunk = Buffer.alloc(100 * 1024, 0x41);
        res.writeHead(200, { 'Content-Type': 'application/binary' });
        res.write(chunk);
        setTimeout(() => {
          res.write(chunk);
          setTimeout(() => res.end(chunk), 5);
        }, 5);
        return;
      }
      if (req.url === '/v1/files/stall/content') {
        res.writeHead(200, { 'Content-Type': 'application/binary' });
        res.write(Buffer.alloc(1024, 0x42));
        return; // headers and one chunk, then nothing: the body deadline ends it
      }
      if (req.url.startsWith('/v1/files/') && req.url.endsWith('/content')) {
        res.writeHead(200, { 'Content-Type': 'application/binary' });
        return res.end(Buffer.from([0x00, 0x80, 0xff]));
      }
      if (req.url.startsWith('/api/oauth/usage')) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end('{"limits":[]}');
      }
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('upstream said no');
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  return { server, origin, seen };
}

function runChild(dir, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['run.mjs', ...args], { cwd: dir, env });
    const out = [], err = [];
    child.stdout.on('data', chunk => out.push(chunk));
    child.stderr.on('data', chunk => err.push(chunk));
    child.on('error', reject);
    child.on('close', code => resolve({ code, stdout: Buffer.concat(out), stderr: Buffer.concat(err).toString() }));
  });
}

test('the command sends, writes bytes and meta, and exits 0 for any HTTP status', async () => {
  const { server, origin, seen } = await startServer();
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ccg-mgmt-'));
  try {
    await fs.writeFile(path.join(dir, 'package.json'), '{"type":"module"}');
    await installSupport(dir, support);
    await fs.writeFile(path.join(dir, 'stub-management.js'), "export const userAgent=()=>'claude-code/2.1.310';\n");
    await fs.writeFile(path.join(dir, 'run.mjs'), `import {runManagementCommand} from './ccgateway-management-command.js';
      process.exit(await runManagementCommand(process.argv.slice(2), {baseUrl: process.env.CCG_TEST_BASE}));`);
    await linkNatives(dir);
    const config = path.join(dir, 'config');
    await fs.mkdir(config);
    await fs.writeFile(path.join(config, '.credentials.json'), JSON.stringify({ claudeAiOauth: { accessToken: 'stored-token' } }));
    const env = cleanEnvironment({ ...process.env, CCG_TEST_BASE: origin, CLAUDE_CONFIG_DIR: config });
    delete env.CLAUDE_SECURESTORAGE_CONFIG_DIR; delete env.ANTHROPIC_API_KEY; delete env.CLAUDE_CODE_OAUTH_TOKEN;
    const call = args => runChild(dir, args, env);

    const usage = await call(['--path', '/api/oauth/usage?at_wall=1&skip_spend=1', '--output', 'usage.json', '--meta', 'usage.meta']);
    assert.equal(usage.code, 0, usage.stderr);
    assert.equal(usage.stderr, '');
    assert.equal(await fs.readFile(path.join(dir, 'usage.json'), 'utf8'), '{"limits":[]}');
    const meta = JSON.parse(await fs.readFile(path.join(dir, 'usage.meta'), 'utf8'));
    assert.equal(meta.status, 200);
    assert.equal(meta.headers['content-type'], 'application/json');
    assert.ok(Object.keys(meta.headers).every(name => name === name.toLowerCase()));
    const sent = seen.at(-1);
    assert.equal(sent.method, 'GET');
    assert.equal(sent.url, '/api/oauth/usage?at_wall=1&skip_spend=1');
    assert.equal(sent.headers.authorization, 'Bearer stored-token');
    assert.equal(sent.headers['x-api-key'], undefined);
    assert.equal(sent.headers['user-agent'], 'claude-code/2.1.310');
    assert.equal(sent.headers.accept, 'application/json, text/plain, */*');
    assert.equal(sent.headers['anthropic-beta'], undefined, 'usage does not carry a beta');

    // A binary upload: the caller's own auth headers are ignored, the body is
    // sent byte for byte, and the binary answer lands unmodified.
    const payload = Buffer.concat([Buffer.from([0, 1, 2, 0xff, 0xfe]), Buffer.from('--boundary--\r\n')]);
    await fs.writeFile(path.join(dir, 'payload.bin'), payload);
    const upload = await call(['--path', '/v1/files', '--method', 'POST', '--body', 'payload.bin',
      '--header', 'Content-Type: multipart/form-data; boundary=x', '--header', 'Authorization: Bearer caller', '--header', 'x-api-key: caller',
      '--output', 'upload.bin', '--meta', 'upload.meta']);
    assert.equal(upload.code, 0, upload.stderr);
    assert.deepEqual(await fs.readFile(path.join(dir, 'upload.bin')), Buffer.concat([Buffer.from([0, 0xff]), payload]));
    assert.equal(JSON.parse(await fs.readFile(path.join(dir, 'upload.meta'), 'utf8')).status, 201);
    const uploaded = seen.at(-1);
    assert.equal(uploaded.headers.authorization, 'Bearer stored-token');
    assert.equal(uploaded.headers['x-api-key'], undefined);
    assert.equal(uploaded.headers['content-type'], 'multipart/form-data; boundary=x');
    assert.deepEqual(uploaded.body, payload);

    // A download asks for binary bytes by name, as Claude Code's own call does.
    const download = await call(['--path', '/v1/files/f_1/content', '--output', 'file.bin', '--meta', 'file.meta']);
    assert.equal(download.code, 0, download.stderr);
    assert.deepEqual(await fs.readFile(path.join(dir, 'file.bin')), Buffer.from([0x00, 0x80, 0xff]));
    assert.equal(seen.at(-1).headers.accept, 'application/binary');

    // A large answer is streamed to disk chunk by chunk; --max-bytes 0 means
    // no limit, and a size equal to the answer is allowed.
    const big = await call(['--path', '/v1/files/big/content', '--output', 'big.bin', '--meta', 'big.meta', '--max-bytes', '0']);
    assert.equal(big.code, 0, big.stderr);
    const size = (await fs.stat(path.join(dir, 'big.bin'))).size;
    assert.equal(size, 300 * 1024);
    const exact = await call(['--path', '/v1/files/big/content', '--output', 'exact.bin', '--meta', 'exact.meta', '--max-bytes', String(size)]);
    assert.equal(exact.code, 0, exact.stderr);
    assert.equal((await fs.stat(path.join(dir, 'exact.bin'))).size, size);

    // Past the limit the command stops, removes the partial file and exits 3.
    const over = await call(['--path', '/v1/files/big/content', '--output', 'over.bin', '--meta', 'over.meta', '--max-bytes', '1024']);
    assert.equal(over.code, 3, over.stderr);
    const overFrame = JSON.parse(over.stderr.slice('CCG_REQUEST_ERROR '.length));
    assert.equal(overFrame.source, 'response');
    assert.equal(overFrame.error.code, 'response_too_large');
    assert.equal(await fs.readFile(path.join(dir, 'over.bin'), 'utf8').then(() => 'present', () => 'gone'), 'gone');
    assert.equal(await fs.readFile(path.join(dir, 'over.meta'), 'utf8').then(() => 'present', () => 'gone'), 'gone');

    // A 5xx is a received response: exit 0 with its status and body.
    const failed = await call(['--path', '/v1/skills/unknown', '--output', 'err.txt', '--meta', 'err.meta']);
    assert.equal(failed.code, 0, failed.stderr);
    assert.equal(await fs.readFile(path.join(dir, 'err.txt'), 'utf8'), 'upstream said no');
    assert.equal(JSON.parse(await fs.readFile(path.join(dir, 'err.meta'), 'utf8')).status, 500);
  } finally {
    await new Promise(resolve => server.close(resolve));
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('input, login, timeout and transport failures are the documented exit codes', async () => {
  const { server, origin, seen } = await startServer();
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ccg-mgmt-fail-'));
  try {
    await fs.writeFile(path.join(dir, 'package.json'), '{"type":"module"}');
    await installSupport(dir, support);
    await fs.writeFile(path.join(dir, 'stub-management.js'), "export const userAgent=()=>'claude-code/2.1.310';\n");
    await fs.writeFile(path.join(dir, 'run.mjs'), `import {runManagementCommand} from './ccgateway-management-command.js';
      process.exit(await runManagementCommand(process.argv.slice(2), {baseUrl: process.env.CCG_TEST_BASE}));`);
    await linkNatives(dir);
    const config = path.join(dir, 'config');
    await fs.mkdir(config);
    await fs.writeFile(path.join(config, '.credentials.json'), JSON.stringify({ claudeAiOauth: { accessToken: 'stored-token' } }));
    const base = cleanEnvironment({ ...process.env, CCG_TEST_BASE: origin, CLAUDE_CONFIG_DIR: config });
    delete base.CLAUDE_SECURESTORAGE_CONFIG_DIR; delete base.ANTHROPIC_API_KEY; delete base.CLAUDE_CODE_OAUTH_TOKEN;
    const call = (args, env = base) => runChild(dir, args, env);
    const frame = result => JSON.parse(result.stderr.slice('CCG_REQUEST_ERROR '.length));

    // A stale answer must not survive a failed command.
    await fs.writeFile(path.join(dir, 'refused.meta'), '{"status":200}');
    const refused = await call(['--path', '/v1/messages', '--output', 'refused.json', '--meta', 'refused.meta']);
    assert.equal(refused.code, 1, refused.stderr);
    assert.equal(frame(refused).source, 'input');
    assert.equal(frame(refused).error.code, 'cli_invalid_management_path');
    assert.equal(await fs.readFile(path.join(dir, 'refused.meta'), 'utf8').then(() => 'present', () => 'gone'), 'gone');

    const signedOut = await call(['--path', '/api/oauth/usage', '--output', 'o', '--meta', 'm'], { ...base, CLAUDE_CONFIG_DIR: path.join(dir, 'missing') });
    assert.equal(signedOut.code, 4, signedOut.stderr);
    assert.equal(frame(signedOut).source, 'input');
    assert.equal(frame(signedOut).error.code, 'not_logged_in');

    const timedOut = await call(['--path', '/v1/skills/slow', '--output', 'slow.json', '--meta', 'slow.meta', '--timeout-ms', '100']);
    assert.equal(timedOut.code, 2, timedOut.stderr);
    assert.equal(frame(timedOut).source, 'timeout');
    assert.equal(frame(timedOut).error.code, 'cli_timeout');

    // A deadline that fires while the body is streaming is still a transport
    // failure, and the partial answer is removed.
    const stalled = await call(['--path', '/v1/files/stall/content', '--output', 'stall.bin', '--meta', 'stall.meta', '--timeout-ms', '200']);
    assert.equal(stalled.code, 2, stalled.stderr);
    assert.equal(frame(stalled).source, 'timeout');
    assert.equal(await fs.readFile(path.join(dir, 'stall.bin'), 'utf8').then(() => 'present', () => 'gone'), 'gone');

    const unreachable = await call(['--path', '/api/oauth/usage', '--output', 'o', '--meta', 'm'], { ...base, CCG_TEST_BASE: 'http://127.0.0.1:1' });
    assert.equal(unreachable.code, 2, unreachable.stderr);
    assert.equal(frame(unreachable).source, 'transport');

    // An API-key account sends x-api-key, not a bearer token.
    const apiKey = await call(['--path', '/api/oauth/usage', '--output', 'key.json', '--meta', 'key.meta'], { ...base, ANTHROPIC_API_KEY: 'sk-ant-key' });
    assert.equal(apiKey.code, 0, apiKey.stderr);
    assert.equal((await fs.readFile(path.join(dir, 'key.meta'), 'utf8')).includes('"status": 200'), true);
    assert.equal(seen.at(-1).headers['x-api-key'], 'sk-ant-key');
    assert.equal(seen.at(-1).headers.authorization, undefined);
  } finally {
    await new Promise(resolve => server.close(resolve));
    await fs.rm(dir, { recursive: true, force: true });
  }
});
