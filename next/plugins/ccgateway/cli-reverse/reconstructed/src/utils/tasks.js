/**
 * utils/tasks.ts
 *
 * 任务列表存储：<配置目录>/tasks/<listId>/<id>.json（或 v5 存储）、文件锁、high-water mark、创建/读取/更新/删除/依赖/认领
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/tasks.ts
 * pieces: chunk-0n43rj0b.js (2), chunk-ah34pb7m.js (1), chunk-e6aww6q8.js (1), chunk-ha3km179.js (2), chunk-nw7jbebs.js (49), chunk-p7xejzdb.js (1)
 * attribution: placement 7, fingerprint 10, callgraph-fingerprint 5, affinity 1, layout 29, file-local 3, callgraph-witnessed 1
 */
import { join } from "path";
import { readFile, writeFile, readdir, unlink } from "fs/promises";
import { swarmHostState } from "./swarm/hostState.js";
import {
  ID_CONFLICT_ERRNO_CODES,
  HIGH_WATER_MARK_FILE,
  MAX_CREATE_ID_ATTEMPTS,
  TaskSchema,
} from "../tools/TaskListTool/TaskListTool.js";
import { logError } from "./log.js";
import { STORAGE_SPACES } from "./storage/storageSpaces.js";
import {
  getErrnoCode,
  errnoShapedCode,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  errorMessage,
  isSadFsErrno,
  isEnvFsErrno,
} from "./errors.js";
import { storageErrorCode } from "./storage/storageErrors.js";
import { logForDebugging } from "./debug.js";
import { env } from "./env.js";
import { releaseLockQuietly, lock } from "./lockfile.js";
import { getTeammateContext, getTeamName } from "./teammate.js";
import { getSessionId, isDiskless } from "../bootstrap/state.js";
import { getClaudeConfigDir } from "./envUtils.js";
import { readAllPages, DEFAULT_MAX_PAGES } from "./pagedRead.js";
import { isStorageV5Enabled } from "./hoverRest.js";
import { getFsImplementation } from "./fsOperations.js";
import { jsonStringify, jsonParse } from "./slowOperations.js";
import { createJitteredBackoff } from "./backoff.js";
import { sleep } from "./sleep.js";
import { todoToolsEnabled } from "./sessionKind.js";
import { count } from "./collections.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-nw7jbebs.js:5306-5360 callgraph-fingerprint = notifyTasksUpdated (0.391)
/**
 * 发出任务列表已更新事件（UI 刷新）。
 */
function notifyTasksUpdated() {
  try {
    swarmHostState().taskList.updated.emit();
  } catch {}
}
//@ chunk-nw7jbebs.js:5656-5773 affinity
function isClaimedIdConflict(error) {
  return (
    error.code === "AlreadyExists" ||
    (error.code === "Failed" &&
      error.telemetryCode !== undefined &&
      ID_CONFLICT_ERRNO_CODES.has(error.telemetryCode))
  );
}
//@ chunk-nw7jbebs.js:5773-5855 fingerprint = LOCK_OPTIONS (0.866)
/**
 * 任务文件锁选项（30 次重试，5–100ms）。
 */
var LOCK_OPTIONS_2 = {
  retries: {
    retries: 30,
    minTimeout: 5,
    maxTimeout: 100,
  },
  onCompromised: (error) => logError(error),
};
//@ chunk-nw7jbebs.js:5855-5891 layout
function getHighWaterMarkPath(taskListId) {
  return join(getTaskOutputDir(taskListId), HIGH_WATER_MARK_FILE);
}
//@ chunk-nw7jbebs.js:5891-5937 layout
async function readHighWaterMark(taskListId, store) {
  return (await tryReadHighWaterMark(taskListId, store)) ?? 0;
}
//@ chunk-nw7jbebs.js:5937-6303 layout
/**
 * 读取 high-water mark（失败返回 null）。
 */
async function tryReadHighWaterMark(taskListId, store) {
  if (store) {
    let readResult = await store.read([
      STORAGE_SPACES.taskListHighWaterMark(sanitizePathComponent(taskListId)),
    ]);
    if (!readResult.ok) return null;
    let item = readResult.value.items[0];
    if (!item?.found) return 0;
    let text = parseInt(Buffer.from(item.value).toString("utf8").trim(), 10);
    return isNaN(text) ? null : text;
  }
  let highWaterMarkPath = getHighWaterMarkPath(taskListId);
  try {
    let trimmed = (await readFile(highWaterMarkPath, "utf8")).trim();
    let value = parseInt(trimmed, 10);
    return isNaN(value) ? null : value;
  } catch (error) {
    return getErrnoCode(error) === "ENOENT" ? 0 : null;
  }
}
//@ chunk-nw7jbebs.js:6303-6663 layout
/**
 * 写 high-water mark。
 */
async function writeHighWaterMark(taskListId, value, store) {
  if (store) {
    let writeResult = await store.write(
      STORAGE_SPACES.taskListHighWaterMark(sanitizePathComponent(taskListId)),
      String(value),
      {
        publishDiscipline: "inPlace",
      },
    );
    if (!writeResult.ok) {
      let errnoCode = errnoShapedCode(storageErrorCode(writeResult.error));
      throw Object.assign(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `[Tasks] high-water mark write failed: ${writeResult.error.code}`,
          "tasks high-water mark v5 write failed",
        ),
        errnoCode === undefined
          ? {}
          : {
              code: errnoCode,
            },
      );
    }
    return;
  }
  let highWaterMarkPath = getHighWaterMarkPath(taskListId);
  await writeFile(highWaterMarkPath, String(value), {
    encoding: "utf8",
  });
}
//@ chunk-nw7jbebs.js:6663-6795 layout
async function recordSkippedTaskId(taskListId, taskId, store) {
  try {
    if (taskId > (await readHighWaterMark(taskListId, store)))
      await writeHighWaterMark(taskListId, taskId, store);
  } catch (error) {
    logForDebugging(`[Tasks] could not record skipped task id ${taskId}: ${errorMessage(error)}`);
  }
}
//@ chunk-nw7jbebs.js:6795-6862 fingerprint = isTodoV2Enabled (1)
/**
 * 任务工具（TaskCreate/Get/Update/List）是否启用：CLAUDE_CODE_ENABLE_TASKS !== false。
 */
