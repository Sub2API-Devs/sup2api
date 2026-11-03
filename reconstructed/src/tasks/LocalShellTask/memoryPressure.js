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
import {
  readFileSync,
  readFileSync as readFileSync_2,
  readFileSync as readFileSync_3,
  readFileSync as readFileSync_4,
  readFileSync as readFileSync_5,
  readFileSync as readFileSync_6,
  readFileSync as readFileSync_7,
  readFileSync as readFileSync_8,
} from "fs";
import { getPlatform } from "../../utils/platform.js";
import { getErrnoCode } from "../../utils/errors.js";
import { uVn, cVn } from "../../tools/BashTool/commandSemantics.js";
import { addAgentKeepaliveReason } from "../taskKinds.js";
import { A5r } from "../../tools/BashTool/prompt.js";
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
import { mg } from "../../utils/messageQueueManager.js";
import { env } from "../../utils/env.js";
import { getTaskRunState } from "../../utils/task/taskNotifications.js";
import { hasActiveAgentTasks } from "../taskStatus.js";
import { logForDebugging } from "../../utils/debug.js";
import { logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { logError } from "../../utils/log.js";
import { fromEnumOpt } from "../../services/analytics/safeMetadata.js";
import { buildCommandTimingFields, orr } from "../../tools/BashTool/bashTelemetry.js";
import { kVt } from "./backgroundNotices.js";
import { logEvent } from "../../services/analytics/index.js";

/**
 * 读取 /proc/meminfo 判断内存压力（WSL 下采用内核结论）。
 */
//@ chunk-e6aww6q8.js:4741231-4741799 placement
function readKernelMemoryPressure() {
  let e = getPlatform();
  if (e !== "linux" && e !== "wsl") return { scarce: !0, detail: `${e}: kernel verdict taken as is` };
  let n;
  try {
    n = readFileSync_8("/proc/meminfo", "utf8");
  } catch (error) {
    return { scarce: !1, detail: `/proc/meminfo unreadable (${getErrnoCode(error) ?? "unknown error"})` };
  }
  let r = Number(/^MemTotal:\s+(\d+) kB$/m.exec(n)?.[1]),
    s = Number(/^MemAvailable:\s+(\d+) kB$/m.exec(n)?.[1]);
  if (!(r > 0) || Number.isNaN(s)) return { scarce: !1, detail: "/proc/meminfo unparseable" };
  return {
    scarce: s / r < uVn && s < cVn * 1024 * 1024,
    detail: `MemAvailable ${s} kB of ${r} kB; scarce is under ${Math.round(uVn * 100)}% and under ${cVn} GiB`,
  };
}
//@ chunk-e6aww6q8.js:4741799-4741827 placement
var jEs = 60000,
  WEs = 1e4,
  pVn = 4;
//@ chunk-e6aww6q8.js:4746226-4746265 placement
var yVn = 1800000,
  YEs = 600000,
  XEs = 1800000;
/**
 * 判断内存压力下是否终止某个后台 shell（压力等级、最近是否活跃、是否有代理在跑）。
 */
//@ chunk-e6aww6q8.js:4748902-4750942 placement
function shouldKillShellForMemoryPressure(e, n, r, s, h, y, S, w) {
  addAgentKeepaliveReason(y, `bash:${e}`, r);
  let L = { taskId: e, description: n, taskRegistry: r, toolUseId: s, kind: h, agentId: y },
    now = Date.now(),
    q = {},
    Z = A5r(S),
    Se = Z === void 0 ? void 0 : setTimeout(stopAtBackgroundDeadline, Z, L, Z, q);
  if ((Se?.unref(), Z !== void 0)) {
    let Ee = now + Z;
    r.update(e, (Ae) => ({ ...Ae, deadlineAt: Ee }));
  }
  let ke = getIsNonInteractiveSession() ? void 0 : watchQuietShell(L, mg()),
    we;
  if (!getIsNonInteractiveSession() && !env.CLAUDE_CODE_DISABLE_BG_SHELL_PRESSURE_REAP) {
    let Ee = new Map(),
      Ae = (Ie) => {
        try {
          let Me = r.get(e);
          if (Me?.status !== "running" || Me.notified) return;
          let now = Date.now(),
            ze = getLastInteractionTime(),
            lt = now - ze,
            lastPressureReapAt = getTaskRunState().lastPressureReapAt,
            nt,
            pt;
          if (Ie !== "critical") pt = `pressure level ${String(Ie)} is not critical`;
          else if (lt < yVn) pt = `session active in the last ${yVn / 60000}m`;
          else if (getMainLoopBusy()) pt = "a turn is running";
          else if (hasActiveAgentTasks(r.all())) pt = "delegated agents are running";
          else if (
            lastPressureReapAt > ze &&
            Me.startTime > lastPressureReapAt &&
            Me.startTime - lastPressureReapAt < XEs
          )
            pt = "started soon after an earlier pressure reap, no input at the terminal since";
          else if (((nt = readKernelMemoryPressure()), !nt.scarce)) pt = "host memory is not scarce";
          if (pt !== void 0) {
            let Et = Ee.get(pt);
            if (Et === void 0 || now - Et >= YEs)
              (Ee.set(pt, now),
                logForDebugging(
                  `LocalShellTask ${e}: memory-pressure reap skipped: ${pt}${nt ? ` (${nt.detail})` : ""}`,
                ));
            return;
          }
          (logForDebugging(
            `LocalShellTask ${e}: reaped under critical memory pressure after ${Math.floor(lt / 60000)}m idle (${nt?.detail})`,
          ),
            logFeatureOk("task_local_shell_pressure_reap"),
            (getTaskRunState().lastPressureReapAt = now),
            (q.cause = "memory_pressure"),
            stopShellTaskWithNotice(L, "memory_pressure"));
        } catch (error) {
          (logFeatureBad("task_local_shell_pressure_reap", "threw"), logError(error));
        }
      };
    (process.on("memoryPressure", Ae), (we = () => process.off("memoryPressure", Ae)));
  }
  return (Ee, { shellUsage: shellUsage, stopLabel: stopLabel }, Me) => {
    (we?.(), ke?.(), clearTimeout(Se));
    let We = {
      elapsed_ms: Date.now() - now,
      requested_timeout_ms: S ?? 0,
      deadline_ms: Z ?? 0,
      outcome: fromEnumOpt(q.cause ? "killed" : Ee),
      stop_cause: fromEnumOpt(q.cause ?? stopLabel?.cause),
      stopped_by: fromEnumOpt(stopLabel?.by),
      subagent_owned: y !== void 0,
      trigger: fromEnumOpt(w),
      ...buildCommandTimingFields(shellUsage),
      tool_use_id: kVt(s),
      bash_command_kinds: Me?.commandClass?.bash_command_kinds,
      bash_programs: Me?.commandClass?.bash_programs,
      bash_test_scope: Me?.commandClass?.bash_test_scope,
    };
    (orr(Me?.testOutcome, (ze) =>
      logEvent("tengu_background_shell_settled", { ...We, bash_test_outcome: ze }),
    ),
      releaseShellKeepalive(e, y, r));
  };
}

export { WEs, jEs, pVn, shouldKillShellForMemoryPressure };
