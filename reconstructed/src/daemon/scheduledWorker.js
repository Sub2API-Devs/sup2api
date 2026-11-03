/**
 * daemon/scheduledWorker.ts
 *
 * 2.1.316 新增。守护进程定时任务 worker。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-f1dqjgj0.js (18)
 * attribution: placement 18
 */
import { stat, readFile, readFile as readFile_2 } from "fs/promises";
import { dirname, join } from "path";
import { STORAGE_SPACES } from "../utils/storage/storageSpaces.js";
import { jL } from "../services/daemon/paths.js";
import { isStorageV5Enabled } from "../utils/hoverRest.js";
import {
  isENOENT,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  errorMessage,
} from "../utils/errors.js";
import { Wo, safeParseJSON } from "../utils/json.js";
import { jsonStringify } from "../utils/slowOperations.js";
import { getFileReader } from "../utils/fileStore.js";
import { writeFileAtomic } from "../utils/atomicPublishWrite.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { u, o, M, U, E, A } from "../../vendor/zod/v4/classic/schemas.js";
import { parseCronExpression } from "../utils/cron.js";
import { PERMISSION_MODE_MANUAL_ALIAS } from "../types/permissions.js";
import { getClaudeConfigDir } from "../utils/envUtils.js";
import { ownProcStart, isSameProcessAsync } from "../utils/processIdentity.js";
import { logForDebugging } from "../utils/debug.js";
import { jitteredNextCronRunMs, DEFAULT_CRON_JITTER_CONFIG } from "../utils/cronTasks.js";
import { processWrapperError } from "../utils/processWrapper.js";
import { getLaunchCommand } from "../utils/deepLink/registerProtocol.js";
import { WORKLOAD_CRON } from "../utils/workloadContext.js";
import { withFeatureTelemetry } from "../services/analytics/featureTelemetry.js";

//@ chunk-f1dqjgj0.js:948-964 placement
var jJe = 1048576;
/**
 * 从存储后端读 daemon.json：返回 text / absent / refused（非常规文件或超过 1MiB）/ failed / threw 之一。
 */
//@ chunk-f1dqjgj0.js:964-1382 placement
async function readDaemonConfigFromStorage(s) {
  let r;
  try {
    r = await Z(s);
  } catch (error) {
    return { kind: "threw", error: error };
  }
  if (!r.ok) {
    let n = "telemetryCode" in r.error ? r.error.telemetryCode : void 0;
    if (n === "ENXIO" || n === "EISDIR" || n === "EFBIG") return { kind: "refused" };
    return { kind: "failed", error: r.error };
  }
  let e = r.value.items[0];
  if (!e.found) return { kind: "absent" };
  if (e.totalBytes > jJe) return { kind: "refused" };
  return { kind: "text", text: Buffer.from(e.value).toString("utf8") };
}
//@ chunk-f1dqjgj0.js:1382-1467 placement
function Z(s) {
  return s.read([{ key: STORAGE_SPACES.state("daemon-config"), offset: 0, length: jJe + 1 }]);
}
/**
 * 读取 daemon.json 为对象：storage v5 默认路径走后端，否则读文件（拒绝非常规文件或超过 1MiB）；空文件返回 {}，格式错误抛错。
 */
//@ chunk-f1dqjgj0.js:1467-1922 placement
async function readDaemonConfig(s, r) {
  let e = s ?? jL(),
    n;
  if (isStorageV5Enabled() && r !== void 0 && e === jL()) n = await readDaemonConfigText(r, e);
  else
    try {
      let l = await stat(e);
      if (!l.isFile() || l.size > jJe)
        throw Error(`${e} is not a regular file (or exceeds 1MiB); refusing read-modify-write`);
      n = await readFile(e, "utf8");
    } catch (error) {
      if (!isENOENT(error)) throw error;
    }
  if (n === void 0 || n.trim() === "") return {};
  let a;
  try {
    a = JSON.parse(Wo(n));
  } catch {
    throw Error(`daemon.json is malformed: ${e}`);
  }
  if (a && typeof a === "object" && !Array.isArray(a)) return a;
  return {};
}
/**
 * 把 tNt 的结果转成文本或抛错（refused/failed/threw）。
 */
//@ chunk-f1dqjgj0.js:1922-2323 placement
async function readDaemonConfigText(s, r) {
  let e = await readDaemonConfigFromStorage(s);
  switch (e.kind) {
    case "text":
      return e.text;
    case "absent":
      return;
    case "refused": {
      let n = `${r} is not a regular file (or exceeds 1MiB); refusing read-modify-write`;
      throw Error(n);
    }
    case "failed":
      throw Object.assign(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `daemon.json read failed: ${e.error.code}`,
          "daemon.json v5 read failed",
        ),
        { cause: "cause" in e.error ? e.error.cause : e.error },
      );
    case "threw":
      throw e.error;
  }
}
/**
 * 读-改-写 daemon.json：调用修改函数（返回 false 则不写），storage v5 写入 state/daemon-config，否则原子写文件。
 */
