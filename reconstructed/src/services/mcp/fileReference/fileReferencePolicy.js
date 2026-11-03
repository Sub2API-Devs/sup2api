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

//@ chunk-kc2qkj8w.js:1257-1393 placement
/**
 * 按会话根记录的无盘宿主状态。
 */
var ANTHROPIC_CHROMEUPLOADFILES = "anthropic/chromeUploadFiles";
var ANTHROPIC_CHROMEUPLOADMAXBYTES = "anthropic/chromeUploadMaxBytes";
var ANTHROPIC_CHROMEUPLOADAUTOMODEONLY = "anthropic/chromeUploadAutoModeOnly";
var disklessHostState = new SessionRootSlot(() => ({}));
//@ chunk-kc2qkj8w.js:1393-1494 placement
/**
 * 取服务器声明的 Chrome 上传大小上限（合法正整数时不超过默认上限）。
 */
function chromeUploadMaxBytes(e, n) {
  let r = e?.[ANTHROPIC_CHROMEUPLOADMAXBYTES];
  return typeof r === "number" && Number.isInteger(r) && r > 0 ? Math.min(r, n) : n;
}
//@ chunk-kc2qkj8w.js:1494-1586 placement
/**
 * 判断服务器是否属于一方上传作用域（非 project、非 relayed、非插件）。
 */
function isFirstPartyUploadScope(config) {
  return (
    config !== undefined &&
    isIdeOrSdkType(config.type) &&
    config.scope !== "project" &&
    config.relayed !== true &&
    !isPluginServerConfig(config)
  );
}
//@ chunk-kc2qkj8w.js:1586-1695 placement
/**
 * 判断 MCP 服务器配置的来源：SDK、插件或其配置作用域。
 */
