/**
 * utils/wireToolInputRepair.ts
 *
 * 2.1.316 新增：线上工具输入修复
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (10)
 * attribution: placement 9, sole-consumer 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { WORKFLOW_TOOL_NAME } from "../tools/WorkflowTool/constants.js";
import { codeModeAccepted } from "./codeMode/accepted.js";
import { isCodeModeEnabled, hasBuiltInEvalTool } from "../tools/RefreshMcpToolsTool/RefreshMcpToolsTool.js";
import { stripProtoKeys } from "./objectSafety.js";
import { logEvent } from "../services/analytics/index.js";
import { safeParseJSON } from "./json.js";
import { ANNOTATION_KEYWORDS } from "../../vendor/@modelcontextprotocol/client/dist/src-CeKsbNLO.mjs";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:1530246-1530339 placement
function isRepairableSchemaType(type) {
  return (
    type === "array" || type === "object" || type === "integer" || type === "number" || type === "boolean"
  );
}
//@ chunk-5xgkngpb.js:1530339-1530656 placement
function normalizeToolInput(value, schema, { logRepairs = true } = {}) {
  let coerced = coerceToSchemaType(
    schema,
    value.inputSchema,
    value.inputJSONSchema,
    value.streamedInputRepairExemptKeys?.(),
  );
  let repaired = repairDoubleEscapedUnicode(coerced, {
    logRepairs,
  });
  if (value.name === WORKFLOW_TOOL_NAME && typeof coerced.script === "string")
    repaired.script = coerced.script;
  if (
    codeModeAccepted() &&
    isCodeModeEnabled() &&
    hasBuiltInEvalTool([value]) &&
    typeof coerced.code === "string"
  )
    repaired.code = repairDoubleEscapedUnicode(coerced.code, {
      logRepairs: false,
      javaScriptSource: true,
    });
  return repaired;
}
//@ chunk-5xgkngpb.js:1530656-1530838 placement
function stripProtoKeysLogged(value) {
  let { stripped, count } = stripProtoKeys(value);
  if (count > 0)
    logEvent("tengu_repair_double_escaped_unicode", {
      repaired_strings: 0,
      windows_path_skips: 0,
      control_escape_skips: 0,
      proto_keys: count,
    });
  return stripped;
}
//@ chunk-5xgkngpb.js:1530838-1531835 placement
function coerceToSchemaType(value, inputSchema, inputJSONSchema, exemptKeys) {
  let result = value;
  let repairField = (key, type) => {
    let raw = result[key];
    if (typeof raw !== "string" || exemptKeys?.has(key)) return;
    let parsed = safeParseJSON(raw, false);
    let matches;
    switch (type) {
      case "array":
        matches = Array.isArray(parsed);
        break;
      case "object":
        matches = parsed !== null && typeof parsed === "object" && !Array.isArray(parsed);
        break;
      case "boolean":
        matches = typeof parsed === "boolean";
        break;
      case "integer":
      case "number":
        matches =
          typeof parsed === "number" &&
          Number.isFinite(parsed) &&
          String(parsed) === raw &&
          (type === "number" || Number.isInteger(parsed));
        break;
      case "any":
        matches =
          typeof parsed === "boolean" ||
          Array.isArray(parsed) ||
          (parsed !== null && typeof parsed === "object") ||
          (typeof parsed === "number" && Number.isFinite(parsed) && String(parsed) === raw);
        break;
      case "compound":
        matches = Array.isArray(parsed) || (parsed !== null && typeof parsed === "object");
        break;
    }
    if (matches) {
      if (result === value)
        result = {
          ...value,
        };
      result[key] = parsed;
    }
  };
  let def = inputSchema._zod?.def;
  if (def?.type === "object" && def.shape)
    for (let [key, value] of Object.entries(def.shape)) {
      let fieldType = unwrapZodType(value._zod.def);
      if (isRepairableSchemaType(fieldType)) repairField(key, fieldType);
      else if (fieldType === "unknown" || fieldType === "any") repairField(key, "compound");
    }
  if (inputJSONSchema?.properties) {
    let defs = inputJSONSchema.$defs ?? inputJSONSchema.definitions;
    for (let [key, value] of Object.entries(inputJSONSchema.properties)) {
      let fieldType = jsonSchemaTypeOf(value, defs);
      if (isRepairableSchemaType(fieldType)) repairField(key, fieldType);
      else if (fieldType === undefined && isSchemaKeywordsOnly(value)) repairField(key, "any");
    }
  }
  return result;
}
//@ chunk-5xgkngpb.js:1531944-1532065 sole-consumer
function isSchemaKeywordsOnly(schema) {
  if (schema === null || typeof schema !== "object" || Array.isArray(schema)) return false;
  return Object.keys(schema).every((key) => ANNOTATION_KEYWORDS.has(key));
}
//@ chunk-5xgkngpb.js:1532065-1532714 placement
/**
 * 推断 JSON Schema 节点类型（多类型、$ref、组合）。
 */
