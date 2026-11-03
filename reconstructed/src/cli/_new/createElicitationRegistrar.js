/**
 * cli/_new/createElicitationRegistrar.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-tyg7f3ek.js (33)
 * attribution: sole-consumer-new 33
 */
import { stat, stat as stat_2, stat as stat_3 } from "fs/promises";
import {
  setSdkDialogHostActive,
  setSdkSupportedDialogKinds,
  getSdkSupportedDialogKinds,
  getPromptId,
  getLastPersonPrompt,
  mainAgentId,
  isDiskless,
} from "../../bootstrap/state.js";
import { MCP_URL_ELICITATION_DIALOG } from "../../services/mcp/elicitationDialogs.js";
import { isSdkHostOrigin } from "../print/lowLatencySubmit.js";
import { ENUM_PROMPT } from "../../components/nudges/nudgeIds.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { isPromptModeQueuedCommand } from "../../utils/messageQueueManager.js";
import { Isr } from "../../utils/teleport/sessionCreate.js";
import { logEvent } from "../../services/analytics/index.js";
import { gn } from "../../utils/shortHash.js";
import { fromEnum, fromNumber } from "../../services/analytics/safeMetadata.js";
import { stripDeclineMessage, REFUSAL_FALLBACK_DIALOG } from "../../services/requestUserDialog.js";
import { sanitizeStringList } from "../../bridge/controlRequests.js";
import { logForDebugging } from "../../utils/debug.js";
import { hostedDesktopRefusal } from "../../services/mcp/mcpWireUtils.js";
import { iYn } from "../../plugins/bundled/claudeTest/userConfig.js";
import { logMCPDebug, logError } from "../../utils/log.js";
import {
  getFeatureValue_CACHED_MAY_BE_STALE,
  initializeGrowthBook,
  refreshGrowthBookFeatures,
} from "../../services/analytics/growthbook.js";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { nA } from "../../../vendor/axios/dist/esm/axios.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { getRequestTimingStore } from "../../services/tools/toolExecution.js";
import { executeNotificationHooks } from "../../utils/hooks.js";
import { enqueueTaskNotification } from "../../utils/task/taskNotifications.js";
import {
  parseInFlightServedCalls,
  isRemoteCapableCall,
  inFlightCallsFor,
  remoteCallsBehindLastSent,
} from "../../utils/remoteTools/restartNotices.js";
import { Jet, interruptedTurnResumePolicy } from "../../utils/conversationRecovery.js";
import { hasPendingActions, hasRowsAfterTime, singlePendingAction } from "../print/wakeRouter.js";
import { B7 } from "../../services/remoteTools/shellForwarding.js";
import { eP } from "../../bootstrap/stateSlices.js";
import {
  normalizeMessages,
  singleTextContent,
  isOnlySystemReminders,
  isSyntheticApiErrorMessage,
  isContextAppendMessage,
} from "../../utils/messages.js";
import { findLastUserPromptUuid, isPlainInterruptMarker } from "../../utils/transcript/deserialize.js";
import { _Wt } from "../../utils/transcript/turnClassification.js";
import { isAbortError, errorMessage, getErrnoCode } from "../../utils/errors.js";
import { Qoe } from "../../utils/transcript/transcriptFiles.js";
import { findToolByName } from "../../Tool.js";
import { describeUnsentServedCalls } from "../print/permissionAsks.js";
import { env } from "../../utils/env.js";
import {
  getRemoteFeatureGateState,
  getRemoteFlagOverrideState,
} from "../../utils/permissions/yoloClassifier.js";
import { TENGU_SNUG_QUILL, TENGU_SPLENDID_LYNX, TENGU_MELLOW_RAINBOW } from "../../services/api/withRetry.js";
import { withDeadline } from "../../utils/sleep.js";
import {
  findUnresolvedToolUseMessageRows,
  findUnresolvedToolUse,
  getTranscriptPath,
  MAX_TRANSCRIPT_READ_BYTES,
  getTranscriptStorageKey,
  loadTranscriptFile,
  findUnresolvedToolUsesInTranscript,
  assistantMessageRowsInTranscript,
} from "../../utils/sessionStorage.js";
import { SKIP_PRECOMPACT_THRESHOLD } from "../../utils/sessionStoragePortable.js";
import { isEssentialTrafficOnly } from "../../utils/privacyLevel.js";

//@ chunk-tyg7f3ek.js:380090-380142 sole-consumer-new
function sA() {
  return require("./chunk-asne9cp8.js");
}
//@ chunk-tyg7f3ek.js:380142-380186 sole-consumer-new
function rA() {
  return sA().mcpClientModule();
}
//@ chunk-tyg7f3ek.js:380186-380242 sole-consumer-new
function oA() {
  return sA().mcpElicitationHandlerModule();
}
//@ chunk-tyg7f3ek.js:380242-380279 sole-consumer-new
var ANTHROPIC_PERMISSIONDISPLAY = "anthropic/permissionDisplay";
//@ chunk-tyg7f3ek.js:380279-380480 sole-consumer-new
function readPermissionDisplayMeta(meta) {
  let n = meta?.[ANTHROPIC_PERMISSIONDISPLAY];
  if (n == null || typeof n !== "object") return;
  let r = n,
    s = (h) => (typeof r[h] === "string" ? r[h] : void 0);
  return { title: s("title"), displayName: s("displayName"), description: s("description") };
}
/**
 * 无界面模式的用户对话框处理器：MCP elicitation 转给 structuredIO.handleElicitation；SDK 宿主对话框先校验载荷，队列里已有提示时直接取消，否则发 requestUserDialog 并校验结果，失败时返回对话框默认值。
 */