function isTaskToolsEnabled() {
  if (env.CLAUDE_CODE_ENABLE_TASKS === false) return false;
  return true;
}
//@ chunk-nw7jbebs.js:6862-7765 callgraph-fingerprint = resetTaskList (0.191)
/**
 * 重置任务列表：全部任务已完成时才删除，并先把最大 id 记入 high-water mark，避免 id 复用。
 */
async function resetTaskList(taskListId, store) {
  let dir = getTaskOutputDir(taskListId);
  let lock;
  try {
    lock = await lockTaskList(taskListId, store);
    let deletedIds = [];
    if (store) {
      let storedIds = await listTaskIdsFromStore(store, taskListId);
      if (storedIds === null) return false;
      deletedIds = storedIds.filter((taskId) => !taskId.startsWith("."));
      if (deletedIds.length > 0) {
        let taskId_2 = await store.read(deletedIds.map((deleted) => getTaskStorageKey(taskListId, deleted)));
        if (!taskId_2.ok) {
          logForDebugging(
            `[Tasks] Failed to read task list ${taskListId} before a reset: ${taskId_2.error.code}`,
          );
          return false;
        }
        if (taskId_2.value.items.length !== deletedIds.length) return false;
        for (let [file, filePath] of taskId_2.value.items.entries()) {
          if (!filePath.found) continue;
          let taskJson = parseTaskJson(deletedIds[file], Buffer.from(filePath.value).toString("utf8"));
          if (taskJson === null) continue;
          if (taskJson.status !== "completed") return false;
        }
      }
    } else if ((await listTasks(taskListId)).some((removed) => removed.status !== "completed")) return false;
    let currentHighest = store ? maxNumericId(deletedIds) : await findHighestTaskIdFromFiles(taskListId);
    if (currentHighest > 0) {
      let existingMark = await readHighWaterMark(taskListId, store);
      if (currentHighest > existingMark) await writeHighWaterMark(taskListId, currentHighest, store);
    }
    if (store)
      for (let remaining of deletedIds)
        await store.delete(STORAGE_SPACES.task(sanitizePathComponent(taskListId), remaining));
    else {
      let files;
      try {
        files = await readdir(dir);
      } catch {
        files = [];
      }
      for (let file of files)
        if (file.endsWith(".json") && !file.startsWith(".")) {
          let filePath = join(dir, file);
          try {
            await unlink(filePath);
          } catch {}
        }
    }
    notifyTasksUpdated();
    return true;
  } finally {
    await releaseLockQuietly(lock, "[Tasks] resetTaskList");
  }
}
//@ chunk-nw7jbebs.js:7765-7951 fingerprint = getTaskListId (0.56)
/**
 * 当前任务列表 id：CLAUDE_CODE_TASK_LIST_ID > 队友所属团队 > 团队名/会话列表/lead 团队 > 会话 id。
 */
function getTaskListId() {
  if (env.CLAUDE_CODE_TASK_LIST_ID) return env.CLAUDE_CODE_TASK_LIST_ID;
  let { sessionListId, leaderTeamName } = swarmHostState().taskList;
  let teammateCtx = getTeammateContext();
  if (teammateCtx) return sessionListId ?? teammateCtx.teamName;
  return getTeamName() || sessionListId || leaderTeamName || getSessionId();
}
//@ chunk-nw7jbebs.js:7951-8006 file-local
/**
 * 把列表/任务 id 净化为安全路径段（非 [A-Za-z0-9_-] 换成 -）。
 */
function sanitizePathComponent(input) {
  return input.replace(/[^a-zA-Z0-9_-]/g, "-");
}
//@ chunk-nw7jbebs.js:8006-8051 layout = getTaskOutputDir (1)
function getTaskOutputDir(taskId) {
  return join(getClaudeConfigDir(), "tasks", sanitizePathComponent(taskId));
}
//@ chunk-nw7jbebs.js:8051-8100 callgraph-fingerprint = getTaskPath (1)
/**
 * 任务文件路径 <配置目录>/tasks/<listId>/<taskId>.json。
 */
