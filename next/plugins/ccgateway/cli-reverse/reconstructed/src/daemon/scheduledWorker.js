/**
 * daemon/scheduledWorker.ts
 *
 * 2.1.316 新增。守护进程定时任务 worker。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-cg4qjpvw.js (18)
 * attribution: placement 18
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { stat, readFile } from "fs/promises";
import { dirname, join } from "path";
import { STORAGE_SPACES } from "../utils/storage/storageSpaces.js";
import { daemonJsonPath } from "../services/daemon/paths.js";
import { isStorageV5Enabled } from "../utils/hoverRest.js";
import {
  isENOENT,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  errorMessage,
} from "../utils/errors.js";
import { stripBom, safeParseJSON } from "../utils/json.js";
import { jsonStringify } from "../utils/slowOperations.js";
import { getFileReader } from "../utils/fileStore.js";
import { writeFileAtomic } from "../utils/atomicPublishWrite.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import {
  objectSchema,
  stringSchema,
  booleanSchema,
  _enum,
  numberSchema,
  array,
} from "../../vendor/zod/v4/classic/schemas.js";
import { parseCronExpression } from "../utils/cron.js";
import { PERMISSION_MODE_MANUAL_ALIAS } from "../types/permissions.js";
import { getClaudeConfigDir } from "../utils/markdownConfigLoader.js";
import { ownProcStart, isSameProcessAsync } from "../utils/processIdentity.js";
import { logForDebugging } from "../utils/debug.js";
import { jitteredNextCronRunMs, DEFAULT_CRON_JITTER_CONFIG } from "../utils/cronTasks.js";
import { processWrapperError } from "../utils/processWrapper.js";
import { getLaunchCommand } from "../utils/deepLink/registerProtocol.js";
import { WORKLOAD_CRON } from "../utils/workloadContext.js";
import { withFeatureTelemetry } from "../services/analytics/featureTelemetry.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-cg4qjpvw.js:948-964 placement
/**
 * 导出值：MAX_DAEMON_CONFIG_BYTES（1048576）。
 */
var MAX_DAEMON_CONFIG_BYTES = 1048576;
//@ chunk-cg4qjpvw.js:964-1382 placement
/**
 * 从存储后端读 daemon.json：返回 text / absent / refused（非常规文件或超过 1MiB）/ failed / threw 之一。
 */
async function readDaemonConfigFromStorage(storageV5) {
  let result;
  try {
    result = await readDaemonConfig(storageV5);
  } catch (error) {
    return {
      kind: "threw",
      error,
    };
  }
  if (!result.ok) {
    let telemetryCode = "telemetryCode" in result.error ? result.error.telemetryCode : undefined;
    if (telemetryCode === "ENXIO" || telemetryCode === "EISDIR" || telemetryCode === "EFBIG")
      return {
        kind: "refused",
      };
    return {
      kind: "failed",
      error: result.error,
    };
  }
  let item = result.value.items[0];
  if (!item.found)
    return {
      kind: "absent",
    };
  if (item.totalBytes > MAX_DAEMON_CONFIG_BYTES)
    return {
      kind: "refused",
    };
  return {
    kind: "text",
    text: Buffer.from(item.value).toString("utf8"),
  };
}
//@ chunk-cg4qjpvw.js:1382-1467 placement
function readDaemonConfig(storageV5) {
  return storageV5.read([
    {
      key: STORAGE_SPACES.state("daemon-config"),
      offset: 0,
      length: MAX_DAEMON_CONFIG_BYTES + 1,
    },
  ]);
}
//@ chunk-cg4qjpvw.js:1467-1922 placement
/**
 * 读取 daemon.json 为对象：storage v5 默认路径走后端，否则读文件（拒绝非常规文件或超过 1MiB）；空文件返回 {}，格式错误抛错。
 */
async function readDaemonConfig_2(customPath, storageV5) {
  let configPath = customPath ?? daemonJsonPath();
  let text;
  if (isStorageV5Enabled() && storageV5 !== undefined && configPath === daemonJsonPath())
    text = await readDaemonConfigText(storageV5, configPath);
  else
    try {
      let stats = await stat(configPath);
      if (!stats.isFile() || stats.size > MAX_DAEMON_CONFIG_BYTES)
        throw Error(`${configPath} is not a regular file (or exceeds 1MiB); refusing read-modify-write`);
      text = await readFile(configPath, "utf8");
    } catch (error) {
      if (!isENOENT(error)) throw error;
    }
  if (text === undefined || text.trim() === "") return {};
  let parsed;
  try {
    parsed = JSON.parse(stripBom(text));
  } catch {
    throw Error(`daemon.json is malformed: ${configPath}`);
  }
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
  return {};
}
//@ chunk-cg4qjpvw.js:1922-2323 placement
/**
 * 把 tNt 的结果转成文本或抛错（refused/failed/threw）。
 */
