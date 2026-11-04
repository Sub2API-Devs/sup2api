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
function stampToolScope(connection, commands) {
  let mapped = commands.map((command) =>
    command.mcpInfo === undefined ||
    (command.mcpInfo.scope === connection.config.scope &&
      command.mcpInfo.pluginSource === connection.config.pluginSource)
      ? command
      : {
          ...command,
          mcpInfo: getMcpInfoFromConnection(connection),
        },
  );
  return mapped.every((command, index) => command === commands[index]) ? commands : mapped;
}
//@ chunk-2qpdvtqf.js:681-789 placement
/**
 * 客户端配置作用域与插件来源一致时原样返回，否则替换。
 */
function withConfigScope(connection, config) {
  return connection.config.scope === config.scope && connection.config.pluginSource === config.pluginSource
    ? connection
    : {
        ...connection,
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
function normalizeConnectorId(id) {
  let lower = id?.trim().toLowerCase();
  if (!lower || lower.length > MAX_CONNECTOR_ID_CHARS || !CONNECTOR_ID_RE.test(lower)) return;
  return lower;
}
//@ chunk-2qpdvtqf.js:909-1050 placement
/**
 * 动态 http 服务器的连接器 id。
 */
function dynamicServerConnectorId(serverName, config) {
  if (config.type !== "http" || mcpServerSource(serverName, config) !== "dynamic") return;
  let headerId = normalizeConnectorId(mcpServerIdHeader(config));
  if (headerId) return headerId;
  let bridgeState = officeBridgeState.peek(getRootSession())?.read?.();
  return normalizeConnectorId(bridgeState?.[serverName]);
}
//@ chunk-2qpdvtqf.js:1050-1296 placement
var stampMcpInfo = (connection, mcpInfo) => ({
  ...mcpInfo,
  scope: connection.config.scope,
  pluginSource: connection.config.pluginSource,
  source: mcpServerSource(connection.name, connection.config),
  pluginTelemetry: undefined,
  ...(connection.config.pluginSource !== undefined && {
    pluginTelemetry: buildPluginEventFieldsFromId(
      connection.config.pluginSource,
      policyEnabledPluginNameSet(),
    ),
  }),
  serverIdStamp: dynamicServerConnectorId(connection.name, connection.config),
});
//@ chunk-2qpdvtqf.js:1296-1826 placement
/**
 * 为 MCP 工具附加来源信息与"忽略整工具允许规则"等行为。
 */
function decorateMcpTools(connection, tools) {
  let requiresGrant = requiresConnectorGrant(connection.name, connection.config);
  let mapped = tools.map((tool) => {
    if (tool.mcpInfo === undefined) return tool;
    let patched =
      requiresGrant && (isServerIdentityActive() || tool.ignoresWholeToolAllowRule?.({}) !== true)
        ? {
            ...tool,
            ignoresWholeToolAllowRule() {
              return true;
            },
            suppressesAlwaysAllowRule() {
              return true;
            },
            async checkPermissions(input, context) {
              let verdict = await tool.checkPermissions(input, context);
              return verdict.behavior === "ask" || verdict.behavior === "passthrough"
                ? {
                    ...verdict,
                    suggestions: [],
                  }
                : verdict;
            },
          }
        : tool;
    return tool.mcpInfo.scope === connection.config.scope &&
      tool.mcpInfo.pluginSource === connection.config.pluginSource
      ? patched
      : {
          ...patched,
          mcpInfo: stampMcpInfo(connection, tool.mcpInfo),
        };
  });
  return mapped.every((tool, index) => tool === tools[index]) ? tools : mapped;
}
export { decorateMcpTools, dynamicServerConnectorId, stampToolScope, withConfigScope };
