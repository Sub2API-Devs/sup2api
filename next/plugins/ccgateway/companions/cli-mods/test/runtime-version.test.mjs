// The patched CLI reports the Node.js version the official ELF's Bun reports
// (X-Stainless-Runtime-Version upstream; 2026-11-02: official 2.1.312/2.1.316
// send v26.12.1, a CLI compiled by the public oven/bun:1.4.4 v26.3.0). The value
// is the official ELF's (restore-bun.cjs reads it, elf-facts.cjs), the profile
// records it (runtimeVersion), the patcher refuses a profile that differs and
// installs it (runtime-version.js), and package-release.cjs and the Worker
// image run the compiled CLI and refuse a different value (runtime-check.cjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { versions, pinned } from './artifacts.mjs';

const require = createRequire(import.meta.url);
const { embeddedBun, embeddedRuntimeVersion } = require('../tools/upgrade/elf-facts.cjs');
const { checkRuntime } = require('../runtime-check.cjs');
const read = name => fs.readFileSync(new URL('../' + name, import.meta.url), 'utf8');

// The strings Bun 1.4.4 writes into a compiled ELF (official 2.1.316 bytes).
const userAgent = version => `npm_config_user_agent\0bun/1.4.4 npm/? node/${version} linux x64\0`;
const headers = version => `sourceUrl\0https://nodejs.org/download/release/${version}/node-${version}-headers.tar.gz\0headersUrl`;
const elf = (...parts) => Buffer.from(['\x7fELF', 'Bun v1.4.4 (71c9bf0ca)', ...parts].join('\0'), 'latin1');

test('the official runtime version is read from both places Bun writes it, and must be one', () => {
  assert.equal(embeddedRuntimeVersion(elf(userAgent('v26.12.1'), headers('v26.12.1'))), 'v26.12.1');
  assert.deepEqual(embeddedBun(elf()), { version: '1.4.4', revision: '71c9bf0ca' });
  assert.throws(() => embeddedRuntimeVersion(elf(userAgent('v26.12.1'))), /names no Bun Node\.js version/);
  assert.throws(() => embeddedRuntimeVersion(elf(headers('v26.12.1'))), /names no Bun Node\.js version/);
  assert.throws(() => embeddedRuntimeVersion(elf(userAgent('v26.12.1'), headers('v26.3.0'))), /more than one/);
  assert.throws(() => embeddedBun(Buffer.from('no bun')), /names no Bun version/);
});

for (const version of versions) {
  test(`Claude Code ${version}: the profile reports the Node.js version the official ELF's Bun reports`, () => {
    const { profile, restored, restoredAvailable } = pinned(version);
    assert.match(profile.runtimeVersion ?? '', /^v\d+\.\d+\.\d+$/, 'profile runtimeVersion');
    if (!restoredAvailable) { process.stderr.write(`CCG_NATIVE_TEST_SKIPPED ${version}: no restored tree to read the official runtime version from\n`); return; }
    const reconstruction = JSON.parse(fs.readFileSync(new URL('reconstruction.json', restored), 'utf8'));
    assert.equal(reconstruction.binarySha256, profile.binarySHA256, 'the restored tree is the official ELF of the profile');
    assert.ok(reconstruction.runtimeVersion, 'reconstruction.json records the runtime version (restore again with tools/upgrade/restore-bun.cjs)');
    assert.equal(profile.runtimeVersion, reconstruction.runtimeVersion, `profile runtimeVersion must be the one the official ${version} ELF names`);
    // Where the official ELF is beside the tree, its bytes say the same.
    const official = new URL('../claude-linux-x64', restored);
    if (fs.existsSync(official)) assert.equal(embeddedRuntimeVersion(fs.readFileSync(official)), profile.runtimeVersion);
  });
}

// runtime-version.js as the patcher installs it: it changes the two faces of
// the version and nothing else, keeping each property's attributes.
function installed(value) {
  return read('runtime-version.js').replace("/*CCGATEWAY_RUNTIME_VERSION*/ ''", '/*CCGATEWAY_RUNTIME_VERSION*/ ' + JSON.stringify(value));
}
test('the runtime version module sets process.version and versions.node, and nothing else', () => {
  const versionsObject = { node: '26.3.0', bun: '1.4.4', v8: '14.6.202.34-node.20', uv: '1.51.0' };
  const fake = { version: 'v26.3.0', versions: versionsObject, release: { name: 'node' }, arch: 'x64', platform: 'linux' };
  const before = structuredClone(fake);
  vm.runInNewContext(installed('v26.12.1').replace(/^export /gm, ''), { process: fake });
  assert.equal(fake.version, 'v26.12.1');
  assert.equal(fake.versions.node, '26.12.1');
  assert.equal(fake.versions, versionsObject, 'the same versions object');
  assert.deepEqual({ ...fake, version: before.version, versions: { ...fake.versions, node: before.versions.node } }, before);
  for (const [owner, key] of [[fake, 'version'], [fake.versions, 'node']]) {
    assert.deepEqual(Object.getOwnPropertyDescriptor(owner, key), { value: owner[key], writable: true, enumerable: true, configurable: true });
  }
  // Already the official value: untouched; a property that forbids the change
  // fails the start instead of leaving the compiler's value.
  const same = { version: 'v26.12.1', versions: { node: '26.12.1' } };
  vm.runInNewContext(installed('v26.12.1'), { process: same });
  assert.equal(same.version, 'v26.12.1');
  const frozen = { version: 'v26.3.0', versions: Object.freeze({ node: '26.3.0' }) };
  assert.throws(() => vm.runInNewContext(installed('v26.12.1'), { process: frozen }), /node/);
  // Without the patcher's value the module is not installable.
  assert.match(read('runtime-version.js'), /const runtimeVersion = \/\*CCGATEWAY_RUNTIME_VERSION\*\/ '';/);
});

test('the release check refuses a CLI that does not report the official runtime version', { skip: process.platform !== 'linux' || process.arch !== 'x64' ? 'runs a Linux x64 stand-in CLI' : false }, () => {
  // A stand-in for a compiled CLI: honours BUN_OPTIONS --preload as Bun does,
  // then runs an entry that sets the version it is given.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccg-runtime-check-test-'));
  try {
    const cli = reported => {
      const file = path.join(dir, 'cli-' + reported);
      fs.writeFileSync(file, `#!/bin/sh\nexec ${JSON.stringify(process.execPath)} -r "\${BUN_OPTIONS#--preload=}" -e 'Object.defineProperty(process,"version",{value:"${reported}"});Object.defineProperty(process.versions,"node",{value:"${reported.slice(1)}"});console.log("2.1.316 (Claude Code)")'\n`, { mode: 0o755 });
      return file;
    };
    assert.equal(checkRuntime(cli('v26.12.1'), 'v26.12.1').version, 'v26.12.1');
    assert.throws(() => checkRuntime(cli('v26.3.0'), 'v26.12.1'), /reports Node\.js v26\.3\.0 .*not the official v26\.12\.1/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('every gate checks the runtime version', () => {
  assert.match(read('tools/upgrade/restore-bun.cjs'), /embeddedRuntimeVersion/);
  assert.match(read('patch-cli.cjs'), /reconstruction\.runtimeVersion/);
  assert.match(read('patch-cli.cjs'), /runtime-version\.js/);
  assert.match(read('package-release.cjs'), /checkRuntime\(binary,profile\.runtimeVersion\)/);
  assert.match(fs.readFileSync(new URL('../../worker/Dockerfile', import.meta.url), 'utf8'), /runtime-check\.cjs/);
});
