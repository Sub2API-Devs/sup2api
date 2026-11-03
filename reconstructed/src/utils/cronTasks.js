/**
 * utils/cronTasks.ts
 *
 * 定时任务（cron）存储与校验
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/cronTasks.ts
 * pieces: chunk-93zax7h2.js (21), chunk-b0a246e7.js (1), chunk-e6aww6q8.js (4)
 * attribution: placement 9, fingerprint 9, layout 7, file-local 1
 */
import { join } from "path";
import { readFileSync } from "fs";
import { mkdir } from "fs/promises";
import { randomUUID } from "crypto";
import { CONTROL_OR_BIDI_CHARS_RE } from "./plugins/schemas.js";
import {
  getProjectRoot,
  getProjectConfigRoot,
  isWorkspaceRestricted,
  isUnderRestrictedWorkspaceRoot,
  addSessionCronTask,
  getSessionId,
  removeSessionCronTasks,
  getSessionCronTasks,
} from "../bootstrap/state.js";
import { getFsImplementation } from "./fsOperations.js";
import { isFsInaccessible } from "./errors.js";
import { logError } from "./log.js";
import { safeParseJSON } from "./json.js";
import { logForDebugging } from "./debug.js";
import { jsonStringify } from "./slowOperations.js";
import { parseCronExpression, computeNextCronRun } from "./cron.js";
import { isPathConfigDir } from "./envUtils.js";
import { assertDirChainReal } from "./fsSafety/atomicWriteStaging.js";
import { writeFileAtomic } from "./file.js";
import { ATOMIC_WRITE_DIRNAME } from "./plugins/safeCopy.js";
import { getHookCallerOrScheduler } from "./workloadContext.js";
import { ownProcStart } from "./processIdentity.js";

//@ chunk-93zax7h2.js:5010-5020 placement
var C = 256;
//@ chunk-93zax7h2.js:5020-5088 placement
var p$e = (e) => typeof e === "string" && e !== "" && e.length <= C && !CONTROL_OR_BIDI_CHARS_RE.test(e);
/**
 * 常量：缓存预热阈值 5 分钟、"每 N 分钟"表达式正则、任务文件相对路径 .claude/scheduled_tasks.json。
 */
//@ chunk-93zax7h2.js:5088-5167 fingerprint = CRON_FILE_REL (1)
var CACHE_LEAD_MIN_INTERVAL_MS = 300000,
  EVERY_N_MINUTES_PATTERN = /^\*\/\d+ \* \* \* \*$/,
  CRON_FILE_REL = join(".claude", "scheduled_tasks.json");
/**
 * scheduled_tasks.json 的完整路径（默认项目根）。
 */
//@ chunk-93zax7h2.js:5167-5203 layout
function getCronFilePath(dir) {
  return join(dir ?? getProjectRoot(), CRON_FILE_REL);
}
/**
 * 默认目录且会话用 --project-config-root 启动时，持久化定时任务不可用。
 */
//@ chunk-93zax7h2.js:5203-5250 layout
function isDurableCronUnavailable(dir) {
  return dir === void 0 && getProjectConfigRoot() !== null;
}
/**
 * 读 scheduled_tasks.json：跳过字段缺失、cron 非法或插件名非法的任务，返回规范化后的任务数组。
 */
