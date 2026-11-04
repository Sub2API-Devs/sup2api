// Normalised token streams for aligning 2.1.316 vendor code with npm source.
//   import { tokenize, intern, tokName } from './vendor-tokens.mjs'
//   tokenize(nodes, { subst }) → { tok: Int32Array, bind: Array<Binding|null>, pos: Int32Array }
//
// The stream is a source-order walk of the AST (works for any Babel AST that
// went through tools/rename/lib/scope.mjs `analyze`, which tags identifier
// nodes with node[OCC]). Identifiers that resolve to a binding become the
// wildcard token `I` (the binding is kept alongside); globals stay literal
// (`g:name`); everything a minifier keeps (strings, property names, numbers,
// regexes, operators) is a literal token. Normalisations absorb what Bun's
// minifier changes:
//   !0 / !1 → true / false        void 0, undefined → undef
//   a["b"] → .b, {"b": 1} → {b: 1}  template without substitutions → string
//   === / !== → == / !=           typeof x === "undefined" / typeof x > "u" → tundef x
//   if / block / expression statements / var keywords / commas → no token
//   require("…") (npm side) → `call I` with no binding, like Bun's `req_x()`
// `imports` (npm side) maps import bindings to the imported name, see ident().
// `subst` maps a Binding to a fixed literal token (used for the CommonJS
// wrapper's exports/module parameters, which are globals on the npm side).
import { OCC } from '../../rename/lib/scope.mjs';

const ids = new Map();
const names = [];
export function intern(s) {
  let v = ids.get(s);
  if (v === undefined) {
    v = names.length;
    ids.set(s, v);
    names.push(s);
  }
  return v;
}
export const tokName = (t) => names[t];
// literal tokens a minifier keeps verbatim (strings, property names, numbers,
// regexes, globals): aligning them is evidence, unlike wildcards and syntax markers
const infCache = [];
export function isInformative(t) {
  let v = infCache[t];
  if (v === undefined) infCache[t] = v = /^(s|p|n|r|g|b):/.test(names[t]);
  return v;
}
export const T_I = intern('I');
// wildcard classes: parameter declarations and function/class expression names
// (which Bun often drops) only align with their own kind; IF marks the name of a
// function or class (declaration, `x = function/arrow/class`) on both sides
export const T_IP = intern('IP');
export const T_IN = intern('IN');
export const T_IF = intern('IF');
export const WILD = new Set([T_I, T_IP, T_IN, T_IF]);
// tokens specific enough that one aligned occurrence says something: strings
// and regexes of 4+ characters, property names of 5+, unusual numbers
const strongCache = [];
export function isStrong(t) {
  let v = strongCache[t];
  if (v === undefined) {
    const s = names[t];
    const m = /^(s|r|b|p|n):(.*)$/s.exec(s);
    v = !!m && (m[1] === 'p' ? m[2].length >= 5 : m[1] === 'n' ? !(Number.isInteger(+m[2]) && Math.abs(+m[2]) < 100) : m[2].length >= 4);
    strongCache[t] = v;
  }
  return v;
}
const isFnLike = (n) => n && /^(FunctionExpression|ArrowFunctionExpression|ClassExpression)$/.test(n.type);

const SKIP_KEYS = new Set(['loc', 'start', 'end', 'extra', 'leadingComments', 'trailingComments', 'innerComments', 'range', 'comments', 'tokens', 'errors']);
// node types that produce no token of their own
const SILENT = new Set(['ExpressionStatement', 'BlockStatement', 'IfStatement', 'ConditionalExpression', 'SequenceExpression', 'VariableDeclaration', 'VariableDeclarator', 'ParenthesizedExpression', 'ExportNamedDeclaration', 'ExportDefaultDeclaration', 'EmptyStatement', 'BreakStatement', 'ContinueStatement', 'LabeledStatement', 'Program', 'ObjectProperty', 'ClassBody', 'StaticBlock', 'AssignmentPattern', 'ArrayPattern', 'ObjectPattern', 'TemplateElement', 'ChainExpression', 'SwitchCase', 'CatchClause', 'Directive', 'DirectiveLiteral', 'InterpreterDirective', 'ClassProperty', 'ClassPrivateProperty', 'ClassAccessorProperty']);
const MARK = {
  FunctionDeclaration: 'fn', FunctionExpression: 'fn', ArrowFunctionExpression: 'fn', ObjectMethod: 'fn', ClassMethod: 'fn', ClassPrivateMethod: 'fn',
  ClassDeclaration: 'class', ClassExpression: 'class', CallExpression: 'call', OptionalCallExpression: 'call', NewExpression: 'new',
  ReturnStatement: 'ret', ThrowStatement: 'throw', ForStatement: 'loop', WhileStatement: 'loop', DoWhileStatement: 'loop', ForInStatement: 'forin', ForOfStatement: 'forof',
  TryStatement: 'try', SwitchStatement: 'switch', SpreadElement: '...', RestElement: '...', AwaitExpression: 'await', YieldExpression: 'yield',
  ThisExpression: 'this', Super: 'super', NullLiteral: 'null', ArrayExpression: '[', ObjectExpression: '{', TaggedTemplateExpression: 'tag', MetaProperty: 'meta',
  Import: 'import', DebuggerStatement: 'debugger', WithStatement: 'with',
};
const T = {};
for (const v of new Set(Object.values(MARK))) T[v] = intern(v);
const T_TRUE = intern('true'), T_FALSE = intern('false'), T_UNDEF = intern('undef'), T_TUNDEF = intern('tundef'), T_TPL = intern('tpl'), T_CALL = T.call;

