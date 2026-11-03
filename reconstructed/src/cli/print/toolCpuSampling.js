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
import { posix, posix as posix_2, posix as posix_3 } from "path";
import {
  YF,
  sessionSurfaceKind,
  RG,
  readToolCpuSamplingConfig,
  sampleShellCpuTree,
  listListeningSockets,
  OG,
  diffProcessTreeCpu,
  checksListeningSockets,
  isSameProcess,
  collectProcessTree,
  processLeaders,
  sumProcessTicks,
  rc,
  xG,
  IG,
  isClaudeCodeAgentEnviron,
  EG,
  UG,
  runningLocalShells,
  BG,
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
  ghn,
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
  let r = e.clock.monotonicNow() - n.startMs,
    max = Math.max(r / YF, n.lastMarkMin),
    h = n.marksMin.at(-1) ?? 0,
    y =
      n.marksMin.find((S) => S > max) ??
      (n.thenEveryMin === void 0
        ? void 0
        : h + (Math.floor((max - h) / n.thenEveryMin) + 1) * n.thenEveryMin);
  if (y === void 0) return;
  n.cancelMark = e.clock.setTimeout(
    () => {
      ((n.cancelMark = void 0), recordCpuMark(e, n, "mark", y));
    },
    y * YF - r,
    { unref: !0 },
  );
}
//@ chunk-tyg7f3ek.js:606378-606472 placement
function ix(e, n, r) {
  return { at: n, from_min: Math.min(r, e.marksMin.at(-1) ?? 0), session_family: sessionSurfaceKind() };
}
//@ chunk-tyg7f3ek.js:606472-606569 placement
function ax(e, n, r, s) {
  (logFeatureSad("ccr_idle_cpu_mark", s),
    logForDiagnosticsNoPII("warn", "idle_cpu_mark", { ...ix(e, n, r), gave_up: s }));
}
//@ chunk-tyg7f3ek.js:606569-606942 placement
function recordCpuMark(e, n, r, s) {
  e.settled = e.settled
    .then(async () => {
      if (e.timedOut) return;
      let withResolvers = Promise.withResolvers(),
        y = e.clock.setTimeout(
          () => {
            ((e.timedOut = !0), withResolvers.resolve());
            try {
              (e.wait?.cancelMark?.(), (e.wait = void 0), ax(n, r, n.last?.markMin ?? s, "timed_out"));
            } catch (error) {
              (logFeatureBad("ccr_idle_cpu_mark", "threw"), logError(error));
            }
          },
          RG,
          { unref: !0 },
        );
      try {
        await Promise.race([sampleToolCpuMark(e, n, r, s), withResolvers.promise]);
      } finally {
        y();
      }
    })
    .catch(logError);
}
//@ chunk-tyg7f3ek.js:606942-610623 placement
async function sampleToolCpuMark(e, n, r, s) {
  try {
    let last = n.last;
    if (r === "mark" ? e.wait !== n : last === void 0) return;
    if (r === "mark" && (e.sessionState.getState() !== "idle" || readToolCpuSamplingConfig() === void 0)) {
      e.wait = void 0;
      return;
    }
    n.lastMarkMin = s;
    let y = await sampleShellCpuTree(e, last, s);
    if (e.timedOut) return;
    if (typeof y === "string") {
      ((n.last = void 0), ax(n, r, last?.markMin ?? s, y));
      return;
    }
    let S = last ?? y,
      R = y.atMs - S.atMs,
      w = { listeningSockets: await listListeningSockets(e.proc), linksLeft: OG },
      P = { now: new Set(), then: new Set() },
      L = [],
      q = { grewListen: 0, grew: 0, quietListen: 0, quiet: 0, leftListen: 0, left: 0, ended: 0 },
      x = 0;
    for (let shell of y.shells) {
      let me = shell.pid === void 0 ? void 0 : y.processes.get(shell.pid);
      if (shell.pid === void 0 || me?.ppid !== process.pid || me.starttime !== shell.starttime) continue;
      let Me = diffProcessTreeCpu(S, y, shell.pid, P),
        Ee = await checksListeningSockets(e.proc, Me.tree, w);
      shell.listens = Ee === "yes";
      let He = Ee !== "no",
        found = S.shells.find((shell_2) => shell_2.id === shell.id),
        We =
          (shell.outputBytes ?? -2) !==
          (found === void 0 ? (isSameProcess(S, y, shell.pid) ? -1 : 0) : (found.outputBytes ?? -1));
      if (
        ((x += We ? 1 : 0),
        (q[We ? (He ? "grewListen" : "grew") : He ? "quietListen" : "quiet"] += Me.cpuMs),
        !We && !He)
      )
        L.push(...Me.tree);
    }
    let filtered = S.shells.filter((shell) => !y.runningShellIds.has(shell.id)),
      Z = [];
    for (let { pid: pid, starttime: starttime, usage: usage } of filtered) {
      let Ee = pid === void 0 ? void 0 : S.processes.get(pid);
      if (pid === void 0 || Ee?.ppid !== process.pid || Ee.starttime !== starttime) continue;
      let He = collectProcessTree(S, processLeaders(S, pid), new Set()),
        Xe = y.processes.has(pid) && !isSameProcess(S, y, pid) ? 0 : diffProcessTreeCpu(S, y, pid, P).cpuMs,
        We =
          sumProcessTicks(
            S,
            He.filter((Lt) => !P.then.has(Lt) && !isSameProcess(S, y, Lt)),
          ) * rc,
        winner = await Promise.race([usage, void 0]),
        wt = (winner?.cpu?.userMs ?? 0) + (winner?.cpu?.systemMs ?? 0);
      Z.push({
        byResultAndProc: Xe + Math.max(0, wt - We),
        byWholeTree: He.some((Lt) => isSameProcess(S, y, Lt) && !P.now.has(Lt))
          ? 0
          : wt + (winner?.procCpuMs ?? 0) - sumProcessTicks(S, He) * rc,
      });
    }
    collectProcessTree(y, processLeaders(y, process.pid), P.now);
    let sliced = [...y.processes.keys()]
        .filter((Se) => Se > 1 && !P.now.has(Se))
        .map((Se) => ({
          pid: Se,
          ticks: sumProcessTicks(y, [Se]) - (isSameProcess(S, y, Se) ? sumProcessTicks(S, [Se]) : 0),
        }))
        .filter(({ ticks: ticks }) => ticks * rc > R * xG)
        .sort((Se, me) => me.ticks - Se.ticks)
        .slice(0, IG),
      Ae = !1;
    for (let { pid: pid } of sliced) {
      if (
        e.timedOut ||
        P.now.has(pid) ||
        !isClaudeCodeAgentEnviron(await e.proc.startOfFile(`${pid}/environ`))
      )
        continue;
      let me = y.processes.get(pid)?.session ?? 0,
        Me = diffProcessTreeCpu(
          S,
          y,
          me > 1 && !y.processes.has(me) && me !== y.processes.get(process.pid)?.session ? me : pid,
          P,
        ),
        Ee = (await checksListeningSockets(e.proc, Me.tree, w)) !== "no";
      if (((q[Ee ? "leftListen" : "left"] += Me.cpuMs), !Ee)) L.push(...Me.tree);
      Ae ||= Me.tree.some((He) => !isSameProcess(S, y, He));
    }
    for (let { byResultAndProc: byResultAndProc, byWholeTree: byWholeTree } of Z)
      q.ended += Ae ? byResultAndProc : Math.max(byResultAndProc, byWholeTree);
    if (e.timedOut) return;
    if (last === void 0) {
      n.last = y;
      return;
    }
    let Ue = [...y.shells, ...filtered],
      ce = count(Ue, (Se) => Se.kind === "serve_or_watch"),
      nt = count(Ue, (Se) => Se.kind === "wait"),
      ie = Math.max(0, y.vmBusyTicks - S.vmBusyTicks) * rc;
    if (!e.hasReportedOk) ((e.hasReportedOk = !0), logFeatureOk("ccr_idle_cpu_mark"));
    (logForDiagnosticsNoPII("warn", "idle_cpu_mark", {
      ...ix(n, r, S.markMin),
      span_s: Math.round(R / 1000),
      vm_cpu_ms: ie,
      vm_cpu_band: ie <= R * 0.05 ? "le_0_05" : ie <= R * 0.25 ? "le_0_25" : ie <= R ? "le_1" : "gt_1",
      shells: y.runningShellIds.size,
      shells_grew: x,
      all_shells_listen:
        Ue.length > 0 && count(Ue, (Se) => Se.listens === !0) === y.runningShellIds.size + filtered.length,
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
        EG,
        count(
          L,
          (Se) =>
            isSameProcess(S, y, Se) &&
            ((y.processes.get(Se)?.ownTicks ?? 0) - (S.processes.get(Se)?.ownTicks ?? 0)) * rc >= R * UG,
        ),
      ),
      ...(y.shellCgroupCpuMs !== void 0 &&
        S.shellCgroupCpuMs !== void 0 && {
          shell_cgroup_cpu_ms: Math.max(0, Math.round(y.shellCgroupCpuMs - S.shellCgroupCpuMs)),
        }),
    }),
      (n.last = y));
  } catch (error) {
    (logFeatureBad("ccr_idle_cpu_mark", "threw"), logError(error));
  } finally {
    if (r === "mark" && e.wait === n) nextCpuMark(e, n);
  }
}
//@ chunk-tyg7f3ek.js:610623-611078 placement
function endToolCpuWait(e, n) {
  let wait = e.wait;
  if (e.timedOut || (n === "idle" && wait !== void 0)) return;
  (wait?.cancelMark?.(), (e.wait = void 0));
  try {
    if (wait !== void 0) recordCpuMark(e, wait, "end", wait.lastMarkMin);
    if (n !== "idle") return;
    let s = readToolCpuSamplingConfig();
    if (s === void 0) return;
    if (
      ((e.wait = {
        marksMin: s.marksMin,
        thenEveryMin: s.thenEveryMin,
        startMs: e.clock.monotonicNow(),
        lastMarkMin: 0,
        last: void 0,
        cancelMark: void 0,
      }),
      s.fromStart && runningLocalShells(e).length > 0)
    )
      recordCpuMark(e, e.wait, "mark", 0);
    else nextCpuMark(e, e.wait);
  } catch (error) {
    (logFeatureBad("ccr_idle_cpu_mark", "threw"), logError(error));
  }
}
/**
 * hosted worker 上按 tengu_starry_balloon 配置的分钟标记采样工具 CPU 用量（需 CLAUDE_CODE_DIAGNOSTICS_FILE）。
 */
