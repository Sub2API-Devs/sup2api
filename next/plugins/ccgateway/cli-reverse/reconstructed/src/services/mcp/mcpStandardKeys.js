/**
 * services/mcp/mcpStandardKeys.ts
 *
 * 2.1.316 新增：MCP 服务器"标准键"（跨会话识别同一服务器）与注册到托管策略
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-03tec5k5.js (14)
 * attribution: placement 12, layout 2
 */
import { saveGlobalConfigDurably, getGlobalConfig } from "../../utils/config.js";
import {
  ownField,
  ideReadSlot,
  TENGU_MARLIN_THICKET,
  BOT_PROTECTED_TENGU_DAPPER_BLUM,
  MARLIN_THICKET_FLAG,
} from "../tools/batchTools.js";
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
import { CLAUDEAI_SERVER_PREFIX } from "./normalization.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { uniqByExport } from "../../../vendor/lodash-es/uniqBy.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-03tec5k5.js:12066-12272 placement
async function describeStandardKeyOutcome(serverKey, owner, overwrite = false) {
  let chosenOwner;
  if (
    !(await saveGlobalConfigDurably((config) => {
      chosenOwner = overwrite ? owner : (ownField(config.mcpLegacyKeyOwners, serverKey) ?? owner);
      return {
        ...config,
        mcpLegacyKeyOwners: {
          ...config.mcpLegacyKeyOwners,
          [serverKey]: chosenOwner,
        },
      };
    }))
  ) {
    logFeatureSad("mcp_standard_key", "owner_not_saved");
    return;
  }
  return chosenOwner;
}
//@ chunk-03tec5k5.js:12272-12464 placement
/**
 * 判断服务器身份标准键是否启用，首次调用时按开关注册旧键归属的读取与认领函数。
 */
function isStandardKeyActive() {
  let slot = ideReadSlot.of(getRootSession());
  if (!slot.read) {
    slot.read = true;
    if (getFeatureValue_CACHED_MAY_BE_STALE(TENGU_MARLIN_THICKET, false))
      activateServerIdentity({
        enforcesGrants: getFeatureValue_CACHED_MAY_BE_STALE(BOT_PROTECTED_TENGU_DAPPER_BLUM, false) === true,
        read: (serverKey) =>
          isDiskless() ? undefined : ownField(getGlobalConfig().mcpLegacyKeyOwners, serverKey),
        claim: isDiskless() ? async (serverKey, owner) => owner : describeStandardKeyOutcome,
      });
  }
  return isServerIdentityActive();
}
//@ chunk-03tec5k5.js:12464-12564 placement
function isProxyHost(url) {
  try {
    return isSameOriginAsCcr(url) || new URL(url).host === new URL(getOauthConfig().MCP_PROXY_URL).host;
  } catch {
    return true;
  }
}
//@ chunk-03tec5k5.js:12564-12648 placement
/**
 * 由服务器地址推出标准身份键（代理主机或危险回调地址给不出键时 undefined）。
 */
function configuredStandardKey(url) {
  let serverKey = isProxyHost(url) ? undefined : ghIsDangerousCallback(url);
  return serverKey === undefined
    ? undefined
    : {
        key: serverKey,
        pinned: false,
      };
}
//@ chunk-03tec5k5.js:12648-12830 placement
function isRemoteTransport(config) {
  if (
    (config.type !== "http" && config.type !== "sse" && config.type !== "claudeai-proxy") ||
    !URL.canParse(config.url) ||
    isProxyHost(config.url)
  )
    return;
  let originKey = ghIsDangerousCallback(new URL(config.url).origin);
  return originKey === ghIsDangerousCallback(config.url) ? undefined : originKey;
}
//@ chunk-03tec5k5.js:12830-12959 placement
/**
 * 判断旧授权能否改绑到标准键：允许改绑、身份受跟踪、无逐次授权要求且未被其他服务器拥有。
 */
