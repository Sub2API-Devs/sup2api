// fixtures/native-environment-2.1.304.json is the environment section the
// native renderers print for one fixed set of facts: zkt (the full snapshot)
// for a client and a Worker, and Kkt (the changes since the last snapshot).
// This test runs those renderers on the recovered core against the inputs
// written out below and requires the fixture to match what they print, so the
// fixture is the CLI's text and not a hand copy. Regenerate with
// CCG_UPDATE_CONTRACT_FIXTURES=1.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { pinned } from '../../artifacts.mjs';
const { version, restored, nativeSkip } = pinned('2.1.304');

const fixtureFile = new URL(`../../fixtures/native-environment-${version}.json`, import.meta.url);

function declarations(file, names) {
  const parser = createRequire(import.meta.url)('@babel/parser');
  const source = fs.readFileSync(new URL(file, restored), 'utf8');
  const ast = parser.parse(source, { sourceType: 'module' });
  const pieces = new Set();
  for (const node of ast.program.body) {
    const declared = node.type === 'FunctionDeclaration' ? [node.id?.name]
      : node.type === 'VariableDeclaration' ? node.declarations.map(d => d.id.name) : [];
    if (declared.some(name => names.includes(name))) pieces.add(source.slice(node.start, node.end));
  }
  for (const name of names) assert([...pieces].some(piece => piece.includes(name)), `${file}: ${name}`);
  return [...pieces].join('\n');
}

// The inputs. A snapshot has the fields the native collector (Wkt) returns;
// githubCli is the option string the native iys builds (no options: the
// built-in gh api client). processProxy is the agent proxy the process itself
// reports (i3().note), which the full renderer prints whenever the snapshot
// has a shell or OS version.
const githubOptions = {};
const client = {
  workingDirectory: '/client', isWorktree: true, isGitRepo: true,
  additionalWorkingDirectories: ['/client-extra', '/client-extra2'],
  platform: 'win32', shell: 'pwsh', osVersion: 'client os', scratchpadDirectory: '/client-tmp',
  agentProxy: { caBundlePath: '/client-ca', hasReadme: false, installedClis: ['gh'] },
};
const worker = {
  workingDirectory: '/worker', isWorktree: true, isGitRepo: false,
  additionalWorkingDirectories: ['/worker-extra'],
  platform: 'linux', shell: 'bash', osVersion: 'worker os', scratchpadDirectory: '/worker-tmp',
  agentProxy: { caBundlePath: '/worker-ca', hasReadme: true, installedClis: ['gh', 'aws'] },
};
// The changes Kkt renders against the Worker snapshot, in this order.
const changes = [
  { field: 'workingDirectory', from: '/client' },
  { field: 'isWorktree' },
  { field: 'isGitRepo' },
  { field: 'additionalWorkingDirectories', added: ['/new'], removed: ['/old'] },
  { field: 'scratchpadDirectory' },
  { field: 'githubCli' },
  { field: 'agentProxy' },
];
// Feature gates read through ir: tengu_foamy_sedgewick on leaves out the
// untrusted-downloads paragraph.
const gates = { tengu_foamy_sedgewick: true };

function nativeEnvironment() {
  let processProxy;
  const context = vm.createContext({
    p: thunk => thunk,
    ir: (name, fallback) => Object.hasOwn(gates, name) ? gates[name] : fallback,
    // Bootstrap state (Ro) and the per-host proxy note (i3): a fresh state per
    // render, so the note is read from processProxy each time.
    Ro: () => ({}),
    i3: () => ({ note: processProxy }),
    // path.join from "path", kept unnormalized: the fixture prints the README
    // beside the CA bundle as <ca>/../README.md.
    Jno: (...parts) => parts.join('/'),
  });
  vm.runInContext(declarations('chunk-n5v91jc3.js', ['Nu', 'Yd', 'k1', 'yr']), context);
  vm.runInContext(declarations('chunk-rncrmfyt.js', [
    'zkt', 'Kkt', '_oo', 'xNe', 'Gkt', 'ANe', 'iys', 'guo', 'PNe', 'ooo', 'roo', 'jkt', 'Ukt', 'aoo',
    'ioo', 'soo', 'loo', 'doo', 'ule', 'l1', 'dy', 'yoo', 'goo', 'hoo', 'foo', 'Mkt', 'Okt', 'Ikt', 'Dkt', 'Lkt', 'CNe',
  ]), context);
  const githubCli = vm.runInContext('iys', context)(githubOptions);
  const render = (name, snapshot, ...rest) => {
    processProxy = snapshot.agentProxy;
    return vm.runInContext(name, context)({ ...snapshot, githubCli }, ...rest);
  };
  return {
    nativeFullClient: render('zkt', client),
    nativeFullWorker: render('zkt', worker),
    nativeUpdate: render('Kkt', worker, changes),
  };
}

test('the committed environment section is what the native renderers print', { skip: nativeSkip('native environment renderers were') }, () => {
  const generated = nativeEnvironment();
  const committed = fs.existsSync(fixtureFile) ? JSON.parse(fs.readFileSync(fixtureFile, 'utf8')) : {};
  if (process.env.CCG_UPDATE_CONTRACT_FIXTURES) {
    const written = {
      cli_version: version,
      provenance: `Rendered by test/native/${version}/environment-template.test.mjs: native zkt (nativeFullClient, nativeFullWorker) and Kkt (nativeUpdate) of chunk-rncrmfyt.js with Nu of chunk-n5v91jc3.js, on the inputs written in that test.`,
      ...generated,
    };
    fs.writeFileSync(fixtureFile, JSON.stringify(written, null, 2) + '\n');
    Object.assign(committed, written);
  }
  assert.equal(committed.cli_version, version);
  for (const key of Object.keys(generated)) assert.equal(committed[key], generated[key], `${key}: native wording changed: regenerate with CCG_UPDATE_CONTRACT_FIXTURES=1`);
});
