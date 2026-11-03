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
import {
  randomUUID,
  randomUUID as randomUUID_2,
  randomUUID as randomUUID_3,
  randomUUID as randomUUID_4,
  randomUUID as randomUUID_5,
  randomUUID as randomUUID_6,
  randomUUID as randomUUID_7,
  randomUUID as randomUUID_8,
  randomUUID as randomUUID_9,
  randomUUID as randomUUID_10,
  randomUUID as randomUUID_11,
  randomUUID as randomUUID_12,
  randomUUID as randomUUID_13,
  randomUUID as randomUUID_14,
  randomUUID as randomUUID_15,
  randomUUID as randomUUID_16,
  randomUUID as randomUUID_17,
  randomUUID as randomUUID_18,
  randomUUID as randomUUID_19,
  randomUUID as randomUUID_20,
  randomUUID as randomUUID_21,
} from "crypto";
import { AsyncLocalStorage } from "async_hooks";
import {
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
} from "path";
import { parseTaskNumber, taskToolCallsInTranscript, qu } from "./turnStartChecks.js";
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
import { u, A, o, pe, oe, E } from "../../../vendor/zod/v4/classic/schemas.js";
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
import { Sx } from "../../utils/tempDirRealpaths.js";
import { getActiveMessageQueue } from "../../query/presenceCheck.js";
import { errorMessage } from "../../utils/errors.js";
import { ensurePlacedByNameRead } from "../../utils/filePersistence/placedByName.js";
import { hasConflictingPlacedFile } from "../../utils/filePersistence/taskFileLookup.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";

//@ chunk-tyg7f3ek.js:216137-216339 placement
function rebuildTaskListWithRestartFallback(e) {
  let n = compactedTaskListIds(e),
    r = rebuildTaskListFromTranscript(e, n);
  if (r.carriedList !== "dropped_on_restart") return r;
  let s = rebuildTaskListFromTranscript(e, { fate: "none" });
  return { ...s, highestId: Math.max(s.highestId, r.highestId), carriedList: "dropped_on_restart" };
}
/**
 * 从转录重建任务列表：处理 create/update、压缩标记里的任务快照与 blocks/blockedBy 关系。
 */
