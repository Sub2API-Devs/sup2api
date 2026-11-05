/**
 * cli/print/taskListRestore.ts
 *
 * 2.1.316 新增：任务列表的启动恢复、交接与从记录重建，团队领导轮询
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-0yw3taqg.js (19), chunk-tmsx2mh0.js (8)
 * attribution: placement 25, layout 2
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
import {
  objectSchema,
  array,
  stringSchema,
  record,
  unknown,
  numberSchema,
} from "../../../vendor/zod/v4/classic/schemas.js";
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
import { isShutdownFrameStale, removeTeammateFromTeamFile } from "../../utils/swarm/teamHelpers.js";
import { filterMailboxThroughReceiveHooks } from "../../utils/swarm/teammateMailbox.js";
import { clearOwedIdleNotificationsOnShutdown } from "../../utils/inProcessTeammateHelpers.js";
import { mainAgentId, getSessionId, filesPlacedByNameRegistry } from "../../bootstrap/state.js";
import { sessionTempDirRealpath } from "../../utils/tempDirRealpaths.js";
import { getActiveMessageQueue } from "../../query/presenceCheck.js";
import { errorMessage } from "../../utils/errors.js";
import { ensurePlacedByNameRead } from "../../utils/filePersistence/placedByName.js";
import { hasConflictingPlacedFile } from "../../utils/filePersistence/taskFileLookup.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { isFilePersistenceEnabled } from "../../utils/filePersistence/filePersistence.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-tmsx2mh0.js:9006-9209 placement
function rebuildTaskListWithRestartFallback(messages) {
  let compactedIds = compactedTaskListIds(messages);
  let restored = rebuildTaskListFromTranscript(messages, compactedIds);
  if (restored.carriedList !== "dropped_on_restart") return restored;
  let fallbackList = rebuildTaskListFromTranscript(messages, {
    fate: "none",
  });
  return {
    ...fallbackList,
    highestId: Math.max(fallbackList.highestId, restored.highestId),
    carriedList: "dropped_on_restart",
  };
}
//@ chunk-tmsx2mh0.js:9209-12362 placement
/**
 * 从转录重建任务列表：处理 create/update、压缩标记里的任务快照与 blocks/blockedBy 关系。
 */
