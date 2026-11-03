/**
 * cli/print/toolCpuSampling.ts
 *
 * 2.1.316 新增：工具执行期间的 CPU 采样（cgroup 与标记）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-tyg7f3ek.js (12)
 * attribution: placement 12
 */
import { readFileSync } from "fs";
import { posix } from "path";
import {
  MINUTE_MS,
  sessionSurfaceKind,
  CPU_MARK_TIMEOUT_MS,
  readToolCpuSamplingConfig,
  sampleShellCpuTree,
  listListeningSockets,
  MAX_DESCRIPTOR_LINKS,
  diffProcessTreeCpu,
  checksListeningSockets,
  isSameProcess,
  collectProcessTree,
  processLeaders,
  sumProcessTicks,
  CLOCK_TICKS_MS,
  CPU_NOISE_RATIO,
  MAX_CPU_PROCESSES,
  isClaudeCodeAgentEnviron,
  MAX_FULL_CORE_PROCESSES,
  FULL_CORE_CPU_RATIO,
  runningLocalShells,
  PROC_FS_READER_WITH_LINKS,
} from "./forkConversation.js";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { logError } from "../../utils/log.js";
import { count } from "../../utils/collections.js";
import { getRunningTasks } from "../../utils/task/framework.js";
import { isLocalShellTask } from "../../tasks/LocalShellTask/guards.js";
import { waitForTaskCompletion } from "../../tools/TaskOutputTool/TaskOutputTool.js";
import { skipsTranscript, isParkedMcpTask, isIdleTeammateTask } from "../../tasks/taskKinds.js";
import { sessionHostKind } from "../../utils/telemetry/memorySummary.js";
import { isChildSession } from "../../utils/sessionShape.js";
import { isDiskless } from "../../bootstrap/state.js";
import { env } from "../../utils/env.js";
import {
  getCpuacctPath,
  CPUACCT_ROOT,
  ensureCpuacctGroup,
  readCpuUsageSeconds,
  setCpuacctDir,
} from "../../utils/shell/cpuReport.js";
import { takeNoWindowUsage } from "../../utils/shell/processCpuTime.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { reportsRunningBackgroundTasks } from "./backgroundWindDown.js";
import { xr } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { registerCleanup } from "../../utils/cleanupRegistry.js";