//@ chunk-93zax7h2.js:5250-6510 fingerprint = readCronTasks (0.81)
async function readCronTasks(dir) {
  if (isDurableCronUnavailable(dir)) return [];
  let fs = getFsImplementation(),
    raw;
  try {
    raw = await fs.readFile(getCronFilePath(dir), { encoding: "utf-8" });
  } catch (error) {
    if (isFsInaccessible(error)) return [];
    return (logError(error), []);
  }
  let parsed = safeParseJSON(raw, !1);
  if (!parsed || typeof parsed !== "object") return [];
  let file = parsed;
  if (!Array.isArray(file.tasks)) return [];
  let out = [];
  for (let task of file.tasks) {
    if (
      !task ||
      typeof task.id !== "string" ||
      typeof task.cron !== "string" ||
      typeof task.prompt !== "string" ||
      typeof task.createdAt !== "number"
    ) {
      logForDebugging(`[ScheduledTasks] skipping malformed task: ${jsonStringify(task)}`);
      continue;
    }
    if (!parseCronExpression(task.cron)) {
      logForDebugging(`[ScheduledTasks] skipping task ${task.id} with invalid cron '${task.cron}'`);
      continue;
    }
    if (task.plugin !== void 0 && !p$e(task.plugin)) {
      logForDebugging(
        `[ScheduledTasks] skipping task ${task.id}: its plugin name fails the rule for a stored name`,
      );
      continue;
    }
    out.push({
      id: task.id,
      cron: task.cron,
      prompt: task.prompt,
      createdAt: task.createdAt,
      ...(typeof task.lastFiredAt === "number" && { lastFiredAt: task.lastFiredAt }),
      ...(task.recurring && { recurring: !0 }),
      ...(task.permanent && { permanent: !0 }),
      ...(typeof task.createdBySessionId === "string" && { createdBySessionId: task.createdBySessionId }),
      ...(typeof task.createdByPid === "number" && { createdByPid: task.createdByPid }),
      ...(typeof task.createdByProcStart === "string" && { createdByProcStart: task.createdByProcStart }),
      ...(typeof task.createdInProject === "string" && { createdInProject: task.createdInProject }),
      ...(typeof task.plugin === "string" && { plugin: task.plugin }),
    });
  }
  return out;
}
/**
 * 任务文件是否被忽略（某全局开关或该目录的规则）。用途未完全确认。
 */
//@ chunk-93zax7h2.js:6510-6552 layout
function isCronFileIgnored(e) {
  return isWorkspaceRestricted() || isUnderRestrictedWorkspaceRoot(e ?? getProjectRoot());
}
/**
 * 同步检查任务文件里是否有任务（启动时决定是否开启调度）。
 */
//@ chunk-93zax7h2.js:6552-6752 fingerprint = hasCronTasksSync (1)
function hasCronTasksSync(dir) {
  if (isDurableCronUnavailable(dir)) return !1;
  if (isCronFileIgnored(dir)) return !1;
  let raw;
  try {
    raw = readFileSync(getCronFilePath(dir), "utf-8");
  } catch {
    return !1;
  }
  let parsed = safeParseJSON(raw, !1);
  if (!parsed || typeof parsed !== "object") return !1;
  let tasks = parsed.tasks;
  return Array.isArray(tasks) && tasks.length > 0;
}
/**
 * 写 scheduled_tasks.json（去掉运行时 durable 字段），.claude 不存在时先安全创建。
 */
//@ chunk-93zax7h2.js:6752-7155 fingerprint = writeCronTasks (0.603)
async function writeCronTasks(tasks, dir) {
  if (isDurableCronUnavailable(dir))
    throw Error("Durable scheduled tasks are unavailable in a session started with --project-config-root");
  let root = dir ?? getProjectRoot(),
    r = !isPathConfigDir(join(root, ".claude"));
  if (r) await assertDirChainReal(root, join(root, ".claude"));
  await mkdir(join(root, ".claude"), { recursive: !0 });
  let body = { tasks: tasks.map(({ durable: durable, ...n }) => n) };
  await writeFileAtomic(
    getCronFilePath(root),
    jsonStringify(body, null, 2) +
      `
`,
    {
      encoding: "utf-8",
      allowSymlink: !r,
      checkParentDir: r,
      stagingDir: join(root, ".claude", ATOMIC_WRITE_DIRNAME),
    },
  );
}
/**
 * 新建定时任务：生成 8 位 ID；非持久化时加入会话内任务（可带 agentId），持久化时追加到文件并记录创建会话/进程/项目。返回 ID。
 */
//@ chunk-93zax7h2.js:7155-7509 layout
async function addCronTask(cron, prompt, recurring, durable, agentId, createdAt = Date.now(), pluginContext) {
  let m = getHookCallerOrScheduler(pluginContext),
    sliced = randomUUID().slice(0, 8),
    c = {
      id: sliced,
      cron: cron,
      prompt: prompt,
      createdAt: createdAt,
      ...(recurring && { recurring: !0 }),
      ...(m !== void 0 && { plugin: m }),
    };
  if (!durable) return (addSessionCronTask({ ...c, ...(agentId && { agentId: agentId }) }), sliced);
  let f = await readCronTasks();
  return (
    f.push({
      ...c,
      createdBySessionId: getSessionId(),
      createdByPid: process.pid,
      createdByProcStart: ownProcStart(),
      createdInProject: getProjectRoot(),
    }),
    await writeCronTasks(f),
    sliced
  );
}
/**
 * 删除任务：先删会话内任务，剩余 ID 再从文件中删除。
 */
