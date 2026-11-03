/**
 * services/api/toolDefinitionShape.ts
 *
 * 2.1.316 新增：检查工具定义形状（defer_loading、input_schema、strict 等）与工具在遥测中的类别
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-a76knw89.js (24)
 * attribution: placement 24
 */
import { computeContentHash } from "../../utils/commitAttribution.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { sortKeysDeep } from "../../utils/settings/settingsSourceTrust.js";
import { stringArray } from "../../utils/collections.js";
import { SKILL_2 } from "../../tools/SkillTool/skillToolNames.js";
import { sanitizeToolNameForAnalytics } from "../analytics/metadata.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { EXITPLANMODE_2 } from "../../tools/ExitPlanModeTool/constants.js";
import { FILE_EDIT_TOOL_NAME } from "../../tools/FileEditTool/constants.js";
import { FILE_READ_TOOL_NAME } from "../../tools/FileReadTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../../tools/FileWriteTool/prompt.js";
import { HostScoped } from "../../utils/hostScoped.js";

//@ chunk-a76knw89.js:8157-8238 placement
function stripSafeguardsField(e) {
  if (!("safeguards" in e)) return e;
  let { safeguards, ...o } = e;
  return o;
}
//@ chunk-a76knw89.js:8238-8325 placement
/**
 * 导出函数 `exactKeyValue`：参数 e, n，返回 Object.entries(e).find(([o]) => o === n)?.[1]。
 */
function exactKeyValue(e, n) {
  if (e === undefined) return;
  return Object.entries(e).find(([key]) => key === n)?.[1];
}
//@ chunk-a76knw89.js:8325-8455 placement
function toolKeyOf(e, n) {
  let o = exactKeyValue(e, "name");
  if (typeof o === "string") return o;
  let r = exactKeyValue(e, "type");
  return typeof r === "string" ? r : `tools[${n}]`;
}
//@ chunk-a76knw89.js:8455-8634 placement
function isDeferredCustomToolDefinition(e) {
  let n = exactKeyValue(e, "type");
  return (
    typeof exactKeyValue(e, "name") === "string" &&
    exactKeyValue(e, "defer_loading") === true &&
    (n === undefined || n === "custom") &&
    hasObjectType(exactKeyValue(e, "input_schema")) &&
    !("cache_control" in e)
  );
}
//@ chunk-a76knw89.js:8634-8870 placement
function isPlainToolDefinition(schema) {
  let n = exactKeyValue(schema, "type");
  let o = exactKeyValue(schema, "description");
  return (
    typeof exactKeyValue(schema, "name") === "string" &&
    (o === undefined || typeof o === "string") &&
    exactKeyValue(schema, "defer_loading") !== true &&
    (n === undefined || n === "custom") &&
    hasObjectType(exactKeyValue(schema, "input_schema")) &&
    !("cache_control" in schema)
  );
}
//@ chunk-a76knw89.js:8870-8924 placement
/**
 * 工具定义里会出现在 schema 层的布尔字段名（strict/eager_input_streaming/citations）。
 */
var TOOL_DEFINITION_BOOLEAN_KEYS = ["strict", "eager_input_streaming", "citations"];
//@ chunk-a76knw89.js:8924-8994 placement
function anyEagerInputStreaming(e) {
  return e.some((n) => exactKeyValue(n, "eager_input_streaming") === true);
}
//@ chunk-a76knw89.js:8994-9236 placement
function TOOL_DEFINITION_FLAG_KEYS(schema, { strict, eager, citations }) {
  let c = {
    ...schema,
  };
  if (!strict && "strict" in c) {
    let { strict, ...u } = c;
    c = u;
  }
  if (!eager && "eager_input_streaming" in c) {
    let { eager_input_streaming: eagerInputStreaming, ...u } = c;
    c = u;
  }
  if (!citations && "citations" in c) {
    let { citations, ...u } = c;
    c = u;
  }
  return c;
}
//@ chunk-a76knw89.js:9236-9332 placement = extractErrorTypeFromData (1)
function hasObjectType(data) {
  return (
    typeof data === "object" &&
    data !== null &&
    !Array.isArray(data) &&
    exactKeyValue(data, "type") === "object"
  );
}
//@ chunk-a76knw89.js:9332-9380 placement
/**
 * 导出函数 `shortContentHash`：参数 e，返回 computeContentHash(jsonStringify(sortKeysDeep(e))).slice(0, 16)。
 */
