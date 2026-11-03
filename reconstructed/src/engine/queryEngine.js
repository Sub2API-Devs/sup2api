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
import {
  randomUUID,
  randomUUID as randomUUID_2,
  randomUUID as randomUUID_3,
  randomUUID as randomUUID_4,
} from "crypto";
import { stat, stat as stat_2, readFile } from "fs/promises";
import {
  Ozo,
  UQn,
  SYNTHETIC_MESSAGES,
  createSystemMessage,
  isHarnessMetaMessage,
} from "../utils/messages.js";
import {
  INTERRUPT_RECEIPT_V1,
  MSG_LIFECYCLE_V1,
  ASK_USER_QUESTION_UNANSWERED_V1,
  buildSystemInitMessage,
  fon,
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
import { Ywi, CLI, oss, Jwi } from "../utils/task/taskNotifications.js";
import { logForDebugging, getMinDebugLogLevel } from "../utils/debug.js";
import { nv, ZC, __ } from "../utils/remoteFileState.js";
import { logError, getInMemoryErrors } from "../utils/log.js";
import {
  withResultExtras,
  buildResultMessage,
  isAbortedTerminalReason,
} from "../entrypoints/sdk/coreSchemas.js";
import { buildFileHistorySnapshotChain, saveAiGeneratedTitle } from "../utils/sessionStorage.js";
import { getRunningTasks } from "../utils/task/framework.js";
import { Lq } from "../tasks/taskKinds.js";
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
import { MESSAGE_MARK_SYMBOLS } from "../utils/messageKinds.js";
import { yj } from "../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { Cb } from "../services/orgMemory/promptIndex.js";
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
import { uN, maxBudgetReachedMessage } from "../cost-tracker.js";
import { logFeatureOk, logFeatureBad } from "../services/analytics/featureTelemetry.js";
import { getNoServerCheckStoppedNotice, ntt } from "../utils/permissions/serverClassifier/fallbackNotice.js";
import { buildUserUnavailableNotice } from "../utils/permissions/serverClassifier/results.js";
import {
  formatResultDiagnostic,
  isResultSuccessful,
  buildEmptyResultDiagnostics,
  isRecoverableTrailingServerError,
} from "../utils/queryHelpers.js";
import { logEvent } from "../services/analytics/index.js";
import { lit, fromEnum } from "../services/analytics/safeMetadata.js";
import { zsr } from "../bridge/inboundMessageOrigin.js";
import { sleep } from "../utils/sleep.js";
import { stopAllRunningTasks, stopObserverAgents, stopTask } from "../tasks/stopTask.js";
import { Gvt } from "../tools/shared/gitOperationTracking.js";
import { killAutoReactSubscriptions } from "../services/artifacts/frameLive.js";
import {
  drainQueuedTaskNotifications,
  artifactWatchStopNotice,
} from "../tasks/MonitorWsTask/MonitorWsTask.js";
import { mg } from "../utils/messageQueueManager.js";
import {
  isBypassPermissionsModeDisabled,
  isAutoModeGateEnabled,
} from "../utils/permissions/permissionSetup.js";
import { expandPath } from "../utils/path.js";
import { collectContextData } from "../commands/context/context-noninteractive.js";
import { uf } from "../tools/AgentTool/backgroundGates.js";
import { backgroundTaskByToolUseId, backgroundAll } from "../tasks/LocalShellTask/LocalShellTask.js";
import { Eyt, requestSessionTitle } from "../utils/sessionTitle.js";
import { isPolicyAllowed } from "../services/policyLimits/policyEvidence.js";
import { ye } from "../utils/startupMarks.js";
import {
  feedbackMode,
  feedbackUnavailableReason,
  submitHeadlessFeedback,
  orgFeedbackRefusalMessage,
} from "../services/feedback/submitFeedback.js";
import { readFileForRemote } from "../services/remoteTools/remoteFileRead.js";
import { EMPTY_USAGE } from "../services/api/emptyUsage.js";

//@ chunk-xx1vmpsq.js:61407-62090 placement
function thinkingTokenEstimate(e, s) {
  if (s.type === "content_block_start") return { estimate: 0, emission: null };
  if (s.type !== "content_block_delta") return { estimate: e, emission: null };
  let { delta: delta } = s;
  if (delta.type === "thinking_delta") {
    let y;
    if ("estimated_tokens" in delta && typeof delta.estimated_tokens === "number") y = delta.estimated_tokens;
    else if (typeof delta.thinking === "string" && delta.thinking.length > 0) y = Ozo(delta.thinking);
    if (y === void 0) return { estimate: e, emission: null };
    let r = e + y;
    return { estimate: r, emission: { estimatedTokens: r, estimatedTokensDelta: y } };
  }
  if (delta.type === "signature_delta" && e > 0) {
    let ceil = Math.ceil(UQn(delta.signature.length) / 4);
    if (ceil > e)
      return { estimate: ceil, emission: { estimatedTokens: ceil, estimatedTokensDelta: ceil - e } };
  }
  return { estimate: e, emission: null };
}
//@ chunk-xx1vmpsq.js:62090-62140 placement
var Mt = { level: "verbose" },
  to = 1000,
  so = [INTERRUPT_RECEIPT_V1, MSG_LIFECYCLE_V1, ASK_USER_QUESTION_UNANSWERED_V1];
//@ chunk-xx1vmpsq.js:62140-62205 placement
function cancelScopeFor(e) {
  return e === "remote" ? void 0 : { scope: "turn-cancel" };
}
//@ chunk-xx1vmpsq.js:62205-62244 placement = getSettingsWithSources (0.85)
var emptySettingsWithSources = () => ({ effective: {}, sources: [] });
//@ chunk-xx1vmpsq.js:62244-62917 placement
async function* runDeferredSlashCommand(e, s, n) {
  let filtered = s.messages.filter((message) => message.uuid !== e.messageUuid),
    { messages: messages } = await processUserInput({
      input: e.text,
      mode: "prompt",
      context: {
        ...s.toolUseContext,
        abortController: n,
        messages: filtered,
        canUseTool: s.canUseTool,
        setMessages: () => {},
        applyMessageOp: () => {},
        onChangeAPIKey: () => {},
        deferredSlashUuid: e.messageUuid,
        options: { ...s.toolUseContext.options, ideInstallationStatus: null, theme: "dark" },
      },
      messages: filtered,
      querySource: s.querySource,
      origin: e.origin,
      onScreened: e.lineScreened,
      interactionPrompt: e.interactionPrompt,
      ownWordUuids: [],
    }),
    T = messages.find(isCompactBoundaryMessage)?.compactMetadata.preservedMessages,
    C = new Set(T?.allUuids ?? T?.uuids ?? []);
  for (let I of messages) if (!C.has(I.uuid)) yield I;
  return { reason: "completed" };
}
/**
 * 2.1.316 的查询引擎（SDK/print/REPL 共用）：接收 run 回调与命令、模型、工具、MCP、插件等环境，产出 system/init、stream_event、result 等 SDK 消息并处理中断与命令生命周期。
 */
//@ chunk-xx1vmpsq.js:62917-88547 placement
function createQueryEngine({
  run: run,
  queryParams: queryParams,
  commands: commands = [],
  models: models = [],
  unavailableModels: unavailableModels = [],
  agents: agents = [],
  account: account = {},
  outputStyle: outputStyle,
  availableOutputStyles: availableOutputStyles,
  mcpServers: mcpServers = () => [],
  mcpDelegate: mcpDelegate,
  excludeDynamicSections: excludeDynamicSections,
  settings: settings = emptySettingsWithSources(),
  authDelegate: authDelegate,
  mcpAuthDelegate: mcpAuthDelegate,
  ambient: ambient,
  tools: tools = [],
  skills: skills = [],
  plugins: plugins = [],
  pluginErrors: pluginErrors = [],
  pluginWarnings: pluginWarnings = [],
  mcpServerErrors: mcpServerErrors = [],
  initialModel: initialModel,
  initialPermissionMode: initialPermissionMode,
  fastModeState: fastModeState,
  fastModeDisabledReason: fastModeDisabledReason,
  hostOwnsPermissionMode: hostOwnsPermissionMode = !1,
  hostOwnsModel: hostOwnsModel = !1,
  sdkResultVerdict: sdkResultVerdict = !1,
  onCommandLifecycle: onCommandLifecycle,
  onTurnThrow: onTurnThrow,
}) {
  let de = buildInitMessageFields({
      commands: typeof commands === "function" ? commands() : commands,
      models: typeof models === "function" ? models() : models,
      unavailableModels: typeof unavailableModels === "function" ? unavailableModels() : unavailableModels,
      agents: typeof agents === "function" ? agents() : agents,
      account: account,
      outputStyle: outputStyle,
      availableOutputStyles: availableOutputStyles,
    }),
    gt = new Stream(),
    Be = [],
    dt = 0,
    Re = null,
    Yt = () => (Re && !Re.signal.aborted ? Re : new AbortController()).signal,
    Ye = null,
    kt = null,
    Je = null,
    ut = null,
    Ze = getSessionId(),
    q = Ywi();
  if (q !== Ze && q !== CLI)
    logForDebugging(
      `[engine] sdkEventQueue push key '${q}' \u2260 engine sessionId '${Ze}' \u2014 host ALS wiring likely incorrect; enqueued SdkEvents will not drain here`,
    );
  let se = (h) => ({
      ...h,
      session_id: Ze,
      uuid: "uuid" in h && typeof h.uuid === "string" ? h.uuid : randomUUID(),
    }),
    he = (h) => (typeof h === "function" ? h() : h),
    Wt = () => {
      let h = he(ambient);
      if (!h) return null;
      let P = typeof commands === "function" ? commands() : commands,
        D = typeof agents === "function" ? agents() : agents;
      return buildSystemInitMessage({
        ...h,
        sessionId: Ze,
        tools: tools,
        mcpClients: mcpServers().map((O) => ({ name: O.name, type: O.status, source: O.source })),
        model: Ye ?? he(initialModel) ?? "",
        permissionMode: kt ?? he(initialPermissionMode) ?? "default",
        commands: P,
        agents: D.map((O) => ({ agentType: O.name })),
        skills: skills,
        plugins: plugins,
        pluginErrors: pluginErrors,
        pluginWarnings: pluginWarnings,
        mcpServerErrors: mcpServerErrors,
        additionalDirectories: void 0,
        fastModeState: he(fastModeState) ?? "off",
        fastModeDisabledReason: he(fastModeDisabledReason),
        capabilities: so,
      });
    },
    lt = !1,
    Jt = 0,
    L = null,
    pe = !1,
    Ie = nv(ZC),
    Xe = [],
    Et = !1,
    be = [],
    Ee = !1,
    Ne = (h) => {
      if (Xe.length >= to) {
        if ((Xe.shift(), !Et))
          ((Et = !0),
            logError(
              Error(
                "[engine] pendingDenialFrames buffer is full; dropping oldest permission_denied advisory frames",
              ),
            ));
      }
      Xe.push(h);
    };
  function* qt() {
    while (Xe.length > 0) {
      let h = Xe.shift();
      (logForDebugging(`[engine] yield ${h.type}/${h.subtype}`, Mt), yield se(h));
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
  function zt(h) {
    try {
      onTurnThrow?.({ error: h });
    } catch (error) {
      logError(error);
    }
  }
  function je(h, P) {
    return (Kt(h, P), { type: "command_lifecycle", command_uuid: h, state: P });
  }
  function* We() {
    while (Se.length > 0) {
      let h = Se.shift();
      (logForDebugging(`[engine] yield command_lifecycle/${h.state}`, Mt), yield se(h));
    }
  }
  function* Me() {
    (yield* qt(), yield* We());
    for (let h of oss(Ze)) (logForDebugging(`[engine] yield sdk-queue system/${h.subtype}`, Mt), yield se(h));
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
    if (!Ee) return !1;
    let h = L?.toolUseContext?.getAppState;
    return h !== void 0 && getRunningTasks(h()).some((P) => Lq(P) && waitForTaskCompletion(P));
  };
  function* pt(h, P) {
    if (xe()) be.push(h);
    else (yield* et(), yield h);
    if (P) yield se(P);
  }
  async function* xt() {
    lt = !1;
    let h = Wt();
    if (h) (logForDebugging("[engine] yield system/init (first)"), yield se(h));
    for await (let P of gt) {
      if (lt) {
        lt = !1;
        let ie = Wt();
        if (ie) (logForDebugging("[engine] yield system/init (re-emit)"), yield se(ie));
      }
      (yield* Me(), rearmCreditsExhaustedNotice());
      let startTime = performance.now(),
        O = {
          parent_tool_use_id: P.parent_tool_use_id,
          priority: P.priority,
          shouldQuery: P.shouldQuery,
          timestamp: P.timestamp,
        },
        G;
      try {
        G = await queryParams(P);
      } catch (error) {
        (logError(error), zt(error), Be.shift());
        let S = P.uuid !== void 0 ? je(P.uuid, "cancelled") : void 0;
        if (sdkResultVerdict) setAutoModeUnavailableStopNotice(void 0);
        yield* Me();
        let V = {
          ...buildResultMessage({
            startedAt: startTime,
            common: {
              is_error: !0,
              duration_api_ms: 0,
              num_turns: 0,
              stop_reason: null,
              session_id: Ze,
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
              user_message_uuid: void 0,
            },
          }),
          ...O,
        };
        yield* pt(V, S);
        continue;
      }
      (dt++, (L = G));
      let abortController = new AbortController();
      Re = abortController;
      let Ce = Be[0];
      if (Ce !== void 0) Ce.status = "armed";
      if (P.uuid !== void 0) Se.push(je(P.uuid, "started"));
      let Ae = G.toolUseContext?.abortController?.signal,
        rt = () => abortController.abort(Ae?.reason);
      if (Ae?.aborted) abortController.abort(Ae.reason);
      else Ae?.addEventListener("abort", rt, { once: !0 });
      let Z = G.toolUseContext?.abortController,
        Dt = () => {
          if (
            unwrapAbortReason(abortController.signal.reason) === "refusal-fallback-edit" &&
            Z &&
            !Z.signal.aborted
          )
            Z.abort(abortController.signal.reason);
        };
      (abortController.signal.addEventListener("abort", Dt, { once: !0 }),
        logForDebugging(`[engine] turn ${dt} start`));
      let yt = getMinDebugLogLevel() === "verbose",
        Xt = [],
        rs = (ie, S, V) => {
          if (Xt.some((Ke) => Ke.tool_use_id === S)) return;
          Xt.push({ tool_name: fon(ie.name), tool_use_id: S, tool_input: V });
        },
        canUseTool = G.canUseTool,
        X = async (ie, S, V, Ke, Pt, At) => {
          let Oe = await canUseTool(ie, S, V, Ke, Pt, At);
          if (isRecordableDenial(Oe, At)) rs(ie, Pt, S);
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
      if (Ie.size > 0 && G.toolUseContext?.readFileState) {
        for (let [ie, S] of Ie.entries()) {
          let V = G.toolUseContext.readFileState.get(ie);
          if (!V || S.timestamp > V.timestamp) G.toolUseContext.readFileState.set(ie, S);
        }
        Ie.clear();
      }
      let ce = G.engineDeferredSlash
          ? runDeferredSlashCommand(G.engineDeferredSlash, G, abortController)
          : run({
              ...G,
              canUseTool: X,
              keepPartialMessageOnAbort: !0,
              takePlainDelta:
                G.takePlainDelta === void 0 || G.toolUseContext?.options?.maxBudgetUsd !== void 0
                  ? void 0
                  : guardGoalCheck(
                      "engine",
                      () => Xe.length === 0 && Se.length === 0 && !Jwi(Ze),
                      G.takePlainDelta,
                    ),
              toolUseContext: {
                ...G.toolUseContext,
                abortController: abortController,
                onPermissionDenial: rs,
                permissionLayers:
                  (!hostOwnsModel && Ye !== null) ||
                  (!hostOwnsPermissionMode && kt !== null) ||
                  Je !== null ||
                  ut !== null
                    ? [
                        ...(G.toolUseContext?.permissionLayers ?? []),
                        ...(!hostOwnsModel && Ye !== null ? [{ kind: "model", mainLoopModel: Ye }] : []),
                        ...(!hostOwnsPermissionMode && kt !== null
                          ? [{ kind: "permission_mode", mode: kt }]
                          : []),
                        ...(Je !== null ? [{ kind: "max_thinking_tokens", maxThinkingTokens: Je }] : []),
                        ...(ut !== null ? [{ kind: "flag_settings", settings: ut }] : []),
                      ]
                    : G.toolUseContext?.permissionLayers,
              },
            }),
        me = null,
        ht = !1,
        ot = G.engineDeferredSlash ? 0 : 1,
        Ue = null,
        qe = [],
        $t,
        es = "",
        bt = !1,
        os = null,
        ts,
        ss,
        ns,
        is = "",
        Vt = [],
        cs = new Set(),
        Ps = null,
        as,
        ps,
        Hs = G.toolUseContext?.options?.maxBudgetUsd,
        at = getInMemoryErrors().at(-1),
        Zt;
      try {
        let ie = await ce.next();
        while (!ie.done) {
          let S = ie.value;
          if (S.type === "user") {
            if (!G.engineDeferredSlash) ot++;
            (qe.push(S),
              (es = ""),
              (bt = !1),
              (os = null),
              (ts = void 0),
              (ss = void 0),
              (ns = void 0),
              (is = ""));
          } else if (S.type === "tombstone") {
            {
              let V = S.message?.uuid,
                Ke = V !== void 0 ? qe.findLastIndex((Pt) => Pt.uuid === V) : qe.length - 1;
              if (Ke >= 0) qe.splice(Ke, 1);
            }
            {
              let message = S.message;
              if (message?.type === "assistant") {
                let content = message.message.content,
                  Pt = Array.isArray(content)
                    ? content.flatMap((At) =>
                        At.type === "tool_use" && At.name === STRUCTUREDOUTPUT ? [At.id] : [],
                      )
                    : [];
                if (Pt.length > 0) {
                  for (let Oe of Pt) cs.add(Oe);
                  let At = (Oe) => Oe.toolUseID === void 0 || Pt.includes(Oe.toolUseID);
                  Vt = Vt.filter((Oe) => !At(Oe));
                }
              }
            }
            ((es = ""), (bt = !1), (os = null), (ts = void 0), (ss = void 0), (ns = void 0), (is = ""));
          } else if (S.type === "assistant") {
            if (((Ps ??= performance.now()), qe.push(S), S.message.stop_reason != null))
              Ue = S.message.stop_reason;
            ((bt = S.isApiErrorMessage === !0),
              (os = S.apiErrorStatus ?? null),
              (ts = S.apiErrorCode),
              (ss = S[MESSAGE_MARK_SYMBOLS]),
              (ns = bt ? S.apiError : void 0));
            let V = yj(S.message.content),
              Ke = V?.type === "text" ? V.text : "";
            if (bt) ((is = SYNTHETIC_MESSAGES.has(Ke) ? "" : Cb(Ke)), (es = ""));
            else es = SYNTHETIC_MESSAGES.has(Ke) ? "" : Cb(Ke);
          } else if (
            S.type === "stream_event" &&
            S.event.type === "message_delta" &&
            S.event.delta.stop_reason != null
          )
            Ue = S.event.delta.stop_reason;
          else if (S.type === "attachment" && S.attachment.type === "structured_output") {
            if (!(S.attachment.toolUseID !== void 0 ? cs.has(S.attachment.toolUseID) : cs.size > 0))
              Vt = [...Vt, { toolUseID: S.attachment.toolUseID, data: S.attachment.data }];
          } else if (S.type === "attachment" && S.attachment.type === "max_turns_reached")
            $t = { turnCount: S.attachment.turnCount, maxTurns: S.attachment.maxTurns };
          else if (S.type === "attachment" && S.attachment.type === "hook_deferred_tool")
            as = { id: S.attachment.toolUseID, name: S.attachment.toolName, input: S.attachment.toolInput };
          if (Xe.length > 0) yield* qt();
          if (Se.length > 0) yield* We();
          if (((ps = reduceCompactResponseLength(ps, S)), S.type === "stream_event")) {
            let V = thinkingTokenEstimate(Jt, S.event);
            if (((Jt = V.estimate), V.emission)) {
              if (
                (yield se({
                  type: "system",
                  subtype: "thinking_tokens",
                  estimated_tokens: V.emission.estimatedTokens,
                  estimated_tokens_delta: V.emission.estimatedTokensDelta,
                }),
                yt)
              )
                logForDebugging("[engine] yield-twin system/thinking_tokens", Mt);
            }
          }
          if (yt) logForDebugging(`[engine] yield ${S.type}/${"subtype" in S ? S.subtype : "-"}`, Mt);
          if (S.type === "command_lifecycle") yield se(je(S.uuid, S.state));
          else if (S.type === "notification") {
            let notification = S.notification;
            yield se({
              type: "system",
              subtype: "notification",
              key: notification.key,
              text: notification.text,
              priority: notification.priority,
              ...(notification.color !== void 0 && { color: notification.color }),
              ...(notification.timeoutMs !== void 0 && { timeout_ms: notification.timeoutMs }),
            });
          } else if (S.type === "sdk_status")
            yield se({
              type: "system",
              subtype: "status",
              status: S.status,
              ...(ps !== void 0 && { compact_output_chars: ps }),
              ...(S.metadata?.compactResult !== void 0 && { compact_result: S.metadata.compactResult }),
              ...(S.metadata?.compactError !== void 0 && { compact_error: S.metadata.compactError }),
            });
          else if (S.type === "stream_request_start")
            yield se({ type: "system", subtype: "status", status: "requesting" });
          else if (S.type === "system" && S.subtype === "compact_boundary")
            yield se({
              type: "system",
              subtype: "compact_boundary",
              uuid: S.uuid,
              compact_metadata: toSDKCompactMetadata(S.compactMetadata),
              ...(S.logicalParentUuid !== void 0 && { logical_parent_uuid: S.logicalParentUuid }),
            });
          else if (S.type === "system" && S.subtype === "model_refusal_fallback")
            yield se({
              type: "system",
              subtype: "model_refusal_fallback",
              uuid: S.uuid,
              trigger: S.trigger,
              direction: S.direction,
              ...(S.scope !== void 0 && { scope: S.scope }),
              original_model: S.originalModel,
              fallback_model: S.fallbackModel,
              request_id: S.requestId,
              api_refusal_category: S.apiRefusalCategory ?? null,
              api_refusal_explanation: S.apiRefusalExplanation ?? null,
              ...(S.retractedMessageUuids !== void 0 && { retracted_message_uuids: S.retractedMessageUuids }),
              refused_user_message_uuid: S.refusedUserMessageUuid ?? null,
              content: S.content,
              ...(S.sawCyberRefusal && { saw_cyber_refusal: !0 }),
              ...(S.provisional && { provisional: S.provisional }),
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
            yield se({ ...toSDKModelConsentFallbackMessage(S), uuid: S.uuid });
          else if (S.type === "tool_use_summary")
            yield se({ ...createToolUseSummaryMessage(S), uuid: S.uuid });
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
              let { uuid: uuid, session_id: session_id, ...At } = V;
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
            if (V) (yield se(V), logForDebugging("[engine] yield-twin assistant (local_command)", Mt));
          }
          if (
            S.type === "progress" &&
            (S.data.type === "bash_progress" || S.data.type === "powershell_progress")
          )
            (yield se({
              type: "tool_progress",
              tool_use_id: S.toolUseID,
              tool_name: S.data.type === "bash_progress" ? BASH_TOOL_NAME : POWERSHELL_TOOL_NAME,
              parent_tool_use_id: S.parentToolUseID || null,
              elapsed_time_seconds: S.data.elapsedTimeSeconds,
              task_id: S.data.taskId,
            }),
              logForDebugging("[engine] yield-twin tool_progress", Mt));
          if (S.type === "progress" && S.data.type === "tool_heartbeat")
            (yield se({
              type: "tool_progress",
              tool_use_id: S.toolUseID,
              tool_name: S.data.toolName,
              parent_tool_use_id: S.parentToolUseID || null,
              elapsed_time_seconds: S.data.elapsedTimeSeconds,
              heartbeat: !0,
            }),
              logForDebugging("[engine] yield-twin tool_progress heartbeat", Mt));
          if (S.type === "progress" && S.data.type === "agent_api_retry")
            (yield se({
              type: "tool_progress",
              tool_use_id: S.toolUseID,
              tool_name: AGENT,
              parent_tool_use_id: S.parentToolUseID || null,
              elapsed_time_seconds: 0,
              subagent_type: S.data.agentType,
              ...(S.data.resolved !== !0 && {
                subagent_retry: {
                  agent_id: S.data.agentId,
                  attempt: S.data.attempt,
                  max_retries: S.data.maxRetries,
                  retry_delay_ms: S.data.retryDelayMs,
                  error_status: S.data.errorStatus ?? null,
                  error_category: S.data.errorCategory,
                },
              }),
            }),
              logForDebugging("[engine] yield-twin tool_progress subagent_retry", Mt));
          for (let V of oss(Ze))
            (logForDebugging(`[engine] yield sdk-queue system/${V.subtype}`, Mt), yield se(V));
          if (
            $t === void 0 &&
            S.type !== "sdk_status" &&
            S.type !== "compact_progress" &&
            S.type !== "stream_mode" &&
            S.type !== "response_length" &&
            uN(Hs)
          ) {
            Zt = "budget_exhausted";
            break;
          }
          ie = await ce.next();
        }
        if ((logFeatureOk("shoji_engine"), ie.done)) Zt = ie.value ? ie.value.reason : void 0;
      } catch (error) {
        ((me = errorMessage(error)), zt(error));
      } finally {
        ((ht = abortController.signal.aborted),
          await ce.return(void 0).catch(() => {}),
          Ae?.removeEventListener("abort", rt),
          abortController.signal.removeEventListener("abort", Dt));
        let ie = aggregateModelUsage();
        logForDebugging(
          `[engine] turn ${dt} end (turns=${ot} usage in=${ie.input_tokens} out=${ie.output_tokens} cost=$${getTotalCostUSD().toFixed(4)} api=${getTotalAPIDuration()}ms stop=${Ue} resultLen=${es.length})`,
        );
      }
      let fs = qe.findLast((ie) => !isHarnessCompanionMessage(ie)) ??
          qe.at(-1) ?? { type: "user", message: P.message },
        On = sdkResultVerdict ? G.engineDeferredSlash === void 0 : isAbortedTerminalReason(Zt),
        ds =
          unwrapAbortReason(abortController.signal.reason) === "permission-stop"
            ? (getNoServerCheckStoppedNotice() ?? buildUserUnavailableNotice(ntt()))
            : void 0,
        js =
          me !== null
            ? [me]
            : sdkResultVerdict && ds !== void 0
              ? [formatResultDiagnostic(fs, Ue), ds]
              : On && as === void 0 && !isResultSuccessful(fs, Ue)
                ? buildEmptyResultDiagnostics(fs, Ue, at)
                : null,
        Cs = Ue === "refusal" && Vt.length > 0,
        As = Cs ? void 0 : Vt.at(-1)?.data;
      try {
        if (
          bt &&
          isRecoverableTrailingServerError({
            trailing: fs,
            preceding: qe.at(-2),
            terminalReason: Zt,
            retractionExhausted: Vt.length === 0 && cs.size > 0,
          })
        )
          ((bt = !1),
            (os = null),
            (ts = void 0),
            (ss = void 0),
            (ns = void 0),
            (is = ""),
            (Ue = "tool_use"),
            logEvent("tengu_trailing_api_error_notice_skipped", {
              engine: lit("session_engine"),
              has_structured_output: Vt.length > 0,
            }));
      } catch (error) {
        logError(error);
      }
      let Rs = bt ? is : es;
      if (Rs === "" && As !== void 0) Rs = JSON.stringify(As);
      let gs = {
          duration_api_ms: getTotalAPIDuration(),
          stop_reason: Ue,
          session_id: Ze,
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
        },
        Ws =
          Zt === "budget_exhausted"
            ? {
                ...buildResultMessage({
                  startedAt: startTime,
                  common: { ...gs, is_error: !0, num_turns: ot },
                  variant: {
                    subtype: "error_max_budget_usd",
                    errors: [maxBudgetReachedMessage(Hs)],
                    user_message_uuid: void 0,
                  },
                }),
                ...O,
              }
            : me === null && as === void 0 && $t
              ? {
                  ...buildResultMessage({
                    startedAt: startTime,
                    common: { ...gs, is_error: !0, num_turns: $t.turnCount },
                    variant: {
                      subtype: "error_max_turns",
                      errors: [`Reached maximum number of turns (${$t.maxTurns})`],
                      user_message_uuid: void 0,
                    },
                  }),
                  ...O,
                }
              : js !== null
                ? {
                    ...buildResultMessage({
                      startedAt: startTime,
                      common: { ...gs, is_error: !0, num_turns: ot },
                      variant: { subtype: "error_during_execution", errors: js, user_message_uuid: void 0 },
                    }),
                    ...O,
                  }
                : {
                    ...buildResultMessage({
                      startedAt: startTime,
                      common: {
                        ...gs,
                        ...(as !== void 0 && { stop_reason: "tool_deferred" }),
                        is_error: bt || Cs,
                        num_turns: ot,
                      },
                      variant: {
                        subtype: "success",
                        api_error_status: os,
                        ...(ts !== void 0 && { api_error_code: ts }),
                        ...(ss !== void 0 && { api_error_origin: ss }),
                        ...(ns !== void 0 && { api_error: ns }),
                        result: Rs,
                        structured_output: As,
                        ttft_ms: !bt && Ps !== null ? Math.max(0, Math.round(Ps - startTime)) : void 0,
                        deferred_tool_use: as,
                      },
                    }),
                    ...O,
                  };
      if (Cs && Ws.subtype === "success")
        try {
          logEvent("tengu_structured_output_refusal_dropped", { api_error_latched: bt });
        } catch (error) {
          logError(error);
        }
      let qs;
      if (P.uuid !== void 0) qs = je(P.uuid, me !== null ? "cancelled" : zsr(Zt, ht));
      if ((Be.shift(), sdkResultVerdict)) setAutoModeUnavailableStopNotice(ds);
      else if (ds !== void 0) yield se(createSystemMessage(ds, "warning"));
      (yield* Me(), yield* pt(Ws, qs));
    }
    while (be.length > 0 && !Re?.signal.aborted && xe()) (yield* Me(), await sleep(100));
    if (be.length > 0 && Re?.signal.aborted && L?.toolUseContext?.taskRegistry) {
      let { taskRegistry: taskRegistry, setAppState: setAppState, storageV5: storageV5 } = L.toolUseContext;
      stopAllRunningTasks({ taskRegistry: taskRegistry, setAppState: setAppState, storageV5: storageV5 });
    }
    (await Gvt(), yield* Me(), yield* et());
  }
  function Tt() {
    try {
      we();
      for (let { intent: intent, status: status } of Be.splice(0))
        if (intent.uuid !== void 0) Kt(intent.uuid, status === "armed" ? "cancelled" : "discarded");
    } catch (error) {
      logError(Error("[engine] abandonment sweep failed", { cause: error }));
    }
  }
  let Ut = !1;
  async function* x() {
    Ut = !0;
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
          logForDebugging("[engine] dropped turn intent received after close()", { level: "warn" });
          break;
        }
        if ((Be.push({ intent: h, status: "queued" }), h.uuid !== void 0)) Se.push(je(h.uuid, "queued"));
        gt.enqueue(h);
        break;
      case "interrupt": {
        if (
          (Re?.abort(h.reason !== void 0 ? new DOMException(h.reason, "AbortError") : void 0),
          h.scope !== "turn-cancel")
        ) {
          let P = L?.toolUseContext?.taskRegistry,
            D = 0;
          if (L?.toolUseContext !== void 0 && P !== void 0) {
            D = killAutoReactSubscriptions(P, { durable: !1 });
            let { setAppState: setAppState } = L.toolUseContext;
            stopObserverAgents({ taskRegistry: P, setAppState: setAppState });
          }
          let O = drainQueuedTaskNotifications(mg(), { leaveArtifactRooms: !0 });
          artifactWatchStopNotice(D, O);
        }
        break;
      }
      case "set_model":
        ((Ye = h.model ?? null), (lt = !0), logForDebugging(`[engine] send set_model model=${h.model}`));
        break;
      case "set_permission_mode": {
        let P = parsePermissionMode(h.mode);
        if (P === void 0) {
          logForDebugging("[engine] set_permission_mode rejected \u2014 unrecognized mode");
          break;
        }
        if (P === "bypassPermissions" && isBypassPermissionsModeDisabled()) {
          logForDebugging(
            "[engine] set_permission_mode:bypassPermissions rejected \u2014 disabled by settings",
          );
          break;
        }
        if (P === "auto" && !isAutoModeGateEnabled()) {
          logForDebugging("[engine] set_permission_mode:auto rejected \u2014 gate not enabled");
          break;
        }
        ((kt = P), (lt = !0));
        break;
      }
      case "set_max_thinking_tokens":
        ((Je = h.max_thinking_tokens),
          logForDebugging(`[engine] send set_max_thinking_tokens max=${h.max_thinking_tokens}`));
        break;
      case "apply_flag_settings":
        ((ut = { ...(ut ?? {}), ...h.settings }),
          logForDebugging(`[engine] send apply_flag_settings keys=${Object.keys(h.settings).join(",")}`));
        break;
      case "seed_read_state":
        (Ie.set(h.path, h.seed), logForDebugging(`[engine] send seed_read_state path=${h.path}`));
        break;
    }
  }
  function we() {
    ((Ee = !0), gt.done());
  }
  let Pe = x(),
    B = Pe.return.bind(Pe),
    H = Pe.throw.bind(Pe);
  function oe() {
    if ((we(), !Ut)) Tt();
  }
  return (
    (Pe.return = (h) => (oe(), B(h))),
    (Pe.throw = (h) => (oe(), H(h))),
    Object.assign(Pe, {
      interrupt: async (h, P) => (
        ke({ type: "interrupt", reason: h, scope: P?.scope }),
        {
          still_queued: Be.flatMap(({ intent: intent, status: status }) =>
            status === "queued" && intent.uuid !== void 0 ? [intent.uuid] : [],
          ),
        }
      ),
      setModel: async (h) => ke({ type: "set_model", model: h }),
      setPermissionMode: async (h) => ke({ type: "set_permission_mode", mode: h }),
      setMaxThinkingTokens: async (h) => ke({ type: "set_max_thinking_tokens", max_thinking_tokens: h }),
      applyFlagSettings: (h) => (ke({ type: "apply_flag_settings", settings: h }), Promise.resolve()),
      seedReadState: async (h, P, D) => {
        try {
          let O = expandPath(h);
          if (D !== void 0) {
            if (D.length <= 10485760)
              ke({
                type: "seed_read_state",
                path: O,
                seed: {
                  content: __(D),
                  timestamp: P,
                  offset: void 0,
                  limit: void 0,
                  contentNotInModelContext: !0,
                },
              });
            return;
          }
          let G = await stat(O);
          if (G.size > 10485760) return;
          let floored = Math.floor(G.mtimeMs);
          if (floored <= P) {
            let Ce = await readFile(O, "utf-8"),
              Ae = __(Ce);
            ke({
              type: "seed_read_state",
              path: O,
              seed: {
                content: Ae,
                timestamp: floored,
                offset: void 0,
                limit: void 0,
                contentNotInModelContext: !0,
              },
            });
          }
        } catch {}
      },
      turnCount: () => dt,
      initializationResult: () => Promise.resolve(de),
      accountInfo: () => Promise.resolve(de.account),
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
      supportedModels: () => Promise.resolve(typeof models === "function" ? models() : de.models),
      supportedCommands: () => Promise.resolve(typeof commands === "function" ? commands() : de.commands),
      supportedAgents: () => Promise.resolve(typeof agents === "function" ? agents() : de.agents),
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
        if (!mcpAuthDelegate)
          throw Error(`mcpSubmitOAuthCallbackUrl: no mcpAuthDelegate wired (server: ${h})`);
        return mcpAuthDelegate.submitOAuthCallbackUrl(h, P);
      },
      getContextUsage: async (h) => {
        if (L === null) throw Error("getContextUsage: no turn received yet");
        let { messages: messages, toolUseContext: toolUseContext } = L;
        return await collectContextData({
          session: toolUseContext.session,
          messages: messages,
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
            excludeDynamicSections: excludeDynamicSections,
            mcpClients: toolUseContext.options.mcpClients,
          },
          detail: h?.detail,
        });
      },
      stopTask: async (h) => {
        if (L === null) throw Error("stopTask: no turn received yet");
        let {
          taskRegistry: taskRegistry,
          setAppState: setAppState,
          getAppState: getAppState,
          session: session,
          storageV5: storageV5,
        } = L.toolUseContext;
        await stopTask(h, {
          taskRegistry: taskRegistry,
          setAppState: setAppState,
          session: session,
          getAppState: getAppState,
          source: "client",
          storageV5: storageV5,
        });
      },
      backgroundTasks: async (h) => {
        if (uf())
          throw (
            logFeatureBad("task_local_shell_background_all", "disabled"),
            Error("Background tasks are disabled in this session.")
          );
        if (L === null) return !h;
        let { taskRegistry: taskRegistry } = L.toolUseContext;
        if (h) return backgroundTaskByToolUseId(h, taskRegistry);
        return (backgroundAll(taskRegistry), !0);
      },
      getSettings: () => Promise.resolve(settings),
      generateSessionTitle: async (h, P) => {
        if (P?.persist) pe = !0;
        let D = await Eyt(h, Yt(), P?.credentials);
        if (D && P?.persist)
          try {
            saveAiGeneratedTitle(getSessionId(), D, L?.toolUseContext.storageV5);
          } catch (error) {
            if (isFsInaccessible(error)) logForDebugging(`saveAiGeneratedTitle failed: ${error}`);
            else logError(error);
          }
        return D;
      },
      requestSessionTitle: (h, P) => requestSessionTitle(h, Yt(), P?.credentials),
      messageRated: async ({
        messageUuid: messageUuid,
        sentiment: sentiment,
        surface: surface = "tool_use",
        cleared: cleared = !1,
      }) => {
        if (isPolicyAllowed("allow_product_feedback"))
          logEvent("tengu_message_rated", {
            message_uuid: ye(messageUuid),
            sentiment: fromEnum(sentiment),
            surface: fromEnum(surface),
            cleared: cleared,
          });
      },
      askSideQuestion: async (h, P) => {
        let { getLastCacheSafeParams: getLastCacheSafeParams } = await import("./chunk-qnggsbt9.js"),
          O = getLastCacheSafeParams();
        if (O === null) return null;
        let { runSideQuestion: runSideQuestion } = await import("./chunk-4ycax738.js"),
          { createAbortController: createAbortController } = await import("./chunk-t8denxed.js"),
          Ce = await runSideQuestion({
            question: h,
            cacheSafeParams: {
              ...O,
              toolUseContext: { ...O.toolUseContext, abortController: createAbortController() },
            },
            threadHistory: !1,
            ...(P?.history?.length && {
              history: P.history.map((Ae) => ({
                question: Ae.question,
                response: Ae.response,
                ...(Ae.fallback_notice && { fallbackNotice: Ae.fallback_notice }),
              })),
            }),
          });
        return Ce.response === null
          ? null
          : {
              response: Ce.response,
              synthetic: Ce.synthetic,
              ...(Ce.refusalFallback && { refusalFallback: Ce.refusalFallback }),
            };
      },
      rewindFiles: async (h, P) => {
        if (L === null) return { canRewind: !1, error: "rewindFiles: no turn received yet" };
        let {
            fileHistoryEnabled: fileHistoryEnabled,
            fileHistoryCanRestore: fileHistoryCanRestore,
            fileHistoryGetDiffStats: fileHistoryGetDiffStats,
            fileHistoryRewind: fileHistoryRewind,
          } = await import("./chunk-4skjwhe2.js"),
          appState = L.toolUseContext.getAppState();
        if (!fileHistoryEnabled()) return { canRewind: !1, error: "File rewinding is not enabled." };
        if (!fileHistoryCanRestore(appState.fileHistory, h))
          return { canRewind: !1, error: "No file checkpoint found for this message." };
        if (P?.dryRun ?? !1) {
          let rt = await fileHistoryGetDiffStats(appState.fileHistory, h);
          return {
            canRewind: !0,
            filesChanged: rt?.filesChanged,
            insertions: rt?.insertions,
            deletions: rt?.deletions,
          };
        }
        let Ae;
        try {
          Ae = await fileHistoryRewind(() => appState.fileHistory, h);
        } catch (error) {
          return { canRewind: !1, error: `Failed to rewind: ${errorMessage(error)}` };
        }
        return { canRewind: !0, skippedLinks: Ae?.skippedLinks };
      },
      submitFeedback: async (h, P) => {
        if (P?.draft_id == null) {
          if (L === null)
            return {
              feedback_id: null,
              unavailable_reason:
                (feedbackMode().kind === "disabled" ? feedbackUnavailableReason() : null) ??
                "no turn received yet",
            };
          if (P?.save_locally === !0)
            return submitHeadlessFeedback({
              messages: L.messages,
              description: h,
              surface: P?.surface ?? "sdk",
              storageV5: L.toolUseContext.storageV5,
              host: L.toolUseContext.session?.host,
            });
        }
        let D = feedbackUnavailableReason();
        if (D) return { feedback_id: null, unavailable_reason: D };
        if (P?.draft_id != null) {
          let { submitDraftFromRequest: submitDraftFromRequest } = await import("./chunk-4mbryacy.js");
          return submitDraftFromRequest({
            draftId: P.draft_id,
            description: h,
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
        if (L === null) return { feedback_id: null, unavailable_reason: "no turn received yet" };
        let O = await postFeedbackSubmission({
          messages: L.messages,
          description: h,
          surface: P?.surface ?? "sdk",
          storageV5: L.toolUseContext.storageV5,
          host: L.toolUseContext.session?.host,
          credentials: L.toolUseContext.credentials,
        });
        return O.success
          ? { feedback_id: O.feedbackId }
          : {
              feedback_id: null,
              is_zdr_org: O.isZdrOrg,
              failure_reason: O.failureReason,
              status_code: O.statusCode,
              unavailable_reason: orgFeedbackRefusalMessage(O),
            };
      },
      submitSurveyFeedback: async (h) => {
        if (L === null) return { feedback_id: null, unavailable_reason: "no turn received yet" };
        let { submitSurveyFeedbackForSdk: submitSurveyFeedbackForSdk } = await import("./chunk-25hrjv6b.js");
        return submitSurveyFeedbackForSdk({
          request: h,
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
            ke({ type: "turn", ...O });
          }
        } finally {
          we();
        }
      },
      readFile: async (h, P) => {
        if (L === null) return null;
        try {
          return await readFileForRemote(
            h,
            P?.maxBytes,
            L.toolUseContext.getAppState().toolPermissionContext,
            { encoding: P?.encoding },
          );
        } catch {
          return null;
        }
      },
      launchUltrareview: async (h, P) => {
        if (L === null) return { status: "error", message: "launchUltrareview: no turn received yet" };
        let { runUltrareviewHeadless: runUltrareviewHeadless } = await import("./chunk-vvrhw27g.js"),
          { createAbortController: createAbortController } = await import("./chunk-t8denxed.js"),
          {
            taskRegistry: taskRegistry,
            isUltrareviewOverageConfirmed: isUltrareviewOverageConfirmed,
            markUltrareviewOverageConfirmed: markUltrareviewOverageConfirmed,
            storageV5: storageV5,
            credentials: credentials,
          } = L.toolUseContext;
        return await runUltrareviewHeadless(h, {
          confirm: P?.confirm ?? !1,
          confirmsBeforeLaunch: !0,
          overageConfirmed: isUltrareviewOverageConfirmed(),
          markOverageConfirmed: markUltrareviewOverageConfirmed,
          context: {
            abortController: createAbortController(),
            taskRegistry: taskRegistry,
            storageV5: storageV5,
            credentials: credentials,
          },
        });
      },
      close: we,
    })
  );
}
//@ chunk-xx1vmpsq.js:88547-89147 placement
function aggregateModelUsage() {
  let values = Object.values(getModelUsage()),
    s = (n) => values.reduce((y, r) => y + n(r), 0);
  return {
    ...EMPTY_USAGE,
    input_tokens: s((n) => n.inputTokens),
    output_tokens: s((n) => n.outputTokens),
    output_tokens_details: { thinking_tokens: s((n) => n.thinkingTokens ?? 0) },
    cache_read_input_tokens: s((n) => n.cacheReadInputTokens),
    cache_creation_input_tokens: s((n) => n.cacheCreationInputTokens),
    cache_creation: {
      ephemeral_5m_input_tokens: s((n) => n.cacheCreationEphemeral5mInputTokens ?? 0),
      ephemeral_1h_input_tokens: s((n) => n.cacheCreationEphemeral1hInputTokens ?? 0),
    },
    server_tool_use: { ...EMPTY_USAGE.server_tool_use, web_search_requests: s((n) => n.webSearchRequests) },
  };
}
//@ chunk-xx1vmpsq.js:89147-89330 placement
function isHarnessCompanionMessage(e) {
  if (isHarnessMetaMessage(e)) return !0;
  if (e.type !== "user" || e.turnCompanion !== !0) return !1;
  let content = e.message.content;
  return !(Array.isArray(content) && content.length > 0 && content.every((n) => n.type === "tool_result"));
}

export { createQueryEngine, cancelScopeFor };
