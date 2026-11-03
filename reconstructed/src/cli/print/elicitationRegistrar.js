/**
 * cli/print/elicitationRegistrar.ts
 *
 * 2.1.316 新增：print 模式的交互式提问与用户对话框注册表：SDK 对话框种类声明/恢复、待决对话框取消、被中断回合的恢复规划（车道选项、未完成工具调用、孤儿权限提示）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-tyg7f3ek.js (33)
 * attribution: placement 33
 */
import { stat } from "fs/promises";
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
import { isSdkHostOrigin } from "./lowLatencySubmit.js";
import { ENUM_PROMPT } from "../../components/nudges/nudgeIds.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { isPromptModeQueuedCommand } from "../../utils/messageQueueManager.js";
import { dialogSourceOf } from "../../utils/teleport/sessionCreate.js";
import { logEvent } from "../../services/analytics/index.js";
import { shortHash } from "../../utils/shortHash.js";
import { fromEnum, fromNumber } from "../../services/analytics/safeMetadata.js";
import { stripDeclineMessage, REFUSAL_FALLBACK_DIALOG } from "../../services/requestUserDialog.js";
import { sanitizeStringList } from "../../bridge/controlRequests.js";
import { logForDebugging } from "../../utils/debug.js";
import { hostedDesktopRefusal_2 } from "../../services/mcp/mcpWireUtils.js";
import { isPersonOnlyPluginServer } from "../../plugins/bundled/claudeTest/userConfig.js";
import { logMCPDebug, logError } from "../../utils/log.js";
import {
  getFeatureValue_CACHED_MAY_BE_STALE,
  initializeGrowthBook,
  refreshGrowthBookFeatures,
} from "../../services/analytics/growthbook.js";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { nA } from "./_new/elicitationRegistrar.helpers-tyg7.js";
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
import { isResumeTooOld, interruptedTurnResumePolicy } from "../../utils/conversationRecovery.js";
import { hasPendingActions, hasRowsAfterTime, singlePendingAction } from "./wakeRouter.js";
import { SYNC_ANSWER_TTL_MS } from "../../services/remoteTools/shellForwarding.js";
import { deepEqualIgnoringUndefined } from "../../bootstrap/stateSlices.js";
import {
  normalizeMessages,
  singleTextContent,
  isOnlySystemReminders,
  isSyntheticApiErrorMessage,
  isContextAppendMessage,
} from "../../utils/messages.js";
import { findLastUserPromptUuid, isPlainInterruptMarker } from "../../utils/transcript/deserialize.js";
import { isUnattendedStartUnconfirmed } from "../../utils/transcript/turnClassification.js";
import { isAbortError, errorMessage, getErrnoCode } from "../../utils/errors.js";
import { isTranscriptLoadError } from "../../utils/transcript/transcriptFiles.js";
import { findToolByName } from "../../Tool.js";
import { describeUnsentServedCalls } from "./permissionAsks.js";
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

//@ chunk-tyg7f3ek.js:380090-380142 placement
function mcpModulesChunk() {
  return require("./chunk-asne9cp8.js");
}
//@ chunk-tyg7f3ek.js:380142-380186 placement
function mcpClientModule_3() {
  return mcpModulesChunk().mcpClientModule();
}
//@ chunk-tyg7f3ek.js:380186-380242 placement
function mcpElicitationHandlerModule() {
  return mcpModulesChunk().mcpElicitationHandlerModule();
}
//@ chunk-tyg7f3ek.js:380242-380279 placement
var ANTHROPIC_PERMISSIONDISPLAY = "anthropic/permissionDisplay";
//@ chunk-tyg7f3ek.js:380279-380480 placement
function readPermissionDisplayMeta(meta) {
  let n = meta?.[ANTHROPIC_PERMISSIONDISPLAY];
  if (n == null || typeof n !== "object") return;
  let r = n;
  let s = (h) => (typeof r[h] === "string" ? r[h] : undefined);
  return {
    title: s("title"),
    displayName: s("displayName"),
    description: s("description"),
  };
}
//@ chunk-tyg7f3ek.js:380480-381503 placement
/**
 * 无界面模式的用户对话框处理器：MCP elicitation 转给 structuredIO.handleElicitation；SDK 宿主对话框先校验载荷，队列里已有提示时直接取消，否则发 requestUserDialog 并校验结果，失败时返回对话框默认值。
 */
