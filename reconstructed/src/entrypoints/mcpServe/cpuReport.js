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
function isCurrentCpuReport(n) {
  return isPlainObject(n) && n[CPU_METRIC_NAME] === CPU_METRIC_VERSION;
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
  let r;
  try {
    r = readFileSync("/proc/self/cgroup", "utf8");
  } catch {
    return;
  }
  let cpuacctPath = getCpuacctPath(r);
  if (cpuacctPath === undefined) return;
  let containerCpu = readContainerCpu(0);
  let cpuacctGroup = ensureCpuacctGroup(cpuacctPath);
  if (containerCpu !== undefined) {
    let s = cpuacctGroup === undefined ? undefined : posix.join(cpuacctGroup, "cpuacct.usage");
    let p = s === undefined ? undefined : readCpuUsageSeconds(s);
    let u = {
      machineMsAtZero: containerCpu.cpuMs - containerCpu.daemonCpuMs,
      callsBeingServed: 0,
      atCallsStart: undefined,
      inCallMs: 0,
      inCallCpuMs: 0,
      shell:
        s === undefined || p === undefined
          ? undefined
          : {
              usageFile: s,
              msAtZero: p,
            },
      lastLoopTickMs: performance.now(),
      loopStallMs: 0,
    };
    cpuReportSlot.of(host).meter = u;
    leftoverProcessTracker.enableCounting();
    setInterval(noteLoopTick, CPU_SAMPLE_MS, u).unref();
  }
  setCpuacctDir(cpuacctGroup);
}
//@ chunk-gg8n9khb.js:1281-1397 placement
function noteLoopTick(n) {
  let startTime = performance.now();
  if (startTime - n.lastLoopTickMs >= CPU_REPORT_INTERVAL_MS) n.loopStallMs += startTime - n.lastLoopTickMs;
  n.lastLoopTickMs = startTime;
}
//@ chunk-gg8n9khb.js:1397-1669 placement
function servingCall(n) {
  let { meter } = cpuReportSlot.of(n);
  if (meter === undefined) return;
  if (meter.callsBeingServed++ === 0) meter.atCallsStart = readContainerCpu(meter.machineMsAtZero);
  return {
    [Symbol.dispose]() {
      if (--meter.callsBeingServed === 0) {
        let r = addCpuSinceCallStart(meter, readContainerCpu(meter.machineMsAtZero));
        meter.inCallMs = r.ms;
        meter.inCallCpuMs = r.cpuMs;
        meter.atCallsStart = undefined;
      }
    },
  };
}
//@ chunk-gg8n9khb.js:1669-2357 placement
/**
 * 为工具容器调用附加 CPU 用量报告（cgroup cpuacct）。
 */
function withCpuReport(n, e, r) {
  let { meter } = cpuReportSlot.of(e);
  if (meter === undefined || !isCurrentCpuReport(r)) return n;
  let l = meter.shell === undefined ? undefined : readCpuUsageSeconds(meter.shell.usageFile);
  let containerCpu = readContainerCpu(meter.machineMsAtZero);
  if (containerCpu === undefined) return n;
  let s = addCpuSinceCallStart(meter, containerCpu);
  let floored = Math.floor(containerCpu.cpuMs);
  let u = meter.shell === undefined || l === undefined ? undefined : Math.floor(l - meter.shell.msAtZero);
  let h = {
    start_time_unix_ms: Math.floor(performance.timeOrigin),
    up_ms: Math.floor(containerCpu.upMs),
    cpu_ms: floored,
    daemon_cpu_ms: Math.floor(containerCpu.daemonCpuMs),
    in_call_ms: Math.floor(s.ms),
    in_call_cpu_ms: Math.floor(s.cpuMs),
    ...(u !== undefined &&
      u >= 1 &&
      u <= floored && {
        shell_cpu_ms: u,
      }),
    left_running_programs: leftoverProcessTracker.countRunning(),
    started_mcp_servers: startedServerKeys.of(e).size,
    loop_stall_ms: Math.floor(meter.loopStallMs),
  };
  let C = n.isError === true ? ANTHROPIC_TOOLCONTAINERCPU : CPU_METRIC_NAME;
  return {
    ...n,
    _meta: {
      ...n._meta,
      [C]: h,
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
export { startServedCpuMeter };
