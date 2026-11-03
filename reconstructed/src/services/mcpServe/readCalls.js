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
import { randomUUID } from "crypto";
import { join } from "path";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  zodStrictObject,
  E,
  string,
  array,
  unknown,
  u,
  literal,
  discriminatedUnion,
  _enum,
} from "../../../vendor/zod/v4/classic/schemas.js";
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
import { mcpServeCallState, maxDefined, setWithEviction, toolUseIdSchema } from "./callClaims.js";
import { MAX_PENDING_STARTS, ContainerStartRecord } from "./containerStart.js";
import { createSignal } from "../../utils/signal.js";
import { logForDebugging } from "../../utils/debug.js";
import { env } from "../../utils/env.js";
import { logEvent } from "../analytics/index.js";
import { registerCleanup } from "../../utils/cleanupRegistry.js";
import { fromEnum, lit, fromEnumOpt } from "../analytics/safeMetadata.js";
import { logFeatureBad, logFeatureOk, logFeatureSad } from "../analytics/featureTelemetry.js";
import { getBackgroundTimeoutForDisplay } from "../../tools/BashTool/prompt.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import {
  classifyBackgroundCommand,
  buildCommandTimingFields,
  thenIfPromise,
} from "../../tools/BashTool/bashTelemetry.js";
import { logError } from "../../utils/log.js";
import { parentTaskId } from "../../tasks/LocalShellTask/backgroundNotices.js";
import { DEFAULT_INSTRUCTIONS } from "../../commands/ultraplan.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { isRemoteManagedEnvironment } from "../../utils/remoteEnvironment.js";
import { isBackgroundTasksDisabled } from "../../tools/AgentTool/AgentTool.js";
import { sessionTempDirRealpath } from "../../utils/tempDirRealpaths.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { createCombinedAbortSignal } from "../../utils/combinedAbortSignal.js";
import { count } from "../../utils/collections.js";

//@ chunk-m8aeec95.js:1563-1838 placement
/**
 * ReadCalls 的上限与输入结构（seen、life、hold_ms、told、tool_use_ids、接口版本）。
 */
var MAX_READ_CALLS_HOLD_MS = 240000;
var MAX_TOLD_ENTRIES = 32;
var MAX_TOOL_USE_IDS = 32;
var readCallsInputSchema = DoctorLazy(() =>
  zodStrictObject({
    seen: E().int().min(0).optional(),
    life: string().max(64).optional(),
    hold_ms: E().int().min(0).max(MAX_READ_CALLS_HOLD_MS).optional(),
    told: array(string().max(64)).max(MAX_TOLD_ENTRIES).optional(),
    tool_use_ids: array(string().min(1).max(256)).max(MAX_TOOL_USE_IDS).optional(),
    tool_host_interface: unknown().optional(),
  }),
);
//@ chunk-m8aeec95.js:1838-2140 placement
/**
 * 校验 ReadCalls 输入：told 与 tool_use_ids 列表不能超过上限（超出抛出遥测安全错误），再按 schema 解析。
 */
function parseReadCallsInput(e) {
  let n = {
    told: MAX_TOLD_ENTRIES,
    tool_use_ids: MAX_TOOL_USE_IDS,
  };
  let r = isPlainObject_2(e)
    ? Object.entries(n).find(([key, value]) => {
        let h = getOwn(e, key);
        return Array.isArray(h) && h.length > value;
      })
    : undefined;
  if (r !== undefined) {
    let [s, y] = r;
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `ReadCalls: ${s} has more than ${y} entries`,
      "ReadCalls: a list has more entries than are taken",
    );
  }
  return readCallsInputSchema().parse(e);
}
//@ chunk-m8aeec95.js:2338-3042 placement
/**
 * 调用记录文件的常量（保留时长、上限、扩展名 .json）与记录结构 v1（container_start、listed 任务、起止时间、结束方式 exited/time_limit/stopped/killed）。
 */
