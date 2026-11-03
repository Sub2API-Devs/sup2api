/**
 * services/pushNotifications/permissionPush.ts
 *
 * 2.1.316 新增：创建权限询问函数（launcher/strict 模式、推送、远程）；询问权限并同时推送，取先到的答复等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-6j594vm1.js (27)
 * attribution: placement 27
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
import { OFFER_CHROME_SETUP_TOOL_NAME } from "../../tools/ReadNotificationsTool/ReadNotificationsTool.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { POWERSHELL_TOOL_NAME } from "../../tools/PowerShellTool/toolName.js";
import { isHostOnlyNativeTool } from "../api/deferredToolsState.js";
import { hasHostField } from "../../bridge/deviceRegistration.js";
import { MAX_DESCRIPTION_CHARS } from "../../constants/outputLimits.js";
import { isChromeToolName } from "../../utils/claudeInChrome/chromeToolNames.js";
import { getToolNameForPermissionCheck } from "../mcp/mcpStringUtils.js";
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
import { env } from "../../utils/env.js";
import { isUserDrivenHere, isUserDrivenTurn } from "../../utils/turnOrigin.js";
import { isAgentSdkEntrypoint } from "../../utils/entrypointKinds.js";
import { isHumanOriginLoosely, isTriggerFireOrigin } from "../../bridge/inboundMessageOrigin.js";
import { classifyMessageSource_2 } from "../../utils/messages/messageSource.js";
import { isTerminalShutdown, heldUntilExit } from "../../utils/terminalShutdown.js";
import { requiresConnectorGrant_2 } from "../mcp/claudeai.js";
import {
  permissionPromptToolResultToPermissionDecision,
  schedulePermissionNotify,
  alwaysAllowRulesFor,
  PERMISSION_PROMPT_RESULT_FORMAT_HINT,
} from "../../utils/permissions/PermissionPromptToolResultSchema.js";
import { suggestionForExactCommand } from "../../tools/BashTool/bashPermissions.js";
import {
  getForegroundSubagentId,
  getBackgroundAgentId,
  getHookCallerOf,
  isHookOrPluginSteered,
} from "../../utils/agentContext.js";
import { executePermissionRequestHooksForSDK } from "../../cli/structuredIO.js";
import { stripNonPrintable } from "../../utils/truncateGraphemes.js";
import { stripAnsi } from "../../utils/stripAnsi.js";
import { logFeatureOk } from "../analytics/featureTelemetry.js";
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
import { dropPermissionRecord } from "../../utils/permissions/permissionRecord.js";
import { returnFalsePermissionHook, recordHostAttestedCall } from "../../components/permissions/hooks.js";
import { recordMcpApprovalTicket_2 } from "../../bridge/mcpApprovalTickets.js";
import { logEvent } from "../analytics/index.js";
import { formatPermissionRequestFailure } from "../../utils/permissions/permissionAnswer.js";
import { ZodError } from "../../../vendor/zod/v4/classic/errors.js";
import { setPermissionPromptHostProbe } from "../../utils/permissions/permissionPromptHost.js";
import { dropStaleHostDisplay } from "../../utils/hooks/hookMessages.js";
import { En } from "../../../vendor/lodash-es/_inlinedHelpers.js";

//@ chunk-6j594vm1.js:5574-5676 placement
function getGrantScopeField(hostPolicy, applied) {
  let d = permissionGrantScope(applied);
  return d === "once" || (d === "session" && hostPolicy.kind === "launcher")
    ? {
        grantScope: d,
      }
    : {};
}
//@ chunk-6j594vm1.js:5676-5887 placement
/**
 * 构建"没有可批准界面"时的拒绝结果，消息附带决定原因。
 */
function buildNoApprovalSurfaceDenial(n) {
  let e = serializeDecisionReason(n.decisionReason);
  let d = e !== undefined && !n.message.includes(e) ? `${n.message} ${e}` : n.message;
  return {
    behavior: "deny",
    message: buildNoApprovalSurfaceDenial_2(d),
    decisionReason: {
      ...NO_APPROVAL_SURFACE_DENY_REASON,
      ask: refusedAskOf(n),
    },
    decideLocation: "ask-path",
  };
}
//@ chunk-6j594vm1.js:5887-6016 placement
function buildNoPromptSurfaceDenial(n, reason) {
  return {
    behavior: "deny",
    message: n.message,
    decisionReason: {
      ...NO_PROMPT_SURFACE_DENY_REASON,
      reason,
      ask: refusedAskOf(n),
    },
    decideLocation: "ask-path",
  };
}
//@ chunk-6j594vm1.js:6016-6071 placement
/**
 * 没有可弹提示的界面且状态未定时给出拒绝。
 */
