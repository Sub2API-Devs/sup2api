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
import { EN } from "../mcpClientCapabilities.js";
import { isFirstPartyAnthropicHost } from "../../../utils/model/providers.js";
import { env } from "../../../utils/env.js";
import { firstPartyServerIdFor } from "../cliOwnedClients.js";
import { ARTIFACTS_SERVER_ID, mcpServerIdHeader } from "../firstPartyServerIds.js";
import { mn } from "../../../utils/remoteEnvironment.js";
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
import { U3t } from "../../api/fileReferenceCalls.js";
import { getGlobalConfig, saveGlobalConfigDurably } from "../../../utils/config.js";
import { logError } from "../../../utils/log.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  sanitizedFeatureErrorCodeForTelemetry,
} from "../../../utils/errors.js";
import { getOauthAccountInfo } from "../../../utils/auth.js";
import { isPlainObject } from "../../../utils/objectUtils.js";

//@ chunk-kc2qkj8w.js:1257-1393 placement
var ANTHROPIC_CHROMEUPLOADFILES = "anthropic/chromeUploadFiles",
  ANTHROPIC_CHROMEUPLOADMAXBYTES = "anthropic/chromeUploadMaxBytes",
  ANTHROPIC_CHROMEUPLOADAUTOMODEONLY = "anthropic/chromeUploadAutoModeOnly",
  x$e = new SessionRootSlot(() => ({}));
/**
 * 取服务器声明的 Chrome 上传大小上限（合法正整数时不超过默认上限）。
 */
//@ chunk-kc2qkj8w.js:1393-1494 placement
function chromeUploadMaxBytes(e, n) {
  let r = e?.[ANTHROPIC_CHROMEUPLOADMAXBYTES];
  return typeof r === "number" && Number.isInteger(r) && r > 0 ? Math.min(r, n) : n;
}
//@ chunk-kc2qkj8w.js:1494-1586 placement
function qkt(e) {
  return (
    e !== void 0 &&
    isIdeOrSdkType(e.type) &&
    e.scope !== "project" &&
    e.relayed !== !0 &&
    !isPluginServerConfig(e)
  );
}
/**
 * 判断 MCP 服务器配置的来源：SDK、插件或其配置作用域。
 */
//@ chunk-kc2qkj8w.js:1586-1695 placement
function mcpServerSource(e, n) {
  if (n.type === "sdk" && qkt(n)) return "sdk";
  if (isPluginServerConfig(n) || Me(e, n.scope)) return "plugin";
  return n.scope;
}
/**
 * 生成钩子输入中的 MCP 服务器身份（名称与来源：插件、SDK 或作用域）。
 */
//@ chunk-kc2qkj8w.js:1695-1875 placement
function mcpServerIdentityForHooks(e) {
  return {
    name: e.serverName,
    source:
      e.source ??
      (e.pluginTelemetry !== void 0 || Me(e.serverName, e.scope ?? "dynamic")
        ? "plugin"
        : e.serverType === "sdk"
          ? "sdk"
          : (e.scope ?? "dynamic")),
  };
}
//@ chunk-kc2qkj8w.js:1875-1940 placement
function Me(e, n) {
  return n === "dynamic" && EN.ownerOfKey(e) !== void 0;
}
//@ chunk-kc2qkj8w.js:1940-2002 placement
var X_MCP_SERVER_ORIGIN = "x-mcp-server-origin",
  X_CCR_OWNER_SLACK_USER_ID = "x-ccr-owner-slack-user-id";
//@ chunk-kc2qkj8w.js:2002-2098 placement
function iJ(e, n) {
  return Object.entries(e ?? {})
    .filter(([r]) => r.toLowerCase() === n)
    .map(([, r]) => r);
}
//@ chunk-kc2qkj8w.js:2098-2123 placement
var pot = new SessionRootSlot(() => ({}));
//@ chunk-kc2qkj8w.js:2123-2160 placement
var ANTHROPIC_CLAUDEAICONNECTOR = "anthropic/claudeAiConnector";
//@ chunk-kc2qkj8w.js:2160-2268 placement
function isFirstPartyPathUrl(e, n) {
  return (
    e.protocol === "https:" &&
    e.username === "" &&
    e.password === "" &&
    isFirstPartyAnthropicHost(e.href) &&
    e.pathname === n
  );
}
/**
 * 判断一个 MCP 连接是否是指定 id 的一方工具箱服务器（用于文件上传/任务文件等特权）：CLI 自有配置要求 id、路径、URL 精确匹配且不在受限环境；claude.ai 代理按 URL；SDK 服务器按声明的连接器 id；云会话中的动态 http 服务器按 x-mcp-server-id。
 */
