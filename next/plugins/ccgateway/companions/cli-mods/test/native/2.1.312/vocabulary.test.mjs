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
const { restored, nativeSkip, profile, environmentSource } = pinned('2.1.312');

const fixture = new URL('../../fixtures/native-vocabulary-2.1.312.json', import.meta.url);

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
  // The renderers' free names, given below as stubs, are the 2.1.312 core's:
  // the path display, the feature flag reader, the proxy text (goo) and path join.
  const context = vm.createContext({
    xf: String, Cn: () => false, goo: () => null, p: thunk => thunk, too: path.posix.join,
  });
  vm.runInContext(declarations('chunk-7dmym6x9.js', ['GDe', 'boo', 'Rkt', 'Tkt', 'jDe', 'ENs', 'UDe', 'Axo', 'Dy', 'ile', 'k1', 'Soo', '_oo', 'koo', 'lkt']), context);
  vm.runInContext(environmentSource().replace(/^export /gm, ''), context);
  vm.runInContext(declarations('chunk-a354k8k1.js', ['art']), context);
  vm.runInContext(declarations('chunk-frekxwcp.js', ['BP']), context);
  // The same assembly as request-build.js.
  return JSON.parse(JSON.stringify(vm.runInContext('({ ...ccgatewayEnvironmentVocabulary(), billingHeader: art, reminder: [BP, Hte] })', context)));
}

test('the committed vocabulary is what the CLI renders', { skip: nativeSkip('native vocabulary was') }, () => {
  const generated = nativeVocabulary();
  if (process.env.CCG_UPDATE_CONTRACT_FIXTURES) fs.writeFileSync(fixture, JSON.stringify(generated, null, 2) + '\n');
  assert.deepEqual(JSON.parse(fs.readFileSync(fixture, 'utf8')), generated, 'native wording changed: regenerate with CCG_UPDATE_CONTRACT_FIXTURES=1');
});

// How build tells a request already carries a layer (ccgatewayLayerVocabulary)
// and the client loop header names, from the same native renderers and
// constants; fixtures/native-layers-2.1.312.json is the committed copy.
const layersFixture = new URL('../../fixtures/native-layers-2.1.312.json', import.meta.url);
function nativeLayers() {
  const context = vm.createContext({ p: thunk => thunk, xf: String, Cn: () => false, goo: () => null, too: path.posix.join });
  vm.runInContext(declarations('chunk-7dmym6x9.js', ['GDe', 'ioo', 'vkt', 'boo', 'Rkt', 'Tkt', 'jDe', 'ENs', 'UDe', 'Axo', 'Dy', 'ile', 'k1', 'Soo', '_oo', 'koo', 'lkt', 'xoo', 'Wkt', 'uln', 'P9t', 'R9t', 'C9t', 'x9t', 'A9t']), context);
  vm.runInContext(declarations('chunk-ksa0mq1y.js', ['Fti', 'Otr']), context);
  vm.runInContext(environmentSource().replace(/^export /gm, ''), context);
  return JSON.parse(JSON.stringify(vm.runInContext('ccgatewayLayerVocabulary()', context)));
}

test('the committed layer vocabulary is what the CLI renders', { skip: nativeSkip('native layer vocabulary was') }, () => {
  const generated = nativeLayers();
  if (process.env.CCG_UPDATE_CONTRACT_FIXTURES) fs.writeFileSync(layersFixture, JSON.stringify(generated, null, 2) + '\n');
  assert.deepEqual(JSON.parse(fs.readFileSync(layersFixture, 'utf8')), generated, 'native wording changed: regenerate with CCG_UPDATE_CONTRACT_FIXTURES=1');
});

// The turn each prompt gets is the native query loop's (NBs, vKn), run here
// on the recovered code: the SDK numbers turns, a human also numbers prompts,
// and a history CC could not number (a compacted one) gets no position.
test('main-thread prompts get the native turn', { skip: nativeSkip('native turn functions were') }, () => {
  const context = vm.createContext({});
  vm.runInContext(declarations('chunk-7dmym6x9.js', ['NBs', 'qQe', 'IQt', 'vKn', 'nTt', 'Fle', '$3', 'eTt', 'tTt', '_so', 'Nle', 'vTe', 'F7e', 'nI']), context);
  vm.runInContext(declarations('chunk-frekxwcp.js', ['kae']), context);
  // 2.1.312 names (2.1.310 in parentheses): Olt (eit), mk (QE), Qu (zf), ki (vi), VDe (HOe), tG (yW).
  Object.assign(context, { Olt: 'system-reminder', mk: '\u0000', Qu: '\u0000', ki: '<synthetic>', VDe: () => '', tG: '\u0001' });
  vm.runInContext(environmentSource().replace(/^export /gm, ''), context);
  const messages = [{ role: 'user', content: 'one' }, { role: 'assistant', content: [{ type: 'tool_use', id: 't', name: 'Read', input: {} }] },
    { role: 'user', content: [{ type: 'tool_result', tool_use_id: 't', content: 'x' }] }, { role: 'assistant', content: 'ok' }, { role: 'user', content: 'two' }];
  const turn = (list, interactive) => { const value = context.ccgatewayPromptTurn(list, interactive); return value && JSON.parse(JSON.stringify(value)); };
  assert.deepEqual(turn(messages, false), { turnOrigin: 'sdk', turnPosition: { promptIndex: 0, turnIndex: 2 }, prompt: 'two', fresh: true });
  assert.deepEqual(turn(messages, true), { turnOrigin: 'human', turnPosition: { promptIndex: 2, turnIndex: 2 }, prompt: 'two', fresh: true });
  assert.deepEqual(turn(messages.slice(0, 1), false), { turnOrigin: 'sdk', turnPosition: { promptIndex: 0, turnIndex: 1 }, prompt: 'one', fresh: true });
  // A tool result's continuation: the last prompt is not the last user message.
  assert.deepEqual(turn(messages.slice(0, 3), false), { turnOrigin: 'sdk', turnPosition: { promptIndex: 0, turnIndex: 1 }, prompt: 'one', fresh: false });
  assert.equal(turn(messages.slice(1, 4), false), undefined, 'no prompt');
});
