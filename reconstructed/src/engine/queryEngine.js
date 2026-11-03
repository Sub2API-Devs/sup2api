/**
 * engine/queryEngine.ts
 *
 * 2.1.316 新增：查询引擎（SDK/print/REPL 共用）：执行回合、延迟斜杠命令、汇总模型用量、思考 token 估算。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-xx1vmpsq.js (8)
 * attribution: placement 8
 */
import { randomUUID } from "crypto";
import { stat, readFile } from "fs/promises";
import {
  thinkingTokenEstimate as thinkingTokenEstimate_2,
  signatureTokenEstimate,
  SYNTHETIC_MESSAGES,
  createSystemMessage,
  isHarnessMetaMessage,
} from "../utils/messages.js";
import {
  INTERRUPT_RECEIPT_V1,
  MSG_LIFECYCLE_V1,
  ASK_USER_QUESTION_UNANSWERED_V1,
  buildSystemInitMessage,
  toolNameForInit,
} from "../utils/messages/systemInit.js";
import { processUserInput } from "../utils/processUserInput/processUserInput.js";
import { isCompactBoundaryMessage } from "../services/projects/threadRows.js";
import {
  buildInitMessageFields,
  memoryRecallMessage,
  postFeedbackSubmission,
} from "../services/feedback/feedbackBundle.js";
import { Stream } from "../utils/stream.js";
import {
  getSessionId,
  getTotalCostUSD,
  getTotalAPIDuration,
  getModelUsage,
  getSafetyStops,
  setAutoModeUnavailableStopNotice,
} from "../bootstrap/state.js";
import {
  currentNotificationKeyAlias,
  CLIENT_SURFACE_ID,
  drainNotificationsForSession,
  hasQueuedNotificationsForSession,
} from "../utils/task/taskNotifications.js";
import { logForDebugging, getMinDebugLogLevel } from "../utils/debug.js";
import {
  createRemoteFileState,
  READ_FILE_STATE_CACHE_SIZE,
  stripBomAndCarriageReturn,
} from "../utils/remoteFileState.js";
import { logError, getInMemoryErrors } from "../utils/log.js";
import {
  withResultExtras,
  buildResultMessage,
  isAbortedTerminalReason,
} from "../entrypoints/sdk/coreSchemas.js";
import { buildFileHistorySnapshotChain, saveAiGeneratedTitle } from "../utils/sessionStorage.js";
import { getRunningTasks } from "../utils/task/framework.js";
import { isWaitableAgentOrWorkflow } from "../tasks/taskKinds.js";
import { waitForTaskCompletion } from "../tools/TaskOutputTool/TaskOutputTool.js";
import { rearmCreditsExhaustedNotice } from "../utils/fastMode.js";
import { errorMessage, isFsInaccessible } from "../utils/errors.js";
import { unwrapAbortReason } from "../utils/abortController.js";
import {
  isRecordableDenial,
  isPreAskDeny,
  isInvalidInputDeny,
  decisionReasonCode,
  parsePermissionMode,
} from "../types/permissions.js";
import { serializeDecisionReason } from "../utils/permissions/decisionReasons.js";
import { guardGoalCheck } from "../query/goalCheckIn.js";
import { STRUCTUREDOUTPUT } from "../tools/SyntheticOutputTool/SyntheticOutputTool.js";
import { MESSAGE_MARK_SYMBOLS_2 } from "../utils/messageKinds.js";
import { yj } from "../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { stripMemoryTags } from "../services/orgMemory/promptIndex.js";
import { reduceCompactResponseLength } from "../services/compact/reactiveCompact.js";
import {
  toSDKCompactMetadata,
  toSDKModelConsentFallbackMessage,
  localCommandOutputToSDKAssistantMessage,
} from "../utils/messages/mappers.js";
import { createToolUseSummaryMessage } from "../remote/sdkMessageAdapter.js";
import { categorizeRetryableAPIError } from "../services/api/errors.js";
import { LOCAL_COMMAND_STDOUT, LOCAL_COMMAND_STDERR } from "../constants/xml.js";
import { BASH_TOOL_NAME } from "../tools/BashTool/toolName.js";
import { POWERSHELL_TOOL_NAME } from "../tools/PowerShellTool/toolName.js";
import { AGENT } from "../tools/AgentTool/constants.js";
import { hasReachedBudget, maxBudgetReachedMessage } from "../cost-tracker.js";
import { logFeatureOk, logFeatureBad } from "../services/analytics/featureTelemetry.js";
import {
  getNoServerCheckStoppedNotice,
  gatewayDisplayName,
} from "../utils/permissions/serverClassifier/fallbackNotice.js";
import { buildUserUnavailableNotice } from "../utils/permissions/serverClassifier/results.js";
import {
  formatResultDiagnostic,
  isResultSuccessful,
  buildEmptyResultDiagnostics,
  isRecoverableTrailingServerError,
} from "../utils/queryHelpers.js";
import { logEvent } from "../services/analytics/index.js";
import { lit, fromEnum } from "../services/analytics/safeMetadata.js";
import { turnOutcomeLabel } from "../bridge/inboundMessageOrigin.js";
import { sleep } from "../utils/sleep.js";
import { stopAllRunningTasks, stopObserverAgents, stopTask } from "../tasks/stopTask.js";
import { settlePendingPrLinks } from "../tools/shared/gitOperationTracking.js";
import { killAutoReactSubscriptions } from "../services/artifacts/frameLive.js";
import {
  drainQueuedTaskNotifications,
  artifactWatchStopNotice,
} from "../tasks/MonitorWsTask/MonitorWsTask.js";
import { commandQueueManager } from "../utils/messageQueueManager.js";
import {
  isBypassPermissionsModeDisabled,
  isAutoModeGateEnabled,
} from "../utils/permissions/permissionSetup.js";
import { expandPath } from "../utils/path.js";
import { collectContextData } from "../commands/context/context-noninteractive.js";
import { isBackgroundTasksOff } from "../tools/AgentTool/backgroundGates.js";
import { backgroundTaskByToolUseId, backgroundAll } from "../tasks/LocalShellTask/LocalShellTask.js";
import { requestAndPickSessionTitle, requestSessionTitle } from "../utils/sessionTitle.js";
import { isPolicyAllowed } from "../services/policyLimits/policyEvidence.js";
import { sanitizeMarkName } from "../utils/startupMarks.js";
import {
  feedbackMode,
  feedbackUnavailableReason,
  submitHeadlessFeedback,
  orgFeedbackRefusalMessage,
} from "../services/feedback/submitFeedback.js";
import { readFileForRemote } from "../services/remoteTools/remoteFileRead.js";
import { EMPTY_USAGE } from "../services/api/emptyUsage.js";

