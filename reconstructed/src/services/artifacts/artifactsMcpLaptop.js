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
  qSe,
  shareFieldsFromResult,
  U3o,
} from "../../tools/ArtifactTool/actionNames.js";
import {
  McpToolCallError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  McpToolFileInputRejectedError,
} from "../mcp/client.js";
import { logFeatureBad, logFeatureOk, logFeatureSad } from "../analytics/featureTelemetry.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { getRootSession, isDiskless, getOriginalCwd, getIsRemoteMode } from "../../bootstrap/state.js";
import { logEvent } from "../analytics/index.js";
import { nUe, getGatewayAccountInfo } from "../../utils/gatewayCredential.js";
import { logForDebugging } from "../../utils/debug.js";
import {
  emitArtifactStartupTelemetry,
  isArtifactToolEnabled,
  artifactToolWithholdingGate,
  isArtifactAdminAllowed,
} from "./artifactToolGates.js";
import { buildSelfStdioServerConfig, getEvalReadRoots } from "./artifactsMcpServer.js";
import { CLAUDE_ARTIFACTS, ARTIFACTS_SERVER_ID, ARTIFACTS_MCP_PATH } from "../mcp/firstPartyServerIds.js";
import { registerCliOwnedConfig, Zl } from "../mcp/cliOwnedClients.js";
import { OAUTH_BETA_HEADER } from "../../constants/oauth.js";
import { _No } from "../mcp/blockedServers.js";
import { artifactsMcpInCloudSession } from "./artifactsMcpTools.js";
import { wS } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { buildFrameHeaders } from "./frameApi.js";
import { FRAME_CLIENT_HEADERS } from "./artifactMcpWire.js";
import { op } from "../../utils/remoteEnvironment.js";
import { isHostEntrypoint, isHostSessionEntrypoint } from "../../utils/entrypointKinds.js";
import { env } from "../../utils/env.js";
import { a6n } from "../../utils/sessionSurface.js";
import { isBareMode } from "../../utils/envUtils.js";
import { isCustomizationDisabled } from "../../utils/settings/customizationDisabled.js";
import { getDenyRules, getDenyRuleForTool } from "../../utils/permissions/permissions.js";
import { ARTIFACT_TOOL_NAME, getArtifactPublishStubDir } from "../../tools/ArtifactTool/constants.js";
import { policyDenyKind } from "../policyLimits/policyEvidence.js";
import { hasApiClient, getFrameHostOverride, Tgr, getClaudeAiAccessToken } from "../routines/routinesApi.js";
import { isFirstPartyAnthropicHost } from "../../utils/model/providers.js";
import { isOwnCcrMcpServer } from "../analytics/metadata.js";
import { getLiveState } from "../liveReplica/liveReplica.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { isDelegatedObservationContext } from "../../utils/agentContext.js";
import { isStrictHumanTurn } from "../../utils/turnOrigin.js";
import { artifactViewerUrlFor } from "../../tools/ArtifactTool/artifactUrls.js";
import { getEmptyToolPermissionContext } from "../../Tool.js";
import { loadAllPermissionRulesFromDisk } from "../../utils/permissions/permissionsLoader.js";

/**
 * Artifacts MCP 本机发布的遥测字段与失败原因集合
 */
