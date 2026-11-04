/**
 * services/mcp/fileReference/fileReferencePolicy.ts
 *
 * 2.1.316 新增。MCP 文件引用策略。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-kc2qkj8w.js (25)
 * attribution: placement 25
 */
import { SessionRootSlot } from "../../../bootstrap/sessionSlices.js";
import { isIdeOrSdkType, isPluginServerConfig } from "../types.js";
import { moduleStore } from "../mcpClientCapabilities.js";
import { isFirstPartyAnthropicHost } from "../../../utils/model/providers.js";
import { env } from "../../../utils/env.js";
import { firstPartyServerIdFor } from "../cliOwnedClients.js";
import { ARTIFACTS_SERVER_ID, mcpServerIdHeader } from "../firstPartyServerIds.js";
import { isRemoteManagedEnvironment } from "../../../utils/remoteEnvironment.js";
import { isDiskless, getRootSession } from "../../../bootstrap/state.js";
import { isClaudeAiProxyServer } from "../../../components/mcp/MCPListPanel.js";
import { isTopHostSession, isLocalAgentTopSession } from "../../../utils/sessionShape.js";
import { isChatOrTeams } from "../../../utils/entrypointKinds.js";
import { isPolicyVerdictAbsent, isPolicyAllowed } from "../../policyLimits/policyVerdicts.js";
import { isSessionVerdictDisowned } from "../../policyLimits/policyEvidence.js";
import { hasComplianceTaint } from "../../policyLimits/complianceTaints.js";
import { getPolicyLimitsIneligibleReason } from "../../policyLimits/policyState.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../analytics/growthbook.js";
import { logEvent } from "../../analytics/index.js";
import { fromEnum } from "../../analytics/safeMetadata.js";
import { fileReferenceTrackerSlot } from "../../api/fileReferenceCalls.js";
import { getGlobalConfig, saveGlobalConfigDurably } from "../../../utils/config.js";
import { logError } from "../../../utils/log.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  sanitizedFeatureErrorCodeForTelemetry,
} from "../../../utils/errors.js";
import { getOauthAccountInfo } from "../../../utils/auth.js";
import { isPlainObject } from "../../../utils/objectUtils.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-kc2qkj8w.js:1257-1393 placement
/**
 * 按会话根记录的无盘宿主状态。
 */
var ANTHROPIC_CHROMEUPLOADFILES; // deferred: uses SessionRootSlot (../../../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
var ANTHROPIC_CHROMEUPLOADMAXBYTES;
var ANTHROPIC_CHROMEUPLOADAUTOMODEONLY;
var disklessHostState;
deferInit("chunk-kc2qkj8w.js:1257", () => {
  ANTHROPIC_CHROMEUPLOADFILES = "anthropic/chromeUploadFiles";
  ANTHROPIC_CHROMEUPLOADMAXBYTES = "anthropic/chromeUploadMaxBytes";
  ANTHROPIC_CHROMEUPLOADAUTOMODEONLY = "anthropic/chromeUploadAutoModeOnly";
  disklessHostState = new SessionRootSlot(() => ({}));
});
//@ chunk-kc2qkj8w.js:1393-1494 placement
/**
 * 取服务器声明的 Chrome 上传大小上限（合法正整数时不超过默认上限）。
 */
function chromeUploadMaxBytes(meta, cap) {
  let limit = meta?.[ANTHROPIC_CHROMEUPLOADMAXBYTES];
  return typeof limit === "number" && Number.isInteger(limit) && limit > 0 ? Math.min(limit, cap) : cap;
}
//@ chunk-kc2qkj8w.js:1494-1586 placement
/**
 * 判断服务器是否属于一方上传作用域（非 project、非 relayed、非插件）。
 */
function isFirstPartyUploadScope(serverConfig) {
  return (
    serverConfig !== undefined &&
    isIdeOrSdkType(serverConfig.type) &&
    serverConfig.scope !== "project" &&
    serverConfig.relayed !== true &&
    !isPluginServerConfig(serverConfig)
  );
}
//@ chunk-kc2qkj8w.js:1586-1695 placement
/**
 * 判断 MCP 服务器配置的来源：SDK、插件或其配置作用域。
 */
function mcpServerSource(serverName, config) {
  if (config.type === "sdk" && isFirstPartyUploadScope(config)) return "sdk";
  if (isPluginServerConfig(config) || isPluginOwnedDynamicServer(serverName, config.scope)) return "plugin";
  return config.scope;
}
//@ chunk-kc2qkj8w.js:1695-1875 placement
/**
 * 生成钩子输入中的 MCP 服务器身份（名称与来源：插件、SDK 或作用域）。
 */
