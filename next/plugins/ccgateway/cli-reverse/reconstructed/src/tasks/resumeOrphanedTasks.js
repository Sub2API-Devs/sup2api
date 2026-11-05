/**
 * tasks/resumeOrphanedTasks.ts
 *
 * 2.1.316 新增：恢复会话时处理上个进程遗留的后台任务（代理、shell、workflow）：重启、补发完成通知或标记孤儿
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-nh1pvp1m.js (22)
 * attribution: placement 22
 */
import { lstat, stat } from "fs/promises";
import { getCommandQueueSnapshot, enqueuePendingNotification } from "../utils/messageQueueManager.js";
import { isStorageV5Enabled } from "../utils/hoverRest.js";
import {
  relinkAdoptedAgentSymlinks,
  ADOPT_ID_PATTERN,
  ADOPT_ID_MAX_CHARS,
  noticeDescriptionOf,
  noticeFieldOf,
  WORKFLOW_RUN_ID_MAX_CHARS,
} from "../utils/background/adopt.js";
import { parseForkMarker } from "../utils/conversationRecovery.js";
import { env } from "../utils/env.js";
import { getSessionId, isDiskless, getMainThreadAgentType, mainAgentId } from "../bootstrap/state.js";
import { isCrossSessionMessagingEnabled } from "../utils/crossSessionMessagingGate.js";
import { appendForkSourceNote } from "../utils/forkSourceNote.js";
import { logError } from "../utils/log.js";
import {
  logResurrectedCrons,
  handleMissedLoopWakeups,
  isOlderVersion,
  OLD_VERSION_THRESHOLD,
  isPlainObjectRecord,
  splitPrefixedByLengths,
  cronOwnership,
  NEW_VERSION_THRESHOLD,
  nonWebFetchOutputFile,
  RELAUNCH_ADVICE,
} from "../utils/cronResume.js";
import { codeModeAccepted } from "../utils/codeMode/accepted.js";
import { syncLiveInFlightSnapshot } from "../services/daemon/jobState.js";
import { summarizeBackgroundWork } from "./backgroundTaskLabels.js";
import { TASK_ID, TASK_NOTIFICATION, STATUS, NOTE, SUMMARY } from "../constants/xml.js";
import { regExp as regExp_11, formatTaskNotification } from "../utils/xmlTags.js";
import { TASKSTOP, TASK_STOP_ALIASES } from "../tools/TaskStopTool/prompt.js";
import { SENDMESSAGE, hasSendMessageTool } from "../tools/SendMessageTool/constants.js";
import { AGENT, TASK } from "../tools/AgentTool/constants.js";
import { isAgentLaunchToolUse } from "../tools/AgentTool/agentLaunch.js";
import { SKILL } from "../tools/SkillTool/skillToolNames.js";
import {
  isBareTaskNotificationOrigin,
  isTaskNotificationOrigin,
  isSessionTaskNotificationOrigin,
} from "../utils/backgroundSessionResume.js";
import { runSeqOf, emitTaskNotification } from "../utils/task/taskNotifications.js";
import { unescapeHtmlEntities, escapeXml_2 as escapeXml } from "../utils/confusables.js";
import { userResumeNoticeTaskId } from "./LocalAgentTask/agentHandback.js";
import { normalizeAgentIdOrNull } from "../utils/agentId.js";
import { CRON_CREATE_TOOL_NAME, CRON_DELETE_TOOL_NAME } from "../tools/ScheduleCronTool/prompt.js";
import { SCHEDULE_WAKEUP_TOOL_NAME } from "../tools/ScheduleWakeupTool/prompt.js";
import { restoredTaskMarkSymbol } from "../utils/messageKinds.js";
import { convertToolProgressMessage } from "../remote/sdkMessageAdapter.js";
import { parseForkedSkillLaunches } from "../utils/xmlTagText.js";
import {
  readCarriedCrons,
  readEndedCronIds,
  willToolsLoseSessionState,
} from "../services/compact/compactCarry.js";
import {
  getAgentTranscriptPath,
  getAgentTranscriptStorageKey,
  readAgentMetadata,
  canFetchAgentTranscriptsOnDemand,
} from "../utils/sessionStorage.js";
import { logFeatureSad } from "../services/analytics/featureTelemetry.js";
import { logForDebugging } from "../utils/debug.js";
import { enqueueOrphanedTasksNotification } from "../utils/task/framework.js";
import { makeSidecarReadFallback } from "../utils/agentMetadata.js";
import { WORKFLOW_RUN_ID_PATTERN } from "../tools/WorkflowTool/constants.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-nh1pvp1m.js:13472-13558 placement
/**
 * 判断排队命令里是否有提到该字符串的。
 */
