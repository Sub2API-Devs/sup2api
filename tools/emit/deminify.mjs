// Semantics-preserving de-minification of one ES module (Babel AST transform).
//   import { deminifyCode } from './deminify.mjs'
//   const { code, stats, error } = deminifyCode(source, { unify: true, crossChunkAlias: true })
// Used by tools/emit/readable.mjs (every reading-tree file, before prettier) and by
// tools/emit/deminify-dir.mjs (to apply the very same transform to runnable/ and
// prove equivalence at run time). Rules and their equivalence arguments: docs/process/deminify.md.
//
// Passes (each on a fresh scope crawl):
//   1. unify     one local name per (module specifier, import attributes, imported name):
//                `import { join, join as join_2 }` -> `import { join }`, uses of join_2 -> join.
//                An alias is merged only if no use of it sits in a scope that binds the chosen
//                name; otherwise another existing alias name, then a fresh name, is tried.
//                crossChunkAlias: `const a = b; //@ cross-chunk alias` (reading tree only)
//                is dropped and uses of a become b, under the same shadowing check.
//   2. mark      `void 0` nodes where `undefined` resolves to the global (no binding named
//                `undefined` in any enclosing scope) and that are not a `delete` operand.
//   3. rewrite   expression rules (bool, void0, shorthand, typeof-u) and statement rules
//                (seq-stmt, seq-return, seq-throw, arrow-seq, seq-if-test, logical-stmt,
//                cond-stmt, split-decl).
// Comments stay attached to their nodes (Babel moves the comments of a replaced statement to
// the replacement), so the file header, JSDoc and `//@` provenance lines survive.
import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
import _generator from '@babel/generator';
import * as t from '@babel/types';

const traverse = _traverse.default ?? _traverse;
const generate = _generator.generate ?? _generator.default ?? _generator;

export const RULES = [
  'import-alias', // import specifiers merged into another one of the same import
  'import-alias-kept', // aliases that could not be merged (shadowing)
  'import-fresh-name', // groups that needed a fresh shared name
  'cross-chunk-alias', // `const a = b; //@ cross-chunk alias` removed
  'cross-chunk-alias-kept',
  'bool', // !0 / !1
  'void0', // void 0 -> undefined
  'void0-shadowed', // void 0 kept: `undefined` is bound locally, or delete operand
  'shorthand', // {a: a} / {a: a = 1}
  'typeof-u', // typeof x > "u"
  'seq-stmt', // a(), b();
  'seq-return', // return a(), b;
  'seq-throw', // throw a(), b;
  'arrow-seq', // () => (a(), b) -> () => { a(); return b; }
  'seq-if-test', // if (a(), b) … -> a(); if (b) …
  'seq-kept-string', // a bare string literal would become an expression statement (could read as a directive)
  'logical-stmt', // x && y(); / x || y();
  'cond-stmt', // c ? a() : b();
  'split-decl', // let a = 1, b = 2;
  'braces-added', // a rewrite in a non-list statement position got wrapped in { }
  'comments-lost', // input comments no longer attached to any node (must stay 0)
];
export function newStats() {
  return Object.fromEntries(RULES.map((r) => [r, 0]));
}
export function addStats(into, s) {
  for (const [k, v] of Object.entries(s)) into[k] = (into[k] ?? 0) + v;
  return into;
}

export function parseModule(code) {
  return parse(code, { sourceType: 'module', plugins: ['jsx'], errorRecovery: false });
}

export function deminifyCode(code, opts = {}) {
  const stats = newStats();
  let ast;
  try {
    ast = parseModule(code);
  } catch (e) {
    return { code, stats, error: e.message };
  }
  deminifyAst(ast, code, stats, opts);
  // Leading whitespace is kept: Bun honours a `// @bun` pragma only at byte 0, and
  // original/cli.js starts with "\n// @bun @bytecode" (so the pragma is inactive there).
  const out = code.match(/^\s*/)[0] + print(ast);
  return { code: out.endsWith('\n') ? out : out + '\n', stats };
}

