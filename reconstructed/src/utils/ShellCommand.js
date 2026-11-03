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
import { string, u, E, literal, array, M } from "../../vendor/zod/v4/classic/schemas.js";
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
import { P, R } from "../../vendor/react/cjs/react.production.js";
import { unwrapAbortReason } from "./abortController.js";
import { isTurnLevelAbort } from "./abortReasons.js";
import { getPlatform } from "./platform.js";
import { isPlainObject as isPlainObject_5 } from "./isPlainObject.js";
import { x } from "../../runtime/bun-runtime.js";
import { DISK_SPACE_CHECK_INTERVAL_MS, buildDiskFullWarning } from "./shell/diskSpaceWarning.js";
import { isProcessGroupAlive, leftoverProcessTracker, findProcessesByPgid } from "./shell/cpuReport.js";
import { formatDuration } from "./format.js";
import { processStartTokens } from "./processIdentity.js";
import { TaskOutput } from "./task/TaskOutput.js";
import { generateTaskId } from "../Task.js";
import { logForDiagnosticsNoPII } from "./diagLogs.js";

//@ chunk-e6aww6q8.js:250002-250080 placement
/**
 * 判断进程是否仍存活且启动标记一致（用于进程树清理）。
 */
function isPidStillAlive(e, n) {
  let processInfo = readProcessInfo(e);
  return processInfo !== undefined && !processInfo.exited && processInfo.startToken === n;
}
//@ chunk-e6aww6q8.js:250080-250438 placement
/**
 * 从进程列表中收集以给定 pid 或进程组为根的进程树（广度优先，跳过 pid≤1 与自身）。
 */
function collectProcessTree(e, n) {
  let r = new Map();
  let s = [];
  for (let S of e) {
    if (S.ppid !== undefined) {
      let w = r.get(S.ppid);
      if (w) w.push(S);
      else r.set(S.ppid, [S]);
    }
    if (n.has(S.pid) || (S.pgrp !== undefined && n.has(S.pgrp))) s.push(S);
  }
  let h = new Set();
  let y = [];
  while (s.length > 0) {
    let S = s.shift();
    if (S.pid <= 1 || S.pid === process.pid || h.has(S.pid)) continue;
    h.add(S.pid);
    y.push(S);
    s.push(...(r.get(S.pid) ?? []));
  }
  return y;
}
//@ chunk-e6aww6q8.js:250438-252316 placement
/**
 * 退出时清理 shell 进程树：根据进程列表找出各 shell 的进程组与后代（以启动令牌识别），先发 SIGTERM，在宽限期内轮询等待退出，再对仍存活且启动令牌未变的进程发 SIGKILL；返回树数量、等待时间与超出宽限仍存活的数量。
 */