function isRebindableLegacyGrant(tool) {
  let mcpInfo = tool.mcpInfo;
  return (
    mcpInfo?.legacyGrantRebindable === true &&
    isIdentityTrackedServer(mcpInfo.serverName, mcpInfo) &&
    !requiresConnectorGrant(mcpInfo.serverName, mcpInfo) &&
    !mayRecordServerOwner(mcpInfo) &&
    !ownsLegacyKey(mcpInfo)
  );
}
//@ chunk-03tec5k5.js:12959-13375 placement
function applyMcpServerAllowRule(tool, suggestions, options) {
  let { mcpInfo } = tool;
  if (mcpInfo === undefined || !isRebindableLegacyGrant(tool)) return;
  let isWholeToolRule = (rule) =>
    rule.toolName === getToolNameForPermissionCheck_2(tool) && rule.ruleContent === undefined;
  for (let suggestion of suggestions)
    if (
      suggestion.type === "addRules" &&
      suggestion.behavior === "allow" &&
      suggestion.rules.some(isWholeToolRule)
    ) {
      claimLegacyKey(mcpInfo)
        .then((allowed) => {
          if (allowed)
            options({
              ...suggestion,
              rules: suggestion.rules.filter(isWholeToolRule),
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
//@ chunk-03tec5k5.js:13375-13689 placement
/**
 * 把配置的 MCP 服务器（含标准键）注册给策略模块，失败时稍后重试。
 */
function registerConfiguredMcpServers(configs) {
  try {
    if (isStandardKeyActive())
      registerToolIdentities(
        Object.entries(configs).map(([key, value]) => ({
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
//@ chunk-03tec5k5.js:13689-13815 placement
/**
 * 判断服务器是否参与身份跟踪（非项目、代理、插件作用域；动态作用域需满足条件）。
 */
function isIdentityTrackedServer(serverName, mcpInfo) {
  return (
    mcpInfo.scope !== "project" &&
    mcpInfo.scope !== "agent" &&
    mcpInfo.source !== "plugin" &&
    !isPluginServerConfig(mcpInfo) &&
    (mcpInfo.scope !== "dynamic" || isMintedDynamicServer(serverName, mcpInfo))
  );
}
//@ chunk-03tec5k5.js:13815-14109 placement (2.1.88 match: expandEnvVars, 0.81)
/**
 * getServerIdentityKey：按 URL、命令行或 IDE 生成服务器身份键 {key, pinned}，保留名与 claude.ai 连接器固定为规范化名。
 */
function getServerIdentityKey(name, config, forcePinned) {
  if (forcePinned || isBuiltinMcpServerName(name))
    return {
      key: CLAUDEAI_SERVER_PREFIX(name),
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
    case undefined:
      return {
        key: CLAUDEAI_SERVER_PREFIX(name),
        pinned: false,
      };
    default:
      return;
  }
}
//@ chunk-03tec5k5.js:14109-14195 layout
/**
 * 云端文件持久化执行器的单例占位（默认返回 ok:false）。
 */
var sharedKeyState; // deferred: uses SessionRootSlot (../../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-03tec5k5.js:14109", () => {
  sharedKeyState = new SessionRootSlot(() => ({
    ok: false,
    kept: false,
    failed: false,
    resumedOnSharedKey: false,
    serverKeyMoved: false,
  }));
});
//@ chunk-03tec5k5.js:14195-14322 layout
function isStandardKeyEntry({ mcpInfo }) {
  return (
    mcpInfo != null &&
    mcpInfo.standardKey === undefined &&
    (typeof mcpInfo.serverName !== "string" || typeof mcpInfo.toolName !== "string")
  );
}
//@ chunk-03tec5k5.js:14322-14650 placement
function compareByName(tools) {
  let filtered = tools.filter((tool) => !isStandardKeyEntry(tool));
  return uniqByExport(filtered, "name").flatMap((tool) =>
    tool.mcpInfo !== undefined &&
    tool.name === buildMcpToolName(tool.mcpInfo.serverName, tool.mcpInfo.toolName)
      ? [
          {
            name: tool.name,
            server: tool.mcpInfo,
            standardKey: tool.mcpInfo.standardKey,
            denyKey: tool.mcpInfo.denyKey,
            mayRecordOwner:
              tool.mcpInfo.scope === undefined
                ? undefined
                : isIdentityTrackedServer(tool.mcpInfo.serverName, tool.mcpInfo),
          },
        ]
      : [],
  );
}
//@ chunk-03tec5k5.js:14650-14733 placement (2.1.88 match: mergeClients, 1)
function mergeClients(client) {
  return "name" in client && typeof client.name === "string"
    ? {
        ...client,
        name: wireName(client.name),
      }
    : client;
}
export {
  sharedKeyState,
  isStandardKeyEntry,
  isStandardKeyActive,
  compareByName,
  mergeClients,
  getServerIdentityKey,
  isIdentityTrackedServer,
  isRemoteTransport,
  registerConfiguredMcpServers,
  isRebindableLegacyGrant,
  applyMcpServerAllowRule,
};
