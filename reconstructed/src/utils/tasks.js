/**
 * utils/tasks.ts
 *
 * 任务列表存储：<配置目录>/tasks/<listId>/<id>.json（或 v5 存储）、文件锁、high-water mark、创建/读取/更新/删除/依赖/认领
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/tasks.ts
 * pieces: chunk-0n43rj0b.js (2), chunk-e6aww6q8.js (1), chunk-ha3km179.js (2), chunk-nw7jbebs.js (49), chunk-p7xejzdb.js (1)
 * attribution: placement 6, fingerprint 10, callgraph-fingerprint 5, affinity 1, layout 29, file-local 3, callgraph-witnessed 1
 */
import { join, join as join_2 } from "path";
import { readFile, writeFile, readdir, unlink } from "fs/promises";
import { ci } from "./swarm/hostState.js";
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

/**
 * 发出任务列表已更新事件（UI 刷新）。
 */
//@ chunk-nw7jbebs.js:5306-5360 callgraph-fingerprint = notifyTasksUpdated (0.391)
function notifyTasksUpdated() {
  try {
    ci().taskList.updated.emit();
  } catch {}
}
//@ chunk-nw7jbebs.js:5656-5773 affinity
function isClaimedIdConflict(error) {
  return (
    error.code === "AlreadyExists" ||
    (error.code === "Failed" &&
      error.telemetryCode !== void 0 &&
      ID_CONFLICT_ERRNO_CODES.has(error.telemetryCode))
  );
}
/**
 * 任务文件锁选项（30 次重试，5–100ms）。
 */
//@ chunk-nw7jbebs.js:5773-5855 fingerprint = LOCK_OPTIONS (0.866)
var LOCK_OPTIONS_2 = {
  retries: { retries: 30, minTimeout: 5, maxTimeout: 100 },
  onCompromised: (e) => logError(e),
};
//@ chunk-nw7jbebs.js:5855-5891 layout
function getHighWaterMarkPath(taskListId) {
  return join_2(getTaskOutputDir(taskListId), HIGH_WATER_MARK_FILE);
}
//@ chunk-nw7jbebs.js:5891-5937 layout
async function readHighWaterMark(taskListId, store) {
  return (await tryReadHighWaterMark(taskListId, store)) ?? 0;
}
/**
 * 读取 high-water mark（失败返回 null）。
 */
//@ chunk-nw7jbebs.js:5937-6303 layout
async function tryReadHighWaterMark(taskListId, store) {
  if (store) {
    let read = await store.read([STORAGE_SPACES.taskListHighWaterMark(sanitizePathComponent(taskListId))]);
    if (!read.ok) return null;
    let c = read.value.items[0];
    if (!c?.found) return 0;
    let y = parseInt(Buffer.from(c.value).toString("utf8").trim(), 10);
    return isNaN(y) ? null : y;
  }
  let r = getHighWaterMarkPath(taskListId);
  try {
    let trimmed = (await readFile(r, "utf8")).trim(),
      c = parseInt(trimmed, 10);
    return isNaN(c) ? null : c;
  } catch (error) {
    return getErrnoCode(error) === "ENOENT" ? 0 : null;
  }
}
/**
 * 写 high-water mark。
 */
//@ chunk-nw7jbebs.js:6303-6663 layout
async function writeHighWaterMark(taskListId, value, store) {
  if (store) {
    let write = await store.write(
      STORAGE_SPACES.taskListHighWaterMark(sanitizePathComponent(taskListId)),
      String(value),
      { publishDiscipline: "inPlace" },
    );
    if (!write.ok) {
      let y = errnoShapedCode(storageErrorCode(write.error));
      throw Object.assign(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `[Tasks] high-water mark write failed: ${write.error.code}`,
          "tasks high-water mark v5 write failed",
        ),
        y === void 0 ? {} : { code: y },
      );
    }
    return;
  }
  let s = getHighWaterMarkPath(taskListId);
  await writeFile(s, String(value), { encoding: "utf8" });
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
/**
 * 任务工具（TaskCreate/Get/Update/List）是否启用：CLAUDE_CODE_ENABLE_TASKS !== false。
 */
//@ chunk-nw7jbebs.js:6795-6862 fingerprint = isTodoV2Enabled (1)
function isTaskToolsEnabled() {
  if (env.CLAUDE_CODE_ENABLE_TASKS === !1) return !1;
  return !0;
}
/**
 * 重置任务列表：全部任务已完成时才删除，并先把最大 id 记入 high-water mark，避免 id 复用。
 */
