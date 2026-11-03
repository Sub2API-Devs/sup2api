/**
 * services/artifacts/artifactsMcpLaptop.ts
 *
 * 2.1.316 新增。本机 Artifacts MCP 服务条目：决定是否添加、包装发布动作并记遥测。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-g62cc56z.js (21)
 * attribution: placement 21
 */
import { lit, fromEnum, fromEnumOpt } from "../analytics/safeMetadata.js";
import { logError } from "../../utils/log.js";
import { withTelemetryMessage, toError } from "../../utils/errors.js";
import {
  ARTIFACT_ACTIONS,
  isCreateAction,
  publishedArtifactFromResult,
  DELETE_ARTIFACT,
  deletedSlugFromResult,
  lazyWritersSlot,
  shareFieldsFromResult,
  writersArmSlot,
} from "../../tools/ArtifactTool/actionNames.js";
import {
  McpToolCallError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  McpToolFileInputRejectedError,
} from "../mcp/client.js";
import { logFeatureBad, logFeatureOk, logFeatureSad } from "../analytics/featureTelemetry.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { getRootSession, isDiskless, getOriginalCwd, getIsRemoteMode } from "../../bootstrap/state.js";
import { logEvent } from "../analytics/index.js";
import { hasAnyGatewayCredential, getGatewayAccountInfo } from "../../utils/gatewayCredential.js";
import { logForDebugging } from "../../utils/debug.js";
import {
  emitArtifactStartupTelemetry,
  isArtifactToolEnabled,
  artifactToolWithholdingGate,
  isArtifactAdminAllowed,
} from "./artifactToolGates.js";
import { buildSelfStdioServerConfig, getEvalReadRoots } from "./artifactsMcpServer.js";
import { CLAUDE_ARTIFACTS, ARTIFACTS_SERVER_ID, ARTIFACTS_MCP_PATH } from "../mcp/firstPartyServerIds.js";
import { registerCliOwnedConfig, isCliOwnedConfig } from "../mcp/cliOwnedClients.js";
import { OAUTH_BETA_HEADER } from "../../constants/oauth.js";
import { BLOCKED_TOOL_POLICY } from "../mcp/blockedServers.js";
import { artifactsMcpInCloudSession } from "./artifactsMcpTools.js";
import { wS } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { buildFrameHeaders } from "./frameApi.js";
import { FRAME_CLIENT_HEADERS } from "./artifactMcpWire.js";
import { isByocEnvironment } from "../../utils/remoteEnvironment.js";
import { isHostEntrypoint, isHostSessionEntrypoint } from "../../utils/entrypointKinds.js";
import { env } from "../../utils/env.js";
import { isArtifactShareSession } from "../../utils/sessionSurface.js";
import { isBareMode } from "../../utils/envUtils.js";
import { isCustomizationDisabled } from "../../utils/settings/customizationDisabled.js";
import { getDenyRules, getDenyRuleForTool } from "../../utils/permissions/permissions.js";
import { ARTIFACT_TOOL_NAME, getArtifactPublishStubDir } from "../../tools/ArtifactTool/constants.js";
import { policyDenyKind } from "../policyLimits/policyEvidence.js";
import {
  hasApiClient,
  getFrameHostOverride,
  frameBaseUrl,
  getClaudeAiAccessToken,
} from "../routines/routinesApi.js";
import { isFirstPartyAnthropicHost } from "../../utils/model/providers.js";
import { isOwnCcrMcpServer } from "../analytics/metadata.js";
import { getLiveState } from "../liveReplica/liveReplica.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { isDelegatedObservationContext } from "../../utils/agentContext.js";
import { isStrictHumanTurn } from "../../utils/turnOrigin.js";
import { artifactViewerUrlFor } from "../../tools/ArtifactTool/artifactUrls.js";
import { getEmptyToolPermissionContext } from "../../Tool.js";
import { loadAllPermissionRulesFromDisk } from "../../utils/permissions/permissionsLoader.js";

//@ chunk-g62cc56z.js:1570-1918 placement
/**
 * Artifacts MCP 本机发布的遥测字段与失败原因集合
 */
