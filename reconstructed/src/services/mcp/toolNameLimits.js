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
import { u, looseObject, string, array, _enum } from "../../../vendor/zod/v4/classic/schemas.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { logForDebugging } from "../../utils/debug.js";
import { identity as identity_2 } from "../../utils/identity.js";
import { MAX_WIRE_TOOL_NAME_BYTES } from "../../utils/taggedId.js";
import { logMCPError } from "../../utils/log.js";
import { logEvent } from "../analytics/index.js";
import { lit } from "../analytics/safeMetadata.js";
import { toolNameForTelemetry } from "../analytics/metadata.js";

//@ chunk-s61vbvea.js:471772-471798 placement
/**
 * 按宿主记录的超长工具名。
 */
var longToolNamesByHost = new HostScoped(() => new Map());
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
function isToolNameFlagged(e, n) {
  return getLongToolNames().get(e)?.has(n) === true;
}
//@ chunk-s61vbvea.js:471884-472370 placement
/**
 * 工具界面元数据的 schema。
 */
var UI = "ui://";
var UI_RESOURCEURI = "ui/resourceUri";
var MAX_UI_META_CHARS = 4096;
var UI_VISIBILITY_VALUES = ["model", "app"];
var MCP_APP = "mcp-app";
var MAX_MIME_CHARS = 1024;
var MEDIA_TYPE_TOKEN = "[!#$%&'*+.^_`|~0-9A-Za-z-]+";
var regExp_8 = new RegExp(`^[ \\t]*(${MEDIA_TYPE_TOKEN})/(${MEDIA_TYPE_TOKEN})`);
var regExp_9 = new RegExp(
  `[ \\t\\r\\n]*;[ \\t\\r\\n]*(?:(${MEDIA_TYPE_TOKEN})=(?:(${MEDIA_TYPE_TOKEN})|"((?:[^"\\\\]|\\\\.)*)")(?=[ \\t\\r\\n]*(?:;|$)))?`,
  "y",
);
var toolUiMetaSchema = DoctorLazy(() =>
  u({
    ui: looseObject({
      resourceUri: string().startsWith(UI).optional(),
      visibility: array(_enum(UI_VISIBILITY_VALUES)).optional(),
    })
      .refine((e) => jsonStringify(e).length <= MAX_UI_META_CHARS)
      .optional()
      .catch(undefined),
    [UI_RESOURCEURI]: string().startsWith(UI).max(MAX_UI_META_CHARS).optional().catch(undefined),
  }),
);
//@ chunk-s61vbvea.js:472370-472637 placement
function uiVisibilityOf(e) {
  let ui = e?.ui;
  if (ui === undefined || ui === null) return;
  if (typeof ui !== "object" || Array.isArray(ui)) return [];
  let r = Object.hasOwn(ui, "visibility") ? Reflect.get(ui, "visibility") : undefined;
  if (r === undefined || r === null) return;
  return Array.isArray(r) ? UI_VISIBILITY_VALUES.filter((s) => r.includes(s)) : [];
}
//@ chunk-s61vbvea.js:472637-472689 placement = createModelSwitchBreadcrumbs (1)
function createModelSwitchBreadcrumbs(e) {
  return uiVisibilityOf(e)?.includes("model") === false;
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
    let [, h, y, S] = match;
    let w = y ?? S?.replace(/\\(.)/g, "$1");
    if (h?.toLowerCase() === "profile" && w?.toLowerCase() === MCP_APP) return true;
  }
  return false;
}
//@ chunk-s61vbvea.js:473087-473498 placement
function describeHiddenMcpTool(e, serverName, name) {
  if (isToolNameFlagged(serverName, name)) {
    logForDebugging(
      `MCP server "${serverName}": tool "${name}" is kept from the model because this session keeps this tool, or every tool of this server, from it (toolsKeptFromModel.ts); hosts still see it in mcp_status`,
    );
    return true;
  }
  let modelSwitchBreadcrumbs = createModelSwitchBreadcrumbs(e);
  if (modelSwitchBreadcrumbs)
    logForDebugging(
      `MCP server "${serverName}": tool "${name}" is kept from the model (its _meta.ui.visibility omits "model" or cannot be read); hosts still see it in mcp_status`,
    );
  return modelSwitchBreadcrumbs;
}
//@ chunk-s61vbvea.js:473498-473539 placement
/**
 * 已告警过的工具名集合。
 */
var MAX_FLAGGED_TOOL_NAMES = 256;
var flaggedToolNames = identity_2(new Set(), (e) => e.clear());
//@ chunk-s61vbvea.js:473539-474039 placement
/**
 * MCP 工具名超过 API 长度上限时不发给模型并告警（tengu_mcp_degraded）
 */
function warnMcpToolNameTooLong(tools) {
  let n = new Map();
  let filtered = tools.filter((s) => {
    if (!s.mcpInfo) return true;
    if (s.mcpInfo.hiddenFromModel === true) return false;
    if (s.name.length <= MAX_WIRE_TOOL_NAME_BYTES) return true;
    if (flaggedToolNames.size < MAX_FLAGGED_TOOL_NAMES && !flaggedToolNames.has(s.name)) {
      flaggedToolNames.add(s.name);
      let { serverName } = s.mcpInfo;
      n.set(serverName, (n.get(serverName) ?? 0) + 1);
      logMCPError(
        serverName,
        `Tool "${s.name}" is not sent to Claude: its name has ${s.name.length} characters and the API accepts at most ${MAX_WIRE_TOOL_NAME_BYTES}`,
      );
    }
    return false;
  });
  for (let [s, h] of n)
    logEvent("tengu_mcp_degraded", {
      reason: lit("tool_name_too_long"),
      skippedCount: h,
      mcpServerKeyHash: toolNameForTelemetry(s),
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
function toolUiMeta(e) {
  if (e?.ui === undefined && e?.[UI_RESOURCEURI] === undefined) return;
  let n = toolUiMetaSchema().safeParse(e ?? {}).data ?? {};
  let { ui, [UI_RESOURCEURI]: s } = n;
  let h = ui ? undefined : uiVisibilityOf(e);
  let y =
    ui ??
    (h && {
      visibility: h,
    });
  let S = {
    ...(y !== undefined && {
      ui: y,
    }),
    ...(s !== undefined && {
      [UI_RESOURCEURI]: s,
    }),
  };
  return Object.keys(S).length > 0 ? S : undefined;
}
export { warnMcpToolNameTooLong, isMcpAppResource, toolUiMeta, describeHiddenMcpTool, hasUiResource };
