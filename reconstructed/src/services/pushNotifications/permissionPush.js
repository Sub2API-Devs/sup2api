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
import {
  isDeepStrictEqual,
  isDeepStrictEqual as isDeepStrictEqual_2,
  isDeepStrictEqual as isDeepStrictEqual_3,
} from "util";
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
import { _2 } from "../api/deferredToolsState.js";
import { Cf } from "../../bridge/deviceRegistration.js";
import { JT } from "../../constants/outputLimits.js";
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
import { aF } from "../../utils/permissions/permissionSetup.js";
import { getRegisteredCheck } from "../../utils/permissions/checkRegistry.js";
import { getPluginRegistry } from "../../utils/plugins/pluginLoadState.js";
import {
  hasModuleHookingSite,
  getLoadedModulesForSite,
} from "../../plugins/hooksModules/loadedModuleFilters.js";
import { KW } from "../../utils/hooks/matcherGrammar.js";
import { managedTierHooks, hasSettingsHookForEvent } from "../../utils/hooks.js";
import { dispatchClassicEvent } from "../../plugins/functionHooks/modAdmission.js";
import { registerAgent } from "../../utils/telemetry/perfettoTracing.js";
import { env } from "../../utils/env.js";
import { isUserDrivenHere, isUserDrivenTurn } from "../../utils/turnOrigin.js";
import { isAgentSdkEntrypoint } from "../../utils/entrypointKinds.js";
import { Sdi, Zwn } from "../../bridge/inboundMessageOrigin.js";
import { classifyMessageSource_2 } from "../../utils/messages/messageSource.js";
import { isTerminalShutdown, heldUntilExit } from "../../utils/terminalShutdown.js";
import { requiresConnectorGrant } from "../mcp/claudeai.js";
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
  ygr,
  isHookOrPluginSteered,
} from "../../utils/agentContext.js";
import { executePermissionRequestHooksForSDK } from "../../cli/structuredIO.js";
import { stripNonPrintable } from "../../utils/truncateGraphemes.js";
import { Yn } from "../../utils/stripAnsi.js";
import { logFeatureOk } from "../analytics/featureTelemetry.js";
import { mcpServerIdentityForHooks } from "../mcp/fileReference/fileReferencePolicy.js";
import { classicPreToolUseHookId, sjn, ijn } from "../../plugins/functionHooks/sites/classicHookIds.js";
import {
  logPermissionRequestShown,
  logPermissionDecision,
} from "../../hooks/toolPermission/permissionLogging.js";
import { turnAbortControllerOf, isAskWithdrawnByAsker } from "../../utils/abortController.js";
import { dropPermissionRecord } from "../../utils/permissions/permissionRecord.js";
import { JYt, recordHostAttestedCall } from "../../components/permissions/hooks.js";
import { recordMcpApprovalTicket_2 } from "../../bridge/mcpApprovalTickets.js";
import { logEvent } from "../analytics/index.js";
import { formatPermissionRequestFailure } from "../../utils/permissions/permissionAnswer.js";
import { kR } from "../../../vendor/zod/v4/classic/errors.js";
import { Fet } from "../../utils/permissions/permissionPromptHost.js";
import { dropStaleHostDisplay } from "../../utils/hooks/hookMessages.js";
import { En } from "../../../vendor/lodash-es/_inlinedHelpers.js";

//@ chunk-6j594vm1.js:5574-5676 placement
function getGrantScopeField(n, e) {
  let d = permissionGrantScope(e);
  return d === "once" || (d === "session" && n.kind === "launcher") ? { grantScope: d } : {};
}
/**
 * 构建"没有可批准界面"时的拒绝结果，消息附带决定原因。
 */