var LAPTOP_PUBLISH_ANALYTICS = {
  wire: lit("mcp_server_tool"),
};
var ACCEPTED_ERROR_CODES = new Set([
  "bad_entry",
  "input_schema",
  "relative_path",
  "too_many_files",
  "path_rejected",
  "resolves_elsewhere",
  "name_direction",
  "hard_links",
  "not_regular",
  "too_large",
  "too_large_total",
  "input_changed",
  "policy_denied",
  "uploads_off",
  "egress_blocked",
  "essential_traffic",
  "rule_not_applicable",
  "moved",
  "grew",
  "changed",
]);
//@ chunk-g62cc56z.js:1918-2069 placement
/**
 * 遥测失败不影响调用
 */
function safelyRecordAnalytics(e) {
  try {
    e();
  } catch (error) {
    logError(
      withTelemetryMessage(
        toError(error),
        "The outcome of an Artifacts MCP publish could not be counted in analytics; the call itself is unaffected",
      ),
    );
  }
}
//@ chunk-g62cc56z.js:2069-3142 placement
/**
 * 包装发布动作并记遥测
 */
async function withPublishAnalytics(toolName, r, o, s) {
  if (!ARTIFACT_ACTIONS.has(toolName)) return s();
  let p = toolName === "create_from_type";
  let u = () => ({
    is_redeploy: !isCreateAction(toolName, r()),
    ...LAPTOP_PUBLISH_ANALYTICS,
  });
  let d;
  try {
    d = await s();
  } catch (error) {
    safelyRecordAnalytics(() => {
      if (o()) return;
      let _ = error instanceof McpToolCallError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS;
      let y = !_
        ? undefined
        : error.message === "not found"
          ? "404"
          : /^[a-z_]+ failed \(HTTP (\d{3})\): /m.exec(error.message)?.[1];
      let h = y === undefined ? undefined : Number(y);
      if (p) {
        if (!_) logFeatureBad("artifact_create_from_type", "request_error", LAPTOP_PUBLISH_ANALYTICS);
        else if (h === undefined)
          logFeatureBad("artifact_create_from_type", "mcp_tool_error", LAPTOP_PUBLISH_ANALYTICS);
        else
          logFeatureBad(
            "artifact_create_from_type",
            h === 404 ? "not_found" : h === 403 ? "denied" : `status_${h}`,
            {
              status: h,
              ...LAPTOP_PUBLISH_ANALYTICS,
            },
          );
        return;
      }
      let S = u();
      if (error instanceof McpToolFileInputRejectedError)
        logFeatureBad(
          "artifact_publish",
          ACCEPTED_ERROR_CODES.has(error.code) || error.code.startsWith("model_")
            ? `attach_refused_${error.code}`
            : `attach_failed_${error.code}`,
          S,
        );
      else if (!_) logFeatureBad("artifact_publish", "request_error", S);
      else if (h === undefined) logFeatureBad("artifact_publish", "deploy_failed", S);
      else
        logFeatureBad(
          "artifact_publish",
          h === 403 ? "publish_denied" : h === 404 && S.is_redeploy ? "slug_gone" : "deploy_failed",
          {
            ...S,
            deploy_status: h,
          },
        );
    });
    throw error;
  }
  safelyRecordAnalytics(() => {
    if (publishedArtifactFromResult(d.data) === null) return;
    if (p) logFeatureOk("artifact_create_from_type", LAPTOP_PUBLISH_ANALYTICS);
    else logFeatureOk("artifact_publish", u());
  });
  return d;
}
//@ chunk-g62cc56z.js:3142-3306 placement
/**
 * 静默跳过原因与状态槽
 */
