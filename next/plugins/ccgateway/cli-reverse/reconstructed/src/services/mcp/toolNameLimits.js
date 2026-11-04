/**
 * services/mcp/toolNameLimits.ts
 *
 * MCP 工具名长度上限与 UI 可见性（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (12)
 * attribution: placement 12
 */
import { HostScoped } from "../../utils/hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  objectSchema,
  looseObject,
  stringSchema,
  array,
  _enum,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { logForDebugging } from "../../utils/debug.js";
import { identity as identity_2 } from "../../utils/identity.js";
import { MAX_WIRE_TOOL_NAME_BYTES } from "../../utils/taggedId.js";
import { logMCPError } from "../../utils/log.js";
import { logEvent } from "../analytics/index.js";
import { lit } from "../analytics/safeMetadata.js";
import { toolNameForTelemetry } from "../analytics/metadata.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-s61vbvea.js:471772-471798 placement
/**
 * 按宿主记录的超长工具名。
 */
var longToolNamesByHost; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-s61vbvea.js:471772", () => {
  longToolNamesByHost = new HostScoped(() => new Map());
});
//@ chunk-s61vbvea.js:471798-471835 placement
/**
 * 取当前宿主的超长工具名记录。
 */
function getLongToolNames() {
  return longToolNamesByHost.of(getRootSession().host);
}
//@ chunk-s61vbvea.js:471835-471884 placement
/**
 * 判断该工具名是否已被标记。
 */
function isToolNameFlagged(serverName, toolName) {
  return getLongToolNames().get(serverName)?.has(toolName) === true;
}
//@ chunk-s61vbvea.js:471884-472370 placement
/**
 * 工具界面元数据的 schema。
 */
var UI; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var UI_RESOURCEURI;
var MAX_UI_META_CHARS;
var UI_VISIBILITY_VALUES;
var MCP_APP;
var MAX_MIME_CHARS;
var MEDIA_TYPE_TOKEN;
var regExp_8;
var regExp_9;
var toolUiMetaSchema;
deferInit("chunk-s61vbvea.js:471884", () => {
  UI = "ui://";
  UI_RESOURCEURI = "ui/resourceUri";
  MAX_UI_META_CHARS = 4096;
  UI_VISIBILITY_VALUES = ["model", "app"];
  MCP_APP = "mcp-app";
  MAX_MIME_CHARS = 1024;
  MEDIA_TYPE_TOKEN = "[!#$%&'*+.^_`|~0-9A-Za-z-]+";
  regExp_8 = new RegExp(`^[ \\t]*(${MEDIA_TYPE_TOKEN})/(${MEDIA_TYPE_TOKEN})`);
  regExp_9 = new RegExp(
    `[ \\t\\r\\n]*;[ \\t\\r\\n]*(?:(${MEDIA_TYPE_TOKEN})=(?:(${MEDIA_TYPE_TOKEN})|"((?:[^"\\\\]|\\\\.)*)")(?=[ \\t\\r\\n]*(?:;|$)))?`,
    "y",
  );
  toolUiMetaSchema = DoctorLazy(() =>
    objectSchema({
      ui: looseObject({
        resourceUri: stringSchema().startsWith(UI).optional(),
        visibility: array(_enum(UI_VISIBILITY_VALUES)).optional(),
      })
        .refine((meta) => jsonStringify(meta).length <= MAX_UI_META_CHARS)
        .optional()
        .catch(undefined),
      [UI_RESOURCEURI]: stringSchema().startsWith(UI).max(MAX_UI_META_CHARS).optional().catch(undefined),
    }),
  );
});
//@ chunk-s61vbvea.js:472370-472637 placement
function uiVisibilityOf(meta) {
  let ui = meta?.ui;
  if (ui === undefined || ui === null) return;
  if (typeof ui !== "object" || Array.isArray(ui)) return [];
  let declared = Object.hasOwn(ui, "visibility") ? Reflect.get(ui, "visibility") : undefined;
  if (declared === undefined || declared === null) return;
  return Array.isArray(declared) ? UI_VISIBILITY_VALUES.filter((value) => declared.includes(value)) : [];
}
//@ chunk-s61vbvea.js:472637-472689 placement = createModelSwitchBreadcrumbs (1)
function createModelSwitchBreadcrumbs(meta) {
  return uiVisibilityOf(meta)?.includes("model") === false;
}
//@ chunk-s61vbvea.js:472689-473087 placement
/**
 * 判断 MCP 资源是否是 MCP App 界面资源（ui:// 地址，或 text/html 且 profile 为 mcp-app）。
 */
