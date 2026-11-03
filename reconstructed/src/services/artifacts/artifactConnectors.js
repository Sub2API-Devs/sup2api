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
import { pe, o, oe } from "../../../vendor/zod/v4/classic/schemas.js";
import { ARTIFACT_CAPABILITIES } from "../../skills/bundled/bundledSkillNames.js";
import { mcpInfoFromString } from "../mcp/mcpStringUtils.js";
import { getMcpPrefix as getMcpPrefix_2 } from "./connectorNames.js";
import { REMOTE_DEVICES } from "../mcp/firstPartyServerIds.js";
import { isHostEntrypoint } from "../../utils/entrypointKinds.js";
import { Vt } from "../../utils/agentId.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { getServerUrl } from "./durableWatch.js";
import { CLAUDE_CODE_REMOTE_DISPLAY_NAME } from "../mcp/ccrMetaMcp.js";

//@ chunk-9xyz2gbc.js:596-650 placement
function Izs() {
  return antEnv.CLAUDE_CODE_ARTIFACT_MCP ?? !0;
}
/**
 * Artifact 发布输入里 connectors 字段的 schema：{名字: 配置} 形式的运行时能力声明，名字与配置形状以控制面为准，空对象清除之前的声明。
 */
//@ chunk-9xyz2gbc.js:650-1102 placement
function connectorsInputSchema() {
  return pe(o().min(1).max(64), oe())
    .optional()
    .describe(
      `Runtime capabilities this page declares, as {name: config}. The control plane is the authority on valid names and config shapes. An empty object clears any previously stored declaration; omit the field on a redeploy to carry the stored declaration forward unchanged. Before declaring any capability, load the \`${ARTIFACT_CAPABILITIES}\` skill for the current contract and per-capability guidance.`,
    );
}
/**
 * （归属疑误：权限/系统提示）按 claude.ai 连接器汇总 {server, toolPrefix, toolNames}。
 */
//@ chunk-9xyz2gbc.js:1102-1459 placement
function groupClaudeAiConnectors(s) {
  let a = new Map();
  for (let e of s) {
    if (e.mcpInfo?.scope !== "claudeai") continue;
    let serverName = e.mcpInfo.serverName,
      r = a.get(serverName);
    if (r !== void 0) {
      r.toolNames.push(e.mcpInfo.toolName);
      continue;
    }
    let n = e.mcpInfo.displayName ?? serverName;
    a.set(serverName, {
      server: n,
      toolPrefix: mcpInfoFromString(e.name)?.serverName ?? serverName,
      toolNames: [e.mcpInfo.toolName],
      ...(getMcpPrefix_2(n) ? {} : { declarable: !1 }),
    });
  }
  return [...a.values()];
}
/**
 * （归属疑误：权限/系统提示）从 mcp__<ls>__<sub>__* 工具名中取子服务器名集合。
 */
//@ chunk-9xyz2gbc.js:1459-1643 placement = getMcpPrefix (1)
function getMcpPrefix(serverName) {
  let a = `mcp__${REMOTE_DEVICES}__`,
    e = new Set();
  for (let t of serverName) {
    if (!t.name.startsWith(a)) continue;
    let sliced = t.name.slice(a.length),
      index = sliced.indexOf("__");
    if (index > 0) e.add(sliced.slice(0, index));
  }
  return [...e];
}
//@ chunk-9xyz2gbc.js:1643-1670 placement
function SLo() {
  return isHostEntrypoint();
}
/**
 * 把 SDK 类型 MCP 服务器的工具按服务器分组：有可用 serverInfoName 的进 named，名字缺失或像 UUID 的记 unnamedIds，名字不能作为前缀声明的进 undeclarable。
 */
//@ chunk-9xyz2gbc.js:1670-2245 placement
function groupSdkHostedServers(tools) {
  let byServer = new Map(),
    unnamedIds = new Set();
  for (let r of tools) {
    let mcpInfo = r.mcpInfo;
    if (mcpInfo?.serverType !== "sdk" || Vt(mcpInfo.serverName) === null) continue;
    let l = byServer.get(mcpInfo.serverName);
    if (l !== void 0) {
      l.toolNames.push(mcpInfo.toolName);
      continue;
    }
    if (unnamedIds.has(mcpInfo.serverName)) continue;
    let c = mcpInfo.serverInfoName ?? "";
    if (c.trim() === "" || Vt(c.trim()) !== null) {
      unnamedIds.add(mcpInfo.serverName);
      continue;
    }
    byServer.set(mcpInfo.serverName, {
      server: c,
      toolPrefix: mcpInfo.serverName,
      toolNames: [mcpInfo.toolName],
      ...(getMcpPrefix_2(c) ? {} : { declarable: !1 }),
    });
  }
  let t = [...byServer.values()];
  return {
    named: t.filter((r) => r.declarable !== !1),
    unnamedIds: [...unnamedIds],
    undeclarable: t.filter((r) => r.declarable === !1),
  };
}
//@ chunk-9xyz2gbc.js:2245-2297 placement
function p() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_cobalt_plinth_yew", !1);
}
/**
 * 汇总 Artifact 页面可声明的连接器上下文：是否 CCR 托管、元连接器（会话服务器 URL 对应的工具前缀）、SDK 托管服务器分组。
 */
//@ chunk-9xyz2gbc.js:2297-2600 placement
function getArtifactConnectorContext(s, a) {
  let e = SLo() ? groupSdkHostedServers(s) : null,
    t = getServerUrl(a ?? []);
  if (!t) return { ccrHosted: !1, metaConnector: null, hosted: e };
  let r = env.CLAUDE_CODE_REMOTE === !0,
    n = t.name,
    found = s.find((f) => f.mcpInfo?.serverName === n),
    c = found && mcpInfoFromString(found.name)?.serverName,
    m = c && p() ? { server: CLAUDE_CODE_REMOTE_DISPLAY_NAME, toolPrefix: c } : null;
  return { ccrHosted: r, metaConnector: m, hosted: e };
}
//@ chunk-9xyz2gbc.js:2600-2737 placement
function listArtifactConnectors(s, a) {
  let { metaConnector: metaConnector, hosted: hosted } = getArtifactConnectorContext(s, a),
    r = [
      ...groupClaudeAiConnectors(s),
      ...(hosted === null ? [] : [...hosted.named, ...hosted.undeclarable]),
    ];
  return metaConnector ? [...r, metaConnector] : r;
}

export {
  listArtifactConnectors,
  getMcpPrefix,
  Izs,
  connectorsInputSchema,
  groupClaudeAiConnectors,
  getArtifactConnectorContext,
  SLo,
};
