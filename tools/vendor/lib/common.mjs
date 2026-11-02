// Shared helpers for the vendor (third-party) identification tools.
//
// Feature model (both sides use exactly the same extractor, so a minified
// 2.1.316 declaration and the unminified npm source produce comparable sets):
//   s:<string>   string literals and cooked template chunks, trimmed, 3..400 chars
//   p:<name>     property names (member access, object/class keys)
//   n:<number>   numeric literals that are non-integers or |v| >= 1000
//   r:/re/flags  regular expression literals
// Identifiers are not used (Bun renames every binding). `refs` (identifier
// reads) are kept separately so module-level edges can be resolved.
//
// The tree walker is the one from tools/ast/lib/features.mjs (read-only
// reuse); the collector here is uncapped and adds numbers and regexes.
import fs from 'node:fs';
import path from 'node:path';
import { parse } from '@babel/parser';
import { walk } from '../../ast/lib/features.mjs';

export { walk };

export const readJsonl = (p) =>
  fs
    .readFileSync(p, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l));

export function parseJs(src, { module = 'unambiguous' } = {}) {
  const opts = {
    sourceType: module,
    errorRecovery: true,
    allowReturnOutsideFunction: true,
    allowImportExportEverywhere: true,
    allowAwaitOutsideFunction: true,
    allowSuperOutsideMethod: true,
    allowUndeclaredExports: true,
  };
  try {
    return parse(src, opts);
  } catch (e) {
    try {
      return parse(src, { ...opts, plugins: ['jsx'] });
    } catch {
      return null;
    }
  }
}

function isReference(parent, key) {
  if (!parent) return true;
  if ((parent.type === 'MemberExpression' || parent.type === 'OptionalMemberExpression') && key === 'property' && !parent.computed) return false;
  if (/^(ObjectProperty|ObjectMethod|ClassMethod|ClassProperty|ClassPrivateMethod|ClassAccessorProperty)$/.test(parent.type) && key === 'key' && !parent.computed) return false;
  if (/^(LabeledStatement|BreakStatement|ContinueStatement)$/.test(parent.type)) return false;
  if (/^(Import|Export)/.test(parent.type)) return false;
  return true;
}

// Returns { tokens:Set<string>, refs:Set<string>, calls:string[] (ordered,
// callee identifiers of plain calls), requires:string[] (ordered literal
// require()/import() specifiers) }.
export function collect(node, { wantCalls = false } = {}) {
  const tokens = new Set();
  const refs = new Set();
  const calls = [];
  const requires = [];
  walk(node, (n, parent, key) => {
    switch (n.type) {
      case 'Identifier':
        if (isReference(parent, key)) refs.add(n.name);
        break;
      case 'StringLiteral': {
        // trimmed like template chunks: Bun turns "a " + b into `a ${b}`
        const v = n.value.trim();
        if (v.length >= 3 && v.length <= 400) tokens.add('s:' + v);
        break;
      }
      case 'TemplateElement': {
        const v = (n.value.cooked ?? n.value.raw).trim();
        if (v.length >= 3 && v.length <= 400) tokens.add('s:' + v);
        break;
      }
      case 'NumericLiteral': {
        const v = n.value;
        if (!Number.isInteger(v) || Math.abs(v) >= 1000) tokens.add('n:' + v);
        break;
      }
      case 'RegExpLiteral':
        tokens.add('r:/' + n.pattern + '/' + n.flags);
        break;
      case 'MemberExpression':
      case 'OptionalMemberExpression':
        if (!n.computed && n.property.type === 'Identifier') tokens.add('p:' + n.property.name);
        else if (n.computed && n.property.type === 'StringLiteral') tokens.add('p:' + n.property.value);
        break;
      case 'ObjectProperty':
      case 'ObjectMethod':
      case 'ClassMethod':
      case 'ClassProperty':
      case 'ClassAccessorProperty':
      case 'ClassPrivateMethod':
        if (!n.computed && n.key.type === 'Identifier') tokens.add('p:' + n.key.name);
        else if (n.key.type === 'StringLiteral') tokens.add('p:' + n.key.value);
        break;
      case 'CallExpression':
      case 'OptionalCallExpression':
        if (n.callee.type === 'Identifier') {
          if (n.callee.name === 'require' && n.arguments[0]?.type === 'StringLiteral') requires.push(n.arguments[0].value);
          else if (wantCalls) calls.push(n.callee.name);
        }
        break;
      case 'ImportExpression':
        if (n.source?.type === 'StringLiteral') requires.push(n.source.value);
        break;
      case 'Import':
        if (parent?.arguments?.[0]?.type === 'StringLiteral') requires.push(parent.arguments[0].value);
        break;
    }
  });
  return { tokens, refs, calls, requires };
}