//@ chunk-nw7jbebs.js:6862-7765 callgraph-fingerprint = resetTaskList (0.191)
async function resetTaskList(taskListId, store) {
  let dir = getTaskOutputDir(taskListId),
    s;
  try {
    s = await lockTaskList(taskListId, store);
    let c = [];
    if (store) {
      let a = await listTaskIdsFromStore(store, taskListId);
      if (a === null) return !1;
      if (((c = a.filter((h) => !h.startsWith("."))), c.length > 0)) {
        let read = await store.read(c.map((b) => getTaskStorageKey(taskListId, b)));
        if (!read.ok)
          return (
            logForDebugging(
              `[Tasks] Failed to read task list ${taskListId} before a reset: ${read.error.code}`,
            ),
            !1
          );
        if (read.value.items.length !== c.length) return !1;
        for (let [b, w] of read.value.items.entries()) {
          if (!w.found) continue;
          let x = parseTaskJson(c[b], Buffer.from(w.value).toString("utf8"));
          if (x === null) continue;
          if (x.status !== "completed") return !1;
        }
      }
    } else if ((await listTasks(taskListId)).some((h) => h.status !== "completed")) return !1;
    let y = store ? maxNumericId(c) : await findHighestTaskIdFromFiles(taskListId);
    if (y > 0) {
      let a = await readHighWaterMark(taskListId, store);
      if (y > a) await writeHighWaterMark(taskListId, y, store);
    }
    if (store) for (let a of c) await store.delete(STORAGE_SPACES.task(sanitizePathComponent(taskListId), a));
    else {
      let a;
      try {
        a = await readdir(dir);
      } catch {
        a = [];
      }
      for (let file of a)
        if (file.endsWith(".json") && !file.startsWith(".")) {
          let filePath = join_2(dir, file);
          try {
            await unlink(filePath);
          } catch {}
        }
    }
    return (notifyTasksUpdated(), !0);
  } finally {
    await releaseLockQuietly(s, "[Tasks] resetTaskList");
  }
}
/**
 * 当前任务列表 id：CLAUDE_CODE_TASK_LIST_ID > 队友所属团队 > 团队名/会话列表/lead 团队 > 会话 id。
 */
//@ chunk-nw7jbebs.js:7765-7951 fingerprint = getTaskListId (0.56)
function getTaskListId() {
  if (env.CLAUDE_CODE_TASK_LIST_ID) return env.CLAUDE_CODE_TASK_LIST_ID;
  let { sessionListId: sessionListId, leaderTeamName: leaderTeamName } = ci().taskList,
    teammateCtx = getTeammateContext();
  if (teammateCtx) return sessionListId ?? teammateCtx.teamName;
  return getTeamName() || sessionListId || leaderTeamName || getSessionId();
}
/**
 * 把列表/任务 id 净化为安全路径段（非 [A-Za-z0-9_-] 换成 -）。
 */
//@ chunk-nw7jbebs.js:7951-8006 file-local
function sanitizePathComponent(input) {
  return input.replace(/[^a-zA-Z0-9_-]/g, "-");
}
//@ chunk-nw7jbebs.js:8006-8051 layout = getTaskOutputDir (1)
function getTaskOutputDir(e) {
  return join_2(getClaudeConfigDir(), "tasks", sanitizePathComponent(e));
}
/**
 * 任务文件路径 <配置目录>/tasks/<listId>/<taskId>.json。
 */
//@ chunk-nw7jbebs.js:8051-8100 callgraph-fingerprint = getTaskPath (1)
function getTaskPath(taskListId, taskId) {
  return join_2(getTaskOutputDir(taskListId), `${sanitizePathComponent(taskId)}.json`);
}
//@ chunk-nw7jbebs.js:8100-8144 layout
function getTaskStorageKey(taskListId, taskId) {
  return STORAGE_SPACES.task(sanitizePathComponent(taskListId), sanitizePathComponent(taskId));
}
//@ chunk-nw7jbebs.js:8144-8612 layout
async function listTaskIdsFromStore(store, taskListId) {
  let r = { namespace: "task", listId: sanitizePathComponent(taskListId) },
    s = [],
    c = await readAllPages(
      (y) => store.listEntries(r, { cursor: y, skipKeyStats: !0 }),
      (y) => {
        for (let a of y)
          if (a.kind === "key" && a.key.namespace === "task" && "taskId" in a.key) s.push(a.key.taskId);
      },
    );
  switch (c.status) {
    case "done":
      return s;
    case "error":
      return (logForDebugging(`[Tasks] Failed to list task list ${taskListId}: ${c.error.code}`), null);
    case "capped":
      return (
        logForDebugging(
          `[Tasks] Listing task list ${taskListId} exceeded ${DEFAULT_MAX_PAGES} pages; treating the listing as failed`,
        ),
        null
      );
  }
}
//@ chunk-nw7jbebs.js:8612-9339 layout
async function listTasksFromStore(store, taskListId) {
  let r = { namespace: "task", listId: sanitizePathComponent(taskListId) },
    s = [],
    c;
  try {
    c = await readAllPages(
      (a) => store.listEntries(r, { cursor: a, includeValue: !0 }),
      (a) => {
        for (let h of a) {
          if (h.kind !== "key" || h.key.namespace !== "task" || !("taskId" in h.key)) continue;
          let taskId = h.key.taskId;
          if (h.value instanceof Uint8Array && taskId === sanitizePathComponent(taskId))
            s.push(parseTaskJson(taskId, Buffer.from(h.value).toString("utf8")));
          else s.push(getTask(taskListId, taskId, store));
        }
      },
    );
  } finally {
    await Promise.allSettled(s);
  }
  switch (c.status) {
    case "done":
      break;
    case "error":
      return (logForDebugging(`[Tasks] Failed to list task list ${taskListId}: ${c.error.code}`), null);
    case "capped":
      return (
        logForDebugging(
          `[Tasks] Listing task list ${taskListId} exceeded ${DEFAULT_MAX_PAGES} pages; treating the listing as failed`,
        ),
        null
      );
  }
  return (await Promise.all(s)).filter((a) => a !== null).sort((a, h) => Number(a.id) - Number(h.id));
}
/**
 * 供 UI 读取任务列表（v5 存储或文件）。
 */
