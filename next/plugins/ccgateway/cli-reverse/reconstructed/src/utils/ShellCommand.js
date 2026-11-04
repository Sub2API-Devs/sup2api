/**
 * utils/ShellCommand.ts
 *
 * 运行中 shell 命令对象（ShellCommandImpl）：输出转发/落盘、超时与自动转后台、进程树终止、结果组装，以及已中止/启动失败的占位命令。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/ShellCommand.ts
 * pieces: chunk-e6aww6q8.js (21)
 * attribution: placement 9, fingerprint 5, layout 7
 */
import {
  readProcessInfo,
  listProcessInfos,
  tryKillProcess,
  UNLISTED_SHELL_GRACE_MS,
  SWEEP_WAIT_STEP_MS,
  sleepBlocking,
  killOnInterruptWhenNoBackground,
  closeCpuWindow,
  readProcessResourceUsage,
  readProcCpuTime,
  isCpuAccountingEnabled,
  markCpuWindowHeld,
  releaseCpuWindow,
  isExitSweepEnabled,
} from "./shell/processCpuTime.js";
import { isSignalablePid } from "./genericProcessUtils.js";
import { killIfUnchanged, killProcessGroup as killProcessGroup_2 } from "./auth/lockHolderLiveness.js";
import { HostScoped } from "./hostScoped.js";
import { onProcessRootHost } from "../bootstrap/state.js";
import { logForDebugging } from "./debug.js";
import {
  stringSchema,
  objectSchema,
  numberSchema,
  literal,
  array,
  booleanSchema,
} from "../../vendor/zod/v4/classic/schemas.js";
import { env } from "./env.js";
import { logEvent } from "../services/analytics/index.js";
import {
  errorMessage,
  getErrnoCode,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  toError,
} from "./errors.js";
import { fromEnum, lit as lit_2 } from "../services/analytics/safeMetadata.js";
import { logError } from "./log.js";
import { logFeatureBad, logFeatureOk, logFeatureSad } from "../services/analytics/featureTelemetry.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { jsonStringify } from "./slowOperations.js";
import { plural } from "./stringUtils.js";
import {
  MAX_TASK_OUTPUT_BYTES as MAX_TASK_OUTPUT_BYTES_2,
  getTaskOutputSize,
  isTaskOutputSwapRefusal,
  MAX_TASK_OUTPUT_BYTES_DISPLAY,
} from "./task/diskOutput.js";
import { useEffect, useRef } from "../../vendor/react/cjs/react.production.js";
import { unwrapAbortReason } from "./abortController.js";
import { isTurnLevelAbort } from "./abortReasons.js";
import { getPlatform } from "./platform.js";
import { isPlainObject as isPlainObject_5 } from "./isPlainObject.js";
import { __commonJS } from "../../runtime/bun-runtime.js";
import { DISK_SPACE_CHECK_INTERVAL_MS, buildDiskFullWarning } from "./shell/diskSpaceWarning.js";
import { isProcessGroupAlive, leftoverProcessTracker, findProcessesByPgid } from "./shell/cpuReport.js";
import { formatDuration } from "./format.js";
import { processStartTokens } from "./processIdentity.js";
import { TaskOutput } from "./task/TaskOutput.js";
import { generateTaskId } from "../Task.js";
import { logForDiagnosticsNoPII } from "./diagLogs.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:250002-250080 placement
/**
 * 判断进程是否仍存活且启动标记一致（用于进程树清理）。
 */
function isPidStillAlive(pid, startToken) {
  let processInfo = readProcessInfo(pid);
  return processInfo !== undefined && !processInfo.exited && processInfo.startToken === startToken;
}
//@ chunk-e6aww6q8.js:250080-250438 placement
/**
 * 从进程列表中收集以给定 pid 或进程组为根的进程树（广度优先，跳过 pid≤1 与自身）。
 */