function hasQueuedCommandMentioning(commandText) {
  return getCommandQueueSnapshot().some(
    (queuedCommand) => typeof queuedCommand.value === "string" && queuedCommand.value.includes(commandText),
  );
}
//@ chunk-nh1pvp1m.js:13558-14762 placement
async function formatOrphanSummary(
  messages,
  taskRegistry,
  autoResumeAgents,
  reportedAgentIds,
  storageV5,
  excludedRowUuids,
  getResumePlan,
  adoptedWorkflowIds,
) {
  if (isStorageV5Enabled() && storageV5 !== undefined)
    await relinkAdoptedAgentSymlinks({
      storageV5,
    });
  let forkMarker = parseForkMarker(env.CLAUDE_CODE_RESUME_SOURCE_ALIVE);
  let candidateMessages = messages;
  if (forkMarker !== null) {
    if (forkMarker.parentSessionId !== undefined && forkMarker.parentSessionId === getSessionId()) return;
    if (forkMarker.sessionId === undefined || forkMarker.sessionId === getSessionId()) {
      let forkBoundaryMs = /^\d{4}-\d{2}-\d{2}T/.test(forkMarker.boundaryAt)
        ? Date.parse(forkMarker.boundaryAt)
        : Number.NaN;
      if (Number.isNaN(forkBoundaryMs)) return;
      candidateMessages = messages.filter((message) => Date.parse(message.timestamp) > forkBoundaryMs);
      if (
        isCrossSessionMessagingEnabled() &&
        forkMarker.sessionId !== undefined &&
        forkMarker.parentSessionId !== undefined
      )
        appendForkSourceNote(candidateMessages, forkMarker.parentSessionId, forkMarker.boundaryAt).catch(
          logError,
        );
    }
  }
  if (excludedRowUuids !== undefined)
    candidateMessages = candidateMessages.filter((message) => !excludedRowUuids.has(message.uuid));
  try {
    let resumedSession = planResumeOfBackgroundTasks(candidateMessages, {
      carriedCrons: true,
    });
    logResurrectedCrons(resumedSession);
    if (autoResumeAgents !== undefined)
      try {
        await handleMissedLoopWakeups(resumedSession);
      } catch (error) {
        logError(error);
      }
    await resumeAsyncAgents(
      resumedSession,
      taskRegistry,
      autoResumeAgents,
      reportedAgentIds,
      storageV5,
      getResumePlan,
    );
    if (codeModeAccepted())
      try {
        let task = new Set([...resumedSession.asyncAgents.keys(), ...resumedSession.notifiedTaskIds]);
        let taskEntry = await require("./codeModeSendMessageNote.lazy.js").listScriptLaunchedAgents(
          candidateMessages,
          task,
          storageV5,
        );
        let localTask = new Map();
        for (let entry of taskEntry) {
          if (localTask.size === MAX_LISTED_ORPHANS) break;
          if (
            !isOrphanSummaryKey(entry.agentId) &&
            !reportedAgentIds?.has(entry.agentId) &&
            !taskRegistry.get(entry.agentId)
          )
            localTask.set(entry.agentId, {
              ...entry,
              canReadOutputFile: false,
              canContinueAgent: true,
              launchedByAgentTool: false,
              foundThroughSidecar: true,
            });
        }
        if (localTask.size > 0)
          await resumeAsyncAgents(
            {
              ...resumedSession,
              asyncAgents: localTask,
            },
            taskRegistry,
            undefined,
            reportedAgentIds,
            storageV5,
            getResumePlan,
          );
      } catch (error) {
        logError(error);
      }
    resumeLocalShellTasks(resumedSession, taskRegistry);
    resumeLocalWorkflows(resumedSession, taskRegistry, adoptedWorkflowIds);
    if (codeModeAccepted()) require("../utils/codeMode/lostEvals.js").reportLostReplEvals(candidateMessages);
    syncLiveInFlightSnapshot(summarizeBackgroundWork(taskRegistry.all()), storageV5);
  } catch (error) {
    logError(error);
  }
}
//@ chunk-nh1pvp1m.js:14762-14949 placement
/**
 * 孤儿汇总解析用的标签与键前缀常量（任务通知/状态标签、条数上限、转录新鲜期、汇总键前缀）。
 */
var TASK_NOTIFICATION_KILLED_PATTERN; // deferred: uses COMMAND_NAME (../constants/xml.js) of its import cycle while loading; runs once the cycle is complete
var TASK_NOTIFICATION_OPEN_TAG;
var STATUS_OPEN_TAG;
var regExp;
var MAX_LISTED_ORPHANS;
var ORPHAN_TRANSCRIPT_MAX_AGE_MS;
var ORPHAN_SUMMARY_KEY;
var ORPHAN_SUMMARY_AGGREGATE_PREFIX;
var ORPHAN_SUMMARY_LIVE_PREFIX;
deferInit("chunk-nh1pvp1m.js:14762", () => {
  TASK_NOTIFICATION_KILLED_PATTERN = new RegExp(`<${TASK_ID}>([^<]+)</${TASK_ID}>`, "g");
  TASK_NOTIFICATION_OPEN_TAG = `<${TASK_NOTIFICATION}>`;
  STATUS_OPEN_TAG = `<${STATUS}>`;
  regExp = new RegExp(`${regExp_11.source}killed</`);
  MAX_LISTED_ORPHANS = 20;
  ORPHAN_TRANSCRIPT_MAX_AGE_MS = 172800000;
  ORPHAN_SUMMARY_KEY = "__orphan_summary";
  ORPHAN_SUMMARY_AGGREGATE_PREFIX = `${ORPHAN_SUMMARY_KEY}__:`;
  ORPHAN_SUMMARY_LIVE_PREFIX = `${ORPHAN_SUMMARY_KEY}_live__:`;
});
//@ chunk-nh1pvp1m.js:14949-14988 placement
/**
 * 判断键是否属于孤儿汇总。
 */
function isOrphanSummaryKey(key) {
  return key.startsWith(ORPHAN_SUMMARY_KEY);
}
//@ chunk-nh1pvp1m.js:14988-15171 placement
/**
 * 孤儿汇总与「被停止或暂停」的说明文案。
 */
var ORPHAN_SUMMARY_NOTE =
  "Orphaned by a previous Claude Code process exit and reported in an aggregate summary.";
var STOPPED_OR_PAUSED_NOTE =
  "stopped or paused (for example via the UI \u2014 this leaves no transcript marker)";
//@ chunk-nh1pvp1m.js:15171-15247 placement
/**
 * 拼出「在上一会话结束前未完成」的说明。
 */
function unfinishedNote(taskLabel) {
  return `${taskLabel} didn't finish before the previous session ended`;
}
//@ chunk-nh1pvp1m.js:15247-15275 placement
var TASK_STOP_TOOL_NAMES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-nh1pvp1m.js:15247", () => {
  TASK_STOP_TOOL_NAMES = new Set([TASKSTOP, ...TASK_STOP_ALIASES]);
});
//@ chunk-nh1pvp1m.js:15275-22534 placement
/**
 * 恢复时清点上个进程的后台任务与 cron，规划重启、补通知、标记孤儿（约 7 KB）。
 */
