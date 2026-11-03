/**
 * utils/ShellCommand.ts
 *
 * 运行中 shell 命令对象（ShellCommandImpl）：输出转发/落盘、超时与自动转后台、进程树终止、结果组装，以及已中止/启动失败的占位命令。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/ShellCommand.ts
 * pieces: chunk-e6aww6q8.js (18)
 * attribution: placement 6, fingerprint 5, layout 7
 */
import { HostScoped } from "./hostScoped.js";
import { onProcessRootHost } from "../bootstrap/state.js";
import { logForDebugging } from "./debug.js";
import { o, u, E, T, A, M } from "../../vendor/zod/v4/classic/schemas.js";
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
import {
  zCt,
  closeCpuWindow,
  readProcessResourceUsage,
  readProcCpuTime,
  z_e,
  ZCt,
  releaseCpuWindow,
  rAt,
} from "./shell/processCpuTime.js";
import { z6n } from "./abortReasons.js";
import { getPlatform } from "./platform.js";
import { isPlainObject as isPlainObject_4 } from "./isPlainObject.js";
import { x } from "../../runtime/bun-runtime.js";
import { Pco, buildDiskFullWarning } from "./shell/diskSpaceWarning.js";
import { n2o, OEt, findProcessesByPgid } from "./shell/cpuReport.js";
import { formatDuration } from "./format.js";
import { killProcessGroup as killProcessGroup_2, killIfUnchanged } from "./auth/lockHolderLiveness.js";
import { processStartTokens } from "./processIdentity.js";
import { TaskOutput } from "./task/TaskOutput.js";
import { generateTaskId } from "../Task.js";
import { sweepShellTrees } from "./_new/sweepShellTrees.js";
import { logForDiagnosticsNoPII } from "./diagLogs.js";

//@ chunk-e6aww6q8.js:257176-257212 placement
var I9 = 137,
  fAt = 143,
  kAt = 1500,
  xco = 100;
//@ chunk-e6aww6q8.js:257212-257296 placement
class TAt {
  pendingKillBackstops = new Set();
  liveShellCommands = new Set();
  dyingTrees = new Set();
}
//@ chunk-e6aww6q8.js:257296-257323 placement
var x$o = new HostScoped(() => new TAt());
//@ chunk-e6aww6q8.js:257323-257353 placement
function ece() {
  return onProcessRootHost(x$o);
}
//@ chunk-e6aww6q8.js:257353-257439 placement
async function rjt() {
  await Promise.allSettled(Array.from(ece().pendingKillBackstops));
}
//@ chunk-e6aww6q8.js:257439-257536 placement
function f3n() {
  for (let e of Array.from(ece().liveShellCommands)) if (e.status === "running") e.kill();
}
/**
 * 把子进程 stdout/stderr 流按 utf-8 转发到 TaskOutput（writeStdout/writeStderr），ended 在 end/close 时完成。
 */
