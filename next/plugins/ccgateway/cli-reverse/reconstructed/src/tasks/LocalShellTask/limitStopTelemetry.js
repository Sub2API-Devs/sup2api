/**
 * tasks/LocalShellTask/limitStopTelemetry.ts
 *
 * 后台 shell 因限时/CPU 被停时的诊断上报与重载停止结案（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (15)
 * attribution: placement 15
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { lstatSync } from "fs";
import { sessionHostKind } from "../../utils/telemetry/memorySummary.js";
import { isPlainToolUseId } from "../../tools/BashTool/BashTool.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { sessionSurfaceKind, classifyBashForCpu } from "../../cli/print/forkConversation.js";
import { logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { logError } from "../../utils/log.js";
import { getTaskOutputPath } from "../../utils/task/diskOutput.js";
import { env } from "../../utils/env.js";
import { isLocalShellTask } from "./guards.js";
import { readProcCpuTime } from "../../utils/shell/processCpuTime.js";
import { registerCleanup } from "../../utils/cleanupRegistry.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:4854544-4854582 placement
var MINUTE_MS = 60000;
var RESTART_WINDOW_MS = 30 * MINUTE_MS;
var MAX_EARLIER_STOPS = 50;
var MAX_REPORTED_EARLIER_STOPS = 3;
//@ chunk-5xgkngpb.js:4854582-4854708 placement
function limitBand(limitMs) {
  let minutes = limitMs / MINUTE_MS;
  return minutes < 30
    ? "lt_30m"
    : minutes === 30
      ? "30m"
      : minutes < 60
        ? "30m_60m"
        : minutes === 60
          ? "60m"
          : minutes < 120
            ? "60m_2h"
            : minutes === 120
              ? "2h"
              : "gt_2h";
}
//@ chunk-5xgkngpb.js:4854708-4854854 placement
function quietBand(output, stoppedAt) {
  if (output === undefined) return "unknown";
  if (output.bytes === 0) return "empty";
  let quietMs = stoppedAt - output.changedAt;
  return quietMs < MINUTE_MS ? "lt_1m" : quietMs <= 10 * MINUTE_MS ? "1m_10m" : "gt_10m";
}
//@ chunk-5xgkngpb.js:4854854-4855545 placement
/**
 * 后台 shell 因限制被停后再次启动时，上报 background_limit_restart 诊断（限时档位、此前停止次数、上次负载类型）。
 */
function recordBackgroundLimitRestart(toolCall, backgroundTimeoutMs, limitStops, now) {
  try {
    if (
      sessionHostKind() !== "hosted_worker" ||
      toolCall.shell !== "bash" ||
      !isPlainToolUseId(toolCall.toolUseId)
    )
      return;
    let contentHash = computeContentHash(
      [toolCall.agentId ?? "", toolCall.cwd, toolCall.command.trim()].join("\x00"),
    );
    let previousStop = limitStops.get(contentHash);
    let sinceMs = previousStop === undefined ? undefined : now - previousStop.stoppedAt;
    if (previousStop === undefined || sinceMs === undefined || sinceMs < 0 || sinceMs > RESTART_WINDOW_MS)
      return {
        key: contentHash,
        command: toolCall.command,
        earlierStops: 0,
      };
    logForDiagnosticsNoPII("warn", "background_limit_restart", {
      session_family: sessionSurfaceKind(),
      since_band: sinceMs <= 10 * MINUTE_MS ? "le_10m" : "10m_30m",
      earlier_stops: Math.min(previousStop.count, MAX_REPORTED_EARLIER_STOPS),
      limit_band: limitBand(backgroundTimeoutMs),
      prev_work_kind: previousStop.workKind,
      prev_limit_band: previousStop.limitBand,
      prev_quiet_band: previousStop.quietBand,
      ...(previousStop.cpuMs !== undefined && {
        prev_cpu_ms: previousStop.cpuMs,
      }),
    });
    return {
      key: contentHash,
      command: toolCall.command,
      earlierStops: previousStop.count,
    };
  } catch (error) {
    logFeatureBad("task_local_shell_limit_lines", "launch_threw");
    logError(error);
    return;
  }
}
//@ chunk-5xgkngpb.js:4855545-4855656 placement
function readTaskOutput(taskId) {
  try {
    let stat = lstatSync(getTaskOutputPath(taskId));
    return stat.isFile()
      ? {
          bytes: stat.size,
          changedAt: stat.mtimeMs,
        }
      : undefined;
  } catch {
    return;
  }
}
//@ chunk-5xgkngpb.js:4855656-4856200 placement
/**
 * 后台 shell 因限制被停时记录 background_limit_stop 并更新该命令的停止登记。
 */
