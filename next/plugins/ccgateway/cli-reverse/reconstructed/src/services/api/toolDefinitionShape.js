/**
 * services/api/toolDefinitionShape.ts
 *
 * 2.1.316 新增：检查工具定义形状（defer_loading、input_schema、strict 等）与工具在遥测中的类别
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-03tec5k5.js (22), chunk-xh983qqr.js (8)
 * attribution: placement 24, layout 6
 */
import { SKILL_2 } from "../../tools/SkillTool/skillToolNames.js";
import { sanitizeToolNameForAnalytics } from "../analytics/metadata.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { BRIEF_TOOL_NAME } from "../../tools/BriefTool/prompt.js";
import { EXITPLANMODE_2 } from "../../tools/ExitPlanModeTool/constants.js";
import { EDIT } from "../../tools/FileEditTool/constants.js";
import { READ } from "../../tools/FileReadTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../../tools/FileWriteTool/prompt.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { sortKeysDeep } from "../../utils/settings/settingsSourceTrust.js";
import { stringArray } from "../../utils/collections.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-xh983qqr.js:737-864 placement
var TOOL_CATEGORY_LABELS = {
  skill: "skill_tool",
  mcp: "mcp_tool",
  evalRegistered: "eval_registered",
  dynamic: "dynamic_tool",
  unreadable: "unreadable_tool",
};
//@ chunk-xh983qqr.js:864-1178 placement
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
//@ chunk-xh983qqr.js:1178-1224 placement
var TOOL_CATEGORY_NAMES; // deferred: uses TOOL_CATEGORY_LABELS of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-xh983qqr.js:1178", () => {
  TOOL_CATEGORY_NAMES = [
    ...Object.values(TOOL_CATEGORY_LABELS),
    BASH_TOOL_NAME,
    BRIEF_TOOL_NAME,
    EXITPLANMODE_2,
    EDIT,
    READ,
    FILE_WRITE_TOOL_NAME,
  ];
});
//@ chunk-xh983qqr.js:1224-1292 placement
/**
 * 导出函数 `telemetryToolCategory`：参数 e，返回 Mn.find((o) => o === n) ?? "other_tool"。
 */
function telemetryToolCategory(tool) {
  let category = toolCategoryForTelemetry(tool);
  return TOOL_CATEGORY_NAMES.find((name) => name === category) ?? "other_tool";
}
//@ chunk-xh983qqr.js:1292-1317 placement
var unsupportedToolsSeen; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-xh983qqr.js:1292", () => {
  unsupportedToolsSeen = new HostScoped(() => new Set());
});
//@ chunk-xh983qqr.js:1317-1351 placement
function prefixedName(baseName, suffix) {
  return `${baseName}_${suffix}`;
}
//@ chunk-xh983qqr.js:1351-1367 placement
var SUFFIX_NUMBER_RE = /_(\d+)$/;
//@ chunk-xh983qqr.js:1367-1439 placement
/**
 * 导出函数 `stripSuffixNumber`：参数 e，返回 match ? e.slice(0, -match[0].length) : void 0; } export { toolCategoryForTelemetry, collectDeferredToolsDeltas…。
 */
function stripSuffixNumber(name) {
  let match = SUFFIX_NUMBER_RE.exec(name);
  return match ? name.slice(0, -match[0].length) : undefined;
}
//@ chunk-03tec5k5.js:8593-8674 placement
function stripSafeguardsField(schema) {
  if (!("safeguards" in schema)) return schema;
  let { safeguards, ...rest } = schema;
  return rest;
}
//@ chunk-03tec5k5.js:8674-8761 placement
/**
 * 导出函数 `exactKeyValue`：参数 e, n，返回 Object.entries(e).find(([o]) => o === n)?.[1]。
 */