//@ chunk-93zax7h2.js:7509-7702 file-local
async function removeCronTasks(ids, dir) {
  if (ids.length === 0) return;
  if (dir === void 0 && removeSessionCronTasks(ids) === ids.length) return;
  let idSet = new Set(ids),
    tasks = await readCronTasks(dir),
    remaining = tasks.filter((a) => !idSet.has(a.id));
  if (remaining.length === tasks.length) return;
  await writeCronTasks(remaining, dir);
}
/**
 * 给持久化任务写 lastFiredAt。
 */
//@ chunk-93zax7h2.js:7702-7867 fingerprint = markCronTasksFired (1)
async function markCronTasksFired(ids, firedAt, dir) {
  if (ids.length === 0) return;
  let idSet = new Set(ids),
    tasks = await readCronTasks(dir),
    a = !1;
  for (let n of tasks) if (idSet.has(n.id)) ((n.lastFiredAt = firedAt), (a = !0));
  if (!a) return;
  await writeCronTasks(tasks, dir);
}
/**
 * 列出全部任务：文件任务 + 会话内任务（durable=false）。
 */
//@ chunk-93zax7h2.js:7867-7990 layout
async function listAllCronTasks(dir) {
  let s = await readCronTasks(dir);
  if (dir !== void 0) return s;
  let mapped = getSessionCronTasks().map((r) => ({ ...r, durable: !1 }));
  return [...s, ...mapped];
}
/**
 * 计算 cron 在某时间之后的下次运行时间戳。
 */
//@ chunk-93zax7h2.js:7990-8093 layout
function nextCronRunMs(cron, fromMs, options) {
  let r = parseCronExpression(cron);
  if (!r) return null;
  let i = computeNextCronRun(r, new Date(fromMs), options);
  return i ? i.getTime() : null;
}
/**
 * 抖动默认值：recurringFrac 0.5、recurringCapMs 30 分钟、oneShotMaxMs 90 秒、oneShotFloorMs 0、oneShotMinuteMod 30、recurringMaxAgeMs 7 天、cacheLeadMs 15 秒。
 */
//@ chunk-93zax7h2.js:8093-8245 fingerprint = DEFAULT_CRON_JITTER_CONFIG (0.923)
var DEFAULT_CRON_JITTER_CONFIG = {
  recurringFrac: 0.5,
  recurringCapMs: 1800000,
  oneShotMaxMs: 90000,
  oneShotFloorMs: 0,
  oneShotMinuteMod: 30,
  recurringMaxAgeMs: 604800000,
  cacheLeadMs: 15000,
};
/**
 * 由任务 ID 前 8 位十六进制得到 [0,1) 的稳定抖动系数。
 */
//@ chunk-93zax7h2.js:8245-8332 layout
function jitterFrac(taskId) {
  let s = parseInt(taskId.slice(0, 8), 16) / 4294967296;
  return Number.isFinite(s) ? s : 0;
}
/**
 * 循环任务下次时间：在两次运行间隔内按 ID 比例延后（上限 recurringCapMs）；"每 N 分钟"且间隔≥5 分钟时改为提前 cacheLeadMs 触发以命中提示缓存。
 */
//@ chunk-93zax7h2.js:8332-8610 fingerprint = jitteredNextCronRunMs (0.8)
function jitteredNextCronRunMs(cron, fromMs, taskId, cfg = DEFAULT_CRON_JITTER_CONFIG) {
  let t1 = nextCronRunMs(cron, fromMs);
  if (t1 === null) return null;
  let t2 = nextCronRunMs(cron, t1);
  if (t2 === null) return t1;
  let n = t2 - t1;
  if (
    EVERY_N_MINUTES_PATTERN.test(cron) &&
    cfg.cacheLeadMs > 0 &&
    cfg.cacheLeadMs < n &&
    n >= CACHE_LEAD_MIN_INTERVAL_MS &&
    n - cfg.cacheLeadMs < CACHE_LEAD_MIN_INTERVAL_MS
  )
    return fromMs + n - cfg.cacheLeadMs;
  let jitter = Math.min(jitterFrac(taskId) * cfg.recurringFrac * n, cfg.recurringCapMs);
  return t1 + jitter;
}
/**
 * 一次性任务时间：落在整点/半点（oneShotMinuteMod）时按 ID 比例提前最多 oneShotMaxMs，避免集中触发。
 */