function recordLimitStop(stopKey, stopInfo, limitStops) {
  try {
    let workKind = classifyBashForCpu(stopKey.command);
    let limitBucket = limitBand(stopInfo.limitMs);
    let quietBucket = quietBand(stopInfo.output, stopInfo.stoppedAt);
    logForDiagnosticsNoPII("warn", "background_limit_stop", {
      session_family: sessionSurfaceKind(),
      work_kind: workKind,
      limit_band: limitBucket,
      quiet_band: quietBucket,
      earlier_stops: Math.min(stopKey.earlierStops, MAX_REPORTED_EARLIER_STOPS),
      ...(stopInfo.cpuMs !== undefined && {
        cpu_ms: stopInfo.cpuMs,
      }),
    });
    logFeatureOk("task_local_shell_limit_lines");
    limitStops.delete(stopKey.key);
    limitStops.set(stopKey.key, {
      stoppedAt: stopInfo.stoppedAt,
      count: stopKey.earlierStops + 1,
      workKind,
      limitBand: limitBucket,
      quietBand: quietBucket,
      cpuMs: stopInfo.cpuMs,
    });
    for (let key of limitStops.keys()) {
      if (limitStops.size <= MAX_EARLIER_STOPS) break;
      limitStops.delete(key);
    }
  } catch (error) {
    logFeatureBad("task_local_shell_limit_lines", "stop_threw");
    logError(error);
  }
}
//@ chunk-5xgkngpb.js:4856200-4856661 placement
/**
 * 后台负载统计常量表：限时档位、命令种类到归类的映射、已知种类集合。
 */
var HEAVY_MINUTE_MS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var HEAVY_CPU_THRESHOLD_MS;
var WORK_COMMAND_CPU_MS;
var MAX_WATCH_MS;
var MAX_WORK_COMMANDS;
var MAX_REPORTED_STOPS;
var KIND_GROUPS;
var OTHER_KINDS;
deferInit("chunk-5xgkngpb.js:4856200", () => {
  HEAVY_MINUTE_MS = 60000;
  HEAVY_CPU_THRESHOLD_MS = 1e6;
  WORK_COMMAND_CPU_MS = 1e4;
  MAX_WATCH_MS = 180 * HEAVY_MINUTE_MS;
  MAX_WORK_COMMANDS = 50;
  MAX_REPORTED_STOPS = 3;
  KIND_GROUPS = [
    ["servers", ["serves_or_watches"]],
    ["tests", ["runs_tests"]],
    ["builds", ["builds", "installs_packages", "lints"]],
    ["language", ["python", "node", "other_runtime", "compiled_lang"]],
    ["scripts", ["shell_script"]],
  ];
  OTHER_KINDS = new Set([
    "wait",
    "shell_word",
    "file_read",
    "file_search",
    "file_change",
    "text_transform",
    "vcs",
    "github_cli",
    "network",
    "process_system",
    "claude_cli",
    "starts_background_job",
    "incomplete",
    "unparsed",
  ]);
});
//@ chunk-5xgkngpb.js:4856661-4856832 placement
function classifyKinds(kinds) {
  let kindsList = kinds?.split(",") ?? [];
  return (
    KIND_GROUPS.find(([, groupKinds]) => groupKinds.some((kind) => kindsList.includes(kind)))?.[0] ??
    (kindsList.some((kind) => !OTHER_KINDS.has(kind))
      ? "programs"
      : kindsList.includes("wait")
        ? "waits"
        : "other")
  );
}
//@ chunk-5xgkngpb.js:4856832-4857013 placement
function firstWorkStartBand(stop) {
  if (stop.firstWorkStartAt === undefined) return "none";
  let minutesAfterStop = (stop.firstWorkStartAt - stop.stoppedAt) / HEAVY_MINUTE_MS;
  return minutesAfterStop < 0
    ? "before_stop"
    : minutesAfterStop <= 2
      ? "le_2m"
      : minutesAfterStop <= 10
        ? "2m_10m"
        : minutesAfterStop <= 30
          ? "10m_30m"
          : "gt_30m";
}
//@ chunk-5xgkngpb.js:4857013-4858027 placement
/**
 * 重载停止结案：清定时器、按 CPU 归因汇总 after_heavy_stop 并写诊断。
 */