var CALL_RECORD_TICK_MS = 60000;
var MAX_CALL_RECORDS = 256;
var CALL_RECORD_RETENTION_MS = 604800000;
var MAX_CALL_RECORD_SCAN = 4 * MAX_CALL_RECORDS;
var MAX_CALL_RECORD_BATCH = 16;
var MAX_CALL_RECORD_BYTES = 32768;
var CALL_RECORD_EXT = ".json";
var callRecordSchema = DoctorLazy(() => {
  let e = E().int().min(0).max(Number.MAX_SAFE_INTEGER);
  return u({
    v: literal(1),
    container_start: string().min(1).max(64),
    listed: u({
      taskId: string().refine((n) => isTaskIdOfType("local_bash", n)),
      output_path: string().max(4096),
      limit_ms: E().min(0).max(Number.MAX_SAFE_INTEGER),
    }).transform((n) =>
      isTaskOutputPathFor(n.taskId, n.output_path)
        ? n
        : {
            ...n,
            output_path: "",
          },
    ),
    started_at: e,
    written_at: e,
    ended: u({
      how: discriminatedUnion("state", [
        u({
          state: literal("exited"),
          exit_code: E().int(),
        }),
        u({
          state: literal("time_limit"),
        }),
        u({
          state: literal("stopped"),
          stopped_by: literal("session"),
        }),
        u({
          state: literal("killed"),
          reason: _enum(["daemon_exit", "output_limit", "container_stopped"]).optional().catch(undefined),
        }),
      ]).catch({
        state: "killed",
      }),
      at: e,
    }).optional(),
  });
});
//@ chunk-m8aeec95.js:8490-8788 placement
function describeRunState(session, n) {
  let r = mcpServeCallState.of(session);
  let s = r.runningRuns.get(n);
  if (s !== undefined)
    return {
      state: "running",
      since_ms: Math.round(r.now() - s),
    };
  if (r.finishedRuns.has(n))
    return {
      state: "finished",
    };
  if (!r.barredRuns.has(n))
    r.newestDropped = maxDefined(
      r.newestDropped,
      setWithEviction(r.barredRuns, n, MAX_PENDING_STARTS, r.now()),
    );
  return {
    state: "unknown",
    barred: true,
  };
}
//@ chunk-m8aeec95.js:8788-8840 placement
function isCallRunBarred(session, toolUseId) {
  return mcpServeCallState.of(session).barredRuns.has(toolUseId);
}
//@ chunk-m8aeec95.js:8840-8927 placement
/**
 * 判断该 run 是否存在（运行中或已结束）。
 */
function isKnownRun(session, n) {
  let { runningRuns, finishedRuns } = mcpServeCallState.of(session);
  return runningRuns.has(n) || finishedRuns.has(n);
}
//@ chunk-m8aeec95.js:8927-8979 placement
/**
 * 判断该 run 是否仍在运行。
 */
function isRunningRun(session, toolUseId) {
  return mcpServeCallState.of(session).runningRuns.has(toolUseId);
}
//@ chunk-m8aeec95.js:8979-9034 placement
/**
 * 订阅 run 结束事件。
 */
function onRunEnded(session, n) {
  return mcpServeCallState.of(session).runEnded.subscribe(n);
}
//@ chunk-m8aeec95.js:9034-9088 placement
/**
 * 列出正在运行的 run id。
 */
function runningRunIds(session) {
  return [...mcpServeCallState.of(session).runningRuns.keys()];
}
//@ chunk-m8aeec95.js:9088-9182 placement
/**
 * 距离最近一次丢弃记录过了多少毫秒。
 */
function msSinceNewestDropped(session) {
  let { newestDropped, now } = mcpServeCallState.of(session);
  return newestDropped === undefined ? undefined : Math.round(now() - newestDropped);
}
//@ chunk-m8aeec95.js:13591-13713 placement
/**
 * 命令与描述的最大字符数（1000）。
 */