//@ chunk-f1dqjgj0.js:2323-2770 placement
async function updateDaemonConfig(s, r, e) {
  let n = r ?? jL(),
    a = await readDaemonConfig(n, e);
  if ((await s(a)) === !1) return;
  if (isStorageV5Enabled() && e !== void 0 && n === jL()) {
    let write = await e.write(
      STORAGE_SPACES.state("daemon-config"),
      jsonStringify(a, null, 2) +
        `
`,
      { publishDiscipline: "atomic", mode: 438 & ~process.umask() },
    );
    if (!write.ok)
      throw Object.assign(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `daemon.json write failed: ${write.error.code}`,
          "daemon.json v5 write failed",
        ),
        { cause: "cause" in write.error ? write.error.cause : write.error },
      );
    return;
  }
  (await getFileReader().mkdir(dirname(n)),
    await writeFileAtomic(
      n,
      jsonStringify(a, null, 2) +
        `
`,
    ));
}
/**
 * 把配置里的目录项规范为数组（过滤无 dir 字段的项）。
 */
//@ chunk-f1dqjgj0.js:2770-2906 placement
function normalizeDirEntries(s) {
  if (Array.isArray(s)) return s.filter((r) => !!r && typeof r.dir === "string");
  if (s && typeof s.dir === "string") return [s];
  return [];
}
/**
 * 定时任务配置常量与 schema：最长运行 7 天（分钟）、允许的权限模式、单个任务 schema（id、cron、prompt、目录、启用、权限模式、模型、超时、排队上限）与整体 scheduled 配置 schema（任务 id 唯一、最大并发）。
 */
//@ chunk-f1dqjgj0.js:2975-3634 placement
var MIN_RUN_TIMEOUT_MS = 1000,
  MAX_RUN_TIMEOUT_MINUTES = 10080,
  SCHEDULED_PERMISSION_MODES = ["dontAsk", "auto", "default", "acceptEdits", "plan", "bypassPermissions"],
  scheduledTaskSchema = DoctorLazy(() =>
    u({
      id: o().min(1),
      cron: o().refine((s) => parseCronExpression(s) !== null, {
        message: "invalid 5-field cron expression",
      }),
      prompt: o().min(1),
      directory: o().min(1),
      enabled: M().default(!0),
      permissionMode: U([...SCHEDULED_PERMISSION_MODES, PERMISSION_MODE_MANUAL_ALIAS])
        .transform((s) => (s === PERMISSION_MODE_MANUAL_ALIAS ? "default" : s))
        .default("dontAsk"),
      model: o().optional(),
      runTimeoutMinutes: E().positive().max(MAX_RUN_TIMEOUT_MINUTES).default(30),
      maxQueued: E().int().positive().default(1),
    }).strict(),
  ),
  scheduledConfigSchema = DoctorLazy(() =>
    u({
      tasks: A(scheduledTaskSchema())
        .default([])
        .refine((s) => new Set(s.map((r) => r.id)).size === s.length, { message: "task ids must be unique" }),
      maxConcurrent: E().int().positive().default(1),
    }).strict(),
  );
//@ chunk-f1dqjgj0.js:3634-3694 placement
function B() {
  return join(getClaudeConfigDir(), "daemon.scheduled.status.json");
}
//@ chunk-f1dqjgj0.js:3694-3743 placement
function N() {
  return STORAGE_SPACES.state("scheduled-status");
}
/**
 * 写出定时任务 worker 的状态文件（pid、进程启动时间、写入时间与任务列表），经存储后端或本地文件。
 */
//@ chunk-f1dqjgj0.js:3743-4054 placement
async function writeScheduledStatus(s, r) {
  let e = { workerPid: process.pid, workerProcStart: ownProcStart(), writtenAt: Date.now(), tasks: s };
  if (isStorageV5Enabled() && r) {
    try {
      let write = await r.write(N(), jsonStringify(e), { mode: 438 & ~process.umask() });
      if (!write.ok) logForDebugging(`writeScheduledStatus: ${write.error.code}`);
    } catch (error) {
      logForDebugging(`writeScheduledStatus: ${errorMessage(error)}`);
    }
    return;
  }
  try {
    await writeFileAtomic(B(), jsonStringify(e));
  } catch {}
}
/**
 * 读取定时 worker 状态文件：校验格式，且 worker 进程仍在、启动标记一致才返回，否则 null。
 */
