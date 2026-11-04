/**
 * zod/v4/core/json-schema-processors.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-7vp249v4.js (12), chunk-dcmhvw5a.js (1)
 * attribution: esm-layout 2, esm-fingerprint 11
 */
import { NUMBER_FORMAT_RANGES, BIGINT_FORMAT_RANGES, getEnumValues, assignProp } from "./util.js";
import { base64Charset, base64urlCharset } from "./schemas.js";
import { base64, base64url, number, integer } from "./regexes.js";
import {
  handleUnrepresentable,
  processSchema,
  isTransforming,
  initializeContext,
  extractDefs,
  finalize,
} from "./to-json-schema.js";

//@ chunk-7vp249v4.js:65890-67028 esm-layout
var narrowMin = (agg, key, value) => {
  if (agg[key] === undefined || value > agg[key]) agg[key] = value;
};
var narrowMax = (agg, key, value) => {
  if (agg[key] === undefined || value < agg[key]) agg[key] = value;
};
var narrowBoth = (agg, value) => {
  narrowMin(agg, "minimum", value);
  narrowMax(agg, "maximum", value);
};
var addDivisor = (agg, value) => {
  agg.multipleOf ?? (agg.multipleOf = []);
  if (!agg.multipleOf.includes(value)) agg.multipleOf.push(value);
};
var addPattern = (agg, pattern) => {
  agg.patterns ?? (agg.patterns = new Set());
  agg.patterns.add(pattern);
};
var intersectMime = (agg, mime) => {
  agg.mime = agg.mime ? agg.mime.filter((m) => mime.includes(m)) : [...mime];
};
var setFormat = (agg, format) => {
  agg.format = format;
  if (format.includes("int")) agg.isInt = true;
};
var minContributor = (agg, def) => narrowMin(agg, "minimum", def.minimum);
var maxContributor = (agg, def) => narrowMax(agg, "maximum", def.maximum);
var formatContributor = (ranges) => (agg, def) => {
  setFormat(agg, def.format);
  let [minimum, maximum] = ranges[def.format];
  narrowMin(agg, "minimum", minimum);
  narrowMax(agg, "maximum", maximum);
};
var contributors = {
  greater_than: (agg, def) => narrowMin(agg, def.inclusive ? "minimum" : "exclusiveMinimum", def.value),
  less_than: (agg, def) => narrowMax(agg, def.inclusive ? "maximum" : "exclusiveMaximum", def.value),
  multiple_of: (agg, def) => addDivisor(agg, def.value),
  number_format: formatContributor(NUMBER_FORMAT_RANGES),
  bigint_format: formatContributor(BIGINT_FORMAT_RANGES),
  min_length: minContributor,
  max_length: maxContributor,
  length_equals: (agg, def) => narrowBoth(agg, def.length),
  min_size: minContributor,
  max_size: maxContributor,
  size_equals: (agg, def) => narrowBoth(agg, def.size),
  string_format: (agg, def) => {
    setFormat(agg, def.format);
    if (def.pattern) addPattern(agg, def.pattern);
    if (def.format === "base64" || def.format === "base64url") agg.contentEncoding = def.format;
    if (def.local || def.precision === -1) agg.laxFormat = true;
  },
  mime_type: (agg, def) => intersectMime(agg, def.mime),
};
//@ chunk-7vp249v4.js:67028-67644 esm-fingerprint
function aggregateChecks(schema) {
  let agg = {};
  let def = schema._zod.def;
  let list = schema._zod.traits.has("$ZodCheck") ? [schema, ...(def.checks ?? [])] : (def.checks ?? []);
  for (let ch of list) contributors[ch._zod.def.check]?.(agg, ch._zod.def);
  let bag = schema._zod.bag;
  if (bag.minimum !== undefined) narrowMin(agg, "minimum", bag.minimum);
  if (bag.exclusiveMinimum !== undefined) narrowMin(agg, "exclusiveMinimum", bag.exclusiveMinimum);
  if (bag.maximum !== undefined) narrowMax(agg, "maximum", bag.maximum);
  if (bag.exclusiveMaximum !== undefined) narrowMax(agg, "exclusiveMaximum", bag.exclusiveMaximum);
  if (bag.multipleOf !== undefined) addDivisor(agg, bag.multipleOf);
  if (bag.format !== undefined) {
    agg.format ?? (agg.format = bag.format);
    if (bag.format.includes("int")) agg.isInt = true;
  }
  if (bag.mime) intersectMime(agg, bag.mime);
  for (let pattern of bag.patterns ?? []) addPattern(agg, pattern);
  return agg;
}
//@ chunk-7vp249v4.js:67644-71734 esm-fingerprint
var formatMap = {
  guid: "uuid",
  url: "uri",
  datetime: "date-time",
  json_string: "json-string",
  regex: "",
};
var exactPatterns = new Map([
  [base64Charset, base64],
  [base64urlCharset, base64url],
]);
var exactPattern = (p) => exactPatterns.get(p) ?? p;
var stringProcessor = (schema, ctx, _json, _params) => {
  let json = _json;
  json.type = "string";
  let { minimum, maximum, format, patterns, contentEncoding, laxFormat } = aggregateChecks(schema);
  if (typeof minimum === "number") json.minLength = minimum;
  if (typeof maximum === "number") json.maxLength = maximum;
  if (format) {
    json.format = formatMap[format] ?? format;
    if (json.format === "") delete json.format;
    if (format === "time" || laxFormat) delete json.format;
  }
  if (contentEncoding) json.contentEncoding = contentEncoding;
  if (patterns && patterns.size > 0) {
    let patternList = [...patterns].map(exactPattern);
    if (patternList.length === 1) json.pattern = patternList[0].source;
    else if (patternList.length > 1)
      json.allOf = [
        ...patternList.map((regex) => ({
          ...(ctx.target === "draft-07" || ctx.target === "draft-04" || ctx.target === "openapi-3.0"
            ? {
                type: "string",
              }
            : {}),
          pattern: regex.source,
        })),
      ];
  }
};
var numberProcessor = (schema, ctx, _json, params) => {
  let json = _json;
  let { minimum, maximum, multipleOf, exclusiveMaximum, exclusiveMinimum, isInt } = aggregateChecks(schema);
  json.type = isInt ? "integer" : "number";
  let exMin =
    typeof exclusiveMinimum === "number" && exclusiveMinimum >= (minimum ?? Number.NEGATIVE_INFINITY);
  let exMax =
    typeof exclusiveMaximum === "number" && exclusiveMaximum <= (maximum ?? Number.POSITIVE_INFINITY);
  let legacy = ctx.target === "draft-04" || ctx.target === "openapi-3.0";
  if (exMin) {
    if (legacy) {
      json.minimum = exclusiveMinimum;
      json.exclusiveMinimum = true;
    } else json.exclusiveMinimum = exclusiveMinimum;
  } else if (typeof minimum === "number") json.minimum = minimum;
  if (exMax) {
    if (legacy) {
      json.maximum = exclusiveMaximum;
      json.exclusiveMaximum = true;
    } else json.exclusiveMaximum = exclusiveMaximum;
  } else if (typeof maximum === "number") json.maximum = maximum;
  if (multipleOf) {
    let divisors = new Set();
    for (let divisor of multipleOf)
      if (Number.isFinite(divisor) && divisor !== 0) divisors.add(Math.abs(divisor));
      else
        handleUnrepresentable(
          schema,
          ctx,
          json,
          params,
          `A multipleOf divisor of ${divisor} cannot be represented in JSON Schema`,
        );
    let [first, ...rest] = divisors;
    if (first !== undefined) json.multipleOf = first;
    if (rest.length)
      json.allOf = [
        ...(json.allOf ?? []),
        ...rest.map((m) => ({
          multipleOf: m,
        })),
      ];
  }
};
var booleanProcessor = (_schema, _ctx, json, _params) => {
  json.type = "boolean";
};
var bigintProcessor = (schema, ctx, json, params) => {
  handleUnrepresentable(schema, ctx, json, params, "BigInt cannot be represented in JSON Schema");
};
var symbolProcessor = (schema, ctx, json, params) => {
  handleUnrepresentable(schema, ctx, json, params, "Symbols cannot be represented in JSON Schema");
};
var nullProcessor = (_schema, ctx, json, _params) => {
  if (ctx.target === "openapi-3.0") {
    json.type = "string";
    json.nullable = true;
    json.enum = [null];
  } else json.type = "null";
};
var undefinedProcessor = (schema, ctx, json, params) => {
  handleUnrepresentable(schema, ctx, json, params, "Undefined cannot be represented in JSON Schema");
};
var voidProcessor = (schema, ctx, json, params) => {
  handleUnrepresentable(schema, ctx, json, params, "Void cannot be represented in JSON Schema");
};
var neverProcessor = (inst, ctx, json, params) => {
  json.not = {};
};
var anyProcessor = (inst, ctx, json, params) => {};
var unknownProcessor = (inst, ctx, json, params) => {};
var dateProcessor = (schema, ctx, json, params) => {
  handleUnrepresentable(schema, ctx, json, params, "Date cannot be represented in JSON Schema");
};
var enumProcessor = (schema, _ctx, json, _params) => {
  let def = schema._zod.def;
  let values = getEnumValues(def.entries);
  if (values.length === 0) {
    json.not = {};
    return;
  }
  if (values.every((v) => typeof v === "number")) json.type = "number";
  if (values.every((v) => typeof v === "string")) json.type = "string";
  json.enum = values;
};
var literalProcessor = (schema, ctx, json, params) => {
  let def = schema._zod.def;
  if (def.values.length === 0) {
    json.not = {};
    return;
  }
  let vals = [];
  for (let val of def.values)
    if (val === undefined) {
      if (
        handleUnrepresentable(
          schema,
          ctx,
          json,
          params,
          "Literal `undefined` cannot be represented in JSON Schema",
        )
      )
        return;
    } else if (typeof val === "bigint") {
      if (
        handleUnrepresentable(
          schema,
          ctx,
          json,
          params,
          "BigInt literals cannot be represented in JSON Schema",
        )
      )
        return;
      vals.push(Number(val));
    } else vals.push(val);
  if (vals.length === 0);
  else if (vals.length === 1) {
    let val = vals[0];
    json.type = val === null ? "null" : typeof val;
    if (ctx.target === "draft-04" || ctx.target === "openapi-3.0") json.enum = [val];
    else json.const = val;
  } else {
    if (vals.every((v) => typeof v === "number")) json.type = "number";
    if (vals.every((v) => typeof v === "string")) json.type = "string";
    if (vals.every((v) => typeof v === "boolean")) json.type = "boolean";
    if (vals.every((v) => v === null)) json.type = "null";
    json.enum = vals;
  }
};
var nanProcessor = (schema, ctx, json, params) => {
  handleUnrepresentable(schema, ctx, json, params, "NaN cannot be represented in JSON Schema");
};
var templateLiteralProcessor = (schema, _ctx, json, _params) => {
  let _json = json;
  let pattern = schema._zod.pattern;
  if (!pattern) throw Error("Pattern not found in template literal");
  _json.type = "string";
  _json.pattern = pattern.source;
};
var fileProcessor = (schema, _ctx, json, _params) => {
  let _json = json;
  _json.type = "string";
  _json.format = "binary";
  _json.contentEncoding = "binary";
  let { minimum, maximum, mime } = aggregateChecks(schema);
  if (minimum !== undefined) _json.minLength = minimum;
  if (maximum !== undefined) _json.maxLength = maximum;
  if (!mime) return;
  if (mime.length === 0) _json.not = {};
  else if (mime.length === 1) _json.contentMediaType = mime[0];
  else
    _json.anyOf = mime.map((m) => ({
      contentMediaType: m,
    }));
};
var successProcessor = (_schema, _ctx, json, _params) => {
  json.type = "boolean";
};
var customProcessor = (schema, ctx, json, params) => {
  handleUnrepresentable(schema, ctx, json, params, "Custom types cannot be represented in JSON Schema");
};
var functionProcessor = (schema, ctx, json, params) => {
  handleUnrepresentable(schema, ctx, json, params, "Function types cannot be represented in JSON Schema");
};
var transformProcessor = (schema, ctx, json, params) => {
  handleUnrepresentable(schema, ctx, json, params, "Transforms cannot be represented in JSON Schema");
};
var mapProcessor = (schema, ctx, json, params) => {
  handleUnrepresentable(schema, ctx, json, params, "Map cannot be represented in JSON Schema");
};
var setProcessor = (schema, ctx, json, params) => {
  handleUnrepresentable(schema, ctx, json, params, "Set cannot be represented in JSON Schema");
};
var arrayProcessor = (schema, ctx, _json, params) => {
  let json = _json;
  let def = schema._zod.def;
  let { minimum, maximum } = aggregateChecks(schema);
  if (typeof minimum === "number") json.minItems = minimum;
  if (typeof maximum === "number") json.maxItems = maximum;
  json.type = "array";
  json.items = processSchema(def.element, ctx, {
    ...params,
    path: [...params.path, "items"],
  });
};
//@ chunk-7vp249v4.js:71734-71901 esm-fingerprint
function inputOptin(schema) {
  let def = schema._zod.def;
  if (def.type === "pipe" && def.in._zod.traits.has("$ZodTransform")) return inputOptin(def.out);
  if (def.type === "catch") return inputOptin(def.innerType);
  return schema._zod.optin;
}
//@ chunk-7vp249v4.js:71901-74555 esm-fingerprint
var objectProcessor = (schema, ctx, _json, params) => {
  let json = _json;
  let def = schema._zod.def;
  let shape = def.shape;
  if (
    Object.getOwnPropertySymbols(shape).length &&
    handleUnrepresentable(schema, ctx, json, params, "Symbol keys cannot be represented in JSON Schema")
  )
    return;
  json.type = "object";
  json.properties = {};
  for (let key in shape)
    assignProp(
      json.properties,
      key,
      processSchema(shape[key], ctx, {
        ...params,
        path: [...params.path, "properties", key],
      }),
    );
  let allKeys = new Set(Object.keys(shape));
  let requiredKeys = new Set(
    [...allKeys].filter((key) => {
      let field = def.shape[key];
      if (ctx.io === "input") return inputOptin(field) === undefined;
      else return field._zod.optout === undefined;
    }),
  );
  if (requiredKeys.size > 0) json.required = Array.from(requiredKeys);
  if (def.catchall?._zod.def.type === "never") json.additionalProperties = false;
  else if (!def.catchall) {
    if (ctx.io === "output") json.additionalProperties = false;
  } else if (def.catchall)
    json.additionalProperties = processSchema(def.catchall, ctx, {
      ...params,
      path: [...params.path, "additionalProperties"],
    });
};
var propertiesProcessor = (schema, ctx, _json, params) => {
  let json = _json;
  let def = schema._zod.def;
  if (
    Object.getOwnPropertySymbols(def.shape).length &&
    handleUnrepresentable(schema, ctx, json, params, "Symbol keys cannot be represented in JSON Schema")
  )
    return;
  if (ctx.io === "output") {
    for (let key in def.shape)
      if (
        isTransforming(def.shape[key]) &&
        handleUnrepresentable(
          schema,
          ctx,
          json,
          params,
          `z.properties() returns its input, so the output of a transforming schema at key "${key}" cannot be represented in JSON Schema`,
        )
      )
        return;
  }
  json.type = "object";
  json.properties = {};
  for (let key in def.shape)
    assignProp(
      json.properties,
      key,
      processSchema(def.shape[key], ctx, {
        ...params,
        path: [...params.path, "properties", key],
      }),
    );
  let required = Object.keys(def.shape).filter((key) => inputOptin(def.shape[key]) === undefined);
  if (required.length > 0) json.required = required;
};
var unionProcessor = (schema, ctx, json, params) => {
  let def = schema._zod.def;
  let isExclusive = def.inclusive === false;
  let options = def.options.map((x, i) =>
    processSchema(x, ctx, {
      ...params,
      path: [...params.path, isExclusive ? "oneOf" : "anyOf", i],
    }),
  );
  if (isExclusive) json.oneOf = options;
  else json.anyOf = options;
};
var intersectionProcessor = (schema, ctx, json, params) => {
  let def = schema._zod.def;
  let a_2 = processSchema(def.left, ctx, {
    ...params,
    path: [...params.path, "allOf", 0],
  });
  let b = processSchema(def.right, ctx, {
    ...params,
    path: [...params.path, "allOf", 1],
  });
  let isSimpleIntersection = (val) => "allOf" in val && Object.keys(val).length === 1;
  let allOf = [
    ...(isSimpleIntersection(a_2) ? a_2.allOf : [a_2]),
    ...(isSimpleIntersection(b) ? b.allOf : [b]),
  ];
  json.allOf = allOf;
  ctx.intersections.push(allOf);
};
var tupleProcessor = (schema, ctx, _json, params) => {
  let json = _json;
  let def = schema._zod.def;
  json.type = "array";
  let prefixPath = ctx.target === "draft-2020-12" ? "prefixItems" : "items";
  let restPath =
    ctx.target === "draft-2020-12" ? "items" : ctx.target === "openapi-3.0" ? "items" : "additionalItems";
  let prefixItems = def.items.map((x_2, i) =>
    processSchema(x_2, ctx, {
      ...params,
      path: [...params.path, prefixPath, i],
    }),
  );
  let rest = def.rest
    ? processSchema(def.rest, ctx, {
        ...params,
        path: [...params.path, restPath, ...(ctx.target === "openapi-3.0" ? [def.items.length] : [])],
      })
    : null;
  let minItems = def.items.length;
  while (minItems > 0) {
    let item = def.items[minItems - 1];
    if (!(ctx.io === "input" ? inputOptin(item) !== undefined : item._zod.optout === "optional")) break;
    minItems--;
  }
  let maxItems = def.items.length;
  let isClosed = !def.rest;
  if (ctx.target === "draft-2020-12") {
    json.prefixItems = prefixItems;
    if (isClosed) json.items = false;
    else if (rest) json.items = rest;
    if (minItems > 0) json.minItems = minItems;
    if (isClosed) json.maxItems = maxItems;
  } else if (ctx.target === "openapi-3.0") {
    json.items = {
      anyOf: prefixItems,
    };
    if (rest) json.items.anyOf.push(rest);
    if (minItems > 0) json.minItems = minItems;
    if (isClosed) json.maxItems = maxItems;
  } else {
    json.items = prefixItems;
    if (isClosed) json.additionalItems = false;
    else if (rest) json.additionalItems = rest;
    if (minItems > 0) json.minItems = minItems;
    if (isClosed) json.maxItems = maxItems;
  }
  let { minimum, maximum } = aggregateChecks(schema);
  if (typeof minimum === "number") json.minItems = minimum;
  if (typeof maximum === "number") json.maxItems = maximum;
};
//@ chunk-7vp249v4.js:74555-75344 esm-fingerprint
function stringifyKeyNames(bySchema, json, visited) {
  if (json.$ref) {
    if (visited.has(json)) return json;
    visited.add(json);
    let def = bySchema.get(json)?.def;
    if (!def) return json;
    let inlined = stringifyKeyNames(bySchema, def, visited);
    return inlined === def ? json : inlined;
  }
  for (let keyword of ["anyOf", "oneOf"]) {
    let branches = json[keyword];
    if (!Array.isArray(branches)) continue;
    let mapped = branches.map((branch) => stringifyKeyNames(bySchema, branch, visited));
    if (mapped.some((branch, i) => branch !== branches[i]))
      json = {
        ...json,
        [keyword]: mapped,
      };
  }
  let types = Array.isArray(json.type) ? json.type : [json.type];
  let numericType = !types.includes("string") && types.some((t) => t === "number" || t === "integer");
  let values = json.enum ?? (json.const !== undefined ? [json.const] : undefined);
  if (!numericType && !values?.some((v) => typeof v === "number")) return json;
  let { minimum, maximum, exclusiveMinimum, exclusiveMaximum, multipleOf, format, id, ...rest } = json;
  if (rest.enum) rest.enum = rest.enum.map((v) => (typeof v === "number" ? String(v) : v));
  else if (typeof rest.const === "number") rest.const = String(rest.const);
  if (!numericType) return rest;
  rest.type = "string";
  if (!values) rest.pattern = (types.includes("number") ? number : integer).source;
  return rest;
}
//@ chunk-7vp249v4.js:75344-75363 esm-layout
var pendingRecords = new WeakMap();
//@ chunk-7vp249v4.js:75363-75773 esm-fingerprint
function rewriteKeyNames(ctx) {
  let bySchema = new Map();
  for (let entry of ctx.seen.values())
    if (entry.def && !bySchema.has(entry.schema)) bySchema.set(entry.schema, entry);
  let rewrites = new Map();
  for (let record of pendingRecords.get(ctx) ?? []) {
    let seen = ctx.seen.get(record);
    let names = (seen?.def ?? seen?.schema)?.propertyNames;
    if (!names || names === true || rewrites.has(names)) continue;
    let rewritten = stringifyKeyNames(bySchema, names, new Set());
    if (rewritten !== names) rewrites.set(names, rewritten);
  }
  if (!rewrites.size) return;
  for (let entry of ctx.seen.values())
    for (let carrier of [entry.schema, entry.def]) {
      let rewritten = carrier && rewrites.get(carrier.propertyNames);
      if (rewritten) carrier.propertyNames = rewritten;
    }
}
//@ chunk-7vp249v4.js:75773-76797 esm-fingerprint
var recordProcessor = (schema, ctx, _json, params) => {
  let json = _json;
  let def = schema._zod.def;
  json.type = "object";
  let keyType = def.keyType;
  let patterns = aggregateChecks(keyType).patterns;
  if (def.mode === "loose" && patterns && patterns.size > 0) {
    let valueSchema = processSchema(def.valueType, ctx, {
      ...params,
      path: [...params.path, "patternProperties", "*"],
    });
    json.patternProperties = {};
    for (let pattern of patterns)
      assignProp(json.patternProperties, exactPattern(pattern).source, valueSchema);
  } else {
    if (ctx.target === "draft-07" || ctx.target === "draft-2020-12") {
      json.propertyNames = processSchema(def.keyType, ctx, {
        ...params,
        path: [...params.path, "propertyNames"],
      });
      let pending = pendingRecords.get(ctx);
      if (!pending) {
        pending = [];
        pendingRecords.set(ctx, pending);
        ctx.deferred.push(() => rewriteKeyNames(ctx));
      }
      pending.push(schema);
    }
    json.additionalProperties = processSchema(def.valueType, ctx, {
      ...params,
      path: [...params.path, "additionalProperties"],
    });
  }
  let keyValues = keyType._zod.values;
  let omittableOnInput = ctx.io === "input" && inputOptin(def.valueType) !== undefined;
  if (keyValues && !def.partial && !omittableOnInput) {
    let validKeyValues = [...keyValues].filter((v) => typeof v === "string" || typeof v === "number");
    if (validKeyValues.length > 0) json.required = validKeyValues.map(String);
  }
};
var nullableProcessor = (schema, ctx, json, params) => {
  let def = schema._zod.def;
  let inner = processSchema(def.innerType, ctx, params);
  let seen = ctx.seen.get(schema);
  if (ctx.target === "openapi-3.0") {
    seen.ref = def.innerType;
    json.nullable = true;
  } else
    json.anyOf = [
      inner,
      {
        type: "null",
      },
    ];
};
var nonoptionalProcessor = (schema, ctx, _json, params) => {
  let def = schema._zod.def;
  processSchema(def.innerType, ctx, params);
  let seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
};
var UNREPRESENTABLE_DEFAULT = Symbol();
//@ chunk-7vp249v4.js:76797-77010 esm-fingerprint
function serializeDefaultValue(value, schema, ctx, json, params) {
  let unrepresentable = false;
  let serialized = JSON.stringify(value, (_, val) => {
    if (typeof val !== "bigint") return val;
    unrepresentable = true;
    return null;
  });
  if (!unrepresentable) return JSON.parse(serialized);
  handleUnrepresentable(schema, ctx, json, params, "BigInt defaults cannot be represented in JSON Schema");
  return UNREPRESENTABLE_DEFAULT;
}
//@ chunk-7vp249v4.js:77010-78481 esm-fingerprint
var defaultProcessor = (schema, ctx, json, params) => {
  let def = schema._zod.def;
  processSchema(def.innerType, ctx, params);
  let seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
  let value = serializeDefaultValue(def.defaultValue, schema, ctx, json, params);
  if (value !== UNREPRESENTABLE_DEFAULT) json.default = value;
};
var prefaultProcessor = (schema, ctx, json, params) => {
  let def = schema._zod.def;
  processSchema(def.innerType, ctx, params);
  let seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
  if (ctx.io !== "input") return;
  let value = serializeDefaultValue(def.defaultValue, schema, ctx, json, params);
  if (value !== UNREPRESENTABLE_DEFAULT) json._prefault = value;
};
var catchProcessor = (schema, ctx, json, params) => {
  let def = schema._zod.def;
  processSchema(def.innerType, ctx, params);
  let seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
  let catchValue;
  try {
    catchValue = def.catchValue(undefined);
  } catch {
    handleUnrepresentable(schema, ctx, json, params, "Dynamic catch values are not supported in JSON Schema");
    return;
  }
  json.default = catchValue;
};
var pipeProcessor = (schema, ctx, _json, params) => {
  let def = schema._zod.def;
  let inIsTransform = def.in._zod.traits.has("$ZodTransform");
  let innerType = ctx.io === "input" ? (inIsTransform ? def.out : def.in) : def.out;
  processSchema(innerType, ctx, params);
  let seen = ctx.seen.get(schema);
  seen.ref = innerType;
};
var readonlyProcessor = (schema, ctx, json, params) => {
  let def = schema._zod.def;
  processSchema(def.innerType, ctx, params);
  let seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
  json.readOnly = true;
};
var promiseProcessor = (schema, ctx, _json, params) => {
  let def = schema._zod.def;
  processSchema(def.innerType, ctx, params);
  let seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
};
var optionalProcessor = (schema, ctx, _json, params) => {
  let def = schema._zod.def;
  processSchema(def.innerType, ctx, params);
  let seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
};
var lazyProcessor = (schema, ctx, _json, params) => {
  let innerType = schema._zod.innerType;
  processSchema(innerType, ctx, params);
  let seen = ctx.seen.get(schema);
  seen.ref = innerType;
};
var allProcessors = {
  string: stringProcessor,
  number: numberProcessor,
  boolean: booleanProcessor,
  bigint: bigintProcessor,
  symbol: symbolProcessor,
  null: nullProcessor,
  undefined: undefinedProcessor,
  void: voidProcessor,
  never: neverProcessor,
  any: anyProcessor,
  unknown: unknownProcessor,
  date: dateProcessor,
  enum: enumProcessor,
  literal: literalProcessor,
  nan: nanProcessor,
  template_literal: templateLiteralProcessor,
  file: fileProcessor,
  success: successProcessor,
  custom: customProcessor,
  properties: propertiesProcessor,
  function: functionProcessor,
  transform: transformProcessor,
  map: mapProcessor,
  set: setProcessor,
  array: arrayProcessor,
  object: objectProcessor,
  union: unionProcessor,
  intersection: intersectionProcessor,
  tuple: tupleProcessor,
  record: recordProcessor,
  nullable: nullableProcessor,
  nonoptional: nonoptionalProcessor,
  default: defaultProcessor,
  prefault: prefaultProcessor,
  catch: catchProcessor,
  pipe: pipeProcessor,
  readonly: readonlyProcessor,
  promise: promiseProcessor,
  optional: optionalProcessor,
  lazy: lazyProcessor,
};
//@ chunk-7vp249v4.js:78481-78914 esm-fingerprint
function toJSONSchema(input, params) {
  if ("_idmap" in input) {
    let registry = input;
    let ctx = initializeContext({
      ...params,
      processors: allProcessors,
    });
    let defs = {};
    for (let entry of registry._idmap.entries()) {
      let [_, schema] = entry;
      processSchema(schema, ctx);
    }
    let schemas = {};
    let external = {
      registry,
      uri: params?.uri,
      defs,
    };
    ctx.external = external;
    for (let entry of registry._idmap.entries()) {
      let [key, schema] = entry;
      extractDefs(ctx, schema);
      assignProp(schemas, key, finalize(ctx, schema));
    }
    if (Object.keys(defs).length > 0) {
      let defsSegment = ctx.target === "draft-2020-12" ? "$defs" : "definitions";
      schemas.__shared = {
        [defsSegment]: defs,
      };
    }
    return {
      schemas,
    };
  }
  let ctx = initializeContext({
    ...params,
    processors: allProcessors,
  });
  processSchema(input, ctx);
  extractDefs(ctx, input);
  return finalize(ctx, input);
}
//@ chunk-dcmhvw5a.js:431253-431399 esm-fingerprint
var plainFormatChecks = new Set(["starts_with", "ends_with", "includes"]);
var formatAliases = {
  guid: "uuid",
  url: "uri",
  datetime: "date-time",
  json_string: "json-string",
  regex: "",
  time: "",
};
export {
  plainFormatChecks,
  formatAliases,
  stringProcessor,
  aggregateChecks,
  numberProcessor,
  booleanProcessor,
  undefinedProcessor,
  nullProcessor,
  anyProcessor,
  unknownProcessor,
  neverProcessor,
  arrayProcessor,
  objectProcessor,
  unionProcessor,
  intersectionProcessor,
  tupleProcessor,
  recordProcessor,
  enumProcessor,
  literalProcessor,
  transformProcessor,
  optionalProcessor,
  nullableProcessor,
  defaultProcessor,
  prefaultProcessor,
  nonoptionalProcessor,
  catchProcessor,
  pipeProcessor,
  readonlyProcessor,
  lazyProcessor,
  customProcessor,
  toJSONSchema,
};
