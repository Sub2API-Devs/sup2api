/**
 * tasks/LocalShellTask/memoryPressure.ts
 *
 * 2.1.316 新增：内存压力下终止后台 shell 任务的判定（读 /proc/meminfo）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (4)
 * attribution: placement 4
 */
import { readFileSync } from "fs";
import { getPlatform } from "../../utils/platform.js";
import { getErrnoCode } from "../../utils/errors.js";
import { MEMORY_SCARCE_RATIO, MEMORY_SCARCE_GB } from "../../tools/BashTool/commandSemantics.js";
import { addAgentKeepaliveReason } from "../taskKinds.js";
import { getBackgroundTimeoutNote } from "../../tools/BashTool/prompt.js";
import { isLocalShellTask } from "./guards.js";
import {
  recordBackgroundLimitRestart,
  trackWorkAfterStop,
  recordLimitStop,
  startHeavyStopWatch,
} from "./limitStopTelemetry.js";
import { getTaskRunState } from "../../utils/task/taskNotifications.js";
import {
  stopAtBackgroundDeadline,
  stopShellTaskWithNotice,
  releaseShellKeepalive,
} from "./LocalShellTask.js";
import {
  getIsNonInteractiveSession,
  getLastInteractionTime,
  getMainLoopBusy,
} from "../../bootstrap/state.js";
import { watchQuietShell } from "./shellCheckin.js";
import { getProcessQueue } from "../../utils/messageQueueManager.js";
import { env } from "../../utils/env.js";
import { hasActiveAgentTasks } from "../taskStatus.js";
import { logForDebugging } from "../../utils/debug.js";
import { logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { logError } from "../../utils/log.js";
import { fromEnumOpt } from "../../services/analytics/safeMetadata.js";
import { buildCommandTimingFields, thenIfPromise } from "../../tools/BashTool/bashTelemetry.js";
import { parentTaskId } from "./backgroundNotices.js";
import { logEvent } from "../../services/analytics/index.js";

//@ chunk-5xgkngpb.js:4859699-4860267 placement
/**
 * 读取 /proc/meminfo 判断内存压力（WSL 下采用内核结论）。
 */
function readKernelMemoryPressure() {
  let platform = getPlatform();
  if (platform !== "linux" && platform !== "wsl")
    return {
      scarce: true,
      detail: `${platform}: kernel verdict taken as is`,
    };
  let meminfo;
  try {
    meminfo = readFileSync("/proc/meminfo", "utf8");
  } catch (error) {
    return {
      scarce: false,
      detail: `/proc/meminfo unreadable (${getErrnoCode(error) ?? "unknown error"})`,
    };
  }
  let totalKb = Number(/^MemTotal:\s+(\d+) kB$/m.exec(meminfo)?.[1]);
  let availableKb = Number(/^MemAvailable:\s+(\d+) kB$/m.exec(meminfo)?.[1]);
  if (!(totalKb > 0) || Number.isNaN(availableKb))
    return {
      scarce: false,
      detail: "/proc/meminfo unparseable",
    };
  return {
    scarce: availableKb / totalKb < MEMORY_SCARCE_RATIO && availableKb < MEMORY_SCARCE_GB * 1024 * 1024,
    detail: `MemAvailable ${availableKb} kB of ${totalKb} kB; scarce is under ${Math.round(MEMORY_SCARCE_RATIO * 100)}% and under ${MEMORY_SCARCE_GB} GiB`,
  };
}
//@ chunk-5xgkngpb.js:4860267-4860295 placement
/**
 * 内存压力下判定 shell 空闲的最短时间与最多终止数、重查间隔。
 */
var MEMORY_PRESSURE_RECHECK_MS = 60000;
var MEMORY_PRESSURE_MIN_SILENT_MS = 1e4;
var MEMORY_PRESSURE_MAX_KILLS = 4;
//@ chunk-5xgkngpb.js:4864794-4864901 placement
/**
 * 有代理在跑时保留 shell 的时长、判定活跃窗口与最大年龄。
 */
var AGENT_IDLE_KILL_MS = 1800000;
var AGENT_ACTIVE_WINDOW_MS = 600000;
var MEMORY_PRESSURE_KILL_MAX_AGE_MS = 1800000;
var DEADLINE_STOP_SLACK_MS = 30000;
var NO_NOTE_TEXT = "the note at the end took too long, so there is none";
//@ chunk-5xgkngpb.js:4867697-4870298 placement
/**
 * 判断内存压力下是否终止某个后台 shell（压力等级、最近是否活跃、是否有代理在跑）。
 */
function shouldKillShellForMemoryPressure(
  taskId,
  description,
  taskRegistry,
  toolUseId,
  kind,
  ownerAgentId,
  requestedTimeoutMs,
  backgroundTrigger,
  timeoutMs,
) {
  addAgentKeepaliveReason(ownerAgentId, `bash:${taskId}`, taskRegistry);
  let request = {
    taskId,
    description,
    taskRegistry,
    toolUseId,
    kind,
    agentId: ownerAgentId,
  };
  let now = Date.now();
  let stopState = {};
  let backgroundTimeoutMs = getBackgroundTimeoutNote(requestedTimeoutMs);
  let stopRequest = taskRegistry.get(taskId);
  let deadlineMs =
    backgroundTimeoutMs !== undefined && isLocalShellTask(stopRequest)
      ? recordBackgroundLimitRestart(stopRequest, backgroundTimeoutMs, getTaskRunState().limitStops, now)
      : undefined;
  let deadlineGuard =
    backgroundTimeoutMs === undefined
      ? undefined
      : setTimeout(
          stopAtBackgroundDeadline,
          backgroundTimeoutMs,
          request,
          backgroundTimeoutMs,
          stopState,
          deadlineMs !== undefined,
        );
  deadlineGuard?.unref();
  if (backgroundTimeoutMs !== undefined) {
    let deadlineAt = now + backgroundTimeoutMs;
    taskRegistry.update(taskId, (task) => ({
      ...task,
      deadlineAt,
    }));
  }
  let unwatchQuiet = getIsNonInteractiveSession() ? undefined : watchQuietShell(request, getProcessQueue());
  let detachPressureListener;
  if (!getIsNonInteractiveSession() && !env.CLAUDE_CODE_DISABLE_BG_SHELL_PRESSURE_REAP) {
    let lastSkipLogAt = new Map();
    let onMemoryPressure = (level) => {
      try {
        let task = taskRegistry.get(taskId);
        if (
          !isLocalShellTask(task) ||
          task.status !== "running" ||
          task.notified ||
          task.shellCommand?.status !== "backgrounded"
        )
          return;
        let now = Date.now();
        let lastInteractionTime = getLastInteractionTime();
        let idleMs = now - lastInteractionTime;
        let lastPressureReapAt = getTaskRunState().lastPressureReapAt;
        let pressure;
        let skipReason;
        if (level !== "critical") skipReason = `pressure level ${String(level)} is not critical`;
        else if (idleMs < AGENT_IDLE_KILL_MS)
          skipReason = `session active in the last ${AGENT_IDLE_KILL_MS / 60000}m`;
        else if (getMainLoopBusy()) skipReason = "a turn is running";
        else if (hasActiveAgentTasks(taskRegistry.all())) skipReason = "delegated agents are running";
        else if (
          lastPressureReapAt > lastInteractionTime &&
          task.startTime > lastPressureReapAt &&
          task.startTime - lastPressureReapAt < MEMORY_PRESSURE_KILL_MAX_AGE_MS
        )
          skipReason = "started soon after an earlier pressure reap, no input at the terminal since";
        else {
          pressure = readKernelMemoryPressure();
          if (!pressure.scarce) skipReason = "host memory is not scarce";
        }
        if (skipReason !== undefined) {
          let lastLoggedAt = lastSkipLogAt.get(skipReason);
          if (lastLoggedAt === undefined || now - lastLoggedAt >= AGENT_ACTIVE_WINDOW_MS) {
            lastSkipLogAt.set(skipReason, now);
            logForDebugging(
              `LocalShellTask ${taskId}: memory-pressure reap skipped: ${skipReason}${pressure ? ` (${pressure.detail})` : ""}`,
            );
          }
          return;
        }
        logForDebugging(
          `LocalShellTask ${taskId}: reaped under critical memory pressure after ${Math.floor(idleMs / 60000)}m idle (${pressure?.detail})`,
        );
        logFeatureOk("task_local_shell_pressure_reap");
        getTaskRunState().lastPressureReapAt = now;
        stopState.cause = "memory_pressure";
        stopShellTaskWithNotice(request, "memory_pressure");
      } catch (error) {
        logFeatureBad("task_local_shell_pressure_reap", "threw");
        logError(error);
      }
    };
    process.on("memoryPressure", onMemoryPressure);
    detachPressureListener = () => process.off("memoryPressure", onMemoryPressure);
  }
  return (outcome, { shellUsage, stopLabel }, diagnostics, release) => {
    detachPressureListener?.();
    unwatchQuiet?.();
    clearTimeout(deadlineGuard);
    let fields = {
      ...timeoutMs,
      ...release,
      elapsed_ms: Date.now() - now,
      requested_timeout_ms: requestedTimeoutMs ?? 0,
      deadline_ms: backgroundTimeoutMs ?? 0,
      outcome: fromEnumOpt(stopState.cause ? "killed" : outcome),
      stop_cause: fromEnumOpt(stopState.cause ?? stopLabel?.cause),
      stopped_by: fromEnumOpt(stopLabel?.by),
      subagent_owned: ownerAgentId !== undefined,
      trigger: fromEnumOpt(backgroundTrigger),
      ...buildCommandTimingFields(shellUsage),
      tool_use_id: parentTaskId(toolUseId),
      bash_command_kinds: diagnostics?.commandClass?.bash_command_kinds,
      bash_programs: diagnostics?.commandClass?.bash_programs,
      bash_test_scope: diagnostics?.commandClass?.bash_test_scope,
    };
    thenIfPromise(diagnostics?.testOutcome, (bashTestOutcome) =>
      logEvent("tengu_background_shell_settled", {
        ...fields,
        bash_test_outcome: bashTestOutcome,
      }),
    );
    releaseShellKeepalive(taskId, ownerAgentId, taskRegistry);
    let kinds = diagnostics?.commandClass?.bash_command_kinds;
    trackWorkAfterStop(getTaskRunState().afterHeavyStops, {
      agentId: ownerAgentId,
      kinds,
      usage: shellUsage,
      stoppedAtLimit: stopState.cause === "deadline",
    });
    if (
      deadlineMs !== undefined &&
      backgroundTimeoutMs !== undefined &&
      stopState.cause === "deadline" &&
      stopState.stoppedAt !== undefined
    ) {
      recordLimitStop(
        deadlineMs,
        {
          limitMs: backgroundTimeoutMs,
          cpuMs: shellUsage?.procCpuMs,
          output: stopState.output,
          stoppedAt: stopState.stoppedAt,
        },
        getTaskRunState().limitStops,
      );
      startHeavyStopWatch(
        getTaskRunState().afterHeavyStops,
        {
          agentId: ownerAgentId,
          limitMs: backgroundTimeoutMs,
          stoppedAt: stopState.stoppedAt,
          usage: shellUsage,
          kinds,
        },
        taskRegistry,
      );
    }
  };
}
export {
  MEMORY_PRESSURE_MIN_SILENT_MS,
  MEMORY_PRESSURE_RECHECK_MS,
  MEMORY_PRESSURE_MAX_KILLS,
  shouldKillShellForMemoryPressure,
  DEADLINE_STOP_SLACK_MS,
  NO_NOTE_TEXT,
};