//@ chunk-nw7jbebs.js:9339-9410 layout
async function Iii(taskListId, store) {
  if (isStorageV5Enabled() && store !== void 0) return listTasksFromStore(store, taskListId);
  return listTasks(taskListId);
}
/**
 * 创建任务列表目录（或 v5 存储 scope）。
 */
//@ chunk-nw7jbebs.js:9410-9558 layout
async function ensureTaskListDir(taskListId, store) {
  let r = getTaskOutputDir(taskListId);
  try {
    if (isStorageV5Enabled() && store !== void 0) {
      await store.ensureScope({ namespace: "task", listId: sanitizePathComponent(taskListId) });
      return;
    }
    await getFsImplementation().mkdir(r);
  } catch {}
}
//@ chunk-nw7jbebs.js:9558-9649 layout
function maxNumericId(ids) {
  let n = 0;
  for (let r of ids) {
    let s = parseInt(r, 10);
    if (!isNaN(s) && s > n) n = s;
  }
  return n;
}
/**
 * 从文件名（或 v5 存储键）找最大任务 id。
 */
//@ chunk-nw7jbebs.js:9649-9984 callgraph-fingerprint = findHighestTaskIdFromFiles (0.53)
async function findHighestTaskIdFromFiles(taskListId, store) {
  if (store) {
    let y = await listTaskIdsFromStore(store, taskListId);
    if (y === null)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        "[Tasks] Could not list the task list to determine its highest task id",
      );
    return maxNumericId(y);
  }
  let dir = getTaskOutputDir(taskListId),
    files;
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
/**
 * 最高任务 id = max(现有文件最大 id, high-water mark)。
 */
//@ chunk-nw7jbebs.js:9984-10074 file-local
async function findHighestTaskId(taskListId, store) {
  let [r, s] = await Promise.all([
    findHighestTaskIdFromFiles(taskListId, store),
    readHighWaterMark(taskListId, store),
  ]);
  return Math.max(r, s);
}
/**
 * 创建任务：在列表锁内取最高 id+1 写入（v5 存储 ifAbsent 冲突时递增重试），返回新 id。
 */
//@ chunk-nw7jbebs.js:10074-11057 layout
async function createTask(taskListId, taskData, store) {
  let s;
  try {
    s = await lockTaskList(taskListId, store);
    let c = await findHighestTaskId(taskListId, store),
      y = String(c + 1);
    if (store)
      for (let a = 1; ; a++) {
        let h = { id: y, ...taskData },
          write = await store.write(getTaskStorageKey(taskListId, y), jsonStringify(h, null, 2), {
            precondition: { type: "ifAbsent" },
          });
        if (write.ok) break;
        if (!isClaimedIdConflict(write.error))
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `[Tasks] Failed to create task ${y}: ${write.error.code}`,
            "[Tasks] v5 task create write failed",
          );
        let w = write.error.code === "Failed" ? write.error.telemetryCode : void 0;
        if (
          (logForDebugging(
            `[Tasks] createTask: task id ${y} is held by an entry the listing did not report (${w ?? write.error.code}); taking the next id`,
          ),
          await recordSkippedTaskId(taskListId, Number(y), store),
          a >= MAX_CREATE_ID_ATTEMPTS)
        )
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `[Tasks] Failed to create a task: could not claim a free task id after ${MAX_CREATE_ID_ATTEMPTS} attempts; last tried ${getTaskPath(taskListId, y)}, which exists and could not be claimed \u2014 the task listing may have failed, or the entry is not a task file`,
            "[Tasks] v5 task create gave up: no free task id",
          );
        y = String(Number(y) + 1);
      }
    else {
      let a = { id: y, ...taskData },
        h = getTaskPath(taskListId, y);
      await writeFile(h, jsonStringify(a, null, 2), { encoding: "utf8" });
    }
    return (notifyTasksUpdated(), y);
  } finally {
    await releaseLockQuietly(s, "[Tasks] createTask");
  }
}
/**
 * 把 JSON 文本按 Task schema 解析。
 */
