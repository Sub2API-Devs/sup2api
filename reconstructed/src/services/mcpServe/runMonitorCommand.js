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
import { zodStrictObject, o, E, A, pe, oe, T, Ue, u, U } from "../../../vendor/zod/v4/classic/schemas.js";
import { isAllPrintable } from "../../utils/truncateGraphemes.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { kI, statSession, RY, statState } from "../../utils/procStat.js";
import { getPlatform } from "../../utils/platform.js";
import { killIfUnchanged } from "../../utils/auth/lockHolderLiveness.js";
import { sleep } from "../../utils/sleep.js";
import { bringsToolHostPermissionRequest } from "../../entrypoints/mcpServe/toolOutputRequest.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../utils/errors.js";
import { antBuiltinDenyRules } from "../../utils/permissions/permissionSetup.js";
import { bashDenyRuleStrings } from "../remoteTools/returnToolOutput.js";
import { xo } from "../../bootstrap/sessionSlices.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { lit } from "../analytics/safeMetadata.js";
import { appendTaskOutputTrailer, evictTaskOutput } from "../../utils/task/diskOutput.js";

//@ chunk-pzkdz9nx.js:889-1853 placement
var RUN_MONITOR_COMMAND_CALL = "RunMonitorCommand",
  REFUSE_UNDER_OTHER_RULES = "refuse_under_other_rules",
  MONITOR_INPUT = "monitor_input",
  gt =
    "this environment read no permission settings when it started, so it can't tell which rules apply and runs no monitor. Retrying won't help.",
  yt =
    "this environment was started with a permission rule that can't be fully applied to a monitor, so it runs none, whatever the command. Retrying won't help.",
  Mt = 600000,
  Rt = 4,
  Et = 1e5,
  Tt = 64,
  xt = 1024,
  at = 33554432,
  vt = 250,
  Ot = 500,
  kt = 1500,
  It = 5,
  At = DoctorLazy(() =>
    zodStrictObject({
      command: o().min(1).max(Et).refine(isAllPrintable, "command contains control characters"),
      timeout_ms: E().int().min(1000),
      deny_rules: A(o().max(xt)).max(Tt).default([]),
      [MONITOR_INPUT]: pe(o(), oe()).optional(),
      [REFUSE_UNDER_OTHER_RULES]: T(!0),
    }),
  ),
  ee = DoctorLazy(() =>
    zodStrictObject({
      monitor_event: Ue([
        zodStrictObject({ started: T(!0) }),
        zodStrictObject({ lines: o(), suppressed: E().int().positive().optional() }),
      ]),
    }),
  ),
  ne = DoctorLazy(() =>
    u({
      ended: U(["exited", "deadline", "too_much_output", "call_ended"]),
      exitCode: E(),
      finalLines: o().optional(),
      suppressed: E().int().positive().optional(),
      outputPath: o().optional(),
    }),
  );
/**
 * 监控输出节流与洪泛检测
 */
//@ chunk-pzkdz9nx.js:1853-2109 placement
function createOutputThrottle({
  tryConsume: tryConsume,
  killAfterMs: killAfterMs,
  quietGapMs: quietGapMs,
  now: now,
  send: send,
  onFlood: onFlood,
}) {
  let n = 0,
    h,
    g = 0,
    y = !1;
  return {
    take: (M) => {
      if (y) return;
      if (tryConsume()) {
        if ((send({ lines: M, ...(n > 0 && { suppressed: n }) }), (n = 0), now() - g > quietGapMs))
          h = void 0;
        return;
      }
      if (((n += 1), (g = now()), (h ??= g), g - h > killAfterMs)) ((y = !0), onFlood());
    },
    unreported: () => n,
  };
}
//@ chunk-pzkdz9nx.js:2109-2141 placement
var Lt = new HostScoped(() => ({ running: 0 }));
/**
 * 读 /proc 中同进程组的进程
 */
//@ chunk-pzkdz9nx.js:2141-2433 placement
async function readProcessGroup(w) {
  let f = await readdir("/proc").catch(() => []),
    t = new Map(),
    i = 0;
  return (
    await Promise.all(
      f
        .filter((e) => /^\d+$/.test(e))
        .map(async (e) => {
          let a = await readFile(`/proc/${e}/stat`, "utf8").catch(() => ""),
            n = kI(a);
          if (statSession(a) === w && n !== void 0) (t.set(Number(e), n), (i += RY(statState(a)) ? 0 : 1));
        }),
    ),
    { pinned: t, alive: i }
  );
}
/**
 * 结束监控命令的进程组
 */