//@ chunk-tyg7f3ek.js:606037-606378 placement
function nextCpuMark(e, n) {
  let r = e.clock.monotonicNow() - n.startMs;
  let max = Math.max(r / MINUTE_MS, n.lastMarkMin);
  let h = n.marksMin.at(-1) ?? 0;
  let y =
    n.marksMin.find((S) => S > max) ??
    (n.thenEveryMin === undefined
      ? undefined
      : h + (Math.floor((max - h) / n.thenEveryMin) + 1) * n.thenEveryMin);
  if (y === undefined) return;
  n.cancelMark = e.clock.setTimeout(
    () => {
      n.cancelMark = undefined;
      recordCpuMark(e, n, "mark", y);
    },
    y * MINUTE_MS - r,
    {
      unref: true,
    },
  );
}
//@ chunk-tyg7f3ek.js:606378-606472 placement
function cpuMarkPayload(e, at, r) {
  return {
    at,
    from_min: Math.min(r, e.marksMin.at(-1) ?? 0),
    session_family: sessionSurfaceKind(),
  };
}
//@ chunk-tyg7f3ek.js:606472-606569 placement
function reportCpuMarkGaveUp(e, n, r, s) {
  logFeatureSad("ccr_idle_cpu_mark", s);
  logForDiagnosticsNoPII("warn", "idle_cpu_mark", {
    ...cpuMarkPayload(e, n, r),
    gave_up: s,
  });
}
//@ chunk-tyg7f3ek.js:606569-606942 placement
function recordCpuMark(e, wait, r, s) {
  e.settled = e.settled
    .then(async () => {
      if (e.timedOut) return;
      let deferred = Promise.withResolvers();
      let y = e.clock.setTimeout(
        () => {
          e.timedOut = true;
          deferred.resolve();
          try {
            e.wait?.cancelMark?.();
            e.wait = undefined;
            reportCpuMarkGaveUp(wait, r, wait.last?.markMin ?? s, "timed_out");
          } catch (error) {
            logFeatureBad("ccr_idle_cpu_mark", "threw");
            logError(error);
          }
        },
        CPU_MARK_TIMEOUT_MS,
        {
          unref: true,
        },
      );
      try {
        await Promise.race([sampleToolCpuMark(e, wait, r, s), deferred.promise]);
      } finally {
        y();
      }
    })
    .catch(logError);
}
//@ chunk-tyg7f3ek.js:606942-610623 placement
async function sampleToolCpuMark(e, n, r, markMin) {
  try {
    let last = n.last;
    if (r === "mark" ? e.wait !== n : last === undefined) return;
    if (r === "mark" && (e.sessionState.getState() !== "idle" || readToolCpuSamplingConfig() === undefined)) {
      e.wait = undefined;
      return;
    }
    n.lastMarkMin = markMin;
    let y = await sampleShellCpuTree(e, last, markMin);
    if (e.timedOut) return;
    if (typeof y === "string") {
      n.last = undefined;
      reportCpuMarkGaveUp(n, r, last?.markMin ?? markMin, y);
      return;
    }
    let S = last ?? y;
    let R = y.atMs - S.atMs;
    let w = {
      listeningSockets: await listListeningSockets(e.proc),
      linksLeft: MAX_DESCRIPTOR_LINKS,
    };
    let P = {
      now: new Set(),
      then: new Set(),
    };
    let L = [];
    let q = {
      grewListen: 0,
      grew: 0,
      quietListen: 0,
      quiet: 0,
      leftListen: 0,
      left: 0,
      ended: 0,
    };
    let shellsGrew = 0;
    for (let shell of y.shells) {
      let me = shell.pid === undefined ? undefined : y.processes.get(shell.pid);
      if (shell.pid === undefined || me?.ppid !== process.pid || me.starttime !== shell.starttime) continue;
      let Me = diffProcessTreeCpu(S, y, shell.pid, P);
      let Ee = await checksListeningSockets(e.proc, Me.tree, w);
      shell.listens = Ee === "yes";
      let He = Ee !== "no";
      let found = S.shells.find((shell_2) => shell_2.id === shell.id);
      let We =
        (shell.outputBytes ?? -2) !==
        (found === undefined ? (isSameProcess(S, y, shell.pid) ? -1 : 0) : (found.outputBytes ?? -1));
      shellsGrew += We ? 1 : 0;
      q[We ? (He ? "grewListen" : "grew") : He ? "quietListen" : "quiet"] += Me.cpuMs;
      if (!We && !He) L.push(...Me.tree);
    }
    let filtered = S.shells.filter((shell) => !y.runningShellIds.has(shell.id));
    let Z = [];
    for (let { pid, starttime, usage } of filtered) {
      let Ee = pid === undefined ? undefined : S.processes.get(pid);
      if (pid === undefined || Ee?.ppid !== process.pid || Ee.starttime !== starttime) continue;
      let processTree = collectProcessTree(S, processLeaders(S, pid), new Set());
      let cpuMs =
        y.processes.has(pid) && !isSameProcess(S, y, pid) ? 0 : diffProcessTreeCpu(S, y, pid, P).cpuMs;
      let We =
        sumProcessTicks(
          S,
          processTree.filter((Lt) => !P.then.has(Lt) && !isSameProcess(S, y, Lt)),
        ) * CLOCK_TICKS_MS;
      let winner = await Promise.race([usage, undefined]);
      let wt = (winner?.cpu?.userMs ?? 0) + (winner?.cpu?.systemMs ?? 0);
      Z.push({
        byResultAndProc: cpuMs + Math.max(0, wt - We),
        byWholeTree: processTree.some((Lt) => isSameProcess(S, y, Lt) && !P.now.has(Lt))
          ? 0
          : wt + (winner?.procCpuMs ?? 0) - sumProcessTicks(S, processTree) * CLOCK_TICKS_MS,
      });
    }
    collectProcessTree(y, processLeaders(y, process.pid), P.now);
    let sliced = [...y.processes.keys()]
      .filter((key) => key > 1 && !P.now.has(key))
      .map((key) => ({
        pid: key,
        ticks: sumProcessTicks(y, [key]) - (isSameProcess(S, y, key) ? sumProcessTicks(S, [key]) : 0),
      }))
      .filter(({ ticks }) => ticks * CLOCK_TICKS_MS > R * CPU_NOISE_RATIO)
      .sort((Se, me) => me.ticks - Se.ticks)
      .slice(0, MAX_CPU_PROCESSES);
    let Ae = false;
    for (let { pid } of sliced) {
      if (
        e.timedOut ||
        P.now.has(pid) ||
        !isClaudeCodeAgentEnviron(await e.proc.startOfFile(`${pid}/environ`))
      )
        continue;
      let session = y.processes.get(pid)?.session ?? 0;
      let Me = diffProcessTreeCpu(
        S,
        y,
        session > 1 && !y.processes.has(session) && session !== y.processes.get(process.pid)?.session
          ? session
          : pid,
        P,
      );
      let Ee = (await checksListeningSockets(e.proc, Me.tree, w)) !== "no";
      q[Ee ? "leftListen" : "left"] += Me.cpuMs;
      if (!Ee) L.push(...Me.tree);
      Ae ||= Me.tree.some((He) => !isSameProcess(S, y, He));
    }
    for (let { byResultAndProc, byWholeTree } of Z)
      q.ended += Ae ? byResultAndProc : Math.max(byResultAndProc, byWholeTree);
    if (e.timedOut) return;
    if (last === undefined) {
      n.last = y;
      return;
    }
    let Ue = [...y.shells, ...filtered];
    let ce = count(Ue, (Se) => Se.kind === "serve_or_watch");
    let nt = count(Ue, (Se) => Se.kind === "wait");
    let ie = Math.max(0, y.vmBusyTicks - S.vmBusyTicks) * CLOCK_TICKS_MS;
    if (!e.hasReportedOk) {
      e.hasReportedOk = true;
      logFeatureOk("ccr_idle_cpu_mark");
    }
    logForDiagnosticsNoPII("warn", "idle_cpu_mark", {
      ...cpuMarkPayload(n, r, S.markMin),
      span_s: Math.round(R / 1000),
      vm_cpu_ms: ie,
      vm_cpu_band: ie <= R * 0.05 ? "le_0_05" : ie <= R * 0.25 ? "le_0_25" : ie <= R ? "le_1" : "gt_1",
      shells: y.runningShellIds.size,
      shells_grew: shellsGrew,
      all_shells_listen:
        Ue.length > 0 && count(Ue, (Se) => Se.listens === true) === y.runningShellIds.size + filtered.length,
      shell_kinds:
        Ue.length === 0
          ? "none"
          : ce === Ue.length
            ? "serve_or_watch"
            : nt === Ue.length
              ? "wait"
              : ce + nt > 0
                ? "mixed"
                : "other",
      shells_ended: filtered.length,
      other_tasks_running: getRunningTasks(e.getState()).some(
        (Se) =>
          !isLocalShellTask(Se) &&
          waitForTaskCompletion(Se) &&
          Se.type !== "remote_agent" &&
          !skipsTranscript(Se) &&
          !isParkedMcpTask(Se) &&
          !isIdleTeammateTask(Se),
      ),
      shells_grew_listen_cpu_ms: q.grewListen,
      shells_grew_cpu_ms: q.grew,
      shells_quiet_listen_cpu_ms: q.quietListen,
      shells_quiet_cpu_ms: q.quiet,
      shells_ended_cpu_ms: Math.round(q.ended),
      left_running_listen_cpu_ms: q.leftListen,
      left_running_cpu_ms: q.left,
      full_core_processes: Math.min(
        MAX_FULL_CORE_PROCESSES,
        count(
          L,
          (Se) =>
            isSameProcess(S, y, Se) &&
            ((y.processes.get(Se)?.ownTicks ?? 0) - (S.processes.get(Se)?.ownTicks ?? 0)) * CLOCK_TICKS_MS >=
              R * FULL_CORE_CPU_RATIO,
        ),
      ),
      ...(y.shellCgroupCpuMs !== undefined &&
        S.shellCgroupCpuMs !== undefined && {
          shell_cgroup_cpu_ms: Math.max(0, Math.round(y.shellCgroupCpuMs - S.shellCgroupCpuMs)),
        }),
    });
    n.last = y;
  } catch (error) {
    logFeatureBad("ccr_idle_cpu_mark", "threw");
    logError(error);
  } finally {
    if (r === "mark" && e.wait === n) nextCpuMark(e, n);
  }
}
//@ chunk-tyg7f3ek.js:610623-611078 placement
function endToolCpuWait(e, n) {
  let wait = e.wait;
  if (e.timedOut || (n === "idle" && wait !== undefined)) return;
  wait?.cancelMark?.();
  e.wait = undefined;
  try {
    if (wait !== undefined) recordCpuMark(e, wait, "end", wait.lastMarkMin);
    if (n !== "idle") return;
    let toolCpuSamplingConfig = readToolCpuSamplingConfig();
    if (toolCpuSamplingConfig === undefined) return;
    e.wait = {
      marksMin: toolCpuSamplingConfig.marksMin,
      thenEveryMin: toolCpuSamplingConfig.thenEveryMin,
      startMs: e.clock.monotonicNow(),
      lastMarkMin: 0,
      last: undefined,
      cancelMark: undefined,
    };
    if (toolCpuSamplingConfig.fromStart && runningLocalShells(e).length > 0)
      recordCpuMark(e, e.wait, "mark", 0);
    else nextCpuMark(e, e.wait);
  } catch (error) {
    logFeatureBad("ccr_idle_cpu_mark", "threw");
    logError(error);
  }
}
//@ chunk-tyg7f3ek.js:611078-611433 placement
/**
 * hosted worker 上按 tengu_starry_balloon 配置的分钟标记采样工具 CPU 用量（需 CLAUDE_CODE_DIAGNOSTICS_FILE）。
 */
