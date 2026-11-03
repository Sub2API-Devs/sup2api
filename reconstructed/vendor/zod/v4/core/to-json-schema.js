/**
 * zod/v4/core/to-json-schema.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-7vp249v4.js (14)
 * attribution: esm-fingerprint 14
 */
import { She } from "./util.js";
import { __zod_globalRegistry } from "./registries.js";

//@ chunk-7vp249v4.js:56884-57024 esm-fingerprint
function H(e, ...t) {
  for (let r of t)
    for (let n of Reflect.ownKeys(r)) if (Object.prototype.propertyIsEnumerable.call(r, n)) She(e, n, r[n]);
  return e;
}
//@ chunk-7vp249v4.js:57024-57492 esm-fingerprint
function ee(e) {
  let t = e?.target ?? "draft-2020-12";
  if (t === "draft-4") t = "draft-04";
  if (t === "draft-7") t = "draft-07";
  return {
    processors: e.processors ?? {},
    metadataRegistry: e?.metadata ?? __zod_globalRegistry,
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
//@ chunk-7vp249v4.js:57492-57724 esm-fingerprint
function k(e, t, r, n, i) {
  let s =
    typeof t.unrepresentable === "function"
      ? t.unrepresentable({ zodSchema: e, path: n.path, message: i })
      : t.unrepresentable;
  if (s === "any") return !1;
  if (s === void 0 || s === "throw") throw Error(i);
  return (Object.assign(r, s), !0);
}
//@ chunk-7vp249v4.js:57724-58672 esm-fingerprint
function vR(e, t, r = { path: [], schemaPath: [] }) {
  var n;
  let def = e._zod.def,
    s = t.seen.get(e);
  if (s) {
    if ((s.count++, r.schemaPath.includes(e))) s.cycle = r.path;
    return s.schema;
  }
  let c = { schema: {}, count: 1, cycle: void 0, path: r.path };
  (t.seen.set(e, c), (t.sharedDefsExtractedFor = void 0), (t.sharedEmitDoneFor = void 0));
  let a = e._zod.toJSONSchema?.();
  if (a) c.schema = a;
  else {
    let f = { ...r, schemaPath: [...r.schemaPath, e], path: r.path };
    if (e._zod.processJSONSchema) e._zod.processJSONSchema(t, c.schema, f);
    else {
      let schema = c.schema,
        m = t.processors[def.type];
      if (!m) throw Error(`[toJSONSchema]: Non-representable type encountered: ${def.type}`);
      m(e, t, schema, f);
    }
    let parent = e._zod.parent;
    if (parent) {
      if (!c.ref) c.ref = parent;
      (vR(parent, t, f), (t.seen.get(parent).isParent = !0));
    }
  }
  let l = t.metadataRegistry.get(e);
  if (l) H(c.schema, l);
  if (t.io === "input" && w(e)) (delete c.schema.examples, delete c.schema.default);
  if (t.io === "input" && "_prefault" in c.schema) (n = c.schema).default ?? (n.default = c.schema._prefault);
  return (delete c.schema._prefault, t.seen.get(e).schema);
}
//@ chunk-7vp249v4.js:58672-58735 esm-fingerprint
function ri(e) {
  return e.replace(/~/g, "~0").replace(/\//g, "~1");
}
//@ chunk-7vp249v4.js:58735-60319 esm-fingerprint
function te(e, t) {
  let r = e.seen.get(t);
  if (!r) throw Error("Unprocessed schema. This is a bug in Zod.");
  if (e.external && e.sharedDefsExtractedFor === e.external) return;
  let n = new Map();
  for (let c of e.seen.entries()) {
    let a = e.metadataRegistry.get(c[0])?.id;
    if (a) {
      let l = n.get(a);
      if (l && l !== c[0])
        throw Error(
          `Duplicate schema id "${a}" detected during JSON Schema conversion. Two different schemas cannot share the same id when converted together.`,
        );
      n.set(a, c[0]);
    }
  }
  let i = (c) => {
      let a = e.target === "draft-2020-12" ? "$defs" : "definitions";
      if (e.external) {
        let d = e.external.registry.get(c[0])?.id,
          _ = e.external.uri ?? ((h) => h);
        if (d) return { ref: _(d) };
        let m = c[1].defId ?? c[1].schema.id ?? `schema${e.counter++}`;
        return ((c[1].defId = m), { defId: m, ref: `${_("__shared")}#/${a}/${ri(m)}` });
      }
      let l = "#",
        p = `${l}/${a}/`;
      if (c[1] === r && !c[1].schema.id) return { ref: l };
      let f = c[1].schema.id ?? `__schema${e.counter++}`;
      return { defId: f, ref: p + ri(f) };
    },
    s = (c) => {
      if (c[1].schema.$ref) return;
      let a = c[1],
        { ref: ref, defId: defId } = i(c);
      if (((a.def = { ...a.schema }), defId)) a.defId = defId;
      let schema = a.schema;
      for (let key in schema) delete schema[key];
      schema.$ref = ref;
    };
  if (e.cycles === "throw")
    for (let c of e.seen.entries()) {
      let a = c[1];
      if (a.cycle)
        throw Error(`Cycle detected: #/${a.cycle?.join("/")}/<root>

Set the \`cycles\` parameter to \`"ref"\` to resolve cyclical schemas with defs.`);
    }
  for (let c of e.seen.entries()) {
    let a = c[1];
    if (t === c[0]) {
      s(c);
      continue;
    }
    if (e.external) {
      let p = e.external.registry.get(c[0])?.id;
      if (t !== c[0] && p) {
        s(c);
        continue;
      }
    }
    if (e.metadataRegistry.get(c[0])?.id) {
      s(c);
      continue;
    }
    if (a.cycle) {
      s(c);
      continue;
    }
    if (a.count > 1) {
      if (e.reused === "ref") s(c);
    }
  }
  if (e.external) e.sharedDefsExtractedFor = e.external;
}
//@ chunk-7vp249v4.js:60319-60682 esm-fingerprint
function ii(e) {
  let anyOf = e.anyOf;
  if (!Array.isArray(anyOf) || anyOf.length === 0 || e.type !== void 0) return;
  let r = [];
  for (let n of anyOf) {
    if (!n || typeof n !== "object") return;
    ii(n);
    let keys = Object.keys(n);
    if (keys.length !== 1 || keys[0] !== "type") return;
    let s = n.type;
    for (let c of Array.isArray(s) ? s : [s]) {
      if (typeof c !== "string") return;
      if (!r.includes(c)) r.push(c);
    }
  }
  (delete e.anyOf, (e.type = r.length === 1 ? r[0] : r));
}
//@ chunk-7vp249v4.js:60682-60775 esm-fingerprint
var si = new Set(["type", "properties", "required", "additionalProperties"]),
  oi = ["oneOf", "anyOf"];
//@ chunk-7vp249v4.js:60775-60920 esm-fingerprint
function ni(e) {
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
//@ chunk-7vp249v4.js:60920-61773 esm-fingerprint
function ft(e) {
  let t = [];
  for (let s of e) {
    if (typeof s !== "object" || s.type !== "object") return null;
    for (let key in s) if (!si.has(key)) return null;
    t.push(s);
  }
  let r = {},
    n = new Set();
  for (let s of t) {
    for (let key in s.properties) {
      if (Object.prototype.hasOwnProperty.call(r, key)) continue;
      let a = [];
      for (let p of t) {
        let f = p.properties?.[key] ?? ni(p);
        if (f === null || f === void 0) continue;
        if (!a.some((d) => JSON.stringify(d) === JSON.stringify(f))) a.push(f);
      }
      let l = a.length === 1 ? a[0] : (ft(a) ?? { allOf: a });
      She(r, key, l);
    }
    for (let c of s.required ?? []) n.add(c);
  }
  let i = { type: "object", properties: r };
  if (n.size) i.required = [...n];
  if (t.every((s) => s.additionalProperties === !1)) i.additionalProperties = !1;
  else {
    let s = [];
    for (let c of t) {
      let a = ni(c);
      if (a && !s.some((l) => JSON.stringify(l) === JSON.stringify(a))) s.push(a);
    }
    if (s.length === 1) i.additionalProperties = s[0];
    else if (s.length > 1) i.additionalProperties = { allOf: s };
  }
  return i;
}
//@ chunk-7vp249v4.js:61773-62174 esm-fingerprint
function Ds(e) {
  let allOf = e.allOf;
  if (!Array.isArray(allOf) || allOf.length < 2) return;
  for (let i of si) if (i in e) return;
  let filtered = allOf.filter((i) => oi.some((s) => Array.isArray(i[s]))),
    n = null;
  if (!filtered.length) n = ft(allOf);
  else {
    let i = filtered[0],
      found = oi.find((l) => Array.isArray(i[l]));
    if (Object.keys(i).length !== 1) return;
    let filtered_2 = allOf.filter((l) => l !== i),
      mapped = i[found].map((l) => ft([...filtered_2, l]));
    if (mapped.some((l) => !l)) return;
    n = { [found]: mapped };
  }
  if (!n) return;
  (delete e.allOf, H(e, n));
}
//@ chunk-7vp249v4.js:62174-64732 esm-fingerprint
function re(e, t) {
  let r = e.seen.get(t);
  if (!r) throw Error("Unprocessed schema. This is a bug in Zod.");
  let n = (a) => {
    let l = e.seen.get(a);
    if (l.ref === null) return;
    let p = l.def ?? l.schema,
      f = { ...p },
      ref = l.ref;
    if (((l.ref = null), ref)) {
      n(ref);
      let m = e.seen.get(ref),
        schema = m.schema;
      if (schema.$ref && (e.target === "draft-07" || e.target === "draft-04" || e.target === "openapi-3.0"))
        ((p.allOf = p.allOf ?? []), p.allOf.push(schema));
      else H(p, schema);
      if ((H(p, f), a._zod.parent === ref))
        for (let key in p) {
          if (key === "$ref" || key === "allOf") continue;
          if (!(key in f)) delete p[key];
        }
      if (schema.$ref && m.def)
        for (let key in p) {
          if (key === "$ref" || key === "allOf") continue;
          if (key in m.def && JSON.stringify(p[key]) === JSON.stringify(m.def[key])) delete p[key];
        }
    }
    let parent = a._zod.parent;
    if (parent && parent !== ref) {
      n(parent);
      let m = e.seen.get(parent);
      if (m?.schema.$ref) {
        if (((p.$ref = m.schema.$ref), m.def))
          for (let key in p) {
            if (key === "$ref" || key === "allOf") continue;
            if (key in m.def && JSON.stringify(p[key]) === JSON.stringify(m.def[key])) delete p[key];
          }
      }
    }
    e.override({ zodSchema: a, jsonSchema: p, path: l.path ?? [] });
  };
  if (!e.external || e.sharedEmitDoneFor !== e.external) {
    for (let a of [...e.seen.entries()].reverse()) n(a[0]);
    if (e.target !== "openapi-3.0") for (let a of e.seen.entries()) ii(a[1].def ?? a[1].schema);
    for (let a of e.deferred) a();
    if (e.intersections.length) {
      let a = new Map();
      for (let l of e.seen.values())
        for (let p of [l.schema, l.def]) {
          let f = p?.allOf;
          if (!Array.isArray(f)) continue;
          let d = a.get(f);
          if (d) d.push(p);
          else a.set(f, [p]);
        }
      for (let intersection of e.intersections) for (let p of a.get(intersection) ?? []) Ds(p);
    }
  }
  let i = {};
  if (e.target === "draft-2020-12") i.$schema = "https://json-schema.org/draft/2020-12/schema";
  else if (e.target === "draft-07") i.$schema = "http://json-schema.org/draft-07/schema#";
  else if (e.target === "draft-04") i.$schema = "http://json-schema.org/draft-04/schema#";
  else if (e.target === "openapi-3.0");
  if (e.external?.uri) {
    let a = e.external.registry.get(t)?.id;
    if (!a) throw Error("Schema is missing an `id` property");
    i.$id = e.external.uri(a);
  }
  H(i, r.defId ? r.schema : (r.def ?? r.schema));
  let s = e.metadataRegistry.get(t)?.id;
  if (s !== void 0 && i.id === s) delete i.id;
  let c = e.external?.defs ?? {};
  if (!e.external || e.sharedEmitDoneFor !== e.external)
    for (let a of e.seen.entries()) {
      let l = a[1];
      if (l.def && l.defId) {
        if (l.def.id === l.defId) delete l.def.id;
        She(c, l.defId, l.def);
      }
    }
  if (e.external) e.sharedEmitDoneFor = e.external;
  if (e.external);
  else if (Object.keys(c).length > 0)
    if (e.target === "draft-2020-12") i.$defs = c;
    else i.definitions = c;
  try {
    let parsed = JSON.parse(JSON.stringify(i));
    return (
      Object.defineProperty(parsed, "~standard", {
        value: {
          ...t["~standard"],
          jsonSchema: { input: Q(t, "input", e.processors), output: Q(t, "output", e.processors) },
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
//@ chunk-7vp249v4.js:64732-65672 esm-fingerprint
function w(e, t) {
  let r = t ?? { seen: new Set() };
  if (r.seen.has(e)) return !1;
  r.seen.add(e);
  let def = e._zod.def;
  if (def.type === "transform") return !0;
  if (def.type === "array") return w(def.element, r);
  if (def.type === "set") return w(def.valueType, r);
  if (def.type === "lazy") return w(def.getter(), r);
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
    return w(def.innerType, r);
  if (def.type === "intersection") return w(def.left, r) || w(def.right, r);
  if (def.type === "record" || def.type === "map") return w(def.keyType, r) || w(def.valueType, r);
  if (def.type === "pipe") {
    if (e._zod.traits.has("$ZodCodec")) return !0;
    return w(def.in, r) || w(def.out, r);
  }
  if (def.type === "object") {
    for (let key in def.shape) if (w(def.shape[key], r)) return !0;
    return !1;
  }
  if (def.type === "union") {
    for (let option of def.options) if (w(option, r)) return !0;
    return !1;
  }
  if (def.type === "tuple") {
    for (let item of def.items) if (w(item, r)) return !0;
    if (def.rest && w(def.rest, r)) return !0;
    return !1;
  }
  return !1;
}
//@ chunk-7vp249v4.js:65672-65890 esm-fingerprint
var ci =
    (e, t = {}) =>
    (r) => {
      let n = ee({ ...r, processors: t });
      return (vR(e, n), te(n, e), re(n, e));
    },
  Q =
    (e, t, r = {}) =>
    (n) => {
      let { libraryOptions: libraryOptions, target: target } = n ?? {},
        c = ee({ ...(libraryOptions ?? {}), target: target, io: t, processors: r });
      return (vR(e, c), te(c, e), re(c, e));
    };

export { Q, ci, k, vR, w, ee, te, re };
