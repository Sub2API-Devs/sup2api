/**
 * cli/print/taskListRestore.ts
 *
 * 2.1.316 新增：任务列表的启动恢复、交接与从记录重建，团队领导轮询
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-tyg7f3ek.js (25)
 * attribution: placement 25
 */
import { randomUUID } from "crypto";
import { AsyncLocalStorage } from "async_hooks";
import { join } from "path";
import { parseTaskNumber, taskToolCallsInTranscript, MAX_TASK_NUMBER } from "./turnStartChecks.js";
import { trackTaskToolUse, resolvePendingTaskCreate } from "../../utils/task/framework.js";
import {
  mergeTaskMetadata,
  isCanonicalTaskId,
  getTaskListId,
  writeTaskUnderId,
  getTask,
  deleteTask,
  updateTask,
  blockTask,
  raiseTaskIdMark,
  findHighestTaskId,
  restoreTaskList,
  unassignTeammateTasks,
} from "../../utils/tasks.js";
import { logForDebugging } from "../../utils/debug.js";
import { isCompactBoundaryMessage } from "../../services/projects/threadRows.js";
import { DoctorLazy } from "../handlers/util.js";
import { u, array, string, record, unknown, E } from "../../../vendor/zod/v4/classic/schemas.js";
import { TaskStatusSchema } from "../../tools/TaskListTool/TaskListTool.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { logError } from "../../utils/log.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { isTeamLead, hasActiveInProcessTeammates, hasNonLeadTeammate } from "../../utils/teammate.js";
import {
  readUnreadMessages,
  MARK_READ_FAILURE_CAP,
  getInboxPath,
  markMessagesAsRead,
  isShutdownApproved,
  isHeadlessLeadDisplayableMessage,
  isStructuredProtocolMessage,
  formatTeammateMessages,
} from "../../utils/teammateMailbox.js";
import { dedupeMailboxMessages } from "../../utils/swarm/teammateMessageRepair.js";
import { sleep } from "../../utils/sleep.js";
import { removeTeammateFromTeamFile } from "../../utils/swarm/teamHelpers.js";
import { filterMailboxThroughReceiveHooks } from "../../utils/swarm/teammateMailbox.js";
import { clearOwedIdleNotificationsOnShutdown } from "../../utils/inProcessTeammateHelpers.js";
import { mainAgentId, getSessionId } from "../../bootstrap/state.js";
import { sessionTempDirRealpath } from "../../utils/tempDirRealpaths.js";
import { getActiveMessageQueue } from "../../query/presenceCheck.js";
import { errorMessage } from "../../utils/errors.js";
import { ensurePlacedByNameRead } from "../../utils/filePersistence/placedByName.js";
import { hasConflictingPlacedFile } from "../../utils/filePersistence/taskFileLookup.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";

//@ chunk-tyg7f3ek.js:216137-216339 placement
function rebuildTaskListWithRestartFallback(e) {
  let n = compactedTaskListIds(e);
  let r = rebuildTaskListFromTranscript(e, n);
  if (r.carriedList !== "dropped_on_restart") return r;
  let s = rebuildTaskListFromTranscript(e, {
    fate: "none",
  });
  return {
    ...s,
    highestId: Math.max(s.highestId, r.highestId),
    carriedList: "dropped_on_restart",
  };
}
//@ chunk-tyg7f3ek.js:216339-219195 placement
/**
 * 从转录重建任务列表：处理 create/update、压缩标记里的任务快照与 blocks/blockedBy 关系。
 */
