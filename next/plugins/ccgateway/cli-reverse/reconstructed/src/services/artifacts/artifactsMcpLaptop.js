/**
 * services/artifacts/artifactsMcpLaptop.ts
 *
 * 2.1.316 新增。本机 Artifacts MCP 服务条目：决定是否添加、包装发布动作并记遥测。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-m4b3rd96.js (21)
 * attribution: placement 21
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
  CREATE_FROM_TYPE,
  isKeptInFiles,
  PUBLISH_FILES,
  writersArmSlot,
  COPY_FILE,
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
import { pickAlias } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { buildFrameHeaders } from "./frameApi.js";
import { FRAME_CLIENT_HEADERS } from "./artifactMcpWire.js";
import { isByocEnvironment } from "../../utils/remoteEnvironment.js";
import { isHostEntrypoint, isHostSessionEntrypoint } from "../../utils/entrypointKinds.js";
import { env } from "../../utils/env.js";
import { isArtifactShareSession } from "../../utils/sessionSurface.js";
import { isBareMode } from "../../utils/envUtils.js";
import { isCustomizationDisabled } from "../../utils/settings/customizationDisabled.js";
import { deniedBashRules, getDenyRuleForTool } from "../../utils/permissions/permissions.js";
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
import { sanitizeArtifactTitle, artifactViewerUrlFor } from "../../tools/ArtifactTool/artifactUrls.js";
import { isDelegatedObservationContext } from "../../utils/agentContext.js";
import { isStrictHumanTurn } from "../../utils/turnOrigin.js";
import { getEmptyToolPermissionContext } from "../../Tool.js";
import { loadAllPermissionRulesFromDisk } from "../../utils/permissions/permissionsLoader.js";

//@ chunk-m4b3rd96.js:1589-1937 placement
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
//@ chunk-m4b3rd96.js:1937-2088 placement
/**
 * 遥测失败不影响调用
 */
function safelyRecordAnalytics(event) {
  try {
    event();
  } catch (error) {
    logError(
      withTelemetryMessage(
        toError(error),
        "The outcome of an Artifacts MCP publish could not be counted in analytics; the call itself is unaffected",
      ),
    );
  }
}
//@ chunk-m4b3rd96.js:2088-3161 placement
/**
 * 包装发布动作并记遥测
 */
