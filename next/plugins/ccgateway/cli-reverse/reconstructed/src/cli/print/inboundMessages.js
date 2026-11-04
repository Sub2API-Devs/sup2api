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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-tyg7f3ek.js:72484-73731 placement
/**
 * 判断两个排队 prompt 能否合并为一次轮次（mode、workload、isMeta、来源等一致）。
 */
function canMergePromptCommands(a, b) {
  return (
    b !== undefined &&
    a.mode === "prompt" &&
    b.mode === "prompt" &&
    b.workload === a.workload &&
    b.isMeta === a.isMeta &&
    b.shouldQuery === a.shouldQuery &&
    b.wakeupSource === a.wakeupSource &&
    sameSchedulingPlugin(b, a) &&
    isSameOrigin(a.origin, b.origin) &&
    !isHandbackOrigin(a.origin) &&
    !isHandbackOrigin(b.origin) &&
    !!b.verifiedSlackHumanTurn === !!a.verifiedSlackHumanTurn &&
    !!b.projectsUserTurn === !!a.projectsUserTurn &&
    b.emailSenderTurn === a.emailSenderTurn &&
    !!b.localStdinOrigin === !!a.localStdinOrigin &&
    !!b.sessionChannelPersonTyped === !!a.sessionChannelPersonTyped &&
    originKindForWakeup(b.hostInitiator) === originKindForWakeup(a.hostInitiator) &&
    !!b.skipAttachments === !!a.skipAttachments &&
    !!b.skipSlashCommands === !!a.skipSlashCommands &&
    !isDrainOnlyResume(a) &&
    !isDrainOnlyResume(b) &&
    a.seededSummon !== true &&
    b.seededSummon !== true &&
    !isCommentNotificationText(a.value) &&
    !isCommentNotificationText(b.value) &&
    a.hearthRelayRows === undefined &&
    b.hearthRelayRows === undefined &&
    a.hearthRelayThreadTs === undefined &&
    b.hearthRelayThreadTs === undefined &&
    a.hearthRelayMessageIds === undefined &&
    b.hearthRelayMessageIds === undefined &&
    b.priority === a.priority &&
    !a.inlinedImagePaths?.length &&
    !b.inlinedImagePaths?.length &&
    !a.imageFileUuids?.length &&
    !b.imageFileUuids?.length &&
    !a.runsAlone &&
    !b.runsAlone &&
    !a.textNotTyped &&
    !b.textNotTyped &&
    (a.shouldQuery !== false || (!a.fileAttachments?.length && !b.fileAttachments?.length)) &&
    !a.taskDelivery &&
    !b.taskDelivery &&
    !looksLikeSlashInput(a.value) &&
    !looksLikeSlashInput(b.value)
  );
}
//@ chunk-tyg7f3ek.js:73731-73742 placement
var MAX_MERGED_PROMPTS = MAX_MERGED_PROMPTS_2;
//@ chunk-tyg7f3ek.js:73742-73984 placement
function canBatchCommands(a, b) {
  return (
    b.priority === a.priority &&
    b.workload === a.workload &&
    !!b.isMeta === !!a.isMeta &&
    !!b.skipAttachments === !!a.skipAttachments &&
    b.wakeupSource === a.wakeupSource &&
    sameSchedulingPlugin(b, a) &&
    b.ccrTurnId === a.ccrTurnId &&
    messageTurnAttributionKey(b) === messageTurnAttributionKey(a) &&
    isTaskDeliveredPrompt(a) &&
    isTaskDeliveredPrompt(b)
  );
}
//@ chunk-tyg7f3ek.js:73984-74028 placement
function isDispatchablePrompt(command) {
  return isMainAgentCommand(command) && !isPollEventMode(command) && !isPassiveMainAgentCommand(command);
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
  let openTag = `<${TASK_NOTIFICATION}>`;
  let closeTag = `</${TASK_NOTIFICATION}>`;
  return (
    trimmed.startsWith(openTag) &&
    trimmed.indexOf(openTag, 1) === -1 &&
    trimmed.endsWith(closeTag) &&
    trimmed.indexOf(closeTag) === trimmed.length - closeTag.length &&
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
    return INBOUND_ORIGIN_KEYS.every((key) => origin[key] === origin_2[key]);
  if (origin.kind === "channel" && origin_2.kind === "channel") return origin.server === origin_2.server;
  if (origin.kind === "plugin" && origin_2.kind === "plugin")
    return origin.name === origin_2.name && origin.asUser === origin_2.asUser;
  if (origin.kind === "task-notification" && origin_2.kind === "task-notification")
    return origin.subkind === origin_2.subkind && origin.fireReason === origin_2.fireReason;
  return true;
}
//@ chunk-tyg7f3ek.js:75273-75399 placement
function mergeTurnUuids(currentTurn, batch) {
  if (isHandedOffBatch(batch))
    return {
      known: false,
      uuids: batchUuids(batch),
    };
  return isResumedTurnBatch(batch)
    ? {
        known: true,
        uuids: batchUuids(batch),
      }
    : {
        ...currentTurn,
        uuids: [...currentTurn.uuids, ...batchUuids(batch)],
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
  set endSessionRequested(requested) {
    this.isEndSessionRequested = requested;
    if (requested) this.endingLatch.resolve();
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
  noteStoredLastPrompt(uuid) {
    if (uuid !== undefined)
      this.currentTurn = {
        known: true,
        uuids: [uuid],
      };
  }
  noteStoredTurnTookIn(uuids) {
    if (this.currentTurn.known)
      this.currentTurn = {
        ...this.currentTurn,
        uuids: [...this.currentTurn.uuids, ...uuids],
      };
  }
  noteTurnStarted(batch) {
    this.turnUnderWayAnswersAClient = isResumedTurnBatch(batch);
    this.currentTurn = mergeTurnUuids(this.currentTurn, batch);
  }
  noteTakenIn(uuid, answersClient) {
    this.turnUnderWayAnswersAClient ||= answersClient;
    this.currentTurn = {
      ...this.currentTurn,
      uuids: [...this.currentTurn.uuids, uuid],
    };
  }
}
//@ chunk-tyg7f3ek.js:76475-76657 placement (2.1.88 match: countUserPromptsFromEntries, 0.884)
function countUserPromptsFromEntries_4(entries, options) {
  return (
    countUserPromptsFromEntries_3(entries, options, true) === true &&
    trimTrailingAfterTurn(entries, options, true).findLast(
      (entry) =>
        (entry.type === "user" || entry.type === "assistant") &&
        !("isSidechain" in entry && entry.isSidechain === true) &&
        !isSyntheticApiErrorMessage(entry) &&
        !isSyntheticUserMessage(entry),
    )?.type === "user"
  );
}
//@ chunk-tyg7f3ek.js:76657-76938 placement
function interruptedTurnUuids(messages) {
  let uuids = new Set();
  try {
    let inInterrupted = false;
    for (let message of messages.toReversed())
      if (
        message.type === "user" &&
        message.interruptedByShutdown !== true &&
        isInterruptionOnlyMessage(message) &&
        !isToolResultMessage(message)
      )
        inInterrupted = true;
      else if (inInterrupted && message.type !== "assistant") {
        for (let uuid of heldMessageUuidSet([message])) uuids.add(uuid);
        inInterrupted =
          message.type !== "user" ||
          isToolResultMessage(message) ||
          isNonPromptUserRow(message) ||
          isSyntheticUserMessage(message);
      }
  } catch (error) {
    logError(error);
    return new Set();
  }
  return uuids;
}
//@ chunk-tyg7f3ek.js:76938-77670 placement
function wrapPersistenceWithFollowupCheck(persistenceChecker, isFollowup, readRows) {
  let closed = new Set();
  return () => {
    let persistence = persistenceChecker();
    let closureCheck;
    return {
      persisted: (uuid) => {
        if (closed.has(uuid) || !isFollowup(uuid)) return persistence.persisted(uuid);
        let persisted = persistence.persisted(uuid);
        closureCheck = persisted.then(
          async (runFollowup) =>
            !runFollowup &&
            (await readRows(uuid).catch((error) => {
              logForDebugging(
                `could not read the stored rows for a follow-up of a stopped turn; it runs: ${error instanceof Error ? error.message : String(error)}`,
                {
                  level: "error",
                },
              );
              logFeatureSad("ccr_stopped_follow_up_closed", "rows_unreadable");
              return false;
            })) &&
            isFollowup(uuid),
        );
        return closureCheck.then(async (runFollowup) => {
          if (runFollowup) {
            closed.add(uuid);
            logFeatureOk("ccr_stopped_follow_up_closed");
            logForDiagnosticsNoPII("info", "cli_follow_up_of_stopped_turn_closed");
          }
          return runFollowup || (await persisted);
        });
      },
      turnUnanswered: (lookup) =>
        closureCheck === undefined
          ? persistence.turnUnanswered(lookup)
          : closureCheck.then((runFollowup) => !runFollowup && persistence.turnUnanswered(lookup)),
      holdersTurnUnanswered: (holders) =>
        closureCheck === undefined
          ? persistence.holdersTurnUnanswered(holders)
          : closureCheck.then((runFollowup) =>
              runFollowup ? false : persistence.holdersTurnUnanswered(holders),
            ),
    };
  };
}
//@ chunk-tyg7f3ek.js:77670-77918 placement
function isImmediateCommandCandidate(command, commands) {
  if (command.mode === "poll-event") return false;
  if (
    command.skipSlashCommands === true &&
    command.modelScheduledOrigin !== true &&
    !(command.bridgeOrigin === true && command.textNotTyped !== true)
  )
    return false;
  let text = lastTextBlockText(command.value);
  let parsed = text === null ? null : parseSlashCommand(text);
  return parsed !== null && !hasCommand(parsed.commandName, [...commands()]);
}
//@ chunk-tyg7f3ek.js:77918-78379 placement
function runCommandInGate(uuid, plan) {
  let deferred = Promise.withResolvers();
  let abortController = new AbortController();
  let holdRelease = releaseServerHold(pluginCommandRegistry.ownerOf(plan.command));
  let answer = holdRelease.then(() =>
    NO_CORE_AT_CHAIN_BOTTOM("command.run", {
      core: {
        "command.run": {
          name: "core",
          isCore: true,
          budgetMs: 0,
          run: async (...args) => (await deferred.promise).run(...args),
        },
      },
      signal: abortController.signal,
    })(plan),
  );
  answer.catch(() => {});
  deferred.promise.catch(() => {});
  inflightCommandRuns.set(uuid, {
    input: plan,
    reading: snapshotHookRegistration(),
    hooking: holdRelease
      .then(() =>
        pluginsMatchingEvent("command.run", {
          command: plan.command,
        }),
      )
      .catch(() => []),
    answer,
    seat: deferred.resolve,
    stop: (reason) => {
      abortController.abort(reason);
      deferred.reject(toError(reason));
    },
  });
}
//@ chunk-tyg7f3ek.js:78379-78413 placement
function isImmediateCommandsEnabled() {
  return isVsCodeTopSession() && !isVsCodeHooksSuppressed();
}
//@ chunk-tyg7f3ek.js:78413-78432 placement
var WATCHED_IMMEDIATE_IOS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-tyg7f3ek.js:78413", () => {
  WATCHED_IMMEDIATE_IOS = new WeakSet();
});
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
