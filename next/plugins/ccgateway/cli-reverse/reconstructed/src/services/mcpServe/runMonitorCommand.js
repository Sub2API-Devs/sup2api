/**
 * services/mcpServe/runMonitorCommand.ts
 *
 * 2.1.316 新增。在本机运行 RunMonitorCommand：检查规则、节流输出、超时与进程组清理。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-wdedvd7d.js (6)
 * attribution: placement 6
 */
import { readdir, readFile } from "fs/promises";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  zodStrictObject,
  stringSchema,
  numberSchema,
  array,
  record,
  unknown,
  literal,
  union,
  objectSchema,
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

//@ chunk-wdedvd7d.js:888-1852 placement
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
    command: stringSchema()
      .min(1)
      .max(MAX_COMMAND_CHARS)
      .refine(isAllPrintable, "command contains control characters"),
    timeout_ms: numberSchema().int().min(1000),
    deny_rules: array(stringSchema().max(MAX_DENY_RULE_CHARS)).max(MAX_DENY_RULES).default([]),
    [MONITOR_INPUT]: record(stringSchema(), unknown()).optional(),
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
        lines: stringSchema(),
        suppressed: numberSchema().int().positive().optional(),
      }),
    ]),
  }),
);
var monitorResultSchema = DoctorLazy(() =>
  objectSchema({
    ended: _enum(["exited", "deadline", "too_much_output", "call_ended"]),
    exitCode: numberSchema(),
    finalLines: stringSchema().optional(),
    suppressed: numberSchema().int().positive().optional(),
    outputPath: stringSchema().optional(),
  }),
);
//@ chunk-wdedvd7d.js:1852-2108 placement
/**
 * 监控输出节流与洪泛检测
 */
function createOutputThrottle({ tryConsume, killAfterMs, quietGapMs, now, send, onFlood }) {
  let suppressedCount = 0;
  let firstFloodAt;
  let lastFloodAt = 0;
  let flooded = false;
  return {
    take: (lines) => {
      if (flooded) return;
      if (tryConsume()) {
        send({
          lines,
          ...(suppressedCount > 0 && {
            suppressed: suppressedCount,
          }),
        });
        suppressedCount = 0;
        if (now() - lastFloodAt > quietGapMs) firstFloodAt = undefined;
        return;
      }
      suppressedCount += 1;
      lastFloodAt = now();
      firstFloodAt ??= lastFloodAt;
      if (lastFloodAt - firstFloodAt > killAfterMs) {
        flooded = true;
        onFlood();
      }
    },
    unreported: () => suppressedCount,
  };
}
//@ chunk-wdedvd7d.js:2108-2140 placement
/**
 * 按宿主统计的运行中监控数。
 */
var monitorCountByHost = new HostScoped(() => ({
  running: 0,
}));
//@ chunk-wdedvd7d.js:2140-2431 placement
/**
 * 读 /proc 中同进程组的进程
 */
async function readProcessGroup(pid) {
  let pidEntries = await readdir("/proc").catch(() => []);
  let pinnedByPid = new Map();
  let alive = 0;
  await Promise.all(
    pidEntries
      .filter((pidText) => /^\d+$/.test(pidText))
      .map(async (pidText) => {
        let statText = await readFile(`/proc/${pidText}/stat`, "utf8").catch(() => "");
        let startToken = procStatField(statText);
        if (statSession(statText) === pid && startToken !== undefined) {
          pinnedByPid.set(Number(pidText), startToken);
          alive += isMinorFaultField(statState(statText)) ? 0 : 1;
        }
      }),
  );
  return {
    pinned: pinnedByPid,
    alive,
  };
}
//@ chunk-wdedvd7d.js:2431-2825 placement
/**
 * 结束监控命令的进程组
 */