//@ chunk-nw7jbebs.js:11057-11323 fingerprint = getTask (0.498)
function parseTaskJson(taskId, json) {
  try {
    let data = jsonParse(json),
      parsed = TaskSchema().safeParse(data);
    if (!parsed.success)
      return (
        logForDebugging(`[Tasks] Task ${taskId} failed schema validation: ${parsed.error.message}`),
        null
      );
    return parsed.data;
  } catch (error) {
    if (
      (logForDebugging(`[Tasks] Failed to read task ${taskId}: ${errorMessage(error)}`),
      !(error instanceof SyntaxError))
    )
      logError(error);
    return null;
  }
}
//@ chunk-nw7jbebs.js:11323-11551 layout
async function readTaskFromStore(store, taskListId, taskId) {
  let read = await store.read([getTaskStorageKey(taskListId, taskId)]);
  if (!read.ok) return (logForDebugging(`[Tasks] Failed to read task ${taskId}: ${read.error.code}`), null);
  let c = read.value.items[0];
  if (!c.found) return null;
  return parseTaskJson(taskId, Buffer.from(c.value).toString("utf8"));
}
/**
 * 把一组任务写回空任务列表（会话恢复用），wholeOrNothing 时部分失败会回滚。
 */
//@ chunk-nw7jbebs.js:11551-12559 layout
async function restoreTaskList(taskListId, tasks, highWaterMark, store, { wholeOrNothing: c = !1 } = {}) {
  let y,
    a = 0,
    h = [],
    b = async () => {
      let w = 0;
      for (let x of h) {
        let S;
        try {
          if (store) {
            let E = await store.delete(getTaskStorageKey(taskListId, x));
            S = E.ok ? void 0 : E.error.code;
          } else await unlink(getTaskPath(taskListId, x));
        } catch (error) {
          let P = getErrnoCode(error);
          S = P === "ENOENT" ? void 0 : (P ?? errorMessage(error));
        }
        if (S !== void 0) (w++, logForDebugging(`[Tasks] restoreTaskList: task ${x} not taken back: ${S}`));
      }
      return w;
    };
  try {
    if (((y = await lockTaskList(taskListId, store)), (await findHighestTaskId(taskListId, store)) > 0))
      return { restored: !1, written: a };
    for (let w of tasks) {
      if (store) {
        let write = await store.write(getTaskStorageKey(taskListId, w.id), jsonStringify(w, null, 2), {
          precondition: { type: "ifAbsent" },
        });
        if (write.ok) (a++, h.push(w.id));
        else logForDebugging(`[Tasks] restoreTaskList: task ${w.id} not written: ${write.error.code}`);
        continue;
      }
      try {
        (await writeFile(getTaskPath(taskListId, w.id), jsonStringify(w, null, 2), {
          encoding: "utf8",
          flag: "wx",
        }),
          a++,
          h.push(w.id));
      } catch (error) {
        logForDebugging(
          `[Tasks] restoreTaskList: task ${w.id} not written: ${getErrnoCode(error) ?? "unknown"}`,
        );
      }
    }
    if (c && a < tasks.length) {
      let w = await b();
      return { restored: !1, written: 0, refused: tasks.length - a, ...(w > 0 && { left: w }) };
    }
    await writeHighWaterMark(taskListId, highWaterMark, store);
  } catch (error) {
    if (c) await b();
    throw error;
  } finally {
    await releaseLockQuietly(y, "[Tasks] restoreTaskList");
  }
  return (notifyTasksUpdated(), { restored: !0, written: a });
}
/**
 * 按指定 id 写入任务（已存在不覆盖），并抬高 high-water mark。
 */
//@ chunk-nw7jbebs.js:12559-13092 layout
async function writeTaskUnderId(taskListId, task, store) {
  let s;
  try {
    s = await lockTaskList(taskListId, store);
    let c = !1;
    if (store) {
      let write = await store.write(getTaskStorageKey(taskListId, task.id), jsonStringify(task, null, 2), {
        precondition: { type: "ifAbsent" },
      });
      if (!write.ok && !isClaimedIdConflict(write.error))
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `[Tasks] Failed to write task ${task.id}: ${write.error.code}`,
          "[Tasks] v5 task write under id failed",
        );
      c = write.ok;
    } else
      try {
        (await writeFile(getTaskPath(taskListId, task.id), jsonStringify(task, null, 2), {
          encoding: "utf8",
          flag: "wx",
        }),
          (c = !0));
      } catch (error) {
        if (getErrnoCode(error) !== "EEXIST") throw error;
      }
    let y = Number(task.id);
    if (Number.isSafeInteger(y) && y > (await readHighWaterMark(taskListId, store)))
      await writeHighWaterMark(taskListId, y, store);
    if (c) notifyTasksUpdated();
    return c;
  } finally {
    await releaseLockQuietly(s, "[Tasks] writeTaskUnderId");
  }
}
/**
 * 把 high-water mark 抬高到给定值（只增）。
 */
//@ chunk-nw7jbebs.js:13092-13243 layout
async function raiseTaskIdMark(taskListId, mark, store) {
  let s;
  try {
    if (((s = await lockTaskList(taskListId, store)), mark <= (await readHighWaterMark(taskListId, store))))
      return !1;
    return (await writeHighWaterMark(taskListId, mark, store), !0);
  } finally {
    await releaseLockQuietly(s, "[Tasks] raiseTaskIdMark");
  }
}
/**
 * 读取单个任务（v5 存储或 JSON 文件，schema 校验），不存在或损坏返回 null。
 */