function getTaskPath(taskListId, taskId) {
  return join(getTaskOutputDir(taskListId), `${sanitizePathComponent(taskId)}.json`);
}
//@ chunk-nw7jbebs.js:8100-8144 layout
function getTaskStorageKey(taskListId, taskId) {
  return STORAGE_SPACES.task(sanitizePathComponent(taskListId), sanitizePathComponent(taskId));
}
//@ chunk-nw7jbebs.js:8144-8612 layout
async function listTaskIdsFromStore(store, taskListId) {
  let query = {
    namespace: "task",
    listId: sanitizePathComponent(taskListId),
  };
  let ids = [];
  let allPages = await readAllPages(
    (cursor) =>
      store.listEntries(query, {
        cursor,
        skipKeyStats: true,
      }),
    (page) => {
      for (let entry of page)
        if (entry.kind === "key" && entry.key.namespace === "task" && "taskId" in entry.key)
          ids.push(entry.key.taskId);
    },
  );
  switch (allPages.status) {
    case "done":
      return ids;
    case "error":
      logForDebugging(`[Tasks] Failed to list task list ${taskListId}: ${allPages.error.code}`);
      return null;
    case "capped":
      logForDebugging(
        `[Tasks] Listing task list ${taskListId} exceeded ${DEFAULT_MAX_PAGES} pages; treating the listing as failed`,
      );
      return null;
  }
}
//@ chunk-nw7jbebs.js:8612-9339 layout
async function listTasksFromStore(store, taskListId) {
  let query = {
    namespace: "task",
    listId: sanitizePathComponent(taskListId),
  };
  let tasks = [];
  let pages;
  try {
    pages = await readAllPages(
      (cursor) =>
        store.listEntries(query, {
          cursor,
          includeValue: true,
        }),
      (page) => {
        for (let entry of page) {
          if (entry.kind !== "key" || entry.key.namespace !== "task" || !("taskId" in entry.key)) continue;
          let taskId = entry.key.taskId;
          if (entry.value instanceof Uint8Array && taskId === sanitizePathComponent(taskId))
            tasks.push(parseTaskJson(taskId, Buffer.from(entry.value).toString("utf8")));
          else tasks.push(getTask(taskListId, taskId, store));
        }
      },
    );
  } finally {
    await Promise.allSettled(tasks);
  }
  switch (pages.status) {
    case "done":
      break;
    case "error":
      logForDebugging(`[Tasks] Failed to list task list ${taskListId}: ${pages.error.code}`);
      return null;
    case "capped":
      logForDebugging(
        `[Tasks] Listing task list ${taskListId} exceeded ${DEFAULT_MAX_PAGES} pages; treating the listing as failed`,
      );
      return null;
  }
  return (await Promise.all(tasks))
    .filter((key) => key !== null)
    .sort((value, entry_2) => Number(value.id) - Number(entry_2.id));
}
//@ chunk-nw7jbebs.js:9339-9410 layout
/**
 * 供 UI 读取任务列表（v5 存储或文件）。
 */
async function listTasksForStore(taskListId, store) {
  if (isStorageV5Enabled() && store !== undefined) return listTasksFromStore(store, taskListId);
  return listTasks(taskListId);
}
//@ chunk-nw7jbebs.js:9410-9558 layout
/**
 * 创建任务列表目录（或 v5 存储 scope）。
 */
async function ensureTaskListDir(taskListId, store) {
  let taskOutputDir = getTaskOutputDir(taskListId);
  try {
    if (isStorageV5Enabled() && store !== undefined) {
      await store.ensureScope({
        namespace: "task",
        listId: sanitizePathComponent(taskListId),
      });
      return;
    }
    await getFsImplementation().mkdir(taskOutputDir);
  } catch {}
}
//@ chunk-nw7jbebs.js:9558-9649 layout
function maxNumericId(ids) {
  let highest = 0;
  for (let id of ids) {
    let numericId = parseInt(id, 10);
    if (!isNaN(numericId) && numericId > highest) highest = numericId;
  }
  return highest;
}
//@ chunk-nw7jbebs.js:9649-9984 callgraph-fingerprint = findHighestTaskIdFromFiles (0.53)
/**
 * 从文件名（或 v5 存储键）找最大任务 id。
 */
async function findHighestTaskIdFromFiles(taskListId, store) {
  if (store) {
    let ids = await listTaskIdsFromStore(store, taskListId);
    if (ids === null)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        "[Tasks] Could not list the task list to determine its highest task id",
      );
    return maxNumericId(ids);
  }
  let dir = getTaskOutputDir(taskListId);
  let files;
  try {
    files = await readdir(dir);
  } catch {
    return 0;
  }
  let highest = 0;
  for (let file of files) {
    if (!file.endsWith(".json")) continue;
    let taskId = parseInt(file.replace(".json", ""), 10);
    if (!isNaN(taskId) && taskId > highest) highest = taskId;
  }
  return highest;
}
//@ chunk-nw7jbebs.js:9984-10074 file-local
/**
 * 最高任务 id = max(现有文件最大 id, high-water mark)。
 */
async function findHighestTaskId(taskListId, store) {
  let [fromFiles, fromMark] = await Promise.all([
    findHighestTaskIdFromFiles(taskListId, store),
    readHighWaterMark(taskListId, store),
  ]);
  return Math.max(fromFiles, fromMark);
}
//@ chunk-nw7jbebs.js:10074-11057 layout
/**
 * 创建任务：在列表锁内取最高 id+1 写入（v5 存储 ifAbsent 冲突时递增重试），返回新 id。
 */
async function createTask(taskListId, taskData, store) {
  let lock;
  try {
    lock = await lockTaskList(taskListId, store);
    let highestTaskId = await findHighestTaskId(taskListId, store);
    let nextId = String(highestTaskId + 1);
    if (store)
      for (let idx = 1; ; idx++) {
        let task = {
          id: nextId,
          ...taskData,
        };
        let writeResult = await store.write(
          getTaskStorageKey(taskListId, nextId),
          jsonStringify(task, null, 2),
          {
            precondition: {
              type: "ifAbsent",
            },
          },
        );
        if (writeResult.ok) break;
        if (!isClaimedIdConflict(writeResult.error))
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `[Tasks] Failed to create task ${nextId}: ${writeResult.error.code}`,
            "[Tasks] v5 task create write failed",
          );
        let telemetryCode = writeResult.error.code === "Failed" ? writeResult.error.telemetryCode : undefined;
        logForDebugging(
          `[Tasks] createTask: task id ${nextId} is held by an entry the listing did not report (${telemetryCode ?? writeResult.error.code}); taking the next id`,
        );
        await recordSkippedTaskId(taskListId, Number(nextId), store);
        if (idx >= MAX_CREATE_ID_ATTEMPTS)
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `[Tasks] Failed to create a task: could not claim a free task id after ${MAX_CREATE_ID_ATTEMPTS} attempts; last tried ${getTaskPath(taskListId, nextId)}, which exists and could not be claimed \u2014 the task listing may have failed, or the entry is not a task file`,
            "[Tasks] v5 task create gave up: no free task id",
          );
        nextId = String(Number(nextId) + 1);
      }
    else {
      let error = {
        id: nextId,
        ...taskData,
      };
      let taskPath = getTaskPath(taskListId, nextId);
      await writeFile(taskPath, jsonStringify(error, null, 2), {
        encoding: "utf8",
      });
    }
    notifyTasksUpdated();
    return nextId;
  } finally {
    await releaseLockQuietly(lock, "[Tasks] createTask");
  }
}
//@ chunk-nw7jbebs.js:11057-11323 fingerprint = getTask (0.498)
/**
 * 把 JSON 文本按 Task schema 解析。
 */
