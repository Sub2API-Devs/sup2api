// CC 2.1.316's own StoredLoginHeldBackError (nU, chunk-7c9mpntp.js), built on
// its TelemetrySafeError base (C, chunk-2g090z7k.js), evaluated from the
// recovered source and mapped by request-error.js: the reason is read from
// the instance's errorClass, the class found by name (the minified class name
// changes between builds, the name string does not). User rule: a login CC
// will not use answers 401 (403 for the organization's standing), message
// verbatim; the transient reason stays a retryable transport 5xx.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { localErrorFrame } from '../../../request-error.js';
import { pinned } from '../../artifacts.mjs';
const { restored, nativeSkip } = pinned('2.1.316');

// Top-level declarations of file by name, as source text.
function declarations(file, names) {
  const parser = createRequire(import.meta.url)('@babel/parser');
  const source = fs.readFileSync(new URL(file, restored), 'utf8');
  const ast = parser.parse(source, { sourceType: 'module' });
  const pieces = [];
  for (const node of ast.program.body) {
    const declared = node.type === 'ClassDeclaration' ? [node.id?.name]
      : node.type === 'VariableDeclaration' ? node.declarations.map(d => d.id.name) : [];
    if (declared.some(name => names.includes(name))) pieces.push(source.slice(node.start, node.end));
  }
  assert.equal(pieces.length, names.length, `${file}: ${names}`);
  return pieces.join('\n');
}

test('CC\'s own StoredLoginHeldBackError maps by its errorClass with the native message', { skip: nativeSkip('native nU was') }, () => {
  const held = vm.runInNewContext(declarations('chunk-2g090z7k.js', ['C']) + '\n' + declarations('chunk-7c9mpntp.js', ['o', 'nU']) +
    '\n;(reason => new nU(reason))');
  const expected = {
    admin: [403, 'permission_error', 'stored_login_refused_admin'],
    restart_needed: [401, 'authentication_error', 'stored_login_refused_restart_needed'],
    settings_unloaded: [502, 'api_error', 'stored_login_refused_settings_unloaded'],
  };
  assert.deepEqual(Object.keys(expected).sort(), Object.keys(vm.runInNewContext(declarations('chunk-7c9mpntp.js', ['o']) + ';o')).sort(), 'the reasons are CC\'s');
  for (const [reason, [status, type, code]] of Object.entries(expected)) {
    const error = held(reason);
    // The official shape: name, errorClass and telemetryMessage, no .code.
    assert.deepEqual([error.name, error.errorClass, error.telemetryMessage, error.code], ['StoredLoginHeldBackError', code, 'Stored login held back', undefined]);
    assert.ok(error.message);
    for (const phase of ['transport', 'build']) {
      const frame = localErrorFrame(error, { phase });
      assert.deepEqual([frame.status, frame.error.type, frame.error.code, frame.error.message], [status, type, code, error.message], `${reason} ${phase}`);
      assert.equal(frame.source, status < 500 && phase === 'build' ? 'input' : 'transport');
    }
  }
});