// Babel's printer drops the parentheses of a right-nested chain of the same logical
// operator (`a && (b && c)` -> `a && b && c`). That is the same value and the same
// short-circuit order (&&, || and ?? are associative), but a different tree; explicit
// parentheses keep the original grouping, so the printed module re-parses to the same AST.
function print(ast) {
  forEachNode(ast.program, (n) => {
    if (t.isLogicalExpression(n) && t.isLogicalExpression(n.right) && n.right.operator === n.operator) n.right = t.parenthesizedExpression(n.right);
  });
  return generate(ast, { comments: true }).code;
}

// Printer check: parse -> generate (no rule applied) -> parse must give the same AST
// (ignoring positions, comments and `extra`), i.e. the Babel printer itself changes no
// structure. Returns null or the path of the first difference.
const IGNORED_KEYS = new Set(['start', 'end', 'loc', 'range', 'extra', 'leadingComments', 'trailingComments', 'innerComments', 'comments', 'tokens', 'errors']);
export function printerRoundTrip(code) {
  const a = parseModule(code);
  const b = parseModule(print(a));
  return astDiff(unwrapSlotBlocks(a.program), unwrapSlotBlocks(b.program), '$');
}
// The printer wraps an if's consequent in braces when its last statement is an if
// (`if (a) { if (b) c(); else d(); } else e();`, avoiding any dangling-else reading). A
// block holding one non-lexical statement in such a slot means the statement itself.
function unwrapSlotBlocks(root) {
  forEachNode(root, (n) => {
    for (const k of SLOT_KEYS[n.type] ?? []) {
      const b = n[k];
      if (t.isBlockStatement(b) && b.body.length === 1 && !isLexical(b.body[0]) && !b.directives?.length) n[k] = b.body[0];
    }
  });
  return root;
}
export function astDiff(x, y, at) {
  if (x === y) return null;
  // print() adds ParenthesizedExpression nodes to the tree it prints; they are transparent
  while (x?.type === 'ParenthesizedExpression') x = x.expression;
  while (y?.type === 'ParenthesizedExpression') y = y.expression;
  if (typeof x !== 'object' || typeof y !== 'object' || x === null || y === null) return Object.is(x, y) ? null : at;
  if (Array.isArray(x) !== Array.isArray(y)) return at;
  if (Array.isArray(x)) {
    if (x.length !== y.length) return at + '.length';
    for (let i = 0; i < x.length; i++) { const d = astDiff(x[i], y[i], at + '[' + i + ']'); if (d) return d; }
    return null;
  }
  const keys = new Set([...Object.keys(x), ...Object.keys(y)]);
  for (const k of keys) {
    if (IGNORED_KEYS.has(k)) continue;
    // `shorthand` is only a printing hint ({a} vs {a: a}, {a = 1} vs {a: a = 1}; the printer
    // writes the latter as the former), except for __proto__ in object literals
    if (k === 'shorthand' && !(x.key?.name === '__proto__' || x.key?.value === '__proto__')) continue;
    const d = astDiff(x[k], y[k], at + '.' + k + (k === 'type' ? '' : x.type ? '<' + x.type + '>' : ''));
    if (d) return d;
  }
  return null;
}

export function deminifyAst(ast, code, stats = newStats(), { unify = true, crossChunkAlias = false } = {}) {
  if (unify) {
    traverse.cache.clear();
    unifyImports(ast, code, stats, crossChunkAlias);
  }
  traverse.cache.clear();
  const safeVoid = markVoid(ast, stats);
  traverse.cache.clear();
  traverse(ast, rewriteVisitor(stats, safeVoid));
  traverse.cache.clear();
  detachOwnLineComments(ast);
  // every comment of the input must still be attached to some node (the generator prints
  // each attached comment object once); only the removed cross-chunk alias markers go
  const attached = new Set();
  forEachNode(ast.program, (n) => {
    for (const k of ['leadingComments', 'trailingComments', 'innerComments']) if (n[k]) for (const c of n[k]) attached.add(c);
  });
  for (const c of ast.comments ?? []) if (!attached.has(c) && !/^@ cross-chunk alias/.test(c.value)) stats['comments-lost']++;
  return stats;
}

function forEachNode(root, fn) {
  const stack = [root];
  while (stack.length) {
    const n = stack.pop();
    if (!n || typeof n.type !== 'string') continue;
    fn(n);
    for (const k of t.VISITOR_KEYS[n.type] ?? []) {
      const v = n[k];
      if (Array.isArray(v)) for (const x of v) stack.push(x);
      else stack.push(v);
    }
  }
}