//@ chunk-nw7jbebs.js:13243-13636 layout
async function getTask(taskListId, taskId, store) {
  if (store) return readTaskFromStore(store, taskListId, taskId);
  let s = getTaskPath(taskListId, taskId);
  try {
    let c = await readFile(s, "utf8"),
      y = jsonParse(c),
      safeParse = TaskSchema().safeParse(y);
    if (!safeParse.success)
      return (
        logForDebugging(`[Tasks] Task ${taskId} failed schema validation: ${safeParse.error.message}`),
        null
      );
    return safeParse.data;
  } catch (error) {
    if (getErrnoCode(error) === "ENOENT") return null;
    if (
      (logForDebugging(`[Tasks] Failed to read task ${taskId}: ${errorMessage(error)}`, { level: "error" }),
      !(error instanceof SyntaxError) && !isSadFsErrno(error) && !isEnvFsErrno(error))
    )
      logError(error);
    return null;
  }
}
//@ chunk-nw7jbebs.js:13636-13811 layout
async function writeTaskMerged(taskListId, taskId, updates, store) {
  if (store) return updateTaskInStoreMerged(store, taskListId, taskId, updates);
  let c = await getTask(taskListId, taskId);
  if (!c) return null;
  let y = { ...c, ...updates, id: taskId },
    a = getTaskPath(taskListId, taskId);
  return (await writeFile(a, jsonStringify(y, null, 2), { encoding: "utf8" }), notifyTasksUpdated(), y);
}
//@ chunk-nw7jbebs.js:13811-13831 layout
var MAX_STORE_UPDATE_ATTEMPTS = 5,
  vt = createJitteredBackoff(50);
//@ chunk-nw7jbebs.js:13831-14550 layout
async function updateTaskInStore(store, taskListId, taskId, mutate) {
  let c = getTaskStorageKey(taskListId, taskId);
  for (let y = 1; ; y++) {
    let update = await store.update(c, (b) => {
      let w = b === void 0 ? null : parseTaskJson(taskId, Buffer.from(b.value).toString("utf8")),
        x = mutate(w);
      return "write" in x
        ? { write: jsonStringify(x.write, null, 2), result: x.result }
        : { skip: !0, result: x.result };
    });
    if (update.ok) {
      if (update.value.written) notifyTasksUpdated();
      return update.value.result;
    }
    if (
      !(update.error.code === "Unavailable" && update.error.telemetryCode === "LockSuspect") ||
      y >= MAX_STORE_UPDATE_ATTEMPTS
    )
      throw (
        logForDebugging(
          `[Tasks] update of task ${taskId} failed after ${y} attempt(s): ${update.error.code}${"telemetryCode" in update.error && update.error.telemetryCode ? ` (${update.error.telemetryCode})` : ""}`,
        ),
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `[Tasks] Failed to update task ${taskId}: ${update.error.code}`,
          "[Tasks] v5 task update write failed",
        )
      );
    await (update.error.retryAfterMs !== void 0 ? sleep(update.error.retryAfterMs) : vt(y));
  }
}
//@ chunk-nw7jbebs.js:14550-14592 file-local
function mergeTaskFields(task, updates, taskId) {
  return { ...task, ...updates, id: taskId };
}
//@ chunk-nw7jbebs.js:14592-14722 layout
async function updateTaskInStoreMerged(store, taskListId, taskId, updates) {
  return (
    (await updateTaskInStore(store, taskListId, taskId, (y) => {
      if (!y) return { result: null };
      let a = mergeTaskFields(y, updates, taskId);
      return { write: a, result: a };
    })) ?? null
  );
}
/**
 * 更新任务：在任务锁内读出、合并更新并写回（v5 存储走原子 update）。
 */
//@ chunk-nw7jbebs.js:14722-15016 layout
async function updateTask(taskListId, taskId, updates, store) {
  let c = getTaskPath(taskListId, taskId);
  if (store) {
    if (!(await readTaskFromStore(store, taskListId, taskId))) return null;
    let h;
    try {
      return (
        (h = await lockTaskList_2(taskListId, taskId)),
        await updateTaskInStoreMerged(store, taskListId, taskId, updates)
      );
    } finally {
      await releaseLockQuietly(h, "[Tasks] updateTask");
    }
  }
  if (!(await getTask(taskListId, taskId))) return null;
  let a;
  try {
    return ((a = await lock(c, LOCK_OPTIONS_2)), await writeTaskMerged(taskListId, taskId, updates));
  } finally {
    await releaseLockQuietly(a, "[Tasks] updateTask");
  }
}
/**
 * 删除任务：抬高 high-water mark、删除文件/条目，并从其他任务的 blocks/blockedBy 中移除该 id。
 */
