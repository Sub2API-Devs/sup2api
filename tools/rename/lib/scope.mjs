// 作用域分析器：对一个 ES 模块（严格模式）的 Babel AST 建立作用域树、绑定与引用。
// 改名（rename.mjs）与 α 校验（alpha.mjs）共用它；它独立于 @babel/traverse 的作用域实现，
// 并由 test/babel-diff.test.mjs 与 Babel 的作用域结果做差分核对。
//
// 用法：
//   import { analyze, OCC } from './scope.mjs'
//   const r = analyze(ast, source)
//   r.module            模块作用域（Scope）
//   r.bindings          全部绑定（Binding[]，含隐式 arguments）
//   r.occs              全部绑定相关标识符出现（{node, role:'decl'|'ref', binding, scope, ctx}）
//   r.globals           Map<name, occ[]>：解析不到任何绑定的引用（全局变量）
//   node[OCC]           出现记录挂在标识符节点上（Symbol 键，不影响遍历 / 比较）
//   node[NAME_ROLE]     非绑定但跨模块有意义的名字：{role:'exportName'|'importName', source?}
//
// 建模要点（全部基于严格模式语义；ESM 一律严格）：
//   - 函数：可选的函数表达式名作用域 → 参数作用域（params，非箭头函数含隐式 arguments）→ 函数体作用域（body）。
//     函数体里与参数同名的 var / 函数声明并入参数绑定（它们必须同名，并入是保守的）。
//   - 类声明的名字只建一个绑定（放在外层块作用域）；类表达式的名字放在类作用域。
//   - for (let/const …) 建循环作用域，for-in/of 的右侧表达式也在其中（TDZ 作用域）。
//   - catch 参数一个作用域，catch 体再一个块作用域；catch 块里 `var e` 与参数 e 同名（Annex B.3.5）
//     无法用单一绑定表示，两者都冻结（不改名）。
//   - 直接 eval（被调用者是解析为全局的 `eval` 标识符）：从调用处到模块作用域链上所有作用域的绑定全部冻结。
//   - 标签、属性名、私有名、import.meta 等不是绑定，不记录。
export const OCC = Symbol('occ');
export const NAME_ROLE = Symbol('nameRole');

export class Scope {
  constructor(kind, parent, node) {
    this.kind = kind; // module | fnname | params | body | block | for | switch | catch | class | static
    this.parent = parent;
    this.node = node;
    this.names = new Map(); // 原名 → Binding
    this.children = [];
    this.arrow = false;
    this.evalTainted = false;
    this.pre = 0;
    this.post = 0;
    if (parent) parent.children.push(this);
  }
}

export class Binding {
  constructor(name, scope, kind) {
    this.name = name;
    this.scope = scope;
    this.kind = kind; // var let const function class classname fnname param catch import implicit
    this.decls = []; // 声明标识符节点
    this.declOccs = [];
    this.refs = []; // 引用出现
    this.passOccs = []; // 语法位置不在绑定作用域里的声明出现（var 提升、函数体内与参数同名的 var / 函数）
    this.frozen = null; // 冻结原因（字符串）或 null
    this.implicit = false;
  }
  get key() {
    let m = Infinity;
    for (const d of this.decls) if (d.start < m) m = d.start;
    return m === Infinity ? null : '@' + m;
  }
}

const VAR_SCOPES = new Set(['module', 'body', 'static']);

