/**
 * ajv/dist/compile/codegen/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-s82q9s4x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { it } from "./code.js";
import { or } from "./scope.js";

//@ chunk-s82q9s4x.js:5426-17192 cjs-fingerprint
var uh = x(function (H) {
  Object.defineProperty(H, "__esModule", { value: !0 });
  H.or =
    H.and =
    H.not =
    H.CodeGen =
    H.operators =
    H.varKinds =
    H.ValueScopeName =
    H.ValueScope =
    H.Scope =
    H.Name =
    H.regexpCode =
    H.stringify =
    H.getProperty =
    H.nil =
    H.strConcat =
    H.str =
    H._ =
      void 0;
  var g = it(),
    D = or(),
    me = it();
  Object.defineProperty(H, "_", {
    enumerable: !0,
    get: function () {
      return me._;
    },
  });
  Object.defineProperty(H, "str", {
    enumerable: !0,
    get: function () {
      return me.str;
    },
  });
  Object.defineProperty(H, "strConcat", {
    enumerable: !0,
    get: function () {
      return me.strConcat;
    },
  });
  Object.defineProperty(H, "nil", {
    enumerable: !0,
    get: function () {
      return me.nil;
    },
  });
  Object.defineProperty(H, "getProperty", {
    enumerable: !0,
    get: function () {
      return me.getProperty;
    },
  });
  Object.defineProperty(H, "stringify", {
    enumerable: !0,
    get: function () {
      return me.stringify;
    },
  });
  Object.defineProperty(H, "regexpCode", {
    enumerable: !0,
    get: function () {
      return me.regexpCode;
    },
  });
  Object.defineProperty(H, "Name", {
    enumerable: !0,
    get: function () {
      return me.Name;
    },
  });
  var bt = or();
  Object.defineProperty(H, "Scope", {
    enumerable: !0,
    get: function () {
      return bt.Scope;
    },
  });
  Object.defineProperty(H, "ValueScope", {
    enumerable: !0,
    get: function () {
      return bt.ValueScope;
    },
  });
  Object.defineProperty(H, "ValueScopeName", {
    enumerable: !0,
    get: function () {
      return bt.ValueScopeName;
    },
  });
  Object.defineProperty(H, "varKinds", {
    enumerable: !0,
    get: function () {
      return bt.varKinds;
    },
  });
  H.operators = {
    GT: new g._Code(">"),
    GTE: new g._Code(">="),
    LT: new g._Code("<"),
    LTE: new g._Code("<="),
    EQ: new g._Code("==="),
    NEQ: new g._Code("!=="),
    NOT: new g._Code("!"),
    OR: new g._Code("||"),
    AND: new g._Code("&&"),
    ADD: new g._Code("+"),
  };
  class ye {
    optimizeNodes() {
      return this;
    }
    optimizeNames(e, t) {
      return this;
    }
  }
  class Gr extends ye {
    constructor(e, t, r) {
      super();
      ((this.varKind = e), (this.name = t), (this.rhs = r));
    }
    render({ es5: e, _n: t }) {
      let r = e ? D.varKinds.var : this.varKind,
        s = this.rhs === void 0 ? "" : ` = ${this.rhs}`;
      return `${r} ${this.name}${s};` + t;
    }
    optimizeNames(e, t) {
      if (!e[this.name.str]) return;
      if (this.rhs) this.rhs = ze(this.rhs, e, t);
      return this;
    }
    get names() {
      return this.rhs instanceof g._CodeOrName ? this.rhs.names : {};
    }
  }
  class cr extends ye {
    constructor(e, t, r) {
      super();
      ((this.lhs = e), (this.rhs = t), (this.sideEffects = r));
    }
    render({ _n: e }) {
      return `${this.lhs} = ${this.rhs};` + e;
    }
    optimizeNames(e, t) {
      if (this.lhs instanceof g.Name && !e[this.lhs.str] && !this.sideEffects) return;
      return ((this.rhs = ze(this.rhs, e, t)), this);
    }
    get names() {
      let e = this.lhs instanceof g.Name ? {} : { ...this.lhs.names };
      return wt(e, this.rhs);
    }
  }
  class Jr extends cr {
    constructor(e, t, r, s) {
      super(e, r, s);
      this.op = t;
    }
    render({ _n: e }) {
      return `${this.lhs} ${this.op}= ${this.rhs};` + e;
    }
  }
  class Wr extends ye {
    constructor(e) {
      super();
      ((this.label = e), (this.names = {}));
    }
    render({ _n: e }) {
      return `${this.label}:` + e;
    }
  }
  class Br extends ye {
    constructor(e) {
      super();
      ((this.label = e), (this.names = {}));
    }
    render({ _n: e }) {
      return `break${this.label ? ` ${this.label}` : ""};` + e;
    }
  }
  class Qr extends ye {
    constructor(e) {
      super();
      this.error = e;
    }
    render({ _n: e }) {
      return `throw ${this.error};` + e;
    }
    get names() {
      return this.error.names;
    }
  }
  class Xr extends ye {
    constructor(e) {
      super();
      this.code = e;
    }
    render({ _n: e }) {
      return `${this.code};` + e;
    }
    optimizeNodes() {
      return `${this.code}` ? this : void 0;
    }
    optimizeNames(e, t) {
      return ((this.code = ze(this.code, e, t)), this);
    }
    get names() {
      return this.code instanceof g._CodeOrName ? this.code.names : {};
    }
  }
  class Et extends ye {
    constructor(e = []) {
      super();
      this.nodes = e;
    }
    render(e) {
      return this.nodes.reduce((t, r) => t + r.render(e), "");
    }
    optimizeNodes() {
      let { nodes: nodes } = this,
        t = nodes.length;
      while (t--) {
        let optimizeNodes = nodes[t].optimizeNodes();
        if (Array.isArray(optimizeNodes)) nodes.splice(t, 1, ...optimizeNodes);
        else if (optimizeNodes) nodes[t] = optimizeNodes;
        else nodes.splice(t, 1);
      }
      return nodes.length > 0 ? this : void 0;
    }
    optimizeNames(e, t) {
      let { nodes: nodes } = this,
        s = nodes.length;
      while (s--) {
        let n = nodes[s];
        if (n.optimizeNames(e, t)) continue;
        (Da(e, n.names), nodes.splice(s, 1));
      }
      return nodes.length > 0 ? this : void 0;
    }
    get names() {
      return this.nodes.reduce((e, t) => Ie(e, t.names), {});
    }
  }
  class _e extends Et {
    render(e) {
      return "{" + e._n + super.render(e) + "}" + e._n;
    }
  }
  class Yr extends Et {}
  class at extends _e {}
  at.kind = "else";
  class pe extends _e {
    constructor(e, t) {
      super(t);
      this.condition = e;
    }
    render(e) {
      let t = `if(${this.condition})` + super.render(e);
      if (this.else) t += "else " + this.else.render(e);
      return t;
    }
    optimizeNodes() {
      super.optimizeNodes();
      let condition = this.condition;
      if (condition === !0) return this.nodes;
      let t = this.else;
      if (t) {
        let optimizeNodes = t.optimizeNodes();
        t = this.else = Array.isArray(optimizeNodes) ? new at(optimizeNodes) : optimizeNodes;
      }
      if (t) {
        if (condition === !1) return t instanceof pe ? t : t.nodes;
        if (this.nodes.length) return this;
        return new pe(ss(condition), t instanceof pe ? [t] : t.nodes);
      }
      if (condition === !1 || !this.nodes.length) return;
      return this;
    }
    optimizeNames(e, t) {
      var r;
      if (
        ((this.else = (r = this.else) === null || r === void 0 ? void 0 : r.optimizeNames(e, t)),
        !(super.optimizeNames(e, t) || this.else))
      )
        return;
      return ((this.condition = ze(this.condition, e, t)), this);
    }
    get names() {
      let names = super.names;
      if ((wt(names, this.condition), this.else)) Ie(names, this.else.names);
      return names;
    }
  }
  pe.kind = "if";
  class Ve extends _e {}
  Ve.kind = "for";
  class Zr extends Ve {
    constructor(e) {
      super();
      this.iteration = e;
    }
    render(e) {
      return `for(${this.iteration})` + super.render(e);
    }
    optimizeNames(e, t) {
      if (!super.optimizeNames(e, t)) return;
      return ((this.iteration = ze(this.iteration, e, t)), this);
    }
    get names() {
      return Ie(super.names, this.iteration.names);
    }
  }
  class es extends Ve {
    constructor(e, t, r, s) {
      super();
      ((this.varKind = e), (this.name = t), (this.from = r), (this.to = s));
    }
    render(e) {
      let t = e.es5 ? D.varKinds.var : this.varKind,
        { name: r, from: from, to: to } = this;
      return `for(${t} ${r}=${from}; ${r}<${to}; ${r}++)` + super.render(e);
    }
    get names() {
      let e = wt(super.names, this.from);
      return wt(e, this.to);
    }
  }
  class ir extends Ve {
    constructor(e, t, r, s) {
      super();
      ((this.loop = e), (this.varKind = t), (this.name = r), (this.iterable = s));
    }
    render(e) {
      return `for(${this.varKind} ${this.name} ${this.loop} ${this.iterable})` + super.render(e);
    }
    optimizeNames(e, t) {
      if (!super.optimizeNames(e, t)) return;
      return ((this.iterable = ze(this.iterable, e, t)), this);
    }
    get names() {
      return Ie(super.names, this.iterable.names);
    }
  }
  class _t extends _e {
    constructor(e, t, r) {
      super();
      ((this.name = e), (this.args = t), (this.async = r));
    }
    render(e) {
      return `${this.async ? "async " : ""}function ${this.name}(${this.args})` + super.render(e);
    }
  }
  _t.kind = "func";
  class gt extends Et {
    render(e) {
      return "return " + super.render(e);
    }
  }
  gt.kind = "return";
  class ts extends _e {
    render(e) {
      let t = "try" + super.render(e);
      if (this.catch) t += this.catch.render(e);
      if (this.finally) t += this.finally.render(e);
      return t;
    }
    optimizeNodes() {
      var e, t;
      return (
        super.optimizeNodes(),
        (e = this.catch) === null || e === void 0 || e.optimizeNodes(),
        (t = this.finally) === null || t === void 0 || t.optimizeNodes(),
        this
      );
    }
    optimizeNames(e, t) {
      var r, s;
      return (
        super.optimizeNames(e, t),
        (r = this.catch) === null || r === void 0 || r.optimizeNames(e, t),
        (s = this.finally) === null || s === void 0 || s.optimizeNames(e, t),
        this
      );
    }
    get names() {
      let names = super.names;
      if (this.catch) Ie(names, this.catch.names);
      if (this.finally) Ie(names, this.finally.names);
      return names;
    }
  }
  class $t extends _e {
    constructor(e) {
      super();
      this.error = e;
    }
    render(e) {
      return `catch(${this.error})` + super.render(e);
    }
  }
  $t.kind = "catch";
  class vt extends _e {
    render(e) {
      return "finally" + super.render(e);
    }
  }
  vt.kind = "finally";
  class rs {
    constructor(e, t = {}) {
      ((this._values = {}),
        (this._blockStarts = []),
        (this._constants = {}),
        (this.opts = {
          ...t,
          _n: t.lines
            ? `
`
            : "",
        }),
        (this._extScope = e),
        (this._scope = new D.Scope({ parent: e })),
        (this._nodes = [new Yr()]));
    }
    toString() {
      return this._root.render(this.opts);
    }
    name(e) {
      return this._scope.name(e);
    }
    scopeName(e) {
      return this._extScope.name(e);
    }
    scopeValue(e, t) {
      let r = this._extScope.value(e, t);
      return ((this._values[r.prefix] || (this._values[r.prefix] = new Set())).add(r), r);
    }
    getScopeValue(e, t) {
      return this._extScope.getValue(e, t);
    }
    scopeRefs(e) {
      return this._extScope.scopeRefs(e, this._values);
    }
    scopeCode() {
      return this._extScope.scopeCode(this._values);
    }
    _def(e, t, r, s) {
      let toName = this._scope.toName(t);
      if (r !== void 0 && s) this._constants[toName.str] = r;
      return (this._leafNode(new Gr(e, toName, r)), toName);
    }
    const(e, t, r) {
      return this._def(D.varKinds.const, e, t, r);
    }
    let(e, t, r) {
      return this._def(D.varKinds.let, e, t, r);
    }
    var(e, t, r) {
      return this._def(D.varKinds.var, e, t, r);
    }
    assign(e, t, r) {
      return this._leafNode(new cr(e, t, r));
    }
    add(e, t) {
      return this._leafNode(new Jr(e, H.operators.ADD, t));
    }
    code(e) {
      if (typeof e == "function") e();
      else if (e !== g.nil) this._leafNode(new Xr(e));
      return this;
    }
    object(...e) {
      let t = ["{"];
      for (let [r, s] of e) {
        if (t.length > 1) t.push(",");
        if ((t.push(r), r !== s || this.opts.es5)) (t.push(":"), g.addCodeArg(t, s));
      }
      return (t.push("}"), new g._Code(t));
    }
    if(e, t, r) {
      if ((this._blockNode(new pe(e)), t && r)) this.code(t).else().code(r).endIf();
      else if (t) this.code(t).endIf();
      else if (r) throw Error('CodeGen: "else" body without "then" body');
      return this;
    }
    elseIf(e) {
      return this._elseNode(new pe(e));
    }
    else() {
      return this._elseNode(new at());
    }
    endIf() {
      return this._endBlockNode(pe, at);
    }
    _for(e, t) {
      if ((this._blockNode(e), t)) this.code(t).endFor();
      return this;
    }
    for(e, t) {
      return this._for(new Zr(e), t);
    }
    forRange(e, t, r, s, n = this.opts.es5 ? D.varKinds.var : D.varKinds.let) {
      let toName = this._scope.toName(e);
      return this._for(new es(n, toName, t, r), () => s(toName));
    }
    forOf(e, t, r, s = D.varKinds.const) {
      let toName = this._scope.toName(e);
      if (this.opts.es5) {
        let o = t instanceof g.Name ? t : this.var("_arr", t);
        return this.forRange("_i", 0, g._`${o}.length`, (i) => {
          (this.var(toName, g._`${o}[${i}]`), r(toName));
        });
      }
      return this._for(new ir("of", s, toName, t), () => r(toName));
    }
    forIn(e, t, r, s = this.opts.es5 ? D.varKinds.var : D.varKinds.const) {
      if (this.opts.ownProperties) return this.forOf(e, g._`Object.keys(${t})`, r);
      let toName = this._scope.toName(e);
      return this._for(new ir("in", s, toName, t), () => r(toName));
    }
    endFor() {
      return this._endBlockNode(Ve);
    }
    label(e) {
      return this._leafNode(new Wr(e));
    }
    break(e) {
      return this._leafNode(new Br(e));
    }
    return(e) {
      let t = new gt();
      if ((this._blockNode(t), this.code(e), t.nodes.length !== 1))
        throw Error('CodeGen: "return" should have one node');
      return this._endBlockNode(gt);
    }
    try(e, t, r) {
      if (!t && !r) throw Error('CodeGen: "try" without "catch" and "finally"');
      let s = new ts();
      if ((this._blockNode(s), this.code(e), t)) {
        let n = this.name("e");
        ((this._currNode = s.catch = new $t(n)), t(n));
      }
      if (r) ((this._currNode = s.finally = new vt()), this.code(r));
      return this._endBlockNode($t, vt);
    }
    throw(e) {
      return this._leafNode(new Qr(e));
    }
    block(e, t) {
      if ((this._blockStarts.push(this._nodes.length), e)) this.code(e).endBlock(t);
      return this;
    }
    endBlock(e) {
      let t = this._blockStarts.pop();
      if (t === void 0) throw Error("CodeGen: not in self-balancing block");
      let r = this._nodes.length - t;
      if (r < 0 || (e !== void 0 && r !== e))
        throw Error(`CodeGen: wrong number of nodes: ${r} vs ${e} expected`);
      return ((this._nodes.length = t), this);
    }
    func(e, t = g.nil, r, s) {
      if ((this._blockNode(new _t(e, t, r)), s)) this.code(s).endFunc();
      return this;
    }
    endFunc() {
      return this._endBlockNode(_t);
    }
    optimize(e = 1) {
      while (e-- > 0)
        (this._root.optimizeNodes(), this._root.optimizeNames(this._root.names, this._constants));
    }
    _leafNode(e) {
      return (this._currNode.nodes.push(e), this);
    }
    _blockNode(e) {
      (this._currNode.nodes.push(e), this._nodes.push(e));
    }
    _endBlockNode(e, t) {
      let _currNode = this._currNode;
      if (_currNode instanceof e || (t && _currNode instanceof t)) return (this._nodes.pop(), this);
      throw Error(`CodeGen: not in block "${t ? `${e.kind}/${t.kind}` : e.kind}"`);
    }
    _elseNode(e) {
      let _currNode = this._currNode;
      if (!(_currNode instanceof pe)) throw Error('CodeGen: "else" without "if"');
      return ((this._currNode = _currNode.else = e), this);
    }
    get _root() {
      return this._nodes[0];
    }
    get _currNode() {
      let _nodes = this._nodes;
      return _nodes[_nodes.length - 1];
    }
    set _currNode(e) {
      let _nodes = this._nodes;
      _nodes[_nodes.length - 1] = e;
    }
  }
  H.CodeGen = rs;
  function Ie(e, t) {
    for (let key in t) e[key] = (e[key] || 0) + (t[key] || 0);
    return e;
  }
  function wt(e, t) {
    return t instanceof g._CodeOrName ? Ie(e, t.names) : e;
  }
  function ze(e, t, r) {
    if (e instanceof g.Name) return s(e);
    if (!n(e)) return e;
    return new g._Code(
      e._items.reduce((o, i) => {
        if (i instanceof g.Name) i = s(i);
        if (i instanceof g._Code) o.push(...i._items);
        else o.push(i);
        return o;
      }, []),
    );
    function s(o) {
      let i = r[o.str];
      if (i === void 0 || t[o.str] !== 1) return o;
      return (delete t[o.str], i);
    }
    function n(o) {
      return (
        o instanceof g._Code &&
        o._items.some((_item) => _item instanceof g.Name && t[_item.str] === 1 && r[_item.str] !== void 0)
      );
    }
  }
  function Da(e, t) {
    for (let key in t) e[key] = (e[key] || 0) - (t[key] || 0);
  }
  function ss(e) {
    return typeof e == "boolean" || typeof e == "number" || e === null ? !e : g._`!${ar(e)}`;
  }
  H.not = ss;
  var Va = ns(H.operators.AND);
  function za(...e) {
    return e.reduce(Va);
  }
  H.and = za;
  var Ua = ns(H.operators.OR);
  function Ka(...e) {
    return e.reduce(Ua);
  }
  H.or = Ka;
  function ns(e) {
    return (t, r) => (t === g.nil ? r : r === g.nil ? t : g._`${ar(t)} ${e} ${ar(r)}`);
  }
  function ar(e) {
    return e instanceof g.Name ? e : g._`(${e})`;
  }
});

export { uh };
