/**
 * plugins/functionHooks/hooksWorker.ts
 *
 * 2.1.316 新增：hooks worker 线程入口与 worker 脚本构造
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (16)
 * attribution: placement 16
 */
import { randomUUID } from "crypto";
import { readFileSync, readdirSync } from "fs";
import { getVersionBase } from "../../services/analytics/metadata.js";
import { getPlatform } from "../../utils/platform.js";
import { STAMP_SLOT_COUNT } from "./vm/vmGlobals.js";
import { MARKS_SLOT_COUNT } from "./hostBridge.js";
import { createValueSlot } from "../../utils/valueSlot.js";

//@ chunk-5xgkngpb.js:3789875-3790974 placement
/**
 * $.host.version：返回 Claude Code 版本号、可选基线版本与构建时间。
 */
function hostVersionInfo() {
  let versionBase = getVersionBase();
  let BUILD_TIME =
    {
      ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
      PACKAGE_URL: "@anthropic-ai/claude-code",
      README_URL: "https://code.claude.com/docs/en/overview",
      VERSION: "2.1.318",
      FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
      BUILD_TIME: "2026-11-03T18:52:53Z",
      GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
      HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
      DD_SOURCEMAP_GROUP: "default",
    }.BUILD_TIME || undefined;
  return Promise.resolve({
    version: {
      ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
      PACKAGE_URL: "@anthropic-ai/claude-code",
      README_URL: "https://code.claude.com/docs/en/overview",
      VERSION: "2.1.318",
      FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
      BUILD_TIME: "2026-11-03T18:52:53Z",
      GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
      HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
      DD_SOURCEMAP_GROUP: "default",
    }.VERSION,
    ...(versionBase !== undefined && {
      base: versionBase,
    }),
    ...(BUILD_TIME !== undefined && {
      builtAt: BUILD_TIME,
    }),
  });
}
//@ chunk-5xgkngpb.js:3802687-3802744 placement
/**
 * 构造 worker 线程选项
 */
var workerThreadOptions = (name, stamp, marks) => ({
  name,
  workerData: {
    stamp,
    marks,
  },
});
//@ chunk-5xgkngpb.js:3802744-3802768 placement
/**
 * Bun 打包前缀
 */
var BUN_ROOT_PREFIX = "B:/~BUN/root/";
//@ chunk-5xgkngpb.js:3802768-3802851 placement (2.1.88 match: formatUri, 1)
function formatUri(uri) {
  return getPlatform() === "windows" && uri.startsWith(BUN_ROOT_PREFIX) ? uri : new URL(`file://${uri}`);
}
//@ chunk-5xgkngpb.js:3802889-3802947 placement
/**
 * hooks-<uuid前段>
 */
function newWorkerName() {
  let [head] = randomUUID().split("-");
  return `hooks-${head}`;
}
//@ chunk-5xgkngpb.js:3802947-3804023 placement
/**
 * hooks worker 脚本的 URL：构建内的 HOOKS_WORKER_URL，否则源码相对路径。
 */
var hooksWorkerUrl = () =>
  ({
    ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
    PACKAGE_URL: "@anthropic-ai/claude-code",
    README_URL: "https://code.claude.com/docs/en/overview",
    VERSION: "2.1.318",
    FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
    BUILD_TIME: "2026-11-03T18:52:53Z",
    GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
    HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
    DD_SOURCEMAP_GROUP: "default",
  }).HOOKS_WORKER_URL
    ? formatUri(
        {
          ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
          PACKAGE_URL: "@anthropic-ai/claude-code",
          README_URL: "https://code.claude.com/docs/en/overview",
          VERSION: "2.1.318",
          FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
          BUILD_TIME: "2026-11-03T18:52:53Z",
          GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
          HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
          DD_SOURCEMAP_GROUP: "default",
        }.HOOKS_WORKER_URL,
      )
    : new URL("../../../hooks-worker/hooks-worker.ts", import.meta.url);
//@ chunk-5xgkngpb.js:3804023-3804035 placement
/**
 * 1e6
 */
var MAX_PROC_STATUS_BYTES = 1e6;
//@ chunk-5xgkngpb.js:3804106-3804189 placement
/**
 * 读 /proc/self/task 文件
 */