function parseTaskJson(taskId, json) {
  try {
    let data = jsonParse(json);
    let parsed = TaskSchema().safeParse(data);
    if (!parsed.success) {
      logForDebugging(`[Tasks] Task ${taskId} failed schema validation: ${parsed.error.message}`);
      return null;
    }
    return parsed.data;
  } catch (e) {
    logForDebugging(`[Tasks] Failed to read task ${taskId}: ${errorMessage(e)}`);
    if (!(e instanceof SyntaxError)) logError(e);
    return null;
  }
}
//@ chunk-nw7jbebs.js:11323-11551 layout
async function readTaskFromStore(store, taskListId, taskId) {
  let readResult = await store.read([getTaskStorageKey(taskListId, taskId)]);
  if (!readResult.ok) {
    logForDebugging(`[Tasks] Failed to read task ${taskId}: ${readResult.error.code}`);
    return null;
  }
  let item = readResult.value.items[0];
  if (!item.found) return null;
  return parseTaskJson(taskId, Buffer.from(item.value).toString("utf8"));
}
//@ chunk-nw7jbebs.js:11551-12559 layout
/**
 * 把一组任务写回空任务列表（会话恢复用），wholeOrNothing 时部分失败会回滚。
 */
async function restoreTaskList(
  taskListId,
  tasks,
  highWaterMark,
  store,
  { wholeOrNothing: options = false } = {},
) {
  let lock;
  let restoredCount = 0;
  let ids = [];
  let restoreAll = async () => {
    let index = 0;
    for (let taskId of ids) {
      let result;
      try {
        if (store) {
          let deleteResult = await store.delete(getTaskStorageKey(taskListId, taskId));
          result = deleteResult.ok ? undefined : deleteResult.error.code;
        } else await unlink(getTaskPath(taskListId, taskId));
      } catch (error) {
        let errnoCode = getErrnoCode(error);
        result = errnoCode === "ENOENT" ? undefined : (errnoCode ?? errorMessage(error));
      }
      if (result !== undefined) {
        index++;
        logForDebugging(`[Tasks] restoreTaskList: task ${taskId} not taken back: ${result}`);
      }
    }
    return index;
  };
  try {
    lock = await lockTaskList(taskListId, store);
    if ((await findHighestTaskId(taskListId, store)) > 0)
      return {
        restored: false,
        written: restoredCount,
      };
    for (let task of tasks) {
      if (store) {
        let key = await store.write(getTaskStorageKey(taskListId, task.id), jsonStringify(task, null, 2), {
          precondition: {
            type: "ifAbsent",
          },
        });
        if (key.ok) {
          restoredCount++;
          ids.push(task.id);
        } else logForDebugging(`[Tasks] restoreTaskList: task ${task.id} not written: ${key.error.code}`);
        continue;
      }
      try {
        await writeFile(getTaskPath(taskListId, task.id), jsonStringify(task, null, 2), {
          encoding: "utf8",
          flag: "wx",
        });
        restoredCount++;
        ids.push(task.id);
      } catch (error) {
        logForDebugging(
          `[Tasks] restoreTaskList: task ${task.id} not written: ${getErrnoCode(error) ?? "unknown"}`,
        );
      }
    }
    if (options && restoredCount < tasks.length) {
      let error = await restoreAll();
      return {
        restored: false,
        written: 0,
        refused: tasks.length - restoredCount,
        ...(error > 0 && {
          left: error,
        }),
      };
    }
    await writeHighWaterMark(taskListId, highWaterMark, store);
  } catch (error) {
    if (options) await restoreAll();
    throw error;
  } finally {
    await releaseLockQuietly(lock, "[Tasks] restoreTaskList");
  }
  notifyTasksUpdated();
  return {
    restored: true,
    written: restoredCount,
  };
}
//@ chunk-nw7jbebs.js:12559-13092 layout
/**
 * 按指定 id 写入任务（已存在不覆盖），并抬高 high-water mark。
 */
async function writeTaskUnderId(taskListId, task, store) {
  let lock;
  try {
    lock = await lockTaskList(taskListId, store);
    let written = false;
    if (store) {
      let writeResult = await store.write(
        getTaskStorageKey(taskListId, task.id),
        jsonStringify(task, null, 2),
        {
          precondition: {
            type: "ifAbsent",
          },
        },
      );
      if (!writeResult.ok && !isClaimedIdConflict(writeResult.error))
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `[Tasks] Failed to write task ${task.id}: ${writeResult.error.code}`,
          "[Tasks] v5 task write under id failed",
        );
      written = writeResult.ok;
    } else
      try {
        await writeFile(getTaskPath(taskListId, task.id), jsonStringify(task, null, 2), {
          encoding: "utf8",
          flag: "wx",
        });
        written = true;
      } catch (error) {
        if (getErrnoCode(error) !== "EEXIST") throw error;
      }
    let error = Number(task.id);
    if (Number.isSafeInteger(error) && error > (await readHighWaterMark(taskListId, store)))
      await writeHighWaterMark(taskListId, error, store);
    if (written) notifyTasksUpdated();
    return written;
  } finally {
    await releaseLockQuietly(lock, "[Tasks] writeTaskUnderId");
  }
}
//@ chunk-nw7jbebs.js:13092-13243 layout
/**
 * 把 high-water mark 抬高到给定值（只增）。
 */
