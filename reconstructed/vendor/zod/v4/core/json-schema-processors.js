/**
 * zod/v4/core/json-schema-processors.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-7vp249v4.js (12), chunk-dcmhvw5a.js (1)
 * attribution: esm-layout 2, esm-fingerprint 11
 */
import { alo, rhs, iSr, She } from "./util.js";
import { Me, he } from "./schemas.js";
import { kr, Zr, V, Te } from "./regexes.js";
import { k, vR, w, ee, te, re } from "./to-json-schema.js";

//@ chunk-7vp249v4.js:65890-67028 esm-layout
var D = (e, t, r) => {
    if (e[t] === void 0 || r > e[t]) e[t] = r;
  },
  j = (e, t, r) => {
    if (e[t] === void 0 || r < e[t]) e[t] = r;
  },
  ui = (e, t) => {
    (D(e, "minimum", t), j(e, "maximum", t));
  },
  di = (e, t) => {
    if ((e.multipleOf ?? (e.multipleOf = []), !e.multipleOf.includes(t))) e.multipleOf.push(t);
  },
  mi = (e, t) => {
    (e.patterns ?? (e.patterns = new Set()), e.patterns.add(t));
  },
  hi = (e, t) => {
    e.mime = e.mime ? e.mime.filter((r) => t.includes(r)) : [...t];
  },
  _i = (e, t) => {
    if (((e.format = t), t.includes("int"))) e.isInt = !0;
  },
  ai = (e, t) => D(e, "minimum", t.minimum),
  li = (e, t) => j(e, "maximum", t.maximum),
  pi = (e) => (t, r) => {
    _i(t, r.format);
    let [n, i] = e[r.format];
    (D(t, "minimum", n), j(t, "maximum", i));
  },
  js = {
    greater_than: (e, t) => D(e, t.inclusive ? "minimum" : "exclusiveMinimum", t.value),
    less_than: (e, t) => j(e, t.inclusive ? "maximum" : "exclusiveMaximum", t.value),
    multiple_of: (e, t) => di(e, t.value),
    number_format: pi(alo),
    bigint_format: pi(rhs),
    min_length: ai,
    max_length: li,
    length_equals: (e, t) => ui(e, t.length),
    min_size: ai,
    max_size: li,
    size_equals: (e, t) => ui(e, t.size),
    string_format: (e, t) => {
      if ((_i(e, t.format), t.pattern)) mi(e, t.pattern);
      if (t.format === "base64" || t.format === "base64url") e.contentEncoding = t.format;
      if (t.local || t.precision === -1) e.laxFormat = !0;
    },
    mime_type: (e, t) => hi(e, t.mime),
  };