function closeHeavyStop(stops, stop, closedBy, stillRunningCpuMs) {
  clearTimeout(stop.timeUp);
  stop.atProcessEnd?.();
  if (stops.get(stop.owner) !== stop) return;
  stops.delete(stop.owner);
  let cpuMsAfter = stop.cpuMsAfter;
  logForDiagnosticsNoPII(
    "warn",
    "after_heavy_stop",
    {
      session_family: sessionSurfaceKind(),
      session_half:
        parseInt(computeContentHash(env.CLAUDE_CODE_REMOTE_SESSION_ID ?? "")[0] ?? "", 16) % 2 ? "b" : "a",
      limit_band: stop.limitBand,
      stopped_class: stop.stoppedClass,
      stopped_cpu_ms: Math.round(stop.stoppedCpuMs),
      earlier_heavy_stops: Math.min(stop.earlierHeavyStops, MAX_REPORTED_STOPS),
      closed_by: closedBy,
      covered_minutes: Math.max(0, Math.floor((Date.now() - stop.stoppedAt) / HEAVY_MINUTE_MS)),
      first_work_start_band: firstWorkStartBand(stop),
      work_commands_after: Math.min(stop.workCommandsAfter, MAX_WORK_COMMANDS),
      after_tests_cpu_ms: Math.round(cpuMsAfter.tests),
      after_builds_cpu_ms: Math.round(cpuMsAfter.builds),
      after_language_cpu_ms: Math.round(cpuMsAfter.language),
      after_scripts_cpu_ms: Math.round(cpuMsAfter.scripts),
      after_programs_cpu_ms: Math.round(cpuMsAfter.programs),
      after_servers_cpu_ms: Math.round(cpuMsAfter.servers),
      after_rest_cpu_ms: Math.round(cpuMsAfter.waits + cpuMsAfter.other),
      ...(stillRunningCpuMs !== undefined && {
        still_running_cpu_ms: Math.round(stillRunningCpuMs),
      }),
      after_limit_stops: Math.min(stop.limitStopsAfter, MAX_REPORTED_STOPS),
    },
    closedBy === "process_end" ? "now" : "queued",
  );
}
//@ chunk-5xgkngpb.js:4858027-4858107 placement
function logStopError(error) {
  logFeatureBad("task_local_shell_limit_lines", "after_heavy_stop_threw");
  logError(error);
}
//@ chunk-5xgkngpb.js:4858107-4858390 placement
function sumRunningCpuMs(stop, tasks) {
  try {
    let totalCpuMs = 0;
    for (let task of Object.values(tasks.all()))
      if (
        isLocalShellTask(task) &&
        task.shellCommand?.pid !== undefined &&
        task.status === "running" &&
        task.isBackgrounded &&
        task.kind !== "monitor" &&
        (task.agentId ?? "") === stop.owner &&
        task.startTime >= stop.creditFrom
      )
        totalCpuMs += readProcCpuTime(task.shellCommand.pid) ?? 0;
    return totalCpuMs;
  } catch (error) {
    logStopError(error);
    return 0;
  }
}
//@ chunk-5xgkngpb.js:4858390-4858459 placement
function onWatchTimeUp(stops, stop, tasks) {
  try {
    closeHeavyStop(stops, stop, "time_up", sumRunningCpuMs(stop, tasks));
  } catch (error) {
    logStopError(error);
  }
}
//@ chunk-5xgkngpb.js:4858459-4859252 placement
/**
 * 一次重载停止开始时建登记并在限时后自动结案或随进程结束结案。
 */
