import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../native-environment-2.1.304.inc.js', import.meta.url), 'utf8').replace('export async function', 'async function');
function adapter(overrides = {}) {
  const calls = [], ctx = {
    Set, Object, a: { platform: 'linux' }, cle: () => undefined,
    zkt: snapshot => { calls.push('render'); return JSON.stringify(snapshot); },
    l1: () => false, ule: () => null,
  };
  for (const [name, value] of Object.entries({ gH: false, Cl: null, hK: false, uoo: '/bin/sh', poo: 'Linux version', moo: undefined, Nkt: undefined, foo: null })) {
    ctx[name] = () => { calls.push(name); return value; };
  }
  Object.assign(ctx, overrides);
  vm.createContext(ctx); vm.runInContext(source, ctx);
  return { calls, run: fields => ctx.ccgatewayEnvironment({ workingDirectory: '/work', additionalWorkingDirectories: [] }, fields) };
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
  assert.equal(JSON.parse(result.text).ccgatewayProxyText, null);
});
