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
import { mcpServerIdHeader, officeBridgeState } from "./firstPartyServerIds.js";
import { getRootSession } from "../../bootstrap/state.js";
import { buildPluginEventFieldsFromId } from "../../utils/telemetry/pluginTelemetry.js";
import { policyEnabledPluginNameSet } from "../../utils/plugins/pluginPolicy.js";
import { requiresConnectorGrant } from "./claudeai.js";
import { isServerIdentityActive } from "./serverIdentity.js";

//@ chunk-2qpdvtqf.js:484-681 placement
/**
 * 把服务器作用域/插件来源写入工具的 mcpInfo。
 */
function stampToolScope(e, commands) {
  let mapped = commands.map((t) =>
    t.mcpInfo === undefined ||
    (t.mcpInfo.scope === e.config.scope && t.mcpInfo.pluginSource === e.config.pluginSource)
      ? t
      : {
          ...t,
          mcpInfo: getMcpInfoFromConnection(e),
        },
  );
  return mapped.every((t, r) => t === commands[r]) ? commands : mapped;
}
//@ chunk-2qpdvtqf.js:681-789 placement
/**
 * 客户端配置作用域与插件来源一致时原样返回，否则替换。
 */
function withConfigScope(e, config) {
  return e.config.scope === config.scope && e.config.pluginSource === config.pluginSource
    ? e
    : {
        ...e,
        config,
      };
}
//@ chunk-2qpdvtqf.js:789-819 placement
/**
 * 连接器 id 允许的字符正则。
 */
var MAX_CONNECTOR_ID_CHARS = 128;
var CONNECTOR_ID_RE = /^[a-z0-9._:-]+$/;
//@ chunk-2qpdvtqf.js:819-909 placement
/**
 * 规范化连接器 id（去空白、转小写、校验），不合法返回 undefined。
 */
function normalizeConnectorId(e) {
  let lower = e?.trim().toLowerCase();
  if (!lower || lower.length > MAX_CONNECTOR_ID_CHARS || !CONNECTOR_ID_RE.test(lower)) return;
  return lower;
}
//@ chunk-2qpdvtqf.js:909-1050 placement
/**
 * 动态 http 服务器的连接器 id。
 */
function dynamicServerConnectorId(name, config) {
  if (config.type !== "http" || mcpServerSource(name, config) !== "dynamic") return;
  let n = normalizeConnectorId(mcpServerIdHeader(config));
  if (n) return n;
  let p = officeBridgeState.peek(getRootSession())?.read?.();
  return normalizeConnectorId(p?.[name]);
}
//@ chunk-2qpdvtqf.js:1050-1296 placement
var stampMcpInfo = (e, mcpInfo) => ({
  ...mcpInfo,
  scope: e.config.scope,
  pluginSource: e.config.pluginSource,
  source: mcpServerSource(e.name, e.config),
  pluginTelemetry: undefined,
  ...(e.config.pluginSource !== undefined && {
    pluginTelemetry: buildPluginEventFieldsFromId(e.config.pluginSource, policyEnabledPluginNameSet()),
  }),
  serverIdStamp: dynamicServerConnectorId(e.name, e.config),
});
//@ chunk-2qpdvtqf.js:1296-1826 placement
/**
 * 为 MCP 工具附加来源信息与"忽略整工具允许规则"等行为。
 */
function decorateMcpTools(e, o) {
  let n = requiresConnectorGrant(e.name, e.config);
  let mapped = o.map((r) => {
    if (r.mcpInfo === undefined) return r;
    let s =
      n && (isServerIdentityActive() || r.ignoresWholeToolAllowRule?.({}) !== true)
        ? {
            ...r,
            ignoresWholeToolAllowRule() {
              return true;
            },
            suppressesAlwaysAllowRule() {
              return true;
            },
            async checkPermissions(u, f) {
              let i = await r.checkPermissions(u, f);
              return i.behavior === "ask" || i.behavior === "passthrough"
                ? {
                    ...i,
                    suggestions: [],
                  }
                : i;
            },
          }
        : r;
    return r.mcpInfo.scope === e.config.scope && r.mcpInfo.pluginSource === e.config.pluginSource
      ? s
      : {
          ...s,
          mcpInfo: stampMcpInfo(e, r.mcpInfo),
        };
  });
  return mapped.every((r, s) => r === o[s]) ? o : mapped;
}
export { dynamicServerConnectorId, decorateMcpTools, stampToolScope, withConfigScope };