function createSdkUserDialogHandler(structuredIO, commandQueue) {
  setSdkDialogHostActive(true);
  return async function (dialog, payload, options) {
    if (dialog.kind === MCP_URL_ELICITATION_DIALOG.kind) {
      let S = payload;
      return await structuredIO.handleElicitation(
        S.serverName,
        S.params.message,
        undefined,
        options?.signal,
        S.params.mode,
        S.params.url,
        "elicitationId" in S.params ? S.params.elicitationId : undefined,
        readPermissionDisplayMeta(S.params._meta),
      );
    }
    if (isSdkHostOrigin(dialog.kind, "sdk_host")) {
      let S = dialog.kind === ENUM_PROMPT ? dialog.payload().safeParse(payload) : null;
      if (S?.success === false) {
        logForDiagnosticsNoPII("error", "cli_enum_prompt_invalid_not_sent");
        return dialog.default;
      }
      let R = S?.data ?? payload;
      if (commandQueue.peek(isPromptModeQueuedCommand) !== undefined) {
        let L = dialogSourceOf(dialog.kind, R);
        logEvent("tengu_request_user_dialog_implicit_cancel", {
          dialog_kind: shortHash(dialog.kind),
          ...(L !== undefined && {
            dialog_source: shortHash(L),
          }),
          reason: fromEnum("queued_at_park"),
        });
        options?.onSettledUnanswered?.("moved_on");
        options?.onSkippedForQueuedPrompt?.();
        return dialog.default;
      }
      let w = await structuredIO.requestUserDialog(dialog.kind, R, {
        signal: options?.signal,
        onSettledUnanswered: options?.onSettledUnanswered,
        parkTimeoutMs: options?.parkTimeoutMs,
        closesOnNewPrompt: options?.closesOnNewPrompt,
      });
      if (w.behavior === "cancelled") return dialog.default;
      let P = dialog.result().safeParse(w.result);
      return P.success ? stripDeclineMessage(P.data) : dialog.default;
    }
    return dialog.default;
  };
}
//@ chunk-tyg7f3ek.js:381503-381631 placement
function declareSdkDialogKinds(kinds, attaching, sessionState) {
  let s = sanitizeStringList(kinds);
  setSdkSupportedDialogKinds(s, attaching ? "attach_time" : "create_time");
  sessionState.notifyInternalMetadataChanged({
    declared_dialog_kinds: s,
  });
}
//@ chunk-tyg7f3ek.js:381631-381902 placement
/**
 * 从上一工作进程的 internal.declared_dialog_kinds 恢复 SDK 声明的对话框种类（只在尚未声明时）。
 */
function restoreDeclaredDialogKinds(restoredState) {
  let declaredDialogKinds = restoredState?.internal?.declared_dialog_kinds;
  if (!Array.isArray(declaredDialogKinds) || getSdkSupportedDialogKinds() !== undefined) return;
  let r = sanitizeStringList(declaredDialogKinds);
  setSdkSupportedDialogKinds(r, "restored");
  logEvent("tengu_supported_dialog_kinds_restored", {
    n_kinds: fromNumber(r.length),
  });
  logForDebugging(`restored ${r.length} declared dialog kind(s) from prior worker epoch`);
}
//@ chunk-tyg7f3ek.js:381902-382043 placement
function cancelPendingUserDialogs(structuredIO, reason) {
  let r = structuredIO.cancelPendingUserDialogs(REFUSAL_FALLBACK_DIALOG.kind, reason);
  if (r > 0)
    logForDiagnosticsNoPII("info", "cli_user_dialog_implicit_cancel", {
      cancelled_count: r,
      reason,
    });
}
//@ chunk-tyg7f3ek.js:382043-382290 placement
function cancelDialogsOnNewPrompt(structuredIO, unattendedRecord, isPersonPrompt, reason, closesAt) {
  if (!isPersonPrompt) {
    structuredIO.logDialogsLeftUp(reason);
    return;
  }
  unattendedRecord.notePersonWrote();
  let y = "new_user_message";
  let S = structuredIO.cancelDialogsANewPromptCloses(y);
  if (S > 0)
    logForDiagnosticsNoPII("info", "cli_user_dialog_implicit_cancel", {
      cancelled_count: S,
      reason: y,
      closes_on_new_prompt_at: closesAt,
    });
}
//@ chunk-tyg7f3ek.js:382290-382385 placement
var DISABLED_ELICITATION_LIMITS = {
  maxOutstanding: 1 / 0,
  maxAdmittedPerMinute: 1 / 0,
  maxRequestBytes: 1 / 0,
  completions: "forward",
};
//@ chunk-tyg7f3ek.js:382385-385935 placement
/**
 * 为已连接的非 SDK MCP 服务器注册 elicitation 处理：按并发上限、每提示次数（tengu_linear_quail）、每分钟次数、请求大小限流；先跑 Elicitation hooks，再转给 SDK 宿主；可转发完成通知。内置插件同名服务器一律取消。
 */