async function raiseTaskIdMark(taskListId, mark, store) {
  let lock;
  try {
    lock = await lockTaskList(taskListId, store);
    if (mark <= (await readHighWaterMark(taskListId, store))) return false;
    await writeHighWaterMark(taskListId, mark, store);
    return true;
  } finally {
    await releaseLockQuietly(lock, "[Tasks] raiseTaskIdMark");
  }
}
//@ chunk-nw7jbebs.js:13243-13636 layout
/**
 * 读取单个任务（v5 存储或 JSON 文件，schema 校验），不存在或损坏返回 null。
 */
async function getTask(taskListId, taskId, store) {
  if (store) return readTaskFromStore(store, taskListId, taskId);
  let taskPath = getTaskPath(taskListId, taskId);
  try {
    let file = await readFile(taskPath, "utf8");
    let parsed = jsonParse(file);
    let schemaResult = TaskSchema().safeParse(parsed);
    if (!schemaResult.success) {
      logForDebugging(`[Tasks] Task ${taskId} failed schema validation: ${schemaResult.error.message}`);
      return null;
    }
    return schemaResult.data;
  } catch (error) {
    if (getErrnoCode(error) === "ENOENT") return null;
    logForDebugging(`[Tasks] Failed to read task ${taskId}: ${errorMessage(error)}`, {
      level: "error",
    });
    if (!(error instanceof SyntaxError) && !isSadFsErrno(error) && !isEnvFsErrno(error)) logError(error);
    return null;
  }
}
//@ chunk-nw7jbebs.js:13636-13811 layout
async function writeTaskMerged(taskListId, taskId, updates, store) {
  if (store) return updateTaskInStoreMerged(store, taskListId, taskId, updates);
  let existing = await getTask(taskListId, taskId);
  if (!existing) return null;
  let updated = {
    ...existing,
    ...updates,
    id: taskId,
  };
  let path = getTaskPath(taskListId, taskId);
  await writeFile(path, jsonStringify(updated, null, 2), {
    encoding: "utf8",
  });
  notifyTasksUpdated();
  return updated;
}
//@ chunk-nw7jbebs.js:13811-13831 layout
var MAX_STORE_UPDATE_ATTEMPTS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var storeUpdateBackoff;
deferInit("chunk-nw7jbebs.js:13811", () => {
  MAX_STORE_UPDATE_ATTEMPTS = 5;
  storeUpdateBackoff = createJitteredBackoff(50);
});
//@ chunk-nw7jbebs.js:13831-14550 layout
async function updateTaskInStore(store, taskListId, taskId, mutate) {
  let taskStorageKey = getTaskStorageKey(taskListId, taskId);
  for (let idx = 1; ; idx++) {
    let mutation = await store.update(taskStorageKey, (task) => {
      let currentTask =
        task === undefined ? null : parseTaskJson(taskId, Buffer.from(task.value).toString("utf8"));
      let result = mutate(currentTask);
      return "write" in result
        ? {
            write: jsonStringify(result.write, null, 2),
            result: result.result,
          }
        : {
            skip: true,
            result: result.result,
          };
    });
    if (mutation.ok) {
      if (mutation.value.written) notifyTasksUpdated();
      return mutation.value.result;
    }
    if (
      !(mutation.error.code === "Unavailable" && mutation.error.telemetryCode === "LockSuspect") ||
      idx >= MAX_STORE_UPDATE_ATTEMPTS
    ) {
      logForDebugging(
        `[Tasks] update of task ${taskId} failed after ${idx} attempt(s): ${mutation.error.code}${"telemetryCode" in mutation.error && mutation.error.telemetryCode ? ` (${mutation.error.telemetryCode})` : ""}`,
      );
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `[Tasks] Failed to update task ${taskId}: ${mutation.error.code}`,
        "[Tasks] v5 task update write failed",
      );
    }
    await (mutation.error.retryAfterMs !== undefined
      ? sleep(mutation.error.retryAfterMs)
      : storeUpdateBackoff(idx));
  }
}
//@ chunk-nw7jbebs.js:14550-14592 file-local
function mergeTaskFields(task, updates, taskId) {
  return {
    ...task,
    ...updates,
    id: taskId,
  };
}
//@ chunk-nw7jbebs.js:14592-14722 layout
async function updateTaskInStoreMerged(store, taskListId, taskId, updates) {
  return (
    (await updateTaskInStore(store, taskListId, taskId, (task) => {
      if (!task)
        return {
          result: null,
        };
      let merged = mergeTaskFields(task, updates, taskId);
      return {
        write: merged,
        result: merged,
      };
    })) ?? null
  );
}
//@ chunk-nw7jbebs.js:14722-15016 layout
/**
 * 更新任务：在任务锁内读出、合并更新并写回（v5 存储走原子 update）。
 */
async function updateTask(taskListId, taskId, updates, store) {
  let path = getTaskPath(taskListId, taskId);
  if (store) {
    if (!(await readTaskFromStore(store, taskListId, taskId))) return null;
    let lock;
    try {
      lock = await lockTaskList_2(taskListId, taskId);
      return await updateTaskInStoreMerged(store, taskListId, taskId, updates);
    } finally {
      await releaseLockQuietly(lock, "[Tasks] updateTask");
    }
  }
  if (!(await getTask(taskListId, taskId))) return null;
  let release;
  try {
    release = await lock(path, LOCK_OPTIONS_2);
    return await writeTaskMerged(taskListId, taskId, updates);
  } finally {
    await releaseLockQuietly(release, "[Tasks] updateTask");
  }
}
//@ chunk-nw7jbebs.js:15016-15578 callgraph-fingerprint = blockTask (0.499)
/**
 * 删除任务：抬高 high-water mark、删除文件/条目，并从其他任务的 blocks/blockedBy 中移除该 id。
 */
