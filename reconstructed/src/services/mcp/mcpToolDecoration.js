/**
 * services/mcp/mcpToolDecoration.ts
 *
 * 2.1.316 新增：为 MCP 工具附加来源信息与"忽略整工具允许规则"等行为；把服务器作用域/插件来源写入工具的 mcpInfo等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-2qpdvtqf.js (7)
 * attribution: placement 7
 */
import { getMcpInfoFromConnection } from "./types.js";
import { mcpServerSource } from "./fileReference/fileReferencePolicy.js";
import { mcpServerIdHeader, WIt } from "./firstPartyServerIds.js";
import { getRootSession } from "../../bootstrap/state.js";
import { buildPluginEventFieldsFromId } from "../../utils/telemetry/pluginTelemetry.js";
import { af } from "../../utils/plugins/pluginPolicy.js";
import { qq } from "./claudeai.js";
import { isServerIdentityActive } from "./serverIdentity.js";

/**
 * 把服务器作用域/插件来源写入工具的 mcpInfo。
 */
//@ chunk-2qpdvtqf.js:484-681 placement
function stampToolScope(e, o) {
  let mapped = o.map((t) =>
    t.mcpInfo === void 0 ||
    (t.mcpInfo.scope === e.config.scope && t.mcpInfo.pluginSource === e.config.pluginSource)
      ? t
      : { ...t, mcpInfo: getMcpInfoFromConnection(e) },
  );
  return mapped.every((t, r) => t === o[r]) ? o : mapped;
}
/**
 * 客户端配置作用域与插件来源一致时原样返回，否则替换。
 */
//@ chunk-2qpdvtqf.js:681-789 placement
function withConfigScope(e, o) {
  return e.config.scope === o.scope && e.config.pluginSource === o.pluginSource ? e : { ...e, config: o };
}
//@ chunk-2qpdvtqf.js:789-819 placement
var S = 128,
  g = /^[a-z0-9._:-]+$/;
//@ chunk-2qpdvtqf.js:819-909 placement
function c(e) {
  let o = e?.trim().toLowerCase();
  if (!o || o.length > S || !g.test(o)) return;
  return o;
}
/**
 * 动态 http 服务器的连接器 id。
 */
//@ chunk-2qpdvtqf.js:909-1050 placement
function dynamicServerConnectorId(e, o) {
  if (o.type !== "http" || mcpServerSource(e, o) !== "dynamic") return;
  let n = c(mcpServerIdHeader(o));
  if (n) return n;
  let p = WIt.peek(getRootSession())?.read?.();
  return c(p?.[e]);
}
//@ chunk-2qpdvtqf.js:1050-1296 placement
var stampMcpInfo = (e, o) => ({
  ...o,
  scope: e.config.scope,
  pluginSource: e.config.pluginSource,
  source: mcpServerSource(e.name, e.config),
  pluginTelemetry: void 0,
  ...(e.config.pluginSource !== void 0 && {
    pluginTelemetry: buildPluginEventFieldsFromId(e.config.pluginSource, af()),
  }),
  serverIdStamp: dynamicServerConnectorId(e.name, e.config),
});
/**
 * 为 MCP 工具附加来源信息与"忽略整工具允许规则"等行为。
 */
//@ chunk-2qpdvtqf.js:1296-1826 placement
function decorateMcpTools(e, o) {
  let n = qq(e.name, e.config),
    mapped = o.map((r) => {
      if (r.mcpInfo === void 0) return r;
      let s =
        n && (isServerIdentityActive() || r.ignoresWholeToolAllowRule?.({}) !== !0)
          ? {
              ...r,
              ignoresWholeToolAllowRule() {
                return !0;
              },
              suppressesAlwaysAllowRule() {
                return !0;
              },
              async checkPermissions(u, f) {
                let checkPermissions = await r.checkPermissions(u, f);
                return checkPermissions.behavior === "ask" || checkPermissions.behavior === "passthrough"
                  ? { ...checkPermissions, suggestions: [] }
                  : checkPermissions;
              },
            }
          : r;
      return r.mcpInfo.scope === e.config.scope && r.mcpInfo.pluginSource === e.config.pluginSource
        ? s
        : { ...s, mcpInfo: stampMcpInfo(e, r.mcpInfo) };
    });
  return mapped.every((r, s) => r === o[s]) ? o : mapped;
}

export { dynamicServerConnectorId, decorateMcpTools, stampToolScope, withConfigScope };
