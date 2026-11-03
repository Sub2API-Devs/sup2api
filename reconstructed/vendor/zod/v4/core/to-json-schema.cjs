/**
 * zod/v4/core/to-json-schema.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { require_registries } from "./registries.cjs";
import { require_util } from "./util.cjs";

//@ chunk-1ny7cxrt.js:556551-566438 cjs-fingerprint
var require_to_json_schema = x(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.createStandardJSONSchemaMethod = cjsExports.createToJSONSchemaMethod = undefined;
  cjsExports.initializeContext = initializeContext;
  cjsExports.handleUnrepresentable = handleUnrepresentable;
  cjsExports.processSchema = processSchema;
  cjsExports.process = processSchema;
  cjsExports.processSchema = processSchema;
  cjsExports.process = processSchema;
  cjsExports.extractDefs = extractDefs;
  cjsExports.finalize = finalize;
  cjsExports.isTransforming = isTransforming;
  var registries_js_1 = require_registries();
  var util_js_1 = require_util();
  function assignProps(target, ...sources) {
    for (let source of sources)
      for (let key of Reflect.ownKeys(source))
        if (Object.prototype.propertyIsEnumerable.call(source, key))
          util_js_1.assignProp(target, key, source[key]);
    return target;
  }
  function initializeContext(params) {
    let target = params?.target ?? "draft-2020-12";
    if (target === "draft-4") target = "draft-04";
    if (target === "draft-7") target = "draft-07";
    return {
      processors: params.processors ?? {},
      metadataRegistry: params?.metadata ?? registries_js_1.globalRegistry,
      target,
      unrepresentable: params?.unrepresentable ?? "throw",
      override: params?.override ?? (() => {}),
      io: params?.io ?? "output",
      counter: 0,
      seen: new Map(),
      sharedDefsExtractedFor: undefined,
      sharedEmitDoneFor: undefined,
      cycles: params?.cycles ?? "ref",
      reused: params?.reused ?? "inline",
      intersections: [],
      deferred: [],
      external: params?.external ?? undefined,
    };
  }
  function handleUnrepresentable(schema, ctx, json, params, message) {
    let result =
      typeof ctx.unrepresentable === "function"
        ? ctx.unrepresentable({
            zodSchema: schema,
            path: params.path,
            message,
          })
        : ctx.unrepresentable;
    if (result === "any") return false;
    if (result === undefined || result === "throw") throw Error(message);
    Object.assign(json, result);
    return true;
  }
  function processSchema(
    schema,
    ctx,
    _params = {
      path: [],
      schemaPath: [],
    },
  ) {
    var _a;
    let def = schema._zod.def;
    let seen = ctx.seen.get(schema);
    if (seen) {
      seen.count++;
      if (_params.schemaPath.includes(schema)) seen.cycle = _params.path;
      return seen.schema;
    }
    let result = {
      schema: {},
      count: 1,
      cycle: undefined,
      path: _params.path,
    };
    ctx.seen.set(schema, result);
    ctx.sharedDefsExtractedFor = undefined;
    ctx.sharedEmitDoneFor = undefined;
    let overrideSchema = schema._zod.toJSONSchema?.();
    if (overrideSchema) result.schema = overrideSchema;
    else {
      let params = {
        ..._params,
        schemaPath: [..._params.schemaPath, schema],
        path: _params.path,
      };
      if (schema._zod.processJSONSchema) schema._zod.processJSONSchema(ctx, result.schema, params);
      else {
        let _json = result.schema;
        let processor = ctx.processors[def.type];
        if (!processor) throw Error(`[toJSONSchema]: Non-representable type encountered: ${def.type}`);
        processor(schema, ctx, _json, params);
      }
      let parent = schema._zod.parent;
      if (parent) {
        if (!result.ref) result.ref = parent;
        processSchema(parent, ctx, params);
        ctx.seen.get(parent).isParent = true;
      }
    }
    let meta = ctx.metadataRegistry.get(schema);
    if (meta) assignProps(result.schema, meta);
    if (ctx.io === "input" && isTransforming(schema)) {
      delete result.schema.examples;
      delete result.schema.default;
    }
    if (ctx.io === "input" && "_prefault" in result.schema)
      (_a = result.schema).default ?? (_a.default = result.schema._prefault);
    delete result.schema._prefault;
    return ctx.seen.get(schema).schema;
  }
  function encodeJSONPointerSegment(segment) {
    return segment.replace(/~/g, "~0").replace(/\//g, "~1");
  }
  function extractDefs(ctx, schema) {
    let root = ctx.seen.get(schema);
    if (!root) throw Error("Unprocessed schema. This is a bug in Zod.");
    if (ctx.external && ctx.sharedDefsExtractedFor === ctx.external) return;
    let idToSchema = new Map();
    for (let entry of ctx.seen.entries()) {
      let id = ctx.metadataRegistry.get(entry[0])?.id;
      if (id) {
        let existing = idToSchema.get(id);
        if (existing && existing !== entry[0])
          throw Error(
            `Duplicate schema id "${id}" detected during JSON Schema conversion. Two different schemas cannot share the same id when converted together.`,
          );
        idToSchema.set(id, entry[0]);
      }
    }
    let makeURI = (entry) => {
      let defsSegment = ctx.target === "draft-2020-12" ? "$defs" : "definitions";
      if (ctx.external) {
        let externalId = ctx.external.registry.get(entry[0])?.id;
        let uriGenerator = ctx.external.uri ?? ((id) => id);
        if (externalId)
          return {
            ref: uriGenerator(externalId),
          };
        let id = entry[1].defId ?? entry[1].schema.id ?? `schema${ctx.counter++}`;
        entry[1].defId = id;
        return {
          defId: id,
          ref: `${uriGenerator("__shared")}#/${defsSegment}/${encodeJSONPointerSegment(id)}`,
        };
      }
      let uriPrefix = "#";
      let defUriPrefix = `${uriPrefix}/${defsSegment}/`;
      if (entry[1] === root && !entry[1].schema.id)
        return {
          ref: uriPrefix,
        };
      let defId = entry[1].schema.id ?? `__schema${ctx.counter++}`;
      return {
        defId,
        ref: defUriPrefix + encodeJSONPointerSegment(defId),
      };
    };
    let extractToDef = (entry) => {
      if (entry[1].schema.$ref) return;
      let seen = entry[1];
      let { ref, defId } = makeURI(entry);
      seen.def = {
        ...seen.schema,
      };
      if (defId) seen.defId = defId;
      let schema = seen.schema;
      for (let key in schema) delete schema[key];
      schema.$ref = ref;
    };
    if (ctx.cycles === "throw")
      for (let entry of ctx.seen.entries()) {
        let seen = entry[1];
        if (seen.cycle)
          throw Error(`Cycle detected: #/${seen.cycle?.join("/")}/<root>

Set the \`cycles\` parameter to \`"ref"\` to resolve cyclical schemas with defs.`);
      }
    for (let entry of ctx.seen.entries()) {
      let seen = entry[1];
      if (schema === entry[0]) {
        extractToDef(entry);
        continue;
      }
      if (ctx.external) {
        let ext = ctx.external.registry.get(entry[0])?.id;
        if (schema !== entry[0] && ext) {
          extractToDef(entry);
          continue;
        }
      }
      if (ctx.metadataRegistry.get(entry[0])?.id) {
        extractToDef(entry);
        continue;
      }
      if (seen.cycle) {
        extractToDef(entry);
        continue;
      }
      if (seen.count > 1) {
        if (ctx.reused === "ref") extractToDef(entry);
      }
    }
    if (ctx.external) ctx.sharedDefsExtractedFor = ctx.external;
  }
  function compactTypeUnion(schema) {
    let options = schema.anyOf;
    if (!Array.isArray(options) || options.length === 0 || schema.type !== undefined) return;
    let types = [];
    for (let option of options) {
      if (!option || typeof option !== "object") return;
      compactTypeUnion(option);
      let keys = Object.keys(option);
      if (keys.length !== 1 || keys[0] !== "type") return;
      let type = option.type;
      for (let member of Array.isArray(type) ? type : [type]) {
        if (typeof member !== "string") return;
        if (!types.includes(member)) types.push(member);
      }
    }
    delete schema.anyOf;
    schema.type = types.length === 1 ? types[0] : types;
  }
  var FOLDABLE_KEYS = new Set(["type", "properties", "required", "additionalProperties"]);
  var UNION_KEYS = ["oneOf", "anyOf"];
  function undeclaredConstraint(member) {
    let extra = member.additionalProperties;
    if (extra === undefined || extra === false || typeof extra !== "object" || extra === null) return null;
    return Object.keys(extra).length ? extra : null;
  }
  function foldObjects(members) {
    let objects = [];
    for (let member of members) {
      if (typeof member !== "object" || member.type !== "object") return null;
      for (let key in member) if (!FOLDABLE_KEYS.has(key)) return null;
      objects.push(member);
    }
    let properties = {};
    let required = new Set();
    for (let object of objects) {
      for (let key in object.properties) {
        if (Object.prototype.hasOwnProperty.call(properties, key)) continue;
        let parts = [];
        for (let other of objects) {
          let part = other.properties?.[key] ?? undeclaredConstraint(other);
          if (part === null || part === undefined) continue;
          if (!parts.some((seen) => JSON.stringify(seen) === JSON.stringify(part))) parts.push(part);
        }
        let merged =
          parts.length === 1
            ? parts[0]
            : (foldObjects(parts) ?? {
                allOf: parts,
              });
        util_js_1.assignProp(properties, key, merged);
      }
      for (let key of object.required ?? []) required.add(key);
    }
    let folded = {
      type: "object",
      properties,
    };
    if (required.size) folded.required = [...required];
    if (objects.every((object) => object.additionalProperties === false)) folded.additionalProperties = false;
    else {
      let constraints = [];
      for (let object of objects) {
        let constraint = undeclaredConstraint(object);
        if (constraint && !constraints.some((seen) => JSON.stringify(seen) === JSON.stringify(constraint)))
          constraints.push(constraint);
      }
      if (constraints.length === 1) folded.additionalProperties = constraints[0];
      else if (constraints.length > 1)
        folded.additionalProperties = {
          allOf: constraints,
        };
    }
    return folded;
  }
  function foldIntersection(json) {
    let allOf = json.allOf;
    if (!Array.isArray(allOf) || allOf.length < 2) return;
    for (let key of FOLDABLE_KEYS) if (key in json) return;
    let unions = allOf.filter((m) => UNION_KEYS.some((k) => Array.isArray(m[k])));
    let folded = null;
    if (!unions.length) folded = foldObjects(allOf);
    else {
      let union = unions[0];
      let keyword = UNION_KEYS.find((k) => Array.isArray(union[k]));
      if (Object.keys(union).length !== 1) return;
      let rest = allOf.filter((m) => m !== union);
      let branches = union[keyword].map((branch) => foldObjects([...rest, branch]));
      if (branches.some((b) => !b)) return;
      folded = {
        [keyword]: branches,
      };
    }
    if (!folded) return;
    delete json.allOf;
    assignProps(json, folded);
  }
  function finalize(ctx, schema) {
    let root = ctx.seen.get(schema);
    if (!root) throw Error("Unprocessed schema. This is a bug in Zod.");
    let flattenRef = (zodSchema) => {
      let seen = ctx.seen.get(zodSchema);
      if (seen.ref === null) return;
      let schema = seen.def ?? seen.schema;
      let _cached = {
        ...schema,
      };
      let ref = seen.ref;
      seen.ref = null;
      if (ref) {
        flattenRef(ref);
        let refSeen = ctx.seen.get(ref);
        let refSchema = refSeen.schema;
        if (
          refSchema.$ref &&
          (ctx.target === "draft-07" || ctx.target === "draft-04" || ctx.target === "openapi-3.0")
        ) {
          schema.allOf = schema.allOf ?? [];
          schema.allOf.push(refSchema);
        } else assignProps(schema, refSchema);
        assignProps(schema, _cached);
        if (zodSchema._zod.parent === ref)
          for (let key in schema) {
            if (key === "$ref" || key === "allOf") continue;
            if (!(key in _cached)) delete schema[key];
          }
        if (refSchema.$ref && refSeen.def)
          for (let key in schema) {
            if (key === "$ref" || key === "allOf") continue;
            if (key in refSeen.def && JSON.stringify(schema[key]) === JSON.stringify(refSeen.def[key]))
              delete schema[key];
          }
      }
      let parent = zodSchema._zod.parent;
      if (parent && parent !== ref) {
        flattenRef(parent);
        let parentSeen = ctx.seen.get(parent);
        if (parentSeen?.schema.$ref) {
          schema.$ref = parentSeen.schema.$ref;
          if (parentSeen.def)
            for (let key in schema) {
              if (key === "$ref" || key === "allOf") continue;
              if (
                key in parentSeen.def &&
                JSON.stringify(schema[key]) === JSON.stringify(parentSeen.def[key])
              )
                delete schema[key];
            }
        }
      }
      ctx.override({
        zodSchema,
        jsonSchema: schema,
        path: seen.path ?? [],
      });
    };
    if (!ctx.external || ctx.sharedEmitDoneFor !== ctx.external) {
      for (let entry of [...ctx.seen.entries()].reverse()) flattenRef(entry[0]);
      if (ctx.target !== "openapi-3.0")
        for (let entry of ctx.seen.entries()) compactTypeUnion(entry[1].def ?? entry[1].schema);
      for (let rewrite of ctx.deferred) rewrite();
      if (ctx.intersections.length) {
        let carriers = new Map();
        for (let seen of ctx.seen.values())
          for (let json of [seen.schema, seen.def]) {
            let allOf = json?.allOf;
            if (!Array.isArray(allOf)) continue;
            let existing = carriers.get(allOf);
            if (existing) existing.push(json);
            else carriers.set(allOf, [json]);
          }
        for (let allOf of ctx.intersections)
          for (let json of carriers.get(allOf) ?? []) foldIntersection(json);
      }
    }
    let result = {};
    if (ctx.target === "draft-2020-12") result.$schema = "https://json-schema.org/draft/2020-12/schema";
    else if (ctx.target === "draft-07") result.$schema = "http://json-schema.org/draft-07/schema#";
    else if (ctx.target === "draft-04") result.$schema = "http://json-schema.org/draft-04/schema#";
    else if (ctx.target === "openapi-3.0");
    if (ctx.external?.uri) {
      let id = ctx.external.registry.get(schema)?.id;
      if (!id) throw Error("Schema is missing an `id` property");
      result.$id = ctx.external.uri(id);
    }
    assignProps(result, root.defId ? root.schema : (root.def ?? root.schema));
    let rootMetaId = ctx.metadataRegistry.get(schema)?.id;
    if (rootMetaId !== undefined && result.id === rootMetaId) delete result.id;
    let defs = ctx.external?.defs ?? {};
    if (!ctx.external || ctx.sharedEmitDoneFor !== ctx.external)
      for (let entry of ctx.seen.entries()) {
        let seen = entry[1];
        if (seen.def && seen.defId) {
          if (seen.def.id === seen.defId) delete seen.def.id;
          util_js_1.assignProp(defs, seen.defId, seen.def);
        }
      }
    if (ctx.external) ctx.sharedEmitDoneFor = ctx.external;
    if (ctx.external);
    else if (Object.keys(defs).length > 0)
      if (ctx.target === "draft-2020-12") result.$defs = defs;
      else result.definitions = defs;
    try {
      let finalized = JSON.parse(JSON.stringify(result));
      Object.defineProperty(finalized, "~standard", {
        value: {
          ...schema["~standard"],
          jsonSchema: {
            input: cjsExports.createStandardJSONSchemaMethod(schema, "input", ctx.processors),
            output: cjsExports.createStandardJSONSchemaMethod(schema, "output", ctx.processors),
          },
        },
        enumerable: false,
        writable: false,
      });
      return finalized;
    } catch (_err) {
      throw Error("Error converting schema to JSON.");
    }
  }
  function isTransforming(_schema, _ctx) {
    let ctx = _ctx ?? {
      seen: new Set(),
    };
    if (ctx.seen.has(_schema)) return false;
    ctx.seen.add(_schema);
    let def = _schema._zod.def;
    if (def.type === "transform") return true;
    if (def.type === "array") return isTransforming(def.element, ctx);
    if (def.type === "set") return isTransforming(def.valueType, ctx);
    if (def.type === "lazy") return isTransforming(def.getter(), ctx);
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
      return isTransforming(def.innerType, ctx);
    if (def.type === "intersection") return isTransforming(def.left, ctx) || isTransforming(def.right, ctx);
    if (def.type === "record" || def.type === "map")
      return isTransforming(def.keyType, ctx) || isTransforming(def.valueType, ctx);
    if (def.type === "pipe") {
      if (_schema._zod.traits.has("$ZodCodec")) return true;
      return isTransforming(def.in, ctx) || isTransforming(def.out, ctx);
    }
    if (def.type === "object") {
      for (let key in def.shape) if (isTransforming(def.shape[key], ctx)) return true;
      return false;
    }
    if (def.type === "union") {
      for (let option of def.options) if (isTransforming(option, ctx)) return true;
      return false;
    }
    if (def.type === "tuple") {
      for (let item of def.items) if (isTransforming(item, ctx)) return true;
      if (def.rest && isTransforming(def.rest, ctx)) return true;
      return false;
    }
    return false;
  }
  var createToJSONSchemaMethod =
    (schema, processors = {}) =>
    (params) => {
      let ctx = initializeContext({
        ...params,
        processors,
      });
      processSchema(schema, ctx);
      extractDefs(ctx, schema);
      return finalize(ctx, schema);
    };
  cjsExports.createToJSONSchemaMethod = createToJSONSchemaMethod;
  var createStandardJSONSchemaMethod =
    (schema, io, processors = {}) =>
    (params) => {
      let { libraryOptions, target } = params ?? {};
      let ctx = initializeContext({
        ...(libraryOptions ?? {}),
        target,
        io,
        processors,
      });
      processSchema(schema, ctx);
      extractDefs(ctx, schema);
      return finalize(ctx, schema);
    };
  cjsExports.createStandardJSONSchemaMethod = createStandardJSONSchemaMethod;
  (function () {
    var keys = Object.getOwnPropertyNames(cjsExports);
    for (var i = 0; i < keys.length; i++) {
      var desc = Object.getOwnPropertyDescriptor(cjsExports, keys[i]);
      if (!desc || !desc.get || !desc.configurable) continue;
      var value;
      try {
        value = desc.get();
      } catch (e) {
        continue;
      }
      if (value === undefined) continue;
      Object.defineProperty(cjsExports, keys[i], {
        value,
        writable: false,
        enumerable: desc.enumerable,
        configurable: false,
      });
    }
    Object.freeze(cjsExports);
  })();
});
export { require_to_json_schema };