async function readDaemonConfigText(storageV5, configPath) {
  let daemonConfigFromStorage = await readDaemonConfigFromStorage(storageV5);
  switch (daemonConfigFromStorage.kind) {
    case "text":
      return daemonConfigFromStorage.text;
    case "absent":
      return;
    case "refused": {
      let refusalMessage = `${configPath} is not a regular file (or exceeds 1MiB); refusing read-modify-write`;
      throw Error(refusalMessage);
    }
    case "failed":
      throw Object.assign(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `daemon.json read failed: ${daemonConfigFromStorage.error.code}`,
          "daemon.json v5 read failed",
        ),
        {
          cause:
            "cause" in daemonConfigFromStorage.error
              ? daemonConfigFromStorage.error.cause
              : daemonConfigFromStorage.error,
        },
      );
    case "threw":
      throw daemonConfigFromStorage.error;
  }
}
//@ chunk-cg4qjpvw.js:2323-2770 placement
/**
 * 读-改-写 daemon.json：调用修改函数（返回 false 则不写），storage v5 写入 state/daemon-config，否则原子写文件。
 */
async function updateDaemonConfig(mutate, customPath, storageV5) {
  let configPath = customPath ?? daemonJsonPath();
  let daemonConfig = await readDaemonConfig_2(configPath, storageV5);
  if ((await mutate(daemonConfig)) === false) return;
  if (isStorageV5Enabled() && storageV5 !== undefined && configPath === daemonJsonPath()) {
    let writeResult = await storageV5.write(
      STORAGE_SPACES.state("daemon-config"),
      jsonStringify(daemonConfig, null, 2) +
        `
`,
      {
        publishDiscipline: "atomic",
        mode: 438 & ~process.umask(),
      },
    );
    if (!writeResult.ok)
      throw Object.assign(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `daemon.json write failed: ${writeResult.error.code}`,
          "daemon.json v5 write failed",
        ),
        {
          cause: "cause" in writeResult.error ? writeResult.error.cause : writeResult.error,
        },
      );
    return;
  }
  await getFileReader().mkdir(dirname(configPath));
  await writeFileAtomic(
    configPath,
    jsonStringify(daemonConfig, null, 2) +
      `
`,
  );
}
//@ chunk-cg4qjpvw.js:2770-2906 placement
/**
 * 把配置里的目录项规范为数组（过滤无 dir 字段的项）。
 */
function normalizeDirEntries(remoteControl) {
  if (Array.isArray(remoteControl))
    return remoteControl.filter((entry) => !!entry && typeof entry.dir === "string");
  if (remoteControl && typeof remoteControl.dir === "string") return [remoteControl];
  return [];
}
//@ chunk-cg4qjpvw.js:2975-3634 placement
/**
 * 定时任务配置常量与 schema：最长运行 7 天（分钟）、允许的权限模式、单个任务 schema（id、cron、prompt、目录、启用、权限模式、模型、超时、排队上限）与整体 scheduled 配置 schema（任务 id 唯一、最大并发）。
 */
