/**
 * ajv/dist/compile/codegen/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-xcs4sv9h.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_code } from "./code.js";
import { require_scope } from "./scope.js";

//@ chunk-xcs4sv9h.js:5426-17192 cjs-fingerprint
var require_codegen_2 = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.or =
    cjsExports.and =
    cjsExports.not =
    cjsExports.CodeGen =
    cjsExports.operators =
    cjsExports.varKinds =
    cjsExports.ValueScopeName =
    cjsExports.ValueScope =
    cjsExports.Scope =
    cjsExports.Name =
    cjsExports.regexpCode =
    cjsExports.stringify =
    cjsExports.getProperty =
    cjsExports.nil =
    cjsExports.strConcat =
    cjsExports.str =
    cjsExports._ =
      undefined;
  var code_1 = require_code();
  var scope_1 = require_scope();
  var code_2 = require_code();
  Object.defineProperty(cjsExports, "_", {
    enumerable: true,
    get: function () {
      return code_2._;
    },
  });
  Object.defineProperty(cjsExports, "str", {
    enumerable: true,
    get: function () {
      return code_2.str;
    },
  });
  Object.defineProperty(cjsExports, "strConcat", {
    enumerable: true,
    get: function () {
      return code_2.strConcat;
    },
  });
  Object.defineProperty(cjsExports, "nil", {
    enumerable: true,
    get: function () {
      return code_2.nil;
    },
  });
  Object.defineProperty(cjsExports, "getProperty", {
    enumerable: true,
    get: function () {
      return code_2.getProperty;
    },
  });
  Object.defineProperty(cjsExports, "stringify", {
    enumerable: true,
    get: function () {
      return code_2.stringify;
    },
  });
  Object.defineProperty(cjsExports, "regexpCode", {
    enumerable: true,
    get: function () {
      return code_2.regexpCode;
    },
  });
  Object.defineProperty(cjsExports, "Name", {
    enumerable: true,
    get: function () {
      return code_2.Name;
    },
  });
  var scope_2 = require_scope();
  Object.defineProperty(cjsExports, "Scope", {
    enumerable: true,
    get: function () {
      return scope_2.Scope;
    },
  });
  Object.defineProperty(cjsExports, "ValueScope", {
    enumerable: true,
    get: function () {
      return scope_2.ValueScope;
    },
  });
  Object.defineProperty(cjsExports, "ValueScopeName", {
    enumerable: true,
    get: function () {
      return scope_2.ValueScopeName;
    },
  });
  Object.defineProperty(cjsExports, "varKinds", {
    enumerable: true,
    get: function () {
      return scope_2.varKinds;
    },
  });
  cjsExports.operators = {
    GT: new code_1._Code(">"),
    GTE: new code_1._Code(">="),
    LT: new code_1._Code("<"),
    LTE: new code_1._Code("<="),
    EQ: new code_1._Code("==="),
    NEQ: new code_1._Code("!=="),
    NOT: new code_1._Code("!"),
    OR: new code_1._Code("||"),
    AND: new code_1._Code("&&"),
    ADD: new code_1._Code("+"),
  };
  class Node {
    optimizeNodes() {
      return this;
    }
    optimizeNames(_names, _constants) {
      return this;
    }
  }
  class Def extends Node {
    constructor(varKind, name, rhs) {
      super();
      this.varKind = varKind;
      this.name = name;
      this.rhs = rhs;
    }
    render({ es5, _n }) {
      let varKind = es5 ? scope_1.varKinds.var : this.varKind;
      let rhs = this.rhs === undefined ? "" : ` = ${this.rhs}`;
      return `${varKind} ${this.name}${rhs};` + _n;
    }
    optimizeNames(names, constants) {
      if (!names[this.name.str]) return;
      if (this.rhs) this.rhs = optimizeExpr(this.rhs, names, constants);
      return this;
    }
    get names() {
      return this.rhs instanceof code_1._CodeOrName ? this.rhs.names : {};
    }
  }
  class Assign extends Node {
    constructor(lhs, rhs, sideEffects) {
      super();
      this.lhs = lhs;
      this.rhs = rhs;
      this.sideEffects = sideEffects;
    }
    render({ _n }) {
      return `${this.lhs} = ${this.rhs};` + _n;
    }
    optimizeNames(names, constants) {
      if (this.lhs instanceof code_1.Name && !names[this.lhs.str] && !this.sideEffects) return;
      this.rhs = optimizeExpr(this.rhs, names, constants);
      return this;
    }
    get names() {
      let names =
        this.lhs instanceof code_1.Name
          ? {}
          : {
              ...this.lhs.names,
            };
      return addExprNames(names, this.rhs);
    }
  }
  class AssignOp extends Assign {
    constructor(lhs, op, rhs, sideEffects) {
      super(lhs, rhs, sideEffects);
      this.op = op;
    }
    render({ _n }) {
      return `${this.lhs} ${this.op}= ${this.rhs};` + _n;
    }
  }
  class Label extends Node {
    constructor(label) {
      super();
      this.label = label;
      this.names = {};
    }
    render({ _n }) {
      return `${this.label}:` + _n;
    }
  }
  class Break extends Node {
    constructor(label) {
      super();
      this.label = label;
      this.names = {};
    }
    render({ _n }) {
      return `break${this.label ? ` ${this.label}` : ""};` + _n;
    }
  }
  class Throw extends Node {
    constructor(error) {
      super();
      this.error = error;
    }
    render({ _n }) {
      return `throw ${this.error};` + _n;
    }
    get names() {
      return this.error.names;
    }
  }
  class AnyCode extends Node {
    constructor(code) {
      super();
      this.code = code;
    }
    render({ _n }) {
      return `${this.code};` + _n;
    }
    optimizeNodes() {
      return `${this.code}` ? this : undefined;
    }
    optimizeNames(names, constants) {
      this.code = optimizeExpr(this.code, names, constants);
      return this;
    }
    get names() {
      return this.code instanceof code_1._CodeOrName ? this.code.names : {};
    }
  }
  class ParentNode extends Node {
    constructor(nodes = []) {
      super();
      this.nodes = nodes;
    }
    render(opts) {
      return this.nodes.reduce((code, n) => code + n.render(opts), "");
    }
    optimizeNodes() {
      let { nodes } = this;
      let i = nodes.length;
      while (i--) {
        let n = nodes[i].optimizeNodes();
        if (Array.isArray(n)) nodes.splice(i, 1, ...n);
        else if (n) nodes[i] = n;
        else nodes.splice(i, 1);
      }
      return nodes.length > 0 ? this : undefined;
    }
    optimizeNames(names, constants) {
      let { nodes } = this;
      let i = nodes.length;
      while (i--) {
        let node = nodes[i];
        if (node.optimizeNames(names, constants)) continue;
        subtractNames(names, node.names);
        nodes.splice(i, 1);
      }
      return nodes.length > 0 ? this : undefined;
    }
    get names() {
      return this.nodes.reduce((names, n) => addNames(names, n.names), {});
    }
  }
  class BlockNode extends ParentNode {
    render(opts) {
      return "{" + opts._n + super.render(opts) + "}" + opts._n;
    }
  }
  class Root extends ParentNode {}
  class Else extends BlockNode {}
  Else.kind = "else";
  class If extends BlockNode {
    constructor(condition, nodes) {
      super(nodes);
      this.condition = condition;
    }
    render(opts) {
      let code = `if(${this.condition})` + super.render(opts);
      if (this.else) code += "else " + this.else.render(opts);
      return code;
    }
    optimizeNodes() {
      super.optimizeNodes();
      let cond = this.condition;
      if (cond === true) return this.nodes;
      let e = this.else;
      if (e) {
        let ns = e.optimizeNodes();
        e = this.else = Array.isArray(ns) ? new Else(ns) : ns;
      }
      if (e) {
        if (cond === false) return e instanceof If ? e : e.nodes;
        if (this.nodes.length) return this;
        return new If(not(cond), e instanceof If ? [e] : e.nodes);
      }
      if (cond === false || !this.nodes.length) return;
      return this;
    }
    optimizeNames(names, constants) {
      var _a;
      this.else =
        (_a = this.else) === null || _a === undefined ? undefined : _a.optimizeNames(names, constants);
      if (!(super.optimizeNames(names, constants) || this.else)) return;
      this.condition = optimizeExpr(this.condition, names, constants);
      return this;
    }
    get names() {
      let names = super.names;
      addExprNames(names, this.condition);
      if (this.else) addNames(names, this.else.names);
      return names;
    }
  }
  If.kind = "if";
  class For extends BlockNode {}
  For.kind = "for";
  class ForLoop extends For {
    constructor(iteration) {
      super();
      this.iteration = iteration;
    }
    render(opts) {
      return `for(${this.iteration})` + super.render(opts);
    }
    optimizeNames(names, constants) {
      if (!super.optimizeNames(names, constants)) return;
      this.iteration = optimizeExpr(this.iteration, names, constants);
      return this;
    }
    get names() {
      return addNames(super.names, this.iteration.names);
    }
  }
  class ForRange extends For {
    constructor(varKind, name, from, to) {
      super();
      this.varKind = varKind;
      this.name = name;
      this.from = from;
      this.to = to;
    }
    render(opts) {
      let varKind = opts.es5 ? scope_1.varKinds.var : this.varKind;
      let { name, from, to } = this;
      return `for(${varKind} ${name}=${from}; ${name}<${to}; ${name}++)` + super.render(opts);
    }
    get names() {
      let names = addExprNames(super.names, this.from);
      return addExprNames(names, this.to);
    }
  }
  class ForIter extends For {
    constructor(loop, varKind, name, iterable) {
      super();
      this.loop = loop;
      this.varKind = varKind;
      this.name = name;
      this.iterable = iterable;
    }
    render(opts) {
      return `for(${this.varKind} ${this.name} ${this.loop} ${this.iterable})` + super.render(opts);
    }
    optimizeNames(names, constants) {
      if (!super.optimizeNames(names, constants)) return;
      this.iterable = optimizeExpr(this.iterable, names, constants);
      return this;
    }
    get names() {
      return addNames(super.names, this.iterable.names);
    }
  }
  class Func extends BlockNode {
    constructor(name, args, async) {
      super();
      this.name = name;
      this.args = args;
      this.async = async;
    }
    render(opts) {
      return `${this.async ? "async " : ""}function ${this.name}(${this.args})` + super.render(opts);
    }
  }
  Func.kind = "func";
  class Return extends ParentNode {
    render(opts) {
      return "return " + super.render(opts);
    }
  }
  Return.kind = "return";
  class Try extends BlockNode {
    render(opts) {
      let code = "try" + super.render(opts);
      if (this.catch) code += this.catch.render(opts);
      if (this.finally) code += this.finally.render(opts);
      return code;
    }
    optimizeNodes() {
      var _a;
      var _b;
      super.optimizeNodes();
      if (!((_a = this.catch) === null || _a === undefined)) _a.optimizeNodes();
      if (!((_b = this.finally) === null || _b === undefined)) _b.optimizeNodes();
      return this;
    }
    optimizeNames(names, constants) {
      var _a;
      var _b;
      super.optimizeNames(names, constants);
      if (!((_a = this.catch) === null || _a === undefined)) _a.optimizeNames(names, constants);
      if (!((_b = this.finally) === null || _b === undefined)) _b.optimizeNames(names, constants);
      return this;
    }
    get names() {
      let names = super.names;
      if (this.catch) addNames(names, this.catch.names);
      if (this.finally) addNames(names, this.finally.names);
      return names;
    }
  }
  class Catch extends BlockNode {
    constructor(error) {
      super();
      this.error = error;
    }
    render(opts) {
      return `catch(${this.error})` + super.render(opts);
    }
  }
  Catch.kind = "catch";
  class Finally extends BlockNode {
    render(opts) {
      return "finally" + super.render(opts);
    }
  }
  Finally.kind = "finally";
  class CodeGen {
    constructor(extScope, opts = {}) {
      this._values = {};
      this._blockStarts = [];
      this._constants = {};
      this.opts = {
        ...opts,
        _n: opts.lines
          ? `
`
          : "",
      };
      this._extScope = extScope;
      this._scope = new scope_1.Scope({
        parent: extScope,
      });
      this._nodes = [new Root()];
    }
    toString() {
      return this._root.render(this.opts);
    }
    name(prefix) {
      return this._scope.name(prefix);
    }
    scopeName(prefix) {
      return this._extScope.name(prefix);
    }
    scopeValue(prefixOrName, value) {
      let name = this._extScope.value(prefixOrName, value);
      (this._values[name.prefix] || (this._values[name.prefix] = new Set())).add(name);
      return name;
    }
    getScopeValue(prefix, keyOrRef) {
      return this._extScope.getValue(prefix, keyOrRef);
    }
    scopeRefs(scopeName) {
      return this._extScope.scopeRefs(scopeName, this._values);
    }
    scopeCode() {
      return this._extScope.scopeCode(this._values);
    }
    _def(varKind, nameOrPrefix, rhs, constant) {
      let name = this._scope.toName(nameOrPrefix);
      if (rhs !== undefined && constant) this._constants[name.str] = rhs;
      this._leafNode(new Def(varKind, name, rhs));
      return name;
    }
    const(nameOrPrefix, rhs, _constant) {
      return this._def(scope_1.varKinds.const, nameOrPrefix, rhs, _constant);
    }
    let(nameOrPrefix, rhs, _constant) {
      return this._def(scope_1.varKinds.let, nameOrPrefix, rhs, _constant);
    }
    var(nameOrPrefix, rhs, _constant) {
      return this._def(scope_1.varKinds.var, nameOrPrefix, rhs, _constant);
    }
    assign(lhs, rhs, sideEffects) {
      return this._leafNode(new Assign(lhs, rhs, sideEffects));
    }
    add(lhs, rhs) {
      return this._leafNode(new AssignOp(lhs, cjsExports.operators.ADD, rhs));
    }
    code(c) {
      if (typeof c == "function") c();
      else if (c !== code_1.nil) this._leafNode(new AnyCode(c));
      return this;
    }
    object(...keyValues) {
      let code = ["{"];
      for (let [key, value] of keyValues) {
        if (code.length > 1) code.push(",");
        code.push(key);
        if (key !== value || this.opts.es5) {
          code.push(":");
          code_1.addCodeArg(code, value);
        }
      }
      code.push("}");
      return new code_1._Code(code);
    }
    if(condition, thenBody, elseBody) {
      this._blockNode(new If(condition));
      if (thenBody && elseBody) this.code(thenBody).else().code(elseBody).endIf();
      else if (thenBody) this.code(thenBody).endIf();
      else if (elseBody) throw Error('CodeGen: "else" body without "then" body');
      return this;
    }
    elseIf(condition) {
      return this._elseNode(new If(condition));
    }
    else() {
      return this._elseNode(new Else());
    }
    endIf() {
      return this._endBlockNode(If, Else);
    }
    _for(node, forBody) {
      this._blockNode(node);
      if (forBody) this.code(forBody).endFor();
      return this;
    }
    for(iteration, forBody) {
      return this._for(new ForLoop(iteration), forBody);
    }
    forRange(
      nameOrPrefix,
      from,
      to,
      forBody,
      varKind = this.opts.es5 ? scope_1.varKinds.var : scope_1.varKinds.let,
    ) {
      let name = this._scope.toName(nameOrPrefix);
      return this._for(new ForRange(varKind, name, from, to), () => forBody(name));
    }
    forOf(nameOrPrefix, iterable, forBody, varKind = scope_1.varKinds.const) {
      let name = this._scope.toName(nameOrPrefix);
      if (this.opts.es5) {
        let arr = iterable instanceof code_1.Name ? iterable : this.var("_arr", iterable);
        return this.forRange("_i", 0, code_1._`${arr}.length`, (indexVar) => {
          this.var(name, code_1._`${arr}[${indexVar}]`);
          forBody(name);
        });
      }
      return this._for(new ForIter("of", varKind, name, iterable), () => forBody(name));
    }
    forIn(
      nameOrPrefix,
      obj,
      forBody,
      varKind = this.opts.es5 ? scope_1.varKinds.var : scope_1.varKinds.const,
    ) {
      if (this.opts.ownProperties) return this.forOf(nameOrPrefix, code_1._`Object.keys(${obj})`, forBody);
      let name = this._scope.toName(nameOrPrefix);
      return this._for(new ForIter("in", varKind, name, obj), () => forBody(name));
    }
    endFor() {
      return this._endBlockNode(For);
    }
    label(label) {
      return this._leafNode(new Label(label));
    }
    break(label) {
      return this._leafNode(new Break(label));
    }
    return(value) {
      let node = new Return();
      this._blockNode(node);
      this.code(value);
      if (node.nodes.length !== 1) throw Error('CodeGen: "return" should have one node');
      return this._endBlockNode(Return);
    }
    try(tryBody, catchCode, finallyCode) {
      if (!catchCode && !finallyCode) throw Error('CodeGen: "try" without "catch" and "finally"');
      let node = new Try();
      this._blockNode(node);
      this.code(tryBody);
      if (catchCode) {
        let error = this.name("e");
        this._currNode = node.catch = new Catch(error);
        catchCode(error);
      }
      if (finallyCode) {
        this._currNode = node.finally = new Finally();
        this.code(finallyCode);
      }
      return this._endBlockNode(Catch, Finally);
    }
    throw(error) {
      return this._leafNode(new Throw(error));
    }
    block(body, nodeCount) {
      this._blockStarts.push(this._nodes.length);
      if (body) this.code(body).endBlock(nodeCount);
      return this;
    }
    endBlock(nodeCount) {
      let len = this._blockStarts.pop();
      if (len === undefined) throw Error("CodeGen: not in self-balancing block");
      let toClose = this._nodes.length - len;
      if (toClose < 0 || (nodeCount !== undefined && toClose !== nodeCount))
        throw Error(`CodeGen: wrong number of nodes: ${toClose} vs ${nodeCount} expected`);
      this._nodes.length = len;
      return this;
    }
    func(name, args = code_1.nil, async, funcBody) {
      this._blockNode(new Func(name, args, async));
      if (funcBody) this.code(funcBody).endFunc();
      return this;
    }
    endFunc() {
      return this._endBlockNode(Func);
    }
    optimize(n = 1) {
      while (n-- > 0) {
        this._root.optimizeNodes();
        this._root.optimizeNames(this._root.names, this._constants);
      }
    }
    _leafNode(node) {
      this._currNode.nodes.push(node);
      return this;
    }
    _blockNode(node) {
      this._currNode.nodes.push(node);
      this._nodes.push(node);
    }
    _endBlockNode(N1, N2) {
      let n = this._currNode;
      if (n instanceof N1 || (N2 && n instanceof N2)) {
        this._nodes.pop();
        return this;
      }
      throw Error(`CodeGen: not in block "${N2 ? `${N1.kind}/${N2.kind}` : N1.kind}"`);
    }
    _elseNode(node) {
      let n = this._currNode;
      if (!(n instanceof If)) throw Error('CodeGen: "else" without "if"');
      this._currNode = n.else = node;
      return this;
    }
    get _root() {
      return this._nodes[0];
    }
    get _currNode() {
      let ns = this._nodes;
      return ns[ns.length - 1];
    }
    set _currNode(node) {
      let ns = this._nodes;
      ns[ns.length - 1] = node;
    }
  }
  cjsExports.CodeGen = CodeGen;
  function addNames(names, from) {
    for (let n in from) names[n] = (names[n] || 0) + (from[n] || 0);
    return names;
  }
  function addExprNames(names, from) {
    return from instanceof code_1._CodeOrName ? addNames(names, from.names) : names;
  }
  function optimizeExpr(expr, names, constants) {
    if (expr instanceof code_1.Name) return replaceName(expr);
    if (!canOptimize(expr)) return expr;
    return new code_1._Code(
      expr._items.reduce((items, c) => {
        if (c instanceof code_1.Name) c = replaceName(c);
        if (c instanceof code_1._Code) items.push(...c._items);
        else items.push(c);
        return items;
      }, []),
    );
    function replaceName(n) {
      let c = constants[n.str];
      if (c === undefined || names[n.str] !== 1) return n;
      delete names[n.str];
      return c;
    }
    function canOptimize(e) {
      return (
        e instanceof code_1._Code &&
        e._items.some((c) => c instanceof code_1.Name && names[c.str] === 1 && constants[c.str] !== undefined)
      );
    }
  }
  function subtractNames(names, from) {
    for (let n in from) names[n] = (names[n] || 0) - (from[n] || 0);
  }
  function not(x) {
    return typeof x == "boolean" || typeof x == "number" || x === null ? !x : code_1._`!${par(x)}`;
  }
  cjsExports.not = not;
  var andCode = mappend(cjsExports.operators.AND);
  function and(...args) {
    return args.reduce(andCode);
  }
  cjsExports.and = and;
  var orCode = mappend(cjsExports.operators.OR);
  function or(...args) {
    return args.reduce(orCode);
  }
  cjsExports.or = or;
  function mappend(op) {
    return (x, y) => (x === code_1.nil ? y : y === code_1.nil ? x : code_1._`${par(x)} ${op} ${par(y)}`);
  }
  function par(x) {
    return x instanceof code_1.Name ? x : code_1._`(${x})`;
  }
});
export { require_codegen_2 };