function rebuildTaskListFromTranscript(e, n) {
  let r = {
    pendingCreates: new Map(),
    tasks: new Map(),
  };
  let s = new Map();
  let h = new HighestResponseTracker();
  let y;
  let S = [];
  let R = new Map();
  let w = (Z, re) => {
    let blocks = R.get(Z)?.blocks;
    let blockedBy = R.get(re)?.blockedBy;
    if (r.tasks.has(Z) && r.tasks.has(re) && blocks && blockedBy) {
      if (!blocks.includes(re)) blocks.push(re);
      if (!blockedBy.includes(Z)) blockedBy.push(Z);
    }
  };
  let P = 0;
  let L = (Z) => {
    P = Math.max(P, parseTaskNumber(Z) ?? 0);
  };
  if (n.fate === "used" || n.fate === "highest_id_only") P = n.highestId;
  let highestId = n.fate === "used" ? n.highestId : 0;
  if (n.fate === "used")
    for (let task of n.tasks) {
      r.tasks.set(task.id, {
        content: task.subject,
        activeForm: task.activeForm ?? task.subject,
        status: task.status,
      });
      s.set(task.id, TASK_CARRIED_BY_MARKER);
      R.set(task.id, {
        description: task.description ?? "",
        owner: task.owner,
        metadata: task.metadata,
        blocks: [...(task.blocks ?? [])],
        blockedBy: [...(task.blockedBy ?? [])],
      });
    }
  for (let Z of taskToolCallsInTranscript(e, n.fate === "used" ? n.isOlderRow : undefined)) {
    L(Z.taskId);
    if (Z.answeredEarlier) continue;
    if (Z.kind === "update") {
      trackTaskToolUse(r, Z.use);
      if (!s.has(Z.taskId)) {
        s.set(Z.taskId, undefined);
        S.push(Z.taskId);
      }
      let { description, owner, metadata } = Z.named;
      let ie = R.get(Z.taskId) ?? {
        description: "",
        blocks: [],
        blockedBy: [],
      };
      R.set(Z.taskId, {
        ...ie,
        ...(description !== undefined && {
          description,
        }),
        ...(owner !== undefined && {
          owner,
        }),
        ...(metadata !== undefined && {
          metadata: mergeTaskMetadata(ie.metadata, metadata),
        }),
      });
      for (let Se of Z.named.addBlocks ?? []) w(Z.taskId, Se);
      for (let Se of Z.named.addBlockedBy ?? []) w(Se, Z.taskId);
      continue;
    }
    let taskNumber = parseTaskNumber(Z.taskId);
    if (
      Z.askedEarlier &&
      s.get(Z.taskId) === TASK_CARRIED_BY_MARKER &&
      r.tasks.get(Z.taskId)?.content === Z.named.subject
    )
      continue;
    if (
      taskNumber !== undefined &&
      ((n.fate === "used" && taskNumber <= highestId) || taskNumber <= h.highestByOthersThan(Z.response))
    ) {
      if (n.fate === "used") {
        logForDebugging(
          `[Tasks] rebuild: a create after the compaction marker got id ${Z.taskId}, no higher than one already given out, so the id counter restarted; dropping the marker's list (highest id ${highestId})`,
        );
        return {
          tasks: [],
          highestId,
          olderTasks: 0,
          carriedTasks: 0,
          carriedList: "dropped_on_restart",
        };
      }
      for (let Ue of Z.response === y ? S : s.keys())
        if (s.get(Ue) !== Z.response) {
          s.delete(Ue);
          r.tasks.delete(Ue);
          R.delete(Ue);
        }
      h.keepOnly(Z.response);
      y = Z.response;
      S = [];
    }
    if (s.get(Z.taskId) === undefined) r.tasks.delete(Z.taskId);
    trackTaskToolUse(r, Z.use);
    resolvePendingTaskCreate(r, Z.result);
    s.set(Z.taskId, Z.response);
    S.push(Z.taskId);
    if (taskNumber !== undefined && Z.response !== TASK_CARRIED_BY_MARKER) h.add(Z.response, taskNumber);
    R.set(Z.taskId, {
      description: Z.named.description ?? "",
      metadata: Z.named.metadata,
      blocks: [],
      blockedBy: [],
    });
  }
  let x = [];
  for (let [Z, re] of r.tasks)
    if (s.get(Z) !== undefined && parseTaskNumber(Z) !== undefined) {
      let Ae = R.get(Z);
      x.push({
        id: Z,
        subject: re.content,
        description: Ae?.description ?? "",
        activeForm: re.activeForm,
        ...(Ae?.owner !== undefined && {
          owner: Ae.owner,
        }),
        status: re.status,
        blocks: Ae?.blocks ?? [],
        blockedBy: Ae?.blockedBy ?? [],
        ...(Ae?.metadata !== undefined && {
          metadata: Ae.metadata,
        }),
      });
    }
  let G = new Map(x.map((Z) => [Z.id, Z]));
  for (let Z of x) Z.blocks = Z.blocks.filter((block) => G.get(block)?.blockedBy.includes(Z.id));
  for (let Z of x) Z.blockedBy = Z.blockedBy.filter((re) => G.get(re)?.blocks.includes(Z.id));
  for (let key of r.tasks.keys()) L(key);
  return {
    tasks: x,
    highestId: P,
    olderTasks: r.tasks.size - x.length,
    carriedTasks: n.fate === "used" ? n.tasks.length : 0,
    carriedList: n.fate,
  };
}
//@ chunk-tyg7f3ek.js:219195-219226 placement
var TASK_CARRIED_BY_MARKER = "carried by the marker";
//@ chunk-tyg7f3ek.js:219226-219728 placement
class HighestResponseTracker {
  byResponse = new Map();
  leader;
  highest = -1 / 0;
  runnerUp = -1 / 0;
  add(e, n) {
    if (n <= (this.byResponse.get(e) ?? -1 / 0)) return;
    this.byResponse.set(e, n);
    if (n > this.highest) {
      if (this.leader !== e) this.runnerUp = this.highest;
      this.leader = e;
      this.highest = n;
    } else this.runnerUp = Math.max(this.runnerUp, n);
  }
  highestByOthersThan(e) {
    return e === this.leader ? this.runnerUp : this.highest;
  }
  keepOnly(e) {
    let n = this.byResponse.get(e);
    this.byResponse.clear();
    this.leader = undefined;
    this.highest = -1 / 0;
    this.runnerUp = -1 / 0;
    if (n !== undefined) this.add(e, n);
  }
}
//@ chunk-tyg7f3ek.js:219728-219799 placement
function lowercaseUuidOrEmpty(e) {
  return typeof e.uuid === "string" ? e.uuid.toLowerCase() : "";
}
//@ chunk-tyg7f3ek.js:219799-219970 placement
function compactPreservedUuids(e) {
  let n = compactTaskListSchemas().safeParse(e.compactMetadata?.preservedMessages);
  return n.success
    ? [...(n.data?.uuids ?? []), ...(n.data?.allUuids ?? [])].map((r) => r.toLowerCase())
    : undefined;
}
//@ chunk-tyg7f3ek.js:219970-220866 placement
function compactedTaskListIds(e) {
  let n = new Set();
  let r = true;
  let s = false;
  for (let q of e)
    if (isCompactBoundaryMessage(q)) {
      s ||= q.compactMetadata?.preCompactTaskList !== undefined;
      let x = compactPreservedUuids(q);
      r &&= x !== undefined;
      for (let G of x ?? []) n.add(G);
    }
  let lastIndex = e.findLastIndex((q) => isCompactBoundaryMessage(q) && !n.has(lowercaseUuidOrEmpty(q)));
  let y = e[lastIndex];
  if (y === undefined || !isCompactBoundaryMessage(y) || y.compactMetadata?.preCompactTaskList === undefined)
    return {
      fate: lastIndex === -1 && s ? "malformed" : "none",
    };
  let S = compactTaskListSchema().safeParse(y.compactMetadata.preCompactTaskList);
  let R = compactPreservedUuids(y);
  if (!S.success || R === undefined || !r) {
    logForDebugging(
      `[Tasks] rebuild: ${S.success ? "a compaction marker's list of kept rows" : "the compaction marker's task list"} is malformed; the marker's task list is ignored and the list is rebuilt from the task calls alone`,
    );
    return {
      fate: "malformed",
    };
  }
  let { tasks, highestId } = S.data;
  if (tasks === undefined)
    return {
      fate: "highest_id_only",
      highestId,
    };
  let L = new Set(R);
  return {
    fate: "used",
    tasks,
    highestId: tasks.reduce((acc, task) => Math.max(acc, Number(task.id)), highestId),
    isOlderRow: (q, x) => x < lastIndex || L.has(lowercaseUuidOrEmpty(q)),
  };
}
//@ chunk-tyg7f3ek.js:220866-221294 placement
/**
 * 压缩时携带的任务清单 schema：uuids（及可选 allUuids）与任务数组（id/标题/描述等）。
 */
