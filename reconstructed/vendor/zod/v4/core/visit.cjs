/**
 * zod/v4/core/visit.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { Bl } from "./schemas.cjs";
import { Ee } from "./util.cjs";

//@ chunk-1ny7cxrt.js:644420-647824 cjs-fingerprint
var hb = x(function (ui) {
  var OQ =
      (ui && ui.__createBinding) ||
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
    SQ =
      (ui && ui.__setModuleDefault) ||
      (Object.create
        ? function (e, t) {
            Object.defineProperty(e, "default", { enumerable: !0, value: t });
          }
        : function (e, t) {
            e.default = t;
          }),
    kQ =
      (ui && ui.__importStar) ||
      function (e) {
        if (e && e.__esModule) return e;
        var t = {};
        if (e != null) {
          for (var key in e)
            if (key !== "default" && Object.prototype.hasOwnProperty.call(e, key)) OQ(t, e, key);
        }
        return (SQ(t, e), t);
      };
  Object.defineProperty(ui, "__esModule", { value: !0 });
  ui.visit = PQ;
  var EQ = kQ(Bl()),
    vn = Ee(),
    BT = Symbol("z.visit/resolving");
  function PQ(e, t) {
    let n =
        typeof t === "function"
          ? t
          : (a, l) => {
              let c = t[a._zod.def.type];
              return c ? c(a, l) : a;
            },
      o = new Map();
    function r(a) {
      let l = o.get(a);
      if (l === BT) return new EQ.$ZodLazy({ type: "lazy", getter: () => o.get(a) });
      if (l !== void 0) return l;
      o.set(a, BT);
      let c = s(a),
        u = n(c, c !== a);
      return (o.set(a, u), u);
    }
    function s(a) {
      let def = a._zod.def,
        c = def.type;
      switch (c) {
        case "object": {
          let shape = def.shape,
            keys = Object.keys(shape),
            h = !1,
            m = {};
          for (let b of keys) {
            let w = r(shape[b]);
            if (w !== shape[b]) h = !0;
            m[b] = w;
          }
          let catchall = def.catchall;
          if (def.catchall) {
            if (((catchall = r(def.catchall)), catchall !== def.catchall)) h = !0;
          }
          return h ? vn.clone(a, { ...def, shape: m, catchall: catchall }) : a;
        }
        case "array": {
          let u = r(def.element);
          return u === def.element ? a : vn.clone(a, { ...def, element: u });
        }
        case "tuple": {
          let items = def.items,
            f = !1,
            h = [];
          for (let y of items) {
            let b = r(y);
            if (b !== y) f = !0;
            h.push(b);
          }
          let rest = def.rest;
          if (def.rest) {
            if (((rest = r(def.rest)), rest !== def.rest)) f = !0;
          }
          return f ? vn.clone(a, { ...def, items: h, rest: rest }) : a;
        }
        case "record":
        case "map": {
          let u = r(def.keyType),
            f = r(def.valueType);
          return u === def.keyType && f === def.valueType
            ? a
            : vn.clone(a, { ...def, keyType: u, valueType: f });
        }
        case "set": {
          let u = r(def.valueType);
          return u === def.valueType ? a : vn.clone(a, { ...def, valueType: u });
        }
        case "union": {
          let options = def.options,
            f = !1,
            h = [];
          for (let m of options) {
            let y = r(m);
            if (y !== m) f = !0;
            h.push(y);
          }
          return f ? vn.clone(a, { ...def, options: h }) : a;
        }
        case "intersection": {
          let u = r(def.left),
            f = r(def.right);
          return u === def.left && f === def.right ? a : vn.clone(a, { ...def, left: u, right: f });
        }
        case "optional":
        case "nullable":
        case "default":
        case "prefault":
        case "catch":
        case "readonly":
        case "nonoptional":
        case "promise":
        case "success": {
          let u = r(def.innerType);
          return u === def.innerType ? a : vn.clone(a, { ...def, innerType: u });
        }
        case "pipe": {
          let u = r(def.in),
            f = r(def.out);
          return u === def.in && f === def.out ? a : vn.clone(a, { ...def, in: u, out: f });
        }
        case "function": {
          let u = r(def.input),
            f = r(def.output);
          return u === def.input && f === def.output ? a : vn.clone(a, { ...def, input: u, output: f });
        }
        case "lazy": {
          let getter = def.getter,
            { _cachedInner: _cachedInner, ...h } = def;
          return vn.clone(a, { ...h, getter: () => r(getter()) });
        }
        case "properties": {
          let shape = def.shape,
            f = !1,
            h = {};
          for (let m of Reflect.ownKeys(shape)) {
            let y = r(shape[m]);
            if (y !== shape[m]) f = !0;
            h[m] = y;
          }
          return f ? vn.clone(a, { ...def, shape: h }) : a;
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
          return a;
        default:
          return a;
      }
    }
    return r(e);
  }
  (function () {
    var ownPropertyNames = Object.getOwnPropertyNames(ui);
    for (var t = 0; t < ownPropertyNames.length; t++) {
      var ownPropertyDescriptor = Object.getOwnPropertyDescriptor(ui, ownPropertyNames[t]);
      if (!ownPropertyDescriptor || !ownPropertyDescriptor.get || !ownPropertyDescriptor.configurable)
        continue;
      var o;
      try {
        o = ownPropertyDescriptor.get();
      } catch (error) {
        continue;
      }
      if (o === void 0) continue;
      Object.defineProperty(ui, ownPropertyNames[t], {
        value: o,
        writable: !1,
        enumerable: ownPropertyDescriptor.enumerable,
        configurable: !1,
      });
    }
    Object.freeze(ui);
  })();
});

export { hb };
