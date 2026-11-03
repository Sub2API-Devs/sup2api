/**
 * tasks/resumeOrphanedTasks.ts
 *
 * 2.1.316 新增：恢复会话时处理上个进程遗留的后台任务（代理、shell、workflow）：重启、补发完成通知或标记孤儿
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-0sfjpx19.js (22)
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
import { enqueueOrphanedTasksNotification } from "./RemoteAgentTask/RemoteAgentTask.js";
import { makeSidecarReadFallback } from "../utils/agentMetadata.js";
import { WORKFLOW_RUN_ID_PATTERN } from "../tools/WorkflowTool/constants.js";

//@ chunk-0sfjpx19.js:51318-51404 placement
/**
 * 判断排队命令里是否有提到该字符串的。
 */
function hasQueuedCommandMentioning(e) {
  return getCommandQueueSnapshot().some((n) => typeof n.value === "string" && n.value.includes(e));
}
//@ chunk-0sfjpx19.js:51404-52114 placement
async function formatOrphanSummary(e, taskRegistry, r, s, storageV5, y, _, b) {
  if (isStorageV5Enabled() && storageV5 !== undefined)
    await relinkAdoptedAgentSymlinks({
      storageV5,
    });
  let forkMarker = parseForkMarker(env.CLAUDE_CODE_RESUME_SOURCE_ALIVE);
  let w = e;
  if (forkMarker !== null) {
    if (forkMarker.parentSessionId !== undefined && forkMarker.parentSessionId === getSessionId()) return;
    if (forkMarker.sessionId === undefined || forkMarker.sessionId === getSessionId()) {
      let S = /^\d{4}-\d{2}-\d{2}T/.test(forkMarker.boundaryAt)
        ? Date.parse(forkMarker.boundaryAt)
        : Number.NaN;
      if (Number.isNaN(S)) return;
      w = e.filter((T) => Date.parse(T.timestamp) > S);
      if (
        isCrossSessionMessagingEnabled() &&
        forkMarker.sessionId !== undefined &&
        forkMarker.parentSessionId !== undefined
      )
        appendForkSourceNote(w, forkMarker.parentSessionId, forkMarker.boundaryAt).catch(logError);
    }
  }
  if (y !== undefined) w = w.filter((S) => !y.has(S.uuid));
  try {
    let S = planResumeOfBackgroundTasks(w, {
      carriedCrons: true,
    });
    logResurrectedCrons(S);
    if (r !== undefined)
      try {
        await handleMissedLoopWakeups(S);
      } catch (error) {
        logError(error);
      }
    await resumeAsyncAgents(S, taskRegistry, r, s, storageV5, _);
    resumeLocalShellTasks(S, taskRegistry);
    resumeLocalWorkflows(S, taskRegistry, b);
    syncLiveInFlightSnapshot(summarizeBackgroundWork(taskRegistry.all()), storageV5);
  } catch (error) {
    logError(error);
  }
}
//@ chunk-0sfjpx19.js:52114-52301 placement
/**
 * 孤儿汇总解析用的标签与键前缀常量（任务通知/状态标签、条数上限、转录新鲜期、汇总键前缀）。
 */
var TASK_NOTIFICATION_KILLED_PATTERN = new RegExp(`<${TASK_ID}>([^<]+)</${TASK_ID}>`, "g");
var TASK_NOTIFICATION_OPEN_TAG = `<${TASK_NOTIFICATION}>`;
var STATUS_OPEN_TAG = `<${STATUS}>`;
var regExp = new RegExp(`${regExp_11.source}killed</`);
var MAX_LISTED_ORPHANS = 20;
var ORPHAN_TRANSCRIPT_MAX_AGE_MS = 172800000;
var ORPHAN_SUMMARY_KEY = "__orphan_summary";
var ORPHAN_SUMMARY_AGGREGATE_PREFIX = `${ORPHAN_SUMMARY_KEY}__:`;
var ORPHAN_SUMMARY_LIVE_PREFIX = `${ORPHAN_SUMMARY_KEY}_live__:`;
//@ chunk-0sfjpx19.js:52301-52340 placement
/**
 * 判断键是否属于孤儿汇总。
 */
function isOrphanSummaryKey(e) {
  return e.startsWith(ORPHAN_SUMMARY_KEY);
}
//@ chunk-0sfjpx19.js:52340-52523 placement
/**
 * 孤儿汇总与「被停止或暂停」的说明文案。
 */
var ORPHAN_SUMMARY_NOTE =
  "Orphaned by a previous Claude Code process exit and reported in an aggregate summary.";
var STOPPED_OR_PAUSED_NOTE =
  "stopped or paused (for example via the UI \u2014 this leaves no transcript marker)";
//@ chunk-0sfjpx19.js:52523-52599 placement
/**
 * 拼出「在上一会话结束前未完成」的说明。
 */
function unfinishedNote(e) {
  return `${e} didn't finish before the previous session ended`;
}
//@ chunk-0sfjpx19.js:52599-52627 placement
var TASK_STOP_TOOL_NAMES = new Set([TASKSTOP, ...TASK_STOP_ALIASES]);
//@ chunk-0sfjpx19.js:52627-59889 placement
/**
 * 恢复时清点上个进程的后台任务与 cron，规划重启、补通知、标记孤儿（约 7 KB）。
 */
