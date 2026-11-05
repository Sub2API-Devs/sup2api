// CC 2.1.318's own StoredLoginHeldBackError (YL, chunk-0t3rqhrf.js), built on
// its TelemetrySafeError base (C, chunk-63094ahz.js), evaluated from the
// recovered source and mapped by request-error.js: the reason is read from
// the instance's errorClass, the class found by name (the minified class name
// changes between builds, the name string does not). User rule: a login CC
// will not use answers 401 (403 for the organization's standing), message
// verbatim; the transient reason stays a retryable transport 5xx.
// 2.1.318 adds the reason session_owner (an interactive session held by
// another account). It has no mapping in request-error.js yet: it is listed
// below as the reason the transport mapping answers (the mapping rule is the
// maintainer's to decide).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { localErrorFrame } from '../../../request-error.js';
import { pinned } from '../../artifacts.mjs';
const { restored, nativeSkip } = pinned('2.1.318');

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

test('CC\'s own StoredLoginHeldBackError maps by its errorClass with the native message', { skip: nativeSkip('native YL was') }, () => {
  const held = vm.runInNewContext(declarations('chunk-63094ahz.js', ['C']) + '\n' + declarations('chunk-0t3rqhrf.js', ['o', 'YL']) +
    '\n;(reason => new YL(reason))');
  // The reasons request-error.js maps, and the ones it does not (they stay the
  // transport mapping: 502 cli_transport_error).
  const unmapped = ['session_owner'];
  const expected = {
    admin: [403, 'permission_error', 'stored_login_refused_admin'],
    restart_needed: [401, 'authentication_error', 'stored_login_refused_restart_needed'],
    settings_unloaded: [502, 'api_error', 'stored_login_refused_settings_unloaded'],
  };
  assert.deepEqual([...Object.keys(expected), ...unmapped].sort(), Object.keys(vm.runInNewContext(declarations('chunk-0t3rqhrf.js', ['o']) + ';o')).sort(), 'the reasons are CC\'s');
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
  for (const reason of unmapped) {
    const error = held(reason);
    // The native shape all the same; the frame stays the transport mapping.
    assert.deepEqual([error.name, error.errorClass, error.telemetryMessage, error.code], ['StoredLoginHeldBackError', 'stored_login_refused_' + reason, 'Stored login held back', undefined]);
    assert.ok(error.message);
    const frame = localErrorFrame(error, { phase: 'transport' });
    assert.deepEqual([frame.status, frame.error.type, frame.error.code, frame.error.message], [502, 'api_error', 'cli_transport_error', error.message], reason);
  }
});
