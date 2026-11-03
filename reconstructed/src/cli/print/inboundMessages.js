/**
 * cli/print/inboundMessages.ts
 *
 * 2.1.316 新增：入站提示命令合并、打印运行状态与持久化后的跟进检查
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-tyg7f3ek.js (18)
 * attribution: placement 18
 */
import { Dfn, $f, Oq, processQueuedCommands } from "../../utils/messageQueueManager.js";
import { Xet } from "../../utils/promptSource.js";
import {
  isDrainOnlyResume,
  isHandedOffBatch,
  batchUuids,
  isResumedTurnBatch,
  InputWaitStopwatch,
} from "./userFrameIntake.js";
import { isCommentNotificationText } from "../../services/artifacts/comments/autoreactState.js";
import { looksLikeSlashInput, hasCommand } from "../../commands.js";
import { Z9t } from "../../constants/outputLimits.js";
import { messageTurnAttributionKey } from "../../utils/turnAttributionKey.js";
import { Kv } from "../../utils/pollEvents.js";
import { TASK_NOTIFICATION, STATUS } from "../../constants/xml.js";
import {
  extractTag,
  isSyntheticApiErrorMessage,
  isInterruptionOnlyMessage,
  isToolResultMessage,
} from "../../utils/messages.js";
import { zfe, isBareTaskNotificationOrigin } from "../../utils/backgroundSessionResume.js";
import { countUserPromptsFromEntries_3, trimTrailingAfterTurn } from "./transcriptChain.js";
import { isSyntheticUserMessage } from "./runningTurnRecord.js";
import { heldMessageUuidSet } from "./queuedMessageUtils.js";
import { tRe } from "../../utils/transcript/deserialize.js";
import { logError } from "../../utils/log.js";
import { logForDebugging } from "../../utils/debug.js";
import { logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { aO } from "../../utils/historyFile.js";
import { parseSlashCommand } from "../../utils/slashCommandParsing.js";
import { releaseServerHold } from "../../plugins/functionHooks/pluginLifecycle.js";
import { rbe } from "../../plugins/functionHooks/commandHooks.js";
import { NO_CORE_AT_CHAIN_BOTTOM } from "../../plugins/functionHooks/eventCatalog.js";
import { Yjt } from "../../plugins/functionHooks/commandRunDispatch.js";
import { snapshotHookRegistration } from "../../utils/plugins/functionHooks/hookRegistration.js";
import { pluginsMatchingEvent } from "../../plugins/functionHooks/hookDispatch.js";
import { toError } from "../../utils/errors.js";
import { isVsCodeTopSession } from "../../utils/sessionShape.js";
import { JPr } from "../sdkMcpManifests.js";

/**
 * 判断两个排队 prompt 能否合并为一次轮次（mode、workload、isMeta、来源等一致）。
 */
//@ chunk-tyg7f3ek.js:72484-73731 placement
function canMergePromptCommands(e, n) {
  return (
    n !== void 0 &&
    e.mode === "prompt" &&
    n.mode === "prompt" &&
    n.workload === e.workload &&
    n.isMeta === e.isMeta &&
    n.shouldQuery === e.shouldQuery &&
    n.wakeupSource === e.wakeupSource &&
    Dfn(n, e) &&
    isSameOrigin(e.origin, n.origin) &&
    !isHandbackOrigin(e.origin) &&
    !isHandbackOrigin(n.origin) &&
    !!n.verifiedSlackHumanTurn === !!e.verifiedSlackHumanTurn &&
    !!n.projectsUserTurn === !!e.projectsUserTurn &&
    n.emailSenderTurn === e.emailSenderTurn &&
    !!n.localStdinOrigin === !!e.localStdinOrigin &&
    !!n.sessionChannelPersonTyped === !!e.sessionChannelPersonTyped &&
    Xet(n.hostInitiator) === Xet(e.hostInitiator) &&
    !!n.skipAttachments === !!e.skipAttachments &&
    !!n.skipSlashCommands === !!e.skipSlashCommands &&
    !isDrainOnlyResume(e) &&
    !isDrainOnlyResume(n) &&
    e.seededSummon !== !0 &&
    n.seededSummon !== !0 &&
    !isCommentNotificationText(e.value) &&
    !isCommentNotificationText(n.value) &&
    e.hearthRelayRows === void 0 &&
    n.hearthRelayRows === void 0 &&
    e.hearthRelayThreadTs === void 0 &&
    n.hearthRelayThreadTs === void 0 &&
    e.hearthRelayMessageIds === void 0 &&
    n.hearthRelayMessageIds === void 0 &&
    n.priority === e.priority &&
    !e.inlinedImagePaths?.length &&
    !n.inlinedImagePaths?.length &&
    !e.imageFileUuids?.length &&
    !n.imageFileUuids?.length &&
    !e.runsAlone &&
    !n.runsAlone &&
    !e.textNotTyped &&
    !n.textNotTyped &&
    (e.shouldQuery !== !1 || (!e.fileAttachments?.length && !n.fileAttachments?.length)) &&
    !e.taskDelivery &&
    !n.taskDelivery &&
    !looksLikeSlashInput(e.value) &&
    !looksLikeSlashInput(n.value)
  );
}
//@ chunk-tyg7f3ek.js:73731-73742 placement
var MAX_MERGED_PROMPTS = Z9t;
//@ chunk-tyg7f3ek.js:73742-73984 placement
function canBatchCommands(e, n) {
  return (
    n.priority === e.priority &&
    n.workload === e.workload &&
    !!n.isMeta === !!e.isMeta &&
    !!n.skipAttachments === !!e.skipAttachments &&
    n.wakeupSource === e.wakeupSource &&
    Dfn(n, e) &&
    n.ccrTurnId === e.ccrTurnId &&
    messageTurnAttributionKey(n) === messageTurnAttributionKey(e) &&
    isTaskDeliveredPrompt(e) &&
    isTaskDeliveredPrompt(n)
  );
}
//@ chunk-tyg7f3ek.js:73984-74028 placement
function isDispatchablePrompt(e) {
  return $f(e) && !Kv(e) && !Oq(e);
}
//@ chunk-tyg7f3ek.js:74028-74390 placement
function isTaskDeliveredPrompt(e) {
  if (
    !processQueuedCommands(e) ||
    e.taskId === void 0 ||
    !isAcceptedOrigin(e.origin) ||
    e.uuid !== void 0 ||
    e.taskDelivery !== void 0 ||
    e.userResumeNotice === !0 ||
    e.stopHookActive === !0 ||
    e.shouldQuery === !1 ||
    typeof e.value !== "string"
  )
    return !1;
  let trimmed = e.value.trim(),
    r = `<${TASK_NOTIFICATION}>`,
    s = `</${TASK_NOTIFICATION}>`;
  return (
    trimmed.startsWith(r) &&
    trimmed.indexOf(r, 1) === -1 &&
    trimmed.endsWith(s) &&
    trimmed.indexOf(s) === trimmed.length - s.length &&
    extractTag(trimmed, STATUS) !== null
  );
}
//@ chunk-tyg7f3ek.js:74390-74438 placement
function isAcceptedOrigin(e) {
  return e === void 0 || (zfe(e) && isBareTaskNotificationOrigin(e));
}
//@ chunk-tyg7f3ek.js:74438-74557 placement
var INBOUND_ORIGIN_KEYS = [
  "from",
  "name",
  "inbound_origin",
  "senderTaskId",
  "verifiedPeerPid",
  "hostInjected",
  "activityObservation",
  "plugin",
];
//@ chunk-tyg7f3ek.js:74557-74613 placement
function isHandbackOrigin(e) {
  return e?.kind === "peer" && e.handback === !0;
}
//@ chunk-tyg7f3ek.js:74613-75273 placement
function isSameOrigin(e, n) {
  if (e === n) return !0;
  if (!e || !n) return !1;
  if (e.kind !== n.kind) return !1;
  if (e.kind === "slack-ping" && n.kind === "slack-ping")
    return (
      e.channelId === n.channelId &&
      e.threadTs === n.threadTs &&
      e.messageTs === n.messageTs &&
      e.slackUserId === n.slackUserId &&
      e.senderDisplay === n.senderDisplay &&
      e.permalink === n.permalink
    );
  if (e.kind === "peer" && n.kind === "peer") return INBOUND_ORIGIN_KEYS.every((r) => e[r] === n[r]);
  if (e.kind === "channel" && n.kind === "channel") return e.server === n.server;
  if (e.kind === "plugin" && n.kind === "plugin") return e.name === n.name && e.asUser === n.asUser;
  if (e.kind === "task-notification" && n.kind === "task-notification")
    return e.subkind === n.subkind && e.fireReason === n.fireReason;
  return !0;
}
//@ chunk-tyg7f3ek.js:75273-75399 placement
function mergeTurnUuids(e, n) {
  if (isHandedOffBatch(n)) return { known: !1, uuids: batchUuids(n) };
  return isResumedTurnBatch(n)
    ? { known: !0, uuids: batchUuids(n) }
    : { ...e, uuids: [...e.uuids, ...batchUuids(n)] };
}
/**
 * print 主循环的运行状态：轮次运行/报告标志、阶段、输入关闭与结束会话门闩。
 */
//@ chunk-tyg7f3ek.js:75399-76475 placement
class PrintRunState {
  running = !1;
  intentBatchInFlight = !1;
  runningReported = !1;
  runPhase;
  awaitingTurnEndSummary = !1;
  inputClosed = !1;
  endingLatch = Promise.withResolvers();
  isEndSessionRequested = !1;
  get endSessionRequested() {
    return this.isEndSessionRequested;
  }
  set endSessionRequested(e) {
    if (((this.isEndSessionRequested = e), e)) this.endingLatch.resolve();
  }
  batchLeftUnstarted = !1;
  organizationsLoadFailed = !1;
  whenEnding() {
    return this.endingLatch.promise;
  }
  abortController;
  turnUnderWay = !1;
  stopReachedTurn = !1;
  sendNowCutTurn = !1;
  currentTurn = { known: !1, uuids: [] };
  turnUnderWayAnswersAClient = !1;
  pendingDispatchUuids = [];
  pendingDispatchKeys = [];
  dequeueCount = 0;
  drainingHandoff;
  turnStartClock = new InputWaitStopwatch();
  noteStoredLastPrompt(e) {
    if (e !== void 0) this.currentTurn = { known: !0, uuids: [e] };
  }
  noteStoredTurnTookIn(e) {
    if (this.currentTurn.known)
      this.currentTurn = { ...this.currentTurn, uuids: [...this.currentTurn.uuids, ...e] };
  }
  noteTurnStarted(e) {
    ((this.turnUnderWayAnswersAClient = isResumedTurnBatch(e)),
      (this.currentTurn = mergeTurnUuids(this.currentTurn, e)));
  }
  noteTakenIn(e, n) {
    ((this.turnUnderWayAnswersAClient ||= n),
      (this.currentTurn = { ...this.currentTurn, uuids: [...this.currentTurn.uuids, e] }));
  }
}
//@ chunk-tyg7f3ek.js:76475-76657 placement = countUserPromptsFromEntries (0.884)
function countUserPromptsFromEntries_4(e, n) {
  return (
    countUserPromptsFromEntries_3(e, n, !0) === !0 &&
    trimTrailingAfterTurn(e, n, !0).findLast(
      (entry) =>
        (entry.type === "user" || entry.type === "assistant") &&
        !("isSidechain" in entry && entry.isSidechain === !0) &&
        !isSyntheticApiErrorMessage(entry) &&
        !isSyntheticUserMessage(entry),
    )?.type === "user"
  );
}
//@ chunk-tyg7f3ek.js:76657-76938 placement
function interruptedTurnUuids(e) {
  let n = new Set();
  try {
    let r = !1;
    for (let s of e.toReversed())
      if (
        s.type === "user" &&
        s.interruptedByShutdown !== !0 &&
        isInterruptionOnlyMessage(s) &&
        !isToolResultMessage(s)
      )
        r = !0;
      else if (r && s.type !== "assistant") {
        for (let h of heldMessageUuidSet([s])) n.add(h);
        r = s.type !== "user" || isToolResultMessage(s) || tRe(s) || isSyntheticUserMessage(s);
      }
  } catch (error) {
    return (logError(error), new Set());
  }
  return n;
}
//@ chunk-tyg7f3ek.js:76938-77670 placement
function wrapPersistenceWithFollowupCheck(e, n, r) {
  let s = new Set();
  return () => {
    let h = e(),
      y;
    return {
      persisted: (S) => {
        if (s.has(S) || !n(S)) return h.persisted(S);
        let persisted = h.persisted(S);
        return (
          (y = persisted.then(
            async (w) =>
              !w &&
              (await r(S).catch(
                (P) => (
                  logForDebugging(
                    `could not read the stored rows for a follow-up of a stopped turn; it runs: ${P instanceof Error ? P.message : String(P)}`,
                    { level: "error" },
                  ),
                  logFeatureSad("ccr_stopped_follow_up_closed", "rows_unreadable"),
                  !1
                ),
              )) &&
              n(S),
          )),
          y.then(async (w) => {
            if (w)
              (s.add(S),
                logFeatureOk("ccr_stopped_follow_up_closed"),
                logForDiagnosticsNoPII("info", "cli_follow_up_of_stopped_turn_closed"));
            return w || (await persisted);
          })
        );
      },
      turnUnanswered: (S) => (y === void 0 ? h.turnUnanswered(S) : y.then((R) => !R && h.turnUnanswered(S))),
      holdersTurnUnanswered: (S) =>
        y === void 0 ? h.holdersTurnUnanswered(S) : y.then((R) => (R ? !1 : h.holdersTurnUnanswered(S))),
    };
  };
}
//@ chunk-tyg7f3ek.js:77670-77918 placement
function isImmediateCommandCandidate(e, n) {
  if (e.mode === "poll-event") return !1;
  if (
    e.skipSlashCommands === !0 &&
    e.modelScheduledOrigin !== !0 &&
    !(e.bridgeOrigin === !0 && e.textNotTyped !== !0)
  )
    return !1;
  let r = aO(e.value),
    s = r === null ? null : parseSlashCommand(r);
  return s !== null && !hasCommand(s.commandName, [...n()]);
}
//@ chunk-tyg7f3ek.js:77918-78379 placement
function runCommandInGate(e, n) {
  let withResolvers = Promise.withResolvers(),
    abortController = new AbortController(),
    h = releaseServerHold(rbe.ownerOf(n.command)),
    y = h.then(() =>
      NO_CORE_AT_CHAIN_BOTTOM("command.run", {
        core: {
          "command.run": {
            name: "core",
            isCore: !0,
            budgetMs: 0,
            run: async (...S) => (await withResolvers.promise).run(...S),
          },
        },
        signal: abortController.signal,
      })(n),
    );
  (y.catch(() => {}),
    withResolvers.promise.catch(() => {}),
    Yjt.set(e, {
      input: n,
      reading: snapshotHookRegistration(),
      hooking: h.then(() => pluginsMatchingEvent("command.run", { command: n.command })).catch(() => []),
      answer: y,
      seat: withResolvers.resolve,
      stop: (S) => {
        (abortController.abort(S), withResolvers.reject(toError(S)));
      },
    }));
}
//@ chunk-tyg7f3ek.js:78379-78413 placement
function isImmediateCommandsEnabled() {
  return isVsCodeTopSession() && !JPr();
}
//@ chunk-tyg7f3ek.js:78413-78432 placement
var WATCHED_IMMEDIATE_IOS = new WeakSet();

export {
  interruptedTurnUuids,
  PrintRunState,
  wrapPersistenceWithFollowupCheck,
  countUserPromptsFromEntries_4,
  isImmediateCommandCandidate,
  isImmediateCommandsEnabled,
  runCommandInGate,
  WATCHED_IMMEDIATE_IOS,
  isDispatchablePrompt,
  canMergePromptCommands,
  canBatchCommands,
  MAX_MERGED_PROMPTS,
  mergeTurnUuids,
};