async function deleteTask(taskListId, taskId, store) {
  let path = getTaskPath(taskListId, taskId);
  try {
    let numericId = parseInt(taskId, 10);
    if (!isNaN(numericId)) {
      let currentMark = await readHighWaterMark(taskListId, store);
      if (numericId > currentMark) await writeHighWaterMark(taskListId, numericId, store);
    }
    if (store) {
      let lock = await store.delete(getTaskStorageKey(taskListId, taskId));
      if (!lock.ok) {
        logForDebugging(`[Tasks] Failed to delete task ${taskId}: ${lock.error.code}`);
        return false;
      }
      if (!lock.value.existed) return false;
    } else
      try {
        await unlink(path);
      } catch (e) {
        if (getErrnoCode(e) === "ENOENT") return false;
        throw e;
      }
    let allTasks = await listTasks(taskListId, store);
    for (let task of allTasks) {
      let newBlocks = task.blocks.filter((id) => id !== taskId);
      let newBlockedBy = task.blockedBy.filter((id) => id !== taskId);
      if (newBlocks.length !== task.blocks.length || newBlockedBy.length !== task.blockedBy.length)
        await updateTask(
          taskListId,
          task.id,
          {
            blocks: newBlocks,
            blockedBy: newBlockedBy,
          },
          store,
        );
    }
    notifyTasksUpdated();
    return true;
  } catch {
    return false;
  }
}
//@ chunk-nw7jbebs.js:15578-15859 callgraph-witnessed = listTasks (1)
/**
 * 列出任务列表中全部任务（按数字 id 排序）。
 */
async function listTasks(taskListId, store) {
  if (store) return (await listTasksFromStore(store, taskListId)) ?? [];
  let dir = getTaskOutputDir(taskListId);
  let files;
  try {
    files = await readdir(dir);
  } catch {
    return [];
  }
  let taskIds = files.filter((file) => file.endsWith(".json")).map((file) => file.replace(".json", ""));
  return (await Promise.all(taskIds.map((id) => getTask(taskListId, id))))
    .filter((t) => t !== null)
    .sort((taskIds, files) => Number(taskIds.id) - Number(files.id));
}
//@ chunk-nw7jbebs.js:15859-15902 layout
/**
 * 是否为规范任务 id（正整数字符串）。
 */
function isCanonicalTaskId(id) {
  return /^[1-9]\d*$/.test(id);
}
//@ chunk-nw7jbebs.js:15902-16347 layout
/**
 * 读取全部规范 id 的任务与最高 id（快照）。
 */
async function snapshotTaskList(taskListId, store) {
  let ids;
  if (store) ids = await listTaskIdsFromStore(store, taskListId);
  else
    try {
      ids = (await readdir(getTaskOutputDir(taskListId)))
        .filter((file) => file.endsWith(".json"))
        .map((file_2) => file_2.replace(".json", ""));
    } catch (error) {
      ids = getErrnoCode(error) === "ENOENT" ? [] : null;
    }
  if (ids === null) return null;
  let sorted = ids.filter(isCanonicalTaskId).sort((file_3, file_4) => Number(file_3) - Number(file_4));
  let results = await Promise.all(sorted.map((id) => getTask(taskListId, id, store)));
  let file_5 = await tryReadHighWaterMark(taskListId, store);
  if (file_5 === null) return null;
  let filtered = results.filter((t, file_6) => t?.id === sorted[file_6]);
  return {
    tasks: filtered.length === sorted.length ? filtered : null,
    highestId: Math.max(file_5, maxNumericId(ids)),
  };
}
//@ chunk-nw7jbebs.js:16347-16456 layout
/**
 * 合并 metadata，值为 null 的键删除。
 */
function mergeTaskMetadata(metadata, patch) {
  let merged = {
    ...metadata,
  };
  for (let [key, value] of Object.entries(patch))
    if (value === null) delete merged[key];
    else merged[key] = value;
  return merged;
}
//@ chunk-nw7jbebs.js:16456-16705 fingerprint = deleteTask (1)
/**
 * 建立依赖：from.blocks 加 to、to.blockedBy 加 from。
 */
async function blockTask(taskListId, fromTaskId, toTaskId, store) {
  let [fromTask, toTask] = await Promise.all([
    getTask(taskListId, fromTaskId, store),
    getTask(taskListId, toTaskId, store),
  ]);
  if (!fromTask || !toTask) return false;
  if (!fromTask.blocks.includes(toTaskId))
    await updateTask(
      taskListId,
      fromTaskId,
      {
        blocks: [...fromTask.blocks, toTaskId],
      },
      store,
    );
  if (!toTask.blockedBy.includes(fromTaskId))
    await updateTask(
      taskListId,
      toTaskId,
      {
        blockedBy: [...toTask.blockedBy, fromTaskId],
      },
      store,
    );
  return true;
}
//@ chunk-nw7jbebs.js:16705-16837 layout
/**
 * 确保任务列表锁文件 <任务目录>/.lock 存在（wx 创建，已存在忽略），返回其路径。
 */
async function ensureTaskListLockFile(taskListId, store) {
  await ensureTaskListDir(taskListId, store);
  let lockPath = join(getTaskOutputDir(taskListId), ".lock");
  try {
    await getFsImplementation().mkdir(getTaskOutputDir(taskListId));
    await writeFile(lockPath, "", {
      flag: "wx",
    });
  } catch {}
  return lockPath;
}
//@ chunk-nw7jbebs.js:16837-16919 layout
/**
 * 锁定任务列表：v5 键值存储走内存锁，否则用锁文件加锁，返回释放函数。
 */
async function lockTaskList(taskListId, store) {
  if (isDiskless()) return acquireInMemoryLock(sanitizePathComponent(taskListId));
  let taskListLockFile = await ensureTaskListLockFile(taskListId, store);
  return lock(taskListLockFile, LOCK_OPTIONS_2);
}
//@ chunk-nw7jbebs.js:16919-17065 placement = markMessagesAsReadByPredicate (0.489)
/**
 * 获取任务列表文件的锁（无盘会话用内存锁）。
 */