//@ chunk-tyg7f3ek.js:380480-381503 sole-consumer-new
function createSdkUserDialogHandler(structuredIO, commandQueue) {
  return (
    setSdkDialogHostActive(!0),
    async function (dialog, payload, options) {
      if (dialog.kind === MCP_URL_ELICITATION_DIALOG.kind) {
        let S = payload;
        return await structuredIO.handleElicitation(
          S.serverName,
          S.params.message,
          void 0,
          options?.signal,
          S.params.mode,
          S.params.url,
          "elicitationId" in S.params ? S.params.elicitationId : void 0,
          readPermissionDisplayMeta(S.params._meta),
        );
      }
      if (isSdkHostOrigin(dialog.kind, "sdk_host")) {
        let S = dialog.kind === ENUM_PROMPT ? dialog.payload().safeParse(payload) : null;
        if (S?.success === !1)
          return (logForDiagnosticsNoPII("error", "cli_enum_prompt_invalid_not_sent"), dialog.default);
        let R = S?.data ?? payload;
        if (commandQueue.peek(isPromptModeQueuedCommand) !== void 0) {
          let L = Isr(dialog.kind, R);
          return (
            logEvent("tengu_request_user_dialog_implicit_cancel", {
              dialog_kind: gn(dialog.kind),
              ...(L !== void 0 && { dialog_source: gn(L) }),
              reason: fromEnum("queued_at_park"),
            }),
            options?.onSettledUnanswered?.("moved_on"),
            options?.onSkippedForQueuedPrompt?.(),
            dialog.default
          );
        }
        let requestUserDialog = await structuredIO.requestUserDialog(dialog.kind, R, {
          signal: options?.signal,
          onSettledUnanswered: options?.onSettledUnanswered,
          parkTimeoutMs: options?.parkTimeoutMs,
          closesOnNewPrompt: options?.closesOnNewPrompt,
        });
        if (requestUserDialog.behavior === "cancelled") return dialog.default;
        let safeParse = dialog.result().safeParse(requestUserDialog.result);
        return safeParse.success ? stripDeclineMessage(safeParse.data) : dialog.default;
      }
      return dialog.default;
    }
  );
}
//@ chunk-tyg7f3ek.js:381503-381631 sole-consumer-new
function declareSdkDialogKinds(kinds, attaching, sessionState) {
  let s = sanitizeStringList(kinds);
  (setSdkSupportedDialogKinds(s, attaching ? "attach_time" : "create_time"),
    sessionState.notifyInternalMetadataChanged({ declared_dialog_kinds: s }));
}
/**
 * 从上一工作进程的 internal.declared_dialog_kinds 恢复 SDK 声明的对话框种类（只在尚未声明时）。
 */
//@ chunk-tyg7f3ek.js:381631-381902 sole-consumer-new
function restoreDeclaredDialogKinds(restoredState) {
  let n = restoredState?.internal?.declared_dialog_kinds;
  if (!Array.isArray(n) || getSdkSupportedDialogKinds() !== void 0) return;
  let r = sanitizeStringList(n);
  (setSdkSupportedDialogKinds(r, "restored"),
    logEvent("tengu_supported_dialog_kinds_restored", { n_kinds: fromNumber(r.length) }),
    logForDebugging(`restored ${r.length} declared dialog kind(s) from prior worker epoch`));
}
//@ chunk-tyg7f3ek.js:381902-382043 sole-consumer-new
function cancelPendingUserDialogs(structuredIO, reason) {
  let cancelPendingUserDialogs = structuredIO.cancelPendingUserDialogs(REFUSAL_FALLBACK_DIALOG.kind, reason);
  if (cancelPendingUserDialogs > 0)
    logForDiagnosticsNoPII("info", "cli_user_dialog_implicit_cancel", {
      cancelled_count: cancelPendingUserDialogs,
      reason: reason,
    });
}
//@ chunk-tyg7f3ek.js:382043-382290 sole-consumer-new
function cancelDialogsOnNewPrompt(structuredIO, unattendedRecord, isPersonPrompt, reason, closesAt) {
  if (!isPersonPrompt) {
    structuredIO.logDialogsLeftUp(reason);
    return;
  }
  unattendedRecord.notePersonWrote();
  let y = "new_user_message",
    cancelDialogsANewPromptCloses = structuredIO.cancelDialogsANewPromptCloses(y);
  if (cancelDialogsANewPromptCloses > 0)
    logForDiagnosticsNoPII("info", "cli_user_dialog_implicit_cancel", {
      cancelled_count: cancelDialogsANewPromptCloses,
      reason: y,
      closes_on_new_prompt_at: closesAt,
    });
}
//@ chunk-tyg7f3ek.js:382290-382385 sole-consumer-new
var cA = {
  maxOutstanding: 1 / 0,
  maxAdmittedPerMinute: 1 / 0,
  maxRequestBytes: 1 / 0,
  completions: "forward",
};
/**
 * 为已连接的非 SDK MCP 服务器注册 elicitation 处理：按并发上限、每提示次数（tengu_linear_quail）、每分钟次数、请求大小限流；先跑 Elicitation hooks，再转给 SDK 宿主；可转发完成通知。内置插件同名服务器一律取消。
 */