function createElicitationRegistrar({
  structuredIO,
  session,
  storageV5,
  credentials,
  limits,
  withdrawOn,
  onRefused,
}) {
  let weakSet = new WeakSet();
  let w = 0;
  let P = [];
  let weakMap = new WeakMap();
  let q = 0;
  let x = "";
  let G = "";
  return function (clients) {
    for (let client of clients) {
      if (client.type !== "connected" || weakSet.has(client.client)) continue;
      if (client.config.type === "sdk") continue;
      if (hostedDesktopRefusal_2(client) !== undefined) continue;
      if (isPersonOnlyPluginServer(client.name, client.config.pluginSource)) {
        logMCPDebug(
          client.name,
          "Only a person at a terminal can answer the questions of a built-in plugin's server of this name. This host has no terminal, so every question from this server is answered with cancel",
        );
        weakSet.add(client.client);
        continue;
      }
      let Ue = client.name;
      try {
        mcpClientModule_3().onMcpElicitRequest(client, async (request, extra) => {
          if (withdrawOn?.aborted)
            return {
              action: "cancel",
            };
          let startTime = performance.now();
          let Se;
          let me = `${getPromptId()} ${getLastPersonPrompt()?.uuid}`;
          if (me !== x) {
            x = me;
            q = 0;
          }
          let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE("tengu_linear_quail", 0);
          if (w >= limits.maxOutstanding) Se = "cap";
          else if (
            Number.isInteger(featureValue_CACHED_MAY_BE_STALE) &&
            featureValue_CACHED_MAY_BE_STALE > 0 &&
            q >= featureValue_CACHED_MAY_BE_STALE
          ) {
            Se = "unanswered";
            if (G !== me) {
              G = me;
              logFeatureSad("mcp_question_brake", "refused");
            }
          } else if (limits.maxAdmittedPerMinute !== 1 / 0) {
            while (P.length > 0 && startTime - P[0] >= 60000) P.shift();
            if (P.length >= limits.maxAdmittedPerMinute) Se = "rate";
          }
          if (Se === undefined && limits.maxRequestBytes !== 1 / 0 && nA(request, limits.maxRequestBytes))
            Se = "size";
          if (Se !== undefined) {
            onRefused?.(Se);
            return {
              action: "cancel",
            };
          }
          let transportErrorState = client.transportErrorState;
          let He =
            transportErrorState !== undefined && transportErrorState.activeCallWatchdogs.size > 0
              ? getWatchdogAbortSet(transportErrorState.activeCallWatchdogs, weakMap)
              : undefined;
          let Xe =
            He !== undefined &&
            transportErrorState !== undefined &&
            Array.from(transportErrorState.activeCallWatchdogs).every(
              (activeCallWatchdog) => activeCallWatchdog.offCriticalPath,
            );
          let We = He === undefined ? undefined : new AbortController();
          let St = [extra.signal];
          if (withdrawOn !== null) St.push(withdrawOn);
          if (We !== undefined) St.push(We.signal);
          let wt = St.length === 1 ? extra.signal : AbortSignal.any(St);
          if (limits.maxAdmittedPerMinute !== 1 / 0) P.push(startTime);
          if (transportErrorState) transportErrorState.pendingElicitations++;
          w++;
          if (He !== undefined && We !== undefined) He.add(We);
          try {
            logMCPDebug(Ue, `Elicitation request received in print mode: ${jsonStringify(request)}`);
            let Lt = request.params.mode === "url" ? "url" : "form";
            logEvent("tengu_mcp_elicitation_shown", {
              mode: fromEnum(Lt),
            });
            let pn = await mcpElicitationHandlerModule().runElicitationHooks(Ue, request.params, wt);
            if (pn) {
              logMCPDebug(Ue, `Elicitation resolved by hook: ${jsonStringify(pn)}`);
              logEvent("tengu_mcp_elicitation_response", {
                mode: fromEnum(Lt),
                action: fromEnum(pn.action),
                byHook: true,
              });
              return pn;
            }
            let url = Lt === "url" && "url" in request.params ? request.params.url : undefined;
            let requestedSchema =
              "requestedSchema" in request.params ? request.params.requestedSchema : undefined;
            let elicitationId =
              Lt === "url" && "elicitationId" in request.params ? request.params.elicitationId : undefined;
            let permissionDisplayMeta = readPermissionDisplayMeta(request.params._meta);
            let list = Array.from(transportErrorState?.activeCallWatchdogs ?? []);
            let requestTimingStore = getRequestTimingStore();
            let $r =
              requestTimingStore === undefined || requestTimingStore === transportErrorState?.dialledUnder
                ? list
                : list.filter((En) => En.timing === requestTimingStore);
            $r.forEach((En) => En.questionOpened?.());
            let $n = $r.length === 1 ? $r[0] : undefined;
            if ($n !== undefined) $n.openQuestions = ($n.openQuestions ?? 0) + 1;
            let startTime = performance.now();
            let Yt;
            try {
              Yt = await structuredIO.handleElicitation(
                Ue,
                request.params.message,
                requestedSchema,
                wt,
                Lt,
                url,
                elicitationId,
                permissionDisplayMeta,
                Xe,
              );
            } finally {
              if ($n !== undefined) $n.openQuestions = ($n.openQuestions ?? 1) - 1;
              $r.forEach((En) => En.questionClosed?.());
            }
            if (me === x) q = wt.aborted ? q + 1 : 0;
            let questionOpenMs = Math.round(performance.now() - startTime);
            let kn = await mcpElicitationHandlerModule().runElicitationResultHooks(
              Ue,
              Yt,
              wt,
              Lt,
              elicitationId,
            );
            if (kn.action !== Yt.action)
              logEvent("tengu_mcp_elicitation_result_hook", {
                mode: fromEnum(Lt),
                action: fromEnum(kn.action),
              });
            logEvent("tengu_mcp_elicitation_response", {
              mode: fromEnum(Lt),
              action: fromEnum(kn.action),
              ...($r.some((En) => En.questionClosed) && {
                question_open_ms: questionOpenMs,
              }),
            });
            return kn;
          } finally {
            w--;
            if (We !== undefined) He?.delete(We);
            if (transportErrorState) {
              transportErrorState.pendingElicitations--;
              transportErrorState.lastElicitationClosedAt = Date.now();
            }
          }
        });
        if (limits.completions === "forward")
          mcpClientModule_3().onMcpElicitationComplete(client, (ce) => {
            logMCPDebug(Ue, `Elicitation completion notification: ${ce}`);
            executeNotificationHooks(
              session,
              {
                message: `MCP server "${Ue}" confirmed elicitation ${ce} complete`,
                notificationType: "elicitation_complete",
              },
              {
                storageV5,
                credentials,
              },
            );
            enqueueTaskNotification({
              type: "system",
              subtype: "elicitation_complete",
              mcp_server_name: Ue,
              elicitation_id: ce,
            });
          });
        weakSet.add(client.client);
      } catch {}
    }
  };
}
//@ chunk-tyg7f3ek.js:385935-386167 placement
/**
 * 给一组活动调用看门狗挂上"全部结束即中止"的 AbortController 集合：包装 delete，集合清空且开关 tengu_misty_twilight 开时中止所有登记的控制器。
 */
