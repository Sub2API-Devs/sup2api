import test from 'node:test';
import { vocabulary, layers } from '../../vocabulary.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { validateBuildParameters, mergeAdditionalParameters, wireToolDefinitions, nativeParameterFields, generationControls } from '../../../request-parameters.js';
import { parseRequestJSON, parseBuildJSON } from '../../../request-options.js';
import { installSupport, linkNatives } from '../../support.mjs';
import { pinned } from '../../artifacts.mjs';
const { restored, nativeSkip, profile, environmentSource } = pinned('2.1.312');

// The native builder's body fields are the ones the adapter must not restore,
// plus the documented client extensions: a field native starts writing (or
// stops writing) fails here, so the next upgrade decides who owns it. The
// literal is the hash-bound builder's, read by AST.
test('the native body literal matches the adapter\'s field ownership', { skip: nativeSkip('native body literal') }, async () => {
  const { createRequire } = await import('node:module');
  const packageFile = process.env.CCG_BABEL_PACKAGE || fileURLToPath(new URL('../../../package.json', import.meta.url));
  const parser = createRequire(packageFile)('@babel/parser');
  const chunk = await fs.readFile(new URL('chunk-7dmym6x9.js', restored), 'utf8');
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
  const builder = find(ast, node => node.type === 'VariableDeclarator' && node.id?.name === 'x9n');
  assert.equal(builder.length, 1, 'the native request builder');
  const body = find(builder[0].init, node => node.type === 'VariableDeclarator' && node.id?.name === 'iu');
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
  const extensions = new Set(['agentContext', 'context_management', 'safeguards', 'type', 'classifier_context', 'speed', 'thread', 'previous_message_id', 'diagnostics']);
  for (const field of nativeKeys) if (!nativeParameterFields.includes(field)) assert(extensions.has(field), `${field} is neither native-owned nor a client extension`);
});