//@ chunk-7vp249v4.js:67028-67644 esm-fingerprint
function P(e) {
  let t = {},
    def = e._zod.def,
    n = e._zod.traits.has("$ZodCheck") ? [e, ...(def.checks ?? [])] : (def.checks ?? []);
  for (let s of n) js[s._zod.def.check]?.(t, s._zod.def);
  let bag = e._zod.bag;
  if (bag.minimum !== void 0) D(t, "minimum", bag.minimum);
  if (bag.exclusiveMinimum !== void 0) D(t, "exclusiveMinimum", bag.exclusiveMinimum);
  if (bag.maximum !== void 0) j(t, "maximum", bag.maximum);
  if (bag.exclusiveMaximum !== void 0) j(t, "exclusiveMaximum", bag.exclusiveMaximum);
  if (bag.multipleOf !== void 0) di(t, bag.multipleOf);
  if (bag.format !== void 0) {
    if ((t.format ?? (t.format = bag.format), bag.format.includes("int"))) t.isInt = !0;
  }
  if (bag.mime) hi(t, bag.mime);
  for (let s of bag.patterns ?? []) mi(t, s);
  return t;
}
//@ chunk-7vp249v4.js:67644-71734 esm-fingerprint
var Ls = { guid: "uuid", url: "uri", datetime: "date-time", json_string: "json-string", regex: "" },
  Fs = new Map([
    [Me, kr],
    [he, Zr],
  ]),
  gi = (e) => Fs.get(e) ?? e,
  ht = (e, t, r, n) => {
    let i = r;
    i.type = "string";
    let {
      minimum: minimum,
      maximum: maximum,
      format: format,
      patterns: patterns,
      contentEncoding: contentEncoding,
      laxFormat: laxFormat,
    } = P(e);
    if (typeof minimum === "number") i.minLength = minimum;
    if (typeof maximum === "number") i.maxLength = maximum;
    if (format) {
      if (((i.format = Ls[format] ?? format), i.format === "")) delete i.format;
      if (format === "time" || laxFormat) delete i.format;
    }
    if (contentEncoding) i.contentEncoding = contentEncoding;
    if (patterns && patterns.size > 0) {
      let mapped = [...patterns].map(gi);
      if (mapped.length === 1) i.pattern = mapped[0].source;
      else if (mapped.length > 1)
        i.allOf = [
          ...mapped.map((_) => ({
            ...(t.target === "draft-07" || t.target === "draft-04" || t.target === "openapi-3.0"
              ? { type: "string" }
              : {}),
            pattern: _.source,
          })),
        ];
    }
  },
  _t = (e, t, r, n) => {
    let i = r,
      {
        minimum: minimum,
        maximum: maximum,
        multipleOf: multipleOf,
        exclusiveMaximum: exclusiveMaximum,
        exclusiveMinimum: exclusiveMinimum,
        isInt: isInt,
      } = P(e);
    i.type = isInt ? "integer" : "number";
    let d = typeof exclusiveMinimum === "number" && exclusiveMinimum >= (minimum ?? Number.NEGATIVE_INFINITY),
      _ = typeof exclusiveMaximum === "number" && exclusiveMaximum <= (maximum ?? Number.POSITIVE_INFINITY),
      m = t.target === "draft-04" || t.target === "openapi-3.0";
    if (d)
      if (m) ((i.minimum = exclusiveMinimum), (i.exclusiveMinimum = !0));
      else i.exclusiveMinimum = exclusiveMinimum;
    else if (typeof minimum === "number") i.minimum = minimum;
    if (_)
      if (m) ((i.maximum = exclusiveMaximum), (i.exclusiveMaximum = !0));
      else i.exclusiveMaximum = exclusiveMaximum;
    else if (typeof maximum === "number") i.maximum = maximum;
    if (multipleOf) {
      let h = new Set();
      for (let v of multipleOf)
        if (Number.isFinite(v) && v !== 0) h.add(Math.abs(v));
        else k(e, t, i, n, `A multipleOf divisor of ${v} cannot be represented in JSON Schema`);
      let [g, ...x] = h;
      if (g !== void 0) i.multipleOf = g;
      if (x.length) i.allOf = [...(i.allOf ?? []), ...x.map((v) => ({ multipleOf: v }))];
    }
  },
  gt = (e, t, r, n) => {
    r.type = "boolean";
  },
  xi = (e, t, r, n) => {
    k(e, t, r, n, "BigInt cannot be represented in JSON Schema");
  },
  vi = (e, t, r, n) => {
    k(e, t, r, n, "Symbols cannot be represented in JSON Schema");
  },
  xt = (e, t, r, n) => {
    if (t.target === "openapi-3.0") ((r.type = "string"), (r.nullable = !0), (r.enum = [null]));
    else r.type = "null";
  },
  vt = (e, t, r, n) => {
    k(e, t, r, n, "Undefined cannot be represented in JSON Schema");
  },
  yi = (e, t, r, n) => {
    k(e, t, r, n, "Void cannot be represented in JSON Schema");
  },
  yt = (e, t, r, n) => {
    r.not = {};
  },
  $t = (e, t, r, n) => {},
  zt = (e, t, r, n) => {},
  $i = (e, t, r, n) => {
    k(e, t, r, n, "Date cannot be represented in JSON Schema");
  },
  bt = (e, t, r, n) => {
    let def = e._zod.def,
      s = iSr(def.entries);
    if (s.length === 0) {
      r.not = {};
      return;
    }
    if (s.every((c) => typeof c === "number")) r.type = "number";
    if (s.every((c) => typeof c === "string")) r.type = "string";
    r.enum = s;
  },
  Zt = (e, t, r, n) => {
    let def = e._zod.def;
    if (def.values.length === 0) {
      r.not = {};
      return;
    }
    let s = [];
    for (let c of def.values)
      if (c === void 0) {
        if (k(e, t, r, n, "Literal `undefined` cannot be represented in JSON Schema")) return;
      } else if (typeof c === "bigint") {
        if (k(e, t, r, n, "BigInt literals cannot be represented in JSON Schema")) return;
        s.push(Number(c));
      } else s.push(c);
    if (s.length === 0);
    else if (s.length === 1) {
      let c = s[0];
      if (((r.type = c === null ? "null" : typeof c), t.target === "draft-04" || t.target === "openapi-3.0"))
        r.enum = [c];
      else r.const = c;
    } else {
      if (s.every((c) => typeof c === "number")) r.type = "number";
      if (s.every((c) => typeof c === "string")) r.type = "string";
      if (s.every((c) => typeof c === "boolean")) r.type = "boolean";
      if (s.every((c) => c === null)) r.type = "null";
      r.enum = s;
    }
  },
  zi = (e, t, r, n) => {
    k(e, t, r, n, "NaN cannot be represented in JSON Schema");
  },
  bi = (e, t, r, n) => {
    let i = r,
      pattern = e._zod.pattern;
    if (!pattern) throw Error("Pattern not found in template literal");
    ((i.type = "string"), (i.pattern = pattern.source));
  },
  ki = (e, t, r, n) => {
    let i = r;
    ((i.type = "string"), (i.format = "binary"), (i.contentEncoding = "binary"));
    let { minimum: minimum, maximum: maximum, mime: mime } = P(e);
    if (minimum !== void 0) i.minLength = minimum;
    if (maximum !== void 0) i.maxLength = maximum;
    if (!mime) return;
    if (mime.length === 0) i.not = {};
    else if (mime.length === 1) i.contentMediaType = mime[0];
    else i.anyOf = mime.map((l) => ({ contentMediaType: l }));
  },
  Zi = (e, t, r, n) => {
    r.type = "boolean";
  },
  wt = (e, t, r, n) => {
    k(e, t, r, n, "Custom types cannot be represented in JSON Schema");
  },
  wi = (e, t, r, n) => {
    k(e, t, r, n, "Function types cannot be represented in JSON Schema");
  },
  Pt = (e, t, r, n) => {
    k(e, t, r, n, "Transforms cannot be represented in JSON Schema");
  },
  Pi = (e, t, r, n) => {
    k(e, t, r, n, "Map cannot be represented in JSON Schema");
  },
  Si = (e, t, r, n) => {
    k(e, t, r, n, "Set cannot be represented in JSON Schema");
  },
  St = (e, t, r, n) => {
    let i = r,
      def = e._zod.def,
      { minimum: minimum, maximum: maximum } = P(e);
    if (typeof minimum === "number") i.minItems = minimum;
    if (typeof maximum === "number") i.maxItems = maximum;
    ((i.type = "array"), (i.items = vR(def.element, t, { ...n, path: [...n.path, "items"] })));
  };