// A comment between two statements is both a trailing comment of the first and a leading
// comment of the second. When the first is replaced, Babel copies its trailing comments to
// the (location-less) replacement, and the generator then prints them at the end of that
// line; a `//@` provenance line would no longer start a line. Such shared comments are left
// to the following node only.
function detachOwnLineComments(ast) {
  const leading = new Set();
  const withTrailing = [];
  forEachNode(ast.program, (n) => {
    if (n.leadingComments) for (const c of n.leadingComments) leading.add(c);
    if (n.trailingComments?.length && !n.loc) withTrailing.push(n);
  });
  for (const n of withTrailing) n.trailingComments = n.trailingComments.filter((c) => !leading.has(c));
}

// ---------- pass 1: one local name per import ----------
const SUFFIX = /_(\d+)$/;
function importedName(s) {
  if (t.isImportNamespaceSpecifier(s)) return '*';
  if (t.isImportDefaultSpecifier(s)) return 'default';
  return s.imported.type === 'Identifier' ? s.imported.name : s.imported.value;
}
const attrKey = (d) => JSON.stringify((d.attributes ?? []).map((a) => [a.key.name ?? a.key.value, a.value.value]));

function renameRefs(binding, to) {
  for (const r of [...binding.referencePaths, ...binding.constantViolations]) {
    const n = r.node;
    if (t.isIdentifier(n) || t.isJSXIdentifier(n)) {
      if (r.parentPath.isObjectProperty({ shorthand: true }) && r.key === 'value') r.parent.shorthand = false;
      n.name = to;
    } else {
      // assignment target etc.: rename every binding identifier of it that is this binding
      for (const id of Object.values(r.getBindingIdentifiers(true)).flat()) if (id.name === binding.identifier.name) id.name = to;
    }
  }
}
// Would renaming the uses of `binding` to `name` make some use resolve to something else?
function capturedUses(binding, name, target) {
  let n = 0;
  for (const r of [...binding.referencePaths, ...binding.constantViolations]) {
    const b = r.scope.getBinding(name);
    if (b !== target) n++;
  }
  return n;
}

function unifyImports(ast, code, stats, crossChunkAlias) {
  let wordsInFile = null;
  const freeName = (base) => {
    if (!wordsInFile) wordsInFile = new Set(code.match(/[A-Za-z_$][\w$]*/g));
    for (let i = 2; ; i++) if (!wordsInFile.has(base + '_' + i)) { wordsInFile.add(base + '_' + i); return base + '_' + i; }
  };
  traverse(ast, {
    Program(p) {
      const groups = new Map();
      for (const d of p.get('body')) {
        if (!d.isImportDeclaration()) continue;
        for (const s of d.get('specifiers')) {
          const k = d.node.source.value + '\0' + attrKey(d.node) + '\0' + importedName(s.node);
          if (!groups.has(k)) groups.set(k, []);
          groups.get(k).push(s);
        }
      }
      const removed = new Set();
      for (const list of groups.values()) {
        const specs = list.filter((s, i) => list.findIndex((x) => x.node.local.name === s.node.local.name) === i);
        if (specs.length < 2) continue;
        const imported = importedName(specs[0].node);
        const base = /^[A-Za-z_$][\w$]*$/.test(imported) ? imported : specs[0].node.local.name.replace(SUFFIX, '');
        const rank = (s) => {
          const nm = s.node.local.name;
          if (nm === imported) return [0, 0, nm];
          const m = SUFFIX.exec(nm);
          if (m && nm.slice(0, m.index) === base) return [1, +m[1], nm];
          return [2, nm.length, nm];
        };
        const order = [...specs].sort((a, b) => {
          const x = rank(a), y = rank(b);
          return x[0] - y[0] || x[1] - y[1] || (x[2] < y[2] ? -1 : x[2] > y[2] ? 1 : 0);
        });
        const bindingOf = (s) => p.scope.getBinding(s.node.local.name);
        let chosen = null;
        for (const c of order) {
          const target = bindingOf(c);
          if (specs.every((s) => s === c || !capturedUses(bindingOf(s), c.node.local.name, target))) { chosen = c; break; }
        }
        let freshName = null;
        if (!chosen) {
          // a name used nowhere in the file: no use can be captured by it
          freshName = freeName(base);
          chosen = order[0];
          stats['import-fresh-name']++;
        }
        const keepName = freshName ?? chosen.node.local.name;
        for (const s of specs) {
          const b = bindingOf(s);
          if (s === chosen) {
            if (freshName) { renameRefs(b, freshName); s.node.local = t.identifier(freshName); }
            continue;
          }
          renameRefs(b, keepName);
          removed.add(s.node);
          stats['import-alias']++;
        }
      }
      for (const d of p.node.body) {
        if (!t.isImportDeclaration(d) || !d.specifiers.some((s) => removed.has(s))) continue;
        // a declaration left without specifiers stays as `import "x"` (same evaluation order)
        d.specifiers = d.specifiers.filter((s) => !removed.has(s));
      }
      if (crossChunkAlias) mergeCrossChunkAliases(p, code, stats);
      p.stop();
    },
  });
}