function getWatchdogAbortSet(watchdogs, cache) {
  let r = cache.get(watchdogs);
  if (r !== undefined) return r;
  let s = new Set();
  cache.set(watchdogs, s);
  let h = watchdogs.delete.bind(watchdogs);
  watchdogs.delete = (y) => {
    let S = h(y);
    if (S && watchdogs.size === 0 && getFeatureValue_CACHED_MAY_BE_STALE("tengu_misty_twilight", true))
      for (let R of Array.from(s)) R.abort();
    return S;
  };
  return s;
}
//@ chunk-tyg7f3ek.js:386167-386700 placement
/**
 * 恢复会话时确定被打断的回合：先找上一工作进程记录、不在续跑链上的已服务调用（findOffChainServedCalls），没有再找"卡片在提示后"的情形；出错时退回 load 的中断状态。
 */
async function resolveResumeInterruption(options) {
  let { restored, load, forwarding, findUnresolved } = options;
  let journaledCalls = forwarding ? parseInFlightServedCalls(restored?.internal?.in_flight_served_calls) : [];
  let supersededIds = journaledCalls
    .map((R) => R.tool_use_id)
    .filter((R) => load.supersededToolUseIds?.has(R) ?? false);
  try {
    let offChainServedCalls = await findOffChainServedCalls(options, journaledCalls, supersededIds);
    return offChainServedCalls.offChainToolNames.size > 0
      ? offChainServedCalls
      : {
          ...offChainServedCalls,
          ...(await findParkedCardBehindNote(options)),
        };
  } catch (error) {
    logResumeLookupFailure("counting the calls off the resume chain", error);
    let journaledToolUses = new Map();
    try {
      journaledToolUses = await findUnresolved(supersededIds);
    } catch (error) {
      logResumeLookupFailure("looking up the chain's own journaled calls", error);
    }
    return {
      turnInterruptionState: load.turnInterruptionState,
      offChainToolNames: new Map(),
      journaledToolUses,
    };
  }
}
//@ chunk-tyg7f3ek.js:386700-388620 placement
/**
 * 找出上一工作进程记录、未在 transcript 中得到结果的已服务调用，把它们视为被打断回合的工具调用，返回中断状态、离链工具名与已记录的 tool_use。
 */
