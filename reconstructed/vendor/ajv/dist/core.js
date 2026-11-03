/**
 * ajv/dist/core.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-r1g76qsy.js (1), chunk-s82q9s4x.js (1)
 * attribution: cjs-fingerprint 2
 */
import { J } from "../../@modelcontextprotocol/core/(bundler runtime of a pre-bundled dist file).js";
import { x } from "../../../runtime/bun-runtime.js";
import { Bvn } from "./compile/validate/index.js";
import { uh } from "./compile/codegen/index.js";
import { elr } from "./runtime/validation_error.js";
import { jvn } from "./compile/ref_error.js";
import { pr } from "./compile/rules.js";
import { tlr } from "./compile/index.js";
import { lt } from "./compile/resolve.js";
import { ut } from "./compile/validate/dataType.js";
import { ew } from "./compile/util.js";
import { zn } from "./refs/data.json.js";
import { io } from "./runtime/uri.js";

//@ chunk-r1g76qsy.js:118380-197840 cjs-fingerprint
var fa = J((e) => {
    (Object.defineProperty(e, "__esModule", { value: !0 }),
      (e.regexpCode =
        e.getEsmExportName =
        e.getProperty =
        e.safeStringify =
        e.stringify =
        e.strConcat =
        e.addCodeArg =
        e.str =
        e._ =
        e.nil =
        e._Code =
        e.Name =
        e.IDENTIFIER =
        e._CodeOrName =
          void 0));
    var t = class {};
    ((e._CodeOrName = t), (e.IDENTIFIER = /^[a-z$_][a-z$_0-9]*$/i));
    var r = class extends t {
      constructor(h) {
        super();
        if (!e.IDENTIFIER.test(h)) throw Error("CodeGen: name must be a valid identifier");
        this.str = h;
      }
      toString() {
        return this.str;
      }
      emptyStr() {
        return !1;
      }
      get names() {
        return { [this.str]: 1 };
      }
    };
    e.Name = r;
    var s = class extends t {
      constructor(h) {
        super();
        this._items = typeof h === "string" ? [h] : h;
      }
      toString() {
        return this.str;
      }
      emptyStr() {
        if (this._items.length > 1) return !1;
        let h = this._items[0];
        return h === "" || h === '""';
      }
      get str() {
        var h;
        return (h = this._str) !== null && h !== void 0
          ? h
          : (this._str = this._items.reduce((S, f) => `${S}${f}`, ""));
      }
      get names() {
        var h;
        return (h = this._names) !== null && h !== void 0
          ? h
          : (this._names = this._items.reduce((S, f) => {
              if (f instanceof r) S[f.str] = (S[f.str] || 0) + 1;
              return S;
            }, {}));
      }
    };
    ((e._Code = s), (e.nil = new s("")));
    function a(h, ...S) {
      let f = [h[0]],
        R = 0;
      while (R < S.length) (l(f, S[R]), f.push(h[++R]));
      return new s(f);
    }
    e._ = a;
    let n = new s("+");
    function i(h, ...S) {
      let f = [P(h[0])],
        R = 0;
      while (R < S.length) (f.push(n), l(f, S[R]), f.push(n, P(h[++R])));
      return (c(f), new s(f));
    }
    e.str = i;
    function l(h, S) {
      if (S instanceof s) h.push(...S._items);
      else if (S instanceof r) h.push(S);
      else h.push(_(S));
    }
    e.addCodeArg = l;
    function c(h) {
      let S = 1;
      while (S < h.length - 1) {
        if (h[S] === n) {
          let f = d(h[S - 1], h[S + 1]);
          if (f !== void 0) {
            h.splice(S - 1, 3, f);
            continue;
          }
          h[S++] = "+";
        }
        S++;
      }
    }
    function d(h, S) {
      if (S === '""') return h;
      if (h === '""') return S;
      if (typeof h == "string") {
        if (S instanceof r || h[h.length - 1] !== '"') return;
        if (typeof S != "string") return `${h.slice(0, -1)}${S}"`;
        if (S[0] === '"') return h.slice(0, -1) + S.slice(1);
        return;
      }
      if (typeof S == "string" && S[0] === '"' && !(h instanceof r)) return `"${h}${S.slice(1)}`;
    }
    function m(h, S) {
      return S.emptyStr() ? h : h.emptyStr() ? S : i`${h}${S}`;
    }
    e.strConcat = m;
    function _(h) {
      return typeof h == "number" || typeof h == "boolean" || h === null
        ? h
        : P(Array.isArray(h) ? h.join(",") : h);
    }
    function w(h) {
      return new s(P(h));
    }
    e.stringify = w;
    function P(h) {
      return JSON.stringify(h)
        .replace(/\u2028/g, "\\u2028")
        .replace(/\u2029/g, "\\u2029");
    }
    e.safeStringify = P;
    function y(h) {
      return typeof h == "string" && e.IDENTIFIER.test(h) ? new s(`.${h}`) : a`[${h}]`;
    }
    e.getProperty = y;
    function v(h) {
      if (typeof h == "string" && e.IDENTIFIER.test(h)) return new s(`${h}`);
      throw Error(`CodeGen: invalid export name: ${h}, use explicit $id name mapping`);
    }
    e.getEsmExportName = v;
    function p(h) {
      return new s(h.toString());
    }
    e.regexpCode = p;
  }),
  Mi = J((e) => {
    (Object.defineProperty(e, "__esModule", { value: !0 }),
      (e.ValueScope = e.ValueScopeName = e.Scope = e.varKinds = e.UsedValueState = void 0));
    let t = fa();
    var r = class extends Error {
        constructor(c) {
          super(`CodeGen: "code" for ${c} not defined`);
          this.value = c.value;
        }
      },
      s;
    ((function (c) {
      ((c[(c.Started = 0)] = "Started"), (c[(c.Completed = 1)] = "Completed"));
    })(s || (e.UsedValueState = s = {})),
      (e.varKinds = { const: new t.Name("const"), let: new t.Name("let"), var: new t.Name("var") }));
    var a = class {
      constructor({ prefixes: c, parent: d } = {}) {
        ((this._names = {}), (this._prefixes = c), (this._parent = d));
      }
      toName(c) {
        return c instanceof t.Name ? c : this.name(c);
      }
      name(c) {
        return new t.Name(this._newName(c));
      }
      _newName(c) {
        let d = this._names[c] || this._nameGroup(c);
        return `${c}${d.index++}`;
      }
      _nameGroup(c) {
        var d, m;
        if (
          ((m = (d = this._parent) === null || d === void 0 ? void 0 : d._prefixes) === null || m === void 0
            ? void 0
            : m.has(c)) ||
          (this._prefixes && !this._prefixes.has(c))
        )
          throw Error(`CodeGen: prefix "${c}" is not allowed in this scope`);
        return (this._names[c] = { prefix: c, index: 0 });
      }
    };
    e.Scope = a;
    var n = class extends t.Name {
      constructor(c, d) {
        super(d);
        this.prefix = c;
      }
      setValue(c, { property: d, itemIndex: m }) {
        ((this.value = c), (this.scopePath = t._`.${new t.Name(d)}[${m}]`));
      }
    };
    e.ValueScopeName = n;
    let i = t._`\n`;
    var l = class extends a {
      constructor(c) {
        super(c);
        ((this._values = {}), (this._scope = c.scope), (this.opts = { ...c, _n: c.lines ? i : t.nil }));
      }
      get() {
        return this._scope;
      }
      name(c) {
        return new n(c, this._newName(c));
      }
      value(c, d) {
        var m;
        if (d.ref === void 0) throw Error("CodeGen: ref must be passed in value");
        let toName = this.toName(c),
          { prefix: prefix } = toName,
          P = (m = d.key) !== null && m !== void 0 ? m : d.ref,
          y = this._values[prefix];
        if (y) {
          let h = y.get(P);
          if (h) return h;
        } else y = this._values[prefix] = new Map();
        y.set(P, toName);
        let v = this._scope[prefix] || (this._scope[prefix] = []),
          p = v.length;
        return ((v[p] = d.ref), toName.setValue(d, { property: prefix, itemIndex: p }), toName);
      }
      getValue(c, d) {
        let m = this._values[c];
        if (!m) return;
        return m.get(d);
      }
      scopeRefs(c, d = this._values) {
        return this._reduceValues(d, (m) => {
          if (m.scopePath === void 0) throw Error(`CodeGen: name "${m}" has no value`);
          return t._`${c}${m.scopePath}`;
        });
      }
      scopeCode(c = this._values, d, m) {
        return this._reduceValues(
          c,
          (_) => {
            if (_.value === void 0) throw Error(`CodeGen: name "${_}" has no value`);
            return _.value.code;
          },
          d,
          m,
        );
      }
      _reduceValues(c, d, m = {}, _) {
        let nil = t.nil;
        for (let key in c) {
          let y = c[key];
          if (!y) continue;
          let v = (m[key] = m[key] || new Map());
          y.forEach((p) => {
            if (v.has(p)) return;
            v.set(p, s.Started);
            let h = d(p);
            if (h) {
              let S = this.opts.es5 ? e.varKinds.var : e.varKinds.const;
              nil = t._`${nil}${S} ${p} = ${h};${this.opts._n}`;
            } else if ((h = _ === null || _ === void 0 ? void 0 : _(p))) nil = t._`${nil}${h}${this.opts._n}`;
            else throw new r(p);
            v.set(p, s.Completed);
          });
        }
        return nil;
      }
    };
    e.ValueScope = l;
  }),
  te = J((e) => {
    (Object.defineProperty(e, "__esModule", { value: !0 }),
      (e.or =
        e.and =
        e.not =
        e.CodeGen =
        e.operators =
        e.varKinds =
        e.ValueScopeName =
        e.ValueScope =
        e.Scope =
        e.Name =
        e.regexpCode =
        e.stringify =
        e.getProperty =
        e.nil =
        e.strConcat =
        e.str =
        e._ =
          void 0));
    let t = fa(),
      r = Mi();
    var s = fa();
    (Object.defineProperty(e, "_", {
      enumerable: !0,
      get: function () {
        return s._;
      },
    }),
      Object.defineProperty(e, "str", {
        enumerable: !0,
        get: function () {
          return s.str;
        },
      }),
      Object.defineProperty(e, "strConcat", {
        enumerable: !0,
        get: function () {
          return s.strConcat;
        },
      }),
      Object.defineProperty(e, "nil", {
        enumerable: !0,
        get: function () {
          return s.nil;
        },
      }),
      Object.defineProperty(e, "getProperty", {
        enumerable: !0,
        get: function () {
          return s.getProperty;
        },
      }),
      Object.defineProperty(e, "stringify", {
        enumerable: !0,
        get: function () {
          return s.stringify;
        },
      }),
      Object.defineProperty(e, "regexpCode", {
        enumerable: !0,
        get: function () {
          return s.regexpCode;
        },
      }),
      Object.defineProperty(e, "Name", {
        enumerable: !0,
        get: function () {
          return s.Name;
        },
      }));
    var a = Mi();
    (Object.defineProperty(e, "Scope", {
      enumerable: !0,
      get: function () {
        return a.Scope;
      },
    }),
      Object.defineProperty(e, "ValueScope", {
        enumerable: !0,
        get: function () {
          return a.ValueScope;
        },
      }),
      Object.defineProperty(e, "ValueScopeName", {
        enumerable: !0,
        get: function () {
          return a.ValueScopeName;
        },
      }),
      Object.defineProperty(e, "varKinds", {
        enumerable: !0,
        get: function () {
          return a.varKinds;
        },
      }),
      (e.operators = {
        GT: new t._Code(">"),
        GTE: new t._Code(">="),
        LT: new t._Code("<"),
        LTE: new t._Code("<="),
        EQ: new t._Code("==="),
        NEQ: new t._Code("!=="),
        NOT: new t._Code("!"),
        OR: new t._Code("||"),
        AND: new t._Code("&&"),
        ADD: new t._Code("+"),
      }));
    var n = class {
        optimizeNodes() {
          return this;
        }
        optimizeNames(z, I) {
          return this;
        }
      },
      i = class extends n {
        constructor(z, I, j) {
          super();
          ((this.varKind = z), (this.name = I), (this.rhs = j));
        }
        render({ es5: z, _n: I }) {
          let j = z ? r.varKinds.var : this.varKind,
            G = this.rhs === void 0 ? "" : ` = ${this.rhs}`;
          return `${j} ${this.name}${G};` + I;
        }
        optimizeNames(z, I) {
          if (!z[this.name.str]) return;
          if (this.rhs) this.rhs = B(this.rhs, z, I);
          return this;
        }
        get names() {
          return this.rhs instanceof t._CodeOrName ? this.rhs.names : {};
        }
      },
      l = class extends n {
        constructor(z, I, j) {
          super();
          ((this.lhs = z), (this.rhs = I), (this.sideEffects = j));
        }
        render({ _n: z }) {
          return `${this.lhs} = ${this.rhs};` + z;
        }
        optimizeNames(z, I) {
          if (this.lhs instanceof t.Name && !z[this.lhs.str] && !this.sideEffects) return;
          return ((this.rhs = B(this.rhs, z, I)), this);
        }
        get names() {
          return W(this.lhs instanceof t.Name ? {} : { ...this.lhs.names }, this.rhs);
        }
      },
      c = class extends l {
        constructor(z, I, j, G) {
          super(z, j, G);
          this.op = I;
        }
        render({ _n: z }) {
          return `${this.lhs} ${this.op}= ${this.rhs};` + z;
        }
      },
      d = class extends n {
        constructor(z) {
          super();
          ((this.label = z), (this.names = {}));
        }
        render({ _n: z }) {
          return `${this.label}:` + z;
        }
      },
      m = class extends n {
        constructor(z) {
          super();
          ((this.label = z), (this.names = {}));
        }
        render({ _n: z }) {
          return `break${this.label ? ` ${this.label}` : ""};` + z;
        }
      },
      _ = class extends n {
        constructor(z) {
          super();
          this.error = z;
        }
        render({ _n: z }) {
          return `throw ${this.error};` + z;
        }
        get names() {
          return this.error.names;
        }
      },
      w = class extends n {
        constructor(z) {
          super();
          this.code = z;
        }
        render({ _n: z }) {
          return `${this.code};` + z;
        }
        optimizeNodes() {
          return `${this.code}` ? this : void 0;
        }
        optimizeNames(z, I) {
          return ((this.code = B(this.code, z, I)), this);
        }
        get names() {
          return this.code instanceof t._CodeOrName ? this.code.names : {};
        }
      },
      P = class extends n {
        constructor(z = []) {
          super();
          this.nodes = z;
        }
        render(z) {
          return this.nodes.reduce((I, j) => I + j.render(z), "");
        }
        optimizeNodes() {
          let { nodes: nodes } = this,
            I = nodes.length;
          while (I--) {
            let optimizeNodes = nodes[I].optimizeNodes();
            if (Array.isArray(optimizeNodes)) nodes.splice(I, 1, ...optimizeNodes);
            else if (optimizeNodes) nodes[I] = optimizeNodes;
            else nodes.splice(I, 1);
          }
          return nodes.length > 0 ? this : void 0;
        }
        optimizeNames(z, I) {
          let { nodes: nodes } = this,
            G = nodes.length;
          while (G--) {
            let Y = nodes[G];
            if (Y.optimizeNames(z, I)) continue;
            (se(z, Y.names), nodes.splice(G, 1));
          }
          return nodes.length > 0 ? this : void 0;
        }
        get names() {
          return this.nodes.reduce((z, I) => x(z, I.names), {});
        }
      },
      y = class extends P {
        render(z) {
          return "{" + z._n + super.render(z) + "}" + z._n;
        }
      },
      v = class extends P {},
      p = class extends y {};
    p.kind = "else";
    var h = class z extends y {
      constructor(I, j) {
        super(j);
        this.condition = I;
      }
      render(I) {
        let j = `if(${this.condition})` + super.render(I);
        if (this.else) j += "else " + this.else.render(I);
        return j;
      }
      optimizeNodes() {
        super.optimizeNodes();
        let condition = this.condition;
        if (condition === !0) return this.nodes;
        let j = this.else;
        if (j) {
          let optimizeNodes = j.optimizeNodes();
          j = this.else = Array.isArray(optimizeNodes) ? new p(optimizeNodes) : optimizeNodes;
        }
        if (j) {
          if (condition === !1) return j instanceof z ? j : j.nodes;
          if (this.nodes.length) return this;
          return new z(le(condition), j instanceof z ? [j] : j.nodes);
        }
        if (condition === !1 || !this.nodes.length) return;
        return this;
      }
      optimizeNames(I, j) {
        var G;
        if (
          ((this.else = (G = this.else) === null || G === void 0 ? void 0 : G.optimizeNames(I, j)),
          !(super.optimizeNames(I, j) || this.else))
        )
          return;
        return ((this.condition = B(this.condition, I, j)), this);
      }
      get names() {
        let names = super.names;
        if ((W(names, this.condition), this.else)) x(names, this.else.names);
        return names;
      }
    };
    h.kind = "if";
    var S = class extends y {};
    S.kind = "for";
    var f = class extends S {
        constructor(z) {
          super();
          this.iteration = z;
        }
        render(z) {
          return `for(${this.iteration})` + super.render(z);
        }
        optimizeNames(z, I) {
          if (!super.optimizeNames(z, I)) return;
          return ((this.iteration = B(this.iteration, z, I)), this);
        }
        get names() {
          return x(super.names, this.iteration.names);
        }
      },
      R = class extends S {
        constructor(z, I, j, G) {
          super();
          ((this.varKind = z), (this.name = I), (this.from = j), (this.to = G));
        }
        render(z) {
          let I = z.es5 ? r.varKinds.var : this.varKind,
            { name: j, from: from, to: to } = this;
          return `for(${I} ${j}=${from}; ${j}<${to}; ${j}++)` + super.render(z);
        }
        get names() {
          return W(W(super.names, this.from), this.to);
        }
      },
      C = class extends S {
        constructor(z, I, j, G) {
          super();
          ((this.loop = z), (this.varKind = I), (this.name = j), (this.iterable = G));
        }
        render(z) {
          return `for(${this.varKind} ${this.name} ${this.loop} ${this.iterable})` + super.render(z);
        }
        optimizeNames(z, I) {
          if (!super.optimizeNames(z, I)) return;
          return ((this.iterable = B(this.iterable, z, I)), this);
        }
        get names() {
          return x(super.names, this.iterable.names);
        }
      },
      b = class extends y {
        constructor(z, I, j) {
          super();
          ((this.name = z), (this.args = I), (this.async = j));
        }
        render(z) {
          return `${this.async ? "async " : ""}function ${this.name}(${this.args})` + super.render(z);
        }
      };
    b.kind = "func";
    var g = class extends P {
      render(z) {
        return "return " + super.render(z);
      }
    };
    g.kind = "return";
    var k = class extends y {
        render(z) {
          let I = "try" + super.render(z);
          if (this.catch) I += this.catch.render(z);
          if (this.finally) I += this.finally.render(z);
          return I;
        }
        optimizeNodes() {
          var z, I;
          return (
            super.optimizeNodes(),
            (z = this.catch) === null || z === void 0 || z.optimizeNodes(),
            (I = this.finally) === null || I === void 0 || I.optimizeNodes(),
            this
          );
        }
        optimizeNames(z, I) {
          var j, G;
          return (
            super.optimizeNames(z, I),
            (j = this.catch) === null || j === void 0 || j.optimizeNames(z, I),
            (G = this.finally) === null || G === void 0 || G.optimizeNames(z, I),
            this
          );
        }
        get names() {
          let names = super.names;
          if (this.catch) x(names, this.catch.names);
          if (this.finally) x(names, this.finally.names);
          return names;
        }
      },
      V = class extends y {
        constructor(z) {
          super();
          this.error = z;
        }
        render(z) {
          return `catch(${this.error})` + super.render(z);
        }
      };
    V.kind = "catch";
    var H = class extends y {
      render(z) {
        return "finally" + super.render(z);
      }
    };
    H.kind = "finally";
    var N = class {
      constructor(z, I = {}) {
        ((this._values = {}),
          (this._blockStarts = []),
          (this._constants = {}),
          (this.opts = {
            ...I,
            _n: I.lines
              ? `
`
              : "",
          }),
          (this._extScope = z),
          (this._scope = new r.Scope({ parent: z })),
          (this._nodes = [new v()]));
      }
      toString() {
        return this._root.render(this.opts);
      }
      name(z) {
        return this._scope.name(z);
      }
      scopeName(z) {
        return this._extScope.name(z);
      }
      scopeValue(z, I) {
        let j = this._extScope.value(z, I);
        return ((this._values[j.prefix] || (this._values[j.prefix] = new Set())).add(j), j);
      }
      getScopeValue(z, I) {
        return this._extScope.getValue(z, I);
      }
      scopeRefs(z) {
        return this._extScope.scopeRefs(z, this._values);
      }
      scopeCode() {
        return this._extScope.scopeCode(this._values);
      }
      _def(z, I, j, G) {
        let toName = this._scope.toName(I);
        if (j !== void 0 && G) this._constants[toName.str] = j;
        return (this._leafNode(new i(z, toName, j)), toName);
      }
      const(z, I, j) {
        return this._def(r.varKinds.const, z, I, j);
      }
      let(z, I, j) {
        return this._def(r.varKinds.let, z, I, j);
      }
      var(z, I, j) {
        return this._def(r.varKinds.var, z, I, j);
      }
      assign(z, I, j) {
        return this._leafNode(new l(z, I, j));
      }
      add(z, I) {
        return this._leafNode(new c(z, e.operators.ADD, I));
      }
      code(z) {
        if (typeof z == "function") z();
        else if (z !== t.nil) this._leafNode(new w(z));
        return this;
      }
      object(...z) {
        let I = ["{"];
        for (let [j, G] of z) {
          if (I.length > 1) I.push(",");
          if ((I.push(j), j !== G || this.opts.es5)) (I.push(":"), (0, t.addCodeArg)(I, G));
        }
        return (I.push("}"), new t._Code(I));
      }
      if(z, I, j) {
        if ((this._blockNode(new h(z)), I && j)) this.code(I).else().code(j).endIf();
        else if (I) this.code(I).endIf();
        else if (j) throw Error('CodeGen: "else" body without "then" body');
        return this;
      }
      elseIf(z) {
        return this._elseNode(new h(z));
      }
      else() {
        return this._elseNode(new p());
      }
      endIf() {
        return this._endBlockNode(h, p);
      }
      _for(z, I) {
        if ((this._blockNode(z), I)) this.code(I).endFor();
        return this;
      }
      for(z, I) {
        return this._for(new f(z), I);
      }
      forRange(z, I, j, G, Y = this.opts.es5 ? r.varKinds.var : r.varKinds.let) {
        let toName = this._scope.toName(z);
        return this._for(new R(Y, toName, I, j), () => G(toName));
      }
      forOf(z, I, j, G = r.varKinds.const) {
        let toName = this._scope.toName(z);
        if (this.opts.es5) {
          let re = I instanceof t.Name ? I : this.var("_arr", I);
          return this.forRange("_i", 0, t._`${re}.length`, (Q) => {
            (this.var(toName, t._`${re}[${Q}]`), j(toName));
          });
        }
        return this._for(new C("of", G, toName, I), () => j(toName));
      }
      forIn(z, I, j, G = this.opts.es5 ? r.varKinds.var : r.varKinds.const) {
        if (this.opts.ownProperties) return this.forOf(z, t._`Object.keys(${I})`, j);
        let toName = this._scope.toName(z);
        return this._for(new C("in", G, toName, I), () => j(toName));
      }
      endFor() {
        return this._endBlockNode(S);
      }
      label(z) {
        return this._leafNode(new d(z));
      }
      break(z) {
        return this._leafNode(new m(z));
      }
      return(z) {
        let I = new g();
        if ((this._blockNode(I), this.code(z), I.nodes.length !== 1))
          throw Error('CodeGen: "return" should have one node');
        return this._endBlockNode(g);
      }
      try(z, I, j) {
        if (!I && !j) throw Error('CodeGen: "try" without "catch" and "finally"');
        let G = new k();
        if ((this._blockNode(G), this.code(z), I)) {
          let Y = this.name("e");
          ((this._currNode = G.catch = new V(Y)), I(Y));
        }
        if (j) ((this._currNode = G.finally = new H()), this.code(j));
        return this._endBlockNode(V, H);
      }
      throw(z) {
        return this._leafNode(new _(z));
      }
      block(z, I) {
        if ((this._blockStarts.push(this._nodes.length), z)) this.code(z).endBlock(I);
        return this;
      }
      endBlock(z) {
        let I = this._blockStarts.pop();
        if (I === void 0) throw Error("CodeGen: not in self-balancing block");
        let j = this._nodes.length - I;
        if (j < 0 || (z !== void 0 && j !== z))
          throw Error(`CodeGen: wrong number of nodes: ${j} vs ${z} expected`);
        return ((this._nodes.length = I), this);
      }
      func(z, I = t.nil, j, G) {
        if ((this._blockNode(new b(z, I, j)), G)) this.code(G).endFunc();
        return this;
      }
      endFunc() {
        return this._endBlockNode(b);
      }
      optimize(z = 1) {
        while (z-- > 0)
          (this._root.optimizeNodes(), this._root.optimizeNames(this._root.names, this._constants));
      }
      _leafNode(z) {
        return (this._currNode.nodes.push(z), this);
      }
      _blockNode(z) {
        (this._currNode.nodes.push(z), this._nodes.push(z));
      }
      _endBlockNode(z, I) {
        let _currNode = this._currNode;
        if (_currNode instanceof z || (I && _currNode instanceof I)) return (this._nodes.pop(), this);
        throw Error(`CodeGen: not in block "${I ? `${z.kind}/${I.kind}` : z.kind}"`);
      }
      _elseNode(z) {
        let _currNode = this._currNode;
        if (!(_currNode instanceof h)) throw Error('CodeGen: "else" without "if"');
        return ((this._currNode = _currNode.else = z), this);
      }
      get _root() {
        return this._nodes[0];
      }
      get _currNode() {
        let _nodes = this._nodes;
        return _nodes[_nodes.length - 1];
      }
      set _currNode(z) {
        let _nodes = this._nodes;
        _nodes[_nodes.length - 1] = z;
      }
    };
    e.CodeGen = N;
    function x(z, I) {
      for (let key in I) z[key] = (z[key] || 0) + (I[key] || 0);
      return z;
    }
    function W(z, I) {
      return I instanceof t._CodeOrName ? x(z, I.names) : z;
    }
    function B(z, I, j) {
      if (z instanceof t.Name) return G(z);
      if (!Y(z)) return z;
      return new t._Code(
        z._items.reduce((re, Q) => {
          if (Q instanceof t.Name) Q = G(Q);
          if (Q instanceof t._Code) re.push(...Q._items);
          else re.push(Q);
          return re;
        }, []),
      );
      function G(re) {
        let Q = j[re.str];
        if (Q === void 0 || I[re.str] !== 1) return re;
        return (delete I[re.str], Q);
      }
      function Y(re) {
        return (
          re instanceof t._Code &&
          re._items.some((_item) => _item instanceof t.Name && I[_item.str] === 1 && j[_item.str] !== void 0)
        );
      }
    }
    function se(z, I) {
      for (let key in I) z[key] = (z[key] || 0) - (I[key] || 0);
    }
    function le(z) {
      return typeof z == "boolean" || typeof z == "number" || z === null ? !z : t._`!${K(z)}`;
    }
    e.not = le;
    let ie = L(e.operators.AND);
    function Se(...z) {
      return z.reduce(ie);
    }
    e.and = Se;
    let ae = L(e.operators.OR);
    function O(...z) {
      return z.reduce(ae);
    }
    e.or = O;
    function L(z) {
      return (I, j) => (I === t.nil ? j : j === t.nil ? I : t._`${K(I)} ${z} ${K(j)}`);
    }
    function K(z) {
      return z instanceof t.Name ? z : t._`(${z})`;
    }
  }),
  ne = J((e) => {
    (Object.defineProperty(e, "__esModule", { value: !0 }),
      (e.checkStrictMode =
        e.getErrorPath =
        e.Type =
        e.useFunc =
        e.setEvaluated =
        e.evaluatedPropsToName =
        e.mergeEvaluated =
        e.eachItem =
        e.unescapeJsonPointer =
        e.escapeJsonPointer =
        e.escapeFragment =
        e.unescapeFragment =
        e.schemaRefOrVal =
        e.schemaHasRulesButRef =
        e.schemaHasRules =
        e.checkUnknownRules =
        e.alwaysValidSchema =
        e.toHash =
          void 0));
    let t = te(),
      r = fa();
    function s(b) {
      let g = {};
      for (let k of b) g[k] = !0;
      return g;
    }
    e.toHash = s;
    function a(b, g) {
      if (typeof g == "boolean") return g;
      if (Object.keys(g).length === 0) return !0;
      return (n(b, g), !i(g, b.self.RULES.all));
    }
    e.alwaysValidSchema = a;
    function n(b, g = b.schema) {
      let { opts: opts, self: V } = b;
      if (!opts.strictSchema) return;
      if (typeof g === "boolean") return;
      let keywords = V.RULES.keywords;
      for (let key in g) if (!keywords[key]) C(b, `unknown keyword: "${key}"`);
    }
    e.checkUnknownRules = n;
    function i(b, g) {
      if (typeof b == "boolean") return !b;
      for (let key in b) if (g[key]) return !0;
      return !1;
    }
    e.schemaHasRules = i;
    function l(b, g) {
      if (typeof b == "boolean") return !b;
      for (let key in b) if (key !== "$ref" && g.all[key]) return !0;
      return !1;
    }
    e.schemaHasRulesButRef = l;
    function c({ topSchemaRef: topSchemaRef, schemaPath: schemaPath }, k, V, H) {
      if (!H) {
        if (typeof k == "number" || typeof k == "boolean") return k;
        if (typeof k == "string") return t._`${k}`;
      }
      return t._`${topSchemaRef}${schemaPath}${(0, t.getProperty)(V)}`;
    }
    e.schemaRefOrVal = c;
    function d(b) {
      return w(decodeURIComponent(b));
    }
    e.unescapeFragment = d;
    function m(b) {
      return encodeURIComponent(_(b));
    }
    e.escapeFragment = m;
    function _(b) {
      if (typeof b == "number") return `${b}`;
      return b.replace(/~/g, "~0").replace(/\//g, "~1");
    }
    e.escapeJsonPointer = _;
    function w(b) {
      return b.replace(/~1/g, "/").replace(/~0/g, "~");
    }
    e.unescapeJsonPointer = w;
    function P(b, g) {
      if (Array.isArray(b)) for (let k of b) g(k);
      else g(b);
    }
    e.eachItem = P;
    function y({
      mergeNames: mergeNames,
      mergeToName: mergeToName,
      mergeValues: mergeValues,
      resultToName: resultToName,
    }) {
      return (H, N, x, W) => {
        let B =
          x === void 0
            ? N
            : x instanceof t.Name
              ? (N instanceof t.Name ? mergeNames(H, N, x) : mergeToName(H, N, x), x)
              : N instanceof t.Name
                ? (mergeToName(H, x, N), N)
                : mergeValues(N, x);
        return W === t.Name && !(B instanceof t.Name) ? resultToName(H, B) : B;
      };
    }
    e.mergeEvaluated = {
      props: y({
        mergeNames: (b, g, k) =>
          b.if(t._`${k} !== true && ${g} !== undefined`, () => {
            b.if(
              t._`${g} === true`,
              () => b.assign(k, !0),
              () => b.assign(k, t._`${k} || {}`).code(t._`Object.assign(${k}, ${g})`),
            );
          }),
        mergeToName: (b, g, k) =>
          b.if(t._`${k} !== true`, () => {
            if (g === !0) b.assign(k, !0);
            else (b.assign(k, t._`${k} || {}`), p(b, k, g));
          }),
        mergeValues: (b, g) => (b === !0 ? !0 : { ...b, ...g }),
        resultToName: v,
      }),
      items: y({
        mergeNames: (b, g, k) =>
          b.if(t._`${k} !== true && ${g} !== undefined`, () =>
            b.assign(k, t._`${g} === true ? true : ${k} > ${g} ? ${k} : ${g}`),
          ),
        mergeToName: (b, g, k) =>
          b.if(t._`${k} !== true`, () => b.assign(k, g === !0 ? !0 : t._`${k} > ${g} ? ${k} : ${g}`)),
        mergeValues: (b, g) => (b === !0 ? !0 : Math.max(b, g)),
        resultToName: (b, g) => b.var("items", g),
      }),
    };
    function v(b, g) {
      if (g === !0) return b.var("props", !0);
      let k = b.var("props", t._`{}`);
      if (g !== void 0) p(b, k, g);
      return k;
    }
    e.evaluatedPropsToName = v;
    function p(b, g, k) {
      Object.keys(k).forEach((V) => b.assign(t._`${g}${(0, t.getProperty)(V)}`, !0));
    }
    e.setEvaluated = p;
    let h = {};
    function S(b, g) {
      return b.scopeValue("func", { ref: g, code: h[g.code] || (h[g.code] = new r._Code(g.code)) });
    }
    e.useFunc = S;
    var f;
    (function (b) {
      ((b[(b.Num = 0)] = "Num"), (b[(b.Str = 1)] = "Str"));
    })(f || (e.Type = f = {}));
    function R(b, g, k) {
      if (b instanceof t.Name) {
        let V = g === f.Num;
        return k
          ? V
            ? t._`"[" + ${b} + "]"`
            : t._`"['" + ${b} + "']"`
          : V
            ? t._`"/" + ${b}`
            : t._`"/" + ${b}.replace(/~/g, "~0").replace(/\\//g, "~1")`;
      }
      return k ? (0, t.getProperty)(b).toString() : "/" + _(b);
    }
    e.getErrorPath = R;
    function C(b, g, k = b.opts.strictSchema) {
      if (!k) return;
      if (((g = `strict mode: ${g}`), k === !0)) throw Error(g);
      b.self.logger.warn(g);
    }
    e.checkStrictMode = C;
  }),
  Le = J((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 });
    let t = te(),
      r = {
        data: new t.Name("data"),
        valCxt: new t.Name("valCxt"),
        instancePath: new t.Name("instancePath"),
        parentData: new t.Name("parentData"),
        parentDataProperty: new t.Name("parentDataProperty"),
        rootData: new t.Name("rootData"),
        dynamicAnchors: new t.Name("dynamicAnchors"),
        vErrors: new t.Name("vErrors"),
        errors: new t.Name("errors"),
        this: new t.Name("this"),
        self: new t.Name("self"),
        scope: new t.Name("scope"),
        json: new t.Name("json"),
        jsonPos: new t.Name("jsonPos"),
        jsonLen: new t.Name("jsonLen"),
        jsonPart: new t.Name("jsonPart"),
      };
    e.default = r;
  }),
  ga = J((e) => {
    (Object.defineProperty(e, "__esModule", { value: !0 }),
      (e.extendErrors =
        e.resetErrorsCount =
        e.reportExtraError =
        e.reportError =
        e.keyword$DataError =
        e.keywordError =
          void 0));
    let t = te(),
      r = ne(),
      s = Le();
    ((e.keywordError = {
      message: ({ keyword: keyword }) => t.str`must pass "${keyword}" keyword validation`,
    }),
      (e.keyword$DataError = {
        message: ({ keyword: keyword, schemaType: schemaType }) =>
          schemaType
            ? t.str`"${keyword}" keyword must be ${schemaType} ($data)`
            : t.str`"${keyword}" keyword is invalid ($data)`,
      }));
    function a(p, h = e.keywordError, S, f) {
      let { it: it } = p,
        { gen: gen, compositeRule: compositeRule, allErrors: allErrors } = it,
        k = _(p, h, S);
      if (f !== null && f !== void 0 ? f : compositeRule || allErrors) c(gen, k);
      else d(it, t._`[${k}]`);
    }
    e.reportError = a;
    function n(p, h = e.keywordError, S) {
      let { it: it } = p,
        { gen: gen, compositeRule: compositeRule, allErrors: allErrors } = it;
      if ((c(gen, _(p, h, S)), !(compositeRule || allErrors))) d(it, s.default.vErrors);
    }
    e.reportExtraError = n;
    function i(p, h) {
      (p.assign(s.default.errors, h),
        p.if(t._`${s.default.vErrors} !== null`, () =>
          p.if(
            h,
            () => p.assign(t._`${s.default.vErrors}.length`, h),
            () => p.assign(s.default.vErrors, null),
          ),
        ));
    }
    e.resetErrorsCount = i;
    function l({
      gen: gen,
      keyword: keyword,
      schemaValue: schemaValue,
      data: f,
      errsCount: errsCount,
      it: it,
    }) {
      if (errsCount === void 0) throw Error("ajv implementation error");
      let b = gen.name("err");
      gen.forRange("i", errsCount, s.default.errors, (g) => {
        if (
          (gen.const(b, t._`${s.default.vErrors}[${g}]`),
          gen.if(t._`${b}.instancePath === undefined`, () =>
            gen.assign(t._`${b}.instancePath`, (0, t.strConcat)(s.default.instancePath, it.errorPath)),
          ),
          gen.assign(t._`${b}.schemaPath`, t.str`${it.errSchemaPath}/${keyword}`),
          it.opts.verbose)
        )
          (gen.assign(t._`${b}.schema`, schemaValue), gen.assign(t._`${b}.data`, f));
      });
    }
    e.extendErrors = l;
    function c(p, h) {
      let S = p.const("err", h);
      (p.if(
        t._`${s.default.vErrors} === null`,
        () => p.assign(s.default.vErrors, t._`[${S}]`),
        t._`${s.default.vErrors}.push(${S})`,
      ),
        p.code(t._`${s.default.errors}++`));
    }
    function d(p, h) {
      let { gen: gen, validateName: validateName, schemaEnv: schemaEnv } = p;
      if (schemaEnv.$async) gen.throw(t._`new ${p.ValidationError}(${h})`);
      else (gen.assign(t._`${validateName}.errors`, h), gen.return(!1));
    }
    let m = {
      keyword: new t.Name("keyword"),
      schemaPath: new t.Name("schemaPath"),
      params: new t.Name("params"),
      propertyName: new t.Name("propertyName"),
      message: new t.Name("message"),
      schema: new t.Name("schema"),
      parentSchema: new t.Name("parentSchema"),
    };
    function _(p, h, S) {
      let { createErrors: createErrors } = p.it;
      if (createErrors === !1) return t._`{}`;
      return w(p, h, S);
    }
    function w(p, h, S = {}) {
      let { gen: gen, it: it } = p,
        C = [P(it, S), y(p, S)];
      return (v(p, h, C), gen.object(...C));
    }
    function P({ errorPath: errorPath }, { instancePath: instancePath }) {
      let S = instancePath ? t.str`${errorPath}${(0, r.getErrorPath)(instancePath, r.Type.Str)}` : errorPath;
      return [s.default.instancePath, (0, t.strConcat)(s.default.instancePath, S)];
    }
    function y(
      { keyword: keyword, it: { errSchemaPath: h } },
      { schemaPath: schemaPath, parentSchema: parentSchema },
    ) {
      let R = parentSchema ? h : t.str`${h}/${keyword}`;
      if (schemaPath) R = t.str`${R}${(0, r.getErrorPath)(schemaPath, r.Type.Str)}`;
      return [m.schemaPath, R];
    }
    function v(p, { params: params, message: message }, f) {
      let { keyword: keyword, data: C, schemaValue: schemaValue, it: it } = p,
        { opts: opts, propertyName: propertyName, topSchemaRef: topSchemaRef, schemaPath: schemaPath } = it;
      if (
        (f.push(
          [m.keyword, keyword],
          [m.params, typeof params == "function" ? params(p) : params || t._`{}`],
        ),
        opts.messages)
      )
        f.push([m.message, typeof message == "function" ? message(p) : message]);
      if (opts.verbose)
        f.push(
          [m.schema, schemaValue],
          [m.parentSchema, t._`${topSchemaRef}${schemaPath}`],
          [s.default.data, C],
        );
      if (propertyName) f.push([m.propertyName, propertyName]);
    }
  }),
  gu = J((e) => {
    (Object.defineProperty(e, "__esModule", { value: !0 }),
      (e.boolOrEmptySchema = e.topBoolOrEmptySchema = void 0));
    let t = ga(),
      r = te(),
      s = Le(),
      a = { message: "boolean schema is false" };
    function n(c) {
      let { gen: gen, schema: schema, validateName: validateName } = c;
      if (schema === !1) l(c, !1);
      else if (typeof schema == "object" && schema.$async === !0) gen.return(s.default.data);
      else (gen.assign(r._`${validateName}.errors`, null), gen.return(!0));
    }
    e.topBoolOrEmptySchema = n;
    function i(c, d) {
      let { gen: gen, schema: schema } = c;
      if (schema === !1) (gen.var(d, !1), l(c));
      else gen.var(d, !0);
    }
    e.boolOrEmptySchema = i;
    function l(c, d) {
      let { gen: gen, data: _ } = c,
        w = {
          gen: gen,
          keyword: "false schema",
          data: _,
          schema: !1,
          schemaCode: !1,
          schemaValue: !1,
          params: {},
          it: c,
        };
      (0, t.reportError)(w, a, void 0, d);
    }
  }),
  ji = J((e) => {
    (Object.defineProperty(e, "__esModule", { value: !0 }), (e.getRules = e.isJSONType = void 0));
    let t = new Set(["string", "number", "integer", "boolean", "null", "object", "array"]);
    function r(a) {
      return typeof a == "string" && t.has(a);
    }
    e.isJSONType = r;
    function s() {
      let a = {
        number: { type: "number", rules: [] },
        string: { type: "string", rules: [] },
        array: { type: "array", rules: [] },
        object: { type: "object", rules: [] },
      };
      return {
        types: { ...a, integer: !0, boolean: !0, null: !0 },
        rules: [{ rules: [] }, a.number, a.string, a.array, a.object],
        post: { rules: [] },
        all: {},
        keywords: {},
      };
    }
    e.getRules = s;
  }),
  Ai = J((e) => {
    (Object.defineProperty(e, "__esModule", { value: !0 }),
      (e.shouldUseRule = e.shouldUseGroup = e.schemaHasRulesForType = void 0));
    function t({ schema: schema, self: n }, i) {
      let l = n.RULES.types[i];
      return l && l !== !0 && r(schema, l);
    }
    e.schemaHasRulesForType = t;
    function r(a, n) {
      return n.rules.some((rule) => s(a, rule));
    }
    e.shouldUseGroup = r;
    function s(a, n) {
      var i;
      return (
        a[n.keyword] !== void 0 ||
        ((i = n.definition.implements) === null || i === void 0 ? void 0 : i.some((l) => a[l] !== void 0))
      );
    }
    e.shouldUseRule = s;
  }),
  Sa = J((e) => {
    (Object.defineProperty(e, "__esModule", { value: !0 }),
      (e.reportTypeError =
        e.checkDataTypes =
        e.checkDataType =
        e.coerceAndCheckDataType =
        e.getJSONTypes =
        e.getSchemaTypes =
        e.DataType =
          void 0));
    let t = ji(),
      r = Ai(),
      s = ga(),
      a = te(),
      n = ne();
    var i;
    (function (f) {
      ((f[(f.Correct = 0)] = "Correct"), (f[(f.Wrong = 1)] = "Wrong"));
    })(i || (e.DataType = i = {}));
    function l(f) {
      let R = c(f.type);
      if (R.includes("null")) {
        if (f.nullable === !1) throw Error("type: null contradicts nullable: false");
      } else {
        if (!R.length && f.nullable !== void 0) throw Error('"nullable" cannot be used without "type"');
        if (f.nullable === !0) R.push("null");
      }
      return R;
    }
    e.getSchemaTypes = l;
    function c(f) {
      let R = Array.isArray(f) ? f : f ? [f] : [];
      if (R.every(t.isJSONType)) return R;
      throw Error("type must be JSONType or JSONType[]: " + R.join(","));
    }
    e.getJSONTypes = c;
    function d(f, R) {
      let { gen: gen, data: b, opts: opts } = f,
        k = _(R, opts.coerceTypes),
        V = R.length > 0 && !(k.length === 0 && R.length === 1 && (0, r.schemaHasRulesForType)(f, R[0]));
      if (V) {
        let H = v(R, b, opts.strictNumbers, i.Wrong);
        gen.if(H, () => {
          if (k.length) w(f, R, k);
          else h(f);
        });
      }
      return V;
    }
    e.coerceAndCheckDataType = d;
    let m = new Set(["string", "number", "integer", "boolean", "null"]);
    function _(f, R) {
      return R ? f.filter((C) => m.has(C) || (R === "array" && C === "array")) : [];
    }
    function w(f, R, C) {
      let { gen: gen, data: g, opts: opts } = f,
        V = gen.let("dataType", a._`typeof ${g}`),
        H = gen.let("coerced", a._`undefined`);
      if (opts.coerceTypes === "array")
        gen.if(a._`${V} == 'object' && Array.isArray(${g}) && ${g}.length == 1`, () =>
          gen
            .assign(g, a._`${g}[0]`)
            .assign(V, a._`typeof ${g}`)
            .if(v(R, g, opts.strictNumbers), () => gen.assign(H, g)),
        );
      gen.if(a._`${H} !== undefined`);
      for (let x of C) if (m.has(x) || (x === "array" && opts.coerceTypes === "array")) N(x);
      (gen.else(),
        h(f),
        gen.endIf(),
        gen.if(a._`${H} !== undefined`, () => {
          (gen.assign(g, H), P(f, H));
        }));
      function N(x) {
        switch (x) {
          case "string":
            gen
              .elseIf(a._`${V} == "number" || ${V} == "boolean"`)
              .assign(H, a._`"" + ${g}`)
              .elseIf(a._`${g} === null`)
              .assign(H, a._`""`);
            return;
          case "number":
            gen
              .elseIf(
                a._`${V} == "boolean" || ${g} === null
              || (${V} == "string" && ${g} && ${g} == +${g})`,
              )
              .assign(H, a._`+${g}`);
            return;
          case "integer":
            gen
              .elseIf(
                a._`${V} === "boolean" || ${g} === null
              || (${V} === "string" && ${g} && ${g} == +${g} && !(${g} % 1))`,
              )
              .assign(H, a._`+${g}`);
            return;
          case "boolean":
            gen
              .elseIf(a._`${g} === "false" || ${g} === 0 || ${g} === null`)
              .assign(H, !1)
              .elseIf(a._`${g} === "true" || ${g} === 1`)
              .assign(H, !0);
            return;
          case "null":
            (gen.elseIf(a._`${g} === "" || ${g} === 0 || ${g} === false`), gen.assign(H, null));
            return;
          case "array":
            gen
              .elseIf(
                a._`${V} === "string" || ${V} === "number"
              || ${V} === "boolean" || ${g} === null`,
              )
              .assign(H, a._`[${g}]`);
        }
      }
    }
    function P({ gen: gen, parentData: parentData, parentDataProperty: parentDataProperty }, b) {
      gen.if(a._`${parentData} !== undefined`, () =>
        gen.assign(a._`${parentData}[${parentDataProperty}]`, b),
      );
    }
    function y(f, R, C, b = i.Correct) {
      let g = b === i.Correct ? a.operators.EQ : a.operators.NEQ,
        k;
      switch (f) {
        case "null":
          return a._`${R} ${g} null`;
        case "array":
          k = a._`Array.isArray(${R})`;
          break;
        case "object":
          k = a._`${R} && typeof ${R} == "object" && !Array.isArray(${R})`;
          break;
        case "integer":
          k = V(a._`!(${R} % 1) && !isNaN(${R})`);
          break;
        case "number":
          k = V();
          break;
        default:
          return a._`typeof ${R} ${g} ${f}`;
      }
      return b === i.Correct ? k : (0, a.not)(k);
      function V(H = a.nil) {
        return (0, a.and)(a._`typeof ${R} == "number"`, H, C ? a._`isFinite(${R})` : a.nil);
      }
    }
    e.checkDataType = y;
    function v(f, R, C, b) {
      if (f.length === 1) return y(f[0], R, C, b);
      let g,
        k = (0, n.toHash)(f);
      if (k.array && k.object) {
        let V = a._`typeof ${R} != "object"`;
        ((g = k.null ? V : a._`!${R} || ${V}`), delete k.null, delete k.array, delete k.object);
      } else g = a.nil;
      if (k.number) delete k.integer;
      for (let key in k) g = (0, a.and)(g, y(key, R, C, b));
      return g;
    }
    e.checkDataTypes = v;
    let p = {
      message: ({ schema: schema }) => `must be ${schema}`,
      params: ({ schema: schema, schemaValue: schemaValue }) =>
        typeof schema == "string" ? a._`{type: ${schema}}` : a._`{type: ${schemaValue}}`,
    };
    function h(f) {
      let R = S(f);
      (0, s.reportError)(R, p);
    }
    e.reportTypeError = h;
    function S(f) {
      let { gen: gen, data: C, schema: schema } = f,
        g = (0, n.schemaRefOrVal)(f, schema, "type");
      return {
        gen: gen,
        keyword: "type",
        data: C,
        schema: schema.type,
        schemaCode: g,
        schemaValue: g,
        parentSchema: schema,
        params: {},
        it: f,
      };
    }
  }),
  _u = J((e) => {
    (Object.defineProperty(e, "__esModule", { value: !0 }), (e.assignDefaults = void 0));
    let t = te(),
      r = ne();
    function s(n, i) {
      let { properties: properties, items: items } = n.schema;
      if (i === "object" && properties) for (let key in properties) a(n, key, properties[key].default);
      else if (i === "array" && Array.isArray(items)) items.forEach((d, m) => a(n, m, d.default));
    }
    e.assignDefaults = s;
    function a(n, i, l) {
      let { gen: gen, compositeRule: compositeRule, data: m, opts: opts } = n;
      if (l === void 0) return;
      let w = t._`${m}${(0, t.getProperty)(i)}`;
      if (compositeRule) {
        (0, r.checkStrictMode)(n, `default is ignored for: ${w}`);
        return;
      }
      let P = t._`${w} === undefined`;
      if (opts.useDefaults === "empty") P = t._`${P} || ${w} === null || ${w} === ""`;
      gen.if(P, t._`${w} = ${(0, t.stringify)(l)}`);
    }
  }),
  De = J((e) => {
    (Object.defineProperty(e, "__esModule", { value: !0 }),
      (e.validateUnion =
        e.validateArray =
        e.usePattern =
        e.callValidateCode =
        e.schemaProperties =
        e.allSchemaProperties =
        e.noPropertyInData =
        e.propertyInData =
        e.isOwnProperty =
        e.hasPropFunc =
        e.reportMissingProp =
        e.checkMissingProp =
        e.checkReportMissingProp =
          void 0));
    let t = te(),
      r = ne(),
      s = Le(),
      a = ne();
    function n(f, R) {
      let { gen: gen, data: b, it: it } = f;
      gen.if(_(gen, b, R, it.opts.ownProperties), () => {
        (f.setParams({ missingProperty: t._`${R}` }, !0), f.error());
      });
    }
    e.checkReportMissingProp = n;
    function i({ gen: gen, data: R, it: { opts: C } }, b, g) {
      return (0, t.or)(...b.map((k) => (0, t.and)(_(gen, R, k, C.ownProperties), t._`${g} = ${k}`)));
    }
    e.checkMissingProp = i;
    function l(f, R) {
      (f.setParams({ missingProperty: R }, !0), f.error());
    }
    e.reportMissingProp = l;
    function c(f) {
      return f.scopeValue("func", {
        ref: Object.prototype.hasOwnProperty,
        code: t._`Object.prototype.hasOwnProperty`,
      });
    }
    e.hasPropFunc = c;
    function d(f, R, C) {
      return t._`${c(f)}.call(${R}, ${C})`;
    }
    e.isOwnProperty = d;
    function m(f, R, C, b) {
      let g = t._`${R}${(0, t.getProperty)(C)} !== undefined`;
      return b ? t._`${g} && ${d(f, R, C)}` : g;
    }
    e.propertyInData = m;
    function _(f, R, C, b) {
      let g = t._`${R}${(0, t.getProperty)(C)} === undefined`;
      return b ? (0, t.or)(g, (0, t.not)(d(f, R, C))) : g;
    }
    e.noPropertyInData = _;
    function w(f) {
      return f ? Object.keys(f).filter((R) => R !== "__proto__") : [];
    }
    e.allSchemaProperties = w;
    function P(f, R) {
      return w(R).filter((C) => !(0, r.alwaysValidSchema)(f, R[C]));
    }
    e.schemaProperties = P;
    function y(
      {
        schemaCode: schemaCode,
        data: R,
        it: { gen: C, topSchemaRef: b, schemaPath: g, errorPath: k },
        it: it,
      },
      H,
      N,
      x,
    ) {
      let W = x ? t._`${schemaCode}, ${R}, ${b}${g}` : R,
        B = [
          [s.default.instancePath, (0, t.strConcat)(s.default.instancePath, k)],
          [s.default.parentData, it.parentData],
          [s.default.parentDataProperty, it.parentDataProperty],
          [s.default.rootData, s.default.rootData],
        ];
      if (it.opts.dynamicRef) B.push([s.default.dynamicAnchors, s.default.dynamicAnchors]);
      let se = t._`${W}, ${C.object(...B)}`;
      return N !== t.nil ? t._`${H}.call(${N}, ${se})` : t._`${H}(${se})`;
    }
    e.callValidateCode = y;
    let v = t._`new RegExp`;
    function p({ gen: gen, it: { opts: R } }, C) {
      let b = R.unicodeRegExp ? "u" : "",
        { regExp: regExp } = R.code,
        k = regExp(C, b);
      return gen.scopeValue("pattern", {
        key: k.toString(),
        ref: k,
        code: t._`${regExp.code === "new RegExp" ? v : (0, a.useFunc)(gen, regExp)}(${C}, ${b})`,
      });
    }
    e.usePattern = p;
    function h(f) {
      let { gen: gen, data: C, keyword: keyword, it: it } = f,
        k = gen.name("valid");
      if (it.allErrors) {
        let H = gen.let("valid", !0);
        return (V(() => gen.assign(H, !1)), H);
      }
      return (gen.var(k, !0), V(() => gen.break()), k);
      function V(H) {
        let N = gen.const("len", t._`${C}.length`);
        gen.forRange("i", 0, N, (x) => {
          (f.subschema({ keyword: keyword, dataProp: x, dataPropType: r.Type.Num }, k),
            gen.if((0, t.not)(k), H));
        });
      }
    }
    e.validateArray = h;
    function S(f) {
      let { gen: gen, schema: schema, keyword: keyword, it: it } = f;
      if (!Array.isArray(schema)) throw Error("ajv implementation error");
      if (schema.some((H) => (0, r.alwaysValidSchema)(it, H)) && !it.opts.unevaluated) return;
      let k = gen.let("valid", !1),
        V = gen.name("_valid");
      (gen.block(() =>
        schema.forEach((H, N) => {
          let subschema = f.subschema({ keyword: keyword, schemaProp: N, compositeRule: !0 }, V);
          if ((gen.assign(k, t._`${k} || ${V}`), !f.mergeValidEvaluated(subschema, V))) gen.if((0, t.not)(k));
        }),
      ),
        f.result(
          k,
          () => f.reset(),
          () => f.error(!0),
        ));
    }
    e.validateUnion = S;
  }),
  yu = J((e) => {
    (Object.defineProperty(e, "__esModule", { value: !0 }),
      (e.validateKeywordUsage = e.validSchemaType = e.funcKeywordCode = e.macroKeywordCode = void 0));
    let t = te(),
      r = Le(),
      s = De(),
      a = ga();
    function n(P, y) {
      let { gen: gen, keyword: keyword, schema: schema, parentSchema: parentSchema, it: it } = P,
        R = y.macro.call(it.self, schema, parentSchema, it),
        C = m(gen, keyword, R);
      if (it.opts.validateSchema !== !1) it.self.validateSchema(R, !0);
      let b = gen.name("valid");
      (P.subschema(
        {
          schema: R,
          schemaPath: t.nil,
          errSchemaPath: `${it.errSchemaPath}/${keyword}`,
          topSchemaRef: C,
          compositeRule: !0,
        },
        b,
      ),
        P.pass(b, () => P.error(!0)));
    }
    e.macroKeywordCode = n;
    function i(P, y) {
      var v;
      let {
        gen: gen,
        keyword: keyword,
        schema: schema,
        parentSchema: parentSchema,
        $data: $data,
        it: it,
      } = P;
      d(it, y);
      let b = m(
          gen,
          keyword,
          !$data && y.compile ? y.compile.call(it.self, schema, parentSchema, it) : y.validate,
        ),
        g = gen.let("valid");
      (P.block$data(g, k), P.ok((v = y.valid) !== null && v !== void 0 ? v : g));
      function k() {
        if (y.errors === !1) {
          if ((N(), y.modifying)) l(P);
          x(() => P.error());
        } else {
          let W = y.async ? V() : H();
          if (y.modifying) l(P);
          x(() => c(P, W));
        }
      }
      function V() {
        let W = gen.let("ruleErrs", null);
        return (
          gen.try(
            () => N(t._`await `),
            (B) =>
              gen.assign(g, !1).if(
                t._`${B} instanceof ${it.ValidationError}`,
                () => gen.assign(W, t._`${B}.errors`),
                () => gen.throw(B),
              ),
          ),
          W
        );
      }
      function H() {
        let W = t._`${b}.errors`;
        return (gen.assign(W, null), N(t.nil), W);
      }
      function N(W = y.async ? t._`await ` : t.nil) {
        let B = it.opts.passContext ? r.default.this : r.default.self,
          se = !(("compile" in y && !$data) || y.schema === !1);
        gen.assign(g, t._`${W}${(0, s.callValidateCode)(P, b, B, se)}`, y.modifying);
      }
      function x(W) {
        var B;
        gen.if((0, t.not)((B = y.valid) !== null && B !== void 0 ? B : g), W);
      }
    }
    e.funcKeywordCode = i;
    function l(P) {
      let { gen: gen, data: v, it: it } = P;
      gen.if(it.parentData, () => gen.assign(v, t._`${it.parentData}[${it.parentDataProperty}]`));
    }
    function c(P, y) {
      let { gen: gen } = P;
      gen.if(
        t._`Array.isArray(${y})`,
        () => {
          (gen
            .assign(
              r.default.vErrors,
              t._`${r.default.vErrors} === null ? ${y} : ${r.default.vErrors}.concat(${y})`,
            )
            .assign(r.default.errors, t._`${r.default.vErrors}.length`),
            (0, a.extendErrors)(P));
        },
        () => P.error(),
      );
    }
    function d({ schemaEnv: schemaEnv }, y) {
      if (y.async && !schemaEnv.$async) throw Error("async keyword in sync schema");
    }
    function m(P, y, v) {
      if (v === void 0) throw Error(`keyword "${y}" failed to compile`);
      return P.scopeValue(
        "keyword",
        typeof v == "function" ? { ref: v } : { ref: v, code: (0, t.stringify)(v) },
      );
    }
    function _(P, y, v = !1) {
      return (
        !y.length ||
        y.some((p) =>
          p === "array"
            ? Array.isArray(P)
            : p === "object"
              ? P && typeof P == "object" && !Array.isArray(P)
              : typeof P == p || (v && typeof P > "u"),
        )
      );
    }
    e.validSchemaType = _;
    function w({ schema: schema, opts: opts, self: v, errSchemaPath: errSchemaPath }, h, S) {
      if (Array.isArray(h.keyword) ? !h.keyword.includes(S) : h.keyword !== S)
        throw Error("ajv implementation error");
      let dependencies = h.dependencies;
      if (
        dependencies === null || dependencies === void 0
          ? void 0
          : dependencies.some((R) => !Object.prototype.hasOwnProperty.call(schema, R))
      )
        throw Error(`parent schema must have dependencies of ${S}: ${dependencies.join(",")}`);
      if (h.validateSchema) {
        if (!h.validateSchema(schema[S])) {
          let R =
            `keyword "${S}" value is invalid at path "${errSchemaPath}": ` +
            v.errorsText(h.validateSchema.errors);
          if (opts.validateSchema === "log") v.logger.error(R);
          else throw Error(R);
        }
      }
    }
    e.validateKeywordUsage = w;
  }),
  vu = J((e) => {
    (Object.defineProperty(e, "__esModule", { value: !0 }),
      (e.extendSubschemaMode = e.extendSubschemaData = e.getSubschema = void 0));
    let t = te(),
      r = ne();
    function s(
      i,
      {
        keyword: keyword,
        schemaProp: schemaProp,
        schema: schema,
        schemaPath: schemaPath,
        errSchemaPath: errSchemaPath,
        topSchemaRef: topSchemaRef,
      },
    ) {
      if (keyword !== void 0 && schema !== void 0)
        throw Error('both "keyword" and "schema" passed, only one allowed');
      if (keyword !== void 0) {
        let P = i.schema[keyword];
        return schemaProp === void 0
          ? {
              schema: P,
              schemaPath: t._`${i.schemaPath}${(0, t.getProperty)(keyword)}`,
              errSchemaPath: `${i.errSchemaPath}/${keyword}`,
            }
          : {
              schema: P[schemaProp],
              schemaPath: t._`${i.schemaPath}${(0, t.getProperty)(keyword)}${(0, t.getProperty)(schemaProp)}`,
              errSchemaPath: `${i.errSchemaPath}/${keyword}/${(0, r.escapeFragment)(schemaProp)}`,
            };
      }
      if (schema !== void 0) {
        if (schemaPath === void 0 || errSchemaPath === void 0 || topSchemaRef === void 0)
          throw Error('"schemaPath", "errSchemaPath" and "topSchemaRef" are required with "schema"');
        return {
          schema: schema,
          schemaPath: schemaPath,
          topSchemaRef: topSchemaRef,
          errSchemaPath: errSchemaPath,
        };
      }
      throw Error('either "keyword" or "schema" must be passed');
    }
    e.getSubschema = s;
    function a(
      i,
      l,
      {
        dataProp: dataProp,
        dataPropType: dataPropType,
        data: m,
        dataTypes: dataTypes,
        propertyName: propertyName,
      },
    ) {
      if (m !== void 0 && dataProp !== void 0)
        throw Error('both "data" and "dataProp" passed, only one allowed');
      let { gen: gen } = l;
      if (dataProp !== void 0) {
        let { errorPath: errorPath, dataPathArr: dataPathArr, opts: opts } = l;
        (y(gen.let("data", t._`${l.data}${(0, t.getProperty)(dataProp)}`, !0)),
          (i.errorPath = t.str`${errorPath}${(0, r.getErrorPath)(dataProp, dataPropType, opts.jsPropertySyntax)}`),
          (i.parentDataProperty = t._`${dataProp}`),
          (i.dataPathArr = [...dataPathArr, i.parentDataProperty]));
      }
      if (m !== void 0) {
        if ((y(m instanceof t.Name ? m : gen.let("data", m, !0)), propertyName !== void 0))
          i.propertyName = propertyName;
      }
      if (dataTypes) i.dataTypes = dataTypes;
      function y(v) {
        ((i.data = v),
          (i.dataLevel = l.dataLevel + 1),
          (i.dataTypes = []),
          (l.definedProperties = new Set()),
          (i.parentData = l.data),
          (i.dataNames = [...l.dataNames, v]));
      }
    }
    e.extendSubschemaData = a;
    function n(
      i,
      {
        jtdDiscriminator: jtdDiscriminator,
        jtdMetadata: jtdMetadata,
        compositeRule: compositeRule,
        createErrors: createErrors,
        allErrors: allErrors,
      },
    ) {
      if (compositeRule !== void 0) i.compositeRule = compositeRule;
      if (createErrors !== void 0) i.createErrors = createErrors;
      if (allErrors !== void 0) i.allErrors = allErrors;
      ((i.jtdDiscriminator = jtdDiscriminator), (i.jtdMetadata = jtdMetadata));
    }
    e.extendSubschemaMode = n;
  }),
  Li = J((e, t) => {
    t.exports = function r(s, a) {
      if (s === a) return !0;
      if (s && a && typeof s == "object" && typeof a == "object") {
        if (s.constructor !== a.constructor) return !1;
        var n, i, l;
        if (Array.isArray(s)) {
          if (((n = s.length), n != a.length)) return !1;
          for (i = n; i-- !== 0;) if (!r(s[i], a[i])) return !1;
          return !0;
        }
        if (s.constructor === RegExp) return s.source === a.source && s.flags === a.flags;
        if (s.valueOf !== Object.prototype.valueOf) return s.valueOf() === a.valueOf();
        if (s.toString !== Object.prototype.toString) return s.toString() === a.toString();
        if (((l = Object.keys(s)), (n = l.length), n !== Object.keys(a).length)) return !1;
        for (i = n; i-- !== 0;) if (!Object.prototype.hasOwnProperty.call(a, l[i])) return !1;
        for (i = n; i-- !== 0;) {
          var c = l[i];
          if (!r(s[c], a[c])) return !1;
        }
        return !0;
      }
      return s !== s && a !== a;
    };
  }),
  bu = J((e, t) => {
    var r = (t.exports = function (n, i, l) {
      if (typeof i == "function") ((l = i), (i = {}));
      l = i.cb || l;
      var c = typeof l == "function" ? l : l.pre || function () {},
        d = l.post || function () {};
      s(i, c, d, n, "", n);
    });
    ((r.keywords = {
      additionalItems: !0,
      items: !0,
      contains: !0,
      additionalProperties: !0,
      propertyNames: !0,
      not: !0,
      if: !0,
      then: !0,
      else: !0,
    }),
      (r.arrayKeywords = { items: !0, allOf: !0, anyOf: !0, oneOf: !0 }),
      (r.propsKeywords = {
        $defs: !0,
        definitions: !0,
        properties: !0,
        patternProperties: !0,
        dependencies: !0,
      }),
      (r.skipKeywords = {
        default: !0,
        enum: !0,
        const: !0,
        required: !0,
        maximum: !0,
        minimum: !0,
        exclusiveMaximum: !0,
        exclusiveMinimum: !0,
        multipleOf: !0,
        maxLength: !0,
        minLength: !0,
        pattern: !0,
        format: !0,
        maxItems: !0,
        minItems: !0,
        uniqueItems: !0,
        maxProperties: !0,
        minProperties: !0,
      }));
    function s(n, i, l, c, d, m, _, w, P, y) {
      if (c && typeof c == "object" && !Array.isArray(c)) {
        i(c, d, m, _, w, P, y);
        for (var key in c) {
          var p = c[key];
          if (Array.isArray(p)) {
            if (key in r.arrayKeywords)
              for (var h = 0; h < p.length; h++) s(n, i, l, p[h], d + "/" + key + "/" + h, m, d, key, c, h);
          } else if (key in r.propsKeywords) {
            if (p && typeof p == "object")
              for (var key_2 in p) s(n, i, l, p[key_2], d + "/" + key + "/" + a(key_2), m, d, key, c, key_2);
          } else if (key in r.keywords || (n.allKeys && !(key in r.skipKeywords)))
            s(n, i, l, p, d + "/" + key, m, d, key, c);
        }
        l(c, d, m, _, w, P, y);
      }
    }
    function a(n) {
      return n.replace(/~/g, "~0").replace(/\//g, "~1");
    }
  }),
  _a = J((e) => {
    (Object.defineProperty(e, "__esModule", { value: !0 }),
      (e.getSchemaRefs =
        e.resolveUrl =
        e.normalizeId =
        e._getFullPath =
        e.getFullPath =
        e.inlineRef =
          void 0));
    let t = ne(),
      r = Li(),
      s = bu(),
      a = new Set([
        "type",
        "format",
        "pattern",
        "maxLength",
        "minLength",
        "maxProperties",
        "minProperties",
        "maxItems",
        "minItems",
        "maximum",
        "minimum",
        "uniqueItems",
        "multipleOf",
        "required",
        "enum",
        "const",
      ]);
    function n(p, h = !0) {
      if (typeof p == "boolean") return !0;
      if (h === !0) return !l(p);
      if (!h) return !1;
      return c(p) <= h;
    }
    e.inlineRef = n;
    let i = new Set(["$ref", "$recursiveRef", "$recursiveAnchor", "$dynamicRef", "$dynamicAnchor"]);
    function l(p) {
      for (let key in p) {
        if (i.has(key)) return !0;
        let S = p[key];
        if (Array.isArray(S) && S.some(l)) return !0;
        if (typeof S == "object" && l(S)) return !0;
      }
      return !1;
    }
    function c(p) {
      let h = 0;
      for (let key in p) {
        if (key === "$ref") return 1 / 0;
        if ((h++, a.has(key))) continue;
        if (typeof p[key] == "object") (0, t.eachItem)(p[key], (f) => (h += c(f)));
        if (h === 1 / 0) return 1 / 0;
      }
      return h;
    }
    function d(p, h = "", S) {
      if (S !== !1) h = w(h);
      return m(p, p.parse(h));
    }
    e.getFullPath = d;
    function m(p, h) {
      return p.serialize(h).split("#")[0] + "#";
    }
    e._getFullPath = m;
    let _ = /#\/?$/;
    function w(p) {
      return p ? p.replace(_, "") : "";
    }
    e.normalizeId = w;
    function P(p, h, S) {
      return ((S = w(S)), p.resolve(h, S));
    }
    e.resolveUrl = P;
    let y = /^[a-z_][-a-z0-9._]*$/i;
    function v(p, h) {
      if (typeof p == "boolean") return {};
      let { schemaId: schemaId, uriResolver: uriResolver } = this.opts,
        R = w(p[schemaId] || h),
        C = { "": R },
        b = d(uriResolver, R, !1),
        g = {},
        k = new Set();
      return (
        s(p, { allKeys: !0 }, (N, x, W, B) => {
          if (B === void 0) return;
          let se = b + x,
            le = C[B];
          if (typeof N[schemaId] == "string") le = ie.call(this, N[schemaId]);
          (Se.call(this, N.$anchor), Se.call(this, N.$dynamicAnchor), (C[x] = le));
          function ie(ae) {
            let resolve = this.opts.uriResolver.resolve;
            if (((ae = w(le ? resolve(le, ae) : ae)), k.has(ae))) throw H(ae);
            k.add(ae);
            let L = this.refs[ae];
            if (typeof L == "string") L = this.refs[L];
            if (typeof L == "object") V(N, L.schema, ae);
            else if (ae !== w(se))
              if (ae[0] === "#") (V(N, g[ae], ae), (g[ae] = N));
              else this.refs[ae] = se;
            return ae;
          }
          function Se(ae) {
            if (typeof ae == "string") {
              if (!y.test(ae)) throw Error(`invalid anchor "${ae}"`);
              ie.call(this, `#${ae}`);
            }
          }
        }),
        g
      );
      function V(N, x, W) {
        if (x !== void 0 && !r(N, x)) throw H(W);
      }
      function H(N) {
        return Error(`reference "${N}" resolves to more than one schema`);
      }
    }
    e.getSchemaRefs = v;
  }),
  so = J((e) => {
    (Object.defineProperty(e, "__esModule", { value: !0 }),
      (e.getData = e.KeywordCxt = e.validateFunctionCode = void 0));
    let t = gu(),
      r = Sa(),
      s = Ai(),
      a = Sa(),
      n = _u(),
      i = yu(),
      l = vu(),
      c = te(),
      d = Le(),
      m = _a(),
      _ = ne(),
      w = ga();
    function P(q) {
      if (b(q)) {
        if ((k(q), C(q))) {
          h(q);
          return;
        }
      }
      y(q, () => (0, t.topBoolOrEmptySchema)(q));
    }
    e.validateFunctionCode = P;
    function y(
      { gen: gen, validateName: validateName, schema: schema, schemaEnv: schemaEnv, opts: opts },
      ee,
    ) {
      if (opts.code.es5)
        gen.func(validateName, c._`${d.default.data}, ${d.default.valCxt}`, schemaEnv.$async, () => {
          (gen.code(c._`"use strict"; ${f(schema, opts)}`), p(gen, opts), gen.code(ee));
        });
      else
        gen.func(validateName, c._`${d.default.data}, ${v(opts)}`, schemaEnv.$async, () =>
          gen.code(f(schema, opts)).code(ee),
        );
    }
    function v(q) {
      return c._`{${d.default.instancePath}="", ${d.default.parentData}, ${d.default.parentDataProperty}, ${d.default.rootData}=${d.default.data}${q.dynamicRef ? c._`, ${d.default.dynamicAnchors}={}` : c.nil}}={}`;
    }
    function p(q, D) {
      q.if(
        d.default.valCxt,
        () => {
          if (
            (q.var(d.default.instancePath, c._`${d.default.valCxt}.${d.default.instancePath}`),
            q.var(d.default.parentData, c._`${d.default.valCxt}.${d.default.parentData}`),
            q.var(d.default.parentDataProperty, c._`${d.default.valCxt}.${d.default.parentDataProperty}`),
            q.var(d.default.rootData, c._`${d.default.valCxt}.${d.default.rootData}`),
            D.dynamicRef)
          )
            q.var(d.default.dynamicAnchors, c._`${d.default.valCxt}.${d.default.dynamicAnchors}`);
        },
        () => {
          if (
            (q.var(d.default.instancePath, c._`""`),
            q.var(d.default.parentData, c._`undefined`),
            q.var(d.default.parentDataProperty, c._`undefined`),
            q.var(d.default.rootData, d.default.data),
            D.dynamicRef)
          )
            q.var(d.default.dynamicAnchors, c._`{}`);
        },
      );
    }
    function h(q) {
      let { schema: schema, opts: opts, gen: gen } = q;
      y(q, () => {
        if (opts.$comment && schema.$comment) B(q);
        if ((N(q), gen.let(d.default.vErrors, null), gen.let(d.default.errors, 0), opts.unevaluated)) S(q);
        (V(q), se(q));
      });
    }
    function S(q) {
      let { gen: gen, validateName: validateName } = q;
      ((q.evaluated = gen.const("evaluated", c._`${validateName}.evaluated`)),
        gen.if(c._`${q.evaluated}.dynamicProps`, () => gen.assign(c._`${q.evaluated}.props`, c._`undefined`)),
        gen.if(c._`${q.evaluated}.dynamicItems`, () =>
          gen.assign(c._`${q.evaluated}.items`, c._`undefined`),
        ));
    }
    function f(q, D) {
      let F = typeof q == "object" && q[D.schemaId];
      return F && (D.code.source || D.code.process) ? c._`/*# sourceURL=${F} */` : c.nil;
    }
    function R(q, D) {
      if (b(q)) {
        if ((k(q), C(q))) {
          g(q, D);
          return;
        }
      }
      (0, t.boolOrEmptySchema)(q, D);
    }
    function C({ schema: schema, self: D }) {
      if (typeof schema == "boolean") return !schema;
      for (let key in schema) if (D.RULES.all[key]) return !0;
      return !1;
    }
    function b(q) {
      return typeof q.schema != "boolean";
    }
    function g(q, D) {
      let { schema: schema, gen: gen, opts: opts } = q;
      if (opts.$comment && schema.$comment) B(q);
      (x(q), W(q));
      let ee = gen.const("_errs", d.default.errors);
      (V(q, ee), gen.var(D, c._`${ee} === ${d.default.errors}`));
    }
    function k(q) {
      ((0, _.checkUnknownRules)(q), H(q));
    }
    function V(q, D) {
      if (q.opts.jtd) return ie(q, [], !1, D);
      let F = (0, r.getSchemaTypes)(q.schema);
      ie(q, F, !(0, r.coerceAndCheckDataType)(q, F), D);
    }
    function H(q) {
      let { schema: schema, errSchemaPath: errSchemaPath, opts: opts, self: Z } = q;
      if (schema.$ref && opts.ignoreKeywordsWithRef && (0, _.schemaHasRulesButRef)(schema, Z.RULES))
        Z.logger.warn(`$ref: keywords ignored in schema at path "${errSchemaPath}"`);
    }
    function N(q) {
      let { schema: schema, opts: opts } = q;
      if (schema.default !== void 0 && opts.useDefaults && opts.strictSchema)
        (0, _.checkStrictMode)(q, "default is ignored in the schema root");
    }
    function x(q) {
      let D = q.schema[q.opts.schemaId];
      if (D) q.baseId = (0, m.resolveUrl)(q.opts.uriResolver, q.baseId, D);
    }
    function W(q) {
      if (q.schema.$async && !q.schemaEnv.$async) throw Error("async schema in sync schema");
    }
    function B({ gen: gen, schemaEnv: schemaEnv, schema: schema, errSchemaPath: errSchemaPath, opts: opts }) {
      let $comment = schema.$comment;
      if (opts.$comment === !0) gen.code(c._`${d.default.self}.logger.log(${$comment})`);
      else if (typeof opts.$comment == "function") {
        let me = c.str`${errSchemaPath}/$comment`,
          scopeValue = gen.scopeValue("root", { ref: schemaEnv.root });
        gen.code(c._`${d.default.self}.opts.$comment(${$comment}, ${me}, ${scopeValue}.schema)`);
      }
    }
    function se(q) {
      let {
        gen: gen,
        schemaEnv: schemaEnv,
        validateName: validateName,
        ValidationError: ValidationError,
        opts: opts,
      } = q;
      if (schemaEnv.$async)
        gen.if(
          c._`${d.default.errors} === 0`,
          () => gen.return(d.default.data),
          () => gen.throw(c._`new ${ValidationError}(${d.default.vErrors})`),
        );
      else {
        if ((gen.assign(c._`${validateName}.errors`, d.default.vErrors), opts.unevaluated)) le(q);
        gen.return(c._`${d.default.errors} === 0`);
      }
    }
    function le({ gen: gen, evaluated: evaluated, props: props, items: items }) {
      if (props instanceof c.Name) gen.assign(c._`${evaluated}.props`, props);
      if (items instanceof c.Name) gen.assign(c._`${evaluated}.items`, items);
    }
    function ie(q, D, F, X) {
      let { gen: gen, schema: schema, data: me, allErrors: allErrors, opts: opts, self: ge } = q,
        { RULES: RULES } = ge;
      if (schema.$ref && (opts.ignoreKeywordsWithRef || !(0, _.schemaHasRulesButRef)(schema, RULES))) {
        gen.block(() => re(q, "$ref", RULES.all.$ref.definition));
        return;
      }
      if (!opts.jtd) ae(q, D);
      gen.block(() => {
        for (let rule of RULES.rules) Oe(rule);
        Oe(RULES.post);
      });
      function Oe(ye) {
        if (!(0, s.shouldUseGroup)(schema, ye)) return;
        if (ye.type) {
          if (
            (gen.if((0, a.checkDataType)(ye.type, me, opts.strictNumbers)),
            Se(q, ye),
            D.length === 1 && D[0] === ye.type && F)
          )
            (gen.else(), (0, a.reportTypeError)(q));
          gen.endIf();
        } else Se(q, ye);
        if (!allErrors) gen.if(c._`${d.default.errors} === ${X || 0}`);
      }
    }
    function Se(q, D) {
      let {
        gen: gen,
        schema: schema,
        opts: { useDefaults: Z },
      } = q;
      if (Z) (0, n.assignDefaults)(q, D.type);
      gen.block(() => {
        for (let rule of D.rules)
          if ((0, s.shouldUseRule)(schema, rule)) re(q, rule.keyword, rule.definition, D.type);
      });
    }
    function ae(q, D) {
      if (q.schemaEnv.meta || !q.opts.strictTypes) return;
      if ((O(q, D), !q.opts.allowUnionTypes)) L(q, D);
      K(q, q.dataTypes);
    }
    function O(q, D) {
      if (!D.length) return;
      if (!q.dataTypes.length) {
        q.dataTypes = D;
        return;
      }
      (D.forEach((F) => {
        if (!I(q.dataTypes, F)) G(q, `type "${F}" not allowed by context "${q.dataTypes.join(",")}"`);
      }),
        j(q, D));
    }
    function L(q, D) {
      if (D.length > 1 && !(D.length === 2 && D.includes("null")))
        G(q, "use allowUnionTypes to allow union type keyword");
    }
    function K(q, D) {
      let all = q.self.RULES.all;
      for (let key in all) {
        let Z = all[key];
        if (typeof Z == "object" && (0, s.shouldUseRule)(q.schema, Z)) {
          let { type: ee } = Z.definition;
          if (ee.length && !ee.some((me) => z(D, me)))
            G(q, `missing type "${ee.join(",")}" for keyword "${key}"`);
        }
      }
    }
    function z(q, D) {
      return q.includes(D) || (D === "number" && q.includes("integer"));
    }
    function I(q, D) {
      return q.includes(D) || (D === "integer" && q.includes("number"));
    }
    function j(q, D) {
      let F = [];
      for (let dataType of q.dataTypes)
        if (I(D, dataType)) F.push(dataType);
        else if (D.includes("integer") && dataType === "number") F.push("integer");
      q.dataTypes = F;
    }
    function G(q, D) {
      let F = q.schemaEnv.baseId + q.errSchemaPath;
      ((D += ` at "${F}" (strictTypes)`), (0, _.checkStrictMode)(q, D, q.opts.strictTypes));
    }
    var Y = class {
      constructor(q, D, F) {
        if (
          ((0, i.validateKeywordUsage)(q, D, F),
          (this.gen = q.gen),
          (this.allErrors = q.allErrors),
          (this.keyword = F),
          (this.data = q.data),
          (this.schema = q.schema[F]),
          (this.$data = D.$data && q.opts.$data && this.schema && this.schema.$data),
          (this.schemaValue = (0, _.schemaRefOrVal)(q, this.schema, F, this.$data)),
          (this.schemaType = D.schemaType),
          (this.parentSchema = q.schema),
          (this.params = {}),
          (this.it = q),
          (this.def = D),
          this.$data)
        )
          this.schemaCode = q.gen.const("vSchema", Pe(this.$data, q));
        else if (
          ((this.schemaCode = this.schemaValue),
          !(0, i.validSchemaType)(this.schema, D.schemaType, D.allowUndefined))
        )
          throw Error(`${F} value must be ${JSON.stringify(D.schemaType)}`);
        if ("code" in D ? D.trackErrors : D.errors !== !1)
          this.errsCount = q.gen.const("_errs", d.default.errors);
      }
      result(q, D, F) {
        this.failResult((0, c.not)(q), D, F);
      }
      failResult(q, D, F) {
        if ((this.gen.if(q), F)) F();
        else this.error();
        if (D) {
          if ((this.gen.else(), D(), this.allErrors)) this.gen.endIf();
        } else if (this.allErrors) this.gen.endIf();
        else this.gen.else();
      }
      pass(q, D) {
        this.failResult((0, c.not)(q), void 0, D);
      }
      fail(q) {
        if (q === void 0) {
          if ((this.error(), !this.allErrors)) this.gen.if(!1);
          return;
        }
        if ((this.gen.if(q), this.error(), this.allErrors)) this.gen.endIf();
        else this.gen.else();
      }
      fail$data(q) {
        if (!this.$data) return this.fail(q);
        let { schemaCode: schemaCode } = this;
        this.fail(c._`${schemaCode} !== undefined && (${(0, c.or)(this.invalid$data(), q)})`);
      }
      error(q, D, F) {
        if (D) {
          (this.setParams(D), this._error(q, F), this.setParams({}));
          return;
        }
        this._error(q, F);
      }
      _error(q, D) {
        (q ? w.reportExtraError : w.reportError)(this, this.def.error, D);
      }
      $dataError() {
        (0, w.reportError)(this, this.def.$dataError || w.keyword$DataError);
      }
      reset() {
        if (this.errsCount === void 0) throw Error('add "trackErrors" to keyword definition');
        (0, w.resetErrorsCount)(this.gen, this.errsCount);
      }
      ok(q) {
        if (!this.allErrors) this.gen.if(q);
      }
      setParams(q, D) {
        if (D) Object.assign(this.params, q);
        else this.params = q;
      }
      block$data(q, D, F = c.nil) {
        this.gen.block(() => {
          (this.check$data(q, F), D());
        });
      }
      check$data(q = c.nil, D = c.nil) {
        if (!this.$data) return;
        let { gen: gen, schemaCode: schemaCode, schemaType: schemaType, def: def } = this;
        if ((gen.if((0, c.or)(c._`${schemaCode} === undefined`, D)), q !== c.nil)) gen.assign(q, !0);
        if (schemaType.length || def.validateSchema) {
          if ((gen.elseIf(this.invalid$data()), this.$dataError(), q !== c.nil)) gen.assign(q, !1);
        }
        gen.else();
      }
      invalid$data() {
        let { gen: gen, schemaCode: schemaCode, schemaType: schemaType, def: def, it: it } = this;
        return (0, c.or)(ee(), me());
        function ee() {
          if (schemaType.length) {
            if (!(schemaCode instanceof c.Name)) throw Error("ajv implementation error");
            let _e = Array.isArray(schemaType) ? schemaType : [schemaType];
            return c._`${(0, a.checkDataTypes)(_e, schemaCode, it.opts.strictNumbers, a.DataType.Wrong)}`;
          }
          return c.nil;
        }
        function me() {
          if (def.validateSchema) {
            let scopeValue = gen.scopeValue("validate$data", { ref: def.validateSchema });
            return c._`!${scopeValue}(${schemaCode})`;
          }
          return c.nil;
        }
      }
      subschema(q, D) {
        let F = (0, l.getSubschema)(this.it, q);
        ((0, l.extendSubschemaData)(F, this.it, q), (0, l.extendSubschemaMode)(F, q));
        let X = { ...this.it, ...F, items: void 0, props: void 0 };
        return (R(X, D), X);
      }
      mergeEvaluated(q, D) {
        let { it: it, gen: gen } = this;
        if (!it.opts.unevaluated) return;
        if (it.props !== !0 && q.props !== void 0)
          it.props = _.mergeEvaluated.props(gen, q.props, it.props, D);
        if (it.items !== !0 && q.items !== void 0)
          it.items = _.mergeEvaluated.items(gen, q.items, it.items, D);
      }
      mergeValidEvaluated(q, D) {
        let { it: it, gen: gen } = this;
        if (it.opts.unevaluated && (it.props !== !0 || it.items !== !0))
          return (gen.if(D, () => this.mergeEvaluated(q, c.Name)), !0);
      }
    };
    e.KeywordCxt = Y;
    function re(q, D, F, X) {
      let Z = new Y(q, F, D);
      if ("code" in F) F.code(Z, X);
      else if (Z.$data && F.validate) (0, i.funcKeywordCode)(Z, F);
      else if ("macro" in F) (0, i.macroKeywordCode)(Z, F);
      else if (F.compile || F.validate) (0, i.funcKeywordCode)(Z, F);
    }
    let Q = /^\/(?:[^~]|~0|~1)*$/,
      ce = /^([0-9]+)(#|\/(?:[^~]|~0|~1)*)?$/;
    function Pe(q, { dataLevel: dataLevel, dataNames: dataNames, dataPathArr: dataPathArr }) {
      let Z, ee;
      if (q === "") return d.default.rootData;
      if (q[0] === "/") {
        if (!Q.test(q)) throw Error(`Invalid JSON-pointer: ${q}`);
        ((Z = q), (ee = d.default.rootData));
      } else {
        let match = ce.exec(q);
        if (!match) throw Error(`Invalid JSON-pointer: ${q}`);
        let ue = +match[1];
        if (((Z = match[2]), Z === "#")) {
          if (ue >= dataLevel) throw Error(Re("property/index", ue));
          return dataPathArr[dataLevel - ue];
        }
        if (ue > dataLevel) throw Error(Re("data", ue));
        if (((ee = dataNames[dataLevel - ue]), !Z)) return ee;
      }
      let me = ee,
        parts = Z.split("/");
      for (let ge of parts)
        if (ge)
          ((ee = c._`${ee}${(0, c.getProperty)((0, _.unescapeJsonPointer)(ge))}`),
            (me = c._`${me} && ${ee}`));
      return me;
      function Re(ge, ue) {
        return `Cannot access ${ge} ${ue} levels up, current level is ${dataLevel}`;
      }
    }
    e.getData = Pe;
  }),
  ya = J((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 });
    var t = class extends Error {
      constructor(r) {
        super("validation failed");
        ((this.errors = r), (this.ajv = this.validation = !0));
      }
    };
    e.default = t;
  }),
  ao = J((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 });
    let t = _a();
    var r = class extends Error {
      constructor(s, a, n, i) {
        super(i || `can't resolve reference ${n} from id ${a}`);
        ((this.missingRef = (0, t.resolveUrl)(s, a, n)),
          (this.missingSchema = (0, t.normalizeId)((0, t.getFullPath)(s, this.missingRef))));
      }
    };
    e.default = r;
  }),
  va = J((e) => {
    (Object.defineProperty(e, "__esModule", { value: !0 }),
      (e.resolveSchema = e.getCompilingSchema = e.resolveRef = e.compileSchema = e.SchemaEnv = void 0));
    let t = te(),
      r = ya(),
      s = Le(),
      a = _a(),
      n = ne(),
      i = so();
    var l = class {
      constructor(h) {
        var S;
        ((this.refs = {}), (this.dynamicAnchors = {}));
        let f;
        if (typeof h.schema == "object") f = h.schema;
        ((this.schema = h.schema),
          (this.schemaId = h.schemaId),
          (this.root = h.root || this),
          (this.baseId =
            (S = h.baseId) !== null && S !== void 0
              ? S
              : (0, a.normalizeId)(f === null || f === void 0 ? void 0 : f[h.schemaId || "$id"])),
          (this.schemaPath = h.schemaPath),
          (this.localRefs = h.localRefs),
          (this.meta = h.meta),
          (this.$async = f === null || f === void 0 ? void 0 : f.$async),
          (this.refs = {}));
      }
    };
    e.SchemaEnv = l;
    function c(h) {
      let S = _.call(this, h);
      if (S) return S;
      let f = (0, a.getFullPath)(this.opts.uriResolver, h.root.baseId),
        { es5: es5, lines: lines } = this.opts.code,
        { ownProperties: ownProperties } = this.opts,
        g = new t.CodeGen(this.scope, { es5: es5, lines: lines, ownProperties: ownProperties }),
        k;
      if (h.$async)
        k = g.scopeValue("Error", {
          ref: r.default,
          code: t._`require("ajv/dist/runtime/validation_error").default`,
        });
      let scopeName = g.scopeName("validate");
      h.validateName = scopeName;
      let H = {
          gen: g,
          allErrors: this.opts.allErrors,
          data: s.default.data,
          parentData: s.default.parentData,
          parentDataProperty: s.default.parentDataProperty,
          dataNames: [s.default.data],
          dataPathArr: [t.nil],
          dataLevel: 0,
          dataTypes: [],
          definedProperties: new Set(),
          topSchemaRef: g.scopeValue(
            "schema",
            this.opts.code.source === !0
              ? { ref: h.schema, code: (0, t.stringify)(h.schema) }
              : { ref: h.schema },
          ),
          validateName: scopeName,
          ValidationError: k,
          schema: h.schema,
          schemaEnv: h,
          rootId: f,
          baseId: h.baseId || f,
          schemaPath: t.nil,
          errSchemaPath: h.schemaPath || (this.opts.jtd ? "" : "#"),
          errorPath: t._`""`,
          opts: this.opts,
          self: this,
        },
        N;
      try {
        (this._compilations.add(h), (0, i.validateFunctionCode)(H), g.optimize(this.opts.code.optimize));
        let str = g.toString();
        if (((N = `${g.scopeRefs(s.default.scope)}return ${str}`), this.opts.code.process))
          N = this.opts.code.process(N, h);
        let W = Function(`${s.default.self}`, `${s.default.scope}`, N)(this, this.scope.get());
        if (
          (this.scope.value(scopeName, { ref: W }),
          (W.errors = null),
          (W.schema = h.schema),
          (W.schemaEnv = h),
          h.$async)
        )
          W.$async = !0;
        if (this.opts.code.source === !0)
          W.source = { validateName: scopeName, validateCode: str, scopeValues: g._values };
        if (this.opts.unevaluated) {
          let { props: props, items: items } = H;
          if (
            ((W.evaluated = {
              props: props instanceof t.Name ? void 0 : props,
              items: items instanceof t.Name ? void 0 : items,
              dynamicProps: props instanceof t.Name,
              dynamicItems: items instanceof t.Name,
            }),
            W.source)
          )
            W.source.evaluated = (0, t.stringify)(W.evaluated);
        }
        return ((h.validate = W), h);
      } catch (error) {
        if ((delete h.validate, delete h.validateName, N))
          this.logger.error("Error compiling schema, function code:", N);
        throw error;
      } finally {
        this._compilations.delete(h);
      }
    }
    e.compileSchema = c;
    function d(h, S, f) {
      var R;
      f = (0, a.resolveUrl)(this.opts.uriResolver, S, f);
      let C = h.refs[f];
      if (C) return C;
      let b = P.call(this, h, f);
      if (b === void 0) {
        let g = (R = h.localRefs) === null || R === void 0 ? void 0 : R[f],
          { schemaId: schemaId } = this.opts;
        if (g) b = new l({ schema: g, schemaId: schemaId, root: h, baseId: S });
      }
      if (b === void 0) return;
      return (h.refs[f] = m.call(this, b));
    }
    e.resolveRef = d;
    function m(h) {
      if ((0, a.inlineRef)(h.schema, this.opts.inlineRefs)) return h.schema;
      return h.validate ? h : c.call(this, h);
    }
    function _(h) {
      for (let _compilation of this._compilations) if (w(_compilation, h)) return _compilation;
    }
    e.getCompilingSchema = _;
    function w(h, S) {
      return h.schema === S.schema && h.root === S.root && h.baseId === S.baseId;
    }
    function P(h, S) {
      let f;
      while (typeof (f = this.refs[S]) == "string") S = f;
      return f || this.schemas[S] || y.call(this, h, S);
    }
    function y(h, S) {
      let parse = this.opts.uriResolver.parse(S),
        R = (0, a._getFullPath)(this.opts.uriResolver, parse),
        C = (0, a.getFullPath)(this.opts.uriResolver, h.baseId, void 0);
      if (Object.keys(h.schema).length > 0 && R === C) return p.call(this, parse, h);
      let b = (0, a.normalizeId)(R),
        g = this.refs[b] || this.schemas[b];
      if (typeof g == "string") {
        let k = y.call(this, h, g);
        if (typeof (k === null || k === void 0 ? void 0 : k.schema) !== "object") return;
        return p.call(this, parse, k);
      }
      if (typeof (g === null || g === void 0 ? void 0 : g.schema) !== "object") return;
      if (!g.validate) c.call(this, g);
      if (b === (0, a.normalizeId)(S)) {
        let { schema: schema } = g,
          { schemaId: schemaId } = this.opts,
          H = schema[schemaId];
        if (H) C = (0, a.resolveUrl)(this.opts.uriResolver, C, H);
        return new l({ schema: schema, schemaId: schemaId, root: h, baseId: C });
      }
      return p.call(this, parse, g);
    }
    e.resolveSchema = y;
    let v = new Set(["properties", "patternProperties", "enum", "dependencies", "definitions"]);
    function p(h, { baseId: baseId, schema: schema, root: root }) {
      var C;
      if (((C = h.fragment) === null || C === void 0 ? void 0 : C[0]) !== "/") return;
      for (let k of h.fragment.slice(1).split("/")) {
        if (typeof schema === "boolean") return;
        let V = schema[(0, n.unescapeFragment)(k)];
        if (V === void 0) return;
        schema = V;
        let H = typeof schema === "object" && schema[this.opts.schemaId];
        if (!v.has(k) && H) baseId = (0, a.resolveUrl)(this.opts.uriResolver, baseId, H);
      }
      let b;
      if (typeof schema != "boolean" && schema.$ref && !(0, n.schemaHasRulesButRef)(schema, this.RULES)) {
        let k = (0, a.resolveUrl)(this.opts.uriResolver, baseId, schema.$ref);
        b = y.call(this, root, k);
      }
      let { schemaId: schemaId } = this.opts;
      if (
        ((b = b || new l({ schema: schema, schemaId: schemaId, root: root, baseId: baseId })),
        b.schema !== b.root.schema)
      )
        return b;
    }
  }),
  Ru = J((e, t) => {
    t.exports = {
      $id: "https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/refs/data.json#",
      description: "Meta-schema for $data reference (JSON AnySchema extension proposal)",
      type: "object",
      required: ["$data"],
      properties: {
        $data: { type: "string", anyOf: [{ format: "relative-json-pointer" }, { format: "json-pointer" }] },
      },
      additionalProperties: !1,
    };
  }),
  Ui = J((e, t) => {
    let r = RegExp.prototype.test.bind(/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/iu),
      s = RegExp.prototype.test.bind(
        /^(?:(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)$/u,
      );
    function a(y) {
      let v = "",
        p = 0,
        h = 0;
      for (h = 0; h < y.length; h++) {
        if (((p = y[h].charCodeAt(0)), p === 48)) continue;
        if (!((p >= 48 && p <= 57) || (p >= 65 && p <= 70) || (p >= 97 && p <= 102))) return "";
        v += y[h];
        break;
      }
      for (h += 1; h < y.length; h++) {
        if (
          ((p = y[h].charCodeAt(0)), !((p >= 48 && p <= 57) || (p >= 65 && p <= 70) || (p >= 97 && p <= 102)))
        )
          return "";
        v += y[h];
      }
      return v;
    }
    let n = RegExp.prototype.test.bind(/[^!"$&'()*+,\-.;=_`a-z{}~]/u);
    function i(y) {
      return ((y.length = 0), !0);
    }
    function l(y, v, p) {
      if (y.length) {
        let h = a(y);
        if (h !== "") v.push(h);
        else return ((p.error = !0), !1);
        y.length = 0;
      }
      return !0;
    }
    function c(y) {
      let v = 0,
        p = { error: !1, address: "", zone: "" },
        h = [],
        S = [],
        f = !1,
        R = !1,
        C = l;
      for (let b = 0; b < y.length; b++) {
        let g = y[b];
        if (g === "[" || g === "]") continue;
        if (g === ":") {
          if (f === !0) R = !0;
          if (!C(S, h, p)) break;
          if (++v > 7) {
            p.error = !0;
            break;
          }
          if (b > 0 && y[b - 1] === ":") f = !0;
          h.push(":");
          continue;
        } else if (g === "%") {
          if (!C(S, h, p)) break;
          C = i;
        } else {
          S.push(g);
          continue;
        }
      }
      if (S.length)
        if (C === i) p.zone = S.join("");
        else if (R) h.push(S.join(""));
        else h.push(a(S));
      return ((p.address = h.join("")), p);
    }
    function d(y) {
      if (m(y, ":") < 2) return { host: y, isIPV6: !1 };
      let v = c(y);
      if (!v.error) {
        let { address: address, address: address_2 } = v;
        if (v.zone) ((address += "%" + v.zone), (address_2 += "%25" + v.zone));
        return { host: address, isIPV6: !0, escapedHost: address_2 };
      } else return { host: y, isIPV6: !1 };
    }
    function m(y, v) {
      let p = 0;
      for (let h = 0; h < y.length; h++) if (y[h] === v) p++;
      return p;
    }
    function _(y) {
      let v = y,
        p = [],
        h = -1,
        S = 0;
      while ((S = v.length)) {
        if (S === 1)
          if (v === ".") break;
          else if (v === "/") {
            p.push("/");
            break;
          } else {
            p.push(v);
            break;
          }
        else if (S === 2) {
          if (v[0] === ".") {
            if (v[1] === ".") break;
            else if (v[1] === "/") {
              v = v.slice(2);
              continue;
            }
          } else if (v[0] === "/") {
            if (v[1] === "." || v[1] === "/") {
              p.push("/");
              break;
            }
          }
        } else if (S === 3) {
          if (v === "/..") {
            if (p.length !== 0) p.pop();
            p.push("/");
            break;
          }
        }
        if (v[0] === ".") {
          if (v[1] === ".") {
            if (v[2] === "/") {
              v = v.slice(3);
              continue;
            }
          } else if (v[1] === "/") {
            v = v.slice(2);
            continue;
          }
        } else if (v[0] === "/") {
          if (v[1] === ".") {
            if (v[2] === "/") {
              v = v.slice(2);
              continue;
            } else if (v[2] === ".") {
              if (v[3] === "/") {
                if (((v = v.slice(3)), p.length !== 0)) p.pop();
                continue;
              }
            }
          }
        }
        if ((h = v.indexOf("/", 1)) === -1) {
          p.push(v);
          break;
        } else (p.push(v.slice(0, h)), (v = v.slice(h)));
      }
      return p.join("");
    }
    function w(y, v) {
      let p = v !== !0 ? escape : unescape;
      if (y.scheme !== void 0) y.scheme = p(y.scheme);
      if (y.userinfo !== void 0) y.userinfo = p(y.userinfo);
      if (y.host !== void 0) y.host = p(y.host);
      if (y.path !== void 0) y.path = p(y.path);
      if (y.query !== void 0) y.query = p(y.query);
      if (y.fragment !== void 0) y.fragment = p(y.fragment);
      return y;
    }
    function P(y) {
      let v = [];
      if (y.userinfo !== void 0) (v.push(y.userinfo), v.push("@"));
      if (y.host !== void 0) {
        let p = unescape(y.host);
        if (!s(p)) {
          let h = d(p);
          if (h.isIPV6 === !0) p = `[${h.escapedHost}]`;
          else p = y.host;
        }
        v.push(p);
      }
      if (typeof y.port === "number" || typeof y.port === "string") (v.push(":"), v.push(String(y.port)));
      return v.length ? v.join("") : void 0;
    }
    t.exports = {
      nonSimpleDomain: n,
      recomposeAuthority: P,
      normalizeComponentEncoding: w,
      removeDotSegments: _,
      isIPv4: s,
      isUUID: r,
      normalizeIPv6: d,
      stringArrayToHexStripped: a,
    };
  }),
  zu = J((e, t) => {
    let { isUUID: isUUID } = Ui(),
      s = /([\da-z][\d\-a-z]{0,31}):((?:[\w!$'()*+,\-.:;=@]|%[\da-f]{2})+)/iu,
      a = ["http", "https", "ws", "wss", "urn", "urn:uuid"];
    function n(g) {
      return a.indexOf(g) !== -1;
    }
    function i(g) {
      if (g.secure === !0) return !0;
      else if (g.secure === !1) return !1;
      else if (g.scheme)
        return (
          g.scheme.length === 3 &&
          (g.scheme[0] === "w" || g.scheme[0] === "W") &&
          (g.scheme[1] === "s" || g.scheme[1] === "S") &&
          (g.scheme[2] === "s" || g.scheme[2] === "S")
        );
      else return !1;
    }
    function l(g) {
      if (!g.host) g.error = g.error || "HTTP URIs must have a host.";
      return g;
    }
    function c(g) {
      let k = String(g.scheme).toLowerCase() === "https";
      if (g.port === (k ? 443 : 80) || g.port === "") g.port = void 0;
      if (!g.path) g.path = "/";
      return g;
    }
    function d(g) {
      return (
        (g.secure = i(g)),
        (g.resourceName = (g.path || "/") + (g.query ? "?" + g.query : "")),
        (g.path = void 0),
        (g.query = void 0),
        g
      );
    }
    function m(g) {
      if (g.port === (i(g) ? 443 : 80) || g.port === "") g.port = void 0;
      if (typeof g.secure === "boolean") ((g.scheme = g.secure ? "wss" : "ws"), (g.secure = void 0));
      if (g.resourceName) {
        let [k, V] = g.resourceName.split("?");
        ((g.path = k && k !== "/" ? k : void 0), (g.query = V), (g.resourceName = void 0));
      }
      return ((g.fragment = void 0), g);
    }
    function _(g, k) {
      if (!g.path) return ((g.error = "URN can not be parsed"), g);
      let match = g.path.match(s);
      if (match) {
        let H = k.scheme || g.scheme || "urn";
        ((g.nid = match[1].toLowerCase()), (g.nss = match[2]));
        let N = b(`${H}:${k.nid || g.nid}`);
        if (((g.path = void 0), N)) g = N.parse(g, k);
      } else g.error = g.error || "URN can not be parsed.";
      return g;
    }
    function w(g, k) {
      if (g.nid === void 0) throw Error("URN without nid cannot be serialized");
      let V = k.scheme || g.scheme || "urn",
        lower = g.nid.toLowerCase(),
        N = b(`${V}:${k.nid || lower}`);
      if (N) g = N.serialize(g, k);
      let x = g,
        nss = g.nss;
      return ((x.path = `${lower || k.nid}:${nss}`), (k.skipEscape = !0), x);
    }
    function P(g, k) {
      let V = g;
      if (((V.uuid = V.nss), (V.nss = void 0), !k.tolerant && (!V.uuid || !isUUID(V.uuid))))
        V.error = V.error || "UUID is not valid.";
      return V;
    }
    function y(g) {
      let k = g;
      return ((k.nss = (g.uuid || "").toLowerCase()), k);
    }
    let v = { scheme: "http", domainHost: !0, parse: l, serialize: c },
      p = { scheme: "https", domainHost: v.domainHost, parse: l, serialize: c },
      h = { scheme: "ws", domainHost: !0, parse: d, serialize: m },
      S = { scheme: "wss", domainHost: h.domainHost, parse: h.parse, serialize: h.serialize },
      C = {
        http: v,
        https: p,
        ws: h,
        wss: S,
        urn: { scheme: "urn", parse: _, serialize: w, skipNormalize: !0 },
        "urn:uuid": { scheme: "urn:uuid", parse: P, serialize: y, skipNormalize: !0 },
      };
    Object.setPrototypeOf(C, null);
    function b(g) {
      return (g && (C[g] || C[g.toLowerCase()])) || void 0;
    }
    t.exports = { wsIsSecure: i, SCHEMES: C, isValidSchemeName: n, getSchemeHandler: b };
  }),
  wu = J((e, t) => {
    let {
        normalizeIPv6: normalizeIPv6,
        removeDotSegments: removeDotSegments,
        recomposeAuthority: recomposeAuthority,
        normalizeComponentEncoding: normalizeComponentEncoding,
        isIPv4: isIPv4,
        nonSimpleDomain: nonSimpleDomain,
      } = Ui(),
      { SCHEMES: SCHEMES, getSchemeHandler: getSchemeHandler } = zu();
    function m(S, f) {
      if (typeof S === "string") S = y(p(S, f), f);
      else if (typeof S === "object") S = p(y(S, f), f);
      return S;
    }
    function _(S, f, R) {
      let C = R ? Object.assign({ scheme: "null" }, R) : { scheme: "null" },
        b = w(p(S, C), p(f, C), C, !0);
      return ((C.skipEscape = !0), y(b, C));
    }
    function w(S, f, R, C) {
      let b = {};
      if (!C) ((S = p(y(S, R), R)), (f = p(y(f, R), R)));
      if (((R = R || {}), !R.tolerant && f.scheme))
        ((b.scheme = f.scheme),
          (b.userinfo = f.userinfo),
          (b.host = f.host),
          (b.port = f.port),
          (b.path = removeDotSegments(f.path || "")),
          (b.query = f.query));
      else {
        if (f.userinfo !== void 0 || f.host !== void 0 || f.port !== void 0)
          ((b.userinfo = f.userinfo),
            (b.host = f.host),
            (b.port = f.port),
            (b.path = removeDotSegments(f.path || "")),
            (b.query = f.query));
        else {
          if (!f.path)
            if (((b.path = S.path), f.query !== void 0)) b.query = f.query;
            else b.query = S.query;
          else {
            if (f.path[0] === "/") b.path = removeDotSegments(f.path);
            else {
              if ((S.userinfo !== void 0 || S.host !== void 0 || S.port !== void 0) && !S.path)
                b.path = "/" + f.path;
              else if (!S.path) b.path = f.path;
              else b.path = S.path.slice(0, S.path.lastIndexOf("/") + 1) + f.path;
              b.path = removeDotSegments(b.path);
            }
            b.query = f.query;
          }
          ((b.userinfo = S.userinfo), (b.host = S.host), (b.port = S.port));
        }
        b.scheme = S.scheme;
      }
      return ((b.fragment = f.fragment), b);
    }
    function P(S, f, R) {
      if (typeof S === "string")
        ((S = unescape(S)), (S = y(normalizeComponentEncoding(p(S, R), !0), { ...R, skipEscape: !0 })));
      else if (typeof S === "object") S = y(normalizeComponentEncoding(S, !0), { ...R, skipEscape: !0 });
      if (typeof f === "string")
        ((f = unescape(f)), (f = y(normalizeComponentEncoding(p(f, R), !0), { ...R, skipEscape: !0 })));
      else if (typeof f === "object") f = y(normalizeComponentEncoding(f, !0), { ...R, skipEscape: !0 });
      return S.toLowerCase() === f.toLowerCase();
    }
    function y(S, f) {
      let R = {
          host: S.host,
          scheme: S.scheme,
          userinfo: S.userinfo,
          port: S.port,
          path: S.path,
          query: S.query,
          nid: S.nid,
          nss: S.nss,
          uuid: S.uuid,
          fragment: S.fragment,
          reference: S.reference,
          resourceName: S.resourceName,
          secure: S.secure,
          error: "",
        },
        merged = Object.assign({}, f),
        b = [],
        g = getSchemeHandler(merged.scheme || R.scheme);
      if (g && g.serialize) g.serialize(R, merged);
      if (R.path !== void 0)
        if (!merged.skipEscape) {
          if (((R.path = escape(R.path)), R.scheme !== void 0)) R.path = R.path.split("%3A").join(":");
        } else R.path = unescape(R.path);
      if (merged.reference !== "suffix" && R.scheme) b.push(R.scheme, ":");
      let k = recomposeAuthority(R);
      if (k !== void 0) {
        if (merged.reference !== "suffix") b.push("//");
        if ((b.push(k), R.path && R.path[0] !== "/")) b.push("/");
      }
      if (R.path !== void 0) {
        let path = R.path;
        if (!merged.absolutePath && (!g || !g.absolutePath)) path = removeDotSegments(path);
        if (k === void 0 && path[0] === "/" && path[1] === "/") path = "/%2F" + path.slice(2);
        b.push(path);
      }
      if (R.query !== void 0) b.push("?", R.query);
      if (R.fragment !== void 0) b.push("#", R.fragment);
      return b.join("");
    }
    let v =
      /^(?:([^#/:?]+):)?(?:\/\/((?:([^#/?@]*)@)?(\[[^#/?\]]+\]|[^#/:?]*)(?::(\d*))?))?([^#?]*)(?:\?([^#]*))?(?:#((?:.|[\n\r])*))?/u;
    function p(S, f) {
      let merged = Object.assign({}, f),
        C = {
          scheme: void 0,
          userinfo: void 0,
          host: "",
          port: void 0,
          path: "",
          query: void 0,
          fragment: void 0,
        },
        b = !1;
      if (merged.reference === "suffix")
        if (merged.scheme) S = merged.scheme + ":" + S;
        else S = "//" + S;
      let match = S.match(v);
      if (match) {
        if (
          ((C.scheme = match[1]),
          (C.userinfo = match[3]),
          (C.host = match[4]),
          (C.port = parseInt(match[5], 10)),
          (C.path = match[6] || ""),
          (C.query = match[7]),
          (C.fragment = match[8]),
          isNaN(C.port))
        )
          C.port = match[5];
        if (C.host)
          if (isIPv4(C.host) === !1) {
            let V = normalizeIPv6(C.host);
            ((C.host = V.host.toLowerCase()), (b = V.isIPV6));
          } else b = !0;
        if (
          C.scheme === void 0 &&
          C.userinfo === void 0 &&
          C.host === void 0 &&
          C.port === void 0 &&
          C.query === void 0 &&
          !C.path
        )
          C.reference = "same-document";
        else if (C.scheme === void 0) C.reference = "relative";
        else if (C.fragment === void 0) C.reference = "absolute";
        else C.reference = "uri";
        if (merged.reference && merged.reference !== "suffix" && merged.reference !== C.reference)
          C.error = C.error || "URI is not a " + merged.reference + " reference.";
        let k = getSchemeHandler(merged.scheme || C.scheme);
        if (!merged.unicodeSupport && (!k || !k.unicodeSupport)) {
          if (C.host && (merged.domainHost || (k && k.domainHost)) && b === !1 && nonSimpleDomain(C.host))
            try {
              C.host = URL.domainToASCII(C.host.toLowerCase());
            } catch (error) {
              C.error = C.error || "Host's domain name can not be converted to ASCII: " + error;
            }
        }
        if (!k || (k && !k.skipNormalize)) {
          if (S.indexOf("%") !== -1) {
            if (C.scheme !== void 0) C.scheme = unescape(C.scheme);
            if (C.host !== void 0) C.host = unescape(C.host);
          }
          if (C.path) C.path = escape(unescape(C.path));
          if (C.fragment) C.fragment = encodeURI(decodeURIComponent(C.fragment));
        }
        if (k && k.parse) k.parse(C, merged);
      } else C.error = C.error || "URI can not be parsed.";
      return C;
    }
    let h = {
      SCHEMES: SCHEMES,
      normalize: m,
      resolve: _,
      resolveComponent: w,
      equal: P,
      serialize: y,
      parse: p,
    };
    ((t.exports = h), (t.exports.default = h), (t.exports.fastUri = h));
  }),
  $u = J((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 });
    let t = wu();
    ((t.code = 'require("ajv/dist/runtime/uri").default'), (e.default = t));
  }),
  Di = J((e) => {
    (Object.defineProperty(e, "__esModule", { value: !0 }),
      (e.CodeGen = e.Name = e.nil = e.stringify = e.str = e._ = e.KeywordCxt = void 0));
    var t = so();
    Object.defineProperty(e, "KeywordCxt", {
      enumerable: !0,
      get: function () {
        return t.KeywordCxt;
      },
    });
    var r = te();
    (Object.defineProperty(e, "_", {
      enumerable: !0,
      get: function () {
        return r._;
      },
    }),
      Object.defineProperty(e, "str", {
        enumerable: !0,
        get: function () {
          return r.str;
        },
      }),
      Object.defineProperty(e, "stringify", {
        enumerable: !0,
        get: function () {
          return r.stringify;
        },
      }),
      Object.defineProperty(e, "nil", {
        enumerable: !0,
        get: function () {
          return r.nil;
        },
      }),
      Object.defineProperty(e, "Name", {
        enumerable: !0,
        get: function () {
          return r.Name;
        },
      }),
      Object.defineProperty(e, "CodeGen", {
        enumerable: !0,
        get: function () {
          return r.CodeGen;
        },
      }));
    let s = ya(),
      a = ao(),
      n = ji(),
      i = va(),
      l = te(),
      c = _a(),
      d = Sa(),
      m = ne(),
      _ = Ru(),
      w = $u(),
      P = (O, L) => new RegExp(O, L);
    P.code = "new RegExp";
    let y = ["removeAdditional", "useDefaults", "coerceTypes"],
      v = new Set([
        "validate",
        "serialize",
        "parse",
        "wrapper",
        "root",
        "schema",
        "keyword",
        "pattern",
        "formats",
        "validate$data",
        "func",
        "obj",
        "Error",
      ]),
      p = {
        errorDataPath: "",
        format: "`validateFormats: false` can be used instead.",
        nullable: '"nullable" keyword is supported by default.',
        jsonPointers: "Deprecated jsPropertySyntax can be used instead.",
        extendRefs: "Deprecated ignoreKeywordsWithRef can be used instead.",
        missingRefs: "Pass empty schema with $id that should be ignored to ajv.addSchema.",
        processCode: "Use option `code: {process: (code, schemaEnv: object) => string}`",
        sourceCode: "Use option `code: {source: true}`",
        strictDefaults: "It is default now, see option `strict`.",
        strictKeywords: "It is default now, see option `strict`.",
        uniqueItems: '"uniqueItems" keyword is always validated.',
        unknownFormats: "Disable strict mode or pass `true` to `ajv.addFormat` (or `formats` option).",
        cache: "Map is used as cache, schema object as key.",
        serialize: "Map is used as cache, schema object as key.",
        ajvErrors: "It is default now.",
      },
      h = {
        ignoreKeywordsWithRef: "",
        jsPropertySyntax: "",
        unicode: '"minLength"/"maxLength" account for unicode characters by default.',
      },
      S = 200;
    function f(O) {
      var L, K, z, I, j, G, Y, re, Q, ce, Pe, q, D, F, X, Z, ee, me, _e, Re, ge, ue, Oe, ye, Ve;
      let strict = O.strict,
        xe = (L = O.code) === null || L === void 0 ? void 0 : L.optimize,
        We = xe === !0 || xe === void 0 ? 1 : xe || 0,
        Ye = (z = (K = O.code) === null || K === void 0 ? void 0 : K.regExp) !== null && z !== void 0 ? z : P,
        it = (I = O.uriResolver) !== null && I !== void 0 ? I : w.default;
      return {
        strictSchema:
          (G = (j = O.strictSchema) !== null && j !== void 0 ? j : strict) !== null && G !== void 0 ? G : !0,
        strictNumbers:
          (re = (Y = O.strictNumbers) !== null && Y !== void 0 ? Y : strict) !== null && re !== void 0
            ? re
            : !0,
        strictTypes:
          (ce = (Q = O.strictTypes) !== null && Q !== void 0 ? Q : strict) !== null && ce !== void 0
            ? ce
            : "log",
        strictTuples:
          (q = (Pe = O.strictTuples) !== null && Pe !== void 0 ? Pe : strict) !== null && q !== void 0
            ? q
            : "log",
        strictRequired:
          (F = (D = O.strictRequired) !== null && D !== void 0 ? D : strict) !== null && F !== void 0
            ? F
            : !1,
        code: O.code ? { ...O.code, optimize: We, regExp: Ye } : { optimize: We, regExp: Ye },
        loopRequired: (X = O.loopRequired) !== null && X !== void 0 ? X : S,
        loopEnum: (Z = O.loopEnum) !== null && Z !== void 0 ? Z : S,
        meta: (ee = O.meta) !== null && ee !== void 0 ? ee : !0,
        messages: (me = O.messages) !== null && me !== void 0 ? me : !0,
        inlineRefs: (_e = O.inlineRefs) !== null && _e !== void 0 ? _e : !0,
        schemaId: (Re = O.schemaId) !== null && Re !== void 0 ? Re : "$id",
        addUsedSchema: (ge = O.addUsedSchema) !== null && ge !== void 0 ? ge : !0,
        validateSchema: (ue = O.validateSchema) !== null && ue !== void 0 ? ue : !0,
        validateFormats: (Oe = O.validateFormats) !== null && Oe !== void 0 ? Oe : !0,
        unicodeRegExp: (ye = O.unicodeRegExp) !== null && ye !== void 0 ? ye : !0,
        int32range: (Ve = O.int32range) !== null && Ve !== void 0 ? Ve : !0,
        uriResolver: it,
      };
    }
    var R = class {
      constructor(O = {}) {
        ((this.schemas = {}),
          (this.refs = {}),
          (this.formats = {}),
          (this._compilations = new Set()),
          (this._loading = {}),
          (this._cache = new Map()),
          (O = this.opts = { ...O, ...f(O) }));
        let { es5: es5, lines: lines } = this.opts.code;
        ((this.scope = new l.ValueScope({ scope: {}, prefixes: v, es5: es5, lines: lines })),
          (this.logger = x(O.logger)));
        let validateFormats = O.validateFormats;
        if (
          ((O.validateFormats = !1),
          (this.RULES = (0, n.getRules)()),
          C.call(this, p, O, "NOT SUPPORTED"),
          C.call(this, h, O, "DEPRECATED", "warn"),
          (this._metaOpts = H.call(this)),
          O.formats)
        )
          k.call(this);
        if ((this._addVocabularies(), this._addDefaultMetaSchema(), O.keywords)) V.call(this, O.keywords);
        if (typeof O.meta == "object") this.addMetaSchema(O.meta);
        (g.call(this), (O.validateFormats = validateFormats));
      }
      _addVocabularies() {
        this.addKeyword("$async");
      }
      _addDefaultMetaSchema() {
        let { $data: $data, meta: meta, schemaId: schemaId } = this.opts,
          z = _;
        if (schemaId === "id") ((z = { ..._ }), (z.id = z.$id), delete z.$id);
        if (meta && $data) this.addMetaSchema(z, z[schemaId], !1);
      }
      defaultMeta() {
        let { meta: meta, schemaId: schemaId } = this.opts;
        return (this.opts.defaultMeta = typeof meta == "object" ? meta[schemaId] || meta : void 0);
      }
      validate(O, L) {
        let K;
        if (typeof O == "string") {
          if (((K = this.getSchema(O)), !K)) throw Error(`no schema with key or ref "${O}"`);
        } else K = this.compile(O);
        let z = K(L);
        if (!("$async" in K)) this.errors = K.errors;
        return z;
      }
      compile(O, L) {
        let _addSchema = this._addSchema(O, L);
        return _addSchema.validate || this._compileSchemaEnv(_addSchema);
      }
      compileAsync(O, L) {
        if (typeof this.opts.loadSchema != "function") throw Error("options.loadSchema should be a function");
        let { loadSchema: loadSchema } = this.opts;
        return z.call(this, O, L);
        async function z(Q, ce) {
          await I.call(this, Q.$schema);
          let _addSchema = this._addSchema(Q, ce);
          return _addSchema.validate || j.call(this, _addSchema);
        }
        async function I(Q) {
          if (Q && !this.getSchema(Q)) await z.call(this, { $ref: Q }, !0);
        }
        async function j(Q) {
          try {
            return this._compileSchemaEnv(Q);
          } catch (error) {
            if (!(error instanceof a.default)) throw error;
            return (G.call(this, error), await Y.call(this, error.missingSchema), j.call(this, Q));
          }
        }
        function G({ missingSchema: missingSchema, missingRef: missingRef }) {
          if (this.refs[missingSchema])
            throw Error(`AnySchema ${missingSchema} is loaded but ${missingRef} cannot be resolved`);
        }
        async function Y(Q) {
          let ce = await re.call(this, Q);
          if (!this.refs[Q]) await I.call(this, ce.$schema);
          if (!this.refs[Q]) this.addSchema(ce, Q, L);
        }
        async function re(Q) {
          let ce = this._loading[Q];
          if (ce) return ce;
          try {
            return await (this._loading[Q] = loadSchema(Q));
          } finally {
            delete this._loading[Q];
          }
        }
      }
      addSchema(O, L, K, z = this.opts.validateSchema) {
        if (Array.isArray(O)) {
          for (let j of O) this.addSchema(j, void 0, K, z);
          return this;
        }
        let I;
        if (typeof O === "object") {
          let { schemaId: schemaId } = this.opts;
          if (((I = O[schemaId]), I !== void 0 && typeof I != "string"))
            throw Error(`schema ${schemaId} must be string`);
        }
        return (
          (L = (0, c.normalizeId)(L || I)),
          this._checkUnique(L),
          (this.schemas[L] = this._addSchema(O, K, L, z, !0)),
          this
        );
      }
      addMetaSchema(O, L, K = this.opts.validateSchema) {
        return (this.addSchema(O, L, !0, K), this);
      }
      validateSchema(O, L) {
        if (typeof O == "boolean") return !0;
        let K;
        if (((K = O.$schema), K !== void 0 && typeof K != "string")) throw Error("$schema must be a string");
        if (((K = K || this.opts.defaultMeta || this.defaultMeta()), !K))
          return (this.logger.warn("meta-schema not available"), (this.errors = null), !0);
        let validate = this.validate(K, O);
        if (!validate && L) {
          let I = "schema is invalid: " + this.errorsText();
          if (this.opts.validateSchema === "log") this.logger.error(I);
          else throw Error(I);
        }
        return validate;
      }
      getSchema(O) {
        let L;
        while (typeof (L = b.call(this, O)) == "string") O = L;
        if (L === void 0) {
          let { schemaId: schemaId } = this.opts,
            z = new i.SchemaEnv({ schema: {}, schemaId: schemaId });
          if (((L = i.resolveSchema.call(this, z, O)), !L)) return;
          this.refs[O] = L;
        }
        return L.validate || this._compileSchemaEnv(L);
      }
      removeSchema(O) {
        if (O instanceof RegExp)
          return (this._removeAllSchemas(this.schemas, O), this._removeAllSchemas(this.refs, O), this);
        switch (typeof O) {
          case "undefined":
            return (
              this._removeAllSchemas(this.schemas),
              this._removeAllSchemas(this.refs),
              this._cache.clear(),
              this
            );
          case "string": {
            let L = b.call(this, O);
            if (typeof L == "object") this._cache.delete(L.schema);
            return (delete this.schemas[O], delete this.refs[O], this);
          }
          case "object": {
            let L = O;
            this._cache.delete(L);
            let K = O[this.opts.schemaId];
            if (K) ((K = (0, c.normalizeId)(K)), delete this.schemas[K], delete this.refs[K]);
            return this;
          }
          default:
            throw Error("ajv.removeSchema: invalid parameter");
        }
      }
      addVocabulary(O) {
        for (let L of O) this.addKeyword(L);
        return this;
      }
      addKeyword(O, L) {
        let K;
        if (typeof O == "string") {
          if (((K = O), typeof L == "object"))
            (this.logger.warn("these parameters are deprecated, see docs for addKeyword"), (L.keyword = K));
        } else if (typeof O == "object" && L === void 0) {
          if (((L = O), (K = L.keyword), Array.isArray(K) && !K.length))
            throw Error("addKeywords: keyword must be string or non-empty array");
        } else throw Error("invalid addKeywords parameters");
        if ((B.call(this, K, L), !L)) return ((0, m.eachItem)(K, (I) => se.call(this, I)), this);
        ie.call(this, L);
        let z = { ...L, type: (0, d.getJSONTypes)(L.type), schemaType: (0, d.getJSONTypes)(L.schemaType) };
        return (
          (0, m.eachItem)(
            K,
            z.type.length === 0
              ? (I) => se.call(this, I, z)
              : (I) => z.type.forEach((j) => se.call(this, I, z, j)),
          ),
          this
        );
      }
      getKeyword(O) {
        let L = this.RULES.all[O];
        return typeof L == "object" ? L.definition : !!L;
      }
      removeKeyword(O) {
        let { RULES: RULES } = this;
        (delete RULES.keywords[O], delete RULES.all[O]);
        for (let rule of RULES.rules) {
          let index = rule.rules.findIndex((rule) => rule.keyword === O);
          if (index >= 0) rule.rules.splice(index, 1);
        }
        return this;
      }
      addFormat(O, L) {
        if (typeof L == "string") L = new RegExp(L);
        return ((this.formats[O] = L), this);
      }
      errorsText(O = this.errors, { separator: L = ", ", dataVar: K = "data" } = {}) {
        if (!O || O.length === 0) return "No errors";
        return O.map((z) => `${K}${z.instancePath} ${z.message}`).reduce((z, I) => z + L + I);
      }
      $dataMetaSchema(O, L) {
        let all = this.RULES.all;
        O = JSON.parse(JSON.stringify(O));
        for (let z of L) {
          let sliced = z.split("/").slice(1),
            j = O;
          for (let G of sliced) j = j[G];
          for (let key in all) {
            let Y = all[key];
            if (typeof Y != "object") continue;
            let { $data: $data } = Y.definition,
              Q = j[key];
            if ($data && Q) j[key] = ae(Q);
          }
        }
        return O;
      }
      _removeAllSchemas(O, L) {
        for (let key in O) {
          let z = O[key];
          if (!L || L.test(key)) {
            if (typeof z == "string") delete O[key];
            else if (z && !z.meta) (this._cache.delete(z.schema), delete O[key]);
          }
        }
      }
      _addSchema(O, L, K, z = this.opts.validateSchema, I = this.opts.addUsedSchema) {
        let j,
          { schemaId: schemaId } = this.opts;
        if (typeof O == "object") j = O[schemaId];
        else if (this.opts.jtd) throw Error("schema must be object");
        else if (typeof O != "boolean") throw Error("schema must be object or boolean");
        let Y = this._cache.get(O);
        if (Y !== void 0) return Y;
        K = (0, c.normalizeId)(j || K);
        let re = c.getSchemaRefs.call(this, O, K);
        if (
          ((Y = new i.SchemaEnv({ schema: O, schemaId: schemaId, meta: L, baseId: K, localRefs: re })),
          this._cache.set(Y.schema, Y),
          I && !K.startsWith("#"))
        ) {
          if (K) this._checkUnique(K);
          this.refs[K] = Y;
        }
        if (z) this.validateSchema(O, !0);
        return Y;
      }
      _checkUnique(O) {
        if (this.schemas[O] || this.refs[O]) throw Error(`schema with key or id "${O}" already exists`);
      }
      _compileSchemaEnv(O) {
        if (O.meta) this._compileMetaSchema(O);
        else i.compileSchema.call(this, O);
        if (!O.validate) throw Error("ajv implementation error");
        return O.validate;
      }
      _compileMetaSchema(O) {
        let opts = this.opts;
        this.opts = this._metaOpts;
        try {
          i.compileSchema.call(this, O);
        } finally {
          this.opts = opts;
        }
      }
    };
    ((R.ValidationError = s.default), (R.MissingRefError = a.default), (e.default = R));
    function C(O, L, K, z = "error") {
      for (let key in O) {
        let j = key;
        if (j in L) this.logger[z](`${K}: option ${key}. ${O[j]}`);
      }
    }
    function b(O) {
      return ((O = (0, c.normalizeId)(O)), this.schemas[O] || this.refs[O]);
    }
    function g() {
      let schemas = this.opts.schemas;
      if (!schemas) return;
      if (Array.isArray(schemas)) this.addSchema(schemas);
      else for (let key in schemas) this.addSchema(schemas[key], key);
    }
    function k() {
      for (let key in this.opts.formats) {
        let L = this.opts.formats[key];
        if (L) this.addFormat(key, L);
      }
    }
    function V(O) {
      if (Array.isArray(O)) {
        this.addVocabulary(O);
        return;
      }
      this.logger.warn("keywords option as map is deprecated, pass array");
      for (let key in O) {
        let K = O[key];
        if (!K.keyword) K.keyword = key;
        this.addKeyword(K);
      }
    }
    function H() {
      let O = { ...this.opts };
      for (let L of y) delete O[L];
      return O;
    }
    let N = { log() {}, warn() {}, error() {} };
    function x(O) {
      if (O === !1) return N;
      if (O === void 0) return console;
      if (O.log && O.warn && O.error) return O;
      throw Error("logger must implement log, warn and error methods");
    }
    let W = /^[a-z_$][a-z0-9_$:-]*$/i;
    function B(O, L) {
      let { RULES: RULES } = this;
      if (
        ((0, m.eachItem)(O, (z) => {
          if (RULES.keywords[z]) throw Error(`Keyword ${z} is already defined`);
          if (!W.test(z)) throw Error(`Keyword ${z} has invalid name`);
        }),
        !L)
      )
        return;
      if (L.$data && !("code" in L || "validate" in L))
        throw Error('$data keyword must have "code" or "validate" function');
    }
    function se(O, L, K) {
      var z;
      let I = L === null || L === void 0 ? void 0 : L.post;
      if (K && I) throw Error('keyword with "post" flag cannot have "type"');
      let { RULES: RULES } = this,
        G = I ? RULES.post : RULES.rules.find(({ type: re }) => re === K);
      if (!G) ((G = { type: K, rules: [] }), RULES.rules.push(G));
      if (((RULES.keywords[O] = !0), !L)) return;
      let Y = {
        keyword: O,
        definition: {
          ...L,
          type: (0, d.getJSONTypes)(L.type),
          schemaType: (0, d.getJSONTypes)(L.schemaType),
        },
      };
      if (L.before) le.call(this, G, Y, L.before);
      else G.rules.push(Y);
      ((RULES.all[O] = Y),
        (z = L.implements) === null || z === void 0 || z.forEach((re) => this.addKeyword(re)));
    }
    function le(O, L, K) {
      let index = O.rules.findIndex((rule) => rule.keyword === K);
      if (index >= 0) O.rules.splice(index, 0, L);
      else (O.rules.push(L), this.logger.warn(`rule ${K} is not defined`));
    }
    function ie(O) {
      let { metaSchema: metaSchema } = O;
      if (metaSchema === void 0) return;
      if (O.$data && this.opts.$data) metaSchema = ae(metaSchema);
      O.validateSchema = this.compile(metaSchema, !0);
    }
    let Se = { $ref: "https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/refs/data.json#" };
    function ae(O) {
      return { anyOf: [O, Se] };
    }
  });
//@ chunk-s82q9s4x.js:68784-81111 cjs-fingerprint
var HQo = x(function (he) {
  Object.defineProperty(he, "__esModule", { value: !0 });
  he.CodeGen = he.Name = he.nil = he.stringify = he.str = he._ = he.KeywordCxt = void 0;
  var qd = Bvn();
  Object.defineProperty(he, "KeywordCxt", {
    enumerable: !0,
    get: function () {
      return qd.KeywordCxt;
    },
  });
  var Be = uh();
  Object.defineProperty(he, "_", {
    enumerable: !0,
    get: function () {
      return Be._;
    },
  });
  Object.defineProperty(he, "str", {
    enumerable: !0,
    get: function () {
      return Be.str;
    },
  });
  Object.defineProperty(he, "stringify", {
    enumerable: !0,
    get: function () {
      return Be.stringify;
    },
  });
  Object.defineProperty(he, "nil", {
    enumerable: !0,
    get: function () {
      return Be.nil;
    },
  });
  Object.defineProperty(he, "Name", {
    enumerable: !0,
    get: function () {
      return Be.Name;
    },
  });
  Object.defineProperty(he, "CodeGen", {
    enumerable: !0,
    get: function () {
      return Be.CodeGen;
    },
  });
  var Od = elr(),
    fo = jvn(),
    po = pr(),
    se = tlr(),
    ho = uh(),
    ne = lt(),
    be = ut(),
    We = ew(),
    ao = zn(),
    jd = io(),
    mo = (e, t) => new RegExp(e, t);
  mo.code = "new RegExp";
  var xd = ["removeAdditional", "useDefaults", "coerceTypes"],
    Rd = new Set([
      "validate",
      "serialize",
      "parse",
      "wrapper",
      "root",
      "schema",
      "keyword",
      "pattern",
      "formats",
      "validate$data",
      "func",
      "obj",
      "Error",
    ]),
    Id = {
      errorDataPath: "",
      format: "`validateFormats: false` can be used instead.",
      nullable: '"nullable" keyword is supported by default.',
      jsonPointers: "Deprecated jsPropertySyntax can be used instead.",
      extendRefs: "Deprecated ignoreKeywordsWithRef can be used instead.",
      missingRefs: "Pass empty schema with $id that should be ignored to ajv.addSchema.",
      processCode: "Use option `code: {process: (code, schemaEnv: object) => string}`",
      sourceCode: "Use option `code: {source: true}`",
      strictDefaults: "It is default now, see option `strict`.",
      strictKeywords: "It is default now, see option `strict`.",
      uniqueItems: '"uniqueItems" keyword is always validated.',
      unknownFormats: "Disable strict mode or pass `true` to `ajv.addFormat` (or `formats` option).",
      cache: "Map is used as cache, schema object as key.",
      serialize: "Map is used as cache, schema object as key.",
      ajvErrors: "It is default now.",
    },
    Td = {
      ignoreKeywordsWithRef: "",
      jsPropertySyntax: "",
      unicode: '"minLength"/"maxLength" account for unicode characters by default.',
    },
    co = 200;
  function Cd(e) {
    var t, r, s, n, o, i, a, c, u, l, f, b, _, h, p, y, v, O, q, M, N, ee, fe, Xt, Yt;
    let strict = e.strict,
      Zt = (t = e.code) === null || t === void 0 ? void 0 : t.optimize,
      Mr = Zt === !0 || Zt === void 0 ? 1 : Zt || 0,
      Ar = (s = (r = e.code) === null || r === void 0 ? void 0 : r.regExp) !== null && s !== void 0 ? s : mo,
      pa = (n = e.uriResolver) !== null && n !== void 0 ? n : jd.default;
    return {
      strictSchema:
        (i = (o = e.strictSchema) !== null && o !== void 0 ? o : strict) !== null && i !== void 0 ? i : !0,
      strictNumbers:
        (c = (a = e.strictNumbers) !== null && a !== void 0 ? a : strict) !== null && c !== void 0 ? c : !0,
      strictTypes:
        (l = (u = e.strictTypes) !== null && u !== void 0 ? u : strict) !== null && l !== void 0 ? l : "log",
      strictTuples:
        (b = (f = e.strictTuples) !== null && f !== void 0 ? f : strict) !== null && b !== void 0 ? b : "log",
      strictRequired:
        (h = (_ = e.strictRequired) !== null && _ !== void 0 ? _ : strict) !== null && h !== void 0 ? h : !1,
      code: e.code ? { ...e.code, optimize: Mr, regExp: Ar } : { optimize: Mr, regExp: Ar },
      loopRequired: (p = e.loopRequired) !== null && p !== void 0 ? p : co,
      loopEnum: (y = e.loopEnum) !== null && y !== void 0 ? y : co,
      meta: (v = e.meta) !== null && v !== void 0 ? v : !0,
      messages: (O = e.messages) !== null && O !== void 0 ? O : !0,
      inlineRefs: (q = e.inlineRefs) !== null && q !== void 0 ? q : !0,
      schemaId: (M = e.schemaId) !== null && M !== void 0 ? M : "$id",
      addUsedSchema: (N = e.addUsedSchema) !== null && N !== void 0 ? N : !0,
      validateSchema: (ee = e.validateSchema) !== null && ee !== void 0 ? ee : !0,
      validateFormats: (fe = e.validateFormats) !== null && fe !== void 0 ? fe : !0,
      unicodeRegExp: (Xt = e.unicodeRegExp) !== null && Xt !== void 0 ? Xt : !0,
      int32range: (Yt = e.int32range) !== null && Yt !== void 0 ? Yt : !0,
      uriResolver: pa,
    };
  }
  class Ct {
    constructor(e = {}) {
      ((this.schemas = {}),
        (this.refs = {}),
        (this.formats = {}),
        (this._compilations = new Set()),
        (this._loading = {}),
        (this._cache = new Map()),
        (e = this.opts = { ...e, ...Cd(e) }));
      let { es5: es5, lines: lines } = this.opts.code;
      ((this.scope = new ho.ValueScope({ scope: {}, prefixes: Rd, es5: es5, lines: lines })),
        (this.logger = Ud(e.logger)));
      let validateFormats = e.validateFormats;
      if (
        ((e.validateFormats = !1),
        (this.RULES = po.getRules()),
        uo.call(this, Id, e, "NOT SUPPORTED"),
        uo.call(this, Td, e, "DEPRECATED", "warn"),
        (this._metaOpts = Vd.call(this)),
        e.formats)
      )
        Ad.call(this);
      if ((this._addVocabularies(), this._addDefaultMetaSchema(), e.keywords)) Dd.call(this, e.keywords);
      if (typeof e.meta == "object") this.addMetaSchema(e.meta);
      (Md.call(this), (e.validateFormats = validateFormats));
    }
    _addVocabularies() {
      this.addKeyword("$async");
    }
    _addDefaultMetaSchema() {
      let { $data: $data, meta: meta, schemaId: schemaId } = this.opts,
        s = ao;
      if (schemaId === "id") ((s = { ...ao }), (s.id = s.$id), delete s.$id);
      if (meta && $data) this.addMetaSchema(s, s[schemaId], !1);
    }
    defaultMeta() {
      let { meta: meta, schemaId: schemaId } = this.opts;
      return (this.opts.defaultMeta = typeof meta == "object" ? meta[schemaId] || meta : void 0);
    }
    validate(e, t) {
      let r;
      if (typeof e == "string") {
        if (((r = this.getSchema(e)), !r)) throw Error(`no schema with key or ref "${e}"`);
      } else r = this.compile(e);
      let s = r(t);
      if (!("$async" in r)) this.errors = r.errors;
      return s;
    }
    compile(e, t) {
      let _addSchema = this._addSchema(e, t);
      return _addSchema.validate || this._compileSchemaEnv(_addSchema);
    }
    compileAsync(e, t) {
      if (typeof this.opts.loadSchema != "function") throw Error("options.loadSchema should be a function");
      let { loadSchema: loadSchema } = this.opts;
      return s.call(this, e, t);
      async function s(u, l) {
        await n.call(this, u.$schema);
        let _addSchema = this._addSchema(u, l);
        return _addSchema.validate || o.call(this, _addSchema);
      }
      async function n(u) {
        if (u && !this.getSchema(u)) await s.call(this, { $ref: u }, !0);
      }
      async function o(u) {
        try {
          return this._compileSchemaEnv(u);
        } catch (error) {
          if (!(error instanceof fo.default)) throw error;
          return (i.call(this, error), await a.call(this, error.missingSchema), o.call(this, u));
        }
      }
      function i({ missingSchema: missingSchema, missingRef: missingRef }) {
        if (this.refs[missingSchema])
          throw Error(`AnySchema ${missingSchema} is loaded but ${missingRef} cannot be resolved`);
      }
      async function a(u) {
        let l = await c.call(this, u);
        if (!this.refs[u]) await n.call(this, l.$schema);
        if (!this.refs[u]) this.addSchema(l, u, t);
      }
      async function c(u) {
        let l = this._loading[u];
        if (l) return l;
        try {
          return await (this._loading[u] = loadSchema(u));
        } finally {
          delete this._loading[u];
        }
      }
    }
    addSchema(e, t, r, s = this.opts.validateSchema) {
      if (Array.isArray(e)) {
        for (let o of e) this.addSchema(o, void 0, r, s);
        return this;
      }
      let n;
      if (typeof e === "object") {
        let { schemaId: schemaId } = this.opts;
        if (((n = e[schemaId]), n !== void 0 && typeof n != "string"))
          throw Error(`schema ${schemaId} must be string`);
      }
      return (
        (t = ne.normalizeId(t || n)),
        this._checkUnique(t),
        (this.schemas[t] = this._addSchema(e, r, t, s, !0)),
        this
      );
    }
    addMetaSchema(e, t, r = this.opts.validateSchema) {
      return (this.addSchema(e, t, !0, r), this);
    }
    validateSchema(e, t) {
      if (typeof e == "boolean") return !0;
      let r;
      if (((r = e.$schema), r !== void 0 && typeof r != "string")) throw Error("$schema must be a string");
      if (((r = r || this.opts.defaultMeta || this.defaultMeta()), !r))
        return (this.logger.warn("meta-schema not available"), (this.errors = null), !0);
      let validate = this.validate(r, e);
      if (!validate && t) {
        let n = "schema is invalid: " + this.errorsText();
        if (this.opts.validateSchema === "log") this.logger.error(n);
        else throw Error(n);
      }
      return validate;
    }
    getSchema(e) {
      let t;
      while (typeof (t = lo.call(this, e)) == "string") e = t;
      if (t === void 0) {
        let { schemaId: schemaId } = this.opts,
          s = new se.SchemaEnv({ schema: {}, schemaId: schemaId });
        if (((t = se.resolveSchema.call(this, s, e)), !t)) return;
        this.refs[e] = t;
      }
      return t.validate || this._compileSchemaEnv(t);
    }
    removeSchema(e) {
      if (e instanceof RegExp)
        return (this._removeAllSchemas(this.schemas, e), this._removeAllSchemas(this.refs, e), this);
      switch (typeof e) {
        case "undefined":
          return (
            this._removeAllSchemas(this.schemas),
            this._removeAllSchemas(this.refs),
            this._cache.clear(),
            this
          );
        case "string": {
          let t = lo.call(this, e);
          if (typeof t == "object") this._cache.delete(t.schema);
          return (delete this.schemas[e], delete this.refs[e], this);
        }
        case "object": {
          let t = e;
          this._cache.delete(t);
          let r = e[this.opts.schemaId];
          if (r) ((r = ne.normalizeId(r)), delete this.schemas[r], delete this.refs[r]);
          return this;
        }
        default:
          throw Error("ajv.removeSchema: invalid parameter");
      }
    }
    addVocabulary(e) {
      for (let t of e) this.addKeyword(t);
      return this;
    }
    addKeyword(e, t) {
      let r;
      if (typeof e == "string") {
        if (((r = e), typeof t == "object"))
          (this.logger.warn("these parameters are deprecated, see docs for addKeyword"), (t.keyword = r));
      } else if (typeof e == "object" && t === void 0) {
        if (((t = e), (r = t.keyword), Array.isArray(r) && !r.length))
          throw Error("addKeywords: keyword must be string or non-empty array");
      } else throw Error("invalid addKeywords parameters");
      if ((Fd.call(this, r, t), !t)) return (We.eachItem(r, (n) => xr.call(this, n)), this);
      Hd.call(this, t);
      let s = { ...t, type: be.getJSONTypes(t.type), schemaType: be.getJSONTypes(t.schemaType) };
      return (
        We.eachItem(
          r,
          s.type.length === 0
            ? (n) => xr.call(this, n, s)
            : (n) => s.type.forEach((o) => xr.call(this, n, s, o)),
        ),
        this
      );
    }
    getKeyword(e) {
      let t = this.RULES.all[e];
      return typeof t == "object" ? t.definition : !!t;
    }
    removeKeyword(e) {
      let { RULES: RULES } = this;
      (delete RULES.keywords[e], delete RULES.all[e]);
      for (let rule of RULES.rules) {
        let index = rule.rules.findIndex((rule) => rule.keyword === e);
        if (index >= 0) rule.rules.splice(index, 1);
      }
      return this;
    }
    addFormat(e, t) {
      if (typeof t == "string") t = new RegExp(t);
      return ((this.formats[e] = t), this);
    }
    errorsText(e = this.errors, { separator: t = ", ", dataVar: r = "data" } = {}) {
      if (!e || e.length === 0) return "No errors";
      return e.map((s) => `${r}${s.instancePath} ${s.message}`).reduce((s, n) => s + t + n);
    }
    $dataMetaSchema(e, t) {
      let all = this.RULES.all;
      e = JSON.parse(JSON.stringify(e));
      for (let s of t) {
        let sliced = s.split("/").slice(1),
          o = e;
        for (let i of sliced) o = o[i];
        for (let key in all) {
          let a = all[key];
          if (typeof a != "object") continue;
          let { $data: $data } = a.definition,
            u = o[key];
          if ($data && u) o[key] = yo(u);
        }
      }
      return e;
    }
    _removeAllSchemas(e, t) {
      for (let key in e) {
        let s = e[key];
        if (!t || t.test(key)) {
          if (typeof s == "string") delete e[key];
          else if (s && !s.meta) (this._cache.delete(s.schema), delete e[key]);
        }
      }
    }
    _addSchema(e, t, r, s = this.opts.validateSchema, n = this.opts.addUsedSchema) {
      let o,
        { schemaId: schemaId } = this.opts;
      if (typeof e == "object") o = e[schemaId];
      else if (this.opts.jtd) throw Error("schema must be object");
      else if (typeof e != "boolean") throw Error("schema must be object or boolean");
      let a = this._cache.get(e);
      if (a !== void 0) return a;
      r = ne.normalizeId(o || r);
      let c = ne.getSchemaRefs.call(this, e, r);
      if (
        ((a = new se.SchemaEnv({ schema: e, schemaId: schemaId, meta: t, baseId: r, localRefs: c })),
        this._cache.set(a.schema, a),
        n && !r.startsWith("#"))
      ) {
        if (r) this._checkUnique(r);
        this.refs[r] = a;
      }
      if (s) this.validateSchema(e, !0);
      return a;
    }
    _checkUnique(e) {
      if (this.schemas[e] || this.refs[e]) throw Error(`schema with key or id "${e}" already exists`);
    }
    _compileSchemaEnv(e) {
      if (e.meta) this._compileMetaSchema(e);
      else se.compileSchema.call(this, e);
      if (!e.validate) throw Error("ajv implementation error");
      return e.validate;
    }
    _compileMetaSchema(e) {
      let opts = this.opts;
      this.opts = this._metaOpts;
      try {
        se.compileSchema.call(this, e);
      } finally {
        this.opts = opts;
      }
    }
  }
  Ct.ValidationError = Od.default;
  Ct.MissingRefError = fo.default;
  he.default = Ct;
  function uo(e, t, r, s = "error") {
    for (let key in e) {
      let o = key;
      if (o in t) this.logger[s](`${r}: option ${key}. ${e[o]}`);
    }
  }
  function lo(e) {
    return ((e = ne.normalizeId(e)), this.schemas[e] || this.refs[e]);
  }
  function Md() {
    let schemas = this.opts.schemas;
    if (!schemas) return;
    if (Array.isArray(schemas)) this.addSchema(schemas);
    else for (let key in schemas) this.addSchema(schemas[key], key);
  }
  function Ad() {
    for (let key in this.opts.formats) {
      let t = this.opts.formats[key];
      if (t) this.addFormat(key, t);
    }
  }
  function Dd(e) {
    if (Array.isArray(e)) {
      this.addVocabulary(e);
      return;
    }
    this.logger.warn("keywords option as map is deprecated, pass array");
    for (let key in e) {
      let r = e[key];
      if (!r.keyword) r.keyword = key;
      this.addKeyword(r);
    }
  }
  function Vd() {
    let e = { ...this.opts };
    for (let t of xd) delete e[t];
    return e;
  }
  var zd = { log() {}, warn() {}, error() {} };
  function Ud(e) {
    if (e === !1) return zd;
    if (e === void 0) return console;
    if (e.log && e.warn && e.error) return e;
    throw Error("logger must implement log, warn and error methods");
  }
  var Kd = /^[a-z_$][a-z0-9_$:-]*$/i;
  function Fd(e, t) {
    let { RULES: RULES } = this;
    if (
      (We.eachItem(e, (s) => {
        if (RULES.keywords[s]) throw Error(`Keyword ${s} is already defined`);
        if (!Kd.test(s)) throw Error(`Keyword ${s} has invalid name`);
      }),
      !t)
    )
      return;
    if (t.$data && !("code" in t || "validate" in t))
      throw Error('$data keyword must have "code" or "validate" function');
  }
  function xr(e, t, r) {
    var s;
    let n = t === null || t === void 0 ? void 0 : t.post;
    if (r && n) throw Error('keyword with "post" flag cannot have "type"');
    let { RULES: RULES } = this,
      i = n ? RULES.post : RULES.rules.find(({ type: c }) => c === r);
    if (!i) ((i = { type: r, rules: [] }), RULES.rules.push(i));
    if (((RULES.keywords[e] = !0), !t)) return;
    let a = {
      keyword: e,
      definition: { ...t, type: be.getJSONTypes(t.type), schemaType: be.getJSONTypes(t.schemaType) },
    };
    if (t.before) Ld.call(this, i, a, t.before);
    else i.rules.push(a);
    ((RULES.all[e] = a), (s = t.implements) === null || s === void 0 || s.forEach((c) => this.addKeyword(c)));
  }
  function Ld(e, t, r) {
    let index = e.rules.findIndex((rule) => rule.keyword === r);
    if (index >= 0) e.rules.splice(index, 0, t);
    else (e.rules.push(t), this.logger.warn(`rule ${r} is not defined`));
  }
  function Hd(e) {
    let { metaSchema: metaSchema } = e;
    if (metaSchema === void 0) return;
    if (e.$data && this.opts.$data) metaSchema = yo(metaSchema);
    e.validateSchema = this.compile(metaSchema, !0);
  }
  var Gd = { $ref: "https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/refs/data.json#" };
  function yo(e) {
    return { anyOf: [e, Gd] };
  }
});

export { HQo, ao, De, te, Le, va, ne, Li, Sa, so, Di, ya };
