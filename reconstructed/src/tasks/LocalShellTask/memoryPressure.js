/**
 * tasks/LocalShellTask/memoryPressure.ts
 *
 * 2.1.316 新增：内存压力下终止后台 shell 任务的判定（读 /proc/meminfo）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (4)
 * attribution: placement 4
 */
import { readFileSync } from "fs";
import { getPlatform } from "../../utils/platform.js";
import { getErrnoCode } from "../../utils/errors.js";
import { MEMORY_SCARCE_RATIO, MEMORY_SCARCE_GB } from "../../tools/BashTool/commandSemantics.js";
import { addAgentKeepaliveReason } from "../taskKinds.js";
import { getBackgroundTimeoutNote } from "../../tools/BashTool/prompt.js";
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
import { commandQueueManager } from "../../utils/messageQueueManager.js";
import { env } from "../../utils/env.js";
import { getTaskRunState } from "../../utils/task/taskNotifications.js";
import { hasActiveAgentTasks } from "../taskStatus.js";
import { logForDebugging } from "../../utils/debug.js";
import { logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { logError } from "../../utils/log.js";
import { fromEnumOpt } from "../../services/analytics/safeMetadata.js";
import { buildCommandTimingFields, thenIfPromise } from "../../tools/BashTool/bashTelemetry.js";
import { parentTaskId } from "./backgroundNotices.js";
import { logEvent } from "../../services/analytics/index.js";

//@ chunk-e6aww6q8.js:4741231-4741799 placement
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
  let n;
  try {
    n = readFileSync("/proc/meminfo", "utf8");
  } catch (error) {
    return {
      scarce: false,
      detail: `/proc/meminfo unreadable (${getErrnoCode(error) ?? "unknown error"})`,
    };
  }
  let r = Number(/^MemTotal:\s+(\d+) kB$/m.exec(n)?.[1]);
  let s = Number(/^MemAvailable:\s+(\d+) kB$/m.exec(n)?.[1]);
  if (!(r > 0) || Number.isNaN(s))
    return {
      scarce: false,
      detail: "/proc/meminfo unparseable",
    };
  return {
    scarce: s / r < MEMORY_SCARCE_RATIO && s < MEMORY_SCARCE_GB * 1024 * 1024,
    detail: `MemAvailable ${s} kB of ${r} kB; scarce is under ${Math.round(MEMORY_SCARCE_RATIO * 100)}% and under ${MEMORY_SCARCE_GB} GiB`,
  };
}
//@ chunk-e6aww6q8.js:4741799-4741827 placement
/**
 * 内存压力下判定 shell 空闲的最短时间与最多终止数、重查间隔。
 */
var MEMORY_PRESSURE_RECHECK_MS = 60000;
var MEMORY_PRESSURE_MIN_SILENT_MS = 1e4;
var MEMORY_PRESSURE_MAX_KILLS = 4;
//@ chunk-e6aww6q8.js:4746226-4746265 placement
/**
 * 有代理在跑时保留 shell 的时长、判定活跃窗口与最大年龄。
 */
var AGENT_IDLE_KILL_MS = 1800000;
var AGENT_ACTIVE_WINDOW_MS = 600000;
var MEMORY_PRESSURE_KILL_MAX_AGE_MS = 1800000;
//@ chunk-e6aww6q8.js:4748902-4750942 placement
/**
 * 判断内存压力下是否终止某个后台 shell（压力等级、最近是否活跃、是否有代理在跑）。
 */