function shortContentHash(e) {
  return computeContentHash(jsonStringify(sortKeysDeep(e))).slice(0, 16);
}
//@ chunk-a76knw89.js:9380-9615 placement
function readDeferredToolsDeltas(surfacedDefinitions) {
  if (!Array.isArray(surfacedDefinitions)) return [];
  return surfacedDefinitions.filter(
    (n) =>
      typeof n === "object" &&
      n !== null &&
      typeof n.name === "string" &&
      typeof n.listing === "string" &&
      ((typeof n.definition === "object" && n.definition !== null) || typeof n.sameAs === "string"),
  );
}
//@ chunk-a76knw89.js:9615-10063 placement
/**
 * 汇总消息中的 deferred_tools_delta 附件（按 uuid 去重）。
 */
function collectDeferredToolsDeltas(e, n = new Set()) {
  let o = new Map();
  for (let r of e) {
    if (
      r.type !== "attachment" ||
      r.attachment?.type !== "deferred_tools_delta" ||
      typeof r.uuid !== "string" ||
      n.has(r.uuid)
    )
      continue;
    let c = new Map();
    for (let s of readDeferredToolsDeltas(r.attachment.surfacedDefinitions)) {
      if ("definition" in s) {
        c.set(s.name, {
          definition: s.definition,
          listing: s.listing,
          definedIn: r.uuid,
        });
        continue;
      }
      let u = o.get(s.sameAs)?.get(s.name);
      if (u !== undefined) c.set(s.name, u);
    }
    if (c.size > 0) o.set(r.uuid, c);
  }
  return o;
}
//@ chunk-a76knw89.js:10063-10174 placement
/**
 * 汇总消息中延迟工具增量里出现的全部工具名。
 */
function deltaToolNames(messages, nameOnlyAnnouncements = new Set()) {
  let o = new Set();
  for (let r of collectDeferredToolsDeltas(messages, nameOnlyAnnouncements).values())
    for (let key of r.keys()) o.add(key);
  return o;
}
//@ chunk-a76knw89.js:10174-10559 placement
function findLatestDeferredToolsDelta(e, nameOnlyAnnouncements) {
  let deferredToolsDeltas = collectDeferredToolsDeltas(e, nameOnlyAnnouncements);
  let r = new Map();
  let c = new Set();
  for (let s of e) {
    if (
      s.type !== "attachment" ||
      s.attachment?.type !== "deferred_tools_delta" ||
      (typeof s.uuid === "string" && nameOnlyAnnouncements.has(s.uuid))
    )
      continue;
    for (let u of stringArray(s.attachment.removedByBlock)) if (r.has(u)) c.add(u);
    if (typeof s.uuid !== "string") continue;
    for (let [u, p] of deferredToolsDeltas.get(s.uuid) ?? []) {
      r.set(u, p);
      c.delete(u);
    }
  }
  return {
    definedByValue: r,
    withdrawn: c,
  };
}
//@ chunk-a76knw89.js:10559-10627 placement
/**
 * 导出函数 `ownValue`：参数 e, n，返回 e !== void 0 && Object.hasOwn(e, n) ? e[n] : void 0。
 */
function ownValue(toolDefinitions, n) {
  return toolDefinitions !== undefined && Object.hasOwn(toolDefinitions, n) ? toolDefinitions[n] : undefined;
}
//@ chunk-a76knw89.js:10627-10685 placement
/**
 * 导出函数 `deferredToolNames`：参数 e, n = new Set(，返回 new Set(collectDeferredToolsDeltas(e, n).keys())。
 */
