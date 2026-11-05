/**
 * utils/cronTasks.ts
 *
 * 定时任务（cron）存储与校验
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/cronTasks.ts
 * pieces: chunk-5xgkngpb.js (4), chunk-78ymyfsy.js (1), chunk-mk7xxmed.js (22)
 * attribution: placement 9, fingerprint 8, layout 7, callgraph-fingerprint 1, file-local 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { join } from "path";
import { mkdir } from "fs/promises";
import { randomUUID } from "crypto";
import { CONTROL_OR_BIDI_CHARS_RE } from "./plugins/schemas.js";
import {
  getProjectRoot,
  getProjectConfigRoot,
  isWorkspaceRestricted,
  isUnderRestrictedWorkspaceRoot,
  getProjectRootOrNull,
  addSessionCronTask,
  getSessionId,
  removeSessionCronTasks,
  getSessionCronTasks,
} from "../bootstrap/state.js";
import { isPathConfigDir } from "./envUtils.js";
import {
  getFsImplementation,
  vetRepoSettingsPathAsync,
  SYMLINK_TO_NETWORK_PATH_CODE,
  vetRepoSettingsPath,
} from "./fsOperations.js";
import { isFsInaccessible, getErrnoCode } from "./errors.js";
import { logError } from "./log.js";
import { safeParseJSON } from "./json.js";
import { logForDebugging } from "./debug.js";
import { jsonStringify } from "./slowOperations.js";
import { parseCronExpression, computeNextCronRun } from "./cron.js";
import { readBoundedSync, assertDirChainReal } from "./fsSafety/atomicWriteStaging.js";
import { readJsonFile_2 } from "./file.js";
import { ATOMIC_WRITE_DIRNAME } from "./plugins/safeCopy.js";
import { getHookCallerOrScheduler } from "./workloadContext.js";
import { ownProcStart } from "./processIdentity.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-mk7xxmed.js:4996-5006 placement
/**
 * 插件名的最大长度（256）。
 */
var MAX_PLUGIN_NAME_CHARS = 256;
//@ chunk-mk7xxmed.js:5006-5074 placement
/**
 * 判断插件名合法（非空、长度受限、不含控制与双向字符）。
 */
var isValidPluginName = (plugin) =>
  typeof plugin === "string" &&
  plugin !== "" &&
  plugin.length <= MAX_PLUGIN_NAME_CHARS &&
  !CONTROL_OR_BIDI_CHARS_RE.test(plugin);
//@ chunk-mk7xxmed.js:5074-5163 fingerprint (2.1.88 match: CRON_FILE_REL, 1)
/**
 * 常量：缓存预热阈值 5 分钟、"每 N 分钟"表达式正则、任务文件相对路径 .claude/scheduled_tasks.json。
 */
var CACHE_LEAD_MIN_INTERVAL_MS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var EVERY_N_MINUTES_PATTERN;
var CRON_FILE_REL;
var MAX_CRON_FILE_BYTES;
deferInit("chunk-mk7xxmed.js:5074", () => {
  CACHE_LEAD_MIN_INTERVAL_MS = 300000;
  EVERY_N_MINUTES_PATTERN = /^\*\/\d+ \* \* \* \*$/;
  CRON_FILE_REL = join(".claude", "scheduled_tasks.json");
  MAX_CRON_FILE_BYTES = 1048576;
});
//@ chunk-mk7xxmed.js:5163-5199 layout
/**
 * scheduled_tasks.json 的完整路径（默认项目根）。
 */
function getCronFilePath(dir) {
  return join(dir ?? getProjectRoot(), CRON_FILE_REL);
}
//@ chunk-mk7xxmed.js:5199-5246 layout
/**
 * 默认目录且会话用 --project-config-root 启动时，持久化定时任务不可用。
 */
