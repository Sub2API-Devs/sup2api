/**
 * utils/ShellCommand.ts
 *
 * 运行中 shell 命令对象（ShellCommandImpl）：输出转发/落盘、超时与自动转后台、进程树终止、结果组装，以及已中止/启动失败的占位命令。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/ShellCommand.ts
 * pieces: chunk-5xgkngpb.js (21)
 * attribution: placement 9, fingerprint 5, layout 7
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
  literal,
  numberSchema,
  booleanSchema,
  array,
} from "../../vendor/zod/v4/classic/schemas.js";
import { env } from "./env.js";
import { logError } from "./log.js";
import {
  errorMessage,
  getErrnoCode,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  toError,
} from "./errors.js";
import { logFeatureBad, logFeatureOk, logFeatureSad } from "../services/analytics/featureTelemetry.js";
import { logEvent } from "../services/analytics/index.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { jsonStringify } from "./slowOperations.js";
import { lit as lit_2, fromEnum } from "../services/analytics/safeMetadata.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { useRef, useEffect } from "../../vendor/react/cjs/react.production.js";
import {
  MAX_TASK_OUTPUT_BYTES as MAX_TASK_OUTPUT_BYTES_2,
  getTaskOutputSize,
  isTaskOutputSwapRefusal,
  MAX_TASK_OUTPUT_BYTES_DISPLAY,
} from "./task/diskOutput.js";
import { normalizeCaseForComparison_2 } from "./permissions/filesystem.js";
import { getPlatform } from "./platform.js";
import { unwrapAbortReason } from "./abortController.js";
import { isTurnLevelAbort } from "./abortReasons.js";
import { __commonJS } from "../../runtime/bun-runtime.js";
import { isPlainObject as isPlainObject_6 } from "./isPlainObject.js";
import { plural } from "./stringUtils.js";
import { DISK_SPACE_CHECK_INTERVAL_MS, buildDiskFullWarning } from "./shell/diskSpaceWarning.js";
import { isProcessGroupAlive, leftoverProcessTracker, findProcessesByPgid } from "./shell/cpuReport.js";
import { formatDuration } from "./format.js";
import { processStartTokens } from "./processIdentity.js";
import { TaskOutput } from "./task/TaskOutput.js";
import { generateTaskId } from "../Task.js";
import { logForDiagnosticsNoPII } from "./diagLogs.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:249231-249309 placement
/**
 * 判断进程是否仍存活且启动标记一致（用于进程树清理）。
 */
function isPidStillAlive(pid, startToken) {
  let processInfo = readProcessInfo(pid);
  return processInfo !== undefined && !processInfo.exited && processInfo.startToken === startToken;
}
//@ chunk-5xgkngpb.js:249309-249667 placement
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
//@ chunk-5xgkngpb.js:249667-251549 placement
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
//@ chunk-5xgkngpb.js:256456-256492 placement
var SIGKILL_EXIT_CODE = 137;
var SIGTERM_EXIT_CODE = 143;
var KILL_GRACE_MS = 1500;
var TREE_POLL_INTERVAL_MS = 100;
//@ chunk-5xgkngpb.js:256492-256576 placement
class ShellCommandRegistry {
  pendingKillBackstops = new Set();
  liveShellCommands = new Set();
  dyingTrees = new Set();
}
//@ chunk-5xgkngpb.js:256576-256603 placement
/**
 * 按宿主缓存的 ShellCommand 注册表（待决 kill、存活命令、待收束进程树）。
 */
var shellCommandRegistryByHost; // deferred: uses ShellCommandRegistry of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:256576", () => {
  shellCommandRegistryByHost = new HostScoped(() => new ShellCommandRegistry());
});
//@ chunk-5xgkngpb.js:256603-256633 placement
function shellCommandRegistry() {
  return onProcessRootHost(shellCommandRegistryByHost);
}
//@ chunk-5xgkngpb.js:256633-256719 placement (2.1.88 match: _clearOutputsForTest, 0.458)
/**
 * 等待所有待决的 kill 收尾 Promise。
 */