function lockTaskList_2(taskListId, taskId) {
  if (isDiskless())
    return acquireInMemoryLock(`${sanitizePathComponent(taskListId)}/${sanitizePathComponent(taskId)}`);
  let inboxPath = getTaskPath(taskListId, taskId);
  return lock(`${inboxPath}.v5-lock-anchor`, {
    lockfilePath: `${inboxPath}.lock`,
    realpath: false,
    ...LOCK_OPTIONS_2,
  });
}
//@ chunk-nw7jbebs.js:17065-17172 placement
function acquireInMemoryLock(key) {
  return new Promise((resolve) => {
    swarmHostState().taskList.locks.run(
      key,
      () => new Promise((resolve_2) => resolve(async () => resolve_2())),
    );
  });
}
//@ chunk-nw7jbebs.js:17172-18309 fingerprint = claimTask (0.852)
/**
 * 认领任务：检查存在、owner、是否完成、未完成的阻塞者，可选检查认领者是否已有进行中任务。
 */
async function claimTask(taskListId, taskId, claimantAgentId, options = {}, store) {
  let taskPath = getTaskPath(taskListId, taskId);
  if (!(await getTask(taskListId, taskId, store)))
    return {
      success: false,
      reason: "task_not_found",
    };
  if (options.checkAgentBusy) return claimTaskWithBusyCheck(taskListId, taskId, claimantAgentId, store);
  let release;
  try {
    release = store ? await lockTaskList_2(taskListId, taskId) : await lock(taskPath, LOCK_OPTIONS_2);
    if (store) {
      let claim = await updateTaskInStore(store, taskListId, taskId, (task) =>
        tryClaimTaskRecord(task, taskId, claimantAgentId, undefined),
      );
      if (claim !== "needs_open_blockers")
        return (
          claim ?? {
            success: false,
            reason: "task_not_found",
          }
        );
      let taskBeforeLock = await listTasks(taskListId, store);
      let openTaskIds = new Set(
        taskBeforeLock.filter((record) => record.status !== "completed").map((claimResult) => claimResult.id),
      );
      let ownerTask = await updateTaskInStore(store, taskListId, taskId, (task) =>
        tryClaimTaskRecord(task, taskId, claimantAgentId, openTaskIds),
      );
      return ownerTask === undefined || ownerTask === "needs_open_blockers"
        ? {
            success: false,
            reason: "task_not_found",
          }
        : ownerTask;
    }
    let task = await getTask(taskListId, taskId, store);
    if (!task)
      return {
        success: false,
        reason: "task_not_found",
      };
    if (task.owner && task.owner !== claimantAgentId)
      return {
        success: false,
        reason: "already_claimed",
        task,
      };
    if (task.status === "completed")
      return {
        success: false,
        reason: "already_resolved",
        task,
      };
    let allTasks = await listTasks(taskListId, store);
    let unresolvedTaskIds = new Set(allTasks.filter((t) => t.status !== "completed").map((t) => t.id));
    let blockedByTasks = task.blockedBy.filter((id) => unresolvedTaskIds.has(id));
    if (blockedByTasks.length > 0)
      return {
        success: false,
        reason: "blocked",
        task,
        blockedByTasks,
      };
    return {
      success: true,
      task: await writeTaskMerged(
        taskListId,
        taskId,
        {
          owner: claimantAgentId,
        },
        store,
      ),
    };
  } catch (error) {
    logForDebugging(`[Tasks] Failed to claim task ${taskId}: ${errorMessage(error)}`);
    logError(error);
    return {
      success: false,
      reason: "task_not_found",
    };
  } finally {
    await releaseLockQuietly(release, "[Tasks] claimTask");
  }
}
//@ chunk-nw7jbebs.js:18309-18817 layout = claimTask (0.787)
function tryClaimTaskRecord(task, taskId, claimantAgentId, openTaskIds) {
  if (!task)
    return {
      result: {
        success: false,
        reason: "task_not_found",
      },
    };
  if (task.owner && task.owner !== claimantAgentId)
    return {
      result: {
        success: false,
        reason: "already_claimed",
        task,
      },
    };
  if (task.status === "completed")
    return {
      result: {
        success: false,
        reason: "already_resolved",
        task,
      },
    };
  if (task.blockedBy.length > 0) {
    if (!openTaskIds)
      return {
        result: "needs_open_blockers",
      };
    let blockedByTasks = task.blockedBy.filter((id) => openTaskIds.has(id));
    if (blockedByTasks.length > 0)
      return {
        result: {
          success: false,
          reason: "blocked",
          task,
          blockedByTasks,
        },
      };
  }
  let claimant = mergeTaskFields(
    task,
    {
      owner: claimantAgentId,
    },
    taskId,
  );
  return {
    write: claimant,
    result: {
      success: true,
      task: claimant,
    },
  };
}
//@ chunk-nw7jbebs.js:18817-19678 fingerprint = claimTaskWithBusyCheck (0.926)
/**
 * 带"代理忙碌"检查的认领（在列表锁内）。
 */
