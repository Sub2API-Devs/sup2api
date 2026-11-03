/**
 * services/mcp/mcpStandardKeys.ts
 *
 * 2.1.316 新增：MCP 服务器"标准键"（跨会话识别同一服务器）与注册到托管策略
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-a76knw89.js (12)
 * attribution: placement 12
 */
import { saveGlobalConfigDurably, getGlobalConfig } from "../../utils/config.js";
import { ownField, ideReadSlot, TENGU_MARLIN_THICKET, MARLIN_THICKET_FLAG } from "../tools/batchTools.js";
import { logFeatureSad } from "../analytics/featureTelemetry.js";
import { getRootSession, isDiskless } from "../../bootstrap/state.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import {
  activateServerIdentity,
  isServerIdentityActive,
  ghIsDangerousCallback,
  mayRecordServerOwner,
  ownsLegacyKey,
  claimLegacyKey,
  registerToolIdentities,
  stdioLocalIdentity,
  wireName,
} from "./serverIdentity.js";
import { isSameOriginAsCcr } from "./ccrMcpUrls.js";
import { getOauthConfig } from "../../constants/oauth.js";
import { requiresConnectorGrant, connectorServerId, isMintedDynamicServer } from "./claudeai.js";
import {
  getToolNameForPermissionCheck as getToolNameForPermissionCheck_2,
  buildMcpToolName,
} from "./mcpStringUtils.js";
import { logForDebugging } from "../../utils/debug.js";
import { logError } from "../../utils/log.js";
import { isCliOwnedConfig } from "./cliOwnedClients.js";
import { errorMessage } from "../../utils/errors.js";
import { isPluginServerConfig } from "./types.js";
import { isBuiltinMcpServerName } from "./builtinServerNames.js";
import { normalizeNameForMCP } from "./normalization.js";
import { Ji } from "../../../vendor/lodash-es/uniqBy.js";

//@ chunk-a76knw89.js:16692-16898 placement
async function describeStandardKeyOutcome(e, n, o = false) {
  let r;
  if (
    !(await saveGlobalConfigDurably((s) => {
      r = o ? n : (ownField(s.mcpLegacyKeyOwners, e) ?? n);
      return {
        ...s,
        mcpLegacyKeyOwners: {
          ...s.mcpLegacyKeyOwners,
          [e]: r,
        },
      };
    }))
  ) {
    logFeatureSad("mcp_standard_key", "owner_not_saved");
    return;
  }
  return r;
}
//@ chunk-a76knw89.js:16898-17060 placement
/**
 * 判断服务器身份标准键是否启用，首次调用时按开关注册旧键归属的读取与认领函数。
 */
function isStandardKeyActive() {
  let e = ideReadSlot.of(getRootSession());
  if (!e.read) {
    e.read = true;
    if (getFeatureValue_CACHED_MAY_BE_STALE(TENGU_MARLIN_THICKET, false))
      activateServerIdentity({
        read: (n) => (isDiskless() ? undefined : ownField(getGlobalConfig().mcpLegacyKeyOwners, n)),
        claim: isDiskless() ? async (n, o) => o : describeStandardKeyOutcome,
      });
  }
  return isServerIdentityActive();
}
//@ chunk-a76knw89.js:17060-17160 placement
function isProxyHost(e) {
  try {
    return isSameOriginAsCcr(e) || new URL(e).host === new URL(getOauthConfig().MCP_PROXY_URL).host;
  } catch {
    return true;
  }
}
//@ chunk-a76knw89.js:17160-17244 placement
/**
 * 由服务器地址推出标准身份键（代理主机或危险回调地址给不出键时 undefined）。
 */
function configuredStandardKey(url) {
  let n = isProxyHost(url) ? undefined : ghIsDangerousCallback(url);
  return n === undefined
    ? undefined
    : {
        key: n,
        pinned: false,
      };
}
//@ chunk-a76knw89.js:17244-17426 placement
function isRemoteTransport(config) {
  if (
    (config.type !== "http" && config.type !== "sse" && config.type !== "claudeai-proxy") ||
    !URL.canParse(config.url) ||
    isProxyHost(config.url)
  )
    return;
  let n = ghIsDangerousCallback(new URL(config.url).origin);
  return n === ghIsDangerousCallback(config.url) ? undefined : n;
}
//@ chunk-a76knw89.js:17426-17555 placement
/**
 * 判断旧授权能否改绑到标准键：允许改绑、身份受跟踪、无逐次授权要求且未被其他服务器拥有。
 */