//@ chunk-tyg7f3ek.js:382385-385935 sole-consumer-new
function createElicitationRegistrar({
  structuredIO: structuredIO,
  session: session,
  storageV5: storageV5,
  credentials: credentials,
  limits: limits,
  withdrawOn: withdrawOn,
  onRefused: onRefused,
}) {
  let weakSet = new WeakSet(),
    w = 0,
    P = [],
    weakMap = new WeakMap(),
    q = 0,
    x = "",
    G = "";
  return function (clients) {
    for (let client of clients) {
      if (client.type !== "connected" || weakSet.has(client.client)) continue;
      if (client.config.type === "sdk") continue;
      if (hostedDesktopRefusal(client) !== void 0) continue;
      if (iYn(client.name, client.config.pluginSource)) {
        (logMCPDebug(
          client.name,
          "Only a person at a terminal can answer the questions of a built-in plugin's server of this name. This host has no terminal, so every question from this server is answered with cancel",
        ),
          weakSet.add(client.client));
        continue;
      }
      let Ue = client.name;
      try {
        if (
          (rA().onMcpElicitRequest(client, async (request, extra) => {
            if (withdrawOn?.aborted) return { action: "cancel" };
            let startTime = performance.now(),
              Se,
              me = `${getPromptId()} ${getLastPersonPrompt()?.uuid}`;
            if (me !== x) ((x = me), (q = 0));
            let Me = getFeatureValue_CACHED_MAY_BE_STALE("tengu_linear_quail", 0);
            if (w >= limits.maxOutstanding) Se = "cap";
            else if (Number.isInteger(Me) && Me > 0 && q >= Me) {
              if (((Se = "unanswered"), G !== me)) ((G = me), logFeatureSad("mcp_question_brake", "refused"));
            } else if (limits.maxAdmittedPerMinute !== 1 / 0) {
              while (P.length > 0 && startTime - P[0] >= 60000) P.shift();
              if (P.length >= limits.maxAdmittedPerMinute) Se = "rate";
            }
            if (Se === void 0 && limits.maxRequestBytes !== 1 / 0 && nA(request, limits.maxRequestBytes))
              Se = "size";
            if (Se !== void 0) return (onRefused?.(Se), { action: "cancel" });
            let transportErrorState = client.transportErrorState,
              He =
                transportErrorState !== void 0 && transportErrorState.activeCallWatchdogs.size > 0
                  ? getWatchdogAbortSet(transportErrorState.activeCallWatchdogs, weakMap)
                  : void 0,
              Xe =
                He !== void 0 &&
                transportErrorState !== void 0 &&
                Array.from(transportErrorState.activeCallWatchdogs).every((Lt) => Lt.offCriticalPath),
              We = He === void 0 ? void 0 : new AbortController(),
              St = [extra.signal];
            if (withdrawOn !== null) St.push(withdrawOn);
            if (We !== void 0) St.push(We.signal);
            let wt = St.length === 1 ? extra.signal : AbortSignal.any(St);
            if (limits.maxAdmittedPerMinute !== 1 / 0) P.push(startTime);
            if (transportErrorState) transportErrorState.pendingElicitations++;
            if ((w++, He !== void 0 && We !== void 0)) He.add(We);
            try {
              logMCPDebug(Ue, `Elicitation request received in print mode: ${jsonStringify(request)}`);
              let Lt = request.params.mode === "url" ? "url" : "form";
              logEvent("tengu_mcp_elicitation_shown", { mode: fromEnum(Lt) });
              let runElicitationHooks = await oA().runElicitationHooks(Ue, request.params, wt);
              if (runElicitationHooks)
                return (
                  logMCPDebug(Ue, `Elicitation resolved by hook: ${jsonStringify(runElicitationHooks)}`),
                  logEvent("tengu_mcp_elicitation_response", {
                    mode: fromEnum(Lt),
                    action: fromEnum(runElicitationHooks.action),
                    byHook: !0,
                  }),
                  runElicitationHooks
                );
              let _n = Lt === "url" && "url" in request.params ? request.params.url : void 0,
                Mn = "requestedSchema" in request.params ? request.params.requestedSchema : void 0,
                jn =
                  Lt === "url" && "elicitationId" in request.params ? request.params.elicitationId : void 0,
                Jn = readPermissionDisplayMeta(request.params._meta),
                list = Array.from(transportErrorState?.activeCallWatchdogs ?? []),
                Dr = getRequestTimingStore(),
                $r =
                  Dr === void 0 || Dr === transportErrorState?.dialledUnder
                    ? list
                    : list.filter((En) => En.timing === Dr);
              $r.forEach((En) => En.questionOpened?.());
              let $n = $r.length === 1 ? $r[0] : void 0;
              if ($n !== void 0) $n.openQuestions = ($n.openQuestions ?? 0) + 1;
              let startTime = performance.now(),
                Yt;
              try {
                Yt = await structuredIO.handleElicitation(
                  Ue,
                  request.params.message,
                  Mn,
                  wt,
                  Lt,
                  _n,
                  jn,
                  Jn,
                  Xe,
                );
              } finally {
                if ($n !== void 0) $n.openQuestions = ($n.openQuestions ?? 1) - 1;
                $r.forEach((En) => En.questionClosed?.());
              }
              if (me === x) q = wt.aborted ? q + 1 : 0;
              let rounded = Math.round(performance.now() - startTime),
                runElicitationResultHooks = await oA().runElicitationResultHooks(Ue, Yt, wt, Lt, jn);
              if (runElicitationResultHooks.action !== Yt.action)
                logEvent("tengu_mcp_elicitation_result_hook", {
                  mode: fromEnum(Lt),
                  action: fromEnum(runElicitationResultHooks.action),
                });
              return (
                logEvent("tengu_mcp_elicitation_response", {
                  mode: fromEnum(Lt),
                  action: fromEnum(runElicitationResultHooks.action),
                  ...($r.some((En) => En.questionClosed) && { question_open_ms: rounded }),
                }),
                runElicitationResultHooks
              );
            } finally {
              if ((w--, We !== void 0)) He?.delete(We);
              if (transportErrorState)
                (transportErrorState.pendingElicitations--,
                  (transportErrorState.lastElicitationClosedAt = Date.now()));
            }
          }),
          limits.completions === "forward")
        )
          rA().onMcpElicitationComplete(client, (ce) => {
            (logMCPDebug(Ue, `Elicitation completion notification: ${ce}`),
              executeNotificationHooks(
                session,
                {
                  message: `MCP server "${Ue}" confirmed elicitation ${ce} complete`,
                  notificationType: "elicitation_complete",
                },
                { storageV5: storageV5, credentials: credentials },
              ),
              enqueueTaskNotification({
                type: "system",
                subtype: "elicitation_complete",
                mcp_server_name: Ue,
                elicitation_id: ce,
              }));
          });
        weakSet.add(client.client);
      } catch {}
    }
  };
}
/**
 * 给一组活动调用看门狗挂上"全部结束即中止"的 AbortController 集合：包装 delete，集合清空且开关 tengu_misty_twilight 开时中止所有登记的控制器。
 */
