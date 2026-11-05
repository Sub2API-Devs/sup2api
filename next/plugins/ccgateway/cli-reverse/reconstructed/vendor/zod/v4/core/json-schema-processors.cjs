/**
 * zod/v4/core/json-schema-processors.cjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1hnjmk23.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_regexes } from "./regexes.cjs";
import { require_schemas } from "./schemas.cjs";
import { require_to_json_schema } from "./to-json-schema.cjs";
import { require_util } from "./util.cjs";

//@ chunk-1hnjmk23.js:566807-584418 cjs-fingerprint
var require_json_schema_processors = __commonJS(function (cjsExports) {
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
  cjsExports.allProcessors =
    cjsExports.lazyProcessor =
    cjsExports.optionalProcessor =
    cjsExports.promiseProcessor =
    cjsExports.readonlyProcessor =
    cjsExports.pipeProcessor =
    cjsExports.catchProcessor =
    cjsExports.prefaultProcessor =
    cjsExports.defaultProcessor =
    cjsExports.nonoptionalProcessor =
    cjsExports.nullableProcessor =
    cjsExports.recordProcessor =
    cjsExports.tupleProcessor =
    cjsExports.intersectionProcessor =
    cjsExports.unionProcessor =
    cjsExports.propertiesProcessor =
    cjsExports.objectProcessor =
    cjsExports.arrayProcessor =
    cjsExports.setProcessor =
    cjsExports.mapProcessor =
    cjsExports.transformProcessor =
    cjsExports.functionProcessor =
    cjsExports.customProcessor =
    cjsExports.successProcessor =
    cjsExports.fileProcessor =
    cjsExports.templateLiteralProcessor =
    cjsExports.nanProcessor =
    cjsExports.literalProcessor =
    cjsExports.enumProcessor =
    cjsExports.dateProcessor =
    cjsExports.unknownProcessor =
    cjsExports.anyProcessor =
    cjsExports.neverProcessor =
    cjsExports.voidProcessor =
    cjsExports.undefinedProcessor =
    cjsExports.nullProcessor =
    cjsExports.symbolProcessor =
    cjsExports.bigintProcessor =
    cjsExports.booleanProcessor =
    cjsExports.numberProcessor =
    cjsExports.stringProcessor =
      undefined;
  cjsExports.aggregateChecks = aggregateChecks;
  cjsExports.toJSONSchema = toJSONSchema;
  var regexes = __importStar(require_regexes());
  var schemas_js_1 = require_schemas();
  var to_json_schema_js_1 = require_to_json_schema();
  var util_js_1 = require_util();
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
    number_format: formatContributor(util_js_1.NUMBER_FORMAT_RANGES),
    bigint_format: formatContributor(util_js_1.BIGINT_FORMAT_RANGES),
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
  var formatMap = {
    guid: "uuid",
    url: "uri",
    datetime: "date-time",
    json_string: "json-string",
    regex: "",
  };
  var exactPatterns = new Map([
    [schemas_js_1.base64Charset, regexes.base64],
    [schemas_js_1.base64urlCharset, regexes.base64url],
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
  cjsExports.stringProcessor = stringProcessor;
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
          to_json_schema_js_1.handleUnrepresentable(
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
  cjsExports.numberProcessor = numberProcessor;
  var booleanProcessor = (_schema, _ctx, json, _params) => {
    json.type = "boolean";
  };
  cjsExports.booleanProcessor = booleanProcessor;
  var bigintProcessor = (schema, ctx, json, params) => {
    to_json_schema_js_1.handleUnrepresentable(
      schema,
      ctx,
      json,
      params,
      "BigInt cannot be represented in JSON Schema",
    );
  };
  cjsExports.bigintProcessor = bigintProcessor;
  var symbolProcessor = (schema, ctx, json, params) => {
    to_json_schema_js_1.handleUnrepresentable(
      schema,
      ctx,
      json,
      params,
      "Symbols cannot be represented in JSON Schema",
    );
  };
  cjsExports.symbolProcessor = symbolProcessor;
  var nullProcessor = (_schema, ctx, json, _params) => {
    if (ctx.target === "openapi-3.0") {
      json.type = "string";
      json.nullable = true;
      json.enum = [null];
    } else json.type = "null";
  };
  cjsExports.nullProcessor = nullProcessor;
  var undefinedProcessor = (schema, ctx, json, params) => {
    to_json_schema_js_1.handleUnrepresentable(
      schema,
      ctx,
      json,
      params,
      "Undefined cannot be represented in JSON Schema",
    );
  };
  cjsExports.undefinedProcessor = undefinedProcessor;
  var voidProcessor = (schema, ctx, json, params) => {
    to_json_schema_js_1.handleUnrepresentable(
      schema,
      ctx,
      json,
      params,
      "Void cannot be represented in JSON Schema",
    );
  };
  cjsExports.voidProcessor = voidProcessor;
  var neverProcessor = (_schema, _ctx, json, _params) => {
    json.not = {};
  };
  cjsExports.neverProcessor = neverProcessor;
  var anyProcessor = (_schema, _ctx, _json, _params) => {};
  cjsExports.anyProcessor = anyProcessor;
  var unknownProcessor = (_schema, _ctx, _json, _params) => {};
  cjsExports.unknownProcessor = unknownProcessor;
  var dateProcessor = (schema, ctx, json, params) => {
    to_json_schema_js_1.handleUnrepresentable(
      schema,
      ctx,
      json,
      params,
      "Date cannot be represented in JSON Schema",
    );
  };
  cjsExports.dateProcessor = dateProcessor;
  var enumProcessor = (schema, _ctx, json, _params) => {
    let def = schema._zod.def;
    let values = util_js_1.getEnumValues(def.entries);
    if (values.length === 0) {
      json.not = {};
      return;
    }
    if (values.every((v) => typeof v === "number")) json.type = "number";
    if (values.every((v) => typeof v === "string")) json.type = "string";
    json.enum = values;
  };
  cjsExports.enumProcessor = enumProcessor;
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
          to_json_schema_js_1.handleUnrepresentable(
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
          to_json_schema_js_1.handleUnrepresentable(
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
  cjsExports.literalProcessor = literalProcessor;
  var nanProcessor = (schema, ctx, json, params) => {
    to_json_schema_js_1.handleUnrepresentable(
      schema,
      ctx,
      json,
      params,
      "NaN cannot be represented in JSON Schema",
    );
  };
  cjsExports.nanProcessor = nanProcessor;
  var templateLiteralProcessor = (schema, _ctx, json, _params) => {
    let _json = json;
    let pattern = schema._zod.pattern;
    if (!pattern) throw Error("Pattern not found in template literal");
    _json.type = "string";
    _json.pattern = pattern.source;
  };
  cjsExports.templateLiteralProcessor = templateLiteralProcessor;
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
  cjsExports.fileProcessor = fileProcessor;
  var successProcessor = (_schema, _ctx, json, _params) => {
    json.type = "boolean";
  };
  cjsExports.successProcessor = successProcessor;
  var customProcessor = (schema, ctx, json, params) => {
    to_json_schema_js_1.handleUnrepresentable(
      schema,
      ctx,
      json,
      params,
      "Custom types cannot be represented in JSON Schema",
    );
  };
  cjsExports.customProcessor = customProcessor;
  var functionProcessor = (schema, ctx, json, params) => {
    to_json_schema_js_1.handleUnrepresentable(
      schema,
      ctx,
      json,
      params,
      "Function types cannot be represented in JSON Schema",
    );
  };
  cjsExports.functionProcessor = functionProcessor;
  var transformProcessor = (schema, ctx, json, params) => {
    to_json_schema_js_1.handleUnrepresentable(
      schema,
      ctx,
      json,
      params,
      "Transforms cannot be represented in JSON Schema",
    );
  };
  cjsExports.transformProcessor = transformProcessor;
  var mapProcessor = (schema, ctx, json, params) => {
    to_json_schema_js_1.handleUnrepresentable(
      schema,
      ctx,
      json,
      params,
      "Map cannot be represented in JSON Schema",
    );
  };
  cjsExports.mapProcessor = mapProcessor;
  var setProcessor = (schema, ctx, json, params) => {
    to_json_schema_js_1.handleUnrepresentable(
      schema,
      ctx,
      json,
      params,
      "Set cannot be represented in JSON Schema",
    );
  };
  cjsExports.setProcessor = setProcessor;
  var arrayProcessor = (schema, ctx, _json, params) => {
    let json = _json;
    let def = schema._zod.def;
    let { minimum, maximum } = aggregateChecks(schema);
    if (typeof minimum === "number") json.minItems = minimum;
    if (typeof maximum === "number") json.maxItems = maximum;
    json.type = "array";
    json.items = to_json_schema_js_1.processSchema(def.element, ctx, {
      ...params,
      path: [...params.path, "items"],
    });
  };
  cjsExports.arrayProcessor = arrayProcessor;
  function inputOptin(schema) {
    let def = schema._zod.def;
    if (def.type === "pipe" && def.in._zod.traits.has("$ZodTransform")) return inputOptin(def.out);
    if (def.type === "catch") return inputOptin(def.innerType);
    return schema._zod.optin;
  }
  var objectProcessor = (schema, ctx, _json, params) => {
    let json = _json;
    let def = schema._zod.def;
    let shape = def.shape;
    if (
      Object.getOwnPropertySymbols(shape).length &&
      to_json_schema_js_1.handleUnrepresentable(
        schema,
        ctx,
        json,
        params,
        "Symbol keys cannot be represented in JSON Schema",
      )
    )
      return;
    json.type = "object";
    json.properties = {};
    for (let key in shape)
      util_js_1.assignProp(
        json.properties,
        key,
        to_json_schema_js_1.processSchema(shape[key], ctx, {
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
      json.additionalProperties = to_json_schema_js_1.processSchema(def.catchall, ctx, {
        ...params,
        path: [...params.path, "additionalProperties"],
      });
  };
  cjsExports.objectProcessor = objectProcessor;
  var propertiesProcessor = (schema, ctx, _json, params) => {
    let json = _json;
    let def = schema._zod.def;
    if (
      Object.getOwnPropertySymbols(def.shape).length &&
      to_json_schema_js_1.handleUnrepresentable(
        schema,
        ctx,
        json,
        params,
        "Symbol keys cannot be represented in JSON Schema",
      )
    )
      return;
    if (ctx.io === "output") {
      for (let key in def.shape)
        if (
          to_json_schema_js_1.isTransforming(def.shape[key]) &&
          to_json_schema_js_1.handleUnrepresentable(
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
      util_js_1.assignProp(
        json.properties,
        key,
        to_json_schema_js_1.processSchema(def.shape[key], ctx, {
          ...params,
          path: [...params.path, "properties", key],
        }),
      );
    let required = Object.keys(def.shape).filter((key) => inputOptin(def.shape[key]) === undefined);
    if (required.length > 0) json.required = required;
  };
  cjsExports.propertiesProcessor = propertiesProcessor;
  var unionProcessor = (schema, ctx, json, params) => {
    let def = schema._zod.def;
    let isExclusive = def.inclusive === false;
    let options = def.options.map((x, i) =>
      to_json_schema_js_1.processSchema(x, ctx, {
        ...params,
        path: [...params.path, isExclusive ? "oneOf" : "anyOf", i],
      }),
    );
    if (isExclusive) json.oneOf = options;
    else json.anyOf = options;
  };
  cjsExports.unionProcessor = unionProcessor;
  var intersectionProcessor = (schema, ctx, json, params) => {
    let def = schema._zod.def;
    let a_2 = to_json_schema_js_1.processSchema(def.left, ctx, {
      ...params,
      path: [...params.path, "allOf", 0],
    });
    let b = to_json_schema_js_1.processSchema(def.right, ctx, {
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
  cjsExports.intersectionProcessor = intersectionProcessor;
  var tupleProcessor = (schema, ctx, _json, params) => {
    let json = _json;
    let def = schema._zod.def;
    json.type = "array";
    let prefixPath = ctx.target === "draft-2020-12" ? "prefixItems" : "items";
    let restPath =
      ctx.target === "draft-2020-12" ? "items" : ctx.target === "openapi-3.0" ? "items" : "additionalItems";
    let prefixItems = def.items.map((x, i) =>
      to_json_schema_js_1.processSchema(x, ctx, {
        ...params,
        path: [...params.path, prefixPath, i],
      }),
    );
    let rest = def.rest
      ? to_json_schema_js_1.processSchema(def.rest, ctx, {
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
  cjsExports.tupleProcessor = tupleProcessor;
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
    if (!values) rest.pattern = (types.includes("number") ? regexes.number : regexes.integer).source;
    return rest;
  }
  var pendingRecords = new WeakMap();
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
  var recordProcessor = (schema, ctx, _json, params) => {
    let json = _json;
    let def = schema._zod.def;
    json.type = "object";
    let keyType = def.keyType;
    let patterns = aggregateChecks(keyType).patterns;
    if (def.mode === "loose" && patterns && patterns.size > 0) {
      let valueSchema = to_json_schema_js_1.processSchema(def.valueType, ctx, {
        ...params,
        path: [...params.path, "patternProperties", "*"],
      });
      json.patternProperties = {};
      for (let pattern of patterns)
        util_js_1.assignProp(json.patternProperties, exactPattern(pattern).source, valueSchema);
    } else {
      if (ctx.target === "draft-07" || ctx.target === "draft-2020-12") {
        json.propertyNames = to_json_schema_js_1.processSchema(def.keyType, ctx, {
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
      json.additionalProperties = to_json_schema_js_1.processSchema(def.valueType, ctx, {
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
  cjsExports.recordProcessor = recordProcessor;
  var nullableProcessor = (schema, ctx, json, params) => {
    let def = schema._zod.def;
    let inner = to_json_schema_js_1.processSchema(def.innerType, ctx, params);
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
  cjsExports.nullableProcessor = nullableProcessor;
  var nonoptionalProcessor = (schema, ctx, _json, params) => {
    let def = schema._zod.def;
    to_json_schema_js_1.processSchema(def.innerType, ctx, params);
    let seen = ctx.seen.get(schema);
    seen.ref = def.innerType;
  };
  cjsExports.nonoptionalProcessor = nonoptionalProcessor;
  var UNREPRESENTABLE_DEFAULT = Symbol();
  function serializeDefaultValue(value, schema, ctx, json, params) {
    let unrepresentable = false;
    let serialized = JSON.stringify(value, (_, val) => {
      if (typeof val !== "bigint") return val;
      unrepresentable = true;
      return null;
    });
    if (!unrepresentable) return JSON.parse(serialized);
    to_json_schema_js_1.handleUnrepresentable(
      schema,
      ctx,
      json,
      params,
      "BigInt defaults cannot be represented in JSON Schema",
    );
    return UNREPRESENTABLE_DEFAULT;
  }
  var defaultProcessor = (schema, ctx, json, params) => {
    let def = schema._zod.def;
    to_json_schema_js_1.processSchema(def.innerType, ctx, params);
    let seen = ctx.seen.get(schema);
    seen.ref = def.innerType;
    let value = serializeDefaultValue(def.defaultValue, schema, ctx, json, params);
    if (value !== UNREPRESENTABLE_DEFAULT) json.default = value;
  };
  cjsExports.defaultProcessor = defaultProcessor;
  var prefaultProcessor = (schema, ctx, json, params) => {
    let def = schema._zod.def;
    to_json_schema_js_1.processSchema(def.innerType, ctx, params);
    let seen = ctx.seen.get(schema);
    seen.ref = def.innerType;
    if (ctx.io !== "input") return;
    let value = serializeDefaultValue(def.defaultValue, schema, ctx, json, params);
    if (value !== UNREPRESENTABLE_DEFAULT) json._prefault = value;
  };
  cjsExports.prefaultProcessor = prefaultProcessor;
  var catchProcessor = (schema, ctx, json, params) => {
    let def = schema._zod.def;
    to_json_schema_js_1.processSchema(def.innerType, ctx, params);
    let seen = ctx.seen.get(schema);
    seen.ref = def.innerType;
    let catchValue;
    try {
      catchValue = def.catchValue(undefined);
    } catch {
      to_json_schema_js_1.handleUnrepresentable(
        schema,
        ctx,
        json,
        params,
        "Dynamic catch values are not supported in JSON Schema",
      );
      return;
    }
    json.default = catchValue;
  };
  cjsExports.catchProcessor = catchProcessor;
  var pipeProcessor = (schema, ctx, _json, params) => {
    let def = schema._zod.def;
    let inIsTransform = def.in._zod.traits.has("$ZodTransform");
    let innerType = ctx.io === "input" ? (inIsTransform ? def.out : def.in) : def.out;
    to_json_schema_js_1.processSchema(innerType, ctx, params);
    let seen = ctx.seen.get(schema);
    seen.ref = innerType;
  };
  cjsExports.pipeProcessor = pipeProcessor;
  var readonlyProcessor = (schema, ctx, json, params) => {
    let def = schema._zod.def;
    to_json_schema_js_1.processSchema(def.innerType, ctx, params);
    let seen = ctx.seen.get(schema);
    seen.ref = def.innerType;
    json.readOnly = true;
  };
  cjsExports.readonlyProcessor = readonlyProcessor;
  var promiseProcessor = (schema, ctx, _json, params) => {
    let def = schema._zod.def;
    to_json_schema_js_1.processSchema(def.innerType, ctx, params);
    let seen = ctx.seen.get(schema);
    seen.ref = def.innerType;
  };
  cjsExports.promiseProcessor = promiseProcessor;
  var optionalProcessor = (schema, ctx, _json, params) => {
    let def = schema._zod.def;
    to_json_schema_js_1.processSchema(def.innerType, ctx, params);
    let seen = ctx.seen.get(schema);
    seen.ref = def.innerType;
  };
  cjsExports.optionalProcessor = optionalProcessor;
  var lazyProcessor = (schema, ctx, _json, params) => {
    let innerType = schema._zod.innerType;
    to_json_schema_js_1.processSchema(innerType, ctx, params);
    let seen = ctx.seen.get(schema);
    seen.ref = innerType;
  };
  cjsExports.lazyProcessor = lazyProcessor;
  cjsExports.allProcessors = {
    string: cjsExports.stringProcessor,
    number: cjsExports.numberProcessor,
    boolean: cjsExports.booleanProcessor,
    bigint: cjsExports.bigintProcessor,
    symbol: cjsExports.symbolProcessor,
    null: cjsExports.nullProcessor,
    undefined: cjsExports.undefinedProcessor,
    void: cjsExports.voidProcessor,
    never: cjsExports.neverProcessor,
    any: cjsExports.anyProcessor,
    unknown: cjsExports.unknownProcessor,
    date: cjsExports.dateProcessor,
    enum: cjsExports.enumProcessor,
    literal: cjsExports.literalProcessor,
    nan: cjsExports.nanProcessor,
    template_literal: cjsExports.templateLiteralProcessor,
    file: cjsExports.fileProcessor,
    success: cjsExports.successProcessor,
    custom: cjsExports.customProcessor,
    properties: cjsExports.propertiesProcessor,
    function: cjsExports.functionProcessor,
    transform: cjsExports.transformProcessor,
    map: cjsExports.mapProcessor,
    set: cjsExports.setProcessor,
    array: cjsExports.arrayProcessor,
    object: cjsExports.objectProcessor,
    union: cjsExports.unionProcessor,
    intersection: cjsExports.intersectionProcessor,
    tuple: cjsExports.tupleProcessor,
    record: cjsExports.recordProcessor,
    nullable: cjsExports.nullableProcessor,
    nonoptional: cjsExports.nonoptionalProcessor,
    default: cjsExports.defaultProcessor,
    prefault: cjsExports.prefaultProcessor,
    catch: cjsExports.catchProcessor,
    pipe: cjsExports.pipeProcessor,
    readonly: cjsExports.readonlyProcessor,
    promise: cjsExports.promiseProcessor,
    optional: cjsExports.optionalProcessor,
    lazy: cjsExports.lazyProcessor,
  };
  function toJSONSchema(input, params) {
    if ("_idmap" in input) {
      let registry = input;
      let ctx = to_json_schema_js_1.initializeContext({
        ...params,
        processors: cjsExports.allProcessors,
      });
      let defs = {};
      for (let entry of registry._idmap.entries()) {
        let [_, schema] = entry;
        to_json_schema_js_1.processSchema(schema, ctx);
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
        to_json_schema_js_1.extractDefs(ctx, schema);
        util_js_1.assignProp(schemas, key, to_json_schema_js_1.finalize(ctx, schema));
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
    let ctx = to_json_schema_js_1.initializeContext({
      ...params,
      processors: cjsExports.allProcessors,
    });
    to_json_schema_js_1.processSchema(input, ctx);
    to_json_schema_js_1.extractDefs(ctx, input);
    return to_json_schema_js_1.finalize(ctx, input);
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
export { require_json_schema_processors };