//@ chunk-f1dqjgj0.js:4054-4549 placement
async function readScheduledStatus(s) {
  let r;
  if (isStorageV5Enabled() && s !== void 0) {
    let a;
    try {
      a = await s.readText([N()]);
    } catch {
      return null;
    }
    if (!a.ok) return null;
    let l = a.value.items[0];
    if (!l.found) return null;
    r = l.value;
  } else
    try {
      r = await readFile_2(B(), "utf8");
    } catch {
      return null;
    }
  let e = safeParseJSON(r, !1);
  if (!e || typeof e !== "object") return null;
  let n = e;
  if (typeof n.workerPid !== "number" || typeof n.tasks !== "object" || n.tasks === null) return null;
  try {
    process.kill(n.workerPid, 0);
  } catch {
    return null;
  }
  if (!(await isSameProcessAsync(n.workerPid, n.workerProcStart))) return null;
  return e;
}
//@ chunk-f1dqjgj0.js:4549-7250 placement
var runScheduledWorker = async (s, r, e, n, a) => {
  let { tasks: tasks, maxConcurrent: maxConcurrent } = scheduledConfigSchema().parse(s),
    { initializeErrorLogSink: initializeErrorLogSink } = await import("./chunk-nynswhsz.js"),
    { initializeAnalyticsSink: initializeAnalyticsSink } = await import("./chunk-dn8vrmng.js");
  if ((initializeErrorLogSink(), initializeAnalyticsSink(), !n.getAccessToken()))
    (e("scheduled worker: not authed \u2014 run `claude auth login`"), process.exit(1));
  let { awaitPolicyLimitsColdStart: awaitPolicyLimitsColdStart, stopPolicyLimits: stopPolicyLimits } =
    await import("./chunk-qchbrsbw.js");
  if (r.aborted) return;
  if (
    (r.addEventListener("abort", () => stopPolicyLimits(), { once: !0 }),
    await awaitPolicyLimitsColdStart(),
    r.aborted)
  )
    return;
  let { query: query } = await import("./chunk-y805ph4h.js");
  if (
    (e(`scheduled worker started tasks=${tasks.length} maxConcurrent=${maxConcurrent}`), tasks.length === 0)
  ) {
    let c = setInterval(() => {}, 60000);
    (await new Promise((i) => {
      if (r.aborted) {
        i();
        return;
      }
      r.addEventListener("abort", () => i(), { once: !0 });
    }),
      clearInterval(c));
    return;
  }
  let b = [],
    x = new Set(),
    S = null;
  function J(c) {
    let reduced = b.reduce((f, k) => (k.task.id === c.id ? f + 1 : f), 0);
    if (reduced >= c.maxQueued) {
      e(`task=${c.id} dropped (queue full: ${reduced}/${c.maxQueued})`);
      return;
    }
    (b.push({ task: c }), S?.(), (S = null));
  }
  let v = new Map(),
    F = new Set(),
    now = Date.now();
  function R() {
    let c = {};
    for (let i of tasks) {
      let f = v.get(i.id);
      c[i.id] = { running: F.has(i.id), ...(f !== void 0 && { lastFiredAt: f }) };
    }
    writeScheduledStatus(c, a);
  }
  R();
  function G(c) {
    let i = v.get(c.id) ?? now;
    return jitteredNextCronRunMs(c.cron, i, c.id, DEFAULT_CRON_JITTER_CONFIG);
  }
  let V = setInterval(
    (c, i, f, k) => {
      let now = Date.now();
      for (let h of c) {
        if (!h.enabled) continue;
        let w = i(h);
        if (w === null) continue;
        if (w <= now) (f.set(h.id, now), k(h));
      }
    },
    MIN_RUN_TIMEOUT_MS,
    tasks,
    G,
    v,
    J,
  );
  r.addEventListener("abort", () => {
    clearInterval(V);
    for (let c of x) c.abort();
    (S?.(), (S = null));
  });
  let T = new Set();
  async function X(c) {
    let { task: task } = c,
      f = processWrapperError();
    if (f) {
      e(`task=${task.id} refused: ${f}`);
      return;
    }
    let abortController = new AbortController();
    (x.add(abortController), F.add(task.id), R());
    let P = setTimeout(
      (w) => w.abort(),
      Math.min(task.runTimeoutMinutes, MAX_RUN_TIMEOUT_MINUTES) * 60000,
      abortController,
    );
    e(`task=${task.id} start cron='${task.cron}' dir='${task.directory}'`);
    let h = getLaunchCommand({ pinToCurrentBinary: !0 });
    try {
      let w = query({
        prompt: task.prompt,
        options: {
          cwd: task.directory,
          permissionMode: task.permissionMode,
          ...(task.permissionMode === "bypassPermissions" && { allowDangerouslySkipPermissions: !0 }),
          ...(task.model && { model: task.model }),
          systemPrompt: { type: "preset", preset: "claude_code" },
          settingSources: ["user", "project", "local"],
          pathToClaudeCodeExecutable: h.cmd,
          executableArgs: h.prefixArgs,
          abortController: abortController,
          stderr: (g) => e(`[${task.id}] ${g.trimEnd()}`),
          workload: WORKLOAD_CRON,
        },
      });
      for await (let g of w)
        if (g.type === "result")
          e(
            `task=${task.id} result subtype=${g.subtype} duration=${g.duration_ms}ms cost=$${g.total_cost_usd.toFixed(4)}`,
          );
    } catch (error) {
      e(`task=${task.id} threw: ${error}`);
    } finally {
      (clearTimeout(P), x.delete(abortController), F.delete(task.id), R());
    }
  }
  while (!r.aborted) {
    while (T.size < maxConcurrent && b.length > 0 && !r.aborted) {
      let c = b.shift(),
        i = X(c).finally(() => {
          (T.delete(i), S?.(), (S = null));
        });
      T.add(i);
    }
    if (r.aborted) break;
    if (b.length === 0 || T.size >= maxConcurrent)
      await new Promise((c) => {
        S = c;
      });
  }
  await Promise.allSettled(Array.from(T));
};
//@ chunk-f1dqjgj0.js:7250-7469 placement
function readScheduledSection(s) {
  let scheduled = s.scheduled,
    e = {};
  if (Array.isArray(scheduled) && scheduled.length > 0 && typeof scheduled[0] === "object")
    e = scheduled[0] ?? {};
  else if (scheduled && typeof scheduled === "object" && !Array.isArray(scheduled)) e = scheduled;
  let n = Array.isArray(e.tasks) ? e.tasks : [];
  return { ...e, tasks: n };
}
//@ chunk-f1dqjgj0.js:7469-7580 placement
function writeScheduledSection(s, r) {
  let scheduled = s.scheduled;
  if (Array.isArray(scheduled)) {
    let sliced = scheduled.slice();
    ((sliced[0] = r), (s.scheduled = sliced));
  } else s.scheduled = r;
}
/**
 * 新增或替换一个定时任务（按 id），校验后写入 daemon.json，记录 daemon_scheduled_add。
 */