//@ chunk-tyg7f3ek.js:385935-386167 sole-consumer-new
function getWatchdogAbortSet(watchdogs, cache) {
  let r = cache.get(watchdogs);
  if (r !== void 0) return r;
  let s = new Set();
  cache.set(watchdogs, s);
  let h = watchdogs.delete.bind(watchdogs);
  return (
    (watchdogs.delete = (y) => {
      let S = h(y);
      if (S && watchdogs.size === 0 && getFeatureValue_CACHED_MAY_BE_STALE("tengu_misty_twilight", !0))
        for (let R of Array.from(s)) R.abort();
      return S;
    }),
    s
  );
}
/**
 * 恢复会话时确定被打断的回合：先找上一工作进程记录、不在续跑链上的已服务调用（findOffChainServedCalls），没有再找"卡片在提示后"的情形；出错时退回 load 的中断状态。
 */
//@ chunk-tyg7f3ek.js:386167-386700 sole-consumer-new
async function resolveResumeInterruption(options) {
  let { restored: restored, load: load, forwarding: forwarding, findUnresolved: findUnresolved } = options,
    y = forwarding ? parseInFlightServedCalls(restored?.internal?.in_flight_served_calls) : [],
    filtered = y.map((R) => R.tool_use_id).filter((R) => load.supersededToolUseIds?.has(R) ?? !1);
  try {
    let R = await findOffChainServedCalls(options, y, filtered);
    return R.offChainToolNames.size > 0 ? R : { ...R, ...(await findParkedCardBehindNote(options)) };
  } catch (error) {
    logResumeLookupFailure("counting the calls off the resume chain", error);
    let w = new Map();
    try {
      w = await findUnresolved(filtered);
    } catch (error) {
      logResumeLookupFailure("looking up the chain's own journaled calls", error);
    }
    return {
      turnInterruptionState: load.turnInterruptionState,
      offChainToolNames: new Map(),
      journaledToolUses: w,
    };
  }
}
/**
 * 找出上一工作进程记录、未在 transcript 中得到结果的已服务调用，把它们视为被打断回合的工具调用，返回中断状态、离链工具名与已记录的 tool_use。
 */
