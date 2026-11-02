// Shared by test/native/<version>/patch-wire-preservation.test.mjs: the
// patched entries evaluate the runtime version module before anything else,
// and it installs the Node.js version the official ELF's Bun reports (the
// restored tree's reconstruction.json, read from the ELF by restore-bun.cjs).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';

export const buildEntries = ['cli.js', 'src/plugins/functionHooks/hooks-worker/hooks-worker.js'];

export function assertRuntimeEntries({ output, baseline, manifest, profile, parser }) {
  const reconstruction = JSON.parse(fs.readFileSync(path.join(baseline, 'reconstruction.json'), 'utf8'));
  assert.match(reconstruction.runtimeVersion ?? '', /^v\d+\.\d+\.\d+$/);
  assert.equal(profile.runtimeVersion, reconstruction.runtimeVersion);
  assert.equal(manifest.runtimeVersion, reconstruction.runtimeVersion);
  const module = 'ccgateway-runtime-version.js', text = fs.readFileSync(path.join(output, module), 'utf8');
  assert.equal(manifest.supportFiles[module].sha256, crypto.createHash('sha256').update(text).digest('hex'));
  assert.equal(manifest.supportFiles[module].source, 'runtime-version.js');
  for (const entry of buildEntries) {
    // Hash-bound like every patched module, and changed only by the import in
    // front (cli.js also carries the request entry).
    assert.ok(profile.modules[entry], `${entry} is hash-bound`);
    assert.equal(manifest.files[entry].before, profile.modules[entry]);
    const source = fs.readFileSync(path.join(output, entry), 'utf8');
    const first = parser.parse(source, { sourceType: 'module' }).program.body[0];
    assert.equal(first.type, 'ImportDeclaration', `${entry} opens with an import`);
    assert.equal(first.specifiers.length, 0);
    assert.equal(path.posix.normalize(path.posix.join(path.posix.dirname(entry), first.source.value)), module, `${entry} imports the runtime version module first`);
    const original = fs.readFileSync(path.join(baseline, entry), 'utf8');
    if (entry !== 'cli.js') assert.equal(source.slice(0, first.start) + source.slice(first.end), original, `${entry} gains only the import`);
  }
  // Evaluated, the module reports the official value.
  const fake = { version: 'v0.0.0', versions: { node: '0.0.0', bun: '1.4.4' } };
  vm.runInNewContext(text, { process: fake });
  assert.equal(fake.version, reconstruction.runtimeVersion);
  assert.equal(fake.versions.node, reconstruction.runtimeVersion.slice(1));
  assert.equal(fake.versions.bun, '1.4.4');
}