//@ chunk-6j594vm1.js:5676-5887 placement
function buildNoApprovalSurfaceDenial(n) {
  let e = serializeDecisionReason(n.decisionReason),
    d = e !== void 0 && !n.message.includes(e) ? `${n.message} ${e}` : n.message;
  return {
    behavior: "deny",
    message: buildNoApprovalSurfaceDenial_2(d),
    decisionReason: { ...NO_APPROVAL_SURFACE_DENY_REASON, ask: refusedAskOf(n) },
    decideLocation: "ask-path",
  };
}
//@ chunk-6j594vm1.js:5887-6016 placement
function buildNoPromptSurfaceDenial(n, e) {
  return {
    behavior: "deny",
    message: n.message,
    decisionReason: { ...NO_PROMPT_SURFACE_DENY_REASON, reason: e, ask: refusedAskOf(n) },
    decideLocation: "ask-path",
  };
}
//@ chunk-6j594vm1.js:6016-6071 placement
function lIr(n, e, d, r) {
  return toolMaySettleUnaskedQuestion(n, e, d) ? buildNoPromptSurfaceDenial(e, r) : void 0;
}
//@ chunk-6j594vm1.js:6071-6134 placement
function xLs(n, e, d, r, m) {
  return mustBeLeftToAPerson(e, n, d, r, m)
    ? buildNoPromptSurfaceDenial(e, NO_PROMPT_SURFACE_REASON)
    : void 0;
}
//@ chunk-6j594vm1.js:6134-6162 placement
var TENGU_CINDER_SWIFT = "tengu_cinder_swift";
//@ chunk-6j594vm1.js:6162-6210 placement
function oIr() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_CINDER_SWIFT, "off") === "interrupt";
}
//@ chunk-6j594vm1.js:6210-6375 placement
function describeToolUseForPush(n, e) {
  try {
    return n.getToolUseSummary?.(e) ?? n.getActivityDescription?.(e) ?? "";
  } catch (error) {
    return (logForDebugging(`describeToolUseForPush failed: ${error}`, { level: "error" }), "");
  }
}
//@ chunk-6j594vm1.js:6375-6413 placement
function Se(n, e) {
  return describeToolUseForPush_2(n, e)?.card;
}
/**
 * 为推送通知描述工具调用（问题、计划等）。
 */
//@ chunk-6j594vm1.js:6413-7303 placement
function describeToolUseForPush_2(n, e) {
  if (!n.requiresUserInteraction?.()) return;
  switch (n.name) {
    case ASKUSERQUESTION: {
      let d = Array.isArray(e?.questions) ? e.questions : [],
        r = d[0],
        m = r?.header || r?.question,
        s = d.length > 1 ? ` (+${d.length - 1} more)` : "";
      return { label: "Question", body: m ? m + s : "Tap to answer" };
    }
    case EXITPLANMODE:
      return { label: "Plan", body: "Plan ready for review" };
    case CONNECTGITHUB:
      return { label: humanizeToolName(n.name), body: "" };
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
      return { label: humanizeToolName(n.name), body: "" };
  }
}
/**
 * 生成权限请求推送内容与遥测字段。
 */
//@ chunk-6j594vm1.js:7303-8156 placement
function permissionPushPayload(n, e, d, r, m) {
  let s = decisionReasonCode(m?.decisionReason),
    y = {
      ...(m?.decisionReason && { decision_reason_type: decisionReasonTypeOnWire(m.decisionReason) }),
      ...(s && { decision_reason_code: s }),
    },
    f = m?.askerAgentId !== void 0 && { agent_id: m.askerAgentId },
    k = m?.hostDisplay ? { label: m.hostDisplay.displayName, body: "" } : describeToolUseForPush_2(n, e);
  if (k)
    return {
      tool_name: n.name,
      display_tool_name: k.label,
      action_description: k.body,
      raw_command: void 0,
      tool_use_id: d,
      request_id: "",
      ...(r && { suppressed_request_id: r }),
      input: e,
      ...y,
      ...f,
    };
  let R =
      (n.name === BASH_TOOL_NAME || n.name === POWERSHELL_TOOL_NAME) && typeof e.command === "string"
        ? redactSecretsInText(e.command)
        : void 0,
    c =
      R !== void 0
        ? typeof e.description === "string" && e.description && !_2(n) && !Cf(e)
          ? redactSecretsInText(e.description)
          : truncate(R, JT)
        : redactSecretsInText(describeToolUseForPush(n, e)),
    h = m?.tapToOpenOnly === !0;
  return {
    tool_name: n.name,
    display_tool_name: humanizeToolName(n.name),
    action_description: c,
    raw_command: R,
    tool_use_id: d,
    request_id: h ? "" : r,
    ...(h && r && { suppressed_request_id: r }),
    input: e,
    ...y,
    ...f,
  };
}
//@ chunk-6j594vm1.js:8240-8249 placement
var ze = 3;
/**
 * 需要权限时向手机推送请求（tengu_drifting_dream）。
 */
