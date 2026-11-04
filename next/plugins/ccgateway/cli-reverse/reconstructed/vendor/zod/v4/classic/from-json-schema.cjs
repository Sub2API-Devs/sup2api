/**
 * zod/v4/classic/from-json-schema.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_registries } from "../core/registries.cjs";
import { require_util } from "../core/util.cjs";
import { require_checks_2 } from "./checks.cjs";
import { require_iso } from "./iso.cjs";
import { require_schemas_2 } from "./schemas.cjs";

//@ chunk-1ny7cxrt.js:630542-644420 cjs-fingerprint
var require_from_json_schema = __commonJS(function (cjsExports) {
  var __createBinding =
    (cjsExports && cjsExports.__createBinding) ||
    (Object.create
      ? function (o_2, m, k, k2) {
          if (k2 === undefined) k2 = k;
          var desc = Object.getOwnPropertyDescriptor(m, k);
          if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable))
            desc = {
              enumerable: true,
              get: function () {
                return m[k];
              },
            };
          Object.defineProperty(o_2, k2, desc);
        }
      : function (o_2, m, k, k2) {
          if (k2 === undefined) k2 = k;
          o_2[k2] = m[k];
        });
  var __setModuleDefault =
    (cjsExports && cjsExports.__setModuleDefault) ||
    (Object.create
      ? function (o, v) {
          Object.defineProperty(o, "default", {
            enumerable: true,
            value: v,
          });
        }
      : function (o, v) {
          o.default = v;
        });
  var __importStar =
    (cjsExports && cjsExports.__importStar) ||
    function (mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null) {
        for (var k in mod)
          if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k))
            __createBinding(result, mod, k);
      }
      __setModuleDefault(result, mod);
      return result;
    };
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.fromJSONSchema = fromJSONSchema;
  var registries_js_1 = require_registries();
  var util_js_1 = require_util();
  var _checks = __importStar(require_checks_2());
  var _iso = __importStar(require_iso());
  var _schemas = __importStar(require_schemas_2());
  var z = {
    ..._schemas,
    ..._checks,
    iso: _iso,
  };
  var RECOGNIZED_KEYS = new Set([
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
  function detectVersion(schema, defaultTarget) {
    let $schema = schema.$schema;
    if ($schema === "https://json-schema.org/draft/2020-12/schema") return "draft-2020-12";
    if ($schema === "http://json-schema.org/draft-07/schema#") return "draft-7";
    if ($schema === "http://json-schema.org/draft-04/schema#") return "draft-4";
    return defaultTarget ?? "draft-2020-12";
  }
  function applyMinItems(items, minItems) {
    return items.map((item, index) => (index < minItems ? item : item.optional()));
  }
  function decodeJSONPointerSegment(segment) {
    return segment.replace(/~1/g, "/").replace(/~0/g, "~");
  }
  function resolveRef(ref, ctx) {
    if (!ref.startsWith("#"))
      throw Error("External $ref is not supported, only local refs (#/...) are allowed");
    let path = ref.slice(1).split("/").filter(Boolean);
    if (path.length === 0) return ctx.rootSchema;
    let defsKey = ctx.version === "draft-2020-12" ? "$defs" : "definitions";
    if (path[0] === defsKey) {
      let key = path[1] === undefined ? undefined : decodeJSONPointerSegment(path[1]);
      if (!key || !ctx.defs[key]) throw Error(`Reference not found: ${ref}`);
      return ctx.defs[key];
    }
    throw Error(`Reference not found: ${ref}`);
  }
  function checkObjectGuards(objectSchema, guards) {
    return z
      .transform((value) => value)
      .check((payload) => {
        let value = payload.value;
        if (typeof value !== "object" || value === null || Array.isArray(value)) return;
        let keys = Object.getOwnPropertyNames(value);
        if (guards.minProperties !== undefined && keys.length < guards.minProperties)
          payload.issues.push({
            origin: "object",
            code: "too_small",
            minimum: guards.minProperties,
            inclusive: true,
            message: `Too small: expected object to have >=${guards.minProperties} properties`,
            input: value,
            inst: objectSchema,
            continue: true,
          });
        if (guards.maxProperties !== undefined && keys.length > guards.maxProperties)
          payload.issues.push({
            origin: "object",
            code: "too_big",
            maximum: guards.maxProperties,
            inclusive: true,
            message: `Too big: expected object to have <=${guards.maxProperties} properties`,
            input: value,
            inst: objectSchema,
            continue: true,
          });
        if (guards.keySchema)
          for (let key of keys) {
            let result = guards.keySchema.safeParse(key);
            if (result.success) continue;
            payload.issues.push({
              code: "invalid_key",
              origin: "record",
              issues: result.error.issues,
              input: key,
              path: [key],
              continue: true,
            });
          }
      })
      .pipe(objectSchema);
  }
  function canonicalKey(value, seen) {
    if (value === null) return "z";
    let type = typeof value;
    if (type !== "object") {
      if (type === "number" && Number.isNaN(value)) return null;
      let raw = String(value);
      return `${type[0]}${raw.length}:${raw}`;
    }
    if (seen.has(value)) return null;
    seen.add(value);
    try {
      if (Array.isArray(value)) {
        let parts = [];
        for (let item of value) {
          let key = canonicalKey(item, seen);
          if (key === null) return null;
          parts.push(key);
        }
        return `a${parts.length}:[${parts.join(",")}]`;
      }
      let keys = Object.keys(value).sort();
      let parts = [];
      for (let k of keys) {
        let key = canonicalKey(value[k], seen);
        if (key === null) return null;
        parts.push(`${k.length}:${k}=${key}`);
      }
      return `o${parts.length}:{${parts.join(",")}}`;
    } finally {
      seen.delete(value);
    }
  }
  var SCHEMA_KEYWORDS = new Set([
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
  ]);
  var SCHEMA_MAP_KEYWORDS = new Set([
    "properties",
    "patternProperties",
    "dependentSchemas",
    "dependencies",
    "$defs",
    "definitions",
  ]);
  function containsRef(value) {
    if (typeof value !== "object" || value === null) return false;
    if (Array.isArray(value)) return value.some(containsRef);
    if (typeof value.$ref === "string") return true;
    return Object.entries(value).some(([key, sub]) => {
      if (SCHEMA_KEYWORDS.has(key)) return containsRef(sub);
      if (!SCHEMA_MAP_KEYWORDS.has(key) || typeof sub !== "object" || sub === null) return false;
      return Object.values(sub).some(containsRef);
    });
  }
  function plural(n) {
    return n === 1 ? "element" : "elements";
  }
  function checkArrayGuards(arraySchema, guards) {
    return z
      .transform((value) => value)
      .check((payload) => {
        let items = payload.value;
        if (!Array.isArray(items)) return;
        if (guards.uniqueItems === true) {
          let firstSeen = new Map();
          for (let i = 0; i < items.length; i++) {
            let key = canonicalKey(items[i], new Set());
            if (key === null) continue;
            let first = firstSeen.get(key);
            if (first === undefined) {
              firstSeen.set(key, i);
              continue;
            }
            payload.issues.push({
              code: "custom",
              message: `Array items must be unique: element at index ${i} duplicates the one at index ${first}`,
              input: items,
              path: [i],
              continue: true,
            });
          }
        }
        if (guards.containsSchema) {
          let minContains = guards.minContains ?? 1;
          let ceiling = guards.maxContains !== undefined ? guards.maxContains + 1 : Number.POSITIVE_INFINITY;
          let matches = 0;
          for (let item of items)
            if (guards.containsSchema.safeParse(item).success && ++matches >= ceiling) break;
          if (matches < minContains)
            payload.issues.push({
              code: "custom",
              message: `Array must contain at least ${minContains} matching ${plural(minContains)}; found ${matches}`,
              input: items,
              continue: true,
            });
          if (guards.maxContains !== undefined && matches > guards.maxContains)
            payload.issues.push({
              code: "custom",
              message: `Array must contain at most ${guards.maxContains} matching ${plural(guards.maxContains)}`,
              input: items,
              continue: true,
            });
        }
      })
      .pipe(arraySchema);
  }
  function getTupleRest(restSchema, ctx) {
    if (restSchema === false) return;
    if (restSchema === undefined || restSchema === true) return z.any();
    return convertSchema(restSchema, ctx);
  }
  var fullTime = /^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/;
  function convertBaseSchema(schema, ctx) {
    if (schema.not !== undefined) {
      if (typeof schema.not === "object" && Object.keys(schema.not).length === 0) return z.never();
      throw Error("not is not supported in Zod (except { not: {} } for never)");
    }
    if (schema.unevaluatedItems !== undefined) throw Error("unevaluatedItems is not supported");
    if (schema.unevaluatedProperties !== undefined) throw Error("unevaluatedProperties is not supported");
    if (schema.if !== undefined || schema.then !== undefined || schema.else !== undefined)
      throw Error("Conditional schemas (if/then/else) are not supported");
    if (schema.dependentSchemas !== undefined || schema.dependentRequired !== undefined)
      throw Error("dependentSchemas and dependentRequired are not supported");
    if (schema.$ref) {
      let refPath = schema.$ref;
      if (ctx.refs.has(refPath)) return ctx.refs.get(refPath);
      if (ctx.processing.has(refPath))
        return z.lazy(() => {
          if (!ctx.refs.has(refPath)) throw Error(`Circular reference not resolved: ${refPath}`);
          return ctx.refs.get(refPath);
        });
      ctx.processing.add(refPath);
      let resolved = resolveRef(refPath, ctx);
      let zodSchema = convertSchema(resolved, ctx);
      ctx.refs.set(refPath, zodSchema);
      ctx.processing.delete(refPath);
      return zodSchema;
    }
    if (schema.enum !== undefined) {
      let enumValues = schema.enum;
      if (
        ctx.version === "openapi-3.0" &&
        schema.nullable === true &&
        enumValues.length === 1 &&
        enumValues[0] === null
      )
        return z.null();
      if (enumValues.length === 0) return z.never();
      if (enumValues.length === 1) return z.literal(enumValues[0]);
      if (enumValues.every((v) => typeof v === "string")) return z.enum(enumValues);
      let literalSchemas = enumValues.map((v) => z.literal(v));
      if (literalSchemas.length < 2) return literalSchemas[0];
      return z.union([literalSchemas[0], literalSchemas[1], ...literalSchemas.slice(2)]);
    }
    if (schema.const !== undefined) return z.literal(schema.const);
    let type = schema.type;
    if (Array.isArray(type)) {
      let typeSchemas = type.map((t) => {
        let typeSchema = {
          ...schema,
          type: t,
        };
        return convertBaseSchema(typeSchema, ctx);
      });
      if (typeSchemas.length === 0) return z.never();
      if (typeSchemas.length === 1) return typeSchemas[0];
      return z.union(typeSchemas);
    }
    if (!type) return z.any();
    let zodSchema;
    switch (type) {
      case "string": {
        let stringSchema = z.string();
        if (schema.format) {
          let format = schema.format;
          if (format === "email") stringSchema = stringSchema.check(z.email());
          else if (format === "uri" || format === "uri-reference") stringSchema = stringSchema.check(z.url());
          else if (format === "uuid" || format === "guid") stringSchema = stringSchema.check(z.uuid());
          else if (format === "date-time")
            stringSchema = stringSchema.check(
              z.iso.datetime({
                offset: true,
              }),
            );
          else if (format === "date") stringSchema = stringSchema.check(z.iso.date());
          else if (format === "time") stringSchema = stringSchema.check(z.regex(fullTime));
          else if (format === "duration") stringSchema = stringSchema.check(z.iso.duration());
          else if (format === "hostname") stringSchema = stringSchema.check(z.hostname());
          else if (format === "ipv4") stringSchema = stringSchema.check(z.ipv4());
          else if (format === "ipv6") stringSchema = stringSchema.check(z.ipv6());
          else if (format === "mac") stringSchema = stringSchema.check(z.mac());
          else if (format === "cidr") stringSchema = stringSchema.check(z.cidrv4());
          else if (format === "cidr-v6") stringSchema = stringSchema.check(z.cidrv6());
          else if (format === "base64") stringSchema = stringSchema.check(z.base64());
          else if (format === "base64url") stringSchema = stringSchema.check(z.base64url());
          else if (format === "e164") stringSchema = stringSchema.check(z.e164());
          else if (format === "credit_card") stringSchema = stringSchema.check(z.creditCard());
          else if (format === "iban") stringSchema = stringSchema.check(z.iban());
          else if (format === "jwt") stringSchema = stringSchema.check(z.jwt());
          else if (format === "emoji") stringSchema = stringSchema.check(z.emoji());
          else if (format === "nanoid") stringSchema = stringSchema.check(z.nanoid());
          else if (format === "cuid") stringSchema = stringSchema.check(z.cuid());
          else if (format === "cuid2") stringSchema = stringSchema.check(z.cuid2());
          else if (format === "ulid") stringSchema = stringSchema.check(z.ulid());
          else if (format === "xid") stringSchema = stringSchema.check(z.xid());
          else if (format === "ksuid") stringSchema = stringSchema.check(z.ksuid());
        }
        if (typeof schema.minLength === "number") stringSchema = stringSchema.min(schema.minLength);
        if (typeof schema.maxLength === "number") stringSchema = stringSchema.max(schema.maxLength);
        if (schema.pattern) stringSchema = stringSchema.regex(new RegExp(schema.pattern));
        zodSchema = stringSchema;
        break;
      }
      case "number":
      case "integer": {
        let numberSchema = type === "integer" ? z.number().int() : z.number();
        if (typeof schema.minimum === "number" && schema.exclusiveMinimum !== true)
          numberSchema = numberSchema.min(schema.minimum);
        if (typeof schema.maximum === "number" && schema.exclusiveMaximum !== true)
          numberSchema = numberSchema.max(schema.maximum);
        if (typeof schema.exclusiveMinimum === "number")
          numberSchema = numberSchema.gt(schema.exclusiveMinimum);
        else if (schema.exclusiveMinimum === true && typeof schema.minimum === "number")
          numberSchema = numberSchema.gt(schema.minimum);
        if (typeof schema.exclusiveMaximum === "number")
          numberSchema = numberSchema.lt(schema.exclusiveMaximum);
        else if (schema.exclusiveMaximum === true && typeof schema.maximum === "number")
          numberSchema = numberSchema.lt(schema.maximum);
        if (typeof schema.multipleOf === "number") numberSchema = numberSchema.multipleOf(schema.multipleOf);
        zodSchema = numberSchema;
        break;
      }
      case "boolean": {
        zodSchema = z.boolean();
        break;
      }
      case "null": {
        zodSchema = z.null();
        break;
      }
      case "object": {
        let shape = {};
        let properties = schema.properties || {};
        let requiredSet = new Set(schema.required || []);
        let additionalSchema =
          typeof schema.additionalProperties === "object"
            ? convertSchema(schema.additionalProperties, ctx)
            : undefined;
        for (let [key, propSchema] of Object.entries(properties)) {
          let propZodSchema = convertSchema(propSchema, ctx);
          util_js_1.assignProp(shape, key, requiredSet.has(key) ? propZodSchema : propZodSchema.optional());
        }
        if (schema.patternProperties) {
          let patternProps = schema.patternProperties;
          let patternKeys = Object.keys(patternProps);
          let looseRecords = [];
          for (let pattern of patternKeys) {
            let patternValue = convertSchema(patternProps[pattern], ctx);
            let keySchema = z.string().regex(new RegExp(pattern));
            looseRecords.push(z.looseRecord(keySchema, patternValue));
          }
          let schemasToIntersect = [];
          if (Object.keys(shape).length > 0) schemasToIntersect.push(z.object(shape).passthrough());
          schemasToIntersect.push(...looseRecords);
          if (schemasToIntersect.length === 0) zodSchema = z.object({}).passthrough();
          else if (schemasToIntersect.length === 1) zodSchema = schemasToIntersect[0];
          else {
            let result = z.intersection(schemasToIntersect[0], schemasToIntersect[1]);
            for (let i = 2; i < schemasToIntersect.length; i++)
              result = z.intersection(result, schemasToIntersect[i]);
            zodSchema = result;
          }
          if (schema.additionalProperties === false) {
            let propertyKeys = Object.keys(shape);
            let patterns = patternKeys.map((p) => new RegExp(p));
            let basePatternSchema = zodSchema;
            zodSchema = zodSchema.check((payload) => {
              if (!util_js_1.isPlainObject(payload.value)) return;
              let unrecognized = [];
              for (let key of Object.keys(payload.value)) {
                if (propertyKeys.includes(key)) continue;
                if (patterns.some((regex) => regex.test(key))) continue;
                unrecognized.push(key);
              }
              if (unrecognized.length)
                payload.issues.push({
                  code: "unrecognized_keys",
                  keys: unrecognized,
                  input: payload.value,
                  inst: basePatternSchema,
                });
            });
          }
        } else {
          let objectSchema = z.object(shape);
          if (schema.additionalProperties === false) zodSchema = objectSchema.strict();
          else if (additionalSchema) zodSchema = objectSchema.catchall(additionalSchema);
          else zodSchema = objectSchema.passthrough();
        }
        let hasKeyGuard = schema.propertyNames !== undefined && schema.propertyNames !== true;
        let minProperties = typeof schema.minProperties === "number" ? schema.minProperties : undefined;
        let maxProperties = typeof schema.maxProperties === "number" ? schema.maxProperties : undefined;
        if (hasKeyGuard || minProperties !== undefined || maxProperties !== undefined) {
          let keySchema;
          if (hasKeyGuard) {
            let keyJSONSchema =
              typeof schema.propertyNames === "object" && schema.propertyNames.type === undefined
                ? {
                    type: "string",
                    ...schema.propertyNames,
                  }
                : schema.propertyNames;
            keySchema = convertSchema(keyJSONSchema, ctx);
          }
          zodSchema = checkObjectGuards(zodSchema, {
            keySchema,
            minProperties,
            maxProperties,
          });
        }
        break;
      }
      case "array": {
        let { prefixItems, items } = schema;
        if (prefixItems && Array.isArray(prefixItems)) {
          let minItems = typeof schema.minItems === "number" ? schema.minItems : 0;
          let tupleItems = prefixItems.map((item) => convertSchema(item, ctx));
          let positionalItems = applyMinItems(tupleItems, minItems);
          let rest = !Array.isArray(items) ? getTupleRest(items, ctx) : undefined;
          let tupleSchema = z.tuple(positionalItems);
          zodSchema = rest ? tupleSchema.rest(rest) : tupleSchema;
          if (typeof schema.minItems === "number") zodSchema = zodSchema.check(z.minLength(schema.minItems));
          if (typeof schema.maxItems === "number") zodSchema = zodSchema.check(z.maxLength(schema.maxItems));
        } else if (Array.isArray(items)) {
          let minItems = typeof schema.minItems === "number" ? schema.minItems : 0;
          let tupleItems = items.map((item) => convertSchema(item, ctx));
          let positionalItems = applyMinItems(tupleItems, minItems);
          let rest = getTupleRest(schema.additionalItems, ctx);
          let tupleSchema = z.tuple(positionalItems);
          zodSchema = rest ? tupleSchema.rest(rest) : tupleSchema;
          if (typeof schema.minItems === "number") zodSchema = zodSchema.check(z.minLength(schema.minItems));
          if (typeof schema.maxItems === "number") zodSchema = zodSchema.check(z.maxLength(schema.maxItems));
        } else if (items !== undefined) {
          let element = convertSchema(items, ctx);
          let arraySchema = z.array(element);
          if (typeof schema.minItems === "number") arraySchema = arraySchema.min(schema.minItems);
          if (typeof schema.maxItems === "number") arraySchema = arraySchema.max(schema.maxItems);
          zodSchema = arraySchema;
        } else zodSchema = z.array(z.any());
        if (schema.uniqueItems === true || schema.contains !== undefined)
          zodSchema = checkArrayGuards(zodSchema, {
            uniqueItems: schema.uniqueItems === true,
            containsSchema: schema.contains !== undefined ? convertSchema(schema.contains, ctx) : undefined,
            minContains: typeof schema.minContains === "number" ? schema.minContains : undefined,
            maxContains: typeof schema.maxContains === "number" ? schema.maxContains : undefined,
          });
        break;
      }
      default:
        throw Error(`Unsupported type: ${type}`);
    }
    return zodSchema;
  }
  function convertSchema(schema, ctx) {
    if (typeof schema === "boolean") return schema ? z.any() : z.never();
    let baseSchema = convertBaseSchema(schema, ctx);
    let hasExplicitType = schema.type || schema.enum !== undefined || schema.const !== undefined;
    if (schema.anyOf && Array.isArray(schema.anyOf)) {
      let options = schema.anyOf.map((s) => convertSchema(s, ctx));
      let anyOfUnion = z.union(options);
      baseSchema = hasExplicitType ? z.intersection(baseSchema, anyOfUnion) : anyOfUnion;
    }
    if (schema.oneOf && Array.isArray(schema.oneOf)) {
      let options = schema.oneOf.map((s) => convertSchema(s, ctx));
      let oneOfUnion = z.xor(options);
      baseSchema = hasExplicitType ? z.intersection(baseSchema, oneOfUnion) : oneOfUnion;
    }
    if (schema.allOf && Array.isArray(schema.allOf))
      if (schema.allOf.length === 0) baseSchema = hasExplicitType ? baseSchema : z.any();
      else {
        let result = hasExplicitType ? baseSchema : convertSchema(schema.allOf[0], ctx);
        let startIdx = hasExplicitType ? 0 : 1;
        for (let i = startIdx; i < schema.allOf.length; i++)
          result = z.intersection(result, convertSchema(schema.allOf[i], ctx));
        baseSchema = result;
      }
    if (schema.nullable === true && ctx.version === "openapi-3.0") baseSchema = z.nullable(baseSchema);
    if (schema.readOnly === true) baseSchema = z.readonly(baseSchema);
    if (schema.default !== undefined) baseSchema = baseSchema.default(schema.default);
    let extraMeta = {};
    let coreMetadataKeys = [
      "$id",
      "id",
      "$comment",
      "$anchor",
      "$vocabulary",
      "$dynamicRef",
      "$dynamicAnchor",
    ];
    for (let key of coreMetadataKeys) if (key in schema) extraMeta[key] = schema[key];
    let contentMetadataKeys = ["contentEncoding", "contentMediaType", "contentSchema"];
    for (let key of contentMetadataKeys) if (key in schema) extraMeta[key] = schema[key];
    if (schema.type === "object" && schema.$ref === undefined) {
      if (schema.propertyNames !== undefined && !containsRef(schema.propertyNames))
        extraMeta.propertyNames = schema.propertyNames;
      for (let key of ["minProperties", "maxProperties"])
        if (schema[key] !== undefined) extraMeta[key] = schema[key];
    }
    if (schema.type === "array" && schema.$ref === undefined) {
      if (schema.contains !== undefined && !containsRef(schema.contains))
        extraMeta.contains = schema.contains;
      for (let key of ["uniqueItems", "minContains", "maxContains"])
        if (schema[key] !== undefined) extraMeta[key] = schema[key];
    }
    for (let key of Object.keys(schema))
      if (!RECOGNIZED_KEYS.has(key)) util_js_1.assignProp(extraMeta, key, schema[key]);
    if (Object.keys(extraMeta).length > 0) ctx.registry.add(baseSchema, extraMeta);
    if (schema.description) baseSchema = baseSchema.describe(schema.description);
    return baseSchema;
  }
  function fromJSONSchema(schema, params) {
    if (typeof schema === "boolean") return schema ? z.any() : z.never();
    let normalized;
    try {
      normalized = JSON.parse(JSON.stringify(schema));
    } catch {
      throw Error(
        "fromJSONSchema input is not valid JSON (possibly cyclic); use $defs/$ref for recursive schemas",
      );
    }
    let version = detectVersion(normalized, params?.defaultTarget);
    let defs = normalized.$defs || normalized.definitions || {};
    let ctx = {
      version,
      defs,
      refs: new Map(),
      processing: new Set(),
      rootSchema: normalized,
      registry: params?.registry ?? registries_js_1.globalRegistry,
    };
    return convertSchema(normalized, ctx);
  }
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
export { require_from_json_schema };