function mcpServerIdentityForHooks(mcpInfo) {
  return {
    name: mcpInfo.serverName,
    source:
      mcpInfo.source ??
      (mcpInfo.pluginTelemetry !== undefined ||
      isPluginOwnedDynamicServer(mcpInfo.serverName, mcpInfo.scope ?? "dynamic")
        ? "plugin"
        : mcpInfo.serverType === "sdk"
          ? "sdk"
          : (mcpInfo.scope ?? "dynamic")),
  };
}
//@ chunk-kc2qkj8w.js:1875-1940 placement
/**
 * 判断该动态服务器是否由插件提供。
 */
function isPluginOwnedDynamicServer(serverName, scope) {
  return scope === "dynamic" && moduleStore.ownerOfKey(serverName) !== undefined;
}
//@ chunk-kc2qkj8w.js:1940-2002 placement
var X_MCP_SERVER_ORIGIN = "x-mcp-server-origin";
var X_CCR_OWNER_SLACK_USER_ID = "x-ccr-owner-slack-user-id";
//@ chunk-kc2qkj8w.js:2002-2098 placement
/**
 * 取请求头里某名字（忽略大小写）的所有值。
 */
function headerValues(headers, headerName) {
  return Object.entries(headers ?? {})
    .filter(([key]) => key.toLowerCase() === headerName)
    .map(([, value]) => value);
}
//@ chunk-kc2qkj8w.js:2098-2123 placement
/**
 * 服务器能力缓存。
 */
var serverCapabilityCache; // deferred: uses SessionRootSlot (../../../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-kc2qkj8w.js:2098", () => {
  serverCapabilityCache = new SessionRootSlot(() => ({}));
});
//@ chunk-kc2qkj8w.js:2123-2160 placement
var ANTHROPIC_CLAUDEAICONNECTOR = "anthropic/claudeAiConnector";
//@ chunk-kc2qkj8w.js:2160-2268 placement
function isFirstPartyPathUrl(url, path) {
  return (
    url.protocol === "https:" &&
    url.username === "" &&
    url.password === "" &&
    isFirstPartyAnthropicHost(url.href) &&
    url.pathname === path
  );
}
//@ chunk-kc2qkj8w.js:2268-2864 placement
/**
 * 判断一个 MCP 连接是否是指定 id 的一方工具箱服务器（用于文件上传/任务文件等特权）：CLI 自有配置要求 id、路径、URL 精确匹配且不在受限环境；claude.ai 代理按 URL；SDK 服务器按声明的连接器 id；云会话中的动态 http 服务器按 x-mcp-server-id。
 */
function isFirstPartyToolboxServer(connection, { path, serverId }) {
  try {
    if (env.CLAUDE_CODE_ENVIRONMENT_KIND === "byoc") return false;
    let config = connection.config;
    let firstPartyId = firstPartyServerIdFor(config);
    if (firstPartyId !== undefined) {
      let isArtifactsRemote = firstPartyId === ARTIFACTS_SERVER_ID && isRemoteManagedEnvironment();
      if (
        firstPartyId !== serverId ||
        config.type !== "http" ||
        isDiskless() ||
        (!isArtifactsRemote && (env.CLAUDE_CODE_REMOTE || env.CLAUDE_CODE_ENVIRONMENT_KIND))
      )
        return false;
      let url = new URL(config.url);
      return url.search === "" && isFirstPartyPathUrl(url, path);
    }
    if (config.type === "claudeai-proxy") {
      if (!isClaudeAiProxyServer(config)) return false;
      return isFirstPartyPathUrl(new URL(config.url), path);
    }
    if (config.type === "sdk") return claudeAiConnectorCapability(connection)?.serverId === serverId;
    let CLAUDE_CODE_ENVIRONMENT_KIND = env.CLAUDE_CODE_ENVIRONMENT_KIND;
    return (
      env.CLAUDE_CODE_REMOTE === true &&
      (!CLAUDE_CODE_ENVIRONMENT_KIND || CLAUDE_CODE_ENVIRONMENT_KIND === "anthropic_cloud") &&
      config.type === "http" &&
      config.scope === "dynamic" &&
      !isPluginServerConfig(config) &&
      mcpServerIdHeader(config) === serverId
    );
  } catch {
    return false;
  }
}
//@ chunk-kc2qkj8w.js:2864-3145 placement
function claudeAiConnectorCapability(connection) {
  try {
    let config = connection.config;
    let capability = connection.capabilities?.experimental?.[ANTHROPIC_CLAUDEAICONNECTOR];
    if (
      config.type !== "sdk" ||
      !isFirstPartyUploadScope(config) ||
      isDiskless() ||
      env.CLAUDE_CODE_REMOTE ||
      env.CLAUDE_CODE_ENVIRONMENT_KIND ||
      !isTopHostSession() ||
      typeof capability !== "object" ||
      capability === null ||
      !("serverId" in capability) ||
      capability.serverId !== (config.connectorId ?? connection.name)
    )
      return;
    return capability;
  } catch {
    return;
  }
}
//@ chunk-kc2qkj8w.js:3145-3266 placement
/**
 * 判断文件引用功能为何不可用：无盘环境、Slack/Teams 中继，或策略原因。
 */