function collectProcessTree(processInfos, rootPgids) {
  let childrenByPpid = new Map();
  let pending = [];
  for (let processInfo of processInfos) {
    if (processInfo.ppid !== undefined) {
      let children = childrenByPpid.get(processInfo.ppid);
      if (children) children.push(processInfo);
      else childrenByPpid.set(processInfo.ppid, [processInfo]);
    }
    if (rootPgids.has(processInfo.pid) || (processInfo.pgrp !== undefined && rootPgids.has(processInfo.pgrp)))
      pending.push(processInfo);
  }
  let seenPids = new Set();
  let tree = [];
  while (pending.length > 0) {
    let current = pending.shift();
    if (current.pid <= 1 || current.pid === process.pid || seenPids.has(current.pid)) continue;
    seenPids.add(current.pid);
    tree.push(current);
    pending.push(...(childrenByPpid.get(current.pid) ?? []));
  }
  return tree;
}
//@ chunk-e6aww6q8.js:250438-252316 placement
/**
 * 退出时清理 shell 进程树：根据进程列表找出各 shell 的进程组与后代（以启动令牌识别），先发 SIGTERM，在宽限期内轮询等待退出，再对仍存活且启动令牌未变的进程发 SIGKILL；返回树数量、等待时间与超出宽限仍存活的数量。
 */
function sweepShellTrees(shells, graceMs) {
  let startedAt = Date.now();
  let processList = listProcessInfos();
  let processByPid = new Map(processList?.map((processInfo) => [processInfo.pid, processInfo]));
  let ownedPgids = new Set();
  let unlistedShells = [];
  for (let shell of shells) {
    if (!isSignalablePid(shell.pid)) continue;
    let shellInfo = processByPid.get(shell.pid);
    if (processList === undefined) unlistedShells.push(shell);
    else if (shellInfo === undefined || (shell.running && shellInfo.ppid === process.pid))
      ownedPgids.add(shell.pid);
  }
  let groupMembers = new Map();
  let alive = new Map();
  let loneTargets = new Map();
  for (let processInfo of processList ? collectProcessTree(processList, ownedPgids) : []) {
    if (processInfo.startToken === undefined) continue;
    let pgrp =
      processInfo.pgrp !== undefined && ownedPgids.has(processInfo.pgrp) ? processInfo.pgrp : undefined;
    if (pgrp !== undefined) {
      let members = groupMembers.get(pgrp) ?? new Map();
      groupMembers.set(pgrp, members.set(processInfo.pid, processInfo.startToken));
    }
    if (processInfo.exited) continue;
    alive.set(processInfo.pid, processInfo.startToken);
    if (pgrp === undefined) loneTargets.set(processInfo.pid, processInfo.startToken);
  }
  let askedPids = new Set();
  for (let shell of shells) {
    if (shell.askedAt !== undefined) askedPids.add(shell.pid);
    for (let [pid, startToken] of shell.descendants ?? []) {
      if (shell.askedAt !== undefined) askedPids.add(pid);
      if (
        processList !== undefined &&
        isSignalablePid(pid) &&
        !alive.has(pid) &&
        isPidStillAlive(pid, startToken)
      ) {
        alive.set(pid, startToken);
        loneTargets.set(pid, startToken);
      }
    }
  }
  let treeCount = ownedPgids.size + unlistedShells.length;
  if (treeCount === 0 && alive.size === 0)
    return {
      trees: treeCount,
      waitedMs: 0,
      outlivedGrace: undefined,
    };
  let signalAll = (signal) => {
    let alreadyAsked = (targetPid) => signal === "SIGTERM" && askedPids.has(targetPid);
    for (let [pgid, members] of groupMembers)
      if (
        [...members].some(([pid, startToken]) => readProcessInfo(pid)?.startToken === startToken) &&
        !alreadyAsked(pgid)
      )
        tryKillProcess(-pgid, signal);
    for (let unlistedShell of unlistedShells)
      if (
        !alreadyAsked(unlistedShell.pid) &&
        !tryKillProcess(-unlistedShell.pid, signal) &&
        unlistedShell.running
      )
        tryKillProcess(unlistedShell.pid, signal);
    killIfUnchanged(new Map([...loneTargets].filter(([targetPid]) => !alreadyAsked(targetPid))), signal);
  };
  signalAll("SIGTERM");
  let deadlineFor = (shells, grace) =>
    Math.max(0, ...shells.map((shell) => (shell.askedAt ?? startedAt) + grace));
  let minDeadline = deadlineFor(unlistedShells, Math.min(graceMs, UNLISTED_SHELL_GRACE_MS));
  let maxDeadline = Math.max(
    minDeadline,
    deadlineFor(
      shells.filter((shell) => !unlistedShells.includes(shell)),
      graceMs,
    ),
  );
  let waitStart = performance.now();
  let waitMs = Math.min(graceMs, maxDeadline - startedAt);
  for (
    let idx = waitMs / SWEEP_WAIT_STEP_MS;
    idx > 0 && performance.now() - waitStart < waitMs && Date.now() < maxDeadline;
    idx--
  ) {
    for (let [pid, startToken] of alive) if (!isPidStillAlive(pid, startToken)) alive.delete(pid);
    if (alive.size === 0 && Date.now() >= minDeadline) break;
    sleepBlocking(Math.min(SWEEP_WAIT_STEP_MS, Math.max(1, maxDeadline - Date.now())));
  }
  if (alive.size > 0) {
    let processInfos = listProcessInfos() ?? [];
    let filtered = processInfos.filter(
      (processInfo) =>
        processInfo.startToken !== undefined && alive.get(processInfo.pid) === processInfo.startToken,
    );
    for (let processInfo of collectProcessTree(
      processInfos,
      new Set(filtered.map((processInfo) => processInfo.pid)),
    ))
      if (!processInfo.exited && processInfo.startToken !== undefined && !alive.has(processInfo.pid))
        loneTargets.set(processInfo.pid, processInfo.startToken);
  }
  signalAll("SIGKILL");
  return {
    trees: treeCount,
    waitedMs: Date.now() - startedAt,
    outlivedGrace: unlistedShells.length > 0 ? undefined : alive.size,
  };
}
//@ chunk-e6aww6q8.js:257176-257212 placement
var SIGKILL_EXIT_CODE = 137;
var SIGTERM_EXIT_CODE = 143;
var KILL_GRACE_MS = 1500;
var TREE_POLL_INTERVAL_MS = 100;
//@ chunk-e6aww6q8.js:257212-257296 placement
class ShellCommandRegistry {
  pendingKillBackstops = new Set();
  liveShellCommands = new Set();
  dyingTrees = new Set();
}
//@ chunk-e6aww6q8.js:257296-257323 placement
/**
 * 按宿主缓存的 ShellCommand 注册表（待决 kill、存活命令、待收束进程树）。
 */