//@ chunk-nw7jbebs.js:15016-15578 callgraph-fingerprint = blockTask (0.499)
async function deleteTask(taskListId, taskId, store) {
  let s = getTaskPath(taskListId, taskId);
  try {
    let c = parseInt(taskId, 10);
    if (!isNaN(c)) {
      let a = await readHighWaterMark(taskListId, store);
      if (c > a) await writeHighWaterMark(taskListId, c, store);
    }
    if (store) {
      let a = await store.delete(getTaskStorageKey(taskListId, taskId));
      if (!a.ok) return (logForDebugging(`[Tasks] Failed to delete task ${taskId}: ${a.error.code}`), !1);
      if (!a.value.existed) return !1;
    } else
      try {
        await unlink(s);
      } catch (error) {
        if (getErrnoCode(error) === "ENOENT") return !1;
        throw error;
      }
    let y = await listTasks(taskListId, store);
    for (let a of y) {
      let filtered = a.blocks.filter((block) => block !== taskId),
        filtered_2 = a.blockedBy.filter((w) => w !== taskId);
      if (filtered.length !== a.blocks.length || filtered_2.length !== a.blockedBy.length)
        await updateTask(taskListId, a.id, { blocks: filtered, blockedBy: filtered_2 }, store);
    }
    return (notifyTasksUpdated(), !0);
  } catch {
    return !1;
  }
}
/**
 * 列出任务列表中全部任务（按数字 id 排序）。
 */
//@ chunk-nw7jbebs.js:15578-15859 callgraph-witnessed = listTasks (1)
async function listTasks(taskListId, store) {
  if (store) return (await listTasksFromStore(store, taskListId)) ?? [];
  let dir = getTaskOutputDir(taskListId),
    files;
  try {
    files = await readdir(dir);
  } catch {
    return [];
  }
  let taskIds = files.filter((a) => a.endsWith(".json")).map((a) => a.replace(".json", ""));
  return (await Promise.all(taskIds.map((id) => getTask(taskListId, id))))
    .filter((a) => a !== null)
    .sort((a, h) => Number(a.id) - Number(h.id));
}
/**
 * 是否为规范任务 id（正整数字符串）。
 */
//@ chunk-nw7jbebs.js:15859-15902 layout
function isCanonicalTaskId(id) {
  return /^[1-9]\d*$/.test(id);
}
/**
 * 读取全部规范 id 的任务与最高 id（快照）。
 */
//@ chunk-nw7jbebs.js:15902-16347 layout
async function snapshotTaskList(taskListId, store) {
  let r;
  if (store) r = await listTaskIdsFromStore(store, taskListId);
  else
    try {
      r = (await readdir(getTaskOutputDir(taskListId)))
        .filter((h) => h.endsWith(".json"))
        .map((h) => h.replace(".json", ""));
    } catch (error) {
      r = getErrnoCode(error) === "ENOENT" ? [] : null;
    }
  if (r === null) return null;
  let sorted = r.filter(isCanonicalTaskId).sort((h, b) => Number(h) - Number(b)),
    results = await Promise.all(sorted.map((h) => getTask(taskListId, h, store))),
    y = await tryReadHighWaterMark(taskListId, store);
  if (y === null) return null;
  let filtered = results.filter((h, b) => h?.id === sorted[b]);
  return {
    tasks: filtered.length === sorted.length ? filtered : null,
    highestId: Math.max(y, maxNumericId(r)),
  };
}
/**
 * 合并 metadata，值为 null 的键删除。
 */
//@ chunk-nw7jbebs.js:16347-16456 layout
function mergeTaskMetadata(metadata, patch) {
  let r = { ...metadata };
  for (let [s, c] of Object.entries(patch))
    if (c === null) delete r[s];
    else r[s] = c;
  return r;
}
/**
 * 建立依赖：from.blocks 加 to、to.blockedBy 加 from。
 */
//@ chunk-nw7jbebs.js:16456-16705 fingerprint = deleteTask (1)
async function blockTask(taskListId, fromTaskId, toTaskId, store) {
  let [c, y] = await Promise.all([
    getTask(taskListId, fromTaskId, store),
    getTask(taskListId, toTaskId, store),
  ]);
  if (!c || !y) return !1;
  if (!c.blocks.includes(toTaskId))
    await updateTask(taskListId, fromTaskId, { blocks: [...c.blocks, toTaskId] }, store);
  if (!y.blockedBy.includes(fromTaskId))
    await updateTask(taskListId, toTaskId, { blockedBy: [...y.blockedBy, fromTaskId] }, store);
  return !0;
}
/**
 * 确保任务列表锁文件 <任务目录>/.lock 存在（wx 创建，已存在忽略），返回其路径。
 */
//@ chunk-nw7jbebs.js:16705-16837 layout
async function ensureTaskListLockFile(e, n) {
  await ensureTaskListDir(e, n);
  let r = join_2(getTaskOutputDir(e), ".lock");
  try {
    (await getFsImplementation().mkdir(getTaskOutputDir(e)), await writeFile(r, "", { flag: "wx" }));
  } catch {}
  return r;
}
/**
 * 锁定任务列表：v5 键值存储走内存锁，否则用锁文件加锁，返回释放函数。
 */