// `const a = b; //@ cross-chunk alias` lines written by readable.mjs when an import of
// another chunk resolves to a declaration in the same output module.
function mergeCrossChunkAliases(p, code, stats) {
  const body = p.get('body');
  for (let i = 0; i < body.length; i++) {
    const d = body[i];
    if (!d.isVariableDeclaration({ kind: 'const' }) || d.node.declarations.length !== 1) continue;
    const decl = d.node.declarations[0];
    if (!t.isIdentifier(decl.id) || !t.isIdentifier(decl.init)) continue;
    const lineEnd = code.indexOf('\n', d.node.end);
    if (!/^\s*\/\/@ cross-chunk alias/.test(code.slice(d.node.end, lineEnd < 0 ? undefined : lineEnd))) continue;
    const a = p.scope.getBinding(decl.id.name);
    const target = p.scope.getBinding(decl.init.name);
    if (!a || !target || target.scope !== p.scope || a.constantViolations.length || capturedUses(a, decl.init.name, target)) {
      stats['cross-chunk-alias-kept']++;
      continue;
    }
    renameRefs(a, decl.init.name);
    const next = body[i + 1]?.node;
    if (next?.leadingComments) next.leadingComments = next.leadingComments.filter((c) => !/^@ cross-chunk alias/.test(c.value));
    d.node.trailingComments = null;
    d.node.leadingComments = null;
    p.node.body[p.node.body.indexOf(d.node)] = null;
    stats['cross-chunk-alias']++;
  }
  p.node.body = p.node.body.filter(Boolean);
}

// ---------- pass 2: which `void 0` may become `undefined` ----------
function markVoid(ast, stats) {
  const safe = new WeakSet();
  traverse(ast, {
    UnaryExpression(path) {
      const n = path.node;
      if (n.operator !== 'void' || !t.isNumericLiteral(n.argument) || n.argument.value !== 0) return;
      // `delete undefined` is a SyntaxError in strict code; a local `undefined` would capture it
      if (path.parentPath.isUnaryExpression({ operator: 'delete' }) || path.scope.getBinding('undefined')) {
        stats['void0-shadowed']++;
        return;
      }
      safe.add(n);
    },
  });
  return safe;
}

// ---------- pass 3: rewrites ----------
const LIST_PARENTS = new Set(['Program', 'BlockStatement', 'SwitchCase', 'StaticBlock']);
function inStatementList(path) {
  return Array.isArray(path.container) && LIST_PARENTS.has(path.parent.type) && (path.listKey === 'body' || path.listKey === 'consequent');
}
const isBareString = (e) => t.isStringLiteral(e);