var compactTaskListSchemas = DoctorLazy(() =>
  u({
    uuids: array(string()),
    allUuids: array(string()).optional(),
  }).optional(),
);
var compactTaskListSchema = DoctorLazy(() =>
  u({
    tasks: array(
      u({
        id: string().refine((id) => isCanonicalTaskId(id) && parseTaskNumber(id) !== undefined),
        subject: string(),
        description: string().optional(),
        activeForm: string().optional(),
        status: TaskStatusSchema(),
        owner: string().optional(),
        blocks: array(string()).optional(),
        blockedBy: array(string()).optional(),
        metadata: record(string(), unknown()).optional(),
      }),
    )
      .refine((e) => new Set(e.map((n) => n.id)).size === e.length)
      .optional(),
    highestId: E().int().min(0).max(MAX_TASK_NUMBER),
  }),
);
//@ chunk-tyg7f3ek.js:221294-221318 placement
var TASK_LIST_HANDOFF_STATE = new SessionRootSlot(() => ({}));
//@ chunk-tyg7f3ek.js:221318-223078 placement
async function applyTaskListHandoff(e, store) {
  let taskListId = getTaskListId();
  let s = {
    creates: 0,
    updates: 0,
    skipped: 0,
    missing: 0,
    conflicts: 0,
    failed: 0,
  };
  let mark = 0;
  let y = [...taskToolCallsInTranscript(e)];
  let S = new Map();
  for (let { kind, taskId, named } of y) {
    let q = kind === "create" ? (named.subject ?? "") : named.subject;
    if (q !== undefined) S.set(taskId, (S.get(taskId) ?? new Set()).add(q));
  }
  let R = new Set();
  for (let { kind, taskId, named } of y) {
    let taskNumber = parseTaskNumber(taskId);
    if (taskNumber === undefined) {
      s.skipped++;
      continue;
    }
    mark = Math.max(mark, taskNumber);
    if (kind === "update" && R.has(taskId)) {
      s.conflicts++;
      continue;
    }
    try {
      if (kind === "create") {
        let subject = named.subject ?? "";
        if (
          await writeTaskUnderId(
            taskListId,
            {
              id: taskId,
              subject,
              description: named.description ?? "",
              ...(named.activeForm !== undefined && {
                activeForm: named.activeForm,
              }),
              status: "pending",
              blocks: [],
              blockedBy: [],
              ...(named.metadata !== undefined && {
                metadata: named.metadata,
              }),
            },
            store,
          )
        )
          s.creates++;
        else {
          let task = await getTask(taskListId, taskId, store);
          let Se = task !== null && S.get(taskId)?.has(task.subject) === true;
          if (!Se) R.add(taskId);
          s[Se ? "skipped" : "conflicts"]++;
        }
        continue;
      }
      if (named.status === "deleted") {
        if (await deleteTask(taskListId, taskId, store)) s.updates++;
        else {
          let task = await getTask(taskListId, taskId, store);
          s[task === null ? "skipped" : "failed"]++;
        }
        continue;
      }
      let x = TaskStatusSchema().safeParse(named.status);
      let G = {
        ...(named.subject !== undefined && {
          subject: named.subject,
        }),
        ...(named.description !== undefined && {
          description: named.description,
        }),
        ...(named.activeForm !== undefined && {
          activeForm: named.activeForm,
        }),
        ...(x.success && {
          status: x.data,
        }),
        ...(named.owner !== undefined && {
          owner: named.owner,
        }),
        ...(named.metadata !== undefined && {
          metadata: mergeTaskMetadata((await getTask(taskListId, taskId, store))?.metadata, named.metadata),
        }),
      };
      let Z = (ce) => !R.has(ce);
      let filtered = (named.addBlocks ?? []).filter(Z);
      let filtered_2 = (named.addBlockedBy ?? []).filter(Z);
      if (Object.keys(G).length === 0 && filtered.length + filtered_2.length === 0) {
        s.skipped++;
        continue;
      }
      let Ue = await updateTask(taskListId, taskId, G, store);
      if (Ue === null)
        logForDebugging(`[Tasks] hand-off apply: task ${taskId} is not in the list; its update is skipped`);
      for (let ce of filtered) await blockTask(taskListId, taskId, ce, store);
      for (let ce of filtered_2) await blockTask(taskListId, ce, taskId, store);
      s[Ue === null ? "missing" : "updates"]++;
    } catch (error) {
      s.failed++;
      s.error ??= error;
    }
  }
  if (mark > 0)
    try {
      await raiseTaskIdMark(taskListId, mark, store);
    } catch (error) {
      s.failed++;
      s.error ??= error;
    }
  return s;
}
//@ chunk-tyg7f3ek.js:223078-223424 placement
async function applyTaskListHandoffIfHonoured(e, n, r) {
  try {
    if (TASK_LIST_HANDOFF_STATE.peek(e)?.honoured !== true) return;
    let { error, ...h } = await applyTaskListHandoff(n, r);
    if (h.failed + h.missing + h.conflicts > 0) {
      logFeatureSad("task_list_handoff_apply", "handoff_apply_partial", h);
      if (error !== undefined) logError(error);
    } else if (h.creates + h.updates + h.skipped > 0) logFeatureOk("task_list_handoff_apply", h);
  } catch (error) {
    logFeatureBad("task_list_handoff_apply", "handoff_apply_failed");
    logError(error);
  }
}
//@ chunk-tyg7f3ek.js:223424-223689 placement
function createTaskListCatchUp(session, messages, mutableMessages, storageV5) {
  if (TASK_LIST_HANDOFF_STATE.peek(session)?.honoured !== true)
    return {
      beforeRun: async () => {},
      catchUp: async () => {},
    };
  let h = new Set(mutableMessages.map((w) => w.uuid));
  let any = messages.some((w) => !h.has(w.uuid));
  let S = false;
  let R = async () => {
    S = true;
    await applyTaskListHandoffIfHonoured(session, messages, storageV5);
  };
  return {
    beforeRun: R,
    catchUp: async (w) => {
      if (!S && any && w) await R();
    },
  };
}
//@ chunk-tyg7f3ek.js:223689-223794 placement
var taskListRestoreSchema = DoctorLazy(() => {
  let e = E().int().min(0).max(MAX_TASK_NUMBER).optional().catch(undefined);
  return u({
    count: e,
    highest_id: e,
  });
});
//@ chunk-tyg7f3ek.js:223794-223972 placement
function readTaskListRestoreHint(e) {
  if (e === null || e.readFailed === true) return;
  let n = taskListRestoreSchema().safeParse(e.external?.task_list_restore);
  return n.success
    ? {
        count: n.data.count,
        highestId: n.data.highest_id,
      }
    : undefined;
}
//@ chunk-tyg7f3ek.js:223972-225451 placement
/**
 * 会话启动时从转录恢复任务列表（带压缩前快照与延续任务）。
 */