//@ chunk-nw7jbebs.js:16837-16919 layout
async function lockTaskList(e, n) {
  if (isDiskless()) return acquireInMemoryLock(sanitizePathComponent(e));
  let r = await ensureTaskListLockFile(e, n);
  return lock(r, LOCK_OPTIONS_2);
}
/**
 * 获取任务列表文件的锁（无盘会话用内存锁）。
 */
//@ chunk-nw7jbebs.js:16919-17065 placement = markMessagesAsReadByPredicate (0.489)
function lockTaskList_2(taskListId, taskId) {
  if (isDiskless())
    return acquireInMemoryLock(`${sanitizePathComponent(taskListId)}/${sanitizePathComponent(taskId)}`);
  let inboxPath = getTaskPath(taskListId, taskId);
  return lock(`${inboxPath}.v5-lock-anchor`, {
    lockfilePath: `${inboxPath}.lock`,
    realpath: !1,
    ...LOCK_OPTIONS_2,
  });
}
//@ chunk-nw7jbebs.js:17065-17172 placement
function acquireInMemoryLock(key) {
  return new Promise((n) => {
    ci().taskList.locks.run(key, () => new Promise((r) => n(async () => r())));
  });
}
/**
 * 认领任务：检查存在、owner、是否完成、未完成的阻塞者，可选检查认领者是否已有进行中任务。
 */
//@ chunk-nw7jbebs.js:17172-18309 fingerprint = claimTask (0.852)
async function claimTask(taskListId, taskId, claimantAgentId, options = {}, store) {
  let taskPath = getTaskPath(taskListId, taskId);
  if (!(await getTask(taskListId, taskId, store))) return { success: !1, reason: "task_not_found" };
  if (options.checkAgentBusy) return claimTaskWithBusyCheck(taskListId, taskId, claimantAgentId, store);
  let h;
  try {
    if (
      ((h = store ? await lockTaskList_2(taskListId, taskId) : await lock(taskPath, LOCK_OPTIONS_2)), store)
    ) {
      let P = await updateTaskInStore(store, taskListId, taskId, (R) =>
        tryClaimTaskRecord(R, taskId, claimantAgentId, void 0),
      );
      if (P !== "needs_open_blockers") return P ?? { success: !1, reason: "task_not_found" };
      let taskBeforeLock = await listTasks(taskListId, store),
        we = new Set(taskBeforeLock.filter((R) => R.status !== "completed").map((R) => R.id)),
        H = await updateTaskInStore(store, taskListId, taskId, (R) =>
          tryClaimTaskRecord(R, taskId, claimantAgentId, we),
        );
      return H === void 0 || H === "needs_open_blockers" ? { success: !1, reason: "task_not_found" } : H;
    }
    let b = await getTask(taskListId, taskId, store);
    if (!b) return { success: !1, reason: "task_not_found" };
    if (b.owner && b.owner !== claimantAgentId) return { success: !1, reason: "already_claimed", task: b };
    if (b.status === "completed") return { success: !1, reason: "already_resolved", task: b };
    let task = await listTasks(taskListId, store),
      unresolvedTaskIds = new Set(task.filter((P) => P.status !== "completed").map((P) => P.id)),
      blockedByTasks = b.blockedBy.filter((id) => unresolvedTaskIds.has(id));
    if (blockedByTasks.length > 0)
      return { success: !1, reason: "blocked", task: b, blockedByTasks: blockedByTasks };
    return {
      success: !0,
      task: await writeTaskMerged(taskListId, taskId, { owner: claimantAgentId }, store),
    };
  } catch (error) {
    return (
      logForDebugging(`[Tasks] Failed to claim task ${taskId}: ${errorMessage(error)}`),
      logError(error),
      { success: !1, reason: "task_not_found" }
    );
  } finally {
    await releaseLockQuietly(h, "[Tasks] claimTask");
  }
}
//@ chunk-nw7jbebs.js:18309-18817 layout = claimTask (0.787)
function tryClaimTaskRecord(task, taskId, claimantAgentId, openTaskIds) {
  if (!task) return { result: { success: !1, reason: "task_not_found" } };
  if (task.owner && task.owner !== claimantAgentId)
    return { result: { success: !1, reason: "already_claimed", task: task } };
  if (task.status === "completed") return { result: { success: !1, reason: "already_resolved", task: task } };
  if (task.blockedBy.length > 0) {
    if (!openTaskIds) return { result: "needs_open_blockers" };
    let blockedByTasks = task.blockedBy.filter((id) => openTaskIds.has(id));
    if (blockedByTasks.length > 0)
      return { result: { success: !1, reason: "blocked", task: task, blockedByTasks: blockedByTasks } };
  }
  let c = mergeTaskFields(task, { owner: claimantAgentId }, taskId);
  return { write: c, result: { success: !0, task: c } };
}
/**
 * 带"代理忙碌"检查的认领（在列表锁内）。
 */