function rewriteVisitor(stats, safeVoid) {
  // replace a statement by several; outside a statement list they go into a block
  const replaceStatement = (path, nodes) => {
    if (inStatementList(path)) path.replaceWithMultiple(nodes);
    else {
      path.replaceWith(t.blockStatement(nodes));
      stats['braces-added']++;
    }
  };
  // a new `if` as the consequent of an `if` gets braces (no dangling else)
  const replaceWithIf = (path, ifNode) => {
    if (path.parentPath.isIfStatement() && path.key === 'consequent') {
      path.replaceWith(t.blockStatement([ifNode]));
      stats['braces-added']++;
    } else path.replaceWith(ifNode);
  };
  const negate = (e) => (t.isUnaryExpression(e, { operator: '!' }) ? e.argument : t.unaryExpression('!', e));
  return {
    UnaryExpression(path) {
      const n = path.node;
      if (n.operator === '!' && t.isNumericLiteral(n.argument) && (n.argument.value === 0 || n.argument.value === 1)) {
        path.replaceWith(t.booleanLiteral(n.argument.value === 0));
        stats.bool++;
      } else if (n.operator === 'void' && safeVoid.has(n)) {
        path.replaceWith(t.identifier('undefined'));
        stats.void0++;
      }
    },
    ObjectProperty(path) {
      const n = path.node;
      if (n.computed || n.shorthand || !t.isIdentifier(n.key) || n.key.name === '__proto__') return;
      if (t.isIdentifier(n.value) && n.value.name === n.key.name) {
        n.shorthand = true;
        stats.shorthand++;
      } else if (path.parentPath.isObjectPattern() && t.isAssignmentPattern(n.value) && t.isIdentifier(n.value.left) && n.value.left.name === n.key.name) {
        n.shorthand = true;
        stats.shorthand++;
      }
    },
    BinaryExpression(path) {
      const n = path.node;
      if (!['<', '>', '<=', '>='].includes(n.operator)) return;
      const isU = (e) => t.isStringLiteral(e, { value: 'u' });
      const isTypeof = (e) => t.isUnaryExpression(e, { operator: 'typeof' });
      let operand, isUndefined;
      if (isTypeof(n.left) && isU(n.right)) {
        operand = n.left;
        isUndefined = n.operator[0] === '>';
      } else if (isU(n.left) && isTypeof(n.right)) {
        operand = n.right;
        isUndefined = n.operator[0] === '<';
      } else return;
      path.replaceWith(t.binaryExpression(isUndefined ? '===' : '!==', operand, t.stringLiteral('undefined')));
      stats['typeof-u']++;
    },
    ExpressionStatement(path) {
      const e = path.node.expression;
      if (t.isSequenceExpression(e)) {
        if (e.expressions.some(isBareString)) { stats['seq-kept-string']++; return; }
        stats['seq-stmt']++;
        replaceStatement(path, e.expressions.map((x) => t.expressionStatement(x)));
      } else if (t.isLogicalExpression(e) && (e.operator === '&&' || e.operator === '||')) {
        stats['logical-stmt']++;
        replaceWithIf(path, t.ifStatement(e.operator === '&&' ? e.left : negate(e.left), t.expressionStatement(e.right)));
      } else if (t.isConditionalExpression(e)) {
        stats['cond-stmt']++;
        replaceWithIf(path, t.ifStatement(e.test, t.expressionStatement(e.consequent), t.expressionStatement(e.alternate)));
      }
    },
    IfStatement(path) {
      const e = path.node.test;
      if (!t.isSequenceExpression(e)) return;
      if (e.expressions.slice(0, -1).some(isBareString)) { stats['seq-kept-string']++; return; }
      const xs = [...e.expressions];
      const last = xs.pop();
      stats['seq-if-test']++;
      const n = t.ifStatement(last, path.node.consequent, path.node.alternate);
      replaceStatement(path, [...xs.map((x) => t.expressionStatement(x)), n]);
    },
    ArrowFunctionExpression(path) {
      const e = path.node.body;
      if (!t.isSequenceExpression(e)) return;
      // a leading string statement in the new block body would be a directive
      if (e.expressions.slice(0, -1).some(isBareString)) { stats['seq-kept-string']++; return; }
      const xs = [...e.expressions];
      const last = xs.pop();
      stats['arrow-seq']++;
      path.get('body').replaceWith(t.blockStatement([...xs.map((x) => t.expressionStatement(x)), t.returnStatement(last)]));
    },
    'ReturnStatement|ThrowStatement'(path) {
      const e = path.node.argument;
      if (!t.isSequenceExpression(e)) return;
      // only the expressions that become expression statements matter (`return a(), "x"` is fine)
      if (e.expressions.slice(0, -1).some(isBareString)) { stats['seq-kept-string']++; return; }
      const xs = [...e.expressions];
      const last = xs.pop();
      stats[path.isReturnStatement() ? 'seq-return' : 'seq-throw']++;
      replaceStatement(path, [...xs.map((x) => t.expressionStatement(x)), path.isReturnStatement() ? t.returnStatement(last) : t.throwStatement(last)]);
    },
    VariableDeclaration(path) {
      const n = path.node;
      if (n.declarations.length < 2 || !['var', 'let', 'const'].includes(n.kind)) return;
      const parts = n.declarations.map((d) => t.variableDeclaration(n.kind, [d]));
      if (inStatementList(path)) {
        stats['split-decl']++;
        path.replaceWithMultiple(parts);
      } else if (n.kind === 'var' && path.parentPath.isStatement() && !path.parentPath.isFor() && !path.parentPath.isForXStatement() && !path.parentPath.isExportNamedDeclaration()) {
        // `if (c) …; else var a = 1, b = 2;` — a var in a block binds the same function-scoped names
        stats['split-decl']++;
        replaceStatement(path, parts);
      }
    },
  };
}