//@ chunk-6j594vm1.js:8249-9077 placement
function pushPermissionRequest(n) {
  let { promise: promise, resolve: resolve } = Promise.withResolvers(),
    {
      ask: ask,
      tool: tool,
      input: input,
      toolUseContext: toolUseContext,
      toolUseID: toolUseID,
      isWaiting: isWaiting,
    } = n;
  if (
    !getFeatureValue_CACHED_MAY_BE_STALE("tengu_drifting_dream", !1) ||
    n.answers.kind !== "launcher" ||
    n.forced ||
    toolUseContext.hookAskFloor === !0 ||
    ask.personOnly === !0 ||
    toolUseContext.forRemoteExecution === !0 ||
    isChromeToolName(getToolNameForPermissionCheck(tool)) ||
    isRemoteBrowserToolUnderModeFloor(tool) ||
    isBypassImmuneDecision(ask, tool, toolUseContext)
  )
    return { allowed: promise, stop: () => {} };
  let R = 0,
    c = (A) => {
      if (!isWaiting()) return;
      let b = getToolPermissionContext(toolUseContext);
      if (isAutoClassifierActive(isAutoAllowedInMode(tool, b), b.servedCall === !0)) return;
      let C = ++R,
        w = storedToolPermissionContext(toolUseContext);
      hasPermissionsToUseTool(
        tool,
        input,
        { ...toolUseContext, permissionRound: void 0 },
        n.assistantMessage,
        toolUseID,
      )
        .then((D) => {
          if (!isWaiting() || C !== R) return;
          if (!isDeepStrictEqual_3(storedToolPermissionContext(toolUseContext), w)) {
            if (A < ze) c(A + 1);
            return;
          }
          if (D.behavior === "allow" && isPushableDecisionReason(D.decisionReason)) (subscribe(), resolve(D));
        })
        .catch((D) => {
          if (!isAbortError(D))
            logError(
              withTelemetryMessage(
                toError(D),
                "permissionRecheckSignal: hasPermissionsToUseTool failed for a waiting can_use_tool ask",
              ),
            );
        });
    },
    subscribe = aF.subscribe(() => c(0));
  if (!isDeepStrictEqual_3(storedToolPermissionContext(toolUseContext), n.askedUnder)) c(0);
  return { allowed: promise, stop: subscribe };
}
/**
 * 决策原因是否适合推送。
 */
//@ chunk-6j594vm1.js:9077-9465 placement
function isPushableDecisionReason(n) {
  switch (n?.type) {
    case "rule":
      return !0;
    case "mode":
      return n.mode === "default" || n.mode === "acceptEdits" || n.mode === "bypassPermissions";
    case "subcommandResults": {
      let filtered = [...n.reasons.values()].filter(
        (d) =>
          d.behavior !== "allow" ||
          d.decisionReason?.type !== "other" ||
          d.decisionReason.reason !== READ_ONLY_AUTO_ALLOW_REASON,
      );
      return (
        filtered.length > 0 &&
        filtered.every((d) => d.behavior === "allow" && isPushableDecisionReason(d.decisionReason))
      );
    }
    default:
      return !1;
  }
}
//@ chunk-6j594vm1.js:9465-9636 placement
function checkServerPolicyAskPushable(n) {
  let decisionReason = n.ask.decisionReason;
  if (decisionReason === void 0 ? n.tool.mcpInfo === void 0 : decisionReason.type !== "rule") return;
  try {
    if (mustAskWithoutPush(n)) return !1;
  } catch (error) {
    if (!isAbortError(error)) logError(error);
    return !1;
  }
  return recheckPushable(n);
}
//@ chunk-6j594vm1.js:9636-9725 placement
function PLs(n) {
  return n.subtype === "can_use_tool" ? { ...n, server_policy_ask_only: void 0 } : n;
}
//@ chunk-6j594vm1.js:9725-9858 placement
function mustAskWithoutPush(n) {
  let decisionReason = n.ask.decisionReason;
  return (
    n.tool.mcpInfo === void 0 ||
    !(decisionReason === void 0 || isServerPolicyAskReason(decisionReason)) ||
    !J(n.ask, ["decisionReason"]) ||
    mustAskLocally(n)
  );
}
/**
 * 是否必须在本地询问（强制决定、远程执行等）。
 */
