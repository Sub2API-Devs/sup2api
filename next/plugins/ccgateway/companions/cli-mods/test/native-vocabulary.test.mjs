// The CC wording content-policy recognizes comes from the CLI at run time
// (ccgatewayEnvironmentVocabulary in native-environment-2.1.304.inc.js and
// the billing header and reminder tag constants). Tests that cannot load the CLI use the
// committed fixture; this test runs the same function against the recovered
// native code and requires the fixture to match it. Regenerate with
// CCG_UPDATE_CONTRACT_FIXTURES=1.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { restored, nativeSkip } from './artifacts.mjs';

const fixture = new URL('./fixtures/native-vocabulary-2.1.304.json', import.meta.url);

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

function nativeVocabulary() {
  const context = vm.createContext({
    Nu: String, ir: () => false, foo: () => null, p: thunk => thunk, Jno: path.posix.join,
  });
  vm.runInContext(declarations('chunk-rncrmfyt.js', ['PNe', '_oo', 'Kkt', 'Gkt', 'ANe', 'iys', 'xNe', 'guo', 'dy', 'ule', 'l1', 'yoo', 'goo', 'hoo', 'Okt']), context);
  vm.runInContext(fs.readFileSync(new URL('../native-environment-2.1.304.inc.js', import.meta.url), 'utf8').replace(/^export /gm, ''), context);
  vm.runInContext(declarations('chunk-7y2kvacy.js', ['oJe']), context);
  vm.runInContext(declarations('chunk-jkcb7qdd.js', ['KF']), context);
  // The same assembly as request-build-2.1.304.js.
  return JSON.parse(JSON.stringify(vm.runInContext('({ ...ccgatewayEnvironmentVocabulary(), billingHeader: oJe, reminder: [KF, lKe] })', context)));
}

test('the committed vocabulary is what the CLI renders', { skip: nativeSkip('native vocabulary was') }, () => {
  const generated = nativeVocabulary();
  if (process.env.CCG_UPDATE_CONTRACT_FIXTURES) fs.writeFileSync(fixture, JSON.stringify(generated, null, 2) + '\n');
  assert.deepEqual(JSON.parse(fs.readFileSync(fixture, 'utf8')), generated, 'native wording changed: regenerate with CCG_UPDATE_CONTRACT_FIXTURES=1');
});

// How build tells a request already carries a layer (ccgatewayLayerVocabulary)
// and the client loop header names, from the same native renderers and
// constants; fixtures/native-layers-2.1.304.json is the committed copy.
const layersFixture = new URL('./fixtures/native-layers-2.1.304.json', import.meta.url);
function nativeLayers() {
  const context = vm.createContext({ p: thunk => thunk, Nu: String, ir: () => false, foo: () => null, Jno: path.posix.join });
  vm.runInContext(declarations('chunk-rncrmfyt.js', ['PNe', 'ooo', 'zkt', '_oo', 'Kkt', 'Gkt', 'ANe', 'iys', 'xNe', 'guo', 'dy', 'ule', 'l1', 'yoo', 'goo', 'hoo', 'Okt', 'Eoo', 'fSt', 'u7t', 'm4t', 'u4t', 'c4t', 'f4t', 'p4t']), context);
  vm.runInContext(declarations('chunk-h3dn4j2q.js', ['RBs', 'p4n']), context);
  vm.runInContext(fs.readFileSync(new URL('../native-environment-2.1.304.inc.js', import.meta.url), 'utf8').replace(/^export /gm, ''), context);
  return JSON.parse(JSON.stringify(vm.runInContext('ccgatewayLayerVocabulary()', context)));
}

test('the committed layer vocabulary is what the CLI renders', { skip: nativeSkip('native layer vocabulary was') }, () => {
  const generated = nativeLayers();
  if (process.env.CCG_UPDATE_CONTRACT_FIXTURES) fs.writeFileSync(layersFixture, JSON.stringify(generated, null, 2) + '\n');
  assert.deepEqual(JSON.parse(fs.readFileSync(layersFixture, 'utf8')), generated, 'native wording changed: regenerate with CCG_UPDATE_CONTRACT_FIXTURES=1');
});

// The turn each prompt gets is the native query loop's (iws, h0n), run here
// on the recovered code: the SDK numbers turns, a human also numbers prompts,
// and a history CC could not number (a compacted one) gets no position.
test('main-thread prompts get the native turn', { skip: nativeSkip('native turn functions were') }, () => {
  const context = vm.createContext({});
  vm.runInContext(declarations('chunk-rncrmfyt.js', ['iws', 'm5e', 'o9t', 'h0n', 'Svt', 'mde', 'T3', '_vt', 'kvt', 'wso', 'pde', 'jSe', 'a3e', 'l0']), context);
  vm.runInContext(declarations('chunk-jkcb7qdd.js', ['vre']), context);
  Object.assign(context, { itt: 'system-reminder', pT: '\u0000', Vp: '\u0000', hi: '<synthetic>', F6e: () => '', R1: '\u0001' });
  vm.runInContext(fs.readFileSync(new URL('../native-environment-2.1.304.inc.js', import.meta.url), 'utf8').replace(/^export /gm, ''), context);
  const messages = [{ role: 'user', content: 'one' }, { role: 'assistant', content: [{ type: 'tool_use', id: 't', name: 'Read', input: {} }] },
    { role: 'user', content: [{ type: 'tool_result', tool_use_id: 't', content: 'x' }] }, { role: 'assistant', content: 'ok' }, { role: 'user', content: 'two' }];
  const turn = (list, interactive) => { const value = context.ccgatewayPromptTurn(list, interactive); return value && JSON.parse(JSON.stringify(value)); };
  assert.deepEqual(turn(messages, false), { turnOrigin: 'sdk', turnPosition: { promptIndex: 0, turnIndex: 2 } });
  assert.deepEqual(turn(messages, true), { turnOrigin: 'human', turnPosition: { promptIndex: 2, turnIndex: 2 } });
  assert.deepEqual(turn(messages.slice(0, 1), false), { turnOrigin: 'sdk', turnPosition: { promptIndex: 0, turnIndex: 1 } });
  assert.equal(turn(messages.slice(1, 4), false), undefined, 'no prompt');
});