function sweepShellTrees(shells, graceMs) {
  let startedAt = Date.now();
  let processList = listProcessInfos();
  let processByPid = new Map(processList?.map((Me) => [Me.pid, Me]));
  let ownedPgids = new Set();
  let unlistedShells = [];
  for (let shell of shells) {
    if (!isSignalablePid(shell.pid)) continue;
    let We = processByPid.get(shell.pid);
    if (processList === undefined) unlistedShells.push(shell);
    else if (We === undefined || (shell.running && We.ppid === process.pid)) ownedPgids.add(shell.pid);
  }
  let groupMembers = new Map();
  let alive = new Map();
  let loneTargets = new Map();
  for (let Me of processList ? collectProcessTree(processList, ownedPgids) : []) {
    if (Me.startToken === undefined) continue;
    let pgrp = Me.pgrp !== undefined && ownedPgids.has(Me.pgrp) ? Me.pgrp : undefined;
    if (pgrp !== undefined) {
      let ze = groupMembers.get(pgrp) ?? new Map();
      groupMembers.set(pgrp, ze.set(Me.pid, Me.startToken));
    }
    if (Me.exited) continue;
    alive.set(Me.pid, Me.startToken);
    if (pgrp === undefined) loneTargets.set(Me.pid, Me.startToken);
  }
  let askedPids = new Set();
  for (let shell of shells) {
    if (shell.askedAt !== undefined) askedPids.add(shell.pid);
    for (let [We, ze] of shell.descendants ?? []) {
      if (shell.askedAt !== undefined) askedPids.add(We);
      if (processList !== undefined && isSignalablePid(We) && !alive.has(We) && isPidStillAlive(We, ze)) {
        alive.set(We, ze);
        loneTargets.set(We, ze);
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
  let signalAll = (Me) => {
    let We = (ze) => Me === "SIGTERM" && askedPids.has(ze);
    for (let [ze, lt] of groupMembers)
      if ([...lt].some(([nt, pt]) => readProcessInfo(nt)?.startToken === pt) && !We(ze))
        tryKillProcess(-ze, Me);
    for (let unlistedShell of unlistedShells)
      if (!We(unlistedShell.pid) && !tryKillProcess(-unlistedShell.pid, Me) && unlistedShell.running)
        tryKillProcess(unlistedShell.pid, Me);
    killIfUnchanged(new Map([...loneTargets].filter(([ze]) => !We(ze))), Me);
  };
  signalAll("SIGTERM");
  let deadlineFor = (Me, We) => Math.max(0, ...Me.map((ze) => (ze.askedAt ?? startedAt) + We));
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
    for (let [We, ze] of alive) if (!isPidStillAlive(We, ze)) alive.delete(We);
    if (alive.size === 0 && Date.now() >= minDeadline) break;
    sleepBlocking(Math.min(SWEEP_WAIT_STEP_MS, Math.max(1, maxDeadline - Date.now())));
  }
  if (alive.size > 0) {
    let Me = listProcessInfos() ?? [];
    let filtered = Me.filter((ze) => ze.startToken !== undefined && alive.get(ze.pid) === ze.startToken);
    for (let ze of collectProcessTree(Me, new Set(filtered.map((lt) => lt.pid))))
      if (!ze.exited && ze.startToken !== undefined && !alive.has(ze.pid))
        loneTargets.set(ze.pid, ze.startToken);
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
var shellCommandRegistryByHost = new HostScoped(() => new ShellCommandRegistry());
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
//@ chunk-e6aww6q8.js:259223-259680 fingerprint = StreamWrapper (0.813)
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
      function h() {
        resolve();
      }
      stream.once("end", h);
      stream.once("close", h);
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
//@ chunk-e6aww6q8.js:259680-265449 fingerprint = ShellCommandImpl (0.616)
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
  static #O(e) {
    if (e.#S && e.#m)
      e.#m((n) =>
        e.background(n, {
          atExit: "kill",
        }),
      );
    else e.#C(SIGTERM_EXIT_CODE);
  }
  result;
  outputEnded;
  onTimeout;
  constructor(
    e,
    n,
    r,
    taskOutput,
    h = false,
    y = MAX_TASK_OUTPUT_BYTES_2,
    S = "inner",
    w,
    L = {
      startedAt: performance.now(),
      cpuTime: false,
    },
  ) {
    this.#f = L;
    this.#r = e;
    this.#b = e.pid;
    this.#l = n;
    this.#u = S;
    this.#g = r;
    this.#S = h;
    this.#c = y;
    this.#_ = w;
    this.taskOutput = taskOutput;
    this.#o = e.stderr ? new StreamWrapper(e.stderr, taskOutput, true) : null;
    this.#n = e.stdout ? new StreamWrapper(e.stdout, taskOutput, false) : null;
    this.outputEnded =
      this.#n || this.#o ? Promise.all([this.#n?.ended, this.#o?.ended]).then(() => {}) : undefined;
    if (h)
      this.onTimeout = (G) => {
        this.#m = G;
      };
    this.result = this.#L();
    this.#p.liveShellCommands.add(this);
    installExitSweep();
    if (n.aborted) this.#P();
  }
  get status() {
    return this.#e;
  }
  #P() {
    let e = unwrapAbortReason(this.#l.reason);
    if ((e === "interrupt" && !killOnInterruptWhenNoBackground()) || isTurnLevelAbort(e, this.#u)) return;
    this.kill();
  }
  #I(code, signal) {
    if (code !== null && code !== undefined) this.#R(code);
    else this.#R(signal === "SIGTERM" ? 144 : 1, true);
  }
  #D() {
    this.#R(1, true);
  }
  #R(e, n = false) {
    if (this.#h) {
      this.#v = n;
      this.#h(e);
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
  async #N(e) {
    let wallMs = (this.#w ?? performance.now()) - this.#f.startedAt;
    let r = this.#f.cpuAccountWindow && closeCpuWindow(this.#f.cpuAccountWindow);
    this.#p.liveShellCommands.delete(this);
    this.#A();
    let s = this.#e === "killed";
    if (this.#e === "running" || this.#e === "backgrounded") this.#e = "completed";
    let pid = this.#r?.pid;
    let y = s || !this.#f.cpuTime ? undefined : readProcessResourceUsage(this.#r);
    let S = y !== undefined && pid !== undefined && pid > 1 && isProcessGroupAlive(pid);
    let w =
      (S && this.#f.procCpuTime) ||
      (y !== undefined && pid !== undefined && this.#f.procCpuTime === "background marker")
        ? readProcCpuTime(pid)
        : this.#E;
    let stdout = await this.taskOutput.getStdout();
    let G = {
      code: e,
      stdout,
      stderr: this.taskOutput.getStderr(),
      interrupted: s && e === SIGKILL_EXIT_CODE,
      backgroundTaskId: this.#t,
    };
    if (this.#v) G.noExitStatus = true;
    if (s && this.#T !== undefined) G.stopLabel = this.#T;
    if (
      !s &&
      pid !== undefined &&
      pid > 1 &&
      leftoverProcessTracker.follows(this.#u) &&
      (isProcessGroupAlive(pid) ||
        (await findProcessesByPgid(new Set([pid])).catch(() => new Map())).has(pid)) &&
      this.#e !== "killed"
    )
      G.leftRunningPgid = pid;
    if (this.#b !== undefined)
      G.shellUsage = {
        wallMs,
        ...(y !== undefined && {
          cpu: {
            ...y,
            leftProcessRunning: G.leftRunningPgid !== undefined || S || w !== undefined,
          },
        }),
        ...(w !== undefined && {
          procCpuMs: w,
        }),
        ...(r !== undefined && {
          cpuAccount: r,
        }),
      };
    if (this.taskOutput.stdoutToFile && !this.#t)
      if (this.taskOutput.outputFileRedundant || this.#a || this.#d)
        setImmediate(() => {
          if (!this.#t) this.taskOutput.deleteOutputFile();
        });
      else {
        G.outputFilePath = this.taskOutput.path;
        G.outputFileSize = this.taskOutput.outputFileSize;
        G.outputTaskId = this.taskOutput.taskId;
      }
    let q = (Se) => {
      if (this.taskOutput.stdoutToFile && !this.#t)
        G.stdout = stdout
          ? `${Se}
${stdout}`
          : Se;
      else G.stderr = G.stderr ? `${Se} ${G.stderr}` : Se;
    };
    if (this.#d) q("Command killed: its output file was replaced or could no longer be verified");
    else if (this.#a) {
      q(`Command killed: output file exceeded ${MAX_TASK_OUTPUT_BYTES_DISPLAY}`);
      G.outputFileSize = this.taskOutput.outputFileSize;
    } else if (s && e === SIGTERM_EXIT_CODE) {
      G.timedOut = true;
      q(`Command timed out after ${formatDuration(this.#g)}`);
    } else if (this.taskOutput.stdoutToFile && e !== 0 && !(s && e === SIGKILL_EXIT_CODE)) {
      let diskFullWarning = await buildDiskFullWarning(this.taskOutput.path, stdout === "");
      if (diskFullWarning)
        G.stdout = stdout
          ? `${diskFullWarning}
${stdout}`
          : diskFullWarning;
    }
    let Z = this.#y;
    if (Z) {
      this.#y = null;
      Z(G);
    }
  }
  #C(e) {
    this.#e = "killed";
    let n = this.#r;
    let pid = n?.pid;
    let s = this.#h !== null;
    this.#R(e ?? SIGKILL_EXIT_CODE);
    if (!pid || pid <= 1 || isWindowsExitedProcess(n)) return Promise.resolve();
    if (s && this.#f.procCpuTime) {
      this.#w = performance.now();
      this.#E = readProcCpuTime(pid);
    }
    let h = killProcessGroup_2(pid, "SIGTERM");
    let askedAt;
    let S = () => {
      askedAt = Date.now();
    };
    h.then(S, S);
    let w = new Map();
    let promise = new Promise((resolve) => {
      let we;
      let Ee = false;
      let Ae = isCpuAccountingEnabled();
      let Ie = h.then(async (We) => {
        if (!Ae) return;
        if (Ee) {
          for (let ze of We)
            try {
              process.kill(ze, "SIGKILL");
            } catch {}
          return;
        }
        for (let [ze, lt] of await processStartTokens(We)) w.set(ze, lt);
      });
      let timer = setTimeout(() => {
        Ee = true;
        clearInterval(we);
        if (isWindowsExitedProcess(n)) {
          resolve();
          return;
        }
        try {
          process.kill(-pid, "SIGKILL");
        } catch {}
        Promise.all([
          Ie.then(() => killIfUnchanged(w, "SIGKILL")),
          killProcessGroup_2(pid, "SIGKILL"),
        ]).finally(resolve);
      }, KILL_GRACE_MS);
      timer.unref();
      if (getPlatform() !== "windows")
        Ie.then(() => {
          if (Ee) return;
          if (isProcessTreeGone(pid, w)) {
            clearTimeout(timer);
            resolve();
            return;
          }
          we = setInterval(() => {
            if (!isProcessTreeGone(pid, w)) return;
            clearTimeout(timer);
            clearInterval(we);
            resolve();
          }, TREE_POLL_INTERVAL_MS);
          we.unref();
        });
    });
    let { pendingKillBackstops, dyingTrees } = this.#p;
    let Z = () => ({
      pid,
      running: !hasProcessExited(n),
      askedAt,
      descendants: w,
    });
    pendingKillBackstops.add(promise);
    dyingTrees.add(Z);
    let cpuAccountWindow = this.#f.cpuAccountWindow;
    if (cpuAccountWindow !== undefined) markCpuWindowHeld(cpuAccountWindow);
    promise.finally(() => {
      pendingKillBackstops.delete(promise);
      dyingTrees.delete(Z);
      if (cpuAccountWindow !== undefined) releaseCpuWindow(cpuAccountWindow);
    });
    return promise;
  }
  kill(e) {
    if (this.#e === "running" || this.#e === "backgrounded") this.#T = e;
    return this.#C();
  }
  background(taskId, n) {
    if (this.#e === "running") {
      this.#t = taskId;
      this.#e = "backgrounded";
      if (n.atExit === "leave") this.#p.liveShellCommands.delete(this);
      this.#A();
      if (this.taskOutput.stdoutToFile) this.#M();
      else if (!n.skipSpill) this.taskOutput.spillToDisk();
      return true;
    }
    return false;
  }
  get pid() {
    return this.#r?.pid;
  }
  exitSweepTarget() {
    let e = this.#r;
    return e?.pid === undefined
      ? undefined
      : {
          pid: e.pid,
          running: !hasProcessExited(e),
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
  e,
  n,
  r,
  s,
  shouldAutoBackground = false,
  y = MAX_TASK_OUTPUT_BYTES_2,
  caller = "inner",
  w,
  L,
) {
  return new ShellCommandImpl(e, n, r, s, shouldAutoBackground, y, caller, w, L);
}
//@ chunk-e6aww6q8.js:265530-265807 fingerprint = AbortedShellCommand (0.952)
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
function isWindowsExitedProcess(e) {
  return getPlatform() === "windows" && hasProcessExited(e);
}
//@ chunk-e6aww6q8.js:265883-265945 layout
function hasProcessExited(e) {
  return e.exitCode !== null || e.signalCode !== null;
}
//@ chunk-e6aww6q8.js:265945-266521 layout
/**
 * 进程退出时收集仍存活/正在被杀的 shell 进程树，统一 SIGKILL 并上报 cli_shell_exit_sweep 诊断。
 */
function sweepShellTreesOnExit(exitCode) {
  try {
    let n = shellCommandRegistry();
    let r = new Map();
    let s = new Map();
    for (let [S, w] of [
      ...Array.from(n.liveShellCommands, (L) => [r, () => L.exitSweepTarget?.()]),
      ...Array.from(n.dyingTrees, (L) => [s, L]),
    ])
      try {
        let L = w();
        let G = L && S.get(L.pid);
        if (L !== undefined)
          S.set(
            L.pid,
            G === undefined
              ? L
              : {
                  ...L,
                  askedAt: G.askedAt ?? L.askedAt,
                  descendants: new Map([...(G.descendants ?? []), ...(L.descendants ?? [])]),
                },
          );
      } catch {}
    let shells = [...new Map([...r, ...s]).values()];
    if (shells.length === 0) return;
    let y = sweepShellTrees(shells, KILL_GRACE_MS);
    logForDiagnosticsNoPII(
      "info",
      "cli_shell_exit_sweep",
      {
        exit_code: exitCode,
        shell_trees: y.trees,
        waited_ms: y.waitedMs,
        processes_sigkilled: y.outlivedGrace,
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
function isProcessTreeGone(pid, n) {
  let r = true;
  for (let s of [-pid, pid])
    try {
      process.kill(s, 0);
      r = false;
    } catch (error) {
      if (getErrnoCode(error) !== "ESRCH") r = false;
    }
  for (let key of n.keys())
    try {
      process.kill(key, 0);
      r = false;
    } catch {
      n.delete(key);
    }
  return r;
}
//@ chunk-e6aww6q8.js:266865-267146 fingerprint = createFailedCommand (0.932)
/**
 * 构造未启动即失败的命令对象：code 1、stderr=原因、preSpawnError（可带 preSpawnErrorCode 如 e2big）。
 */
function createFailedCommand(preSpawnError, n) {
  let taskOutput = new TaskOutput(generateTaskId("local_bash"), null);
  return {
    status: "completed",
    result: Promise.resolve({
      code: 1,
      stdout: "",
      stderr: preSpawnError,
      interrupted: false,
      preSpawnError,
      ...(n !== undefined && {
        preSpawnErrorCode: n,
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
//@ chunk-e6aww6q8.js:4822317-4822395 fingerprint = createAbortedCommand (0.627)
/**
 * 结果没有 backgroundTaskId 时原样返回，否则去掉 shellUsage 字段（具体用途未完全确认）。
 */
function stripShellUsageUnlessBackgrounded(e) {
  return e.backgroundTaskId === undefined
    ? e
    : {
        ...e,
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
