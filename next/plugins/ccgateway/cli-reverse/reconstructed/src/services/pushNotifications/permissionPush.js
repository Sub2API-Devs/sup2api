/**
 * services/pushNotifications/permissionPush.ts
 *
 * 2.1.316 新增：创建权限询问函数（launcher/strict 模式、推送、远程）；询问权限并同时推送，取先到的答复等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-0fqk5atw.js (30)
 * attribution: placement 27, layout 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isDeepStrictEqual } from "util";
import { randomUUID } from "crypto";
import {
  permissionGrantScope,
  isBypassImmuneDecision,
  hasPermissionsToUseTool,
  isServerPolicyAskReason,
  isServerPolicyAskUnderPlanFloor,
  checkDeclarativePermissionLessServerPolicyAsks,
  hasPermissionsToUseToolWithSink,
  findSafetyCheckReason,
  askCeilingReason,
  shouldSuppressAlwaysAllow,
} from "../../utils/permissions/permissions.js";
import {
  serializeDecisionReason,
  isCircuitBreakerSafetyCheck,
} from "../../utils/permissions/decisionReasons.js";
import { buildNoApprovalSurfaceDenial as buildNoApprovalSurfaceDenial_2 } from "../../utils/messages.js";
import {
  NO_APPROVAL_SURFACE_DENY_REASON,
  refusedAskOf,
  NO_PROMPT_SURFACE_DENY_REASON,
  toolMaySettleUnaskedQuestion,
  mustBeLeftToAPerson,
  NO_PROMPT_SURFACE_REASON,
  decisionReasonCode,
  decisionReasonTypeOnWire,
  READ_ONLY_AUTO_ALLOW_REASON,
  NO_KNOWN_PERSON_STARTED_THE_TURN_REASON,
  isInvalidInputDeny,
  CAN_USE_TOOL_ABORTED_DENY_REASON,
  CAN_USE_TOOL_REQUEST_FAILED_DENY_REASON,
  CAN_USE_TOOL_INVALID_RESULT_DENY_REASON,
  CAN_USE_TOOL_STREAM_CLOSED_DENY_REASON,
} from "../../types/permissions.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { logForDebugging } from "../../utils/debug.js";
import { ASKUSERQUESTION } from "../../tools/AskUserQuestionTool/prompt.js";
import { EXITPLANMODE } from "../../tools/ExitPlanModeTool/constants.js";
import { humanizeToolName } from "../../bridge/bridgePermissionResponse.js";
import { CONNECTGITHUB } from "../../components/ConnectGitHub/constants.js";
import { truncate } from "../../utils/format.js";
import { redactSecretsInText } from "../teamMemorySync/secretScanner.js";
import { stripIgnorables } from "../../utils/sanitization.js";
import { OFFERCHROMESETUP } from "../../tools/ReadNotificationsTool/ReadNotificationsTool.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { POWERSHELL_TOOL_NAME } from "../../tools/PowerShellTool/toolName.js";
import { isHostOnlyNativeTool } from "../api/deferredToolsState.js";
import { hasHostField } from "../../bridge/deviceRegistration.js";
import { MAX_DESCRIPTION_CHARS } from "../../constants/outputLimits.js";
import { CLAUDE_CODE_REMOTE } from "../mcp/ccrMetaMcp.js";
import { COWORK, VISUALIZE, MEMORY, CLAUDE_ARTIFACTS } from "../mcp/firstPartyServerIds.js";
import { getToolNameForPermissionCheck } from "../mcp/mcpStringUtils.js";
import { isBuiltinMcpServerName } from "../mcp/builtinServerNames.js";
import { RESERVED_SERVER_IDS_WITH_DOCS } from "../mcp/remoteBrowserServer.js";
import { isCoworkCardMode } from "../../utils/permissions/connectorCardAllows.js";
import { isChromeToolName } from "../../utils/claudeInChrome/chromeToolNames.js";
import { isRemoteBrowserToolUnderModeFloor } from "../../utils/permissions/remoteBrowser.js";
import {
  getToolPermissionContext,
  storedToolPermissionContext,
} from "../../utils/permissions/toolPermissionContext.js";
import { isAutoClassifierActive } from "../../utils/permissions/autoModeState.js";
import { isAutoAllowedInMode } from "../../utils/permissions/browserToolNames.js";
import { isAbortError, withTelemetryMessage, toError, StreamClosedAbortError } from "../../utils/errors.js";
import { logError } from "../../utils/log.js";
import { permissionModeSignal } from "../../utils/permissions/permissionSetup.js";
import { getRegisteredCheck } from "../../utils/permissions/checkRegistry.js";
import { getPluginRegistry } from "../../utils/plugins/pluginLoadState.js";
import {
  hasModuleHookingSite,
  getLoadedModulesForSite,
} from "../../plugins/hooksModules/loadedModuleFilters.js";
import { matcherTestTarget } from "../../utils/hooks/matcherGrammar.js";
import { managedTierHooks, hasSettingsHookForEvent } from "../../utils/hooks.js";
import { dispatchClassicEvent } from "../../plugins/functionHooks/modAdmission.js";
import { registerAgent } from "../../utils/telemetry/perfettoTracing.js";
import { requiresConnectorGrant_2 } from "../mcp/claudeai.js";
import { logFeatureBad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { env } from "../../utils/env.js";
import { isUserDrivenHere, isUserDrivenTurn } from "../../utils/turnOrigin.js";
import { isAgentSdkEntrypoint } from "../../utils/entrypointKinds.js";
import { isCcsTenant } from "../../bootstrap/state.js";
import { isHumanOriginLoosely, isTriggerFireOrigin } from "../../bridge/inboundMessageOrigin.js";
import { classifyMessageSource_2 } from "../../utils/messages/messageSource.js";
import { isTerminalShutdown, heldUntilExit } from "../../utils/terminalShutdown.js";
import {
  permissionPromptToolResultToPermissionDecision,
  schedulePermissionNotify,
  alwaysAllowRulesFor,
  PERMISSION_PROMPT_RESULT_FORMAT_HINT,
} from "../../utils/permissions/PermissionPromptToolResultSchema.js";
import { dropPermissionRecord } from "../../utils/permissions/permissionRecord.js";
import { suggestionForExactCommand } from "../../tools/BashTool/bashPermissions.js";
import { getForegroundSubagentId, getBackgroundAgentId, context } from "../../utils/agentContext.js";
import { executePermissionRequestHooksForSDK } from "../../cli/structuredIO.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { isUsableChromeSiteWithPort } from "../../utils/claudeInChrome/chromePermissions.js";
import { relativeToCallFrame, askerDirIfNotWorktree } from "../../utils/sessionStateCwd.js";
import { stripNonPrintable } from "../../utils/truncateGraphemes.js";
import { stripAnsi } from "../../utils/stripAnsi.js";
import { mcpServerIdentityForHooks } from "../mcp/fileReference/fileReferencePolicy.js";
import {
  classicPreToolUseHookId_2,
  classicPreToolUseHookId,
  classicHookId,
} from "../../plugins/functionHooks/sites/classicHookIds.js";
import {
  logPermissionRequestShown,
  logPermissionDecision,
} from "../../hooks/toolPermission/permissionLogging.js";
import { turnAbortControllerOf, isAskWithdrawnByAsker } from "../../utils/abortController.js";
import { returnFalsePermissionHook, recordHostAttestedCall } from "../../components/permissions/hooks.js";
import { recordMcpApprovalTicket_2 } from "../../bridge/mcpApprovalTickets.js";
import { logEvent } from "../analytics/index.js";
import { formatPermissionRequestFailure } from "../../utils/permissions/permissionAnswer.js";
import { ZodError } from "../../../vendor/zod/v4/classic/errors.js";
import { setPermissionPromptHostProbe } from "../../utils/permissions/permissionPromptHost.js";
import { dropStaleHostDisplay } from "../../utils/hooks/hookMessages.js";
import { import_sortedIndex_2 } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-0fqk5atw.js:6122-6224 placement
function getGrantScopeField(hostPolicy, updates) {
  let scope = permissionGrantScope(updates);
  return scope === "once" || (scope === "session" && hostPolicy.kind === "launcher")
    ? {
        grantScope: scope,
      }
    : {};
}
//@ chunk-0fqk5atw.js:6224-6435 placement
/**
 * 构建"没有可批准界面"时的拒绝结果，消息附带决定原因。
 */