const isUndefStr = (n) => (n?.type === 'StringLiteral' && (n.value === 'undefined' || n.value === 'u'));
const keyName = (k) => (k.type === 'Identifier' ? k.name : k.type === 'StringLiteral' ? k.value : k.type === 'PrivateName' ? '#' + k.id.name : null);

export function tokenize(nodes, opts = {}) {
  const subst = opts.subst ?? null;
  const imports = opts.imports ?? null; // Map(Binding -> imported name), npm side
  const tok = [], bind = [], pos = [];
  const push = (t, b, p) => { tok.push(t); bind.push(b); pos.push(p); };
  const lit = (s, p) => push(intern(s), null, p);

  function ident(n, cls) {
    const o = n[OCC];
    if (!o) return lit('p:' + n.name, n.start); // property key, label, import name …
    const b = o.binding;
    if (b && !b.implicit) {
      const s = subst?.get(b);
      if (s !== undefined) push(s, null, n.start);
      else if (imports && b.kind === 'import') {
        // npm-side import binding: Bun turns it into a direct reference (ESM
        // dependency) or `ns.name` (CommonJS dependency); its local name is
        // not the exporter's, so it never votes
        push(T_I, null, n.start);
        const im = imports.get(b);
        if (im && im !== '*' && im !== 'default') lit('p:' + im, n.start);
      }
      else push(cls ?? (o.role === 'decl' && b.kind === 'param' ? T_IP : o.role === 'decl' && (b.kind === 'fnname' || b.kind === 'classname') ? T_IN : T_I), b, n.start);
      return;
    }
    if (n.name === 'undefined') push(T_UNDEF, null, n.start);
    else lit('g:' + n.name, n.start);
  }

  function children(n) {
    const kids = [];
    for (const k in n) {
      if (SKIP_KEYS.has(k)) continue;
      const v = n[k];
      if (Array.isArray(v)) { for (const x of v) if (x && typeof x.type === 'string') kids.push(x); }
      else if (v && typeof v.type === 'string') kids.push(v);
    }
    if (kids.length > 1) kids.sort((a, b) => a.start - b.start);
    for (const k of kids) visit(k);
  }

  function visit(n) {
    switch (n.type) {
      case 'Identifier':
        return ident(n);
      case 'StringLiteral':
        return lit('s:' + n.value.slice(0, 200), n.start);
      case 'NumericLiteral':
        return lit('n:' + n.value, n.start);
      case 'BigIntLiteral':
        return lit('b:' + n.value, n.start);
      case 'BooleanLiteral':
        return push(n.value ? T_TRUE : T_FALSE, null, n.start);
      case 'RegExpLiteral':
        return lit('r:' + n.pattern + '/' + n.flags, n.start);
      case 'TemplateLiteral':
        if (n.expressions.length === 0) return lit('s:' + (n.quasis[0].value.cooked ?? n.quasis[0].value.raw).slice(0, 200), n.start);
        push(T_TPL, null, n.start);
        {
          const parts = [...n.quasis, ...n.expressions].sort((a, b) => a.start - b.start);
          for (const p of parts) {
            if (p.type === 'TemplateElement') { const s = p.value.cooked ?? p.value.raw; if (s) lit('s:' + s.slice(0, 200), p.start); } else visit(p);
          }
        }
        return;
      case 'PrivateName':
        return lit('p:#' + n.id.name, n.start);
      case 'ObjectPattern':
        // `{key: id}` emits `id p:key`, as `const id = obj.key` would (Bun merges
        // such declarations into one destructuring)
        for (const p of n.properties) {
          const kn = p.type === 'ObjectProperty' && !p.computed && keyName(p.key);
          if (kn) { visit(p.value); lit('p:' + kn, p.key.start); } else visit(p);
        }
        return;
      case 'ImportDeclaration':
        return; // removed by the bundler
      case 'ExportNamedDeclaration':
        if (!n.declaration) return;
        return visit(n.declaration);
      case 'ExportAllDeclaration':
        return;
      case 'ExportDefaultDeclaration': {
        const d = n.declaration;
        if ((d.type === 'FunctionDeclaration' || d.type === 'ClassDeclaration') && d.id) return visit(d);
        // `export default expr` becomes `var X_default = expr` in the bundle (esbuild
        // naming): a pseudo binding stands for X_default on the npm side
        const base = d.type === 'Identifier' ? d.name : opts.defaultBase ?? 'module';
        push(T_I, { name: base + '_default', kind: 'var', decls: [{ start: n.start }], pseudo: true }, n.start);
        return visit(d);
      }
      case 'ExpressionStatement':
        if (n.expression.type === 'StringLiteral' && n.expression.value === 'use strict') return;
        return visit(n.expression);
      case 'UnaryExpression':
        if (n.operator === '!' && n.argument.type === 'NumericLiteral' && (n.argument.value === 0 || n.argument.value === 1)) return push(n.argument.value === 0 ? T_TRUE : T_FALSE, null, n.start);
        if (n.operator === 'void' && n.argument.type === 'NumericLiteral') return push(T_UNDEF, null, n.start);
        lit('u' + n.operator, n.start);
        return visit(n.argument);
      case 'BinaryExpression': {
        // typeof x === "undefined" / typeof x > "u" and mirrored forms
        const ty = n.left.type === 'UnaryExpression' && n.left.operator === 'typeof' ? n.left : n.right.type === 'UnaryExpression' && n.right.operator === 'typeof' ? n.right : null;
        const other = ty === n.left ? n.right : n.left;
        if (ty && isUndefStr(other) && /^(==|===|!=|!==|<|>)$/.test(n.operator)) {
          push(T_TUNDEF, null, n.start);
          return visit(ty.argument);
        }
        lit('o' + n.operator.replace(/^(===|!==)$/, (m) => m.slice(0, 2)), n.start);
        return children(n);
      }
      case 'LogicalExpression':
        lit('o' + n.operator, n.start);
        return children(n);
      case 'AssignmentExpression':
        // plain `x = …` emits no operator token, so `var x; … x = class {}` (Bun's
        // __esm lazy modules) reads like `const x = class {}`
        if (n.operator !== '=') lit('a' + n.operator, n.start);
        if (n.operator === '=' && n.left.type === 'Identifier' && isFnLike(n.right)) { ident(n.left, T_IF); return visit(n.right); }
        return children(n);
      case 'VariableDeclarator':
        if (n.id.type === 'Identifier' && isFnLike(n.init)) { ident(n.id, T_IF); return visit(n.init); }
        return children(n);
      case 'FunctionDeclaration':
      case 'ClassDeclaration':
        // name first, then the marker: `function f(){}` reads like `f = function(){}`
        if (!n.id) { push(T[MARK[n.type]], null, n.start); return children(n); }
        ident(n.id, T_IF);
        push(T[MARK[n.type]], null, n.id.start);
        for (const k of ['superClass', 'params', 'body']) {
          const v = n[k];
          if (Array.isArray(v)) v.forEach(visit);
          else if (v && typeof v.type === 'string') visit(v);
        }
        return;
      case 'UpdateExpression':
        lit('o' + n.operator, n.start);
        return visit(n.argument);
      case 'MemberExpression':
      case 'OptionalMemberExpression':
        visit(n.object);
        if (!n.computed) return n.property.type === 'Identifier' ? lit('p:' + n.property.name, n.property.start) : visit(n.property);
        if (n.property.type === 'StringLiteral') return lit('p:' + n.property.value, n.property.start);
        return visit(n.property);
      case 'ObjectProperty':
      case 'ObjectMethod':
      case 'ClassMethod':
      case 'ClassPrivateMethod':
      case 'ClassProperty':
      case 'ClassPrivateProperty':
      case 'ClassAccessorProperty': {
        if (MARK[n.type]) push(T[MARK[n.type]], null, n.start);
        const kn = !n.computed && keyName(n.key);
        if (kn != null && kn !== false) {
          lit('p:' + kn, n.key.start);
          for (const k of ['params', 'value', 'body']) {
            const v = n[k];
            if (Array.isArray(v)) v.forEach(visit);
            else if (v && typeof v.type === 'string') visit(v);
          }
          return;
        }
        return children(n);
      }
      case 'CallExpression':
        // npm side: require("x") → call + unbound wildcard, like Bun's require_x()
        if (n.callee.type === 'Identifier' && n.callee.name === 'require' && !n.callee[OCC]?.binding && n.arguments.length === 1 && n.arguments[0].type === 'StringLiteral') {
          push(T_CALL, null, n.start);
          push(T_I, null, n.callee.start);
          return;
        }
        push(T_CALL, null, n.start);
        return children(n);
      default:
        if (MARK[n.type]) push(T[MARK[n.type]], null, n.start);
        else if (!SILENT.has(n.type) && !/^(TS|Flow|JSX)/.test(n.type)) lit(n.type, n.start);
        return children(n);
    }
  }
  for (const n of nodes) visit(n);
  return { tok: Int32Array.from(tok), bind, pos: Int32Array.from(pos) };
}