var MIN_RUN_TIMEOUT_MS; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var MAX_RUN_TIMEOUT_MINUTES;
var SCHEDULED_PERMISSION_MODES;
var scheduledTaskSchema;
var scheduledConfigSchema;
deferInit("chunk-cg4qjpvw.js:2975", () => {
  MIN_RUN_TIMEOUT_MS = 1000;
  MAX_RUN_TIMEOUT_MINUTES = 10080;
  SCHEDULED_PERMISSION_MODES = ["dontAsk", "auto", "default", "acceptEdits", "plan", "bypassPermissions"];
  scheduledTaskSchema = DoctorLazy(() =>
    objectSchema({
      id: stringSchema().min(1),
      cron: stringSchema().refine((cron) => parseCronExpression(cron) !== null, {
        message: "invalid 5-field cron expression",
      }),
      prompt: stringSchema().min(1),
      directory: stringSchema().min(1),
      enabled: booleanSchema().default(true),
      permissionMode: _enum([...SCHEDULED_PERMISSION_MODES, PERMISSION_MODE_MANUAL_ALIAS])
        .transform((mode) => (mode === PERMISSION_MODE_MANUAL_ALIAS ? "default" : mode))
        .default("dontAsk"),
      model: stringSchema().optional(),
      runTimeoutMinutes: numberSchema().positive().max(MAX_RUN_TIMEOUT_MINUTES).default(30),
      maxQueued: numberSchema().int().positive().default(1),
    }).strict(),
  );
  scheduledConfigSchema = DoctorLazy(() =>
    objectSchema({
      tasks: array(scheduledTaskSchema())
        .default([])
        .refine((tasks) => new Set(tasks.map((task) => task.id)).size === tasks.length, {
          message: "task ids must be unique",
        }),
      maxConcurrent: numberSchema().int().positive().default(1),
    }).strict(),
  );
});
//@ chunk-cg4qjpvw.js:3634-3694 placement
function scheduledStatusPath() {
  return join(getClaudeConfigDir(), "daemon.scheduled.status.json");
}
//@ chunk-cg4qjpvw.js:3694-3743 placement
function scheduledStatusState() {
  return STORAGE_SPACES.state("scheduled-status");
}
//@ chunk-cg4qjpvw.js:3743-4054 placement
/**
 * 写出定时任务 worker 的状态文件（pid、进程启动时间、写入时间与任务列表），经存储后端或本地文件。
 */
async function writeScheduledStatus(tasks, storageV5) {
  let status = {
    workerPid: process.pid,
    workerProcStart: ownProcStart(),
    writtenAt: Date.now(),
    tasks,
  };
  if (isStorageV5Enabled() && storageV5) {
    try {
      let result = await storageV5.write(scheduledStatusState(), jsonStringify(status), {
        mode: 438 & ~process.umask(),
      });
      if (!result.ok) logForDebugging(`writeScheduledStatus: ${result.error.code}`);
    } catch (error) {
      logForDebugging(`writeScheduledStatus: ${errorMessage(error)}`);
    }
    return;
  }
  try {
    await writeFileAtomic(scheduledStatusPath(), jsonStringify(status));
  } catch {}
}
//@ chunk-cg4qjpvw.js:4054-4549 placement
/**
 * 读取定时 worker 状态文件：校验格式，且 worker 进程仍在、启动标记一致才返回，否则 null。
 */