function isDurableCronUnavailable(dir) {
  return dir === undefined && getProjectConfigRoot() !== null;
}
//@ chunk-mk7xxmed.js:5246-5293 layout (2.1.88 match: isInGlobalClaudeFolder, 1)
function isInGlobalClaudeFolder(filePath) {
  return !isPathConfigDir(join(filePath ?? getProjectRoot(), ".claude"));
}
//@ chunk-mk7xxmed.js:5293-6611 fingerprint (2.1.88 match: readCronTasks, 0.794)
/**
 * 读 scheduled_tasks.json：跳过字段缺失、cron 非法或插件名非法的任务，返回规范化后的任务数组。
 */
async function readCronTasks(dir) {
  if (isDurableCronUnavailable(dir)) return [];
  let fs = getFsImplementation();
  let raw;
  try {
    let cronFilePath = getCronFilePath(dir);
    let marker = isInGlobalClaudeFolder(dir)
      ? (await vetRepoSettingsPathAsync(fs, cronFilePath)).resolvedPath
      : cronFilePath;
    raw = await fs.readFile(marker, {
      encoding: "utf-8",
    });
  } catch (e) {
    if (isFsInaccessible(e) || getErrnoCode(e) === SYMLINK_TO_NETWORK_PATH_CODE) return [];
    logError(e);
    return [];
  }
  let parsed = safeParseJSON(raw, false);
  if (!parsed || typeof parsed !== "object") return [];
  let file = parsed;
  if (!Array.isArray(file.tasks)) return [];
  let out = [];
  for (let t of file.tasks) {
    if (
      !t ||
      typeof t.id !== "string" ||
      typeof t.cron !== "string" ||
      typeof t.prompt !== "string" ||
      typeof t.createdAt !== "number"
    ) {
      logForDebugging(`[ScheduledTasks] skipping malformed task: ${jsonStringify(t)}`);
      continue;
    }
    if (!parseCronExpression(t.cron)) {
      logForDebugging(`[ScheduledTasks] skipping task ${t.id} with invalid cron '${t.cron}'`);
      continue;
    }
    if (t.plugin !== undefined && !isValidPluginName(t.plugin)) {
      logForDebugging(
        `[ScheduledTasks] skipping task ${t.id}: its plugin name fails the rule for a stored name`,
      );
      continue;
    }
    out.push({
      id: t.id,
      cron: t.cron,
      prompt: t.prompt,
      createdAt: t.createdAt,
      ...(typeof t.lastFiredAt === "number" && {
        lastFiredAt: t.lastFiredAt,
      }),
      ...(t.recurring && {
        recurring: true,
      }),
      ...(t.permanent && {
        permanent: true,
      }),
      ...(typeof t.createdBySessionId === "string" && {
        createdBySessionId: t.createdBySessionId,
      }),
      ...(typeof t.createdByPid === "number" && {
        createdByPid: t.createdByPid,
      }),
      ...(typeof t.createdByProcStart === "string" && {
        createdByProcStart: t.createdByProcStart,
      }),
      ...(typeof t.createdInProject === "string" && {
        createdInProject: t.createdInProject,
      }),
      ...(typeof t.plugin === "string" && {
        plugin: t.plugin,
      }),
    });
  }
  return out;
}
//@ chunk-mk7xxmed.js:6611-6653 layout
/**
 * 任务文件是否被忽略（某全局开关或该目录的规则）。用途未完全确认。
 */
function isCronFileIgnored(dir) {
  return isWorkspaceRestricted() || isUnderRestrictedWorkspaceRoot(dir ?? getProjectRoot());
}
//@ chunk-mk7xxmed.js:6653-6945 callgraph-fingerprint (2.1.88 match: hasCronTasksSync, 0.261)
/**
 * 同步检查任务文件里是否有任务（启动时决定是否开启调度）。
 */
function hasCronTasksSync(dir) {
  if (isDurableCronUnavailable(dir) || (dir === undefined && getProjectRootOrNull() === null)) return false;
  if (isCronFileIgnored(dir)) return false;
  let raw;
  try {
    let cronFilePath = getCronFilePath(dir);
    let marker = isInGlobalClaudeFolder(dir)
      ? vetRepoSettingsPath(getFsImplementation(), cronFilePath).resolvedPath
      : cronFilePath;
    raw = readBoundedSync(marker, {
      maxBytes: MAX_CRON_FILE_BYTES,
      regularFileOnly: true,
    });
  } catch {
    return false;
  }
  let parsed = safeParseJSON(raw, false);
  if (!parsed || typeof parsed !== "object") return false;
  let tasks = parsed.tasks;
  return Array.isArray(tasks) && tasks.length > 0;
}
//@ chunk-mk7xxmed.js:6945-7348 fingerprint (2.1.88 match: writeCronTasks, 0.604)
/**
 * 写 scheduled_tasks.json（去掉运行时 durable 字段），.claude 不存在时先安全创建。
 */