//@ chunk-7vp249v4.js:71734-71901 esm-fingerprint
function L(e) {
  let def = e._zod.def;
  if (def.type === "pipe" && def.in._zod.traits.has("$ZodTransform")) return L(def.out);
  if (def.type === "catch") return L(def.innerType);
  return e._zod.optin;
}
//@ chunk-7vp249v4.js:71901-74555 esm-fingerprint
var It = (e, t, r, n) => {
    let i = r,
      def = e._zod.def,
      shape = def.shape;
    if (
      Object.getOwnPropertySymbols(shape).length &&
      k(e, t, i, n, "Symbol keys cannot be represented in JSON Schema")
    )
      return;
    ((i.type = "object"), (i.properties = {}));
    for (let key in shape)
      She(i.properties, key, vR(shape[key], t, { ...n, path: [...n.path, "properties", key] }));
    let l = new Set(Object.keys(shape)),
      p = new Set(
        [...l].filter((f) => {
          let d = def.shape[f];
          if (t.io === "input") return L(d) === void 0;
          else return d._zod.optout === void 0;
        }),
      );
    if (p.size > 0) i.required = Array.from(p);
    if (def.catchall?._zod.def.type === "never") i.additionalProperties = !1;
    else if (!def.catchall) {
      if (t.io === "output") i.additionalProperties = !1;
    } else if (def.catchall)
      i.additionalProperties = vR(def.catchall, t, { ...n, path: [...n.path, "additionalProperties"] });
  },
  Ms = (e, t, r, n) => {
    let i = r,
      def = e._zod.def;
    if (
      Object.getOwnPropertySymbols(def.shape).length &&
      k(e, t, i, n, "Symbol keys cannot be represented in JSON Schema")
    )
      return;
    if (t.io === "output") {
      for (let key in def.shape)
        if (
          w(def.shape[key]) &&
          k(
            e,
            t,
            i,
            n,
            `z.properties() returns its input, so the output of a transforming schema at key "${key}" cannot be represented in JSON Schema`,
          )
        )
          return;
    }
    ((i.type = "object"), (i.properties = {}));
    for (let key in def.shape)
      She(i.properties, key, vR(def.shape[key], t, { ...n, path: [...n.path, "properties", key] }));
    let filtered = Object.keys(def.shape).filter((a) => L(def.shape[a]) === void 0);
    if (filtered.length > 0) i.required = filtered;
  },
  Ot = (e, t, r, n) => {
    let def = e._zod.def,
      s = def.inclusive === !1,
      mapped = def.options.map((option, l) =>
        vR(option, t, { ...n, path: [...n.path, s ? "oneOf" : "anyOf", l] }),
      );
    if (s) r.oneOf = mapped;
    else r.anyOf = mapped;
  },
  At = (e, t, r, n) => {
    let def = e._zod.def,
      s = vR(def.left, t, { ...n, path: [...n.path, "allOf", 0] }),
      c = vR(def.right, t, { ...n, path: [...n.path, "allOf", 1] }),
      a = (p) => "allOf" in p && Object.keys(p).length === 1,
      l = [...(a(s) ? s.allOf : [s]), ...(a(c) ? c.allOf : [c])];
    ((r.allOf = l), t.intersections.push(l));
  },
  Et = (e, t, r, n) => {
    let i = r,
      def = e._zod.def;
    i.type = "array";
    let c = t.target === "draft-2020-12" ? "prefixItems" : "items",
      a = t.target === "draft-2020-12" ? "items" : t.target === "openapi-3.0" ? "items" : "additionalItems",
      mapped = def.items.map((item, x) => vR(item, t, { ...n, path: [...n.path, c, x] })),
      p = def.rest
        ? vR(def.rest, t, {
            ...n,
            path: [...n.path, a, ...(t.target === "openapi-3.0" ? [def.items.length] : [])],
          })
        : null,
      f = def.items.length;
    while (f > 0) {
      let g = def.items[f - 1];
      if (!(t.io === "input" ? L(g) !== void 0 : g._zod.optout === "optional")) break;
      f--;
    }
    let d = def.items.length,
      _ = !def.rest;
    if (t.target === "draft-2020-12") {
      if (((i.prefixItems = mapped), _)) i.items = !1;
      else if (p) i.items = p;
      if (f > 0) i.minItems = f;
      if (_) i.maxItems = d;
    } else if (t.target === "openapi-3.0") {
      if (((i.items = { anyOf: mapped }), p)) i.items.anyOf.push(p);
      if (f > 0) i.minItems = f;
      if (_) i.maxItems = d;
    } else {
      if (((i.items = mapped), _)) i.additionalItems = !1;
      else if (p) i.additionalItems = p;
      if (f > 0) i.minItems = f;
      if (_) i.maxItems = d;
    }
    let { minimum: minimum, maximum: maximum } = P(e);
    if (typeof minimum === "number") i.minItems = minimum;
    if (typeof maximum === "number") i.maxItems = maximum;
  };
