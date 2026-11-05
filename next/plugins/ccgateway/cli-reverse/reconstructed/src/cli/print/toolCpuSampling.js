/**
 * cli/print/toolCpuSampling.ts
 *
 * 2.1.316 新增：工具执行期间的 CPU 采样（cgroup 与标记）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-0yw3taqg.js (19)
 * attribution: placement 11, layout 8
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
import { countWhere } from "../../utils/collections.js";
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
  setCpuacctDir,
  readCpuUsageSeconds,
} from "../../utils/shell/cpuReport.js";
import { takeNoWindowUsage } from "../../utils/shell/processCpuTime.js";
import { registerCleanup } from "../../utils/cleanupRegistry.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { reportsRunningBackgroundTasks } from "./backgroundWindDown.js";
import { import_mapValues } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { logForDebugging } from "../../utils/debug.js";

//@ chunk-0yw3taqg.js:647331-647672 placement
function nextCpuMark(state, wait) {
  let elapsedMs = state.clock.monotonicNow() - wait.startMs;
  let max = Math.max(elapsedMs / MINUTE_MS, wait.lastMarkMin);
  let lastMarkMin = wait.marksMin.at(-1) ?? 0;
  let nextMarkMin =
    wait.marksMin.find((mark) => mark > max) ??
    (wait.thenEveryMin === undefined
      ? undefined
      : lastMarkMin + (Math.floor((max - lastMarkMin) / wait.thenEveryMin) + 1) * wait.thenEveryMin);
  if (nextMarkMin === undefined) return;
  wait.cancelMark = state.clock.setTimeout(
    () => {
      wait.cancelMark = undefined;
      recordCpuMark(state, wait, "mark", nextMarkMin);
    },
    nextMarkMin * MINUTE_MS - elapsedMs,
    {
      unref: true,
    },
  );
}
//@ chunk-0yw3taqg.js:647672-647767 placement
function cpuMarkPayload(wait, at, fromMin) {
  return {
    at,
    from_min: Math.min(fromMin, wait.marksMin.at(-1) ?? 0),
    session_family: sessionSurfaceKind(),
  };
}
//@ chunk-0yw3taqg.js:647767-647864 placement
function reportCpuMarkGaveUp(wait, reason, fromMin, outcome) {
  logFeatureSad("ccr_idle_cpu_mark", outcome);
  logForDiagnosticsNoPII("warn", "idle_cpu_mark", {
    ...cpuMarkPayload(wait, reason, fromMin),
    gave_up: outcome,
  });
}
//@ chunk-0yw3taqg.js:647864-648237 placement
function recordCpuMark(state, wait, reason, fromMin) {
  state.settled = state.settled
    .then(async () => {
      if (state.timedOut) return;
      let deferred = Promise.withResolvers();
      let timeoutTimer = state.clock.setTimeout(
        () => {
          state.timedOut = true;
          deferred.resolve();
          try {
            state.wait?.cancelMark?.();
            state.wait = undefined;
            reportCpuMarkGaveUp(wait, reason, wait.last?.markMin ?? fromMin, "timed_out");
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
        await Promise.race([sampleToolCpuMark(state, wait, reason, fromMin), deferred.promise]);
      } finally {
        timeoutTimer();
      }
    })
    .catch(logError);
}
//@ chunk-0yw3taqg.js:648237-652202 placement
async function sampleToolCpuMark(state, wait, reason, markMin) {
  try {
    let last = wait.last;
    if (reason === "mark" ? state.wait !== wait : last === undefined) return;
    if (
      reason === "mark" &&
      (state.sessionState.getState() !== "idle" || readToolCpuSamplingConfig() === undefined)
    ) {
      state.wait = undefined;
      return;
    }
    wait.lastMarkMin = markMin;
    let sample = await sampleShellCpuTree(state, last, markMin);
    if (state.timedOut) return;
    if (typeof sample === "string") {
      wait.last = undefined;
      reportCpuMarkGaveUp(wait, reason, last?.markMin ?? markMin, sample);
      return;
    }
    let previous = last ?? sample;
    let spanMs = sample.atMs - previous.atMs;
    let socketState = {
      listeningSockets: await listListeningSockets(state.proc),
      linksLeft: MAX_DESCRIPTOR_LINKS,
    };
    let seen = {
      now: new Set(),
      then: new Set(),
    };
    let quietTree = [];
    let cpuMs = {
      grewListen: 0,
      grew: 0,
      quietListen: 0,
      quiet: 0,
      leftListen: 0,
      left: 0,
      ended: 0,
    };
    let shellsGrew = 0;
    for (let shell of sample.shells) {
      let proc = shell.pid === undefined ? undefined : sample.processes.get(shell.pid);
      if (shell.pid === undefined || proc?.ppid !== process.pid || proc.starttime !== shell.starttime)
        continue;
      let shellDiff = diffProcessTreeCpu(previous, sample, shell.pid, seen);
      let listens = await checksListeningSockets(state.proc, shellDiff.tree, socketState);
      shell.listens = listens === "yes";
      let isListening = listens !== "no";
      let found = previous.shells.find((shell_2) => shell_2.id === shell.id);
      let grew =
        (shell.outputBytes ?? -2) !==
        (found === undefined
          ? isSameProcess(previous, sample, shell.pid)
            ? -1
            : 0
          : (found.outputBytes ?? -1));
      shellsGrew += grew ? 1 : 0;
      cpuMs[grew ? (isListening ? "grewListen" : "grew") : isListening ? "quietListen" : "quiet"] +=
        shellDiff.cpuMs;
      if (!grew && !isListening) quietTree.push(...shellDiff.tree);
    }
    let filtered = previous.shells.filter((shell) => !sample.runningShellIds.has(shell.id));
    let deltas = [];
    for (let { pid, starttime, usage } of filtered) {
      let proc = pid === undefined ? undefined : previous.processes.get(pid);
      if (pid === undefined || proc?.ppid !== process.pid || proc.starttime !== starttime) continue;
      let processTree = collectProcessTree(previous, processLeaders(previous, pid), new Set());
      let cpuMs =
        sample.processes.has(pid) && !isSameProcess(previous, sample, pid)
          ? 0
          : diffProcessTreeCpu(previous, sample, pid, seen).cpuMs;
      let treeTicks =
        sumProcessTicks(
          previous,
          collectProcessTree(previous, [pid], new Set()).filter(
            (pid) => !seen.then.has(pid) && !isSameProcess(previous, sample, pid),
          ),
        ) * CLOCK_TICKS_MS;
      let winner = await Promise.race([usage, undefined]);
      let winnerCpuMs = (winner?.cpu?.userMs ?? 0) + (winner?.cpu?.systemMs ?? 0);
      deltas.push({
        byResultAndProc: cpuMs + Math.max(0, winnerCpuMs - treeTicks),
        byWholeTree: processTree.some((pid) => isSameProcess(previous, sample, pid) && !seen.now.has(pid))
          ? 0
          : winnerCpuMs + (winner?.procCpuMs ?? 0) - sumProcessTicks(previous, processTree) * CLOCK_TICKS_MS,
        untakenThen: processTree.filter((pid) => !seen.then.has(pid)),
      });
    }
    collectProcessTree(sample, processLeaders(sample, process.pid), seen.now);
    let sliced = [...sample.processes.keys()]
      .filter((key) => key > 1 && !seen.now.has(key))
      .map((key) => ({
        pid: key,
        ticks:
          sumProcessTicks(sample, [key]) -
          (isSameProcess(previous, sample, key) ? sumProcessTicks(previous, [key]) : 0),
      }))
      .filter(({ ticks }) => ticks * CLOCK_TICKS_MS > spanMs * CPU_NOISE_RATIO)
      .sort((a, b) => b.ticks - a.ticks)
      .slice(0, MAX_CPU_PROCESSES);
    let pid = [];
    for (let { pid: pid_2 } of sliced) {
      if (
        state.timedOut ||
        seen.now.has(pid_2) ||
        !isClaudeCodeAgentEnviron(await state.proc.startOfFile(`${pid_2}/environ`))
      )
        continue;
      let session = sample.processes.get(pid_2)?.session ?? 0;
      let agentDiff = diffProcessTreeCpu(
        previous,
        sample,
        session > 1 &&
          !sample.processes.has(session) &&
          session !== sample.processes.get(process.pid)?.session
          ? session
          : pid_2,
        seen,
      );
      let isListening = (await checksListeningSockets(state.proc, agentDiff.tree, socketState)) !== "no";
      cpuMs[isListening ? "leftListen" : "left"] += agentDiff.cpuMs;
      if (!isListening) quietTree.push(...agentDiff.tree);
      pid.push(...agentDiff.tree);
    }
    let pids = new Set();
    collectProcessTree(
      sample,
      pid.filter((seen) => isSameProcess(previous, sample, seen)),
      pids,
      (pid) =>
        !isSameProcess(previous, sample, pid) &&
        sample.processes.get(pid)?.session !==
          sample.processes.get(sample.processes.get(pid)?.ppid ?? 0)?.session,
    );
    let any = pid.some((pid) => !pids.has(pid));
    for (let { byResultAndProc, byWholeTree, untakenThen } of deltas)
      cpuMs.ended +=
        any || untakenThen.some((pid) => seen.then.has(pid))
          ? byResultAndProc
          : Math.max(byResultAndProc, byWholeTree);
    if (state.timedOut) return;
    if (last === undefined) {
      wait.last = sample;
      return;
    }
    let shells = [...sample.shells, ...filtered];
    let serveCount = countWhere(shells, (shell) => shell.kind === "serve_or_watch");
    let waitCount = countWhere(shells, (shell) => shell.kind === "wait");
    let vmCpuMs = Math.max(0, sample.vmBusyTicks - previous.vmBusyTicks) * CLOCK_TICKS_MS;
    if (!state.hasReportedOk) {
      state.hasReportedOk = true;
      logFeatureOk("ccr_idle_cpu_mark");
    }
    logForDiagnosticsNoPII("warn", "idle_cpu_mark", {
      ...cpuMarkPayload(wait, reason, previous.markMin),
      span_s: Math.round(spanMs / 1000),
      vm_cpu_ms: vmCpuMs,
      vm_cpu_band:
        vmCpuMs <= spanMs * 0.05
          ? "le_0_05"
          : vmCpuMs <= spanMs * 0.25
            ? "le_0_25"
            : vmCpuMs <= spanMs
              ? "le_1"
              : "gt_1",
      shells: sample.runningShellIds.size,
      shells_grew: shellsGrew,
      all_shells_listen:
        shells.length > 0 &&
        countWhere(shells, (shell) => shell.listens === true) ===
          sample.runningShellIds.size + filtered.length,
      shell_kinds:
        shells.length === 0
          ? "none"
          : serveCount === shells.length
            ? "serve_or_watch"
            : waitCount === shells.length
              ? "wait"
              : serveCount + waitCount > 0
                ? "mixed"
                : "other",
      shells_ended: filtered.length,
      other_tasks_running: getRunningTasks(state.getState()).some(
        (task) =>
          !isLocalShellTask(task) &&
          waitForTaskCompletion(task) &&
          task.type !== "remote_agent" &&
          !skipsTranscript(task) &&
          !isParkedMcpTask(task) &&
          !isIdleTeammateTask(task),
      ),
      shells_grew_listen_cpu_ms: cpuMs.grewListen,
      shells_grew_cpu_ms: cpuMs.grew,
      shells_quiet_listen_cpu_ms: cpuMs.quietListen,
      shells_quiet_cpu_ms: cpuMs.quiet,
      shells_ended_cpu_ms: Math.round(cpuMs.ended),
      left_running_listen_cpu_ms: cpuMs.leftListen,
      left_running_cpu_ms: cpuMs.left,
      full_core_processes: Math.min(
        MAX_FULL_CORE_PROCESSES,
        countWhere(
          quietTree,
          (pid) =>
            isSameProcess(previous, sample, pid) &&
            ((sample.processes.get(pid)?.ownTicks ?? 0) - (previous.processes.get(pid)?.ownTicks ?? 0)) *
              CLOCK_TICKS_MS >=
              spanMs * FULL_CORE_CPU_RATIO,
        ),
      ),
      ...(sample.shellCgroupCpuMs !== undefined &&
        previous.shellCgroupCpuMs !== undefined && {
          shell_cgroup_cpu_ms: Math.max(0, Math.round(sample.shellCgroupCpuMs - previous.shellCgroupCpuMs)),
        }),
    });
    wait.last = sample;
  } catch (error) {
    logFeatureBad("ccr_idle_cpu_mark", "threw");
    logError(error);
  } finally {
    if (reason === "mark" && state.wait === wait) nextCpuMark(state, wait);
  }
}
//@ chunk-0yw3taqg.js:652202-652657 placement
function endToolCpuWait(state, nextState) {
  let wait = state.wait;
  if (state.timedOut || (nextState === "idle" && wait !== undefined)) return;
  wait?.cancelMark?.();
  state.wait = undefined;
  try {
    if (wait !== undefined) recordCpuMark(state, wait, "end", wait.lastMarkMin);
    if (nextState !== "idle") return;
    let toolCpuSamplingConfig = readToolCpuSamplingConfig();
    if (toolCpuSamplingConfig === undefined) return;
    state.wait = {
      marksMin: toolCpuSamplingConfig.marksMin,
      thenEveryMin: toolCpuSamplingConfig.thenEveryMin,
      startMs: state.clock.monotonicNow(),
      lastMarkMin: 0,
      last: undefined,
      cancelMark: undefined,
    };
    if (toolCpuSamplingConfig.fromStart && runningLocalShells(state).length > 0)
      recordCpuMark(state, state.wait, "mark", 0);
    else nextCpuMark(state, state.wait);
  } catch (error) {
    logFeatureBad("ccr_idle_cpu_mark", "threw");
    logError(error);
  }
}
//@ chunk-0yw3taqg.js:652657-653012 placement
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
    let state = {
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
    sessionState.stateChanged.subscribe((nextState) => endToolCpuWait(state, nextState));
    endToolCpuWait(state, sessionState.getState());
    return state;
  } catch (error) {
    logFeatureBad("ccr_idle_cpu_mark", "threw");
    logError(error);
    return;
  }
}
//@ chunk-0yw3taqg.js:653077-653116 placement
var CGROUP_SAMPLE_MINUTES = [5, 10, 15, 30, 60, 120];
var MINUTE_MS_2 = 60000;
var cancelCgroupSample;
//@ chunk-0yw3taqg.js:653116-653168 placement
function cpuacctPathFromCgroup(mountInfo) {
  let cpuacctPath = getCpuacctPath(mountInfo);
  return cpuacctPath === "/" ? undefined : cpuacctPath;
}
//@ chunk-0yw3taqg.js:653168-653806 layout
function startCpuSampling(sessionState, getState, clock) {
  if (!env.CLAUDE_CODE_REMOTE || isDiskless()) return;
  let groupPath;
  try {
    groupPath = cpuacctPathFromCgroup(readFileSync("/proc/self/cgroup", "utf8"));
  } catch {
    return;
  }
  if (groupPath === undefined) return;
  let file = posix.join(CPUACCT_ROOT, groupPath, "cpuacct.usage");
  let cpuacctGroup = ensureCpuacctGroup(groupPath);
  let shellFile = cpuacctGroup === undefined ? undefined : posix.join(cpuacctGroup, "cpuacct.usage");
  let firstSample = readCpuSample({
    file,
    shellFile,
    clock,
  });
  if (firstSample === undefined) return;
  takeNoWindowUsage(firstSample.shellMs, firstSample.wallMs);
  let phase = refineIdleState(sessionState.getState(), getState);
  let tracker = {
    sessionState,
    getState,
    clock,
    file,
    shellFile,
    last: firstSample,
    phase,
    sequence: 0,
    totals: {},
    waitStartMs: isIdleCpuState(phase) ? clock.monotonicNow() : undefined,
    lastMarkMs: 0,
    cancelMark: undefined,
  };
  cancelCgroupSample?.();
  setCpuacctDir(cpuacctGroup);
  let unsubscribe = sessionState.stateChanged.subscribe((nextPhase) => onCpuPhaseChange(tracker, nextPhase));
  let cleanup = registerCleanup(() => {
    clearCpuMark(tracker);
    recordCpuDelta(tracker);
    flushCpuTotals(tracker, "exit");
  });
  armIdleCpuMark(tracker);
  cancelCgroupSample = () => {
    clearCpuMark(tracker);
    unsubscribe();
    cleanup();
    setCpuacctDir(undefined);
  };
}
//@ chunk-0yw3taqg.js:653806-654011 layout
function readCpuSample({ file, shellFile, clock }) {
  let cpuUsageSeconds = readCpuUsageSeconds(file);
  if (cpuUsageSeconds === undefined) return;
  let usage = process.cpuUsage();
  return {
    groupMs: cpuUsageSeconds,
    cliMs: (usage.user + usage.system) / 1000,
    wallMs: clock.monotonicNow(),
    shellMs: shellFile === undefined ? undefined : readCpuUsageSeconds(shellFile),
  };
}
//@ chunk-0yw3taqg.js:654011-654587 layout
function recordCpuDelta(tracker) {
  let { phase, last, totals } = tracker;
  let sample = readCpuSample(tracker);
  let noWindowUsage = takeNoWindowUsage(sample?.shellMs, sample?.wallMs ?? tracker.clock.monotonicNow());
  if (sample !== undefined && last !== undefined) {
    let wallDeltaMs = sample.wallMs - last.wallMs;
    let cliCpuDeltaMs = sample.cliMs - last.cliMs;
    let phaseSamples = [
      [`${phase}_wall_ms`, wallDeltaMs],
      [`${phase}_cli_cpu_ms`, cliCpuDeltaMs],
      [`${phase}_tools_cpu_ms`, Math.max(0, sample.groupMs - last.groupMs - cliCpuDeltaMs)],
    ];
    if (sample.shellMs !== undefined && last.shellMs !== undefined) {
      let max = Math.max(0, sample.shellMs - last.shellMs);
      phaseSamples.push([`${phase}_shell_cpu_ms`, max]);
      if (phase === "running" || phase === "idle_background")
        phaseSamples.push(
          [`${phase}_no_command_cpu_ms`, Math.min(noWindowUsage.cpuMs, max)],
          [`${phase}_no_command_wall_ms`, Math.min(noWindowUsage.wallMs, wallDeltaMs)],
        );
    }
    for (let [metric, value] of phaseSamples) totals[metric] = (totals[metric] ?? 0) + value;
  }
  tracker.last = sample;
}
//@ chunk-0yw3taqg.js:654587-654837 layout
function flushCpuTotals(tracker, trigger) {
  logEvent("tengu_tool_cpu_by_phase", {
    trigger: fromEnum(trigger),
    sequence: tracker.sequence,
    bg_tasks_report_running: reportsRunningBackgroundTasks(),
    ...(tracker.waitStartMs !== undefined && {
      waited_ms: Math.round(tracker.clock.monotonicNow() - tracker.waitStartMs),
    }),
    ...import_mapValues(tracker.totals, Math.round),
  });
  tracker.sequence++;
  tracker.totals = {};
}
//@ chunk-0yw3taqg.js:654837-655204 layout
function onCpuPhaseChange(tracker, state) {
  clearCpuMark(tracker);
  try {
    recordCpuDelta(tracker);
    let wasIdle = isIdleCpuState(tracker.phase);
    tracker.phase = refineIdleState(state, tracker.getState);
    if (wasIdle && !isIdleCpuState(tracker.phase))
      try {
        flushCpuTotals(tracker, "idle_end");
      } finally {
        tracker.waitStartMs = undefined;
      }
    else if (!wasIdle && isIdleCpuState(tracker.phase)) {
      tracker.waitStartMs = tracker.clock.monotonicNow();
      tracker.lastMarkMs = 0;
    }
    armIdleCpuMark(tracker);
  } catch (error) {
    logError(error);
    logForDebugging(
      "tengu_tool_cpu_by_phase: could not record a session state change; telemetry continues from the next one",
      {
        level: "error",
      },
    );
  }
}
//@ chunk-0yw3taqg.js:655204-655256 layout
function clearCpuMark(tracker) {
  tracker.cancelMark?.();
  tracker.cancelMark = undefined;
}
//@ chunk-0yw3taqg.js:655256-655516 layout
function armIdleCpuMark(tracker) {
  if (tracker.phase !== "idle_background" || tracker.waitStartMs === undefined) return;
  let waitedMs = tracker.clock.monotonicNow() - tracker.waitStartMs;
  let waitedMinutes = Math.max(waitedMs, tracker.lastMarkMs) / MINUTE_MS_2;
  let lastMarkMs =
    (CGROUP_SAMPLE_MINUTES.find((bucketMinutes) => bucketMinutes > waitedMinutes) ??
      (Math.floor(waitedMinutes / 60) + 1) * 60) * MINUTE_MS_2;
  tracker.cancelMark = tracker.clock.setTimeout(
    () => onIdleCpuMarkTimer(tracker, lastMarkMs),
    lastMarkMs - waitedMs,
    {
      unref: true,
    },
  );
}
//@ chunk-0yw3taqg.js:655516-655842 layout
function onIdleCpuMarkTimer(tracker, lastMarkMs) {
  tracker.cancelMark = undefined;
  try {
    recordCpuDelta(tracker);
    if (tracker.sessionState.getState() !== "idle") return;
    tracker.phase = refineIdleState("idle", tracker.getState);
    tracker.lastMarkMs = lastMarkMs;
    flushCpuTotals(tracker, "idle_timer");
    armIdleCpuMark(tracker);
  } catch (error) {
    logError(error);
    logForDebugging(
      "tengu_tool_cpu_by_phase: could not send a timed event during an idle wait; no more timed events until the session state changes",
      {
        level: "error",
      },
    );
  }
}
//@ chunk-0yw3taqg.js:655842-655898 placement
function isIdleCpuState(state) {
  return state === "idle" || state === "idle_background";
}
//@ chunk-0yw3taqg.js:655898-656047 placement
function refineIdleState(state, getState) {
  if (state !== "idle") return state;
  return getRunningTasks(getState()).some(
    (task) =>
      waitForTaskCompletion(task) &&
      task.type !== "remote_agent" &&
      !skipsTranscript(task) &&
      !isParkedMcpTask(task) &&
      !isIdleTeammateTask(task),
  )
    ? "idle_background"
    : "idle";
}
export { startCpuSampling, startToolCpuSampling };
