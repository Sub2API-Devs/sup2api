import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { restored, nativeSkip } from './artifacts.mjs';

const inc = fs.readFileSync(new URL('../native-environment-2.1.304.inc.js', import.meta.url), 'utf8');
const source = inc.replace(/^export /gm, '');
function adapter(overrides = {}) {
  const calls = [], ctx = {
    Set, Object, Error, a: { platform: 'linux' }, cle: () => undefined,
    zkt: snapshot => { calls.push('render'); return JSON.stringify(snapshot); },
    l1: () => false, ule: () => null,
  };
  for (const [name, value] of Object.entries({ gH: false, Cl: null, hK: false, uoo: '/bin/sh', poo: 'Linux version', moo: undefined, Nkt: undefined, foo: null })) {
    ctx[name] = () => { calls.push(name); return value; };
  }
  Object.assign(ctx, overrides);
  vm.createContext(ctx); vm.runInContext(source, ctx);
  return { calls, ctx, run: fields => ctx.ccgatewayEnvironment({ workingDirectory: '/work', additionalWorkingDirectories: [] }, fields) };
}
test('304 native facts only read selected fields and retain optional absence', async () => {
  const platform = adapter();
  assert.equal(JSON.parse((await platform.run(['platform_name'])).text).platform, 'linux');
  assert.deepEqual(platform.calls, ['render']);
  const all = adapter();
  const result = await all.run(['primary_directory', 'git_repository', 'worktree', 'additional_directories', 'shell', 'os_version', 'scratchpad_directory', 'github_cli', 'agent_proxy']);
  const snapshot = JSON.parse(result.text);
  assert.equal(snapshot.workingDirectory, '/work');
  assert.equal(snapshot.isGitRepo, false);
  assert.equal(snapshot.isWorktree, false);
  assert.deepEqual(snapshot.additionalWorkingDirectories, []);
  assert.equal(snapshot.scratchpadDirectory, undefined);
  assert.equal(snapshot.ccgatewayProxyText, null);
  assert.equal(result.fieldText.agent_proxy, null);
});
test('native read errors are field-specific and retried on a new request', async () => {
  let failures = 0;
  const instance = adapter({ poo: () => { if (failures++ === 0) throw Error('temporary'); return 'Linux recovered'; } });
  const failed = await instance.run(['os_version']);
  assert.deepEqual([...failed.unavailableFields], ['os_version']);
  const recovered = await instance.run(['os_version']);
  assert.deepEqual([...recovered.unavailableFields], []);
  assert.equal(JSON.parse(recovered.text).osVersion, 'Linux recovered');
});
test('native override also avoids unrequested proxy fallback', async () => {
  const instance = adapter({
    cle: () => ({ platform: 'override', additionalWorkingDirectories: [], shell: 'sh' }),
    foo: () => { throw Error('unrequested proxy read'); },
  });
  const result = await instance.run(['platform_name']);
  assert.deepEqual([...result.unavailableFields], []);
  assert.equal(JSON.parse(result.text).platform, 'override');
  assert.equal(JSON.parse(result.text).ccgatewayProxyText, null, 'an unrequested proxy note is suppressed');
});

// The on-demand readers fill the snapshot keys the native collector (Wkt)
// builds. A new native snapshot field fails here, so the next upgrade reviews
// what the content policy could ask for (2026-10-24 审核 a2).
test('the snapshot covers exactly the native collector fields', { skip: nativeSkip('native Wkt keys') }, () => {
  const packageFile = process.env.CCG_BABEL_PACKAGE || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '../../../../web/package.json');
  const parser = createRequire(packageFile)('@babel/parser');
  const chunk = fs.readFileSync(new URL('chunk-rncrmfyt.js', restored), 'utf8');
  const ast = parser.parse(chunk, { sourceType: 'module' });
  const declared = [];
  (function visit(node) {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'FunctionDeclaration' && node.id?.name === 'Wkt') declared.push(node);
    for (const [key, value] of Object.entries(node)) {
      if (['loc', 'extra', 'comments', 'leadingComments', 'trailingComments'].includes(key)) continue;
      if (Array.isArray(value)) value.forEach(visit); else if (value && typeof value === 'object') visit(value);
    }
  })(ast);
  assert.equal(declared.length, 1, 'native environment collector Wkt');
  const objectKeys = node => {
    const keys = [];
    (function visit(value) {
      if (!value || typeof value !== 'object') return;
      if (value.type === 'ObjectExpression') for (const property of value.properties) if (property.type === 'ObjectProperty') keys.push(property.key.name ?? property.key.value);
      for (const [key, child] of Object.entries(value)) {
        if (['loc', 'extra', 'comments', 'leadingComments', 'trailingComments'].includes(key)) continue;
        if (Array.isArray(child)) child.forEach(visit); else if (child && typeof child === 'object') visit(child);
      }
    })(node);
    return keys;
  };
  const returned = objectKeys(declared[0].body).sort();
  const context = {};
  vm.createContext(context);
  const ours = vm.runInContext(source + ';({keys: ccgatewayEnvironmentSnapshotKeys})', context).keys;
  assert.deepEqual([...ours].sort(), returned);
});
