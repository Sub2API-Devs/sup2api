// The first-party shape against the official 2.1.316 client itself
// (2026-11-03). The fixture holds the same client's Messages requests in both
// shapes (test/fixtures/build-first-party-shape-fixture.cjs, from the
// 2026-11-03 captures): converting the third-party one with CC's own split
// and markers (s2o, ZSr, vX, run here from the recovered source) and CC's own
// header gives the first-party one, block for block and byte for byte, and
// the betas the conversion keeps are the ones the official client sends. The
// prompt sections themselves are rendered by the compiled CLI in the e2e kit
// (third-party scenarios), where Node cannot run CC's prompt builder.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { createContentPolicy } from '../../../content-policy.js';
import { installSupport, linkNatives } from '../../support.mjs';
import { pinned } from '../../artifacts.mjs';
import { vocabulary } from '../../vocabulary.mjs';
const { restored, nativeSkip, fixture } = pinned('2.1.316');
const cases = JSON.parse(fs.readFileSync(fixture('first-party-shape'), 'utf8')).cases;
const { thirdPartyBilling, completeBillingHeader, leadingBilling } = createContentPolicy(vocabulary);

// The native declarations by name, as their module writes them, in order.
function declarations(file, names) {
  const packageFile = process.env.CCG_BABEL_PACKAGE || fileURLToPath(new URL('../../../package.json', import.meta.url));
  const parser = createRequire(packageFile)('@babel/parser');
  const text = fs.readFileSync(new URL(file, restored), 'utf8'), found = new Map();
  for (const node of parser.parse(text, { sourceType: 'module' }).program.body) {
    const declaration = node.type === 'ExportNamedDeclaration' ? node.declaration : node;
    if (declaration?.type === 'FunctionDeclaration' && names.includes(declaration.id.name)) found.set(declaration.id.name, text.slice(declaration.start, declaration.end));
    if (declaration?.type === 'VariableDeclaration') for (const item of declaration.declarations) if (names.includes(item.id?.name)) found.set(item.id.name, 'var ' + text.slice(item.start, item.end) + ';');
  }
  for (const name of names) assert.ok(found.has(name), `${file} declares ${name}`);
  return names.map(name => found.get(name)).join('\n');
}

async function natives() {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'ccg-fp-native-'));
  await installSupport(dir, ['first-party-shape']);
  // CC's own s2o (chunk-w5ndchqs.js) with its constants and the core's ZSr
  // and vX; j3 is the first-party shape's (true), a is telemetry.
  const code = [
    'const j3 = () => true, a = () => {};',
    declarations('chunk-dcmhvw5a.js', ['h$']), declarations('chunk-1t61stbc.js', ['fit', 'akn']),
    declarations('chunk-w5ndchqs.js', ['te', 'oe', 'Ue', 'Ie', 'mt', 'J', 'u7n', 'o2o', 's2o', 'f7n']),
    declarations('chunk-e6aww6q8.js', ['vX', 'ZSr']),
    'export const isIdentityLine = f7n, boundary = h$;',
    'export const ccgatewayFirstPartySystem = (texts, caching, cacheTtl) => ZSr(texts, caching, { cacheTtl });',
    'export const ccgatewayPromptSections = async () => globalThis.ccgatewaySections;',
    `export const ccgatewayDeferredToolsOpening = () => 'unused', reminderOpen = '<system-reminder>', reminderClose = '</system-reminder>';`,
  ].join('\n');
  await fsp.writeFile(path.join(dir, 'package.json'), '{"type":"module"}');
  await fsp.writeFile(path.join(dir, 'stub-native.js'), code);
  await linkNatives(dir);
  return { dir, shape: await import(pathToFileURL(path.join(dir, 'ccgateway-first-party-shape.js'))), native: await import(pathToFileURL(path.join(dir, 'stub-native.js'))) };
}