//@ chunk-xx1vmpsq.js:61407-62090 placement
function thinkingTokenEstimate(e, event) {
  if (event.type === "content_block_start")
    return {
      estimate: 0,
      emission: null,
    };
  if (event.type !== "content_block_delta")
    return {
      estimate: e,
      emission: null,
    };
  let { delta } = event;
  if (delta.type === "thinking_delta") {
    let y;
    if ("estimated_tokens" in delta && typeof delta.estimated_tokens === "number") y = delta.estimated_tokens;
    else if (typeof delta.thinking === "string" && delta.thinking.length > 0)
      y = thinkingTokenEstimate_2(delta.thinking);
    if (y === undefined)
      return {
        estimate: e,
        emission: null,
      };
    let r = e + y;
    return {
      estimate: r,
      emission: {
        estimatedTokens: r,
        estimatedTokensDelta: y,
      },
    };
  }
  if (delta.type === "signature_delta" && e > 0) {
    let y = Math.ceil(signatureTokenEstimate(delta.signature.length) / 4);
    if (y > e)
      return {
        estimate: y,
        emission: {
          estimatedTokens: y,
          estimatedTokensDelta: y - e,
        },
      };
  }
  return {
    estimate: e,
    emission: null,
  };
}
//@ chunk-xx1vmpsq.js:62090-62140 placement
var VERBOSE_LOG_OPTIONS = {
  level: "verbose",
};
var LOG_FLUSH_MS = 1000;
var LOG_SINKS = [INTERRUPT_RECEIPT_V1, MSG_LIFECYCLE_V1, ASK_USER_QUESTION_UNANSWERED_V1];
//@ chunk-xx1vmpsq.js:62140-62205 placement
function cancelScopeFor(e) {
  return e === "remote"
    ? undefined
    : {
        scope: "turn-cancel",
      };
}
//@ chunk-xx1vmpsq.js:62205-62244 placement = getSettingsWithSources (0.85)
var emptySettingsWithSources = () => ({
  effective: {},
  sources: [],
});
//@ chunk-xx1vmpsq.js:62244-62917 placement
async function* runDeferredSlashCommand(engineDeferredSlash, s, abortController) {
  let messages = s.messages.filter((message) => message.uuid !== engineDeferredSlash.messageUuid);
  let { messages: messages_2 } = await processUserInput({
    input: engineDeferredSlash.text,
    mode: "prompt",
    context: {
      ...s.toolUseContext,
      abortController,
      messages,
      canUseTool: s.canUseTool,
      setMessages: () => {},
      applyMessageOp: () => {},
      onChangeAPIKey: () => {},
      deferredSlashUuid: engineDeferredSlash.messageUuid,
      options: {
        ...s.toolUseContext.options,
        ideInstallationStatus: null,
        theme: "dark",
      },
    },
    messages,
    querySource: s.querySource,
    origin: engineDeferredSlash.origin,
    onScreened: engineDeferredSlash.lineScreened,
    interactionPrompt: engineDeferredSlash.interactionPrompt,
    ownWordUuids: [],
  });
  let preservedMessages = messages_2.find(isCompactBoundaryMessage)?.compactMetadata.preservedMessages;
  let C = new Set(preservedMessages?.allUuids ?? preservedMessages?.uuids ?? []);
  for (let message of messages_2) if (!C.has(message.uuid)) yield message;
  return {
    reason: "completed",
  };
}
//@ chunk-xx1vmpsq.js:62917-88547 placement
/**
 * 2.1.316 的查询引擎（SDK/print/REPL 共用）：接收 run 回调与命令、模型、工具、MCP、插件等环境，产出 system/init、stream_event、result 等 SDK 消息并处理中断与命令生命周期。
 */