// 只含表达式 / 语句子节点、本身不引入作用域也不含"非引用标识符"的节点：按字段名泛化遍历。
const GENERIC = {
  ExpressionStatement: ['expression'],
  IfStatement: ['test', 'consequent', 'alternate'],
  ReturnStatement: ['argument'],
  ThrowStatement: ['argument'],
  WhileStatement: ['test', 'body'],
  DoWhileStatement: ['body', 'test'],
  TryStatement: ['block', 'handler', 'finalizer'],
  LabeledStatement: ['body'],
  EmptyStatement: [],
  DebuggerStatement: [],
  BreakStatement: [],
  ContinueStatement: [],
  CallExpression: ['callee', 'arguments'],
  OptionalCallExpression: ['callee', 'arguments'],
  NewExpression: ['callee', 'arguments'],
  BinaryExpression: ['left', 'right'],
  LogicalExpression: ['left', 'right'],
  UnaryExpression: ['argument'],
  UpdateExpression: ['argument'],
  ConditionalExpression: ['test', 'consequent', 'alternate'],
  SequenceExpression: ['expressions'],
  ArrayExpression: ['elements'],
  SpreadElement: ['argument'],
  AwaitExpression: ['argument'],
  YieldExpression: ['argument'],
  TemplateLiteral: ['expressions'],
  TaggedTemplateExpression: ['tag', 'quasi'],
  ImportExpression: ['source', 'options'],
  ParenthesizedExpression: ['expression'],
  StringLiteral: [],
  NumericLiteral: [],
  BigIntLiteral: [],
  BooleanLiteral: [],
  NullLiteral: [],
  RegExpLiteral: [],
  DecimalLiteral: [],
  TemplateElement: [],
  ThisExpression: [],
  Super: [],
  MetaProperty: [],
  PrivateName: [],
};

class Analyzer {
  constructor(source) {
    this.source = source;
    this.scopes = [];
    this.bindings = [];
    this.occs = [];
    this.refOccs = [];
    this.evalCalls = [];
    this.importSpecs = []; // {spec, source, imported, importedRaw, binding(后填), localOcc}
    this.exportSpecs = []; // {spec, exported, exportedRaw, localOcc}
    this.exportDefault = false;
    this.exportDeclNames = [];
    this.dynImports = []; // {node, source: string|null, template: string|null}
    this.annexB = [];
    this.staticSources = []; // 静态 import / export-from 的来源字符串区间 [start, end)
    this.unsupported = [];
  }

  newScope(kind, parent, node) {
    const s = new Scope(kind, parent, node);
    this.scopes.push(s);
    return s;
  }

  occ(node, role, binding, scope, ctx) {
    const o = { node, role, binding, scope, ctx: ctx || null };
    node[OCC] = o;
    this.occs.push(o);
    if (role === 'ref') this.refOccs.push(o);
    else binding.declOccs.push(o);
    return o;
  }

  // scope = 绑定所在作用域；synScope = 声明标识符语法上所在的作用域（var 提升时二者不同）。
  declareIn(scope, id, kind, ctx, synScope) {
    let b = scope.names.get(id.name);
    if (!b) {
      b = new Binding(id.name, scope, kind);
      scope.names.set(id.name, b);
      this.bindings.push(b);
    }
    b.decls.push(id);
    const o = this.occ(id, 'decl', b, synScope || scope, ctx);
    if (synScope && synScope !== scope) b.passOccs.push(o);
    return o;
  }

  // var 声明与函数体顶层的函数声明：提升到最近的 var 作用域；函数体里与参数同名则并入参数绑定。
  declareVar(scope, id, kind, ctx) {
    let target = scope;
    while (!VAR_SCOPES.has(target.kind)) target = target.parent;
    for (let s = scope; s !== target; s = s.parent) {
      const other = s.names.get(id.name);
      if (other) {
        if (s.kind === 'catch' && other.kind === 'catch') {
          // Annex B.3.5：catch (e) { var e = … }。var 的初始化写的是 catch 参数，单一绑定无法表示，两边都冻结。
          other.frozen = 'annexB-catch-var';
          const o = this.declareVarFinal(target, id, kind, ctx, scope);
          o.binding.frozen = 'annexB-catch-var';
          this.annexB.push({ name: id.name, start: id.start });
          return o;
        }
        throw new Error(`var ${id.name} at ${id.start} hoists past a lexical binding (unexpected in valid code)`);
      }
    }
    return this.declareVarFinal(target, id, kind, ctx, scope);
  }