test('CC\'s split and markers of the third-party prompt are the first-party blocks', { skip: nativeSkip('the native system split') }, async () => {
  const { dir, shape, native } = await natives();
  try {
    let split = 0;
    for (const item of cases) {
      const [aBlocks, bBlocks] = [item.a.system, item.b.system];
      if (aBlocks.length !== 4) {
        // A subagent's prompt is not CC's main prompt: the same in both shapes.
        assert.deepEqual(aBlocks.slice(1), bBlocks.slice(1), item.name);
        continue;
      }
      globalThis.ccgatewaySections = { static: [aBlocks[2].text], dynamic: [aBlocks[3].text], boundary: native.boundary };
      const blocks = await shape.firstPartySystem(bBlocks, { model: item.model, tools: [] });
      assert.deepEqual(blocks.slice(1), aBlocks.slice(1), item.name);
      assert.deepEqual(blocks[0], { type: 'text', text: bBlocks[0].text }, item.name);
      split++;
      // A prompt whose opening is not exactly CC's static sections stays whole.
      globalThis.ccgatewaySections = { static: [aBlocks[2].text.slice(0, -1)], dynamic: [], boundary: native.boundary };
      assert.equal(await shape.firstPartySystem(bBlocks, { model: item.model, tools: [] }), null, item.name);
    }
    assert.equal(split, 8, 'every main-thread request');
  } finally { delete globalThis.ccgatewaySections; await fsp.rm(dir, { recursive: true, force: true }); }
});

test('CC\'s header for the request, with the client\'s own values, is the first-party header', () => {
  for (const item of cases) {
    const official = item.a.system[0].text, client = thirdPartyBilling(item.b.system);
    assert.ok(client, item.name);
    // What this CLI's CC writes for the request: its own version and
    // fingerprint, the cch placeholder, the rest as the official client.
    const native = official.replace(/cc_version=[^;]+;/, 'cc_version=2.1.316.fff;').replace(/cch=[0-9a-f]{5};/, 'cch=00000;');
    assert.equal(completeBillingHeader(native, client), official.replace(/cch=[0-9a-f]{5};/, 'cch=00000;'), item.name);
  }
});

test('the betas a converted request keeps are the official first-party ones; an unconverted one gets none of them', async () => {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'ccg-fp-betas-'));
  try {
    await installSupport(dir, ['request-betas']);
    await fsp.writeFile(path.join(dir, 'package.json'), '{"type":"module"}');
    // The descriptors are CC's own (chunk-bwbq4xvm.js k()).
    const descriptors = declarations('chunk-bwbq4xvm.js', ['cOe', 'VPt', 'l9t']).replace(/=k\(/g, '=((name,header)=>({name,header}))(');
    await fsp.writeFile(path.join(dir, 'stub-command.js'), descriptors + '\nexport const modelBetas=()=>[];export {cOe as promptCachingScopeBeta,VPt as cacheDiagnosisBeta,l9t as extendedCacheTtlBeta};');
    await linkNatives(dir);
    const { bodyBetas } = await import(pathToFileURL(path.join(dir, 'ccgateway-request-betas.js')));
    for (const item of cases) {
      const official = item.a.betas.split(','), client = item.b.betas.split(',');
      // What the build may add beyond the client's: the first-party ones.
      const added = official.filter(beta => !client.includes(beta));
      const body = { system: item.a.system, ...item.a.diagnostics !== undefined && { diagnostics: item.a.diagnostics } };
      assert.equal(leadingBilling(body.system).cch !== undefined, true);
      assert.deepEqual(bodyBetas(body, client, added, { firstParty: true }), added, item.name);
      // Unconverted, the client's third-party body uses none of the three.
      const unconverted = bodyBetas({ system: item.b.system }, client, added, { firstParty: false });
      for (const beta of ['prompt-caching-scope-2026-01-05', 'cache-diagnosis-2026-04-07']) assert.ok(!unconverted.includes(beta), `${item.name} ${beta}`);
    }
  } finally { await fsp.rm(dir, { recursive: true, force: true }); }
});

// A third-party client's compaction request carries no class header; build
// recognizes it by the openings CC's own compaction prompt builder writes
// (native-environment.inc.js ccgatewayCompactionOpenings over Tsn, q9e, TB).
test('every official compaction prompt opens with an opening CC\'s builder writes', { skip: nativeSkip('the native compaction prompt') }, async () => {
  const { prompts } = JSON.parse(fs.readFileSync(fixture('compaction-prompts'), 'utf8'));
  const code = declarations('chunk-e6aww6q8.js', ['q9e', 'TB', 'Tsn']) + '\nreturn [Tsn(q9e), Tsn(TB)];';
  const openings = new Function(code)();
  assert.equal(openings.length, 2);
  for (const opening of openings) assert.ok(opening.length > 200);
  for (const prompt of prompts) assert.ok(openings.some(opening => prompt.startsWith(opening)), prompt.slice(0, 80));
  // An ordinary prompt does not.
  assert.ok(!openings.some(opening => 'Reply with the single word OK.'.startsWith(opening)));
});