function createQueryEngine({
  run,
  queryParams,
  commands = [],
  models = [],
  unavailableModels = [],
  agents = [],
  account = {},
  outputStyle,
  availableOutputStyles,
  mcpServers = () => [],
  mcpDelegate,
  excludeDynamicSections,
  settings = emptySettingsWithSources(),
  authDelegate,
  mcpAuthDelegate,
  ambient,
  tools = [],
  skills = [],
  plugins = [],
  pluginErrors = [],
  pluginWarnings = [],
  mcpServerErrors = [],
  initialModel,
  initialPermissionMode,
  fastModeState,
  fastModeDisabledReason,
  hostOwnsPermissionMode = false,
  hostOwnsModel = false,
  sdkResultVerdict = false,
  onCommandLifecycle,
  onTurnThrow,
}) {
  let initMessageFields = buildInitMessageFields({
    commands: typeof commands === "function" ? commands() : commands,
    models: typeof models === "function" ? models() : models,
    unavailableModels: typeof unavailableModels === "function" ? unavailableModels() : unavailableModels,
    agents: typeof agents === "function" ? agents() : agents,
    account,
    outputStyle,
    availableOutputStyles,
  });
  let gt = new Stream();
  let Be = [];
  let dt = 0;
  let Re = null;
  let Yt = () => (Re && !Re.signal.aborted ? Re : new AbortController()).signal;
  let Ye = null;
  let kt = null;
  let Je = null;
  let ut = null;
  let sessionId = getSessionId();
  let q = currentNotificationKeyAlias();
  if (q !== sessionId && q !== CLIENT_SURFACE_ID)
    logForDebugging(
      `[engine] sdkEventQueue push key '${q}' \u2260 engine sessionId '${sessionId}' \u2014 host ALS wiring likely incorrect; enqueued SdkEvents will not drain here`,
    );
  let se = (h) => ({
    ...h,
    session_id: sessionId,
    uuid: "uuid" in h && typeof h.uuid === "string" ? h.uuid : randomUUID(),
  });
  let he = (h) => (typeof h === "function" ? h() : h);
  let Wt = () => {
    let h = he(ambient);
    if (!h) return null;
    let commands_2 = typeof commands === "function" ? commands() : commands;
    let D = typeof agents === "function" ? agents() : agents;
    return buildSystemInitMessage({
      ...h,
      sessionId,
      tools,
      mcpClients: mcpServers().map((O) => ({
        name: O.name,
        type: O.status,
        source: O.source,
      })),
      model: Ye ?? he(initialModel) ?? "",
      permissionMode: kt ?? he(initialPermissionMode) ?? "default",
      commands: commands_2,
      agents: D.map((O) => ({
        agentType: O.name,
      })),
      skills,
      plugins,
      pluginErrors,
      pluginWarnings,
      mcpServerErrors,
      additionalDirectories: undefined,
      fastModeState: he(fastModeState) ?? "off",
      fastModeDisabledReason: he(fastModeDisabledReason),
      capabilities: LOG_SINKS,
    });
  };
  let lt = false;
  let Jt = 0;
  let L = null;
  let pe = false;
  let remoteFileState = createRemoteFileState(READ_FILE_STATE_CACHE_SIZE);
  let Xe = [];
  let Et = false;
  let be = [];
  let Ee = false;
  let Ne = (h) => {
    if (Xe.length >= LOG_FLUSH_MS) {
      Xe.shift();
      if (!Et) {
        Et = true;
        logError(
          Error(
            "[engine] pendingDenialFrames buffer is full; dropping oldest permission_denied advisory frames",
          ),
        );
      }
    }
    Xe.push(h);
  };
  function* qt() {
    while (Xe.length > 0) {
      let h = Xe.shift();
      logForDebugging(`[engine] yield ${h.type}/${h.subtype}`, VERBOSE_LOG_OPTIONS);
      yield se(h);
    }
  }
  let Se = [];
  function Kt(h, P) {
    try {
      onCommandLifecycle?.(h, P);
    } catch (error) {
      logError(error);
    }
  }
  function zt(error) {
    try {
      onTurnThrow?.({
        error,
      });
    } catch (error) {
      logError(error);
    }
  }
  function je(uuid, P) {
    Kt(uuid, P);
    return {
      type: "command_lifecycle",
      command_uuid: uuid,
      state: P,
    };
  }
  function* We() {
    while (Se.length > 0) {
      let h = Se.shift();
      logForDebugging(`[engine] yield command_lifecycle/${h.state}`, VERBOSE_LOG_OPTIONS);
      yield se(h);
    }
  }
  function* Me() {
    yield* qt();
    yield* We();
    for (let h of drainNotificationsForSession(sessionId)) {
      logForDebugging(`[engine] yield sdk-queue system/${h.subtype}`, VERBOSE_LOG_OPTIONS);
      yield se(h);
    }
  }
  function* et() {
    while (be.length > 0)
      yield withResultExtras(be.shift(), {
        totalCostUsd: getTotalCostUSD(),
        durationApiMs: getTotalAPIDuration(),
        modelUsage: getModelUsage(),
        usage: aggregateModelUsage(),
        subagentStats: buildFileHistorySnapshotChain(L?.toolUseContext?.session),
        safetyStops: getSafetyStops(),
      });
  }
  let xe = () => {
    if (!Ee) return false;
    let getAppState = L?.toolUseContext?.getAppState;
    return (
      getAppState !== undefined &&
      getRunningTasks(getAppState()).some((P) => isWaitableAgentOrWorkflow(P) && waitForTaskCompletion(P))
    );
  };
  function* pt(h, P) {
    if (xe()) be.push(h);
    else {
      yield* et();
      yield h;
    }
    if (P) yield se(P);
  }
  async function* xt() {
    lt = false;
    let h = Wt();
    if (h) {
      logForDebugging("[engine] yield system/init (first)");
      yield se(h);
    }
    for await (let P of gt) {
      if (lt) {
        lt = false;
        let ie = Wt();
        if (ie) {
          logForDebugging("[engine] yield system/init (re-emit)");
          yield se(ie);
        }
      }
      yield* Me();
      rearmCreditsExhaustedNotice();
      let startTime = performance.now();
      let O = {
        parent_tool_use_id: P.parent_tool_use_id,
        priority: P.priority,
        shouldQuery: P.shouldQuery,
        timestamp: P.timestamp,
      };
      let G;
      try {
        G = await queryParams(P);
      } catch (error) {
        logError(error);
        zt(error);
        Be.shift();
        let S = P.uuid !== undefined ? je(P.uuid, "cancelled") : undefined;
        if (sdkResultVerdict) setAutoModeUnavailableStopNotice(undefined);
        yield* Me();
        let V = {
          ...buildResultMessage({
            startedAt: startTime,
            common: {
              is_error: true,
              duration_api_ms: 0,
              num_turns: 0,
              stop_reason: null,
              session_id: sessionId,
              total_cost_usd: getTotalCostUSD(),
              usage: aggregateModelUsage(),
              modelUsage: getModelUsage(),
              permission_denials: [],
              terminal_reason: "turn_setup_failed",
              fast_mode_state: he(fastModeState),
              fast_mode_disabled_reason: he(fastModeDisabledReason),
              origin: P.origin,
              subagent_stats: buildFileHistorySnapshotChain(L?.toolUseContext?.session),
              safety_stops: getSafetyStops(),
            },
            variant: {
              subtype: "error_during_execution",
              errors: [`queryParams builder failed: ${errorMessage(error)}`],
              user_message_uuid: undefined,
            },
          }),
          ...O,
        };
        yield* pt(V, S);
        continue;
      }
      dt++;
      L = G;
      let abortController = new AbortController();
      Re = abortController;
      let Ce = Be[0];
      if (Ce !== undefined) Ce.status = "armed";
      if (P.uuid !== undefined) Se.push(je(P.uuid, "started"));
      let signal = G.toolUseContext?.abortController?.signal;
      let rt = () => abortController.abort(signal?.reason);
      if (signal?.aborted) abortController.abort(signal.reason);
      else
        signal?.addEventListener("abort", rt, {
          once: true,
        });
      let abortController_2 = G.toolUseContext?.abortController;
      let Dt = () => {
        if (
          unwrapAbortReason(abortController.signal.reason) === "refusal-fallback-edit" &&
          abortController_2 &&
          !abortController_2.signal.aborted
        )
          abortController_2.abort(abortController.signal.reason);
      };
      abortController.signal.addEventListener("abort", Dt, {
        once: true,
      });
      logForDebugging(`[engine] turn ${dt} start`);
      let yt = getMinDebugLogLevel() === "verbose";
      let Xt = [];
      let rs = (ie, S, toolInput) => {
        if (Xt.some((Ke) => Ke.tool_use_id === S)) return;
        Xt.push({
          tool_name: toolNameForInit(ie.name),
          tool_use_id: S,
          tool_input: toolInput,
        });
      };
      let canUseTool = G.canUseTool;
      let canUseTool_2 = async (ie, toolInput, V, Ke, Pt, At) => {
        let Oe = await canUseTool(ie, toolInput, V, Ke, Pt, At);
        if (isRecordableDenial(Oe, At)) rs(ie, Pt, toolInput);
        if (Oe.behavior === "deny" && isPreAskDeny(Oe) && !isInvalidInputDeny(Oe))
          Ne({
            type: "system",
            subtype: "permission_denied",
            tool_name: ie.name,
            tool_use_id: Pt,
            agent_id: V.agentId,
            decision_reason_type: Oe.decisionReason?.type,
            decision_reason_code: decisionReasonCode(Oe.decisionReason),
            decision_reason: serializeDecisionReason(Oe.decisionReason),
            message: Oe.message,
          });
        return Oe;
      };
      if (remoteFileState.size > 0 && G.toolUseContext?.readFileState) {
        for (let [ie, S] of remoteFileState.entries()) {
          let V = G.toolUseContext.readFileState.get(ie);
          if (!V || S.timestamp > V.timestamp) G.toolUseContext.readFileState.set(ie, S);
        }
        remoteFileState.clear();
      }
      let ce = G.engineDeferredSlash
        ? runDeferredSlashCommand(G.engineDeferredSlash, G, abortController)
        : run({
            ...G,
            canUseTool: canUseTool_2,
            keepPartialMessageOnAbort: true,
            takePlainDelta:
              G.takePlainDelta === undefined || G.toolUseContext?.options?.maxBudgetUsd !== undefined
                ? undefined
                : guardGoalCheck(
                    "engine",
                    () => Xe.length === 0 && Se.length === 0 && !hasQueuedNotificationsForSession(sessionId),
                    G.takePlainDelta,
                  ),
            toolUseContext: {
              ...G.toolUseContext,
              abortController,
              onPermissionDenial: rs,
              permissionLayers:
                (!hostOwnsModel && Ye !== null) ||
                (!hostOwnsPermissionMode && kt !== null) ||
                Je !== null ||
                ut !== null
                  ? [
                      ...(G.toolUseContext?.permissionLayers ?? []),
                      ...(!hostOwnsModel && Ye !== null
                        ? [
                            {
                              kind: "model",
                              mainLoopModel: Ye,
                            },
                          ]
                        : []),
                      ...(!hostOwnsPermissionMode && kt !== null
                        ? [
                            {
                              kind: "permission_mode",
                              mode: kt,
                            },
                          ]
                        : []),
                      ...(Je !== null
                        ? [
                            {
                              kind: "max_thinking_tokens",
                              maxThinkingTokens: Je,
                            },
                          ]
                        : []),
                      ...(ut !== null
                        ? [
                            {
                              kind: "flag_settings",
                              settings: ut,
                            },
                          ]
                        : []),
                    ]
                  : G.toolUseContext?.permissionLayers,
            },
          });
      let me = null;
      let ht = false;
      let ot = G.engineDeferredSlash ? 0 : 1;
      let stopReason = null;
      let qe = [];
      let $t;
      let es = "";
      let bt = false;
      let os = null;
      let ts;
      let ss;
      let ns;
      let is = "";
      let Vt = [];
      let cs = new Set();
      let Ps = null;
      let as;
      let ps;
      let maxBudgetUsd = G.toolUseContext?.options?.maxBudgetUsd;
      let last = getInMemoryErrors().at(-1);
      let Zt;
      try {
        let ie = await ce.next();
        while (!ie.done) {
          let S = ie.value;
          if (S.type === "user") {
            if (!G.engineDeferredSlash) ot++;
            qe.push(S);
            es = "";
            bt = false;
            os = null;
            ts = undefined;
            ss = undefined;
            ns = undefined;
            is = "";
          } else if (S.type === "tombstone") {
            {
              let uuid = S.message?.uuid;
              let Ke = uuid !== undefined ? qe.findLastIndex((Pt) => Pt.uuid === uuid) : qe.length - 1;
              if (Ke >= 0) qe.splice(Ke, 1);
            }
            {
              let message = S.message;
              if (message?.type === "assistant") {
                let content = message.message.content;
                let Pt = Array.isArray(content)
                  ? content.flatMap((At) =>
                      At.type === "tool_use" && At.name === STRUCTUREDOUTPUT ? [At.id] : [],
                    )
                  : [];
                if (Pt.length > 0) {
                  for (let Oe of Pt) cs.add(Oe);
                  let At = (Oe) => Oe.toolUseID === undefined || Pt.includes(Oe.toolUseID);
                  Vt = Vt.filter((Oe) => !At(Oe));
                }
              }
            }
            es = "";
            bt = false;
            os = null;
            ts = undefined;
            ss = undefined;
            ns = undefined;
            is = "";
          } else if (S.type === "assistant") {
            Ps ??= performance.now();
            qe.push(S);
            if (S.message.stop_reason != null) stopReason = S.message.stop_reason;
            bt = S.isApiErrorMessage === true;
            os = S.apiErrorStatus ?? null;
            ts = S.apiErrorCode;
            ss = S[MESSAGE_MARK_SYMBOLS_2];
            ns = bt ? S.apiError : undefined;
            let V = yj(S.message.content);
            let text = V?.type === "text" ? V.text : "";
            if (bt) {
              is = SYNTHETIC_MESSAGES.has(text) ? "" : stripMemoryTags(text);
              es = "";
            } else es = SYNTHETIC_MESSAGES.has(text) ? "" : stripMemoryTags(text);
          } else if (
            S.type === "stream_event" &&
            S.event.type === "message_delta" &&
            S.event.delta.stop_reason != null
          )
            stopReason = S.event.delta.stop_reason;
          else if (S.type === "attachment" && S.attachment.type === "structured_output") {
            if (!(S.attachment.toolUseID !== undefined ? cs.has(S.attachment.toolUseID) : cs.size > 0))
              Vt = [
                ...Vt,
                {
                  toolUseID: S.attachment.toolUseID,
                  data: S.attachment.data,
                },
              ];
          } else if (S.type === "attachment" && S.attachment.type === "max_turns_reached")
            $t = {
              turnCount: S.attachment.turnCount,
              maxTurns: S.attachment.maxTurns,
            };
          else if (S.type === "attachment" && S.attachment.type === "hook_deferred_tool")
            as = {
              id: S.attachment.toolUseID,
              name: S.attachment.toolName,
              input: S.attachment.toolInput,
            };
          if (Xe.length > 0) yield* qt();
          if (Se.length > 0) yield* We();
          ps = reduceCompactResponseLength(ps, S);
          if (S.type === "stream_event") {
            let V = thinkingTokenEstimate(Jt, S.event);
            Jt = V.estimate;
            if (V.emission) {
              yield se({
                type: "system",
                subtype: "thinking_tokens",
                estimated_tokens: V.emission.estimatedTokens,
                estimated_tokens_delta: V.emission.estimatedTokensDelta,
              });
              if (yt) logForDebugging("[engine] yield-twin system/thinking_tokens", VERBOSE_LOG_OPTIONS);
            }
          }
          if (yt)
            logForDebugging(
              `[engine] yield ${S.type}/${"subtype" in S ? S.subtype : "-"}`,
              VERBOSE_LOG_OPTIONS,
            );
          if (S.type === "command_lifecycle") yield se(je(S.uuid, S.state));
          else if (S.type === "notification") {
            let notification = S.notification;
            yield se({
              type: "system",
              subtype: "notification",
              key: notification.key,
              text: notification.text,
              priority: notification.priority,
              ...(notification.color !== undefined && {
                color: notification.color,
              }),
              ...(notification.timeoutMs !== undefined && {
                timeout_ms: notification.timeoutMs,
              }),
            });
          } else if (S.type === "sdk_status")
            yield se({
              type: "system",
              subtype: "status",
              status: S.status,
              ...(ps !== undefined && {
                compact_output_chars: ps,
              }),
              ...(S.metadata?.compactResult !== undefined && {
                compact_result: S.metadata.compactResult,
              }),
              ...(S.metadata?.compactError !== undefined && {
                compact_error: S.metadata.compactError,
              }),
            });
          else if (S.type === "stream_request_start")
            yield se({
              type: "system",
              subtype: "status",
              status: "requesting",
            });
          else if (S.type === "system" && S.subtype === "compact_boundary")
            yield se({
              type: "system",
              subtype: "compact_boundary",
              uuid: S.uuid,
              compact_metadata: toSDKCompactMetadata(S.compactMetadata),
              ...(S.logicalParentUuid !== undefined && {
                logical_parent_uuid: S.logicalParentUuid,
              }),
            });
          else if (S.type === "system" && S.subtype === "model_refusal_fallback")
            yield se({
              type: "system",
              subtype: "model_refusal_fallback",
              uuid: S.uuid,
              trigger: S.trigger,
              direction: S.direction,
              ...(S.scope !== undefined && {
                scope: S.scope,
              }),
              original_model: S.originalModel,
              fallback_model: S.fallbackModel,
              request_id: S.requestId,
              api_refusal_category: S.apiRefusalCategory ?? null,
              api_refusal_explanation: S.apiRefusalExplanation ?? null,
              ...(S.retractedMessageUuids !== undefined && {
                retracted_message_uuids: S.retractedMessageUuids,
              }),
              refused_user_message_uuid: S.refusedUserMessageUuid ?? null,
              content: S.content,
              ...(S.sawCyberRefusal && {
                saw_cyber_refusal: true,
              }),
              ...(S.provisional && {
                provisional: S.provisional,
              }),
            });
          else if (S.type === "system" && S.subtype === "model_refusal_no_fallback")
            yield se({
              type: "system",
              subtype: "model_refusal_no_fallback",
              uuid: S.uuid,
              original_model: S.originalModel,
              request_id: S.requestId,
              api_refusal_category: S.apiRefusalCategory ?? null,
              api_refusal_explanation: S.apiRefusalExplanation ?? null,
              refused_user_message_uuid: S.refusedUserMessageUuid ?? null,
              content: S.content,
            });
          else if (S.type === "system" && S.subtype === "model_fallback")
            yield se({
              type: "system",
              subtype: "model_fallback",
              uuid: S.uuid,
              trigger: S.trigger,
              original_model: S.originalModel,
              fallback_model: S.fallbackModel,
              content: S.content,
            });
          else if (S.type === "system" && S.subtype === "model_consent_fallback")
            yield se({
              ...toSDKModelConsentFallbackMessage(S),
              uuid: S.uuid,
            });
          else if (S.type === "tool_use_summary")
            yield se({
              ...createToolUseSummaryMessage(S),
              uuid: S.uuid,
            });
          else if (S.type === "system" && S.subtype === "read_divider");
          else yield se(S);
          if (S.type === "system" && S.subtype === "api_error")
            yield se({
              type: "system",
              subtype: "api_retry",
              attempt: S.retryAttempt,
              max_retries: S.maxRetries,
              retry_delay_ms: S.retryInMs,
              error_status: S.error.status ?? null,
              error: categorizeRetryableAPIError(S.error),
              ...(S.error.noResponse && {
                no_response: {
                  waited_ms: S.error.noResponse.waitedMs,
                  retry_wait_ms: S.error.noResponse.retryWaitMs,
                },
              }),
            });
          if (S.type === "attachment" && S.attachment.type === "relevant_memories") {
            let V = memoryRecallMessage(S.attachment.memories);
            if (V) {
              let { uuid, session_id: sessionId, ...At } = V;
              yield se(At);
            }
          }
          if (
            S.type === "system" &&
            S.subtype === "local_command" &&
            typeof S.content === "string" &&
            (S.content.includes(`<${LOCAL_COMMAND_STDOUT}>`) ||
              S.content.includes(`<${LOCAL_COMMAND_STDERR}>`))
          ) {
            let V = localCommandOutputToSDKAssistantMessage(
              S.content,
              S.uuid,
              S.timestamp,
              S.contextUsage,
              S.commandRun,
              S.usageReport,
              S.commandOutcome,
            );
            if (V) {
              yield se(V);
              logForDebugging("[engine] yield-twin assistant (local_command)", VERBOSE_LOG_OPTIONS);
            }
          }
          if (
            S.type === "progress" &&
            (S.data.type === "bash_progress" || S.data.type === "powershell_progress")
          ) {
            yield se({
              type: "tool_progress",
              tool_use_id: S.toolUseID,
              tool_name: S.data.type === "bash_progress" ? BASH_TOOL_NAME : POWERSHELL_TOOL_NAME,
              parent_tool_use_id: S.parentToolUseID || null,
              elapsed_time_seconds: S.data.elapsedTimeSeconds,
              task_id: S.data.taskId,
            });
            logForDebugging("[engine] yield-twin tool_progress", VERBOSE_LOG_OPTIONS);
          }
          if (S.type === "progress" && S.data.type === "tool_heartbeat") {
            yield se({
              type: "tool_progress",
              tool_use_id: S.toolUseID,
              tool_name: S.data.toolName,
              parent_tool_use_id: S.parentToolUseID || null,
              elapsed_time_seconds: S.data.elapsedTimeSeconds,
              heartbeat: true,
            });
            logForDebugging("[engine] yield-twin tool_progress heartbeat", VERBOSE_LOG_OPTIONS);
          }
          if (S.type === "progress" && S.data.type === "agent_api_retry") {
            yield se({
              type: "tool_progress",
              tool_use_id: S.toolUseID,
              tool_name: AGENT,
              parent_tool_use_id: S.parentToolUseID || null,
              elapsed_time_seconds: 0,
              subagent_type: S.data.agentType,
              ...(S.data.resolved !== true && {
                subagent_retry: {
                  agent_id: S.data.agentId,
                  attempt: S.data.attempt,
                  max_retries: S.data.maxRetries,
                  retry_delay_ms: S.data.retryDelayMs,
                  error_status: S.data.errorStatus ?? null,
                  error_category: S.data.errorCategory,
                },
              }),
            });
            logForDebugging("[engine] yield-twin tool_progress subagent_retry", VERBOSE_LOG_OPTIONS);
          }
          for (let V of drainNotificationsForSession(sessionId)) {
            logForDebugging(`[engine] yield sdk-queue system/${V.subtype}`, VERBOSE_LOG_OPTIONS);
            yield se(V);
          }
          if (
            $t === undefined &&
            S.type !== "sdk_status" &&
            S.type !== "compact_progress" &&
            S.type !== "stream_mode" &&
            S.type !== "response_length" &&
            hasReachedBudget(maxBudgetUsd)
          ) {
            Zt = "budget_exhausted";
            break;
          }
          ie = await ce.next();
        }
        logFeatureOk("shoji_engine");
        if (ie.done) Zt = ie.value ? ie.value.reason : undefined;
      } catch (error) {
        me = errorMessage(error);
        zt(error);
      } finally {
        ht = abortController.signal.aborted;
        await ce.return(undefined).catch(() => {});
        signal?.removeEventListener("abort", rt);
        abortController.signal.removeEventListener("abort", Dt);
        let ie = aggregateModelUsage();
        logForDebugging(
          `[engine] turn ${dt} end (turns=${ot} usage in=${ie.input_tokens} out=${ie.output_tokens} cost=$${getTotalCostUSD().toFixed(4)} api=${getTotalAPIDuration()}ms stop=${stopReason} resultLen=${es.length})`,
        );
      }
      let message = qe.findLast((ie) => !isHarnessCompanionMessage(ie)) ??
        qe.at(-1) ?? {
          type: "user",
          message: P.message,
        };
      let On = sdkResultVerdict ? G.engineDeferredSlash === undefined : isAbortedTerminalReason(Zt);
      let ds =
        unwrapAbortReason(abortController.signal.reason) === "permission-stop"
          ? (getNoServerCheckStoppedNotice() ?? buildUserUnavailableNotice(gatewayDisplayName()))
          : undefined;
      let js =
        me !== null
          ? [me]
          : sdkResultVerdict && ds !== undefined
            ? [formatResultDiagnostic(message, stopReason), ds]
            : On && as === undefined && !isResultSuccessful(message, stopReason)
              ? buildEmptyResultDiagnostics(message, stopReason, last)
              : null;
      let Cs = stopReason === "refusal" && Vt.length > 0;
      let As = Cs ? undefined : Vt.at(-1)?.data;
      try {
        if (
          bt &&
          isRecoverableTrailingServerError({
            trailing: message,
            preceding: qe.at(-2),
            terminalReason: Zt,
            retractionExhausted: Vt.length === 0 && cs.size > 0,
          })
        ) {
          bt = false;
          os = null;
          ts = undefined;
          ss = undefined;
          ns = undefined;
          is = "";
          stopReason = "tool_use";
          logEvent("tengu_trailing_api_error_notice_skipped", {
            engine: lit("session_engine"),
            has_structured_output: Vt.length > 0,
          });
        }
      } catch (error) {
        logError(error);
      }
      let Rs = bt ? is : es;
      if (Rs === "" && As !== undefined) Rs = JSON.stringify(As);
      let gs = {
        duration_api_ms: getTotalAPIDuration(),
        stop_reason: stopReason,
        session_id: sessionId,
        total_cost_usd: getTotalCostUSD(),
        usage: aggregateModelUsage(),
        modelUsage: getModelUsage(),
        permission_denials: Xt,
        terminal_reason: Zt,
        fast_mode_state: he(fastModeState),
        fast_mode_disabled_reason: he(fastModeDisabledReason),
        origin: P.origin,
        subagent_stats: buildFileHistorySnapshotChain(G.toolUseContext?.session),
        safety_stops: getSafetyStops(),
      };
      let Ws =
        Zt === "budget_exhausted"
          ? {
              ...buildResultMessage({
                startedAt: startTime,
                common: {
                  ...gs,
                  is_error: true,
                  num_turns: ot,
                },
                variant: {
                  subtype: "error_max_budget_usd",
                  errors: [maxBudgetReachedMessage(maxBudgetUsd)],
                  user_message_uuid: undefined,
                },
              }),
              ...O,
            }
          : me === null && as === undefined && $t
            ? {
                ...buildResultMessage({
                  startedAt: startTime,
                  common: {
                    ...gs,
                    is_error: true,
                    num_turns: $t.turnCount,
                  },
                  variant: {
                    subtype: "error_max_turns",
                    errors: [`Reached maximum number of turns (${$t.maxTurns})`],
                    user_message_uuid: undefined,
                  },
                }),
                ...O,
              }
            : js !== null
              ? {
                  ...buildResultMessage({
                    startedAt: startTime,
                    common: {
                      ...gs,
                      is_error: true,
                      num_turns: ot,
                    },
                    variant: {
                      subtype: "error_during_execution",
                      errors: js,
                      user_message_uuid: undefined,
                    },
                  }),
                  ...O,
                }
              : {
                  ...buildResultMessage({
                    startedAt: startTime,
                    common: {
                      ...gs,
                      ...(as !== undefined && {
                        stop_reason: "tool_deferred",
                      }),
                      is_error: bt || Cs,
                      num_turns: ot,
                    },
                    variant: {
                      subtype: "success",
                      api_error_status: os,
                      ...(ts !== undefined && {
                        api_error_code: ts,
                      }),
                      ...(ss !== undefined && {
                        api_error_origin: ss,
                      }),
                      ...(ns !== undefined && {
                        api_error: ns,
                      }),
                      result: Rs,
                      structured_output: As,
                      ttft_ms: !bt && Ps !== null ? Math.max(0, Math.round(Ps - startTime)) : undefined,
                      deferred_tool_use: as,
                    },
                  }),
                  ...O,
                };
      if (Cs && Ws.subtype === "success")
        try {
          logEvent("tengu_structured_output_refusal_dropped", {
            api_error_latched: bt,
          });
        } catch (error) {
          logError(error);
        }
      let qs;
      if (P.uuid !== undefined) qs = je(P.uuid, me !== null ? "cancelled" : turnOutcomeLabel(Zt, ht));
      Be.shift();
      if (sdkResultVerdict) setAutoModeUnavailableStopNotice(ds);
      else if (ds !== undefined) yield se(createSystemMessage(ds, "warning"));
      yield* Me();
      yield* pt(Ws, qs);
    }
    while (be.length > 0 && !Re?.signal.aborted && xe()) {
      yield* Me();
      await sleep(100);
    }
    if (be.length > 0 && Re?.signal.aborted && L?.toolUseContext?.taskRegistry) {
      let { taskRegistry, setAppState, storageV5 } = L.toolUseContext;
      stopAllRunningTasks({
        taskRegistry,
        setAppState,
        storageV5,
      });
    }
    await settlePendingPrLinks();
    yield* Me();
    yield* et();
  }
  function Tt() {
    try {
      we();
      for (let { intent, status } of Be.splice(0))
        if (intent.uuid !== undefined) Kt(intent.uuid, status === "armed" ? "cancelled" : "discarded");
    } catch (error) {
      logError(
        Error("[engine] abandonment sweep failed", {
          cause: error,
        }),
      );
    }
  }
  let Ut = false;
  async function* x() {
    Ut = true;
    try {
      yield* xt();
    } finally {
      Tt();
    }
  }
  function ke(h) {
    switch (h.type) {
      case "turn":
        if (Ee) {
          logForDebugging("[engine] dropped turn intent received after close()", {
            level: "warn",
          });
          break;
        }
        Be.push({
          intent: h,
          status: "queued",
        });
        if (h.uuid !== undefined) Se.push(je(h.uuid, "queued"));
        gt.enqueue(h);
        break;
      case "interrupt": {
        Re?.abort(h.reason !== undefined ? new DOMException(h.reason, "AbortError") : undefined);
        if (h.scope !== "turn-cancel") {
          let taskRegistry = L?.toolUseContext?.taskRegistry;
          let D = 0;
          if (L?.toolUseContext !== undefined && taskRegistry !== undefined) {
            D = killAutoReactSubscriptions(taskRegistry, {
              durable: false,
            });
            let { setAppState } = L.toolUseContext;
            stopObserverAgents({
              taskRegistry,
              setAppState,
            });
          }
          let O = drainQueuedTaskNotifications(commandQueueManager(), {
            leaveArtifactRooms: true,
          });
          artifactWatchStopNotice(D, O);
        }
        break;
      }
      case "set_model":
        Ye = h.model ?? null;
        lt = true;
        logForDebugging(`[engine] send set_model model=${h.model}`);
        break;
      case "set_permission_mode": {
        let permissionMode = parsePermissionMode(h.mode);
        if (permissionMode === undefined) {
          logForDebugging("[engine] set_permission_mode rejected \u2014 unrecognized mode");
          break;
        }
        if (permissionMode === "bypassPermissions" && isBypassPermissionsModeDisabled()) {
          logForDebugging(
            "[engine] set_permission_mode:bypassPermissions rejected \u2014 disabled by settings",
          );
          break;
        }
        if (permissionMode === "auto" && !isAutoModeGateEnabled()) {
          logForDebugging("[engine] set_permission_mode:auto rejected \u2014 gate not enabled");
          break;
        }
        kt = permissionMode;
        lt = true;
        break;
      }
      case "set_max_thinking_tokens":
        Je = h.max_thinking_tokens;
        logForDebugging(`[engine] send set_max_thinking_tokens max=${h.max_thinking_tokens}`);
        break;
      case "apply_flag_settings":
        ut = {
          ...(ut ?? {}),
          ...h.settings,
        };
        logForDebugging(`[engine] send apply_flag_settings keys=${Object.keys(h.settings).join(",")}`);
        break;
      case "seed_read_state":
        remoteFileState.set(h.path, h.seed);
        logForDebugging(`[engine] send seed_read_state path=${h.path}`);
        break;
    }
  }
  function we() {
    Ee = true;
    gt.done();
  }
  let Pe = x();
  let B = Pe.return.bind(Pe);
  let H = Pe.throw.bind(Pe);
  function oe() {
    we();
    if (!Ut) Tt();
  }
  Pe.return = (h) => {
    oe();
    return B(h);
  };
  Pe.throw = (h) => {
    oe();
    return H(h);
  };
  return Object.assign(Pe, {
    interrupt: async (reason, P) => {
      ke({
        type: "interrupt",
        reason,
        scope: P?.scope,
      });
      return {
        still_queued: Be.flatMap(({ intent, status }) =>
          status === "queued" && intent.uuid !== undefined ? [intent.uuid] : [],
        ),
      };
    },
    setModel: async (model) =>
      ke({
        type: "set_model",
        model,
      }),
    setPermissionMode: async (mode) =>
      ke({
        type: "set_permission_mode",
        mode,
      }),
    setMaxThinkingTokens: async (maxThinkingTokens) =>
      ke({
        type: "set_max_thinking_tokens",
        max_thinking_tokens: maxThinkingTokens,
      }),
    applyFlagSettings: (settings) => {
      ke({
        type: "apply_flag_settings",
        settings,
      });
      return Promise.resolve();
    },
    seedReadState: async (h, P, D) => {
      try {
        let O = expandPath(h);
        if (D !== undefined) {
          if (D.length <= 10485760)
            ke({
              type: "seed_read_state",
              path: O,
              seed: {
                content: stripBomAndCarriageReturn(D),
                timestamp: P,
                offset: undefined,
                limit: undefined,
                contentNotInModelContext: true,
              },
            });
          return;
        }
        let G = await stat(O);
        if (G.size > 10485760) return;
        let floored = Math.floor(G.mtimeMs);
        if (floored <= P) {
          let file = await readFile(O, "utf-8");
          let content = stripBomAndCarriageReturn(file);
          ke({
            type: "seed_read_state",
            path: O,
            seed: {
              content,
              timestamp: floored,
              offset: undefined,
              limit: undefined,
              contentNotInModelContext: true,
            },
          });
        }
      } catch {}
    },
    turnCount: () => dt,
    initializationResult: () => Promise.resolve(initMessageFields),
    accountInfo: () => Promise.resolve(initMessageFields.account),
    claudeAuthenticate: async (h) => {
      if (!authDelegate) throw Error("claudeAuthenticate: no authDelegate wired");
      return authDelegate.authenticate(h);
    },
    claudeOAuthCallback: async (h, P) => {
      if (!authDelegate) throw Error("claudeOAuthCallback: no authDelegate wired");
      return authDelegate.oauthCallback(h, P);
    },
    claudeOAuthWaitForCompletion: async () => {
      if (!authDelegate) throw Error("claudeOAuthWaitForCompletion: no authDelegate wired");
      return authDelegate.oauthWaitForCompletion();
    },
    supportedModels: () =>
      Promise.resolve(typeof models === "function" ? models() : initMessageFields.models),
    supportedCommands: () =>
      Promise.resolve(typeof commands === "function" ? commands() : initMessageFields.commands),
    supportedAgents: () =>
      Promise.resolve(typeof agents === "function" ? agents() : initMessageFields.agents),
    mcpServerStatus: () => Promise.resolve(mcpServers()),
    reconnectMcpServer: async (h) => {
      if (!mcpDelegate) throw Error(`reconnectMcpServer: no mcpDelegate wired (server: ${h})`);
      await mcpDelegate.reconnect(h);
    },
    toggleMcpServer: async (h, P) => {
      if (!mcpDelegate) throw Error(`toggleMcpServer: no mcpDelegate wired (server: ${h})`);
      await mcpDelegate.toggle(h, P);
    },
    setMcpServers: async (h) => {
      if (!mcpDelegate)
        throw Error(`setMcpServers: no mcpDelegate wired (${Object.keys(h).length} server(s))`);
      return mcpDelegate.setServers(h);
    },
    reloadPlugins: async () => {
      if (!mcpDelegate) throw Error("reloadPlugins: no mcpDelegate wired");
      return mcpDelegate.reloadPlugins();
    },
    mcpAuthenticate: async (h, P) => {
      if (!mcpAuthDelegate) throw Error(`mcpAuthenticate: no mcpAuthDelegate wired (server: ${h})`);
      return mcpAuthDelegate.authenticate(h, P);
    },
    mcpClearAuth: async (h) => {
      if (!mcpAuthDelegate) throw Error(`mcpClearAuth: no mcpAuthDelegate wired (server: ${h})`);
      return mcpAuthDelegate.clearAuth(h);
    },
    mcpSubmitOAuthCallbackUrl: async (h, P) => {
      if (!mcpAuthDelegate) throw Error(`mcpSubmitOAuthCallbackUrl: no mcpAuthDelegate wired (server: ${h})`);
      return mcpAuthDelegate.submitOAuthCallbackUrl(h, P);
    },
    getContextUsage: async (h) => {
      if (L === null) throw Error("getContextUsage: no turn received yet");
      let { messages, toolUseContext } = L;
      return await collectContextData({
        session: toolUseContext.session,
        messages,
        getAppState: toolUseContext.getAppState,
        getMcp: toolUseContext.getMcp,
        storageV5: toolUseContext.storageV5,
        credentials: toolUseContext.credentials,
        options: {
          mainLoopModel: toolUseContext.options.mainLoopModel,
          tools: toolUseContext.options.tools,
          agentDefinitions: toolUseContext.options.agentDefinitions,
          customSystemPrompt: toolUseContext.options.customSystemPrompt,
          appendSystemPrompt: toolUseContext.options.appendSystemPrompt,
          systemPromptSnapshot: toolUseContext.options.systemPromptSnapshot,
          excludeDynamicSections,
          mcpClients: toolUseContext.options.mcpClients,
        },
        detail: h?.detail,
      });
    },
    stopTask: async (h) => {
      if (L === null) throw Error("stopTask: no turn received yet");
      let { taskRegistry, setAppState, getAppState, session, storageV5 } = L.toolUseContext;
      await stopTask(h, {
        taskRegistry,
        setAppState,
        session,
        getAppState,
        source: "client",
        storageV5,
      });
    },
    backgroundTasks: async (toolUseId) => {
      if (isBackgroundTasksOff()) {
        logFeatureBad("task_local_shell_background_all", "disabled");
        throw Error("Background tasks are disabled in this session.");
      }
      if (L === null) return !toolUseId;
      let { taskRegistry } = L.toolUseContext;
      if (toolUseId) return backgroundTaskByToolUseId(toolUseId, taskRegistry);
      backgroundAll(taskRegistry);
      return true;
    },
    getSettings: () => Promise.resolve(settings),
    generateSessionTitle: async (h, P) => {
      if (P?.persist) pe = true;
      let D = await requestAndPickSessionTitle(h, Yt(), P?.credentials);
      if (D && P?.persist)
        try {
          saveAiGeneratedTitle(getSessionId(), D, L?.toolUseContext.storageV5);
        } catch (error) {
          if (isFsInaccessible(error)) logForDebugging(`saveAiGeneratedTitle failed: ${error}`);
          else logError(error);
        }
      return D;
    },
    requestSessionTitle: (text, P) => requestSessionTitle(text, Yt(), P?.credentials),
    messageRated: async ({ messageUuid, sentiment, surface = "tool_use", cleared = false }) => {
      if (isPolicyAllowed("allow_product_feedback"))
        logEvent("tengu_message_rated", {
          message_uuid: sanitizeMarkName(messageUuid),
          sentiment: fromEnum(sentiment),
          surface: fromEnum(surface),
          cleared,
        });
    },
    askSideQuestion: async (question, P) => {
      let { getLastCacheSafeParams } = await import("./chunk-qnggsbt9.js");
      let lastCacheSafeParams = getLastCacheSafeParams();
      if (lastCacheSafeParams === null) return null;
      let { runSideQuestion } = await import("./chunk-4ycax738.js");
      let { createAbortController } = await import("./chunk-t8denxed.js");
      let Ce = await runSideQuestion({
        question,
        cacheSafeParams: {
          ...lastCacheSafeParams,
          toolUseContext: {
            ...lastCacheSafeParams.toolUseContext,
            abortController: createAbortController(),
          },
        },
        threadHistory: false,
        ...(P?.history?.length && {
          history: P.history.map((Ae) => ({
            question: Ae.question,
            response: Ae.response,
            ...(Ae.fallback_notice && {
              fallbackNotice: Ae.fallback_notice,
            }),
          })),
        }),
      });
      return Ce.response === null
        ? null
        : {
            response: Ce.response,
            synthetic: Ce.synthetic,
            ...(Ce.refusalFallback && {
              refusalFallback: Ce.refusalFallback,
            }),
          };
    },
    rewindFiles: async (h, P) => {
      if (L === null)
        return {
          canRewind: false,
          error: "rewindFiles: no turn received yet",
        };
      let { fileHistoryEnabled, fileHistoryCanRestore, fileHistoryGetDiffStats, fileHistoryRewind } =
        await import("./chunk-4skjwhe2.js");
      let appState = L.toolUseContext.getAppState();
      if (!fileHistoryEnabled())
        return {
          canRewind: false,
          error: "File rewinding is not enabled.",
        };
      if (!fileHistoryCanRestore(appState.fileHistory, h))
        return {
          canRewind: false,
          error: "No file checkpoint found for this message.",
        };
      if (P?.dryRun ?? false) {
        let rt = await fileHistoryGetDiffStats(appState.fileHistory, h);
        return {
          canRewind: true,
          filesChanged: rt?.filesChanged,
          insertions: rt?.insertions,
          deletions: rt?.deletions,
        };
      }
      let Ae;
      try {
        Ae = await fileHistoryRewind(() => appState.fileHistory, h);
      } catch (error) {
        return {
          canRewind: false,
          error: `Failed to rewind: ${errorMessage(error)}`,
        };
      }
      return {
        canRewind: true,
        skippedLinks: Ae?.skippedLinks,
      };
    },
    submitFeedback: async (description, P) => {
      if (P?.draft_id == null) {
        if (L === null)
          return {
            feedback_id: null,
            unavailable_reason:
              (feedbackMode().kind === "disabled" ? feedbackUnavailableReason() : null) ??
              "no turn received yet",
          };
        if (P?.save_locally === true)
          return submitHeadlessFeedback({
            messages: L.messages,
            description,
            surface: P?.surface ?? "sdk",
            storageV5: L.toolUseContext.storageV5,
            host: L.toolUseContext.session?.host,
          });
      }
      let D = feedbackUnavailableReason();
      if (D)
        return {
          feedback_id: null,
          unavailable_reason: D,
        };
      if (P?.draft_id != null) {
        let { submitDraftFromRequest } = await import("./chunk-4mbryacy.js");
        return submitDraftFromRequest({
          draftId: P.draft_id,
          description,
          type: P.type,
          title: P.title,
          area: P.area,
          attachTranscript: P.attach_transcript,
          surface: P.surface,
          messages: L?.messages ?? [],
          storageV5: L?.toolUseContext.storageV5,
          host: L?.toolUseContext.session?.host,
          credentials: L?.toolUseContext.credentials,
        });
      }
      if (L === null)
        return {
          feedback_id: null,
          unavailable_reason: "no turn received yet",
        };
      let O = await postFeedbackSubmission({
        messages: L.messages,
        description,
        surface: P?.surface ?? "sdk",
        storageV5: L.toolUseContext.storageV5,
        host: L.toolUseContext.session?.host,
        credentials: L.toolUseContext.credentials,
      });
      return O.success
        ? {
            feedback_id: O.feedbackId,
          }
        : {
            feedback_id: null,
            is_zdr_org: O.isZdrOrg,
            failure_reason: O.failureReason,
            status_code: O.statusCode,
            unavailable_reason: orgFeedbackRefusalMessage(O),
          };
    },
    submitSurveyFeedback: async (request) => {
      if (L === null)
        return {
          feedback_id: null,
          unavailable_reason: "no turn received yet",
        };
      let { submitSurveyFeedbackForSdk } = await import("./chunk-25hrjv6b.js");
      return submitSurveyFeedbackForSdk({
        request,
        messages: L.messages,
        storageV5: L.toolUseContext.storageV5,
        host: L.toolUseContext.session?.host,
        credentials: L.toolUseContext.credentials,
      });
    },
    streamInput: async (h) => {
      try {
        for await (let P of h) {
          let { type: D, ...O } = P;
          ke({
            type: "turn",
            ...O,
          });
        }
      } finally {
        we();
      }
    },
    readFile: async (h, P) => {
      if (L === null) return null;
      try {
        return await readFileForRemote(h, P?.maxBytes, L.toolUseContext.getAppState().toolPermissionContext, {
          encoding: P?.encoding,
        });
      } catch {
        return null;
      }
    },
    launchUltrareview: async (h, P) => {
      if (L === null)
        return {
          status: "error",
          message: "launchUltrareview: no turn received yet",
        };
      let { runUltrareviewHeadless } = await import("./chunk-vvrhw27g.js");
      let { createAbortController } = await import("./chunk-t8denxed.js");
      let {
        taskRegistry,
        isUltrareviewOverageConfirmed,
        markUltrareviewOverageConfirmed,
        storageV5,
        credentials,
      } = L.toolUseContext;
      return await runUltrareviewHeadless(h, {
        confirm: P?.confirm ?? false,
        confirmsBeforeLaunch: true,
        overageConfirmed: isUltrareviewOverageConfirmed(),
        markOverageConfirmed: markUltrareviewOverageConfirmed,
        context: {
          abortController: createAbortController(),
          taskRegistry,
          storageV5,
          credentials,
        },
      });
    },
    close: we,
  });
}
//@ chunk-xx1vmpsq.js:88547-89147 placement
function aggregateModelUsage() {
  let values = Object.values(getModelUsage());
  let s = (n) => values.reduce((acc, r) => acc + n(r), 0);
  return {
    ...EMPTY_USAGE,
    input_tokens: s((n) => n.inputTokens),
    output_tokens: s((n) => n.outputTokens),
    output_tokens_details: {
      thinking_tokens: s((n) => n.thinkingTokens ?? 0),
    },
    cache_read_input_tokens: s((n) => n.cacheReadInputTokens),
    cache_creation_input_tokens: s((n) => n.cacheCreationInputTokens),
    cache_creation: {
      ephemeral_5m_input_tokens: s((n) => n.cacheCreationEphemeral5mInputTokens ?? 0),
      ephemeral_1h_input_tokens: s((n) => n.cacheCreationEphemeral1hInputTokens ?? 0),
    },
    server_tool_use: {
      ...EMPTY_USAGE.server_tool_use,
      web_search_requests: s((n) => n.webSearchRequests),
    },
  };
}
//@ chunk-xx1vmpsq.js:89147-89330 placement
function isHarnessCompanionMessage(e) {
  if (isHarnessMetaMessage(e)) return true;
  if (e.type !== "user" || e.turnCompanion !== true) return false;
  let content = e.message.content;
  return !(Array.isArray(content) && content.length > 0 && content.every((n) => n.type === "tool_result"));
}
export { createQueryEngine, cancelScopeFor };