//@ chunk-tyg7f3ek.js:216339-219195 placement
function rebuildTaskListFromTranscript(e, n) {
  let r = { pendingCreates: new Map(), tasks: new Map() },
    s = new Map(),
    h = new HighestResponseTracker(),
    y,
    S = [],
    R = new Map(),
    w = (Z, re) => {
      let Ae = R.get(Z)?.blocks,
        Ue = R.get(re)?.blockedBy;
      if (r.tasks.has(Z) && r.tasks.has(re) && Ae && Ue) {
        if (!Ae.includes(re)) Ae.push(re);
        if (!Ue.includes(Z)) Ue.push(Z);
      }
    },
    P = 0,
    L = (Z) => {
      P = Math.max(P, parseTaskNumber(Z) ?? 0);
    };
  if (n.fate === "used" || n.fate === "highest_id_only") P = n.highestId;
  let q = n.fate === "used" ? n.highestId : 0;
  if (n.fate === "used")
    for (let task of n.tasks)
      (r.tasks.set(task.id, {
        content: task.subject,
        activeForm: task.activeForm ?? task.subject,
        status: task.status,
      }),
        s.set(task.id, dy),
        R.set(task.id, {
          description: task.description ?? "",
          owner: task.owner,
          metadata: task.metadata,
          blocks: [...(task.blocks ?? [])],
          blockedBy: [...(task.blockedBy ?? [])],
        }));
  for (let Z of taskToolCallsInTranscript(e, n.fate === "used" ? n.isOlderRow : void 0)) {
    if ((L(Z.taskId), Z.answeredEarlier)) continue;
    if (Z.kind === "update") {
      if ((trackTaskToolUse(r, Z.use), !s.has(Z.taskId))) (s.set(Z.taskId, void 0), S.push(Z.taskId));
      let { description: description, owner: owner, metadata: metadata } = Z.named,
        ie = R.get(Z.taskId) ?? { description: "", blocks: [], blockedBy: [] };
      R.set(Z.taskId, {
        ...ie,
        ...(description !== void 0 && { description: description }),
        ...(owner !== void 0 && { owner: owner }),
        ...(metadata !== void 0 && { metadata: mergeTaskMetadata(ie.metadata, metadata) }),
      });
      for (let Se of Z.named.addBlocks ?? []) w(Z.taskId, Se);
      for (let Se of Z.named.addBlockedBy ?? []) w(Se, Z.taskId);
      continue;
    }
    let re = parseTaskNumber(Z.taskId);
    if (Z.askedEarlier && s.get(Z.taskId) === dy && r.tasks.get(Z.taskId)?.content === Z.named.subject)
      continue;
    if (re !== void 0 && ((n.fate === "used" && re <= q) || re <= h.highestByOthersThan(Z.response))) {
      if (n.fate === "used")
        return (
          logForDebugging(
            `[Tasks] rebuild: a create after the compaction marker got id ${Z.taskId}, no higher than one already given out, so the id counter restarted; dropping the marker's list (highest id ${q})`,
          ),
          { tasks: [], highestId: q, olderTasks: 0, carriedTasks: 0, carriedList: "dropped_on_restart" }
        );
      for (let Ue of Z.response === y ? S : s.keys())
        if (s.get(Ue) !== Z.response) (s.delete(Ue), r.tasks.delete(Ue), R.delete(Ue));
      (h.keepOnly(Z.response), (y = Z.response), (S = []));
    }
    if (s.get(Z.taskId) === void 0) r.tasks.delete(Z.taskId);
    if (
      (trackTaskToolUse(r, Z.use),
      resolvePendingTaskCreate(r, Z.result),
      s.set(Z.taskId, Z.response),
      S.push(Z.taskId),
      re !== void 0 && Z.response !== dy)
    )
      h.add(Z.response, re);
    R.set(Z.taskId, {
      description: Z.named.description ?? "",
      metadata: Z.named.metadata,
      blocks: [],
      blockedBy: [],
    });
  }
  let x = [];
  for (let [Z, re] of r.tasks)
    if (s.get(Z) !== void 0 && parseTaskNumber(Z) !== void 0) {
      let Ae = R.get(Z);
      x.push({
        id: Z,
        subject: re.content,
        description: Ae?.description ?? "",
        activeForm: re.activeForm,
        ...(Ae?.owner !== void 0 && { owner: Ae.owner }),
        status: re.status,
        blocks: Ae?.blocks ?? [],
        blockedBy: Ae?.blockedBy ?? [],
        ...(Ae?.metadata !== void 0 && { metadata: Ae.metadata }),
      });
    }
  let G = new Map(x.map((Z) => [Z.id, Z]));
  for (let Z of x) Z.blocks = Z.blocks.filter((block) => G.get(block)?.blockedBy.includes(Z.id));
  for (let Z of x) Z.blockedBy = Z.blockedBy.filter((re) => G.get(re)?.blocks.includes(Z.id));
  for (let Z of r.tasks.keys()) L(Z);
  return {
    tasks: x,
    highestId: P,
    olderTasks: r.tasks.size - x.length,
    carriedTasks: n.fate === "used" ? n.tasks.length : 0,
    carriedList: n.fate,
  };
}
//@ chunk-tyg7f3ek.js:219195-219226 placement
var dy = "carried by the marker";
//@ chunk-tyg7f3ek.js:219226-219728 placement
class HighestResponseTracker {
  byResponse = new Map();
  leader;
  highest = -1 / 0;
  runnerUp = -1 / 0;
  add(e, n) {
    if (n <= (this.byResponse.get(e) ?? -1 / 0)) return;
    if ((this.byResponse.set(e, n), n > this.highest)) {
      if (this.leader !== e) this.runnerUp = this.highest;
      ((this.leader = e), (this.highest = n));
    } else this.runnerUp = Math.max(this.runnerUp, n);
  }
  highestByOthersThan(e) {
    return e === this.leader ? this.runnerUp : this.highest;
  }
  keepOnly(e) {
    let n = this.byResponse.get(e);
    if (
      (this.byResponse.clear(),
      (this.leader = void 0),
      (this.highest = -1 / 0),
      (this.runnerUp = -1 / 0),
      n !== void 0)
    )
      this.add(e, n);
  }
}
//@ chunk-tyg7f3ek.js:219728-219799 placement
function oP(e) {
  return typeof e.uuid === "string" ? e.uuid.toLowerCase() : "";
}
//@ chunk-tyg7f3ek.js:219799-219970 placement
function compactPreservedUuids(e) {
  let safeParse = compactTaskListSchemas().safeParse(e.compactMetadata?.preservedMessages);
  return safeParse.success
    ? [...(safeParse.data?.uuids ?? []), ...(safeParse.data?.allUuids ?? [])].map((r) => r.toLowerCase())
    : void 0;
}
//@ chunk-tyg7f3ek.js:219970-220866 placement
function compactedTaskListIds(e) {
  let n = new Set(),
    r = !0,
    s = !1;
  for (let q of e)
    if (isCompactBoundaryMessage(q)) {
      s ||= q.compactMetadata?.preCompactTaskList !== void 0;
      let x = compactPreservedUuids(q);
      r &&= x !== void 0;
      for (let G of x ?? []) n.add(G);
    }
  let lastIndex = e.findLastIndex((q) => isCompactBoundaryMessage(q) && !n.has(oP(q))),
    y = e[lastIndex];
  if (y === void 0 || !isCompactBoundaryMessage(y) || y.compactMetadata?.preCompactTaskList === void 0)
    return { fate: lastIndex === -1 && s ? "malformed" : "none" };
  let safeParse = zN().safeParse(y.compactMetadata.preCompactTaskList),
    R = compactPreservedUuids(y);
  if (!safeParse.success || R === void 0 || !r)
    return (
      logForDebugging(
        `[Tasks] rebuild: ${safeParse.success ? "a compaction marker's list of kept rows" : "the compaction marker's task list"} is malformed; the marker's task list is ignored and the list is rebuilt from the task calls alone`,
      ),
      { fate: "malformed" }
    );
  let { tasks: tasks, highestId: highestId } = safeParse.data;
  if (tasks === void 0) return { fate: "highest_id_only", highestId: highestId };
  let L = new Set(R);
  return {
    fate: "used",
    tasks: tasks,
    highestId: tasks.reduce((q, x) => Math.max(q, Number(x.id)), highestId),
    isOlderRow: (q, x) => x < lastIndex || L.has(oP(q)),
  };
}
//@ chunk-tyg7f3ek.js:220866-221294 placement
var compactTaskListSchemas = DoctorLazy(() => u({ uuids: A(o()), allUuids: A(o()).optional() }).optional()),
  zN = DoctorLazy(() =>
    u({
      tasks: A(
        u({
          id: o().refine((e) => isCanonicalTaskId(e) && parseTaskNumber(e) !== void 0),
          subject: o(),
          description: o().optional(),
          activeForm: o().optional(),
          status: TaskStatusSchema(),
          owner: o().optional(),
          blocks: A(o()).optional(),
          blockedBy: A(o()).optional(),
          metadata: pe(o(), oe()).optional(),
        }),
      )
        .refine((e) => new Set(e.map((n) => n.id)).size === e.length)
        .optional(),
      highestId: E().int().min(0).max(qu),
    }),
  );
