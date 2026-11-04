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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-a76knw89.js:8157-8238 placement
function stripSafeguardsField(schema) {
  if (!("safeguards" in schema)) return schema;
  let { safeguards, ...rest } = schema;
  return rest;
}
//@ chunk-a76knw89.js:8238-8325 placement
/**
 * 导出函数 `exactKeyValue`：参数 e, n，返回 Object.entries(e).find(([o]) => o === n)?.[1]。
 */
function exactKeyValue(object, key) {
  if (object === undefined) return;
  return Object.entries(object).find(([key_2]) => key_2 === key)?.[1];
}
//@ chunk-a76knw89.js:8325-8455 placement
function toolKeyOf(schema, index) {
  let name = exactKeyValue(schema, "name");
  if (typeof name === "string") return name;
  let type = exactKeyValue(schema, "type");
  return typeof type === "string" ? type : `tools[${index}]`;
}
//@ chunk-a76knw89.js:8455-8634 placement
function isDeferredCustomToolDefinition(schema) {
  let type = exactKeyValue(schema, "type");
  return (
    typeof exactKeyValue(schema, "name") === "string" &&
    exactKeyValue(schema, "defer_loading") === true &&
    (type === undefined || type === "custom") &&
    hasObjectType(exactKeyValue(schema, "input_schema")) &&
    !("cache_control" in schema)
  );
}
//@ chunk-a76knw89.js:8634-8870 placement
function isPlainToolDefinition(schema) {
  let type = exactKeyValue(schema, "type");
  let description = exactKeyValue(schema, "description");
  return (
    typeof exactKeyValue(schema, "name") === "string" &&
    (description === undefined || typeof description === "string") &&
    exactKeyValue(schema, "defer_loading") !== true &&
    (type === undefined || type === "custom") &&
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
function anyEagerInputStreaming(messageText) {
  return messageText.some((schema) => exactKeyValue(schema, "eager_input_streaming") === true);
}
//@ chunk-a76knw89.js:8994-9236 placement
function TOOL_DEFINITION_FLAG_KEYS(toolSchema, { strict, eager, citations }) {
  let copy = {
    ...toolSchema,
  };
  if (!strict && "strict" in copy) {
    let { strict, ...rest } = copy;
    copy = rest;
  }
  if (!eager && "eager_input_streaming" in copy) {
    let { eager_input_streaming: eagerInputStreaming, ...rest } = copy;
    copy = rest;
  }
  if (!citations && "citations" in copy) {
    let { citations, ...rest } = copy;
    copy = rest;
  }
  return copy;
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
function shortContentHash(value) {
  return computeContentHash(jsonStringify(sortKeysDeep(value))).slice(0, 16);
}
//@ chunk-a76knw89.js:9380-9615 placement
function readDeferredToolsDeltas(surfacedDefinitions) {
  if (!Array.isArray(surfacedDefinitions)) return [];
  return surfacedDefinitions.filter(
    (entry) =>
      typeof entry === "object" &&
      entry !== null &&
      typeof entry.name === "string" &&
      typeof entry.listing === "string" &&
      ((typeof entry.definition === "object" && entry.definition !== null) ||
        typeof entry.sameAs === "string"),
  );
}
//@ chunk-a76knw89.js:9615-10063 placement
/**
 * 汇总消息中的 deferred_tools_delta 附件（按 uuid 去重）。
 */
function collectDeferredToolsDeltas(messages, nameOnlyAnnouncements = new Set()) {
  let byMessageId = new Map();
  for (let message of messages) {
    if (
      message.type !== "attachment" ||
      message.attachment?.type !== "deferred_tools_delta" ||
      typeof message.uuid !== "string" ||
      nameOnlyAnnouncements.has(message.uuid)
    )
      continue;
    let defined = new Map();
    for (let entry of readDeferredToolsDeltas(message.attachment.surfacedDefinitions)) {
      if ("definition" in entry) {
        defined.set(entry.name, {
          definition: entry.definition,
          listing: entry.listing,
          definedIn: message.uuid,
        });
        continue;
      }
      let prior = byMessageId.get(entry.sameAs)?.get(entry.name);
      if (prior !== undefined) defined.set(entry.name, prior);
    }
    if (defined.size > 0) byMessageId.set(message.uuid, defined);
  }
  return byMessageId;
}
//@ chunk-a76knw89.js:10063-10174 placement
/**
 * 汇总消息中延迟工具增量里出现的全部工具名。
 */
function deltaToolNames(messages, nameOnlyAnnouncements = new Set()) {
  let names = new Set();
  for (let deltas of collectDeferredToolsDeltas(messages, nameOnlyAnnouncements).values())
    for (let key of deltas.keys()) names.add(key);
  return names;
}
//@ chunk-a76knw89.js:10174-10559 placement
function findLatestDeferredToolsDelta(messages, nameOnlyAnnouncements) {
  let deferredToolsDeltas = collectDeferredToolsDeltas(messages, nameOnlyAnnouncements);
  let definedByValue = new Map();
  let withdrawn = new Set();
  for (let message of messages) {
    if (
      message.type !== "attachment" ||
      message.attachment?.type !== "deferred_tools_delta" ||
      (typeof message.uuid === "string" && nameOnlyAnnouncements.has(message.uuid))
    )
      continue;
    for (let name of stringArray(message.attachment.removedByBlock))
      if (definedByValue.has(name)) withdrawn.add(name);
    if (typeof message.uuid !== "string") continue;
    for (let [name, value] of deferredToolsDeltas.get(message.uuid) ?? []) {
      definedByValue.set(name, value);
      withdrawn.delete(name);
    }
  }
  return {
    definedByValue,
    withdrawn,
  };
}
//@ chunk-a76knw89.js:10559-10627 placement
/**
 * 导出函数 `ownValue`：参数 e, n，返回 e !== void 0 && Object.hasOwn(e, n) ? e[n] : void 0。
 */
function ownValue(toolDefinitions, name) {
  return toolDefinitions !== undefined && Object.hasOwn(toolDefinitions, name)
    ? toolDefinitions[name]
    : undefined;
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
    let sanitized = String(sanitizeToolNameForAnalytics(tool.name));
    if (sanitized !== tool.name) return sanitized;
    if (tool.mcpInfo !== undefined) return TOOL_CATEGORY_LABELS.mcp;
    if (tool.name.startsWith("eval_registered__")) return TOOL_CATEGORY_LABELS.evalRegistered;
    if (tool.uiTableKey !== undefined || tool.name.includes("__")) return TOOL_CATEGORY_LABELS.dynamic;
    return tool.name;
  } catch {
    return TOOL_CATEGORY_LABELS.unreadable;
  }
}
//@ chunk-a76knw89.js:11126-11170 placement
var TOOL_CATEGORY_NAMES; // deferred: uses TOOL_CATEGORY_LABELS of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-a76knw89.js:11126", () => {
  TOOL_CATEGORY_NAMES = [
    ...Object.values(TOOL_CATEGORY_LABELS),
    BASH_TOOL_NAME,
    EXITPLANMODE_2,
    FILE_EDIT_TOOL_NAME,
    FILE_READ_TOOL_NAME,
    FILE_WRITE_TOOL_NAME,
  ];
});
//@ chunk-a76knw89.js:11170-11239 placement
/**
 * 导出函数 `telemetryToolCategory`：参数 e，返回 Mn.find((o) => o === n) ?? "other_tool"。
 */
function telemetryToolCategory(tool) {
  let category = toolCategoryForTelemetry(tool);
  return TOOL_CATEGORY_NAMES.find((name) => name === category) ?? "other_tool";
}
//@ chunk-a76knw89.js:11239-11265 placement
var unsupportedToolsSeen; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-a76knw89.js:11239", () => {
  unsupportedToolsSeen = new HostScoped(() => new Set());
});
//@ chunk-a76knw89.js:11265-11300 placement
function prefixedName(baseName, suffix) {
  return `${baseName}_${suffix}`;
}
//@ chunk-a76knw89.js:11300-11317 placement
var SUFFIX_NUMBER_RE = /_(\d+)$/;
//@ chunk-a76knw89.js:11317-11390 placement
/**
 * 导出函数 `stripSuffixNumber`：参数 e，返回 match ? e.slice(0, -match[0].length) : void 0; } export { toolCategoryForTelemetry, collectDeferredToolsDeltas…。
 */
function stripSuffixNumber(name) {
  let match = SUFFIX_NUMBER_RE.exec(name);
  return match ? name.slice(0, -match[0].length) : undefined;
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