var LAPTOP_SKIP_SILENT_REASONS = new Set(["artifact_tool_off", "org_policy_cache_miss"]);
var artifactsMcpLaptopStates = new HostScoped(() => ({
  built: new WeakSet(),
  laterBuild: {
    kind: "closed",
  },
  loginsCompleted: {
    count: 0,
    account: null,
  },
}));
//@ chunk-g62cc56z.js:3306-3343 placement
function laptopStates() {
  return artifactsMcpLaptopStates.of(getRootSession().host);
}
//@ chunk-g62cc56z.js:3343-3561 placement
function buildArtifactsMcpLaptopEntry(e) {
  let laptopEntry = buildLaptopEntry(e, null);
  let o = laptopStates();
  o.laterBuild = {
    kind: "closed",
  };
  if (laptopEntry.skip === undefined) return laptopEntry.entry;
  if (LAPTOP_SKIP_SILENT_REASONS.has(laptopEntry.skip)) {
    o.laterBuild = {
      kind: "waiting",
      startup: laptopEntry,
    };
    o.loginsCompleted = {
      count: 0,
      account: currentAccountKey(),
    };
  }
  logLaptopEntrySkip(laptopEntry, false);
  return null;
}
//@ chunk-g62cc56z.js:3561-4036 placement
function buildArtifactsMcpLaptopEntryAfterStart(e) {
  let r = laptopStates();
  let { laterBuild } = r;
  if (laterBuild.kind === "closed") return null;
  if (!isArtifactsMcpLaptopLoginCompleted()) return "waiting";
  let laptopEntry = buildLaptopEntry(e, laterBuild.kind === "built" ? laterBuild.entry : null);
  if (laptopEntry.skip !== undefined && LAPTOP_SKIP_SILENT_REASONS.has(laptopEntry.skip)) return "waiting";
  if (laterBuild.kind === "built") return laptopEntry.entry ?? null;
  if (laptopEntry.skip !== undefined) {
    r.laterBuild = {
      kind: "closed",
    };
    logLaptopEntrySkip(laptopEntry, true);
    return null;
  }
  r.laterBuild = {
    kind: "built",
    entry: laptopEntry.entry,
  };
  logEvent("tengu_artifact_mcp_laptop_entry_added_later", {
    startup_reason: fromEnum(laterBuild.startup.skip),
    startup_part: fromEnumOpt(laterBuild.startup.part),
  });
  return laptopEntry.entry;
}
//@ chunk-g62cc56z.js:4036-4160 placement
function noteLoginsCompletedForArtifactsMcpLaptopEntry(loginCompleted, r) {
  let o = laptopStates();
  if (loginCompleted > o.loginsCompleted.count)
    o.loginsCompleted = {
      count: loginCompleted,
      account: r === "as_it_completed" ? currentAccountKey() : null,
    };
}
//@ chunk-g62cc56z.js:4160-4234 placement
function isArtifactsMcpLaptopLoginCompleted() {
  let e = currentAccountKey();
  return e !== null && e === laptopStates().loginsCompleted.account;
}
//@ chunk-g62cc56z.js:4234-4287 placement
function mayBuildArtifactsMcpLaptopEntryAfterStart() {
  return laptopStates().laterBuild.kind !== "closed";
}
//@ chunk-g62cc56z.js:4287-4443 placement
/**
 * 当前账号与组织键
 */
function currentAccountKey() {
  try {
    if (!hasAnyGatewayCredential()) return null;
    let gatewayAccountInfo = getGatewayAccountInfo();
    if (!gatewayAccountInfo?.accountUuid) return null;
    return `${gatewayAccountInfo.accountUuid}|${gatewayAccountInfo.organizationUuid}`;
  } catch (error) {
    logError(error);
    return null;
  }
}
//@ chunk-g62cc56z.js:4443-4982 placement
/**
 * 记录未加入 Artifacts MCP 服务的原因
 */
function logLaptopEntrySkip({ skip, part, agentCloudSession }, afterStart) {
  let p = part === "growthbook_off" ? "feature_flag_off" : part;
  switch (
    (logForDebugging(`Artifacts MCP server not added: ${skip}${p === undefined ? "" : ` (${p})`}`), skip)
  ) {
    case "threw":
    case "remote_session":
    case "desktop_host":
    case "desktop_share_action":
      return;
    case "managed_or_strict_mcp_config":
    case "safe_or_bare_mode":
    case "artifact_tool_off":
    case "artifact_tool_denied":
      if (!isDiskless() && agentCloudSession === true)
        emitArtifactStartupTelemetry(() =>
          logEvent("tengu_artifact_mcp_laptop_entry_skipped", {
            reason: fromEnum(skip),
            part: fromEnumOpt(part),
            after_start: afterStart,
          }),
        );
      return;
    default:
      emitArtifactStartupTelemetry(() => logFeatureSad("artifact_mcp_laptop_entry", skip));
  }
}
//@ chunk-g62cc56z.js:4982-6113 placement
/**
 * 构造本机 Artifacts MCP 服务条目或给出跳过原因
 */