//@ chunk-tyg7f3ek.js:386700-388620 sole-consumer-new
async function findOffChainServedCalls(
  {
    restored: restored,
    load: load,
    chain: chain,
    tools: tools,
    findUnresolved: findUnresolved,
    findOnPrunedBranch: findOnPrunedBranch,
    lane: lane,
  },
  journaledCalls,
  supersededIds,
) {
  let turnInterruptionState = load.turnInterruptionState,
    L =
      turnInterruptionState?.kind === "none"
        ? findTrailingRestartContinuation(chain, isRestartContinuationRow)
        : void 0,
    q = L !== void 0 ? chain.slice(0, L.continuationIndex + 1) : [];
  if (!(
    journaledCalls.length > 0 &&
    lane.resumeInterruptedTurn &&
    load.rescueSuppressed !== !0 &&
    turnInterruptionState !== void 0 &&
    load.supersededToolUseIds?.size === 0 &&
    (turnInterruptionState.kind !== "none" ||
      (L !== void 0 && !Jet(q, interruptedTurnResumePolicy(hasPendingActions(restored))?.maxAgeMs ?? 0)))
  ))
    return {
      turnInterruptionState: turnInterruptionState,
      offChainToolNames: new Map(),
      journaledToolUses: await findUnresolved(supersededIds),
    };
  let G = new Set(
      chain.flatMap((ie) =>
        ie.type === "user" && Array.isArray(ie.message.content)
          ? ie.message.content.flatMap((Se) => (Se.type === "tool_result" ? [Se.tool_use_id] : []))
          : [],
      ),
    ),
    filtered = journaledCalls.filter(
      (ie) =>
        !G.has(ie.tool_use_id) &&
        (turnInterruptionState.kind !== "none" || Date.now() - ie.dispatched_at <= B7),
    ),
    re = await findUnresolved(filtered.map((ie) => ie.tool_use_id)),
    [Ae, ...Ue] = filtered.filter((ie) => !re.has(ie.tool_use_id)),
    ce = new Map(re);
  if (L !== void 0 && Ae !== void 0 && Ue.length === 0) {
    let ie = await findOnPrunedBranch(Ae.tool_use_id);
    if (ie !== null) ce.set(Ae.tool_use_id, ie);
  }
  let flattened = filtered.flatMap((ie) => {
    let Se = ce.get(ie.tool_use_id),
      me = Array.isArray(Se?.message.content)
        ? Se.message.content.find((Ee) => Ee.type === "tool_use" && Ee.id === ie.tool_use_id)
        : void 0,
      Me = Se === void 0 ? NaN : Date.parse(Se.timestamp);
    return Se !== void 0 &&
      me?.type === "tool_use" &&
      me.name === ie.tool &&
      isRemoteCapableCall(Se, ie.tool_use_id, tools, ie.host) &&
      Number.isFinite(Me) &&
      !hasRowsAfterTime(chain, Me, isRestartContinuationRow)
      ? [{ toolUseId: ie.tool_use_id, name: me.name }]
      : [];
  });
  if (flattened.length === 0)
    return {
      turnInterruptionState: turnInterruptionState,
      offChainToolNames: new Map(),
      journaledToolUses: ce,
    };
  return (
    logForDebugging(
      `[print.ts] ${flattened.length} served call(s) the previous worker journaled are off the resume chain but unresolved in the transcript: treating them as the interrupted turn's (${flattened.map(({ toolUseId: toolUseId }) => toolUseId).join(",")})${turnInterruptionState.kind === "none" ? "; the chain ends on a restart continuation, so the turn reads as interrupted" : ""}`,
    ),
    {
      turnInterruptionState:
        (L !== void 0 ? buildInterruptedPromptState(chain, L) : void 0) ?? turnInterruptionState,
      offChainToolNames: new Map(flattened.map(({ toolUseId: toolUseId, name: Se }) => [toolUseId, Se])),
      journaledToolUses: ce,
    }
  );
}
/**
 * 链末是重启续跑消息、外部 pending_action 与 transcript 里的 tool_use 一致时，把挂起的权限卡片视为被打断回合（ccr_card_behind_note）。
 */