//@ chunk-kc2qkj8w.js:2268-2864 placement
function isFirstPartyToolboxServer(connection, { path: path, serverId: serverId }) {
  try {
    if (env.CLAUDE_CODE_ENVIRONMENT_KIND === "byoc") return !1;
    let config = connection.config,
      o = firstPartyServerIdFor(config);
    if (o !== void 0) {
      let y = o === ARTIFACTS_SERVER_ID && mn();
      if (
        o !== serverId ||
        config.type !== "http" ||
        isDiskless() ||
        (!y && (env.CLAUDE_CODE_REMOTE || env.CLAUDE_CODE_ENVIRONMENT_KIND))
      )
        return !1;
      let R = new URL(config.url);
      return R.search === "" && isFirstPartyPathUrl(R, path);
    }
    if (config.type === "claudeai-proxy") {
      if (!isClaudeAiProxyServer(config)) return !1;
      return isFirstPartyPathUrl(new URL(config.url), path);
    }
    if (config.type === "sdk") return claudeAiConnectorCapability(connection)?.serverId === serverId;
    let CLAUDE_CODE_ENVIRONMENT_KIND = env.CLAUDE_CODE_ENVIRONMENT_KIND;
    return (
      env.CLAUDE_CODE_REMOTE === !0 &&
      (!CLAUDE_CODE_ENVIRONMENT_KIND || CLAUDE_CODE_ENVIRONMENT_KIND === "anthropic_cloud") &&
      config.type === "http" &&
      config.scope === "dynamic" &&
      !isPluginServerConfig(config) &&
      mcpServerIdHeader(config) === serverId
    );
  } catch {
    return !1;
  }
}
//@ chunk-kc2qkj8w.js:2864-3145 placement
function claudeAiConnectorCapability(e) {
  try {
    let config = e.config,
      r = e.capabilities?.experimental?.[ANTHROPIC_CLAUDEAICONNECTOR];
    if (
      config.type !== "sdk" ||
      !qkt(config) ||
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
/**
 * 判断文件引用功能为何不可用：无盘环境、Slack/Teams 中继，或策略原因。
 */
//@ chunk-kc2qkj8w.js:3145-3266 placement
function fileReferenceUnavailableReason(e) {
  if (isDiskless() && x$e.peek(getRootSession())?.host === void 0) return "diskless";
  if (isChatOrTeams()) return "slack_or_teams_relay";
  return fileReferencePolicyBlock(e);
}
//@ chunk-kc2qkj8w.js:3266-3443 placement
function fileReferencePolicyBlock(e) {
  let n = policyLimitsUnavailableReason();
  if (n !== void 0) return n;
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
    case void 0:
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
  #r = !1;
  mayLogTypedRow(e) {
    if (this.#r) return !1;
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
      if (!this.#r && !this.#o.has(r)) this.#e.set(r, { row: e, availability: n });
    } catch {}
    this.flush();
  }
  flush() {
    try {
      for (let [e, { row: n, availability: r }] of this.#e) {
        if (!getFeatureValue_CACHED_MAY_BE_STALE(n.flag, !1)) continue;
        let t = fileReferenceOfferState(n);
        if (t === "no") {
          this.#t();
          return;
        }
        if (t === "pending") continue;
        (this.#e.delete(e),
          this.#o.add(e),
          logEvent("tengu_mcp_drive_file_reference_availability", {
            state: fromEnum(r.state),
            ...(r.state !== "offered" && { reason: fromEnum(r.reason) }),
          }));
      }
    } catch {}
  }
  #t() {
    ((this.#r = !0), this.#e.clear());
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
var rn = new SessionRootSlot(() => new FileReferenceOffer());
//@ chunk-kc2qkj8w.js:4797-4830 placement
function Jkt() {
  return rn.of(getRootSession());
}
//@ chunk-kc2qkj8w.js:4830-4961 placement
function isFirstReferenceApproved(e, n) {
  let r = approvalAccountUuid();
  return (
    U3t.peek(e)?.isFirstReferenceApproved(`${r ?? ""}:${n}`) === !0 ||
    (r !== void 0 && ge(getGlobalConfig(), r).includes(n))
  );
}
/**
 * 记录一次"通过文件引用上传"已获批准：会话内标记，并在需要且有账号时持久化到全局配置 fileReferenceUploadsApproved（按账号 uuid 分组）；失败只记错误。
 */
//@ chunk-kc2qkj8w.js:4961-5495 placement
function recordFirstReferenceApproved(session, permissionName, persist, storageV5) {
  try {
    let o = approvalAccountUuid();
    if (
      (U3t.of(session).noteFirstReferenceApproved(`${o ?? ""}:${permissionName}`), !persist || o === void 0)
    )
      return;
    saveGlobalConfigDurably(
      (d) =>
        ge(d, o).includes(permissionName)
          ? d
          : { ...d, fileReferenceUploadsApproved: { ...Le(d), [o]: [...ge(d, o), permissionName] } },
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
    ? void 0
    : getOauthAccountInfo()?.accountUuid;
}
//@ chunk-kc2qkj8w.js:5606-5676 placement
function Le(e) {
  let fileReferenceUploadsApproved = e.fileReferenceUploadsApproved;
  return isPlainObject(fileReferenceUploadsApproved) ? fileReferenceUploadsApproved : {};
}
//@ chunk-kc2qkj8w.js:5676-5767 placement
function ge(e, n) {
  let r = Le(e),
    t = Object.hasOwn(r, n) ? r[n] : void 0;
  return Array.isArray(t) ? t : [];
}

export {
  mcpServerSource,
  fileReferenceUnavailableReason,
  x$e,
  iJ,
  X_MCP_SERVER_ORIGIN,
  X_CCR_OWNER_SLACK_USER_ID,
  chromeUploadMaxBytes,
  pot,
  qkt,
  ANTHROPIC_CHROMEUPLOADAUTOMODEONLY,
  mcpServerIdentityForHooks,
  Jkt,
  isFirstPartyToolboxServer,
  claudeAiConnectorCapability,
  recordFirstReferenceApproved,
  isFirstReferenceApproved,
  ANTHROPIC_CHROMEUPLOADFILES,
};