async function readScheduledStatus(storageV5) {
  let text;
  if (isStorageV5Enabled() && storageV5 !== undefined) {
    let readResult;
    try {
      readResult = await storageV5.readText([scheduledStatusState()]);
    } catch {
      return null;
    }
    if (!readResult.ok) return null;
    let item = readResult.value.items[0];
    if (!item.found) return null;
    text = item.value;
  } else
    try {
      text = await readFile(scheduledStatusPath(), "utf8");
    } catch {
      return null;
    }
  let status = safeParseJSON(text, false);
  if (!status || typeof status !== "object") return null;
  let parsed = status;
  if (typeof parsed.workerPid !== "number" || typeof parsed.tasks !== "object" || parsed.tasks === null)
    return null;
  try {
    process.kill(parsed.workerPid, 0);
  } catch {
    return null;
  }
  if (!(await isSameProcessAsync(parsed.workerPid, parsed.workerProcStart))) return null;
  return status;
}
//@ chunk-cg4qjpvw.js:4549-7250 placement
var runScheduledWorker = async (config, signal, log, authClient, storageV5) => {
  let { tasks, maxConcurrent } = scheduledConfigSchema().parse(config);
  let { initializeErrorLogSink } = await import("../utils/errorLogSink.js");
  let { initializeAnalyticsSink } = await import("../services/analytics/sink.js");
  initializeErrorLogSink();
  initializeAnalyticsSink();
  if (!authClient.getAccessToken()) {
    log("scheduled worker: not authed \u2014 run `claude auth login`");
    process.exit(1);
  }
  let { awaitPolicyLimitsColdStart, stopPolicyLimits } =
    await import("../services/policyLimits/DefaultPolicyLimitsClientSlot.lazy.js");
  if (signal.aborted) return;
  signal.addEventListener("abort", () => stopPolicyLimits(), {
    once: true,
  });
  await awaitPolicyLimitsColdStart();
  if (signal.aborted) return;
  let { query } = await import("../../vendor/@anthropic-ai/claude-agent-sdk/query.lazy.js");
  log(`scheduled worker started tasks=${tasks.length} maxConcurrent=${maxConcurrent}`);
  if (tasks.length === 0) {
    let interval = setInterval(() => {}, 60000);
    await new Promise((resolve) => {
      if (signal.aborted) {
        resolve();
        return;
      }
      signal.addEventListener("abort", () => resolve(), {
        once: true,
      });
    });
    clearInterval(interval);
    return;
  }
  let queue = [];
  let abortControllers = new Set();
  let wakeUp = null;
  function enqueue(task) {
    let reduced = queue.reduce((acc, queued) => (queued.task.id === task.id ? acc + 1 : acc), 0);
    if (reduced >= task.maxQueued) {
      log(`task=${task.id} dropped (queue full: ${reduced}/${task.maxQueued})`);
      return;
    }
    queue.push({
      task,
    });
    wakeUp?.();
    wakeUp = null;
  }
  let lastFiredAt = new Map();
  let runningIds = new Set();
  let now = Date.now();
  function writeStatus() {
    let tasks_2 = {};
    for (let task of tasks) {
      let lastFired = lastFiredAt.get(task.id);
      tasks_2[task.id] = {
        running: runningIds.has(task.id),
        ...(lastFired !== undefined && {
          lastFiredAt: lastFired,
        }),
      };
    }
    writeScheduledStatus(tasks_2, storageV5);
  }
  writeStatus();
  function nextRunAt(task) {
    let fromMs = lastFiredAt.get(task.id) ?? now;
    return jitteredNextCronRunMs(task.cron, fromMs, task.id, DEFAULT_CRON_JITTER_CONFIG);
  }
  let interval = setInterval(
    (tasks_, getNextRun, lastFiredAt_, enqueue_) => {
      let now = Date.now();
      for (let task of tasks_) {
        if (!task.enabled) continue;
        let nextRun = getNextRun(task);
        if (nextRun === null) continue;
        if (nextRun <= now) {
          lastFiredAt_.set(task.id, now);
          enqueue_(task);
        }
      }
    },
    MIN_RUN_TIMEOUT_MS,
    tasks,
    nextRunAt,
    lastFiredAt,
    enqueue,
  );
  signal.addEventListener("abort", () => {
    clearInterval(interval);
    for (let controller of abortControllers) controller.abort();
    wakeUp?.();
    wakeUp = null;
  });
  let inFlight = new Set();
  async function runTask(queuedTask) {
    let { task } = queuedTask;
    let refusal = processWrapperError();
    if (refusal) {
      log(`task=${task.id} refused: ${refusal}`);
      return;
    }
    let abortController = new AbortController();
    abortControllers.add(abortController);
    runningIds.add(task.id);
    writeStatus();
    let timer = setTimeout(
      (controller) => controller.abort(),
      Math.min(task.runTimeoutMinutes, MAX_RUN_TIMEOUT_MINUTES) * 60000,
      abortController,
    );
    log(`task=${task.id} start cron='${task.cron}' dir='${task.directory}'`);
    let launchCommand = getLaunchCommand({
      pinToCurrentBinary: true,
    });
    try {
      let stream = query({
        prompt: task.prompt,
        options: {
          cwd: task.directory,
          permissionMode: task.permissionMode,
          ...(task.permissionMode === "bypassPermissions" && {
            allowDangerouslySkipPermissions: true,
          }),
          ...(task.model && {
            model: task.model,
          }),
          systemPrompt: {
            type: "preset",
            preset: "claude_code",
          },
          settingSources: ["user", "project", "local"],
          pathToClaudeCodeExecutable: launchCommand.cmd,
          executableArgs: launchCommand.prefixArgs,
          abortController,
          stderr: (chunk) => log(`[${task.id}] ${chunk.trimEnd()}`),
          workload: WORKLOAD_CRON,
        },
      });
      for await (let message of stream)
        if (message.type === "result")
          log(
            `task=${task.id} result subtype=${message.subtype} duration=${message.duration_ms}ms cost=$${message.total_cost_usd.toFixed(4)}`,
          );
    } catch (error) {
      log(`task=${task.id} threw: ${error}`);
    } finally {
      clearTimeout(timer);
      abortControllers.delete(abortController);
      runningIds.delete(task.id);
      writeStatus();
    }
  }
  while (!signal.aborted) {
    while (inFlight.size < maxConcurrent && queue.length > 0 && !signal.aborted) {
      let queuedTask = queue.shift();
      let runPromise = runTask(queuedTask).finally(() => {
        inFlight.delete(runPromise);
        wakeUp?.();
        wakeUp = null;
      });
      inFlight.add(runPromise);
    }
    if (signal.aborted) break;
    if (queue.length === 0 || inFlight.size >= maxConcurrent)
      await new Promise((resolve) => {
        wakeUp = resolve;
      });
  }
  await Promise.allSettled(Array.from(inFlight));
};
//@ chunk-cg4qjpvw.js:7250-7469 placement
function readScheduledSection(config) {
  let scheduled = config.scheduled;
  let section = {};
  if (Array.isArray(scheduled) && scheduled.length > 0 && typeof scheduled[0] === "object")
    section = scheduled[0] ?? {};
  else if (scheduled && typeof scheduled === "object" && !Array.isArray(scheduled)) section = scheduled;
  let tasks = Array.isArray(section.tasks) ? section.tasks : [];
  return {
    ...section,
    tasks,
  };
}
//@ chunk-cg4qjpvw.js:7469-7580 placement
function writeScheduledSection(config, section) {
  let scheduled = config.scheduled;
  if (Array.isArray(scheduled)) {
    let sliced = scheduled.slice();
    sliced[0] = section;
    config.scheduled = sliced;
  } else config.scheduled = section;
}
//@ chunk-cg4qjpvw.js:7580-7789 placement
/**
 * 新增或替换一个定时任务（按 id），校验后写入 daemon.json，记录 daemon_scheduled_add。
 */