  declareVarFinal(target, id, kind, ctx, synScope) {
    if (target.kind === 'body' && target.parent.kind === 'params' && target.parent.names.has(id.name)) {
      return this.declareIn(target.parent, id, kind, ctx, synScope);
    }
    return this.declareIn(target, id, kind, ctx, synScope);
  }

  ref(id, scope, ctx) {
    const o = { node: id, role: 'ref', binding: null, scope, ctx: ctx || null };
    id[OCC] = o;
    this.occs.push(o);
    this.refOccs.push(o);
    return o;
  }

  // 模式：onId(id, ctx) 处理每个绑定标识符；默认值与计算键在 exprScope 里求值。
  pattern(p, exprScope, onId, ctx) {
    switch (p.type) {
      case 'Identifier':
        onId(p, ctx);
        return;
      case 'ObjectPattern':
        for (const prop of p.properties) {
          if (prop.type === 'RestElement') {
            this.pattern(prop.argument, exprScope, onId, null);
          } else {
            if (prop.computed) this.visit(prop.key, exprScope);
            const sh = prop.shorthand ? { kind: 'shorthand', keyRaw: this.source.slice(prop.key.start, prop.key.end) } : null;
            this.pattern(prop.value, exprScope, onId, sh);
          }
        }
        return;
      case 'ArrayPattern':
        for (const el of p.elements) if (el) this.pattern(el, exprScope, onId, null);
        return;
      case 'AssignmentPattern':
        this.pattern(p.left, exprScope, onId, ctx);
        this.visit(p.right, exprScope);
        return;
      case 'RestElement':
        this.pattern(p.argument, exprScope, onId, null);
        return;
      case 'MemberExpression':
      case 'OptionalMemberExpression':
      case 'ParenthesizedExpression':
        // 只会出现在赋值目标里
        this.visit(p, exprScope);
        return;
      default:
        throw new Error(`unsupported pattern ${p.type} at ${p.start}`);
    }
  }

  assignTarget(p, scope) {
    this.pattern(p, scope, (id, ctx) => this.ref(id, scope, ctx), null);
  }

  fn(node, scope) {
    let outer = scope;
    if (node.type === 'FunctionExpression' && node.id) {
      outer = this.newScope('fnname', scope, node);
      this.declareIn(outer, node.id, 'fnname');
    }
    const ps = this.newScope('params', outer, node);
    ps.arrow = node.type === 'ArrowFunctionExpression';
    for (const p of node.params) this.pattern(p, ps, (id, ctx) => this.declareIn(ps, id, 'param', ctx), null);
    const bs = this.newScope('body', ps, node);
    if (node.body.type === 'BlockStatement') this.stmts(node.body.body, bs);
    else this.visit(node.body, bs);
  }

  cls(node, scope) {
    const cs = this.newScope('class', scope, node);
    if (node.type === 'ClassExpression' && node.id) this.declareIn(cs, node.id, 'classname');
    if (node.superClass) this.visit(node.superClass, cs);
    for (const m of node.body.body) {
      switch (m.type) {
        case 'ClassMethod':
        case 'ClassPrivateMethod':
          if (m.computed) this.visit(m.key, cs);
          this.fn(m, cs);
          break;
        case 'ClassProperty':
        case 'ClassPrivateProperty':
        case 'ClassAccessorProperty':
          if (m.computed) this.visit(m.key, cs);
          if (m.value) this.visit(m.value, cs);
          break;
        case 'StaticBlock': {
          const ss = this.newScope('static', cs, m);
          this.stmts(m.body, ss);
          break;
        }
        default:
          throw new Error(`unsupported class member ${m.type} at ${m.start}`);
      }
    }
  }

  stmts(list, scope) {
    for (const s of list) this.visit(s, scope);
  }