async function writeCronTasks(tasks, dir) {
  if (isDurableCronUnavailable(dir))
    throw Error("Durable scheduled tasks are unavailable in a session started with --project-config-root");
  let root = dir ?? getProjectRoot();
  let isRealConfigDir = !isPathConfigDir(join(root, ".claude"));
  if (isRealConfigDir) await assertDirChainReal(root, join(root, ".claude"));
  await mkdir(join(root, ".claude"), {
    recursive: true,
  });
  let body = {
    tasks: tasks.map(({ durable: _durable, ...rest }) => rest),
  };
  await readJsonFile_2(
    getCronFilePath(root),
    jsonStringify(body, null, 2) +
      `
`,
    {
      encoding: "utf-8",
      allowSymlink: !isRealConfigDir,
      checkParentDir: isRealConfigDir,
      stagingDir: join(root, ".claude", ATOMIC_WRITE_DIRNAME),
    },
  );
}
//@ chunk-mk7xxmed.js:7348-7730 layout
/**
 * 新建定时任务：生成 8 位 ID；非持久化时加入会话内任务（可带 agentId），持久化时追加到文件并记录创建会话/进程/项目。返回 ID。
 */
async function addCronTask(cron, prompt, recurring, durable, agentId, createdAt = Date.now(), pluginContext) {
  let hookCallerOrScheduler = getHookCallerOrScheduler(pluginContext);
  let sliced = randomUUID().slice(0, 8);
  let task = {
    id: sliced,
    cron,
    prompt,
    createdAt,
    ...(recurring && {
      recurring: true,
    }),
    ...(hookCallerOrScheduler !== undefined && {
      plugin: hookCallerOrScheduler,
    }),
  };
  if (!durable) {
    addSessionCronTask({
      ...task,
      ...(agentId && {
        agentId,
      }),
    });
    return sliced;
  }
  if (isInGlobalClaudeFolder()) await vetRepoSettingsPathAsync(getFsImplementation(), getCronFilePath());
  let tasks = await readCronTasks();
  tasks.push({
    ...task,
    createdBySessionId: getSessionId(),
    createdByPid: process.pid,
    createdByProcStart: ownProcStart(),
    createdInProject: getProjectRoot(),
  });
  await writeCronTasks(tasks);
  return sliced;
}
//@ chunk-mk7xxmed.js:7730-7924 file-local
/**
 * 删除任务：先删会话内任务，剩余 ID 再从文件中删除。
 */
async function removeCronTasks(ids, dir) {
  if (ids.length === 0) return;
  if (dir === undefined && removeSessionCronTasks(ids) === ids.length) return;
  let idSet = new Set(ids);
  let tasks = await readCronTasks(dir);
  let remaining = tasks.filter((t) => !idSet.has(t.id));
  if (remaining.length === tasks.length) return;
  await writeCronTasks(remaining, dir);
}
//@ chunk-mk7xxmed.js:7924-8089 fingerprint (2.1.88 match: markCronTasksFired, 1)
/**
 * 给持久化任务写 lastFiredAt。
 */
async function markCronTasksFired(ids, firedAt, dir) {
  if (ids.length === 0) return;
  let idSet = new Set(ids);
  let tasks = await readCronTasks(dir);
  let changed = false;
  for (let t of tasks)
    if (idSet.has(t.id)) {
      t.lastFiredAt = firedAt;
      changed = true;
    }
  if (!changed) return;
  await writeCronTasks(tasks, dir);
}
//@ chunk-mk7xxmed.js:8089-8212 layout
/**
 * 列出全部任务：文件任务 + 会话内任务（durable=false）。
 */