async function addScheduledTask(task, customPath, storageV5) {
  return withFeatureTelemetry("daemon_scheduled_add", async () => {
    scheduledTaskSchema().parse(task);
    await updateDaemonConfig(
      (config) => {
        let scheduledSection = readScheduledSection(config);
        let filtered = scheduledSection.tasks.filter(
          (task_2) => !(task_2 && typeof task_2 === "object" && task_2.id === task.id),
        );
        filtered.push(task);
        writeScheduledSection(config, {
          ...scheduledSection,
          tasks: filtered,
        });
      },
      customPath,
      storageV5,
    );
  });
}
//@ chunk-cg4qjpvw.js:7789-8186 placement
/**
 * 按 id 删除定时任务，最后一个删除时移除 scheduled 段；返回是否删除了，记录 daemon_scheduled_remove。
 */
async function removeScheduledTask(taskId, customPath, storageV5) {
  return withFeatureTelemetry("daemon_scheduled_remove", async () => {
    let removed = false;
    await updateDaemonConfig(
      (config) => {
        if (!("scheduled" in config)) return false;
        let scheduledSection = readScheduledSection(config);
        let filtered = scheduledSection.tasks.filter(
          (task) => !(task && typeof task === "object" && task.id === taskId),
        );
        if (filtered.length === scheduledSection.tasks.length) return false;
        if (filtered.length === 0) {
          let scheduled = config.scheduled;
          if (Array.isArray(scheduled) && scheduled.length > 1) config.scheduled = scheduled.slice(1);
          else delete config.scheduled;
        } else
          writeScheduledSection(config, {
            ...scheduledSection,
            tasks: filtered,
          });
        removed = true;
      },
      customPath,
      storageV5,
    );
    return removed;
  });
}
//@ chunk-cg4qjpvw.js:8186-8358 placement
/**
 * 列出 daemon.json 中通过 schema 校验的定时任务。
 */
async function listScheduledTasks(customPath, storageV5) {
  let config = await readDaemonConfig_2(customPath, storageV5);
  if (!("scheduled" in config)) return [];
  let scheduledSection = readScheduledSection(config);
  let tasks = [];
  for (let task of scheduledSection.tasks) {
    let parsed = scheduledTaskSchema().safeParse(task);
    if (parsed.success) tasks.push(parsed.data);
  }
  return tasks;
}
export {
  listScheduledTasks,
  addScheduledTask,
  removeScheduledTask,
  SCHEDULED_PERMISSION_MODES,
  readScheduledStatus,
  MAX_DAEMON_CONFIG_BYTES,
  readDaemonConfigFromStorage,
  updateDaemonConfig,
  normalizeDirEntries,
  scheduledConfigSchema,
  runScheduledWorker,
};