function readProcThreadFile(threadId, file) {
  try {
    return readFileSync(`/proc/self/task/${threadId}/${file}`, "utf8");
  } catch {
    return;
  }
}
//@ chunk-5xgkngpb.js:3804189-3804326 placement
function findThreadTask(comm) {
  try {
    let [first, ...rest] = readdirSync("/proc/self/task").filter(
      (dir) => readProcThreadFile(dir, "comm")?.trim() === comm,
    );
    return rest.length === 0 ? first : undefined;
  } catch {
    return;
  }
}
//@ chunk-5xgkngpb.js:3804326-3804340 placement
/**
 * "RTt"
 */
var RTT_LABEL = "RTt";
//@ chunk-5xgkngpb.js:3804340-3804351 placement
/**
 * 10
 */
var MAX_RTT_SAMPLES = 10;
//@ chunk-5xgkngpb.js:3804351-3804437 placement
/**
 * /proc/<pid>/stat 格式
 */
var PROC_STAT_RE = /^\d+ \((?<comm>.*)\) (?<state>\S)(?: \S+){10} (?<utime>\d+) (?<stime>\d+) /s;
//@ chunk-5xgkngpb.js:3804437-3804667 placement
function readThreadCpu(threadId, fallback) {
  let groups = PROC_STAT_RE.exec(readProcThreadFile(threadId, "stat") ?? "")?.groups;
  let schedstat = Number(readProcThreadFile(threadId, "schedstat")?.split(" ").at(0));
  let cpuMs = Number(groups?.utime) + Number(groups?.stime);
  return groups?.comm === fallback
    ? {
        usedMs: schedstat > 0 ? schedstat / MAX_PROC_STATUS_BYTES : cpuMs * MAX_RTT_SAMPLES,
        isAsleep: !RTT_LABEL.includes(groups.state ?? ""),
      }
    : undefined;
}
//@ chunk-5xgkngpb.js:3804667-3804883 placement
/**
 * Linux/WSL 下按线程名找到 worker 线程（/proc/self/task），返回读取其 CPU 用量与睡眠状态的函数。
 */
function createThreadCpuProbe(label) {
  let platform = getPlatform();
  let isLinux = platform === "linux" || platform === "wsl";
  let cache = {
    task: undefined,
  };
  return () => {
    if (!isLinux) return;
    let task = cache.task === undefined ? undefined : readThreadCpu(cache.task, label);
    let cpu = task === undefined ? findThreadTask(label) : cache.task;
    let stat = task === undefined && cpu !== undefined;
    cache.task = cpu;
    return stat ? readThreadCpu(cpu, label) : task;
  };
}
//@ chunk-5xgkngpb.js:3804883-3805135 placement
/**
 * 启动 hooks worker 线程：创建共享的心跳戳与标记缓冲区，返回 worker、两个 Int32Array 视图与线程 CPU 探针。
 */
function spawnHooksWorkerThread(url = hooksWorkerUrl()) {
  let sharedArrayBuffer = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * STAMP_SLOT_COUNT);
  let sharedArrayBuffer_2 = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * MARKS_SLOT_COUNT);
  let workerName = newWorkerName();
  return {
    worker: new Worker(url, workerThreadOptions(workerName, sharedArrayBuffer, sharedArrayBuffer_2)),
    stamp: new Int32Array(sharedArrayBuffer),
    marks: new Int32Array(sharedArrayBuffer_2),
    thread: createThreadCpuProbe(workerName),
  };
}
//@ chunk-5xgkngpb.js:3805135-3805413 placement
/**
 * hooks 宿主的可替换函数槽：worker 生成器、模块重载器与加载完成通知。
 */
function createWorkerSlots() {
  let valueSlot = createValueSlot();
  let valueSlot_2 = createValueSlot();
  let valueSlot_3 = createValueSlot();
  return {
    setSpawner: valueSlot.set,
    spawnWorker() {
      return (valueSlot.get() ?? spawnHooksWorkerThread)();
    },
    setReloader: valueSlot_2.set,
    reloadModule: (reloader) =>
      valueSlot_2.get()?.(reloader) ?? Promise.reject(Error("hooks host not loaded yet; nothing to reload")),
    setLoadedNotifier: valueSlot_3.set,
    notifyLoaded: (slot) => valueSlot_3.get()?.(slot),
  };
}
export { hostVersionInfo, createWorkerSlots };