// ---------- equivalence check: canonical form ----------
// canonicalize(ast) maps a module to a normal form in which every deminify rule is the
// identity: import references become "$import:<source>|<attributes>|<imported>" and import
// specifier lists are dropped, `true`/`false` -> `!0`/`!1`, global `undefined` -> `void 0`,
// `typeof x === "undefined"` (and the < > <= >= "u" spellings) -> `typeof x > "u"`,
// statement-level sequences / return / throw sequences, sequence if tests and arrow bodies
// that are sequences become statement lists,
// declarations get one declarator each, statement-level && / || / ?: become ifs, if tests
// lose double negations, and a non-list statement slot holding one statement is that
// statement (else a block). Every one of these steps preserves meaning on its own (same
// arguments as the rules, docs/process/deminify.md), so equal canonical forms of input and
// output mean the output has the same meaning; unlike the runtime comparison this covers
// every line, executed or not.
export function equivalentByCanon(inputCode, outputCode) {
  const a = canonicalize(parseModule(inputCode));
  const b = canonicalize(parseModule(outputCode));
  return astDiff(a.program, b.program, '$');
}

export function canonicalize(ast) {
  traverse.cache.clear();
  traverse(ast, {
    Program(p) {
      for (const d of p.get('body')) {
        if (!d.isImportDeclaration()) continue;
        for (const s of d.get('specifiers')) {
          const canon = '$import:' + d.node.source.value + '|' + attrKey(d.node) + '|' + importedName(s.node);
          const b = p.scope.getBinding(s.node.local.name);
          for (const r of b.referencePaths) {
            if (t.isIdentifier(r.node) || t.isJSXIdentifier(r.node)) r.node.name = canon;
          }
        }
        d.node.specifiers = [];
      }
    },
    Identifier(path) {
      if (path.node.name === 'undefined' && path.isReferencedIdentifier() && !path.scope.getBinding('undefined') && !path.parentPath.isUnaryExpression({ operator: 'delete' })) {
        path.replaceWith(t.unaryExpression('void', t.numericLiteral(0)));
        path.skip();
      }
    },
  });
  traverse.cache.clear();
  canonNode(ast.program);
  return ast;
}

const isNotNot = (e) => t.isUnaryExpression(e, { operator: '!' }) && t.isUnaryExpression(e.argument, { operator: '!' });
function normTest(e) {
  while (isNotNot(e)) e = e.argument.argument;
  return e;
}
const LIST_KEYS = { Program: 'body', BlockStatement: 'body', StaticBlock: 'body', SwitchCase: 'consequent' };
const SLOT_KEYS = { IfStatement: ['consequent', 'alternate'], ForStatement: ['body'], ForInStatement: ['body'], ForOfStatement: ['body'], WhileStatement: ['body'], DoWhileStatement: ['body'], LabeledStatement: ['body'], WithStatement: ['body'] };
const isLexical = (s) => t.isVariableDeclaration(s) ? s.kind !== 'var' : t.isClassDeclaration(s) || t.isFunctionDeclaration(s);