function planResumeOfBackgroundTasks(messages, { carriedCrons: options = false } = {}) {
  let canReadOutputFile = !isDiskless();
  let cronCreateCalls = [];
  let toolResults = new Map();
  let deletedCronIds = new Set();
  let wakeupCalls = [];
  let wakeupCallsAtLastLoopFire = 0;
  let asyncAgents = new Map();
  let launchedAgentIds = new Set();
  let launchedHereAgentIds = new Set();
  let forkedSkillAgentIds = new Map();
  let markAgentLaunched = (agentId) => {
    launchedAgentIds.add(agentId);
    launchedHereAgentIds.add(agentId);
  };
  let bgShells = new Map();
  let workflows = new Map();
  let notifiedTaskIds = new Set();
  let ownNotifiedTaskIds = new Set();
  let ownNoticeRowUuids = new Map();
  let stoppedTaskIds = new Set();
  let endedTaskIds = new Set();
  let stoppedAt = new Map();
  let agentSendSeqByAgentId = new Map();
  let agentToolUseIds = new Set();
  let agentLaunchToolUseIds = new Set();
  let skillToolUseIds = new Set();
  let stopToolUseIds = new Set();
  let sendMessageAtByToolUseId = new Map();
  for (let message of messages) {
    if (message.type !== "assistant" || !Array.isArray(message.message.content)) continue;
    for (let block of message.message.content) {
      if (block.type !== "tool_use") continue;
      if (TASK_STOP_TOOL_NAMES.has(block.name)) stopToolUseIds.add(block.id);
      else if (block.name === SENDMESSAGE)
        sendMessageAtByToolUseId.set(block.id, timestampMsOrInfinity(message));
      else if (block.name === AGENT || block.name === TASK) {
        agentToolUseIds.add(block.id);
        if (isAgentLaunchToolUse(block)) agentLaunchToolUseIds.add(block.id);
      } else if (block.name === SKILL) skillToolUseIds.add(block.id);
    }
  }
  let carriedCrons = [];
  let markAggregateNotified = (taskKinds) => {
    for (let summarizedKind of taskKinds.summarizedKinds) {
      let idsByKind =
        summarizedKind === "agent" ? asyncAgents : summarizedKind === "shell" ? bgShells : workflows;
      for (let key of idsByKind.keys()) if (!taskKinds.liveExclusions.has(key)) notifiedTaskIds.add(key);
    }
  };
  let sawOwnNotice = false;
  let isImplicitOwnNotice = (noticeMessage, noticeOrigin) =>
    !sawOwnNotice &&
    isOlderVersion(noticeMessage, OLD_VERSION_THRESHOLD) &&
    (noticeOrigin === undefined || noticeOrigin === null || isBareTaskNotificationOrigin(noticeOrigin));
  let recordKilledNotice = (message, noticeText, noticeOrigin, { isOwn, isRewritten, runId }) => {
    let isOwnNotice = !isRewritten && (isOwn || isImplicitOwnNotice(message, noticeOrigin));
    sawOwnNotice ||= isOwn;
    let liveExcludedIds = new Set();
    markAggregateNotified(taskKindLabel(noticeText, liveExcludedIds));
    for (let excludedId of liveExcludedIds) notifiedTaskIds.add(excludedId);
    let taskIdMatch = isOwnNotice ? regExp.exec(noticeText)?.[1] : undefined;
    if (taskIdMatch !== undefined) {
      let runSeq = runId === undefined ? undefined : runSeqOf(runId);
      let noticeTaskId = unescapeHtmlEntities(taskIdMatch);
      let previousSeq = agentSendSeqByAgentId.get(noticeTaskId);
      if (!(
        runSeq !== undefined &&
        previousSeq !== undefined &&
        Number.isFinite(previousSeq) &&
        runSeq < previousSeq
      )) {
        endedTaskIds.add(noticeTaskId);
        stoppedAt.set(
          noticeTaskId,
          Math.min(runSeq ?? Number.POSITIVE_INFINITY, timestampMsOrInfinity(message)),
        );
      }
    }
  };
  let markAgentResumed = (agentId) => {
    launchedAgentIds.add(agentId);
    stoppedTaskIds.delete(agentId);
    endedTaskIds.delete(agentId);
    stoppedAt.delete(agentId);
  };
  let applyCronOwnership = (noticeText, ownership) => {
    let taskId = ownership === "none" ? undefined : userResumeNoticeTaskId(noticeText);
    if (taskId === undefined || normalizeAgentIdOrNull(taskId) === null) return;
    if (ownership === "own") {
      markAgentResumed(taskId);
      return;
    }
    stoppedTaskIds.delete(taskId);
    endedTaskIds.delete(taskId);
    stoppedAt.delete(taskId);
  };
  let recordSessionNotice = (text, uuid) => {
    let taskIdMatch = regExp_11.exec(text)?.[1];
    if (taskIdMatch !== undefined && !isOrphanSummaryKey(unescapeHtmlEntities(taskIdMatch))) {
      ownNotifiedTaskIds.add(unescapeHtmlEntities(taskIdMatch));
      ownNoticeRowUuids.set(unescapeHtmlEntities(taskIdMatch), [
        ...(ownNoticeRowUuids.get(unescapeHtmlEntities(taskIdMatch)) ?? []),
        uuid,
      ]);
    }
  };
  for (let message of messages) {
    if (message.type === "system" && message.subtype === "scheduled_task_fire" && message.taskKind === "loop")
      wakeupCallsAtLastLoopFire = wakeupCalls.length;
    if (message.type === "assistant") {
      let content = message.message.content;
      if (!Array.isArray(content)) continue;
      let createdAt = Date.parse(message.timestamp);
      for (let block of content) {
        if (block.type !== "tool_use") continue;
        let input = isPlainObjectRecord(block.input) ? block.input : {};
        if (block.name === CRON_CREATE_TOOL_NAME)
          cronCreateCalls.push({
            toolUseId: block.id,
            input,
            createdAt,
          });
        else if (block.name === CRON_DELETE_TOOL_NAME) {
          if (typeof input.id === "string") deletedCronIds.add(input.id);
        } else if (block.name === SCHEDULE_WAKEUP_TOOL_NAME)
          wakeupCalls.push({
            toolUseId: block.id,
            input,
            createdAt,
          });
      }
    } else if (message.type === "user") {
      let contentText = messageContentToText(message.message.content);
      let noticeTexts = splitPrefixedByLengths(contentText, message.joinedNoticeLengths);
      let all = noticeTexts.every(
        (noticeText, index) => noticeText.length === message.joinedNoticeLengths?.[index],
      );
      let joinedNoticeOwn =
        all && message.joinedNoticeOwn?.length === noticeTexts.length ? message.joinedNoticeOwn : [];
      let joinedNoticeRunIds =
        all && message.joinedNoticeRunIds?.length === noticeTexts.length ? message.joinedNoticeRunIds : [];
      for (let [index, noticeText] of noticeTexts.entries()) {
        let isOwn =
          isTaskNotificationOrigin(message.origin, message[restoredTaskMarkSymbol]) ||
          joinedNoticeOwn[index] === true;
        recordKilledNotice(message, noticeText, message.origin, {
          isOwn,
          isRewritten: message.promptRewritten === true,
          runId:
            joinedNoticeRunIds[index] ??
            (message.origin?.kind === "task-notification" ? message.origin.runId : undefined),
        });
        if (isSessionTaskNotificationOrigin(message.origin)) recordSessionNotice(noticeText, message.uuid);
        applyCronOwnership(
          noticeText,
          cronOwnership({
            isOwn,
            isBare:
              isBareTaskNotificationOrigin(message.origin) && isOlderVersion(message, NEW_VERSION_THRESHOLD),
            isRewritten: message.promptRewritten === true,
          }),
        );
      }
      let content = message.message.content;
      if (!Array.isArray(content)) continue;
      let toolUseResult = message.toolUseResult;
      if (!isPlainObjectRecord(toolUseResult)) continue;
      let launchedByAgentTool = false;
      let isWebFetchLaunch = false;
      let launchedByForkedSkill = false;
      for (let block of content)
        if (block.type === "tool_result" && !block.is_error) {
          toolResults.set(block.tool_use_id, toolUseResult);
          if (agentToolUseIds.has(block.tool_use_id)) {
            launchedByAgentTool = true;
            isWebFetchLaunch ||= agentLaunchToolUseIds.has(block.tool_use_id);
          }
          if (skillToolUseIds.has(block.tool_use_id)) launchedByForkedSkill = true;
          if (
            toolUseResult.success === true &&
            typeof toolUseResult.message === "string" &&
            typeof toolUseResult.resumedAgentId === "string" &&
            normalizeAgentIdOrNull(toolUseResult.resumedAgentId) !== null
          ) {
            notifiedTaskIds.delete(toolUseResult.resumedAgentId);
            ownNotifiedTaskIds.delete(toolUseResult.resumedAgentId);
            ownNoticeRowUuids.delete(toolUseResult.resumedAgentId);
            let sendMessageAt = sendMessageAtByToolUseId.get(block.tool_use_id);
            if (sendMessageAt !== undefined) {
              markAgentResumed(toolUseResult.resumedAgentId);
              agentSendSeqByAgentId.set(toolUseResult.resumedAgentId, sendMessageAt);
            }
            let existingAgent = asyncAgents.get(toolUseResult.resumedAgentId);
            if (existingAgent) {
              existingAgent.redispatched = true;
              existingAgent.canContinueAgent = true;
            } else
              asyncAgents.set(toolUseResult.resumedAgentId, {
                agentId: toolUseResult.resumedAgentId,
                description: toolUseResult.message,
                isWebFetchLaunch: false,
                canReadOutputFile,
                canContinueAgent: true,
                redispatched: true,
              });
          }
          let sendMessageAt = sendMessageAtByToolUseId.get(block.tool_use_id);
          if (
            toolUseResult.success === true &&
            typeof toolUseResult.revivedAgentId === "string" &&
            normalizeAgentIdOrNull(toolUseResult.revivedAgentId) !== null &&
            sendMessageAt !== undefined
          ) {
            markAgentResumed(toolUseResult.revivedAgentId);
            agentSendSeqByAgentId.set(toolUseResult.revivedAgentId, sendMessageAt);
          }
          let shellTaskId =
            typeof toolUseResult.backgroundTaskId === "string" && typeof toolUseResult.stdout === "string"
              ? toolUseResult.backgroundTaskId
              : typeof toolUseResult.taskId === "string" && typeof toolUseResult.timeoutMs === "number"
                ? toolUseResult.taskId
                : undefined;
          if (shellTaskId !== undefined && !isOrphanSummaryKey(shellTaskId))
            bgShells.set(shellTaskId, {
              taskId: shellTaskId,
              toolUseId: block.tool_use_id,
            });
          if (
            stopToolUseIds.has(block.tool_use_id) &&
            typeof toolUseResult.task_id === "string" &&
            typeof toolUseResult.task_type === "string"
          ) {
            stoppedTaskIds.add(toolUseResult.task_id);
            stoppedAt.set(toolUseResult.task_id, timestampMsOrInfinity(message));
          }
          if (
            toolUseResult.status === "async_launched" &&
            toolUseResult.taskType === "local_workflow" &&
            typeof toolUseResult.taskId === "string" &&
            ADOPT_ID_PATTERN.test(toolUseResult.taskId) &&
            toolUseResult.taskId.length <= ADOPT_ID_MAX_CHARS &&
            !isOrphanSummaryKey(toolUseResult.taskId) &&
            typeof toolUseResult.error !== "string"
          )
            workflows.set(toolUseResult.taskId, {
              taskId: toolUseResult.taskId,
              toolUseId: block.tool_use_id,
              workflowName:
                typeof toolUseResult.workflowName === "string" ? toolUseResult.workflowName : undefined,
              runId: typeof toolUseResult.runId === "string" ? toolUseResult.runId : undefined,
            });
        }
      if (
        typeof toolUseResult.agentId === "string" &&
        (launchedByAgentTool ||
          (launchedByForkedSkill && toolUseResult.status === "forked" && toolUseResult.background === true))
      )
        markAgentLaunched(toolUseResult.agentId);
      if (
        typeof toolUseResult.agentId === "string" &&
        typeof toolUseResult.commandName === "string" &&
        launchedByForkedSkill &&
        toolUseResult.status === "forked"
      )
        forkedSkillAgentIds.set(toolUseResult.agentId, toolUseResult.commandName);
      if (
        toolUseResult.status === "async_launched" &&
        typeof toolUseResult.agentId === "string" &&
        !isOrphanSummaryKey(toolUseResult.agentId) &&
        typeof toolUseResult.description === "string"
      )
        asyncAgents.set(toolUseResult.agentId, {
          agentId: toolUseResult.agentId,
          description: toolUseResult.description,
          outputFile: typeof toolUseResult.outputFile === "string" ? toolUseResult.outputFile : undefined,
          isWebFetchLaunch,
          canReadOutputFile: canReadOutputFile && toolUseResult.canReadOutputFile !== false,
          canContinueAgent: toolUseResult.canContinueAgent !== false,
          launchedByAgentTool,
        });
      if (
        toolUseResult.status === "forked" &&
        toolUseResult.background === true &&
        typeof toolUseResult.agentId === "string" &&
        !isOrphanSummaryKey(toolUseResult.agentId) &&
        !asyncAgents.has(toolUseResult.agentId)
      )
        asyncAgents.set(toolUseResult.agentId, {
          agentId: toolUseResult.agentId,
          description:
            typeof toolUseResult.commandName === "string" ? toolUseResult.commandName : toolUseResult.agentId,
          isWebFetchLaunch: false,
          canReadOutputFile,
          canContinueAgent: true,
          launchedByForkedSkill,
        });
    } else if (message.type === "system" && message.subtype === "informational") {
      let agentId = convertToolProgressMessage(message);
      if (agentId !== undefined) markAgentLaunched(agentId);
    } else if (
      message.type === "system" &&
      message.subtype === "local_command" &&
      typeof message.content === "string"
    ) {
      for (let launch of parseForkedSkillLaunches(message.content)) {
        markAgentLaunched(launch.agentId);
        if (!isOrphanSummaryKey(launch.agentId) && !asyncAgents.has(launch.agentId))
          asyncAgents.set(launch.agentId, {
            agentId: launch.agentId,
            description: launch.description,
            isWebFetchLaunch: false,
            canReadOutputFile,
            canContinueAgent: true,
            launchedByForkedSkill: true,
          });
      }
    } else if (
      message.type === "attachment" &&
      message.attachment.type === "task_status" &&
      message.attachment.taskType === "local_bash" &&
      message.attachment.status === "running" &&
      message.attachment.shell !== undefined &&
      !isOrphanSummaryKey(message.attachment.taskId)
    )
      bgShells.set(message.attachment.taskId, {
        taskId: message.attachment.taskId,
        toolUseId: message.attachment.shell.toolUseId,
      });
    else if (
      message.type === "attachment" &&
      message.attachment.type === "task_status" &&
      message.attachment.taskType === "local_agent" &&
      message.attachment.status === "running"
    )
      launchedAgentIds.add(message.attachment.taskId);
    else if (
      message.type === "attachment" &&
      message.attachment.type === "queued_command" &&
      typeof message.attachment.prompt === "string"
    ) {
      recordKilledNotice(message, message.attachment.prompt, message.attachment.origin, {
        isOwn: isTaskNotificationOrigin(
          message.attachment.origin,
          message.attachment[restoredTaskMarkSymbol],
        ),
        isRewritten: message.attachment.promptRewritten === true,
        runId:
          message.attachment.runId ??
          (message.attachment.origin?.kind === "task-notification"
            ? message.attachment.origin.runId
            : undefined),
      });
      if (isSessionTaskNotificationOrigin(message.attachment.origin))
        recordSessionNotice(message.attachment.prompt, message.uuid);
      applyCronOwnership(
        message.attachment.prompt,
        message.attachment.commandMode === "task-notification"
          ? cronOwnership({
              isOwn: isTaskNotificationOrigin(
                message.attachment.origin,
                message.attachment[restoredTaskMarkSymbol],
              ),
              isBare:
                (message.attachment.origin === undefined ||
                  isBareTaskNotificationOrigin(message.attachment.origin)) &&
                isOlderVersion(message, NEW_VERSION_THRESHOLD),
              isRewritten: message.attachment.promptRewritten === true,
            })
          : "none",
      );
    } else if (options) {
      carriedCrons = readCarriedCrons(message) ?? carriedCrons;
      for (let cronId of readEndedCronIds(message)) deletedCronIds.add(cronId);
    }
  }
  for (let cron of carriedCrons) {
    let carriedToolUseId = `carried:${cron.id}`;
    cronCreateCalls.push({
      toolUseId: carriedToolUseId,
      input: {
        cron: cron.cron,
        prompt: cron.prompt,
      },
      createdAt: cron.createdAt,
    });
    toolResults.set(carriedToolUseId, {
      id: cron.id,
      recurring: cron.recurring,
      durable: false,
      ...(cron.plugin !== undefined && {
        plugin: cron.plugin,
      }),
    });
  }
  return {
    calls: cronCreateCalls,
    results: toolResults,
    deletedCronIds,
    wakeupCalls,
    wakeupCallsAtLastLoopFire,
    asyncAgents,
    launchedAgentIds,
    launchedHereAgentIds,
    forkedSkillAgentIds,
    bgShells,
    workflows,
    notifiedTaskIds,
    ownNotifiedTaskIds,
    ownNoticeRowUuids,
    stoppedTaskIds,
    endedTaskIds,
    stoppedAt,
  };
}
//@ chunk-nh1pvp1m.js:22534-22629 placement
function timestampMsOrInfinity(message) {
  let timestamp = Date.parse(message.timestamp);
  return Number.isNaN(timestamp) ? Number.POSITIVE_INFINITY : timestamp;
}
//@ chunk-nh1pvp1m.js:22629-23013 placement
function taskKindLabel(noticeText, taskIds) {
  let result = {
    summarizedKinds: new Set(),
    liveExclusions: new Set(),
  };
  if (!noticeText.includes(TASK_NOTIFICATION_OPEN_TAG) || !noticeText.includes(STATUS_OPEN_TAG))
    return result;
  for (let match of noticeText.matchAll(TASK_NOTIFICATION_KILLED_PATTERN)) {
    if (!match[1]) continue;
    let taskId = unescapeHtmlEntities(match[1]);
    if (taskId.startsWith(ORPHAN_SUMMARY_LIVE_PREFIX)) {
      result.liveExclusions.add(taskId.slice(ORPHAN_SUMMARY_LIVE_PREFIX.length));
      continue;
    }
    taskIds.add(taskId);
    if (taskId.startsWith(ORPHAN_SUMMARY_AGGREGATE_PREFIX)) {
      let sliced = taskId.slice(ORPHAN_SUMMARY_AGGREGATE_PREFIX.length);
      if (sliced === "agent" || sliced === "shell" || sliced === "workflow")
        result.summarizedKinds.add(sliced);
    }
  }
  return result;
}
//@ chunk-nh1pvp1m.js:23013-23131 placement
function messageContentToText(content) {
  if (typeof content === "string") return content;
  return content.map((block) =>
    isPlainObjectRecord(block) && typeof block.text === "string" ? block.text : "",
  ).join(`
`);
}
//@ chunk-nh1pvp1m.js:23131-23430 placement
async function getAgentTranscriptMtime(agentId, storageV5, useLstat) {
  let agentTranscriptPath = getAgentTranscriptPath(agentId);
  if (isStorageV5Enabled() && storageV5 !== undefined)
    try {
      let agentTranscriptStorageKey = getAgentTranscriptStorageKey(agentTranscriptPath, storageV5);
      if (agentTranscriptStorageKey !== undefined) {
        let backendMeta = await agentTranscriptStorageKey.backend.statMeta(agentTranscriptStorageKey.key);
        if (backendMeta.ok && backendMeta.value.size > 0) return backendMeta.value.mtimeMs;
      }
    } catch {}
  if (useLstat) {
    let lstatStats = await lstat(agentTranscriptPath);
    return lstatStats.isFile() && lstatStats.size > 0 ? lstatStats.mtimeMs : null;
  }
  let fileStats = await stat(agentTranscriptPath);
  return fileStats.size > 0 ? fileStats.mtimeMs : null;
}
//@ chunk-nh1pvp1m.js:23430-27404 placement
/**
 * 恢复后台代理：无完成记录的标记为 orphaned_on_resume 或重启。
 */