//@ chunk-e6aww6q8.js:259223-259680 fingerprint = StreamWrapper (0.813)
class StreamWrapper {
  #e;
  #t = !1;
  #n;
  #o;
  #r = this.#i.bind(this);
  ended;
  constructor(e, n, r) {
    ((this.#e = e),
      (this.#n = n),
      (this.#o = r),
      e.setEncoding("utf-8"),
      e.on("data", this.#r),
      (this.ended = new Promise((s) => {
        function h() {
          s();
        }
        (e.once("end", h), e.once("close", h));
      })));
  }
  #i(e) {
    let n = typeof e === "string" ? e : e.toString();
    if (this.#o) this.#n.writeStderr(n);
    else this.#n.writeStdout(n);
  }
  cleanup() {
    if (this.#t) return;
    ((this.#t = !0),
      this.#e.removeListener("data", this.#r),
      (this.#e = null),
      (this.#n = null),
      (this.#r = () => {}));
  }
}
/**
 * 运行中 shell 命令对象：状态 running/backgrounded/completed/killed；超时（可自动转后台）、abort、输出文件大小看门狗（超限或文件被替换则杀）；完成时组装 {code,stdout,stderr,interrupted,backgroundTaskId,outputFilePath,shellUsage(wall/cpu),leftRunningPgid,timedOut…}；kill 先 SIGTERM 进程树、1.5s 后 SIGKILL；background() 转后台并把输出落盘。
 */
//@ chunk-e6aww6q8.js:259680-265449 fingerprint = ShellCommandImpl (0.616)
class ShellCommandImpl {
  #e = "running";
  #t;
  #n;
  #o;
  #r;
  #i = null;
  #s = null;
  #a = !1;
  #d = !1;
  #c;
  #l;
  #u;
  #m;
  #g;
  #S;
  #y = null;
  #p = ece();
  #h = null;
  #v = !1;
  #k = null;
  #_;
  #f;
  #w;
  #b;
  #E;
  #T;
  taskOutput;
  static #O(e) {
    if (e.#S && e.#m) e.#m((n) => e.background(n, { atExit: "kill" }));
    else e.#C(fAt);
  }
  result;
  outputEnded;
  onTimeout;
  constructor(
    e,
    n,
    r,
    s,
    h = !1,
    y = MAX_TASK_OUTPUT_BYTES_2,
    S = "inner",
    w,
    L = { startedAt: performance.now(), cpuTime: !1 },
  ) {
    if (
      ((this.#f = L),
      (this.#r = e),
      (this.#b = e.pid),
      (this.#l = n),
      (this.#u = S),
      (this.#g = r),
      (this.#S = h),
      (this.#c = y),
      (this.#_ = w),
      (this.taskOutput = s),
      (this.#o = e.stderr ? new StreamWrapper(e.stderr, s, !0) : null),
      (this.#n = e.stdout ? new StreamWrapper(e.stdout, s, !1) : null),
      (this.outputEnded =
        this.#n || this.#o ? Promise.all([this.#n?.ended, this.#o?.ended]).then(() => {}) : void 0),
      h)
    )
      this.onTimeout = (G) => {
        this.#m = G;
      };
    if (((this.result = this.#L()), this.#p.liveShellCommands.add(this), installExitSweep(), n.aborted))
      this.#P();
  }
  get status() {
    return this.#e;
  }
  #P() {
    let e = unwrapAbortReason(this.#l.reason);
    if ((e === "interrupt" && !zCt()) || z6n(e, this.#u)) return;
    this.kill();
  }
  #I(e, n) {
    if (e !== null && e !== void 0) this.#R(e);
    else this.#R(n === "SIGTERM" ? 144 : 1, !0);
  }
  #D() {
    this.#R(1, !0);
  }
  #R(e, n = !1) {
    if (this.#h) ((this.#v = n), this.#h(e), (this.#h = null));
  }
  #A() {
    this.#x();
    let e = this.#i;
    if (e) (clearTimeout(e), (this.#i = null));
    let n = this.#k;
    if (n) (this.#l.removeEventListener("abort", n), (this.#k = null));
  }
  #x() {
    if (this.#s) (clearInterval(this.#s), (this.#s = null));
  }
  #M() {
    if (this.#s) return;
    ((this.#s = setInterval(() => {
      getTaskOutputSize(this.taskOutput.taskId).then(
        (e) => {
          if (e > this.#c && (this.#e === "running" || this.#e === "backgrounded") && this.#s !== null)
            ((this.#a = !0), this.#x(), this.#C(I9));
        },
        (e) => {
          if (
            isTaskOutputSwapRefusal(e) &&
            (this.#e === "running" || this.#e === "backgrounded") &&
            this.#s !== null
          ) {
            ((this.#d = !0), this.#x(), this.#C(I9));
            return;
          }
        },
      );
    }, Pco)),
      this.#s.unref());
  }
  #L() {
    if (
      ((this.#k = this.#P.bind(this)),
      this.#l.addEventListener("abort", this.#k, { once: !0 }),
      this.#r.once("exit", this.#I.bind(this)),
      this.#r.once("error", this.#D.bind(this)),
      (this.#i = setTimeout(ShellCommandImpl.#O, this.#g, this)),
      this.taskOutput.stdoutToFile)
    )
      this.#M();
    let promise = new Promise((n) => {
      this.#h = n;
    });
    return new Promise((n) => {
      ((this.#y = n), promise.then(this.#N.bind(this)));
    });
  }
  async #N(e) {
    let n = (this.#w ?? performance.now()) - this.#f.startedAt,
      r = this.#f.cpuAccountWindow && closeCpuWindow(this.#f.cpuAccountWindow);
    (this.#p.liveShellCommands.delete(this), this.#A());
    let s = this.#e === "killed";
    if (this.#e === "running" || this.#e === "backgrounded") this.#e = "completed";
    let h = this.#r?.pid,
      y = s || !this.#f.cpuTime ? void 0 : readProcessResourceUsage(this.#r),
      S = y !== void 0 && h !== void 0 && h > 1 && n2o(h),
      w =
        (S && this.#f.procCpuTime) ||
        (y !== void 0 && h !== void 0 && this.#f.procCpuTime === "background marker")
          ? readProcCpuTime(h)
          : this.#E,
      stdout = await this.taskOutput.getStdout(),
      G = {
        code: e,
        stdout: stdout,
        stderr: this.taskOutput.getStderr(),
        interrupted: s && e === I9,
        backgroundTaskId: this.#t,
      };
    if (this.#v) G.noExitStatus = !0;
    if (s && this.#T !== void 0) G.stopLabel = this.#T;
    if (
      !s &&
      h !== void 0 &&
      h > 1 &&
      OEt.follows(this.#u) &&
      (n2o(h) || (await findProcessesByPgid(new Set([h])).catch(() => new Map())).has(h)) &&
      this.#e !== "killed"
    )
      G.leftRunningPgid = h;
    if (this.#b !== void 0)
      G.shellUsage = {
        wallMs: n,
        ...(y !== void 0 && {
          cpu: { ...y, leftProcessRunning: G.leftRunningPgid !== void 0 || S || w !== void 0 },
        }),
        ...(w !== void 0 && { procCpuMs: w }),
        ...(r !== void 0 && { cpuAccount: r }),
      };
    if (this.taskOutput.stdoutToFile && !this.#t)
      if (this.taskOutput.outputFileRedundant || this.#a || this.#d)
        setImmediate(() => {
          if (!this.#t) this.taskOutput.deleteOutputFile();
        });
      else
        ((G.outputFilePath = this.taskOutput.path),
          (G.outputFileSize = this.taskOutput.outputFileSize),
          (G.outputTaskId = this.taskOutput.taskId));
    let q = (Se) => {
      if (this.taskOutput.stdoutToFile && !this.#t)
        G.stdout = stdout
          ? `${Se}
${stdout}`
          : Se;
      else G.stderr = G.stderr ? `${Se} ${G.stderr}` : Se;
    };
    if (this.#d) q("Command killed: its output file was replaced or could no longer be verified");
    else if (this.#a)
      (q(`Command killed: output file exceeded ${MAX_TASK_OUTPUT_BYTES_DISPLAY}`),
        (G.outputFileSize = this.taskOutput.outputFileSize));
    else if (s && e === fAt) ((G.timedOut = !0), q(`Command timed out after ${formatDuration(this.#g)}`));
    else if (this.taskOutput.stdoutToFile && e !== 0 && !(s && e === I9)) {
      let Se = await buildDiskFullWarning(this.taskOutput.path, stdout === "");
      if (Se)
        G.stdout = stdout
          ? `${Se}
${stdout}`
          : Se;
    }
    let Z = this.#y;
    if (Z) ((this.#y = null), Z(G));
  }
  #C(e) {
    this.#e = "killed";
    let n = this.#r,
      r = n?.pid,
      s = this.#h !== null;
    if ((this.#R(e ?? I9), !r || r <= 1 || isWindowsExitedProcess(n))) return Promise.resolve();
    if (s && this.#f.procCpuTime) ((this.#w = performance.now()), (this.#E = readProcCpuTime(r)));
    let h = killProcessGroup_2(r, "SIGTERM"),
      y,
      S = () => {
        y = Date.now();
      };
    h.then(S, S);
    let w = new Map(),
      promise = new Promise((ke) => {
        let we,
          Ee = !1,
          Ae = z_e(),
          Ie = h.then(async (We) => {
            if (!Ae) return;
            if (Ee) {
              for (let ze of We)
                try {
                  process.kill(ze, "SIGKILL");
                } catch {}
              return;
            }
            for (let [ze, lt] of await processStartTokens(We)) w.set(ze, lt);
          }),
          Me = setTimeout(() => {
            if (((Ee = !0), clearInterval(we), isWindowsExitedProcess(n))) {
              ke();
              return;
            }
            try {
              process.kill(-r, "SIGKILL");
            } catch {}
            Promise.all([
              Ie.then(() => killIfUnchanged(w, "SIGKILL")),
              killProcessGroup_2(r, "SIGKILL"),
            ]).finally(ke);
          }, kAt);
        if ((Me.unref(), getPlatform() !== "windows"))
          Ie.then(() => {
            if (Ee) return;
            if (isProcessTreeGone(r, w)) {
              (clearTimeout(Me), ke());
              return;
            }
            ((we = setInterval(() => {
              if (!isProcessTreeGone(r, w)) return;
              (clearTimeout(Me), clearInterval(we), ke());
            }, xco)),
              we.unref());
          });
      }),
      { pendingKillBackstops: pendingKillBackstops, dyingTrees: dyingTrees } = this.#p,
      Z = () => ({ pid: r, running: !hasProcessExited(n), askedAt: y, descendants: w });
    (pendingKillBackstops.add(promise), dyingTrees.add(Z));
    let cpuAccountWindow = this.#f.cpuAccountWindow;
    if (cpuAccountWindow !== void 0) ZCt(cpuAccountWindow);
    return (
      promise.finally(() => {
        if ((pendingKillBackstops.delete(promise), dyingTrees.delete(Z), cpuAccountWindow !== void 0))
          releaseCpuWindow(cpuAccountWindow);
      }),
      promise
    );
  }
  kill(e) {
    if (this.#e === "running" || this.#e === "backgrounded") this.#T = e;
    return this.#C();
  }
  background(e, n) {
    if (this.#e === "running") {
      if (((this.#t = e), (this.#e = "backgrounded"), n.atExit === "leave"))
        this.#p.liveShellCommands.delete(this);
      if ((this.#A(), this.taskOutput.stdoutToFile)) this.#M();
      else if (!n.skipSpill) this.taskOutput.spillToDisk();
      return !0;
    }
    return !1;
  }
  get pid() {
    return this.#r?.pid;
  }
  exitSweepTarget() {
    let e = this.#r;
    return e?.pid === void 0 ? void 0 : { pid: e.pid, running: !hasProcessExited(e) };
  }
  async detach() {
    this.#p.liveShellCommands.delete(this);
    let e = this.#r?.pid;
    if (e === void 0) return;
    if ((this.#r.unref(), this.#_ === void 0 || this.#r.exitCode !== null || this.#r.signalCode !== null))
      return e;
    return (await this.#_()) ?? e;
  }
  cleanup() {
    (this.#p.liveShellCommands.delete(this),
      this.#n?.cleanup(),
      this.#o?.cleanup(),
      this.taskOutput.clear(),
      this.#A(),
      (this.#r = null),
      (this.#l = null),
      (this.#m = void 0),
      (this.#_ = void 0));
  }
}
/**
 * 用子进程、abort 信号、超时、TaskOutput 等构造 ShellCommandImpl。
 */
//@ chunk-e6aww6q8.js:265449-265530 layout
function wrapSpawn(e, n, r, s, h = !1, y = MAX_TASK_OUTPUT_BYTES_2, S = "inner", w, L) {
  return new ShellCommandImpl(e, n, r, s, h, y, S, w, L);
}
/**
 * 未执行即中止的命令占位：结果 code 145、"Command aborted before execution"、interrupted。
 */
//@ chunk-e6aww6q8.js:265530-265807 fingerprint = AbortedShellCommand (0.952)
class AbortedShellCommand {
  status = "killed";
  result;
  taskOutput;
  constructor() {
    ((this.taskOutput = new TaskOutput(generateTaskId("local_bash"), null)),
      (this.result = Promise.resolve({
        code: 145,
        stdout: "",
        stderr: "Command aborted before execution",
        interrupted: !0,
      })));
  }
  background() {
    return !1;
  }
  kill() {
    return Promise.resolve();
  }
  cleanup() {}
}
/**
 * 返回 AbortedShellCommand 实例（exec 在 spawn 前发现已中止时用）。
 */
//@ chunk-e6aww6q8.js:265807-265836 layout
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
/**
 * 进程退出时收集仍存活/正在被杀的 shell 进程树，统一 SIGKILL 并上报 cli_shell_exit_sweep 诊断。
 */
//@ chunk-e6aww6q8.js:265945-266521 layout
function sweepShellTreesOnExit(e) {
  try {
    let n = ece(),
      r = new Map(),
      s = new Map();
    for (let [S, w] of [
      ...Array.from(n.liveShellCommands, (L) => [r, () => L.exitSweepTarget?.()]),
      ...Array.from(n.dyingTrees, (L) => [s, L]),
    ])
      try {
        let L = w(),
          G = L && S.get(L.pid);
        if (L !== void 0)
          S.set(
            L.pid,
            G === void 0
              ? L
              : {
                  ...L,
                  askedAt: G.askedAt ?? L.askedAt,
                  descendants: new Map([...(G.descendants ?? []), ...(L.descendants ?? [])]),
                },
          );
      } catch {}
    let h = [...new Map([...r, ...s]).values()];
    if (h.length === 0) return;
    let y = sweepShellTrees(h, kAt);
    logForDiagnosticsNoPII(
      "info",
      "cli_shell_exit_sweep",
      { exit_code: e, shell_trees: y.trees, waited_ms: y.waitedMs, processes_sigkilled: y.outlivedGrace },
      "now",
    );
  } catch {}
}
/**
 * 非 Windows 且开关允许时把 sweepShellTreesOnExit 挂到 process 'exit'（prepend），否则摘除。
 */
//@ chunk-e6aww6q8.js:266521-266684 layout
function installExitSweep() {
  if (getPlatform() === "windows") return;
  if (!rAt()) {
    process.off("exit", sweepShellTreesOnExit);
    return;
  }
  if (!process.listeners("exit").includes(sweepShellTreesOnExit))
    process.prependListener("exit", sweepShellTreesOnExit);
}
/**
 * 用 kill(pid,0) 探测进程组与已知子孙是否都已不存在（ESRCH）。
 */
//@ chunk-e6aww6q8.js:266684-266865 layout
function isProcessTreeGone(e, n) {
  let r = !0;
  for (let s of [-e, e])
    try {
      (process.kill(s, 0), (r = !1));
    } catch (error) {
      if (getErrnoCode(error) !== "ESRCH") r = !1;
    }
  for (let s of n.keys())
    try {
      (process.kill(s, 0), (r = !1));
    } catch {
      n.delete(s);
    }
  return r;
}
/**
 * 构造未启动即失败的命令对象：code 1、stderr=原因、preSpawnError（可带 preSpawnErrorCode 如 e2big）。
 */
//@ chunk-e6aww6q8.js:266865-267146 fingerprint = createFailedCommand (0.932)
function createFailedCommand(e, n) {
  let taskOutput = new TaskOutput(generateTaskId("local_bash"), null);
  return {
    status: "completed",
    result: Promise.resolve({
      code: 1,
      stdout: "",
      stderr: e,
      interrupted: !1,
      preSpawnError: e,
      ...(n !== void 0 && { preSpawnErrorCode: n }),
    }),
    taskOutput: taskOutput,
    background() {
      return !1;
    },
    kill() {
      return Promise.resolve();
    },
    cleanup() {},
  };
}
/**
 * 结果没有 backgroundTaskId 时原样返回，否则去掉 shellUsage 字段（具体用途未完全确认）。
 */
//@ chunk-e6aww6q8.js:4822317-4822395 fingerprint = createAbortedCommand (0.627)
function stripShellUsageUnlessBackgrounded(e) {
  return e.backgroundTaskId === void 0 ? e : { ...e, shellUsage: void 0 };
}

export {
  f3n,
  wrapSpawn,
  rjt,
  x$o,
  stripShellUsageUnlessBackgrounded,
  createFailedCommand,
  createAbortedCommand,
};
