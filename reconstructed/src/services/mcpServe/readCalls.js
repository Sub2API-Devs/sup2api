/**
 * services/mcpServe/readCalls.ts
 *
 * 2.1.316 新增：mcp serve 的 ReadCalls：记录调用运行状态与结果，支持停止/迁移后台命令。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-m8aeec95.js (22)
 * attribution: placement 22
 */
import { randomUUID, randomUUID as randomUUID_2, randomUUID as randomUUID_3 } from "crypto";
import { join, join as join_2 } from "path";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { zodStrictObject, E, o, A, oe, u, T, Ir, U } from "../../../vendor/zod/v4/classic/schemas.js";
import { isPlainObject as isPlainObject_2 } from "../../utils/isPlainObject.js";
import { getOwn } from "../../utils/objectSafety.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  errorMessage,
  toError,
} from "../../utils/errors.js";
import { isTaskIdOfType } from "../../Task.js";
import {
  isTaskOutputPathFor,
  getTaskOutputPath,
  appendTaskOutput,
  evictTaskOutput,
} from "../../utils/task/diskOutput.js";
import { mcpServeCallState, pe, setWithEviction, toolUseIdSchema } from "./callClaims.js";
import { je, ContainerStartRecord } from "./containerStart.js";
import { createSignal } from "../../utils/signal.js";
import { logForDebugging } from "../../utils/debug.js";
import { env } from "../../utils/env.js";
import { logEvent } from "../analytics/index.js";
import { registerCleanup } from "../../utils/cleanupRegistry.js";
import { fromEnum, lit, fromEnumOpt } from "../analytics/safeMetadata.js";
import { logFeatureBad, logFeatureOk, logFeatureSad } from "../analytics/featureTelemetry.js";
import { zbn } from "../../tools/BashTool/prompt.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import {
  classifyBackgroundCommand,
  buildCommandTimingFields,
  orr,
} from "../../tools/BashTool/bashTelemetry.js";
import { logError } from "../../utils/log.js";
import { kVt } from "../../tasks/LocalShellTask/backgroundNotices.js";
import { DEFAULT_INSTRUCTIONS } from "../../commands/ultraplan.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { mn } from "../../utils/remoteEnvironment.js";
import { isBackgroundTasksDisabled } from "../../tools/AgentTool/AgentTool.js";
import { Sx } from "../../utils/tempDirRealpaths.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { createCombinedAbortSignal } from "../../utils/combinedAbortSignal.js";
import { count } from "../../utils/collections.js";

/**
 * ReadCalls 的上限与输入结构（seen、life、hold_ms、told、tool_use_ids、接口版本）。
 */
//@ chunk-m8aeec95.js:1563-1838 placement
var MAX_READ_CALLS_HOLD_MS = 240000,
  MAX_TOLD_ENTRIES = 32,
  MAX_TOOL_USE_IDS = 32,
  readCallsInputSchema = DoctorLazy(() =>
    zodStrictObject({
      seen: E().int().min(0).optional(),
      life: o().max(64).optional(),
      hold_ms: E().int().min(0).max(MAX_READ_CALLS_HOLD_MS).optional(),
      told: A(o().max(64)).max(MAX_TOLD_ENTRIES).optional(),
      tool_use_ids: A(o().min(1).max(256)).max(MAX_TOOL_USE_IDS).optional(),
      tool_host_interface: oe().optional(),
    }),
  );
/**
 * 校验 ReadCalls 输入：told 与 tool_use_ids 列表不能超过上限（超出抛出遥测安全错误），再按 schema 解析。
 */
//@ chunk-m8aeec95.js:1838-2140 placement
function parseReadCallsInput(e) {
  let n = { told: MAX_TOLD_ENTRIES, tool_use_ids: MAX_TOOL_USE_IDS },
    r = isPlainObject_2(e)
      ? Object.entries(n).find(([s, y]) => {
          let h = getOwn(e, s);
          return Array.isArray(h) && h.length > y;
        })
      : void 0;
  if (r !== void 0) {
    let [s, y] = r;
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `ReadCalls: ${s} has more than ${y} entries`,
      "ReadCalls: a list has more entries than are taken",
    );
  }
  return readCallsInputSchema().parse(e);
}
/**
 * 调用记录文件的常量（保留时长、上限、扩展名 .json）与记录结构 v1（container_start、listed 任务、起止时间、结束方式 exited/time_limit/stopped/killed）。
 */