  varDecl(node, scope, declScope) {
    for (const d of node.declarations) {
      if (node.kind === 'var') this.pattern(d.id, scope, (id, ctx) => this.declareVar(scope, id, 'var', ctx), null);
      else this.pattern(d.id, scope, (id, ctx) => this.declareIn(declScope || scope, id, node.kind, ctx), null);
      if (d.init) this.visit(d.init, scope);
    }
  }

  visit(node, scope) {
    if (!node) return;
    switch (node.type) {
      case 'Identifier':
        this.ref(node, scope, null);
        return;
      case 'BlockStatement': {
        const bs = this.newScope('block', scope, node);
        this.stmts(node.body, bs);
        return;
      }
      case 'VariableDeclaration':
        this.varDecl(node, scope);
        return;
      case 'FunctionDeclaration':
        if (node.id) {
          if (VAR_SCOPES.has(scope.kind)) this.declareVar(scope, node.id, 'function');
          else this.declareIn(scope, node.id, 'function');
        }
        this.fn(node, scope);
        return;
      case 'ClassDeclaration':
        if (node.id) this.declareIn(scope, node.id, 'class');
        this.cls(node, scope);
        return;
      case 'FunctionExpression':
      case 'ArrowFunctionExpression':
        this.fn(node, scope);
        return;
      case 'ClassExpression':
        this.cls(node, scope);
        return;
      case 'ForStatement': {
        let ls = scope;
        if (node.init && node.init.type === 'VariableDeclaration' && node.init.kind !== 'var') ls = this.newScope('for', scope, node);
        this.visit(node.init, ls);
        this.visit(node.test, ls);
        this.visit(node.update, ls);
        this.visit(node.body, ls);
        return;
      }
      case 'ForInStatement':
      case 'ForOfStatement': {
        const left = node.left;
        if (left.type === 'VariableDeclaration' && left.kind !== 'var') {
          const ls = this.newScope('for', scope, node);
          this.varDecl(left, ls);
          this.visit(node.right, ls);
          this.visit(node.body, ls);
        } else {
          if (left.type === 'VariableDeclaration') this.varDecl(left, scope);
          else this.assignTarget(left, scope);
          this.visit(node.right, scope);
          this.visit(node.body, scope);
        }
        return;
      }
      case 'SwitchStatement': {
        this.visit(node.discriminant, scope);
        const ss = this.newScope('switch', scope, node);
        for (const c of node.cases) {
          this.visit(c.test, ss);
          this.stmts(c.consequent, ss);
        }
        return;
      }
      case 'CatchClause': {
        const cs = this.newScope('catch', scope, node);
        if (node.param) this.pattern(node.param, cs, (id, ctx) => this.declareIn(cs, id, 'catch', ctx), null);
        this.visit(node.body, cs);
        return;
      }
      case 'MemberExpression':
      case 'OptionalMemberExpression':
        this.visit(node.object, scope);
        if (node.computed) this.visit(node.property, scope);
        return;
      case 'ObjectExpression':
        for (const p of node.properties) {
          if (p.type === 'ObjectProperty') {
            if (p.computed) this.visit(p.key, scope);
            if (p.shorthand && p.value.type === 'Identifier') {
              this.ref(p.value, scope, { kind: 'shorthand', keyRaw: this.source.slice(p.key.start, p.key.end) });
            } else this.visit(p.value, scope);
          } else if (p.type === 'ObjectMethod') {
            if (p.computed) this.visit(p.key, scope);
            this.fn(p, scope);
          } else if (p.type === 'SpreadElement') {
            this.visit(p.argument, scope);
          } else throw new Error(`unsupported object member ${p.type} at ${p.start}`);
        }
        return;
      case 'AssignmentExpression':
        if (node.left.type === 'ObjectPattern' || node.left.type === 'ArrayPattern') this.assignTarget(node.left, scope);
        else this.visit(node.left, scope);
        this.visit(node.right, scope);
        return;
      case 'CallExpression':
        if (node.callee.type === 'Identifier' && node.callee.name === 'eval') this.evalCalls.push({ node, scope });
        this.visit(node.callee, scope);
        for (const a of node.arguments) this.visit(a, scope);
        return;
      case 'ImportExpression': {
        const s = node.source;
        let lit = null;
        let template = null;
        if (s.type === 'StringLiteral') lit = s.value;
        else if (s.type === 'TemplateLiteral') template = s.quasis[0].value.cooked ?? '';
        this.dynImports.push({ start: node.start, source: lit, template });
        this.visit(node.source, scope);
        this.visit(node.options, scope);
        return;
      }
      case 'ImportDeclaration': {
        const source = node.source.value;
        this.staticSources.push([node.source.start, node.source.end]);
        for (const s of node.specifiers) {
          if (s.type === 'ImportSpecifier') {
            const importedName = s.imported.type === 'Identifier' ? s.imported.name : s.imported.value;
            s.imported[NAME_ROLE] = { role: 'importName', source };
            const o = this.declareIn(scope, s.local, 'import', { kind: 'importSpec', spec: s });
            this.importSpecs.push({ spec: s, source, imported: importedName, importedRaw: this.source.slice(s.imported.start, s.imported.end), importedIsIdent: s.imported.type === 'Identifier', localOcc: o });
          } else {
            const o = this.declareIn(scope, s.local, 'import', null);
            this.importSpecs.push({ spec: s, source, imported: s.type === 'ImportDefaultSpecifier' ? 'default' : '*', importedRaw: null, importedIsIdent: false, localOcc: o });
          }
        }
        return;
      }
      case 'ExportNamedDeclaration': {
        if (node.source) {
          this.staticSources.push([node.source.start, node.source.end]);
          this.unsupported.push({ what: 'export-from', start: node.start, source: node.source.value });
          for (const s of node.specifiers) {
            if (s.local) s.local[NAME_ROLE] = { role: 'importName', source: node.source.value };
            s.exported[NAME_ROLE] = { role: 'exportName' };
          }
          return;
        }
        if (node.declaration) {
          const d = node.declaration;
          this.visit(d, scope);
          const names = [];
          if (d.type === 'VariableDeclaration') for (const x of d.declarations) collectPatternIds(x.id, names);
          else if (d.id) names.push(d.id);
          for (const id of names) this.exportDeclNames.push(id.name);
          return;
        }
        for (const s of node.specifiers) {
          if (s.type !== 'ExportSpecifier') {
            this.unsupported.push({ what: s.type, start: s.start });
            continue;
          }
          const exported = s.exported.type === 'Identifier' ? s.exported.name : s.exported.value;
          s.exported[NAME_ROLE] = { role: 'exportName' };
          const o = this.ref(s.local, scope, { kind: 'exportSpec', spec: s });
          this.exportSpecs.push({ spec: s, exported, exportedRaw: this.source.slice(s.exported.start, s.exported.end), exportedIsIdent: s.exported.type === 'Identifier', localOcc: o });
        }
        return;
      }
      case 'ExportDefaultDeclaration': {
        this.exportDefault = true;
        const d = node.declaration;
        if (d.type === 'FunctionDeclaration') {
          if (d.id) this.declareIn(scope, d.id, 'function');
          this.fn(d, scope);
        } else if (d.type === 'ClassDeclaration') {
          if (d.id) this.declareIn(scope, d.id, 'class');
          this.cls(d, scope);
        } else this.visit(d, scope);
        return;
      }
      case 'ExportAllDeclaration':
        this.staticSources.push([node.source.start, node.source.end]);
        this.unsupported.push({ what: 'export-all', start: node.start, source: node.source.value });
        return;
      default: {
        const keys = GENERIC[node.type];
        if (!keys) throw new Error(`unsupported node type ${node.type} at ${node.start}`);
        for (const k of keys) {
          const v = node[k];
          if (Array.isArray(v)) {
            for (const x of v) if (x) this.visit(x, scope);
          } else if (v) this.visit(v, scope);
        }
      }
    }
  }