function canonExpr(n) {
  if (t.isBooleanLiteral(n)) return t.unaryExpression('!', t.numericLiteral(n.value ? 0 : 1));
  if (t.isBinaryExpression(n)) {
    const isTypeof = (e) => t.isUnaryExpression(e, { operator: 'typeof' });
    const isU = (e) => t.isStringLiteral(e, { value: 'u' });
    const isUndef = (e) => t.isStringLiteral(e, { value: 'undefined' });
    let operand = null, undef;
    if (isTypeof(n.left) && isU(n.right) && ['<', '>', '<=', '>='].includes(n.operator)) { operand = n.left; undef = n.operator[0] === '>'; }
    else if (isU(n.left) && isTypeof(n.right) && ['<', '>', '<=', '>='].includes(n.operator)) { operand = n.right; undef = n.operator[0] === '<'; }
    else if (isTypeof(n.left) && isUndef(n.right) && (n.operator === '===' || n.operator === '!==')) { operand = n.left; undef = n.operator === '==='; }
    if (operand) return t.binaryExpression(undef ? '>' : '<', operand, t.stringLiteral('u'));
  }
  return n;
}

function canonNode(n) {
  if (!n || typeof n.type !== 'string') return n;
  for (const k of t.VISITOR_KEYS[n.type] ?? []) {
    const v = n[k];
    if (Array.isArray(v)) for (let i = 0; i < v.length; i++) v[i] = canonNode(v[i]);
    else if (v && typeof v.type === 'string') n[k] = canonNode(v);
  }
  if (t.isArrowFunctionExpression(n) && t.isSequenceExpression(n.body)) n.body = t.blockStatement(canonStmt(t.returnStatement(n.body)));
  if (LIST_KEYS[n.type] && Array.isArray(n[LIST_KEYS[n.type]])) n[LIST_KEYS[n.type]] = canonList(n[LIST_KEYS[n.type]]);
  for (const k of SLOT_KEYS[n.type] ?? []) if (n[k]) n[k] = single(n[k]);
  if (t.isIfStatement(n)) n.test = normTest(n.test);
  return canonExpr(n);
}
function canonList(list) {
  return list.flatMap(canonStmt);
}
function single(s) {
  const L = t.isBlockStatement(s) ? canonList(s.body) : canonStmt(s);
  return L.length === 1 && !isLexical(L[0]) ? L[0] : t.blockStatement(L);
}
// one statement (children already canonical) -> canonical statement list
function canonStmt(s) {
  if (t.isExpressionStatement(s)) {
    const e = s.expression;
    if (t.isSequenceExpression(e)) return e.expressions.flatMap((x) => canonStmt(t.expressionStatement(x)));
    if (t.isLogicalExpression(e) && (e.operator === '&&' || e.operator === '||'))
      return [ifOf(e.operator === '&&' ? e.left : t.unaryExpression('!', e.left), t.expressionStatement(e.right), null)];
    if (t.isConditionalExpression(e)) return [ifOf(e.test, t.expressionStatement(e.consequent), t.expressionStatement(e.alternate))];
    return [s];
  }
  if ((t.isReturnStatement(s) || t.isThrowStatement(s)) && t.isSequenceExpression(s.argument)) {
    const xs = [...s.argument.expressions];
    const last = xs.pop();
    return [...xs.flatMap((x) => canonStmt(t.expressionStatement(x))), t.isReturnStatement(s) ? t.returnStatement(last) : t.throwStatement(last)];
  }
  if (t.isVariableDeclaration(s) && s.declarations.length > 1 && ['var', 'let', 'const'].includes(s.kind)) return s.declarations.map((d) => t.variableDeclaration(s.kind, [d]));
  if (t.isIfStatement(s) && t.isSequenceExpression(s.test)) {
    const xs = [...s.test.expressions];
    const last = xs.pop();
    return [...xs.flatMap((x) => canonStmt(t.expressionStatement(x))), ifOf(last, s.consequent, s.alternate)];
  }
  if (t.isIfStatement(s)) return [ifOf(s.test, s.consequent, s.alternate)];
  return [s];
}
function ifOf(test, consequent, alternate) {
  return t.ifStatement(normTest(test), single(consequent), alternate ? single(alternate) : null);
}