function buildLaptopEntry({ toolPermissionContext, configuredNames, fixedServerSet, allowedByPolicy }, p) {
  try {
    let u = laptopEntrySkipReason(toolPermissionContext, configuredNames, fixedServerSet);
    if (u.skip !== undefined) return u;
    if (u.stubDir !== undefined) {
      let _ = {
        ...buildSelfStdioServerConfig(u.stubDir, getEvalReadRoots(getOriginalCwd(), toolPermissionContext)),
        scope: "dynamic",
      };
      if (!allowedByPolicy(CLAUDE_ARTIFACTS, _))
        return {
          skip: "org_mcp_policy",
        };
      if (p !== null)
        return {
          entry: p,
        };
      let y = registerCliOwnedConfig(_);
      laptopStates().built.add(y);
      return {
        entry: {
          name: CLAUDE_ARTIFACTS,
          config: y,
        },
      };
    }
    let d = {
      type: "http",
      url: u.url,
      headers: {
        "anthropic-beta": OAUTH_BETA_HEADER,
      },
      scope: "dynamic",
      toolPermissions: {
        ...BLOCKED_TOOL_POLICY,
      },
    };
    if (!allowedByPolicy(CLAUDE_ARTIFACTS, d))
      return {
        skip: "org_mcp_policy",
      };
    if (p !== null)
      return {
        entry: p,
      };
    let n = registerCliOwnedConfig(d, {
      firstPartyServer: {
        id: ARTIFACTS_SERVER_ID,
        allowsFileUpload: () => !isArtifactToolBlocked() && allowedByPolicy(CLAUDE_ARTIFACTS, d),
      },
      resolveBearerToken: resolveLaptopBearer,
      withheldBearerRefusal: artifactsMcpInCloudSession()
        ? "Artifacts request not sent: this session can no longer use Artifacts. A permission rule or policy stops it, or its own token no longer works."
        : "Artifacts request not sent: this session can no longer use Artifacts with its login. In a terminal, check /login, /permissions and /config.",
      requestHeaders: () => wS(buildFrameHeaders(), FRAME_CLIENT_HEADERS),
    });
    laptopStates().built.add(n);
    emitArtifactStartupTelemetry(() => logFeatureOk("artifact_mcp_laptop_entry"));
    return {
      entry: {
        name: CLAUDE_ARTIFACTS,
        config: n,
      },
    };
  } catch {
    emitArtifactStartupTelemetry(() => logFeatureBad("artifact_mcp_laptop_entry", "threw"));
    return {
      skip: "threw",
    };
  }
}
//@ chunk-g62cc56z.js:6113-7485 placement
/**
 * 判断本机是否应加 Artifacts MCP 服务
 */
function laptopEntrySkipReason(toolPermissionContext, configuredNames, fixedServerSet) {
  if (getIsRemoteMode() || isByocEnvironment())
    return {
      skip: "remote_session",
    };
  let s = artifactsMcpInCloudSession();
  if (s) {
    let _ = require("./chunk-qqpq16dc.js");
    if (_.relayIsOnlyRoute() || !_.agentSessionMaySendDirect())
      return {
        skip: "remote_session",
      };
  }
  if ((isHostEntrypoint() || isHostSessionEntrypoint()) && env.CLAUDE_CODE_HOST_GUARDS_ARTIFACTS_MCP !== true)
    return {
      skip: "desktop_host",
    };
  if (isArtifactShareSession())
    return {
      skip: "desktop_share_action",
    };
  if (fixedServerSet !== null)
    return {
      skip: "managed_or_strict_mcp_config",
      part: fixedServerSet,
      agentCloudSession: s,
    };
  if (isBareMode() || isCustomizationDisabled("mcpAutoDiscovered"))
    return {
      skip: "safe_or_bare_mode",
      agentCloudSession: s,
    };
  if (!isArtifactToolEnabled())
    return {
      skip: "artifact_tool_off",
      part: hasAnyGatewayCredential()
        ? (artifactToolWithholdingGate() ?? (isArtifactAdminAllowed() ? "not_found" : "admin_policy"))
        : "login",
      agentCloudSession: s,
    };
  let denyRules = getDenyRules(toolPermissionContext);
  if (
    getDenyRuleForTool(
      toolPermissionContext,
      {
        name: ARTIFACT_TOOL_NAME,
      },
      denyRules,
    ) !== null
  )
    return {
      skip: "artifact_tool_denied",
      part:
        getDenyRuleForTool(
          toolPermissionContext,
          {
            name: ARTIFACT_TOOL_NAME,
          },
          denyRules.filter((denyRule) => denyRule.source !== "toolsNarrowing"),
        ) === null
          ? "tools_list"
          : "deny_rule",
      agentCloudSession: s,
    };
  let artifactPublishStubDir = getArtifactPublishStubDir();
  if (artifactPublishStubDir !== null)
    return configuredNames.has(CLAUDE_ARTIFACTS)
      ? {
          skip: "name_taken",
        }
      : {
          stubDir: artifactPublishStubDir,
        };
  let d = policyDenyKind("allow_cobalt_plinth");
  if (d !== null)
    return {
      skip: `org_policy_${d}`,
    };
  if (!hasApiClient())
    return {
      skip: "essential_traffic_or_3p",
    };
  if (getFrameHostOverride() !== undefined)
    return {
      skip: "dev_frame_override",
    };
  let n;
  try {
    n = new URL(frameBaseUrl());
  } catch {
    return {
      skip: "base_not_first_party",
    };
  }
  if (
    n.protocol !== "https:" ||
    n.username !== "" ||
    n.password !== "" ||
    n.pathname !== "/" ||
    n.search !== "" ||
    n.hash !== "" ||
    !isFirstPartyAnthropicHost(n.href)
  )
    return {
      skip: "base_not_first_party",
    };
  if (configuredNames.has(CLAUDE_ARTIFACTS))
    return {
      skip: "name_taken",
    };
  return {
    url: new URL(ARTIFACTS_MCP_PATH, n.origin).href,
  };
}
//@ chunk-g62cc56z.js:7485-7563 placement
function isArtifactsMcpLaptopEntry(e) {
  return typeof e === "object" && e !== null && laptopStates().built.has(e) && isCliOwnedConfig(e);
}
//@ chunk-g62cc56z.js:7563-7640 placement
function artifactsMcpLaptopToolOverridesFor(e) {
  if (!isArtifactsMcpLaptopEntry(e)) return {};
  return {
    skipAggregateToolResultBudget: true,
  };
}
//@ chunk-g62cc56z.js:7640-8926 placement
/**
 * 本机 Artifacts MCP 服务条目：决定是否添加、包装发布动作并记遥测。
 */