function mcpServerSource(name, config) {
  if (config.type === "sdk" && isFirstPartyUploadScope(config)) return "sdk";
  if (isPluginServerConfig(config) || isPluginOwnedDynamicServer(name, config.scope)) return "plugin";
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
function isPluginOwnedDynamicServer(e, n) {
  return n === "dynamic" && moduleStore.ownerOfKey(e) !== undefined;
}
//@ chunk-kc2qkj8w.js:1940-2002 placement
var X_MCP_SERVER_ORIGIN = "x-mcp-server-origin";
var X_CCR_OWNER_SLACK_USER_ID = "x-ccr-owner-slack-user-id";
//@ chunk-kc2qkj8w.js:2002-2098 placement
/**
 * 取请求头里某名字（忽略大小写）的所有值。
 */
function headerValues(headers, n) {
  return Object.entries(headers ?? {})
    .filter(([key]) => key.toLowerCase() === n)
    .map(([, value]) => value);
}
//@ chunk-kc2qkj8w.js:2098-2123 placement
/**
 * 服务器能力缓存。
 */
var serverCapabilityCache = new SessionRootSlot(() => ({}));
//@ chunk-kc2qkj8w.js:2123-2160 placement
var ANTHROPIC_CLAUDEAICONNECTOR = "anthropic/claudeAiConnector";
//@ chunk-kc2qkj8w.js:2160-2268 placement
function isFirstPartyPathUrl(e, path) {
  return (
    e.protocol === "https:" &&
    e.username === "" &&
    e.password === "" &&
    isFirstPartyAnthropicHost(e.href) &&
    e.pathname === path
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
    let o = firstPartyServerIdFor(config);
    if (o !== undefined) {
      let y = o === ARTIFACTS_SERVER_ID && isRemoteManagedEnvironment();
      if (
        o !== serverId ||
        config.type !== "http" ||
        isDiskless() ||
        (!y && (env.CLAUDE_CODE_REMOTE || env.CLAUDE_CODE_ENVIRONMENT_KIND))
      )
        return false;
      let R = new URL(config.url);
      return R.search === "" && isFirstPartyPathUrl(R, path);
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
function claudeAiConnectorCapability(e) {
  try {
    let config = e.config;
    let r = e.capabilities?.experimental?.[ANTHROPIC_CLAUDEAICONNECTOR];
    if (
      config.type !== "sdk" ||
      !isFirstPartyUploadScope(config) ||
      isDiskless() ||
      env.CLAUDE_CODE_REMOTE ||
      env.CLAUDE_CODE_ENVIRONMENT_KIND ||
      !isTopHostSession() ||
      typeof r !== "object" ||
      r === null ||
      !("serverId" in r) ||
      r.serverId !== (config.connectorId ?? e.name)
    )
      return;
    return r;
  } catch {
    return;
  }
}
//@ chunk-kc2qkj8w.js:3145-3266 placement
/**
 * 判断文件引用功能为何不可用：无盘环境、Slack/Teams 中继，或策略原因。
 */
function fileReferenceUnavailableReason(e) {
  if (isDiskless() && disklessHostState.peek(getRootSession())?.host === undefined) return "diskless";
  if (isChatOrTeams()) return "slack_or_teams_relay";
  return fileReferencePolicyBlock(e);
}
//@ chunk-kc2qkj8w.js:3266-3443 placement
function fileReferencePolicyBlock(e) {
  let n = policyLimitsUnavailableReason();
  if (n !== undefined) return n;
  if (isPolicyVerdictAbsent()) return "policy_not_loaded";
  if (isSessionVerdictDisowned() && hasComplianceTaint("hipaa")) return "policy_not_loaded";
  if (!isPolicyAllowed(e.policy)) return "policy_denied";
  return;
}
//@ chunk-kc2qkj8w.js:3443-3666 placement
function policyLimitsUnavailableReason() {
  let e;
  try {
    e = getPolicyLimitsIneligibleReason();
  } catch {
    return "policy_not_asked";
  }
  switch (e) {
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
  mayLogTypedRow(e) {
    if (this.#r) return false;
    let n = fileReferenceOfferState(e);
    if (n === "no") this.#t();
    return n === "yes";
  }
  undecidedReason() {
    return this.#n;
  }
  holdUndecidedReason(e) {
    this.#n = e;
  }
  note(e, n) {
    try {
      let r = n.state === "offered" ? n.state : `${n.state}:${n.reason}`;
      if (n.state === "offered" || n.state === "latched_off") {
        this.#n = "not_checked";
        for (let [t, { availability: o }] of this.#e) if (o.state === "latched_off") this.#e.delete(t);
      }
      if ((n.state === "latched_off" && n.reason === "policy_denied") || fileReferenceOfferState(e) === "no")
        this.#t();
      if (!this.#r && !this.#o.has(r))
        this.#e.set(r, {
          row: e,
          availability: n,
        });
    } catch {}
    this.flush();
  }
  flush() {
    try {
      for (let [e, { row: n, availability: r }] of this.#e) {
        if (!getFeatureValue_CACHED_MAY_BE_STALE(n.flag, false)) continue;
        let t = fileReferenceOfferState(n);
        if (t === "no") {
          this.#t();
          return;
        }
        if (t === "pending") continue;
        this.#e.delete(e);
        this.#o.add(e);
        logEvent("tengu_mcp_drive_file_reference_availability", {
          state: fromEnum(r.state),
          ...(r.state !== "offered" && {
            reason: fromEnum(r.reason),
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
function fileReferenceOfferState(e) {
  if (hasComplianceTaint("hipaa")) return "no";
  let n = fileReferencePolicyBlock(e);
  if (n === "policy_not_asked" || n === "policy_not_loaded" || isPolicyVerdictAbsent()) return "pending";
  return n === "policy_denied" ? "no" : "yes";
}
//@ chunk-kc2qkj8w.js:4771-4797 placement
/**
 * 按会话根保存的文件引用提供状态。
 */
var fileReferenceOfferSlot = new SessionRootSlot(() => new FileReferenceOffer());
//@ chunk-kc2qkj8w.js:4797-4830 placement
/**
 * 取当前会话的文件引用提供状态。
 */
function getFileReferenceOffer() {
  return fileReferenceOfferSlot.of(getRootSession());
}
//@ chunk-kc2qkj8w.js:4830-4961 placement
function isFirstReferenceApproved(session, permissionName) {
  let r = approvalAccountUuid();
  return (
    fileReferenceTrackerSlot.peek(session)?.isFirstReferenceApproved(`${r ?? ""}:${permissionName}`) ===
      true ||
    (r !== undefined && approvedUploadsFor(getGlobalConfig(), r).includes(permissionName))
  );
}
//@ chunk-kc2qkj8w.js:4961-5495 placement
/**
 * 记录一次"通过文件引用上传"已获批准：会话内标记，并在需要且有账号时持久化到全局配置 fileReferenceUploadsApproved（按账号 uuid 分组）；失败只记错误。
 */
function recordFirstReferenceApproved(session, permissionName, persist, storageV5) {
  try {
    let o = approvalAccountUuid();
    fileReferenceTrackerSlot.of(session).noteFirstReferenceApproved(`${o ?? ""}:${permissionName}`);
    if (!persist || o === undefined) return;
    saveGlobalConfigDurably(
      (d) =>
        approvedUploadsFor(d, o).includes(permissionName)
          ? d
          : {
              ...d,
              fileReferenceUploadsApproved: {
                ...approvedUploadsMap(d),
                [o]: [...approvedUploadsFor(d, o), permissionName],
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
function approvedUploadsMap(e) {
  let fileReferenceUploadsApproved = e.fileReferenceUploadsApproved;
  return isPlainObject(fileReferenceUploadsApproved) ? fileReferenceUploadsApproved : {};
}
//@ chunk-kc2qkj8w.js:5676-5767 placement
/**
 * 取某服务器已批准的调用记录。
 */
function approvedUploadsFor(e, n) {
  let r = approvedUploadsMap(e);
  let t = Object.hasOwn(r, n) ? r[n] : undefined;
  return Array.isArray(t) ? t : [];
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