function exactKeyValue(object, key) {
  if (object === undefined) return;
  return Object.entries(object).find(([key_2]) => key_2 === key)?.[1];
}
//@ chunk-03tec5k5.js:8761-8963 layout
function toolAdditionParts(entry) {
  let tool = exactKeyValue(entry, "type") === "tool_addition" ? exactKeyValue(entry, "tool") : undefined;
  if (typeof tool !== "object" || tool === null) return;
  let definition = exactKeyValue(tool, "definition");
  return typeof definition === "object" && definition !== null
    ? {
        tool,
        definition,
      }
    : undefined;
}
//@ chunk-03tec5k5.js:8963-9010 layout
var HTTPS_ADDRESS_NOT_RECORDED_INVALID = "https://address-not-recorded.invalid";
//@ chunk-03tec5k5.js:9010-9125 layout
function redactServerUrl(definition) {
  return typeof definition === "object" &&
    definition !== null &&
    typeof exactKeyValue(definition, "server_url") === "string"
    ? {
        ...definition,
        server_url: HTTPS_ADDRESS_NOT_RECORDED_INVALID,
      }
    : definition;
}
//@ chunk-03tec5k5.js:9125-9246 layout
function toolAdditionName(entry) {
  let definition = toolAdditionParts(entry)?.definition;
  let name = exactKeyValue(definition, "name");
  return typeof name === "string" && exactKeyValue(definition, "input_schema") !== undefined
    ? name
    : undefined;
}
//@ chunk-03tec5k5.js:9246-9311 layout
function toolAdditionOwnership(entry) {
  return exactKeyValue(toolAdditionParts(entry)?.definition, "ownership_metadata");
}
//@ chunk-03tec5k5.js:9311-9547 layout
function withToolOwnership(entry, ownershipMetadata) {
  let addition = toolAdditionParts(entry);
  if (addition === undefined || ownershipMetadata === toolAdditionOwnership(entry)) return entry;
  let { ownership_metadata: ownershipMetadata_2, ...definitionRest } = {
    ownership_metadata: undefined,
    ...addition.definition,
  };
  let definition =
    ownershipMetadata === undefined
      ? definitionRest
      : {
          ...addition.definition,
          ownership_metadata: ownershipMetadata,
        };
  return {
    ...entry,
    tool: {
      ...addition.tool,
      definition,
    },
  };
}
//@ chunk-03tec5k5.js:9547-9677 placement
function toolKeyOf(schema, index) {
  let name = exactKeyValue(schema, "name");
  if (typeof name === "string") return name;
  let type = exactKeyValue(schema, "type");
  return typeof type === "string" ? type : `tools[${index}]`;
}
//@ chunk-03tec5k5.js:9677-9856 placement
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
//@ chunk-03tec5k5.js:9856-10092 placement
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
//@ chunk-03tec5k5.js:10092-10145 placement
/**
 * 工具定义里会出现在 schema 层的布尔字段名（strict/eager_input_streaming/citations）。
 */
var TOOL_DEFINITION_BOOLEAN_KEYS = ["strict", "eager_input_streaming", "citations"];
//@ chunk-03tec5k5.js:10145-10214 placement
function anyEagerInputStreaming(messageText) {
  return messageText.some((schema) => exactKeyValue(schema, "eager_input_streaming") === true);
}
//@ chunk-03tec5k5.js:10214-10455 placement
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
//@ chunk-03tec5k5.js:10455-10551 placement (2.1.88 match: extractErrorTypeFromData, 1)
function hasObjectType(data) {
  return (
    typeof data === "object" &&
    data !== null &&
    !Array.isArray(data) &&
    exactKeyValue(data, "type") === "object"
  );
}
//@ chunk-03tec5k5.js:10551-10599 placement
/**
 * 导出函数 `shortContentHash`：参数 e，返回 computeContentHash(jsonStringify(sortKeysDeep(e))).slice(0, 16)。
 */
function shortContentHash(value) {
  return computeContentHash(jsonStringify(sortKeysDeep(value))).slice(0, 16);
}
//@ chunk-03tec5k5.js:10599-10834 placement
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
//@ chunk-03tec5k5.js:10834-11282 placement
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
//@ chunk-03tec5k5.js:11282-11393 placement
/**
 * 汇总消息中延迟工具增量里出现的全部工具名。
 */
function deltaToolNames(messages, nameOnlyAnnouncements = new Set()) {
  let names = new Set();
  for (let deltas of collectDeferredToolsDeltas(messages, nameOnlyAnnouncements).values())
    for (let key of deltas.keys()) names.add(key);
  return names;
}
//@ chunk-03tec5k5.js:11393-11778 placement
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
//@ chunk-03tec5k5.js:11778-11846 placement
/**
 * 导出函数 `ownValue`：参数 e, n，返回 e !== void 0 && Object.hasOwn(e, n) ? e[n] : void 0。
 */
function ownValue(toolDefinitions, name) {
  return toolDefinitions !== undefined && Object.hasOwn(toolDefinitions, name)
    ? toolDefinitions[name]
    : undefined;
}
//@ chunk-03tec5k5.js:11846-11904 placement
/**
 * 导出函数 `deferredToolNames`：参数 e, n = new Set(，返回 new Set(collectDeferredToolsDeltas(e, n).keys())。
 */
function deferredToolNames(messages, nameOnlyAnnouncements = new Set()) {
  return new Set(collectDeferredToolsDeltas(messages, nameOnlyAnnouncements).keys());
}
export {
  deltaToolNames,
  deferredToolNames,
  isDeferredCustomToolDefinition,
  toolKeyOf,
  withToolOwnership,
  stripSafeguardsField,
  exactKeyValue,
  TOOL_DEFINITION_BOOLEAN_KEYS,
  anyEagerInputStreaming,
  TOOL_DEFINITION_FLAG_KEYS,
  ownValue,
  prefixedName,
  toolCategoryForTelemetry,
  telemetryToolCategory,
  stripSuffixNumber,
  unsupportedToolsSeen,
  SUFFIX_NUMBER_RE,
  collectDeferredToolsDeltas,
  findLatestDeferredToolsDelta,
  isPlainToolDefinition,
  shortContentHash,
  toolAdditionName,
  toolAdditionOwnership,
  HTTPS_ADDRESS_NOT_RECORDED_INVALID,
  redactServerUrl,
};