async function findOffChainServedCalls(
  { restored, load, chain, tools, findUnresolved, findOnPrunedBranch, lane },
  journaledCalls,
  supersededIds,
) {
  let turnInterruptionState = load.turnInterruptionState;
  let continuation =
    turnInterruptionState?.kind === "none"
      ? findTrailingRestartContinuation(chain, isRestartContinuationRow)
      : undefined;
  let q = continuation !== undefined ? chain.slice(0, continuation.continuationIndex + 1) : [];
  if (!(
    journaledCalls.length > 0 &&
    lane.resumeInterruptedTurn &&
    load.rescueSuppressed !== true &&
    turnInterruptionState !== undefined &&
    load.supersededToolUseIds?.size === 0 &&
    (turnInterruptionState.kind !== "none" ||
      (continuation !== undefined &&
        !isResumeTooOld(q, interruptedTurnResumePolicy(hasPendingActions(restored))?.maxAgeMs ?? 0)))
  ))
    return {
      turnInterruptionState,
      offChainToolNames: new Map(),
      journaledToolUses: await findUnresolved(supersededIds),
    };
  let G = new Set(
    chain.flatMap((ie) =>
      ie.type === "user" && Array.isArray(ie.message.content)
        ? ie.message.content.flatMap((Se) => (Se.type === "tool_result" ? [Se.tool_use_id] : []))
        : [],
    ),
  );
  let filtered = journaledCalls.filter(
    (journaledCall) =>
      !G.has(journaledCall.tool_use_id) &&
      (turnInterruptionState.kind !== "none" ||
        Date.now() - journaledCall.dispatched_at <= SYNC_ANSWER_TTL_MS),
  );
  let unresolved = await findUnresolved(filtered.map((ie) => ie.tool_use_id));
  let [Ae, ...Ue] = filtered.filter((ie) => !unresolved.has(ie.tool_use_id));
  let ce = new Map(unresolved);
  if (continuation !== undefined && Ae !== undefined && Ue.length === 0) {
    let onPrunedBranch = await findOnPrunedBranch(Ae.tool_use_id);
    if (onPrunedBranch !== null) ce.set(Ae.tool_use_id, onPrunedBranch);
  }
  let flattened = filtered.flatMap((ie) => {
    let Se = ce.get(ie.tool_use_id);
    let me = Array.isArray(Se?.message.content)
      ? Se.message.content.find((Ee) => Ee.type === "tool_use" && Ee.id === ie.tool_use_id)
      : undefined;
    let Me = Se === undefined ? NaN : Date.parse(Se.timestamp);
    return Se !== undefined &&
      me?.type === "tool_use" &&
      me.name === ie.tool &&
      isRemoteCapableCall(Se, ie.tool_use_id, tools, ie.host) &&
      Number.isFinite(Me) &&
      !hasRowsAfterTime(chain, Me, isRestartContinuationRow)
      ? [
          {
            toolUseId: ie.tool_use_id,
            name: me.name,
          },
        ]
      : [];
  });
  if (flattened.length === 0)
    return {
      turnInterruptionState,
      offChainToolNames: new Map(),
      journaledToolUses: ce,
    };
  logForDebugging(
    `[print.ts] ${flattened.length} served call(s) the previous worker journaled are off the resume chain but unresolved in the transcript: treating them as the interrupted turn's (${flattened
      .map(({ toolUseId }) => toolUseId)
      .join(
        ",",
      )})${turnInterruptionState.kind === "none" ? "; the chain ends on a restart continuation, so the turn reads as interrupted" : ""}`,
  );
  return {
    turnInterruptionState:
      (continuation !== undefined ? buildInterruptedPromptState(chain, continuation) : undefined) ??
      turnInterruptionState,
    offChainToolNames: new Map(flattened.map(({ toolUseId, name: Se }) => [toolUseId, Se])),
    journaledToolUses: ce,
  };
}
//@ chunk-tyg7f3ek.js:388620-389771 placement
/**
 * 链末是重启续跑消息、外部 pending_action 与 transcript 里的 tool_use 一致时，把挂起的权限卡片视为被打断回合（ccr_card_behind_note）。
 */
