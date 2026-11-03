/**
 * services/mcpServe/runMonitorCommand.ts
 *
 * 2.1.316 新增。在本机运行 RunMonitorCommand：检查规则、节流输出、超时与进程组清理。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-pzkdz9nx.js (6)
 * attribution: placement 6
 */
import { readdir, readFile } from "fs/promises";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  zodStrictObject,
  string,
  E,
  array,
  record,
  unknown,
  literal,
  union,
  u,
  _enum,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { isAllPrintable } from "../../utils/truncateGraphemes.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { procStatField, statSession, isMinorFaultField, statState } from "../../utils/procStat.js";
import { getPlatform } from "../../utils/platform.js";
import { killIfUnchanged } from "../../utils/auth/lockHolderLiveness.js";
import { sleep } from "../../utils/sleep.js";
import { bringsToolHostPermissionRequest } from "../../entrypoints/mcpServe/toolOutputRequest.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../utils/errors.js";
import { antBuiltinDenyRules } from "../../utils/permissions/permissionSetup.js";
import { bashDenyRuleStrings } from "../remoteTools/returnToolOutput.js";
import { getSessionProject } from "../../bootstrap/sessionSlices.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { lit } from "../analytics/safeMetadata.js";
import { appendTaskOutputTrailer, evictTaskOutput } from "../../utils/task/diskOutput.js";

//@ chunk-pzkdz9nx.js:889-1853 placement
/**
 * 监控结果的 schema。
 */
var RUN_MONITOR_COMMAND_CALL = "RunMonitorCommand";
var REFUSE_UNDER_OTHER_RULES = "refuse_under_other_rules";
var MONITOR_INPUT = "monitor_input";
var NO_PERMISSION_SETTINGS_TEXT =
  "this environment read no permission settings when it started, so it can't tell which rules apply and runs no monitor. Retrying won't help.";
var UNREPRESENTABLE_RULES_TEXT =
  "this environment was started with a permission rule that can't be fully applied to a monitor, so it runs none, whatever the command. Retrying won't help.";
var MAX_MONITOR_TIMEOUT_MS = 600000;
var MAX_CONCURRENT_MONITORS = 4;
var MAX_COMMAND_CHARS = 1e5;
var MAX_DENY_RULES = 64;
var MAX_DENY_RULE_CHARS = 1024;
var MAX_OUTPUT_BYTES = 33554432;
var MIN_SIGINT_WAIT_MS = 250;
var SIGTERM_WAIT_MS = 500;
var KILL_WAIT_MS = 1500;
var MAX_SIGKILL_ROUNDS = 5;
var runMonitorCommandInputSchema = DoctorLazy(() =>
  zodStrictObject({
    command: string()
      .min(1)
      .max(MAX_COMMAND_CHARS)
      .refine(isAllPrintable, "command contains control characters"),
    timeout_ms: E().int().min(1000),
    deny_rules: array(string().max(MAX_DENY_RULE_CHARS)).max(MAX_DENY_RULES).default([]),
    [MONITOR_INPUT]: record(string(), unknown()).optional(),
    [REFUSE_UNDER_OTHER_RULES]: literal(true),
  }),
);
var monitorEventSchema = DoctorLazy(() =>
  zodStrictObject({
    monitor_event: union([
      zodStrictObject({
        started: literal(true),
      }),
      zodStrictObject({
        lines: string(),
        suppressed: E().int().positive().optional(),
      }),
    ]),
  }),
);
var monitorResultSchema = DoctorLazy(() =>
  u({
    ended: _enum(["exited", "deadline", "too_much_output", "call_ended"]),
    exitCode: E(),
    finalLines: string().optional(),
    suppressed: E().int().positive().optional(),
    outputPath: string().optional(),
  }),
);
//@ chunk-pzkdz9nx.js:1853-2109 placement
/**
 * 监控输出节流与洪泛检测
 */