//@ chunk-6j594vm1.js:9858-10319 placement
function mustAskLocally({
  tool: tool,
  effectiveInput: effectiveInput,
  ask: ask,
  toolUseContext: toolUseContext,
  forceDecision: forceDecision,
}) {
  let decisionReason = ask.decisionReason;
  return (
    forceDecision !== void 0 ||
    toolUseContext.hookAskFloor === !0 ||
    toolUseContext.forRemoteExecution === !0 ||
    isChromeToolName(getToolNameForPermissionCheck(tool)) ||
    isRemoteBrowserToolUnderModeFloor(tool) ||
    isBypassImmuneDecision(ask, tool, toolUseContext) ||
    tool.suppressesAlwaysAllowRule?.(effectiveInput) === !0 ||
    tool.suppressesAllPermissionUpdates?.(effectiveInput) === !0 ||
    tool.ignoresWholeToolAllowRule?.(effectiveInput) === !0 ||
    toolUseContext.remoteCall !== void 0 ||
    toolUseContext.requireCanUseTool === !0 ||
    getRegisteredCheck(toolUseContext.session, tool.name) !== void 0 ||
    tool.askInputPreparer !== void 0 ||
    Qe(tool, toolUseContext) ||
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
      isDeepStrictEqual_2(storedToolPermissionContext(n.toolUseContext), e) &&
      !mustAskWithoutPush(n)
    );
  } catch (error) {
    if (!isAbortError(error)) logError(error);
    return !1;
  }
}
//@ chunk-6j594vm1.js:10462-10737 placement
async function isPushableWithoutServerAsk({
  tool: tool,
  effectiveInput: effectiveInput,
  toolUseContext: toolUseContext,
}) {
  let r = !1,
    m = await checkDeclarativePermissionLessServerPolicyAsks(
      {
        ...tool,
        checkPermissions: async (s, y) => {
          let checkPermissions = await tool.checkPermissions(s, y);
          return ((r ||= checkPermissions.behavior === "ask"), checkPermissions);
        },
      },
      effectiveInput,
      toolUseContext,
    );
  return (
    !r &&
    (m.behavior === "allow" ? isPushableDecisionReason(m.decisionReason) : m.behavior === "ask" && J(m, []))
  );
}
//@ chunk-6j594vm1.js:10737-10781 placement
var Ve = ["behavior", "message", "suggestions"];
//@ chunk-6j594vm1.js:10781-10880 placement
function J(n, e) {
  return Object.entries(n).every(([d, r]) => r === void 0 || Ve.includes(d) || e.includes(d));
}
//@ chunk-6j594vm1.js:10880-11141 placement
function hasPermissionRequestHooks(n, e) {
  return (
    getPluginRegistry().hooksRespawns.size > 0 ||
    hasModuleHookingSite(
      "tool.check",
      { ...KW(n), agentId: e.agentId },
      getLoadedModulesForSite("tool.check"),
    ) ||
    managedTierHooks("PermissionRequest") !== "none" ||
    dispatchClassicEvent("PermissionRequest") ||
    hasSettingsHookForEvent(
      "PermissionRequest",
      e.sessionHooksRegistry,
      registerAgent(e, "PermissionRequest", e.session.id),
    )
  );
}
//@ chunk-6j594vm1.js:11141-11207 placement
function Qe(n, e) {
  let d = getToolPermissionContext(e);
  return isAutoClassifierActive(isAutoAllowedInMode(n, d), d.servedCall === !0);
}
/**
 * 创建权限询问函数（launcher/strict 模式、推送、远程）。
 */