//@ chunk-tyg7f3ek.js:221294-221318 placement
var TASK_LIST_HANDOFF_STATE = new SessionRootSlot(() => ({}));
//@ chunk-tyg7f3ek.js:221318-223078 placement
async function applyTaskListHandoff(e, n) {
  let r = getTaskListId(),
    s = { creates: 0, updates: 0, skipped: 0, missing: 0, conflicts: 0, failed: 0 },
    h = 0,
    y = [...taskToolCallsInTranscript(e)],
    S = new Map();
  for (let { kind: kind, taskId: taskId, named: named } of y) {
    let q = kind === "create" ? (named.subject ?? "") : named.subject;
    if (q !== void 0) S.set(taskId, (S.get(taskId) ?? new Set()).add(q));
  }
  let R = new Set();
  for (let { kind: kind, taskId: taskId, named: named } of y) {
    let q = parseTaskNumber(taskId);
    if (q === void 0) {
      s.skipped++;
      continue;
    }
    if (((h = Math.max(h, q)), kind === "update" && R.has(taskId))) {
      s.conflicts++;
      continue;
    }
    try {
      if (kind === "create") {
        let ce = named.subject ?? "";
        if (
          await writeTaskUnderId(
            r,
            {
              id: taskId,
              subject: ce,
              description: named.description ?? "",
              ...(named.activeForm !== void 0 && { activeForm: named.activeForm }),
              status: "pending",
              blocks: [],
              blockedBy: [],
              ...(named.metadata !== void 0 && { metadata: named.metadata }),
            },
            n,
          )
        )
          s.creates++;
        else {
          let ie = await getTask(r, taskId, n),
            Se = ie !== null && S.get(taskId)?.has(ie.subject) === !0;
          if (!Se) R.add(taskId);
          s[Se ? "skipped" : "conflicts"]++;
        }
        continue;
      }
      if (named.status === "deleted") {
        if (await deleteTask(r, taskId, n)) s.updates++;
        else {
          let ce = await getTask(r, taskId, n);
          s[ce === null ? "skipped" : "failed"]++;
        }
        continue;
      }
      let safeParse = TaskStatusSchema().safeParse(named.status),
        G = {
          ...(named.subject !== void 0 && { subject: named.subject }),
          ...(named.description !== void 0 && { description: named.description }),
          ...(named.activeForm !== void 0 && { activeForm: named.activeForm }),
          ...(safeParse.success && { status: safeParse.data }),
          ...(named.owner !== void 0 && { owner: named.owner }),
          ...(named.metadata !== void 0 && {
            metadata: mergeTaskMetadata((await getTask(r, taskId, n))?.metadata, named.metadata),
          }),
        },
        Z = (ce) => !R.has(ce),
        filtered = (named.addBlocks ?? []).filter(Z),
        filtered_2 = (named.addBlockedBy ?? []).filter(Z);
      if (Object.keys(G).length === 0 && filtered.length + filtered_2.length === 0) {
        s.skipped++;
        continue;
      }
      let Ue = await updateTask(r, taskId, G, n);
      if (Ue === null)
        logForDebugging(`[Tasks] hand-off apply: task ${taskId} is not in the list; its update is skipped`);
      for (let ce of filtered) await blockTask(r, taskId, ce, n);
      for (let ce of filtered_2) await blockTask(r, ce, taskId, n);
      s[Ue === null ? "missing" : "updates"]++;
    } catch (error) {
      (s.failed++, (s.error ??= error));
    }
  }
  if (h > 0)
    try {
      await raiseTaskIdMark(r, h, n);
    } catch (error) {
      (s.failed++, (s.error ??= error));
    }
  return s;
}
//@ chunk-tyg7f3ek.js:223078-223424 placement
async function applyTaskListHandoffIfHonoured(e, n, r) {
  try {
    if (TASK_LIST_HANDOFF_STATE.peek(e)?.honoured !== !0) return;
    let { error: error, ...h } = await applyTaskListHandoff(n, r);
    if (h.failed + h.missing + h.conflicts > 0) {
      if ((logFeatureSad("task_list_handoff_apply", "handoff_apply_partial", h), error !== void 0))
        logError(error);
    } else if (h.creates + h.updates + h.skipped > 0) logFeatureOk("task_list_handoff_apply", h);
  } catch (error) {
    (logFeatureBad("task_list_handoff_apply", "handoff_apply_failed"), logError(error));
  }
}
//@ chunk-tyg7f3ek.js:223424-223689 placement
function createTaskListCatchUp(e, n, r, s) {
  if (TASK_LIST_HANDOFF_STATE.peek(e)?.honoured !== !0)
    return { beforeRun: async () => {}, catchUp: async () => {} };
  let h = new Set(r.map((w) => w.uuid)),
    any = n.some((w) => !h.has(w.uuid)),
    S = !1,
    R = async () => {
      ((S = !0), await applyTaskListHandoffIfHonoured(e, n, s));
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
  let e = E()
    .int()
    .min(0)
    .max(qu)
    .optional()
    .catch(void 0);
  return u({ count: e, highest_id: e });
});
//@ chunk-tyg7f3ek.js:223794-223972 placement
function readTaskListRestoreHint(e) {
  if (e === null || e.readFailed === !0) return;
  let safeParse = taskListRestoreSchema().safeParse(e.external?.task_list_restore);
  return safeParse.success ? { count: safeParse.data.count, highestId: safeParse.data.highest_id } : void 0;
}
/**
 * 会话启动时从转录恢复任务列表（带压缩前快照与延续任务）。
 */
