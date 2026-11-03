/**
 * json-schema-traverse/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: json-schema-traverse@1.0.0
 * pieces: chunk-s82q9s4x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../runtime/bun-runtime.js";

//@ chunk-s82q9s4x.js:38567-39807 cjs-fingerprint
var un = x(function (om, cn) {
  var ve = (cn.exports = function (e, t, r) {
    if (typeof t == "function") ((r = t), (t = {}));
    r = t.cb || r;
    var s = typeof r == "function" ? r : r.pre || function () {},
      n = r.post || function () {};
    kt(t, s, n, e, "", e);
  });
  ve.keywords = {
    additionalItems: !0,
    items: !0,
    contains: !0,
    additionalProperties: !0,
    propertyNames: !0,
    not: !0,
    if: !0,
    then: !0,
    else: !0,
  };
  ve.arrayKeywords = { items: !0, allOf: !0, anyOf: !0, oneOf: !0 };
  ve.propsKeywords = { $defs: !0, definitions: !0, properties: !0, patternProperties: !0, dependencies: !0 };
  ve.skipKeywords = {
    default: !0,
    enum: !0,
    const: !0,
    required: !0,
    maximum: !0,
    minimum: !0,
    exclusiveMaximum: !0,
    exclusiveMinimum: !0,
    multipleOf: !0,
    maxLength: !0,
    minLength: !0,
    pattern: !0,
    format: !0,
    maxItems: !0,
    minItems: !0,
    uniqueItems: !0,
    maxProperties: !0,
    minProperties: !0,
  };
  function kt(e, t, r, s, n, o, i, a, c, u) {
    if (s && typeof s == "object" && !Array.isArray(s)) {
      t(s, n, o, i, a, c, u);
      for (var key in s) {
        var f = s[key];
        if (Array.isArray(f)) {
          if (key in ve.arrayKeywords)
            for (var b = 0; b < f.length; b++) kt(e, t, r, f[b], n + "/" + key + "/" + b, o, n, key, s, b);
        } else if (key in ve.propsKeywords) {
          if (f && typeof f == "object")
            for (var key_2 in f) kt(e, t, r, f[key_2], n + "/" + key + "/" + Uu(key_2), o, n, key, s, key_2);
        } else if (key in ve.keywords || (e.allKeys && !(key in ve.skipKeywords)))
          kt(e, t, r, f, n + "/" + key, o, n, key, s);
      }
      r(s, n, o, i, a, c, u);
    }
  }
  function Uu(e) {
    return e.replace(/~/g, "~0").replace(/\//g, "~1");
  }
});

export { un };