//@ chunk-6j594vm1.js:11207-18451 placement
function createPermissionAsker(n, e) {
  let d = async (r, m, s, y, f, k) => {
    let R = storedToolPermissionContext(s),
      c;
    switch (n.kind) {
      case "launcher":
        c = k ?? (await hasPermissionsToUseTool(r, m, s, y, f));
        break;
      case "strict":
        c = k ?? (await hasPermissionsToUseToolWithSink(r, m, s, y, f, n, void 0));
        break;
    }
    let h =
        c.behavior === "ask" && k === void 0 && env.CLAUDE_CODE_REMOTE && mustBeLeftToAPerson(c, r, m, s, f)
          ? lIr(r, c, s, NO_KNOWN_PERSON_STARTED_THE_TURN_REASON)
          : void 0,
      messageInboundOrigin = s.options.messageInboundOrigin;
    if (
      h !== void 0 &&
      !isUserDrivenHere(s.messages) &&
      (isAgentSdkEntrypoint() ||
        (messageInboundOrigin
          ? !Sdi(messageInboundOrigin) && (Zwn(messageInboundOrigin) || !isUserDrivenTurn(s.messages))
          : s.agentId === void 0 && classifyMessageSource_2(s.messages)))
    )
      c = h;
    if (c.behavior === "allow") return c;
    if (c.behavior === "deny") {
      if (isTerminalShutdown() && !s.abortController.signal.aborted) return heldUntilExit();
      if (!isInvalidInputDeny(c)) e.emitPermissionDenied(r.name, f, s.agentId, c);
      return c;
    }
    let b = { tool: r, effectiveInput: c.updatedInput ?? m, ask: c, toolUseContext: s, forceDecision: k },
      C = e.keptAskFor?.(f);
    if (C !== void 0) {
      let answerFor = await C.answerFor({
        usable: () =>
          J(c, [
            "decisionReason",
            "updatedInput",
            "blockedPath",
            "metadata",
            "bashAllowRuleOverridable",
            "suppressAlwaysAllowRule",
          ]) &&
          !requiresConnectorGrant(r) &&
          isDeepStrictEqual(storedToolPermissionContext(s), R) &&
          !mustAskLocally(b),
        toolName: r.name,
        input: c.updatedInput ?? m,
        planMode: () => getToolPermissionContext(s).mode === "plan",
      });
      if (answerFor !== void 0 && !s.abortController.signal.aborted && !isTerminalShutdown())
        return permissionPromptToolResultToPermissionDecision(
          n,
          answerFor,
          r,
          c.updatedInput ?? m,
          s,
          r,
          c.suppressAlwaysAllowRule === !0,
          !1,
        );
    }
    let w = checkServerPolicyAskPushable(b),
      D = typeof w === "object" ? await w : w;
    if (s.abortController.signal.aborted)
      return {
        behavior: "deny",
        message: "Tool permission request aborted",
        toolUseID: f,
        decisionReason: CAN_USE_TOOL_ABORTED_DENY_REASON,
        decideLocation: "ask-path",
      };
    if (isTerminalShutdown()) return heldUntilExit();
    if (r.askInputPreparer !== void 0 && !weakSet.has(c) && s.forRemoteExecution !== !0) {
      let askInputPreparer = await r.askInputPreparer(c.updatedInput ?? m, s, f);
      if (askInputPreparer !== void 0) return askPermissionWithPush(d, n, askInputPreparer, c, r, m, s, y, f);
    }
    let P = c.updatedInput ?? m,
      suggestions = c.suggestions;
    if (
      r.name === BASH_TOOL_NAME &&
      typeof P.command === "string" &&
      suggestions?.length &&
      !suggestions.some((O) => O.destination !== "session")
    )
      suggestions = [...suggestionForExactCommand(P.command), ...suggestions];
    let abortController = new AbortController(),
      signal = s.abortController.signal,
      Q = !1,
      de = () => {
        if (!isTerminalShutdown()) Q = !0;
        abortController.abort(signal.reason);
      };
    signal.addEventListener("abort", de, { once: !0 });
    let I = randomUUID(),
      me = getForegroundSubagentId(s.agentContext),
      ce,
      E,
      X = !1,
      ue;
    try {
      let W = (
        c.personOnly === !0 || weakSet.has(c)
          ? Promise.resolve(void 0)
          : executePermissionRequestHooksForSDK(n, r, f, P, s, suggestions, c, () => X || signal.aborted)
      ).then((S) => ({ source: "hook", outcome: S }));
      W.catch(() => {});
      let decisionReason = c.decisionReason,
        Z = c.localDisplayOnly === !0 || (c.personOnly === !0 && decisionReason?.type === "classifier"),
        le = requiresConnectorGrant(r),
        fe = mustBeLeftToAPerson(c, r, m, s, f);
      if (e.promptShown) {
        let S = permissionPushPayload(r, P, f, I, {
          tapToOpenOnly: Z || le || fe || c.metadata?.mcpSkill !== void 0,
          hostDisplay: c.hostDisplay,
          decisionReason: decisionReason,
          askerAgentId: s.agentId,
        });
        ((ce = me), e.promptShown(I, S, me, getBackgroundAgentId(s.agentContext)));
      }
      let z = findSafetyCheckReason(decisionReason),
        Me = r.name === BASH_TOOL_NAME || r.name === POWERSHELL_TOOL_NAME,
        Le =
          weakMap.get(c) ||
          (c.metadata && "command" in c.metadata
            ? c.metadata.mcpSkill
              ? z?.reason
              : c.metadata.command.description
            : void 0) ||
          (Me && typeof P.command === "string"
            ? typeof P.description === "string" && P.description
              ? redactSecretsInText(P.description)
              : truncate(redactSecretsInText(P.command), JT)
            : describeToolUseForPush(r, P)) ||
          void 0,
        ee = Se(r, P),
        ne = _2(r) || (r.name === POWERSHELL_TOOL_NAME && Cf(P)) ? void 0 : (Le ?? ee?.description),
        ye =
          serializeDecisionReason(decisionReason) ??
          (decisionReason?.type === "subcommandResults" && z
            ? (findSafetyCheckReason(
                decisionReason,
                (S) => !S.classifierApprovable && !isCircuitBreakerSafetyCheck(S),
              )?.reason ?? (isCircuitBreakerSafetyCheck(z) ? void 0 : z.reason))
            : void 0),
        hostDisplay = c.hostDisplay,
        ie = Z ? stripNonPrintable(Yn(ye ?? "")) : "",
        ge = hostDisplay
          ? hostDisplay.description
          : ie && ne && c.localDisplayOnly !== !0
            ? `${ne}
${ie}`
            : ie || ne,
        He = isChromeToolName(getToolNameForPermissionCheck(r)),
        metadata = c.metadata,
        he = schedulePermissionNotify(humanizeToolName(r.name), s.storageV5, s.credentials);
      if (hostDisplay) logFeatureOk("permission_host_worded_ask");
      let B = e
        .request(
          {
            subtype: "can_use_tool",
            tool_name: r.name,
            ...(r.mcpInfo && { mcp_server: mcpServerIdentityForHooks(r.mcpInfo) }),
            ...(ee && { title: ee.title }),
            display_name: hostDisplay?.displayName ?? humanizeToolName(r.name),
            input: P,
            ...(hostDisplay && { title: hostDisplay.title }),
            ...(ge && { description: ge }),
            ...(He && { tool_kind: "browser" }),
            ...void 0,
            permission_suggestions: suggestions,
            blocked_path: c.blockedPath,
            decision_reason: ye,
            decision_reason_type: decisionReasonTypeOnWire(decisionReason),
            decision_reason_code: decisionReasonCode(decisionReason),
            decision_reason_rule_source:
              decisionReason?.type === "rule" ? decisionReason.rule.source : void 0,
            ...(decisionReason?.type === "hook" && {
              decision_reason_hook_event: classicPreToolUseHookId(decisionReason.hookName, r.name),
              decision_reason_hook_source: sjn(decisionReason.hookSource),
              decision_reason_hook_plugin_id: ijn(decisionReason.hookPluginId),
            }),
            server_policy_ask_only: D,
            ...(c.matchedAskRule && {
              matched_ask_rule: {
                source: c.matchedAskRule.source,
                tool_name: c.matchedAskRule.ruleValue.toolName,
                ...(c.matchedAskRule.ruleValue.ruleContent !== void 0 && {
                  rule_content: c.matchedAskRule.ruleValue.ruleContent,
                }),
              },
            }),
            classifier_approvable: z
              ? !findSafetyCheckReason(decisionReason, (S) => !S.classifierApprovable)
              : void 0,
            ...((decisionReason?.type === "rule" ||
              (decisionReason?.type === "other" && decisionReason.reason === askCeilingReason(r))) &&
              r.mcpInfo?.effectiveMaxPermission === "ask" && { decision_reason_code: "org_ask_ceiling" }),
            tool_use_id: f,
            agent_id: s.agentId,
            plugin: ygr(s) ?? (isHookOrPluginSteered(s) ? "" : void 0),
            suppress_always_allow_rule:
              c.suppressAlwaysAllowRule ||
              (r.suppressesAlwaysAllowRule?.(
                P,
                !getFeatureValue_CACHED_MAY_BE_STALE("tengu_valiant_crayon", !1),
              ) === !0 &&
                !(suggestions ?? []).some(
                  (S) =>
                    (S.type === "addRules" || S.type === "replaceRules") &&
                    S.behavior === "allow" &&
                    S.rules.some((rule) => rule.ruleContent !== void 0),
                )) ||
              void 0,
            default_to_no: c.defaultToNo || void 0,
            provenance_prompt_line: c.provenancePromptLine,
            requires_user_interaction:
              r.requiresUserInteraction?.() || Z || le || fe || hostDisplay !== void 0 || void 0,
          },
          abortController.signal,
          I,
        )
        .then((S) => ({ source: "sdk", result: S }));
      if (
        (B.catch(() => {}),
        B.then(
          () => {
            X = !0;
          },
          () => {
            X = !0;
          },
        ),
        e.isPending(I))
      )
        ((E = {
          logContext: {
            tool: r,
            input: P,
            messageId: y.message.id,
            toolUseID: f,
            permissionMode: getToolPermissionContext(s).mode,
            agentContext: s.agentContext,
            mcpClients: s.options.mcpClients,
            appliedAllowUpdates: (S) => {
              switch (n.kind) {
                case "launcher":
                  return alwaysAllowRulesFor(
                    S,
                    r,
                    P,
                    s,
                    c.suppressAlwaysAllowRule === !0,
                    c.metadata?.mcpSkill === void 0 ? void 0 : { rule: void 0 },
                  );
                case "strict":
                  return;
              }
            },
          },
          shownAtMs: Date.now(),
        }),
          logPermissionRequestShown(E.logContext, decisionReason?.type));
      B.then(he, he);
      let winner = await Promise.race([W, B]);
      if (winner.source === "hook") {
        if (winner.outcome) {
          if (isTerminalShutdown() && !Q) await heldUntilExit();
          if ((abortController.abort(), E))
            logPermissionDecision(
              E.logContext,
              {
                kind: "hook",
                behavior: winner.outcome.decision.behavior === "allow" ? "allow" : "deny",
                permanent: winner.outcome.permanent,
              },
              E.shownAtMs,
            );
          if (winner.outcome.interrupt)
            (logForDebugging(`Hook interrupt: tool=${r.name} hookMessage=${winner.outcome.decision.message}`),
              turnAbortControllerOf(s.abortController).abort());
          return winner.outcome.decision;
        }
        let S = pushPermissionRequest({
          answers: n,
          ask: c,
          forced: k !== void 0,
          askedUnder: R,
          tool: r,
          input: m,
          toolUseContext: s,
          assistantMessage: y,
          toolUseID: f,
          isWaiting: () => e.isPending(I) && !signal.aborted,
        });
        ue = S.stop;
        let winner_2 = await Promise.race([
          B.then(() => {
            return;
          }),
          S.allowed,
        ]);
        if (winner_2 !== void 0 && e.isPending(I)) {
          if (isTerminalShutdown() && !Q) await heldUntilExit();
          if ((abortController.abort(), dropPermissionRecord(s, f), E))
            logPermissionDecision(E.logContext, { kind: "recheck" }, E.shownAtMs);
          return winner_2;
        }
      }
      let ke = winner.source === "hook" ? (await B).result : winner.result;
      if (E) logPermissionDecision(E.logContext, { kind: "host_answer", answer: ke }, E.shownAtMs);
      let x = permissionPromptToolResultToPermissionDecision(
        n,
        ke,
        r,
        P,
        s,
        r,
        c.suppressAlwaysAllowRule === !0,
        D !== !0,
        c.metadata?.mcpSkill === void 0 ? void 0 : { rule: void 0 },
      );
      if (x.behavior === "allow" && e.answeredAtHostDialog(I) && s.forRemoteExecution !== !0 && JYt())
        recordHostAttestedCall(s.session, f, { toolName: r.name, input: x.updatedInput ?? P });
      if (x.behavior === "allow") recordMcpApprovalTicket_2(e.takeApprovalTicket(I), r, f, s);
      return x;
    } catch (error) {
      if (isTerminalShutdown() && e.isPending(I)) await heldUntilExit();
      if (e.interruptedAtStreamClose(I) && oIr()) {
        try {
          (logEvent("tengu_auq_park_interrupted_at_stream_close", {
            stream_closed: error instanceof StreamClosedAbortError,
          }),
            logForDebugging(
              `Interrupting parked AskUserQuestion toolUseID=${f} at stream close (deny skipped; turn aborts as shutdown)`,
            ));
        } catch {}
        throw error;
      }
      let W = formatPermissionRequestFailure(n, error, r.name),
        _ = CAN_USE_TOOL_REQUEST_FAILED_DENY_REASON;
      if (error instanceof kR)
        (logForDebugging(
          `canUseTool returned a schema-invalid permission result for ${r.name}: ${error.message.slice(0, 2000)}`,
          { level: "error" },
        ),
          (W = `The canUseTool callback returned an invalid permission result. ${PERMISSION_PROMPT_RESULT_FORMAT_HINT}`),
          (_ = CAN_USE_TOOL_INVALID_RESULT_DENY_REASON));
      else if (error instanceof StreamClosedAbortError) _ = CAN_USE_TOOL_STREAM_CLOSED_DENY_REASON;
      else if (isAbortError(error) && signal.aborted) {
        if (
          ((W = "Tool permission request aborted"),
          (_ = CAN_USE_TOOL_ABORTED_DENY_REASON),
          E && !isAskWithdrawnByAsker(signal))
        )
          logPermissionDecision(E.logContext, { kind: "turn_aborted" }, E.shownAtMs);
      }
      return { behavior: "deny", message: W, toolUseID: f, decisionReason: _, decideLocation: "ask-path" };
    } finally {
      (ue?.(), e.promptSettled(I, ce), signal.removeEventListener("abort", de));
    }
  };
  return Fet("callback", d, () => !0);
}
//@ chunk-6j594vm1.js:18451-18485 placement
var weakSet = new WeakSet(),
  weakMap = new WeakMap();