//@ chunk-tyg7f3ek.js:223972-225451 placement
async function restoreTaskListAtBoot(e, n, r, s) {
  let h = readTaskListRestoreHint(await r);
  if (h === void 0) return;
  let of = TASK_LIST_HANDOFF_STATE.of(e);
  of.request = h;
  let startTime = performance.now();
  try {
    let {
        tasks: tasks,
        highestId: highestId,
        olderTasks: olderTasks,
        carriedTasks: carriedTasks,
        carriedList: carriedList,
      } = rebuildTaskListWithRestartFallback(n),
      max = Math.max(h.highestId ?? 0, h.count ?? 0);
    if (highestId === 0 && max === 0) {
      of.honoured = !0;
      return;
    }
    let G = getTaskListId(),
      Z = (Se) => ({
        task_count: tasks.length,
        written_count: Se,
        older_task_count: olderTasks,
        carried_task_count: carriedTasks,
        carried_list: fromEnum(carriedList),
        transcript_highest_id: highestId,
        duration_ms: Math.round(performance.now() - startTime),
        ...(h.count !== void 0 && { requested_count: h.count }),
        ...(h.highestId !== void 0 && { requested_highest_id: h.highestId }),
      });
    if ((await findHighestTaskId(G, s)) > 0) {
      (await raiseTaskIdMark(G, Math.max(highestId, max), s),
        (of.honoured = !0),
        logFeatureSad("task_list_restore", "list_not_empty", Z(0)));
      return;
    }
    let re =
        highestId === 0
          ? "transcript_shows_no_task"
          : highestId < max
            ? "transcript_behind_request"
            : olderTasks > 0
              ? "older_tasks_not_in_transcript"
              : void 0,
      any = n.some(isCompactBoundaryMessage);
    if (re !== void 0 && !any) {
      logFeatureBad("task_list_restore", re, Z(0));
      return;
    }
    let {
      restored: restored,
      written: written,
      refused: refused,
      left: left,
    } = await restoreTaskList(G, tasks, Math.max(highestId, max), s, { wholeOrNothing: !0 });
    if (refused !== void 0) {
      logFeatureBad("task_list_restore", left === void 0 ? "task_write_refused" : "task_write_refused_left", {
        ...Z(written),
        refused_count: refused,
        ...(left !== void 0 && { left_count: left }),
      });
      return;
    }
    if (!restored)
      (await raiseTaskIdMark(G, Math.max(highestId, max), s),
        logFeatureSad("task_list_restore", "list_not_empty", Z(0)));
    else if (re !== void 0) logFeatureSad("task_list_restore", re, Z(written));
    else logFeatureOk("task_list_restore", Z(written));
    ((of.honoured = !0),
      logForDebugging(
        `[Tasks] boot restore: ${restored ? "restored" : "left alone"}, ${written} of ${tasks.length} task(s) in the transcript written`,
      ));
  } catch (error) {
    (logFeatureBad("task_list_restore", "restore_failed"), logError(error));
  }
}
/**
 * print 模式下 team-lead 轮询队友邮箱：读未读消息、入队、所有队友结束后停止并收尾。
 */