//@ chunk-m8aeec95.js:2338-3042 placement
var CALL_RECORD_TICK_MS = 60000,
  MAX_CALL_RECORDS = 256,
  CALL_RECORD_RETENTION_MS = 604800000,
  MAX_CALL_RECORD_SCAN = 4 * MAX_CALL_RECORDS,
  MAX_CALL_RECORD_BATCH = 16,
  MAX_CALL_RECORD_BYTES = 32768,
  CALL_RECORD_EXT = ".json",
  callRecordSchema = DoctorLazy(() => {
    let max = E().int().min(0).max(Number.MAX_SAFE_INTEGER);
    return u({
      v: T(1),
      container_start: o().min(1).max(64),
      listed: u({
        taskId: o().refine((n) => isTaskIdOfType("local_bash", n)),
        output_path: o().max(4096),
        limit_ms: E().min(0).max(Number.MAX_SAFE_INTEGER),
      }).transform((n) => (isTaskOutputPathFor(n.taskId, n.output_path) ? n : { ...n, output_path: "" })),
      started_at: max,
      written_at: max,
      ended: u({
        how: Ir("state", [
          u({ state: T("exited"), exit_code: E().int() }),
          u({ state: T("time_limit") }),
          u({ state: T("stopped"), stopped_by: T("session") }),
          u({
            state: T("killed"),
            reason: U(["daemon_exit", "output_limit", "container_stopped"])
              .optional()
              .catch(void 0),
          }),
        ]).catch({ state: "killed" }),
        at: max,
      }).optional(),
    });
  });
//@ chunk-m8aeec95.js:8490-8788 placement
function describeRunState(e, n) {
  let of = mcpServeCallState.of(e),
    s = of.runningRuns.get(n);
  if (s !== void 0) return { state: "running", since_ms: Math.round(of.now() - s) };
  if (of.finishedRuns.has(n)) return { state: "finished" };
  if (!of.barredRuns.has(n))
    of.newestDropped = pe(of.newestDropped, setWithEviction(of.barredRuns, n, je, of.now()));
  return { state: "unknown", barred: !0 };
}
//@ chunk-m8aeec95.js:8788-8840 placement
function isCallRunBarred(e, n) {
  return mcpServeCallState.of(e).barredRuns.has(n);
}
//@ chunk-m8aeec95.js:8840-8927 placement
function kTs(e, n) {
  let { runningRuns: runningRuns, finishedRuns: finishedRuns } = mcpServeCallState.of(e);
  return runningRuns.has(n) || finishedRuns.has(n);
}
//@ chunk-m8aeec95.js:8927-8979 placement
function he(e, n) {
  return mcpServeCallState.of(e).runningRuns.has(n);
}
//@ chunk-m8aeec95.js:8979-9034 placement
function ge(e, n) {
  return mcpServeCallState.of(e).runEnded.subscribe(n);
}
//@ chunk-m8aeec95.js:9034-9088 placement
function ye(e) {
  return [...mcpServeCallState.of(e).runningRuns.keys()];
}
//@ chunk-m8aeec95.js:9088-9182 placement
function Re(e) {
  let { newestDropped: newestDropped, now: now } = mcpServeCallState.of(e);
  return newestDropped === void 0 ? void 0 : Math.round(now() - newestDropped);
}
//@ chunk-m8aeec95.js:13591-13713 placement
var READ_CALLS_CALL = "ReadCalls",
  STOP_BACKGROUND_COMMAND_CALL = "StopBackgroundCommand",
  MOVE_RUNNING_COMMAND_CALL = "MoveRunningCommand",
  lt = 3 * MAX_TOLD_ENTRIES,
  ve = 1000,
  ANTHROPIC_BACKGROUNDCOMMANDS = "anthropic/backgroundCommands";