function startToolCpuSampling(sessionState, getState, clock, proc = PROC_FS_READER_WITH_LINKS) {
  try {
    if (
      sessionHostKind() !== "hosted_worker" ||
      isChildSession() ||
      isDiskless() ||
      !env.CLAUDE_CODE_DIAGNOSTICS_FILE
    )
      return;
    let h = {
      sessionState,
      getState,
      clock,
      proc,
      wait: undefined,
      settled: Promise.resolve(),
      timedOut: false,
      hasReportedOk: false,
      kinds: new Map(),
    };
    sessionState.stateChanged.subscribe((y) => endToolCpuWait(h, y));
    endToolCpuWait(h, sessionState.getState());
    return h;
  } catch (error) {
    logFeatureBad("ccr_idle_cpu_mark", "threw");
    logError(error);
    return;
  }
}
//@ chunk-tyg7f3ek.js:611498-611537 placement
var CGROUP_SAMPLE_MINUTES = [5, 10, 15, 30, 60, 120];
var MINUTE_MS_2 = 60000;
var cancelCgroupSample;
//@ chunk-tyg7f3ek.js:611537-611589 placement
function cpuacctPathFromCgroup(file) {
  let cpuacctPath = getCpuacctPath(file);
  return cpuacctPath === "/" ? undefined : cpuacctPath;
}
//@ chunk-tyg7f3ek.js:611589-613764 placement
/**
 * CCR 容器内读 cgroup cpuacct.usage，按阶段（等待/工具/空闲）统计 CPU 并上报 tengu_tool_cpu_by_phase。
 */