function buildNoApprovalSurfaceDenial(request) {
  let reasonText = serializeDecisionReason(request.decisionReason);
  let message =
    reasonText !== undefined && !request.message.includes(reasonText)
      ? `${request.message} ${reasonText}`
      : request.message;
  return {
    behavior: "deny",
    message: buildNoApprovalSurfaceDenial_2(message),
    decisionReason: {
      ...NO_APPROVAL_SURFACE_DENY_REASON,
      ask: refusedAskOf(request),
    },
    decideLocation: "ask-path",
  };
}
//@ chunk-0fqk5atw.js:6435-6564 placement
function buildNoPromptSurfaceDenial(request, reason) {
  return {
    behavior: "deny",
    message: request.message,
    decisionReason: {
      ...NO_PROMPT_SURFACE_DENY_REASON,
      reason,
      ask: refusedAskOf(request),
    },
    decideLocation: "ask-path",
  };
}
//@ chunk-0fqk5atw.js:6564-6619 placement
/**
 * 没有可弹提示的界面且状态未定时给出拒绝。
 */
function noPromptSurfaceDenialIfUnsettled(tool, request, reason, reason_2) {
  return toolMaySettleUnaskedQuestion(tool, request, reason)
    ? buildNoPromptSurfaceDenial(request, reason_2)
    : undefined;
}
//@ chunk-0fqk5atw.js:6619-6682 placement
/**
 * 没有弹窗界面且只允许本人时给出拒绝。
 */
function noPromptSurfaceDenialIfPersonOnly(tool, request, signal, toolUseContext, toolUseId) {
  return mustBeLeftToAPerson(request, tool, signal, toolUseContext, toolUseId)
    ? buildNoPromptSurfaceDenial(request, NO_PROMPT_SURFACE_REASON)
    : undefined;
}
//@ chunk-0fqk5atw.js:6682-6710 placement
var TENGU_CINDER_SWIFT = "tengu_cinder_swift";
//@ chunk-0fqk5atw.js:6710-6758 placement
/**
 * 是否启用打断模式的推送授权。
 */
function isInterruptModeOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_CINDER_SWIFT, "off") === "interrupt";
}
//@ chunk-0fqk5atw.js:6758-6923 placement
function describeToolUseForPush(tool, toolUse) {
  try {
    return tool.getToolUseSummary?.(toolUse) ?? tool.getActivityDescription?.(toolUse) ?? "";
  } catch (error) {
    logForDebugging(`describeToolUseForPush failed: ${error}`, {
      level: "error",
    });
    return "";
  }
}
//@ chunk-0fqk5atw.js:6923-6961 placement
function pushCardForToolUse(tool, updatedInput) {
  return describeToolUseForPush_2(tool, updatedInput)?.card;
}
//@ chunk-0fqk5atw.js:6961-7850 placement
/**
 * 为推送通知描述工具调用（问题、计划等）。
 */
function describeToolUseForPush_2(tool, input) {
  if (!tool.requiresUserInteraction?.()) return;
  switch (tool.name) {
    case ASKUSERQUESTION: {
      let questions = Array.isArray(input?.questions) ? input.questions : [];
      let firstQuestion = questions[0];
      let questionText = firstQuestion?.header || firstQuestion?.question;
      let moreSuffix = questions.length > 1 ? ` (+${questions.length - 1} more)` : "";
      return {
        label: "Question",
        body: questionText ? questionText + moreSuffix : "Tap to answer",
      };
    }
    case EXITPLANMODE:
      return {
        label: "Plan",
        body: "Plan ready for review",
      };
    case CONNECTGITHUB:
      return {
        label: humanizeToolName(tool.name),
        body: "",
      };
    case OFFERCHROMESETUP: {
      let reasonText =
        typeof input?.reason === "string"
          ? truncate(redactSecretsInText(stripIgnorables(input.reason)), 200).replace(/[\s.!?]+$/u, "")
          : "";
      return {
        label: "Claude in Chrome",
        body: reasonText
          ? `Let Claude use your browser for ${reasonText}? Open this task on your computer.`
          : "Let Claude use your browser? Open this task on your computer.",
        card: {
          title: "Set up Claude in Chrome on your computer",
          description:
            "Claude wants to use your browser through Claude in Chrome. To set it up, open this task in the Claude app on a computer; any answer here skips it.",
        },
      };
    }
    default:
      return {
        label: humanizeToolName(tool.name),
        body: "",
      };
  }
}
//@ chunk-0fqk5atw.js:7850-8832 placement
/**
 * 生成权限请求推送内容与遥测字段。
 */