async function drainPendingKillBackstops() {
  await Promise.allSettled(Array.from(shellCommandRegistry().pendingKillBackstops));
}
//@ chunk-5xgkngpb.js:256719-256816 placement
/**
 * 终止所有仍在运行的 shell 命令。
 */
function killRunningShellCommands() {
  for (let liveShellCommand of Array.from(shellCommandRegistry().liveShellCommands))
    if (liveShellCommand.status === "running") liveShellCommand.kill();
}
//@ chunk-5xgkngpb.js:258503-258960 fingerprint (2.1.88 match: StreamWrapper, 0.814)
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
//@ chunk-5xgkngpb.js:258960-264733 fingerprint (2.1.88 match: ShellCommandImpl, 0.616)
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
  #m;
  #l;
  #p;
  #g;
  #u;
  #y;
  #_ = null;
  #c = shellCommandRegistry();
  #h = null;
  #S = false;
  #b = null;
  #k;
  #f;
  #T;
  #w;
  #v;
  #E;
  taskOutput;
  static #O(command) {
    if (command.#y && command.#g)
      command.#g((registerOnTimeout) =>
        command.background(registerOnTimeout, {
          atExit: "kill",
        }),
      );
    else command.#R(SIGTERM_EXIT_CODE);
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
    this.#w = childProcess.pid;
    this.#l = abortSignal;
    this.#p = level;
    this.#u = timeoutMs;
    this.#y = hasOnTimeout;
    this.#m = maxOutputBytes;
    this.#k = cwd;
    this.taskOutput = taskOutput;
    this.#o = childProcess.stderr ? new StreamWrapper(childProcess.stderr, taskOutput, true) : null;
    this.#n = childProcess.stdout ? new StreamWrapper(childProcess.stdout, taskOutput, false) : null;
    this.outputEnded =
      this.#n || this.#o ? Promise.all([this.#n?.ended, this.#o?.ended]).then(() => {}) : undefined;
    if (hasOnTimeout)
      this.onTimeout = (onTimeout) => {
        this.#g = onTimeout;
      };
    this.result = this.#L();
    this.#c.liveShellCommands.add(this);
    installExitSweep();
    if (abortSignal.aborted) this.#P();
  }
  get status() {
    return this.#e;
  }
  #P() {
    let reason = unwrapAbortReason(this.#l.reason);
    if ((reason === "interrupt" && !killOnInterruptWhenNoBackground()) || isTurnLevelAbort(reason, this.#p))
      return;
    this.kill();
  }
  #I(code, signal) {
    if (code !== null && code !== undefined) this.#C(code);
    else this.#C(signal === "SIGTERM" ? 144 : 1, true);
  }
  #D() {
    this.#C(1, true);
  }
  #C(exitCode, flag = false) {
    if (this.#h) {
      this.#S = flag;
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
    let boundAbortHandler = this.#b;
    if (boundAbortHandler) {
      this.#l.removeEventListener("abort", boundAbortHandler);
      this.#b = null;
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
            taskOutputSize > this.#m &&
            (this.#e === "running" || this.#e === "backgrounded") &&
            this.#s !== null
          ) {
            this.#a = true;
            this.#x();
            this.#R(SIGKILL_EXIT_CODE);
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
            this.#R(SIGKILL_EXIT_CODE);
            return;
          }
        },
      );
    }, DISK_SPACE_CHECK_INTERVAL_MS);
    this.#s.unref();
  }
  #L() {
    this.#b = this.#P.bind(this);
    this.#l.addEventListener("abort", this.#b, {
      once: true,
    });
    this.#r.once("exit", this.#I.bind(this));
    this.#r.once("error", this.#D.bind(this));
    this.#i = setTimeout(ShellCommandImpl.#O, this.#u, this);
    if (this.taskOutput.stdoutToFile) this.#M();
    let exitPromise = new Promise((resolve) => {
      this.#h = resolve;
    });
    return new Promise((resolve) => {
      this.#_ = resolve;
      exitPromise.then(this.#N.bind(this));
    });
  }
  async #N(exitCode) {
    let wallMs = (this.#T ?? performance.now()) - this.#f.startedAt;
    let cpuAccount = this.#f.cpuAccountWindow && closeCpuWindow(this.#f.cpuAccountWindow);
    this.#c.liveShellCommands.delete(this);
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
        : this.#v;
    let stdout = await this.taskOutput.getStdout();
    let result = {
      code: exitCode,
      stdout,
      stderr: this.taskOutput.getStderr(),
      interrupted: wasKilled && exitCode === SIGKILL_EXIT_CODE,
      backgroundTaskId: this.#t,
    };
    if (this.#S) result.noExitStatus = true;
    if (wasKilled && this.#E !== undefined) result.stopLabel = this.#E;
    if (
      !wasKilled &&
      pid !== undefined &&
      pid > 1 &&
      leftoverProcessTracker.follows(this.#p) &&
      (isProcessGroupAlive(pid) ||
        (await findProcessesByPgid(new Set([pid])).catch(() => new Map())).has(pid)) &&
      this.#e !== "killed"
    )
      result.leftRunningPgid = pid;
    if (this.#w !== undefined)
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
      prefixMessage(`Command timed out after ${formatDuration(this.#u)}`);
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
    let exitListener = this.#_;
    if (exitListener) {
      this.#_ = null;
      exitListener(result);
    }
  }
  #R(exitCode) {
    this.#e = "killed";
    let childProcess = this.#r;
    let pid = childProcess?.pid;
    let hasWaiter = this.#h !== null;
    this.#C(exitCode ?? SIGKILL_EXIT_CODE);
    if (!pid || pid <= 1 || isWindowsExitedProcess(childProcess)) return Promise.resolve();
    if (hasWaiter && this.#f.procCpuTime) {
      this.#T = performance.now();
      this.#v = readProcCpuTime(pid);
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
    let { pendingKillBackstops, dyingTrees } = this.#c;
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
    if (this.#e === "running" || this.#e === "backgrounded") this.#E = reason;
    return this.#R();
  }
  background(taskId, options) {
    if (this.#e === "running") {
      this.#t = taskId;
      this.#e = "backgrounded";
      if (options.atExit === "leave") this.#c.liveShellCommands.delete(this);
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
    this.#c.liveShellCommands.delete(this);
    let pid = this.#r?.pid;
    if (pid === undefined) return;
    this.#r.unref();
    if (this.#k === undefined || this.#r.exitCode !== null || this.#r.signalCode !== null) return pid;
    return (await this.#k()) ?? pid;
  }
  cleanup() {
    this.#c.liveShellCommands.delete(this);
    this.#n?.cleanup();
    this.#o?.cleanup();
    this.taskOutput.clear();
    this.#A();
    this.#r = null;
    this.#l = null;
    this.#g = undefined;
    this.#k = undefined;
  }
}
//@ chunk-5xgkngpb.js:264733-264814 layout
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
//@ chunk-5xgkngpb.js:264814-265091 fingerprint (2.1.88 match: AbortedShellCommand, 0.952)
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
//@ chunk-5xgkngpb.js:265091-265120 layout
/**
 * 返回 AbortedShellCommand 实例（exec 在 spawn 前发现已中止时用）。
 */
function createAbortedCommand() {
  return new AbortedShellCommand();
}
//@ chunk-5xgkngpb.js:265120-265167 layout
function isWindowsExitedProcess(childProcess) {
  return getPlatform() === "windows" && hasProcessExited(childProcess);
}
//@ chunk-5xgkngpb.js:265167-265229 layout
function hasProcessExited(childProcess) {
  return childProcess.exitCode !== null || childProcess.signalCode !== null;
}
//@ chunk-5xgkngpb.js:265229-265805 layout
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
//@ chunk-5xgkngpb.js:265805-265968 layout
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
//@ chunk-5xgkngpb.js:265968-266149 layout
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
//@ chunk-5xgkngpb.js:266149-266430 fingerprint (2.1.88 match: createFailedCommand, 0.932)
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
//@ chunk-5xgkngpb.js:4961060-4961138 fingerprint (2.1.88 match: createAbortedCommand, 0.634)
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
  createFailedCommand,
  createAbortedCommand,
  wrapSpawn,
  stripShellUsageUnlessBackgrounded,
  drainPendingKillBackstops,
  shellCommandRegistryByHost,
};