//@ chunk-93zax7h2.js:8610-8832 fingerprint = oneShotJitteredNextCronRunMs (0.887)
function oneShotJitteredNextCronRunMs(cron, fromMs, taskId, cfg = DEFAULT_CRON_JITTER_CONFIG) {
  let i = nextCronRunMs(cron, fromMs, { oneShot: !0 });
  if (i === null) return null;
  if (new Date(i).getMinutes() % cfg.oneShotMinuteMod !== 0) return i;
  let lead = cfg.oneShotFloorMs + jitterFrac(taskId) * (cfg.oneShotMaxMs - cfg.oneShotFloorMs);
  return Math.max(i - lead, fromMs);
}
/**
 * 任务的下次触发时间（循环按 lastFiredAt/createdAt，一次性按 createdAt）。
 */
//@ chunk-93zax7h2.js:8832-8946 fingerprint = addCronTask (0.827)
function nextFireTimeForTask(task, jitterConfig) {
  return task.recurring
    ? jitteredNextCronRunMs(task.cron, task.lastFiredAt ?? task.createdAt, task.id, jitterConfig)
    : oneShotJitteredNextCronRunMs(task.cron, task.createdAt, task.id, jitterConfig);
}
/**
 * 把时间戳四舍五入到整分钟。
 */
//@ chunk-93zax7h2.js:8946-9005 placement
function roundToMinute(ms) {
  return new Date(Math.round(ms / 60000) * 60000);
}
/**
 * 找出已错过（下次运行时间早于 now）的任务。
 */
//@ chunk-93zax7h2.js:9005-9121 placement = addCronTask (0.818)
function findMissedTasks(tasks, nowMs) {
  return tasks.filter((o) => {
    let r = nextCronRunMs(o.cron, o.createdAt, { oneShot: !o.recurring });
    return r !== null && r < nowMs;
  });
}
//@ chunk-e6aww6q8.js:2592580-2592660 placement
var HGr = 32,
  jXn = 64,
  NGr = 'pass action "watch" with its url if you still need that';
/**
 * 向 Map 写入（先删再插保持最新），超过上限时淘汰最早的键。
 */
//@ chunk-e6aww6q8.js:2592660-2592773 placement
function setWithLimit(e, n, r, s) {
  if ((e.delete(n), e.size >= s)) {
    let h = e.keys().next().value;
    if (h !== void 0) e.delete(h);
  }
  e.set(n, r);
}
/**
 * 向 Set 添加新值，超过上限时淘汰最早的值；已存在返回 false。
 */
//@ chunk-e6aww6q8.js:2592773-2592903 placement
function addWithLimit(e, n, r) {
  if (e.has(n)) return !1;
  if (e.size >= r) {
    let s = e.values().next().value;
    if (s !== void 0) e.delete(s);
  }
  return (e.add(n), !0);
}
//@ chunk-e6aww6q8.js:2592903-2592973 placement
function FGr(e, n) {
  for (let r of e) if (r.startsWith(`${n}:`)) e.delete(r);
}
//@ chunk-b0a246e7.js:1185-1216 placement
var K_t = /^u_[A-Za-z0-9_]{22}$/;

export {
  roundToMinute,
  p$e,
  oneShotJitteredNextCronRunMs,
  K_t,
  removeCronTasks,
  listAllCronTasks,
  addCronTask,
  nextFireTimeForTask,
  NGr,
  setWithLimit,
  HGr,
  FGr,
  addWithLimit,
  jXn,
  CACHE_LEAD_MIN_INTERVAL_MS,
  DEFAULT_CRON_JITTER_CONFIG,
  getCronFilePath,
  jitteredNextCronRunMs,
  isDurableCronUnavailable,
  isCronFileIgnored,
  readCronTasks,
  writeCronTasks,
  findMissedTasks,
  markCronTasksFired,
  hasCronTasksSync,
  nextCronRunMs,
};