//@ chunk-tyg7f3ek.js:611078-611433 placement
function startToolCpuSampling(e, n, r, s = BG) {
  try {
    if (
      sessionHostKind() !== "hosted_worker" ||
      isChildSession() ||
      isDiskless() ||
      !env.CLAUDE_CODE_DIAGNOSTICS_FILE
    )
      return;
    let h = {
      sessionState: e,
      getState: n,
      clock: r,
      proc: s,
      wait: void 0,
      settled: Promise.resolve(),
      timedOut: !1,
      hasReportedOk: !1,
      kinds: new Map(),
    };
    return (e.stateChanged.subscribe((y) => endToolCpuWait(h, y)), endToolCpuWait(h, e.getState()), h);
  } catch (error) {
    (logFeatureBad("ccr_idle_cpu_mark", "threw"), logError(error));
    return;
  }
}
//@ chunk-tyg7f3ek.js:611498-611537 placement
var jG = [5, 10, 15, 30, 60, 120],
  cx = 60000,
  mx;
//@ chunk-tyg7f3ek.js:611537-611589 placement
function QG(e) {
  let n = getCpuacctPath(e);
  return n === "/" ? void 0 : n;
}
/**
 * CCR 容器内读 cgroup cpuacct.usage，按阶段（等待/工具/空闲）统计 CPU 并上报 tengu_tool_cpu_by_phase。
 */