//@ chunk-pzkdz9nx.js:2433-2827 placement
async function killMonitorProcessGroup(w) {
  let pid = w.pid;
  if (pid <= 1) return;
  let t = async (e) => {
      if (getPlatform() !== "linux" && getPlatform() !== "wsl")
        try {
          return process.kill(-pid, e);
        } catch {
          return !1;
        }
      let { pinned: pinned, alive: alive } = await readProcessGroup(pid),
        h = pinned.get(pid);
      if (h !== void 0 && h !== w.startToken) return !1;
      if (e !== 0) await killIfUnchanged(pinned, e);
      return alive > 0;
    },
    i = await t("SIGTERM");
  for (let e = Date.now() + kt; i && Date.now() < e;) (await sleep(50), (i = await t(0)));
  for (let e = 0; i && e < It; e++) i = await t("SIGKILL");
}
/**
 * 在本机运行 RunMonitorCommand：检查规则、节流输出、超时与进程组清理。
 */
//@ chunk-pzkdz9nx.js:2827-8313 placement
async function runMonitorCommandHere(w, f, t) {
  let {
      command: command,
      timeout_ms: timeout_ms,
      deny_rules: deny_rules,
      [MONITOR_INPUT]: n,
    } = At().parse(w),
    h = bringsToolHostPermissionRequest(t.meta);
  if (n !== void 0 && !h)
    throw Error(
      "RunMonitorCommand was not run: its monitor_input goes with a ToolHost permission request that this server decides, and it brought none, or this server decides none. Retrying won't help.",
    );
  if (h && (n === void 0 || deny_rules.length > 0))
    throw Error(
      "RunMonitorCommand was not run: a ToolHost permission request goes with the monitor_input it judged, and with no rules of its own. Retrying won't help.",
    );
  let reportProgress = t.reportProgress;
  if (reportProgress === void 0)
    throw Error(
      "RunMonitorCommand was not run: the call sent no progress token, so the command's output would have nowhere to go. Call again with _meta.progressToken set.",
    );
  let launchPermissionContext = t.launchPermissionContext;
  if (launchPermissionContext === void 0)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `RunMonitorCommand was not run: ${gt}`,
      "RunMonitorCommand: read no launch settings",
    );
  let filtered = antBuiltinDenyRules().filter((l) => bashDenyRuleStrings([l]).length === 0);
  if (
    n === void 0 &&
    [launchPermissionContext.alwaysDenyRules, launchPermissionContext.alwaysAskRules]
      .flatMap((l) => Object.values(l).flatMap((c) => c ?? []))
      .some((l) => !deny_rules.includes(l) && !filtered.includes(l))
  )
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `RunMonitorCommand was not run: ${yt}`,
      "RunMonitorCommand: holds a rule that the call did not bring",
    );
  let cwd = xo(t.session).cwd,
    q = !1,
    subscribe = t.session.subscribe(() => {
      q ||= xo(t.session).cwd !== cwd;
    }),
    m,
    N,
    X;
  try {
    if (n === void 0) m = await t.checkAsServedTool(BASH_TOOL_NAME, { command: command }, deny_rules);
    else {
      let { checkMonitorRun: checkMonitorRun } = await import("./chunk-dz36xfxg.js"),
        c = await checkMonitorRun({
          name: RUN_MONITOR_COMMAND_CALL,
          meta: t.meta,
          input: n,
          command: command,
          toolUseContext: t.toolUseContext(),
          launchPermissionContext: launchPermissionContext,
        });
      if (((m = c), "claim" in c)) N = c;
    }
    X = "toolUseContext" in m ? xo(m.toolUseContext.session).cwd : cwd;
  } finally {
    subscribe();
  }
  if ("rejection" in m && n !== void 0)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      m.rejection,
      "RunMonitorCommand: refused by the ToolHost check",
    );
  if ("rejection" in m)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      m.rejection,
      "RunMonitorCommand: refused by the served Bash check",
    );
  let { session: session, abortController: abortController } = m.toolUseContext;
  if (q || xo(t.session).cwd !== cwd)
    throw Error(
      "RunMonitorCommand was not run: another call changed the working directory while this one was being checked. Send it again to have it checked where it would now start.",
    );
  let of = Lt.of(session.host);
  if (of.running >= Rt)
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
  ((of.running += 1),
    abortController_2.signal.addEventListener(
      "abort",
      () => {
        of.running -= 1;
      },
      { once: !0 },
    ));
  let Z = () => abortController.signal.aborted || t.callerGone?.aborted === !0,
    x = () => abortController_2.abort();
  (abortController.signal.addEventListener("abort", x, { once: !0 }),
    t.callerGone?.addEventListener("abort", x, { once: !0 }));
  let H = (l) => ({ summary: "stopped with its call", output: { ended: "call_ended", exitCode: l } }),
    j,
    F;
  try {
    if (Z()) return H(-1);
    let [{ exec: l }, c, { logFeatureSad: mt }, v, S] = await Promise.all([
        import("./chunk-gnfg7h3r.js"),
        import("./chunk-4dsgq5m3.js"),
        import("./chunk-53at0fec.js"),
        import("./chunk-sdtmn776.js"),
        import("./chunk-h19jf4dr.js"),
      ]),
      R = "exited",
      O,
      k = (r) => {
        if (!abortController_2.signal.aborted)
          ((R = r), (O = r === "deadline" ? streamLineBatcher.drain() : void 0), abortController_2.abort());
      },
      Q = (r) => {
        reportProgress(jsonStringify({ monitor_event: r })).catch(() => {});
      },
      tt = !1,
      et = () => {
        if (!tt) ((tt = !0), Q({ started: !0 }));
      },
      ct = (r) => {
        (et(), Q(r));
      },
      tokenBucket = S.createTokenBucket(S.BUCKET_CAPACITY, S.TOKEN_REFILL_MS),
      G = createOutputThrottle({
        tryConsume: () => tokenBucket.tryConsume(),
        killAfterMs: v.SUSTAINED_SUPPRESSION_KILL_MS,
        quietGapMs: S.TOKEN_REFILL_MS * 3,
        now: Date.now,
        send: ct,
        onFlood: () => k("too_much_output"),
      }),
      streamLineBatcher = v.createStreamLineBatcher((r) => {
        if (!abortController_2.signal.aborted) G.take(r);
      }),
      min = Math.min(timeout_ms, Mt),
      ot = 0,
      { storageV5: storageV5, sessionEnvVars: sessionEnvVars, toolUseId: toolUseId } = m.toolUseContext,
      shouldUseSandbox = c.shouldUseSandbox({ command: command }),
      sandboxPolicyRefusal = c.sandboxPolicyRefusal(shouldUseSandbox, command, !1, "bash");
    if (sandboxPolicyRefusal !== null)
      throw (
        mt("sandbox_exec", "sandbox_policy_refusal", { tool: lit("monitor") }),
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          sandboxPolicyRefusal,
          "RunMonitorCommand: refused by the sandbox policy",
        )
      );
    let s = await l(command, abortController_2.signal, "bash", {
        session: session,
        cwd: X,
        storageV5: storageV5,
        sessionEnvVars: sessionEnvVars,
        sandboxAttributionId: toolUseId,
        preventCwdChanges: !0,
        shouldUseSandbox: shouldUseSandbox,
        timeout: min + 60000,
        onStdout: (r) => {
          if (abortController_2.signal.aborted) return;
          if (((ot += r.length), ot > at)) {
            k("too_much_output");
            return;
          }
          streamLineBatcher.onData(r);
        },
      }),
      st =
        s.pid === void 0
          ? void 0
          : { pid: s.pid, startToken: kI(await readFile(`/proc/${s.pid}/stat`, "utf8").catch(() => "")) },
      P;
    try {
      let r = s.status === "completed" ? (await s.result).preSpawnError : void 0;
      if (r !== void 0)
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          r,
          "RunMonitorCommand: the shell could not be started",
        );
      if (s.status === "killed") return H(-1);
      (et(),
        s.taskOutput.spillToDisk(),
        (P = "killed"),
        (j = setTimeout(k, min, "deadline")),
        (F = setInterval(
          (_t, Ct) => {
            if (_t.totalBytes > at) Ct("too_much_output");
          },
          vt,
          s.taskOutput,
          k,
        )));
      let L = await s.result;
      if ((clearTimeout(j), clearInterval(F), !abortController_2.signal.aborted))
        await Promise.race([s.outputEnded, sleep(Ot, abortController_2.signal)]);
      if (Z()) return H(L.code);
      if (!abortController_2.signal.aborted) ((O = streamLineBatcher.drain()), abortController_2.abort());
      if (R === "exited") P = { exitCode: L.code };
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
          ...(O !== void 0 && { finalLines: O }),
          ...(G.unreported() > 0 && { suppressed: G.unreported() }),
          outputPath: s.taskOutput.path,
        },
      };
    } finally {
      if (st !== void 0) await killMonitorProcessGroup(st);
      if ((await s.taskOutput.flush(), s.cleanup(), P !== void 0)) {
        let { taskId: taskId } = s.taskOutput;
        (appendTaskOutputTrailer(taskId, P), await evictTaskOutput(taskId));
      }
    }
  } finally {
    (clearTimeout(j),
      clearInterval(F),
      abortController_2.abort(),
      N?.release(),
      abortController.signal.removeEventListener("abort", x),
      t.callerGone?.removeEventListener("abort", x));
  }
}

export { RUN_MONITOR_COMMAND_CALL, runMonitorCommandHere };