var shellCommandRegistryByHost; // deferred: uses ShellCommandRegistry of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:257296", () => {
  shellCommandRegistryByHost = new HostScoped(() => new ShellCommandRegistry());
});
//@ chunk-e6aww6q8.js:257323-257353 placement
function shellCommandRegistry() {
  return onProcessRootHost(shellCommandRegistryByHost);
}
//@ chunk-e6aww6q8.js:257353-257439 placement
/**
 * 等待所有待决的 kill 收尾 Promise。
 */
async function drainPendingKillBackstops() {
  await Promise.allSettled(Array.from(shellCommandRegistry().pendingKillBackstops));
}
//@ chunk-e6aww6q8.js:257439-257536 placement
/**
 * 终止所有仍在运行的 shell 命令。
 */
function killRunningShellCommands() {
  for (let liveShellCommand of Array.from(shellCommandRegistry().liveShellCommands))
    if (liveShellCommand.status === "running") liveShellCommand.kill();
}
//@ chunk-e6aww6q8.js:259223-259680 fingerprint (2.1.88 match: StreamWrapper, 0.813)
/**
 * 把子进程 stdout/stderr 流按 utf-8 转发到 TaskOutput（writeStdout/writeStderr），ended 在 end/close 时完成。
 */
class StreamWrapper {
  #e;
  #t = false;
  #n;
  #o;
  #r = this.#i.bind(this);
  ended;
  constructor(stream, taskOutput, isStderr) {
    this.#e = stream;
    this.#n = taskOutput;
    this.#o = isStderr;
    stream.setEncoding("utf-8");
    stream.on("data", this.#r);
    this.ended = new Promise((resolve) => {
      function resolveEnded() {
        resolve();
      }
      stream.once("end", resolveEnded);
      stream.once("close", resolveEnded);
    });
  }
  #i(data) {
    let str = typeof data === "string" ? data : data.toString();
    if (this.#o) this.#n.writeStderr(str);
    else this.#n.writeStdout(str);
  }
  cleanup() {
    if (this.#t) return;
    this.#t = true;
    this.#e.removeListener("data", this.#r);
    this.#e = null;
    this.#n = null;
    this.#r = () => {};
  }
}
//@ chunk-e6aww6q8.js:259680-265449 fingerprint (2.1.88 match: ShellCommandImpl, 0.616)
/**
 * 运行中 shell 命令对象：状态 running/backgrounded/completed/killed；超时（可自动转后台）、abort、输出文件大小看门狗（超限或文件被替换则杀）；完成时组装 {code,stdout,stderr,interrupted,backgroundTaskId,outputFilePath,shellUsage(wall/cpu),leftRunningPgid,timedOut…}；kill 先 SIGTERM 进程树、1.5s 后 SIGKILL；background() 转后台并把输出落盘。
 */
class ShellCommandImpl {
  #e = "running";
  #t;
  #n;
  #o;
  #r;
  #i = null;
  #s = null;
  #a = false;
  #d = false;
  #c;
  #l;
  #u;
  #m;
  #g;
  #S;
  #y = null;
  #p = shellCommandRegistry();
  #h = null;
  #v = false;
  #k = null;
  #_;
  #f;
  #w;
  #b;
  #E;
  #T;
  taskOutput;
  static #O(command) {
    if (command.#S && command.#m)
      command.#m((registerOnTimeout) =>
        command.background(registerOnTimeout, {
          atExit: "kill",
        }),
      );
    else command.#C(SIGTERM_EXIT_CODE);
  }
  result;
  outputEnded;
  onTimeout;
  constructor(
    childProcess,
    abortSignal,
    timeoutMs,
    taskOutput,
    hasOnTimeout = false,
    maxOutputBytes = MAX_TASK_OUTPUT_BYTES_2,
    level = "inner",
    cwd,
    timing = {
      startedAt: performance.now(),
      cpuTime: false,
    },
  ) {
    this.#f = timing;
    this.#r = childProcess;
    this.#b = childProcess.pid;
    this.#l = abortSignal;
    this.#u = level;
    this.#g = timeoutMs;
    this.#S = hasOnTimeout;
    this.#c = maxOutputBytes;
    this.#_ = cwd;
    this.taskOutput = taskOutput;
    this.#o = childProcess.stderr ? new StreamWrapper(childProcess.stderr, taskOutput, true) : null;
    this.#n = childProcess.stdout ? new StreamWrapper(childProcess.stdout, taskOutput, false) : null;
    this.outputEnded =
      this.#n || this.#o ? Promise.all([this.#n?.ended, this.#o?.ended]).then(() => {}) : undefined;
    if (hasOnTimeout)
      this.onTimeout = (onTimeout) => {
        this.#m = onTimeout;
      };
    this.result = this.#L();
    this.#p.liveShellCommands.add(this);
    installExitSweep();
    if (abortSignal.aborted) this.#P();
  }
  get status() {
    return this.#e;
  }
  #P() {
    let reason = unwrapAbortReason(this.#l.reason);
    if ((reason === "interrupt" && !killOnInterruptWhenNoBackground()) || isTurnLevelAbort(reason, this.#u))
      return;
    this.kill();
  }
  #I(code, signal) {
    if (code !== null && code !== undefined) this.#R(code);
    else this.#R(signal === "SIGTERM" ? 144 : 1, true);
  }
  #D() {
    this.#R(1, true);
  }
  #R(exitCode, flag = false) {
    if (this.#h) {
      this.#v = flag;
      this.#h(exitCode);
      this.#h = null;
    }
  }
  #A() {
    this.#x();
    let timeoutId = this.#i;
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.#i = null;
    }
    let boundAbortHandler = this.#k;
    if (boundAbortHandler) {
      this.#l.removeEventListener("abort", boundAbortHandler);
      this.#k = null;
    }
  }
  #x() {
    if (this.#s) {
      clearInterval(this.#s);
      this.#s = null;
    }
  }
  #M() {
    if (this.#s) return;
    this.#s = setInterval(() => {
      getTaskOutputSize(this.taskOutput.taskId).then(
        (taskOutputSize) => {
          if (
            taskOutputSize > this.#c &&
            (this.#e === "running" || this.#e === "backgrounded") &&
            this.#s !== null
          ) {
            this.#a = true;
            this.#x();
            this.#C(SIGKILL_EXIT_CODE);
          }
        },
        (error) => {
          if (
            isTaskOutputSwapRefusal(error) &&
            (this.#e === "running" || this.#e === "backgrounded") &&
            this.#s !== null
          ) {
            this.#d = true;
            this.#x();
            this.#C(SIGKILL_EXIT_CODE);
            return;
          }
        },
      );
    }, DISK_SPACE_CHECK_INTERVAL_MS);
    this.#s.unref();
  }
  #L() {
    this.#k = this.#P.bind(this);
    this.#l.addEventListener("abort", this.#k, {
      once: true,
    });
    this.#r.once("exit", this.#I.bind(this));
    this.#r.once("error", this.#D.bind(this));
    this.#i = setTimeout(ShellCommandImpl.#O, this.#g, this);
    if (this.taskOutput.stdoutToFile) this.#M();
    let exitPromise = new Promise((resolve) => {
      this.#h = resolve;
    });
    return new Promise((resolve) => {
      this.#y = resolve;
      exitPromise.then(this.#N.bind(this));
    });
  }
  async #N(exitCode) {
    let wallMs = (this.#w ?? performance.now()) - this.#f.startedAt;
    let cpuAccount = this.#f.cpuAccountWindow && closeCpuWindow(this.#f.cpuAccountWindow);
    this.#p.liveShellCommands.delete(this);
    this.#A();
    let wasKilled = this.#e === "killed";
    if (this.#e === "running" || this.#e === "backgrounded") this.#e = "completed";
    let pid = this.#r?.pid;
    let usage = wasKilled || !this.#f.cpuTime ? undefined : readProcessResourceUsage(this.#r);
    let groupAlive = usage !== undefined && pid !== undefined && pid > 1 && isProcessGroupAlive(pid);
    let procCpuMs =
      (groupAlive && this.#f.procCpuTime) ||
      (usage !== undefined && pid !== undefined && this.#f.procCpuTime === "background marker")
        ? readProcCpuTime(pid)
        : this.#E;
    let stdout = await this.taskOutput.getStdout();
    let result = {
      code: exitCode,
      stdout,
      stderr: this.taskOutput.getStderr(),
      interrupted: wasKilled && exitCode === SIGKILL_EXIT_CODE,
      backgroundTaskId: this.#t,
    };
    if (this.#v) result.noExitStatus = true;
    if (wasKilled && this.#T !== undefined) result.stopLabel = this.#T;
    if (
      !wasKilled &&
      pid !== undefined &&
      pid > 1 &&
      leftoverProcessTracker.follows(this.#u) &&
      (isProcessGroupAlive(pid) ||
        (await findProcessesByPgid(new Set([pid])).catch(() => new Map())).has(pid)) &&
      this.#e !== "killed"
    )
      result.leftRunningPgid = pid;
    if (this.#b !== undefined)
      result.shellUsage = {
        wallMs,
        ...(usage !== undefined && {
          cpu: {
            ...usage,
            leftProcessRunning: result.leftRunningPgid !== undefined || groupAlive || procCpuMs !== undefined,
          },
        }),
        ...(procCpuMs !== undefined && {
          procCpuMs,
        }),
        ...(cpuAccount !== undefined && {
          cpuAccount,
        }),
      };
    if (this.taskOutput.stdoutToFile && !this.#t)
      if (this.taskOutput.outputFileRedundant || this.#a || this.#d)
        setImmediate(() => {
          if (!this.#t) this.taskOutput.deleteOutputFile();
        });
      else {
        result.outputFilePath = this.taskOutput.path;
        result.outputFileSize = this.taskOutput.outputFileSize;
        result.outputTaskId = this.taskOutput.taskId;
      }
    let prefixMessage = (message) => {
      if (this.taskOutput.stdoutToFile && !this.#t)
        result.stdout = stdout
          ? `${message}
${stdout}`
          : message;
      else result.stderr = result.stderr ? `${message} ${result.stderr}` : message;
    };
    if (this.#d) prefixMessage("Command killed: its output file was replaced or could no longer be verified");
    else if (this.#a) {
      prefixMessage(`Command killed: output file exceeded ${MAX_TASK_OUTPUT_BYTES_DISPLAY}`);
      result.outputFileSize = this.taskOutput.outputFileSize;
    } else if (wasKilled && exitCode === SIGTERM_EXIT_CODE) {
      result.timedOut = true;
      prefixMessage(`Command timed out after ${formatDuration(this.#g)}`);
    } else if (
      this.taskOutput.stdoutToFile &&
      exitCode !== 0 &&
      !(wasKilled && exitCode === SIGKILL_EXIT_CODE)
    ) {
      let diskFullWarning = await buildDiskFullWarning(this.taskOutput.path, stdout === "");
      if (diskFullWarning)
        result.stdout = stdout
          ? `${diskFullWarning}
${stdout}`
          : diskFullWarning;
    }
    let exitListener = this.#y;
    if (exitListener) {
      this.#y = null;
      exitListener(result);
    }
  }
  #C(exitCode) {
    this.#e = "killed";
    let childProcess = this.#r;
    let pid = childProcess?.pid;
    let hasWaiter = this.#h !== null;
    this.#R(exitCode ?? SIGKILL_EXIT_CODE);
    if (!pid || pid <= 1 || isWindowsExitedProcess(childProcess)) return Promise.resolve();
    if (hasWaiter && this.#f.procCpuTime) {
      this.#w = performance.now();
      this.#E = readProcCpuTime(pid);
    }
    let groupKill = killProcessGroup_2(pid, "SIGTERM");
    let askedAt;
    let noteAsked = () => {
      askedAt = Date.now();
    };
    groupKill.then(noteAsked, noteAsked);
    let startTokens = new Map();
    let promise = new Promise((resolve) => {
      let pollTimer;
      let killEscalated = false;
      let cpuAccountingEnabled = isCpuAccountingEnabled();
      let tokensReady = groupKill.then(async (pids) => {
        if (!cpuAccountingEnabled) return;
        if (killEscalated) {
          for (let pid of pids)
            try {
              process.kill(pid, "SIGKILL");
            } catch {}
          return;
        }
        for (let [pid, startToken] of await processStartTokens(pids)) startTokens.set(pid, startToken);
      });
      let timer = setTimeout(() => {
        killEscalated = true;
        clearInterval(pollTimer);
        if (isWindowsExitedProcess(childProcess)) {
          resolve();
          return;
        }
        try {
          process.kill(-pid, "SIGKILL");
        } catch {}
        Promise.all([
          tokensReady.then(() => killIfUnchanged(startTokens, "SIGKILL")),
          killProcessGroup_2(pid, "SIGKILL"),
        ]).finally(resolve);
      }, KILL_GRACE_MS);
      timer.unref();
      if (getPlatform() !== "windows")
        tokensReady.then(() => {
          if (killEscalated) return;
          if (isProcessTreeGone(pid, startTokens)) {
            clearTimeout(timer);
            resolve();
            return;
          }
          pollTimer = setInterval(() => {
            if (!isProcessTreeGone(pid, startTokens)) return;
            clearTimeout(timer);
            clearInterval(pollTimer);
            resolve();
          }, TREE_POLL_INTERVAL_MS);
          pollTimer.unref();
        });
    });
    let { pendingKillBackstops, dyingTrees } = this.#p;
    let buildSweepEntry = () => ({
      pid,
      running: !hasProcessExited(childProcess),
      askedAt,
      descendants: startTokens,
    });
    pendingKillBackstops.add(promise);
    dyingTrees.add(buildSweepEntry);
    let cpuAccountWindow = this.#f.cpuAccountWindow;
    if (cpuAccountWindow !== undefined) markCpuWindowHeld(cpuAccountWindow);
    promise.finally(() => {
      pendingKillBackstops.delete(promise);
      dyingTrees.delete(buildSweepEntry);
      if (cpuAccountWindow !== undefined) releaseCpuWindow(cpuAccountWindow);
    });
    return promise;
  }
  kill(reason) {
    if (this.#e === "running" || this.#e === "backgrounded") this.#T = reason;
    return this.#C();
  }
  background(taskId, options) {
    if (this.#e === "running") {
      this.#t = taskId;
      this.#e = "backgrounded";
      if (options.atExit === "leave") this.#p.liveShellCommands.delete(this);
      this.#A();
      if (this.taskOutput.stdoutToFile) this.#M();
      else if (!options.skipSpill) this.taskOutput.spillToDisk();
      return true;
    }
    return false;
  }
  get pid() {
    return this.#r?.pid;
  }
  exitSweepTarget() {
    let childProcess = this.#r;
    return childProcess?.pid === undefined
      ? undefined
      : {
          pid: childProcess.pid,
          running: !hasProcessExited(childProcess),
        };
  }
  async detach() {
    this.#p.liveShellCommands.delete(this);
    let pid = this.#r?.pid;
    if (pid === undefined) return;
    this.#r.unref();
    if (this.#_ === undefined || this.#r.exitCode !== null || this.#r.signalCode !== null) return pid;
    return (await this.#_()) ?? pid;
  }
  cleanup() {
    this.#p.liveShellCommands.delete(this);
    this.#n?.cleanup();
    this.#o?.cleanup();
    this.taskOutput.clear();
    this.#A();
    this.#r = null;
    this.#l = null;
    this.#m = undefined;
    this.#_ = undefined;
  }
}
//@ chunk-e6aww6q8.js:265449-265530 layout
/**
 * 用子进程、abort 信号、超时、TaskOutput 等构造 ShellCommandImpl。
 */
function wrapSpawn(
  childProcess,
  abortSignal,
  timeoutMs,
  taskOutput,
  hasOnTimeout = false,
  maxOutputBytes = MAX_TASK_OUTPUT_BYTES_2,
  level = "inner",
  cwd,
  timing,
) {
  return new ShellCommandImpl(
    childProcess,
    abortSignal,
    timeoutMs,
    taskOutput,
    hasOnTimeout,
    maxOutputBytes,
    level,
    cwd,
    timing,
  );
}
//@ chunk-e6aww6q8.js:265530-265807 fingerprint (2.1.88 match: AbortedShellCommand, 0.952)
/**
 * 未执行即中止的命令占位：结果 code 145、"Command aborted before execution"、interrupted。
 */
class AbortedShellCommand {
  status = "killed";
  result;
  taskOutput;
  constructor() {
    this.taskOutput = new TaskOutput(generateTaskId("local_bash"), null);
    this.result = Promise.resolve({
      code: 145,
      stdout: "",
      stderr: "Command aborted before execution",
      interrupted: true,
    });
  }
  background() {
    return false;
  }
  kill() {
    return Promise.resolve();
  }
  cleanup() {}
}
//@ chunk-e6aww6q8.js:265807-265836 layout
/**
 * 返回 AbortedShellCommand 实例（exec 在 spawn 前发现已中止时用）。
 */
function createAbortedCommand() {
  return new AbortedShellCommand();
}
//@ chunk-e6aww6q8.js:265836-265883 layout
function isWindowsExitedProcess(childProcess) {
  return getPlatform() === "windows" && hasProcessExited(childProcess);
}
//@ chunk-e6aww6q8.js:265883-265945 layout
function hasProcessExited(childProcess) {
  return childProcess.exitCode !== null || childProcess.signalCode !== null;
}
//@ chunk-e6aww6q8.js:265945-266521 layout
/**
 * 进程退出时收集仍存活/正在被杀的 shell 进程树，统一 SIGKILL 并上报 cli_shell_exit_sweep 诊断。
 */
function sweepShellTreesOnExit(exitCode) {
  try {
    let registry = shellCommandRegistry();
    let liveEntries = new Map();
    let dyingEntries = new Map();
    for (let [targetMap, getTarget] of [
      ...Array.from(registry.liveShellCommands, (command) => [
        liveEntries,
        () => command.exitSweepTarget?.(),
      ]),
      ...Array.from(registry.dyingTrees, (dyingTree) => [dyingEntries, dyingTree]),
    ])
      try {
        let target = getTarget();
        let existing = target && targetMap.get(target.pid);
        if (target !== undefined)
          targetMap.set(
            target.pid,
            existing === undefined
              ? target
              : {
                  ...target,
                  askedAt: existing.askedAt ?? target.askedAt,
                  descendants: new Map([...(existing.descendants ?? []), ...(target.descendants ?? [])]),
                },
          );
      } catch {}
    let shells = [...new Map([...liveEntries, ...dyingEntries]).values()];
    if (shells.length === 0) return;
    let sweepResult = sweepShellTrees(shells, KILL_GRACE_MS);
    logForDiagnosticsNoPII(
      "info",
      "cli_shell_exit_sweep",
      {
        exit_code: exitCode,
        shell_trees: sweepResult.trees,
        waited_ms: sweepResult.waitedMs,
        processes_sigkilled: sweepResult.outlivedGrace,
      },
      "now",
    );
  } catch {}
}
//@ chunk-e6aww6q8.js:266521-266684 layout
/**
 * 非 Windows 且开关允许时把 sweepShellTreesOnExit 挂到 process 'exit'（prepend），否则摘除。
 */
function installExitSweep() {
  if (getPlatform() === "windows") return;
  if (!isExitSweepEnabled()) {
    process.off("exit", sweepShellTreesOnExit);
    return;
  }
  if (!process.listeners("exit").includes(sweepShellTreesOnExit))
    process.prependListener("exit", sweepShellTreesOnExit);
}
//@ chunk-e6aww6q8.js:266684-266865 layout
/**
 * 用 kill(pid,0) 探测进程组与已知子孙是否都已不存在（ESRCH）。
 */
function isProcessTreeGone(pid, startTokens) {
  let allGone = true;
  for (let target of [-pid, pid])
    try {
      process.kill(target, 0);
      allGone = false;
    } catch (error) {
      if (getErrnoCode(error) !== "ESRCH") allGone = false;
    }
  for (let key of startTokens.keys())
    try {
      process.kill(key, 0);
      allGone = false;
    } catch {
      startTokens.delete(key);
    }
  return allGone;
}
//@ chunk-e6aww6q8.js:266865-267146 fingerprint (2.1.88 match: createFailedCommand, 0.932)
/**
 * 构造未启动即失败的命令对象：code 1、stderr=原因、preSpawnError（可带 preSpawnErrorCode 如 e2big）。
 */
function createFailedCommand(preSpawnError, errorCode) {
  let taskOutput = new TaskOutput(generateTaskId("local_bash"), null);
  return {
    status: "completed",
    result: Promise.resolve({
      code: 1,
      stdout: "",
      stderr: preSpawnError,
      interrupted: false,
      preSpawnError,
      ...(errorCode !== undefined && {
        preSpawnErrorCode: errorCode,
      }),
    }),
    taskOutput,
    background() {
      return false;
    },
    kill() {
      return Promise.resolve();
    },
    cleanup() {},
  };
}
//@ chunk-e6aww6q8.js:4822317-4822395 fingerprint (2.1.88 match: createAbortedCommand, 0.627)
/**
 * 结果没有 backgroundTaskId 时原样返回，否则去掉 shellUsage 字段（具体用途未完全确认）。
 */
function stripShellUsageUnlessBackgrounded(result) {
  return result.backgroundTaskId === undefined
    ? result
    : {
        ...result,
        shellUsage: undefined,
      };
}
export {
  killRunningShellCommands,
  wrapSpawn,
  drainPendingKillBackstops,
  shellCommandRegistryByHost,
  stripShellUsageUnlessBackgrounded,
  createFailedCommand,
  createAbortedCommand,
};
