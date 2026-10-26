import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// The environment code with its native bindings as stubs, by their logical
// names (native_<name>; the patcher names them per version).
const inc = fs.readFileSync(new URL('../native-environment.inc.js', import.meta.url), 'utf8');
const source = inc.replace(/^export /gm, '');
function adapter(overrides = {}) {
  const calls = [], ctx = {
    Set, Object, Error, native_runtime: { platform: 'linux' }, native_environmentOverride: () => undefined,
    native_renderEnvironment: snapshot => { calls.push('render'); return JSON.stringify(snapshot); },
    native_overrideHasProxy: () => false, native_overrideProxyText: () => null,
  };
  for (const [name, value] of Object.entries({ native_isGitRepo: false, native_worktreeSession: null, native_isWorktreePath: false, native_shellName: '/bin/sh', native_osVersion: 'Linux version', native_scratchpadDirectory: undefined, native_githubCli: undefined, native_proxyText: null })) {
    ctx[name] = () => { calls.push(name); return value; };
  }
  Object.assign(ctx, overrides);
  vm.createContext(ctx); vm.runInContext(source, ctx);
  return { calls, ctx, run: fields => ctx.ccgatewayEnvironment({ workingDirectory: '/work', additionalWorkingDirectories: [] }, fields) };
}
test('native facts only read selected fields and retain optional absence', async () => {
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
  const instance = adapter({ native_osVersion: () => { if (failures++ === 0) throw Error('temporary'); return 'Linux recovered'; } });
  const failed = await instance.run(['os_version']);
  assert.deepEqual([...failed.unavailableFields], ['os_version']);
  const recovered = await instance.run(['os_version']);
  assert.deepEqual([...recovered.unavailableFields], []);
  assert.equal(JSON.parse(recovered.text).osVersion, 'Linux recovered');
});
test('native override also avoids unrequested proxy fallback', async () => {
  const instance = adapter({
    native_environmentOverride: () => ({ platform: 'override', additionalWorkingDirectories: [], shell: 'sh' }),
    native_proxyText: () => { throw Error('unrequested proxy read'); },
  });
  const result = await instance.run(['platform_name']);
  assert.deepEqual([...result.unavailableFields], []);
  assert.equal(JSON.parse(result.text).platform, 'override');
  assert.equal(JSON.parse(result.text).ccgatewayProxyText, null, 'an unrequested proxy note is suppressed');
});