async function findParkedCardBehindNote({ restored, load, chain, findUnresolved, findOnPrunedBranch, lane }) {
  let pendingToolUseId = singlePendingAction(restored);
  let continuation =
    load.turnInterruptionState?.kind === "none"
      ? findTrailingRestartContinuation(chain, isRestartContinuationOrQueuedRow)
      : undefined;
  if (
    pendingToolUseId === undefined ||
    continuation === undefined ||
    !lane.resumeInterruptedTurn ||
    load.rescueSuppressed === true ||
    load.supersededToolUseIds?.size !== 0 ||
    isResumeTooOld(
      chain.slice(0, continuation.continuationIndex + 1),
      interruptedTurnResumePolicy(true)?.maxAgeMs ?? 0,
    ) ||
    parseInFlightServedCalls(restored?.internal?.in_flight_served_calls).length > 0 ||
    restored?.external?.pending_action?.request_id === "" ||
    (await lane.findsCardBehindNote?.()) !== "on"
  )
    return;
  let assistantMessage =
    (await findUnresolved([pendingToolUseId])).get(pendingToolUseId) ??
    (await findOnPrunedBranch(pendingToolUseId));
  let toolUse = Array.isArray(assistantMessage?.message.content)
    ? assistantMessage.message.content.find((Z) => Z.type === "tool_use" && Z.id === pendingToolUseId)
    : undefined;
  let interruptionState = buildInterruptedPromptState(chain, continuation);
  if (!assistantMessage || toolUse?.type !== "tool_use" || interruptionState === undefined) return;
  let timestamp = Date.parse(assistantMessage.timestamp);
  let pendingAction = restored?.external?.pending_action;
  let rejectReason =
    toolUse.name !== pendingAction?.tool_name
      ? "other_tool"
      : !deepEqualIgnoringUndefined(toolUse.input, pendingAction.input)
        ? "other_input"
        : "isSidechain" in assistantMessage && assistantMessage.isSidechain === true
          ? "sidechain"
          : Date.now() - timestamp > SYNC_ANSWER_TTL_MS
            ? "too_old"
            : !(Date.parse(continuation.continuation.timestamp) > timestamp) ||
                hasRowsAfterTime(chain, timestamp, isRestartContinuationOrQueuedRow)
              ? "moved_on"
              : undefined;
  if (rejectReason !== undefined) {
    logFeatureBad("ccr_card_behind_note", rejectReason);
    return;
  }
  logFeatureOk("ccr_card_behind_note");
  logForDiagnosticsNoPII("info", "cli_parked_card_kept_behind_note");
  return {
    turnInterruptionState: interruptionState,
    offChainToolNames: new Map([[pendingToolUseId, toolUse.name]]),
  };
}
//@ chunk-tyg7f3ek.js:389771-390027 placement
function buildInterruptedPromptState(chain, continuation) {
  let [r] = normalizeMessages([continuation.continuation]);
  let lastUserPromptUuid = findLastUserPromptUuid(chain.slice(0, continuation.continuationIndex + 1));
  return (
    r && {
      kind: "interrupted_prompt",
      message: r,
      ...(lastUserPromptUuid !== undefined && {
        interruptedTurnUserMessageUuid: lastUserPromptUuid,
      }),
      ...(continuation.loaderSentinel !== undefined && {
        loaderSentinelUuid: continuation.loaderSentinel.uuid,
      }),
    }
  );
}
//@ chunk-tyg7f3ek.js:390027-390186 placement
function isRestartContinuationRow(message) {
  if (message.isMeta !== true || message.origin !== undefined || message.promptSource !== undefined)
    return false;
  if (isPlainInterruptMarker(message)) return true;
  let n = singleTextContent(message.message.content);
  return n !== undefined && isOnlySystemReminders(n);
}
//@ chunk-tyg7f3ek.js:390186-390301 placement
function isRestartContinuationOrQueuedRow(message) {
  return (
    isRestartContinuationRow(message) ||
    (message.isMeta === true &&
      message.queueTranscriptOnly === true &&
      message.origin === undefined &&
      message.promptSource === undefined)
  );
}
//@ chunk-tyg7f3ek.js:390301-390570 placement
/**
 * 从消息链末尾往前找重启续跑消息：跳过合成 API 错误（记为 loaderSentinel）和不影响的条目，遇到不满足谓词的用户消息就放弃。
 */
function findTrailingRestartContinuation(chain, predicate) {
  let loaderSentinel;
  for (let j = chain.length - 1; j >= 0; j--) {
    let h = chain[j];
    if (h.type === "assistant") {
      if (isSyntheticApiErrorMessage(h)) {
        loaderSentinel ??= h;
        continue;
      }
      if (isUnattendedStartUnconfirmed(h)) continue;
      return;
    }
    if (h.type !== "user" || isContextAppendMessage(h)) continue;
    if (!predicate(h)) return;
    if (isPlainInterruptMarker(h))
      return {
        continuation: h,
        continuationIndex: j,
        loaderSentinel,
      };
  }
  return;
}
//@ chunk-tyg7f3ek.js:390570-390700 placement
function logResumeLookupFailure(what, error) {
  if (isAbortError(error) || isTranscriptLoadError(error)) {
    logForDebugging(`[print.ts] ${what} failed, the boot goes on without them: ${errorMessage(error)}`, {
      level: "warn",
    });
    return;
  }
  logError(error);
}
//@ chunk-tyg7f3ek.js:390700-391234 placement
/**
 * 恢复时计算要接管的已服务调用（有对应 assistant 消息且仍可执行）以及从未发出的调用。
 */