async function restoreTaskListAtBoot(e, messages, restoredWorkerState, store) {
  let taskListRestoreHint = readTaskListRestoreHint(await restoredWorkerState);
  if (taskListRestoreHint === undefined) return;
  let y = TASK_LIST_HANDOFF_STATE.of(e);
  y.request = taskListRestoreHint;
  let startTime = performance.now();
  try {
    let { tasks, highestId, olderTasks, carriedTasks, carriedList } =
      rebuildTaskListWithRestartFallback(messages);
    let max = Math.max(taskListRestoreHint.highestId ?? 0, taskListRestoreHint.count ?? 0);
    if (highestId === 0 && max === 0) {
      y.honoured = true;
      return;
    }
    let taskListId = getTaskListId();
    let Z = (writtenCount) => ({
      task_count: tasks.length,
      written_count: writtenCount,
      older_task_count: olderTasks,
      carried_task_count: carriedTasks,
      carried_list: fromEnum(carriedList),
      transcript_highest_id: highestId,
      duration_ms: Math.round(performance.now() - startTime),
      ...(taskListRestoreHint.count !== undefined && {
        requested_count: taskListRestoreHint.count,
      }),
      ...(taskListRestoreHint.highestId !== undefined && {
        requested_highest_id: taskListRestoreHint.highestId,
      }),
    });
    if ((await findHighestTaskId(taskListId, store)) > 0) {
      await raiseTaskIdMark(taskListId, Math.max(highestId, max), store);
      y.honoured = true;
      logFeatureSad("task_list_restore", "list_not_empty", Z(0));
      return;
    }
    let re =
      highestId === 0
        ? "transcript_shows_no_task"
        : highestId < max
          ? "transcript_behind_request"
          : olderTasks > 0
            ? "older_tasks_not_in_transcript"
            : undefined;
    let any = messages.some(isCompactBoundaryMessage);
    if (re !== undefined && !any) {
      logFeatureBad("task_list_restore", re, Z(0));
      return;
    }
    let { restored, written, refused, left } = await restoreTaskList(
      taskListId,
      tasks,
      Math.max(highestId, max),
      store,
      {
        wholeOrNothing: true,
      },
    );
    if (refused !== undefined) {
      logFeatureBad(
        "task_list_restore",
        left === undefined ? "task_write_refused" : "task_write_refused_left",
        {
          ...Z(written),
          refused_count: refused,
          ...(left !== undefined && {
            left_count: left,
          }),
        },
      );
      return;
    }
    if (!restored) {
      await raiseTaskIdMark(taskListId, Math.max(highestId, max), store);
      logFeatureSad("task_list_restore", "list_not_empty", Z(0));
    } else if (re !== undefined) logFeatureSad("task_list_restore", re, Z(written));
    else logFeatureOk("task_list_restore", Z(written));
    y.honoured = true;
    logForDebugging(
      `[Tasks] boot restore: ${restored ? "restored" : "left alone"}, ${written} of ${tasks.length} task(s) in the transcript written`,
    );
  } catch (error) {
    logFeatureBad("task_list_restore", "restore_failed");
    logError(error);
  }
}
//@ chunk-tyg7f3ek.js:225488-229008 placement
/**
 * print 模式下 team-lead 轮询队友邮箱：读未读消息、入队、所有队友结束后停止并收尾。
 */
