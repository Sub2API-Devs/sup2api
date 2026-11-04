/**
 * entrypoints/mcpServe/cpuReport.ts
 *
 * 2.1.316 新增。为工具容器调用附加 CPU 用量报告（cgroup cpuacct）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-gg8n9khb.js (9)
 * attribution: placement 9
 */
import { readFileSync } from "fs";
import { posix } from "path";
import { COM_ANTHROPIC } from "../../services/mcp/anthropicMeta.js";
import { isPlainObject } from "../../utils/objectUtils.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { isRemoteManagedEnvironment } from "../../utils/remoteEnvironment.js";
import { env } from "../../utils/env.js";
import {
  getCpuacctPath,
  ensureCpuacctGroup,
  readCpuUsageSeconds,
  leftoverProcessTracker,
  setCpuacctDir,
  CPUACCT_ROOT,
} from "../../utils/shell/cpuReport.js";
import { startedServerKeys } from "../../services/mcp/startedServers.js";

//@ chunk-gg8n9khb.js:527-611 placement
var CPU_METRIC_NAME = `${COM_ANTHROPIC}toolContainerCpu`;
var ANTHROPIC_TOOLCONTAINERCPU = "anthropic/toolContainerCpu";
var CPU_METRIC_VERSION = 1;
var ONE_DAY_MS = 86400000;
var CPU_REPORT_TTL_MS = 31 * ONE_DAY_MS;
//@ chunk-gg8n9khb.js:611-648 placement
function isCurrentCpuReport(report) {
  return isPlainObject(report) && report[CPU_METRIC_NAME] === CPU_METRIC_VERSION;
}
//@ chunk-gg8n9khb.js:648-684 placement
var CPU_SAMPLE_MS = 1000;
var CPU_REPORT_INTERVAL_MS = 5000;
var cpuReportSlot = new HostScoped(() => ({}));
//@ chunk-gg8n9khb.js:684-1281 placement
function startServedCpuMeter(host, kind) {
  if (
    kind !== "tool-container" ||
    !isRemoteManagedEnvironment() ||
    env.CLAUDE_CODE_REMOTE_ENVIRONMENT_TYPE === "self_hosted"
  )
    return;
  let meter;
  try {
    meter = readFileSync("/proc/self/cgroup", "utf8");
  } catch {
    return;
  }
  let groupPath = getCpuacctPath(meter);
  if (groupPath === undefined) return;
  let containerCpu = readContainerCpu(0);
  let cpuacctGroup = ensureCpuacctGroup(groupPath);
  if (containerCpu !== undefined) {
    let usageFile = cpuacctGroup === undefined ? undefined : posix.join(cpuacctGroup, "cpuacct.usage");
    let baseline = usageFile === undefined ? undefined : readCpuUsageSeconds(usageFile);
    let state = {
      machineMsAtZero: containerCpu.cpuMs - containerCpu.daemonCpuMs,
      callsBeingServed: 0,
      atCallsStart: undefined,
      inCallMs: 0,
      inCallCpuMs: 0,
      shell:
        usageFile === undefined || baseline === undefined
          ? undefined
          : {
              usageFile,
              msAtZero: baseline,
            },
      lastLoopTickMs: performance.now(),
      loopStallMs: 0,
    };
    cpuReportSlot.of(host).meter = state;
    leftoverProcessTracker.enableCounting();
    setInterval(noteLoopTick, CPU_SAMPLE_MS, state).unref();
  }
  setCpuacctDir(cpuacctGroup);
}
//@ chunk-gg8n9khb.js:1281-1397 placement
function noteLoopTick(meter) {
  let startTime = performance.now();
  if (startTime - meter.lastLoopTickMs >= CPU_REPORT_INTERVAL_MS)
    meter.loopStallMs += startTime - meter.lastLoopTickMs;
  meter.lastLoopTickMs = startTime;
}
//@ chunk-gg8n9khb.js:1397-1669 placement
function servingCall(host) {
  let { meter } = cpuReportSlot.of(host);
  if (meter === undefined) return;
  if (meter.callsBeingServed++ === 0) meter.atCallsStart = readContainerCpu(meter.machineMsAtZero);
  return {
    [Symbol.dispose]() {
      if (--meter.callsBeingServed === 0) {
        let containerCpu = addCpuSinceCallStart(meter, readContainerCpu(meter.machineMsAtZero));
        meter.inCallMs = containerCpu.ms;
        meter.inCallCpuMs = containerCpu.cpuMs;
        meter.atCallsStart = undefined;
      }
    },
  };
}
//@ chunk-gg8n9khb.js:1669-2357 placement
/**
 * 为工具容器调用附加 CPU 用量报告（cgroup cpuacct）。
 */