async function listAllCronTasks(dir) {
  let fileTasks = await readCronTasks(dir);
  if (dir !== undefined) return fileTasks;
  let sessionTasks = getSessionCronTasks().map((t) => ({
    ...t,
    durable: false,
  }));
  return [...fileTasks, ...sessionTasks];
}
//@ chunk-mk7xxmed.js:8212-8315 layout
/**
 * 计算 cron 在某时间之后的下次运行时间戳。
 */
function nextCronRunMs(cron, fromMs, options) {
  let fields = parseCronExpression(cron);
  if (!fields) return null;
  let next = computeNextCronRun(fields, new Date(fromMs), options);
  return next ? next.getTime() : null;
}
//@ chunk-mk7xxmed.js:8315-8467 fingerprint (2.1.88 match: DEFAULT_CRON_JITTER_CONFIG, 0.923)
/**
 * 抖动默认值：recurringFrac 0.5、recurringCapMs 30 分钟、oneShotMaxMs 90 秒、oneShotFloorMs 0、oneShotMinuteMod 30、recurringMaxAgeMs 7 天、cacheLeadMs 15 秒。
 */
var DEFAULT_CRON_JITTER_CONFIG = {
  recurringFrac: 0.5,
  recurringCapMs: 1800000,
  oneShotMaxMs: 90000,
  oneShotFloorMs: 0,
  oneShotMinuteMod: 30,
  recurringMaxAgeMs: 604800000,
  cacheLeadMs: 15000,
};
//@ chunk-mk7xxmed.js:8467-8554 file-local
/**
 * 由任务 ID 前 8 位十六进制得到 [0,1) 的稳定抖动系数。
 */
function jitterFrac(taskId) {
  let frac = parseInt(taskId.slice(0, 8), 16) / 4294967296;
  return Number.isFinite(frac) ? frac : 0;
}
//@ chunk-mk7xxmed.js:8554-8832 fingerprint (2.1.88 match: jitteredNextCronRunMs, 0.8)
/**
 * 循环任务下次时间：在两次运行间隔内按 ID 比例延后（上限 recurringCapMs）；"每 N 分钟"且间隔≥5 分钟时改为提前 cacheLeadMs 触发以命中提示缓存。
 */
function jitteredNextCronRunMs(cron, fromMs, taskId, cfg = DEFAULT_CRON_JITTER_CONFIG) {
  let t1 = nextCronRunMs(cron, fromMs);
  if (t1 === null) return null;
  let t2 = nextCronRunMs(cron, t1);
  if (t2 === null) return t1;
  let spanMs = t2 - t1;
  if (
    EVERY_N_MINUTES_PATTERN.test(cron) &&
    cfg.cacheLeadMs > 0 &&
    cfg.cacheLeadMs < spanMs &&
    spanMs >= CACHE_LEAD_MIN_INTERVAL_MS &&
    spanMs - cfg.cacheLeadMs < CACHE_LEAD_MIN_INTERVAL_MS
  )
    return fromMs + spanMs - cfg.cacheLeadMs;
  let jitter = Math.min(jitterFrac(taskId) * cfg.recurringFrac * spanMs, cfg.recurringCapMs);
  return t1 + jitter;
}
//@ chunk-mk7xxmed.js:8832-9054 fingerprint (2.1.88 match: oneShotJitteredNextCronRunMs, 0.887)
/**
 * 一次性任务时间：落在整点/半点（oneShotMinuteMod）时按 ID 比例提前最多 oneShotMaxMs，避免集中触发。
 */
function oneShotJitteredNextCronRunMs(cron, fromMs, taskId, cfg = DEFAULT_CRON_JITTER_CONFIG) {
  let t1 = nextCronRunMs(cron, fromMs, {
    oneShot: true,
  });
  if (t1 === null) return null;
  if (new Date(t1).getMinutes() % cfg.oneShotMinuteMod !== 0) return t1;
  let lead = cfg.oneShotFloorMs + jitterFrac(taskId) * (cfg.oneShotMaxMs - cfg.oneShotFloorMs);
  return Math.max(t1 - lead, fromMs);
}
//@ chunk-mk7xxmed.js:9054-9168 fingerprint (2.1.88 match: addCronTask, 0.827)
/**
 * 任务的下次触发时间（循环按 lastFiredAt/createdAt，一次性按 createdAt）。
 */
