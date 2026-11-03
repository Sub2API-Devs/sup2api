/**
 * json-schema-traverse/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: json-schema-traverse@1.0.0
 * pieces: chunk-s82q9s4x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../runtime/bun-runtime.js";

//@ chunk-s82q9s4x.js:38567-39807 cjs-fingerprint
var require_json_schema_traverse = x(function (cjsExports, cjsModule) {
  var traverse = (cjsModule.exports = function (schema, opts, cb) {
    if (typeof opts == "function") {
      cb = opts;
      opts = {};
    }
    cb = opts.cb || cb;
    var pre = typeof cb == "function" ? cb : cb.pre || function () {};
    var post = cb.post || function () {};
    _traverse(opts, pre, post, schema, "", schema);
  });
  traverse.keywords = {
    additionalItems: true,
    items: true,
    contains: true,
    additionalProperties: true,
    propertyNames: true,
    not: true,
    if: true,
    then: true,
    else: true,
  };
  traverse.arrayKeywords = {
    items: true,
    allOf: true,
    anyOf: true,
    oneOf: true,
  };
  traverse.propsKeywords = {
    $defs: true,
    definitions: true,
    properties: true,
    patternProperties: true,
    dependencies: true,
  };
  traverse.skipKeywords = {
    default: true,
    enum: true,
    const: true,
    required: true,
    maximum: true,
    minimum: true,
    exclusiveMaximum: true,
    exclusiveMinimum: true,
    multipleOf: true,
    maxLength: true,
    minLength: true,
    pattern: true,
    format: true,
    maxItems: true,
    minItems: true,
    uniqueItems: true,
    maxProperties: true,
    minProperties: true,
  };
  function _traverse(
    opts,
    pre,
    post,
    schema,
    jsonPtr,
    rootSchema,
    parentJsonPtr,
    parentKeyword,
    parentSchema,
    keyIndex,
  ) {
    if (schema && typeof schema == "object" && !Array.isArray(schema)) {
      pre(schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex);
      for (var key in schema) {
        var sch = schema[key];
        if (Array.isArray(sch)) {
          if (key in traverse.arrayKeywords)
            for (var i = 0; i < sch.length; i++)
              _traverse(
                opts,
                pre,
                post,
                sch[i],
                jsonPtr + "/" + key + "/" + i,
                rootSchema,
                jsonPtr,
                key,
                schema,
                i,
              );
        } else if (key in traverse.propsKeywords) {
          if (sch && typeof sch == "object")
            for (var prop in sch)
              _traverse(
                opts,
                pre,
                post,
                sch[prop],
                jsonPtr + "/" + key + "/" + escapeJsonPtr(prop),
                rootSchema,
                jsonPtr,
                key,
                schema,
                prop,
              );
        } else if (key in traverse.keywords || (opts.allKeys && !(key in traverse.skipKeywords)))
          _traverse(opts, pre, post, sch, jsonPtr + "/" + key, rootSchema, jsonPtr, key, schema);
      }
      post(schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex);
    }
  }
  function escapeJsonPtr(str) {
    return str.replace(/~/g, "~0").replace(/\//g, "~1");
  }
});
export { require_json_schema_traverse };