async function resumeAsyncAgents(
  { asyncAgents, notifiedTaskIds },
  taskRegistry,
  handOffResumableAgents,
  reportedAgentIds,
  storageV5,
  getResumePlan,
) {
  let taskIds = [];
  let extraIds = [];
  for (let agent of asyncAgents.values()) {
    if (notifiedTaskIds.has(agent.agentId)) continue;
    if (reportedAgentIds?.has(agent.agentId)) continue;
    if (taskRegistry.get(agent.agentId)) {
      extraIds.push(agent.agentId);
      continue;
    }
    taskIds.push(agent);
  }
  if (taskIds.length === 0) return;
  logFeatureSad("task_local_agent", "orphaned_on_resume");
  logForDebugging(`resume: ${taskIds.length} background agent(s) orphaned by previous process exit`);
  if (taskIds.length > MAX_LISTED_ORPHANS) {
    for (let agent of taskIds)
      emitTaskNotification(agent.agentId, "failed", {
        summary: ORPHAN_SUMMARY_NOTE,
        outputFile: nonWebFetchOutputFile(agent),
      });
    enqueueOrphanedTasksNotification(
      "failed",
      "agent",
      "agent",
      taskIds,
      (agent) => escapeXml(agent.agentId),
      extraIds,
    );
    return;
  }
  let results = await Promise.all(
    taskIds.map(async (agent) => {
      let agentId = agent.redispatched ? null : normalizeAgentIdOrNull(agent.agentId);
      if (agentId === null)
        return {
          mtimeMs: null,
          hasMeta: false,
          fetchable: false,
        };
      let mtimeMs;
      try {
        mtimeMs = await getAgentTranscriptMtime(
          agentId,
          storageV5,
          codeModeAccepted() && agent.foundThroughSidecar === true,
        );
      } catch {
        mtimeMs = null;
      }
      let hasMeta =
        handOffResumableAgents !== undefined &&
        (agent.launchedByAgentTool === true || agent.launchedByForkedSkill === true) &&
        mtimeMs !== null &&
        (await readAgentMetadata(agentId, storageV5).catch(
          makeSidecarReadFallback("resume orphan probe"),
        )) !== null;
      return {
        mtimeMs,
        hasMeta,
        fetchable: mtimeMs === null && canFetchAgentTranscriptsOnDemand(),
      };
    }),
  );
  let resumableAgents = [];
  let byStatus = {
    stopped: [],
    failed: [],
  };
  let now = Date.now();
  let agentsWithCapabilities = taskIds;
  try {
    let resumePlan = getResumePlan?.();
    if (resumePlan)
      agentsWithCapabilities = taskIds.map((agent) => withResumeCapabilities(agent, resumePlan));
  } catch (error) {
    logError(
      Error("restoreBackgroundTasksFromMessages: resuming-session verdicts threw", {
        cause: error,
      }),
    );
  }
  for (let [index, agent] of agentsWithCapabilities.entries()) {
    let { mtimeMs, hasMeta, fetchable } = results[index] ?? {
      mtimeMs: null,
      hasMeta: false,
      fetchable: false,
    };
    if (
      handOffResumableAgents !== undefined &&
      (agent.launchedByAgentTool === true || agent.launchedByForkedSkill === true) &&
      hasMeta &&
      mtimeMs !== null &&
      now - mtimeMs < ORPHAN_TRANSCRIPT_MAX_AGE_MS
    ) {
      resumableAgents.push({
        agentId: agent.agentId,
        description: agent.description,
        outputFile: agent.outputFile,
        isWebFetchLaunch: agent.isWebFetchLaunch,
        canReadOutputFile: agent.canReadOutputFile,
        canContinueAgent: agent.canContinueAgent,
      });
      continue;
    }
    let hasTranscript = mtimeMs !== null || fetchable;
    let status = agent.redispatched || hasTranscript ? "stopped" : "failed";
    let summary = unfinishedNote(`Background agent "${escapeXml(agent.description)}"`);
    let advice = RELAUNCH_ADVICE(agent);
    let note = agent.redispatched
      ? `No completion record was found for it after it was ${agent.canContinueAgent ? `re-dispatched via ${SENDMESSAGE}` : "sent a follow-up message"} in the previous session. It may have been stopped (via the UI, an SDK interrupt, or agent teardown \u2014 these leave no transcript marker), or it may have been running when the previous Claude Code process exited. ${agent.canContinueAgent ? (agent.isWebFetchLaunch ? `Send it another message with ${SENDMESSAGE} to resume it and get its report before assuming the fetch landed.` : agent.canReadOutputFile ? `Send it another message with ${SENDMESSAGE} to resume it, or check its worktree/output for partial work before assuming the task landed.` : `Send it another message with ${SENDMESSAGE} to resume it and ask for a status report before assuming the task landed.`) : advice}`
      : hasTranscript
        ? `No completion record was found for it in the previous session. It may have been stopped, or it may have been running when the previous Claude Code process exited${agent.canContinueAgent ? " \u2014 either way its transcript is saved, so its progress is not lost" : ""}. ${agent.canContinueAgent ? (agent.isWebFetchLaunch ? `Resume it by sending it a message with ${SENDMESSAGE} to get its report.` : agent.canReadOutputFile ? `Resume it by sending it a message with ${SENDMESSAGE}, or check its worktree/output for partial work before assuming the task landed.` : `Resume it by sending it a message with ${SENDMESSAGE} and ask for a status report before assuming the task landed.`) : advice}`
        : `It was running when the previous Claude Code process exited and did not complete. Its in-process state was lost. ${advice}`;
    if (agent.redispatched) enqueueTaskNotification(agent, status, summary, note);
    else
      byStatus[status].push({
        agent,
        summary,
        note,
      });
    emitTaskNotification(agent.agentId, status, {
      summary: unescapeHtmlEntities(summary),
      outputFile: nonWebFetchOutputFile(agent),
    });
  }
  let filtered = byStatus.stopped.filter((entry) => !entry.agent.canContinueAgent);
  let any = filtered.some((entry) => !entry.agent.isWebFetchLaunch && entry.agent.canReadOutputFile);
  let noticeGroups = [
    {
      status: "stopped",
      members: byStatus.stopped.filter((entry) => entry.agent.canContinueAgent),
    },
    {
      status: "stopped",
      members: any
        ? filtered.filter((entry) => entry.agent.isWebFetchLaunch || entry.agent.canReadOutputFile)
        : filtered,
    },
    {
      status: "stopped",
      members: any
        ? filtered.filter((entry) => !entry.agent.isWebFetchLaunch && !entry.agent.canReadOutputFile)
        : [],
    },
    {
      status: "failed",
      members: byStatus.failed,
    },
  ];
  for (let { status, members } of noticeGroups) {
    let firstMember = members[0];
    if (members.length === 1 && firstMember)
      enqueueTaskNotification(firstMember.agent, status, firstMember.summary, firstMember.note);
    else if (members.length > 1)
      formatStoppedAgentsNotice(
        status,
        members.map((member) => member.agent),
      );
  }
  if (resumableAgents.length > 0 && handOffResumableAgents !== undefined) {
    logForDebugging(
      `resume: handing ${resumableAgents.length} disk-resumable orphaned agent(s) to the bg auto-resume path`,
    );
    handOffResumableAgents(resumableAgents);
  }
}
//@ chunk-nh1pvp1m.js:27404-27753 placement
function formatAgentRestartedNotice(agent) {
  enqueueTaskNotification(
    agent,
    undefined,
    `Background agent "${escapeXml(agent.description)}" was restarted after the previous session ended`,
    "It had no completion record after the previous Claude Code process exited, and was automatically restarted from its saved transcript. It is running in the background again; its result will arrive as a separate task notification.",
  );
}
//@ chunk-nh1pvp1m.js:27753-27852 placement
/**
 * 主线程无代理类型且非 simple 模式时的启动替身计划。
 */