async function withPublishAnalytics(actionName, getInput, call, context) {
  if (!ARTIFACT_ACTIONS.has(actionName)) return context();
  let isCreateFromType = actionName === "create_from_type";
  let baseFields = () => ({
    is_redeploy: !isCreateAction(actionName, getInput()),
    ...LAPTOP_PUBLISH_ANALYTICS,
  });
  let result;
  try {
    result = await context();
  } catch (error) {
    safelyRecordAnalytics(() => {
      if (call()) return;
      let isToolCallError = error instanceof McpToolCallError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS;
      let statusText = !isToolCallError
        ? undefined
        : error.message === "not found"
          ? "404"
          : /^[a-z_]+ failed \(HTTP (\d{3})\): /m.exec(error.message)?.[1];
      let statusCode = statusText === undefined ? undefined : Number(statusText);
      if (isCreateFromType) {
        if (!isToolCallError)
          logFeatureBad("artifact_create_from_type", "request_error", LAPTOP_PUBLISH_ANALYTICS);
        else if (statusCode === undefined)
          logFeatureBad("artifact_create_from_type", "mcp_tool_error", LAPTOP_PUBLISH_ANALYTICS);
        else
          logFeatureBad(
            "artifact_create_from_type",
            statusCode === 404 ? "not_found" : statusCode === 403 ? "denied" : `status_${statusCode}`,
            {
              status: statusCode,
              ...LAPTOP_PUBLISH_ANALYTICS,
            },
          );
        return;
      }
      let fields = baseFields();
      if (error instanceof McpToolFileInputRejectedError)
        logFeatureBad(
          "artifact_publish",
          ACCEPTED_ERROR_CODES.has(error.code) || error.code.startsWith("model_")
            ? `attach_refused_${error.code}`
            : `attach_failed_${error.code}`,
          fields,
        );
      else if (!isToolCallError) logFeatureBad("artifact_publish", "request_error", fields);
      else if (statusCode === undefined) logFeatureBad("artifact_publish", "deploy_failed", fields);
      else
        logFeatureBad(
          "artifact_publish",
          statusCode === 403
            ? "publish_denied"
            : statusCode === 404 && fields.is_redeploy
              ? "slug_gone"
              : "deploy_failed",
          {
            ...fields,
            deploy_status: statusCode,
          },
        );
    });
    throw error;
  }
  safelyRecordAnalytics(() => {
    if (publishedArtifactFromResult(result.data) === null) return;
    if (isCreateFromType) logFeatureOk("artifact_create_from_type", LAPTOP_PUBLISH_ANALYTICS);
    else logFeatureOk("artifact_publish", baseFields());
  });
  return result;
}
//@ chunk-m4b3rd96.js:3161-3325 placement
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
//@ chunk-m4b3rd96.js:3325-3362 placement
function laptopStates() {
  return artifactsMcpLaptopStates.of(getRootSession().host);
}
//@ chunk-m4b3rd96.js:3362-3580 placement
function buildArtifactsMcpLaptopEntry(entry) {
  let laptopEntry = buildLaptopEntry(entry, null);
  let states = laptopStates();
  states.laterBuild = {
    kind: "closed",
  };
  if (laptopEntry.skip === undefined) return laptopEntry.entry;
  if (LAPTOP_SKIP_SILENT_REASONS.has(laptopEntry.skip)) {
    states.laterBuild = {
      kind: "waiting",
      startup: laptopEntry,
    };
    states.loginsCompleted = {
      count: 0,
      account: currentAccountKey(),
    };
  }
  logLaptopEntrySkip(laptopEntry, false);
  return null;
}
//@ chunk-m4b3rd96.js:3580-4055 placement
function buildArtifactsMcpLaptopEntryAfterStart(entry) {
  let states = laptopStates();
  let { laterBuild } = states;
  if (laterBuild.kind === "closed") return null;
  if (!isArtifactsMcpLaptopLoginCompleted()) return "waiting";
  let laptopEntry = buildLaptopEntry(entry, laterBuild.kind === "built" ? laterBuild.entry : null);
  if (laptopEntry.skip !== undefined && LAPTOP_SKIP_SILENT_REASONS.has(laptopEntry.skip)) return "waiting";
  if (laterBuild.kind === "built") return laptopEntry.entry ?? null;
  if (laptopEntry.skip !== undefined) {
    states.laterBuild = {
      kind: "closed",
    };
    logLaptopEntrySkip(laptopEntry, true);
    return null;
  }
  states.laterBuild = {
    kind: "built",
    entry: laptopEntry.entry,
  };
  logEvent("tengu_artifact_mcp_laptop_entry_added_later", {
    startup_reason: fromEnum(laterBuild.startup.skip),
    startup_part: fromEnumOpt(laterBuild.startup.part),
  });
  return laptopEntry.entry;
}
//@ chunk-m4b3rd96.js:4055-4179 placement
function noteLoginsCompletedForArtifactsMcpLaptopEntry(loginCompleted, login) {
  let states = laptopStates();
  if (loginCompleted > states.loginsCompleted.count)
    states.loginsCompleted = {
      count: loginCompleted,
      account: login === "as_it_completed" ? currentAccountKey() : null,
    };
}
//@ chunk-m4b3rd96.js:4179-4253 placement
function isArtifactsMcpLaptopLoginCompleted() {
  let accountKey = currentAccountKey();
  return accountKey !== null && accountKey === laptopStates().loginsCompleted.account;
}
//@ chunk-m4b3rd96.js:4253-4306 placement
function mayBuildArtifactsMcpLaptopEntryAfterStart() {
  return laptopStates().laterBuild.kind !== "closed";
}
//@ chunk-m4b3rd96.js:4306-4462 placement
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
//@ chunk-m4b3rd96.js:4462-5001 placement
/**
 * 记录未加入 Artifacts MCP 服务的原因
 */
