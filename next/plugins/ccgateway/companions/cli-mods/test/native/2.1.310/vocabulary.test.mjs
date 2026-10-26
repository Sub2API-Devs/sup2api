// The CC wording content-policy recognizes comes from the CLI at run time
// (ccgatewayEnvironmentVocabulary in native-environment.inc.js and
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
import { pinned } from '../../artifacts.mjs';
const { restored, nativeSkip, profile, environmentSource } = pinned('2.1.310');

const fixture = new URL('../../fixtures/native-vocabulary-2.1.310.json', import.meta.url);

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
  // 2.1.310 names: Nu->gf (path display), ir->Wn (feature flag), foo->cao
  // (proxy text), Jno->Qio (path join), as the renderers below reference them.
  const context = vm.createContext({
    gf: String, Wn: () => false, cao: () => null, p: thunk => thunk, Qio: path.posix.join,
  });
  vm.runInContext(declarations('chunk-j0tbz6ra.js', ['a$e', 'yao', 'rTt', 'eTt', 's$e', 'OPs', 'r$e', 'xvo', 'my', 'ede', 'ZW', 'hao', 'mao', 'gao', 'Hwt']), context);
  vm.runInContext(environmentSource().replace(/^export /gm, ''), context);
  vm.runInContext(declarations('chunk-q1myka9a.js', ['jet']), context);
  vm.runInContext(declarations('chunk-ewvf3tep.js', ['TB']), context);
  // The same assembly as request-build.js.
  return JSON.parse(JSON.stringify(vm.runInContext('({ ...ccgatewayEnvironmentVocabulary(), billingHeader: jet, reminder: [TB, uYe] })', context)));
}

test('the committed vocabulary is what the CLI renders', { skip: nativeSkip('native vocabulary was') }, () => {
  const generated = nativeVocabulary();
  if (process.env.CCG_UPDATE_CONTRACT_FIXTURES) fs.writeFileSync(fixture, JSON.stringify(generated, null, 2) + '\n');
  assert.deepEqual(JSON.parse(fs.readFileSync(fixture, 'utf8')), generated, 'native wording changed: regenerate with CCG_UPDATE_CONTRACT_FIXTURES=1');
});

// How build tells a request already carries a layer (ccgatewayLayerVocabulary)
// and the client loop header names, from the same native renderers and
// constants; fixtures/native-layers-2.1.310.json is the committed copy.
const layersFixture = new URL('../../fixtures/native-layers-2.1.310.json', import.meta.url);
function nativeLayers() {
  const context = vm.createContext({ p: thunk => thunk, gf: String, Wn: () => false, cao: () => null, Qio: path.posix.join });
  vm.runInContext(declarations('chunk-j0tbz6ra.js', ['a$e', 'nao', 'nTt', 'yao', 'rTt', 'eTt', 's$e', 'OPs', 'r$e', 'xvo', 'my', 'ede', 'ZW', 'hao', 'mao', 'gao', 'Hwt', 'vao', 'RTt', 'won', 'rXt', 'eXt', 'tXt', 'nXt', 'oXt']), context);
  vm.runInContext(declarations('chunk-wany0nxw.js', ['Q8s', 'zJn']), context);
  vm.runInContext(environmentSource().replace(/^export /gm, ''), context);
  return JSON.parse(JSON.stringify(vm.runInContext('ccgatewayLayerVocabulary()', context)));
}

test('the committed layer vocabulary is what the CLI renders', { skip: nativeSkip('native layer vocabulary was') }, () => {
  const generated = nativeLayers();
  if (process.env.CCG_UPDATE_CONTRACT_FIXTURES) fs.writeFileSync(layersFixture, JSON.stringify(generated, null, 2) + '\n');
  assert.deepEqual(JSON.parse(fs.readFileSync(layersFixture, 'utf8')), generated, 'native wording changed: regenerate with CCG_UPDATE_CONTRACT_FIXTURES=1');
});

// The turn each prompt gets is the native query loop's (WDs, Wjn), run here
// on the recovered code: the SDK numbers turns, a human also numbers prompts,
// and a history CC could not number (a compacted one) gets no position.
test('main-thread prompts get the native turn', { skip: nativeSkip('native turn functions were') }, () => {
  const context = vm.createContext({});
  vm.runInContext(declarations('chunk-j0tbz6ra.js', ['WDs', 'DXe', 'VQt', 'Wjn', 'CRt', 'pue', 'e9', 'ERt', 'RRt', 'hdo', 'fue', 'NEe', 'RJe', 'vP']), context);
  vm.runInContext(declarations('chunk-ewvf3tep.js', ['qse']), context);
  // 2.1.310 names: itt->eit, pT->QE, Vp->zf, hi->vi, F6e->HOe, R1->yW.
  Object.assign(context, { eit: 'system-reminder', QE: '\u0000', zf: '\u0000', vi: '<synthetic>', HOe: () => '', yW: '\u0001' });
  vm.runInContext(environmentSource().replace(/^export /gm, ''), context);
  const messages = [{ role: 'user', content: 'one' }, { role: 'assistant', content: [{ type: 'tool_use', id: 't', name: 'Read', input: {} }] },
    { role: 'user', content: [{ type: 'tool_result', tool_use_id: 't', content: 'x' }] }, { role: 'assistant', content: 'ok' }, { role: 'user', content: 'two' }];
  const turn = (list, interactive) => { const value = context.ccgatewayPromptTurn(list, interactive); return value && JSON.parse(JSON.stringify(value)); };
  assert.deepEqual(turn(messages, false), { turnOrigin: 'sdk', turnPosition: { promptIndex: 0, turnIndex: 2 } });
  assert.deepEqual(turn(messages, true), { turnOrigin: 'human', turnPosition: { promptIndex: 2, turnIndex: 2 } });
  assert.deepEqual(turn(messages.slice(0, 1), false), { turnOrigin: 'sdk', turnPosition: { promptIndex: 0, turnIndex: 1 } });
  assert.equal(turn(messages.slice(1, 4), false), undefined, 'no prompt');
});