function rebuildTaskListFromTranscript(messages, options) {
  let state = {
    pendingCreates: new Map(),
    tasks: new Map(),
  };
  let byResponse = new Map();
  let highestTracker = new HighestResponseTracker();
  let dropResponseKey;
  let droppedKeys = [];
  let seenIds = new Set();
  let byTaskId = new Map();
  let link = (taskId, otherTaskId) => {
    let blocks = byTaskId.get(taskId)?.blocks;
    let blockedBy = byTaskId.get(otherTaskId)?.blockedBy;
    if (state.tasks.has(taskId) && state.tasks.has(otherTaskId) && blocks && blockedBy) {
      if (!blocks.includes(otherTaskId)) blocks.push(otherTaskId);
      if (!blockedBy.includes(taskId)) blockedBy.push(taskId);
    }
  };
  let createdCount = 0;
  let visitCall = (call) => {
    createdCount = Math.max(createdCount, parseTaskNumber(call) ?? 0);
  };
  if (options.fate === "used" || options.fate === "highest_id_only") createdCount = options.highestId;
  let highestId = options.fate === "used" ? options.highestId : 0;
  if (options.fate === "used")
    for (let task of options.tasks) {
      state.tasks.set(task.id, {
        content: task.subject,
        activeForm: task.activeForm ?? task.subject,
        status: task.status,
      });
      byResponse.set(task.id, TASK_CARRIED_BY_MARKER);
      byTaskId.set(task.id, {
        description: task.description ?? "",
        owner: task.owner,
        metadata: task.metadata,
        blocks: [...(task.blocks ?? [])],
        blockedBy: [...(task.blockedBy ?? [])],
      });
    }
  for (let call of taskToolCallsInTranscript(
    messages,
    options.fate === "used" ? options.isOlderRow : undefined,
  )) {
    let taskNumber = parseTaskNumber(call.taskId);
    if (
      call.fromSubagent &&
      (call.kind === "update"
        ? byResponse.get(call.taskId) === undefined
        : byResponse.has(call.taskId) ||
          taskNumber === undefined ||
          taskNumber <= highestId ||
          taskNumber <= highestTracker.highestByOthersThan(call.response))
    )
      continue;
    visitCall(call.taskId);
    if (call.answeredEarlier) continue;
    if (call.kind === "update") {
      trackTaskToolUse(state, call.use);
      if (!byResponse.has(call.taskId)) {
        byResponse.set(call.taskId, undefined);
        droppedKeys.push(call.taskId);
      }
      let { description, owner, metadata } = call.named;
      let task = byTaskId.get(call.taskId) ?? {
        description: "",
        blocks: [],
        blockedBy: [],
      };
      byTaskId.set(call.taskId, {
        ...task,
        ...(description !== undefined && {
          description,
        }),
        ...(owner !== undefined && {
          owner,
        }),
        ...(metadata !== undefined && {
          metadata: mergeTaskMetadata(task.metadata, metadata),
        }),
      });
      for (let otherTaskId of call.named.addBlocks ?? []) link(call.taskId, otherTaskId);
      for (let blockedTaskId of call.named.addBlockedBy ?? []) link(blockedTaskId, call.taskId);
      continue;
    }
    if (
      call.askedEarlier &&
      byResponse.get(call.taskId) === TASK_CARRIED_BY_MARKER &&
      state.tasks.get(call.taskId)?.content === call.named.subject
    )
      continue;
    if (
      taskNumber !== undefined &&
      ((options.fate === "used" && taskNumber <= highestId) ||
        taskNumber <= highestTracker.highestByOthersThan(call.response))
    ) {
      if (options.fate === "used") {
        logForDebugging(
          `[Tasks] rebuild: a create after the compaction marker got id ${call.taskId}, no higher than one already given out, so the id counter restarted; dropping the marker's list (highest id ${highestId})`,
        );
        return {
          tasks: [],
          highestId,
          olderTasks: 0,
          carriedTasks: 0,
          carriedList: "dropped_on_restart",
        };
      }
      for (let responseKey of call.response === dropResponseKey ? droppedKeys : byResponse.keys())
        if (byResponse.get(responseKey) !== call.response) {
          byResponse.delete(responseKey);
          state.tasks.delete(responseKey);
          byTaskId.delete(responseKey);
          seenIds.delete(responseKey);
        }
      highestTracker.keepOnly(call.response);
      dropResponseKey = call.response;
      droppedKeys = [];
    }
    if (seenIds.has(call.taskId)) {
      for (let taskId of seenIds) {
        byResponse.delete(taskId);
        state.tasks.delete(taskId);
        byTaskId.delete(taskId);
      }
      seenIds.clear();
    }
    if (byResponse.get(call.taskId) === undefined) state.tasks.delete(call.taskId);
    trackTaskToolUse(state, call.use);
    resolvePendingTaskCreate(state, call.result);
    byResponse.set(call.taskId, call.response);
    droppedKeys.push(call.taskId);
    if (call.fromSubagent) seenIds.add(call.taskId);
    else if (taskNumber !== undefined && call.response !== TASK_CARRIED_BY_MARKER)
      highestTracker.add(call.response, taskNumber);
    byTaskId.set(call.taskId, {
      description: call.named.description ?? "",
      metadata: call.named.metadata,
      blocks: [],
      blockedBy: [],
    });
  }
  let ordered = [];
  for (let [key, task] of state.tasks)
    if (byResponse.get(key) !== undefined && parseTaskNumber(key) !== undefined) {
      let taskInfo = byTaskId.get(key);
      ordered.push({
        id: key,
        subject: task.content,
        description: taskInfo?.description ?? "",
        activeForm: task.activeForm,
        ...(taskInfo?.owner !== undefined && {
          owner: taskInfo.owner,
        }),
        status: task.status,
        blocks: taskInfo?.blocks ?? [],
        blockedBy: taskInfo?.blockedBy ?? [],
        ...(taskInfo?.metadata !== undefined && {
          metadata: taskInfo.metadata,
        }),
      });
    }
  let byId = new Map(ordered.map((task) => [task.id, task]));
  for (let task of ordered)
    task.blocks = task.blocks.filter((block) => byId.get(block)?.blockedBy.includes(task.id));
  for (let task of ordered)
    task.blockedBy = task.blockedBy.filter((blocker) => byId.get(blocker)?.blocks.includes(task.id));
  for (let key of state.tasks.keys()) visitCall(key);
  return {
    tasks: ordered,
    highestId: createdCount,
    olderTasks: state.tasks.size - ordered.length,
    carriedTasks: options.fate === "used" ? options.tasks.length : 0,
    carriedList: options.fate,
  };
}
//@ chunk-tmsx2mh0.js:12362-12393 placement
var TASK_CARRIED_BY_MARKER = "carried by the marker";
//@ chunk-tmsx2mh0.js:12393-12895 placement
class HighestResponseTracker {
  byResponse = new Map();
  leader;
  highest = -1 / 0;
  runnerUp = -1 / 0;
  add(key, value) {
    if (value <= (this.byResponse.get(key) ?? -1 / 0)) return;
    this.byResponse.set(key, value);
    if (value > this.highest) {
      if (this.leader !== key) this.runnerUp = this.highest;
      this.leader = key;
      this.highest = value;
    } else this.runnerUp = Math.max(this.runnerUp, value);
  }
  highestByOthersThan(key) {
    return key === this.leader ? this.runnerUp : this.highest;
  }
  keepOnly(key) {
    let value = this.byResponse.get(key);
    this.byResponse.clear();
    this.leader = undefined;
    this.highest = -1 / 0;
    this.runnerUp = -1 / 0;
    if (value !== undefined) this.add(key, value);
  }
}
//@ chunk-tmsx2mh0.js:12895-12966 placement
function lowercaseUuidOrEmpty(row) {
  return typeof row.uuid === "string" ? row.uuid.toLowerCase() : "";
}
//@ chunk-tmsx2mh0.js:12966-13137 placement
function compactPreservedUuids(message) {
  let parsed = compactTaskListSchemas().safeParse(message.compactMetadata?.preservedMessages);
  return parsed.success
    ? [...(parsed.data?.uuids ?? []), ...(parsed.data?.allUuids ?? [])].map((uuid) => uuid.toLowerCase())
    : undefined;
}
//@ chunk-tmsx2mh0.js:13137-14044 placement
function compactedTaskListIds(messages) {
  let preserved = new Set();
  let sawBoundary = true;
  let stopped = false;
  for (let message of messages)
    if (isCompactBoundaryMessage(message)) {
      stopped ||= message.compactMetadata?.preCompactTaskList !== undefined;
      let uuids = compactPreservedUuids(message);
      sawBoundary &&= uuids !== undefined;
      for (let uuid of uuids ?? []) preserved.add(uuid);
    }
  let lastIndex = messages.findLastIndex(
    (message) => isCompactBoundaryMessage(message) && !preserved.has(lowercaseUuidOrEmpty(message)),
  );
  let boundary = messages[lastIndex];
  if (
    boundary === undefined ||
    !isCompactBoundaryMessage(boundary) ||
    boundary.compactMetadata?.preCompactTaskList === undefined
  )
    return {
      fate: lastIndex === -1 && stopped ? "malformed" : "none",
    };
  let parsed = compactTaskListSchema().safeParse(boundary.compactMetadata.preCompactTaskList);
  let preservedUuids = compactPreservedUuids(boundary);
  if (!parsed.success || preservedUuids === undefined || !sawBoundary) {
    logForDebugging(
      `[Tasks] rebuild: ${parsed.success ? "a compaction marker's list of kept rows" : "the compaction marker's task list"} is malformed; the marker's task list is ignored and the list is rebuilt from the task calls alone`,
    );
    return {
      fate: "malformed",
    };
  }
  let { tasks, highestId } = parsed.data;
  if (tasks === undefined)
    return {
      fate: "highest_id_only",
      highestId,
    };
  let preservedSet = new Set(preservedUuids);
  return {
    fate: "used",
    tasks,
    highestId: tasks.reduce((acc, task) => Math.max(acc, Number(task.id)), highestId),
    isOlderRow: (a, b) => b < lastIndex || preservedSet.has(lowercaseUuidOrEmpty(a)),
  };
}
//@ chunk-tmsx2mh0.js:14044-14474 placement
/**
 * 压缩时携带的任务清单 schema：uuids（及可选 allUuids）与任务数组（id/标题/描述等）。
 */