function permissionPushPayload(tool, toolUse, toolUseId, requestId, context) {
  let reasonCode = decisionReasonCode(context?.decisionReason);
  let reasonFields = {
    ...(context?.decisionReason && {
      decision_reason_type: decisionReasonTypeOnWire(context.decisionReason),
    }),
    ...(reasonCode && {
      decision_reason_code: reasonCode,
    }),
  };
  let agentFields = {
    ...(context?.askerAgentId !== undefined && {
      agent_id: context.askerAgentId,
    }),
    ...(context?.chromeSite !== undefined && {
      chrome_site: context.chromeSite,
    }),
    ...(context?.askedInDirectory !== undefined && {
      asked_in_directory: context.askedInDirectory,
    }),
  };
  let display = context?.hostDisplay
    ? {
        label: context.hostDisplay.displayName,
        body: "",
      }
    : describeToolUseForPush_2(tool, toolUse);
  if (display)
    return {
      tool_name: tool.name,
      display_tool_name: display.label,
      action_description: display.body,
      raw_command: undefined,
      tool_use_id: toolUseId,
      request_id: "",
      ...(requestId && {
        suppressed_request_id: requestId,
      }),
      input: toolUse,
      ...reasonFields,
      ...agentFields,
    };
  let rawCommand =
    (tool.name === BASH_TOOL_NAME || tool.name === POWERSHELL_TOOL_NAME) &&
    typeof toolUse.command === "string"
      ? redactSecretsInText(toolUse.command)
      : undefined;
  let actionDescription =
    rawCommand !== undefined
      ? typeof toolUse.description === "string" &&
        toolUse.description &&
        !isHostOnlyNativeTool(tool) &&
        !hasHostField(toolUse)
        ? redactSecretsInText(toolUse.description)
        : truncate(rawCommand, MAX_DESCRIPTION_CHARS)
      : redactSecretsInText(describeToolUseForPush(tool, toolUse));
  let tapToOpenOnly = context?.tapToOpenOnly === true;
  return {
    tool_name: tool.name,
    display_tool_name: humanizeToolName(tool.name),
    action_description: actionDescription,
    raw_command: rawCommand,
    tool_use_id: toolUseId,
    request_id: tapToOpenOnly ? "" : requestId,
    ...(tapToOpenOnly &&
      requestId && {
        suppressed_request_id: requestId,
      }),
    input: toolUse,
    ...reasonFields,
    ...agentFields,
  };
}
//@ chunk-0fqk5atw.js:8832-8858 layout
var CARD_EXEMPT_SERVER_NAMES; // deferred: uses ARTIFACTS_SERVER_NAME (../mcp/firstPartyServerIds.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-0fqk5atw.js:8832", () => {
  CARD_EXEMPT_SERVER_NAMES = [CLAUDE_CODE_REMOTE, COWORK, VISUALIZE, MEMORY, CLAUDE_ARTIFACTS];
});
//@ chunk-0fqk5atw.js:8858-9188 layout
function canUseConnectorCard(tool, effectiveInput, toolPermissionContext) {
  let mcpInfo = tool.mcpInfo;
  let toolNameForPermissionCheck = getToolNameForPermissionCheck(tool);
  return (
    mcpInfo !== undefined &&
    mcpInfo.source === "dynamic" &&
    toolPermissionContext.connectorCardAllows?.has(toolNameForPermissionCheck) === true &&
    toolPermissionContext.alwaysAllowRules.session?.includes(toolNameForPermissionCheck) === true &&
    !(tool.isDestructive?.(effectiveInput) ?? false) &&
    !isBuiltinMcpServerName(mcpInfo.serverName) &&
    !CARD_EXEMPT_SERVER_NAMES.includes(mcpInfo.serverName) &&
    mcpInfo.serverInfoName !== CLAUDE_CODE_REMOTE &&
    mcpInfo.docsConnector !== true &&
    !RESERVED_SERVER_IDS_WITH_DOCS.includes(mcpInfo.serverIdStamp ?? "") &&
    isCoworkCardMode()
  );
}
//@ chunk-0fqk5atw.js:9272-9281 placement
var MAX_PUSH_ASK_ATTEMPTS = 3;
//@ chunk-0fqk5atw.js:9281-10109 placement
/**
 * 需要权限时向手机推送请求（tengu_drifting_dream）。
 */
function pushPermissionRequest(request) {
  let { promise, resolve } = Promise.withResolvers();
  let { ask, tool, input, toolUseContext, toolUseID, isWaiting } = request;
  if (
    !getFeatureValue_CACHED_MAY_BE_STALE("tengu_drifting_dream", false) ||
    request.answers.kind !== "launcher" ||
    request.forced ||
    toolUseContext.hookAskFloor === true ||
    ask.personOnly === true ||
    toolUseContext.forRemoteExecution === true ||
    isChromeToolName(getToolNameForPermissionCheck(tool)) ||
    isRemoteBrowserToolUnderModeFloor(tool) ||
    isBypassImmuneDecision(ask, tool, toolUseContext)
  )
    return {
      allowed: promise,
      stop: () => {},
    };
  let generation = 0;
  let recheck = (attempt) => {
    if (!isWaiting()) return;
    let toolPermissionContext = getToolPermissionContext(toolUseContext);
    if (
      isAutoClassifierActive(
        isAutoAllowedInMode(tool, toolPermissionContext),
        toolPermissionContext.servedCall === true,
      )
    )
      return;
    let round = ++generation;
    let before = storedToolPermissionContext(toolUseContext);
    hasPermissionsToUseTool(
      tool,
      input,
      {
        ...toolUseContext,
        permissionRound: undefined,
      },
      request.assistantMessage,
      toolUseID,
    )
      .then((decision) => {
        if (!isWaiting() || round !== generation) return;
        if (!isDeepStrictEqual(storedToolPermissionContext(toolUseContext), before)) {
          if (attempt < MAX_PUSH_ASK_ATTEMPTS) recheck(attempt + 1);
          return;
        }
        if (decision.behavior === "allow" && isPushableDecisionReason(decision.decisionReason)) {
          unsubscribe();
          resolve(decision);
        }
      })
      .catch((error) => {
        if (!isAbortError(error))
          logError(
            withTelemetryMessage(
              toError(error),
              "permissionRecheckSignal: hasPermissionsToUseTool failed for a waiting can_use_tool ask",
            ),
          );
      });
  };
  let unsubscribe = permissionModeSignal.subscribe(() => recheck(0));
  if (!isDeepStrictEqual(storedToolPermissionContext(toolUseContext), request.askedUnder)) recheck(0);
  return {
    allowed: promise,
    stop: unsubscribe,
  };
}
//@ chunk-0fqk5atw.js:10109-10497 placement
/**
 * 决策原因是否适合推送。
 */
