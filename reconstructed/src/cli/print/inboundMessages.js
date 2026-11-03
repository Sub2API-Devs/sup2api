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
import {
  sameSchedulingPlugin,
  isMainAgentCommand,
  isPassiveMainAgentCommand,
  processQueuedCommands,
} from "../../utils/messageQueueManager.js";
import { originKindForWakeup } from "../../utils/promptSource.js";
import {
  isDrainOnlyResume,
  isHandedOffBatch,
  batchUuids,
  isResumedTurnBatch,
  InputWaitStopwatch,
} from "./userFrameIntake.js";
import { isCommentNotificationText } from "../../services/artifacts/comments/autoreactState.js";
import { looksLikeSlashInput, hasCommand } from "../../commands.js";
import { MAX_MERGED_PROMPTS as MAX_MERGED_PROMPTS_2 } from "../../constants/outputLimits.js";
import { messageTurnAttributionKey } from "../../utils/turnAttributionKey.js";
import { isPollEventMode } from "../../utils/pollEvents.js";
import { TASK_NOTIFICATION, STATUS } from "../../constants/xml.js";
import {
  extractTag,
  isSyntheticApiErrorMessage,
  isInterruptionOnlyMessage,
  isToolResultMessage,
} from "../../utils/messages.js";
import {
  isSessionTaskNotificationOrigin,
  isBareTaskNotificationOrigin,
} from "../../utils/backgroundSessionResume.js";
import { countUserPromptsFromEntries_3, trimTrailingAfterTurn } from "./transcriptChain.js";
import { isSyntheticUserMessage } from "./runningTurnRecord.js";
import { heldMessageUuidSet } from "./queuedMessageUtils.js";
import { isNonPromptUserRow } from "../../utils/transcript/deserialize.js";
import { logError } from "../../utils/log.js";
import { logForDebugging } from "../../utils/debug.js";
import { logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { lastTextBlockText } from "../../utils/historyFile.js";
import { parseSlashCommand } from "../../utils/slashCommandParsing.js";
import { releaseServerHold } from "../../plugins/functionHooks/pluginLifecycle.js";
import { pluginCommandRegistry } from "../../plugins/functionHooks/commandHooks.js";
import { NO_CORE_AT_CHAIN_BOTTOM } from "../../plugins/functionHooks/eventCatalog.js";
import { inflightCommandRuns } from "../../plugins/functionHooks/commandRunDispatch.js";
import { snapshotHookRegistration } from "../../utils/plugins/functionHooks/hookRegistration.js";
import { pluginsMatchingEvent } from "../../plugins/functionHooks/hookDispatch.js";
import { toError } from "../../utils/errors.js";
import { isVsCodeTopSession } from "../../utils/sessionShape.js";
import { isVsCodeHooksSuppressed } from "../sdkMcpManifests.js";

//@ chunk-tyg7f3ek.js:72484-73731 placement
/**
 * 判断两个排队 prompt 能否合并为一次轮次（mode、workload、isMeta、来源等一致）。
 */
function canMergePromptCommands(e, n) {
  return (
    n !== undefined &&
    e.mode === "prompt" &&
    n.mode === "prompt" &&
    n.workload === e.workload &&
    n.isMeta === e.isMeta &&
    n.shouldQuery === e.shouldQuery &&
    n.wakeupSource === e.wakeupSource &&
    sameSchedulingPlugin(n, e) &&
    isSameOrigin(e.origin, n.origin) &&
    !isHandbackOrigin(e.origin) &&
    !isHandbackOrigin(n.origin) &&
    !!n.verifiedSlackHumanTurn === !!e.verifiedSlackHumanTurn &&
    !!n.projectsUserTurn === !!e.projectsUserTurn &&
    n.emailSenderTurn === e.emailSenderTurn &&
    !!n.localStdinOrigin === !!e.localStdinOrigin &&
    !!n.sessionChannelPersonTyped === !!e.sessionChannelPersonTyped &&
    originKindForWakeup(n.hostInitiator) === originKindForWakeup(e.hostInitiator) &&
    !!n.skipAttachments === !!e.skipAttachments &&
    !!n.skipSlashCommands === !!e.skipSlashCommands &&
    !isDrainOnlyResume(e) &&
    !isDrainOnlyResume(n) &&
    e.seededSummon !== true &&
    n.seededSummon !== true &&
    !isCommentNotificationText(e.value) &&
    !isCommentNotificationText(n.value) &&
    e.hearthRelayRows === undefined &&
    n.hearthRelayRows === undefined &&
    e.hearthRelayThreadTs === undefined &&
    n.hearthRelayThreadTs === undefined &&
    e.hearthRelayMessageIds === undefined &&
    n.hearthRelayMessageIds === undefined &&
    n.priority === e.priority &&
    !e.inlinedImagePaths?.length &&
    !n.inlinedImagePaths?.length &&
    !e.imageFileUuids?.length &&
    !n.imageFileUuids?.length &&
    !e.runsAlone &&
    !n.runsAlone &&
    !e.textNotTyped &&
    !n.textNotTyped &&
    (e.shouldQuery !== false || (!e.fileAttachments?.length && !n.fileAttachments?.length)) &&
    !e.taskDelivery &&
    !n.taskDelivery &&
    !looksLikeSlashInput(e.value) &&
    !looksLikeSlashInput(n.value)
  );
}
//@ chunk-tyg7f3ek.js:73731-73742 placement
var MAX_MERGED_PROMPTS = MAX_MERGED_PROMPTS_2;
//@ chunk-tyg7f3ek.js:73742-73984 placement
function canBatchCommands(e, n) {
  return (
    n.priority === e.priority &&
    n.workload === e.workload &&
    !!n.isMeta === !!e.isMeta &&
    !!n.skipAttachments === !!e.skipAttachments &&
    n.wakeupSource === e.wakeupSource &&
    sameSchedulingPlugin(n, e) &&
    n.ccrTurnId === e.ccrTurnId &&
    messageTurnAttributionKey(n) === messageTurnAttributionKey(e) &&
    isTaskDeliveredPrompt(e) &&
    isTaskDeliveredPrompt(n)
  );
}
//@ chunk-tyg7f3ek.js:73984-74028 placement
function isDispatchablePrompt(e) {
  return isMainAgentCommand(e) && !isPollEventMode(e) && !isPassiveMainAgentCommand(e);
}
//@ chunk-tyg7f3ek.js:74028-74390 placement
function isTaskDeliveredPrompt(queuedCommands) {
  if (
    !processQueuedCommands(queuedCommands) ||
    queuedCommands.taskId === undefined ||
    !isAcceptedOrigin(queuedCommands.origin) ||
    queuedCommands.uuid !== undefined ||
    queuedCommands.taskDelivery !== undefined ||
    queuedCommands.userResumeNotice === true ||
    queuedCommands.stopHookActive === true ||
    queuedCommands.shouldQuery === false ||
    typeof queuedCommands.value !== "string"
  )
    return false;
  let trimmed = queuedCommands.value.trim();
  let r = `<${TASK_NOTIFICATION}>`;
  let s = `</${TASK_NOTIFICATION}>`;
  return (
    trimmed.startsWith(r) &&
    trimmed.indexOf(r, 1) === -1 &&
    trimmed.endsWith(s) &&
    trimmed.indexOf(s) === trimmed.length - s.length &&
    extractTag(trimmed, STATUS) !== null
  );
}
//@ chunk-tyg7f3ek.js:74390-74438 placement
function isAcceptedOrigin(origin) {
  return (
    origin === undefined || (isSessionTaskNotificationOrigin(origin) && isBareTaskNotificationOrigin(origin))
  );
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
function isHandbackOrigin(origin) {
  return origin?.kind === "peer" && origin.handback === true;
}
//@ chunk-tyg7f3ek.js:74613-75273 placement
function isSameOrigin(origin, origin_2) {
  if (origin === origin_2) return true;
  if (!origin || !origin_2) return false;
  if (origin.kind !== origin_2.kind) return false;
  if (origin.kind === "slack-ping" && origin_2.kind === "slack-ping")
    return (
      origin.channelId === origin_2.channelId &&
      origin.threadTs === origin_2.threadTs &&
      origin.messageTs === origin_2.messageTs &&
      origin.slackUserId === origin_2.slackUserId &&
      origin.senderDisplay === origin_2.senderDisplay &&
      origin.permalink === origin_2.permalink
    );
  if (origin.kind === "peer" && origin_2.kind === "peer")
    return INBOUND_ORIGIN_KEYS.every((r) => origin[r] === origin_2[r]);
  if (origin.kind === "channel" && origin_2.kind === "channel") return origin.server === origin_2.server;
  if (origin.kind === "plugin" && origin_2.kind === "plugin")
    return origin.name === origin_2.name && origin.asUser === origin_2.asUser;
  if (origin.kind === "task-notification" && origin_2.kind === "task-notification")
    return origin.subkind === origin_2.subkind && origin.fireReason === origin_2.fireReason;
  return true;
}
//@ chunk-tyg7f3ek.js:75273-75399 placement
function mergeTurnUuids(currentTurn, n) {
  if (isHandedOffBatch(n))
    return {
      known: false,
      uuids: batchUuids(n),
    };
  return isResumedTurnBatch(n)
    ? {
        known: true,
        uuids: batchUuids(n),
      }
    : {
        ...currentTurn,
        uuids: [...currentTurn.uuids, ...batchUuids(n)],
      };
}
//@ chunk-tyg7f3ek.js:75399-76475 placement
/**
 * print 主循环的运行状态：轮次运行/报告标志、阶段、输入关闭与结束会话门闩。
 */
class PrintRunState {
  running = false;
  intentBatchInFlight = false;
  runningReported = false;
  runPhase;
  awaitingTurnEndSummary = false;
  inputClosed = false;
  endingLatch = Promise.withResolvers();
  isEndSessionRequested = false;
  get endSessionRequested() {
    return this.isEndSessionRequested;
  }
  set endSessionRequested(e) {
    this.isEndSessionRequested = e;
    if (e) this.endingLatch.resolve();
  }
  batchLeftUnstarted = false;
  organizationsLoadFailed = false;
  whenEnding() {
    return this.endingLatch.promise;
  }
  abortController;
  turnUnderWay = false;
  stopReachedTurn = false;
  sendNowCutTurn = false;
  currentTurn = {
    known: false,
    uuids: [],
  };
  turnUnderWayAnswersAClient = false;
  pendingDispatchUuids = [];
  pendingDispatchKeys = [];
  dequeueCount = 0;
  drainingHandoff;
  turnStartClock = new InputWaitStopwatch();
  noteStoredLastPrompt(e) {
    if (e !== undefined)
      this.currentTurn = {
        known: true,
        uuids: [e],
      };
  }
  noteStoredTurnTookIn(e) {
    if (this.currentTurn.known)
      this.currentTurn = {
        ...this.currentTurn,
        uuids: [...this.currentTurn.uuids, ...e],
      };
  }
  noteTurnStarted(e) {
    this.turnUnderWayAnswersAClient = isResumedTurnBatch(e);
    this.currentTurn = mergeTurnUuids(this.currentTurn, e);
  }
  noteTakenIn(e, n) {
    this.turnUnderWayAnswersAClient ||= n;
    this.currentTurn = {
      ...this.currentTurn,
      uuids: [...this.currentTurn.uuids, e],
    };
  }
}
//@ chunk-tyg7f3ek.js:76475-76657 placement = countUserPromptsFromEntries (0.884)
function countUserPromptsFromEntries_4(sessionTranscriptRows, n) {
  return (
    countUserPromptsFromEntries_3(sessionTranscriptRows, n, true) === true &&
    trimTrailingAfterTurn(sessionTranscriptRows, n, true).findLast(
      (entry) =>
        (entry.type === "user" || entry.type === "assistant") &&
        !("isSidechain" in entry && entry.isSidechain === true) &&
        !isSyntheticApiErrorMessage(entry) &&
        !isSyntheticUserMessage(entry),
    )?.type === "user"
  );
}
//@ chunk-tyg7f3ek.js:76657-76938 placement
function interruptedTurnUuids(e) {
  let n = new Set();
  try {
    let r = false;
    for (let s of e.toReversed())
      if (
        s.type === "user" &&
        s.interruptedByShutdown !== true &&
        isInterruptionOnlyMessage(s) &&
        !isToolResultMessage(s)
      )
        r = true;
      else if (r && s.type !== "assistant") {
        for (let h of heldMessageUuidSet([s])) n.add(h);
        r = s.type !== "user" || isToolResultMessage(s) || isNonPromptUserRow(s) || isSyntheticUserMessage(s);
      }
  } catch (error) {
    logError(error);
    return new Set();
  }
  return n;
}
//@ chunk-tyg7f3ek.js:76938-77670 placement
function wrapPersistenceWithFollowupCheck(persistenceChecker, n, r) {
  let s = new Set();
  return () => {
    let h = persistenceChecker();
    let y;
    return {
      persisted: (S) => {
        if (s.has(S) || !n(S)) return h.persisted(S);
        let R = h.persisted(S);
        y = R.then(
          async (w) =>
            !w &&
            (await r(S).catch((error) => {
              logForDebugging(
                `could not read the stored rows for a follow-up of a stopped turn; it runs: ${error instanceof Error ? error.message : String(error)}`,
                {
                  level: "error",
                },
              );
              logFeatureSad("ccr_stopped_follow_up_closed", "rows_unreadable");
              return false;
            })) &&
            n(S),
        );
        return y.then(async (w) => {
          if (w) {
            s.add(S);
            logFeatureOk("ccr_stopped_follow_up_closed");
            logForDiagnosticsNoPII("info", "cli_follow_up_of_stopped_turn_closed");
          }
          return w || (await R);
        });
      },
      turnUnanswered: (S) =>
        y === undefined ? h.turnUnanswered(S) : y.then((R) => !R && h.turnUnanswered(S)),
      holdersTurnUnanswered: (S) =>
        y === undefined
          ? h.holdersTurnUnanswered(S)
          : y.then((R) => (R ? false : h.holdersTurnUnanswered(S))),
    };
  };
}
//@ chunk-tyg7f3ek.js:77670-77918 placement
function isImmediateCommandCandidate(command, n) {
  if (command.mode === "poll-event") return false;
  if (
    command.skipSlashCommands === true &&
    command.modelScheduledOrigin !== true &&
    !(command.bridgeOrigin === true && command.textNotTyped !== true)
  )
    return false;
  let r = lastTextBlockText(command.value);
  let s = r === null ? null : parseSlashCommand(r);
  return s !== null && !hasCommand(s.commandName, [...n()]);
}
//@ chunk-tyg7f3ek.js:77918-78379 placement
function runCommandInGate(uuid, n) {
  let deferred = Promise.withResolvers();
  let abortController = new AbortController();
  let h = releaseServerHold(pluginCommandRegistry.ownerOf(n.command));
  let y = h.then(() =>
    NO_CORE_AT_CHAIN_BOTTOM("command.run", {
      core: {
        "command.run": {
          name: "core",
          isCore: true,
          budgetMs: 0,
          run: async (...S) => (await deferred.promise).run(...S),
        },
      },
      signal: abortController.signal,
    })(n),
  );
  y.catch(() => {});
  deferred.promise.catch(() => {});
  inflightCommandRuns.set(uuid, {
    input: n,
    reading: snapshotHookRegistration(),
    hooking: h
      .then(() =>
        pluginsMatchingEvent("command.run", {
          command: n.command,
        }),
      )
      .catch(() => []),
    answer: y,
    seat: deferred.resolve,
    stop: (S) => {
      abortController.abort(S);
      deferred.reject(toError(S));
    },
  });
}
//@ chunk-tyg7f3ek.js:78379-78413 placement
function isImmediateCommandsEnabled() {
  return isVsCodeTopSession() && !isVsCodeHooksSuppressed();
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