//@ chunk-7vp249v4.js:74555-75344 esm-fingerprint
function dt(e, t, r) {
  if (t.$ref) {
    if (r.has(t)) return t;
    r.add(t);
    let h = e.get(t)?.def;
    if (!h) return t;
    let g = dt(e, h, r);
    return g === h ? t : g;
  }
  for (let h of ["anyOf", "oneOf"]) {
    let g = t[h];
    if (!Array.isArray(g)) continue;
    let mapped = g.map((v) => dt(e, v, r));
    if (mapped.some((v, I) => v !== g[I])) t = { ...t, [h]: mapped };
  }
  let n = Array.isArray(t.type) ? t.type : [t.type],
    i = !n.includes("string") && n.some((h) => h === "number" || h === "integer"),
    s = t.enum ?? (t.const !== void 0 ? [t.const] : void 0);
  if (!i && !s?.some((h) => typeof h === "number")) return t;
  let {
    minimum: minimum,
    maximum: maximum,
    exclusiveMinimum: exclusiveMinimum,
    exclusiveMaximum: exclusiveMaximum,
    multipleOf: multipleOf,
    format: format,
    id: id,
    ...m
  } = t;
  if (m.enum) m.enum = m.enum.map((h) => (typeof h === "number" ? String(h) : h));
  else if (typeof m.const === "number") m.const = String(m.const);
  if (!i) return m;
  if (((m.type = "string"), !s)) m.pattern = (n.includes("number") ? V : Te).source;
  return m;
}
//@ chunk-7vp249v4.js:75344-75363 esm-layout
var weakMap_2 = new WeakMap();
//@ chunk-7vp249v4.js:75363-75773 esm-fingerprint
function Us(e) {
  let t = new Map();
  for (let n of e.seen.values()) if (n.def && !t.has(n.schema)) t.set(n.schema, n);
  let r = new Map();
  for (let n of weakMap_2.get(e) ?? []) {
    let i = e.seen.get(n),
      s = (i?.def ?? i?.schema)?.propertyNames;
    if (!s || s === !0 || r.has(s)) continue;
    let c = dt(t, s, new Set());
    if (c !== s) r.set(s, c);
  }
  if (!r.size) return;
  for (let n of e.seen.values())
    for (let i of [n.schema, n.def]) {
      let s = i && r.get(i.propertyNames);
      if (s) i.propertyNames = s;
    }
}
//@ chunk-7vp249v4.js:75773-76797 esm-fingerprint
var Tt = (e, t, r, n) => {
    let i = r,
      def = e._zod.def;
    i.type = "object";
    let keyType = def.keyType,
      patterns = P(keyType).patterns;
    if (def.mode === "loose" && patterns && patterns.size > 0) {
      let f = vR(def.valueType, t, { ...n, path: [...n.path, "patternProperties", "*"] });
      i.patternProperties = {};
      for (let d of patterns) She(i.patternProperties, gi(d).source, f);
    } else {
      if (t.target === "draft-07" || t.target === "draft-2020-12") {
        i.propertyNames = vR(def.keyType, t, { ...n, path: [...n.path, "propertyNames"] });
        let f = weakMap_2.get(t);
        if (!f) ((f = []), weakMap_2.set(t, f), t.deferred.push(() => Us(t)));
        f.push(e);
      }
      i.additionalProperties = vR(def.valueType, t, { ...n, path: [...n.path, "additionalProperties"] });
    }
    let values = keyType._zod.values,
      p = t.io === "input" && L(def.valueType) !== void 0;
    if (values && !def.partial && !p) {
      let filtered = [...values].filter((d) => typeof d === "string" || typeof d === "number");
      if (filtered.length > 0) i.required = filtered.map(String);
    }
  },
  Nt = (e, t, r, n) => {
    let def = e._zod.def,
      s = vR(def.innerType, t, n),
      c = t.seen.get(e);
    if (t.target === "openapi-3.0") ((c.ref = def.innerType), (r.nullable = !0));
    else r.anyOf = [s, { type: "null" }];
  },
  Ct = (e, t, r, n) => {
    let def = e._zod.def;
    vR(def.innerType, t, n);
    let s = t.seen.get(e);
    s.ref = def.innerType;
  },
  Rt = Symbol();
