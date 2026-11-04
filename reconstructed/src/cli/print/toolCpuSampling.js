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
import { import_mapValues } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { registerCleanup } from "../../utils/cleanupRegistry.js";

//@ chunk-tyg7f3ek.js:606037-606378 placement
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
//@ chunk-tyg7f3ek.js:606378-606472 placement
function cpuMarkPayload(wait, at, fromMin) {
  return {
    at,
    from_min: Math.min(fromMin, wait.marksMin.at(-1) ?? 0),
    session_family: sessionSurfaceKind(),
  };
}
//@ chunk-tyg7f3ek.js:606472-606569 placement
function reportCpuMarkGaveUp(wait, reason, fromMin, outcome) {
  logFeatureSad("ccr_idle_cpu_mark", outcome);
  logForDiagnosticsNoPII("warn", "idle_cpu_mark", {
    ...cpuMarkPayload(wait, reason, fromMin),
    gave_up: outcome,
  });
}
//@ chunk-tyg7f3ek.js:606569-606942 placement
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
//@ chunk-tyg7f3ek.js:606942-610623 placement
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
          processTree.filter((pid) => !seen.then.has(pid) && !isSameProcess(previous, sample, pid)),
        ) * CLOCK_TICKS_MS;
      let winner = await Promise.race([usage, undefined]);
      let winnerCpuMs = (winner?.cpu?.userMs ?? 0) + (winner?.cpu?.systemMs ?? 0);
      deltas.push({
        byResultAndProc: cpuMs + Math.max(0, winnerCpuMs - treeTicks),
        byWholeTree: processTree.some((pid) => isSameProcess(previous, sample, pid) && !seen.now.has(pid))
          ? 0
          : winnerCpuMs + (winner?.procCpuMs ?? 0) - sumProcessTicks(previous, processTree) * CLOCK_TICKS_MS,
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
    let sawEnded = false;
    for (let { pid } of sliced) {
      if (
        state.timedOut ||
        seen.now.has(pid) ||
        !isClaudeCodeAgentEnviron(await state.proc.startOfFile(`${pid}/environ`))
      )
        continue;
      let session = sample.processes.get(pid)?.session ?? 0;
      let agentDiff = diffProcessTreeCpu(
        previous,
        sample,
        session > 1 &&
          !sample.processes.has(session) &&
          session !== sample.processes.get(process.pid)?.session
          ? session
          : pid,
        seen,
      );
      let isListening = (await checksListeningSockets(state.proc, agentDiff.tree, socketState)) !== "no";
      cpuMs[isListening ? "leftListen" : "left"] += agentDiff.cpuMs;
      if (!isListening) quietTree.push(...agentDiff.tree);
      sawEnded ||= agentDiff.tree.some((pid) => !isSameProcess(previous, sample, pid));
    }
    for (let { byResultAndProc, byWholeTree } of deltas)
      cpuMs.ended += sawEnded ? byResultAndProc : Math.max(byResultAndProc, byWholeTree);
    if (state.timedOut) return;
    if (last === undefined) {
      wait.last = sample;
      return;
    }
    let shells = [...sample.shells, ...filtered];
    let serveCount = count(shells, (shell) => shell.kind === "serve_or_watch");
    let waitCount = count(shells, (shell) => shell.kind === "wait");
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
        count(shells, (shell) => shell.listens === true) === sample.runningShellIds.size + filtered.length,
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
        count(
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
//@ chunk-tyg7f3ek.js:610623-611078 placement
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
//@ chunk-tyg7f3ek.js:611498-611537 placement
var CGROUP_SAMPLE_MINUTES = [5, 10, 15, 30, 60, 120];
var MINUTE_MS_2 = 60000;
var cancelCgroupSample;
//@ chunk-tyg7f3ek.js:611537-611589 placement
function cpuacctPathFromCgroup(mountInfo) {
  let cpuacctPath = getCpuacctPath(mountInfo);
  return cpuacctPath === "/" ? undefined : cpuacctPath;
}
//@ chunk-tyg7f3ek.js:611589-613764 placement
/**
 * CCR 容器内读 cgroup cpuacct.usage，按阶段（等待/工具/空闲）统计 CPU 并上报 tengu_tool_cpu_by_phase。
 */
function startCgroupCpuSampling(sessionState, getState, clock) {
  if (!env.CLAUDE_CODE_REMOTE || isDiskless()) return;
  let relativePath;
  try {
    relativePath = cpuacctPathFromCgroup(readFileSync("/proc/self/cgroup", "utf8"));
  } catch {
    return;
  }
  if (relativePath === undefined) return;
  let joined = posix.join(CPUACCT_ROOT, relativePath, "cpuacct.usage");
  let cpuacctGroup = ensureCpuacctGroup(relativePath);
  let groupPath = cpuacctGroup === undefined ? undefined : posix.join(cpuacctGroup, "cpuacct.usage");
  function read() {
    let cpuUsageSeconds = readCpuUsageSeconds(joined);
    if (cpuUsageSeconds === undefined) return;
    let usage = process.cpuUsage();
    return {
      groupMs: cpuUsageSeconds,
      cliMs: (usage.user + usage.system) / 1000,
      wallMs: clock.monotonicNow(),
      shellMs: groupPath === undefined ? undefined : readCpuUsageSeconds(groupPath),
    };
  }
  let previous = read();
  if (previous === undefined) return;
  takeNoWindowUsage(previous.shellMs, previous.wallMs);
  let phase = refineIdleState(sessionState.getState(), getState);
  let sequence = 0;
  let totals = {};
  let idleSince = isIdleCpuState(phase) ? clock.monotonicNow() : undefined;
  let lastDelayMs = 0;
  let idleTimer;
  function sample() {
    let current = read();
    let noWindow = takeNoWindowUsage(current?.shellMs, current?.wallMs ?? clock.monotonicNow());
    if (current !== undefined && previous !== undefined) {
      let cliDelta = current.cliMs - previous.cliMs;
      let pairs = [
        [`${phase}_wall_ms`, current.wallMs - previous.wallMs],
        [`${phase}_cli_cpu_ms`, cliDelta],
        [`${phase}_tools_cpu_ms`, Math.max(0, current.groupMs - previous.groupMs - cliDelta)],
      ];
      if (current.shellMs !== undefined && previous.shellMs !== undefined) {
        let max = Math.max(0, current.shellMs - previous.shellMs);
        pairs.push([`${phase}_shell_cpu_ms`, max]);
        if (phase === "running" || phase === "idle_background")
          pairs.push(
            [`${phase}_no_command_cpu_ms`, Math.min(noWindow.cpuMs, max)],
            [`${phase}_no_command_wall_ms`, noWindow.wallMs],
          );
      }
      for (let [key, value] of pairs) totals[key] = (totals[key] ?? 0) + value;
    }
    previous = current;
  }
  function emit(trigger) {
    logEvent("tengu_tool_cpu_by_phase", {
      trigger: fromEnum(trigger),
      sequence,
      bg_tasks_report_running: reportsRunningBackgroundTasks(),
      ...(idleSince !== undefined && {
        waited_ms: Math.round(clock.monotonicNow() - idleSince),
      }),
      ...import_mapValues(totals, Math.round),
    });
    sequence++;
    totals = {};
  }
  function stopIdleTimer() {
    idleTimer?.();
    idleTimer = undefined;
  }
  function onIdleTimer() {
    if (phase !== "idle_background" || idleSince === undefined) return;
    let waitedMs = clock.monotonicNow() - idleSince;
    let waitedMin = Math.max(waitedMs, lastDelayMs) / MINUTE_MS_2;
    let delayMs =
      (CGROUP_SAMPLE_MINUTES.find((step) => step > waitedMin) ?? (Math.floor(waitedMin / 60) + 1) * 60) *
      MINUTE_MS_2;
    idleTimer = clock.setTimeout(
      () => {
        idleTimer = undefined;
        try {
          sample();
          if (sessionState.getState() !== "idle") return;
          phase = refineIdleState("idle", getState);
          lastDelayMs = delayMs;
          emit("idle_timer");
          onIdleTimer();
        } catch (error) {
          logForDebugging(
            `tengu_tool_cpu_by_phase: could not send a timed event during an idle wait; no more timed events until the session state changes: ${errorMessage(error)}`,
            {
              level: "error",
            },
          );
        }
      },
      delayMs - waitedMs,
      {
        unref: true,
      },
    );
  }
  cancelCgroupSample?.();
  setCpuacctDir(cpuacctGroup);
  let unsubscribe = sessionState.stateChanged.subscribe((state) => {
    stopIdleTimer();
    try {
      sample();
      let wasIdle = isIdleCpuState(phase);
      phase = refineIdleState(state, getState);
      if (wasIdle && !isIdleCpuState(phase))
        try {
          emit("idle_end");
        } finally {
          idleSince = undefined;
        }
      else if (!wasIdle && isIdleCpuState(phase)) {
        idleSince = clock.monotonicNow();
        lastDelayMs = 0;
      }
      onIdleTimer();
    } catch (error) {
      logForDebugging(
        `tengu_tool_cpu_by_phase: could not record a session state change; telemetry continues from the next one: ${errorMessage(error)}`,
        {
          level: "error",
        },
      );
    }
  });
  let cleanup = registerCleanup(() => {
    stopIdleTimer();
    sample();
    emit("exit");
  });
  onIdleTimer();
  cancelCgroupSample = () => {
    stopIdleTimer();
    unsubscribe();
    cleanup();
    setCpuacctDir(undefined);
  };
}
//@ chunk-tyg7f3ek.js:613764-613820 placement
function isIdleCpuState(state) {
  return state === "idle" || state === "idle_background";
}
//@ chunk-tyg7f3ek.js:613820-613969 placement
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
export { startCgroupCpuSampling, startToolCpuSampling };
