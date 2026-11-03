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
import { mn } from "../../utils/remoteEnvironment.js";
import { env } from "../../utils/env.js";
import {
  getCpuacctPath,
  ensureCpuacctGroup,
  readCpuUsageSeconds,
  OEt,
  setCpuacctDir,
  ghn,
} from "../../utils/shell/cpuReport.js";
import { QHn } from "../../services/mcp/startedServers.js";

//@ chunk-gg8n9khb.js:527-611 placement
var c = `${COM_ANTHROPIC}toolContainerCpu`,
  ANTHROPIC_TOOLCONTAINERCPU = "anthropic/toolContainerCpu",
  R = 1,
  b = 86400000,
  L = 31 * b;
//@ chunk-gg8n9khb.js:611-648 placement
function d(n) {
  return isPlainObject(n) && n[c] === R;
}
//@ chunk-gg8n9khb.js:648-684 placement
var g = 1000,
  E = 5000,
  a = new HostScoped(() => ({}));
//@ chunk-gg8n9khb.js:684-1281 placement
function startServedCpuMeter(n, e) {
  if (e !== "tool-container" || !mn() || env.CLAUDE_CODE_REMOTE_ENVIRONMENT_TYPE === "self_hosted") return;
  let r;
  try {
    r = readFileSync("/proc/self/cgroup", "utf8");
  } catch {
    return;
  }
  let o = getCpuacctPath(r);
  if (o === void 0) return;
  let l = readContainerCpu(0),
    t = ensureCpuacctGroup(o);
  if (l !== void 0) {
    let s = t === void 0 ? void 0 : posix.join(t, "cpuacct.usage"),
      p = s === void 0 ? void 0 : readCpuUsageSeconds(s),
      u = {
        machineMsAtZero: l.cpuMs - l.daemonCpuMs,
        callsBeingServed: 0,
        atCallsStart: void 0,
        inCallMs: 0,
        inCallCpuMs: 0,
        shell: s === void 0 || p === void 0 ? void 0 : { usageFile: s, msAtZero: p },
        lastLoopTickMs: performance.now(),
        loopStallMs: 0,
      };
    ((a.of(n).meter = u), OEt.enableCounting(), setInterval(noteLoopTick, g, u).unref());
  }
  setCpuacctDir(t);
}
//@ chunk-gg8n9khb.js:1281-1397 placement
function noteLoopTick(n) {
  let startTime = performance.now();
  if (startTime - n.lastLoopTickMs >= E) n.loopStallMs += startTime - n.lastLoopTickMs;
  n.lastLoopTickMs = startTime;
}
//@ chunk-gg8n9khb.js:1397-1669 placement
function servingCall(n) {
  let { meter: meter } = a.of(n);
  if (meter === void 0) return;
  if (meter.callsBeingServed++ === 0) meter.atCallsStart = readContainerCpu(meter.machineMsAtZero);
  return {
    [Symbol.dispose]() {
      if (--meter.callsBeingServed === 0) {
        let r = addCpuSinceCallStart(meter, readContainerCpu(meter.machineMsAtZero));
        ((meter.inCallMs = r.ms), (meter.inCallCpuMs = r.cpuMs), (meter.atCallsStart = void 0));
      }
    },
  };
}
/**
 * 为工具容器调用附加 CPU 用量报告（cgroup cpuacct）。
 */
//@ chunk-gg8n9khb.js:1669-2357 placement
function withCpuReport(n, e, r) {
  let { meter: meter } = a.of(e);
  if (meter === void 0 || !d(r)) return n;
  let l = meter.shell === void 0 ? void 0 : readCpuUsageSeconds(meter.shell.usageFile),
    t = readContainerCpu(meter.machineMsAtZero);
  if (t === void 0) return n;
  let s = addCpuSinceCallStart(meter, t),
    floored = Math.floor(t.cpuMs),
    u = meter.shell === void 0 || l === void 0 ? void 0 : Math.floor(l - meter.shell.msAtZero),
    h = {
      start_time_unix_ms: Math.floor(performance.timeOrigin),
      up_ms: Math.floor(t.upMs),
      cpu_ms: floored,
      daemon_cpu_ms: Math.floor(t.daemonCpuMs),
      in_call_ms: Math.floor(s.ms),
      in_call_cpu_ms: Math.floor(s.cpuMs),
      ...(u !== void 0 && u >= 1 && u <= floored && { shell_cpu_ms: u }),
      left_running_programs: OEt.countRunning(),
      started_mcp_servers: QHn.of(e).size,
      loop_stall_ms: Math.floor(meter.loopStallMs),
    },
    C = n.isError === !0 ? ANTHROPIC_TOOLCONTAINERCPU : c;
  return { ...n, _meta: { ...n._meta, [C]: h } };
}
/**
 * 累加调用期间 CPU 用时
 */
//@ chunk-gg8n9khb.js:2357-2515 placement
function addCpuSinceCallStart(
  { atCallsStart: atCallsStart, inCallMs: inCallMs, inCallCpuMs: inCallCpuMs },
  o,
) {
  return atCallsStart === void 0 || o === void 0
    ? { ms: inCallMs, cpuMs: inCallCpuMs }
    : {
        ms: inCallMs + o.upMs - atCallsStart.upMs,
        cpuMs: inCallCpuMs + Math.max(0, o.cpuMs - atCallsStart.cpuMs),
      };
}
/**
 * 读 cgroup cpuacct.usage 与进程 CPU
 */
//@ chunk-gg8n9khb.js:2515-2723 placement
function readContainerCpu(n) {
  let e = readCpuUsageSeconds(posix.join(ghn, "cpuacct.usage"));
  if (e === void 0) return;
  try {
    let { user: user, system: system } = process.cpuUsage();
    return { cpuMs: Math.max(0, e - n), daemonCpuMs: (user + system) / 1000, upMs: performance.now() };
  } catch {
    return;
  }
}

export { startServedCpuMeter };