class TeamLeadPoller {
  drain;
  messageQueue;
  store;
  storageV5;
  kick;
  enqueueTeamShutdownPrompt;
  polling = false;
  consecutiveMarkFailures = 0;
  markFailureStreakReported = false;
  finalLeadDrainDone = false;
  constructor({ drain, messageQueue, store, storageV5, kick, enqueueTeamShutdownPrompt }) {
    this.drain = drain;
    this.messageQueue = messageQueue;
    this.store = store;
    this.storageV5 = storageV5;
    this.kick = kick;
    this.enqueueTeamShutdownPrompt = enqueueTeamShutdownPrompt;
  }
  pollActive() {
    return this.polling;
  }
  *poll({ pulseKeepAlive, pulseInboxFrameActivity }) {
    let teamContext = this.store.getState().teamContext;
    if (!(teamContext && isTeamLead(teamContext))) {
      this.consecutiveMarkFailures = 0;
      this.markFailureStreakReported = false;
      this.finalLeadDrainDone = false;
      return "done";
    }
    let agentName = "team-lead";
    let y = 500;
    this.polling = true;
    try {
      while (true) {
        if (this.drain.inputClosed && this.drain.batchLeftUnstarted) return "done";
        let state = this.store.getState();
        let R = hasActiveInProcessTeammates(state) || hasNonLeadTeammate(state.teamContext);
        let w = yield readUnreadMessages(agentName, state.teamContext?.teamName, this.storageV5);
        let P = Array.isArray(w) ? w : [];
        if (!R) {
          if (
            P.length > 0 &&
            this.consecutiveMarkFailures < MARK_READ_FAILURE_CAP &&
            !this.finalLeadDrainDone
          )
            this.finalLeadDrainDone = true;
          else {
            logForDebugging("[print.ts] No more active teammates, stopping poll");
            if (P.length === 0) {
              this.consecutiveMarkFailures = 0;
              this.markFailureStreakReported = false;
              this.finalLeadDrainDone = false;
            }
            break;
          }
        } else this.finalLeadDrainDone = false;
        if (P.length > 0) {
          logForDebugging(`[print.ts] Team-lead found ${P.length} unread messages`);
          let L = dedupeMailboxMessages(P, getInboxPath(agentName, state.teamContext?.teamName), {
            roster: state.teamContext?.teammates,
            isPaneTeammate: false,
          });
          let q = (ce) => L.get(ce) === "forged";
          let x =
            (yield markMessagesAsRead(agentName, state.teamContext?.teamName, P, this.storageV5)) === true;
          if (x) {
            this.consecutiveMarkFailures = 0;
            this.markFailureStreakReported = false;
          } else {
            this.consecutiveMarkFailures++;
            if (R && this.consecutiveMarkFailures < MARK_READ_FAILURE_CAP) {
              logForDebugging(
                `[print.ts] Could not mark ${P.length} inbox message(s) read (${this.consecutiveMarkFailures}/${MARK_READ_FAILURE_CAP}); retrying next poll`,
                {
                  level: "warn",
                },
              );
              pulseKeepAlive();
              yield sleep(y);
              continue;
            }
            logForDebugging(
              `[print.ts] Could not mark ${P.length} inbox message(s) read for ${this.consecutiveMarkFailures} polls; processing the batch unmarked`,
              {
                level: "warn",
              },
            );
            if (!this.markFailureStreakReported) {
              this.markFailureStreakReported = true;
              logFeatureSad("swarm_inbox_poll", "mark_read_failed_streak");
            }
          }
          let teamName = state.teamContext?.teamName;
          for (let ce of P) {
            let nt = q(ce) ? null : isShutdownApproved(ce.text);
            let ie = nt?.from === ce.from;
            if (nt && ie && teamName) {
              let from = nt.from;
              logForDebugging(`[print.ts] Processing shutdown_approved from ${from}`);
              let teammateId = state.teamContext?.teammates
                ? Object.entries(state.teamContext.teammates).find(([, value]) => value.name === from)?.[0]
                : undefined;
              if (teammateId) {
                yield removeTeammateFromTeamFile(
                  teamName,
                  {
                    agentId: teammateId,
                    name: from,
                  },
                  this.storageV5,
                );
                logForDebugging(`[print.ts] Removed ${from} from team file`);
                yield unassignTeammateTasks(teamName, teammateId, from, "shutdown", this.storageV5);
                this.store.setState((Me) => {
                  if (!Me.teamContext?.teammates) return Me;
                  if (!(teammateId in Me.teamContext.teammates)) return Me;
                  let { [teammateId]: Ee, ...He } = Me.teamContext.teammates;
                  return {
                    ...Me,
                    teamContext: {
                      ...Me.teamContext,
                      teammates: He,
                    },
                  };
                });
              }
            }
          }
          let filtered = P.filter((ce) => q(ce) || isHeadlessLeadDisplayableMessage(ce.text));
          let re =
            filtered.length === 0 || this.drain.endSessionRequested
              ? []
              : yield filterMailboxThroughReceiveHooks(filtered, {
                  provenanceOf: (ce) => L.get(ce) ?? "unverifiable",
                  agentId: undefined,
                  isPassedThrough: (ce) => !q(ce) && isStructuredProtocolMessage(ce.text),
                });
          let Ae = Array.isArray(re) ? re : [];
          clearOwedIdleNotificationsOnShutdown(
            P.filter((ce) => !q(ce)),
            this.store.setState,
          );
          if (Ae.length === 0 || this.drain.endSessionRequested) {
            pulseInboxFrameActivity();
            if (!x) {
              pulseKeepAlive();
              yield sleep(y);
            }
            continue;
          }
          let value = formatTeammateMessages(Ae, {
            recipientIsLead: true,
          });
          this.messageQueue.enqueue({
            mode: "prompt",
            agentId: mainAgentId(),
            value,
            uuid: randomUUID(),
            skipAttachments: true,
            foreignWord: "teammate-reply",
          });
          this.kick();
          return "rekicked";
        }
        this.consecutiveMarkFailures = 0;
        this.markFailureStreakReported = false;
        if (this.drain.inputClosed && this.enqueueTeamShutdownPrompt()) {
          logForDebugging("[print.ts] Input closed with active teammates, injected shutdown prompt");
          return "rekicked";
        }
        pulseKeepAlive();
        yield sleep(y);
      }
    } finally {
      this.polling = false;
    }
    return "done";
  }
}
//@ chunk-tyg7f3ek.js:229086-229166 placement
/**
 * 空实现的快照存储（snapshot 原样返回、restore 返回空对象）。
 */
