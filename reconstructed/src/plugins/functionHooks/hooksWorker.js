/**
 * plugins/functionHooks/hooksWorker.ts
 *
 * 2.1.316 新增：hooks worker 线程入口与 worker 脚本构造
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (16)
 * attribution: placement 16
 */
import { randomUUID } from "crypto";
import { readFileSync, readdirSync } from "fs";
import { getVersionBase } from "../../services/analytics/metadata.js";
import { getPlatform } from "../../utils/platform.js";
import { STAMP_SLOT_COUNT } from "./vm/vmGlobals.js";
import { MARKS_SLOT_COUNT } from "./hostBridge.js";
import { createValueSlot } from "../../utils/valueSlot.js";

//@ chunk-e6aww6q8.js:3694450-3695549 placement
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
      VERSION: "2.1.316",
      FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
      BUILD_TIME: "2026-10-30T23:28:13Z",
      GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
      HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
      DD_SOURCEMAP_GROUP: "default",
    }.BUILD_TIME || undefined;
  return Promise.resolve({
    version: {
      ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
      PACKAGE_URL: "@anthropic-ai/claude-code",
      README_URL: "https://code.claude.com/docs/en/overview",
      VERSION: "2.1.316",
      FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
      BUILD_TIME: "2026-10-30T23:28:13Z",
      GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
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
//@ chunk-e6aww6q8.js:3706989-3707046 placement
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
//@ chunk-e6aww6q8.js:3707046-3707070 placement
/**
 * Bun 打包前缀
 */
var BUN_ROOT_PREFIX = "B:/~BUN/root/";
//@ chunk-e6aww6q8.js:3707070-3707153 placement = formatUri (1)
function formatUri(uri) {
  return getPlatform() === "windows" && uri.startsWith(BUN_ROOT_PREFIX) ? uri : new URL(`file://${uri}`);
}
//@ chunk-e6aww6q8.js:3707191-3707249 placement
/**
 * hooks-<uuid前段>
 */
function newWorkerName() {
  let [e] = randomUUID().split("-");
  return `hooks-${e}`;
}
//@ chunk-e6aww6q8.js:3707249-3708325 placement
/**
 * hooks worker 脚本的 URL：构建内的 HOOKS_WORKER_URL，否则源码相对路径。
 */
var hooksWorkerUrl = () =>
  ({
    ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
    PACKAGE_URL: "@anthropic-ai/claude-code",
    README_URL: "https://code.claude.com/docs/en/overview",
    VERSION: "2.1.316",
    FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
    BUILD_TIME: "2026-10-30T23:28:13Z",
    GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
    HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
    DD_SOURCEMAP_GROUP: "default",
  }).HOOKS_WORKER_URL
    ? formatUri(
        {
          ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
          PACKAGE_URL: "@anthropic-ai/claude-code",
          README_URL: "https://code.claude.com/docs/en/overview",
          VERSION: "2.1.316",
          FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
          BUILD_TIME: "2026-10-30T23:28:13Z",
          GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
          HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
          DD_SOURCEMAP_GROUP: "default",
        }.HOOKS_WORKER_URL,
      )
    : new URL("../../../hooks-worker/hooks-worker.ts", import.meta.url);
//@ chunk-e6aww6q8.js:3708325-3708337 placement
/**
 * 1e6
 */
var MAX_PROC_STATUS_BYTES = 1e6;
//@ chunk-e6aww6q8.js:3708408-3708491 placement
/**
 * 读 /proc/self/task 文件
 */
function readProcThreadFile(e, n) {
  try {
    return readFileSync(`/proc/self/task/${e}/${n}`, "utf8");
  } catch {
    return;
  }
}
//@ chunk-e6aww6q8.js:3708491-3708628 placement
function findThreadTask(e) {
  try {
    let [n, ...r] = readdirSync("/proc/self/task").filter((s) => readProcThreadFile(s, "comm")?.trim() === e);
    return r.length === 0 ? n : undefined;
  } catch {
    return;
  }
}
//@ chunk-e6aww6q8.js:3708628-3708642 placement
/**
 * "RTt"
 */
var RTT_LABEL = "RTt";
//@ chunk-e6aww6q8.js:3708642-3708653 placement
/**
 * 10
 */
var MAX_RTT_SAMPLES = 10;
//@ chunk-e6aww6q8.js:3708653-3708739 placement
/**
 * /proc/<pid>/stat 格式
 */
var PROC_STAT_RE = /^\d+ \((?<comm>.*)\) (?<state>\S)(?: \S+){10} (?<utime>\d+) (?<stime>\d+) /s;
//@ chunk-e6aww6q8.js:3708739-3708969 placement
function readThreadCpu(e, n) {
  let groups = PROC_STAT_RE.exec(readProcThreadFile(e, "stat") ?? "")?.groups;
  let s = Number(readProcThreadFile(e, "schedstat")?.split(" ").at(0));
  let h = Number(groups?.utime) + Number(groups?.stime);
  return groups?.comm === n
    ? {
        usedMs: s > 0 ? s / MAX_PROC_STATUS_BYTES : h * MAX_RTT_SAMPLES,
        isAsleep: !RTT_LABEL.includes(groups.state ?? ""),
      }
    : undefined;
}
//@ chunk-e6aww6q8.js:3708969-3709185 placement
/**
 * Linux/WSL 下按线程名找到 worker 线程（/proc/self/task），返回读取其 CPU 用量与睡眠状态的函数。
 */
function createThreadCpuProbe(e) {
  let platform = getPlatform();
  let r = platform === "linux" || platform === "wsl";
  let s = {
    task: undefined,
  };
  return () => {
    if (!r) return;
    let h = s.task === undefined ? undefined : readThreadCpu(s.task, e);
    let y = h === undefined ? findThreadTask(e) : s.task;
    let S = h === undefined && y !== undefined;
    s.task = y;
    return S ? readThreadCpu(y, e) : h;
  };
}
//@ chunk-e6aww6q8.js:3709185-3709437 placement
/**
 * 启动 hooks worker 线程：创建共享的心跳戳与标记缓冲区，返回 worker、两个 Int32Array 视图与线程 CPU 探针。
 */
function spawnHooksWorkerThread(e = hooksWorkerUrl()) {
  let sharedArrayBuffer = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * STAMP_SLOT_COUNT);
  let sharedArrayBuffer_2 = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * MARKS_SLOT_COUNT);
  let name = newWorkerName();
  return {
    worker: new Worker(e, workerThreadOptions(name, sharedArrayBuffer, sharedArrayBuffer_2)),
    stamp: new Int32Array(sharedArrayBuffer),
    marks: new Int32Array(sharedArrayBuffer_2),
    thread: createThreadCpuProbe(name),
  };
}
//@ chunk-e6aww6q8.js:3709437-3709715 placement
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
    reloadModule: (s) =>
      valueSlot_2.get()?.(s) ?? Promise.reject(Error("hooks host not loaded yet; nothing to reload")),
    setLoadedNotifier: valueSlot_3.set,
    notifyLoaded: (s) => valueSlot_3.get()?.(s),
  };
}
export { createWorkerSlots, hostVersionInfo };
