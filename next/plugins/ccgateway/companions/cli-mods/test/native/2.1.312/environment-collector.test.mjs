import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { pinned } from '../../artifacts.mjs';
const { restored, nativeSkip, profile, environmentSource } = pinned('2.1.312');

// The on-demand readers fill the snapshot keys the native collector (wkt)
// builds. A new native snapshot field fails here, so the next upgrade reviews
// what the content policy could ask for (2026-10-24 审核 a2).
test('the snapshot covers exactly the native collector fields', { skip: nativeSkip('native wkt keys') }, () => {
  const packageFile = process.env.CCG_BABEL_PACKAGE || fileURLToPath(new URL('../../../package.json', import.meta.url));
  const parser = createRequire(packageFile)('@babel/parser');
  const chunk = fs.readFileSync(new URL('chunk-7dmym6x9.js', restored), 'utf8');
  const ast = parser.parse(chunk, { sourceType: 'module' });
  const declared = [];
  (function visit(node) {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'FunctionDeclaration' && node.id?.name === 'wkt') declared.push(node);
    for (const [key, value] of Object.entries(node)) {
      if (['loc', 'extra', 'comments', 'leadingComments', 'trailingComments'].includes(key)) continue;
      if (Array.isArray(value)) value.forEach(visit); else if (value && typeof value === 'object') visit(value);
    }
  })(ast);
  assert.equal(declared.length, 1, 'native environment collector wkt');
  const objectKeys = node => {
    const keys = [];
    (function visit(value) {
      if (!value || typeof value !== 'object') return;
      if (value.type === 'ObjectExpression') for (const property of value.properties) if (property.type === 'ObjectProperty') keys.push(property.key.name ?? property.key.value);
      for (const [key, child] of Object.entries(value)) {
        if (['loc', 'extra', 'comments', 'leadingComments', 'trailingComments'].includes(key)) continue;
        if (Array.isArray(child)) child.forEach(visit); else if (child && typeof child === 'object') visit(child);
      }
    })(node);
    return keys;
  };
  const returned = objectKeys(declared[0].body).sort();
  const context = {};
  vm.createContext(context);
  const ours = vm.runInContext(environmentSource().replace(/^export /gm, '') + ';({keys: ccgatewayEnvironmentSnapshotKeys})', context).keys;
  assert.deepEqual([...ours].sort(), returned);
});