async function killMonitorProcessGroup(target) {
  let pid = target.pid;
  if (pid <= 1) return;
  let signalGroup = async (signal) => {
    if (getPlatform() !== "linux" && getPlatform() !== "wsl")
      try {
        return process.kill(-pid, signal);
      } catch {
        return false;
      }
    let { pinned, alive } = await readProcessGroup(pid);
    let leaderStartToken = pinned.get(pid);
    if (leaderStartToken !== undefined && leaderStartToken !== target.startToken) return false;
    if (signal !== 0) await killIfUnchanged(pinned, signal);
    return alive > 0;
  };
  let alive = await signalGroup("SIGTERM");
  for (let deadline = Date.now() + KILL_WAIT_MS; alive && Date.now() < deadline;) {
    await sleep(50);
    alive = await signalGroup(0);
  }
  for (let j = 0; alive && j < MAX_SIGKILL_ROUNDS; j++) alive = await signalGroup("SIGKILL");
}
//@ chunk-wdedvd7d.js:2825-8311 placement
/**
 * 在本机运行 RunMonitorCommand：检查规则、节流输出、超时与进程组清理。
 */
async function runMonitorCommandHere(input, signal, context) {
  let {
    command,
    timeout_ms: timeoutMs,
    deny_rules: denyRules,
    [MONITOR_INPUT]: monitorInput,
  } = runMonitorCommandInputSchema().parse(input);
  let toolHostDecides = bringsToolHostPermissionRequest(context.meta);
  if (monitorInput !== undefined && !toolHostDecides)
    throw Error(
      "RunMonitorCommand was not run: its monitor_input goes with a ToolHost permission request that this server decides, and it brought none, or this server decides none. Retrying won't help.",
    );
  if (toolHostDecides && (monitorInput === undefined || denyRules.length > 0))
    throw Error(
      "RunMonitorCommand was not run: a ToolHost permission request goes with the monitor_input it judged, and with no rules of its own. Retrying won't help.",
    );
  let reportProgress = context.reportProgress;
  if (reportProgress === undefined)
    throw Error(
      "RunMonitorCommand was not run: the call sent no progress token, so the command's output would have nowhere to go. Call again with _meta.progressToken set.",
    );
  let launchPermissionContext = context.launchPermissionContext;
  if (launchPermissionContext === undefined)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `RunMonitorCommand was not run: ${NO_PERMISSION_SETTINGS_TEXT}`,
      "RunMonitorCommand: read no launch settings",
    );
  let filtered = antBuiltinDenyRules().filter((rule) => bashDenyRuleStrings([rule]).length === 0);
  if (
    monitorInput === undefined &&
    [launchPermissionContext.alwaysDenyRules, launchPermissionContext.alwaysAskRules]
      .flatMap((ruleSet) => Object.values(ruleSet).flatMap((rules) => rules ?? []))
      .some((rule) => !denyRules.includes(rule) && !filtered.includes(rule))
  )
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `RunMonitorCommand was not run: ${UNREPRESENTABLE_RULES_TEXT}`,
      "RunMonitorCommand: holds a rule that the call did not bring",
    );
  let cwd = getSessionProject(context.session).cwd;
  let cwdMoved = false;
  let unsubscribe = context.session.subscribe(() => {
    cwdMoved ||= getSessionProject(context.session).cwd !== cwd;
  });
  let check;
  let claim;
  let cwd_2;
  try {
    if (monitorInput === undefined)
      check = await context.checkAsServedTool(
        BASH_TOOL_NAME,
        {
          command,
        },
        denyRules,
      );
    else {
      let { checkMonitorRun } = await import("../../entrypoints/mcpServe/checkMonitorRun.lazy.js");
      let checked = await checkMonitorRun({
        name: RUN_MONITOR_COMMAND_CALL,
        meta: context.meta,
        input: monitorInput,
        command,
        toolUseContext: context.toolUseContext(),
        launchPermissionContext,
      });
      check = checked;
      if ("claim" in checked) claim = checked;
    }
    cwd_2 = "toolUseContext" in check ? getSessionProject(check.toolUseContext.session).cwd : cwd;
  } finally {
    unsubscribe();
  }
  if ("rejection" in check && monitorInput !== undefined)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      check.rejection,
      "RunMonitorCommand: refused by the ToolHost check",
    );
  if ("rejection" in check)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      check.rejection,
      "RunMonitorCommand: refused by the served Bash check",
    );
  let { session, abortController } = check.toolUseContext;
  if (cwdMoved || getSessionProject(context.session).cwd !== cwd)
    throw Error(
      "RunMonitorCommand was not run: another call changed the working directory while this one was being checked. Send it again to have it checked where it would now start.",
    );
  let monitorCount = monitorCountByHost.of(session.host);
  if (monitorCount.running >= MAX_CONCURRENT_MONITORS)
    throw Error(
      "RunMonitorCommand was not run: this environment already runs as many monitors as it allows at once. Stop one first.",
    );
  let claimResult = claim?.claim();
  if (claimResult === "barred")
    throw Error(
      "RunMonitorCommand was not run: this session was already told that this call had not started, so it can no longer run. Send a new call.",
    );
  if (claimResult === "started_before")
    throw Error(
      "RunMonitorCommand was not run again: this very call was already started here once. Check what it did before you send a new call.",
    );
  let abortController_2 = new AbortController();
  monitorCount.running += 1;
  abortController_2.signal.addEventListener(
    "abort",
    () => {
      monitorCount.running -= 1;
    },
    {
      once: true,
    },
  );
  let isCancelled = () => abortController.signal.aborted || context.callerGone?.aborted === true;
  let cancelMonitor = () => abortController_2.abort();
  abortController.signal.addEventListener("abort", cancelMonitor, {
    once: true,
  });
  context.callerGone?.addEventListener("abort", cancelMonitor, {
    once: true,
  });
  let stoppedWithCall = (exitCode) => ({
    summary: "stopped with its call",
    output: {
      ended: "call_ended",
      exitCode,
    },
  });
  let deadlineTimer;
  let outputSizeTimer;
  try {
    if (isCancelled()) return stoppedWithCall(-1);
    let [{ exec: execModule }, sandboxModule, { logFeatureSad: logSad }, batcherModule, bucketModule] =
      await Promise.all([
        import("../../utils/Shell.js"),
        import("../../tools/BashTool/shouldUseSandbox.js"),
        import("../analytics/featureTelemetry.js"),
        import("../../tasks/MonitorTask/monitorDelivery.js"),
        import("../../utils/tokenBucket.js"),
      ]);
    let endReason = "exited";
    let finalLines;
    let stopMonitor = (reason) => {
      if (!abortController_2.signal.aborted) {
        endReason = reason;
        finalLines = reason === "deadline" ? streamLineBatcher.drain() : undefined;
        abortController_2.abort();
      }
    };
    let sendEvent = (monitorEvent) => {
      reportProgress(
        jsonStringify({
          monitor_event: monitorEvent,
        }),
      ).catch(() => {});
    };
    let started = false;
    let ensureStarted = () => {
      if (!started) {
        started = true;
        sendEvent({
          started: true,
        });
      }
    };
    let send = (monitorEvent) => {
      ensureStarted();
      sendEvent(monitorEvent);
    };
    let tokenBucket = bucketModule.createTokenBucket(
      bucketModule.BUCKET_CAPACITY,
      bucketModule.TOKEN_REFILL_MS,
    );
    let outputThrottle = createOutputThrottle({
      tryConsume: () => tokenBucket.tryConsume(),
      killAfterMs: batcherModule.SUSTAINED_SUPPRESSION_KILL_MS,
      quietGapMs: bucketModule.TOKEN_REFILL_MS * 3,
      now: Date.now,
      send,
      onFlood: () => stopMonitor("too_much_output"),
    });
    let streamLineBatcher = batcherModule.createStreamLineBatcher((lines) => {
      if (!abortController_2.signal.aborted) outputThrottle.take(lines);
    });
    let min = Math.min(timeoutMs, MAX_MONITOR_TIMEOUT_MS);
    let totalOutputBytes = 0;
    let { storageV5, sessionEnvVars, toolUseId } = check.toolUseContext;
    let useSandbox = sandboxModule.shouldUseSandbox({
      command,
    });
    let sandboxRefusal = sandboxModule.sandboxPolicyRefusal(useSandbox, command, false, "bash");
    if (sandboxRefusal !== null) {
      logSad("sandbox_exec", "sandbox_policy_refusal", {
        tool: lit("monitor"),
      });
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        sandboxRefusal,
        "RunMonitorCommand: refused by the sandbox policy",
      );
    }
    let task = await execModule(command, abortController_2.signal, "bash", {
      session,
      cwd: cwd_2,
      storageV5,
      sessionEnvVars,
      sandboxAttributionId: toolUseId,
      preventCwdChanges: true,
      shouldUseSandbox: useSandbox,
      timeout: min + 60000,
      onStdout: (chunk) => {
        if (abortController_2.signal.aborted) return;
        totalOutputBytes += chunk.length;
        if (totalOutputBytes > MAX_OUTPUT_BYTES) {
          stopMonitor("too_much_output");
          return;
        }
        streamLineBatcher.onData(chunk);
      },
    });
    let processGroup =
      task.pid === undefined
        ? undefined
        : {
            pid: task.pid,
            startToken: procStatField(await readFile(`/proc/${task.pid}/stat`, "utf8").catch(() => "")),
          };
    let trailer;
    try {
      let preSpawnError = task.status === "completed" ? (await task.result).preSpawnError : undefined;
      if (preSpawnError !== undefined)
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          preSpawnError,
          "RunMonitorCommand: the shell could not be started",
        );
      if (task.status === "killed") return stoppedWithCall(-1);
      ensureStarted();
      task.taskOutput.spillToDisk();
      trailer = "killed";
      deadlineTimer = setTimeout(stopMonitor, min, "deadline");
      outputSizeTimer = setInterval(
        (taskOutput, stop) => {
          if (taskOutput.totalBytes > MAX_OUTPUT_BYTES) stop("too_much_output");
        },
        MIN_SIGINT_WAIT_MS,
        task.taskOutput,
        stopMonitor,
      );
      let result = await task.result;
      clearTimeout(deadlineTimer);
      clearInterval(outputSizeTimer);
      if (!abortController_2.signal.aborted)
        await Promise.race([task.outputEnded, sleep(SIGTERM_WAIT_MS, abortController_2.signal)]);
      if (isCancelled()) return stoppedWithCall(result.code);
      if (!abortController_2.signal.aborted) {
        finalLines = streamLineBatcher.drain();
        abortController_2.abort();
      }
      if (endReason === "exited")
        trailer = {
          exitCode: result.code,
        };
      return {
        summary:
          endReason === "exited"
            ? `exit ${result.code}`
            : endReason === "deadline"
              ? "stopped at its time limit"
              : "stopped for printing too much",
        output: {
          ended: endReason,
          exitCode: result.code,
          ...(finalLines !== undefined && {
            finalLines,
          }),
          ...(outputThrottle.unreported() > 0 && {
            suppressed: outputThrottle.unreported(),
          }),
          outputPath: task.taskOutput.path,
        },
      };
    } finally {
      if (processGroup !== undefined) await killMonitorProcessGroup(processGroup);
      await task.taskOutput.flush();
      task.cleanup();
      if (trailer !== undefined) {
        let { taskId } = task.taskOutput;
        appendTaskOutputTrailer(taskId, trailer);
        await evictTaskOutput(taskId);
      }
    }
  } finally {
    clearTimeout(deadlineTimer);
    clearInterval(outputSizeTimer);
    abortController_2.abort();
    claim?.release();
    abortController.signal.removeEventListener("abort", cancelMonitor);
    context.callerGone?.removeEventListener("abort", cancelMonitor);
  }
}
export { RUN_MONITOR_COMMAND_CALL, runMonitorCommandHere };