function isMcpAppResource({ uri, mimeType }) {
  if (uri.slice(0, UI.length).toLowerCase() === UI) return true;
  if (mimeType === undefined || mimeType.length > MAX_MIME_CHARS) return false;
  let match = regExp_8.exec(mimeType);
  if (match?.[1]?.toLowerCase() !== "text" || match[2]?.toLowerCase() !== "html") return false;
  regExp_9.lastIndex = match[0].length;
  for (let match = regExp_9.exec(mimeType); match !== null; match = regExp_9.exec(mimeType)) {
    let [, attrName, quotedValue, bareValue] = match;
    let attrValue = quotedValue ?? bareValue?.replace(/\\(.)/g, "$1");
    if (attrName?.toLowerCase() === "profile" && attrValue?.toLowerCase() === MCP_APP) return true;
  }
  return false;
}
//@ chunk-s61vbvea.js:473087-473498 placement
function describeHiddenMcpTool(meta, serverName, toolName) {
  if (isToolNameFlagged(serverName, toolName)) {
    logForDebugging(
      `MCP server "${serverName}": tool "${toolName}" is kept from the model because this session keeps this tool, or every tool of this server, from it (toolsKeptFromModel.ts); hosts still see it in mcp_status`,
    );
    return true;
  }
  let modelSwitchBreadcrumbs = createModelSwitchBreadcrumbs(meta);
  if (modelSwitchBreadcrumbs)
    logForDebugging(
      `MCP server "${serverName}": tool "${toolName}" is kept from the model (its _meta.ui.visibility omits "model" or cannot be read); hosts still see it in mcp_status`,
    );
  return modelSwitchBreadcrumbs;
}
//@ chunk-s61vbvea.js:473498-473539 placement
/**
 * 已告警过的工具名集合。
 */
var MAX_FLAGGED_TOOL_NAMES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var flaggedToolNames;
deferInit("chunk-s61vbvea.js:473498", () => {
  MAX_FLAGGED_TOOL_NAMES = 256;
  flaggedToolNames = identity_2(new Set(), (set) => set.clear());
});
//@ chunk-s61vbvea.js:473539-474039 placement
/**
 * MCP 工具名超过 API 长度上限时不发给模型并告警（tengu_mcp_degraded）
 */
function warnMcpToolNameTooLong(tools) {
  let tooLongByServer = new Map();
  let filtered = tools.filter((tool) => {
    if (!tool.mcpInfo) return true;
    if (tool.mcpInfo.hiddenFromModel === true) return false;
    if (tool.name.length <= MAX_WIRE_TOOL_NAME_BYTES) return true;
    if (flaggedToolNames.size < MAX_FLAGGED_TOOL_NAMES && !flaggedToolNames.has(tool.name)) {
      flaggedToolNames.add(tool.name);
      let { serverName } = tool.mcpInfo;
      tooLongByServer.set(serverName, (tooLongByServer.get(serverName) ?? 0) + 1);
      logMCPError(
        serverName,
        `Tool "${tool.name}" is not sent to Claude: its name has ${tool.name.length} characters and the API accepts at most ${MAX_WIRE_TOOL_NAME_BYTES}`,
      );
    }
    return false;
  });
  for (let [serverName, count] of tooLongByServer)
    logEvent("tengu_mcp_degraded", {
      reason: lit("tool_name_too_long"),
      skippedCount: count,
      mcpServerKeyHash: toolNameForTelemetry(serverName),
    });
  return filtered;
}
//@ chunk-s61vbvea.js:474039-474108 placement
/**
 * 判断工具元数据里是否声明了界面资源。
 */
function hasUiResource(uiMeta) {
  return uiMeta?.ui?.resourceUri !== undefined || uiMeta?.[UI_RESOURCEURI] !== undefined;
}
//@ chunk-s61vbvea.js:474108-474352 placement
/**
 * 提取工具元数据中的界面信息（ui 或可见性，以及界面资源地址）。
 */
function toolUiMeta(meta) {
  if (meta?.ui === undefined && meta?.[UI_RESOURCEURI] === undefined) return;
  let parsed = toolUiMetaSchema().safeParse(meta ?? {}).data ?? {};
  let { ui, [UI_RESOURCEURI]: resourceUri } = parsed;
  let visibility = ui ? undefined : uiVisibilityOf(meta);
  let uiValue =
    ui ??
    (visibility && {
      visibility,
    });
  let result = {
    ...(uiValue !== undefined && {
      ui: uiValue,
    }),
    ...(resourceUri !== undefined && {
      [UI_RESOURCEURI]: resourceUri,
    }),
  };
  return Object.keys(result).length > 0 ? result : undefined;
}
export { warnMcpToolNameTooLong, isMcpAppResource, toolUiMeta, describeHiddenMcpTool, hasUiResource };