function logLaptopEntrySkip({ skip, part, agentCloudSession }, afterStart) {
  let mapped = part === "growthbook_off" ? "feature_flag_off" : part;
  switch (
    (logForDebugging(`Artifacts MCP server not added: ${skip}${mapped === undefined ? "" : ` (${mapped})`}`),
    skip)
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
//@ chunk-m4b3rd96.js:5001-6133 placement
/**
 * 构造本机 Artifacts MCP 服务条目或给出跳过原因
 */
function buildLaptopEntry(
  { toolPermissionContext, configuredNames, fixedServerSet, allowedByPolicy },
  permissionContext,
) {
  try {
    let skipReason = laptopEntrySkipReason(toolPermissionContext, configuredNames, fixedServerSet);
    if (skipReason.skip !== undefined) return skipReason;
    if (skipReason.stubDir !== undefined) {
      let config = {
        ...buildSelfStdioServerConfig(
          skipReason.stubDir,
          getEvalReadRoots(getOriginalCwd(), toolPermissionContext),
        ),
        scope: "dynamic",
      };
      if (!allowedByPolicy(CLAUDE_ARTIFACTS, config))
        return {
          skip: "org_mcp_policy",
        };
      if (permissionContext !== null)
        return {
          entry: permissionContext,
        };
      let registered = registerCliOwnedConfig(config);
      laptopStates().built.add(registered);
      return {
        entry: {
          name: CLAUDE_ARTIFACTS,
          config: registered,
        },
      };
    }
    let config2 = {
      type: "http",
      url: skipReason.url,
      headers: {
        "anthropic-beta": OAUTH_BETA_HEADER,
      },
      scope: "dynamic",
      toolPermissions: {
        ...BLOCKED_TOOL_POLICY,
      },
    };
    if (!allowedByPolicy(CLAUDE_ARTIFACTS, config2))
      return {
        skip: "org_mcp_policy",
      };
    if (permissionContext !== null)
      return {
        entry: permissionContext,
      };
    let registered2 = registerCliOwnedConfig(config2, {
      firstPartyServer: {
        id: ARTIFACTS_SERVER_ID,
        allowsFileUpload: () => !isArtifactToolBlocked() && allowedByPolicy(CLAUDE_ARTIFACTS, config2),
      },
      resolveBearerToken: resolveLaptopBearer,
      withheldBearerRefusal: artifactsMcpInCloudSession()
        ? "Artifacts request not sent: this session can no longer use Artifacts. A permission rule or policy stops it, or its own token no longer works."
        : "Artifacts request not sent: this session can no longer use Artifacts with its login. In a terminal, check /login, /permissions and /config.",
      requestHeaders: () => pickAlias(buildFrameHeaders(), FRAME_CLIENT_HEADERS),
    });
    laptopStates().built.add(registered2);
    emitArtifactStartupTelemetry(() => logFeatureOk("artifact_mcp_laptop_entry"));
    return {
      entry: {
        name: CLAUDE_ARTIFACTS,
        config: registered2,
      },
    };
  } catch {
    emitArtifactStartupTelemetry(() => logFeatureBad("artifact_mcp_laptop_entry", "threw"));
    return {
      skip: "threw",
    };
  }
}
//@ chunk-m4b3rd96.js:6133-7505 placement
/**
 * 判断本机是否应加 Artifacts MCP 服务
 */
function laptopEntrySkipReason(toolPermissionContext, configuredNames, fixedServerSet) {
  if (getIsRemoteMode() || isByocEnvironment())
    return {
      skip: "remote_session",
    };
  let cloudSession = artifactsMcpInCloudSession();
  if (cloudSession) {
    let mod = require("./frameRelay.js");
    if (mod.relayIsOnlyRoute() || !mod.agentSessionMaySendDirect())
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
      agentCloudSession: cloudSession,
    };
  if (isBareMode() || isCustomizationDisabled("mcpAutoDiscovered"))
    return {
      skip: "safe_or_bare_mode",
      agentCloudSession: cloudSession,
    };
  if (!isArtifactToolEnabled())
    return {
      skip: "artifact_tool_off",
      part: hasAnyGatewayCredential()
        ? (artifactToolWithholdingGate() ?? (isArtifactAdminAllowed() ? "not_found" : "admin_policy"))
        : "login",
      agentCloudSession: cloudSession,
    };
  let rules = deniedBashRules(toolPermissionContext);
  if (
    getDenyRuleForTool(
      toolPermissionContext,
      {
        name: ARTIFACT_TOOL_NAME,
      },
      rules,
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
          rules.filter((rule) => rule.source !== "toolsNarrowing"),
        ) === null
          ? "tools_list"
          : "deny_rule",
      agentCloudSession: cloudSession,
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
  let denyKind = policyDenyKind("allow_cobalt_plinth");
  if (denyKind !== null)
    return {
      skip: `org_policy_${denyKind}`,
    };
  if (!hasApiClient())
    return {
      skip: "essential_traffic_or_3p",
    };
  if (getFrameHostOverride() !== undefined)
    return {
      skip: "dev_frame_override",
    };
  let reason;
  try {
    reason = new URL(frameBaseUrl());
  } catch {
    return {
      skip: "base_not_first_party",
    };
  }
  if (
    reason.protocol !== "https:" ||
    reason.username !== "" ||
    reason.password !== "" ||
    reason.pathname !== "/" ||
    reason.search !== "" ||
    reason.hash !== "" ||
    !isFirstPartyAnthropicHost(reason.href)
  )
    return {
      skip: "base_not_first_party",
    };
  if (configuredNames.has(CLAUDE_ARTIFACTS))
    return {
      skip: "name_taken",
    };
  return {
    url: new URL(ARTIFACTS_MCP_PATH, reason.origin).href,
  };
}
//@ chunk-m4b3rd96.js:7505-7583 placement
function isArtifactsMcpLaptopEntry(entry) {
  return (
    typeof entry === "object" && entry !== null && laptopStates().built.has(entry) && isCliOwnedConfig(entry)
  );
}
//@ chunk-m4b3rd96.js:7583-7660 placement
function artifactsMcpLaptopToolOverridesFor(entry) {
  if (!isArtifactsMcpLaptopEntry(entry)) return {};
  return {
    skipAggregateToolResultBudget: true,
  };
}
//@ chunk-m4b3rd96.js:7660-9149 placement
/**
 * 本机 Artifacts MCP 服务条目：决定是否添加、包装发布动作并记遥测。
 */
function wrapArtifactsMcpLaptopPublishing(entry, tool) {
  let toolName = tool.mcpInfo?.toolName;
  if (
    toolName === undefined ||
    !(ARTIFACT_ACTIONS.has(toolName) || toolName === DELETE_ARTIFACT) ||
    !(isArtifactsMcpLaptopEntry(entry) || isOwnCcrMcpServer(entry))
  )
    return;
  if (ARTIFACT_ACTIONS.has(toolName))
    Object.assign(tool, {
      preserveToolUseResultInSubagents: true,
    });
  let originalCall = tool.call;
  tool.call = async (input, context, canUseTool, message, onProgress, extra) => {
    let liveState = getLiveState();
    let { accountEpoch, conversationEpoch } = liveState;
    let result = await withPublishAnalytics(
      toolName,
      () => {
        let content = message?.message?.content;
        let toolContent = Array.isArray(content)
          ? content.find((block) => block.type === "tool_use" && block.id === context.toolUseId)
          : undefined;
        return toolContent?.type === "tool_use" ? toolContent.input : input;
      },
      () => context.abortController.signal.aborted,
      () => originalCall.call(tool, input, context, canUseTool, message, onProgress, extra),
    );
    if (toolName === DELETE_ARTIFACT) {
      try {
        let deletedSlug = deletedSlugFromResult(result.data);
        if (deletedSlug !== null && isPlainObject(input) && input.slug === deletedSlug)
          lazyWritersSlot.loaded()?.forgetArtifactDeletedThroughMcp(context, deletedSlug);
      } catch (error) {
        logFeatureBad("artifact_mcp_laptop_publish_row", "forget_threw");
        logError(error);
      }
      return result;
    }
    let liveState_2 = getLiveState();
    if (liveState_2.accountEpoch !== accountEpoch || liveState_2.conversationEpoch !== conversationEpoch)
      return result;
    let result_2;
    try {
      result_2 = publishedArtifactFromResult(result.data);
    } catch (error) {
      logFeatureBad("artifact_mcp_laptop_publish_row", "threw");
      logError(error);
      return result;
    }
    if (result_2 === null) {
      logFeatureSad("artifact_mcp_laptop_publish_row", "unlisted");
      return result;
    }
    let isLaptopEntry = isArtifactsMcpLaptopEntry(entry);
    recordOwnPublishedSlug(
      context,
      result_2,
      toolName,
      input,
      isLaptopEntry,
      shareFieldsFromResult(result.data).read === "owner",
      toolName === CREATE_FROM_TYPE &&
        isKeptInFiles(result.data) &&
        context.options.tools.some(
          (tool_2) =>
            tool_2.mcpInfo?.serverName === tool.mcpInfo?.serverName &&
            tool_2.mcpInfo?.toolName === PUBLISH_FILES,
        ),
    );
    if (!isLaptopEntry) return result;
    let arm = writersArmSlot.arm;
    if (arm === null) {
      logFeatureSad("artifact_mcp_laptop_publish_row", "no_wake_arm");
      return result;
    }
    let alreadyRecorded = false;
    try {
      let { title, ...publishInput } = result_2;
      let rest =
        isPlainObject(input) && typeof input.title === "string" ? sanitizeArtifactTitle(input.title) : null;
      let restWithoutVersion =
        rest === null
          ? publishInput
          : {
              ...publishInput,
              title: rest,
            };
      let { version, ...withoutVersion } = restWithoutVersion;
      alreadyRecorded = arm(context, toolName === CREATE_FROM_TYPE ? withoutVersion : restWithoutVersion);
    } catch (error) {
      logFeatureBad("artifact_mcp_laptop_publish_row", "wake_threw");
      logError(error);
    }
    return alreadyRecorded !== false && Array.isArray(result.data)
      ? {
          ...result,
          data: [
            ...result.data,
            {
              type: "text",
              text: WAKE_LINES[alreadyRecorded],
            },
          ],
        }
      : result;
  };
}
//@ chunk-m4b3rd96.js:9149-10057 placement
/**
 * 记录本会话发布的 artifact
 */
function recordOwnPublishedSlug(context, result, actionName, input, toolUseId, isCreate, toolUseContext) {
  try {
    let ownPublishedSlugs = getLiveState().ownPublishedSlugs;
    let existing = ownPublishedSlugs.get(result.slug);
    if (!isCreate && existing !== undefined)
      ownPublishedSlugs.set(result.slug, {
        env: existing.env,
      });
    if (
      toolUseId &&
      isCreate &&
      actionName !== CREATE_FROM_TYPE &&
      actionName !== COPY_FILE &&
      !isDelegatedObservationContext(context.agentContext) &&
      isStrictHumanTurn(context.messages)
    )
      ownPublishedSlugs.set(result.slug, {
        env: result.env,
        byPerson: true,
      });
    let createAction = isCreateAction(actionName, input);
    if (
      createAction &&
      actionName !== CREATE_FROM_TYPE &&
      toolUseId &&
      !isDelegatedObservationContext(context.agentContext)
    )
      getLiveState().ownCreatedSlugs.set(result.slug, {
        env: result.env,
        wrotePage: true,
      });
    let writers = lazyWritersSlot.loaded();
    if (writers === null) {
      logFeatureSad("artifact_mcp_laptop_publish_row", "no_writer");
      return;
    }
    let added = writers.addOpenedFrameRow(context, result, result.title, {
      mcpPublished: true,
    });
    logFeatureOk("artifact_mcp_laptop_publish_row");
    let row = {
      slug: result.slug,
      url: artifactViewerUrlFor(result),
    };
    let interactiveUI =
      writers.derivePublishContext(context).hasInteractiveUI && context.agentId === undefined;
    let { deferredSurface } = getLiveState();
    if (toolUseContext) {
      if (interactiveUI) deferredSurface.set(result.slug, row);
      return;
    }
    let surfaced = actionName !== COPY_FILE && deferredSurface.delete(result.slug);
    let movedAway = writers.surfacePublishedArtifact(
      context,
      surfaced || interactiveUI,
      row,
      !createAction && !surfaced,
      (outcome) => writers.markFrameOpenOutcome(context, added.rowKey, outcome),
    );
    if (surfaced && movedAway === "auto_open_skipped_remote_control") deferredSurface.set(result.slug, row);
  } catch (error) {
    logFeatureBad("artifact_mcp_laptop_publish_row", "threw");
    logError(error);
  }
}
//@ chunk-m4b3rd96.js:10057-11084 placement
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
//@ chunk-m4b3rd96.js:11084-11212 placement
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
      loadAllPermissionRulesFromDisk().filter((rule) => rule.ruleBehavior === "deny"),
    ) !== null
  );
}
//@ chunk-m4b3rd96.js:11212-11269 placement
async function resolveLaptopBearer() {
  if (isArtifactToolBlocked()) return null;
  return await getClaudeAiAccessToken();
}
export {
  mayBuildArtifactsMcpLaptopEntryAfterStart,
  isArtifactsMcpLaptopLoginCompleted,
  buildArtifactsMcpLaptopEntryAfterStart,
  noteLoginsCompletedForArtifactsMcpLaptopEntry,
  CLOUD_UNWOKEN_LINE,
  CLOUD_WAKE_LINE,
  LOCAL_WAKE_LINE,
  artifactsMcpLaptopStates,
  artifactsMcpLaptopToolOverridesFor,
  buildArtifactsMcpLaptopEntry,
  isArtifactsMcpLaptopEntry,
  wrapArtifactsMcpLaptopPublishing,
};
