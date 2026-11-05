/**
 * utils/settings/schemaOutput.ts
 *
 * 从 SettingsSchema 生成 JSON Schema（供编辑 settings.json 时提示）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/settings/schemaOutput.ts
 * pieces: chunk-z20c443b.js (10)
 * attribution: placement 9, fingerprint 1
 */
import { toJSONSchema } from "../../../vendor/zod/v4/core/json-schema-processors.js";
import { fixStringFormat } from "../../../vendor/zod/v4/core/api.js";
import { $ZodCheck } from "../../../vendor/zod/v4/core/checks.js";
import { $ZodLazy } from "../../../vendor/zod/v4/core/schemas.js";
import { globalRegistry } from "../../../vendor/zod/v4/core/registries.js";
import { buildWholeSettingsSchema, wholeSettingsSchema } from "./types.js";
import { collectValidationTips } from "./validationTips.js";
import { jsonStringify } from "../slowOperations.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-z20c443b.js:428305-428405 placement
var UNREPRESENTABLE_ZOD_TYPES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-z20c443b.js:428305", () => {
  UNREPRESENTABLE_ZOD_TYPES = new Set([
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
});
//@ chunk-z20c443b.js:428405-429196 placement
/**
 * 生成设置的 JSON Schema。
 */
function settingsJsonSchema(schema, options) {
  let io = options?.io ?? "output";
  let unrepresentable = options?.unrepresentable ?? "throw";
  return {
    ...toJSONSchema(schema, {
      ...options,
      unrepresentable: "any",
      override(ctx) {
        let { jsonSchema, zodSchema } = ctx;
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
        } else if (def.type === "tuple" && options?.target !== "openapi-3.0")
          fixArrayLengthKeywords(jsonSchema, zodSchema);
        else if (def.type === "string") fixStringFormat(jsonSchema, zodSchema);
        else if (def.type === "catch") applyCatchDefault(jsonSchema, def, io);
        stripKeepBranchMarkers(jsonSchema.anyOf);
        stripKeepBranchMarkers(jsonSchema.allOf);
        orderSchemaKeys(jsonSchema, zodSchema);
        options?.override?.(ctx);
      },
    }),
  };
}
//@ chunk-z20c443b.js:429196-429231 placement
var X_CLAUDE_CODE_KEEP_BRANCH = "x-claude-code-keep-branch";
//@ chunk-z20c443b.js:429231-429328 placement
function stripKeepBranchMarkers(parts) {
  if (!Array.isArray(parts)) return;
  for (let part of parts) if (part && typeof part === "object") part[X_CLAUDE_CODE_KEEP_BRANCH] = undefined;
}
//@ chunk-z20c443b.js:429328-429434 placement
function zodChecksOf(check) {
  return [
    ...(check instanceof $ZodCheck ? [check._zod.def] : []),
    ...(check._zod.def.checks ?? []).map((check) => check._zod.def),
  ];
}
//@ chunk-z20c443b.js:429434-429715 placement
function fixArrayLengthKeywords(jsonSchema, check) {
  let checks = zodChecksOf(check);
  if (jsonSchema.items === false) delete jsonSchema.items;
  if (jsonSchema.additionalItems === false) delete jsonSchema.additionalItems;
  if (!checks.some((check) => check.check === "min_length" || check.check === "length_equals"))
    delete jsonSchema.minItems;
  if (!checks.some((check) => check.check === "max_length" || check.check === "length_equals"))
    delete jsonSchema.maxItems;
}
//@ chunk-z20c443b.js:430108-430369 placement
function applyCatchDefault(jsonSchema, def, io) {
  let value;
  try {
    value = def.catchValue(undefined);
  } catch {
    throw Error("Dynamic catch values are not supported in JSON Schema");
  }
  if (io !== "input" || Object.hasOwn(jsonSchema, "default")) return;
  let copy = {
    ...jsonSchema,
  };
  for (let key of Object.keys(copy)) delete jsonSchema[key];
  jsonSchema.default = value;
  Object.assign(jsonSchema, copy);
}
//@ chunk-z20c443b.js:430369-430866 placement
/**
 * schema 是否可选。
 */
function isSchemaOptional(innerType, io) {
  let def = innerType._zod.def;
  switch (def.type) {
    case "undefined":
      return true;
    case "transform":
      return false;
    case "pipe":
      return isSchemaOptional(io === "input" ? def.in : def.out, io);
    case "union":
      return def.options.some((option) => isSchemaOptional(option, io));
    case "nullable":
    case "readonly":
      return isSchemaOptional(def.innerType, io);
    case "catch":
      return io === "input" || isSchemaOptional(def.innerType, io);
    case "lazy":
      if (innerType instanceof $ZodLazy) return isSchemaOptional(innerType._zod.innerType, io);
      return (io === "input" ? innerType._zod.optin : innerType._zod.optout) === "optional";
    default:
      return io === "input" ? innerType._zod.optin !== undefined : innerType._zod.optout === "optional";
  }
}
//@ chunk-z20c443b.js:430866-431004 placement
function orderSchemaKeys(jsonSchema, zodSchema) {
  let meta = globalRegistry.get(zodSchema);
  if (!meta) return;
  for (let key of Object.keys(jsonSchema)) {
    if (Object.hasOwn(meta, key)) continue;
    let value = jsonSchema[key];
    delete jsonSchema[key];
    jsonSchema[key] = value;
  }
}
//@ chunk-z20c443b.js:431004-431102 fingerprint (2.1.88 match: generateSettingsJSONSchema, 1)
function generateSettingsJSONSchema(flavor) {
  let schema = flavor ? buildWholeSettingsSchema(flavor) : wholeSettingsSchema();
  let jsonSchema = settingsJsonSchema(schema, {
    unrepresentable: "any",
  });
  collectValidationTips(jsonSchema, false);
  return jsonStringify(jsonSchema, null, 2);
}
export { settingsJsonSchema, generateSettingsJSONSchema, zodChecksOf };