//@ chunk-tyg7f3ek.js:388620-389771 sole-consumer-new
async function findParkedCardBehindNote({
  restored: restored,
  load: load,
  chain: chain,
  findUnresolved: findUnresolved,
  findOnPrunedBranch: findOnPrunedBranch,
  lane: lane,
}) {
  let pendingToolUseId = singlePendingAction(restored),
    continuation =
      load.turnInterruptionState?.kind === "none"
        ? findTrailingRestartContinuation(chain, isRestartContinuationOrQueuedRow)
        : void 0;
  if (
    pendingToolUseId === void 0 ||
    continuation === void 0 ||
    !lane.resumeInterruptedTurn ||
    load.rescueSuppressed === !0 ||
    load.supersededToolUseIds?.size !== 0 ||
    Jet(chain.slice(0, continuation.continuationIndex + 1), interruptedTurnResumePolicy(!0)?.maxAgeMs ?? 0) ||
    parseInFlightServedCalls(restored?.internal?.in_flight_served_calls).length > 0 ||
    restored?.external?.pending_action?.request_id === "" ||
    (await lane.findsCardBehindNote?.()) !== "on"
  )
    return;
  let assistantMessage =
      (await findUnresolved([pendingToolUseId])).get(pendingToolUseId) ??
      (await findOnPrunedBranch(pendingToolUseId)),
    toolUse = Array.isArray(assistantMessage?.message.content)
      ? assistantMessage.message.content.find((Z) => Z.type === "tool_use" && Z.id === pendingToolUseId)
      : void 0,
    interruptionState = buildInterruptedPromptState(chain, continuation);
  if (!assistantMessage || toolUse?.type !== "tool_use" || interruptionState === void 0) return;
  let parse = Date.parse(assistantMessage.timestamp),
    pendingAction = restored?.external?.pending_action,
    rejectReason =
      toolUse.name !== pendingAction?.tool_name
        ? "other_tool"
        : !eP(toolUse.input, pendingAction.input)
          ? "other_input"
          : "isSidechain" in assistantMessage && assistantMessage.isSidechain === !0
            ? "sidechain"
            : Date.now() - parse > B7
              ? "too_old"
              : !(Date.parse(continuation.continuation.timestamp) > parse) ||
                  hasRowsAfterTime(chain, parse, isRestartContinuationOrQueuedRow)
                ? "moved_on"
                : void 0;
  if (rejectReason !== void 0) {
    logFeatureBad("ccr_card_behind_note", rejectReason);
    return;
  }
  return (
    logFeatureOk("ccr_card_behind_note"),
    logForDiagnosticsNoPII("info", "cli_parked_card_kept_behind_note"),
    {
      turnInterruptionState: interruptionState,
      offChainToolNames: new Map([[pendingToolUseId, toolUse.name]]),
    }
  );
}
//@ chunk-tyg7f3ek.js:389771-390027 sole-consumer-new
function buildInterruptedPromptState(chain, continuation) {
  let [r] = normalizeMessages([continuation.continuation]),
    s = findLastUserPromptUuid(chain.slice(0, continuation.continuationIndex + 1));
  return (
    r && {
      kind: "interrupted_prompt",
      message: r,
      ...(s !== void 0 && { interruptedTurnUserMessageUuid: s }),
      ...(continuation.loaderSentinel !== void 0 && { loaderSentinelUuid: continuation.loaderSentinel.uuid }),
    }
  );
}
//@ chunk-tyg7f3ek.js:390027-390186 sole-consumer-new
function isRestartContinuationRow(message) {
  if (message.isMeta !== !0 || message.origin !== void 0 || message.promptSource !== void 0) return !1;
  if (isPlainInterruptMarker(message)) return !0;
  let n = singleTextContent(message.message.content);
  return n !== void 0 && isOnlySystemReminders(n);
}
//@ chunk-tyg7f3ek.js:390186-390301 sole-consumer-new
function isRestartContinuationOrQueuedRow(message) {
  return (
    isRestartContinuationRow(message) ||
    (message.isMeta === !0 &&
      message.queueTranscriptOnly === !0 &&
      message.origin === void 0 &&
      message.promptSource === void 0)
  );
}
/**
 * 从消息链末尾往前找重启续跑消息：跳过合成 API 错误（记为 loaderSentinel）和不影响的条目，遇到不满足谓词的用户消息就放弃。
 */
//@ chunk-tyg7f3ek.js:390301-390570 sole-consumer-new
function findTrailingRestartContinuation(chain, predicate) {
  let r;
  for (let s = chain.length - 1; s >= 0; s--) {
    let h = chain[s];
    if (h.type === "assistant") {
      if (isSyntheticApiErrorMessage(h)) {
        r ??= h;
        continue;
      }
      if (_Wt(h)) continue;
      return;
    }
    if (h.type !== "user" || isContextAppendMessage(h)) continue;
    if (!predicate(h)) return;
    if (isPlainInterruptMarker(h)) return { continuation: h, continuationIndex: s, loaderSentinel: r };
  }
  return;
}
//@ chunk-tyg7f3ek.js:390570-390700 sole-consumer-new
function logResumeLookupFailure(what, error) {
  if (isAbortError(error) || Qoe(error)) {
    logForDebugging(`[print.ts] ${what} failed, the boot goes on without them: ${errorMessage(error)}`, {
      level: "warn",
    });
    return;
  }
  logError(error);
}
/**
 * 恢复时计算要接管的已服务调用（有对应 assistant 消息且仍可执行）以及从未发出的调用。
 */