var compactTaskListSchemas; // deferred: uses DoctorLazy (../handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var compactTaskListSchema;
deferInit("chunk-tmsx2mh0.js:14044", () => {
  compactTaskListSchemas = DoctorLazy(() =>
    objectSchema({
      uuids: array(stringSchema()),
      allUuids: array(stringSchema()).optional(),
    }).optional(),
  );
  compactTaskListSchema = DoctorLazy(() =>
    objectSchema({
      tasks: array(
        objectSchema({
          id: stringSchema().refine((id) => isCanonicalTaskId(id) && parseTaskNumber(id) !== undefined),
          subject: stringSchema(),
          description: stringSchema().optional(),
          activeForm: stringSchema().optional(),
          status: TaskStatusSchema(),
          owner: stringSchema().optional(),
          blocks: array(stringSchema()).optional(),
          blockedBy: array(stringSchema()).optional(),
          metadata: record(stringSchema(), unknown()).optional(),
        }),
      )
        .refine((items) => new Set(items.map((task) => task.id)).size === items.length)
        .optional(),
      highestId: numberSchema().int().min(0).max(MAX_TASK_NUMBER),
    }),
  );
});
//@ chunk-0yw3taqg.js:248421-248445 placement
var TASK_LIST_HANDOFF_STATE; // deferred: uses SessionRootSlot (../../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-0yw3taqg.js:248421", () => {
  TASK_LIST_HANDOFF_STATE = new SessionRootSlot(() => ({}));
});
//@ chunk-0yw3taqg.js:248445-250210 placement
async function applyTaskListHandoff(messages, store) {
  let taskListId = getTaskListId();
  let counts = {
    creates: 0,
    updates: 0,
    skipped: 0,
    missing: 0,
    conflicts: 0,
    failed: 0,
  };
  let mark = 0;
  let calls = [...taskToolCallsInTranscript(messages)];
  let knownSubjects = new Map();
  for (let { kind, taskId, named } of calls) {
    let subject = kind === "create" ? (named.subject ?? "") : named.subject;
    if (subject !== undefined)
      knownSubjects.set(taskId, (knownSubjects.get(taskId) ?? new Set()).add(subject));
  }
  let blockedSubjects = new Set();
  for (let { kind, taskId, named } of calls) {
    let taskNumber = parseTaskNumber(taskId);
    if (taskNumber === undefined) {
      counts.skipped++;
      continue;
    }
    mark = Math.max(mark, taskNumber);
    if (kind === "update" && blockedSubjects.has(taskId)) {
      counts.conflicts++;
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
          counts.creates++;
        else {
          let task = await getTask(taskListId, taskId, store);
          let alreadyBlocked = task !== null && knownSubjects.get(taskId)?.has(task.subject) === true;
          if (!alreadyBlocked) blockedSubjects.add(taskId);
          counts[alreadyBlocked ? "skipped" : "conflicts"]++;
        }
        continue;
      }
      if (named.status === "deleted") {
        if (await deleteTask(taskListId, taskId, store)) counts.updates++;
        else {
          let task = await getTask(taskListId, taskId, store);
          counts[task === null ? "skipped" : "failed"]++;
        }
        continue;
      }
      let parsedStatus = TaskStatusSchema().safeParse(named.status);
      let patch = {
        ...(named.subject !== undefined && {
          subject: named.subject,
        }),
        ...(named.description !== undefined && {
          description: named.description,
        }),
        ...(named.activeForm !== undefined && {
          activeForm: named.activeForm,
        }),
        ...(parsedStatus.success && {
          status: parsedStatus.data,
        }),
        ...(named.owner !== undefined && {
          owner: named.owner,
        }),
        ...(named.metadata !== undefined && {
          metadata: mergeTaskMetadata((await getTask(taskListId, taskId, store))?.metadata, named.metadata),
        }),
      };
      let isNewBlocker = (subject) => !blockedSubjects.has(subject);
      let filtered = (named.addBlocks ?? []).filter(isNewBlocker);
      let filtered_2 = (named.addBlockedBy ?? []).filter(isNewBlocker);
      if (Object.keys(patch).length === 0 && filtered.length + filtered_2.length === 0) {
        counts.skipped++;
        continue;
      }
      let updated = await updateTask(taskListId, taskId, patch, store);
      if (updated === null)
        logForDebugging(`[Tasks] hand-off apply: task ${taskId} is not in the list; its update is skipped`);
      for (let blockerSubject of filtered) await blockTask(taskListId, taskId, blockerSubject, store);
      for (let blockedSubject of filtered_2) await blockTask(taskListId, blockedSubject, taskId, store);
      counts[updated === null ? "missing" : "updates"]++;
    } catch (error) {
      counts.failed++;
      counts.error ??= error;
    }
  }
  if (mark > 0)
    try {
      await raiseTaskIdMark(taskListId, mark, store);
    } catch (error) {
      counts.failed++;
      counts.error ??= error;
    }
  return counts;
}
//@ chunk-0yw3taqg.js:250210-250556 placement
async function applyTaskListHandoffIfHonoured(restoredState, messages, store) {
  try {
    if (TASK_LIST_HANDOFF_STATE.peek(restoredState)?.honoured !== true) return;
    let { error, ...outcome } = await applyTaskListHandoff(messages, store);
    if (outcome.failed + outcome.missing + outcome.conflicts > 0) {
      logFeatureSad("task_list_handoff_apply", "handoff_apply_partial", outcome);
      if (error !== undefined) logError(error);
    } else if (outcome.creates + outcome.updates + outcome.skipped > 0)
      logFeatureOk("task_list_handoff_apply", outcome);
  } catch (error) {
    logFeatureBad("task_list_handoff_apply", "handoff_apply_failed");
    logError(error);
  }
}
//@ chunk-0yw3taqg.js:250556-250821 placement
function createTaskListCatchUp(restoredState, messages, mutableMessages, store) {
  if (TASK_LIST_HANDOFF_STATE.peek(restoredState)?.honoured !== true)
    return {
      beforeRun: async () => {},
      catchUp: async () => {},
    };
  let mutableById = new Set(mutableMessages.map((row) => row.uuid));
  let any = messages.some((row) => !mutableById.has(row.uuid));
  let failed = false;
  let catchUp = async () => {
    failed = true;
    await applyTaskListHandoffIfHonoured(restoredState, messages, store);
  };
  return {
    beforeRun: catchUp,
    catchUp: async (row) => {
      if (!failed && any && row) await catchUp();
    },
  };
}
//@ chunk-0yw3taqg.js:250821-250927 placement
var taskListRestoreSchema; // deferred: uses DoctorLazy (../handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-0yw3taqg.js:250821", () => {
  taskListRestoreSchema = DoctorLazy(() => {
    let schema = numberSchema().int().min(0).max(MAX_TASK_NUMBER).optional().catch(undefined);
    return objectSchema({
      count: schema,
      highest_id: schema,
    });
  });
});
//@ chunk-0yw3taqg.js:250927-251105 placement
function readTaskListRestoreHint(entry) {
  if (entry === null || entry.readFailed === true) return;
  let parsed = taskListRestoreSchema().safeParse(entry.external?.task_list_restore);
  return parsed.success
    ? {
        count: parsed.data.count,
        highestId: parsed.data.highest_id,
      }
    : undefined;
}
//@ chunk-0yw3taqg.js:251105-251163 layout
function requestedTaskListId(taskListRestoreHint) {
  return Math.max(taskListRestoreHint.highestId ?? 0, taskListRestoreHint.count ?? 0);
}
//@ chunk-0yw3taqg.js:251163-252620 placement
/**
 * 会话启动时从转录恢复任务列表（带压缩前快照与延续任务）。
 */