function createOutputThrottle({ tryConsume, killAfterMs, quietGapMs, now, send, onFlood }) {
  let n = 0;
  let h;
  let g = 0;
  let y = false;
  return {
    take: (lines) => {
      if (y) return;
      if (tryConsume()) {
        send({
          lines,
          ...(n > 0 && {
            suppressed: n,
          }),
        });
        n = 0;
        if (now() - g > quietGapMs) h = undefined;
        return;
      }
      n += 1;
      g = now();
      h ??= g;
      if (g - h > killAfterMs) {
        y = true;
        onFlood();
      }
    },
    unreported: () => n,
  };
}
//@ chunk-pzkdz9nx.js:2109-2141 placement
/**
 * 按宿主统计的运行中监控数。
 */
var monitorCountByHost = new HostScoped(() => ({
  running: 0,
}));
//@ chunk-pzkdz9nx.js:2141-2433 placement
/**
 * 读 /proc 中同进程组的进程
 */
async function readProcessGroup(pid) {
  let f = await readdir("/proc").catch(() => []);
  let t = new Map();
  let alive = 0;
  await Promise.all(
    f
      .filter((e) => /^\d+$/.test(e))
      .map(async (e) => {
        let a = await readFile(`/proc/${e}/stat`, "utf8").catch(() => "");
        let n = procStatField(a);
        if (statSession(a) === pid && n !== undefined) {
          t.set(Number(e), n);
          alive += isMinorFaultField(statState(a)) ? 0 : 1;
        }
      }),
  );
  return {
    pinned: t,
    alive,
  };
}
//@ chunk-pzkdz9nx.js:2433-2827 placement
/**
 * 结束监控命令的进程组
 */
async function killMonitorProcessGroup(w) {
  let pid = w.pid;
  if (pid <= 1) return;
  let t = async (e) => {
    if (getPlatform() !== "linux" && getPlatform() !== "wsl")
      try {
        return process.kill(-pid, e);
      } catch {
        return false;
      }
    let { pinned, alive } = await readProcessGroup(pid);
    let h = pinned.get(pid);
    if (h !== undefined && h !== w.startToken) return false;
    if (e !== 0) await killIfUnchanged(pinned, e);
    return alive > 0;
  };
  let i = await t("SIGTERM");
  for (let e = Date.now() + KILL_WAIT_MS; i && Date.now() < e;) {
    await sleep(50);
    i = await t(0);
  }
  for (let j = 0; i && j < MAX_SIGKILL_ROUNDS; j++) i = await t("SIGKILL");
}
//@ chunk-pzkdz9nx.js:2827-8313 placement
/**
 * 在本机运行 RunMonitorCommand：检查规则、节流输出、超时与进程组清理。
 */