//@ chunk-tyg7f3ek.js:390700-391234 sole-consumer-new
async function planServedCallAdoption({
  restored: restored,
  supersededToolUseIds: supersededToolUseIds,
  parkedToolUseId: parkedToolUseId,
  journaledToolUses: journaledToolUses,
  adoptionTools: adoptionTools,
  findUnresolved: findUnresolved,
  forwarding: forwarding,
  hasRemoteToolCalls: hasRemoteToolCalls,
  flagWaitMs: flagWaitMs,
}) {
  let journaledCalls = forwarding ? inFlightCallsFor(restored, supersededToolUseIds) : [],
    flattened = journaledCalls.flatMap((x) => {
      let G = journaledToolUses.get(x.tool_use_id);
      return G !== void 0 && isRemoteCapableCall(G, x.tool_use_id, adoptionTools, x.host)
        ? [{ call: x, assistantMessage: G }]
        : [];
    }),
    neverSent = await remoteCallsBehindLastSent({
      forwarding: forwarding,
      hasRemoteToolCalls: hasRemoteToolCalls,
      flagWaitMs: flagWaitMs,
      journaled: journaledCalls,
      superseded: supersededToolUseIds,
      parkedToolUseId: parkedToolUseId,
      tools: adoptionTools,
      findUnresolved: findUnresolved,
    });
  return {
    servedCallsToAdopt: flattened,
    servedCallsNeverSent: neverSent,
    journaledServedCalls: journaledCalls.length,
  };
}
/**
 * 为接管的已服务调用构造 orphaned-permission 模式的队列提示：主调用（优先本地有工具的）作为允许的权限结果，其余作为 siblings，并附上未发出的调用说明。
 */
//@ chunk-tyg7f3ek.js:391234-391897 sole-consumer-new
function buildOrphanedPermissionPrompt({
  calls: calls,
  tools: tools,
  supersededToolNames: supersededToolNames,
  servedCallsNeverSent: servedCallsNeverSent,
}) {
  let hasTool = (L) => findToolByName(tools, L.call.tool) !== void 0,
    [primary, ...siblings] = [...calls].sort((L, q) => Number(hasTool(q)) - Number(hasTool(L))),
    callIds = new Set(calls.map((L) => L.call.tool_use_id)),
    unsentNotice = describeUnsentServedCalls(
      { supersededToolNames: supersededToolNames, servedCallsNeverSent: servedCallsNeverSent },
      (L) => !callIds.has(L),
    ),
    notSent = servedCallsNeverSent ?? [];
  return {
    mode: "orphaned-permission",
    agentId: mainAgentId(),
    value: unsentNotice ?? [],
    ...(unsentNotice !== void 0 && { isMeta: !0 }),
    orphanedPermission: {
      permissionResult: { behavior: "allow", updatedInput: {}, toolUseID: primary.call.tool_use_id },
      assistantMessage: primary.assistantMessage,
      initFirst: !0,
      ...(siblings.length > 0 && {
        siblings: siblings.map(({ call: L, assistantMessage: assistantMessage }) => ({
          toolUseID: L.tool_use_id,
          assistantMessage: assistantMessage,
        })),
      }),
      ...(notSent.length > 0 && { notSent: notSent }),
    },
  };
}
//@ chunk-tyg7f3ek.js:391897-392010 sole-consumer-new
var TENGU_POLISHED_SALAMANDER = "tengu_polished_salamander",
  TENGU_CCR_INHERITED_APPROVAL_KILLSWITCH = "tengu_ccr_inherited_approval_killswitch",
  TENGU_MENDED_RIBBON = "tengu_mended_ribbon",
  Fq = 2000;
//@ chunk-tyg7f3ek.js:392010-392077 sole-consumer-new
function xq() {
  return env.CLAUDE_CODE_PARKED_PERMISSION_WAIT_MS ?? 2000;
}
//@ chunk-tyg7f3ek.js:392077-392132 sole-consumer-new
function vA(e) {
  try {
    return getRemoteFeatureGateState(e) === "on";
  } catch {
    return !1;
  }
}
/**
 * 读取恢复被打断回合相关的环境变量与 GrowthBook 开关，返回续跑策略对象（resumeInterruptedTurn、answerGoesFirst、findsCardBehindNote 等）。
 */
//@ chunk-tyg7f3ek.js:392132-392687 sole-consumer-new
function getResumeLaneOptions() {
  return {
    resumeInterruptedTurn: env.CLAUDE_CODE_RESUME_INTERRUPTED_TURN,
    parkedStopRetires: env.CLAUDE_CODE_PARKED_STOP_RETIRES,
    runsBeforeClear: env.CLAUDE_CODE_PARKED_RUN_BEFORE_CLEAR,
    toleratesContextAppends: env.CLAUDE_CODE_RESUME_TOLERATES_CONTEXT_APPENDS,
    answerWaitMs: xq(),
    holdsParkedMessageOpen: () => vA(TENGU_POLISHED_SALAMANDER),
    answerGoesFirst: () => {
      try {
        let answerFlag = getRemoteFeatureGateState(TENGU_SNUG_QUILL);
        if (answerFlag !== "on") return answerFlag;
        let stopKeptFlag = getRemoteFeatureGateState(TENGU_SPLENDID_LYNX);
        return stopKeptFlag === "off" ? "on_but_stop_kept_flag_off" : stopKeptFlag;
      } catch {
        return "off";
      }
    },
    inheritedAnswerOff: () =>
      readFlagWhenWarm(TENGU_CCR_INHERITED_APPROVAL_KILLSWITCH, getRemoteFeatureGateState),
    findsCardBehindNote: () => readFlagWhenWarm(TENGU_MENDED_RIBBON, getRemoteFlagOverrideState),
    holdsInputBehindPrompt: () => vA(TENGU_MELLOW_RAINBOW),
  };
}
//@ chunk-tyg7f3ek.js:392687-392853 sole-consumer-new
async function readFlagWhenWarm(flag, reader) {
  try {
    if (reader(flag) === "cold")
      await withDeadline(
        initializeGrowthBook()
          .catch(() => null)
          .then(() => (reader(flag) === "cold" ? refreshGrowthBookFeatures() : void 0))
          .catch(() => {
            return;
          }),
        Fq,
      );
    return reader(flag);
  } catch {
    return "cold";
  }
}
/**
 * 返回按 tool_use id 查找未决 tool_use 的函数：tengu_eager_pillow 开时返回消息行，否则返回持有消息；对上一 assistant 回合里被取代的调用会读全部分支。
 */
