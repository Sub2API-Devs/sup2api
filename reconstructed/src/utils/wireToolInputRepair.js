/**
 * utils/wireToolInputRepair.ts
 *
 * 2.1.316 新增：线上工具输入修复
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (10)
 * attribution: placement 9, sole-consumer 1
 */
import { WORKFLOW_TOOL_NAME } from "../tools/WorkflowTool/constants.js";
import { stripProtoKeys } from "./objectSafety.js";
import { logEvent } from "../services/analytics/index.js";
import { safeParseJSON } from "./json.js";
import { c4o } from "../../vendor/@modelcontextprotocol/client/dist/src-CeKsbNLO.mjs";

//@ chunk-e6aww6q8.js:1524821-1524914 placement
function isRepairableSchemaType(e) {
  return e === "array" || e === "object" || e === "integer" || e === "number" || e === "boolean";
}
//@ chunk-e6aww6q8.js:1524914-1525127 placement
function normalizeToolInput(e, n, { logRepairs: r = true } = {}) {
  let s = coerceToSchemaType(n, e.inputSchema, e.inputJSONSchema, e.streamedInputRepairExemptKeys?.());
  let h = repairDoubleEscapedUnicode(s, {
    logRepairs: r,
  });
  if (e.name === WORKFLOW_TOOL_NAME && typeof s.script === "string") h.script = s.script;
  return h;
}
//@ chunk-e6aww6q8.js:1525127-1525309 placement
function stripProtoKeysLogged(e) {
  let { stripped, count } = stripProtoKeys(e);
  if (count > 0)
    logEvent("tengu_repair_double_escaped_unicode", {
      repaired_strings: 0,
      windows_path_skips: 0,
      control_escape_skips: 0,
      proto_keys: count,
    });
  return stripped;
}
//@ chunk-e6aww6q8.js:1525309-1526298 placement
function coerceToSchemaType(e, inputSchema, inputJSONSchema, s) {
  let h = e;
  let y = (w, L) => {
    let G = h[w];
    if (typeof G !== "string" || s?.has(w)) return;
    let q = safeParseJSON(G, false);
    let Z;
    switch (L) {
      case "array":
        Z = Array.isArray(q);
        break;
      case "object":
        Z = q !== null && typeof q === "object" && !Array.isArray(q);
        break;
      case "boolean":
        Z = typeof q === "boolean";
        break;
      case "integer":
      case "number":
        Z =
          typeof q === "number" &&
          Number.isFinite(q) &&
          String(q) === G &&
          (L === "number" || Number.isInteger(q));
        break;
      case "any":
        Z =
          typeof q === "boolean" ||
          Array.isArray(q) ||
          (q !== null && typeof q === "object") ||
          (typeof q === "number" && Number.isFinite(q) && String(q) === G);
        break;
      case "compound":
        Z = Array.isArray(q) || (q !== null && typeof q === "object");
        break;
    }
    if (Z) {
      if (h === e)
        h = {
          ...e,
        };
      h[w] = q;
    }
  };
  let def = inputSchema._zod?.def;
  if (def?.type === "object" && def.shape)
    for (let [key, value] of Object.entries(def.shape)) {
      let G = unwrapZodType(value._zod.def);
      if (isRepairableSchemaType(G)) y(key, G);
      else if (G === "unknown" || G === "any") y(key, "compound");
    }
  if (inputJSONSchema?.properties) {
    let w = inputJSONSchema.$defs ?? inputJSONSchema.definitions;
    for (let [key, value] of Object.entries(inputJSONSchema.properties)) {
      let q = jsonSchemaTypeOf(value, w);
      if (isRepairableSchemaType(q)) y(key, q);
      else if (q === undefined && isSchemaKeywordsOnly(value)) y(key, "any");
    }
  }
  return h;
}
//@ chunk-e6aww6q8.js:1526407-1526528 sole-consumer
function isSchemaKeywordsOnly(e) {
  if (e === null || typeof e !== "object" || Array.isArray(e)) return false;
  return Object.keys(e).every((key) => c4o.has(key));
}
//@ chunk-e6aww6q8.js:1526528-1527177 placement
/**
 * 推断 JSON Schema 节点类型（多类型、$ref、组合）。
 */