function noPromptSurfaceDenialIfUnsettled(n, e, d, reason) {
  return toolMaySettleUnaskedQuestion(n, e, d) ? buildNoPromptSurfaceDenial(e, reason) : undefined;
}
//@ chunk-6j594vm1.js:6071-6134 placement
/**
 * 没有弹窗界面且只允许本人时给出拒绝。
 */
function noPromptSurfaceDenialIfPersonOnly(tool, e, d, toolUseContext, toolUseId) {
  return mustBeLeftToAPerson(e, tool, d, toolUseContext, toolUseId)
    ? buildNoPromptSurfaceDenial(e, NO_PROMPT_SURFACE_REASON)
    : undefined;
}
//@ chunk-6j594vm1.js:6134-6162 placement
var TENGU_CINDER_SWIFT = "tengu_cinder_swift";
//@ chunk-6j594vm1.js:6162-6210 placement
/**
 * 是否启用打断模式的推送授权。
 */
function isInterruptModeOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_CINDER_SWIFT, "off") === "interrupt";
}
//@ chunk-6j594vm1.js:6210-6375 placement
function describeToolUseForPush(n, e) {
  try {
    return n.getToolUseSummary?.(e) ?? n.getActivityDescription?.(e) ?? "";
  } catch (error) {
    logForDebugging(`describeToolUseForPush failed: ${error}`, {
      level: "error",
    });
    return "";
  }
}
//@ chunk-6j594vm1.js:6375-6413 placement
function pushCardForToolUse(n, updatedInput) {
  return describeToolUseForPush_2(n, updatedInput)?.card;
}
//@ chunk-6j594vm1.js:6413-7303 placement
/**
 * 为推送通知描述工具调用（问题、计划等）。
 */
