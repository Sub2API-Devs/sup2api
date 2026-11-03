/**
 * zod/v4/classic/from-json-schema.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { Ju } from "../core/registries.cjs";
import { Ee } from "../core/util.cjs";
import { Ah } from "./checks.cjs";
import { zh } from "./iso.cjs";
import { ra } from "./schemas.cjs";

//@ chunk-1ny7cxrt.js:630542-644420 cjs-fingerprint
var FT = x(function (ci) {
  var aQ =
      (ci && ci.__createBinding) ||
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
    lQ =
      (ci && ci.__setModuleDefault) ||
      (Object.create
        ? function (e, t) {
            Object.defineProperty(e, "default", { enumerable: !0, value: t });
          }
        : function (e, t) {
            e.default = t;
          }),
    pb =
      (ci && ci.__importStar) ||
      function (e) {
        if (e && e.__esModule) return e;
        var t = {};
        if (e != null) {
          for (var key in e)
            if (key !== "default" && Object.prototype.hasOwnProperty.call(e, key)) aQ(t, e, key);
        }
        return (lQ(t, e), t);
      };
  Object.defineProperty(ci, "__esModule", { value: !0 });
  ci.fromJSONSchema = wQ;
  var UT = Ju(),
    ac = Ee(),
    cQ = pb(Ah()),
    uQ = pb(zh()),
    dQ = pb(ra()),
    $e = { ...dQ, ...cQ, iso: uQ },
    fQ = new Set([
      "$schema",
      "$ref",
      "$defs",
      "definitions",
      "$id",
      "id",
      "$comment",
      "$anchor",
      "$vocabulary",
      "$dynamicRef",
      "$dynamicAnchor",
      "type",
      "enum",
      "const",
      "anyOf",
      "oneOf",
      "allOf",
      "not",
      "properties",
      "required",
      "additionalProperties",
      "patternProperties",
      "propertyNames",
      "minProperties",
      "maxProperties",
      "items",
      "prefixItems",
      "additionalItems",
      "minItems",
      "maxItems",
      "uniqueItems",
      "contains",
      "minContains",
      "maxContains",
      "minLength",
      "maxLength",
      "pattern",
      "format",
      "minimum",
      "maximum",
      "exclusiveMinimum",
      "exclusiveMaximum",
      "multipleOf",
      "description",
      "default",
      "contentEncoding",
      "contentMediaType",
      "contentSchema",
      "unevaluatedItems",
      "unevaluatedProperties",
      "if",
      "then",
      "else",
      "dependentSchemas",
      "dependentRequired",
      "nullable",
      "readOnly",
    ]);
  function pQ(e, t) {
    let $schema = e.$schema;
    if ($schema === "https://json-schema.org/draft/2020-12/schema") return "draft-2020-12";
    if ($schema === "http://json-schema.org/draft-07/schema#") return "draft-7";
    if ($schema === "http://json-schema.org/draft-04/schema#") return "draft-4";
    return t ?? "draft-2020-12";
  }
  function xT(e, t) {
    return e.map((n, o) => (o < t ? n : n.optional()));
  }
  function hQ(e) {
    return e.replace(/~1/g, "/").replace(/~0/g, "~");
  }
  function mQ(e, t) {
    if (!e.startsWith("#"))
      throw Error("External $ref is not supported, only local refs (#/...) are allowed");
    let filtered = e.slice(1).split("/").filter(Boolean);
    if (filtered.length === 0) return t.rootSchema;
    let o = t.version === "draft-2020-12" ? "$defs" : "definitions";
    if (filtered[0] === o) {
      let r = filtered[1] === void 0 ? void 0 : hQ(filtered[1]);
      if (!r || !t.defs[r]) throw Error(`Reference not found: ${e}`);
      return t.defs[r];
    }
    throw Error(`Reference not found: ${e}`);
  }
  function gQ(e, t) {
    return $e
      .transform((o) => o)
      .check((o) => {
        let r = o.value;
        if (typeof r !== "object" || r === null || Array.isArray(r)) return;
        let ownPropertyNames = Object.getOwnPropertyNames(r);
        if (t.minProperties !== void 0 && ownPropertyNames.length < t.minProperties)
          o.issues.push({
            origin: "object",
            code: "too_small",
            minimum: t.minProperties,
            inclusive: !0,
            message: `Too small: expected object to have >=${t.minProperties} properties`,
            input: r,
            inst: e,
            continue: !0,
          });
        if (t.maxProperties !== void 0 && ownPropertyNames.length > t.maxProperties)
          o.issues.push({
            origin: "object",
            code: "too_big",
            maximum: t.maxProperties,
            inclusive: !0,
            message: `Too big: expected object to have <=${t.maxProperties} properties`,
            input: r,
            inst: e,
            continue: !0,
          });
        if (t.keySchema)
          for (let a of ownPropertyNames) {
            let safeParse = t.keySchema.safeParse(a);
            if (safeParse.success) continue;
            o.issues.push({
              code: "invalid_key",
              origin: "record",
              issues: safeParse.error.issues,
              input: a,
              path: [a],
              continue: !0,
            });
          }
      })
      .pipe(e);
  }
  function fb(e, t) {
    if (e === null) return "z";
    let n = typeof e;
    if (n !== "object") {
      if (n === "number" && Number.isNaN(e)) return null;
      let o = String(e);
      return `${n[0]}${o.length}:${o}`;
    }
    if (t.has(e)) return null;
    t.add(e);
    try {
      if (Array.isArray(e)) {
        let s = [];
        for (let a of e) {
          let l = fb(a, t);
          if (l === null) return null;
          s.push(l);
        }
        return `a${s.length}:[${s.join(",")}]`;
      }
      let sorted = Object.keys(e).sort(),
        r = [];
      for (let s of sorted) {
        let a = fb(e[s], t);
        if (a === null) return null;
        r.push(`${s.length}:${s}=${a}`);
      }
      return `o${r.length}:{${r.join(",")}}`;
    } finally {
      t.delete(e);
    }
  }
  var yQ = new Set([
      "items",
      "prefixItems",
      "additionalItems",
      "additionalProperties",
      "contains",
      "propertyNames",
      "not",
      "if",
      "then",
      "else",
      "allOf",
      "anyOf",
      "oneOf",
      "unevaluatedItems",
      "unevaluatedProperties",
      "contentSchema",
    ]),
    _Q = new Set([
      "properties",
      "patternProperties",
      "dependentSchemas",
      "dependencies",
      "$defs",
      "definitions",
    ]);
  function rd(e) {
    if (typeof e !== "object" || e === null) return !1;
    if (Array.isArray(e)) return e.some(rd);
    if (typeof e.$ref === "string") return !0;
    return Object.entries(e).some(([t, n]) => {
      if (yQ.has(t)) return rd(n);
      if (!_Q.has(t) || typeof n !== "object" || n === null) return !1;
      return Object.values(n).some(rd);
    });
  }
  function LT(e) {
    return e === 1 ? "element" : "elements";
  }
  function bQ(e, t) {
    return $e
      .transform((o) => o)
      .check((o) => {
        let r = o.value;
        if (!Array.isArray(r)) return;
        if (t.uniqueItems === !0) {
          let s = new Map();
          for (let a = 0; a < r.length; a++) {
            let l = fb(r[a], new Set());
            if (l === null) continue;
            let c = s.get(l);
            if (c === void 0) {
              s.set(l, a);
              continue;
            }
            o.issues.push({
              code: "custom",
              message: `Array items must be unique: element at index ${a} duplicates the one at index ${c}`,
              input: r,
              path: [a],
              continue: !0,
            });
          }
        }
        if (t.containsSchema) {
          let s = t.minContains ?? 1,
            a = t.maxContains !== void 0 ? t.maxContains + 1 : Number.POSITIVE_INFINITY,
            l = 0;
          for (let c of r) if (t.containsSchema.safeParse(c).success && ++l >= a) break;
          if (l < s)
            o.issues.push({
              code: "custom",
              message: `Array must contain at least ${s} matching ${LT(s)}; found ${l}`,
              input: r,
              continue: !0,
            });
          if (t.maxContains !== void 0 && l > t.maxContains)
            o.issues.push({
              code: "custom",
              message: `Array must contain at most ${t.maxContains} matching ${LT(t.maxContains)}`,
              input: r,
              continue: !0,
            });
        }
      })
      .pipe(e);
  }
  function NT(e, t) {
    if (e === !1) return;
    if (e === void 0 || e === !0) return $e.any();
    return Fr(e, t);
  }
  var vQ = /^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/;
  function zT(e, t) {
    if (e.not !== void 0) {
      if (typeof e.not === "object" && Object.keys(e.not).length === 0) return $e.never();
      throw Error("not is not supported in Zod (except { not: {} } for never)");
    }
    if (e.unevaluatedItems !== void 0) throw Error("unevaluatedItems is not supported");
    if (e.unevaluatedProperties !== void 0) throw Error("unevaluatedProperties is not supported");
    if (e.if !== void 0 || e.then !== void 0 || e.else !== void 0)
      throw Error("Conditional schemas (if/then/else) are not supported");
    if (e.dependentSchemas !== void 0 || e.dependentRequired !== void 0)
      throw Error("dependentSchemas and dependentRequired are not supported");
    if (e.$ref) {
      let $ref = e.$ref;
      if (t.refs.has($ref)) return t.refs.get($ref);
      if (t.processing.has($ref))
        return $e.lazy(() => {
          if (!t.refs.has($ref)) throw Error(`Circular reference not resolved: ${$ref}`);
          return t.refs.get($ref);
        });
      t.processing.add($ref);
      let s = mQ($ref, t),
        a = Fr(s, t);
      return (t.refs.set($ref, a), t.processing.delete($ref), a);
    }
    if (e.enum !== void 0) {
      let r = e.enum;
      if (t.version === "openapi-3.0" && e.nullable === !0 && r.length === 1 && r[0] === null)
        return $e.null();
      if (r.length === 0) return $e.never();
      if (r.length === 1) return $e.literal(r[0]);
      if (r.every((a) => typeof a === "string")) return $e.enum(r);
      let mapped = r.map((a) => $e.literal(a));
      if (mapped.length < 2) return mapped[0];
      return $e.union([mapped[0], mapped[1], ...mapped.slice(2)]);
    }
    if (e.const !== void 0) return $e.literal(e.const);
    let n = e.type;
    if (Array.isArray(n)) {
      let mapped = n.map((s) => {
        let a = { ...e, type: s };
        return zT(a, t);
      });
      if (mapped.length === 0) return $e.never();
      if (mapped.length === 1) return mapped[0];
      return $e.union(mapped);
    }
    if (!n) return $e.any();
    let o;
    switch (n) {
      case "string": {
        let string = $e.string();
        if (e.format) {
          let format = e.format;
          if (format === "email") string = string.check($e.email());
          else if (format === "uri" || format === "uri-reference") string = string.check($e.url());
          else if (format === "uuid" || format === "guid") string = string.check($e.uuid());
          else if (format === "date-time") string = string.check($e.iso.datetime({ offset: !0 }));
          else if (format === "date") string = string.check($e.iso.date());
          else if (format === "time") string = string.check($e.regex(vQ));
          else if (format === "duration") string = string.check($e.iso.duration());
          else if (format === "hostname") string = string.check($e.hostname());
          else if (format === "ipv4") string = string.check($e.ipv4());
          else if (format === "ipv6") string = string.check($e.ipv6());
          else if (format === "mac") string = string.check($e.mac());
          else if (format === "cidr") string = string.check($e.cidrv4());
          else if (format === "cidr-v6") string = string.check($e.cidrv6());
          else if (format === "base64") string = string.check($e.base64());
          else if (format === "base64url") string = string.check($e.base64url());
          else if (format === "e164") string = string.check($e.e164());
          else if (format === "credit_card") string = string.check($e.creditCard());
          else if (format === "iban") string = string.check($e.iban());
          else if (format === "jwt") string = string.check($e.jwt());
          else if (format === "emoji") string = string.check($e.emoji());
          else if (format === "nanoid") string = string.check($e.nanoid());
          else if (format === "cuid") string = string.check($e.cuid());
          else if (format === "cuid2") string = string.check($e.cuid2());
          else if (format === "ulid") string = string.check($e.ulid());
          else if (format === "xid") string = string.check($e.xid());
          else if (format === "ksuid") string = string.check($e.ksuid());
        }
        if (typeof e.minLength === "number") string = string.min(e.minLength);
        if (typeof e.maxLength === "number") string = string.max(e.maxLength);
        if (e.pattern) string = string.regex(new RegExp(e.pattern));
        o = string;
        break;
      }
      case "number":
      case "integer": {
        let r = n === "integer" ? $e.number().int() : $e.number();
        if (typeof e.minimum === "number" && e.exclusiveMinimum !== !0) r = r.min(e.minimum);
        if (typeof e.maximum === "number" && e.exclusiveMaximum !== !0) r = r.max(e.maximum);
        if (typeof e.exclusiveMinimum === "number") r = r.gt(e.exclusiveMinimum);
        else if (e.exclusiveMinimum === !0 && typeof e.minimum === "number") r = r.gt(e.minimum);
        if (typeof e.exclusiveMaximum === "number") r = r.lt(e.exclusiveMaximum);
        else if (e.exclusiveMaximum === !0 && typeof e.maximum === "number") r = r.lt(e.maximum);
        if (typeof e.multipleOf === "number") r = r.multipleOf(e.multipleOf);
        o = r;
        break;
      }
      case "boolean": {
        o = $e.boolean();
        break;
      }
      case "null": {
        o = $e.null();
        break;
      }
      case "object": {
        let r = {},
          s = e.properties || {},
          a = new Set(e.required || []),
          l = typeof e.additionalProperties === "object" ? Fr(e.additionalProperties, t) : void 0;
        for (let [h, m] of Object.entries(s)) {
          let y = Fr(m, t);
          ac.assignProp(r, h, a.has(h) ? y : y.optional());
        }
        if (e.patternProperties) {
          let patternProperties = e.patternProperties,
            keys = Object.keys(patternProperties),
            y = [];
          for (let w of keys) {
            let S = Fr(patternProperties[w], t),
              regex = $e.string().regex(new RegExp(w));
            y.push($e.looseRecord(regex, S));
          }
          let b = [];
          if (Object.keys(r).length > 0) b.push($e.object(r).passthrough());
          if ((b.push(...y), b.length === 0)) o = $e.object({}).passthrough();
          else if (b.length === 1) o = b[0];
          else {
            let intersection = $e.intersection(b[0], b[1]);
            for (let S = 2; S < b.length; S++) intersection = $e.intersection(intersection, b[S]);
            o = intersection;
          }
          if (e.additionalProperties === !1) {
            let keys_2 = Object.keys(r),
              mapped = keys.map((M) => new RegExp(M)),
              j = o;
            o = o.check((M) => {
              if (!ac.isPlainObject(M.value)) return;
              let N = [];
              for (let Z of Object.keys(M.value)) {
                if (keys_2.includes(Z)) continue;
                if (mapped.some((F) => F.test(Z))) continue;
                N.push(Z);
              }
              if (N.length) M.issues.push({ code: "unrecognized_keys", keys: N, input: M.value, inst: j });
            });
          }
        } else {
          let object = $e.object(r);
          if (e.additionalProperties === !1) o = object.strict();
          else if (l) o = object.catchall(l);
          else o = object.passthrough();
        }
        let c = e.propertyNames !== void 0 && e.propertyNames !== !0,
          u = typeof e.minProperties === "number" ? e.minProperties : void 0,
          f = typeof e.maxProperties === "number" ? e.maxProperties : void 0;
        if (c || u !== void 0 || f !== void 0) {
          let h;
          if (c) {
            let m =
              typeof e.propertyNames === "object" && e.propertyNames.type === void 0
                ? { type: "string", ...e.propertyNames }
                : e.propertyNames;
            h = Fr(m, t);
          }
          o = gQ(o, { keySchema: h, minProperties: u, maxProperties: f });
        }
        break;
      }
      case "array": {
        let { prefixItems: prefixItems, items: items } = e;
        if (prefixItems && Array.isArray(prefixItems)) {
          let a = typeof e.minItems === "number" ? e.minItems : 0,
            mapped = prefixItems.map((h) => Fr(h, t)),
            c = xT(mapped, a),
            u = !Array.isArray(items) ? NT(items, t) : void 0,
            tuple = $e.tuple(c);
          if (((o = u ? tuple.rest(u) : tuple), typeof e.minItems === "number"))
            o = o.check($e.minLength(e.minItems));
          if (typeof e.maxItems === "number") o = o.check($e.maxLength(e.maxItems));
        } else if (Array.isArray(items)) {
          let a = typeof e.minItems === "number" ? e.minItems : 0,
            mapped = items.map((h) => Fr(h, t)),
            c = xT(mapped, a),
            u = NT(e.additionalItems, t),
            tuple = $e.tuple(c);
          if (((o = u ? tuple.rest(u) : tuple), typeof e.minItems === "number"))
            o = o.check($e.minLength(e.minItems));
          if (typeof e.maxItems === "number") o = o.check($e.maxLength(e.maxItems));
        } else if (items !== void 0) {
          let a = Fr(items, t),
            array = $e.array(a);
          if (typeof e.minItems === "number") array = array.min(e.minItems);
          if (typeof e.maxItems === "number") array = array.max(e.maxItems);
          o = array;
        } else o = $e.array($e.any());
        if (e.uniqueItems === !0 || e.contains !== void 0)
          o = bQ(o, {
            uniqueItems: e.uniqueItems === !0,
            containsSchema: e.contains !== void 0 ? Fr(e.contains, t) : void 0,
            minContains: typeof e.minContains === "number" ? e.minContains : void 0,
            maxContains: typeof e.maxContains === "number" ? e.maxContains : void 0,
          });
        break;
      }
      default:
        throw Error(`Unsupported type: ${n}`);
    }
    return o;
  }
  function Fr(e, t) {
    if (typeof e === "boolean") return e ? $e.any() : $e.never();
    let n = zT(e, t),
      o = e.type || e.enum !== void 0 || e.const !== void 0;
    if (e.anyOf && Array.isArray(e.anyOf)) {
      let mapped = e.anyOf.map((u) => Fr(u, t)),
        union = $e.union(mapped);
      n = o ? $e.intersection(n, union) : union;
    }
    if (e.oneOf && Array.isArray(e.oneOf)) {
      let mapped = e.oneOf.map((u) => Fr(u, t)),
        xor = $e.xor(mapped);
      n = o ? $e.intersection(n, xor) : xor;
    }
    if (e.allOf && Array.isArray(e.allOf))
      if (e.allOf.length === 0) n = o ? n : $e.any();
      else {
        let l = o ? n : Fr(e.allOf[0], t),
          c = o ? 0 : 1;
        for (let u = c; u < e.allOf.length; u++) l = $e.intersection(l, Fr(e.allOf[u], t));
        n = l;
      }
    if (e.nullable === !0 && t.version === "openapi-3.0") n = $e.nullable(n);
    if (e.readOnly === !0) n = $e.readonly(n);
    if (e.default !== void 0) n = n.default(e.default);
    let r = {},
      s = ["$id", "id", "$comment", "$anchor", "$vocabulary", "$dynamicRef", "$dynamicAnchor"];
    for (let l of s) if (l in e) r[l] = e[l];
    let a = ["contentEncoding", "contentMediaType", "contentSchema"];
    for (let l of a) if (l in e) r[l] = e[l];
    if (e.type === "object" && e.$ref === void 0) {
      if (e.propertyNames !== void 0 && !rd(e.propertyNames)) r.propertyNames = e.propertyNames;
      for (let l of ["minProperties", "maxProperties"]) if (e[l] !== void 0) r[l] = e[l];
    }
    if (e.type === "array" && e.$ref === void 0) {
      if (e.contains !== void 0 && !rd(e.contains)) r.contains = e.contains;
      for (let l of ["uniqueItems", "minContains", "maxContains"]) if (e[l] !== void 0) r[l] = e[l];
    }
    for (let l of Object.keys(e)) if (!fQ.has(l)) ac.assignProp(r, l, e[l]);
    if (Object.keys(r).length > 0) t.registry.add(n, r);
    if (e.description) n = n.describe(e.description);
    return n;
  }
  function wQ(e, t) {
    if (typeof e === "boolean") return e ? $e.any() : $e.never();
    let n;
    try {
      n = JSON.parse(JSON.stringify(e));
    } catch {
      throw Error(
        "fromJSONSchema input is not valid JSON (possibly cyclic); use $defs/$ref for recursive schemas",
      );
    }
    let o = pQ(n, t?.defaultTarget),
      r = n.$defs || n.definitions || {},
      s = {
        version: o,
        defs: r,
        refs: new Map(),
        processing: new Set(),
        rootSchema: n,
        registry: t?.registry ?? UT.globalRegistry,
      };
    return Fr(n, s);
  }
  (function () {
    var ownPropertyNames = Object.getOwnPropertyNames(ci);
    for (var t = 0; t < ownPropertyNames.length; t++) {
      var ownPropertyDescriptor = Object.getOwnPropertyDescriptor(ci, ownPropertyNames[t]);
      if (!ownPropertyDescriptor || !ownPropertyDescriptor.get || !ownPropertyDescriptor.configurable)
        continue;
      var o;
      try {
        o = ownPropertyDescriptor.get();
      } catch (error) {
        continue;
      }
      if (o === void 0) continue;
      Object.defineProperty(ci, ownPropertyNames[t], {
        value: o,
        writable: !1,
        enumerable: ownPropertyDescriptor.enumerable,
        configurable: !1,
      });
    }
    Object.freeze(ci);
  })();
});

export { FT };