function fileReferenceUnavailableReason(toolSpec) {
  if (isDiskless() && disklessHostState.peek(getRootSession())?.host === undefined) return "diskless";
  if (isChatOrTeams()) return "slack_or_teams_relay";
  return fileReferencePolicyBlock(toolSpec);
}
//@ chunk-kc2qkj8w.js:3266-3443 placement
function fileReferencePolicyBlock(toolSpec) {
  let limitsReason = policyLimitsUnavailableReason();
  if (limitsReason !== undefined) return limitsReason;
  if (isPolicyVerdictAbsent()) return "policy_not_loaded";
  if (isSessionVerdictDisowned() && hasComplianceTaint("hipaa")) return "policy_not_loaded";
  if (!isPolicyAllowed(toolSpec.policy)) return "policy_denied";
  return;
}
//@ chunk-kc2qkj8w.js:3443-3666 placement
function policyLimitsUnavailableReason() {
  let ineligibleReason;
  try {
    ineligibleReason = getPolicyLimitsIneligibleReason();
  } catch {
    return "policy_not_asked";
  }
  switch (ineligibleReason) {
    case undefined:
    case "prosumer_oauth":
      return;
    case "third_party_provider":
    case "custom_base_url":
      return "policy_never_served";
    default:
      return "policy_not_asked";
  }
}
//@ chunk-kc2qkj8w.js:3666-4607 placement
class FileReferenceOffer {
  #o = new Set();
  #e = new Map();
  #n = "not_checked";
  #r = false;
  mayLogTypedRow(row) {
    if (this.#r) return false;
    let state = fileReferenceOfferState(row);
    if (state === "no") this.#t();
    return state === "yes";
  }
  undecidedReason() {
    return this.#n;
  }
  holdUndecidedReason(reason) {
    this.#n = reason;
  }
  note(row, availability) {
    try {
      let key =
        availability.state === "offered"
          ? availability.state
          : `${availability.state}:${availability.reason}`;
      if (availability.state === "offered" || availability.state === "latched_off") {
        this.#n = "not_checked";
        for (let [key, { availability: entry }] of this.#e)
          if (entry.state === "latched_off") this.#e.delete(key);
      }
      if (
        (availability.state === "latched_off" && availability.reason === "policy_denied") ||
        fileReferenceOfferState(row) === "no"
      )
        this.#t();
      if (!this.#r && !this.#o.has(key))
        this.#e.set(key, {
          row,
          availability,
        });
    } catch {}
    this.flush();
  }
  flush() {
    try {
      for (let [key, { row, availability }] of this.#e) {
        if (!getFeatureValue_CACHED_MAY_BE_STALE(row.flag, false)) continue;
        let offerState = fileReferenceOfferState(row);
        if (offerState === "no") {
          this.#t();
          return;
        }
        if (offerState === "pending") continue;
        this.#e.delete(key);
        this.#o.add(key);
        logEvent("tengu_mcp_drive_file_reference_availability", {
          state: fromEnum(availability.state),
          ...(availability.state !== "offered" && {
            reason: fromEnum(availability.reason),
          }),
        });
      }
    } catch {}
  }
  #t() {
    this.#r = true;
    this.#e.clear();
  }
}
//@ chunk-kc2qkj8w.js:4607-4771 placement
function fileReferenceOfferState(toolSpec) {
  if (hasComplianceTaint("hipaa")) return "no";
  let block = fileReferencePolicyBlock(toolSpec);
  if (block === "policy_not_asked" || block === "policy_not_loaded" || isPolicyVerdictAbsent())
    return "pending";
  return block === "policy_denied" ? "no" : "yes";
}
//@ chunk-kc2qkj8w.js:4771-4797 placement
/**
 * 按会话根保存的文件引用提供状态。
 */
