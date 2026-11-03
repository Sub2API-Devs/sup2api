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
import { Ye, Ln, TENGU_MARLIN_THICKET, IDE } from "../tools/batchTools.js";
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
  qPi,
  GPi,
  wireName,
} from "./serverIdentity.js";
import { isSameOriginAsCcr } from "./ccrMcpUrls.js";
import { getOauthConfig } from "../../constants/oauth.js";
import { qq, gH, _6r } from "./claudeai.js";
import {
  getToolNameForPermissionCheck as getToolNameForPermissionCheck_2,
  buildMcpToolName,
} from "./mcpStringUtils.js";
import { logForDebugging } from "../../utils/debug.js";
import { logError } from "../../utils/log.js";
import { Zl } from "./cliOwnedClients.js";
import { errorMessage } from "../../utils/errors.js";
import { isPluginServerConfig } from "./types.js";
import { isBuiltinMcpServerName } from "./builtinServerNames.js";
import { normalizeNameForMCP } from "./normalization.js";
import { Ji } from "../../../vendor/lodash-es/uniqBy.js";

//@ chunk-a76knw89.js:16692-16898 placement
async function describeStandardKeyOutcome(e, n, o = !1) {
  let r;
  if (
    !(await saveGlobalConfigDurably(
      (s) => (
        (r = o ? n : (Ye(s.mcpLegacyKeyOwners, e) ?? n)),
        { ...s, mcpLegacyKeyOwners: { ...s.mcpLegacyKeyOwners, [e]: r } }
      ),
    ))
  ) {
    logFeatureSad("mcp_standard_key", "owner_not_saved");
    return;
  }
  return r;
}
/**
 * 判断服务器身份标准键是否启用，首次调用时按开关注册旧键归属的读取与认领函数。
 */
//@ chunk-a76knw89.js:16898-17060 placement
function isStandardKeyActive() {
  let of = Ln.of(getRootSession());
  if (!of.read) {
    if (((of.read = !0), getFeatureValue_CACHED_MAY_BE_STALE(TENGU_MARLIN_THICKET, !1)))
      activateServerIdentity({
        read: (n) => (isDiskless() ? void 0 : Ye(getGlobalConfig().mcpLegacyKeyOwners, n)),
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
    return !0;
  }
}
//@ chunk-a76knw89.js:17160-17244 placement
function ze(e) {
  let n = isProxyHost(e) ? void 0 : ghIsDangerousCallback(e);
  return n === void 0 ? void 0 : { key: n, pinned: !1 };
}
//@ chunk-a76knw89.js:17244-17426 placement
function isRemoteTransport(e) {
  if (
    (e.type !== "http" && e.type !== "sse" && e.type !== "claudeai-proxy") ||
    !URL.canParse(e.url) ||
    isProxyHost(e.url)
  )
    return;
  let n = ghIsDangerousCallback(new URL(e.url).origin);
  return n === ghIsDangerousCallback(e.url) ? void 0 : n;
}
/**
 * 判断旧授权能否改绑到标准键：允许改绑、身份受跟踪、无逐次授权要求且未被其他服务器拥有。
 */
//@ chunk-a76knw89.js:17426-17555 placement
function isRebindableLegacyGrant(e) {
  let mcpInfo = e.mcpInfo;
  return (
    mcpInfo?.legacyGrantRebindable === !0 &&
    isIdentityTrackedServer(mcpInfo.serverName, mcpInfo) &&
    !qq(mcpInfo.serverName, mcpInfo) &&
    !mayRecordServerOwner(mcpInfo) &&
    !ownsLegacyKey(mcpInfo)
  );
}
//@ chunk-a76knw89.js:17555-17971 placement
function applyMcpServerAllowRule(e, n, o) {
  let { mcpInfo: mcpInfo } = e;
  if (mcpInfo === void 0 || !isRebindableLegacyGrant(e)) return;
  let c = (s) => s.toolName === getToolNameForPermissionCheck_2(e) && s.ruleContent === void 0;
  for (let s of n)
    if (s.type === "addRules" && s.behavior === "allow" && s.rules.some(c)) {
      claimLegacyKey(mcpInfo)
        .then((u) => {
          if (u) o({ ...s, rules: s.rules.filter(c) });
          else
            logForDebugging(
              `MCP server "${mcpInfo.serverName}": could not make it the owner of its name, so "don't ask again" was not kept. You will be asked again.`,
            );
        })
        .catch(logError);
      return;
    }
}
/**
 * 把配置的 MCP 服务器（含标准键）注册给策略模块，失败时稍后重试。
 */
//@ chunk-a76knw89.js:17971-18285 placement
function registerConfiguredMcpServers(e) {
  try {
    if (isStandardKeyActive())
      qPi(
        Object.entries(e).map(([n, o]) => ({
          server: { serverName: n, serverType: o.type ?? "stdio", serverId: gH(o) },
          standardKey: getServerIdentityKey(n, o, Zl(o)),
          denyKey: isRemoteTransport(o),
          mayRecordOwner: isIdentityTrackedServer(n, o),
        })),
      );
  } catch (error) {
    logForDebugging(
      `Could not register configured MCP servers; will retry when their tools load: ${errorMessage(error)}`,
      { level: "warn" },
    );
  }
}
/**
 * 判断服务器是否参与身份跟踪（非项目、代理、插件作用域；动态作用域需满足条件）。
 */
//@ chunk-a76knw89.js:18285-18411 placement
function isIdentityTrackedServer(e, n) {
  return (
    n.scope !== "project" &&
    n.scope !== "agent" &&
    n.source !== "plugin" &&
    !isPluginServerConfig(n) &&
    (n.scope !== "dynamic" || _6r(e, n))
  );
}
/**
 * getServerIdentityKey：按 URL、命令行或 IDE 生成服务器身份键 {key, pinned}，保留名与 claude.ai 连接器固定为规范化名。
 */
//@ chunk-a76knw89.js:18411-18781 placement = expandEnvVars (0.771)
function getServerIdentityKey(e, n, o) {
  if (o || isBuiltinMcpServerName(e)) return { key: normalizeNameForMCP(e), pinned: !0 };
  switch (n.type) {
    case "sse-ide":
    case "ws-ide":
      return { key: IDE, pinned: !0 };
    case "http":
    case "sse":
      return ze(n.url);
    case "claudeai-proxy":
      return gH(n) === void 0 ? void 0 : ze(n.url);
    case "stdio":
    case void 0: {
      let { command: command, args: args } = n.configuredCommand ?? n,
        s = GPi(command, args ?? []);
      return s === void 0 ? void 0 : { key: s, pinned: !1 };
    }
    default:
      return;
  }
}
//@ chunk-a76knw89.js:18828-19129 placement
function compareByName(e) {
  return Ji(e, "name").flatMap((n) =>
    n.mcpInfo !== void 0 && n.name === buildMcpToolName(n.mcpInfo.serverName, n.mcpInfo.toolName)
      ? [
          {
            name: n.name,
            server: n.mcpInfo,
            standardKey: n.mcpInfo.standardKey,
            denyKey: n.mcpInfo.denyKey,
            mayRecordOwner:
              n.mcpInfo.scope === void 0 ? void 0 : isIdentityTrackedServer(n.mcpInfo.serverName, n.mcpInfo),
          },
        ]
      : [],
  );
}
//@ chunk-a76knw89.js:19129-19213 placement = mergeClients (1)
function mergeClients(e) {
  return "name" in e && typeof e.name === "string" ? { ...e, name: wireName(e.name) } : e;
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