  implicitArguments(ps) {
    let b = ps.implicitArgs;
    if (!b) {
      b = new Binding('arguments', ps, 'implicit');
      b.implicit = true;
      b.frozen = 'implicit-arguments';
      ps.implicitArgs = b;
      this.bindings.push(b);
    }
    return b;
  }

  resolve() {
    const globals = new Map();
    for (const o of this.refOccs) {
      const name = o.node.name;
      let b = null;
      for (let s = o.scope; s; s = s.parent) {
        const x = s.names.get(name);
        if (x) {
          b = x;
          break;
        }
        if (name === 'arguments' && s.kind === 'params' && !s.arrow) {
          b = this.implicitArguments(s);
          break;
        }
      }
      o.binding = b;
      if (b) b.refs.push(o);
      else {
        let arr = globals.get(name);
        if (!arr) globals.set(name, (arr = []));
        arr.push(o);
      }
    }
    this.globals = globals;
    // 直接 eval：链上所有作用域的绑定冻结。
    this.directEvals = [];
    for (const e of this.evalCalls) {
      if (e.node.callee[OCC].binding !== null || e.node.optional) continue;
      this.directEvals.push(e.node.start);
      for (let s = e.scope; s; s = s.parent) {
        s.evalTainted = true;
        for (const b of s.names.values()) if (!b.frozen) b.frozen = 'direct-eval';
      }
    }
    // 导出声明（export var/function/class）：导出名与绑定名是同一个词，冻结。
    for (const n of this.exportDeclNames) {
      const b = this.module.names.get(n);
      if (b && !b.frozen) b.frozen = 'export-declaration';
    }
    // 前序 / 后序编号，用于"某作用域是否在另一个作用域的子树里"。
    let counter = 0;
    const stack = [[this.module, 0]];
    while (stack.length) {
      const top = stack[stack.length - 1];
      const [s, i] = top;
      if (i === 0) s.pre = counter++;
      if (i < s.children.length) {
        top[1]++;
        stack.push([s.children[i], 0]);
      } else {
        s.post = counter++;
        stack.pop();
      }
    }
  }
}