//@ chunk-tyg7f3ek.js:225488-229008 placement
class TeamLeadPoller {
  drain;
  messageQueue;
  store;
  storageV5;
  kick;
  enqueueTeamShutdownPrompt;
  polling = !1;
  consecutiveMarkFailures = 0;
  markFailureStreakReported = !1;
  finalLeadDrainDone = !1;
  constructor({ drain: e, messageQueue: n, store: r, storageV5: s, kick: h, enqueueTeamShutdownPrompt: y }) {
    ((this.drain = e),
      (this.messageQueue = n),
      (this.store = r),
      (this.storageV5 = s),
      (this.kick = h),
      (this.enqueueTeamShutdownPrompt = y));
  }
  pollActive() {
    return this.polling;
  }
  *poll({ pulseKeepAlive: e, pulseInboxFrameActivity: n }) {
    let teamContext = this.store.getState().teamContext;
    if (!(teamContext && isTeamLead(teamContext)))
      return (
        (this.consecutiveMarkFailures = 0),
        (this.markFailureStreakReported = !1),
        (this.finalLeadDrainDone = !1),
        "done"
      );
    let h = "team-lead",
      y = 500;
    this.polling = !0;
    try {
      while (!0) {
        if (this.drain.inputClosed && this.drain.batchLeftUnstarted) return "done";
        let state = this.store.getState(),
          R = hasActiveInProcessTeammates(state) || hasNonLeadTeammate(state.teamContext),
          w = yield readUnreadMessages(h, state.teamContext?.teamName, this.storageV5),
          P = Array.isArray(w) ? w : [];
        if (!R)
          if (
            P.length > 0 &&
            this.consecutiveMarkFailures < MARK_READ_FAILURE_CAP &&
            !this.finalLeadDrainDone
          )
            this.finalLeadDrainDone = !0;
          else {
            if ((logForDebugging("[print.ts] No more active teammates, stopping poll"), P.length === 0))
              ((this.consecutiveMarkFailures = 0),
                (this.markFailureStreakReported = !1),
                (this.finalLeadDrainDone = !1));
            break;
          }
        else this.finalLeadDrainDone = !1;
        if (P.length > 0) {
          logForDebugging(`[print.ts] Team-lead found ${P.length} unread messages`);
          let L = dedupeMailboxMessages(P, getInboxPath(h, state.teamContext?.teamName), {
              roster: state.teamContext?.teammates,
              isPaneTeammate: !1,
            }),
            q = (ce) => L.get(ce) === "forged",
            x = (yield markMessagesAsRead(h, state.teamContext?.teamName, P, this.storageV5)) === !0;
          if (x) ((this.consecutiveMarkFailures = 0), (this.markFailureStreakReported = !1));
          else {
            if ((this.consecutiveMarkFailures++, R && this.consecutiveMarkFailures < MARK_READ_FAILURE_CAP)) {
              (logForDebugging(
                `[print.ts] Could not mark ${P.length} inbox message(s) read (${this.consecutiveMarkFailures}/${MARK_READ_FAILURE_CAP}); retrying next poll`,
                { level: "warn" },
              ),
                e(),
                yield sleep(y));
              continue;
            }
            if (
              (logForDebugging(
                `[print.ts] Could not mark ${P.length} inbox message(s) read for ${this.consecutiveMarkFailures} polls; processing the batch unmarked`,
                { level: "warn" },
              ),
              !this.markFailureStreakReported)
            )
              ((this.markFailureStreakReported = !0),
                logFeatureSad("swarm_inbox_poll", "mark_read_failed_streak"));
          }
          let G = state.teamContext?.teamName;
          for (let ce of P) {
            let nt = q(ce) ? null : isShutdownApproved(ce.text),
              ie = nt?.from === ce.from;
            if (nt && ie && G) {
              let from = nt.from;
              logForDebugging(`[print.ts] Processing shutdown_approved from ${from}`);
              let me = state.teamContext?.teammates
                ? Object.entries(state.teamContext.teammates).find(([, Me]) => Me.name === from)?.[0]
                : void 0;
              if (me)
                (yield removeTeammateFromTeamFile(G, { agentId: me, name: from }, this.storageV5),
                  logForDebugging(`[print.ts] Removed ${from} from team file`),
                  yield unassignTeammateTasks(G, me, from, "shutdown", this.storageV5),
                  this.store.setState((Me) => {
                    if (!Me.teamContext?.teammates) return Me;
                    if (!(me in Me.teamContext.teammates)) return Me;
                    let { [me]: Ee, ...He } = Me.teamContext.teammates;
                    return { ...Me, teamContext: { ...Me.teamContext, teammates: He } };
                  }));
            }
          }
          let filtered = P.filter((ce) => q(ce) || isHeadlessLeadDisplayableMessage(ce.text)),
            re =
              filtered.length === 0 || this.drain.endSessionRequested
                ? []
                : yield filterMailboxThroughReceiveHooks(filtered, {
                    provenanceOf: (ce) => L.get(ce) ?? "unverifiable",
                    agentId: void 0,
                    isPassedThrough: (ce) => !q(ce) && isStructuredProtocolMessage(ce.text),
                  }),
            Ae = Array.isArray(re) ? re : [];
          if (
            (clearOwedIdleNotificationsOnShutdown(
              P.filter((ce) => !q(ce)),
              this.store.setState,
            ),
            Ae.length === 0 || this.drain.endSessionRequested)
          ) {
            if ((n(), !x)) (e(), yield sleep(y));
            continue;
          }
          let Ue = formatTeammateMessages(Ae, { recipientIsLead: !0 });
          return (
            this.messageQueue.enqueue({
              mode: "prompt",
              agentId: mainAgentId(),
              value: Ue,
              uuid: randomUUID_8(),
              skipAttachments: !0,
              foreignWord: "teammate-reply",
            }),
            this.kick(),
            "rekicked"
          );
        }
        if (
          ((this.consecutiveMarkFailures = 0),
          (this.markFailureStreakReported = !1),
          this.drain.inputClosed && this.enqueueTeamShutdownPrompt())
        )
          return (
            logForDebugging("[print.ts] Input closed with active teammates, injected shutdown prompt"),
            "rekicked"
          );
        (e(), yield sleep(y));
      }
    } finally {
      this.polling = !1;
    }
    return "done";
  }
}
/**
 * 空实现的快照存储（snapshot 原样返回、restore 返回空对象）。
 */