//@ chunk-g62cc56z.js:1570-1918 placement
var LAPTOP_PUBLISH_ANALYTICS = { wire: lit("mcp_server_tool") },
  G = new Set([
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
/**
 * 遥测失败不影响调用
 */
//@ chunk-g62cc56z.js:1918-2069 placement
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
/**
 * 包装发布动作并记遥测
 */
//@ chunk-g62cc56z.js:2069-3142 placement
async function withPublishAnalytics(e, r, o, s) {
  if (!ARTIFACT_ACTIONS.has(e)) return s();
  let p = e === "create_from_type",
    u = () => ({ is_redeploy: !isCreateAction(e, r()), ...LAPTOP_PUBLISH_ANALYTICS }),
    d;
  try {
    d = await s();
  } catch (error) {
    throw (
      safelyRecordAnalytics(() => {
        if (o()) return;
        let _ = error instanceof McpToolCallError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
          y = !_
            ? void 0
            : error.message === "not found"
              ? "404"
              : /^[a-z_]+ failed \(HTTP (\d{3})\): /m.exec(error.message)?.[1],
          h = y === void 0 ? void 0 : Number(y);
        if (p) {
          if (!_) logFeatureBad("artifact_create_from_type", "request_error", LAPTOP_PUBLISH_ANALYTICS);
          else if (h === void 0)
            logFeatureBad("artifact_create_from_type", "mcp_tool_error", LAPTOP_PUBLISH_ANALYTICS);
          else
            logFeatureBad(
              "artifact_create_from_type",
              h === 404 ? "not_found" : h === 403 ? "denied" : `status_${h}`,
              { status: h, ...LAPTOP_PUBLISH_ANALYTICS },
            );
          return;
        }
        let S = u();
        if (error instanceof McpToolFileInputRejectedError)
          logFeatureBad(
            "artifact_publish",
            G.has(error.code) || error.code.startsWith("model_")
              ? `attach_refused_${error.code}`
              : `attach_failed_${error.code}`,
            S,
          );
        else if (!_) logFeatureBad("artifact_publish", "request_error", S);
        else if (h === void 0) logFeatureBad("artifact_publish", "deploy_failed", S);
        else
          logFeatureBad(
            "artifact_publish",
            h === 403 ? "publish_denied" : h === 404 && S.is_redeploy ? "slug_gone" : "deploy_failed",
            { ...S, deploy_status: h },
          );
      }),
      error
    );
  }
  return (
    safelyRecordAnalytics(() => {
      if (publishedArtifactFromResult(d.data) === null) return;
      if (p) logFeatureOk("artifact_create_from_type", LAPTOP_PUBLISH_ANALYTICS);
      else logFeatureOk("artifact_publish", u());
    }),
    d
  );
}
/**
 * 静默跳过原因与状态槽
 */
//@ chunk-g62cc56z.js:3142-3306 placement
var LAPTOP_SKIP_SILENT_REASONS = new Set(["artifact_tool_off", "org_policy_cache_miss"]),
  artifactsMcpLaptopStates = new HostScoped(() => ({
    built: new WeakSet(),
    laterBuild: { kind: "closed" },
    loginsCompleted: { count: 0, account: null },
  }));
//@ chunk-g62cc56z.js:3306-3343 placement
function w() {
  return artifactsMcpLaptopStates.of(getRootSession().host);
}
//@ chunk-g62cc56z.js:3343-3561 placement
function buildArtifactsMcpLaptopEntry(e) {
  let r = buildLaptopEntry(e, null),
    o = w();
  if (((o.laterBuild = { kind: "closed" }), r.skip === void 0)) return r.entry;
  if (LAPTOP_SKIP_SILENT_REASONS.has(r.skip))
    ((o.laterBuild = { kind: "waiting", startup: r }),
      (o.loginsCompleted = { count: 0, account: currentAccountKey() }));
  return (logLaptopEntrySkip(r, !1), null);
}
//@ chunk-g62cc56z.js:3561-4036 placement
function buildArtifactsMcpLaptopEntryAfterStart(e) {
  let r = w(),
    { laterBuild: laterBuild } = r;
  if (laterBuild.kind === "closed") return null;
  if (!isArtifactsMcpLaptopLoginCompleted()) return "waiting";
  let s = buildLaptopEntry(e, laterBuild.kind === "built" ? laterBuild.entry : null);
  if (s.skip !== void 0 && LAPTOP_SKIP_SILENT_REASONS.has(s.skip)) return "waiting";
  if (laterBuild.kind === "built") return s.entry ?? null;
  if (s.skip !== void 0) return ((r.laterBuild = { kind: "closed" }), logLaptopEntrySkip(s, !0), null);
  return (
    (r.laterBuild = { kind: "built", entry: s.entry }),
    logEvent("tengu_artifact_mcp_laptop_entry_added_later", {
      startup_reason: fromEnum(laterBuild.startup.skip),
      startup_part: fromEnumOpt(laterBuild.startup.part),
    }),
    s.entry
  );
}
//@ chunk-g62cc56z.js:4036-4160 placement
function noteLoginsCompletedForArtifactsMcpLaptopEntry(e, r) {
  let o = w();
  if (e > o.loginsCompleted.count)
    o.loginsCompleted = { count: e, account: r === "as_it_completed" ? currentAccountKey() : null };
}
//@ chunk-g62cc56z.js:4160-4234 placement
function isArtifactsMcpLaptopLoginCompleted() {
  let e = currentAccountKey();
  return e !== null && e === w().loginsCompleted.account;
}
//@ chunk-g62cc56z.js:4234-4287 placement
function mayBuildArtifactsMcpLaptopEntryAfterStart() {
  return w().laterBuild.kind !== "closed";
}
/**
 * 当前账号与组织键
 */
//@ chunk-g62cc56z.js:4287-4443 placement
function currentAccountKey() {
  try {
    if (!nUe()) return null;
    let e = getGatewayAccountInfo();
    if (!e?.accountUuid) return null;
    return `${e.accountUuid}|${e.organizationUuid}`;
  } catch (error) {
    return (logError(error), null);
  }
}
/**
 * 记录未加入 Artifacts MCP 服务的原因
 */
//@ chunk-g62cc56z.js:4443-4982 placement
function logLaptopEntrySkip({ skip: skip, part: part, agentCloudSession: agentCloudSession }, s) {
  let p = part === "growthbook_off" ? "feature_flag_off" : part;
  switch (
    (logForDebugging(`Artifacts MCP server not added: ${skip}${p === void 0 ? "" : ` (${p})`}`), skip)
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
      if (!isDiskless() && agentCloudSession === !0)
        emitArtifactStartupTelemetry(() =>
          logEvent("tengu_artifact_mcp_laptop_entry_skipped", {
            reason: fromEnum(skip),
            part: fromEnumOpt(part),
            after_start: s,
          }),
        );
      return;
    default:
      emitArtifactStartupTelemetry(() => logFeatureSad("artifact_mcp_laptop_entry", skip));
  }
}
/**
 * 构造本机 Artifacts MCP 服务条目或给出跳过原因
 */
//@ chunk-g62cc56z.js:4982-6113 placement
function buildLaptopEntry(
  {
    toolPermissionContext: toolPermissionContext,
    configuredNames: configuredNames,
    fixedServerSet: fixedServerSet,
    allowedByPolicy: allowedByPolicy,
  },
  p,
) {
  try {
    let u = laptopEntrySkipReason(toolPermissionContext, configuredNames, fixedServerSet);
    if (u.skip !== void 0) return u;
    if (u.stubDir !== void 0) {
      let _ = {
        ...buildSelfStdioServerConfig(u.stubDir, getEvalReadRoots(getOriginalCwd(), toolPermissionContext)),
        scope: "dynamic",
      };
      if (!allowedByPolicy(CLAUDE_ARTIFACTS, _)) return { skip: "org_mcp_policy" };
      if (p !== null) return { entry: p };
      let y = registerCliOwnedConfig(_);
      return (w().built.add(y), { entry: { name: CLAUDE_ARTIFACTS, config: y } });
    }
    let d = {
      type: "http",
      url: u.url,
      headers: { "anthropic-beta": OAUTH_BETA_HEADER },
      scope: "dynamic",
      toolPermissions: { ..._No },
    };
    if (!allowedByPolicy(CLAUDE_ARTIFACTS, d)) return { skip: "org_mcp_policy" };
    if (p !== null) return { entry: p };
    let n = registerCliOwnedConfig(d, {
      firstPartyServer: {
        id: ARTIFACTS_SERVER_ID,
        allowsFileUpload: () => !isArtifactToolBlocked() && allowedByPolicy(CLAUDE_ARTIFACTS, d),
      },
      resolveBearerToken: Y,
      withheldBearerRefusal: artifactsMcpInCloudSession()
        ? "Artifacts request not sent: this session can no longer use Artifacts. A permission rule or policy stops it, or its own token no longer works."
        : "Artifacts request not sent: this session can no longer use Artifacts with its login. In a terminal, check /login, /permissions and /config.",
      requestHeaders: () => wS(buildFrameHeaders(), FRAME_CLIENT_HEADERS),
    });
    return (
      w().built.add(n),
      emitArtifactStartupTelemetry(() => logFeatureOk("artifact_mcp_laptop_entry")),
      { entry: { name: CLAUDE_ARTIFACTS, config: n } }
    );
  } catch {
    return (
      emitArtifactStartupTelemetry(() => logFeatureBad("artifact_mcp_laptop_entry", "threw")),
      { skip: "threw" }
    );
  }
}
/**
 * 判断本机是否应加 Artifacts MCP 服务
 */
//@ chunk-g62cc56z.js:6113-7485 placement
function laptopEntrySkipReason(e, r, o) {
  if (getIsRemoteMode() || op()) return { skip: "remote_session" };
  let s = artifactsMcpInCloudSession();
  if (s) {
    let _ = require("./chunk-qqpq16dc.js");
    if (_.relayIsOnlyRoute() || !_.agentSessionMaySendDirect()) return { skip: "remote_session" };
  }
  if ((isHostEntrypoint() || isHostSessionEntrypoint()) && env.CLAUDE_CODE_HOST_GUARDS_ARTIFACTS_MCP !== !0)
    return { skip: "desktop_host" };
  if (a6n()) return { skip: "desktop_share_action" };
  if (o !== null) return { skip: "managed_or_strict_mcp_config", part: o, agentCloudSession: s };
  if (isBareMode() || isCustomizationDisabled("mcpAutoDiscovered"))
    return { skip: "safe_or_bare_mode", agentCloudSession: s };
  if (!isArtifactToolEnabled())
    return {
      skip: "artifact_tool_off",
      part: nUe()
        ? (artifactToolWithholdingGate() ?? (isArtifactAdminAllowed() ? "not_found" : "admin_policy"))
        : "login",
      agentCloudSession: s,
    };
  let p = getDenyRules(e);
  if (getDenyRuleForTool(e, { name: ARTIFACT_TOOL_NAME }, p) !== null)
    return {
      skip: "artifact_tool_denied",
      part:
        getDenyRuleForTool(
          e,
          { name: ARTIFACT_TOOL_NAME },
          p.filter((_) => _.source !== "toolsNarrowing"),
        ) === null
          ? "tools_list"
          : "deny_rule",
      agentCloudSession: s,
    };
  let u = getArtifactPublishStubDir();
  if (u !== null) return r.has(CLAUDE_ARTIFACTS) ? { skip: "name_taken" } : { stubDir: u };
  let d = policyDenyKind("allow_cobalt_plinth");
  if (d !== null) return { skip: `org_policy_${d}` };
  if (!hasApiClient()) return { skip: "essential_traffic_or_3p" };
  if (getFrameHostOverride() !== void 0) return { skip: "dev_frame_override" };
  let n;
  try {
    n = new URL(Tgr());
  } catch {
    return { skip: "base_not_first_party" };
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
    return { skip: "base_not_first_party" };
  if (r.has(CLAUDE_ARTIFACTS)) return { skip: "name_taken" };
  return { url: new URL(ARTIFACTS_MCP_PATH, n.origin).href };
}
//@ chunk-g62cc56z.js:7485-7563 placement
function isArtifactsMcpLaptopEntry(e) {
  return typeof e === "object" && e !== null && w().built.has(e) && Zl(e);
}
//@ chunk-g62cc56z.js:7563-7640 placement
function artifactsMcpLaptopToolOverridesFor(e) {
  if (!isArtifactsMcpLaptopEntry(e)) return {};
  return { skipAggregateToolResultBudget: !0 };
}
/**
 * 本机 Artifacts MCP 服务条目：决定是否添加、包装发布动作并记遥测。
 */
//@ chunk-g62cc56z.js:7640-8926 placement
function wrapArtifactsMcpLaptopPublishing(e, r) {
  let o = r.mcpInfo?.toolName;
  if (
    o === void 0 ||
    !(ARTIFACT_ACTIONS.has(o) || o === DELETE_ARTIFACT) ||
    !(isArtifactsMcpLaptopEntry(e) || isOwnCcrMcpServer(e))
  )
    return;
  if (ARTIFACT_ACTIONS.has(o)) Object.assign(r, { preserveToolUseResultInSubagents: !0 });
  let s = r.call;
  r.call = async (p, u, d, n, _, y) => {
    let h = getLiveState(),
      { accountEpoch: accountEpoch, conversationEpoch: conversationEpoch } = h,
      A = await withPublishAnalytics(
        o,
        () => {
          let k = n?.message?.content,
            C = Array.isArray(k) ? k.find((O) => O.type === "tool_use" && O.id === u.toolUseId) : void 0;
          return C?.type === "tool_use" ? C.input : p;
        },
        () => u.abortController.signal.aborted,
        () => s.call(r, p, u, d, n, _, y),
      );
    if (o === DELETE_ARTIFACT) {
      try {
        let k = deletedSlugFromResult(A.data);
        if (k !== null && isPlainObject(p) && p.slug === k)
          qSe.loaded()?.forgetArtifactDeletedThroughMcp(u, k);
      } catch (error) {
        (logFeatureBad("artifact_mcp_laptop_publish_row", "forget_threw"), logError(error));
      }
      return A;
    }
    let v = getLiveState();
    if (v.accountEpoch !== accountEpoch || v.conversationEpoch !== conversationEpoch) return A;
    let T;
    try {
      T = publishedArtifactFromResult(A.data);
    } catch (error) {
      return (logFeatureBad("artifact_mcp_laptop_publish_row", "threw"), logError(error), A);
    }
    if (T === null) return (logFeatureSad("artifact_mcp_laptop_publish_row", "unlisted"), A);
    let I = isArtifactsMcpLaptopEntry(e);
    if ((recordOwnPublishedSlug(u, T, o, p, I, shareFieldsFromResult(A.data).read === "owner"), !I)) return A;
    let arm = U3o.arm;
    if (arm === null) return (logFeatureSad("artifact_mcp_laptop_publish_row", "no_wake_arm"), A);
    let M = !1;
    try {
      let { version: version, ...C } = T;
      M = arm(u, o === "create_from_type" ? C : T);
    } catch (error) {
      (logFeatureBad("artifact_mcp_laptop_publish_row", "wake_threw"), logError(error));
    }
    return M !== !1 && Array.isArray(A.data) ? { ...A, data: [...A.data, { type: "text", text: z[M] }] } : A;
  };
}
/**
 * 记录本会话发布的 artifact
 */
//@ chunk-g62cc56z.js:8926-9697 placement
function recordOwnPublishedSlug(e, r, o, s, p, u) {
  try {
    let ownPublishedSlugs = getLiveState().ownPublishedSlugs,
      n = ownPublishedSlugs.get(r.slug);
    if (!u && n !== void 0) ownPublishedSlugs.set(r.slug, { env: n.env });
    if (
      p &&
      u &&
      o !== "create_from_type" &&
      o !== "copy_file" &&
      !isDelegatedObservationContext(e.agentContext) &&
      isStrictHumanTurn(e.messages)
    )
      ownPublishedSlugs.set(r.slug, { env: r.env, byPerson: !0 });
    let _ = isCreateAction(o, s);
    if (_ && o !== "create_from_type" && p && !isDelegatedObservationContext(e.agentContext))
      getLiveState().ownCreatedSlugs.set(r.slug, { env: r.env, wrotePage: !0 });
    let loaded = qSe.loaded();
    if (loaded === null) {
      logFeatureSad("artifact_mcp_laptop_publish_row", "no_writer");
      return;
    }
    let addOpenedFrameRow = loaded.addOpenedFrameRow(e, r, r.title, { mcpPublished: !0 });
    (logFeatureOk("artifact_mcp_laptop_publish_row"),
      loaded.surfacePublishedArtifact(
        e,
        loaded.derivePublishContext(e).hasInteractiveUI && e.agentId === void 0,
        { slug: r.slug, url: artifactViewerUrlFor(r) },
        !_,
        (S) => loaded.markFrameOpenOutcome(e, addOpenedFrameRow.rowKey, S),
      ));
  } catch (error) {
    (logFeatureBad("artifact_mcp_laptop_publish_row", "threw"), logError(error));
  }
}
//@ chunk-g62cc56z.js:9697-10724 placement
var LOCAL_WAKE_LINE = `Once this session's watch on this artifact connects, when the user sends a comment on the artifact to Claude, this session gets a message naming the artifact and the thread. Plain comments, and comments other people send to Claude, do not wake it. Any "wake" field in this answer describes cloud sessions only.`,
  CLOUD_WAKE_LINE =
    'A wake for this session is registered with the artifact service, or is being registered (a notice follows if it cannot be). With it, this session gets a new turn when anyone sends a comment on the artifact to Claude, or when the artifact is republished elsewhere. Plain comments do not wake it. A wake carries neither the comment nor the new version. Any "wake" field in this answer does not describe this registration.',
  CLOUD_UNWOKEN_LINE =
    'No wake could be registered for this session, so comments on this artifact and republishes of it will not start a turn here: this session is not watching the artifact. Any "wake" field in this answer does not describe this session.',
  z = { local: LOCAL_WAKE_LINE, cloud: CLOUD_WAKE_LINE, cloud_unwoken: CLOUD_UNWOKEN_LINE };
/**
 * 判断 Artifact 工具被关闭或禁止：功能未开启、策略禁止 allow_cobalt_plinth，或磁盘权限规则里有针对 Artifact 工具的 deny 规则。
 */
//@ chunk-g62cc56z.js:10724-10852 placement
function isArtifactToolBlocked() {
  return (
    !isArtifactToolEnabled() ||
    policyDenyKind("allow_cobalt_plinth") !== null ||
    getDenyRuleForTool(
      getEmptyToolPermissionContext(),
      { name: ARTIFACT_TOOL_NAME },
      loadAllPermissionRulesFromDisk().filter((e) => e.ruleBehavior === "deny"),
    ) !== null
  );
}
//@ chunk-g62cc56z.js:10852-10909 placement
async function Y() {
  if (isArtifactToolBlocked()) return null;
  return await getClaudeAiAccessToken();
}

export {
  mayBuildArtifactsMcpLaptopEntryAfterStart,
  isArtifactsMcpLaptopLoginCompleted,
  buildArtifactsMcpLaptopEntryAfterStart,
  noteLoginsCompletedForArtifactsMcpLaptopEntry,
};