/**
 * 询问权限并同时推送，取先到的答复。
 */
//@ chunk-6j594vm1.js:18485-19866 placement
async function askPermissionWithPush(n, e, d, r, m, s, y, f, k) {
  let signal = y.abortController.signal,
    c = () => ({
      behavior: "deny",
      message: "Tool permission request aborted",
      toolUseID: k,
      decisionReason: CAN_USE_TOOL_ABORTED_DENY_REASON,
      decideLocation: "ask-path",
    });
  if (r.personOnly !== !0) {
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
    if (w !== void 0) {
      if (isTerminalShutdown() && !signal.aborted) return heldUntilExit();
      if (w.interrupt) turnAbortControllerOf(y.abortController).abort();
      return w.decision;
    }
  }
  let prepare = await d.prepare();
  if (signal.aborted) {
    if (!("error" in prepare)) prepare.release();
    return c();
  }
  if ("error" in prepare)
    return {
      behavior: "deny",
      message: prepare.error,
      toolUseID: k,
      decisionReason: { type: "other", reason: "files not attached" },
      decideLocation: "ask-path",
    };
  let A = { ...dropStaleHostDisplay(r, prepare.input), updatedInput: prepare.input };
  (weakSet.add(A), weakMap.set(A, prepare.description));
  let b;
  try {
    b = await n(m, s, y, f, k, A);
  } catch (error) {
    throw (prepare.release(), error);
  }
  if (b.behavior !== "allow") return (prepare.release(), b);
  let C =
    b.updatedInput !== void 0 && Object.keys(b.updatedInput).length > 0 ? b.updatedInput : prepare.input;
  if (!En(C.files, prepare.input.files))
    return (
      prepare.release(),
      {
        behavior: "deny",
        message: `The approval for ${m.name} changed the files to attach, which cannot be applied. Call it again with the files you want attached.`,
        toolUseID: k,
        decisionReason: { type: "other", reason: "approval changed the files" },
        decideLocation: "ask-path",
      }
    );
  return { ...b, updatedInput: C };
}

export { xLs, buildNoApprovalSurfaceDenial, lIr, getGrantScopeField, oIr, PLs, createPermissionAsker };