//@ chunk-m8aeec95.js:13713-13778 placement
function keepsBackgroundCommandsCapability(e) {
  return { experimental: { [ANTHROPIC_BACKGROUNDCOMMANDS]: { v: 1, life: e, moves: 1 } } };
}
//@ chunk-m8aeec95.js:13778-13832 placement
var In = DoctorLazy(() => u({ experimental: u({ [ANTHROPIC_BACKGROUNDCOMMANDS]: u({ v: T(1) }) }) }));
//@ chunk-m8aeec95.js:13832-13890 placement
var Mn = DoctorLazy(() => u({ experimental: u({ [ANTHROPIC_BACKGROUNDCOMMANDS]: u({ moves: T(1) }) }) }));
//@ chunk-m8aeec95.js:13890-14000 placement
var stopBackgroundCommandSchema = DoctorLazy(() => zodStrictObject({ taskId: o().min(1).max(64) })),
  moveRunningCommandSchema = DoctorLazy(() =>
    zodStrictObject({ tool_use_id: toolUseIdSchema(), because: U(["message", "person"]) }),
  );
//@ chunk-m8aeec95.js:14000-14147 placement
function toEndedHow({ interrupted: interrupted, code: code, outputFileSize: outputFileSize }) {
  return !interrupted
    ? { state: "exited", exit_code: code }
    : { state: "killed", ...(outputFileSize !== void 0 && { reason: "output_limit" }) };
}
/**
 * mcp serve 的 ReadCalls：记录已运行的调用（运行中/已完成/保留结果），供远端读取进度、停止或迁移后台命令。
 */
