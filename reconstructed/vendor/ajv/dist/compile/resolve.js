/**
 * ajv/dist/compile/resolve.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-s82q9s4x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_util_2 } from "./util.js";
import { require_fast_deep_equal } from "../../../fast-deep-equal/index.js";
import { require_json_schema_traverse } from "../../../json-schema-traverse/index.js";

//@ chunk-s82q9s4x.js:39807-41944 cjs-fingerprint
var require_resolve_2 = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.getSchemaRefs =
    cjsExports.resolveUrl =
    cjsExports.normalizeId =
    cjsExports._getFullPath =
    cjsExports.getFullPath =
    cjsExports.inlineRef =
      undefined;
  var util_1 = require_util_2();
  var equal = require_fast_deep_equal();
  var traverse = require_json_schema_traverse();
  var SIMPLE_INLINED = new Set([
    "type",
    "format",
    "pattern",
    "maxLength",
    "minLength",
    "maxProperties",
    "minProperties",
    "maxItems",
    "minItems",
    "maximum",
    "minimum",
    "uniqueItems",
    "multipleOf",
    "required",
    "enum",
    "const",
  ]);
  function inlineRef(schema, limit = true) {
    if (typeof schema == "boolean") return true;
    if (limit === true) return !hasRef(schema);
    if (!limit) return false;
    return countKeys(schema) <= limit;
  }
  cjsExports.inlineRef = inlineRef;
  var REF_KEYWORDS = new Set(["$ref", "$recursiveRef", "$recursiveAnchor", "$dynamicRef", "$dynamicAnchor"]);
  function hasRef(schema) {
    for (let key in schema) {
      if (REF_KEYWORDS.has(key)) return true;
      let sch = schema[key];
      if (Array.isArray(sch) && sch.some(hasRef)) return true;
      if (typeof sch == "object" && hasRef(sch)) return true;
    }
    return false;
  }
  function countKeys(schema) {
    let count = 0;
    for (let key in schema) {
      if (key === "$ref") return 1 / 0;
      count++;
      if (SIMPLE_INLINED.has(key)) continue;
      if (typeof schema[key] == "object") util_1.eachItem(schema[key], (sch) => (count += countKeys(sch)));
      if (count === 1 / 0) return 1 / 0;
    }
    return count;
  }
  function getFullPath(resolver, id = "", normalize) {
    if (normalize !== false) id = normalizeId(id);
    let p = resolver.parse(id);
    return _getFullPath(resolver, p);
  }
  cjsExports.getFullPath = getFullPath;
  function _getFullPath(resolver, p) {
    return resolver.serialize(p).split("#")[0] + "#";
  }
  cjsExports._getFullPath = _getFullPath;
  var TRAILING_SLASH_HASH = /#\/?$/;
  function normalizeId(id) {
    return id ? id.replace(TRAILING_SLASH_HASH, "") : "";
  }
  cjsExports.normalizeId = normalizeId;
  function resolveUrl(resolver, baseId, id) {
    id = normalizeId(id);
    return resolver.resolve(baseId, id);
  }
  cjsExports.resolveUrl = resolveUrl;
  var ANCHOR = /^[a-z_][-a-z0-9._]*$/i;
  function getSchemaRefs(schema, baseId) {
    if (typeof schema == "boolean") return {};
    let { schemaId, uriResolver } = this.opts;
    let schId = normalizeId(schema[schemaId] || baseId);
    let baseIds = {
      "": schId,
    };
    let pathPrefix = getFullPath(uriResolver, schId, false);
    let localRefs = {};
    let schemaRefs = new Set();
    traverse(
      schema,
      {
        allKeys: true,
      },
      (sch, jsonPtr, _, parentJsonPtr) => {
        if (parentJsonPtr === undefined) return;
        let fullPath = pathPrefix + jsonPtr;
        let innerBaseId = baseIds[parentJsonPtr];
        if (typeof sch[schemaId] == "string") innerBaseId = addRef.call(this, sch[schemaId]);
        addAnchor.call(this, sch.$anchor);
        addAnchor.call(this, sch.$dynamicAnchor);
        baseIds[jsonPtr] = innerBaseId;
        function addRef(ref) {
          let _resolve = this.opts.uriResolver.resolve;
          ref = normalizeId(innerBaseId ? _resolve(innerBaseId, ref) : ref);
          if (schemaRefs.has(ref)) throw ambiguos(ref);
          schemaRefs.add(ref);
          let schOrRef = this.refs[ref];
          if (typeof schOrRef == "string") schOrRef = this.refs[schOrRef];
          if (typeof schOrRef == "object") checkAmbiguosRef(sch, schOrRef.schema, ref);
          else if (ref !== normalizeId(fullPath))
            if (ref[0] === "#") {
              checkAmbiguosRef(sch, localRefs[ref], ref);
              localRefs[ref] = sch;
            } else this.refs[ref] = fullPath;
          return ref;
        }
        function addAnchor(anchor) {
          if (typeof anchor == "string") {
            if (!ANCHOR.test(anchor)) throw Error(`invalid anchor "${anchor}"`);
            addRef.call(this, `#${anchor}`);
          }
        }
      },
    );
    return localRefs;
    function checkAmbiguosRef(sch1, sch2, ref) {
      if (sch2 !== undefined && !equal(sch1, sch2)) throw ambiguos(ref);
    }
    function ambiguos(ref) {
      return Error(`reference "${ref}" resolves to more than one schema`);
    }
  }
  cjsExports.getSchemaRefs = getSchemaRefs;
});
export { require_resolve_2 };
