/**
 * zod/v4/core/memoizer.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-7vp249v4.js (11)
 * attribution: esm-fingerprint 7, esm-layout 4
 */
import { dSr } from "./util.js";

//@ chunk-7vp249v4.js:44335-44472 esm-fingerprint
class ZodCyclicError extends Error {
  constructor() {
    super("Cannot parse a reference cycle that closes through a transform");
    this.name = "ZodCyclicError";
  }
}
//@ chunk-7vp249v4.js:44472-44493 esm-fingerprint
var Ge = "~memo",
  _n = [];
//@ chunk-7vp249v4.js:44493-44570 esm-fingerprint
function xn(e) {
  return e !== null && (typeof e === "object" || typeof e === "function");
}
//@ chunk-7vp249v4.js:44570-44645 esm-fingerprint
function We(e) {
  return e.map((t) => (t.path ? { ...t, path: t.path.slice() } : { ...t }));
}
//@ chunk-7vp249v4.js:44645-44677 esm-layout
var weakMap = new WeakMap(),
  G = 0,
  xe = 1,
  q = 2;
//@ chunk-7vp249v4.js:44677-46254 esm-fingerprint
function ve(e, t, r) {
  let n = weakMap.get(e);
  if (n !== void 0) return n ? q : G;
  if (t.has(e)) return q;
  t.add(e);
  let i = G,
    s = (f) => {
      if (i !== q && f?._zod) {
        let d = ve(f, t, r);
        if (d > i) i = d;
      }
    },
    c = (f, d) => {
      let _ = G;
      for (let m of Reflect.ownKeys(f)) {
        let ownPropertyDescriptor = Object.getOwnPropertyDescriptor(f, m);
        if (d && !ownPropertyDescriptor.enumerable) continue;
        let g = ownPropertyDescriptor.get
          ? xe
          : ownPropertyDescriptor.value?._zod
            ? ve(ownPropertyDescriptor.value, t, r)
            : G;
        if (g > _) _ = g;
      }
      return _;
    },
    a = (f) => {
      if (f > i) i = f;
    },
    def = e._zod.def,
    p = def.type;
  switch (p) {
    case "object": {
      let f = dSr(def);
      (a(f ? c(f, !0) : xe), s(def.catchall));
      break;
    }
    case "properties":
      a(c(def.shape, !1));
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
      let f = def._cachedInner ?? (r ? e._zod.innerType : void 0);
      a(f ? ve(f, t, !1) : xe);
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
        let _ = ownPropertyDescriptor.value;
        if (!_ || typeof _ !== "object") continue;
        if (_._zod) s(_);
        else if (Array.isArray(_)) for (let m of _) s(m);
      }
  }
  return (t.delete(e), Os(e, i));
}
//@ chunk-7vp249v4.js:46254-46306 esm-layout
function Os(e, t) {
  if (t !== xe) weakMap.set(e, t === q);
  return t;
}
//@ chunk-7vp249v4.js:46306-46394 esm-fingerprint
function As(e, t) {
  let r = e.buckets.get(t);
  if (!r) ((r = new WeakMap()), e.buckets.set(t, r));
  return r;
}
//@ chunk-7vp249v4.js:46394-47625 esm-layout
var _e,
  ge = [],
  Es = {
    alloc(e, t, r) {
      let n = _e;
      if (!n) return r;
      _e = void 0;
      let i = { value: r, issues: null };
      return (n.set(t.value, i), ge.push(i), r);
    },
    guard(e) {
      var t;
      ((t = e._zod).deferred ?? (t.deferred = []),
        e._zod.deferred.push(() => {
          let parse = e._zod.parse,
            n = (i, s) => {
              if (s.direction !== "backward" && Ts(s, i.value)) throw new ZodCyclicError();
              return parse(i, s);
            };
          if (((e._zod.parse = n), e._zod.run === parse)) e._zod.run = n;
        }));
    },
    attach(e) {
      var t;
      let r,
        n = !1,
        i,
        s;
      ((t = e._zod).deferred ?? (t.deferred = []),
        e._zod.deferred.push(() => {
          let parse = e._zod.parse,
            a = (l, p) => {
              if (r === void 0) {
                let v = ve(e, new Set(), !1);
                if (v === G) {
                  if (((e._zod.parse = parse), e._zod.run === a)) e._zod.run = parse;
                  return parse(l, p);
                }
                if (v === q || n) r = !0;
                else n = !0;
              }
              let f = l.value;
              if (!xn(f)) return parse(l, p);
              let d = p[Ge];
              if (!d) ((d = { buckets: new WeakMap(), backEdges: void 0 }), (p[Ge] = d));
              let _;
              if (i === p) _ = s;
              else ((_ = As(d, e)), (i = p), (s = _));
              let m = _.get(f);
              if (m) {
                if (((l.value = m.value), m.issues)) {
                  if (m.issues.length) l.issues.push(...We(m.issues));
                } else
                  ((l.memo = !0), d.backEdges ?? (d.backEdges = new WeakSet()), d.backEdges.add(m.value));
                return l;
              }
              _e = _;
              let h = ge.length,
                g = parse(l, p);
              _e = void 0;
              let x = ge.length > h ? ge.pop() : void 0;
              if (g instanceof Promise)
                return g.then((v) => {
                  if (x) x.issues = v.issues.length ? We(v.issues) : _n;
                  return v;
                });
              if (x) x.issues = g.issues.length ? We(g.issues) : _n;
              return g;
            };
          if (((e._zod.parse = a), e._zod.run === parse)) e._zod.run = a;
        }));
    },
  };
//@ chunk-7vp249v4.js:47625-47649 esm-layout
function yn() {
  return Es;
}
//@ chunk-7vp249v4.js:47649-47724 esm-fingerprint
function Ts(e, t) {
  let r = e[Ge]?.backEdges;
  return r !== void 0 && xn(t) && r.has(t);
}

export { yn };