// JSON documents (package.json, data tables) become `module.exports={...}`
// in a CJS wrapper; keys are property names, string values are strings.
export function collectJson(value, tokens = new Set()) {
  if (typeof value === 'string') {
    const v = value.trim();
    if (v.length >= 3 && v.length <= 400) tokens.add('s:' + v);
  } else if (typeof value === 'number') {
    if (!Number.isInteger(value) || Math.abs(value) >= 1000) tokens.add('n:' + value);
  } else if (Array.isArray(value)) for (const v of value) collectJson(v, tokens);
  else if (value && typeof value === 'object')
    for (const [k, v] of Object.entries(value)) {
      tokens.add('p:' + k);
      collectJson(v, tokens);
    }
  return tokens;
}

export function declaredNames(n) {
  if (!n) return [];
  if (n.type === 'VariableDeclaration') return n.declarations.flatMap((d) => patternNames(d.id));
  if (n.id?.name) return [n.id.name];
  return [];
}
function patternNames(p) {
  if (!p) return [];
  if (p.type === 'Identifier') return [p.name];
  if (p.type === 'ObjectPattern') return p.properties.flatMap((x) => patternNames(x.value ?? x.argument));
  if (p.type === 'ArrayPattern') return p.elements.flatMap(patternNames);
  if (p.type === 'AssignmentPattern') return patternNames(p.left);
  if (p.type === 'RestElement') return patternNames(p.argument);
  return [];
}

// Coarse shape of a declaration, used only to break ties between tiny
// candidates: kind + parameter count.
export function shapeOf(target) {
  if (!target) return 'x';
  if (target.type === 'FunctionDeclaration') return 'f' + target.params.length;
  if (target.type === 'ClassDeclaration') return 'c';
  if (target.type === 'VariableDeclaration') {
    const init = target.declarations[0]?.init;
    if (!init) return 'v';
    if (/Function/.test(init.type)) return 'f' + init.params.length;
    if (init.type === 'ClassExpression') return 'c';
    return 'v';
  }
  return 'x';
}

export const BUILTINS = new Set(
  'assert async_hooks buffer child_process cluster console constants crypto dgram diagnostics_channel dns domain events fs fs/promises http http2 https inspector module net os path path/posix path/win32 perf_hooks process punycode querystring readline repl stream stream/promises stream/web string_decoder sys timers timers/promises tls trace_events tty url util util/types v8 vm wasi worker_threads zlib'.split(' '),
);
export const isBuiltin = (s) => s.startsWith('node:') || s.startsWith('bun:') || BUILTINS.has(s);

export function writeJsonl(p, rows) {
  const fd = fs.openSync(p, 'w');
  let buf = '';
  for (const r of rows) {
    buf += JSON.stringify(r) + '\n';
    if (buf.length > 1 << 20) {
      fs.writeSync(fd, buf);
      buf = '';
    }
  }
  if (buf) fs.writeSync(fd, buf);
  fs.closeSync(fd);
}

export const rel = (p) => p.split(path.sep).join('/');