function nextFireTimeForTask(task, jitterConfig) {
  return task.recurring
    ? jitteredNextCronRunMs(task.cron, task.lastFiredAt ?? task.createdAt, task.id, jitterConfig)
    : oneShotJitteredNextCronRunMs(task.cron, task.createdAt, task.id, jitterConfig);
}
//@ chunk-mk7xxmed.js:9168-9227 placement
/**
 * 把时间戳四舍五入到整分钟。
 */
function roundToMinute(ms) {
  return new Date(Math.round(ms / 60000) * 60000);
}
//@ chunk-mk7xxmed.js:9227-9343 placement (2.1.88 match: addCronTask, 0.818)
/**
 * 找出已错过（下次运行时间早于 now）的任务。
 */
function findMissedTasks(tasks, nowMs) {
  return tasks.filter((t) => {
    let next = nextCronRunMs(t.cron, t.createdAt, {
      oneShot: !t.recurring,
    });
    return next !== null && next < nowMs;
  });
}
//@ chunk-78ymyfsy.js:1218-1249 placement
/**
 * 匹配 “u_ + 22 位字母数字下划线” 的短会话 id。
 */
var SESSION_ID_SHORT_RE = /^u_[A-Za-z0-9_]{22}$/;
//@ chunk-5xgkngpb.js:2647751-2647831 placement
/**
 * cron 归属表的条目上限（32）。
 */
var MAX_CRON_OWNERSHIP_ENTRIES = 32;
var MAX_CRON_OWNERSHIP_KEYS = 64;
var MISSED_WATCH_RELAUNCH_ADVICE = 'pass action "watch" with its url if you still need that';
//@ chunk-5xgkngpb.js:2647831-2647944 placement
/**
 * 向 Map 写入（先删再插保持最新），超过上限时淘汰最早的键。
 */
function setWithLimit(armOutcomes, key, value, limit) {
  armOutcomes.delete(key);
  if (armOutcomes.size >= limit) {
    let oldestKey = armOutcomes.keys().next().value;
    if (oldestKey !== undefined) armOutcomes.delete(oldestKey);
  }
  armOutcomes.set(key, value);
}
//@ chunk-5xgkngpb.js:2647944-2648074 placement
/**
 * 向 Set 添加新值，超过上限时淘汰最早的值；已存在返回 false。
 */
function addWithLimit(set, value, limit) {
  if (set.has(value)) return false;
  if (set.size >= limit) {
    let oldest = set.values().next().value;
    if (oldest !== undefined) set.delete(oldest);
  }
  set.add(value);
  return true;
}
//@ chunk-5xgkngpb.js:2648074-2648144 placement
/**
 * 删除某前缀下的所有归属键。
 */
function removeCronOwnedKeys(announcedArmFailures, taskId) {
  for (let key of announcedArmFailures) if (key.startsWith(`${taskId}:`)) announcedArmFailures.delete(key);
}
export {
  listAllCronTasks,
  removeCronTasks,
  addCronTask,
  SESSION_ID_SHORT_RE,
  addWithLimit,
  isValidPluginName,
  nextFireTimeForTask,
  roundToMinute,
  isDurableCronUnavailable,
  isCronFileIgnored,
  readCronTasks,
  writeCronTasks,
  findMissedTasks,
  DEFAULT_CRON_JITTER_CONFIG,
  jitteredNextCronRunMs,
  markCronTasksFired,
  getCronFilePath,
  hasCronTasksSync,
  MISSED_WATCH_RELAUNCH_ADVICE,
  setWithLimit,
  MAX_CRON_OWNERSHIP_ENTRIES,
  removeCronOwnedKeys,
  oneShotJitteredNextCronRunMs,
  CACHE_LEAD_MIN_INTERVAL_MS,
  MAX_CRON_OWNERSHIP_KEYS,
  nextCronRunMs,
};