function startHeavyStopWatch(stops, usageInfo, tasks) {
  try {
    let procCpuMs = usageInfo.usage?.procCpuMs;
    if (usageInfo.usage === undefined || procCpuMs === undefined || procCpuMs < HEAVY_CPU_THRESHOLD_MS)
      return;
    let agentId = usageInfo.agentId ?? "";
    let previousStop = stops.get(agentId);
    let isAfterPrevious =
      previousStop !== undefined && usageInfo.stoppedAt - usageInfo.usage.wallMs >= previousStop.stoppedAt;
    if (previousStop !== undefined)
      closeHeavyStop(stops, previousStop, isAfterPrevious ? "next_heavy_stop" : "overlapping_stop");
    let stop = {
      owner: agentId,
      stoppedAt: usageInfo.stoppedAt,
      creditFrom: previousStop?.creditFrom ?? usageInfo.stoppedAt,
      limitBand: limitBand(usageInfo.limitMs),
      stoppedClass: classifyKinds(usageInfo.kinds),
      stoppedCpuMs: procCpuMs,
      earlierHeavyStops: (previousStop?.earlierHeavyStops ?? 0) + (isAfterPrevious ? 1 : 0),
      cpuMsAfter: {
        servers: 0,
        tests: 0,
        builds: 0,
        language: 0,
        scripts: 0,
        programs: 0,
        waits: 0,
        other: 0,
      },
      workCommandsAfter: 0,
      limitStopsAfter: 0,
      firstWorkStartAt: undefined,
    };
    stops.set(agentId, stop);
    let timeUpAt = usageInfo.stoppedAt + Math.min(usageInfo.limitMs + 60 * HEAVY_MINUTE_MS, MAX_WATCH_MS);
    stop.timeUp = setTimeout(onWatchTimeUp, timeUpAt - Date.now(), stops, stop, tasks);
    stop.timeUp.unref();
    stop.atProcessEnd = registerCleanup(() => {
      try {
        closeHeavyStop(stops, stop, "process_end");
      } catch (error) {
        logStopError(error);
      }
    });
  } catch (error) {
    logStopError(error);
  }
}
//@ chunk-5xgkngpb.js:4859252-4859645 placement
/**
 * 把仍在运行的子进程 CPU 归到被停命令对应的负载类别与时间窗。
 */
function trackWorkAfterStop(afterHeavyStops, usageInfo) {
  if (afterHeavyStops.size === 0 || usageInfo.usage === undefined) return;
  try {
    let { wallMs, cpu, procCpuMs } = usageInfo.usage;
    let idleMs = Date.now() - wallMs;
    let stop = afterHeavyStops.get(usageInfo.agentId ?? "");
    if (stop === undefined || idleMs < stop.creditFrom) return;
    let cpuMs = (cpu?.userMs ?? 0) + (cpu?.systemMs ?? 0) + (procCpuMs ?? 0);
    stop.cpuMsAfter[classifyKinds(usageInfo.kinds)] += cpuMs;
    if (usageInfo.stoppedAtLimit) stop.limitStopsAfter++;
    if (cpuMs >= WORK_COMMAND_CPU_MS) {
      stop.workCommandsAfter++;
      stop.firstWorkStartAt = Math.min(stop.firstWorkStartAt ?? idleMs, idleMs);
    }
  } catch (error) {
    logStopError(error);
  }
}
export {
  trackWorkAfterStop,
  recordBackgroundLimitRestart,
  recordLimitStop,
  startHeavyStopWatch,
  readTaskOutput,
};