var fileReferenceOfferSlot; // deferred: uses SessionRootSlot (../../../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-kc2qkj8w.js:4771", () => {
  fileReferenceOfferSlot = new SessionRootSlot(() => new FileReferenceOffer());
});
//@ chunk-kc2qkj8w.js:4797-4830 placement
/**
 * 取当前会话的文件引用提供状态。
 */
function getFileReferenceOffer() {
  return fileReferenceOfferSlot.of(getRootSession());
}
//@ chunk-kc2qkj8w.js:4830-4961 placement
function isFirstReferenceApproved(session, permissionName) {
  let accountUuid = approvalAccountUuid();
  return (
    fileReferenceTrackerSlot
      .peek(session)
      ?.isFirstReferenceApproved(`${accountUuid ?? ""}:${permissionName}`) === true ||
    (accountUuid !== undefined && approvedUploadsFor(getGlobalConfig(), accountUuid).includes(permissionName))
  );
}
//@ chunk-kc2qkj8w.js:4961-5495 placement
/**
 * 记录一次"通过文件引用上传"已获批准：会话内标记，并在需要且有账号时持久化到全局配置 fileReferenceUploadsApproved（按账号 uuid 分组）；失败只记错误。
 */
function recordFirstReferenceApproved(session, permissionName, persist, storageV5) {
  try {
    let accountUuid = approvalAccountUuid();
    fileReferenceTrackerSlot.of(session).noteFirstReferenceApproved(`${accountUuid ?? ""}:${permissionName}`);
    if (!persist || accountUuid === undefined) return;
    saveGlobalConfigDurably(
      (config) =>
        approvedUploadsFor(config, accountUuid).includes(permissionName)
          ? config
          : {
              ...config,
              fileReferenceUploadsApproved: {
                ...approvedUploadsMap(config),
                [accountUuid]: [...approvedUploadsFor(config, accountUuid), permissionName],
              },
            },
      storageV5,
    );
  } catch (error) {
    logError(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `[file reference] could not fully record that an upload by file reference was approved (${sanitizedFeatureErrorCodeForTelemetry(error instanceof Error ? error.name : typeof error)}), so a later one may be asked about again.`,
        "[file reference] could not fully record that an upload by file reference was approved; a later one may be asked about again",
      ),
    );
  }
}
//@ chunk-kc2qkj8w.js:5495-5606 placement
function approvalAccountUuid() {
  return env.CLAUDE_CODE_REMOTE ||
    env.CLAUDE_CODE_ENVIRONMENT_KIND ||
    isDiskless() ||
    isLocalAgentTopSession()
    ? undefined
    : getOauthAccountInfo()?.accountUuid;
}
//@ chunk-kc2qkj8w.js:5606-5676 placement
/**
 * 取已批准的首次上传记录表。
 */
function approvedUploadsMap(config) {
  let fileReferenceUploadsApproved = config.fileReferenceUploadsApproved;
  return isPlainObject(fileReferenceUploadsApproved) ? fileReferenceUploadsApproved : {};
}
//@ chunk-kc2qkj8w.js:5676-5767 placement
/**
 * 取某服务器已批准的调用记录。
 */
function approvedUploadsFor(config, accountUuid) {
  let map = approvedUploadsMap(config);
  let value = Object.hasOwn(map, accountUuid) ? map[accountUuid] : undefined;
  return Array.isArray(value) ? value : [];
}
export {
  mcpServerSource,
  fileReferenceUnavailableReason,
  disklessHostState,
  headerValues,
  X_MCP_SERVER_ORIGIN,
  X_CCR_OWNER_SLACK_USER_ID,
  chromeUploadMaxBytes,
  serverCapabilityCache,
  isFirstPartyUploadScope,
  ANTHROPIC_CHROMEUPLOADAUTOMODEONLY,
  mcpServerIdentityForHooks,
  getFileReferenceOffer,
  isFirstPartyToolboxServer,
  claudeAiConnectorCapability,
  recordFirstReferenceApproved,
  isFirstReferenceApproved,
  ANTHROPIC_CHROMEUPLOADFILES,
};
