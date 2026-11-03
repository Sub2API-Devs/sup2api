/**
 * utils/settings/schemaOutput.ts
 *
 * 从 SettingsSchema 生成 JSON Schema（供编辑 settings.json 时提示）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/settings/schemaOutput.ts
 * pieces: chunk-dcmhvw5a.js (10)
 * attribution: placement 9, fingerprint 1
 */
import { toJSONSchema } from "../../../vendor/zod/v4/core/json-schema-processors.js";
import { kw } from "../../../vendor/zod/v4/core/api.js";
import { $ZodCheck } from "../../../vendor/zod/v4/core/checks.js";
import { nlo } from "../../../vendor/zod/v4/core/schemas.js";
import { globalRegistry } from "../../../vendor/zod/v4/core/registries.js";
import { buildWholeSettingsSchema, wholeSettingsSchema } from "./types.js";
import { collectValidationTips } from "./validationTips.js";
import { jsonStringify } from "../slowOperations.js";

//@ chunk-dcmhvw5a.js:429843-429943 placement
var UNREPRESENTABLE_ZOD_TYPES = new Set([
  "bigint",
  "symbol",
  "void",
  "date",
  "map",
  "set",
  "transform",
  "nan",
  "custom",
  "function",
]);
//@ chunk-dcmhvw5a.js:429943-430734 placement
/**
 * 生成设置的 JSON Schema。
 */
function settingsJsonSchema(e, n) {
  let io = n?.io ?? "output";
  let unrepresentable = n?.unrepresentable ?? "throw";
  return {
    ...toJSONSchema(e, {
      ...n,
      unrepresentable: "any",
      override(c) {
        let { jsonSchema, zodSchema } = c;
        let def = zodSchema._zod.def;
        if (unrepresentable === "throw" && UNREPRESENTABLE_ZOD_TYPES.has(def.type))
          throw Error("Schema type cannot be represented in JSON Schema");
        if (def.type === "undefined") jsonSchema.not = {};
        else if (def.type === "union" && jsonSchema.oneOf) {
          jsonSchema.anyOf = jsonSchema.oneOf;
          delete jsonSchema.oneOf;
        } else if (def.type === "object" && jsonSchema.properties && !jsonSchema.$ref) {
          let shape = def.shape;
          let filtered = Object.keys(shape).filter((key) => !isSchemaOptional(shape[key], io));
          let additionalProperties = jsonSchema.additionalProperties;
          delete jsonSchema.required;
          delete jsonSchema.additionalProperties;
          if (filtered.length > 0) jsonSchema.required = filtered;
          if (additionalProperties !== undefined) jsonSchema.additionalProperties = additionalProperties;
        } else if (def.type === "tuple" && n?.target !== "openapi-3.0")
          fixArrayLengthKeywords(jsonSchema, zodSchema);
        else if (def.type === "string") kw(jsonSchema, zodSchema);
        else if (def.type === "catch") applyCatchDefault(jsonSchema, def, io);
        stripKeepBranchMarkers(jsonSchema.anyOf);
        stripKeepBranchMarkers(jsonSchema.allOf);
        orderSchemaKeys(jsonSchema, zodSchema);
        n?.override?.(c);
      },
    }),
  };
}
//@ chunk-dcmhvw5a.js:430734-430769 placement
var X_CLAUDE_CODE_KEEP_BRANCH = "x-claude-code-keep-branch";
//@ chunk-dcmhvw5a.js:430769-430866 placement
function stripKeepBranchMarkers(e) {
  if (!Array.isArray(e)) return;
  for (let n of e) if (n && typeof n === "object") n[X_CLAUDE_CODE_KEEP_BRANCH] = undefined;
}
//@ chunk-dcmhvw5a.js:430866-430972 placement
function zodChecksOf(e) {
  return [
    ...(e instanceof $ZodCheck ? [e._zod.def] : []),
    ...(e._zod.def.checks ?? []).map((r) => r._zod.def),
  ];
}
//@ chunk-dcmhvw5a.js:430972-431253 placement
function fixArrayLengthKeywords(jsonSchema, zodSchema) {
  let r = zodChecksOf(zodSchema);
  if (jsonSchema.items === false) delete jsonSchema.items;
  if (jsonSchema.additionalItems === false) delete jsonSchema.additionalItems;
  if (!r.some((s) => s.check === "min_length" || s.check === "length_equals")) delete jsonSchema.minItems;
  if (!r.some((s) => s.check === "max_length" || s.check === "length_equals")) delete jsonSchema.maxItems;
}
//@ chunk-dcmhvw5a.js:431646-431907 placement
function applyCatchDefault(jsonSchema, n, r) {
  let s;
  try {
    s = n.catchValue(undefined);
  } catch {
    throw Error("Dynamic catch values are not supported in JSON Schema");
  }
  if (r !== "input" || Object.hasOwn(jsonSchema, "default")) return;
  let a = {
    ...jsonSchema,
  };
  for (let key of Object.keys(a)) delete jsonSchema[key];
  jsonSchema.default = s;
  Object.assign(jsonSchema, a);
}
//@ chunk-dcmhvw5a.js:431907-432404 placement
/**
 * schema 是否可选。
 */
function isSchemaOptional(innerType, n) {
  let def = innerType._zod.def;
  switch (def.type) {
    case "undefined":
      return true;
    case "transform":
      return false;
    case "pipe":
      return isSchemaOptional(n === "input" ? def.in : def.out, n);
    case "union":
      return def.options.some((option) => isSchemaOptional(option, n));
    case "nullable":
    case "readonly":
      return isSchemaOptional(def.innerType, n);
    case "catch":
      return n === "input" || isSchemaOptional(def.innerType, n);
    case "lazy":
      if (innerType instanceof nlo) return isSchemaOptional(innerType._zod.innerType, n);
      return (n === "input" ? innerType._zod.optin : innerType._zod.optout) === "optional";
    default:
      return n === "input" ? innerType._zod.optin !== undefined : innerType._zod.optout === "optional";
  }
}
//@ chunk-dcmhvw5a.js:432404-432542 placement
function orderSchemaKeys(jsonSchema, zodSchema) {
  let r = globalRegistry.get(zodSchema);
  if (!r) return;
  for (let key of Object.keys(jsonSchema)) {
    if (Object.hasOwn(r, key)) continue;
    let a = jsonSchema[key];
    delete jsonSchema[key];
    jsonSchema[key] = a;
  }
}
//@ chunk-dcmhvw5a.js:432542-432640 fingerprint = generateSettingsJSONSchema (1)
function generateSettingsJSONSchema(e) {
  let n = e ? buildWholeSettingsSchema(e) : wholeSettingsSchema();
  let jsonSchema = settingsJsonSchema(n, {
    unrepresentable: "any",
  });
  collectValidationTips(jsonSchema, false);
  return jsonStringify(jsonSchema, null, 2);
}
export { zodChecksOf, generateSettingsJSONSchema, settingsJsonSchema };