function startupStandInPlan(tools) {
  return getMainThreadAgentType() === undefined && !env.CLAUDE_CODE_SIMPLE
    ? {
        kind: "startupStandIn",
        tools,
      }
    : undefined;
}
//@ chunk-nh1pvp1m.js:27852-28068 placement
function withResumeCapabilities(agent, resumePlan) {
  let canReadWithoutWebFetch = agent.canReadOutputFile && !agent.isWebFetchLaunch;
  let canReadOutputFile;
  switch (resumePlan.kind) {
    case "startupStandIn":
      canReadOutputFile = canReadWithoutWebFetch;
      break;
    case "runningPool":
      canReadOutputFile = canReadWithoutWebFetch && willToolsLoseSessionState(resumePlan.tools);
      break;
  }
  return {
    ...agent,
    canContinueAgent: hasSendMessageTool(resumePlan.tools),
    canReadOutputFile,
  };
}
//@ chunk-nh1pvp1m.js:28068-29245 placement
function formatOrphanedAgentNotification(agent, taskRegistry, notificationSource) {
  let task = taskRegistry.get(agent.agentId);
  let treatAsWebFetch =
    agent.isWebFetchLaunch || (task?.type === "local_agent" && task.webFetchSavedFiles !== undefined);
  let advice =
    !treatAsWebFetch && agent.canReadOutputFile
      ? "Read its output file (and check its worktree, if any) for the result."
      : agent.canContinueAgent
        ? `Send it a message with ${SENDMESSAGE} to get its report.`
        : treatAsWebFetch
          ? "Its report cannot be retrieved from this session. If it only fetched web pages, launch it again if the report is still needed; otherwise launching it again could repeat work it already did: do so only if that is safe."
          : "Its report cannot be retrieved from this session. Its last turn had ended, so its work may already be done and launching it again could repeat it: do so only if its result is still needed and repeating the work is safe; otherwise tell your user its report could not be retrieved from this session.";
  enqueueTaskNotification(
    treatAsWebFetch
      ? {
          ...agent,
          isWebFetchLaunch: true,
        }
      : agent,
    "completed",
    `Background agent "${escapeXml(agent.description)}" finished before the previous session ended, but its result was never reported`,
    `It had already completed before the previous Claude Code process exited \u2014 only its completion notification was lost, so it was not restarted and no further task notification will arrive. ${advice}`,
    notificationSource,
  );
}
//@ chunk-nh1pvp1m.js:29245-29887 placement
function formatAgentRestartFailedNotice(agent, errorText, notificationSource) {
  enqueueTaskNotification(
    agent,
    "stopped",
    `Background agent "${escapeXml(agent.description)}" from the previous session couldn't be restarted: ${escapeXml(errorText)}`,
    agent.canContinueAgent
      ? `It could not be automatically restarted. Its transcript may still be resumable by sending it a message with ${SENDMESSAGE}${agent.isWebFetchLaunch ? ", which is the only way to get its report." : agent.canReadOutputFile ? "; check its worktree/output for partial work before assuming the task landed." : " and asking for a status report before assuming the task landed."}`
      : agent.canReadOutputFile && !agent.isWebFetchLaunch
        ? `It could not be automatically restarted. ${RELAUNCH_ADVICE(agent)}`
        : "It could not be automatically restarted.",
    notificationSource,
  );
}
//@ chunk-nh1pvp1m.js:29887-30241 placement
function enqueueTaskNotification(agent, status, summary, note, notificationSource) {
  let outputFile = agent.canReadOutputFile ? nonWebFetchOutputFile(agent) : undefined;
  let reserved = codeModeAccepted()
    ? require("./codeModeSendMessageNote.lazy.js").codeModeSendMessageNote(note, false)
    : "";
  enqueuePendingNotification({
    value: formatTaskNotification({
      taskId: escapeXml(agent.agentId),
      outputFile: outputFile ? escapeXml(outputFile) : undefined,
      status,
      summary,
      body: `
<${NOTE}>${note}${reserved}</${NOTE}>`,
    }),
    agentId: mainAgentId(),
    mode: "task-notification",
    skipAttachments: true,
    priority: "next",
    ...(notificationSource === undefined && {
      shouldQuery: false,
    }),
  });
}
//@ chunk-nh1pvp1m.js:30241-32282 placement
function formatStoppedAgentsNotice(status, agents) {
  let joined = agents.map((agent) => `<${TASK_ID}>${escapeXml(agent.agentId)}</${TASK_ID}>`).join(`
`);
  let joined_2 = agents
    .map((agent) => `"${escapeXml(agent.description)}" (${escapeXml(agent.agentId)})`)
    .join(", ");
  let mapped = agents.filter((agent) => agent.isWebFetchLaunch).map((agent) => escapeXml(agent.agentId));
  let allWebFetch = mapped.length === agents.length;
  let all = agents.every((agent) => agent.isWebFetchLaunch || !agent.canReadOutputFile);
  let all_2 = agents.every((agent) => agent.canContinueAgent);
  let webFetchNote =
    mapped.length === 0 || allWebFetch
      ? ""
      : status === "stopped" && all_2
        ? ` ${mapped.length === 1 ? "Agent" : "Agents"} ${mapped.join(", ")} fetched web content and ${mapped.length === 1 ? "has" : "have"} no worktree or output to check \u2014 resume ${mapped.length === 1 ? "it" : "them"} with ${SENDMESSAGE} only.`
        : ` ${mapped.length === 1 ? "Agent" : "Agents"} ${mapped.join(", ")} fetched web content and ${mapped.length === 1 ? "has" : "have"} nothing to check \u2014 launch ${mapped.length === 1 ? "it" : "them"} again if still needed.`;
  let advice = allWebFetch
    ? "Launch them again if their reports are still needed."
    : all
      ? "Do not assume the tasks landed; launch them again if their results are still needed."
      : "Check each agent's worktree/output for partial work before assuming the tasks landed.";
  let note =
    status === "stopped"
      ? `No completion record was found for them in the previous session. They may have been stopped, or they may have been running when the previous Claude Code process exited${all_2 ? " \u2014 either way their transcripts are saved, so their progress is not lost" : ""}. ${all_2 ? (allWebFetch ? `Resume any of them by sending a message to its id with ${SENDMESSAGE} to get its report.` : all ? `Resume any of them by sending a message to its id with ${SENDMESSAGE} and ask for a status report before assuming the task landed.` : `Resume any of them by sending a message to its id with ${SENDMESSAGE}, or check its worktree/output for partial work before assuming the task landed.`) : advice}`
      : `They were running when the previous Claude Code process exited and did not complete. Their in-process state was lost. ${advice}`;
  let reserved = codeModeAccepted()
    ? require("./codeModeSendMessageNote.lazy.js").codeModeSendMessageNote(note, true)
    : "";
  enqueuePendingNotification({
    value: `<${TASK_NOTIFICATION}>
${joined}
<${STATUS}>${status}</${STATUS}>
<${SUMMARY}>${unfinishedNote(`${agents.length} background agents`)}: ${joined_2}.${webFetchNote}</${SUMMARY}>
<${NOTE}>${note}${reserved}</${NOTE}>
</${TASK_NOTIFICATION}>`,
    agentId: mainAgentId(),
    mode: "task-notification",
    skipAttachments: true,
    priority: "next",
    shouldQuery: false,
  });
}
//@ chunk-nh1pvp1m.js:32282-33451 placement
function resumeLocalShellTasks({ bgShells, notifiedTaskIds, stoppedTaskIds }, taskRegistry) {
  let taskIds = [];
  let extraIds = [];
  for (let shell of bgShells.values()) {
    if (notifiedTaskIds.has(shell.taskId) || stoppedTaskIds.has(shell.taskId)) continue;
    if (taskRegistry.get(shell.taskId)) {
      extraIds.push(shell.taskId);
      continue;
    }
    taskIds.push(shell);
  }
  if (taskIds.length === 0) return;
  logFeatureSad("task_local_shell", "orphaned_on_resume");
  logForDebugging(`resume: ${taskIds.length} background shell command(s) orphaned by previous process exit`);
  if (taskIds.length > 1) {
    for (let shell of taskIds)
      emitTaskNotification(shell.taskId, "stopped", {
        toolUseId: shell.toolUseId,
        summary: ORPHAN_SUMMARY_NOTE,
      });
    enqueueOrphanedTasksNotification(
      "stopped",
      "shell",
      "shell command",
      taskIds,
      (shell) => escapeXml(shell.taskId),
      extraIds,
    );
    return;
  }
  for (let shell of taskIds) {
    let summary = unfinishedNote("Background shell command");
    let note = `No completion record was found for it in the previous session. It may have been stopped (via the UI, Monitor timeout, or agent teardown \u2014 these leave no transcript marker), or it may have been running when the previous Claude Code process exited.${isDiskless() ? "" : " Check the output file for partial results before assuming it completed."}`;
    enqueuePendingNotification({
      value: formatTaskNotification({
        taskId: escapeXml(shell.taskId),
        toolUseId: escapeXml(shell.toolUseId),
        status: "stopped",
        summary,
        body: `
<${NOTE}>${note}</${NOTE}>`,
      }),
      agentId: mainAgentId(),
      mode: "task-notification",
      skipAttachments: true,
      priority: "next",
      shouldQuery: false,
    });
    emitTaskNotification(shell.taskId, "stopped", {
      toolUseId: shell.toolUseId,
      summary,
    });
  }
}
//@ chunk-nh1pvp1m.js:33451-34789 placement
function resumeLocalWorkflows(
  { workflows, notifiedTaskIds, stoppedTaskIds },
  taskRegistry,
  adoptedWorkflowIds,
) {
  let taskIds = [];
  let extraIds = [];
  for (let workflow of workflows.values()) {
    if (
      notifiedTaskIds.has(workflow.taskId) ||
      stoppedTaskIds.has(workflow.taskId) ||
      adoptedWorkflowIds?.has(workflow.taskId)
    )
      continue;
    if (taskRegistry.get(workflow.taskId)) {
      extraIds.push(workflow.taskId);
      continue;
    }
    taskIds.push(workflow);
  }
  if (taskIds.length === 0) return;
  logFeatureSad("task_local_workflow", "orphaned_on_resume");
  logForDebugging(`resume: ${taskIds.length} background workflow(s) orphaned by previous process exit`);
  if (taskIds.length > MAX_LISTED_ORPHANS) {
    for (let workflow of taskIds)
      emitTaskNotification(workflow.taskId, "stopped", {
        toolUseId: workflow.toolUseId,
        summary: ORPHAN_SUMMARY_NOTE,
      });
    enqueueOrphanedTasksNotification(
      "stopped",
      "workflow",
      "workflow",
      taskIds,
      (workflow) => escapeXml(workflow.taskId),
      extraIds,
    );
    return;
  }
  for (let workflow of taskIds) {
    let quotedName = workflow.workflowName ? ` "${noticeDescriptionOf(workflow.workflowName)}"` : "";
    let shortRunId =
      workflow.runId !== undefined && WORKFLOW_RUN_ID_PATTERN.test(workflow.runId)
        ? noticeFieldOf(workflow.runId, WORKFLOW_RUN_ID_MAX_CHARS)
        : undefined;
    let runSuffix = shortRunId ? ` (run ${shortRunId})` : "";
    let resumeHint = !shortRunId
      ? ""
      : " To pick up where it left off, relaunch with Workflow({scriptPath, resumeFromRunId}) using the run id from the summary \u2014 completed agent() calls return cached.";
    let reserved = "";
    let summary = unfinishedNote(`Background workflow${quotedName}${runSuffix}`);
    let note = `No completion record was found for it in the previous session. It may have been ${STOPPED_OR_PAUSED_NOTE}, or it may have been running when the previous Claude Code process exited.${resumeHint}`;
    enqueuePendingNotification({
      value: formatTaskNotification({
        taskId: escapeXml(workflow.taskId),
        toolUseId: escapeXml(workflow.toolUseId),
        status: "stopped",
        summary,
        body: `
<${NOTE}>${escapeXml(note)}</${NOTE}>`,
      }),
      agentId: mainAgentId(),
      mode: "task-notification",
      skipAttachments: true,
      priority: "next",
      shouldQuery: false,
    });
    emitTaskNotification(workflow.taskId, "stopped", {
      toolUseId: workflow.toolUseId,
      summary: unescapeHtmlEntities(summary),
    });
  }
}
export {
  planResumeOfBackgroundTasks,
  MAX_LISTED_ORPHANS,
  ORPHAN_SUMMARY_AGGREGATE_PREFIX,
  ORPHAN_SUMMARY_LIVE_PREFIX,
  STOPPED_OR_PAUSED_NOTE,
  unfinishedNote,
  ORPHAN_SUMMARY_KEY,
  formatOrphanSummary,
  startupStandInPlan,
  formatAgentRestartFailedNotice,
  formatOrphanedAgentNotification,
  withResumeCapabilities,
  formatAgentRestartedNotice,
  hasQueuedCommandMentioning,
};