function planResumeOfBackgroundTasks(e, { carriedCrons: n = false } = {}) {
  let r = !isDiskless();
  let s = [];
  let h = new Map();
  let y = new Set();
  let _ = [];
  let wakeupCallsAtLastLoopFire = 0;
  let k = new Map();
  let w = new Set();
  let S = new Set();
  let T = new Map();
  let D = (agentId) => {
    w.add(agentId);
    S.add(agentId);
  };
  let E = new Map();
  let N = new Map();
  let G = new Set();
  let R = new Set();
  let P = new Map();
  let U = new Set();
  let L = new Set();
  let oe = new Map();
  let te = new Map();
  let Q = new Set();
  let ne = new Set();
  let z = new Set();
  let V = new Set();
  let j = new Map();
  for (let M of e) {
    if (M.type !== "assistant" || !Array.isArray(M.message.content)) continue;
    for (let q of M.message.content) {
      if (q.type !== "tool_use") continue;
      if (TASK_STOP_TOOL_NAMES.has(q.name)) V.add(q.id);
      else if (q.name === SENDMESSAGE) j.set(q.id, timestampMsOrInfinity(M));
      else if (q.name === AGENT || q.name === TASK) {
        Q.add(q.id);
        if (isAgentLaunchToolUse(q)) ne.add(q.id);
      } else if (q.name === SKILL) z.add(q.id);
    }
  }
  let pe = [];
  let me = (M) => {
    for (let summarizedKind of M.summarizedKinds) {
      let le = summarizedKind === "agent" ? k : summarizedKind === "shell" ? E : N;
      for (let key of le.keys()) if (!M.liveExclusions.has(key)) G.add(key);
    }
  };
  let ce = false;
  let Fe = (M, q) =>
    !ce &&
    isOlderVersion(M, OLD_VERSION_THRESHOLD) &&
    (q === undefined || q === null || isBareTaskNotificationOrigin(q));
  let Ne = (M, q, origin, { isOwn, isRewritten, runId }) => {
    let re = !isRewritten && (isOwn || Fe(M, origin));
    ce ||= isOwn;
    let x = new Set();
    me(taskKindLabel(q, x));
    for (let Z of x) G.add(Z);
    let se = re ? regExp.exec(q)?.[1] : undefined;
    if (se !== undefined) {
      let Z = runId === undefined ? undefined : runSeqOf(runId);
      let ue = unescapeHtmlEntities(se);
      let ae = te.get(ue);
      if (!(Z !== undefined && ae !== undefined && Number.isFinite(ae) && Z < ae)) {
        L.add(ue);
        oe.set(ue, Math.min(Z ?? Number.POSITIVE_INFINITY, timestampMsOrInfinity(M)));
      }
    }
  };
  let ke = (M) => {
    w.add(M);
    U.delete(M);
    L.delete(M);
    oe.delete(M);
  };
  let Pe = (M, q) => {
    let le = q === "none" ? undefined : userResumeNoticeTaskId(M);
    if (le === undefined || normalizeAgentIdOrNull(le) === null) return;
    if (q === "own") {
      ke(le);
      return;
    }
    U.delete(le);
    L.delete(le);
    oe.delete(le);
  };
  let Ie = (M, uuid) => {
    let le = regExp_11.exec(M)?.[1];
    if (le !== undefined && !isOrphanSummaryKey(unescapeHtmlEntities(le))) {
      R.add(unescapeHtmlEntities(le));
      P.set(unescapeHtmlEntities(le), [...(P.get(unescapeHtmlEntities(le)) ?? []), uuid]);
    }
  };
  for (let M of e) {
    if (M.type === "system" && M.subtype === "scheduled_task_fire" && M.taskKind === "loop")
      wakeupCallsAtLastLoopFire = _.length;
    if (M.type === "assistant") {
      let content = M.message.content;
      if (!Array.isArray(content)) continue;
      let createdAt = Date.parse(M.timestamp);
      for (let be of content) {
        if (be.type !== "tool_use") continue;
        let input = isPlainObjectRecord(be.input) ? be.input : {};
        if (be.name === CRON_CREATE_TOOL_NAME)
          s.push({
            toolUseId: be.id,
            input,
            createdAt,
          });
        else if (be.name === CRON_DELETE_TOOL_NAME) {
          if (typeof input.id === "string") y.add(input.id);
        } else if (be.name === SCHEDULE_WAKEUP_TOOL_NAME)
          _.push({
            toolUseId: be.id,
            input,
            createdAt,
          });
      }
    } else if (M.type === "user") {
      let q = messageContentToText(M.message.content);
      let le = splitPrefixedByLengths(q, M.joinedNoticeLengths);
      let all = le.every((ae, he) => ae.length === M.joinedNoticeLengths?.[he]);
      let joinedNoticeOwn = all && M.joinedNoticeOwn?.length === le.length ? M.joinedNoticeOwn : [];
      let joinedNoticeRunIds = all && M.joinedNoticeRunIds?.length === le.length ? M.joinedNoticeRunIds : [];
      for (let [ae, he] of le.entries()) {
        let isOwn =
          isTaskNotificationOrigin(M.origin, M[restoredTaskMarkSymbol]) || joinedNoticeOwn[ae] === true;
        Ne(M, he, M.origin, {
          isOwn,
          isRewritten: M.promptRewritten === true,
          runId:
            joinedNoticeRunIds[ae] ?? (M.origin?.kind === "task-notification" ? M.origin.runId : undefined),
        });
        if (isSessionTaskNotificationOrigin(M.origin)) Ie(he, M.uuid);
        Pe(
          he,
          cronOwnership({
            isOwn,
            isBare: isBareTaskNotificationOrigin(M.origin) && isOlderVersion(M, NEW_VERSION_THRESHOLD),
            isRewritten: M.promptRewritten === true,
          }),
        );
      }
      let content = M.message.content;
      if (!Array.isArray(content)) continue;
      let toolUseResult = M.toolUseResult;
      if (!isPlainObjectRecord(toolUseResult)) continue;
      let se = false;
      let isWebFetchLaunch = false;
      let ue = false;
      for (let ae of content)
        if (ae.type === "tool_result" && !ae.is_error) {
          h.set(ae.tool_use_id, toolUseResult);
          if (Q.has(ae.tool_use_id)) {
            se = true;
            isWebFetchLaunch ||= ne.has(ae.tool_use_id);
          }
          if (z.has(ae.tool_use_id)) ue = true;
          if (
            toolUseResult.success === true &&
            typeof toolUseResult.message === "string" &&
            typeof toolUseResult.resumedAgentId === "string" &&
            normalizeAgentIdOrNull(toolUseResult.resumedAgentId) !== null
          ) {
            G.delete(toolUseResult.resumedAgentId);
            R.delete(toolUseResult.resumedAgentId);
            P.delete(toolUseResult.resumedAgentId);
            let Je = j.get(ae.tool_use_id);
            if (Je !== undefined) {
              ke(toolUseResult.resumedAgentId);
              te.set(toolUseResult.resumedAgentId, Je);
            }
            let $e = k.get(toolUseResult.resumedAgentId);
            if ($e) {
              $e.redispatched = true;
              $e.canContinueAgent = true;
            } else
              k.set(toolUseResult.resumedAgentId, {
                agentId: toolUseResult.resumedAgentId,
                description: toolUseResult.message,
                isWebFetchLaunch: false,
                canReadOutputFile: r,
                canContinueAgent: true,
                redispatched: true,
              });
          }
          let he = j.get(ae.tool_use_id);
          if (
            toolUseResult.success === true &&
            typeof toolUseResult.revivedAgentId === "string" &&
            normalizeAgentIdOrNull(toolUseResult.revivedAgentId) !== null &&
            he !== undefined
          ) {
            ke(toolUseResult.revivedAgentId);
            te.set(toolUseResult.revivedAgentId, he);
          }
          let we =
            typeof toolUseResult.backgroundTaskId === "string" && typeof toolUseResult.stdout === "string"
              ? toolUseResult.backgroundTaskId
              : typeof toolUseResult.taskId === "string" && typeof toolUseResult.timeoutMs === "number"
                ? toolUseResult.taskId
                : undefined;
          if (we !== undefined && !isOrphanSummaryKey(we))
            E.set(we, {
              taskId: we,
              toolUseId: ae.tool_use_id,
            });
          if (
            V.has(ae.tool_use_id) &&
            typeof toolUseResult.task_id === "string" &&
            typeof toolUseResult.task_type === "string"
          ) {
            U.add(toolUseResult.task_id);
            oe.set(toolUseResult.task_id, timestampMsOrInfinity(M));
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
            N.set(toolUseResult.taskId, {
              taskId: toolUseResult.taskId,
              toolUseId: ae.tool_use_id,
              workflowName:
                typeof toolUseResult.workflowName === "string" ? toolUseResult.workflowName : undefined,
              runId: typeof toolUseResult.runId === "string" ? toolUseResult.runId : undefined,
            });
        }
      if (
        typeof toolUseResult.agentId === "string" &&
        (se || (ue && toolUseResult.status === "forked" && toolUseResult.background === true))
      )
        D(toolUseResult.agentId);
      if (
        typeof toolUseResult.agentId === "string" &&
        typeof toolUseResult.commandName === "string" &&
        ue &&
        toolUseResult.status === "forked"
      )
        T.set(toolUseResult.agentId, toolUseResult.commandName);
      if (
        toolUseResult.status === "async_launched" &&
        typeof toolUseResult.agentId === "string" &&
        !isOrphanSummaryKey(toolUseResult.agentId) &&
        typeof toolUseResult.description === "string"
      )
        k.set(toolUseResult.agentId, {
          agentId: toolUseResult.agentId,
          description: toolUseResult.description,
          outputFile: typeof toolUseResult.outputFile === "string" ? toolUseResult.outputFile : undefined,
          isWebFetchLaunch,
          canReadOutputFile: r && toolUseResult.canReadOutputFile !== false,
          canContinueAgent: toolUseResult.canContinueAgent !== false,
          launchedByAgentTool: se,
        });
      if (
        toolUseResult.status === "forked" &&
        toolUseResult.background === true &&
        typeof toolUseResult.agentId === "string" &&
        !isOrphanSummaryKey(toolUseResult.agentId) &&
        !k.has(toolUseResult.agentId)
      )
        k.set(toolUseResult.agentId, {
          agentId: toolUseResult.agentId,
          description:
            typeof toolUseResult.commandName === "string" ? toolUseResult.commandName : toolUseResult.agentId,
          isWebFetchLaunch: false,
          canReadOutputFile: r,
          canContinueAgent: true,
          launchedByForkedSkill: ue,
        });
    } else if (M.type === "system" && M.subtype === "informational") {
      let q = convertToolProgressMessage(M);
      if (q !== undefined) D(q);
    } else if (M.type === "system" && M.subtype === "local_command" && typeof M.content === "string") {
      for (let q of parseForkedSkillLaunches(M.content)) {
        D(q.agentId);
        if (!isOrphanSummaryKey(q.agentId) && !k.has(q.agentId))
          k.set(q.agentId, {
            agentId: q.agentId,
            description: q.description,
            isWebFetchLaunch: false,
            canReadOutputFile: r,
            canContinueAgent: true,
            launchedByForkedSkill: true,
          });
      }
    } else if (
      M.type === "attachment" &&
      M.attachment.type === "task_status" &&
      M.attachment.taskType === "local_bash" &&
      M.attachment.status === "running" &&
      M.attachment.shell !== undefined &&
      !isOrphanSummaryKey(M.attachment.taskId)
    )
      E.set(M.attachment.taskId, {
        taskId: M.attachment.taskId,
        toolUseId: M.attachment.shell.toolUseId,
      });
    else if (
      M.type === "attachment" &&
      M.attachment.type === "task_status" &&
      M.attachment.taskType === "local_agent" &&
      M.attachment.status === "running"
    )
      w.add(M.attachment.taskId);
    else if (
      M.type === "attachment" &&
      M.attachment.type === "queued_command" &&
      typeof M.attachment.prompt === "string"
    ) {
      Ne(M, M.attachment.prompt, M.attachment.origin, {
        isOwn: isTaskNotificationOrigin(M.attachment.origin, M.attachment[restoredTaskMarkSymbol]),
        isRewritten: M.attachment.promptRewritten === true,
        runId:
          M.attachment.runId ??
          (M.attachment.origin?.kind === "task-notification" ? M.attachment.origin.runId : undefined),
      });
      if (isSessionTaskNotificationOrigin(M.attachment.origin)) Ie(M.attachment.prompt, M.uuid);
      Pe(
        M.attachment.prompt,
        M.attachment.commandMode === "task-notification"
          ? cronOwnership({
              isOwn: isTaskNotificationOrigin(M.attachment.origin, M.attachment[restoredTaskMarkSymbol]),
              isBare:
                (M.attachment.origin === undefined || isBareTaskNotificationOrigin(M.attachment.origin)) &&
                isOlderVersion(M, NEW_VERSION_THRESHOLD),
              isRewritten: M.attachment.promptRewritten === true,
            })
          : "none",
      );
    } else if (n) {
      pe = readCarriedCrons(M) ?? pe;
      for (let q of readEndedCronIds(M)) y.add(q);
    }
  }
  for (let M of pe) {
    let q = `carried:${M.id}`;
    s.push({
      toolUseId: q,
      input: {
        cron: M.cron,
        prompt: M.prompt,
      },
      createdAt: M.createdAt,
    });
    h.set(q, {
      id: M.id,
      recurring: M.recurring,
      durable: false,
      ...(M.plugin !== undefined && {
        plugin: M.plugin,
      }),
    });
  }
  return {
    calls: s,
    results: h,
    deletedCronIds: y,
    wakeupCalls: _,
    wakeupCallsAtLastLoopFire,
    asyncAgents: k,
    launchedAgentIds: w,
    launchedHereAgentIds: S,
    forkedSkillAgentIds: T,
    bgShells: E,
    workflows: N,
    notifiedTaskIds: G,
    ownNotifiedTaskIds: R,
    ownNoticeRowUuids: P,
    stoppedTaskIds: U,
    endedTaskIds: L,
    stoppedAt: oe,
  };
}
//@ chunk-0sfjpx19.js:59889-59984 placement
function timestampMsOrInfinity(e) {
  let timestamp = Date.parse(e.timestamp);
  return Number.isNaN(timestamp) ? Number.POSITIVE_INFINITY : timestamp;
}
//@ chunk-0sfjpx19.js:59984-60368 placement
function taskKindLabel(e, n) {
  let r = {
    summarizedKinds: new Set(),
    liveExclusions: new Set(),
  };
  if (!e.includes(TASK_NOTIFICATION_OPEN_TAG) || !e.includes(STATUS_OPEN_TAG)) return r;
  for (let s of e.matchAll(TASK_NOTIFICATION_KILLED_PATTERN)) {
    if (!s[1]) continue;
    let h = unescapeHtmlEntities(s[1]);
    if (h.startsWith(ORPHAN_SUMMARY_LIVE_PREFIX)) {
      r.liveExclusions.add(h.slice(ORPHAN_SUMMARY_LIVE_PREFIX.length));
      continue;
    }
    n.add(h);
    if (h.startsWith(ORPHAN_SUMMARY_AGGREGATE_PREFIX)) {
      let sliced = h.slice(ORPHAN_SUMMARY_AGGREGATE_PREFIX.length);
      if (sliced === "agent" || sliced === "shell" || sliced === "workflow") r.summarizedKinds.add(sliced);
    }
  }
  return r;
}
//@ chunk-0sfjpx19.js:60368-60486 placement
function messageContentToText(content) {
  if (typeof content === "string") return content;
  return content.map((n) => (isPlainObjectRecord(n) && typeof n.text === "string" ? n.text : "")).join(`
`);
}
//@ chunk-0sfjpx19.js:60486-60785 placement
async function getAgentTranscriptMtime(e, n, r) {
  let agentTranscriptPath = getAgentTranscriptPath(e);
  if (isStorageV5Enabled() && n !== undefined)
    try {
      let agentTranscriptStorageKey = getAgentTranscriptStorageKey(agentTranscriptPath, n);
      if (agentTranscriptStorageKey !== undefined) {
        let _ = await agentTranscriptStorageKey.backend.statMeta(agentTranscriptStorageKey.key);
        if (_.ok && _.value.size > 0) return _.value.mtimeMs;
      }
    } catch {}
  if (r) {
    let y = await lstat(agentTranscriptPath);
    return y.isFile() && y.size > 0 ? y.mtimeMs : null;
  }
  let h = await stat(agentTranscriptPath);
  return h.size > 0 ? h.mtimeMs : null;
}
//@ chunk-0sfjpx19.js:60785-64727 placement
/**
 * 恢复后台代理：无完成记录的标记为 orphaned_on_resume 或重启。
 */
async function resumeAsyncAgents({ asyncAgents, notifiedTaskIds }, r, s, h, y, _) {
  let taskIds = [];
  let extraIds = [];
  for (let P of asyncAgents.values()) {
    if (notifiedTaskIds.has(P.agentId)) continue;
    if (h?.has(P.agentId)) continue;
    if (r.get(P.agentId)) {
      extraIds.push(P.agentId);
      continue;
    }
    taskIds.push(P);
  }
  if (taskIds.length === 0) return;
  logFeatureSad("task_local_agent", "orphaned_on_resume");
  logForDebugging(`resume: ${taskIds.length} background agent(s) orphaned by previous process exit`);
  if (taskIds.length > MAX_LISTED_ORPHANS) {
    for (let P of taskIds)
      emitTaskNotification(P.agentId, "failed", {
        summary: ORPHAN_SUMMARY_NOTE,
        outputFile: nonWebFetchOutputFile(P),
      });
    enqueueOrphanedTasksNotification(
      "failed",
      "agent",
      "agent",
      taskIds,
      (P) => escapeXml(P.agentId),
      extraIds,
    );
    return;
  }
  let results = await Promise.all(
    taskIds.map(async (P) => {
      let U = P.redispatched ? null : normalizeAgentIdOrNull(P.agentId);
      if (U === null)
        return {
          mtimeMs: null,
          hasMeta: false,
          fetchable: false,
        };
      let L;
      try {
        L = await getAgentTranscriptMtime(U, y, false);
      } catch {
        L = null;
      }
      let hasMeta =
        s !== undefined &&
        (P.launchedByAgentTool === true || P.launchedByForkedSkill === true) &&
        L !== null &&
        (await readAgentMetadata(U, y).catch(makeSidecarReadFallback("resume orphan probe"))) !== null;
      return {
        mtimeMs: L,
        hasMeta,
        fetchable: L === null && canFetchAgentTranscriptsOnDemand(),
      };
    }),
  );
  let S = [];
  let T = {
    stopped: [],
    failed: [],
  };
  let now = Date.now();
  let E = taskIds;
  try {
    let P = _?.();
    if (P) E = taskIds.map((U) => withResumeCapabilities(U, P));
  } catch (error) {
    logError(
      Error("restoreBackgroundTasksFromMessages: resuming-session verdicts threw", {
        cause: error,
      }),
    );
  }
  for (let [P, U] of E.entries()) {
    let { mtimeMs, hasMeta, fetchable } = results[P] ?? {
      mtimeMs: null,
      hasMeta: false,
      fetchable: false,
    };
    if (
      s !== undefined &&
      (U.launchedByAgentTool === true || U.launchedByForkedSkill === true) &&
      hasMeta &&
      mtimeMs !== null &&
      now - mtimeMs < ORPHAN_TRANSCRIPT_MAX_AGE_MS
    ) {
      S.push({
        agentId: U.agentId,
        description: U.description,
        outputFile: U.outputFile,
        isWebFetchLaunch: U.isWebFetchLaunch,
        canReadOutputFile: U.canReadOutputFile,
        canContinueAgent: U.canContinueAgent,
      });
      continue;
    }
    let Q = mtimeMs !== null || fetchable;
    let ne = U.redispatched || Q ? "stopped" : "failed";
    let z = unfinishedNote(`Background agent "${escapeXml(U.description)}"`);
    let V = RELAUNCH_ADVICE(U);
    let j = U.redispatched
      ? `No completion record was found for it after it was ${U.canContinueAgent ? `re-dispatched via ${SENDMESSAGE}` : "sent a follow-up message"} in the previous session. It may have been stopped (via the UI, an SDK interrupt, or agent teardown \u2014 these leave no transcript marker), or it may have been running when the previous Claude Code process exited. ${U.canContinueAgent ? (U.isWebFetchLaunch ? `Send it another message with ${SENDMESSAGE} to resume it and get its report before assuming the fetch landed.` : U.canReadOutputFile ? `Send it another message with ${SENDMESSAGE} to resume it, or check its worktree/output for partial work before assuming the task landed.` : `Send it another message with ${SENDMESSAGE} to resume it and ask for a status report before assuming the task landed.`) : V}`
      : Q
        ? `No completion record was found for it in the previous session. It may have been stopped, or it may have been running when the previous Claude Code process exited${U.canContinueAgent ? " \u2014 either way its transcript is saved, so its progress is not lost" : ""}. ${U.canContinueAgent ? (U.isWebFetchLaunch ? `Resume it by sending it a message with ${SENDMESSAGE} to get its report.` : U.canReadOutputFile ? `Resume it by sending it a message with ${SENDMESSAGE}, or check its worktree/output for partial work before assuming the task landed.` : `Resume it by sending it a message with ${SENDMESSAGE} and ask for a status report before assuming the task landed.`) : V}`
        : `It was running when the previous Claude Code process exited and did not complete. Its in-process state was lost. ${V}`;
    if (U.redispatched) enqueueTaskNotification(U, ne, z, j);
    else
      T[ne].push({
        agent: U,
        summary: z,
        note: j,
      });
    emitTaskNotification(U.agentId, ne, {
      summary: unescapeHtmlEntities(z),
      outputFile: nonWebFetchOutputFile(U),
    });
  }
  let filtered = T.stopped.filter((P) => !P.agent.canContinueAgent);
  let any = filtered.some((P) => !P.agent.isWebFetchLaunch && P.agent.canReadOutputFile);
  let R = [
    {
      status: "stopped",
      members: T.stopped.filter((P) => P.agent.canContinueAgent),
    },
    {
      status: "stopped",
      members: any ? filtered.filter((P) => P.agent.isWebFetchLaunch || P.agent.canReadOutputFile) : filtered,
    },
    {
      status: "stopped",
      members: any ? filtered.filter((P) => !P.agent.isWebFetchLaunch && !P.agent.canReadOutputFile) : [],
    },
    {
      status: "failed",
      members: T.failed,
    },
  ];
  for (let { status, members } of R) {
    let L = members[0];
    if (members.length === 1 && L) enqueueTaskNotification(L.agent, status, L.summary, L.note);
    else if (members.length > 1)
      formatStoppedAgentsNotice(
        status,
        members.map((member) => member.agent),
      );
  }
  if (S.length > 0 && s !== undefined) {
    logForDebugging(
      `resume: handing ${S.length} disk-resumable orphaned agent(s) to the bg auto-resume path`,
    );
    s(S);
  }
}
//@ chunk-0sfjpx19.js:64727-65076 placement
function formatAgentRestartedNotice(e) {
  enqueueTaskNotification(
    e,
    undefined,
    `Background agent "${escapeXml(e.description)}" was restarted after the previous session ended`,
    "It had no completion record after the previous Claude Code process exited, and was automatically restarted from its saved transcript. It is running in the background again; its result will arrive as a separate task notification.",
  );
}
//@ chunk-0sfjpx19.js:65076-65175 placement
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
//@ chunk-0sfjpx19.js:65175-65391 placement
function withResumeCapabilities(e, n) {
  let r = e.canReadOutputFile && !e.isWebFetchLaunch;
  let s;
  switch (n.kind) {
    case "startupStandIn":
      s = r;
      break;
    case "runningPool":
      s = r && willToolsLoseSessionState(n.tools);
      break;
  }
  return {
    ...e,
    canContinueAgent: hasSendMessageTool(n.tools),
    canReadOutputFile: s,
  };
}
//@ chunk-0sfjpx19.js:65391-66568 placement
function formatOrphanedAgentNotification(e, taskRegistry, r) {
  let s = taskRegistry.get(e.agentId);
  let h = e.isWebFetchLaunch || (s?.type === "local_agent" && s.webFetchSavedFiles !== undefined);
  let y =
    !h && e.canReadOutputFile
      ? "Read its output file (and check its worktree, if any) for the result."
      : e.canContinueAgent
        ? `Send it a message with ${SENDMESSAGE} to get its report.`
        : h
          ? "Its report cannot be retrieved from this session. If it only fetched web pages, launch it again if the report is still needed; otherwise launching it again could repeat work it already did: do so only if that is safe."
          : "Its report cannot be retrieved from this session. Its last turn had ended, so its work may already be done and launching it again could repeat it: do so only if its result is still needed and repeating the work is safe; otherwise tell your user its report could not be retrieved from this session.";
  enqueueTaskNotification(
    h
      ? {
          ...e,
          isWebFetchLaunch: true,
        }
      : e,
    "completed",
    `Background agent "${escapeXml(e.description)}" finished before the previous session ended, but its result was never reported`,
    `It had already completed before the previous Claude Code process exited \u2014 only its completion notification was lost, so it was not restarted and no further task notification will arrive. ${y}`,
    r,
  );
}
//@ chunk-0sfjpx19.js:66568-67210 placement
function formatAgentRestartFailedNotice(e, n, r) {
  enqueueTaskNotification(
    e,
    "stopped",
    `Background agent "${escapeXml(e.description)}" from the previous session couldn't be restarted: ${escapeXml(n)}`,
    e.canContinueAgent
      ? `It could not be automatically restarted. Its transcript may still be resumable by sending it a message with ${SENDMESSAGE}${e.isWebFetchLaunch ? ", which is the only way to get its report." : e.canReadOutputFile ? "; check its worktree/output for partial work before assuming the task landed." : " and asking for a status report before assuming the task landed."}`
      : e.canReadOutputFile && !e.isWebFetchLaunch
        ? `It could not be automatically restarted. ${RELAUNCH_ADVICE(e)}`
        : "It could not be automatically restarted.",
    r,
  );
}
//@ chunk-0sfjpx19.js:67210-67494 placement
function enqueueTaskNotification(e, status, summary, s, h) {
  let y = e.canReadOutputFile ? nonWebFetchOutputFile(e) : undefined;
  let _ = "";
  enqueuePendingNotification({
    value: formatTaskNotification({
      taskId: escapeXml(e.agentId),
      outputFile: y ? escapeXml(y) : undefined,
      status,
      summary,
      body: `
<${NOTE}>${s}</${NOTE}>`,
    }),
    agentId: mainAgentId(),
    mode: "task-notification",
    skipAttachments: true,
    priority: "next",
    ...(h === undefined && {
      shouldQuery: false,
    }),
  });
}
//@ chunk-0sfjpx19.js:67494-69465 placement
function formatStoppedAgentsNotice(status, n) {
  let joined = n.map((D) => `<${TASK_ID}>${escapeXml(D.agentId)}</${TASK_ID}>`).join(`
`);
  let joined_2 = n.map((D) => `"${escapeXml(D.description)}" (${escapeXml(D.agentId)})`).join(", ");
  let mapped = n.filter((D) => D.isWebFetchLaunch).map((D) => escapeXml(D.agentId));
  let y = mapped.length === n.length;
  let all = n.every((D) => D.isWebFetchLaunch || !D.canReadOutputFile);
  let all_2 = n.every((D) => D.canContinueAgent);
  let k =
    mapped.length === 0 || y
      ? ""
      : status === "stopped" && all_2
        ? ` ${mapped.length === 1 ? "Agent" : "Agents"} ${mapped.join(", ")} fetched web content and ${mapped.length === 1 ? "has" : "have"} no worktree or output to check \u2014 resume ${mapped.length === 1 ? "it" : "them"} with ${SENDMESSAGE} only.`
        : ` ${mapped.length === 1 ? "Agent" : "Agents"} ${mapped.join(", ")} fetched web content and ${mapped.length === 1 ? "has" : "have"} nothing to check \u2014 launch ${mapped.length === 1 ? "it" : "them"} again if still needed.`;
  let w = y
    ? "Launch them again if their reports are still needed."
    : all
      ? "Do not assume the tasks landed; launch them again if their results are still needed."
      : "Check each agent's worktree/output for partial work before assuming the tasks landed.";
  let S =
    status === "stopped"
      ? `No completion record was found for them in the previous session. They may have been stopped, or they may have been running when the previous Claude Code process exited${all_2 ? " \u2014 either way their transcripts are saved, so their progress is not lost" : ""}. ${all_2 ? (y ? `Resume any of them by sending a message to its id with ${SENDMESSAGE} to get its report.` : all ? `Resume any of them by sending a message to its id with ${SENDMESSAGE} and ask for a status report before assuming the task landed.` : `Resume any of them by sending a message to its id with ${SENDMESSAGE}, or check its worktree/output for partial work before assuming the task landed.`) : w}`
      : `They were running when the previous Claude Code process exited and did not complete. Their in-process state was lost. ${w}`;
  let T = "";
  enqueuePendingNotification({
    value: `<${TASK_NOTIFICATION}>
${joined}
<${STATUS}>${status}</${STATUS}>
<${SUMMARY}>${unfinishedNote(`${n.length} background agents`)}: ${joined_2}.${k}</${SUMMARY}>
<${NOTE}>${S}</${NOTE}>
</${TASK_NOTIFICATION}>`,
    agentId: mainAgentId(),
    mode: "task-notification",
    skipAttachments: true,
    priority: "next",
    shouldQuery: false,
  });
}
//@ chunk-0sfjpx19.js:69465-70634 placement
function resumeLocalShellTasks({ bgShells, notifiedTaskIds, stoppedTaskIds }, s) {
  let taskIds = [];
  let extraIds = [];
  for (let _ of bgShells.values()) {
    if (notifiedTaskIds.has(_.taskId) || stoppedTaskIds.has(_.taskId)) continue;
    if (s.get(_.taskId)) {
      extraIds.push(_.taskId);
      continue;
    }
    taskIds.push(_);
  }
  if (taskIds.length === 0) return;
  logFeatureSad("task_local_shell", "orphaned_on_resume");
  logForDebugging(`resume: ${taskIds.length} background shell command(s) orphaned by previous process exit`);
  if (taskIds.length > 1) {
    for (let _ of taskIds)
      emitTaskNotification(_.taskId, "stopped", {
        toolUseId: _.toolUseId,
        summary: ORPHAN_SUMMARY_NOTE,
      });
    enqueueOrphanedTasksNotification(
      "stopped",
      "shell",
      "shell command",
      taskIds,
      (_) => escapeXml(_.taskId),
      extraIds,
    );
    return;
  }
  for (let _ of taskIds) {
    let summary = unfinishedNote("Background shell command");
    let k = `No completion record was found for it in the previous session. It may have been stopped (via the UI, Monitor timeout, or agent teardown \u2014 these leave no transcript marker), or it may have been running when the previous Claude Code process exited.${isDiskless() ? "" : " Check the output file for partial results before assuming it completed."}`;
    enqueuePendingNotification({
      value: formatTaskNotification({
        taskId: escapeXml(_.taskId),
        toolUseId: escapeXml(_.toolUseId),
        status: "stopped",
        summary,
        body: `
<${NOTE}>${k}</${NOTE}>`,
      }),
      agentId: mainAgentId(),
      mode: "task-notification",
      skipAttachments: true,
      priority: "next",
      shouldQuery: false,
    });
    emitTaskNotification(_.taskId, "stopped", {
      toolUseId: _.toolUseId,
      summary,
    });
  }
}
//@ chunk-0sfjpx19.js:70634-71972 placement
function resumeLocalWorkflows({ workflows, notifiedTaskIds, stoppedTaskIds }, s, h) {
  let taskIds = [];
  let extraIds = [];
  for (let b of workflows.values()) {
    if (notifiedTaskIds.has(b.taskId) || stoppedTaskIds.has(b.taskId) || h?.has(b.taskId)) continue;
    if (s.get(b.taskId)) {
      extraIds.push(b.taskId);
      continue;
    }
    taskIds.push(b);
  }
  if (taskIds.length === 0) return;
  logFeatureSad("task_local_workflow", "orphaned_on_resume");
  logForDebugging(`resume: ${taskIds.length} background workflow(s) orphaned by previous process exit`);
  if (taskIds.length > MAX_LISTED_ORPHANS) {
    for (let b of taskIds)
      emitTaskNotification(b.taskId, "stopped", {
        toolUseId: b.toolUseId,
        summary: ORPHAN_SUMMARY_NOTE,
      });
    enqueueOrphanedTasksNotification(
      "stopped",
      "workflow",
      "workflow",
      taskIds,
      (b) => escapeXml(b.taskId),
      extraIds,
    );
    return;
  }
  for (let b of taskIds) {
    let k = b.workflowName ? ` "${noticeDescriptionOf(b.workflowName)}"` : "";
    let w =
      b.runId !== undefined && WORKFLOW_RUN_ID_PATTERN.test(b.runId)
        ? noticeFieldOf(b.runId, WORKFLOW_RUN_ID_MAX_CHARS)
        : undefined;
    let S = w ? ` (run ${w})` : "";
    let T = !w
      ? ""
      : " To pick up where it left off, relaunch with Workflow({scriptPath, resumeFromRunId}) using the run id from the summary \u2014 completed agent() calls return cached.";
    let D = "";
    let E = unfinishedNote(`Background workflow${k}${S}`);
    let N = `No completion record was found for it in the previous session. It may have been ${STOPPED_OR_PAUSED_NOTE}, or it may have been running when the previous Claude Code process exited.${T}`;
    enqueuePendingNotification({
      value: formatTaskNotification({
        taskId: escapeXml(b.taskId),
        toolUseId: escapeXml(b.toolUseId),
        status: "stopped",
        summary: E,
        body: `
<${NOTE}>${escapeXml(N)}</${NOTE}>`,
      }),
      agentId: mainAgentId(),
      mode: "task-notification",
      skipAttachments: true,
      priority: "next",
      shouldQuery: false,
    });
    emitTaskNotification(b.taskId, "stopped", {
      toolUseId: b.toolUseId,
      summary: unescapeHtmlEntities(E),
    });
  }
}
export {
  hasQueuedCommandMentioning,
  MAX_LISTED_ORPHANS,
  ORPHAN_SUMMARY_AGGREGATE_PREFIX,
  ORPHAN_SUMMARY_LIVE_PREFIX,
  STOPPED_OR_PAUSED_NOTE,
  unfinishedNote,
  ORPHAN_SUMMARY_KEY,
  planResumeOfBackgroundTasks,
  formatOrphanSummary,
  formatAgentRestartFailedNotice,
  formatOrphanedAgentNotification,
  formatAgentRestartedNotice,
  withResumeCapabilities,
  startupStandInPlan,
};