export function collectPatternIds(p, out) {
  if (!p) return out;
  switch (p.type) {
    case 'Identifier':
      out.push(p);
      break;
    case 'ObjectPattern':
      for (const x of p.properties) collectPatternIds(x.type === 'RestElement' ? x.argument : x.value, out);
      break;
    case 'ArrayPattern':
      for (const x of p.elements) collectPatternIds(x, out);
      break;
    case 'AssignmentPattern':
      collectPatternIds(p.left, out);
      break;
    case 'RestElement':
      collectPatternIds(p.argument, out);
      break;
  }
  return out;
}

// s 是否在 anc 的子树里（含 anc 自身）。
export function inSubtree(s, anc) {
  return s.pre >= anc.pre && s.post <= anc.post;
}

export function analyze(ast, source) {
  const a = new Analyzer(source);
  const program = ast.program;
  a.module = a.newScope('module', null, program);
  a.stmts(program.body, a.module);
  a.resolve();
  return {
    module: a.module,
    scopes: a.scopes,
    bindings: a.bindings,
    occs: a.occs,
    refOccs: a.refOccs,
    globals: a.globals,
    importSpecs: a.importSpecs,
    exportSpecs: a.exportSpecs,
    exportDefault: a.exportDefault,
    exportDeclNames: a.exportDeclNames,
    dynImports: a.dynImports,
    directEvals: a.directEvals,
    annexB: a.annexB,
    staticSources: a.staticSources,
    unsupported: a.unsupported,
  };
}