function shouldKillShellForMemoryPressure(taskId, description, taskRegistry, toolUseId, kind, agentId, S, w) {
  addAgentKeepaliveReason(agentId, `bash:${taskId}`, taskRegistry);
  let L = {
    taskId,
    description,
    taskRegistry,
    toolUseId,
    kind,
    agentId,
  };
  let now = Date.now();
  let q = {};
  let backgroundTimeoutNote = getBackgroundTimeoutNote(S);
  let Se =
    backgroundTimeoutNote === undefined
      ? undefined
      : setTimeout(stopAtBackgroundDeadline, backgroundTimeoutNote, L, backgroundTimeoutNote, q);
  Se?.unref();
  if (backgroundTimeoutNote !== undefined) {
    let deadlineAt = now + backgroundTimeoutNote;
    taskRegistry.update(taskId, (Ae) => ({
      ...Ae,
      deadlineAt,
    }));
  }
  let ke = getIsNonInteractiveSession() ? undefined : watchQuietShell(L, commandQueueManager());
  let we;
  if (!getIsNonInteractiveSession() && !env.CLAUDE_CODE_DISABLE_BG_SHELL_PRESSURE_REAP) {
    let Ee = new Map();
    let Ae = (Ie) => {
      try {
        let Me = taskRegistry.get(taskId);
        if (Me?.status !== "running" || Me.notified) return;
        let now = Date.now();
        let lastInteractionTime = getLastInteractionTime();
        let lt = now - lastInteractionTime;
        let lastPressureReapAt = getTaskRunState().lastPressureReapAt;
        let nt;
        let pt;
        if (Ie !== "critical") pt = `pressure level ${String(Ie)} is not critical`;
        else if (lt < AGENT_IDLE_KILL_MS) pt = `session active in the last ${AGENT_IDLE_KILL_MS / 60000}m`;
        else if (getMainLoopBusy()) pt = "a turn is running";
        else if (hasActiveAgentTasks(taskRegistry.all())) pt = "delegated agents are running";
        else if (
          lastPressureReapAt > lastInteractionTime &&
          Me.startTime > lastPressureReapAt &&
          Me.startTime - lastPressureReapAt < MEMORY_PRESSURE_KILL_MAX_AGE_MS
        )
          pt = "started soon after an earlier pressure reap, no input at the terminal since";
        else {
          nt = readKernelMemoryPressure();
          if (!nt.scarce) pt = "host memory is not scarce";
        }
        if (pt !== undefined) {
          let Et = Ee.get(pt);
          if (Et === undefined || now - Et >= AGENT_ACTIVE_WINDOW_MS) {
            Ee.set(pt, now);
            logForDebugging(
              `LocalShellTask ${taskId}: memory-pressure reap skipped: ${pt}${nt ? ` (${nt.detail})` : ""}`,
            );
          }
          return;
        }
        logForDebugging(
          `LocalShellTask ${taskId}: reaped under critical memory pressure after ${Math.floor(lt / 60000)}m idle (${nt?.detail})`,
        );
        logFeatureOk("task_local_shell_pressure_reap");
        getTaskRunState().lastPressureReapAt = now;
        q.cause = "memory_pressure";
        stopShellTaskWithNotice(L, "memory_pressure");
      } catch (error) {
        logFeatureBad("task_local_shell_pressure_reap", "threw");
        logError(error);
      }
    };
    process.on("memoryPressure", Ae);
    we = () => process.off("memoryPressure", Ae);
  }
  return (Ee, { shellUsage, stopLabel }, Me) => {
    we?.();
    ke?.();
    clearTimeout(Se);
    let We = {
      elapsed_ms: Date.now() - now,
      requested_timeout_ms: S ?? 0,
      deadline_ms: backgroundTimeoutNote ?? 0,
      outcome: fromEnumOpt(q.cause ? "killed" : Ee),
      stop_cause: fromEnumOpt(q.cause ?? stopLabel?.cause),
      stopped_by: fromEnumOpt(stopLabel?.by),
      subagent_owned: agentId !== undefined,
      trigger: fromEnumOpt(w),
      ...buildCommandTimingFields(shellUsage),
      tool_use_id: parentTaskId(toolUseId),
      bash_command_kinds: Me?.commandClass?.bash_command_kinds,
      bash_programs: Me?.commandClass?.bash_programs,
      bash_test_scope: Me?.commandClass?.bash_test_scope,
    };
    thenIfPromise(Me?.testOutcome, (bashTestOutcome) =>
      logEvent("tengu_background_shell_settled", {
        ...We,
        bash_test_outcome: bashTestOutcome,
      }),
    );
    releaseShellKeepalive(taskId, agentId, taskRegistry);
  };
}
export {
  MEMORY_PRESSURE_MIN_SILENT_MS,
  MEMORY_PRESSURE_RECHECK_MS,
  MEMORY_PRESSURE_MAX_KILLS,
  shouldKillShellForMemoryPressure,
};