class NoopSnapshotStore {
  async snapshot(e, n) {
    return n;
  }
  async restore(e) {
    return {};
  }
  async flush() {}
}
//@ chunk-tyg7f3ek.js:229166-229190 placement
var snapshotStoreStorage = new AsyncLocalStorage();
var NOOP_SNAPSHOT_STORE = new NoopSnapshotStore();
//@ chunk-tyg7f3ek.js:229190-229229 placement = getAgentContext (1)
function getSnapshotStore() {
  return snapshotStoreStorage.getStore() ?? NOOP_SNAPSHOT_STORE;
}
//@ chunk-tyg7f3ek.js:229229-229263 placement
function snapshotPathForSession() {
  return join(sessionTempDirRealpath(), getSessionId());
}
//@ chunk-tyg7f3ek.js:229263-229886 placement
class WorkerDirSyncReporter {
  workerDirSync;
  enqueueSdkEvent;
  turnEndUploadListener;
  constructor({ workerDirSync, enqueueSdkEvent, turnEndUploadListener }) {
    this.workerDirSync = workerDirSync;
    this.enqueueSdkEvent = enqueueSdkEvent;
    this.turnEndUploadListener = turnEndUploadListener;
  }
  beforeTurn() {
    import("./chunk-2s3tfbmy.js").then((n) => n.flushSyncedFiles()).catch(() => {});
    return;
  }
  afterTurn({ turnStartTime, signal, userEventUuids }) {
    import("./chunk-2s3tfbmy.js").then((y) => y.flushSyncedFiles()).catch(() => {});
    let turnEndUploadListener = this.turnEndUploadListener;
    let h = this.workerDirSync?.then((y) => {
      y?.afterTurn({
        userEventUuids: [...userEventUuids],
      });
      return turnEndUploadListener === undefined ? undefined : y?.drain();
    });
    if (h !== undefined) turnEndUploadListener?.(h);
    getSnapshotStore().snapshot(snapshotPathForSession(), {}).catch(logError);
  }
}
//@ chunk-tyg7f3ek.js:229886-230095 placement
function notifyTurnBeganBeforeInit({ sessionState, markStartupPhase }) {
  if (getActiveMessageQueue() !== undefined) return;
  try {
    sessionState.notifyTurnBeganBeforeInit();
  } catch (error) {
    logForDebugging(`turn_began_before_init tee failed: ${errorMessage(error)}`, {
      level: "warn",
    });
  }
  markStartupPhase?.("turn_began_before_init");
}
//@ chunk-tyg7f3ek.js:230095-230291 placement
async function placeFilesByNameForTurn(e, n) {
  if (e.fileNames === undefined) return;
  try {
    let { placeFilesByName } = await import("./chunk-55nezfmq.js");
    await placeFilesByName(e, n);
  } catch (error) {
    logFeatureBad("ccr_turn_handoff_files_by_name", "load_failed");
    logError(error);
  }
}
//@ chunk-tyg7f3ek.js:230291-230503 placement
async function refreshFilesPlacedByName(e) {
  try {
    await ensurePlacedByNameRead();
    if (!hasConflictingPlacedFile(e)) return;
    let { refreshFilesPlacedByName } = await import("./chunk-648dqenp.js");
    await refreshFilesPlacedByName(e);
  } catch (error) {
    logForDiagnosticsNoPII("warn", "turn_handoff_files_by_name_refresh", {
      load_failed: 1,
    });
    logError(error);
  }
}
//@ chunk-tyg7f3ek.js:230503-230577 placement
var UNPLANNABLE_REASONS = {
  peer: 1,
  file_kinds: 2,
  prompt_hook: 3,
  unplannable: 4,
  text_not_typed: 5,
};
export {
  restoreTaskListAtBoot,
  notifyTurnBeganBeforeInit,
  placeFilesByNameForTurn,
  WorkerDirSyncReporter,
  TeamLeadPoller,
  getSnapshotStore,
  snapshotPathForSession,
  createTaskListCatchUp,
  TASK_LIST_HANDOFF_STATE,
  UNPLANNABLE_REASONS,
  refreshFilesPlacedByName,
};
