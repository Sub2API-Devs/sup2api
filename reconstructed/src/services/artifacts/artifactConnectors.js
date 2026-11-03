/**
 * services/artifacts/artifactConnectors.ts
 *
 * 2.1.316 新增：Artifact 页面可声明的运行时能力（connectors）：claude.ai MCP 连接器、SDK 服务器的分组
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-9xyz2gbc.js (9)
 * attribution: placement 9
 */
import { antEnv, env } from "../../utils/env.js";
import { record, string, unknown } from "../../../vendor/zod/v4/classic/schemas.js";
import { ARTIFACT_CAPABILITIES } from "../../skills/bundled/bundledSkillNames.js";
import { mcpInfoFromString } from "../mcp/mcpStringUtils.js";
import { getMcpPrefix as getMcpPrefix_2 } from "./connectorNames.js";
import { REMOTE_DEVICES } from "../mcp/firstPartyServerIds.js";
import { isHostEntrypoint } from "../../utils/entrypointKinds.js";
import { normalizeUuidOrNull } from "../../utils/agentId.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { getServerUrl } from "./durableWatch.js";
import { CLAUDE_CODE_REMOTE_DISPLAY_NAME } from "../mcp/ccrMetaMcp.js";

//@ chunk-9xyz2gbc.js:596-650 placement
/**
 * Artifact 发布输入 connectors 字段的开关与服务端能力声明处理（BCR/CCR 托管、SDK 服务器分组）。
 */
function artifactMcpEnabled() {
  return antEnv.CLAUDE_CODE_ARTIFACT_MCP ?? true;
}
//@ chunk-9xyz2gbc.js:650-1102 placement
/**
 * Artifact 发布输入里 connectors 字段的 schema：{名字: 配置} 形式的运行时能力声明，名字与配置形状以控制面为准，空对象清除之前的声明。
 */
function connectorsInputSchema() {
  return record(string().min(1).max(64), unknown())
    .optional()
    .describe(
      `Runtime capabilities this page declares, as {name: config}. The control plane is the authority on valid names and config shapes. An empty object clears any previously stored declaration; omit the field on a redeploy to carry the stored declaration forward unchanged. Before declaring any capability, load the \`${ARTIFACT_CAPABILITIES}\` skill for the current contract and per-capability guidance.`,
    );
}
//@ chunk-9xyz2gbc.js:1102-1459 placement
/**
 * （归属疑误：权限/系统提示）按 claude.ai 连接器汇总 {server, toolPrefix, toolNames}。
 */
function groupClaudeAiConnectors(s) {
  let a = new Map();
  for (let e of s) {
    if (e.mcpInfo?.scope !== "claudeai") continue;
    let serverName = e.mcpInfo.serverName;
    let r = a.get(serverName);
    if (r !== undefined) {
      r.toolNames.push(e.mcpInfo.toolName);
      continue;
    }
    let displayName = e.mcpInfo.displayName ?? serverName;
    a.set(serverName, {
      server: displayName,
      toolPrefix: mcpInfoFromString(e.name)?.serverName ?? serverName,
      toolNames: [e.mcpInfo.toolName],
      ...(getMcpPrefix_2(displayName)
        ? {}
        : {
            declarable: false,
          }),
    });
  }
  return [...a.values()];
}
//@ chunk-9xyz2gbc.js:1459-1643 placement = getMcpPrefix (1)
/**
 * （归属疑误：权限/系统提示）从 mcp__<ls>__<sub>__* 工具名中取子服务器名集合。
 */
function getMcpPrefix(serverName) {
  let a = `mcp__${REMOTE_DEVICES}__`;
  let e = new Set();
  for (let t of serverName) {
    if (!t.name.startsWith(a)) continue;
    let sliced = t.name.slice(a.length);
    let index = sliced.indexOf("__");
    if (index > 0) e.add(sliced.slice(0, index));
  }
  return [...e];
}
//@ chunk-9xyz2gbc.js:1643-1670 placement
/**
 * 导出函数 `isHostEntrypointSession`：返回 isHostEntrypoint()。
 */
function isHostEntrypointSession() {
  return isHostEntrypoint();
}
//@ chunk-9xyz2gbc.js:1670-2245 placement
/**
 * 把 SDK 类型 MCP 服务器的工具按服务器分组：有可用 serverInfoName 的进 named，名字缺失或像 UUID 的记 unnamedIds，名字不能作为前缀声明的进 undeclarable。
 */
function groupSdkHostedServers(tools) {
  let byServer = new Map();
  let unnamedIds = new Set();
  for (let tool of tools) {
    let mcpInfo = tool.mcpInfo;
    if (mcpInfo?.serverType !== "sdk" || normalizeUuidOrNull(mcpInfo.serverName) === null) continue;
    let l = byServer.get(mcpInfo.serverName);
    if (l !== undefined) {
      l.toolNames.push(mcpInfo.toolName);
      continue;
    }
    if (unnamedIds.has(mcpInfo.serverName)) continue;
    let serverInfoName = mcpInfo.serverInfoName ?? "";
    if (serverInfoName.trim() === "" || normalizeUuidOrNull(serverInfoName.trim()) !== null) {
      unnamedIds.add(mcpInfo.serverName);
      continue;
    }
    byServer.set(mcpInfo.serverName, {
      server: serverInfoName,
      toolPrefix: mcpInfo.serverName,
      toolNames: [mcpInfo.toolName],
      ...(getMcpPrefix_2(serverInfoName)
        ? {}
        : {
            declarable: false,
          }),
    });
  }
  let t = [...byServer.values()];
  return {
    named: t.filter((r) => r.declarable !== false),
    unnamedIds: [...unnamedIds],
    undeclarable: t.filter((r) => r.declarable === false),
  };
}
//@ chunk-9xyz2gbc.js:2245-2297 placement
function isCobaltPlinthYewEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_cobalt_plinth_yew", false);
}
//@ chunk-9xyz2gbc.js:2297-2600 placement
/**
 * 汇总 Artifact 页面可声明的连接器上下文：是否 CCR 托管、元连接器（会话服务器 URL 对应的工具前缀）、SDK 托管服务器分组。
 */
function getArtifactConnectorContext(tools, a) {
  let hosted = isHostEntrypointSession() ? groupSdkHostedServers(tools) : null;
  let serverUrl = getServerUrl(a ?? []);
  if (!serverUrl)
    return {
      ccrHosted: false,
      metaConnector: null,
      hosted,
    };
  let ccrHosted = env.CLAUDE_CODE_REMOTE === true;
  let n = serverUrl.name;
  let found = tools.find((f) => f.mcpInfo?.serverName === n);
  let serverName = found && mcpInfoFromString(found.name)?.serverName;
  let metaConnector =
    serverName && isCobaltPlinthYewEnabled()
      ? {
          server: CLAUDE_CODE_REMOTE_DISPLAY_NAME,
          toolPrefix: serverName,
        }
      : null;
  return {
    ccrHosted,
    metaConnector,
    hosted,
  };
}
//@ chunk-9xyz2gbc.js:2600-2737 placement
function listArtifactConnectors(s, mcpClients) {
  let { metaConnector, hosted } = getArtifactConnectorContext(s, mcpClients);
  let r = [
    ...groupClaudeAiConnectors(s),
    ...(hosted === null ? [] : [...hosted.named, ...hosted.undeclarable]),
  ];
  return metaConnector ? [...r, metaConnector] : r;
}
export {
  listArtifactConnectors,
  getMcpPrefix,
  artifactMcpEnabled,
  connectorsInputSchema,
  groupClaudeAiConnectors,
  getArtifactConnectorContext,
  isHostEntrypointSession,
};