function isPushableDecisionReason(decisionReason) {
  switch (decisionReason?.type) {
    case "rule":
      return true;
    case "mode":
      return (
        decisionReason.mode === "default" ||
        decisionReason.mode === "acceptEdits" ||
        decisionReason.mode === "bypassPermissions"
      );
    case "subcommandResults": {
      let filtered = [...decisionReason.reasons.values()].filter(
        (reason) =>
          reason.behavior !== "allow" ||
          reason.decisionReason?.type !== "other" ||
          reason.decisionReason.reason !== READ_ONLY_AUTO_ALLOW_REASON,
      );
      return (
        filtered.length > 0 &&
        filtered.every(
          (reason) => reason.behavior === "allow" && isPushableDecisionReason(reason.decisionReason),
        )
      );
    }
    default:
      return false;
  }
}
//@ chunk-0fqk5atw.js:10497-10668 placement
function checkServerPolicyAskPushable(askContext) {
  let decisionReason = askContext.ask.decisionReason;
  if (decisionReason === undefined ? askContext.tool.mcpInfo === undefined : decisionReason.type !== "rule")
    return;
  try {
    if (mustAskWithoutPush(askContext)) return false;
  } catch (error) {
    if (!isAbortError(error)) logError(error);
    return false;
  }
  return recheckPushable(askContext);
}
//@ chunk-0fqk5atw.js:10668-10757 placement
/**
 * 去掉服务端策略里的「只询问」部分。
 */
function stripServerPolicyAskOnly(request) {
  return request.subtype === "can_use_tool"
    ? {
        ...request,
        server_policy_ask_only: undefined,
      }
    : request;
}
//@ chunk-0fqk5atw.js:10757-10890 placement
function mustAskWithoutPush(askContext) {
  let decisionReason = askContext.ask.decisionReason;
  return (
    askContext.tool.mcpInfo === undefined ||
    !(decisionReason === undefined || isServerPolicyAskReason(decisionReason)) ||
    !isAllowedUpdate(askContext.ask, ["decisionReason"]) ||
    mustAskLocally(askContext)
  );
}
//@ chunk-0fqk5atw.js:10890-11351 placement
/**
 * 是否必须在本地询问（强制决定、远程执行等）。
 */
function mustAskLocally({ tool, effectiveInput, ask, toolUseContext, forceDecision }) {
  let decisionReason = ask.decisionReason;
  return (
    forceDecision !== undefined ||
    toolUseContext.hookAskFloor === true ||
    toolUseContext.forRemoteExecution === true ||
    isChromeToolName(getToolNameForPermissionCheck(tool)) ||
    isRemoteBrowserToolUnderModeFloor(tool) ||
    isBypassImmuneDecision(ask, tool, toolUseContext) ||
    tool.suppressesAlwaysAllowRule?.(effectiveInput) === true ||
    tool.suppressesAllPermissionUpdates?.(effectiveInput) === true ||
    tool.ignoresWholeToolAllowRule?.(effectiveInput) === true ||
    toolUseContext.remoteCall !== undefined ||
    toolUseContext.requireCanUseTool === true ||
    getRegisteredCheck(toolUseContext.session, tool.name) !== undefined ||
    tool.askInputPreparer !== undefined ||
    isAutoClassifierActiveForCall(tool, toolUseContext) ||
    isServerPolicyAskUnderPlanFloor(decisionReason, tool, effectiveInput, toolUseContext) ||
    hasPermissionRequestHooks(tool, toolUseContext)
  );
}
//@ chunk-0fqk5atw.js:11351-11494 placement
async function recheckPushable(askContext) {
  try {
    let permissionContext = storedToolPermissionContext(askContext.toolUseContext);
    return (
      (await isPushableWithoutServerAsk(askContext)) &&
      isDeepStrictEqual(storedToolPermissionContext(askContext.toolUseContext), permissionContext) &&
      !mustAskWithoutPush(askContext)
    );
  } catch (error) {
    if (!isAbortError(error)) logError(error);
    return false;
  }
}
//@ chunk-0fqk5atw.js:11494-11769 placement
async function isPushableWithoutServerAsk({ tool, effectiveInput, toolUseContext }) {
  let sawAsk = false;
  let decision = await checkDeclarativePermissionLessServerPolicyAsks(
    {
      ...tool,
      checkPermissions: async (input, toolUseContext) => {
        let result = await tool.checkPermissions(input, toolUseContext);
        sawAsk ||= result.behavior === "ask";
        return result;
      },
    },
    effectiveInput,
    toolUseContext,
  );
  return (
    !sawAsk &&
    (decision.behavior === "allow"
      ? isPushableDecisionReason(decision.decisionReason)
      : decision.behavior === "ask" && isAllowedUpdate(decision, []))
  );
}
//@ chunk-0fqk5atw.js:11769-11813 placement
var ALLOWED_UPDATE_KEYS = ["behavior", "message", "suggestions"];
//@ chunk-0fqk5atw.js:11813-11912 placement
function isAllowedUpdate(update, extraAllowedKeys) {
  return Object.entries(update).every(
    ([key, value]) =>
      value === undefined || ALLOWED_UPDATE_KEYS.includes(key) || extraAllowedKeys.includes(key),
  );
}
//@ chunk-0fqk5atw.js:11912-12173 placement
function hasPermissionRequestHooks(tool, toolUseContext) {
  return (
    getPluginRegistry().hooksRespawns.size > 0 ||
    hasModuleHookingSite(
      "tool.check",
      {
        ...matcherTestTarget(tool),
        agentId: toolUseContext.agentId,
      },
      getLoadedModulesForSite("tool.check"),
    ) ||
    managedTierHooks("PermissionRequest") !== "none" ||
    dispatchClassicEvent("PermissionRequest") ||
    hasSettingsHookForEvent(
      "PermissionRequest",
      toolUseContext.sessionHooksRegistry,
      registerAgent(toolUseContext, "PermissionRequest", toolUseContext.session.id),
    )
  );
}
//@ chunk-0fqk5atw.js:12173-12239 placement
function isAutoClassifierActiveForCall(tool, toolUseContext) {
  let toolPermissionContext = getToolPermissionContext(toolUseContext);
  return isAutoClassifierActive(
    isAutoAllowedInMode(tool, toolPermissionContext),
    toolPermissionContext.servedCall === true,
  );
}
//@ chunk-0fqk5atw.js:12239-12478 layout
function isStoredAnswerStillUsable(askContext) {
  try {
    return (
      isAllowedUpdate(askContext.ask, [
        "decisionReason",
        "updatedInput",
        "blockedPath",
        "metadata",
        "bashAllowRuleOverridable",
        "suppressAlwaysAllowRule",
      ]) &&
      !requiresConnectorGrant_2(askContext.tool) &&
      !mustAskLocally(askContext)
    );
  } catch {
    logFeatureBad("ccr_subagent_ask_hold", "stored_answer_test_threw");
    return false;
  }
}
//@ chunk-0fqk5atw.js:12478-19986 placement
/**
 * 创建权限询问函数（launcher/strict 模式、推送、远程）。
 */