async function planServedCallAdoption({
  restored,
  supersededToolUseIds,
  parkedToolUseId,
  journaledToolUses,
  adoptionTools,
  findUnresolved,
  forwarding,
  hasRemoteToolCalls,
  flagWaitMs,
}) {
  let journaledCalls = forwarding ? inFlightCallsFor(restored, supersededToolUseIds) : [];
  let servedCallsToAdopt = journaledCalls.flatMap((journaledCall) => {
    let G = journaledToolUses.get(journaledCall.tool_use_id);
    return G !== undefined &&
      isRemoteCapableCall(G, journaledCall.tool_use_id, adoptionTools, journaledCall.host)
      ? [
          {
            call: journaledCall,
            assistantMessage: G,
          },
        ]
      : [];
  });
  let neverSent = await remoteCallsBehindLastSent({
    forwarding,
    hasRemoteToolCalls,
    flagWaitMs,
    journaled: journaledCalls,
    superseded: supersededToolUseIds,
    parkedToolUseId,
    tools: adoptionTools,
    findUnresolved,
  });
  return {
    servedCallsToAdopt,
    servedCallsNeverSent: neverSent,
    journaledServedCalls: journaledCalls.length,
  };
}
//@ chunk-tyg7f3ek.js:391234-391897 placement
/**
 * 为接管的已服务调用构造 orphaned-permission 模式的队列提示：主调用（优先本地有工具的）作为允许的权限结果，其余作为 siblings，并附上未发出的调用说明。
 */
function buildOrphanedPermissionPrompt({ calls, tools, supersededToolNames, servedCallsNeverSent }) {
  let hasTool = (L) => findToolByName(tools, L.call.tool) !== undefined;
  let [primary, ...siblings] = [...calls].sort((L, q) => Number(hasTool(q)) - Number(hasTool(L)));
  let callIds = new Set(calls.map((L) => L.call.tool_use_id));
  let unsentNotice = describeUnsentServedCalls(
    {
      supersededToolNames,
      servedCallsNeverSent,
    },
    (L) => !callIds.has(L),
  );
  let notSent = servedCallsNeverSent ?? [];
  return {
    mode: "orphaned-permission",
    agentId: mainAgentId(),
    value: unsentNotice ?? [],
    ...(unsentNotice !== undefined && {
      isMeta: true,
    }),
    orphanedPermission: {
      permissionResult: {
        behavior: "allow",
        updatedInput: {},
        toolUseID: primary.call.tool_use_id,
      },
      assistantMessage: primary.assistantMessage,
      initFirst: true,
      ...(siblings.length > 0 && {
        siblings: siblings.map(({ call: L, assistantMessage }) => ({
          toolUseID: L.tool_use_id,
          assistantMessage,
        })),
      }),
      ...(notSent.length > 0 && {
        notSent,
      }),
    },
  };
}
//@ chunk-tyg7f3ek.js:391897-392010 placement
var TENGU_POLISHED_SALAMANDER = "tengu_polished_salamander";
var TENGU_CCR_INHERITED_APPROVAL_KILLSWITCH = "tengu_ccr_inherited_approval_killswitch";
var TENGU_MENDED_RIBBON = "tengu_mended_ribbon";
var PARKED_PERMISSION_DEFAULT_WAIT_MS = 2000;
//@ chunk-tyg7f3ek.js:392010-392077 placement
function parkedPermissionWaitMs() {
  return env.CLAUDE_CODE_PARKED_PERMISSION_WAIT_MS ?? 2000;
}
//@ chunk-tyg7f3ek.js:392077-392132 placement
function isRemoteGateOn(e) {
  try {
    return getRemoteFeatureGateState(e) === "on";
  } catch {
    return false;
  }
}
//@ chunk-tyg7f3ek.js:392132-392687 placement
/**
 * 读取恢复被打断回合相关的环境变量与 GrowthBook 开关，返回续跑策略对象（resumeInterruptedTurn、answerGoesFirst、findsCardBehindNote 等）。
 */
function getResumeLaneOptions() {
  return {
    resumeInterruptedTurn: env.CLAUDE_CODE_RESUME_INTERRUPTED_TURN,
    parkedStopRetires: env.CLAUDE_CODE_PARKED_STOP_RETIRES,
    runsBeforeClear: env.CLAUDE_CODE_PARKED_RUN_BEFORE_CLEAR,
    toleratesContextAppends: env.CLAUDE_CODE_RESUME_TOLERATES_CONTEXT_APPENDS,
    answerWaitMs: parkedPermissionWaitMs(),
    holdsParkedMessageOpen: () => isRemoteGateOn(TENGU_POLISHED_SALAMANDER),
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
    holdsInputBehindPrompt: () => isRemoteGateOn(TENGU_MELLOW_RAINBOW),
  };
}
//@ chunk-tyg7f3ek.js:392687-392853 placement
async function readFlagWhenWarm(flag, reader) {
  try {
    if (reader(flag) === "cold")
      await withDeadline(
        initializeGrowthBook()
          .catch(() => null)
          .then(() => (reader(flag) === "cold" ? refreshGrowthBookFeatures() : undefined))
          .catch(() => {
            return;
          }),
        PARKED_PERMISSION_DEFAULT_WAIT_MS,
      );
    return reader(flag);
  } catch {
    return "cold";
  }
}
//@ chunk-tyg7f3ek.js:392889-393202 placement
/**
 * 返回按 tool_use id 查找未决 tool_use 的函数：tengu_eager_pillow 开时返回消息行，否则返回持有消息；对上一 assistant 回合里被取代的调用会读全部分支。
 */