//@ chunk-tyg7f3ek.js:229086-229166 placement
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
var snapshotStoreStorage = new AsyncLocalStorage(),
  NOOP_SNAPSHOT_STORE = new NoopSnapshotStore();
//@ chunk-tyg7f3ek.js:229190-229229 placement = getAgentContext (1)
function getSnapshotStore() {
  return snapshotStoreStorage.getStore() ?? NOOP_SNAPSHOT_STORE;
}
//@ chunk-tyg7f3ek.js:229229-229263 placement
function ap() {
  return join_3(Sx(), getSessionId());
}
//@ chunk-tyg7f3ek.js:229263-229886 placement
class WorkerDirSyncReporter {
  workerDirSync;
  enqueueSdkEvent;
  turnEndUploadListener;
  constructor({ workerDirSync: e, enqueueSdkEvent: n, turnEndUploadListener: r }) {
    ((this.workerDirSync = e), (this.enqueueSdkEvent = n), (this.turnEndUploadListener = r));
  }
  beforeTurn() {
    import("./chunk-2s3tfbmy.js").then((n) => n.flushSyncedFiles()).catch(() => {});
    return;
  }
  afterTurn({ turnStartTime: e, signal: n, userEventUuids: r }) {
    import("./chunk-2s3tfbmy.js").then((y) => y.flushSyncedFiles()).catch(() => {});
    let turnEndUploadListener = this.turnEndUploadListener,
      h = this.workerDirSync?.then(
        (y) => (
          y?.afterTurn({ userEventUuids: [...r] }),
          turnEndUploadListener === void 0 ? void 0 : y?.drain()
        ),
      );
    if (h !== void 0) turnEndUploadListener?.(h);
    getSnapshotStore().snapshot(ap(), {}).catch(logError);
  }
}
//@ chunk-tyg7f3ek.js:229886-230095 placement
function notifyTurnBeganBeforeInit({ sessionState: sessionState, markStartupPhase: markStartupPhase }) {
  if (getActiveMessageQueue() !== void 0) return;
  try {
    sessionState.notifyTurnBeganBeforeInit();
  } catch (error) {
    logForDebugging(`turn_began_before_init tee failed: ${errorMessage(error)}`, { level: "warn" });
  }
  markStartupPhase?.("turn_began_before_init");
}
//@ chunk-tyg7f3ek.js:230095-230291 placement
async function placeFilesByNameForTurn(e, n) {
  if (e.fileNames === void 0) return;
  try {
    let { placeFilesByName: placeFilesByName } = await import("./chunk-55nezfmq.js");
    await placeFilesByName(e, n);
  } catch (error) {
    (logFeatureBad("ccr_turn_handoff_files_by_name", "load_failed"), logError(error));
  }
}
//@ chunk-tyg7f3ek.js:230291-230503 placement
async function refreshFilesPlacedByName(e) {
  try {
    if ((await ensurePlacedByNameRead(), !hasConflictingPlacedFile(e))) return;
    let { refreshFilesPlacedByName: refreshFilesPlacedByName } = await import("./chunk-648dqenp.js");
    await refreshFilesPlacedByName(e);
  } catch (error) {
    (logForDiagnosticsNoPII("warn", "turn_handoff_files_by_name_refresh", { load_failed: 1 }),
      logError(error));
  }
}
//@ chunk-tyg7f3ek.js:230503-230577 placement
var UNPLANNABLE_REASONS = { peer: 1, file_kinds: 2, prompt_hook: 3, unplannable: 4, text_not_typed: 5 };

export {
  restoreTaskListAtBoot,
  notifyTurnBeganBeforeInit,
  placeFilesByNameForTurn,
  WorkerDirSyncReporter,
  TeamLeadPoller,
  getSnapshotStore,
  ap,
  createTaskListCatchUp,
  TASK_LIST_HANDOFF_STATE,
  UNPLANNABLE_REASONS,
  refreshFilesPlacedByName,
};
