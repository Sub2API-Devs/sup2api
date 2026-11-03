/**
 * ajv/dist/compile/codegen/code.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-s82q9s4x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";

//@ chunk-s82q9s4x.js:267-2859 cjs-fingerprint
var it = x(function (zr) {
  Object.defineProperty(zr, "__esModule", { value: !0 });
  zr.regexpCode =
    zr.getEsmExportName =
    zr.getProperty =
    zr.safeStringify =
    zr.stringify =
    zr.strConcat =
    zr.addCodeArg =
    zr.str =
    zr._ =
    zr.nil =
    zr._Code =
    zr.Name =
    zr.IDENTIFIER =
    zr._CodeOrName =
      void 0;
  class ht {}
  zr._CodeOrName = ht;
  zr.IDENTIFIER = /^[a-z$_][a-z$_0-9]*$/i;
  class De extends ht {
    constructor(e) {
      super();
      if (!zr.IDENTIFIER.test(e)) throw Error("CodeGen: name must be a valid identifier");
      this.str = e;
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
  }
  zr.Name = De;
  class Z extends ht {
    constructor(e) {
      super();
      this._items = typeof e === "string" ? [e] : e;
    }
    toString() {
      return this.str;
    }
    emptyStr() {
      if (this._items.length > 1) return !1;
      let e = this._items[0];
      return e === "" || e === '""';
    }
    get str() {
      var e;
      return (e = this._str) !== null && e !== void 0
        ? e
        : (this._str = this._items.reduce((t, r) => `${t}${r}`, ""));
    }
    get names() {
      var e;
      return (e = this._names) !== null && e !== void 0
        ? e
        : (this._names = this._items.reduce((t, r) => {
            if (r instanceof De) t[r.str] = (t[r.str] || 0) + 1;
            return t;
          }, {}));
    }
  }
  zr._Code = Z;
  zr.nil = new Z("");
  function Dr(e, ...t) {
    let r = [e[0]],
      s = 0;
    while (s < t.length) (tr(r, t[s]), r.push(e[++s]));
    return new Z(r);
  }
  zr._ = Dr;
  var er = new Z("+");
  function Vr(e, ...t) {
    let r = [ot(e[0])],
      s = 0;
    while (s < t.length) (r.push(er), tr(r, t[s]), r.push(er, ot(e[++s])));
    return (ha(r), new Z(r));
  }
  zr.str = Vr;
  function tr(e, t) {
    if (t instanceof Z) e.push(...t._items);
    else if (t instanceof De) e.push(t);
    else e.push(_a(t));
  }
  zr.addCodeArg = tr;
  function ha(e) {
    let t = 1;
    while (t < e.length - 1) {
      if (e[t] === er) {
        let r = ma(e[t - 1], e[t + 1]);
        if (r !== void 0) {
          e.splice(t - 1, 3, r);
          continue;
        }
        e[t++] = "+";
      }
      t++;
    }
  }
  function ma(e, t) {
    if (t === '""') return e;
    if (e === '""') return t;
    if (typeof e == "string") {
      if (t instanceof De || e[e.length - 1] !== '"') return;
      if (typeof t != "string") return `${e.slice(0, -1)}${t}"`;
      if (t[0] === '"') return e.slice(0, -1) + t.slice(1);
      return;
    }
    if (typeof t == "string" && t[0] === '"' && !(e instanceof De)) return `"${e}${t.slice(1)}`;
    return;
  }
  function ya(e, t) {
    return t.emptyStr() ? e : e.emptyStr() ? t : Vr`${e}${t}`;
  }
  zr.strConcat = ya;
  function _a(e) {
    return typeof e == "number" || typeof e == "boolean" || e === null
      ? e
      : ot(Array.isArray(e) ? e.join(",") : e);
  }
  function ga(e) {
    return new Z(ot(e));
  }
  zr.stringify = ga;
  function ot(e) {
    return JSON.stringify(e)
      .replace(/\u2028/g, "\\u2028")
      .replace(/\u2029/g, "\\u2029");
  }
  zr.safeStringify = ot;
  function $a(e) {
    return typeof e == "string" && zr.IDENTIFIER.test(e) ? new Z(`.${e}`) : Dr`[${e}]`;
  }
  zr.getProperty = $a;
  function va(e) {
    if (typeof e == "string" && zr.IDENTIFIER.test(e)) return new Z(`${e}`);
    throw Error(`CodeGen: invalid export name: ${e}, use explicit $id name mapping`);
  }
  zr.getEsmExportName = va;
  function wa(e) {
    return new Z(e.toString());
  }
  zr.regexpCode = wa;
});

export { it };