function startCgroupCpuSampling(sessionState, n, clock) {
  if (!env.CLAUDE_CODE_REMOTE || isDiskless()) return;
  let s;
  try {
    s = cpuacctPathFromCgroup(readFileSync("/proc/self/cgroup", "utf8"));
  } catch {
    return;
  }
  if (s === undefined) return;
  let joined = posix.join(CPUACCT_ROOT, s, "cpuacct.usage");
  let cpuacctGroup = ensureCpuacctGroup(s);
  let S = cpuacctGroup === undefined ? undefined : posix.join(cpuacctGroup, "cpuacct.usage");
  function R() {
    let cpuUsageSeconds = readCpuUsageSeconds(joined);
    if (cpuUsageSeconds === undefined) return;
    let me = process.cpuUsage();
    return {
      groupMs: cpuUsageSeconds,
      cliMs: (me.user + me.system) / 1000,
      wallMs: clock.monotonicNow(),
      shellMs: S === undefined ? undefined : readCpuUsageSeconds(S),
    };
  }
  let w = R();
  if (w === undefined) return;
  takeNoWindowUsage(w.shellMs, w.wallMs);
  let P = refineIdleState(sessionState.getState(), n);
  let L = 0;
  let q = {};
  let x = isIdleCpuState(P) ? clock.monotonicNow() : undefined;
  let G = 0;
  let Z;
  function re() {
    let Se = R();
    let me = takeNoWindowUsage(Se?.shellMs, Se?.wallMs ?? clock.monotonicNow());
    if (Se !== undefined && w !== undefined) {
      let Me = Se.cliMs - w.cliMs;
      let Ee = [
        [`${P}_wall_ms`, Se.wallMs - w.wallMs],
        [`${P}_cli_cpu_ms`, Me],
        [`${P}_tools_cpu_ms`, Math.max(0, Se.groupMs - w.groupMs - Me)],
      ];
      if (Se.shellMs !== undefined && w.shellMs !== undefined) {
        let max = Math.max(0, Se.shellMs - w.shellMs);
        Ee.push([`${P}_shell_cpu_ms`, max]);
        if (P === "running" || P === "idle_background")
          Ee.push(
            [`${P}_no_command_cpu_ms`, Math.min(me.cpuMs, max)],
            [`${P}_no_command_wall_ms`, me.wallMs],
          );
      }
      for (let [He, Xe] of Ee) q[He] = (q[He] ?? 0) + Xe;
    }
    w = Se;
  }
  function Ae(Se) {
    logEvent("tengu_tool_cpu_by_phase", {
      trigger: fromEnum(Se),
      sequence: L,
      bg_tasks_report_running: reportsRunningBackgroundTasks(),
      ...(x !== undefined && {
        waited_ms: Math.round(clock.monotonicNow() - x),
      }),
      ...xr(q, Math.round),
    });
    L++;
    q = {};
  }
  function Ue() {
    Z?.();
    Z = undefined;
  }
  function ce() {
    if (P !== "idle_background" || x === undefined) return;
    let Se = clock.monotonicNow() - x;
    let me = Math.max(Se, G) / MINUTE_MS_2;
    let Me = (CGROUP_SAMPLE_MINUTES.find((Ee) => Ee > me) ?? (Math.floor(me / 60) + 1) * 60) * MINUTE_MS_2;
    Z = clock.setTimeout(
      () => {
        Z = undefined;
        try {
          re();
          if (sessionState.getState() !== "idle") return;
          P = refineIdleState("idle", n);
          G = Me;
          Ae("idle_timer");
          ce();
        } catch (error) {
          logForDebugging(
            `tengu_tool_cpu_by_phase: could not send a timed event during an idle wait; no more timed events until the session state changes: ${errorMessage(error)}`,
            {
              level: "error",
            },
          );
        }
      },
      Me - Se,
      {
        unref: true,
      },
    );
  }
  cancelCgroupSample?.();
  setCpuacctDir(cpuacctGroup);
  let nt = sessionState.stateChanged.subscribe((Se) => {
    Ue();
    try {
      re();
      let me = isIdleCpuState(P);
      P = refineIdleState(Se, n);
      if (me && !isIdleCpuState(P))
        try {
          Ae("idle_end");
        } finally {
          x = undefined;
        }
      else if (!me && isIdleCpuState(P)) {
        x = clock.monotonicNow();
        G = 0;
      }
      ce();
    } catch (error) {
      logForDebugging(
        `tengu_tool_cpu_by_phase: could not record a session state change; telemetry continues from the next one: ${errorMessage(error)}`,
        {
          level: "error",
        },
      );
    }
  });
  let ie = registerCleanup(() => {
    Ue();
    re();
    Ae("exit");
  });
  ce();
  cancelCgroupSample = () => {
    Ue();
    nt();
    ie();
    setCpuacctDir(undefined);
  };
}
//@ chunk-tyg7f3ek.js:613764-613820 placement
function isIdleCpuState(e) {
  return e === "idle" || e === "idle_background";
}
//@ chunk-tyg7f3ek.js:613820-613969 placement
function refineIdleState(e, n) {
  if (e !== "idle") return e;
  return getRunningTasks(n()).some(
    (r) =>
      waitForTaskCompletion(r) &&
      r.type !== "remote_agent" &&
      !skipsTranscript(r) &&
      !isParkedMcpTask(r) &&
      !isIdleTeammateTask(r),
  )
    ? "idle_background"
    : "idle";
}
export { startCgroupCpuSampling, startToolCpuSampling };