function withCpuReport(result, meter, options) {
  let { meter: meter_2 } = cpuReportSlot.of(meter);
  if (meter_2 === undefined || !isCurrentCpuReport(options)) return result;
  let shellCpu = meter_2.shell === undefined ? undefined : readCpuUsageSeconds(meter_2.shell.usageFile);
  let containerCpu = readContainerCpu(meter_2.machineMsAtZero);
  if (containerCpu === undefined) return result;
  let cpuDelta = addCpuSinceCallStart(meter_2, containerCpu);
  let floored = Math.floor(containerCpu.cpuMs);
  let payload =
    meter_2.shell === undefined || shellCpu === undefined
      ? undefined
      : Math.floor(shellCpu - meter_2.shell.msAtZero);
  let report = {
    start_time_unix_ms: Math.floor(performance.timeOrigin),
    up_ms: Math.floor(containerCpu.upMs),
    cpu_ms: floored,
    daemon_cpu_ms: Math.floor(containerCpu.daemonCpuMs),
    in_call_ms: Math.floor(cpuDelta.ms),
    in_call_cpu_ms: Math.floor(cpuDelta.cpuMs),
    ...(payload !== undefined &&
      payload >= 1 &&
      payload <= floored && {
        shell_cpu_ms: payload,
      }),
    left_running_programs: leftoverProcessTracker.countRunning(),
    started_mcp_servers: startedServerKeys.of(meter).size,
    loop_stall_ms: Math.floor(meter_2.loopStallMs),
  };
  let metricName = result.isError === true ? ANTHROPIC_TOOLCONTAINERCPU : CPU_METRIC_NAME;
  return {
    ...result,
    _meta: {
      ...result._meta,
      [metricName]: report,
    },
  };
}
//@ chunk-gg8n9khb.js:2357-2515 placement
/**
 * 累加调用期间 CPU 用时
 */
function addCpuSinceCallStart({ atCallsStart, inCallMs, inCallCpuMs }, containerCpu) {
  return atCallsStart === undefined || containerCpu === undefined
    ? {
        ms: inCallMs,
        cpuMs: inCallCpuMs,
      }
    : {
        ms: inCallMs + containerCpu.upMs - atCallsStart.upMs,
        cpuMs: inCallCpuMs + Math.max(0, containerCpu.cpuMs - atCallsStart.cpuMs),
      };
}
//@ chunk-gg8n9khb.js:2515-2723 placement
/**
 * 读 cgroup cpuacct.usage 与进程 CPU
 */
function readContainerCpu(machineMsAtZero) {
  let cpuUsageSeconds = readCpuUsageSeconds(posix.join(CPUACCT_ROOT, "cpuacct.usage"));
  if (cpuUsageSeconds === undefined) return;
  try {
    let { user, system } = process.cpuUsage();
    return {
      cpuMs: Math.max(0, cpuUsageSeconds - machineMsAtZero),
      daemonCpuMs: (user + system) / 1000,
      upMs: performance.now(),
    };
  } catch {
    return;
  }
}
export { startServedCpuMeter, servingCall, withCpuReport };
