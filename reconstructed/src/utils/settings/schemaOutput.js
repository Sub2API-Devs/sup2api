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
import { nut } from "../../../vendor/zod/v4/core/json-schema-processors.js";
import { kw } from "../../../vendor/zod/v4/core/api.js";
import { JK } from "../../../vendor/zod/v4/core/checks.js";
import { nlo } from "../../../vendor/zod/v4/core/schemas.js";
import { __zod_globalRegistry } from "../../../vendor/zod/v4/core/registries.js";
import { buildWholeSettingsSchema, Zio } from "./types.js";
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
/**
 * 生成设置的 JSON Schema。
 */
//@ chunk-dcmhvw5a.js:429943-430734 placement
function settingsJsonSchema(e, n) {
  let r = n?.io ?? "output",
    s = n?.unrepresentable ?? "throw";
  return {
    ...nut(e, {
      ...n,
      unrepresentable: "any",
      override(c) {
        let { jsonSchema: jsonSchema, zodSchema: zodSchema } = c,
          def = zodSchema._zod.def;
        if (s === "throw" && UNREPRESENTABLE_ZOD_TYPES.has(def.type))
          throw Error("Schema type cannot be represented in JSON Schema");
        if (def.type === "undefined") jsonSchema.not = {};
        else if (def.type === "union" && jsonSchema.oneOf)
          ((jsonSchema.anyOf = jsonSchema.oneOf), delete jsonSchema.oneOf);
        else if (def.type === "object" && jsonSchema.properties && !jsonSchema.$ref) {
          let shape = def.shape,
            filtered = Object.keys(shape).filter((S) => !isSchemaOptional(shape[S], r)),
            additionalProperties = jsonSchema.additionalProperties;
          if ((delete jsonSchema.required, delete jsonSchema.additionalProperties, filtered.length > 0))
            jsonSchema.required = filtered;
          if (additionalProperties !== void 0) jsonSchema.additionalProperties = additionalProperties;
        } else if (def.type === "tuple" && n?.target !== "openapi-3.0")
          fixArrayLengthKeywords(jsonSchema, zodSchema);
        else if (def.type === "string") kw(jsonSchema, zodSchema);
        else if (def.type === "catch") applyCatchDefault(jsonSchema, def, r);
        (zp(jsonSchema.anyOf),
          zp(jsonSchema.allOf),
          orderSchemaKeys(jsonSchema, zodSchema),
          n?.override?.(c));
      },
    }),
  };
}
//@ chunk-dcmhvw5a.js:430734-430769 placement
var X_CLAUDE_CODE_KEEP_BRANCH = "x-claude-code-keep-branch";
//@ chunk-dcmhvw5a.js:430769-430866 placement
function zp(e) {
  if (!Array.isArray(e)) return;
  for (let n of e) if (n && typeof n === "object") n[X_CLAUDE_CODE_KEEP_BRANCH] = void 0;
}
//@ chunk-dcmhvw5a.js:430866-430972 placement
function zodChecksOf(e) {
  return [...(e instanceof JK ? [e._zod.def] : []), ...(e._zod.def.checks ?? []).map((r) => r._zod.def)];
}
//@ chunk-dcmhvw5a.js:430972-431253 placement
function fixArrayLengthKeywords(e, n) {
  let r = zodChecksOf(n);
  if (e.items === !1) delete e.items;
  if (e.additionalItems === !1) delete e.additionalItems;
  if (!r.some((s) => s.check === "min_length" || s.check === "length_equals")) delete e.minItems;
  if (!r.some((s) => s.check === "max_length" || s.check === "length_equals")) delete e.maxItems;
}
//@ chunk-dcmhvw5a.js:431646-431907 placement
function applyCatchDefault(e, n, r) {
  let s;
  try {
    s = n.catchValue(void 0);
  } catch {
    throw Error("Dynamic catch values are not supported in JSON Schema");
  }
  if (r !== "input" || Object.hasOwn(e, "default")) return;
  let a = { ...e };
  for (let c of Object.keys(a)) delete e[c];
  ((e.default = s), Object.assign(e, a));
}
/**
 * schema 是否可选。
 */
//@ chunk-dcmhvw5a.js:431907-432404 placement
function isSchemaOptional(e, n) {
  let def = e._zod.def;
  switch (def.type) {
    case "undefined":
      return !0;
    case "transform":
      return !1;
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
      if (e instanceof nlo) return isSchemaOptional(e._zod.innerType, n);
      return (n === "input" ? e._zod.optin : e._zod.optout) === "optional";
    default:
      return n === "input" ? e._zod.optin !== void 0 : e._zod.optout === "optional";
  }
}
//@ chunk-dcmhvw5a.js:432404-432542 placement
function orderSchemaKeys(e, n) {
  let r = __zod_globalRegistry.get(n);
  if (!r) return;
  for (let s of Object.keys(e)) {
    if (Object.hasOwn(r, s)) continue;
    let a = e[s];
    (delete e[s], (e[s] = a));
  }
}
//@ chunk-dcmhvw5a.js:432542-432640 fingerprint = generateSettingsJSONSchema (1)
function generateSettingsJSONSchema(e) {
  let n = e ? buildWholeSettingsSchema(e) : Zio(),
    jsonSchema = settingsJsonSchema(n, { unrepresentable: "any" });
  return (collectValidationTips(jsonSchema, !1), jsonStringify(jsonSchema, null, 2));
}

export { zodChecksOf, generateSettingsJSONSchema, settingsJsonSchema };