function createUnresolvedToolUseFinder({ supersededToolUseIds, tookOverAPrompt, storageV5 }) {
  return async (toolUseId) => {
    let h = supersededToolUseIds?.has(toolUseId) === true;
    let y = tookOverAPrompt && h;
    if (getFeatureValue_CACHED_MAY_BE_STALE("tengu_eager_pillow", false)) {
      let R =
        (await findUnresolvedToolUseMessageRows(toolUseId, storageV5)) ??
        (y ? await readEveryBranch(toolUseId, storageV5, true) : null);
      return (
        R && {
          ...R,
          inLastAssistantTurn: h,
        }
      );
    }
    let S = y
      ? await findUnresolvedToolUseAnywhere(toolUseId, storageV5)
      : await findUnresolvedToolUse(toolUseId, storageV5);
    return (
      S && {
        holder: S,
        inLastAssistantTurn: h,
      }
    );
  };
}
//@ chunk-tyg7f3ek.js:393202-393281 placement
async function findUnresolvedToolUseAnywhere(toolUseId, storageV5) {
  return (
    (await findUnresolvedToolUse(toolUseId, storageV5)) ??
    (await readEveryBranch(toolUseId, storageV5, false))?.holder ??
    null
  );
}
//@ chunk-tyg7f3ek.js:393281-393600 placement
/**
 * 在被修剪的分支上查找未解决的 tool_use（转录大小在范围内时才查找）。
 */
async function findUnresolvedToolUseOnAPrunedBranch(toolUseId, storageV5) {
  if (isDiskless()) return null;
  let r;
  try {
    r = (await stat(getTranscriptPath())).size;
  } catch (error) {
    logForDebugging(
      `findUnresolvedToolUseOnAPrunedBranch: the transcript's size could not be read (${getErrnoCode(error) ?? "no error code"}), so tool_use ${toolUseId} counts as not found`,
      {
        level: "warn",
      },
    );
    return null;
  }
  return r > SKIP_PRECOMPACT_THRESHOLD && r <= MAX_TRANSCRIPT_READ_BYTES
    ? ((await readEveryBranch(toolUseId, storageV5, false))?.holder ?? null)
    : null;
}
//@ chunk-tyg7f3ek.js:393600-394275 placement
/**
 * 保留全部分支再读一次 transcript，查找未决的 tool_use；找到时可附带 assistant 消息行，失败返回 null。
 */
async function readEveryBranch(toolUseId, storageV5, withMessageRows) {
  try {
    let transcriptPath = getTranscriptPath();
    let transcriptStorageKey = getTranscriptStorageKey(transcriptPath, storageV5);
    let { messages } = await loadTranscriptFile(transcriptPath, {
      keepAllLeaves: true,
      ...(transcriptStorageKey && {
        storageV5: transcriptStorageKey,
      }),
    });
    let S = findUnresolvedToolUsesInTranscript(messages.values(), [toolUseId]).get(toolUseId);
    if (S === undefined) {
      logForDebugging(
        `readEveryBranch: a second read of the transcript, keeping every branch, found no unresolved tool_use ${toolUseId} either`,
      );
      return null;
    }
    let R = withMessageRows
      ? {
          holder: S,
          messageRows: assistantMessageRowsInTranscript(messages, S),
        }
      : {
          holder: S,
        };
    logForDebugging(
      `readEveryBranch: a second read of the transcript, keeping every branch, found tool_use ${toolUseId} after the first read did not`,
    );
    logForDiagnosticsNoPII("info", "cli_tool_use_found_on_second_transcript_read");
    return R;
  } catch (error) {
    logForDebugging(
      `readEveryBranch: the second read of the transcript failed, so tool_use ${toolUseId} counts as not found: ${error}`,
      {
        level: "warn",
      },
    );
    return null;
  }
}
//@ chunk-tyg7f3ek.js:394275-394375 placement
function isTerminalTitleSuppressed() {
  return (
    (isEssentialTrafficOnly() || env.CLAUDE_CODE_DISABLE_TERMINAL_TITLE) &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_concurrent_moonbeam", false)
  );
}
export {
  restoreDeclaredDialogKinds,
  getResumeLaneOptions,
  resolveResumeInterruption,
  findUnresolvedToolUseOnAPrunedBranch,
  findUnresolvedToolUseAnywhere,
  planServedCallAdoption,
  createUnresolvedToolUseFinder,
  buildOrphanedPermissionPrompt,
  createElicitationRegistrar,
  DISABLED_ELICITATION_LIMITS,
  createSdkUserDialogHandler,
  cancelPendingUserDialogs,
  isTerminalTitleSuppressed,
  cancelDialogsOnNewPrompt,
  declareSdkDialogKinds,
};
