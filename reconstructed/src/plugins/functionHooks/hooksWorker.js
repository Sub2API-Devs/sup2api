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
  randomUUID as randomUUID_22,
  randomUUID as randomUUID_23,
  randomUUID as randomUUID_24,
  randomUUID as randomUUID_25,
  randomUUID as randomUUID_26,
  randomUUID as randomUUID_27,
  randomUUID as randomUUID_28,
  randomUUID as randomUUID_29,
  randomUUID as randomUUID_30,
  randomUUID as randomUUID_31,
  randomUUID as randomUUID_32,
  randomUUID as randomUUID_33,
  randomUUID as randomUUID_34,
  randomUUID as randomUUID_35,
  randomUUID as randomUUID_36,
  randomUUID as randomUUID_37,
  randomUUID as randomUUID_38,
  randomUUID as randomUUID_39,
  randomUUID as randomUUID_40,
  randomUUID as randomUUID_41,
  randomUUID as randomUUID_42,
  randomUUID as randomUUID_43,
  randomUUID as randomUUID_44,
  randomUUID as randomUUID_45,
  randomUUID as randomUUID_46,
  randomUUID as randomUUID_47,
  randomUUID as randomUUID_48,
  randomUUID as randomUUID_49,
  randomUUID as randomUUID_50,
} from "crypto";
import {
  readFileSync,
  readFileSync as readFileSync_2,
  readFileSync as readFileSync_3,
  readFileSync as readFileSync_4,
  readFileSync as readFileSync_5,
  readFileSync as readFileSync_6,
  readFileSync as readFileSync_7,
  readFileSync as readFileSync_8,
  readdirSync,
  readdirSync as readdirSync_2,
  readdirSync as readdirSync_3,
  readdirSync as readdirSync_4,
  readdirSync as readdirSync_5,
} from "fs";
import { getVersionBase } from "../../services/analytics/metadata.js";
import { getPlatform } from "../../utils/platform.js";
import { $Ui } from "./vm/vmGlobals.js";
import { wUi } from "./hostBridge.js";
import { to } from "../../utils/valueSlot.js";

/**
 * $.host.version：返回 Claude Code 版本号、可选基线版本与构建时间。
 */
//@ chunk-e6aww6q8.js:3694450-3695549 placement
function hostVersionInfo() {
  let e = getVersionBase(),
    n =
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
      }.BUILD_TIME || void 0;
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
    ...(e !== void 0 && { base: e }),
    ...(n !== void 0 && { builtAt: n }),
  });
}
//@ chunk-e6aww6q8.js:3706989-3707046 placement
var MOn = (e, n, r) => ({ name: e, workerData: { stamp: n, marks: r } });
//@ chunk-e6aww6q8.js:3707046-3707070 placement
var OOn = "B:/~BUN/root/";
//@ chunk-e6aww6q8.js:3707070-3707153 placement = formatUri (1)
function formatUri(uri) {
  return getPlatform() === "windows" && uri.startsWith(OOn) ? uri : new URL(`file://${uri}`);
}
//@ chunk-e6aww6q8.js:3707191-3707249 placement
function DOn() {
  let [e] = randomUUID_43().split("-");
  return `hooks-${e}`;
}
/**
 * hooks worker 脚本的 URL：构建内的 HOOKS_WORKER_URL，否则源码相对路径。
 */
//@ chunk-e6aww6q8.js:3707249-3708325 placement
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
var zOn = 1e6;
//@ chunk-e6aww6q8.js:3708408-3708491 placement
function _oe(e, n) {
  try {
    return readFileSync_7(`/proc/self/task/${e}/${n}`, "utf8");
  } catch {
    return;
  }
}
//@ chunk-e6aww6q8.js:3708491-3708628 placement
function findThreadTask(e) {
  try {
    let [n, ...r] = readdirSync_5("/proc/self/task").filter((s) => _oe(s, "comm")?.trim() === e);
    return r.length === 0 ? n : void 0;
  } catch {
    return;
  }
}
//@ chunk-e6aww6q8.js:3708628-3708642 placement
var RTT = "RTt";
//@ chunk-e6aww6q8.js:3708642-3708653 placement
var VOn = 10;
//@ chunk-e6aww6q8.js:3708653-3708739 placement
var YOn = /^\d+ \((?<comm>.*)\) (?<state>\S)(?: \S+){10} (?<utime>\d+) (?<stime>\d+) /s;
//@ chunk-e6aww6q8.js:3708739-3708969 placement
function readThreadCpu(e, n) {
  let r = YOn.exec(_oe(e, "stat") ?? "")?.groups,
    s = Number(_oe(e, "schedstat")?.split(" ").at(0)),
    h = Number(r?.utime) + Number(r?.stime);
  return r?.comm === n
    ? { usedMs: s > 0 ? s / zOn : h * VOn, isAsleep: !RTT.includes(r.state ?? "") }
    : void 0;
}
/**
 * Linux/WSL 下按线程名找到 worker 线程（/proc/self/task），返回读取其 CPU 用量与睡眠状态的函数。
 */
//@ chunk-e6aww6q8.js:3708969-3709185 placement
function createThreadCpuProbe(e) {
  let n = getPlatform(),
    r = n === "linux" || n === "wsl",
    s = { task: void 0 };
  return () => {
    if (!r) return;
    let h = s.task === void 0 ? void 0 : readThreadCpu(s.task, e),
      y = h === void 0 ? findThreadTask(e) : s.task,
      S = h === void 0 && y !== void 0;
    return ((s.task = y), S ? readThreadCpu(y, e) : h);
  };
}
/**
 * 启动 hooks worker 线程：创建共享的心跳戳与标记缓冲区，返回 worker、两个 Int32Array 视图与线程 CPU 探针。
 */
//@ chunk-e6aww6q8.js:3709185-3709437 placement
function spawnHooksWorkerThread(e = hooksWorkerUrl()) {
  let sharedArrayBuffer = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * $Ui),
    sharedArrayBuffer_2 = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * wUi),
    s = DOn();
  return {
    worker: new Worker(e, MOn(s, sharedArrayBuffer, sharedArrayBuffer_2)),
    stamp: new Int32Array(sharedArrayBuffer),
    marks: new Int32Array(sharedArrayBuffer_2),
    thread: createThreadCpuProbe(s),
  };
}
/**
 * hooks 宿主的可替换函数槽：worker 生成器、模块重载器与加载完成通知。
 */
//@ chunk-e6aww6q8.js:3709437-3709715 placement
function createWorkerSlots() {
  let e = to(),
    n = to(),
    r = to();
  return {
    setSpawner: e.set,
    spawnWorker() {
      return (e.get() ?? spawnHooksWorkerThread)();
    },
    setReloader: n.set,
    reloadModule: (s) =>
      n.get()?.(s) ?? Promise.reject(Error("hooks host not loaded yet; nothing to reload")),
    setLoadedNotifier: r.set,
    notifyLoaded: (s) => r.get()?.(s),
  };
}

export { createWorkerSlots, hostVersionInfo };
