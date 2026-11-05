/**
 * services/mcp/mcpToolDecoration.ts
 *
 * 2.1.316 新增：为 MCP 工具附加来源信息与"忽略整工具允许规则"等行为；把服务器作用域/插件来源写入工具的 mcpInfo等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-s4p9jscb.js (9)
 * attribution: placement 7, layout 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getMcpInfoFromConnection, isPluginServerConfig } from "./types.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { sanitizeTitle } from "../../utils/resultError.js";
import { mcpServerSource } from "./fileReference/fileReferencePolicy.js";
import { mcpServerIdHeader, officeBridgeState } from "./firstPartyServerIds.js";
import { getRootSession } from "../../bootstrap/state.js";
import { buildPluginEventFieldsFromId } from "../../utils/telemetry/pluginTelemetry.js";
import { policyEnabledPluginNameSet } from "../../utils/plugins/pluginPolicy.js";
import { serverProvenanceOf } from "../api/toolProvenance.js";
import { requiresConnectorGrant } from "./claudeai.js";
import { isServerIdentityActive } from "./serverIdentity.js";

//@ chunk-s4p9jscb.js:595-792 placement
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
//@ chunk-s4p9jscb.js:792-900 placement
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
//@ chunk-s4p9jscb.js:900-910 layout
var MAX_DISPLAY_NAME_CHARS = 128;
//@ chunk-s4p9jscb.js:910-1107 layout
function withDisplayName(config) {
  let displayName = "displayName" in config ? config.displayName : undefined;
  if (typeof displayName !== "string") return;
  if (config.scope === "claudeai") return displayName;
  if (config.scope !== "dynamic" || isPluginServerConfig(config)) return;
  return truncateToLength(sanitizeTitle(displayName), MAX_DISPLAY_NAME_CHARS).trimEnd() || undefined;
}
//@ chunk-s4p9jscb.js:1107-1137 placement
/**
 * 连接器 id 允许的字符正则。
 */
var MAX_CONNECTOR_ID_CHARS = 128;
var CONNECTOR_ID_RE = /^[a-z0-9._:-]+$/;
//@ chunk-s4p9jscb.js:1137-1227 placement
/**
 * 规范化连接器 id（去空白、转小写、校验），不合法返回 undefined。
 */
function normalizeConnectorId(id) {
  let lower = id?.trim().toLowerCase();
  if (!lower || lower.length > MAX_CONNECTOR_ID_CHARS || !CONNECTOR_ID_RE.test(lower)) return;
  return lower;
}
//@ chunk-s4p9jscb.js:1227-1369 placement
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
//@ chunk-s4p9jscb.js:1369-1675 placement
var stampMcpInfo = (connection, mcpInfo) => ({
  ...mcpInfo,
  scope: connection.config.scope,
  pluginSource: connection.config.pluginSource,
  source: mcpServerSource(connection.name, connection.config),
  displayName: withDisplayName(connection.config),
  pluginTelemetry: undefined,
  ...(connection.config.pluginSource !== undefined && {
    pluginTelemetry: buildPluginEventFieldsFromId(
      connection.config.pluginSource,
      policyEnabledPluginNameSet(),
    ),
  }),
  serverIdStamp: dynamicServerConnectorId(connection.name, connection.config),
  ...(connection.config.type !== "sdk" && serverProvenanceOf(connection)),
});
//@ chunk-s4p9jscb.js:1675-2206 placement
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
export { decorateMcpTools, withDisplayName, dynamicServerConnectorId, withConfigScope, stampToolScope };
