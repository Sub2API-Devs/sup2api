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

const fixture = new URL('./fixtures/native-vocabulary-2.1.304.json', import.meta.url);
const restored = new URL('../../../../../../artifacts/claude-2.1.304/linux-restored/', import.meta.url);
const available = fs.existsSync(new URL('chunk-rncrmfyt.js', restored));

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

test('the committed vocabulary is what the CLI renders', { skip: available ? false : 'Recovered CLI 2.1.304 source unavailable: native vocabulary was not rendered.' }, () => {
  const generated = nativeVocabulary();
  if (process.env.CCG_UPDATE_CONTRACT_FIXTURES) fs.writeFileSync(fixture, JSON.stringify(generated, null, 2) + '\n');
  assert.deepEqual(JSON.parse(fs.readFileSync(fixture, 'utf8')), generated, 'native wording changed: regenerate with CCG_UPDATE_CONTRACT_FIXTURES=1');
});