async function restoreTaskListAtBoot(host, messages, entry, store) {
  let taskListRestoreHint = readTaskListRestoreHint(await entry);
  if (taskListRestoreHint === undefined) return;
  let restoreState = TASK_LIST_HANDOFF_STATE.of(host);
  restoreState.request = taskListRestoreHint;
  let startTime = performance.now();
  try {
    let { tasks, highestId, olderTasks, carriedTasks, carriedList } =
      rebuildTaskListWithRestartFallback(messages);
    let requestedHighestId = requestedTaskListId(taskListRestoreHint);
    if (highestId === 0 && requestedHighestId === 0) {
      restoreState.honoured = true;
      return;
    }
    let taskListId = getTaskListId();
    let logRestored = (writtenCount) => ({
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
      await raiseTaskIdMark(taskListId, Math.max(highestId, requestedHighestId), store);
      restoreState.honoured = true;
      logFeatureSad("task_list_restore", "list_not_empty", logRestored(0));
      return;
    }
    let shouldKeep =
      highestId === 0
        ? "transcript_shows_no_task"
        : highestId < requestedHighestId
          ? "transcript_behind_request"
          : olderTasks > 0
            ? "older_tasks_not_in_transcript"
            : undefined;
    let any = messages.some(isCompactBoundaryMessage);
    if (shouldKeep !== undefined && !any) {
      logFeatureBad("task_list_restore", shouldKeep, logRestored(0));
      return;
    }
    let { restored, written, refused, left } = await restoreTaskList(
      taskListId,
      tasks,
      Math.max(highestId, requestedHighestId),
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
          ...logRestored(written),
          refused_count: refused,
          ...(left !== undefined && {
            left_count: left,
          }),
        },
      );
      return;
    }
    if (!restored) {
      await raiseTaskIdMark(taskListId, Math.max(highestId, requestedHighestId), store);
      logFeatureSad("task_list_restore", "list_not_empty", logRestored(0));
    } else if (shouldKeep !== undefined) logFeatureSad("task_list_restore", shouldKeep, logRestored(written));
    else logFeatureOk("task_list_restore", logRestored(written));
    restoreState.honoured = true;
    logForDebugging(
      `[Tasks] boot restore: ${restored ? "restored" : "left alone"}, ${written} of ${tasks.length} task(s) in the transcript written`,
    );
  } catch (error) {
    logFeatureBad("task_list_restore", "restore_failed");
    logError(error);
  }
}
//@ chunk-0yw3taqg.js:252657-256245 placement
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
    let pollIntervalMs = 500;
    this.polling = true;
    try {
      while (true) {
        if (this.drain.inputClosed && this.drain.batchLeftUnstarted) return "done";
        let state = this.store.getState();
        let hasTeammates = hasActiveInProcessTeammates(state) || hasNonLeadTeammate(state.teamContext);
        let messages = yield readUnreadMessages(agentName, state.teamContext?.teamName, this.storageV5);
        let messageList = Array.isArray(messages) ? messages : [];
        if (!hasTeammates) {
          if (
            messageList.length > 0 &&
            this.consecutiveMarkFailures < MARK_READ_FAILURE_CAP &&
            !this.finalLeadDrainDone
          )
            this.finalLeadDrainDone = true;
          else {
            logForDebugging("[print.ts] No more active teammates, stopping poll");
            if (messageList.length === 0) {
              this.consecutiveMarkFailures = 0;
              this.markFailureStreakReported = false;
              this.finalLeadDrainDone = false;
            }
            break;
          }
        } else this.finalLeadDrainDone = false;
        if (messageList.length > 0) {
          logForDebugging(`[print.ts] Team-lead found ${messageList.length} unread messages`);
          let provenance = dedupeMailboxMessages(
            messageList,
            getInboxPath(agentName, state.teamContext?.teamName),
            {
              roster: state.teamContext?.teammates,
              isPaneTeammate: false,
            },
          );
          let isForged = (messageId) => provenance.get(messageId) === "forged";
          let marked =
            (yield markMessagesAsRead(
              agentName,
              state.teamContext?.teamName,
              messageList,
              this.storageV5,
            )) === true;
          if (marked) {
            this.consecutiveMarkFailures = 0;
            this.markFailureStreakReported = false;
          } else {
            this.consecutiveMarkFailures++;
            if (hasTeammates && this.consecutiveMarkFailures < MARK_READ_FAILURE_CAP) {
              logForDebugging(
                `[print.ts] Could not mark ${messageList.length} inbox message(s) read (${this.consecutiveMarkFailures}/${MARK_READ_FAILURE_CAP}); retrying next poll`,
                {
                  level: "warn",
                },
              );
              pulseKeepAlive();
              yield sleep(pollIntervalMs);
              continue;
            }
            logForDebugging(
              `[print.ts] Could not mark ${messageList.length} inbox message(s) read for ${this.consecutiveMarkFailures} polls; processing the batch unmarked`,
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
          for (let message of messageList) {
            let shutdownApproval = isForged(message) ? null : isShutdownApproved(message.text);
            let isSelfApproval = shutdownApproval?.from === message.from;
            if (shutdownApproval && isSelfApproval && teamName) {
              let from = shutdownApproval.from;
              logForDebugging(`[print.ts] Processing shutdown_approved from ${from}`);
              let teammateAgentId = state.teamContext?.teammates
                ? Object.entries(state.teamContext.teammates).find(([, value]) => value.name === from)?.[0]
                : undefined;
              if (teammateAgentId) {
                if (
                  (yield isShutdownFrameStale(
                    teamName,
                    teammateAgentId,
                    message.timestamp,
                    this.storageV5,
                  )) === true
                )
                  continue;
                yield removeTeammateFromTeamFile(
                  teamName,
                  {
                    agentId: teammateAgentId,
                    name: from,
                  },
                  this.storageV5,
                );
                logForDebugging(`[print.ts] Removed ${from} from team file`);
                yield unassignTeammateTasks(teamName, teammateAgentId, from, "shutdown", this.storageV5);
                this.store.setState((state) => {
                  if (!state.teamContext?.teammates) return state;
                  if (!(teammateAgentId in state.teamContext.teammates)) return state;
                  let { [teammateAgentId]: ownStamp, ...otherTeammates } = state.teamContext.teammates;
                  return {
                    ...state,
                    teamContext: {
                      ...state.teamContext,
                      teammates: otherTeammates,
                    },
                  };
                });
              }
            }
          }
          let entries = messageList.filter(
            (message) => isForged(message) || isHeadlessLeadDisplayableMessage(message.text),
          );
          let eligible =
            entries.length === 0 || this.drain.endSessionRequested
              ? []
              : yield filterMailboxThroughReceiveHooks(entries, {
                  provenanceOf: (messageId) => provenance.get(messageId) ?? "unverifiable",
                  agentId: undefined,
                  isPassedThrough: (message) =>
                    !isForged(message) && isStructuredProtocolMessage(message.text),
                });
          let eligibleList = Array.isArray(eligible) ? eligible : [];
          clearOwedIdleNotificationsOnShutdown(
            messageList.filter((message) => !isForged(message)),
            this.store.setState,
          );
          if (eligibleList.length === 0 || this.drain.endSessionRequested) {
            pulseInboxFrameActivity();
            if (!marked) {
              pulseKeepAlive();
              yield sleep(pollIntervalMs);
            }
            continue;
          }
          let value = formatTeammateMessages(eligibleList, {
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
        yield sleep(pollIntervalMs);
      }
    } finally {
      this.polling = false;
    }
    return "done";
  }
}
//@ chunk-0yw3taqg.js:256323-256403 placement
/**
 * 空实现的快照存储（snapshot 原样返回、restore 返回空对象）。
 */
class NoopSnapshotStore {
  async snapshot(path, value) {
    return value;
  }
  async restore(path) {
    return {};
  }
  async flush() {}
}
//@ chunk-0yw3taqg.js:256403-256427 placement
var snapshotStoreStorage; // deferred: uses NoopSnapshotStore of its import cycle while loading; runs once the cycle is complete
var NOOP_SNAPSHOT_STORE;
deferInit("chunk-0yw3taqg.js:256403", () => {
  snapshotStoreStorage = new AsyncLocalStorage();
  NOOP_SNAPSHOT_STORE = new NoopSnapshotStore();
});
//@ chunk-0yw3taqg.js:256427-256466 placement
function getSnapshotStore() {
  return snapshotStoreStorage.getStore() ?? NOOP_SNAPSHOT_STORE;
}
//@ chunk-0yw3taqg.js:256466-256500 placement
function snapshotPathForSession() {
  return join(sessionTempDirRealpath(), getSessionId());
}
//@ chunk-0yw3taqg.js:256500-257123 placement
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
    import("../../services/syncedFiles/syncedFileSyncer.js")
      .then((mod) => mod.flushSyncedFiles())
      .catch(() => {});
    return;
  }
  afterTurn({ turnStartTime, signal, userEventUuids }) {
    import("../../services/syncedFiles/syncedFileSyncer.js")
      .then((mod) => mod.flushSyncedFiles())
      .catch(() => {});
    let turnEndUploadListener = this.turnEndUploadListener;
    let reason = this.workerDirSync?.then((sync) => {
      sync?.afterTurn({
        userEventUuids: [...userEventUuids],
      });
      return turnEndUploadListener === undefined ? undefined : sync?.drain();
    });
    if (reason !== undefined) turnEndUploadListener?.(reason);
    getSnapshotStore().snapshot(snapshotPathForSession(), {}).catch(logError);
  }
}
//@ chunk-0yw3taqg.js:257123-257332 placement
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
//@ chunk-0yw3taqg.js:257332-257528 placement
async function placeFilesByNameForTurn(request, context) {
  if (request.fileNames === undefined) return;
  try {
    let { placeFilesByName } = await import("../../utils/filePersistence/placeFilesByName.js");
    await placeFilesByName(request, context);
  } catch (error) {
    logFeatureBad("ccr_turn_handoff_files_by_name", "load_failed");
    logError(error);
  }
}
//@ chunk-0yw3taqg.js:257528-257740 placement
async function refreshFilesPlacedByName(request) {
  try {
    await ensurePlacedByNameRead();
    if (!hasConflictingPlacedFile(request)) return;
    let { refreshFilesPlacedByName } =
      await import("../../services/remoteTools/refreshFilesPlacedByName.lazy.js");
    await refreshFilesPlacedByName(request);
  } catch (error) {
    logForDiagnosticsNoPII("warn", "turn_handoff_files_by_name_refresh", {
      load_failed: 1,
    });
    logError(error);
  }
}
//@ chunk-0yw3taqg.js:257740-258098 layout
async function removePlacedCopiesOfDeletedFiles(deletedFileUuids) {
  try {
    if (deletedFileUuids.size === 0 || !isFilePersistenceEnabled()) return;
    await ensurePlacedByNameRead();
    if ([...filesPlacedByNameRegistry().values()].some((placed) => deletedFileUuids.has(placed.fileUuid))) {
      let { removePlacedCopiesOf } =
        await import("../../services/remoteTools/refreshFilesPlacedByName.lazy.js");
      await removePlacedCopiesOf(deletedFileUuids);
    }
  } catch (error) {
    logForDiagnosticsNoPII("warn", "turn_handoff_files_by_name_refresh", {
      load_failed: 1,
      of_deleted_uploads: 1,
    });
    logFeatureBad("bridge_attachment_deleted_copy", "placed_copies_load_failed");
    logError(error);
  }
}
//@ chunk-0yw3taqg.js:258098-258172 placement
var UNPLANNABLE_REASONS = {
  peer: 1,
  file_kinds: 2,
  prompt_hook: 3,
  unplannable: 4,
  text_not_typed: 5,
};
export {
  restoreTaskListAtBoot,
  removePlacedCopiesOfDeletedFiles,
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
