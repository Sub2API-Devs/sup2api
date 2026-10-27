// The patched CLI must be compiled by the Bun the official ELF embeds: Bun's
// TLS stack is what upstream sees (2026-10-27: Bun 1.4.3 and the official
// 1.4.4 differ in their ClientHello). Every profile names that version
// (bunVersion); where a restored tree exists, it must be the version the
// official ELF embeds (reconstruction.json, written by restore-bun.cjs). The
// patcher, build.sh, package-release.cjs and the Worker image refuse a
// mismatch; this test fails first.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { versions, pinned } from './artifacts.mjs';

for (const version of versions) {
  test(`Claude Code ${version}: the profile compiles with the Bun the official ELF embeds`, () => {
    const { profile, restored, restoredAvailable } = pinned(version);
    assert.match(profile.bunVersion ?? '', /^\d+\.\d+\.\d+$/, 'profile bunVersion');
    if (!restoredAvailable) { process.stderr.write(`CCG_NATIVE_TEST_SKIPPED ${version}: no restored tree to read the embedded Bun from\n`); return; }
    const reconstruction = JSON.parse(fs.readFileSync(new URL('reconstruction.json', restored), 'utf8'));
    assert.equal(reconstruction.binarySha256, profile.binarySHA256, 'the restored tree is the official ELF of the profile');
    assert.ok(reconstruction.bunVersion, 'reconstruction.json records the embedded Bun (restore again with tools/upgrade/restore-bun.cjs)');
    assert.equal(profile.bunVersion, reconstruction.bunVersion, `profile bunVersion must be the Bun the official ${version} ELF embeds`);
  });
}

test('every gate checks the compiler', () => {
  const read = name => fs.readFileSync(new URL('../' + name, import.meta.url), 'utf8');
  assert.match(read('build.sh'), /bun --version/);
  assert.match(read('package-release.cjs'), /profile\.bunVersion/);
  assert.match(read('patch-cli.cjs'), /reconstruction\.bunVersion/);
  assert.match(fs.readFileSync(new URL('../../worker/Dockerfile', import.meta.url), 'utf8'), /profile\.bunVersion/);
});