function wrapArtifactsMcpLaptopPublishing(e, r) {
  let toolName = r.mcpInfo?.toolName;
  if (
    toolName === undefined ||
    !(ARTIFACT_ACTIONS.has(toolName) || toolName === DELETE_ARTIFACT) ||
    !(isArtifactsMcpLaptopEntry(e) || isOwnCcrMcpServer(e))
  )
    return;
  if (ARTIFACT_ACTIONS.has(toolName))
    Object.assign(r, {
      preserveToolUseResultInSubagents: true,
    });
  let s = r.call;
  r.call = async (p, u, d, n, _, y) => {
    let liveState = getLiveState();
    let { accountEpoch, conversationEpoch } = liveState;
    let A = await withPublishAnalytics(
      toolName,
      () => {
        let content = n?.message?.content;
        let C = Array.isArray(content)
          ? content.find((O) => O.type === "tool_use" && O.id === u.toolUseId)
          : undefined;
        return C?.type === "tool_use" ? C.input : p;
      },
      () => u.abortController.signal.aborted,
      () => s.call(r, p, u, d, n, _, y),
    );
    if (toolName === DELETE_ARTIFACT) {
      try {
        let k = deletedSlugFromResult(A.data);
        if (k !== null && isPlainObject(p) && p.slug === k)
          lazyWritersSlot.loaded()?.forgetArtifactDeletedThroughMcp(u, k);
      } catch (error) {
        logFeatureBad("artifact_mcp_laptop_publish_row", "forget_threw");
        logError(error);
      }
      return A;
    }
    let liveState_2 = getLiveState();
    if (liveState_2.accountEpoch !== accountEpoch || liveState_2.conversationEpoch !== conversationEpoch)
      return A;
    let T;
    try {
      T = publishedArtifactFromResult(A.data);
    } catch (error) {
      logFeatureBad("artifact_mcp_laptop_publish_row", "threw");
      logError(error);
      return A;
    }
    if (T === null) {
      logFeatureSad("artifact_mcp_laptop_publish_row", "unlisted");
      return A;
    }
    let I = isArtifactsMcpLaptopEntry(e);
    recordOwnPublishedSlug(u, T, toolName, p, I, shareFieldsFromResult(A.data).read === "owner");
    if (!I) return A;
    let arm = writersArmSlot.arm;
    if (arm === null) {
      logFeatureSad("artifact_mcp_laptop_publish_row", "no_wake_arm");
      return A;
    }
    let M = false;
    try {
      let { version, ...C } = T;
      M = arm(u, toolName === "create_from_type" ? C : T);
    } catch (error) {
      logFeatureBad("artifact_mcp_laptop_publish_row", "wake_threw");
      logError(error);
    }
    return M !== false && Array.isArray(A.data)
      ? {
          ...A,
          data: [
            ...A.data,
            {
              type: "text",
              text: WAKE_LINES[M],
            },
          ],
        }
      : A;
  };
}
//@ chunk-g62cc56z.js:8926-9697 placement
/**
 * 记录本会话发布的 artifact
 */