//@ chunk-7vp249v4.js:76797-77010 esm-fingerprint
function Ii(e, t, r, n, i) {
  let s = !1,
    json = JSON.stringify(e, (a, l) => {
      if (typeof l !== "bigint") return l;
      return ((s = !0), null);
    });
  if (!s) return JSON.parse(json);
  return (k(t, r, n, i, "BigInt defaults cannot be represented in JSON Schema"), Rt);
}
//@ chunk-7vp249v4.js:77010-78481 esm-fingerprint
var Dt = (e, t, r, n) => {
    let def = e._zod.def;
    vR(def.innerType, t, n);
    let s = t.seen.get(e);
    s.ref = def.innerType;
    let c = Ii(def.defaultValue, e, t, r, n);
    if (c !== Rt) r.default = c;
  },
  jt = (e, t, r, n) => {
    let def = e._zod.def;
    vR(def.innerType, t, n);
    let s = t.seen.get(e);
    if (((s.ref = def.innerType), t.io !== "input")) return;
    let c = Ii(def.defaultValue, e, t, r, n);
    if (c !== Rt) r._prefault = c;
  },
  Lt = (e, t, r, n) => {
    let def = e._zod.def;
    vR(def.innerType, t, n);
    let s = t.seen.get(e);
    s.ref = def.innerType;
    let c;
    try {
      c = def.catchValue(void 0);
    } catch {
      k(e, t, r, n, "Dynamic catch values are not supported in JSON Schema");
      return;
    }
    r.default = c;
  },
  Ft = (e, t, r, n) => {
    let def = e._zod.def,
      s = def.in._zod.traits.has("$ZodTransform"),
      c = t.io === "input" ? (s ? def.out : def.in) : def.out;
    vR(c, t, n);
    let a = t.seen.get(e);
    a.ref = c;
  },
  Mt = (e, t, r, n) => {
    let def = e._zod.def;
    vR(def.innerType, t, n);
    let s = t.seen.get(e);
    ((s.ref = def.innerType), (r.readOnly = !0));
  },
  Oi = (e, t, r, n) => {
    let def = e._zod.def;
    vR(def.innerType, t, n);
    let s = t.seen.get(e);
    s.ref = def.innerType;
  },
  ke = (e, t, r, n) => {
    let def = e._zod.def;
    vR(def.innerType, t, n);
    let s = t.seen.get(e);
    s.ref = def.innerType;
  },
  Ut = (e, t, r, n) => {
    let innerType = e._zod.innerType;
    vR(innerType, t, n);
    let s = t.seen.get(e);
    s.ref = innerType;
  },
  fi = {
    string: ht,
    number: _t,
    boolean: gt,
    bigint: xi,
    symbol: vi,
    null: xt,
    undefined: vt,
    void: yi,
    never: yt,
    any: $t,
    unknown: zt,
    date: $i,
    enum: bt,
    literal: Zt,
    nan: zi,
    template_literal: bi,
    file: ki,
    success: Zi,
    custom: wt,
    properties: Ms,
    function: wi,
    transform: Pt,
    map: Pi,
    set: Si,
    array: St,
    object: It,
    union: Ot,
    intersection: At,
    tuple: Et,
    record: Tt,
    nullable: Nt,
    nonoptional: Ct,
    default: Dt,
    prefault: jt,
    catch: Lt,
    pipe: Ft,
    readonly: Mt,
    promise: Oi,
    optional: ke,
    lazy: Ut,
  };