function deferredToolNames(messages, nameOnlyAnnouncements = new Set()) {
  return new Set(collectDeferredToolsDeltas(messages, nameOnlyAnnouncements).keys());
}
//@ chunk-a76knw89.js:10685-10812 placement
var TOOL_CATEGORY_LABELS = {
  skill: "skill_tool",
  mcp: "mcp_tool",
  evalRegistered: "eval_registered",
  dynamic: "dynamic_tool",
  unreadable: "unreadable_tool",
};
//@ chunk-a76knw89.js:10812-11126 placement
/**
 * 工具在遥测中的类别：skill、mcp、eval_registered、dynamic 等。
 */
function toolCategoryForTelemetry(tool) {
  try {
    if (tool.name.startsWith(SKILL_2)) return TOOL_CATEGORY_LABELS.skill;
    let n = String(sanitizeToolNameForAnalytics(tool.name));
    if (n !== tool.name) return n;
    if (tool.mcpInfo !== undefined) return TOOL_CATEGORY_LABELS.mcp;
    if (tool.name.startsWith("eval_registered__")) return TOOL_CATEGORY_LABELS.evalRegistered;
    if (tool.uiTableKey !== undefined || tool.name.includes("__")) return TOOL_CATEGORY_LABELS.dynamic;
    return tool.name;
  } catch {
    return TOOL_CATEGORY_LABELS.unreadable;
  }
}
//@ chunk-a76knw89.js:11126-11170 placement
var TOOL_CATEGORY_NAMES = [
  ...Object.values(TOOL_CATEGORY_LABELS),
  BASH_TOOL_NAME,
  EXITPLANMODE_2,
  FILE_EDIT_TOOL_NAME,
  FILE_READ_TOOL_NAME,
  FILE_WRITE_TOOL_NAME,
];
//@ chunk-a76knw89.js:11170-11239 placement
/**
 * 导出函数 `telemetryToolCategory`：参数 e，返回 Mn.find((o) => o === n) ?? "other_tool"。
 */
function telemetryToolCategory(e) {
  let n = toolCategoryForTelemetry(e);
  return TOOL_CATEGORY_NAMES.find((o) => o === n) ?? "other_tool";
}
//@ chunk-a76knw89.js:11239-11265 placement
var unsupportedToolsSeen = new HostScoped(() => new Set());
//@ chunk-a76knw89.js:11265-11300 placement
function prefixedName(id, n) {
  return `${id}_${n}`;
}
//@ chunk-a76knw89.js:11300-11317 placement
var SUFFIX_NUMBER_RE = /_(\d+)$/;
//@ chunk-a76knw89.js:11317-11390 placement
/**
 * 导出函数 `stripSuffixNumber`：参数 e，返回 match ? e.slice(0, -match[0].length) : void 0; } export { toolCategoryForTelemetry, collectDeferredToolsDeltas…。
 */
function stripSuffixNumber(e) {
  let match = SUFFIX_NUMBER_RE.exec(e);
  return match ? e.slice(0, -match[0].length) : undefined;
}
export {
  toolCategoryForTelemetry,
  collectDeferredToolsDeltas,
  ownValue,
  telemetryToolCategory,
  deltaToolNames,
  deferredToolNames,
  isDeferredCustomToolDefinition,
  toolKeyOf,
  stripSafeguardsField,
  exactKeyValue,
  TOOL_DEFINITION_BOOLEAN_KEYS,
  anyEagerInputStreaming,
  TOOL_DEFINITION_FLAG_KEYS,
  prefixedName,
  stripSuffixNumber,
  unsupportedToolsSeen,
  SUFFIX_NUMBER_RE,
  findLatestDeferredToolsDelta,
  isPlainToolDefinition,
  shortContentHash,
};