function recordOwnPublishedSlug(e, r, toolName, s, p, u) {
  try {
    let ownPublishedSlugs = getLiveState().ownPublishedSlugs;
    let n = ownPublishedSlugs.get(r.slug);
    if (!u && n !== undefined)
      ownPublishedSlugs.set(r.slug, {
        env: n.env,
      });
    if (
      p &&
      u &&
      toolName !== "create_from_type" &&
      toolName !== "copy_file" &&
      !isDelegatedObservationContext(e.agentContext) &&
      isStrictHumanTurn(e.messages)
    )
      ownPublishedSlugs.set(r.slug, {
        env: r.env,
        byPerson: true,
      });
    let _ = isCreateAction(toolName, s);
    if (_ && toolName !== "create_from_type" && p && !isDelegatedObservationContext(e.agentContext))
      getLiveState().ownCreatedSlugs.set(r.slug, {
        env: r.env,
        wrotePage: true,
      });
    let y = lazyWritersSlot.loaded();
    if (y === null) {
      logFeatureSad("artifact_mcp_laptop_publish_row", "no_writer");
      return;
    }
    let h = y.addOpenedFrameRow(e, r, r.title, {
      mcpPublished: true,
    });
    logFeatureOk("artifact_mcp_laptop_publish_row");
    y.surfacePublishedArtifact(
      e,
      y.derivePublishContext(e).hasInteractiveUI && e.agentId === undefined,
      {
        slug: r.slug,
        url: artifactViewerUrlFor(r),
      },
      !_,
      (S) => y.markFrameOpenOutcome(e, h.rowKey, S),
    );
  } catch (error) {
    logFeatureBad("artifact_mcp_laptop_publish_row", "threw");
    logError(error);
  }
}
//@ chunk-g62cc56z.js:9697-10724 placement
/**
 * 本机/云会话的唤醒说明三种文案（本地监听、云端已注册、注册失败），并列出可接受的错误码集合。
 */
var LOCAL_WAKE_LINE = `Once this session's watch on this artifact connects, when the user sends a comment on the artifact to Claude, this session gets a message naming the artifact and the thread. Plain comments, and comments other people send to Claude, do not wake it. Any "wake" field in this answer describes cloud sessions only.`;
var CLOUD_WAKE_LINE =
  'A wake for this session is registered with the artifact service, or is being registered (a notice follows if it cannot be). With it, this session gets a new turn when anyone sends a comment on the artifact to Claude, or when the artifact is republished elsewhere. Plain comments do not wake it. A wake carries neither the comment nor the new version. Any "wake" field in this answer does not describe this registration.';
var CLOUD_UNWOKEN_LINE =
  'No wake could be registered for this session, so comments on this artifact and republishes of it will not start a turn here: this session is not watching the artifact. Any "wake" field in this answer does not describe this session.';
var WAKE_LINES = {
  local: LOCAL_WAKE_LINE,
  cloud: CLOUD_WAKE_LINE,
  cloud_unwoken: CLOUD_UNWOKEN_LINE,
};
//@ chunk-g62cc56z.js:10724-10852 placement
/**
 * 判断 Artifact 工具被关闭或禁止：功能未开启、策略禁止 allow_cobalt_plinth，或磁盘权限规则里有针对 Artifact 工具的 deny 规则。
 */
function isArtifactToolBlocked() {
  return (
    !isArtifactToolEnabled() ||
    policyDenyKind("allow_cobalt_plinth") !== null ||
    getDenyRuleForTool(
      getEmptyToolPermissionContext(),
      {
        name: ARTIFACT_TOOL_NAME,
      },
      loadAllPermissionRulesFromDisk().filter((e) => e.ruleBehavior === "deny"),
    ) !== null
  );
}
//@ chunk-g62cc56z.js:10852-10909 placement
async function resolveLaptopBearer() {
  if (isArtifactToolBlocked()) return null;
  return await getClaudeAiAccessToken();
}
export {
  mayBuildArtifactsMcpLaptopEntryAfterStart,
  isArtifactsMcpLaptopLoginCompleted,
  buildArtifactsMcpLaptopEntryAfterStart,
  noteLoginsCompletedForArtifactsMcpLaptopEntry,
};