async function runMonitorCommandHere(w, f, t) {
  let {
    command,
    timeout_ms: timeoutMs,
    deny_rules: denyRules,
    [MONITOR_INPUT]: n,
  } = runMonitorCommandInputSchema().parse(w);
  let h = bringsToolHostPermissionRequest(t.meta);
  if (n !== undefined && !h)
    throw Error(
      "RunMonitorCommand was not run: its monitor_input goes with a ToolHost permission request that this server decides, and it brought none, or this server decides none. Retrying won't help.",
    );
  if (h && (n === undefined || denyRules.length > 0))
    throw Error(
      "RunMonitorCommand was not run: a ToolHost permission request goes with the monitor_input it judged, and with no rules of its own. Retrying won't help.",
    );
  let reportProgress = t.reportProgress;
  if (reportProgress === undefined)
    throw Error(
      "RunMonitorCommand was not run: the call sent no progress token, so the command's output would have nowhere to go. Call again with _meta.progressToken set.",
    );
  let launchPermissionContext = t.launchPermissionContext;
  if (launchPermissionContext === undefined)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `RunMonitorCommand was not run: ${NO_PERMISSION_SETTINGS_TEXT}`,
      "RunMonitorCommand: read no launch settings",
    );
  let filtered = antBuiltinDenyRules().filter((l) => bashDenyRuleStrings([l]).length === 0);
  if (
    n === undefined &&
    [launchPermissionContext.alwaysDenyRules, launchPermissionContext.alwaysAskRules]
      .flatMap((l) => Object.values(l).flatMap((c) => c ?? []))
      .some((l) => !denyRules.includes(l) && !filtered.includes(l))
  )
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `RunMonitorCommand was not run: ${UNREPRESENTABLE_RULES_TEXT}`,
      "RunMonitorCommand: holds a rule that the call did not bring",
    );
  let cwd = getSessionProject(t.session).cwd;
  let q = false;
  let lt = t.session.subscribe(() => {
    q ||= getSessionProject(t.session).cwd !== cwd;
  });
  let m;
  let N;
  let cwd_2;
  try {
    if (n === undefined)
      m = await t.checkAsServedTool(
        BASH_TOOL_NAME,
        {
          command,
        },
        denyRules,
      );
    else {
      let { checkMonitorRun } = await import("./chunk-dz36xfxg.js");
      let c = await checkMonitorRun({
        name: RUN_MONITOR_COMMAND_CALL,
        meta: t.meta,
        input: n,
        command,
        toolUseContext: t.toolUseContext(),
        launchPermissionContext,
      });
      m = c;
      if ("claim" in c) N = c;
    }
    cwd_2 = "toolUseContext" in m ? getSessionProject(m.toolUseContext.session).cwd : cwd;
  } finally {
    lt();
  }
  if ("rejection" in m && n !== undefined)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      m.rejection,
      "RunMonitorCommand: refused by the ToolHost check",
    );
  if ("rejection" in m)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      m.rejection,
      "RunMonitorCommand: refused by the served Bash check",
    );
  let { session, abortController } = m.toolUseContext;
  if (q || getSessionProject(t.session).cwd !== cwd)
    throw Error(
      "RunMonitorCommand was not run: another call changed the working directory while this one was being checked. Send it again to have it checked where it would now start.",
    );
  let D = monitorCountByHost.of(session.host);
  if (D.running >= MAX_CONCURRENT_MONITORS)
    throw Error(
      "RunMonitorCommand was not run: this environment already runs as many monitors as it allows at once. Stop one first.",
    );
  let V = N?.claim();
  if (V === "barred")
    throw Error(
      "RunMonitorCommand was not run: this session was already told that this call had not started, so it can no longer run. Send a new call.",
    );
  if (V === "started_before")
    throw Error(
      "RunMonitorCommand was not run again: this very call was already started here once. Check what it did before you send a new call.",
    );
  let abortController_2 = new AbortController();
  D.running += 1;
  abortController_2.signal.addEventListener(
    "abort",
    () => {
      D.running -= 1;
    },
    {
      once: true,
    },
  );
  let Z = () => abortController.signal.aborted || t.callerGone?.aborted === true;
  let x = () => abortController_2.abort();
  abortController.signal.addEventListener("abort", x, {
    once: true,
  });
  t.callerGone?.addEventListener("abort", x, {
    once: true,
  });
  let H = (exitCode) => ({
    summary: "stopped with its call",
    output: {
      ended: "call_ended",
      exitCode,
    },
  });
  let j;
  let F;
  try {
    if (Z()) return H(-1);
    let [{ exec: l }, c, { logFeatureSad: mt }, v, S] = await Promise.all([
      import("./chunk-gnfg7h3r.js"),
      import("./chunk-4dsgq5m3.js"),
      import("./chunk-53at0fec.js"),
      import("./chunk-sdtmn776.js"),
      import("./chunk-h19jf4dr.js"),
    ]);
    let R = "exited";
    let O;
    let k = (r) => {
      if (!abortController_2.signal.aborted) {
        R = r;
        O = r === "deadline" ? streamLineBatcher.drain() : undefined;
        abortController_2.abort();
      }
    };
    let Q = (monitorEvent) => {
      reportProgress(
        jsonStringify({
          monitor_event: monitorEvent,
        }),
      ).catch(() => {});
    };
    let tt = false;
    let et = () => {
      if (!tt) {
        tt = true;
        Q({
          started: true,
        });
      }
    };
    let send = (monitorEvent) => {
      et();
      Q(monitorEvent);
    };
    let tokenBucket = S.createTokenBucket(S.BUCKET_CAPACITY, S.TOKEN_REFILL_MS);
    let outputThrottle = createOutputThrottle({
      tryConsume: () => tokenBucket.tryConsume(),
      killAfterMs: v.SUSTAINED_SUPPRESSION_KILL_MS,
      quietGapMs: S.TOKEN_REFILL_MS * 3,
      now: Date.now,
      send,
      onFlood: () => k("too_much_output"),
    });
    let streamLineBatcher = v.createStreamLineBatcher((r) => {
      if (!abortController_2.signal.aborted) outputThrottle.take(r);
    });
    let min = Math.min(timeoutMs, MAX_MONITOR_TIMEOUT_MS);
    let ot = 0;
    let { storageV5, sessionEnvVars, toolUseId } = m.toolUseContext;
    let rt = c.shouldUseSandbox({
      command,
    });
    let it = c.sandboxPolicyRefusal(rt, command, false, "bash");
    if (it !== null) {
      mt("sandbox_exec", "sandbox_policy_refusal", {
        tool: lit("monitor"),
      });
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        it,
        "RunMonitorCommand: refused by the sandbox policy",
      );
    }
    let s = await l(command, abortController_2.signal, "bash", {
      session,
      cwd: cwd_2,
      storageV5,
      sessionEnvVars,
      sandboxAttributionId: toolUseId,
      preventCwdChanges: true,
      shouldUseSandbox: rt,
      timeout: min + 60000,
      onStdout: (r) => {
        if (abortController_2.signal.aborted) return;
        ot += r.length;
        if (ot > MAX_OUTPUT_BYTES) {
          k("too_much_output");
          return;
        }
        streamLineBatcher.onData(r);
      },
    });
    let st =
      s.pid === undefined
        ? undefined
        : {
            pid: s.pid,
            startToken: procStatField(await readFile(`/proc/${s.pid}/stat`, "utf8").catch(() => "")),
          };
    let P;
    try {
      let preSpawnError = s.status === "completed" ? (await s.result).preSpawnError : undefined;
      if (preSpawnError !== undefined)
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          preSpawnError,
          "RunMonitorCommand: the shell could not be started",
        );
      if (s.status === "killed") return H(-1);
      et();
      s.taskOutput.spillToDisk();
      P = "killed";
      j = setTimeout(k, min, "deadline");
      F = setInterval(
        (_t, Ct) => {
          if (_t.totalBytes > MAX_OUTPUT_BYTES) Ct("too_much_output");
        },
        MIN_SIGINT_WAIT_MS,
        s.taskOutput,
        k,
      );
      let L = await s.result;
      clearTimeout(j);
      clearInterval(F);
      if (!abortController_2.signal.aborted)
        await Promise.race([s.outputEnded, sleep(SIGTERM_WAIT_MS, abortController_2.signal)]);
      if (Z()) return H(L.code);
      if (!abortController_2.signal.aborted) {
        O = streamLineBatcher.drain();
        abortController_2.abort();
      }
      if (R === "exited")
        P = {
          exitCode: L.code,
        };
      return {
        summary:
          R === "exited"
            ? `exit ${L.code}`
            : R === "deadline"
              ? "stopped at its time limit"
              : "stopped for printing too much",
        output: {
          ended: R,
          exitCode: L.code,
          ...(O !== undefined && {
            finalLines: O,
          }),
          ...(outputThrottle.unreported() > 0 && {
            suppressed: outputThrottle.unreported(),
          }),
          outputPath: s.taskOutput.path,
        },
      };
    } finally {
      if (st !== undefined) await killMonitorProcessGroup(st);
      await s.taskOutput.flush();
      s.cleanup();
      if (P !== undefined) {
        let { taskId } = s.taskOutput;
        appendTaskOutputTrailer(taskId, P);
        await evictTaskOutput(taskId);
      }
    }
  } finally {
    clearTimeout(j);
    clearInterval(F);
    abortController_2.abort();
    N?.release();
    abortController.signal.removeEventListener("abort", x);
    t.callerGone?.removeEventListener("abort", x);
  }
}
export { RUN_MONITOR_COMMAND_CALL, runMonitorCommandHere };