//@ chunk-tyg7f3ek.js:611589-613764 placement
function startCgroupCpuSampling(e, n, r) {
  if (!env.CLAUDE_CODE_REMOTE || isDiskless()) return;
  let s;
  try {
    s = QG(readFileSync("/proc/self/cgroup", "utf8"));
  } catch {
    return;
  }
  if (s === void 0) return;
  let joined = posix_3.join(ghn, s, "cpuacct.usage"),
    y = ensureCpuacctGroup(s),
    S = y === void 0 ? void 0 : posix_3.join(y, "cpuacct.usage");
  function R() {
    let Se = readCpuUsageSeconds(joined);
    if (Se === void 0) return;
    let cpuUsage = process.cpuUsage();
    return {
      groupMs: Se,
      cliMs: (cpuUsage.user + cpuUsage.system) / 1000,
      wallMs: r.monotonicNow(),
      shellMs: S === void 0 ? void 0 : readCpuUsageSeconds(S),
    };
  }
  let w = R();
  if (w === void 0) return;
  takeNoWindowUsage(w.shellMs, w.wallMs);
  let P = refineIdleState(e.getState(), n),
    L = 0,
    q = {},
    x = Jp(P) ? r.monotonicNow() : void 0,
    G = 0,
    Z;
  function re() {
    let Se = R(),
      me = takeNoWindowUsage(Se?.shellMs, Se?.wallMs ?? r.monotonicNow());
    if (Se !== void 0 && w !== void 0) {
      let Me = Se.cliMs - w.cliMs,
        Ee = [
          [`${P}_wall_ms`, Se.wallMs - w.wallMs],
          [`${P}_cli_cpu_ms`, Me],
          [`${P}_tools_cpu_ms`, Math.max(0, Se.groupMs - w.groupMs - Me)],
        ];
      if (Se.shellMs !== void 0 && w.shellMs !== void 0) {
        let max = Math.max(0, Se.shellMs - w.shellMs);
        if ((Ee.push([`${P}_shell_cpu_ms`, max]), P === "running" || P === "idle_background"))
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
    (logEvent("tengu_tool_cpu_by_phase", {
      trigger: fromEnum(Se),
      sequence: L,
      bg_tasks_report_running: reportsRunningBackgroundTasks(),
      ...(x !== void 0 && { waited_ms: Math.round(r.monotonicNow() - x) }),
      ...xr(q, Math.round),
    }),
      L++,
      (q = {}));
  }
  function Ue() {
    (Z?.(), (Z = void 0));
  }
  function ce() {
    if (P !== "idle_background" || x === void 0) return;
    let Se = r.monotonicNow() - x,
      me = Math.max(Se, G) / cx,
      Me = (jG.find((Ee) => Ee > me) ?? (Math.floor(me / 60) + 1) * 60) * cx;
    Z = r.setTimeout(
      () => {
        Z = void 0;
        try {
          if ((re(), e.getState() !== "idle")) return;
          ((P = refineIdleState("idle", n)), (G = Me), Ae("idle_timer"), ce());
        } catch (error) {
          logForDebugging(
            `tengu_tool_cpu_by_phase: could not send a timed event during an idle wait; no more timed events until the session state changes: ${errorMessage(error)}`,
            { level: "error" },
          );
        }
      },
      Me - Se,
      { unref: !0 },
    );
  }
  (mx?.(), setCpuacctDir(y));
  let subscribe = e.stateChanged.subscribe((Se) => {
      Ue();
      try {
        re();
        let me = Jp(P);
        if (((P = refineIdleState(Se, n)), me && !Jp(P)))
          try {
            Ae("idle_end");
          } finally {
            x = void 0;
          }
        else if (!me && Jp(P)) ((x = r.monotonicNow()), (G = 0));
        ce();
      } catch (error) {
        logForDebugging(
          `tengu_tool_cpu_by_phase: could not record a session state change; telemetry continues from the next one: ${errorMessage(error)}`,
          { level: "error" },
        );
      }
    }),
    ie = registerCleanup(() => {
      (Ue(), re(), Ae("exit"));
    });
  (ce(),
    (mx = () => {
      (Ue(), subscribe(), ie(), setCpuacctDir(void 0));
    }));
}
//@ chunk-tyg7f3ek.js:613764-613820 placement
function Jp(e) {
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
