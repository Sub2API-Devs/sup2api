#!/usr/bin/env node
// Test oracle extracted from the pristine, version-pinned native AST. It never
// reads a wire billing string or calls the patched content-policy implementation.
// 2.1.316 bindings (2.1.312 in parentheses): chunk-s61vbvea.js (chunk-65my4caa.js),
// tF (gH) first user text, $f (ep) digest, Vei (oYs) entry, eF (mH) salt, and
// Z0 (pH) the imported createHash. Salt "59cf53e54c78" and indexes [4,7,20]
// are unchanged; only the VERSION literal differs.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '../../../../../../../..');
const parser = createRequire(path.join(root, 'next/web/package.json'))('@babel/parser');
function walk(node, fn) {
  if (!node || typeof node !== 'object') return;
  if (node.type) fn(node);
  for (const [key, value] of Object.entries(node)) {
    if (['loc','extra','comments','leadingComments','trailingComments','innerComments'].includes(key)) continue;
    if (Array.isArray(value)) value.forEach(item => walk(item, fn));
    else if (value && typeof value === 'object') walk(value, fn);
  }
}
function createOracle(restored = path.join(root, 'artifacts/claude-2.1.316/linux-restored')) {
  const file = path.join(restored, 'chunk-s61vbvea.js'), text = fs.readFileSync(file, 'utf8');
  const nativeHash = crypto.createHash('sha256').update(text).digest('hex');
  if (nativeHash !== 'e5071dd03af5309f3dd627593704891977e755d251e654bd4b60ab2f4e53ecbd') throw Error('Unverified fingerprint module baseline');
  const ast = parser.parse(text, { sourceType: 'module' });
  const nodes = {};
  for (const name of ['tF','$f','Vei','eF']) {
    const found = [];
    walk(ast, node => { if (['FunctionDeclaration','VariableDeclarator'].includes(node.type) && node.id?.name === name) found.push(node); });
    if (found.length !== 1) throw Error('Fingerprint native binding is not unique: ' + name);
    nodes[name] = found[0];
  }
  if (nodes.eF.init?.type !== 'StringLiteral') throw Error('Fingerprint salt is no longer a native literal');
  const versions = [];
  walk(nodes.Vei, node => {
    if (node.type === 'MemberExpression' && node.property?.name === 'VERSION' && node.object.type === 'ObjectExpression') {
      for (const prop of node.object.properties) if (prop.type === 'ObjectProperty' && prop.key?.name === 'VERSION' && prop.value.type === 'StringLiteral') versions.push(prop.value.value);
    }
  });
  if (versions.length !== 1 || versions[0] !== '2.1.316') throw Error('Unsupported native fingerprint version');
  const version = versions[0], salt = nodes.eF.init.value;
  const context = vm.createContext({ Z0: crypto.createHash, eF: salt });
  vm.runInContext(text.slice(nodes.tF.start, nodes.tF.end) + '\n' + text.slice(nodes.$f.start, nodes.$f.end), context, { timeout: 1000 });
  const hash = value => crypto.createHash('sha256').update(value).digest('hex');
  const evidence = { file, source_sha256: hash(text), version, salt, indexing: 'JavaScript UTF-16 string indexes [4,7,20]; missing positions use "0"', nodes: Object.fromEntries(Object.entries(nodes).map(([name,n]) => [name,{start:n.start,end:n.end,line:n.loc.start.line,column:n.loc.start.column,sha256:hash(text.slice(n.start,n.end))}])) };
  function fromNativeRecords(records) { return version + '.' + context.$f(context.tF(records), version); }
  function fromExpectedWire(messages) {
    if (!Array.isArray(messages)) throw Error('Expected transformed wire messages must be an array');
    // prepareBuildInput does not lift a wire message's isMeta property onto the
    // CC record; external user records therefore are not internal meta records.
    const records = messages.map(message => ({ type: message.role === 'system' ? 'api_system' : message.role, message }));
    return fromNativeRecords(records);
  }
  return { version, evidence, fromNativeRecords, fromExpectedWire };
}
module.exports = { createOracle };
if (require.main === module) {
  const oracle = createOracle(process.argv[3]);
  const value = JSON.parse(fs.readFileSync(process.argv[2] || 0, 'utf8'));
  console.log(JSON.stringify({cc_version:oracle.fromExpectedWire(value.messages ?? value),evidence:oracle.evidence},null,2));
}
