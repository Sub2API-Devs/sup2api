/**
 * ajv/dist/compile/codegen/scope.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-s82q9s4x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { it } from "./code.js";

//@ chunk-s82q9s4x.js:2859-5426 cjs-fingerprint
var or = x(function (Lr) {
  Object.defineProperty(Lr, "__esModule", { value: !0 });
  Lr.ValueScope = Lr.ValueScopeName = Lr.Scope = Lr.varKinds = Lr.UsedValueState = void 0;
  var T = it();
  class Kr extends Error {
    constructor(e) {
      super(`CodeGen: "code" for ${e} not defined`);
      this.value = e.value;
    }
  }
  var yt;
  (function (e) {
    ((e[(e.Started = 0)] = "Started"), (e[(e.Completed = 1)] = "Completed"));
  })(yt || (Lr.UsedValueState = yt = {}));
  Lr.varKinds = { const: new T.Name("const"), let: new T.Name("let"), var: new T.Name("var") };
  class sr {
    constructor({ prefixes: e, parent: t } = {}) {
      ((this._names = {}), (this._prefixes = e), (this._parent = t));
    }
    toName(e) {
      return e instanceof T.Name ? e : this.name(e);
    }
    name(e) {
      return new T.Name(this._newName(e));
    }
    _newName(e) {
      let t = this._names[e] || this._nameGroup(e);
      return `${e}${t.index++}`;
    }
    _nameGroup(e) {
      var t, r;
      if (
        ((r = (t = this._parent) === null || t === void 0 ? void 0 : t._prefixes) === null || r === void 0
          ? void 0
          : r.has(e)) ||
        (this._prefixes && !this._prefixes.has(e))
      )
        throw Error(`CodeGen: prefix "${e}" is not allowed in this scope`);
      return (this._names[e] = { prefix: e, index: 0 });
    }
  }
  Lr.Scope = sr;
  class nr extends T.Name {
    constructor(e, t) {
      super(t);
      this.prefix = e;
    }
    setValue(e, { property: t, itemIndex: r }) {
      ((this.value = e), (this.scopePath = T._`.${new T.Name(t)}[${r}]`));
    }
  }
  Lr.ValueScopeName = nr;
  var Ta = T._`\n`;
  class Fr extends sr {
    constructor(e) {
      super(e);
      ((this._values = {}), (this._scope = e.scope), (this.opts = { ...e, _n: e.lines ? Ta : T.nil }));
    }
    get() {
      return this._scope;
    }
    name(e) {
      return new nr(e, this._newName(e));
    }
    value(e, t) {
      var r;
      if (t.ref === void 0) throw Error("CodeGen: ref must be passed in value");
      let toName = this.toName(e),
        { prefix: prefix } = toName,
        o = (r = t.key) !== null && r !== void 0 ? r : t.ref,
        i = this._values[prefix];
      if (i) {
        let u = i.get(o);
        if (u) return u;
      } else i = this._values[prefix] = new Map();
      i.set(o, toName);
      let a = this._scope[prefix] || (this._scope[prefix] = []),
        c = a.length;
      return ((a[c] = t.ref), toName.setValue(t, { property: prefix, itemIndex: c }), toName);
    }
    getValue(e, t) {
      let r = this._values[e];
      if (!r) return;
      return r.get(t);
    }
    scopeRefs(e, t = this._values) {
      return this._reduceValues(t, (r) => {
        if (r.scopePath === void 0) throw Error(`CodeGen: name "${r}" has no value`);
        return T._`${e}${r.scopePath}`;
      });
    }
    scopeCode(e = this._values, t, r) {
      return this._reduceValues(
        e,
        (s) => {
          if (s.value === void 0) throw Error(`CodeGen: name "${s}" has no value`);
          return s.value.code;
        },
        t,
        r,
      );
    }
    _reduceValues(e, t, r = {}, s) {
      let nil = T.nil;
      for (let key in e) {
        let i = e[key];
        if (!i) continue;
        let a = (r[key] = r[key] || new Map());
        i.forEach((c) => {
          if (a.has(c)) return;
          a.set(c, yt.Started);
          let u = t(c);
          if (u) {
            let l = this.opts.es5 ? Lr.varKinds.var : Lr.varKinds.const;
            nil = T._`${nil}${l} ${c} = ${u};${this.opts._n}`;
          } else if ((u = s === null || s === void 0 ? void 0 : s(c))) nil = T._`${nil}${u}${this.opts._n}`;
          else throw new Kr(c);
          a.set(c, yt.Completed);
        });
      }
      return nil;
    }
  }
  Lr.ValueScope = Fr;
});

export { or };