function isRebindableLegacyGrant(e) {
  let mcpInfo = e.mcpInfo;
  return (
    mcpInfo?.legacyGrantRebindable === true &&
    isIdentityTrackedServer(mcpInfo.serverName, mcpInfo) &&
    !requiresConnectorGrant(mcpInfo.serverName, mcpInfo) &&
    !mayRecordServerOwner(mcpInfo) &&
    !ownsLegacyKey(mcpInfo)
  );
}
//@ chunk-a76knw89.js:17555-17971 placement
function applyMcpServerAllowRule(tool, n, o) {
  let { mcpInfo } = tool;
  if (mcpInfo === undefined || !isRebindableLegacyGrant(tool)) return;
  let c = (s) => s.toolName === getToolNameForPermissionCheck_2(tool) && s.ruleContent === undefined;
  for (let s of n)
    if (s.type === "addRules" && s.behavior === "allow" && s.rules.some(c)) {
      claimLegacyKey(mcpInfo)
        .then((u) => {
          if (u)
            o({
              ...s,
              rules: s.rules.filter(c),
            });
          else
            logForDebugging(
              `MCP server "${mcpInfo.serverName}": could not make it the owner of its name, so "don't ask again" was not kept. You will be asked again.`,
            );
        })
        .catch(logError);
      return;
    }
}
//@ chunk-a76knw89.js:17971-18285 placement
/**
 * 把配置的 MCP 服务器（含标准键）注册给策略模块，失败时稍后重试。
 */
function registerConfiguredMcpServers(e) {
  try {
    if (isStandardKeyActive())
      registerToolIdentities(
        Object.entries(e).map(([key, value]) => ({
          server: {
            serverName: key,
            serverType: value.type ?? "stdio",
            serverId: connectorServerId(value),
          },
          standardKey: getServerIdentityKey(key, value, isCliOwnedConfig(value)),
          denyKey: isRemoteTransport(value),
          mayRecordOwner: isIdentityTrackedServer(key, value),
        })),
      );
  } catch (error) {
    logForDebugging(
      `Could not register configured MCP servers; will retry when their tools load: ${errorMessage(error)}`,
      {
        level: "warn",
      },
    );
  }
}
//@ chunk-a76knw89.js:18285-18411 placement
/**
 * 判断服务器是否参与身份跟踪（非项目、代理、插件作用域；动态作用域需满足条件）。
 */
function isIdentityTrackedServer(e, n) {
  return (
    n.scope !== "project" &&
    n.scope !== "agent" &&
    n.source !== "plugin" &&
    !isPluginServerConfig(n) &&
    (n.scope !== "dynamic" || isMintedDynamicServer(e, n))
  );
}
//@ chunk-a76knw89.js:18411-18781 placement = expandEnvVars (0.771)
/**
 * getServerIdentityKey：按 URL、命令行或 IDE 生成服务器身份键 {key, pinned}，保留名与 claude.ai 连接器固定为规范化名。
 */
function getServerIdentityKey(name, config, o) {
  if (o || isBuiltinMcpServerName(name))
    return {
      key: normalizeNameForMCP(name),
      pinned: true,
    };
  switch (config.type) {
    case "sse-ide":
    case "ws-ide":
      return {
        key: MARLIN_THICKET_FLAG,
        pinned: true,
      };
    case "http":
    case "sse":
      return configuredStandardKey(config.url);
    case "claudeai-proxy":
      return connectorServerId(config) === undefined ? undefined : configuredStandardKey(config.url);
    case "stdio":
    case undefined: {
      let { command, args } = config.configuredCommand ?? config;
      let s = stdioLocalIdentity(command, args ?? []);
      return s === undefined
        ? undefined
        : {
            key: s,
            pinned: false,
          };
    }
    default:
      return;
  }
}
//@ chunk-a76knw89.js:18828-19129 placement
function compareByName(e) {
  return Ji(e, "name").flatMap((n) =>
    n.mcpInfo !== undefined && n.name === buildMcpToolName(n.mcpInfo.serverName, n.mcpInfo.toolName)
      ? [
          {
            name: n.name,
            server: n.mcpInfo,
            standardKey: n.mcpInfo.standardKey,
            denyKey: n.mcpInfo.denyKey,
            mayRecordOwner:
              n.mcpInfo.scope === undefined
                ? undefined
                : isIdentityTrackedServer(n.mcpInfo.serverName, n.mcpInfo),
          },
        ]
      : [],
  );
}
//@ chunk-a76knw89.js:19129-19213 placement = mergeClients (1)
function mergeClients(e) {
  return "name" in e && typeof e.name === "string"
    ? {
        ...e,
        name: wireName(e.name),
      }
    : e;
}
export {
  isStandardKeyActive,
  getServerIdentityKey,
  isIdentityTrackedServer,
  isRemoteTransport,
  registerConfiguredMcpServers,
  compareByName,
  mergeClients,
  isRebindableLegacyGrant,
  applyMcpServerAllowRule,
};
