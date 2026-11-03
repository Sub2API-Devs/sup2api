/**
 * zod/v4/core/json-schema-processors.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { Ul } from "./regexes.cjs";
import { Bl } from "./schemas.cjs";
import { td } from "./to-json-schema.cjs";
import { Ee } from "./util.cjs";

//@ chunk-1ny7cxrt.js:566438-584049 cjs-fingerprint
var nd = x(function (G) {
  var P8 =
      (G && G.__createBinding) ||
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
    A8 =
      (G && G.__setModuleDefault) ||
      (Object.create
        ? function (e, t) {
            Object.defineProperty(e, "default", { enumerable: !0, value: t });
          }
        : function (e, t) {
            e.default = t;
          }),
    I8 =
      (G && G.__importStar) ||
      function (e) {
        if (e && e.__esModule) return e;
        var t = {};
        if (e != null) {
          for (var key in e)
            if (key !== "default" && Object.prototype.hasOwnProperty.call(e, key)) P8(t, e, key);
        }
        return (A8(t, e), t);
      };
  Object.defineProperty(G, "__esModule", { value: !0 });
  G.allProcessors =
    G.lazyProcessor =
    G.optionalProcessor =
    G.promiseProcessor =
    G.readonlyProcessor =
    G.pipeProcessor =
    G.catchProcessor =
    G.prefaultProcessor =
    G.defaultProcessor =
    G.nonoptionalProcessor =
    G.nullableProcessor =
    G.recordProcessor =
    G.tupleProcessor =
    G.intersectionProcessor =
    G.unionProcessor =
    G.propertiesProcessor =
    G.objectProcessor =
    G.arrayProcessor =
    G.setProcessor =
    G.mapProcessor =
    G.transformProcessor =
    G.functionProcessor =
    G.customProcessor =
    G.successProcessor =
    G.fileProcessor =
    G.templateLiteralProcessor =
    G.nanProcessor =
    G.literalProcessor =
    G.enumProcessor =
    G.dateProcessor =
    G.unknownProcessor =
    G.anyProcessor =
    G.neverProcessor =
    G.voidProcessor =
    G.undefinedProcessor =
    G.nullProcessor =
    G.symbolProcessor =
    G.bigintProcessor =
    G.booleanProcessor =
    G.numberProcessor =
    G.stringProcessor =
      void 0;
  G.aggregateChecks = il;
  G.toJSONSchema = bX;
  var kh = I8(Ul()),
    Eh = Bl(),
    ae = td(),
    Gr = Ee(),
    ec = (e, t, n) => {
      if (e[t] === void 0 || n > e[t]) e[t] = n;
    },
    tc = (e, t, n) => {
      if (e[t] === void 0 || n < e[t]) e[t] = n;
    },
    qC = (e, t) => {
      (ec(e, "minimum", t), tc(e, "maximum", t));
    },
    JC = (e, t) => {
      if ((e.multipleOf ?? (e.multipleOf = []), !e.multipleOf.includes(t))) e.multipleOf.push(t);
    },
    XC = (e, t) => {
      (e.patterns ?? (e.patterns = new Set()), e.patterns.add(t));
    },
    QC = (e, t) => {
      e.mime = e.mime ? e.mime.filter((n) => t.includes(n)) : [...t];
    },
    eT = (e, t) => {
      if (((e.format = t), t.includes("int"))) e.isInt = !0;
    },
    GC = (e, t) => ec(e, "minimum", t.minimum),
    WC = (e, t) => tc(e, "maximum", t.maximum),
    YC = (e) => (t, n) => {
      eT(t, n.format);
      let [o, r] = e[n.format];
      (ec(t, "minimum", o), tc(t, "maximum", r));
    },
    C8 = {
      greater_than: (e, t) => ec(e, t.inclusive ? "minimum" : "exclusiveMinimum", t.value),
      less_than: (e, t) => tc(e, t.inclusive ? "maximum" : "exclusiveMaximum", t.value),
      multiple_of: (e, t) => JC(e, t.value),
      number_format: YC(Gr.NUMBER_FORMAT_RANGES),
      bigint_format: YC(Gr.BIGINT_FORMAT_RANGES),
      min_length: GC,
      max_length: WC,
      length_equals: (e, t) => qC(e, t.length),
      min_size: GC,
      max_size: WC,
      size_equals: (e, t) => qC(e, t.size),
      string_format: (e, t) => {
        if ((eT(e, t.format), t.pattern)) XC(e, t.pattern);
        if (t.format === "base64" || t.format === "base64url") e.contentEncoding = t.format;
        if (t.local || t.precision === -1) e.laxFormat = !0;
      },
      mime_type: (e, t) => QC(e, t.mime),
    };
  function il(e) {
    let t = {},
      def = e._zod.def,
      o = e._zod.traits.has("$ZodCheck") ? [e, ...(def.checks ?? [])] : (def.checks ?? []);
    for (let s of o) C8[s._zod.def.check]?.(t, s._zod.def);
    let bag = e._zod.bag;
    if (bag.minimum !== void 0) ec(t, "minimum", bag.minimum);
    if (bag.exclusiveMinimum !== void 0) ec(t, "exclusiveMinimum", bag.exclusiveMinimum);
    if (bag.maximum !== void 0) tc(t, "maximum", bag.maximum);
    if (bag.exclusiveMaximum !== void 0) tc(t, "exclusiveMaximum", bag.exclusiveMaximum);
    if (bag.multipleOf !== void 0) JC(t, bag.multipleOf);
    if (bag.format !== void 0) {
      if ((t.format ?? (t.format = bag.format), bag.format.includes("int"))) t.isInt = !0;
    }
    if (bag.mime) QC(t, bag.mime);
    for (let s of bag.patterns ?? []) XC(t, s);
    return t;
  }
  var T8 = { guid: "uuid", url: "uri", datetime: "date-time", json_string: "json-string", regex: "" },
    $8 = new Map([
      [Eh.base64Charset, kh.base64],
      [Eh.base64urlCharset, kh.base64url],
    ]),
    tT = (e) => $8.get(e) ?? e,
    R8 = (e, t, n, o) => {
      let r = n;
      r.type = "string";
      let {
        minimum: minimum,
        maximum: maximum,
        format: format,
        patterns: patterns,
        contentEncoding: contentEncoding,
        laxFormat: laxFormat,
      } = il(e);
      if (typeof minimum === "number") r.minLength = minimum;
      if (typeof maximum === "number") r.maxLength = maximum;
      if (format) {
        if (((r.format = T8[format] ?? format), r.format === "")) delete r.format;
        if (format === "time" || laxFormat) delete r.format;
      }
      if (contentEncoding) r.contentEncoding = contentEncoding;
      if (patterns && patterns.size > 0) {
        let mapped = [...patterns].map(tT);
        if (mapped.length === 1) r.pattern = mapped[0].source;
        else if (mapped.length > 1)
          r.allOf = [
            ...mapped.map((m) => ({
              ...(t.target === "draft-07" || t.target === "draft-04" || t.target === "openapi-3.0"
                ? { type: "string" }
                : {}),
              pattern: m.source,
            })),
          ];
      }
    };
  G.stringProcessor = R8;
  var D8 = (e, t, n, o) => {
    let r = n,
      {
        minimum: minimum,
        maximum: maximum,
        multipleOf: multipleOf,
        exclusiveMaximum: exclusiveMaximum,
        exclusiveMinimum: exclusiveMinimum,
        isInt: isInt,
      } = il(e);
    r.type = isInt ? "integer" : "number";
    let h = typeof exclusiveMinimum === "number" && exclusiveMinimum >= (minimum ?? Number.NEGATIVE_INFINITY),
      m = typeof exclusiveMaximum === "number" && exclusiveMaximum <= (maximum ?? Number.POSITIVE_INFINITY),
      y = t.target === "draft-04" || t.target === "openapi-3.0";
    if (h)
      if (y) ((r.minimum = exclusiveMinimum), (r.exclusiveMinimum = !0));
      else r.exclusiveMinimum = exclusiveMinimum;
    else if (typeof minimum === "number") r.minimum = minimum;
    if (m)
      if (y) ((r.maximum = exclusiveMaximum), (r.exclusiveMaximum = !0));
      else r.exclusiveMaximum = exclusiveMaximum;
    else if (typeof maximum === "number") r.maximum = maximum;
    if (multipleOf) {
      let b = new Set();
      for (let j of multipleOf)
        if (Number.isFinite(j) && j !== 0) b.add(Math.abs(j));
        else
          ae.handleUnrepresentable(
            e,
            t,
            r,
            o,
            `A multipleOf divisor of ${j} cannot be represented in JSON Schema`,
          );
      let [w, ...S] = b;
      if (w !== void 0) r.multipleOf = w;
      if (S.length) r.allOf = [...(r.allOf ?? []), ...S.map((j) => ({ multipleOf: j }))];
    }
  };
  G.numberProcessor = D8;
  var M8 = (e, t, n, o) => {
    n.type = "boolean";
  };
  G.booleanProcessor = M8;
  var j8 = (e, t, n, o) => {
    ae.handleUnrepresentable(e, t, n, o, "BigInt cannot be represented in JSON Schema");
  };
  G.bigintProcessor = j8;
  var x8 = (e, t, n, o) => {
    ae.handleUnrepresentable(e, t, n, o, "Symbols cannot be represented in JSON Schema");
  };
  G.symbolProcessor = x8;
  var L8 = (e, t, n, o) => {
    if (t.target === "openapi-3.0") ((n.type = "string"), (n.nullable = !0), (n.enum = [null]));
    else n.type = "null";
  };
  G.nullProcessor = L8;
  var N8 = (e, t, n, o) => {
    ae.handleUnrepresentable(e, t, n, o, "Undefined cannot be represented in JSON Schema");
  };
  G.undefinedProcessor = N8;
  var U8 = (e, t, n, o) => {
    ae.handleUnrepresentable(e, t, n, o, "Void cannot be represented in JSON Schema");
  };
  G.voidProcessor = U8;
  var z8 = (e, t, n, o) => {
    n.not = {};
  };
  G.neverProcessor = z8;
  var F8 = (e, t, n, o) => {};
  G.anyProcessor = F8;
  var B8 = (e, t, n, o) => {};
  G.unknownProcessor = B8;
  var H8 = (e, t, n, o) => {
    ae.handleUnrepresentable(e, t, n, o, "Date cannot be represented in JSON Schema");
  };
  G.dateProcessor = H8;
  var K8 = (e, t, n, o) => {
    let def = e._zod.def,
      enumValues = Gr.getEnumValues(def.entries);
    if (enumValues.length === 0) {
      n.not = {};
      return;
    }
    if (enumValues.every((a) => typeof a === "number")) n.type = "number";
    if (enumValues.every((a) => typeof a === "string")) n.type = "string";
    n.enum = enumValues;
  };
  G.enumProcessor = K8;
  var Z8 = (e, t, n, o) => {
    let def = e._zod.def;
    if (def.values.length === 0) {
      n.not = {};
      return;
    }
    let s = [];
    for (let a of def.values)
      if (a === void 0) {
        if (ae.handleUnrepresentable(e, t, n, o, "Literal `undefined` cannot be represented in JSON Schema"))
          return;
      } else if (typeof a === "bigint") {
        if (ae.handleUnrepresentable(e, t, n, o, "BigInt literals cannot be represented in JSON Schema"))
          return;
        s.push(Number(a));
      } else s.push(a);
    if (s.length === 0);
    else if (s.length === 1) {
      let a = s[0];
      if (((n.type = a === null ? "null" : typeof a), t.target === "draft-04" || t.target === "openapi-3.0"))
        n.enum = [a];
      else n.const = a;
    } else {
      if (s.every((a) => typeof a === "number")) n.type = "number";
      if (s.every((a) => typeof a === "string")) n.type = "string";
      if (s.every((a) => typeof a === "boolean")) n.type = "boolean";
      if (s.every((a) => a === null)) n.type = "null";
      n.enum = s;
    }
  };
  G.literalProcessor = Z8;
  var V8 = (e, t, n, o) => {
    ae.handleUnrepresentable(e, t, n, o, "NaN cannot be represented in JSON Schema");
  };
  G.nanProcessor = V8;
  var q8 = (e, t, n, o) => {
    let r = n,
      pattern = e._zod.pattern;
    if (!pattern) throw Error("Pattern not found in template literal");
    ((r.type = "string"), (r.pattern = pattern.source));
  };
  G.templateLiteralProcessor = q8;
  var G8 = (e, t, n, o) => {
    let r = n;
    ((r.type = "string"), (r.format = "binary"), (r.contentEncoding = "binary"));
    let { minimum: minimum, maximum: maximum, mime: mime } = il(e);
    if (minimum !== void 0) r.minLength = minimum;
    if (maximum !== void 0) r.maxLength = maximum;
    if (!mime) return;
    if (mime.length === 0) r.not = {};
    else if (mime.length === 1) r.contentMediaType = mime[0];
    else r.anyOf = mime.map((c) => ({ contentMediaType: c }));
  };
  G.fileProcessor = G8;
  var W8 = (e, t, n, o) => {
    n.type = "boolean";
  };
  G.successProcessor = W8;
  var Y8 = (e, t, n, o) => {
    ae.handleUnrepresentable(e, t, n, o, "Custom types cannot be represented in JSON Schema");
  };
  G.customProcessor = Y8;
  var J8 = (e, t, n, o) => {
    ae.handleUnrepresentable(e, t, n, o, "Function types cannot be represented in JSON Schema");
  };
  G.functionProcessor = J8;
  var X8 = (e, t, n, o) => {
    ae.handleUnrepresentable(e, t, n, o, "Transforms cannot be represented in JSON Schema");
  };
  G.transformProcessor = X8;
  var Q8 = (e, t, n, o) => {
    ae.handleUnrepresentable(e, t, n, o, "Map cannot be represented in JSON Schema");
  };
  G.mapProcessor = Q8;
  var eX = (e, t, n, o) => {
    ae.handleUnrepresentable(e, t, n, o, "Set cannot be represented in JSON Schema");
  };
  G.setProcessor = eX;
  var tX = (e, t, n, o) => {
    let r = n,
      def = e._zod.def,
      { minimum: minimum, maximum: maximum } = il(e);
    if (typeof minimum === "number") r.minItems = minimum;
    if (typeof maximum === "number") r.maxItems = maximum;
    ((r.type = "array"), (r.items = ae.processSchema(def.element, t, { ...o, path: [...o.path, "items"] })));
  };
  G.arrayProcessor = tX;
  function nc(e) {
    let def = e._zod.def;
    if (def.type === "pipe" && def.in._zod.traits.has("$ZodTransform")) return nc(def.out);
    if (def.type === "catch") return nc(def.innerType);
    return e._zod.optin;
  }
  var nX = (e, t, n, o) => {
    let r = n,
      def = e._zod.def,
      shape = def.shape;
    if (
      Object.getOwnPropertySymbols(shape).length &&
      ae.handleUnrepresentable(e, t, r, o, "Symbol keys cannot be represented in JSON Schema")
    )
      return;
    ((r.type = "object"), (r.properties = {}));
    for (let key in shape)
      Gr.assignProp(
        r.properties,
        key,
        ae.processSchema(shape[key], t, { ...o, path: [...o.path, "properties", key] }),
      );
    let c = new Set(Object.keys(shape)),
      u = new Set(
        [...c].filter((f) => {
          let h = def.shape[f];
          if (t.io === "input") return nc(h) === void 0;
          else return h._zod.optout === void 0;
        }),
      );
    if (u.size > 0) r.required = Array.from(u);
    if (def.catchall?._zod.def.type === "never") r.additionalProperties = !1;
    else if (!def.catchall) {
      if (t.io === "output") r.additionalProperties = !1;
    } else if (def.catchall)
      r.additionalProperties = ae.processSchema(def.catchall, t, {
        ...o,
        path: [...o.path, "additionalProperties"],
      });
  };
  G.objectProcessor = nX;
  var rX = (e, t, n, o) => {
    let r = n,
      def = e._zod.def;
    if (
      Object.getOwnPropertySymbols(def.shape).length &&
      ae.handleUnrepresentable(e, t, r, o, "Symbol keys cannot be represented in JSON Schema")
    )
      return;
    if (t.io === "output") {
      for (let key in def.shape)
        if (
          ae.isTransforming(def.shape[key]) &&
          ae.handleUnrepresentable(
            e,
            t,
            r,
            o,
            `z.properties() returns its input, so the output of a transforming schema at key "${key}" cannot be represented in JSON Schema`,
          )
        )
          return;
    }
    ((r.type = "object"), (r.properties = {}));
    for (let key in def.shape)
      Gr.assignProp(
        r.properties,
        key,
        ae.processSchema(def.shape[key], t, { ...o, path: [...o.path, "properties", key] }),
      );
    let filtered = Object.keys(def.shape).filter((l) => nc(def.shape[l]) === void 0);
    if (filtered.length > 0) r.required = filtered;
  };
  G.propertiesProcessor = rX;
  var iX = (e, t, n, o) => {
    let def = e._zod.def,
      s = def.inclusive === !1,
      mapped = def.options.map((option, c) =>
        ae.processSchema(option, t, { ...o, path: [...o.path, s ? "oneOf" : "anyOf", c] }),
      );
    if (s) n.oneOf = mapped;
    else n.anyOf = mapped;
  };
  G.unionProcessor = iX;
  var oX = (e, t, n, o) => {
    let def = e._zod.def,
      processSchema = ae.processSchema(def.left, t, { ...o, path: [...o.path, "allOf", 0] }),
      processSchema_2 = ae.processSchema(def.right, t, { ...o, path: [...o.path, "allOf", 1] }),
      l = (u) => "allOf" in u && Object.keys(u).length === 1,
      c = [
        ...(l(processSchema) ? processSchema.allOf : [processSchema]),
        ...(l(processSchema_2) ? processSchema_2.allOf : [processSchema_2]),
      ];
    ((n.allOf = c), t.intersections.push(c));
  };
  G.intersectionProcessor = oX;
  var sX = (e, t, n, o) => {
    let r = n,
      def = e._zod.def;
    r.type = "array";
    let a = t.target === "draft-2020-12" ? "prefixItems" : "items",
      l = t.target === "draft-2020-12" ? "items" : t.target === "openapi-3.0" ? "items" : "additionalItems",
      mapped = def.items.map((item, S) => ae.processSchema(item, t, { ...o, path: [...o.path, a, S] })),
      u = def.rest
        ? ae.processSchema(def.rest, t, {
            ...o,
            path: [...o.path, l, ...(t.target === "openapi-3.0" ? [def.items.length] : [])],
          })
        : null,
      f = def.items.length;
    while (f > 0) {
      let w = def.items[f - 1];
      if (!(t.io === "input" ? nc(w) !== void 0 : w._zod.optout === "optional")) break;
      f--;
    }
    let h = def.items.length,
      m = !def.rest;
    if (t.target === "draft-2020-12") {
      if (((r.prefixItems = mapped), m)) r.items = !1;
      else if (u) r.items = u;
      if (f > 0) r.minItems = f;
      if (m) r.maxItems = h;
    } else if (t.target === "openapi-3.0") {
      if (((r.items = { anyOf: mapped }), u)) r.items.anyOf.push(u);
      if (f > 0) r.minItems = f;
      if (m) r.maxItems = h;
    } else {
      if (((r.items = mapped), m)) r.additionalItems = !1;
      else if (u) r.additionalItems = u;
      if (f > 0) r.minItems = f;
      if (m) r.maxItems = h;
    }
    let { minimum: minimum, maximum: maximum } = il(e);
    if (typeof minimum === "number") r.minItems = minimum;
    if (typeof maximum === "number") r.maxItems = maximum;
  };
  G.tupleProcessor = sX;
  function tb(e, t, n) {
    if (t.$ref) {
      if (n.has(t)) return t;
      n.add(t);
      let b = e.get(t)?.def;
      if (!b) return t;
      let w = tb(e, b, n);
      return w === b ? t : w;
    }
    for (let b of ["anyOf", "oneOf"]) {
      let w = t[b];
      if (!Array.isArray(w)) continue;
      let mapped = w.map((j) => tb(e, j, n));
      if (mapped.some((j, M) => j !== w[M])) t = { ...t, [b]: mapped };
    }
    let o = Array.isArray(t.type) ? t.type : [t.type],
      r = !o.includes("string") && o.some((b) => b === "number" || b === "integer"),
      s = t.enum ?? (t.const !== void 0 ? [t.const] : void 0);
    if (!r && !s?.some((b) => typeof b === "number")) return t;
    let {
      minimum: minimum,
      maximum: maximum,
      exclusiveMinimum: exclusiveMinimum,
      exclusiveMaximum: exclusiveMaximum,
      multipleOf: multipleOf,
      format: format,
      id: id,
      ...y
    } = t;
    if (y.enum) y.enum = y.enum.map((b) => (typeof b === "number" ? String(b) : b));
    else if (typeof y.const === "number") y.const = String(y.const);
    if (!r) return y;
    if (((y.type = "string"), !s)) y.pattern = (o.includes("number") ? kh.number : kh.integer).source;
    return y;
  }
  var weakMap = new WeakMap();
  function aX(e) {
    let t = new Map();
    for (let o of e.seen.values()) if (o.def && !t.has(o.schema)) t.set(o.schema, o);
    let n = new Map();
    for (let o of weakMap.get(e) ?? []) {
      let r = e.seen.get(o),
        s = (r?.def ?? r?.schema)?.propertyNames;
      if (!s || s === !0 || n.has(s)) continue;
      let a = tb(t, s, new Set());
      if (a !== s) n.set(s, a);
    }
    if (!n.size) return;
    for (let o of e.seen.values())
      for (let r of [o.schema, o.def]) {
        let s = r && n.get(r.propertyNames);
        if (s) r.propertyNames = s;
      }
  }
  var lX = (e, t, n, o) => {
    let r = n,
      def = e._zod.def;
    r.type = "object";
    let keyType = def.keyType,
      patterns = il(keyType).patterns;
    if (def.mode === "loose" && patterns && patterns.size > 0) {
      let processSchema = ae.processSchema(def.valueType, t, {
        ...o,
        path: [...o.path, "patternProperties", "*"],
      });
      r.patternProperties = {};
      for (let h of patterns) Gr.assignProp(r.patternProperties, tT(h).source, processSchema);
    } else {
      if (t.target === "draft-07" || t.target === "draft-2020-12") {
        r.propertyNames = ae.processSchema(def.keyType, t, { ...o, path: [...o.path, "propertyNames"] });
        let f = weakMap.get(t);
        if (!f) ((f = []), weakMap.set(t, f), t.deferred.push(() => aX(t)));
        f.push(e);
      }
      r.additionalProperties = ae.processSchema(def.valueType, t, {
        ...o,
        path: [...o.path, "additionalProperties"],
      });
    }
    let values = keyType._zod.values,
      u = t.io === "input" && nc(def.valueType) !== void 0;
    if (values && !def.partial && !u) {
      let filtered = [...values].filter((h) => typeof h === "string" || typeof h === "number");
      if (filtered.length > 0) r.required = filtered.map(String);
    }
  };
  G.recordProcessor = lX;
  var cX = (e, t, n, o) => {
    let def = e._zod.def,
      processSchema = ae.processSchema(def.innerType, t, o),
      a = t.seen.get(e);
    if (t.target === "openapi-3.0") ((a.ref = def.innerType), (n.nullable = !0));
    else n.anyOf = [processSchema, { type: "null" }];
  };
  G.nullableProcessor = cX;
  var uX = (e, t, n, o) => {
    let def = e._zod.def;
    ae.processSchema(def.innerType, t, o);
    let s = t.seen.get(e);
    s.ref = def.innerType;
  };
  G.nonoptionalProcessor = uX;
  var rb = Symbol();
  function nT(e, t, n, o, r) {
    let s = !1,
      json = JSON.stringify(e, (l, c) => {
        if (typeof c !== "bigint") return c;
        return ((s = !0), null);
      });
    if (!s) return JSON.parse(json);
    return (ae.handleUnrepresentable(t, n, o, r, "BigInt defaults cannot be represented in JSON Schema"), rb);
  }
  var dX = (e, t, n, o) => {
    let def = e._zod.def;
    ae.processSchema(def.innerType, t, o);
    let s = t.seen.get(e);
    s.ref = def.innerType;
    let a = nT(def.defaultValue, e, t, n, o);
    if (a !== rb) n.default = a;
  };
  G.defaultProcessor = dX;
  var fX = (e, t, n, o) => {
    let def = e._zod.def;
    ae.processSchema(def.innerType, t, o);
    let s = t.seen.get(e);
    if (((s.ref = def.innerType), t.io !== "input")) return;
    let a = nT(def.defaultValue, e, t, n, o);
    if (a !== rb) n._prefault = a;
  };
  G.prefaultProcessor = fX;
  var pX = (e, t, n, o) => {
    let def = e._zod.def;
    ae.processSchema(def.innerType, t, o);
    let s = t.seen.get(e);
    s.ref = def.innerType;
    let a;
    try {
      a = def.catchValue(void 0);
    } catch {
      ae.handleUnrepresentable(e, t, n, o, "Dynamic catch values are not supported in JSON Schema");
      return;
    }
    n.default = a;
  };
  G.catchProcessor = pX;
  var hX = (e, t, n, o) => {
    let def = e._zod.def,
      s = def.in._zod.traits.has("$ZodTransform"),
      a = t.io === "input" ? (s ? def.out : def.in) : def.out;
    ae.processSchema(a, t, o);
    let l = t.seen.get(e);
    l.ref = a;
  };
  G.pipeProcessor = hX;
  var mX = (e, t, n, o) => {
    let def = e._zod.def;
    ae.processSchema(def.innerType, t, o);
    let s = t.seen.get(e);
    ((s.ref = def.innerType), (n.readOnly = !0));
  };
  G.readonlyProcessor = mX;
  var gX = (e, t, n, o) => {
    let def = e._zod.def;
    ae.processSchema(def.innerType, t, o);
    let s = t.seen.get(e);
    s.ref = def.innerType;
  };
  G.promiseProcessor = gX;
  var yX = (e, t, n, o) => {
    let def = e._zod.def;
    ae.processSchema(def.innerType, t, o);
    let s = t.seen.get(e);
    s.ref = def.innerType;
  };
  G.optionalProcessor = yX;
  var _X = (e, t, n, o) => {
    let innerType = e._zod.innerType;
    ae.processSchema(innerType, t, o);
    let s = t.seen.get(e);
    s.ref = innerType;
  };
  G.lazyProcessor = _X;
  G.allProcessors = {
    string: G.stringProcessor,
    number: G.numberProcessor,
    boolean: G.booleanProcessor,
    bigint: G.bigintProcessor,
    symbol: G.symbolProcessor,
    null: G.nullProcessor,
    undefined: G.undefinedProcessor,
    void: G.voidProcessor,
    never: G.neverProcessor,
    any: G.anyProcessor,
    unknown: G.unknownProcessor,
    date: G.dateProcessor,
    enum: G.enumProcessor,
    literal: G.literalProcessor,
    nan: G.nanProcessor,
    template_literal: G.templateLiteralProcessor,
    file: G.fileProcessor,
    success: G.successProcessor,
    custom: G.customProcessor,
    properties: G.propertiesProcessor,
    function: G.functionProcessor,
    transform: G.transformProcessor,
    map: G.mapProcessor,
    set: G.setProcessor,
    array: G.arrayProcessor,
    object: G.objectProcessor,
    union: G.unionProcessor,
    intersection: G.intersectionProcessor,
    tuple: G.tupleProcessor,
    record: G.recordProcessor,
    nullable: G.nullableProcessor,
    nonoptional: G.nonoptionalProcessor,
    default: G.defaultProcessor,
    prefault: G.prefaultProcessor,
    catch: G.catchProcessor,
    pipe: G.pipeProcessor,
    readonly: G.readonlyProcessor,
    promise: G.promiseProcessor,
    optional: G.optionalProcessor,
    lazy: G.lazyProcessor,
  };
  function bX(e, t) {
    if ("_idmap" in e) {
      let o = e,
        initializeContext = ae.initializeContext({ ...t, processors: G.allProcessors }),
        s = {};
      for (let c of o._idmap.entries()) {
        let [u, f] = c;
        ae.processSchema(f, initializeContext);
      }
      let a = {},
        l = { registry: o, uri: t?.uri, defs: s };
      initializeContext.external = l;
      for (let c of o._idmap.entries()) {
        let [u, f] = c;
        (ae.extractDefs(initializeContext, f), Gr.assignProp(a, u, ae.finalize(initializeContext, f)));
      }
      if (Object.keys(s).length > 0) {
        let c = initializeContext.target === "draft-2020-12" ? "$defs" : "definitions";
        a.__shared = { [c]: s };
      }
      return { schemas: a };
    }
    let initializeContext = ae.initializeContext({ ...t, processors: G.allProcessors });
    return (
      ae.processSchema(e, initializeContext),
      ae.extractDefs(initializeContext, e),
      ae.finalize(initializeContext, e)
    );
  }
  (function () {
    var ownPropertyNames = Object.getOwnPropertyNames(G);
    for (var t = 0; t < ownPropertyNames.length; t++) {
      var ownPropertyDescriptor = Object.getOwnPropertyDescriptor(G, ownPropertyNames[t]);
      if (!ownPropertyDescriptor || !ownPropertyDescriptor.get || !ownPropertyDescriptor.configurable)
        continue;
      var o;
      try {
        o = ownPropertyDescriptor.get();
      } catch (error) {
        continue;
      }
      if (o === void 0) continue;
      Object.defineProperty(G, ownPropertyNames[t], {
        value: o,
        writable: !1,
        enumerable: ownPropertyDescriptor.enumerable,
        configurable: !1,
      });
    }
    Object.freeze(G);
  })();
});

export { nd };