//@ chunk-f1dqjgj0.js:7580-7789 placement
async function addScheduledTask(s, r, e) {
  return withFeatureTelemetry("daemon_scheduled_add", async () => {
    (scheduledTaskSchema().parse(s),
      await updateDaemonConfig(
        (n) => {
          let a = readScheduledSection(n),
            filtered = a.tasks.filter((task) => !(task && typeof task === "object" && task.id === s.id));
          (filtered.push(s), writeScheduledSection(n, { ...a, tasks: filtered }));
        },
        r,
        e,
      ));
  });
}
/**
 * 按 id 删除定时任务，最后一个删除时移除 scheduled 段；返回是否删除了，记录 daemon_scheduled_remove。
 */
//@ chunk-f1dqjgj0.js:7789-8186 placement
async function removeScheduledTask(s, r, e) {
  return withFeatureTelemetry("daemon_scheduled_remove", async () => {
    let n = !1;
    return (
      await updateDaemonConfig(
        (a) => {
          if (!("scheduled" in a)) return !1;
          let l = readScheduledSection(a),
            filtered = l.tasks.filter((task) => !(task && typeof task === "object" && task.id === s));
          if (filtered.length === l.tasks.length) return !1;
          if (filtered.length === 0) {
            let scheduled = a.scheduled;
            if (Array.isArray(scheduled) && scheduled.length > 1) a.scheduled = scheduled.slice(1);
            else delete a.scheduled;
          } else writeScheduledSection(a, { ...l, tasks: filtered });
          n = !0;
        },
        r,
        e,
      ),
      n
    );
  });
}
/**
 * 列出 daemon.json 中通过 schema 校验的定时任务。
 */
//@ chunk-f1dqjgj0.js:8186-8358 placement
async function listScheduledTasks(s, r) {
  let e = await readDaemonConfig(s, r);
  if (!("scheduled" in e)) return [];
  let n = readScheduledSection(e),
    a = [];
  for (let task of n.tasks) {
    let safeParse = scheduledTaskSchema().safeParse(task);
    if (safeParse.success) a.push(safeParse.data);
  }
  return a;
}

export {
  listScheduledTasks,
  removeScheduledTask,
  SCHEDULED_PERMISSION_MODES,
  addScheduledTask,
  readScheduledStatus,
  readDaemonConfigFromStorage,
  jJe,
  updateDaemonConfig,
  normalizeDirEntries,
  scheduledConfigSchema,
  runScheduledWorker,
};