var READ_CALLS_CALL = "ReadCalls";
var STOP_BACKGROUND_COMMAND_CALL = "StopBackgroundCommand";
var MOVE_RUNNING_COMMAND_CALL = "MoveRunningCommand";
var MAX_FINISHED_RECORDS_KEPT = 3 * MAX_TOLD_ENTRIES;
var MAX_COMMAND_CHARS = 1000;
var ANTHROPIC_BACKGROUNDCOMMANDS = "anthropic/backgroundCommands";
//@ chunk-m8aeec95.js:13713-13778 placement
function keepsBackgroundCommandsCapability(life) {
  return {
    experimental: {
      [ANTHROPIC_BACKGROUNDCOMMANDS]: {
        v: 1,
        life,
        moves: 1,
      },
    },
  };
}
//@ chunk-m8aeec95.js:13778-13832 placement
/**
 * 后台命令能力声明的 schema。
 */
var backgroundCommandsCapabilitySchema = DoctorLazy(() =>
  u({
    experimental: u({
      [ANTHROPIC_BACKGROUNDCOMMANDS]: u({
        v: literal(1),
      }),
    }),
  }),
);
//@ chunk-m8aeec95.js:13832-13890 placement
/**
 * 后台命令移动能力声明的 schema。
 */
var backgroundCommandMovesSchema = DoctorLazy(() =>
  u({
    experimental: u({
      [ANTHROPIC_BACKGROUNDCOMMANDS]: u({
        moves: literal(1),
      }),
    }),
  }),
);
//@ chunk-m8aeec95.js:13890-14000 placement
var stopBackgroundCommandSchema = DoctorLazy(() =>
  zodStrictObject({
    taskId: string().min(1).max(64),
  }),
);
var moveRunningCommandSchema = DoctorLazy(() =>
  zodStrictObject({
    tool_use_id: toolUseIdSchema(),
    because: _enum(["message", "person"]),
  }),
);
//@ chunk-m8aeec95.js:14000-14147 placement
function toEndedHow({ interrupted, code, outputFileSize }) {
  return !interrupted
    ? {
        state: "exited",
        exit_code: code,
      }
    : {
        state: "killed",
        ...(outputFileSize !== undefined && {
          reason: "output_limit",
        }),
      };
}
//@ chunk-m8aeec95.js:14147-19670 placement
/**
 * mcp serve 的 ReadCalls：记录已运行的调用（运行中/已完成/保留结果），供远端读取进度、停止或迁移后台命令。
 */
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
    if (this.#n !== undefined) return;
    this.#n = {
      store: e,
      wallNow: n,
    };
    this.#i = this.#p(e, n);
    registerCleanup(() => e.settledAll());
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
          this.#r.delete(e.toolUseId ?? "");
          logFeatureOk("mcp_serve_background_command");
          return h;
        } catch (error) {
          logFeatureBad("mcp_serve_background_command", "not_kept");
          n.kill();
          n.cleanup();
          throw error;
        }
      },
    };
  }
  taskIdOf(e) {
    return [...this.#e.values()].find(({ listed }) => listed.tool_use_id === e)?.listed.taskId;
  }
  msSinceNewestDropped() {
    return this.#a === undefined ? undefined : Math.round(this.#t() - this.#a);
  }
  list() {
    let e = this.#t();
    return {
      life: this.life,
      commands_version: this.#o,
      commands: Array.from(this.#e.values(), ({ listed, startedAt, ended, unwanted, stallTail }) => ({
        ...listed,
        ...(ended
          ? {
              ...ended.how,
              ended_ms_ago: Math.round(e - ended.at),
            }
          : {
              state: "running",
              ...(unwanted && {
                told: true,
              }),
              ...(stallTail !== undefined && {
                stalled: true,
                output_tail: stallTail,
              }),
            }),
        ran_ms: Math.round((ended?.at ?? e) - startedAt),
      })),
    };
  }
  forget(e) {
    let flattened = e.flatMap((r) => this.#e.get(r) ?? []);
    flattened
      .filter(({ ended }) => ended)
      .forEach(({ listed }) => {
        this.#e.delete(listed.taskId);
        this.#n?.store.remove(listed.taskId);
      });
    flattened
      .filter(({ ended }) => !ended)
      .forEach((r) => {
        r.unwanted = true;
        this.#n?.store.remove(r.listed.taskId);
      });
  }
  stop(e) {
    return (
      this.#e.get(e)?.cut({
        state: "stopped",
        stopped_by: "session",
      }) ?? false
    );
  }
  moveRunning(e, n) {
    return this.#r.get(e)?.(n) ?? this.taskIdOf(e) !== undefined;
  }
  #c(e, n) {
    if (e === undefined) return () => {};
    this.#r.set(e, n);
    return () => {
      if (this.#r.get(e) === n) this.#r.delete(e);
    };
  }
  async changedSince(e, n) {
    let { promise, resolve } = Promise.withResolvers();
    let y = () => resolve();
    let h = this.#s.subscribe(y);
    n.addEventListener("abort", y, {
      once: true,
    });
    if (e !== this.#o || n.aborted) y();
    await promise;
    h();
    n.removeEventListener("abort", y);
  }
  #m(e, n, r, s, y) {
    let taskId = e.taskOutput.taskId;
    let outputPath = getTaskOutputPath(taskId);
    if (
      !e.background(taskId, {
        atExit: "kill",
      })
    )
      throw Error(
        "The command had already ended when it was to be moved to the background, and its output was not kept. Run it again without run_in_background.",
      );
    let backgroundTimeoutForDisplay = getBackgroundTimeoutForDisplay(n);
    let S = {
      listed: {
        taskId,
        ...(s.toolUseId !== undefined && {
          tool_use_id: s.toolUseId,
        }),
        ...(s.agentId !== undefined && {
          agent_id: s.agentId,
        }),
        command: truncateToLength(r, MAX_COMMAND_CHARS),
        ...(s.description && {
          description: truncateToLength(s.description, MAX_COMMAND_CHARS),
        }),
        output_path: outputPath,
        limit_ms: backgroundTimeoutForDisplay,
      },
      startedAt: this.#t(),
      cut: (R) => {
        if (S.ended || e.status !== "backgrounded") return false;
        x(R);
        return true;
      },
    };
    let x = (R, v) => {
      if (S.ended) return;
      let I = classifyBackgroundCommand(r, e.taskOutput, v, R.state !== "exited", undefined);
      clearTimeout(B);
      z();
      K();
      S.ended = {
        how: R,
        at: this.#t(),
      };
      this.#e.delete(taskId);
      if (S.unwanted) this.#n?.store.remove(taskId);
      else {
        this.#e.set(taskId, S);
        this.#u(S);
      }
      this.#l().forEach(() => logFeatureSad("mcp_serve_background_command", "ending_dropped"));
      deferred.resolve();
      this.#o++;
      this.#s.emit();
      try {
        if (e.status === "backgrounded") e.kill();
        e.cleanup();
        appendTaskOutput(
          taskId,
          R.state === "exited"
            ? `
[exited with code ${R.exit_code}]
`
            : `
[killed]
`,
        );
        evictTaskOutput(taskId);
        logForDebugging(
          `mcp serve: background command ${taskId} ended: ${R.state}${R.state === "killed" && R.reason ? ` (${R.reason})` : ""}`,
        );
        let H = {
          elapsed_ms: Math.round(S.ended.at - S.startedAt),
          requested_timeout_ms: n ?? 0,
          deadline_ms: backgroundTimeoutForDisplay,
          outcome: fromEnum(R.state !== "exited" ? "killed" : R.exit_code === 0 ? "completed" : "failed"),
          stop_cause:
            R.state === "time_limit"
              ? lit("deadline")
              : R.state === "killed"
                ? fromEnumOpt(R.reason)
                : undefined,
          stopped_by: fromEnumOpt(R.state === "stopped" ? R.stopped_by : undefined),
          subagent_owned: s.agentId !== undefined,
          unwanted: S.unwanted === true,
          trigger:
            y === "person"
              ? lit("user")
              : y === "message"
                ? lit("deliver_message")
                : s.movedAtTimeout
                  ? lit("timeout")
                  : lit("explicit"),
          ...buildCommandTimingFields(v?.shellUsage),
          tool_use_id: parentTaskId(s.toolUseId),
          bash_command_kinds: I.commandClass?.bash_command_kinds,
          bash_programs: I.commandClass?.bash_programs,
          bash_test_scope: I.commandClass?.bash_test_scope,
        };
        thenIfPromise(I.testOutcome, (bashTestOutcome) =>
          logEvent("tengu_background_shell_settled", {
            ...H,
            bash_test_outcome: bashTestOutcome,
          }),
        );
      } catch (error) {
        logError(toError(error));
      }
    };
    let B = setTimeout(S.cut, backgroundTimeoutForDisplay, {
      state: "time_limit",
    }).unref();
    let P = (stallTail) => {
      S.stallTail = stallTail;
      this.#o++;
      this.#s.emit();
    };
    let z = DEFAULT_INSTRUCTIONS(
      taskId,
      (stallTail) => {
        P(stallTail);
        logFeatureOk("task_local_shell_stall_detected");
      },
      () => P(undefined),
    );
    let deferred = Promise.withResolvers();
    let K = registerCleanup(async () => {
      S.cut({
        state: "killed",
        reason: "daemon_exit",
      });
      let R = this.#n;
      if (R !== undefined) {
        await deferred.promise;
        await R.store.settled(taskId);
      }
    });
    this.#e.set(taskId, S);
    this.#u(S);
    if (this.#n !== undefined)
      this.#d ??= setInterval(() => {
        let filtered = [...this.#e.values()].filter(({ ended, unwanted }) => !ended && !unwanted);
        if (filtered.length === 0) {
          clearInterval(this.#d);
          this.#d = undefined;
        }
        filtered.forEach((v) => this.#u(v));
      }, CALL_RECORD_TICK_MS).unref();
    e.result
      .then(async (R) => {
        await e.taskOutput.flush().catch((error) => logError(toError(error)));
        x(toEndedHow(R), R);
      })
      .catch((error) => {
        logError(toError(error));
        x({
          state: "killed",
        });
      });
    this.#o++;
    this.#s.emit();
    return taskId;
  }
  #u({ listed, startedAt, ended }) {
    if (this.#n === undefined) return;
    let { store, wallNow } = this.#n;
    let h = this.#t();
    let w = wallNow();
    let { taskId, output_path: outputPath, limit_ms: limitMs } = listed;
    store.write({
      listed: {
        taskId,
        output_path: outputPath,
        limit_ms: limitMs,
      },
      started_at: Math.round(w - (h - startedAt)),
      written_at: Math.round(w),
      ...(ended && {
        ended: {
          how: ended.how,
          at: Math.round(w - (h - ended.at)),
        },
      }),
    });
  }
  #l() {
    let sliced = [...this.#e.values()].filter((n) => n.ended).slice(0, -MAX_FINISHED_RECORDS_KEPT);
    sliced.forEach((n) => {
      this.#e.delete(n.listed.taskId);
      this.#n?.store.remove(n.listed.taskId);
      this.#a = n.ended?.at;
    });
    return sliced;
  }
  async #p(e, n) {
    try {
      let { commands, counted } = await e.readEarlier();
      let y = this.#t();
      let h = n();
      let mapped = commands.map(({ listed, started_at: startedAt, ended }) => {
        let z = y - Math.max(0, h - ended.at);
        return {
          listed,
          startedAt: Math.min(z, y - Math.max(0, h - startedAt)),
          cut: () => false,
          ended: {
            how: ended.how,
            at: z,
          },
        };
      });
      let O = [...this.#e.values()];
      this.#e.clear();
      [...mapped, ...O].forEach((x) => this.#e.set(x.listed.taskId, x));
      let S = this.#l();
      if (Object.values(counted).some((x) => x > 0))
        logEvent("tengu_mcp_serve_background_records_read", {
          ...counted,
          dropped_for_room: S.length,
        });
      if (mapped.length > 0) {
        this.#o++;
        this.#s.emit();
      }
    } catch (error) {
      logError(toError(error));
    }
  }
}
//@ chunk-m8aeec95.js:19670-19696 placement
var backgroundCommands = new HostScoped(() => new ReadCallsLog());
//@ chunk-m8aeec95.js:19696-20200 placement
function keepBackgroundCommandRecords(host, kind) {
  if (
    kind !== "tool-container" ||
    !isRemoteManagedEnvironment() ||
    env.CLAUDE_CODE_REMOTE_ENVIRONMENT_TYPE === "self_hosted" ||
    isBackgroundTasksDisabled()
  )
    return;
  let r = {
    said: false,
  };
  backgroundCommands.of(host).keepRecordsIn(
    new ContainerStartRecord({
      folder: () => join(sessionTempDirRealpath(), "background-commands"),
      failed: (s) => {
        logForDebugging(
          `mcp serve: could not save or delete a background command's record on disk, so after a restart that command may be missing, out of date, or listed again after it was acknowledged: ${errorMessage(s)}`,
          {
            level: "error",
          },
        );
        if (!r.said) {
          r.said = true;
          logFeatureSad("mcp_serve_background_command", "record_failed");
        }
      },
    }),
  );
}
//@ chunk-m8aeec95.js:20200-21455 placement
async function readCalls(e, n, { session, callerGone }) {
  let { seen, life, hold_ms: holdMs, told, tool_use_ids: toolUseIds } = parseReadCallsInput(e ?? {});
  let [x, ...B] = (toolUseIds ?? []).filter((v) => !toolUseIdSchema().safeParse(v).success);
  if (x !== undefined)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `ReadCalls: ${jsonStringify(x)} is not a valid tool_use_id${B.length > 0 ? ` (and ${B.length} more)` : ""}. An id is 1 to 128 letters, digits or _ . : @ -, and not only dots.`,
      "ReadCalls: a tool_use_id is not valid",
    );
  let P = backgroundCommands.of(session.host);
  await P.restored;
  P.forget(told ?? []);
  let z = () => toolUseIds?.some((toolUseId) => !isRunningRun(session, toolUseId)) ?? false;
  if (seen !== undefined && life === P.life && holdMs !== undefined && !z()) {
    let abortController = new AbortController();
    let I = onRunEnded(session, () => {
      if (z()) abortController.abort();
    });
    let combinedAbortSignal = createCombinedAbortSignal(n, {
      signalB: callerGone,
      timeoutMs: holdMs,
      refTimer: true,
    });
    try {
      await P.changedSince(seen, AbortSignal.any([combinedAbortSignal.signal, abortController.signal]));
    } finally {
      combinedAbortSignal.cleanup();
      I();
    }
  }
  let mapped = (toolUseIds ?? runningRunIds(session)).map((v) => {
    let I = P.taskIdOf(v);
    return {
      tool_use_id: v,
      ...(I === undefined
        ? describeRunState(session, v)
        : {
            state: "background",
            taskId: I,
          }),
    };
  });
  if (toolUseIds !== undefined && toolUseIds.length > 0) {
    let v = (I) => count(mapped, (H) => H.state === I);
    logEvent("tengu_mcp_serve_calls_read_by_id", {
      background: v("background"),
      running: v("running"),
      finished: v("finished"),
      unknown: v("unknown"),
    });
  }
  let filtered = [P.msSinceNewestDropped(), msSinceNewestDropped(session)].filter((v) => v !== undefined);
  let R = {
    ...P.list(),
    calls: mapped,
    ...(filtered.length > 0 && {
      dropped_ended_ms_ago: Math.min(...filtered),
    }),
  };
  return {
    summary: `${R.commands.length} commands, ${R.calls.length} calls`,
    output: R,
  };
}
//@ chunk-m8aeec95.js:21455-21615 placement
async function moveRunningCommand(e, n, { session }) {
  let { tool_use_id: toolUseId, because } = moveRunningCommandSchema().parse(e);
  let h = backgroundCommands.of(session.host).moveRunning(toolUseId, because);
  return {
    summary: `moved: ${h}`,
    output: {
      moved: h,
    },
  };
}
//@ chunk-m8aeec95.js:21615-21755 placement
async function stopBackgroundCommand(e, n, { session }) {
  let { taskId } = stopBackgroundCommandSchema().parse(e);
  let y = backgroundCommands.of(session.host).stop(taskId);
  return {
    summary: `stopped: ${y}`,
    output: {
      stopped: y,
    },
  };
}
export {
  isKnownRun,
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
