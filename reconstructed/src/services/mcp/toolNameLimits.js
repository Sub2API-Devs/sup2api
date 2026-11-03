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
import { u, kt, o, A, U } from "../../../vendor/zod/v4/classic/schemas.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { logForDebugging } from "../../utils/debug.js";
import { ge } from "../../utils/identity.js";
import { lMe } from "../../utils/taggedId.js";
import { logMCPError } from "../../utils/log.js";
import { logEvent } from "../analytics/index.js";
import { lit } from "../analytics/safeMetadata.js";
import { toolNameForTelemetry } from "../analytics/metadata.js";

//@ chunk-s61vbvea.js:471772-471798 placement
var mF = new HostScoped(() => new Map());
//@ chunk-s61vbvea.js:471798-471835 placement
function gF() {
  return mF.of(getRootSession().host);
}
//@ chunk-s61vbvea.js:471835-471884 placement
function rw(e, n) {
  return gF().get(e)?.has(n) === !0;
}
//@ chunk-s61vbvea.js:471884-472370 placement
var UI_2 = "ui://",
  UI_RESOURCEURI = "ui/resourceUri",
  ow = 4096,
  sw = ["model", "app"],
  MCP_APP = "mcp-app",
  yF = 1024,
  Bl = "[!#$%&'*+.^_`|~0-9A-Za-z-]+",
  regExp_8 = new RegExp(`^[ \\t]*(${Bl})/(${Bl})`),
  regExp_9 = new RegExp(
    `[ \\t\\r\\n]*;[ \\t\\r\\n]*(?:(${Bl})=(?:(${Bl})|"((?:[^"\\\\]|\\\\.)*)")(?=[ \\t\\r\\n]*(?:;|$)))?`,
    "y",
  ),
  _F = DoctorLazy(() =>
    u({
      ui: kt({ resourceUri: o().startsWith(UI_2).optional(), visibility: A(U(sw)).optional() })
        .refine((e) => jsonStringify(e).length <= ow)
        .optional()
        .catch(void 0),
      [UI_RESOURCEURI]: o()
        .startsWith(UI_2)
        .max(ow)
        .optional()
        .catch(void 0),
    }),
  );
//@ chunk-s61vbvea.js:472370-472637 placement
function uiVisibilityOf(e) {
  let n = e?.ui;
  if (n === void 0 || n === null) return;
  if (typeof n !== "object" || Array.isArray(n)) return [];
  let r = Object.hasOwn(n, "visibility") ? Reflect.get(n, "visibility") : void 0;
  if (r === void 0 || r === null) return;
  return Array.isArray(r) ? sw.filter((s) => r.includes(s)) : [];
}
//@ chunk-s61vbvea.js:472637-472689 placement = createModelSwitchBreadcrumbs (1)
function createModelSwitchBreadcrumbs(e) {
  return uiVisibilityOf(e)?.includes("model") === !1;
}
/**
 * 判断 MCP 资源是否是 MCP App 界面资源（ui:// 地址，或 text/html 且 profile 为 mcp-app）。
 */
//@ chunk-s61vbvea.js:472689-473087 placement
function isMcpAppResource({ uri: uri, mimeType: mimeType }) {
  if (uri.slice(0, UI_2.length).toLowerCase() === UI_2) return !0;
  if (mimeType === void 0 || mimeType.length > yF) return !1;
  let match = regExp_8.exec(mimeType);
  if (match?.[1]?.toLowerCase() !== "text" || match[2]?.toLowerCase() !== "html") return !1;
  regExp_9.lastIndex = match[0].length;
  for (let match = regExp_9.exec(mimeType); match !== null; match = regExp_9.exec(mimeType)) {
    let [, h, y, S] = match,
      w = y ?? S?.replace(/\\(.)/g, "$1");
    if (h?.toLowerCase() === "profile" && w?.toLowerCase() === MCP_APP) return !0;
  }
  return !1;
}
//@ chunk-s61vbvea.js:473087-473498 placement
function describeHiddenMcpTool(e, n, r) {
  if (rw(n, r))
    return (
      logForDebugging(
        `MCP server "${n}": tool "${r}" is kept from the model because this session keeps this tool, or every tool of this server, from it (toolsKeptFromModel.ts); hosts still see it in mcp_status`,
      ),
      !0
    );
  let s = createModelSwitchBreadcrumbs(e);
  if (s)
    logForDebugging(
      `MCP server "${n}": tool "${r}" is kept from the model (its _meta.ui.visibility omits "model" or cannot be read); hosts still see it in mcp_status`,
    );
  return s;
}
//@ chunk-s61vbvea.js:473498-473539 placement
var wF = 256,
  jf = ge(new Set(), (e) => e.clear());
/**
 * MCP 工具名超过 API 长度上限时不发给模型并告警（tengu_mcp_degraded）
 */
//@ chunk-s61vbvea.js:473539-474039 placement
function warnMcpToolNameTooLong(e) {
  let n = new Map(),
    filtered = e.filter((s) => {
      if (!s.mcpInfo) return !0;
      if (s.mcpInfo.hiddenFromModel === !0) return !1;
      if (s.name.length <= lMe) return !0;
      if (jf.size < wF && !jf.has(s.name)) {
        jf.add(s.name);
        let { serverName: serverName } = s.mcpInfo;
        (n.set(serverName, (n.get(serverName) ?? 0) + 1),
          logMCPError(
            serverName,
            `Tool "${s.name}" is not sent to Claude: its name has ${s.name.length} characters and the API accepts at most ${lMe}`,
          ));
      }
      return !1;
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
function nei(e) {
  return e?.ui?.resourceUri !== void 0 || e?.[UI_RESOURCEURI] !== void 0;
}
/**
 * 提取工具元数据中的界面信息（ui 或可见性，以及界面资源地址）。
 */
//@ chunk-s61vbvea.js:474108-474352 placement
function toolUiMeta(e) {
  if (e?.ui === void 0 && e?.[UI_RESOURCEURI] === void 0) return;
  let n = _F().safeParse(e ?? {}).data ?? {},
    { ui: ui, [UI_RESOURCEURI]: s } = n,
    h = ui ? void 0 : uiVisibilityOf(e),
    y = ui ?? (h && { visibility: h }),
    S = { ...(y !== void 0 && { ui: y }), ...(s !== void 0 && { [UI_RESOURCEURI]: s }) };
  return Object.keys(S).length > 0 ? S : void 0;
}

export { warnMcpToolNameTooLong, isMcpAppResource, toolUiMeta, describeHiddenMcpTool, nei };