function createPermissionAsker(answers, host) {
  let askPermission = async (tool, input, toolUseContext, assistantMessage, toolUseId, forcedDecision) => {
    let askedUnderContext = storedToolPermissionContext(toolUseContext);
    let decision;
    switch (answers.kind) {
      case "launcher":
        decision =
          forcedDecision ??
          (await hasPermissionsToUseTool(tool, input, toolUseContext, assistantMessage, toolUseId));
        break;
      case "strict":
        decision =
          forcedDecision ??
          (await hasPermissionsToUseToolWithSink(
            tool,
            input,
            toolUseContext,
            assistantMessage,
            toolUseId,
            answers,
            undefined,
          ));
        break;
    }
    let personOnlyDenial =
      decision.behavior === "ask" &&
      forcedDecision === undefined &&
      env.CLAUDE_CODE_REMOTE &&
      mustBeLeftToAPerson(decision, tool, input, toolUseContext, toolUseId)
        ? noPromptSurfaceDenialIfUnsettled(
            tool,
            decision,
            toolUseContext,
            NO_KNOWN_PERSON_STARTED_THE_TURN_REASON,
          )
        : undefined;
    let messageInboundOrigin = toolUseContext.options.messageInboundOrigin;
    if (
      personOnlyDenial !== undefined &&
      !isUserDrivenHere(toolUseContext.messages) &&
      ((isAgentSdkEntrypoint() && !isCcsTenant()) ||
        (messageInboundOrigin
          ? !isHumanOriginLoosely(messageInboundOrigin) &&
            (isTriggerFireOrigin(messageInboundOrigin) || !isUserDrivenTurn(toolUseContext.messages))
          : toolUseContext.agentId === undefined && classifyMessageSource_2(toolUseContext.messages)))
    )
      decision = personOnlyDenial;
    if (decision.behavior === "allow") return decision;
    if (decision.behavior === "deny") {
      if (isTerminalShutdown() && !toolUseContext.abortController.signal.aborted) return heldUntilExit();
      if (!isInvalidInputDeny(decision))
        host.emitPermissionDenied(tool.name, toolUseId, toolUseContext.agentId, decision);
      return decision;
    }
    let askContext = {
      tool,
      effectiveInput: decision.updatedInput ?? input,
      ask: decision,
      toolUseContext,
      forceDecision: forcedDecision,
    };
    let keptAsk = host.keptAskFor?.(toolUseId);
    if (keptAsk !== undefined) {
      let keptAnswer = await keptAsk.answerFor({
        usable: () =>
          isStoredAnswerStillUsable(askContext) &&
          isDeepStrictEqual(storedToolPermissionContext(toolUseContext), askedUnderContext),
        toolName: tool.name,
        input: decision.updatedInput ?? input,
        planMode: () => getToolPermissionContext(toolUseContext).mode === "plan",
      });
      if (keptAnswer !== undefined && !toolUseContext.abortController.signal.aborted && !isTerminalShutdown())
        return permissionPromptToolResultToPermissionDecision(
          answers,
          keptAnswer,
          tool,
          decision.updatedInput ?? input,
          toolUseContext,
          tool,
          decision.suppressAlwaysAllowRule === true,
          false,
        );
    }
    let pushableCheck = checkServerPolicyAskPushable(askContext);
    let serverPolicyPushable = typeof pushableCheck === "object" ? await pushableCheck : pushableCheck;
    if (toolUseContext.abortController.signal.aborted)
      return {
        behavior: "deny",
        message: "Tool permission request aborted",
        toolUseID: toolUseId,
        decisionReason: CAN_USE_TOOL_ABORTED_DENY_REASON,
        decideLocation: "ask-path",
      };
    if (isTerminalShutdown()) return heldUntilExit();
    if (
      serverPolicyPushable === true &&
      isServerPolicyAskReason(decision.decisionReason) &&
      !requiresConnectorGrant_2(tool) &&
      !mustBeLeftToAPerson(decision, tool, input, toolUseContext, toolUseId) &&
      canUseConnectorCard(tool, askContext.effectiveInput, getToolPermissionContext(toolUseContext))
    ) {
      dropPermissionRecord(toolUseContext, toolUseId);
      logFeatureOk("permission_connector_card_allow", {
        ...(tool.readOnlyHint !== undefined && {
          readOnlyHint: tool.readOnlyHint,
        }),
      });
      return {
        behavior: "allow",
        updatedInput: askContext.effectiveInput,
        decisionReason: {
          type: "other",
          reason: "A person allowed this connector tool for the rest of the turn",
        },
      };
    }
    if (
      tool.askInputPreparer !== undefined &&
      !weakSet.has(decision) &&
      toolUseContext.forRemoteExecution !== true
    ) {
      let preparedInput = await tool.askInputPreparer(
        decision.updatedInput ?? input,
        toolUseContext,
        toolUseId,
      );
      if (preparedInput !== undefined)
        return askPermissionWithPush(
          askPermission,
          answers,
          preparedInput,
          decision,
          tool,
          input,
          toolUseContext,
          assistantMessage,
          toolUseId,
        );
    }
    let updatedInput = decision.updatedInput ?? input;
    let suggestions = decision.suggestions;
    if (
      tool.name === BASH_TOOL_NAME &&
      typeof updatedInput.command === "string" &&
      suggestions?.length &&
      !suggestions.some((suggestion) => suggestion.destination !== "session")
    )
      suggestions = [...suggestionForExactCommand(updatedInput.command), ...suggestions];
    let abortController = new AbortController();
    let signal = toolUseContext.abortController.signal;
    let abortedByTurn = false;
    let onTurnAbort = () => {
      if (!isTerminalShutdown()) abortedByTurn = true;
      abortController.abort(signal.reason);
    };
    signal.addEventListener("abort", onTurnAbort, {
      once: true,
    });
    let requestId = randomUUID();
    let foregroundSubagentId = getForegroundSubagentId(toolUseContext.agentContext);
    let shownSubagentId;
    let permissionLog;
    let hookSettled = false;
    let stopWaiting;
    try {
      let hookOutcome = (
        decision.personOnly === true || weakSet.has(decision)
          ? Promise.resolve(undefined)
          : executePermissionRequestHooksForSDK(
              answers,
              tool,
              toolUseId,
              updatedInput,
              toolUseContext,
              suggestions,
              decision,
              () => hookSettled || signal.aborted,
            )
      ).then((outcome) => ({
        source: "hook",
        outcome,
      }));
      hookOutcome.catch(() => {});
      let decisionReason = decision.decisionReason;
      let localDisplayOnly =
        decision.localDisplayOnly === true ||
        (decision.personOnly === true && decisionReason?.type === "classifier");
      let needsConnectorGrant = requiresConnectorGrant_2(tool);
      let personOnly = mustBeLeftToAPerson(decision, tool, input, toolUseContext, toolUseId);
      if (host.promptShown) {
        let chrome = decision.metadata?.command?.chrome;
        let pushPayload = permissionPushPayload(tool, updatedInput, toolUseId, requestId, {
          tapToOpenOnly:
            localDisplayOnly ||
            needsConnectorGrant ||
            personOnly ||
            decision.metadata?.mcpSkill !== undefined,
          hostDisplay: decision.hostDisplay,
          decisionReason,
          askerAgentId: toolUseContext.agentId,
          chromeSite:
            isPlainObject(chrome) && isUsableChromeSiteWithPort(chrome.host) ? chrome.host : undefined,
          askedInDirectory:
            answers.kind === "launcher" &&
            tool.name === BASH_TOOL_NAME &&
            toolUseContext.agentId === undefined &&
            !hasHostField(updatedInput)
              ? relativeToCallFrame(askerDirIfNotWorktree(toolUseContext.session.project?.projectRoot))
              : undefined,
        });
        shownSubagentId = foregroundSubagentId;
        host.promptShown(
          requestId,
          pushPayload,
          foregroundSubagentId,
          getBackgroundAgentId(toolUseContext.agentContext),
          toolUseContext.agentId !== undefined &&
            pushPayload.request_id === requestId &&
            isStoredAnswerStillUsable(askContext),
        );
      }
      let safetyCheckReason = findSafetyCheckReason(decisionReason);
      let isShellTool = tool.name === BASH_TOOL_NAME || tool.name === POWERSHELL_TOOL_NAME;
      let activityDescription =
        weakMap.get(decision) ||
        (decision.metadata && "command" in decision.metadata
          ? decision.metadata.mcpSkill
            ? safetyCheckReason?.reason
            : decision.metadata.command.description
          : undefined) ||
        (isShellTool && typeof updatedInput.command === "string"
          ? typeof updatedInput.description === "string" && updatedInput.description
            ? redactSecretsInText(updatedInput.description)
            : truncate(redactSecretsInText(updatedInput.command), MAX_DESCRIPTION_CHARS)
          : describeToolUseForPush(tool, updatedInput)) ||
        undefined;
      let card = pushCardForToolUse(tool, updatedInput);
      let visibleDescription =
        isHostOnlyNativeTool(tool) || (tool.name === POWERSHELL_TOOL_NAME && hasHostField(updatedInput))
          ? undefined
          : (activityDescription ?? card?.description);
      let reasonText =
        serializeDecisionReason(decisionReason) ??
        (decisionReason?.type === "subcommandResults" && safetyCheckReason
          ? (findSafetyCheckReason(
              decisionReason,
              (check) => !check.classifierApprovable && !isCircuitBreakerSafetyCheck(check),
            )?.reason ??
            (isCircuitBreakerSafetyCheck(safetyCheckReason) ? undefined : safetyCheckReason.reason))
          : undefined);
      let hostDisplay = decision.hostDisplay;
      let localReasonText = localDisplayOnly ? stripNonPrintable(stripAnsi(reasonText ?? "")) : "";
      let description = hostDisplay
        ? hostDisplay.description
        : localReasonText && visibleDescription && decision.localDisplayOnly !== true
          ? `${visibleDescription}
${localReasonText}`
          : localReasonText || visibleDescription;
      let isChromeTool = isChromeToolName(getToolNameForPermissionCheck(tool));
      let metadata = decision.metadata;
      let notifyTask = schedulePermissionNotify(
        humanizeToolName(tool.name),
        toolUseContext.storageV5,
        toolUseContext.credentials,
      );
      if (hostDisplay) logFeatureOk("permission_host_worded_ask");
      let sdkRequest = host
        .request(
          {
            subtype: "can_use_tool",
            tool_name: tool.name,
            ...(tool.mcpInfo && {
              mcp_server: mcpServerIdentityForHooks(tool.mcpInfo),
            }),
            ...(card && {
              title: card.title,
            }),
            display_name: hostDisplay?.displayName ?? humanizeToolName(tool.name),
            input: updatedInput,
            ...(hostDisplay && {
              title: hostDisplay.title,
            }),
            ...(description && {
              description,
            }),
            ...(isChromeTool && {
              tool_kind: "browser",
            }),
            ...undefined,
            permission_suggestions: suggestions,
            blocked_path: decision.blockedPath,
            decision_reason: reasonText,
            decision_reason_type: decisionReasonTypeOnWire(decisionReason),
            decision_reason_code: decisionReasonCode(decisionReason),
            decision_reason_rule_source:
              decisionReason?.type === "rule" ? decisionReason.rule.source : undefined,
            ...(decisionReason?.type === "hook" && {
              decision_reason_hook_event: classicPreToolUseHookId_2(decisionReason.hookName, tool.name),
              decision_reason_hook_source: classicPreToolUseHookId(decisionReason.hookSource),
              decision_reason_hook_plugin_id: classicHookId(decisionReason.hookPluginId),
            }),
            server_policy_ask_only: serverPolicyPushable,
            ...(decision.matchedAskRule && {
              matched_ask_rule: {
                source: decision.matchedAskRule.source,
                tool_name: decision.matchedAskRule.ruleValue.toolName,
                ...(decision.matchedAskRule.ruleValue.ruleContent !== undefined && {
                  rule_content: decision.matchedAskRule.ruleValue.ruleContent,
                }),
              },
            }),
            classifier_approvable: safetyCheckReason
              ? !findSafetyCheckReason(decisionReason, (check) => !check.classifierApprovable)
              : undefined,
            ...((decisionReason?.type === "rule" ||
              (decisionReason?.type === "other" && decisionReason.reason === askCeilingReason(tool))) &&
              tool.mcpInfo?.effectiveMaxPermission === "ask" && {
                decision_reason_code: "org_ask_ceiling",
              }),
            tool_use_id: toolUseId,
            agent_id: toolUseContext.agentId,
            plugin: context(toolUseContext),
            suppress_always_allow_rule: shouldSuppressAlwaysAllow(
              tool,
              updatedInput,
              toolUseContext,
              decision.suppressAlwaysAllowRule,
              suggestions,
            ),
            default_to_no: decision.defaultToNo || undefined,
            provenance_prompt_line: decision.provenancePromptLine,
            requires_user_interaction:
              tool.requiresUserInteraction?.() ||
              localDisplayOnly ||
              needsConnectorGrant ||
              personOnly ||
              hostDisplay !== undefined ||
              undefined,
          },
          abortController.signal,
          requestId,
        )
        .then((result) => ({
          source: "sdk",
          result,
        }));
      sdkRequest.catch(() => {});
      sdkRequest.then(
        () => {
          hookSettled = true;
        },
        () => {
          hookSettled = true;
        },
      );
      if (host.isPending(requestId)) {
        permissionLog = {
          logContext: {
            tool,
            input: updatedInput,
            messageId: assistantMessage.message.id,
            toolUseID: toolUseId,
            permissionMode: getToolPermissionContext(toolUseContext).mode,
            agentContext: toolUseContext.agentContext,
            mcpClients: toolUseContext.options.mcpClients,
            appliedAllowUpdates: (context) => {
              switch (answers.kind) {
                case "launcher":
                  return alwaysAllowRulesFor(
                    context,
                    tool,
                    updatedInput,
                    toolUseContext,
                    decision.suppressAlwaysAllowRule === true,
                    decision.metadata?.mcpSkill === undefined
                      ? undefined
                      : {
                          rule: undefined,
                        },
                  );
                case "strict":
                  return;
              }
            },
          },
          shownAtMs: Date.now(),
        };
        logPermissionRequestShown(permissionLog.logContext, decisionReason?.type);
      }
      sdkRequest.then(notifyTask, notifyTask);
      let winner = await Promise.race([hookOutcome, sdkRequest]);
      if (winner.source === "hook") {
        if (winner.outcome) {
          if (isTerminalShutdown() && !abortedByTurn) await heldUntilExit();
          abortController.abort();
          if (permissionLog)
            logPermissionDecision(
              permissionLog.logContext,
              {
                kind: "hook",
                behavior: winner.outcome.decision.behavior === "allow" ? "allow" : "deny",
                permanent: winner.outcome.permanent,
              },
              permissionLog.shownAtMs,
            );
          if (winner.outcome.interrupt) {
            logForDebugging(
              `Hook interrupt: tool=${tool.name} hookMessage=${winner.outcome.decision.message}`,
            );
            turnAbortControllerOf(toolUseContext.abortController).abort();
          }
          return winner.outcome.decision;
        }
        let pushRace = pushPermissionRequest({
          answers,
          ask: decision,
          forced: forcedDecision !== undefined,
          askedUnder: askedUnderContext,
          tool,
          input,
          toolUseContext,
          assistantMessage,
          toolUseID: toolUseId,
          isWaiting: () => host.isPending(requestId) && !signal.aborted,
        });
        stopWaiting = pushRace.stop;
        let winner_2 = await Promise.race([
          sdkRequest.then(() => {
            return;
          }),
          pushRace.allowed,
        ]);
        if (winner_2 !== undefined && host.isPending(requestId)) {
          if (isTerminalShutdown() && !abortedByTurn) await heldUntilExit();
          abortController.abort();
          dropPermissionRecord(toolUseContext, toolUseId);
          if (permissionLog)
            logPermissionDecision(
              permissionLog.logContext,
              {
                kind: "recheck",
              },
              permissionLog.shownAtMs,
            );
          return winner_2;
        }
      }
      let answer = winner.source === "hook" ? (await sdkRequest).result : winner.result;
      if (permissionLog)
        logPermissionDecision(
          permissionLog.logContext,
          {
            kind: "host_answer",
            answer,
          },
          permissionLog.shownAtMs,
        );
      let finalDecision = permissionPromptToolResultToPermissionDecision(
        answers,
        answer,
        tool,
        updatedInput,
        toolUseContext,
        tool,
        decision.suppressAlwaysAllowRule === true,
        serverPolicyPushable !== true,
        decision.metadata?.mcpSkill === undefined
          ? undefined
          : {
              rule: undefined,
            },
      );
      if (
        finalDecision.behavior === "allow" &&
        host.answeredAtHostDialog(requestId) &&
        toolUseContext.forRemoteExecution !== true &&
        returnFalsePermissionHook()
      )
        recordHostAttestedCall(toolUseContext.session, toolUseId, {
          toolName: tool.name,
          input: finalDecision.updatedInput ?? updatedInput,
        });
      if (finalDecision.behavior === "allow")
        recordMcpApprovalTicket_2(host.takeApprovalTicket(requestId), tool, toolUseId, toolUseContext);
      return finalDecision;
    } catch (error) {
      if (isTerminalShutdown() && host.isPending(requestId)) await heldUntilExit();
      if (host.interruptedAtStreamClose(requestId) && isInterruptModeOn()) {
        try {
          logEvent("tengu_auq_park_interrupted_at_stream_close", {
            stream_closed: error instanceof StreamClosedAbortError,
          });
          logForDebugging(
            `Interrupting parked AskUserQuestion toolUseID=${toolUseId} at stream close (deny skipped; turn aborts as shutdown)`,
          );
        } catch {}
        throw error;
      }
      let failureMessage = formatPermissionRequestFailure(answers, error, tool.name);
      let denyReason = CAN_USE_TOOL_REQUEST_FAILED_DENY_REASON;
      if (error instanceof ZodError) {
        logForDebugging(
          `canUseTool returned a schema-invalid permission result for ${tool.name}: ${error.message.slice(0, 2000)}`,
          {
            level: "error",
          },
        );
        failureMessage = `The canUseTool callback returned an invalid permission result. ${PERMISSION_PROMPT_RESULT_FORMAT_HINT}`;
        denyReason = CAN_USE_TOOL_INVALID_RESULT_DENY_REASON;
      } else if (error instanceof StreamClosedAbortError) denyReason = CAN_USE_TOOL_STREAM_CLOSED_DENY_REASON;
      else if (isAbortError(error) && signal.aborted) {
        failureMessage = "Tool permission request aborted";
        denyReason = CAN_USE_TOOL_ABORTED_DENY_REASON;
        if (permissionLog && !isAskWithdrawnByAsker(signal))
          logPermissionDecision(
            permissionLog.logContext,
            {
              kind: "turn_aborted",
            },
            permissionLog.shownAtMs,
          );
      }
      return {
        behavior: "deny",
        message: failureMessage,
        toolUseID: toolUseId,
        decisionReason: denyReason,
        decideLocation: "ask-path",
      };
    } finally {
      stopWaiting?.();
      host.promptSettled(requestId, shownSubagentId);
      signal.removeEventListener("abort", onTurnAbort);
    }
  };
  return setPermissionPromptHostProbe("callback", askPermission, () => true);
}
//@ chunk-0fqk5atw.js:19986-20020 placement
var weakSet; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var weakMap;
deferInit("chunk-0fqk5atw.js:19986", () => {
  weakSet = new WeakSet();
  weakMap = new WeakMap();
});
//@ chunk-0fqk5atw.js:20020-21401 placement
/**
 * 询问权限并同时推送，取先到的答复。
 */