async function claimTaskWithBusyCheck(taskListId, taskId, claimantAgentId, store) {
  let release;
  try {
    release = await lockTaskList(taskListId, store);
    let allTasks = await listTasks(taskListId, store);
    let task = allTasks.find((t) => t.id === taskId);
    if (!task)
      return {
        success: false,
        reason: "task_not_found",
      };
    if (task.owner && task.owner !== claimantAgentId)
      return {
        success: false,
        reason: "already_claimed",
        task,
      };
    if (task.status === "completed")
      return {
        success: false,
        reason: "already_resolved",
        task,
      };
    let unresolvedTaskIds = new Set(allTasks.filter((t) => t.status !== "completed").map((t) => t.id));
    let blockedByTasks = task.blockedBy.filter((id) => unresolvedTaskIds.has(id));
    if (blockedByTasks.length > 0)
      return {
        success: false,
        reason: "blocked",
        task,
        blockedByTasks,
      };
    let agentOpenTasks = allTasks.filter(
      (t) => t.status !== "completed" && t.owner === claimantAgentId && t.id !== taskId,
    );
    if (agentOpenTasks.length > 0)
      return {
        success: false,
        reason: "agent_busy",
        task,
        busyWithTasks: agentOpenTasks.map((t) => t.id),
      };
    return {
      success: true,
      task: await updateTask(
        taskListId,
        taskId,
        {
          owner: claimantAgentId,
        },
        store,
      ),
    };
  } catch (error) {
    logForDebugging(`[Tasks] Failed to claim task ${taskId} with busy check: ${errorMessage(error)}`);
    logError(error);
    return {
      success: false,
      reason: "task_not_found",
    };
  } finally {
    await releaseLockQuietly(release, "[Tasks] claimTaskWithBusyCheck");
  }
}
//@ chunk-nw7jbebs.js:19678-20333 fingerprint = unassignTeammateTasks (0.956)
/**
 * 队友退出/被终止时把其未完成任务改回 pending 无 owner，并生成通知文本。
 */
async function unassignTeammateTasks(teamName, teammateId, teammateName, reason, store) {
  let tasks = swarmHostState().taskList.sessionListId ?? teamName;
  let unresolvedAssignedTasks = (await listTasks(tasks, store)).filter(
    (t) => t.status !== "completed" && (t.owner === teammateId || t.owner === teammateName),
  );
  for (let task of unresolvedAssignedTasks)
    await updateTask(
      tasks,
      task.id,
      {
        owner: undefined,
        status: "pending",
      },
      store,
    );
  if (unresolvedAssignedTasks.length > 0)
    logForDebugging(`[Tasks] Unassigned ${unresolvedAssignedTasks.length} task(s) from ${teammateName}`);
  let notificationMessage = `${teammateName} ${reason === "terminated" ? "was terminated" : "has shut down"}.`;
  if (unresolvedAssignedTasks.length > 0) {
    let taskList = unresolvedAssignedTasks.map((t) => `#${t.id} "${t.subject}"`).join(", ");
    notificationMessage += ` ${unresolvedAssignedTasks.length} task(s) were unassigned: ${taskList}. Use TaskList to check availability and TaskUpdate with owner to reassign them to idle teammates.`;
  }
  return {
    unassignedTasks: unresolvedAssignedTasks.map((t) => ({
      id: t.id,
      subject: t.subject,
    })),
    notificationMessage,
  };
}
//@ chunk-e6aww6q8.js:3232917-3232950 placement
/**
 * 任务工具与 todo 工具都启用时才可用。
 */
function areTaskToolsEnabled() {
  return isTaskToolsEnabled() && todoToolsEnabled();
}
//@ chunk-0n43rj0b.js:5681-5789 placement
/**
 * 两个数组逐项全等。
 */
function arraysShallowEqual(firstArray, secondArray) {
  if (firstArray.length !== secondArray.length) return false;
  for (let idx = 0; idx < firstArray.length; idx++) if (firstArray[idx] !== secondArray[idx]) return false;
  return true;
}
//@ chunk-0n43rj0b.js:5789-5833 placement
function isNonEmptyString(value) {
  return value !== undefined && value.length > 0;
}
//@ chunk-ha3km179.js:76055-76143 placement
function textFromTaskCreateInput(input) {
  let text = input.input?.text;
  return typeof text === "string" && text.trim().length > 0 ? text : null;
}
//@ chunk-ha3km179.js:76143-76331 fingerprint = TASK_STATUSES (1)
var CHECKLIST_MARKER_STATUS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var MAX_CHECKLIST_LINE_CHARS;
var MAX_CHECKLIST_LINES;
deferInit("chunk-ha3km179.js:76143", () => {
  CHECKLIST_MARKER_STATUS = new Map([
    ["\u2713", "completed"],
    ["\u2714", "completed"],
    ["\u2705", "completed"],
    ["\u2731", "in_progress"],
    ["\u25CB", "pending"],
    ["\u25EF", "pending"],
    ["\u2022", "pending"],
  ]);
  MAX_CHECKLIST_LINE_CHARS = 512;
  MAX_CHECKLIST_LINES = 32;
});
//@ chunk-ah34pb7m.js:12634-12714 placement
/**
 * 统计既不是 ambient 也不是进程内队友的任务数。
 */
function countNonAmbientTasks(tasks) {
  return count(tasks, (task) => !task.ambient && task.taskType !== "in_process_teammate");
}
//@ chunk-p7xejzdb.js:14282-14352 fingerprint = getAgentStatuses (0.532)
/**
 * 把代理状态规范为 idle/waiting/busy。
 */
function getAgentStatuses(teamName) {
  return teamName === "idle" ? "idle" : teamName === "waiting" ? "waiting" : "busy";
}
export {
  areTaskToolsEnabled,
  isTaskToolsEnabled,
  isNonEmptyString,
  arraysShallowEqual,
  getTaskOutputDir,
  sanitizePathComponent,
  getTaskListId,
  listTasksForStore,
  listTasks,
  resetTaskList,
  MAX_CHECKLIST_LINE_CHARS,
  CHECKLIST_MARKER_STATUS,
  MAX_CHECKLIST_LINES,
  textFromTaskCreateInput,
  ensureTaskListDir,
  countNonAmbientTasks,
  snapshotTaskList,
  unassignTeammateTasks,
  claimTask,
  updateTask,
  createTask,
  deleteTask,
  getTask,
  mergeTaskMetadata,
  blockTask,
  notifyTasksUpdated,
  getAgentStatuses,
  isCanonicalTaskId,
  writeTaskUnderId,
  raiseTaskIdMark,
  findHighestTaskId,
  restoreTaskList,
};
