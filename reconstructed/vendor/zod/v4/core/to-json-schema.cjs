/**
 * zod/v4/core/to-json-schema.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { Ju } from "./registries.cjs";
import { Ee } from "./util.cjs";

//@ chunk-1ny7cxrt.js:556551-566438 cjs-fingerprint
var td = x(function (Xl) {
  Object.defineProperty(Xl, "__esModule", { value: !0 });
  Xl.createStandardJSONSchemaMethod = Xl.createToJSONSchemaMethod = void 0;
  Xl.initializeContext = X_;
  Xl.handleUnrepresentable = g8;
  Xl.processSchema = rl;
  Xl.process = rl;
  Xl.processSchema = rl;
  Xl.process = rl;
  Xl.extractDefs = Q_;
  Xl.finalize = eb;
  Xl.isTransforming = Er;
  var BC = Ju(),
    Ql = Ee();
  function ed(e, ...t) {
    for (let n of t)
      for (let o of Reflect.ownKeys(n))
        if (Object.prototype.propertyIsEnumerable.call(n, o)) Ql.assignProp(e, o, n[o]);
    return e;
  }
  function X_(e) {
    let t = e?.target ?? "draft-2020-12";
    if (t === "draft-4") t = "draft-04";
    if (t === "draft-7") t = "draft-07";
    return {
      processors: e.processors ?? {},
      metadataRegistry: e?.metadata ?? BC.globalRegistry,
      target: t,
      unrepresentable: e?.unrepresentable ?? "throw",
      override: e?.override ?? (() => {}),
      io: e?.io ?? "output",
      counter: 0,
      seen: new Map(),
      sharedDefsExtractedFor: void 0,
      sharedEmitDoneFor: void 0,
      cycles: e?.cycles ?? "ref",
      reused: e?.reused ?? "inline",
      intersections: [],
      deferred: [],
      external: e?.external ?? void 0,
    };
  }
  function g8(e, t, n, o, r) {
    let s =
      typeof t.unrepresentable === "function"
        ? t.unrepresentable({ zodSchema: e, path: o.path, message: r })
        : t.unrepresentable;
    if (s === "any") return !1;
    if (s === void 0 || s === "throw") throw Error(r);
    return (Object.assign(n, s), !0);
  }
  function rl(e, t, n = { path: [], schemaPath: [] }) {
    var o;
    let def = e._zod.def,
      s = t.seen.get(e);
    if (s) {
      if ((s.count++, n.schemaPath.includes(e))) s.cycle = n.path;
      return s.schema;
    }
    let a = { schema: {}, count: 1, cycle: void 0, path: n.path };
    (t.seen.set(e, a), (t.sharedDefsExtractedFor = void 0), (t.sharedEmitDoneFor = void 0));
    let l = e._zod.toJSONSchema?.();
    if (l) a.schema = l;
    else {
      let f = { ...n, schemaPath: [...n.schemaPath, e], path: n.path };
      if (e._zod.processJSONSchema) e._zod.processJSONSchema(t, a.schema, f);
      else {
        let schema = a.schema,
          y = t.processors[def.type];
        if (!y) throw Error(`[toJSONSchema]: Non-representable type encountered: ${def.type}`);
        y(e, t, schema, f);
      }
      let parent = e._zod.parent;
      if (parent) {
        if (!a.ref) a.ref = parent;
        (rl(parent, t, f), (t.seen.get(parent).isParent = !0));
      }
    }
    let c = t.metadataRegistry.get(e);
    if (c) ed(a.schema, c);
    if (t.io === "input" && Er(e)) (delete a.schema.examples, delete a.schema.default);
    if (t.io === "input" && "_prefault" in a.schema)
      (o = a.schema).default ?? (o.default = a.schema._prefault);
    return (delete a.schema._prefault, t.seen.get(e).schema);
  }
  function UC(e) {
    return e.replace(/~/g, "~0").replace(/\//g, "~1");
  }
  function Q_(e, t) {
    let n = e.seen.get(t);
    if (!n) throw Error("Unprocessed schema. This is a bug in Zod.");
    if (e.external && e.sharedDefsExtractedFor === e.external) return;
    let o = new Map();
    for (let a of e.seen.entries()) {
      let l = e.metadataRegistry.get(a[0])?.id;
      if (l) {
        let c = o.get(l);
        if (c && c !== a[0])
          throw Error(
            `Duplicate schema id "${l}" detected during JSON Schema conversion. Two different schemas cannot share the same id when converted together.`,
          );
        o.set(l, a[0]);
      }
    }
    let r = (a) => {
        let l = e.target === "draft-2020-12" ? "$defs" : "definitions";
        if (e.external) {
          let h = e.external.registry.get(a[0])?.id,
            m = e.external.uri ?? ((b) => b);
          if (h) return { ref: m(h) };
          let y = a[1].defId ?? a[1].schema.id ?? `schema${e.counter++}`;
          return ((a[1].defId = y), { defId: y, ref: `${m("__shared")}#/${l}/${UC(y)}` });
        }
        let c = "#",
          u = `${c}/${l}/`;
        if (a[1] === n && !a[1].schema.id) return { ref: c };
        let f = a[1].schema.id ?? `__schema${e.counter++}`;
        return { defId: f, ref: u + UC(f) };
      },
      s = (a) => {
        if (a[1].schema.$ref) return;
        let l = a[1],
          { ref: ref, defId: defId } = r(a);
        if (((l.def = { ...l.schema }), defId)) l.defId = defId;
        let schema = l.schema;
        for (let key in schema) delete schema[key];
        schema.$ref = ref;
      };
    if (e.cycles === "throw")
      for (let a of e.seen.entries()) {
        let l = a[1];
        if (l.cycle)
          throw Error(`Cycle detected: #/${l.cycle?.join("/")}/<root>

Set the \`cycles\` parameter to \`"ref"\` to resolve cyclical schemas with defs.`);
      }
    for (let a of e.seen.entries()) {
      let l = a[1];
      if (t === a[0]) {
        s(a);
        continue;
      }
      if (e.external) {
        let u = e.external.registry.get(a[0])?.id;
        if (t !== a[0] && u) {
          s(a);
          continue;
        }
      }
      if (e.metadataRegistry.get(a[0])?.id) {
        s(a);
        continue;
      }
      if (l.cycle) {
        s(a);
        continue;
      }
      if (l.count > 1) {
        if (e.reused === "ref") s(a);
      }
    }
    if (e.external) e.sharedDefsExtractedFor = e.external;
  }
  function HC(e) {
    let anyOf = e.anyOf;
    if (!Array.isArray(anyOf) || anyOf.length === 0 || e.type !== void 0) return;
    let n = [];
    for (let o of anyOf) {
      if (!o || typeof o !== "object") return;
      HC(o);
      let keys = Object.keys(o);
      if (keys.length !== 1 || keys[0] !== "type") return;
      let s = o.type;
      for (let a of Array.isArray(s) ? s : [s]) {
        if (typeof a !== "string") return;
        if (!n.includes(a)) n.push(a);
      }
    }
    (delete e.anyOf, (e.type = n.length === 1 ? n[0] : n));
  }
  var KC = new Set(["type", "properties", "required", "additionalProperties"]),
    zC = ["oneOf", "anyOf"];
  function FC(e) {
    let additionalProperties = e.additionalProperties;
    if (
      additionalProperties === void 0 ||
      additionalProperties === !1 ||
      typeof additionalProperties !== "object" ||
      additionalProperties === null
    )
      return null;
    return Object.keys(additionalProperties).length ? additionalProperties : null;
  }
  function J_(e) {
    let t = [];
    for (let s of e) {
      if (typeof s !== "object" || s.type !== "object") return null;
      for (let key in s) if (!KC.has(key)) return null;
      t.push(s);
    }
    let n = {},
      o = new Set();
    for (let s of t) {
      for (let key in s.properties) {
        if (Object.prototype.hasOwnProperty.call(n, key)) continue;
        let l = [];
        for (let u of t) {
          let f = u.properties?.[key] ?? FC(u);
          if (f === null || f === void 0) continue;
          if (!l.some((h) => JSON.stringify(h) === JSON.stringify(f))) l.push(f);
        }
        let c = l.length === 1 ? l[0] : (J_(l) ?? { allOf: l });
        Ql.assignProp(n, key, c);
      }
      for (let a of s.required ?? []) o.add(a);
    }
    let r = { type: "object", properties: n };
    if (o.size) r.required = [...o];
    if (t.every((s) => s.additionalProperties === !1)) r.additionalProperties = !1;
    else {
      let s = [];
      for (let a of t) {
        let l = FC(a);
        if (l && !s.some((c) => JSON.stringify(c) === JSON.stringify(l))) s.push(l);
      }
      if (s.length === 1) r.additionalProperties = s[0];
      else if (s.length > 1) r.additionalProperties = { allOf: s };
    }
    return r;
  }
  function y8(e) {
    let allOf = e.allOf;
    if (!Array.isArray(allOf) || allOf.length < 2) return;
    for (let r of KC) if (r in e) return;
    let filtered = allOf.filter((r) => zC.some((s) => Array.isArray(r[s]))),
      o = null;
    if (!filtered.length) o = J_(allOf);
    else {
      let r = filtered[0],
        found = zC.find((c) => Array.isArray(r[c]));
      if (Object.keys(r).length !== 1) return;
      let filtered_2 = allOf.filter((c) => c !== r),
        mapped = r[found].map((c) => J_([...filtered_2, c]));
      if (mapped.some((c) => !c)) return;
      o = { [found]: mapped };
    }
    if (!o) return;
    (delete e.allOf, ed(e, o));
  }
  function eb(e, t) {
    let n = e.seen.get(t);
    if (!n) throw Error("Unprocessed schema. This is a bug in Zod.");
    let o = (l) => {
      let c = e.seen.get(l);
      if (c.ref === null) return;
      let u = c.def ?? c.schema,
        f = { ...u },
        ref = c.ref;
      if (((c.ref = null), ref)) {
        o(ref);
        let y = e.seen.get(ref),
          schema = y.schema;
        if (schema.$ref && (e.target === "draft-07" || e.target === "draft-04" || e.target === "openapi-3.0"))
          ((u.allOf = u.allOf ?? []), u.allOf.push(schema));
        else ed(u, schema);
        if ((ed(u, f), l._zod.parent === ref))
          for (let key in u) {
            if (key === "$ref" || key === "allOf") continue;
            if (!(key in f)) delete u[key];
          }
        if (schema.$ref && y.def)
          for (let key in u) {
            if (key === "$ref" || key === "allOf") continue;
            if (key in y.def && JSON.stringify(u[key]) === JSON.stringify(y.def[key])) delete u[key];
          }
      }
      let parent = l._zod.parent;
      if (parent && parent !== ref) {
        o(parent);
        let y = e.seen.get(parent);
        if (y?.schema.$ref) {
          if (((u.$ref = y.schema.$ref), y.def))
            for (let key in u) {
              if (key === "$ref" || key === "allOf") continue;
              if (key in y.def && JSON.stringify(u[key]) === JSON.stringify(y.def[key])) delete u[key];
            }
        }
      }
      e.override({ zodSchema: l, jsonSchema: u, path: c.path ?? [] });
    };
    if (!e.external || e.sharedEmitDoneFor !== e.external) {
      for (let l of [...e.seen.entries()].reverse()) o(l[0]);
      if (e.target !== "openapi-3.0") for (let l of e.seen.entries()) HC(l[1].def ?? l[1].schema);
      for (let l of e.deferred) l();
      if (e.intersections.length) {
        let l = new Map();
        for (let c of e.seen.values())
          for (let u of [c.schema, c.def]) {
            let f = u?.allOf;
            if (!Array.isArray(f)) continue;
            let h = l.get(f);
            if (h) h.push(u);
            else l.set(f, [u]);
          }
        for (let intersection of e.intersections) for (let u of l.get(intersection) ?? []) y8(u);
      }
    }
    let r = {};
    if (e.target === "draft-2020-12") r.$schema = "https://json-schema.org/draft/2020-12/schema";
    else if (e.target === "draft-07") r.$schema = "http://json-schema.org/draft-07/schema#";
    else if (e.target === "draft-04") r.$schema = "http://json-schema.org/draft-04/schema#";
    else if (e.target === "openapi-3.0");
    if (e.external?.uri) {
      let l = e.external.registry.get(t)?.id;
      if (!l) throw Error("Schema is missing an `id` property");
      r.$id = e.external.uri(l);
    }
    ed(r, n.defId ? n.schema : (n.def ?? n.schema));
    let s = e.metadataRegistry.get(t)?.id;
    if (s !== void 0 && r.id === s) delete r.id;
    let a = e.external?.defs ?? {};
    if (!e.external || e.sharedEmitDoneFor !== e.external)
      for (let l of e.seen.entries()) {
        let c = l[1];
        if (c.def && c.defId) {
          if (c.def.id === c.defId) delete c.def.id;
          Ql.assignProp(a, c.defId, c.def);
        }
      }
    if (e.external) e.sharedEmitDoneFor = e.external;
    if (e.external);
    else if (Object.keys(a).length > 0)
      if (e.target === "draft-2020-12") r.$defs = a;
      else r.definitions = a;
    try {
      let parsed = JSON.parse(JSON.stringify(r));
      return (
        Object.defineProperty(parsed, "~standard", {
          value: {
            ...t["~standard"],
            jsonSchema: {
              input: Xl.createStandardJSONSchemaMethod(t, "input", e.processors),
              output: Xl.createStandardJSONSchemaMethod(t, "output", e.processors),
            },
          },
          enumerable: !1,
          writable: !1,
        }),
        parsed
      );
    } catch (error) {
      throw Error("Error converting schema to JSON.");
    }
  }
  function Er(e, t) {
    let n = t ?? { seen: new Set() };
    if (n.seen.has(e)) return !1;
    n.seen.add(e);
    let def = e._zod.def;
    if (def.type === "transform") return !0;
    if (def.type === "array") return Er(def.element, n);
    if (def.type === "set") return Er(def.valueType, n);
    if (def.type === "lazy") return Er(def.getter(), n);
    if (
      def.type === "promise" ||
      def.type === "optional" ||
      def.type === "nonoptional" ||
      def.type === "nullable" ||
      def.type === "readonly" ||
      def.type === "default" ||
      def.type === "prefault" ||
      def.type === "catch"
    )
      return Er(def.innerType, n);
    if (def.type === "intersection") return Er(def.left, n) || Er(def.right, n);
    if (def.type === "record" || def.type === "map") return Er(def.keyType, n) || Er(def.valueType, n);
    if (def.type === "pipe") {
      if (e._zod.traits.has("$ZodCodec")) return !0;
      return Er(def.in, n) || Er(def.out, n);
    }
    if (def.type === "object") {
      for (let key in def.shape) if (Er(def.shape[key], n)) return !0;
      return !1;
    }
    if (def.type === "union") {
      for (let option of def.options) if (Er(option, n)) return !0;
      return !1;
    }
    if (def.type === "tuple") {
      for (let item of def.items) if (Er(item, n)) return !0;
      if (def.rest && Er(def.rest, n)) return !0;
      return !1;
    }
    return !1;
  }
  var _8 =
    (e, t = {}) =>
    (n) => {
      let o = X_({ ...n, processors: t });
      return (rl(e, o), Q_(o, e), eb(o, e));
    };
  Xl.createToJSONSchemaMethod = _8;
  var b8 =
    (e, t, n = {}) =>
    (o) => {
      let { libraryOptions: libraryOptions, target: target } = o ?? {},
        a = X_({ ...(libraryOptions ?? {}), target: target, io: t, processors: n });
      return (rl(e, a), Q_(a, e), eb(a, e));
    };
  Xl.createStandardJSONSchemaMethod = b8;
  (function () {
    var ownPropertyNames = Object.getOwnPropertyNames(Xl);
    for (var t = 0; t < ownPropertyNames.length; t++) {
      var ownPropertyDescriptor = Object.getOwnPropertyDescriptor(Xl, ownPropertyNames[t]);
      if (!ownPropertyDescriptor || !ownPropertyDescriptor.get || !ownPropertyDescriptor.configurable)
        continue;
      var o;
      try {
        o = ownPropertyDescriptor.get();
      } catch (error) {
        continue;
      }
      if (o === void 0) continue;
      Object.defineProperty(Xl, ownPropertyNames[t], {
        value: o,
        writable: !1,
        enumerable: ownPropertyDescriptor.enumerable,
        configurable: !1,
      });
    }
    Object.freeze(Xl);
  })();
});

export { td };