async function askPermissionWithPush(
  askPermission,
  answers,
  preparedAsk,
  decision,
  tool,
  input,
  toolUseContext,
  assistantMessage,
  toolUseId,
) {
  let signal = toolUseContext.abortController.signal;
  let abortedDecision = () => ({
    behavior: "deny",
    message: "Tool permission request aborted",
    toolUseID: toolUseId,
    decisionReason: CAN_USE_TOOL_ABORTED_DENY_REASON,
    decideLocation: "ask-path",
  });
  if (decision.personOnly !== true) {
    let hookOutcome;
    try {
      hookOutcome = await executePermissionRequestHooksForSDK(
        answers,
        tool,
        toolUseId,
        decision.updatedInput ?? input,
        toolUseContext,
        decision.suggestions,
        decision,
        () => signal.aborted,
      );
    } catch (error) {
      return signal.aborted
        ? abortedDecision()
        : {
            behavior: "deny",
            message: formatPermissionRequestFailure(answers, error, tool.name),
            toolUseID: toolUseId,
            decisionReason: CAN_USE_TOOL_REQUEST_FAILED_DENY_REASON,
            decideLocation: "ask-path",
          };
    }
    if (hookOutcome !== undefined) {
      if (isTerminalShutdown() && !signal.aborted) return heldUntilExit();
      if (hookOutcome.interrupt) turnAbortControllerOf(toolUseContext.abortController).abort();
      return hookOutcome.decision;
    }
  }
  let prepared = await preparedAsk.prepare();
  if (signal.aborted) {
    if (!("error" in prepared)) prepared.release();
    return abortedDecision();
  }
  if ("error" in prepared)
    return {
      behavior: "deny",
      message: prepared.error,
      toolUseID: toolUseId,
      decisionReason: {
        type: "other",
        reason: "files not attached",
      },
      decideLocation: "ask-path",
    };
  let patchedDecision = {
    ...dropStaleHostDisplay(decision, prepared.input),
    updatedInput: prepared.input,
  };
  weakSet.add(patchedDecision);
  weakMap.set(patchedDecision, prepared.description);
  let result;
  try {
    result = await askPermission(tool, input, toolUseContext, assistantMessage, toolUseId, patchedDecision);
  } catch (error) {
    prepared.release();
    throw error;
  }
  if (result.behavior !== "allow") {
    prepared.release();
    return result;
  }
  let approvedInput =
    result.updatedInput !== undefined && Object.keys(result.updatedInput).length > 0
      ? result.updatedInput
      : prepared.input;
  if (!import_sortedIndex_2(approvedInput.files, prepared.input.files)) {
    prepared.release();
    return {
      behavior: "deny",
      message: `The approval for ${tool.name} changed the files to attach, which cannot be applied. Call it again with the files you want attached.`,
      toolUseID: toolUseId,
      decisionReason: {
        type: "other",
        reason: "approval changed the files",
      },
      decideLocation: "ask-path",
    };
  }
  return {
    ...result,
    updatedInput: approvedInput,
  };
}
export {
  noPromptSurfaceDenialIfPersonOnly,
  buildNoApprovalSurfaceDenial,
  noPromptSurfaceDenialIfUnsettled,
  getGrantScopeField,
  isInterruptModeOn,
  stripServerPolicyAskOnly,
  createPermissionAsker,
};