//@ chunk-7vp249v4.js:78481-78914 esm-fingerprint
function nut(e, t) {
  if ("_idmap" in e) {
    let n = e,
      i = ee({ ...t, processors: fi }),
      s = {};
    for (let l of n._idmap.entries()) {
      let [p, f] = l;
      vR(f, i);
    }
    let c = {},
      a = { registry: n, uri: t?.uri, defs: s };
    i.external = a;
    for (let l of n._idmap.entries()) {
      let [p, f] = l;
      (te(i, f), She(c, p, re(i, f)));
    }
    if (Object.keys(s).length > 0) {
      let l = i.target === "draft-2020-12" ? "$defs" : "definitions";
      c.__shared = { [l]: s };
    }
    return { schemas: c };
  }
  let r = ee({ ...t, processors: fi });
  return (vR(e, r), te(r, e), re(r, e));
}
//@ chunk-dcmhvw5a.js:431253-431399 esm-fingerprint
var Kp = new Set(["starts_with", "ends_with", "includes"]),
  Aw = { guid: "uuid", url: "uri", datetime: "date-time", json_string: "json-string", regex: "", time: "" };

export {
  Kp,
  Aw,
  ht,
  P,
  _t,
  gt,
  vt,
  xt,
  $t,
  zt,
  yt,
  St,
  It,
  Ot,
  At,
  Et,
  Tt,
  bt,
  Zt,
  Pt,
  ke,
  Nt,
  Dt,
  jt,
  Ct,
  Lt,
  Ft,
  Mt,
  Ut,
  wt,
  nut,
};
