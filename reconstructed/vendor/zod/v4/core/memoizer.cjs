/**
 * zod/v4/core/memoizer.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1), chunk-7vp249v4.js (1)
 * attribution: cjs-fingerprint 1, esm-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { Ee } from "./util.cjs";
import { __zod_globalConfig, Xne } from "./core.js";
import { yn } from "./memoizer.js";

//@ chunk-1ny7cxrt.js:181402-186033 cjs-fingerprint
var F_ = x(function (pr) {
  var XZ =
      (pr && pr.__createBinding) ||
      (Object.create
        ? function (e, t, n, o) {
            if (o === void 0) o = n;
            var ownPropertyDescriptor = Object.getOwnPropertyDescriptor(t, n);
            if (
              !ownPropertyDescriptor ||
              ("get" in ownPropertyDescriptor
                ? !t.__esModule
                : ownPropertyDescriptor.writable || ownPropertyDescriptor.configurable)
            )
              ownPropertyDescriptor = {
                enumerable: !0,
                get: function () {
                  return t[n];
                },
              };
            Object.defineProperty(e, o, ownPropertyDescriptor);
          }
        : function (e, t, n, o) {
            if (o === void 0) o = n;
            e[o] = t[n];
          }),
    QZ =
      (pr && pr.__setModuleDefault) ||
      (Object.create
        ? function (e, t) {
            Object.defineProperty(e, "default", { enumerable: !0, value: t });
          }
        : function (e, t) {
            e.default = t;
          }),
    eV =
      (pr && pr.__importStar) ||
      function (e) {
        if (e && e.__esModule) return e;
        var t = {};
        if (e != null) {
          for (var key in e)
            if (key !== "default" && Object.prototype.hasOwnProperty.call(e, key)) XZ(t, e, key);
        }
        return (QZ(t, e), t);
      };
  Object.defineProperty(pr, "__esModule", { value: !0 });
  pr.$ZodCyclicError = void 0;
  pr.isRecursiveSchema = rV;
  pr.memoizer = sV;
  pr.isBackEdge = JP;
  var tV = eV(Ee());
  class ZodCyclicError extends Error {
    constructor() {
      super("Cannot parse a reference cycle that closes through a transform");
      this.name = "ZodCyclicError";
    }
  }
  pr.$ZodCyclicError = ZodCyclicError;
  var U_ = "~memo",
    GP = [];
  function WP(e) {
    return e !== null && (typeof e === "object" || typeof e === "function");
  }
  function N_(e) {
    return e.map((t) => (t.path ? { ...t, path: t.path.slice() } : { ...t }));
  }
  var weakMap = new WeakMap(),
    Hl = 0,
    up = 1,
    Gu = 2;
  function Wu(e, t, n) {
    let o = weakMap.get(e);
    if (o !== void 0) return o ? Gu : Hl;
    if (t.has(e)) return Gu;
    t.add(e);
    let r = Hl,
      s = (f) => {
        if (r !== Gu && f?._zod) {
          let h = Wu(f, t, n);
          if (h > r) r = h;
        }
      },
      a = (f, h) => {
        let m = Hl;
        for (let y of Reflect.ownKeys(f)) {
          let ownPropertyDescriptor = Object.getOwnPropertyDescriptor(f, y);
          if (h && !ownPropertyDescriptor.enumerable) continue;
          let w = ownPropertyDescriptor.get
            ? up
            : ownPropertyDescriptor.value?._zod
              ? Wu(ownPropertyDescriptor.value, t, n)
              : Hl;
          if (w > m) m = w;
        }
        return m;
      },
      l = (f) => {
        if (f > r) r = f;
      },
      def = e._zod.def,
      u = def.type;
    switch (u) {
      case "object": {
        let rawShape = tV.rawShape(def);
        (l(rawShape ? a(rawShape, !0) : up), s(def.catchall));
        break;
      }
      case "properties":
        l(a(def.shape, !1));
        break;
      case "array":
        s(def.element);
        break;
      case "tuple":
        for (let item of def.items) s(item);
        s(def.rest);
        break;
      case "record":
      case "map":
        (s(def.keyType), s(def.valueType));
        break;
      case "set":
        s(def.valueType);
        break;
      case "union":
        for (let option of def.options) s(option);
        break;
      case "intersection":
        (s(def.left), s(def.right));
        break;
      case "optional":
      case "nullable":
      case "default":
      case "prefault":
      case "catch":
      case "readonly":
      case "nonoptional":
      case "promise":
      case "success":
        s(def.innerType);
        break;
      case "pipe":
        (s(def.in), s(def.out));
        break;
      case "function":
        (s(def.input), s(def.output));
        break;
      case "lazy": {
        let f = def._cachedInner ?? (n ? e._zod.innerType : void 0);
        l(f ? Wu(f, t, !1) : up);
        break;
      }
      case "template_literal":
      case "string":
      case "number":
      case "int":
      case "boolean":
      case "bigint":
      case "symbol":
      case "undefined":
      case "null":
      case "void":
      case "never":
      case "any":
      case "unknown":
      case "date":
      case "nan":
      case "enum":
      case "literal":
      case "file":
      case "transform":
      case "custom":
        break;
      default:
        for (let key in def) {
          let ownPropertyDescriptor = Object.getOwnPropertyDescriptor(def, key);
          if (!ownPropertyDescriptor || ownPropertyDescriptor.get) continue;
          let m = ownPropertyDescriptor.value;
          if (!m || typeof m !== "object") continue;
          if (m._zod) s(m);
          else if (Array.isArray(m)) for (let y of m) s(y);
        }
    }
    return (t.delete(e), nV(e, r));
  }
  function nV(e, t) {
    if (t !== up) weakMap.set(e, t === Gu);
    return t;
  }
  function rV(e) {
    return Wu(e, new Set(), !0) !== Hl;
  }
  function iV(e, t) {
    let n = e.buckets.get(t);
    if (!n) ((n = new WeakMap()), e.buckets.set(t, n));
    return n;
  }
  var lp,
    cp = [],
    oV = {
      alloc(e, t, n) {
        let o = lp;
        if (!o) return n;
        lp = void 0;
        let r = { value: n, issues: null };
        return (o.set(t.value, r), cp.push(r), n);
      },
      guard(e) {
        var t;
        ((t = e._zod).deferred ?? (t.deferred = []),
          e._zod.deferred.push(() => {
            let parse = e._zod.parse,
              o = (r, s) => {
                if (s.direction !== "backward" && JP(s, r.value)) throw new ZodCyclicError();
                return parse(r, s);
              };
            if (((e._zod.parse = o), e._zod.run === parse)) e._zod.run = o;
          }));
      },
      attach(e) {
        var t;
        let n,
          o = !1,
          r,
          s;
        ((t = e._zod).deferred ?? (t.deferred = []),
          e._zod.deferred.push(() => {
            let parse = e._zod.parse,
              l = (c, u) => {
                if (n === void 0) {
                  let j = Wu(e, new Set(), !1);
                  if (j === Hl) {
                    if (((e._zod.parse = parse), e._zod.run === l)) e._zod.run = parse;
                    return parse(c, u);
                  }
                  if (j === Gu || o) n = !0;
                  else o = !0;
                }
                let f = c.value;
                if (!WP(f)) return parse(c, u);
                let h = u[U_];
                if (!h) ((h = { buckets: new WeakMap(), backEdges: void 0 }), (u[U_] = h));
                let m;
                if (r === u) m = s;
                else ((m = iV(h, e)), (r = u), (s = m));
                let y = m.get(f);
                if (y) {
                  if (((c.value = y.value), y.issues)) {
                    if (y.issues.length) c.issues.push(...N_(y.issues));
                  } else
                    ((c.memo = !0), h.backEdges ?? (h.backEdges = new WeakSet()), h.backEdges.add(y.value));
                  return c;
                }
                lp = m;
                let b = cp.length,
                  w = parse(c, u);
                lp = void 0;
                let S = cp.length > b ? cp.pop() : void 0;
                if (w instanceof Promise)
                  return w.then((j) => {
                    if (S) S.issues = j.issues.length ? N_(j.issues) : GP;
                    return j;
                  });
                if (S) S.issues = w.issues.length ? N_(w.issues) : GP;
                return w;
              };
            if (((e._zod.parse = l), e._zod.run === parse)) e._zod.run = l;
          }));
      },
    };
  function sV() {
    return oV;
  }
  function JP(e, t) {
    let n = e[U_]?.backEdges;
    return n !== void 0 && WP(t) && n.has(t);
  }
  (function () {
    var ownPropertyNames = Object.getOwnPropertyNames(pr);
    for (var t = 0; t < ownPropertyNames.length; t++) {
      var ownPropertyDescriptor = Object.getOwnPropertyDescriptor(pr, ownPropertyNames[t]);
      if (!ownPropertyDescriptor || !ownPropertyDescriptor.get || !ownPropertyDescriptor.configurable)
        continue;
      var o;
      try {
        o = ownPropertyDescriptor.get();
      } catch (error) {
        continue;
      }
      if (o === void 0) continue;
      Object.defineProperty(pr, ownPropertyNames[t], {
        value: o,
        writable: !1,
        enumerable: ownPropertyDescriptor.enumerable,
        configurable: !1,
      });
    }
    Object.freeze(pr);
  })();
});
//@ chunk-7vp249v4.js:79897-79949 esm-fingerprint
function ie() {
  if (!__zod_globalConfig.memoizer) Xne({ memoizer: yn() });
}

export { F_, ie };