function describeToolUseForPush_2(n, e) {
  if (!n.requiresUserInteraction?.()) return;
  switch (n.name) {
    case ASKUSERQUESTION: {
      let questions = Array.isArray(e?.questions) ? e.questions : [];
      let r = questions[0];
      let m = r?.header || r?.question;
      let s = questions.length > 1 ? ` (+${questions.length - 1} more)` : "";
      return {
        label: "Question",
        body: m ? m + s : "Tap to answer",
      };
    }
    case EXITPLANMODE:
      return {
        label: "Plan",
        body: "Plan ready for review",
      };
    case CONNECTGITHUB:
      return {
        label: humanizeToolName(n.name),
        body: "",
      };
    case OFFER_CHROME_SETUP_TOOL_NAME: {
      let d =
        typeof e?.reason === "string"
          ? truncate(redactSecretsInText(stripIgnorables(e.reason)), 200).replace(/[\s.!?]+$/u, "")
          : "";
      return {
        label: "Claude in Chrome",
        body: d
          ? `Let Claude use your browser for ${d}? Open this task on your computer.`
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
        label: humanizeToolName(n.name),
        body: "",
      };
  }
}
//@ chunk-6j594vm1.js:7303-8156 placement
/**
 * 生成权限请求推送内容与遥测字段。
 */
function permissionPushPayload(n, updatedInput, toolUseId, r, m) {
  let s = decisionReasonCode(m?.decisionReason);
  let y = {
    ...(m?.decisionReason && {
      decision_reason_type: decisionReasonTypeOnWire(m.decisionReason),
    }),
    ...(s && {
      decision_reason_code: s,
    }),
  };
  let f = m?.askerAgentId !== undefined && {
    agent_id: m.askerAgentId,
  };
  let k = m?.hostDisplay
    ? {
        label: m.hostDisplay.displayName,
        body: "",
      }
    : describeToolUseForPush_2(n, updatedInput);
  if (k)
    return {
      tool_name: n.name,
      display_tool_name: k.label,
      action_description: k.body,
      raw_command: undefined,
      tool_use_id: toolUseId,
      request_id: "",
      ...(r && {
        suppressed_request_id: r,
      }),
      input: updatedInput,
      ...y,
      ...f,
    };
  let R =
    (n.name === BASH_TOOL_NAME || n.name === POWERSHELL_TOOL_NAME) && typeof updatedInput.command === "string"
      ? redactSecretsInText(updatedInput.command)
      : undefined;
  let actionDescription =
    R !== undefined
      ? typeof updatedInput.description === "string" &&
        updatedInput.description &&
        !isHostOnlyNativeTool(n) &&
        !hasHostField(updatedInput)
        ? redactSecretsInText(updatedInput.description)
        : truncate(R, MAX_DESCRIPTION_CHARS)
      : redactSecretsInText(describeToolUseForPush(n, updatedInput));
  let h = m?.tapToOpenOnly === true;
  return {
    tool_name: n.name,
    display_tool_name: humanizeToolName(n.name),
    action_description: actionDescription,
    raw_command: R,
    tool_use_id: toolUseId,
    request_id: h ? "" : r,
    ...(h &&
      r && {
        suppressed_request_id: r,
      }),
    input: updatedInput,
    ...y,
    ...f,
  };
}
//@ chunk-6j594vm1.js:8240-8249 placement
var MAX_PUSH_ASK_ATTEMPTS = 3;
//@ chunk-6j594vm1.js:8249-9077 placement
/**
 * 需要权限时向手机推送请求（tengu_drifting_dream）。
 */
function pushPermissionRequest(n) {
  let { promise, resolve } = Promise.withResolvers();
  let { ask, tool, input, toolUseContext, toolUseID, isWaiting } = n;
  if (
    !getFeatureValue_CACHED_MAY_BE_STALE("tengu_drifting_dream", false) ||
    n.answers.kind !== "launcher" ||
    n.forced ||
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
  let R = 0;
  let c = (A) => {
    if (!isWaiting()) return;
    let toolPermissionContext = getToolPermissionContext(toolUseContext);
    if (
      isAutoClassifierActive(
        isAutoAllowedInMode(tool, toolPermissionContext),
        toolPermissionContext.servedCall === true,
      )
    )
      return;
    let C = ++R;
    let w = storedToolPermissionContext(toolUseContext);
    hasPermissionsToUseTool(
      tool,
      input,
      {
        ...toolUseContext,
        permissionRound: undefined,
      },
      n.assistantMessage,
      toolUseID,
    )
      .then((D) => {
        if (!isWaiting() || C !== R) return;
        if (!isDeepStrictEqual(storedToolPermissionContext(toolUseContext), w)) {
          if (A < MAX_PUSH_ASK_ATTEMPTS) c(A + 1);
          return;
        }
        if (D.behavior === "allow" && isPushableDecisionReason(D.decisionReason)) {
          h();
          resolve(D);
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
  let h = permissionModeSignal.subscribe(() => c(0));
  if (!isDeepStrictEqual(storedToolPermissionContext(toolUseContext), n.askedUnder)) c(0);
  return {
    allowed: promise,
    stop: h,
  };
}
//@ chunk-6j594vm1.js:9077-9465 placement
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
        filtered.every((d) => d.behavior === "allow" && isPushableDecisionReason(d.decisionReason))
      );
    }
    default:
      return false;
  }
}
//@ chunk-6j594vm1.js:9465-9636 placement
function checkServerPolicyAskPushable(n) {
  let decisionReason = n.ask.decisionReason;
  if (decisionReason === undefined ? n.tool.mcpInfo === undefined : decisionReason.type !== "rule") return;
  try {
    if (mustAskWithoutPush(n)) return false;
  } catch (error) {
    if (!isAbortError(error)) logError(error);
    return false;
  }
  return recheckPushable(n);
}
//@ chunk-6j594vm1.js:9636-9725 placement
/**
 * 去掉服务端策略里的「只询问」部分。
 */
function stripServerPolicyAskOnly(n) {
  return n.subtype === "can_use_tool"
    ? {
        ...n,
        server_policy_ask_only: undefined,
      }
    : n;
}
//@ chunk-6j594vm1.js:9725-9858 placement
function mustAskWithoutPush(n) {
  let decisionReason = n.ask.decisionReason;
  return (
    n.tool.mcpInfo === undefined ||
    !(decisionReason === undefined || isServerPolicyAskReason(decisionReason)) ||
    !isAllowedUpdate(n.ask, ["decisionReason"]) ||
    mustAskLocally(n)
  );
}
//@ chunk-6j594vm1.js:9858-10319 placement
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
//@ chunk-6j594vm1.js:10319-10462 placement
async function recheckPushable(n) {
  try {
    let e = storedToolPermissionContext(n.toolUseContext);
    return (
      (await isPushableWithoutServerAsk(n)) &&
      isDeepStrictEqual(storedToolPermissionContext(n.toolUseContext), e) &&
      !mustAskWithoutPush(n)
    );
  } catch (error) {
    if (!isAbortError(error)) logError(error);
    return false;
  }
}
//@ chunk-6j594vm1.js:10462-10737 placement
async function isPushableWithoutServerAsk({ tool, effectiveInput, toolUseContext }) {
  let r = false;
  let m = await checkDeclarativePermissionLessServerPolicyAsks(
    {
      ...tool,
      checkPermissions: async (s, y) => {
        let f = await tool.checkPermissions(s, y);
        r ||= f.behavior === "ask";
        return f;
      },
    },
    effectiveInput,
    toolUseContext,
  );
  return (
    !r &&
    (m.behavior === "allow"
      ? isPushableDecisionReason(m.decisionReason)
      : m.behavior === "ask" && isAllowedUpdate(m, []))
  );
}
//@ chunk-6j594vm1.js:10737-10781 placement
var ALLOWED_UPDATE_KEYS = ["behavior", "message", "suggestions"];
//@ chunk-6j594vm1.js:10781-10880 placement
function isAllowedUpdate(n, e) {
  return Object.entries(n).every(
    ([key, value]) => value === undefined || ALLOWED_UPDATE_KEYS.includes(key) || e.includes(key),
  );
}
//@ chunk-6j594vm1.js:10880-11141 placement
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
//@ chunk-6j594vm1.js:11141-11207 placement
function isAutoClassifierActiveForCall(tool, toolUseContext) {
  let toolPermissionContext = getToolPermissionContext(toolUseContext);
  return isAutoClassifierActive(
    isAutoAllowedInMode(tool, toolPermissionContext),
    toolPermissionContext.servedCall === true,
  );
}
//@ chunk-6j594vm1.js:11207-18451 placement
/**
 * 创建权限询问函数（launcher/strict 模式、推送、远程）。
 */
function createPermissionAsker(n, e) {
  let d = async (r, m, s, y, toolUseId, k) => {
    let R = storedToolPermissionContext(s);
    let c;
    switch (n.kind) {
      case "launcher":
        c = k ?? (await hasPermissionsToUseTool(r, m, s, y, toolUseId));
        break;
      case "strict":
        c = k ?? (await hasPermissionsToUseToolWithSink(r, m, s, y, toolUseId, n, undefined));
        break;
    }
    let h =
      c.behavior === "ask" &&
      k === undefined &&
      env.CLAUDE_CODE_REMOTE &&
      mustBeLeftToAPerson(c, r, m, s, toolUseId)
        ? noPromptSurfaceDenialIfUnsettled(r, c, s, NO_KNOWN_PERSON_STARTED_THE_TURN_REASON)
        : undefined;
    let messageInboundOrigin = s.options.messageInboundOrigin;
    if (
      h !== undefined &&
      !isUserDrivenHere(s.messages) &&
      (isAgentSdkEntrypoint() ||
        (messageInboundOrigin
          ? !isHumanOriginLoosely(messageInboundOrigin) &&
            (isTriggerFireOrigin(messageInboundOrigin) || !isUserDrivenTurn(s.messages))
          : s.agentId === undefined && classifyMessageSource_2(s.messages)))
    )
      c = h;
    if (c.behavior === "allow") return c;
    if (c.behavior === "deny") {
      if (isTerminalShutdown() && !s.abortController.signal.aborted) return heldUntilExit();
      if (!isInvalidInputDeny(c)) e.emitPermissionDenied(r.name, toolUseId, s.agentId, c);
      return c;
    }
    let b = {
      tool: r,
      effectiveInput: c.updatedInput ?? m,
      ask: c,
      toolUseContext: s,
      forceDecision: k,
    };
    let C = e.keptAskFor?.(toolUseId);
    if (C !== undefined) {
      let O = await C.answerFor({
        usable: () =>
          isAllowedUpdate(c, [
            "decisionReason",
            "updatedInput",
            "blockedPath",
            "metadata",
            "bashAllowRuleOverridable",
            "suppressAlwaysAllowRule",
          ]) &&
          !requiresConnectorGrant_2(r) &&
          isDeepStrictEqual(storedToolPermissionContext(s), R) &&
          !mustAskLocally(b),
        toolName: r.name,
        input: c.updatedInput ?? m,
        planMode: () => getToolPermissionContext(s).mode === "plan",
      });
      if (O !== undefined && !s.abortController.signal.aborted && !isTerminalShutdown())
        return permissionPromptToolResultToPermissionDecision(
          n,
          O,
          r,
          c.updatedInput ?? m,
          s,
          r,
          c.suppressAlwaysAllowRule === true,
          false,
        );
    }
    let w = checkServerPolicyAskPushable(b);
    let D = typeof w === "object" ? await w : w;
    if (s.abortController.signal.aborted)
      return {
        behavior: "deny",
        message: "Tool permission request aborted",
        toolUseID: toolUseId,
        decisionReason: CAN_USE_TOOL_ABORTED_DENY_REASON,
        decideLocation: "ask-path",
      };
    if (isTerminalShutdown()) return heldUntilExit();
    if (r.askInputPreparer !== undefined && !weakSet.has(c) && s.forRemoteExecution !== true) {
      let O = await r.askInputPreparer(c.updatedInput ?? m, s, toolUseId);
      if (O !== undefined) return askPermissionWithPush(d, n, O, c, r, m, s, y, toolUseId);
    }
    let updatedInput = c.updatedInput ?? m;
    let suggestions = c.suggestions;
    if (
      r.name === BASH_TOOL_NAME &&
      typeof updatedInput.command === "string" &&
      suggestions?.length &&
      !suggestions.some((suggestion) => suggestion.destination !== "session")
    )
      suggestions = [...suggestionForExactCommand(updatedInput.command), ...suggestions];
    let abortController = new AbortController();
    let signal = s.abortController.signal;
    let Q = false;
    let de = () => {
      if (!isTerminalShutdown()) Q = true;
      abortController.abort(signal.reason);
    };
    signal.addEventListener("abort", de, {
      once: true,
    });
    let I = randomUUID();
    let foregroundSubagentId = getForegroundSubagentId(s.agentContext);
    let ce;
    let E;
    let X = false;
    let ue;
    try {
      let W = (
        c.personOnly === true || weakSet.has(c)
          ? Promise.resolve(undefined)
          : executePermissionRequestHooksForSDK(
              n,
              r,
              toolUseId,
              updatedInput,
              s,
              suggestions,
              c,
              () => X || signal.aborted,
            )
      ).then((outcome) => ({
        source: "hook",
        outcome,
      }));
      W.catch(() => {});
      let decisionReason = c.decisionReason;
      let Z = c.localDisplayOnly === true || (c.personOnly === true && decisionReason?.type === "classifier");
      let le = requiresConnectorGrant_2(r);
      let fe = mustBeLeftToAPerson(c, r, m, s, toolUseId);
      if (e.promptShown) {
        let S = permissionPushPayload(r, updatedInput, toolUseId, I, {
          tapToOpenOnly: Z || le || fe || c.metadata?.mcpSkill !== undefined,
          hostDisplay: c.hostDisplay,
          decisionReason,
          askerAgentId: s.agentId,
        });
        ce = foregroundSubagentId;
        e.promptShown(I, S, foregroundSubagentId, getBackgroundAgentId(s.agentContext));
      }
      let safetyCheckReason = findSafetyCheckReason(decisionReason);
      let Me = r.name === BASH_TOOL_NAME || r.name === POWERSHELL_TOOL_NAME;
      let Le =
        weakMap.get(c) ||
        (c.metadata && "command" in c.metadata
          ? c.metadata.mcpSkill
            ? safetyCheckReason?.reason
            : c.metadata.command.description
          : undefined) ||
        (Me && typeof updatedInput.command === "string"
          ? typeof updatedInput.description === "string" && updatedInput.description
            ? redactSecretsInText(updatedInput.description)
            : truncate(redactSecretsInText(updatedInput.command), MAX_DESCRIPTION_CHARS)
          : describeToolUseForPush(r, updatedInput)) ||
        undefined;
      let ee = pushCardForToolUse(r, updatedInput);
      let ne =
        isHostOnlyNativeTool(r) || (r.name === POWERSHELL_TOOL_NAME && hasHostField(updatedInput))
          ? undefined
          : (Le ?? ee?.description);
      let ye =
        serializeDecisionReason(decisionReason) ??
        (decisionReason?.type === "subcommandResults" && safetyCheckReason
          ? (findSafetyCheckReason(
              decisionReason,
              (S) => !S.classifierApprovable && !isCircuitBreakerSafetyCheck(S),
            )?.reason ??
            (isCircuitBreakerSafetyCheck(safetyCheckReason) ? undefined : safetyCheckReason.reason))
          : undefined);
      let hostDisplay = c.hostDisplay;
      let ie = Z ? stripNonPrintable(stripAnsi(ye ?? "")) : "";
      let ge = hostDisplay
        ? hostDisplay.description
        : ie && ne && c.localDisplayOnly !== true
          ? `${ne}
${ie}`
          : ie || ne;
      let He = isChromeToolName(getToolNameForPermissionCheck(r));
      let metadata = c.metadata;
      let he = schedulePermissionNotify(humanizeToolName(r.name), s.storageV5, s.credentials);
      if (hostDisplay) logFeatureOk("permission_host_worded_ask");
      let B = e
        .request(
          {
            subtype: "can_use_tool",
            tool_name: r.name,
            ...(r.mcpInfo && {
              mcp_server: mcpServerIdentityForHooks(r.mcpInfo),
            }),
            ...(ee && {
              title: ee.title,
            }),
            display_name: hostDisplay?.displayName ?? humanizeToolName(r.name),
            input: updatedInput,
            ...(hostDisplay && {
              title: hostDisplay.title,
            }),
            ...(ge && {
              description: ge,
            }),
            ...(He && {
              tool_kind: "browser",
            }),
            ...undefined,
            permission_suggestions: suggestions,
            blocked_path: c.blockedPath,
            decision_reason: ye,
            decision_reason_type: decisionReasonTypeOnWire(decisionReason),
            decision_reason_code: decisionReasonCode(decisionReason),
            decision_reason_rule_source:
              decisionReason?.type === "rule" ? decisionReason.rule.source : undefined,
            ...(decisionReason?.type === "hook" && {
              decision_reason_hook_event: classicPreToolUseHookId_2(decisionReason.hookName, r.name),
              decision_reason_hook_source: classicPreToolUseHookId(decisionReason.hookSource),
              decision_reason_hook_plugin_id: classicHookId(decisionReason.hookPluginId),
            }),
            server_policy_ask_only: D,
            ...(c.matchedAskRule && {
              matched_ask_rule: {
                source: c.matchedAskRule.source,
                tool_name: c.matchedAskRule.ruleValue.toolName,
                ...(c.matchedAskRule.ruleValue.ruleContent !== undefined && {
                  rule_content: c.matchedAskRule.ruleValue.ruleContent,
                }),
              },
            }),
            classifier_approvable: safetyCheckReason
              ? !findSafetyCheckReason(decisionReason, (S) => !S.classifierApprovable)
              : undefined,
            ...((decisionReason?.type === "rule" ||
              (decisionReason?.type === "other" && decisionReason.reason === askCeilingReason(r))) &&
              r.mcpInfo?.effectiveMaxPermission === "ask" && {
                decision_reason_code: "org_ask_ceiling",
              }),
            tool_use_id: toolUseId,
            agent_id: s.agentId,
            plugin: getHookCallerOf(s) ?? (isHookOrPluginSteered(s) ? "" : undefined),
            suppress_always_allow_rule:
              c.suppressAlwaysAllowRule ||
              (r.suppressesAlwaysAllowRule?.(
                updatedInput,
                !getFeatureValue_CACHED_MAY_BE_STALE("tengu_valiant_crayon", false),
              ) === true &&
                !(suggestions ?? []).some(
                  (S) =>
                    (S.type === "addRules" || S.type === "replaceRules") &&
                    S.behavior === "allow" &&
                    S.rules.some((rule) => rule.ruleContent !== undefined),
                )) ||
              undefined,
            default_to_no: c.defaultToNo || undefined,
            provenance_prompt_line: c.provenancePromptLine,
            requires_user_interaction:
              r.requiresUserInteraction?.() || Z || le || fe || hostDisplay !== undefined || undefined,
          },
          abortController.signal,
          I,
        )
        .then((result) => ({
          source: "sdk",
          result,
        }));
      B.catch(() => {});
      B.then(
        () => {
          X = true;
        },
        () => {
          X = true;
        },
      );
      if (e.isPending(I)) {
        E = {
          logContext: {
            tool: r,
            input: updatedInput,
            messageId: y.message.id,
            toolUseID: toolUseId,
            permissionMode: getToolPermissionContext(s).mode,
            agentContext: s.agentContext,
            mcpClients: s.options.mcpClients,
            appliedAllowUpdates: (S) => {
              switch (n.kind) {
                case "launcher":
                  return alwaysAllowRulesFor(
                    S,
                    r,
                    updatedInput,
                    s,
                    c.suppressAlwaysAllowRule === true,
                    c.metadata?.mcpSkill === undefined
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
        logPermissionRequestShown(E.logContext, decisionReason?.type);
      }
      B.then(he, he);
      let winner = await Promise.race([W, B]);
      if (winner.source === "hook") {
        if (winner.outcome) {
          if (isTerminalShutdown() && !Q) await heldUntilExit();
          abortController.abort();
          if (E)
            logPermissionDecision(
              E.logContext,
              {
                kind: "hook",
                behavior: winner.outcome.decision.behavior === "allow" ? "allow" : "deny",
                permanent: winner.outcome.permanent,
              },
              E.shownAtMs,
            );
          if (winner.outcome.interrupt) {
            logForDebugging(`Hook interrupt: tool=${r.name} hookMessage=${winner.outcome.decision.message}`);
            turnAbortControllerOf(s.abortController).abort();
          }
          return winner.outcome.decision;
        }
        let S = pushPermissionRequest({
          answers: n,
          ask: c,
          forced: k !== undefined,
          askedUnder: R,
          tool: r,
          input: m,
          toolUseContext: s,
          assistantMessage: y,
          toolUseID: toolUseId,
          isWaiting: () => e.isPending(I) && !signal.aborted,
        });
        ue = S.stop;
        let winner_2 = await Promise.race([
          B.then(() => {
            return;
          }),
          S.allowed,
        ]);
        if (winner_2 !== undefined && e.isPending(I)) {
          if (isTerminalShutdown() && !Q) await heldUntilExit();
          abortController.abort();
          dropPermissionRecord(s, toolUseId);
          if (E)
            logPermissionDecision(
              E.logContext,
              {
                kind: "recheck",
              },
              E.shownAtMs,
            );
          return winner_2;
        }
      }
      let ke = winner.source === "hook" ? (await B).result : winner.result;
      if (E)
        logPermissionDecision(
          E.logContext,
          {
            kind: "host_answer",
            answer: ke,
          },
          E.shownAtMs,
        );
      let x = permissionPromptToolResultToPermissionDecision(
        n,
        ke,
        r,
        updatedInput,
        s,
        r,
        c.suppressAlwaysAllowRule === true,
        D !== true,
        c.metadata?.mcpSkill === undefined
          ? undefined
          : {
              rule: undefined,
            },
      );
      if (
        x.behavior === "allow" &&
        e.answeredAtHostDialog(I) &&
        s.forRemoteExecution !== true &&
        returnFalsePermissionHook()
      )
        recordHostAttestedCall(s.session, toolUseId, {
          toolName: r.name,
          input: x.updatedInput ?? updatedInput,
        });
      if (x.behavior === "allow") recordMcpApprovalTicket_2(e.takeApprovalTicket(I), r, toolUseId, s);
      return x;
    } catch (error) {
      if (isTerminalShutdown() && e.isPending(I)) await heldUntilExit();
      if (e.interruptedAtStreamClose(I) && isInterruptModeOn()) {
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
      let W = formatPermissionRequestFailure(n, error, r.name);
      let _ = CAN_USE_TOOL_REQUEST_FAILED_DENY_REASON;
      if (error instanceof ZodError) {
        logForDebugging(
          `canUseTool returned a schema-invalid permission result for ${r.name}: ${error.message.slice(0, 2000)}`,
          {
            level: "error",
          },
        );
        W = `The canUseTool callback returned an invalid permission result. ${PERMISSION_PROMPT_RESULT_FORMAT_HINT}`;
        _ = CAN_USE_TOOL_INVALID_RESULT_DENY_REASON;
      } else if (error instanceof StreamClosedAbortError) _ = CAN_USE_TOOL_STREAM_CLOSED_DENY_REASON;
      else if (isAbortError(error) && signal.aborted) {
        W = "Tool permission request aborted";
        _ = CAN_USE_TOOL_ABORTED_DENY_REASON;
        if (E && !isAskWithdrawnByAsker(signal))
          logPermissionDecision(
            E.logContext,
            {
              kind: "turn_aborted",
            },
            E.shownAtMs,
          );
      }
      return {
        behavior: "deny",
        message: W,
        toolUseID: toolUseId,
        decisionReason: _,
        decideLocation: "ask-path",
      };
    } finally {
      ue?.();
      e.promptSettled(I, ce);
      signal.removeEventListener("abort", de);
    }
  };
  return setPermissionPromptHostProbe("callback", d, () => true);
}
//@ chunk-6j594vm1.js:18451-18485 placement
var weakSet = new WeakSet();
var weakMap = new WeakMap();
//@ chunk-6j594vm1.js:18485-19866 placement
/**
 * 询问权限并同时推送，取先到的答复。
 */
async function askPermissionWithPush(n, e, d, r, m, s, y, f, k) {
  let signal = y.abortController.signal;
  let c = () => ({
    behavior: "deny",
    message: "Tool permission request aborted",
    toolUseID: k,
    decisionReason: CAN_USE_TOOL_ABORTED_DENY_REASON,
    decideLocation: "ask-path",
  });
  if (r.personOnly !== true) {
    let w;
    try {
      w = await executePermissionRequestHooksForSDK(
        e,
        m,
        k,
        r.updatedInput ?? s,
        y,
        r.suggestions,
        r,
        () => signal.aborted,
      );
    } catch (error) {
      return signal.aborted
        ? c()
        : {
            behavior: "deny",
            message: formatPermissionRequestFailure(e, error, m.name),
            toolUseID: k,
            decisionReason: CAN_USE_TOOL_REQUEST_FAILED_DENY_REASON,
            decideLocation: "ask-path",
          };
    }
    if (w !== undefined) {
      if (isTerminalShutdown() && !signal.aborted) return heldUntilExit();
      if (w.interrupt) turnAbortControllerOf(y.abortController).abort();
      return w.decision;
    }
  }
  let h = await d.prepare();
  if (signal.aborted) {
    if (!("error" in h)) h.release();
    return c();
  }
  if ("error" in h)
    return {
      behavior: "deny",
      message: h.error,
      toolUseID: k,
      decisionReason: {
        type: "other",
        reason: "files not attached",
      },
      decideLocation: "ask-path",
    };
  let A = {
    ...dropStaleHostDisplay(r, h.input),
    updatedInput: h.input,
  };
  weakSet.add(A);
  weakMap.set(A, h.description);
  let b;
  try {
    b = await n(m, s, y, f, k, A);
  } catch (error) {
    h.release();
    throw error;
  }
  if (b.behavior !== "allow") {
    h.release();
    return b;
  }
  let C = b.updatedInput !== undefined && Object.keys(b.updatedInput).length > 0 ? b.updatedInput : h.input;
  if (!En(C.files, h.input.files)) {
    h.release();
    return {
      behavior: "deny",
      message: `The approval for ${m.name} changed the files to attach, which cannot be applied. Call it again with the files you want attached.`,
      toolUseID: k,
      decisionReason: {
        type: "other",
        reason: "approval changed the files",
      },
      decideLocation: "ask-path",
    };
  }
  return {
    ...b,
    updatedInput: C,
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