function jsonSchemaTypeOf(e, n, r = new Set()) {
  if (r.size > 64 || r.has(e) || e === null || typeof e !== "object") return;
  r.add(e);
  let s = e;
  if (typeof s.type === "string") return s.type;
  let pickPreferredType = (y) => {
    let S;
    let w;
    let L = false;
    for (let G of y)
      if (G === "array" || G === "object") S ??= G;
      else if (G === "string") L = true;
      else if (G !== undefined && G !== "null") w ??= G;
    return S ?? (L ? "string" : w);
  };
  if (Array.isArray(s.type)) {
    let y = pickPreferredType(s.type.filter((S) => typeof S === "string"));
    if (y !== undefined) return y;
  }
  if (typeof s.$ref === "string" && n) {
    let match = s.$ref.match(/^#\/(?:\$defs|definitions)\/([^/]+)$/);
    if (match && match[1]) return jsonSchemaTypeOf(n[match[1]], n, r);
  }
  for (let y of [s.anyOf, s.oneOf])
    if (Array.isArray(y)) {
      let S = pickPreferredType(y.map((w) => jsonSchemaTypeOf(w, n, r)));
      if (S !== undefined) return S;
    }
  return;
}
//@ chunk-e6aww6q8.js:1527177-1527414 placement
function unwrapZodType(e) {
  let n = e;
  while (n)
    switch (n.type) {
      case "optional":
      case "nullable":
      case "default":
        if (!n.innerType) return n.type;
        n = n.innerType._zod.def;
        break;
      case "pipe":
        if (!n.in) return n.type;
        n = n.in._zod.def;
        break;
      default:
        return n.type;
    }
  return "";
}
//@ chunk-e6aww6q8.js:1527414-1527612 placement
var ESCAPED_UNICODE_RE = /\\u([dD][89aAbB][0-9a-fA-F]{2})\\u([dD][c-fC-F][0-9a-fA-F]{2})|\\u([0-9a-fA-F]{4})/;
var ESCAPED_UNICODE_GLOBAL_RE = new RegExp(ESCAPED_UNICODE_RE.source, "g");
var WINDOWS_PATH_RE = /(?:^|[^A-Za-z])[A-Za-z]:[\\/]|(?:^|[\s"'=])\\\\[^\s\\/]+[\\/](?!\\)/;
//@ chunk-e6aww6q8.js:1527612-1528061 placement
/**
 * 修复双重转义的 \\u 序列并上报计数。
 */
function repairDoubleEscapedUnicode(e, { logRepairs: n = true, javaScriptSource: r = false } = {}) {
  let s = {
    repairedStrings: 0,
    windowsPathSkips: 0,
    controlEscapeSkips: 0,
    protoKeys: 0,
  };
  let h = repairEscapesDeep(e, s, r);
  if (n && (s.repairedStrings > 0 || s.windowsPathSkips > 0 || s.controlEscapeSkips > 0 || s.protoKeys > 0))
    logEvent("tengu_repair_double_escaped_unicode", {
      repaired_strings: s.repairedStrings,
      windows_path_skips: s.windowsPathSkips,
      control_escape_skips: s.controlEscapeSkips,
      ...(s.protoKeys > 0 && {
        proto_keys: s.protoKeys,
      }),
    });
  return h;
}
//@ chunk-e6aww6q8.js:1528061-1528802 placement
/**
 * 递归修复字符串中的 \\u 转义（跳过路径、控制字符、代理项）。
 */
function repairEscapesDeep(e, n, r) {
  if (typeof e === "string") {
    if (!e.includes("\\u")) return e;
    if (!ESCAPED_UNICODE_RE.test(e)) return e;
    if (WINDOWS_PATH_RE.test(e)) {
      n.windowsPathSkips++;
      return e;
    }
    let s = false;
    let replaced = e.replace(ESCAPED_UNICODE_GLOBAL_RE, (y, S, w, L, G) => {
      let q = G;
      while (q > 0 && e[q - 1] === "\\") q--;
      if ((G - q) & 1) return y;
      if (S !== undefined) return String.fromCharCode(parseInt(S, 16), parseInt(w, 16));
      let Z = parseInt(L, 16);
      if (Z >= 55296 && Z <= 57343) return y;
      if (Z <= 31 || (Z >= 127 && Z <= 159)) {
        s = true;
        return y;
      }
      if (r && (Z < 128 || Z === 8232 || Z === 8233)) return y;
      return String.fromCharCode(Z);
    });
    if (replaced !== e) n.repairedStrings++;
    if (s) n.controlEscapeSkips++;
    return replaced;
  }
  if (Array.isArray(e)) return e.map((s) => repairEscapesDeep(s, n, r));
  if (e !== null && typeof e === "object") {
    let s = {};
    for (let [key, value] of Object.entries(e))
      if (key === "__proto__") n.protoKeys++;
      else s[key] = repairEscapesDeep(value, n, r);
    return s;
  }
  return e;
}
export { stripProtoKeysLogged, normalizeToolInput, repairDoubleEscapedUnicode };