//@ chunk-m8aeec95.js:14147-19670 placement
class ReadCallsLog {
  life = randomUUID();
  #o = 0;
  #e = new Map();
  #r = new Map();
  #s = createSignal();
  #t;
  #n;
  #i = Promise.resolve();
  #a;
  #d;
  constructor(e = () => performance.now()) {
    this.#t = e;
  }
  keepRecordsIn(e, n = Date.now) {
    if (this.#n !== void 0) return;
    ((this.#n = { store: e, wallNow: n }), (this.#i = this.#p(e, n)), registerCleanup(() => e.settledAll()));
  }
  get restored() {
    return this.#i;
  }
  get version() {
    return this.#o;
  }
  starterFor(e) {
    return {
      reserve: () => {
        return;
      },
      listMove: (n) => this.#c(e.toolUseId, n),
      adopt: (n, r, s, y) => {
        try {
          let h = this.#m(n, r, s, e, y);
          return (this.#r.delete(e.toolUseId ?? ""), logFeatureOk("mcp_serve_background_command"), h);
        } catch (error) {
          throw (logFeatureBad("mcp_serve_background_command", "not_kept"), n.kill(), n.cleanup(), error);
        }
      },
    };
  }
  taskIdOf(e) {
    return [...this.#e.values()].find(({ listed: listed }) => listed.tool_use_id === e)?.listed.taskId;
  }
  msSinceNewestDropped() {
    return this.#a === void 0 ? void 0 : Math.round(this.#t() - this.#a);
  }
  list() {
    let e = this.#t();
    return {
      life: this.life,
      commands_version: this.#o,
      commands: Array.from(
        this.#e.values(),
        ({
          listed: listed,
          startedAt: startedAt,
          ended: ended,
          unwanted: unwanted,
          stallTail: stallTail,
        }) => ({
          ...listed,
          ...(ended
            ? { ...ended.how, ended_ms_ago: Math.round(e - ended.at) }
            : {
                state: "running",
                ...(unwanted && { told: !0 }),
                ...(stallTail !== void 0 && { stalled: !0, output_tail: stallTail }),
              }),
          ran_ms: Math.round((ended?.at ?? e) - startedAt),
        }),
      ),
    };
  }
  forget(e) {
    let flattened = e.flatMap((r) => this.#e.get(r) ?? []);
    (flattened
      .filter(({ ended: ended }) => ended)
      .forEach(({ listed: listed }) => {
        (this.#e.delete(listed.taskId), this.#n?.store.remove(listed.taskId));
      }),
      flattened
        .filter(({ ended: ended }) => !ended)
        .forEach((r) => {
          ((r.unwanted = !0), this.#n?.store.remove(r.listed.taskId));
        }));
  }
  stop(e) {
    return this.#e.get(e)?.cut({ state: "stopped", stopped_by: "session" }) ?? !1;
  }
  moveRunning(e, n) {
    return this.#r.get(e)?.(n) ?? this.taskIdOf(e) !== void 0;
  }
  #c(e, n) {
    if (e === void 0) return () => {};
    return (
      this.#r.set(e, n),
      () => {
        if (this.#r.get(e) === n) this.#r.delete(e);
      }
    );
  }
  async changedSince(e, n) {
    let { promise: promise, resolve: resolve } = Promise.withResolvers(),
      y = () => resolve(),
      subscribe = this.#s.subscribe(y);
    if ((n.addEventListener("abort", y, { once: !0 }), e !== this.#o || n.aborted)) y();
    (await promise, subscribe(), n.removeEventListener("abort", y));
  }
  #m(e, n, r, s, y) {
    let taskId = e.taskOutput.taskId,
      w = getTaskOutputPath(taskId);
    if (!e.background(taskId, { atExit: "kill" }))
      throw Error(
        "The command had already ended when it was to be moved to the background, and its output was not kept. Run it again without run_in_background.",
      );
    let O = zbn(n),
      S = {
        listed: {
          taskId: taskId,
          ...(s.toolUseId !== void 0 && { tool_use_id: s.toolUseId }),
          ...(s.agentId !== void 0 && { agent_id: s.agentId }),
          command: truncateToLength(r, ve),
          ...(s.description && { description: truncateToLength(s.description, ve) }),
          output_path: w,
          limit_ms: O,
        },
        startedAt: this.#t(),
        cut: (R) => {
          if (S.ended || e.status !== "backgrounded") return !1;
          return (x(R), !0);
        },
      },
      x = (R, v) => {
        if (S.ended) return;
        let I = classifyBackgroundCommand(r, e.taskOutput, v, R.state !== "exited", void 0);
        if (
          (clearTimeout(unref),
          z(),
          K(),
          (S.ended = { how: R, at: this.#t() }),
          this.#e.delete(taskId),
          S.unwanted)
        )
          this.#n?.store.remove(taskId);
        else (this.#e.set(taskId, S), this.#u(S));
        (this.#l().forEach(() => logFeatureSad("mcp_serve_background_command", "ending_dropped")),
          withResolvers.resolve(),
          this.#o++,
          this.#s.emit());
        try {
          if (e.status === "backgrounded") e.kill();
          (e.cleanup(),
            appendTaskOutput(
              taskId,
              R.state === "exited"
                ? `
[exited with code ${R.exit_code}]
`
                : `
[killed]
`,
            ),
            evictTaskOutput(taskId),
            logForDebugging(
              `mcp serve: background command ${taskId} ended: ${R.state}${R.state === "killed" && R.reason ? ` (${R.reason})` : ""}`,
            ));
          let H = {
            elapsed_ms: Math.round(S.ended.at - S.startedAt),
            requested_timeout_ms: n ?? 0,
            deadline_ms: O,
            outcome: fromEnum(R.state !== "exited" ? "killed" : R.exit_code === 0 ? "completed" : "failed"),
            stop_cause:
              R.state === "time_limit"
                ? lit("deadline")
                : R.state === "killed"
                  ? fromEnumOpt(R.reason)
                  : void 0,
            stopped_by: fromEnumOpt(R.state === "stopped" ? R.stopped_by : void 0),
            subagent_owned: s.agentId !== void 0,
            unwanted: S.unwanted === !0,
            trigger:
              y === "person"
                ? lit("user")
                : y === "message"
                  ? lit("deliver_message")
                  : s.movedAtTimeout
                    ? lit("timeout")
                    : lit("explicit"),
            ...buildCommandTimingFields(v?.shellUsage),
            tool_use_id: kVt(s.toolUseId),
            bash_command_kinds: I.commandClass?.bash_command_kinds,
            bash_programs: I.commandClass?.bash_programs,
            bash_test_scope: I.commandClass?.bash_test_scope,
          };
          orr(I.testOutcome, (xe) =>
            logEvent("tengu_background_shell_settled", { ...H, bash_test_outcome: xe }),
          );
        } catch (error) {
          logError(toError(error));
        }
      },
      unref = setTimeout(S.cut, O, { state: "time_limit" }).unref(),
      P = (R) => {
        ((S.stallTail = R), this.#o++, this.#s.emit());
      },
      z = DEFAULT_INSTRUCTIONS(
        taskId,
        (R) => {
          (P(R), logFeatureOk("task_local_shell_stall_detected"));
        },
        () => P(void 0),
      ),
      withResolvers = Promise.withResolvers(),
      K = registerCleanup(async () => {
        S.cut({ state: "killed", reason: "daemon_exit" });
        let R = this.#n;
        if (R !== void 0) (await withResolvers.promise, await R.store.settled(taskId));
      });
    if ((this.#e.set(taskId, S), this.#u(S), this.#n !== void 0))
      this.#d ??= setInterval(() => {
        let filtered = [...this.#e.values()].filter(
          ({ ended: ended, unwanted: unwanted }) => !ended && !unwanted,
        );
        if (filtered.length === 0) (clearInterval(this.#d), (this.#d = void 0));
        filtered.forEach((v) => this.#u(v));
      }, CALL_RECORD_TICK_MS).unref();
    return (
      e.result
        .then(async (R) => {
          (await e.taskOutput.flush().catch((v) => logError(toError(v))), x(toEndedHow(R), R));
        })
        .catch((R) => {
          (logError(toError(R)), x({ state: "killed" }));
        }),
      this.#o++,
      this.#s.emit(),
      taskId
    );
  }
  #u({ listed: e, startedAt: n, ended: r }) {
    if (this.#n === void 0) return;
    let { store: store, wallNow: wallNow } = this.#n,
      h = this.#t(),
      w = wallNow(),
      { taskId: taskId, output_path: output_path, limit_ms: limit_ms } = e;
    store.write({
      listed: { taskId: taskId, output_path: output_path, limit_ms: limit_ms },
      started_at: Math.round(w - (h - n)),
      written_at: Math.round(w),
      ...(r && { ended: { how: r.how, at: Math.round(w - (h - r.at)) } }),
    });
  }
  #l() {
    let sliced = [...this.#e.values()].filter((n) => n.ended).slice(0, -lt);
    return (
      sliced.forEach((n) => {
        (this.#e.delete(n.listed.taskId), this.#n?.store.remove(n.listed.taskId), (this.#a = n.ended?.at));
      }),
      sliced
    );
  }
  async #p(e, n) {
    try {
      let { commands: commands, counted: counted } = await e.readEarlier(),
        y = this.#t(),
        h = n(),
        mapped = commands.map(({ listed: listed, started_at: started_at, ended: ended }) => {
          let z = y - Math.max(0, h - ended.at);
          return {
            listed: listed,
            startedAt: Math.min(z, y - Math.max(0, h - started_at)),
            cut: () => !1,
            ended: { how: ended.how, at: z },
          };
        }),
        O = [...this.#e.values()];
      (this.#e.clear(), [...mapped, ...O].forEach((x) => this.#e.set(x.listed.taskId, x)));
      let S = this.#l();
      if (Object.values(counted).some((x) => x > 0))
        logEvent("tengu_mcp_serve_background_records_read", { ...counted, dropped_for_room: S.length });
      if (mapped.length > 0) (this.#o++, this.#s.emit());
    } catch (error) {
      logError(toError(error));
    }
  }
}
//@ chunk-m8aeec95.js:19670-19696 placement
var backgroundCommands = new HostScoped(() => new ReadCallsLog());
//@ chunk-m8aeec95.js:19696-20200 placement
function keepBackgroundCommandRecords(e, n) {
  if (
    n !== "tool-container" ||
    !mn() ||
    env.CLAUDE_CODE_REMOTE_ENVIRONMENT_TYPE === "self_hosted" ||
    isBackgroundTasksDisabled()
  )
    return;
  let r = { said: !1 };
  backgroundCommands.of(e).keepRecordsIn(
    new ContainerStartRecord({
      folder: () => join(Sx(), "background-commands"),
      failed: (s) => {
        if (
          (logForDebugging(
            `mcp serve: could not save or delete a background command's record on disk, so after a restart that command may be missing, out of date, or listed again after it was acknowledged: ${errorMessage(s)}`,
            { level: "error" },
          ),
          !r.said)
        )
          ((r.said = !0), logFeatureSad("mcp_serve_background_command", "record_failed"));
      },
    }),
  );
}
//@ chunk-m8aeec95.js:20200-21455 placement
async function readCalls(e, n, { session: session, callerGone: callerGone }) {
  let {
      seen: seen,
      life: life,
      hold_ms: hold_ms,
      told: told,
      tool_use_ids: tool_use_ids,
    } = parseReadCallsInput(e ?? {}),
    [x, ...B] = (tool_use_ids ?? []).filter((v) => !toolUseIdSchema().safeParse(v).success);
  if (x !== void 0)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `ReadCalls: ${jsonStringify(x)} is not a valid tool_use_id${B.length > 0 ? ` (and ${B.length} more)` : ""}. An id is 1 to 128 letters, digits or _ . : @ -, and not only dots.`,
      "ReadCalls: a tool_use_id is not valid",
    );
  let of = backgroundCommands.of(session.host);
  (await of.restored, of.forget(told ?? []));
  let z = () => tool_use_ids?.some((v) => !he(session, v)) ?? !1;
  if (seen !== void 0 && life === of.life && hold_ms !== void 0 && !z()) {
    let abortController = new AbortController(),
      I = ge(session, () => {
        if (z()) abortController.abort();
      }),
      H = createCombinedAbortSignal(n, { signalB: callerGone, timeoutMs: hold_ms, refTimer: !0 });
    try {
      await of.changedSince(seen, AbortSignal.any([H.signal, abortController.signal]));
    } finally {
      (H.cleanup(), I());
    }
  }
  let mapped = (tool_use_ids ?? ye(session)).map((v) => {
    let taskIdOf = of.taskIdOf(v);
    return {
      tool_use_id: v,
      ...(taskIdOf === void 0 ? describeRunState(session, v) : { state: "background", taskId: taskIdOf }),
    };
  });
  if (tool_use_ids !== void 0 && tool_use_ids.length > 0) {
    let v = (I) => count(mapped, (H) => H.state === I);
    logEvent("tengu_mcp_serve_calls_read_by_id", {
      background: v("background"),
      running: v("running"),
      finished: v("finished"),
      unknown: v("unknown"),
    });
  }
  let filtered = [of.msSinceNewestDropped(), Re(session)].filter((v) => v !== void 0),
    R = {
      ...of.list(),
      calls: mapped,
      ...(filtered.length > 0 && { dropped_ended_ms_ago: Math.min(...filtered) }),
    };
  return { summary: `${R.commands.length} commands, ${R.calls.length} calls`, output: R };
}
//@ chunk-m8aeec95.js:21455-21615 placement
async function moveRunningCommand(e, n, { session: session }) {
  let { tool_use_id: tool_use_id, because: because } = moveRunningCommandSchema().parse(e),
    moveRunning = backgroundCommands.of(session.host).moveRunning(tool_use_id, because);
  return { summary: `moved: ${moveRunning}`, output: { moved: moveRunning } };
}
//@ chunk-m8aeec95.js:21615-21755 placement
async function stopBackgroundCommand(e, n, { session: session }) {
  let { taskId: taskId } = stopBackgroundCommandSchema().parse(e),
    stop = backgroundCommands.of(session.host).stop(taskId);
  return { summary: `stopped: ${stop}`, output: { stopped: stop } };
}

export {
  kTs,
  isCallRunBarred,
  backgroundCommands,
  keepBackgroundCommandRecords,
  CALL_RECORD_EXT,
  MAX_CALL_RECORD_SCAN,
  MAX_CALL_RECORDS,
  MAX_CALL_RECORD_BATCH,
  MAX_CALL_RECORD_BYTES,
  callRecordSchema,
  CALL_RECORD_RETENTION_MS,
  READ_CALLS_CALL,
  readCalls,
  STOP_BACKGROUND_COMMAND_CALL,
  stopBackgroundCommand,
  MOVE_RUNNING_COMMAND_CALL,
  moveRunningCommand,
};