//@ chunk-nw7jbebs.js:18817-19678 fingerprint = claimTaskWithBusyCheck (0.926)
async function claimTaskWithBusyCheck(e, n, r, s) {
  let release;
  try {
    release = await lockTaskList(e, s);
    let y = await listTasks(e, s),
      task = y.find((S) => S.id === n);
    if (!task) return { success: !1, reason: "task_not_found" };
    if (task.owner && task.owner !== r) return { success: !1, reason: "already_claimed", task: task };
    if (task.status === "completed") return { success: !1, reason: "already_resolved", task: task };
    let unresolvedTaskIds = new Set(y.filter((S) => S.status !== "completed").map((S) => S.id)),
      blockedByTasks = task.blockedBy.filter((id) => unresolvedTaskIds.has(id));
    if (blockedByTasks.length > 0)
      return { success: !1, reason: "blocked", task: task, blockedByTasks: blockedByTasks };
    let agentOpenTasks = y.filter((S) => S.status !== "completed" && S.owner === r && S.id !== n);
    if (agentOpenTasks.length > 0)
      return {
        success: !1,
        reason: "agent_busy",
        task: task,
        busyWithTasks: agentOpenTasks.map((S) => S.id),
      };
    return { success: !0, task: await updateTask(e, n, { owner: r }, s) };
  } catch (error) {
    return (
      logForDebugging(`[Tasks] Failed to claim task ${n} with busy check: ${errorMessage(error)}`),
      logError(error),
      { success: !1, reason: "task_not_found" }
    );
  } finally {
    await releaseLockQuietly(release, "[Tasks] claimTaskWithBusyCheck");
  }
}
/**
 * 队友退出/被终止时把其未完成任务改回 pending 无 owner，并生成通知文本。
 */
//@ chunk-nw7jbebs.js:19678-20333 fingerprint = unassignTeammateTasks (0.956)
async function unassignTeammateTasks(e, n, r, s, c) {
  let y = ci().taskList.sessionListId ?? e,
    unresolvedAssignedTasks = (await listTasks(y, c)).filter(
      (x) => x.status !== "completed" && (x.owner === n || x.owner === r),
    );
  for (let task of unresolvedAssignedTasks)
    await updateTask(y, task.id, { owner: void 0, status: "pending" }, c);
  if (unresolvedAssignedTasks.length > 0)
    logForDebugging(`[Tasks] Unassigned ${unresolvedAssignedTasks.length} task(s) from ${r}`);
  let notificationMessage = `${r} ${s === "terminated" ? "was terminated" : "has shut down"}.`;
  if (unresolvedAssignedTasks.length > 0) {
    let taskList = unresolvedAssignedTasks.map((S) => `#${S.id} "${S.subject}"`).join(", ");
    notificationMessage += ` ${unresolvedAssignedTasks.length} task(s) were unassigned: ${taskList}. Use TaskList to check availability and TaskUpdate with owner to reassign them to idle teammates.`;
  }
  return {
    unassignedTasks: unresolvedAssignedTasks.map((x) => ({ id: x.id, subject: x.subject })),
    notificationMessage: notificationMessage,
  };
}
/**
 * 两个数组逐项全等。
 */
//@ chunk-0n43rj0b.js:5681-5789 placement
function arraysShallowEqual(s, i) {
  if (s.length !== i.length) return !1;
  for (let e = 0; e < s.length; e++) if (s[e] !== i[e]) return !1;
  return !0;
}
//@ chunk-0n43rj0b.js:5789-5833 placement
function S(s) {
  return s !== void 0 && s.length > 0;
}
//@ chunk-ha3km179.js:76055-76143 placement
function fd(e) {
  let n = e.input?.text;
  return typeof n === "string" && n.trim().length > 0 ? n : null;
}
//@ chunk-ha3km179.js:76143-76331 fingerprint = TASK_STATUSES (1)
var CHECKLIST_MARKER_STATUS = new Map([
    ["\u2713", "completed"],
    ["\u2714", "completed"],
    ["\u2705", "completed"],
    ["\u2731", "in_progress"],
    ["\u25CB", "pending"],
    ["\u25EF", "pending"],
    ["\u2022", "pending"],
  ]),
  Rf = 512,
  Af = 32;
//@ chunk-e6aww6q8.js:3232917-3232950 placement
function Wue() {
  return isTaskToolsEnabled() && todoToolsEnabled();
}
/**
 * 把代理状态规范为 idle/waiting/busy。
 */
//@ chunk-p7xejzdb.js:14282-14352 fingerprint = getAgentStatuses (0.532)
function getAgentStatuses(teamName) {
  return teamName === "idle" ? "idle" : teamName === "waiting" ? "waiting" : "busy";
}

export {
  Wue,
  isTaskToolsEnabled,
  S,
  arraysShallowEqual,
  getTaskOutputDir,
  sanitizePathComponent,
  getTaskListId,
  Iii,
  listTasks,
  resetTaskList,
  Rf,
  CHECKLIST_MARKER_STATUS,
  Af,
  fd,
  ensureTaskListDir,
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
