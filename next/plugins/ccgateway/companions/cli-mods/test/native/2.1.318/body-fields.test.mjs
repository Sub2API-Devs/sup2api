import test from 'node:test';
import { vocabulary, layers } from '../../vocabulary.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { validateBuildParameters, mergeAdditionalParameters, wireToolDefinitions, nativeParameterFields, generationControls, nativeBodyOrder } from '../../../request-parameters.js';
import { parseRequestJSON, parseBuildJSON } from '../../../request-options.js';
import { installSupport, linkNatives } from '../../support.mjs';
import { pinned } from '../../artifacts.mjs';
const { restored, nativeSkip, profile, environmentSource } = pinned('2.1.318');

// The native builder's body fields are the ones the adapter must not restore,
// plus the documented client extensions: a field native starts writing (or
// stops writing) fails here, so the next upgrade decides who owns it. The
// literal is the hash-bound builder's, read by AST.
test('the native body literal matches the adapter\'s field ownership', { skip: nativeSkip('native body literal') }, async () => {
  const { createRequire } = await import('node:module');
  const packageFile = process.env.CCG_BABEL_PACKAGE || fileURLToPath(new URL('../../../package.json', import.meta.url));
  const parser = createRequire(packageFile)('@babel/parser');
  const chunk = await fs.readFile(new URL('chunk-5xgkngpb.js', restored), 'utf8');
  const ast = parser.parse(chunk, { sourceType: 'module' });
  const find = (node, predicate) => {
    const found = [];
    (function visit(value) {
      if (!value || typeof value !== 'object') return;
      if (predicate(value)) found.push(value);
      for (const [key, child] of Object.entries(value)) {
        if (['loc', 'extra', 'comments', 'leadingComments', 'trailingComments'].includes(key)) continue;
        if (Array.isArray(child)) child.forEach(visit); else if (child && typeof child === 'object') visit(child);
      }
    })(node);
    return found;
  };
  const builder = find(ast, node => node.type === 'VariableDeclarator' && node.id?.name === 'VJn');
  assert.equal(builder.length, 1, 'the native request builder');
  const body = find(builder[0].init, node => node.type === 'VariableDeclarator' && node.id?.name === 'jf');
  assert.equal(body.length, 1, 'the native body literal');
  const nativeKeys = new Set(find(body[0].init, node => node.type === 'ObjectExpression')
    .flatMap(node => node.properties).filter(property => property.type === 'ObjectProperty').map(property => property.key.name ?? property.key.value));
  // Every field the adapter treats as native-owned is one the native body has.
  const adapterOnly = new Set(['systemPrompt', 'attachments', 'stream', 'requestPolicy', 'runtimeContext', 'betas']);
  for (const field of nativeParameterFields) if (!adapterOnly.has(field)) assert(nativeKeys.has(field), `native body has ${field}`);
  // output_config is the native object; its own keys are built from native
  // option values, not written in the literal.
  assert(nativeKeys.has('output_config'));
  // Every native field is either owned by the adapter or a documented client
  // extension: a new one fails here instead of silently passing the client's
  // value over the native builder's.
  const extensions = new Set(['agentContext', 'context_management', 'program_use_case_id', 'safeguards', 'type', 'classifier_context', 'speed', 'thread', 'previous_message_id', 'diagnostics']);
  for (const field of nativeKeys) if (!nativeParameterFields.includes(field)) assert(extensions.has(field), `${field} is neither native-owned nor a client extension`);
  // The body's members in the literal's order, conditional ones (a spread of
  // an object literal) included: the order build writes them in
  // (request-parameters.js nativeBodyOrder, 2026-11-03). A spread of a variable
  // (2.1.318's ...I9) is followed to the variable's initializer and, through the
  // function it calls, to the object literals that function returns: those are
  // the keys the spread can add. A function the chunk does not declare is
  // looked up in the module it imports.
  const keysOf = object => object.properties.filter(inner => inner.type === 'ObjectProperty').map(inner => inner.key.name ?? inner.key.value);
  const importCache = {};
  const imported = async name => {
    if (importCache[name]) return importCache[name];
    const specifier = find(ast, node => node.type === 'ImportDeclaration' && node.specifiers.some(item => item.local.name === name))[0];
    assert(specifier, `the spread calls ${name}, which is imported`);
    const moduleTree = parser.parse(await fs.readFile(new URL(specifier.source.value.replace(/^\.\//, ''), restored), 'utf8'), { sourceType: 'module' });
    return importCache[name] = find(moduleTree, node => node.type === 'FunctionDeclaration' && node.id?.name === name)[0];
  };
  const order = [];
  for (const property of body[0].init.properties) {
    if (property.type === 'ObjectProperty') { order.push(property.key.name ?? property.key.value); continue; }
    let source = property, followCalls = false;
    if (property.type === 'SpreadElement' && property.argument.type === 'Identifier') {
      const variable = find(builder[0].init, node => node.type === 'VariableDeclarator' && node.id?.name === property.argument.name)[0];
      assert(variable, `the spread ${property.argument.name} is a builder local`);
      source = variable.init;
      followCalls = true;
    }
    const objects = find(source, node => node.type === 'ObjectExpression');
    for (const object of objects.filter(o => !objects.some(other => other !== o && other.start <= o.start && other.end >= o.end))) for (const key of keysOf(object)) order.push(key);
    if (!followCalls) continue;
    for (const call of find(source, node => node.type === 'CallExpression' && node.callee.type === 'Identifier')) {
      const name = call.callee.name;
      const definition = find(ast, node => node.type === 'FunctionDeclaration' && node.id?.name === name)[0] ?? (await imported(name));
      assert(definition, `the spread calls ${name}, a native function`);
      for (const returned of find(definition, node => node.type === 'ReturnStatement')) {
        for (const object of find(returned, node => node.type === 'ObjectExpression')) for (const key of keysOf(object)) order.push(key);
      }
    }
  }
  // nativeBodyOrder serves every version: a member a later version added
  // (2.1.318 program_use_case_id) is absent here, the rest keep its order.
  for (const field of order) assert(nativeBodyOrder.includes(field), `nativeBodyOrder places ${field}`);
  assert.deepEqual(order, nativeBodyOrder.filter(field => order.includes(field)));
});