//@ chunk-tyg7f3ek.js:392889-393202 sole-consumer-new
function createUnresolvedToolUseFinder({
  supersededToolUseIds: supersededToolUseIds,
  tookOverAPrompt: tookOverAPrompt,
  storageV5: storageV5,
}) {
  return async (s) => {
    let h = supersededToolUseIds?.has(s) === !0,
      y = tookOverAPrompt && h;
    if (getFeatureValue_CACHED_MAY_BE_STALE("tengu_eager_pillow", !1)) {
      let R =
        (await findUnresolvedToolUseMessageRows(s, storageV5)) ??
        (y ? await readEveryBranch(s, storageV5, !0) : null);
      return R && { ...R, inLastAssistantTurn: h };
    }
    let S = y ? await gS(s, storageV5) : await findUnresolvedToolUse(s, storageV5);
    return S && { holder: S, inLastAssistantTurn: h };
  };
}
//@ chunk-tyg7f3ek.js:393202-393281 sole-consumer-new
async function gS(e, n) {
  return (await findUnresolvedToolUse(e, n)) ?? (await readEveryBranch(e, n, !1))?.holder ?? null;
}
/**
 * 在被修剪的分支上查找未解决的 tool_use（转录大小在范围内时才查找）。
 */
//@ chunk-tyg7f3ek.js:393281-393600 sole-consumer-new
async function findUnresolvedToolUseOnAPrunedBranch(toolUseId, storageV5) {
  if (isDiskless()) return null;
  let r;
  try {
    r = (await stat_2(getTranscriptPath())).size;
  } catch (error) {
    return (
      logForDebugging(
        `findUnresolvedToolUseOnAPrunedBranch: the transcript's size could not be read (${getErrnoCode(error) ?? "no error code"}), so tool_use ${toolUseId} counts as not found`,
        { level: "warn" },
      ),
      null
    );
  }
  return r > SKIP_PRECOMPACT_THRESHOLD && r <= MAX_TRANSCRIPT_READ_BYTES
    ? ((await readEveryBranch(toolUseId, storageV5, !1))?.holder ?? null)
    : null;
}
/**
 * 保留全部分支再读一次 transcript，查找未决的 tool_use；找到时可附带 assistant 消息行，失败返回 null。
 */
//@ chunk-tyg7f3ek.js:393600-394275 sole-consumer-new
async function readEveryBranch(toolUseId, storageV5, withMessageRows) {
  try {
    let s = getTranscriptPath(),
      h = getTranscriptStorageKey(s, storageV5),
      { messages: messages } = await loadTranscriptFile(s, { keepAllLeaves: !0, ...(h && { storageV5: h }) }),
      S = findUnresolvedToolUsesInTranscript(messages.values(), [toolUseId]).get(toolUseId);
    if (S === void 0)
      return (
        logForDebugging(
          `readEveryBranch: a second read of the transcript, keeping every branch, found no unresolved tool_use ${toolUseId} either`,
        ),
        null
      );
    let R = withMessageRows
      ? { holder: S, messageRows: assistantMessageRowsInTranscript(messages, S) }
      : { holder: S };
    return (
      logForDebugging(
        `readEveryBranch: a second read of the transcript, keeping every branch, found tool_use ${toolUseId} after the first read did not`,
      ),
      logForDiagnosticsNoPII("info", "cli_tool_use_found_on_second_transcript_read"),
      R
    );
  } catch (error) {
    return (
      logForDebugging(
        `readEveryBranch: the second read of the transcript failed, so tool_use ${toolUseId} counts as not found: ${error}`,
        { level: "warn" },
      ),
      null
    );
  }
}
//@ chunk-tyg7f3ek.js:394275-394375 sole-consumer-new
function isTerminalTitleSuppressed() {
  return (
    (isEssentialTrafficOnly() || env.CLAUDE_CODE_DISABLE_TERMINAL_TITLE) &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_concurrent_moonbeam", !1)
  );
}

export {
  restoreDeclaredDialogKinds,
  getResumeLaneOptions,
  resolveResumeInterruption,
  findUnresolvedToolUseOnAPrunedBranch,
  gS,
  planServedCallAdoption,
  createUnresolvedToolUseFinder,
  buildOrphanedPermissionPrompt,
  createElicitationRegistrar,
  cA,
  createSdkUserDialogHandler,
  cancelPendingUserDialogs,
  isTerminalTitleSuppressed,
  cancelDialogsOnNewPrompt,
  declareSdkDialogKinds,
};