function jsonSchemaTypeOf(a, b, seen = new Set()) {
  if (seen.size > 64 || seen.has(a) || a === null || typeof a !== "object") return;
  seen.add(a);
  let schemaNode = a;
  if (typeof schemaNode.type === "string") return schemaNode.type;
  let pickPreferredType = (types) => {
    let structuredType;
    let simpleType;
    let sawString = false;
    for (let type of types)
      if (type === "array" || type === "object") structuredType ??= type;
      else if (type === "string") sawString = true;
      else if (type !== undefined && type !== "null") simpleType ??= type;
    return structuredType ?? (sawString ? "string" : simpleType);
  };
  if (Array.isArray(schemaNode.type)) {
    let preferred = pickPreferredType(schemaNode.type.filter((type) => typeof type === "string"));
    if (preferred !== undefined) return preferred;
  }
  if (typeof schemaNode.$ref === "string" && b) {
    let match = schemaNode.$ref.match(/^#\/(?:\$defs|definitions)\/([^/]+)$/);
    if (match && match[1]) return jsonSchemaTypeOf(b[match[1]], b, seen);
  }
  for (let variants of [schemaNode.anyOf, schemaNode.oneOf])
    if (Array.isArray(variants)) {
      let preferred = pickPreferredType(variants.map((variant) => jsonSchemaTypeOf(variant, b, seen)));
      if (preferred !== undefined) return preferred;
    }
  return;
}
//@ chunk-5xgkngpb.js:1532714-1532951 placement
function unwrapZodType(schema) {
  let current = schema;
  while (current)
    switch (current.type) {
      case "optional":
      case "nullable":
      case "default":
        if (!current.innerType) return current.type;
        current = current.innerType._zod.def;
        break;
      case "pipe":
        if (!current.in) return current.type;
        current = current.in._zod.def;
        break;
      default:
        return current.type;
    }
  return "";
}
//@ chunk-5xgkngpb.js:1532951-1533149 placement
var ESCAPED_UNICODE_RE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var ESCAPED_UNICODE_GLOBAL_RE;
var WINDOWS_PATH_RE;
deferInit("chunk-5xgkngpb.js:1532951", () => {
  ESCAPED_UNICODE_RE = /\\u([dD][89aAbB][0-9a-fA-F]{2})\\u([dD][c-fC-F][0-9a-fA-F]{2})|\\u([0-9a-fA-F]{4})/;
  ESCAPED_UNICODE_GLOBAL_RE = new RegExp(ESCAPED_UNICODE_RE.source, "g");
  WINDOWS_PATH_RE = /(?:^|[^A-Za-z])[A-Za-z]:[\\/]|(?:^|[\s"'=])\\\\[^\s\\/]+[\\/](?!\\)/;
});
//@ chunk-5xgkngpb.js:1533149-1533597 placement
/**
 * 修复双重转义的 \\u 序列并上报计数。
 */
function repairDoubleEscapedUnicode(text, { logRepairs = true, javaScriptSource = false } = {}) {
  let stats = {
    repairedStrings: 0,
    windowsPathSkips: 0,
    controlEscapeSkips: 0,
    protoKeys: 0,
  };
  let repaired = repairEscapesDeep(text, stats, javaScriptSource);
  if (
    logRepairs &&
    (stats.repairedStrings > 0 ||
      stats.windowsPathSkips > 0 ||
      stats.controlEscapeSkips > 0 ||
      stats.protoKeys > 0)
  )
    logEvent("tengu_repair_double_escaped_unicode", {
      repaired_strings: stats.repairedStrings,
      windows_path_skips: stats.windowsPathSkips,
      control_escape_skips: stats.controlEscapeSkips,
      ...(stats.protoKeys > 0 && {
        proto_keys: stats.protoKeys,
      }),
    });
  return repaired;
}
//@ chunk-5xgkngpb.js:1533597-1534348 placement
/**
 * 递归修复字符串中的 \\u 转义（跳过路径、控制字符、代理项）。
 */
function repairEscapesDeep(a, b, c) {
  if (typeof a === "string") {
    if (!a.includes("\\u")) return a;
    if (!ESCAPED_UNICODE_RE.test(a)) return a;
    if (WINDOWS_PATH_RE.test(a)) {
      b.windowsPathSkips++;
      return a;
    }
    let sawControlEscape = false;
    let replaced = a.replace(
      ESCAPED_UNICODE_GLOBAL_RE,
      (match, highSurrogateHex, lowSurrogateHex, codePointHex, offset) => {
        let backslashStart = offset;
        while (backslashStart > 0 && a[backslashStart - 1] === "\\") backslashStart--;
        if ((offset - backslashStart) & 1) return match;
        if (highSurrogateHex !== undefined)
          return String.fromCharCode(parseInt(highSurrogateHex, 16), parseInt(lowSurrogateHex, 16));
        let codePoint = parseInt(codePointHex, 16);
        if (codePoint >= 55296 && codePoint <= 57343) return match;
        if (codePoint <= 31 || (codePoint >= 127 && codePoint <= 159)) {
          sawControlEscape = true;
          return match;
        }
        if (c && (codePoint < 128 || codePoint === 8232 || codePoint === 8233)) return match;
        return String.fromCharCode(codePoint);
      },
    );
    if (replaced !== a) b.repairedStrings++;
    if (sawControlEscape) b.controlEscapeSkips++;
    return replaced;
  }
  if (Array.isArray(a)) return a.map((item) => repairEscapesDeep(item, b, c));
  if (a !== null && typeof a === "object") {
    let repaired = {};
    for (let [key, value] of Object.entries(a))
      if (key === "__proto__") b.protoKeys++;
      else repaired[key] = repairEscapesDeep(value, b, c);
    return repaired;
  }
  return a;
}
export { stripProtoKeysLogged, normalizeToolInput, repairDoubleEscapedUnicode };
