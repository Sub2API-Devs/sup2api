/**
 * services/mcpServe/readCalls.ts
 *
 * 2.1.316 新增：mcp serve 的 ReadCalls：记录调用运行状态与结果，支持停止/迁移后台命令。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-78qefq0z.js (15), chunk-z0gd899m.js (7)
 * attribution: placement 22
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { randomUUID } from "crypto";
import { join } from "path";
import { mcpServeCallState, maxDefined, setWithEviction, toolUseIdSchema } from "./callClaims.js";
import { MAX_PENDING_STARTS, ContainerStartRecord } from "./containerStart.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  zodStrictObject,
  numberSchema,
  stringSchema,
  array,
  unknown,
  objectSchema,
  literal,
  discriminatedUnion,
  _enum,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
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
import { createSignal } from "../../utils/signal.js";
import { logForDebugging } from "../../utils/debug.js";
import { logError } from "../../utils/log.js";
import { env } from "../../utils/env.js";
import { registerCleanup } from "../../utils/cleanupRegistry.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../analytics/featureTelemetry.js";
import { getBackgroundTimeoutForDisplay } from "../../tools/BashTool/prompt.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import {
  classifyBackgroundCommand,
  buildCommandTimingFields,
  thenIfPromise,
} from "../../tools/BashTool/bashTelemetry.js";
import { logEvent } from "../analytics/index.js";
import { fromEnum, lit, fromEnumOpt } from "../analytics/safeMetadata.js";
import { parentTaskId } from "../../tasks/LocalShellTask/backgroundNotices.js";
import { watchTaskOutputForPrompt } from "../../commands/ultraplan.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { isRemoteManagedEnvironment } from "../../utils/remoteEnvironment.js";
import { isBackgroundTasksDisabled } from "../../tools/AgentTool/AgentTool.js";
import { sessionTempDirRealpath } from "../../utils/tempDirRealpaths.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { createCombinedAbortSignal } from "../../utils/combinedAbortSignal.js";
import { countWhere } from "../../utils/collections.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-z0gd899m.js:1860-2156 placement
function describeRunState(session, toolUseId) {
  let callState = mcpServeCallState.of(session);
  let startedAt = callState.runningRuns.get(toolUseId);
  if (startedAt !== undefined)
    return {
      state: "running",
      since_ms: Math.round(callState.now() - startedAt),
    };
  if (callState.finishedRuns.has(toolUseId))
    return {
      state: "finished",
    };
  if (!callState.barredRuns.has(toolUseId))
    callState.newestDropped = maxDefined(
      callState.newestDropped,
      setWithEviction(callState.barredRuns, toolUseId, MAX_PENDING_STARTS, callState.now()),
    );
  return {
    state: "unknown",
    barred: true,
  };
}
//@ chunk-z0gd899m.js:2156-2208 placement
function isCallRunBarred(session, toolUseId) {
  return mcpServeCallState.of(session).barredRuns.has(toolUseId);
}
//@ chunk-z0gd899m.js:2208-2295 placement
/**
 * 判断该 run 是否存在（运行中或已结束）。
 */
function isKnownRun(session, toolUseId) {
  let { runningRuns, finishedRuns } = mcpServeCallState.of(session);
  return runningRuns.has(toolUseId) || finishedRuns.has(toolUseId);
}
//@ chunk-z0gd899m.js:2295-2348 placement
/**
 * 判断该 run 是否仍在运行。
 */
function isRunningRun(session, toolUseId) {
  return mcpServeCallState.of(session).runningRuns.has(toolUseId);
}
//@ chunk-z0gd899m.js:2348-2404 placement
/**
 * 订阅 run 结束事件。
 */
function onRunEnded(session, listener) {
  return mcpServeCallState.of(session).runEnded.subscribe(listener);
}
//@ chunk-z0gd899m.js:2404-2459 placement
/**
 * 列出正在运行的 run id。
 */
function runningRunIds(session) {
  return [...mcpServeCallState.of(session).runningRuns.keys()];
}
//@ chunk-z0gd899m.js:2459-2554 placement
/**
 * 距离最近一次丢弃记录过了多少毫秒。
 */
function msSinceNewestDropped(session) {
  let { newestDropped, now } = mcpServeCallState.of(session);
  return newestDropped === undefined ? undefined : Math.round(now() - newestDropped);
}
//@ chunk-78qefq0z.js:1307-1580 placement
/**
 * ReadCalls 的上限与输入结构（seen、life、hold_ms、told、tool_use_ids、接口版本）。
 */
var MAX_READ_CALLS_HOLD_MS; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var MAX_TOLD_ENTRIES;
var MAX_TOOL_USE_IDS;
var readCallsInputSchema;
deferInit("chunk-78qefq0z.js:1307", () => {
  MAX_READ_CALLS_HOLD_MS = 240000;
  MAX_TOLD_ENTRIES = 32;
  MAX_TOOL_USE_IDS = 32;
  readCallsInputSchema = DoctorLazy(() =>
    zodStrictObject({
      seen: numberSchema().int().min(0).optional(),
      life: stringSchema().max(64).optional(),
      hold_ms: numberSchema().int().min(0).max(MAX_READ_CALLS_HOLD_MS).optional(),
      told: array(stringSchema().max(64)).max(MAX_TOLD_ENTRIES).optional(),
      tool_use_ids: array(stringSchema().min(1).max(256)).max(MAX_TOOL_USE_IDS).optional(),
      tool_host_interface: unknown().optional(),
    }),
  );
});
//@ chunk-78qefq0z.js:1580-1881 placement
/**
 * 校验 ReadCalls 输入：told 与 tool_use_ids 列表不能超过上限（超出抛出遥测安全错误），再按 schema 解析。
 */
function parseReadCallsInput(input) {
  let limits = {
    told: MAX_TOLD_ENTRIES,
    tool_use_ids: MAX_TOOL_USE_IDS,
  };
  let overflow = isPlainObject(input)
    ? Object.entries(limits).find(([key, value]) => {
        let entryValue = getOwn(input, key);
        return Array.isArray(entryValue) && entryValue.length > value;
      })
    : undefined;
  if (overflow !== undefined) {
    let [field, limit] = overflow;
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `ReadCalls: ${field} has more than ${limit} entries`,
      "ReadCalls: a list has more entries than are taken",
    );
  }
  return readCallsInputSchema().parse(input);
}
//@ chunk-78qefq0z.js:2079-2783 placement
/**
 * 调用记录文件的常量（保留时长、上限、扩展名 .json）与记录结构 v1（container_start、listed 任务、起止时间、结束方式 exited/time_limit/stopped/killed）。
 */
var CALL_RECORD_TICK_MS; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var MAX_CALL_RECORDS;
var CALL_RECORD_RETENTION_MS;
var MAX_CALL_RECORD_SCAN;
var MAX_CALL_RECORD_BATCH;
var MAX_CALL_RECORD_BYTES;
var CALL_RECORD_EXT;
var callRecordSchema;
deferInit("chunk-78qefq0z.js:2079", () => {
  CALL_RECORD_TICK_MS = 60000;
  MAX_CALL_RECORDS = 256;
  CALL_RECORD_RETENTION_MS = 604800000;
  MAX_CALL_RECORD_SCAN = 4 * MAX_CALL_RECORDS;
  MAX_CALL_RECORD_BATCH = 16;
  MAX_CALL_RECORD_BYTES = 32768;
  CALL_RECORD_EXT = ".json";
  callRecordSchema = DoctorLazy(() => {
    let timestamp = numberSchema().int().min(0).max(Number.MAX_SAFE_INTEGER);
    return objectSchema({
      v: literal(1),
      container_start: stringSchema().min(1).max(64),
      listed: objectSchema({
        taskId: stringSchema().refine((taskId) => isTaskIdOfType("local_bash", taskId)),
        output_path: stringSchema().max(4096),
        limit_ms: numberSchema().min(0).max(Number.MAX_SAFE_INTEGER),
      }).transform((record) =>
        isTaskOutputPathFor(record.taskId, record.output_path)
          ? record
          : {
              ...record,
              output_path: "",
            },
      ),
      started_at: timestamp,
      written_at: timestamp,
      ended: objectSchema({
        how: discriminatedUnion("state", [
          objectSchema({
            state: literal("exited"),
            exit_code: numberSchema().int(),
          }),
          objectSchema({
            state: literal("time_limit"),
          }),
          objectSchema({
            state: literal("stopped"),
            stopped_by: literal("session"),
          }),
          objectSchema({
            state: literal("killed"),
            reason: _enum(["daemon_exit", "output_limit", "container_stopped"]).optional().catch(undefined),
          }),
        ]).catch({
          state: "killed",
        }),
        at: timestamp,
      }).optional(),
    });
  });
});
//@ chunk-78qefq0z.js:6822-6943 placement
/**
 * 命令与描述的最大字符数（1000）。
 */
var READ_CALLS_CALL; // deferred: uses MAX_READ_CALLS_HOLD_MS of its import cycle while loading; runs once the cycle is complete
var STOP_BACKGROUND_COMMAND_CALL;
var MOVE_RUNNING_COMMAND_CALL;
var MAX_FINISHED_RECORDS_KEPT;
var MAX_COMMAND_CHARS;
var ANTHROPIC_BACKGROUNDCOMMANDS;
deferInit("chunk-78qefq0z.js:6822", () => {
  READ_CALLS_CALL = "ReadCalls";
  STOP_BACKGROUND_COMMAND_CALL = "StopBackgroundCommand";
  MOVE_RUNNING_COMMAND_CALL = "MoveRunningCommand";
  MAX_FINISHED_RECORDS_KEPT = 3 * MAX_TOLD_ENTRIES;
  MAX_COMMAND_CHARS = 1000;
  ANTHROPIC_BACKGROUNDCOMMANDS = "anthropic/backgroundCommands";
});
//@ chunk-78qefq0z.js:6943-7007 placement
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
//@ chunk-78qefq0z.js:7007-7060 placement
/**
 * 后台命令能力声明的 schema。
 */
var backgroundCommandsCapabilitySchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-78qefq0z.js:7007", () => {
  backgroundCommandsCapabilitySchema = DoctorLazy(() =>
    objectSchema({
      experimental: objectSchema({
        [ANTHROPIC_BACKGROUNDCOMMANDS]: objectSchema({
          v: literal(1),
        }),
      }),
    }),
  );
});
//@ chunk-78qefq0z.js:7060-7117 placement
/**
 * 后台命令移动能力声明的 schema。
 */
var backgroundCommandMovesSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-78qefq0z.js:7060", () => {
  backgroundCommandMovesSchema = DoctorLazy(() =>
    objectSchema({
      experimental: objectSchema({
        [ANTHROPIC_BACKGROUNDCOMMANDS]: objectSchema({
          moves: literal(1),
        }),
      }),
    }),
  );
});
//@ chunk-78qefq0z.js:7117-7229 placement
var stopBackgroundCommandSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var moveRunningCommandSchema;
deferInit("chunk-78qefq0z.js:7117", () => {
  stopBackgroundCommandSchema = DoctorLazy(() =>
    zodStrictObject({
      taskId: stringSchema().min(1).max(64),
    }),
  );
  moveRunningCommandSchema = DoctorLazy(() =>
    zodStrictObject({
      tool_use_id: toolUseIdSchema(),
      because: _enum(["message", "person"]),
    }),
  );
});
//@ chunk-78qefq0z.js:7229-7376 placement
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
//@ chunk-78qefq0z.js:7376-12897 placement
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
  #a = Promise.resolve();
  #i;
  #d;
  constructor(clock = () => performance.now()) {
    this.#t = clock;
  }
  keepRecordsIn(store, wallNow = Date.now) {
    if (this.#n !== undefined) return;
    this.#n = {
      store,
      wallNow,
    };
    this.#a = this.#p(store, wallNow);
    registerCleanup(() => store.settledAll());
  }
  get restored() {
    return this.#a;
  }
  get version() {
    return this.#o;
  }
  starterFor(call) {
    return {
      reserve: () => {
        return;
      },
      listMove: (because) => this.#u(call.toolUseId, because),
      adopt: (task, requestedTimeoutMs, command, trigger) => {
        try {
          let taskId = this.#c(task, requestedTimeoutMs, command, call, trigger);
          this.#r.delete(call.toolUseId ?? "");
          logFeatureOk("mcp_serve_background_command");
          return taskId;
        } catch (error) {
          logFeatureBad("mcp_serve_background_command", "not_kept");
          task.kill();
          task.cleanup();
          throw error;
        }
      },
    };
  }
  taskIdOf(toolUseId) {
    return [...this.#e.values()].find(({ listed }) => listed.tool_use_id === toolUseId)?.listed.taskId;
  }
  msSinceNewestDropped() {
    return this.#i === undefined ? undefined : Math.round(this.#t() - this.#i);
  }
  list() {
    let now = this.#t();
    return {
      life: this.life,
      commands_version: this.#o,
      commands: Array.from(this.#e.values(), ({ listed, startedAt, ended, unwanted, stallTail }) => ({
        ...listed,
        ...(ended
          ? {
              ...ended.how,
              ended_ms_ago: Math.round(now - ended.at),
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
        ran_ms: Math.round((ended?.at ?? now) - startedAt),
      })),
    };
  }
  forget(toolUseIds) {
    let flattened = toolUseIds.flatMap((taskId) => this.#e.get(taskId) ?? []);
    flattened
      .filter(({ ended }) => ended)
      .forEach(({ listed }) => {
        this.#e.delete(listed.taskId);
        this.#n?.store.remove(listed.taskId);
      });
    flattened
      .filter(({ ended }) => !ended)
      .forEach((record) => {
        record.unwanted = true;
        this.#n?.store.remove(record.listed.taskId);
      });
  }
  stop(toolUseId) {
    return (
      this.#e.get(toolUseId)?.cut({
        state: "stopped",
        stopped_by: "session",
      }) ?? false
    );
  }
  moveRunning(toolUseId, because) {
    return this.#r.get(toolUseId)?.(because) ?? this.taskIdOf(toolUseId) !== undefined;
  }
  #u(toolUseId, shouldStop) {
    if (toolUseId === undefined) return () => {};
    this.#r.set(toolUseId, shouldStop);
    return () => {
      if (this.#r.get(toolUseId) === shouldStop) this.#r.delete(toolUseId);
    };
  }
  async changedSince(seenVersion, signal) {
    let { promise, resolve } = Promise.withResolvers();
    let wake = () => resolve();
    let unsubscribe = this.#s.subscribe(wake);
    signal.addEventListener("abort", wake, {
      once: true,
    });
    if (seenVersion !== this.#o || signal.aborted) wake();
    await promise;
    unsubscribe();
    signal.removeEventListener("abort", wake);
  }
  #c(task, requestedTimeoutMs, command, call, trigger) {
    let taskId = task.taskOutput.taskId;
    let outputPath = getTaskOutputPath(taskId);
    if (
      !task.background(taskId, {
        atExit: "kill",
      })
    )
      throw Error(
        "The command had already ended when it was to be moved to the background, and its output was not kept. Run it again without run_in_background.",
      );
    let backgroundTimeoutForDisplay = getBackgroundTimeoutForDisplay(requestedTimeoutMs);
    let record = {
      listed: {
        taskId,
        ...(call.toolUseId !== undefined && {
          tool_use_id: call.toolUseId,
        }),
        ...(call.agentId !== undefined && {
          agent_id: call.agentId,
        }),
        command: truncateToLength(command, MAX_COMMAND_CHARS),
        ...(call.description && {
          description: truncateToLength(call.description, MAX_COMMAND_CHARS),
        }),
        output_path: outputPath,
        limit_ms: backgroundTimeoutForDisplay,
      },
      startedAt: this.#t(),
      cut: (how) => {
        if (record.ended || task.status !== "backgrounded") return false;
        settle(how);
        return true;
      },
    };
    let settle = (how, result) => {
      if (record.ended) return;
      let classified = classifyBackgroundCommand(
        command,
        task.taskOutput,
        result,
        how.state !== "exited",
        undefined,
      );
      clearTimeout(deadlineTimer);
      stopWatchingStall();
      unregisterCleanup();
      record.ended = {
        how,
        at: this.#t(),
      };
      this.#e.delete(taskId);
      if (record.unwanted) this.#n?.store.remove(taskId);
      else {
        this.#e.set(taskId, record);
        this.#m(record);
      }
      this.#l().forEach(() => logFeatureSad("mcp_serve_background_command", "ending_dropped"));
      deferred.resolve();
      this.#o++;
      this.#s.emit();
      try {
        if (task.status === "backgrounded") task.kill();
        task.cleanup();
        appendTaskOutput(
          taskId,
          how.state === "exited"
            ? `
[exited with code ${how.exit_code}]
`
            : `
[killed]
`,
        );
        evictTaskOutput(taskId);
        logForDebugging(
          `mcp serve: background command ${taskId} ended: ${how.state}${how.state === "killed" && how.reason ? ` (${how.reason})` : ""}`,
        );
        let event = {
          elapsed_ms: Math.round(record.ended.at - record.startedAt),
          requested_timeout_ms: requestedTimeoutMs ?? 0,
          deadline_ms: backgroundTimeoutForDisplay,
          outcome: fromEnum(how.state !== "exited" ? "killed" : how.exit_code === 0 ? "completed" : "failed"),
          stop_cause:
            how.state === "time_limit"
              ? lit("deadline")
              : how.state === "killed"
                ? fromEnumOpt(how.reason)
                : undefined,
          stopped_by: fromEnumOpt(how.state === "stopped" ? how.stopped_by : undefined),
          subagent_owned: call.agentId !== undefined,
          unwanted: record.unwanted === true,
          trigger:
            trigger === "person"
              ? lit("user")
              : trigger === "message"
                ? lit("deliver_message")
                : call.movedAtTimeout
                  ? lit("timeout")
                  : lit("explicit"),
          ...buildCommandTimingFields(result?.shellUsage),
          tool_use_id: parentTaskId(call.toolUseId),
          bash_command_kinds: classified.commandClass?.bash_command_kinds,
          bash_programs: classified.commandClass?.bash_programs,
          bash_test_scope: classified.commandClass?.bash_test_scope,
        };
        thenIfPromise(classified.testOutcome, (bashTestOutcome) =>
          logEvent("tengu_background_shell_settled", {
            ...event,
            bash_test_outcome: bashTestOutcome,
          }),
        );
      } catch (error) {
        logError(toError(error));
      }
    };
    let deadlineTimer = setTimeout(record.cut, backgroundTimeoutForDisplay, {
      state: "time_limit",
    }).unref();
    let setStallTail = (stallTail) => {
      record.stallTail = stallTail;
      this.#o++;
      this.#s.emit();
    };
    let stopWatchingStall = watchTaskOutputForPrompt(
      taskId,
      (stallTail) => {
        setStallTail(stallTail);
        logFeatureOk("task_local_shell_stall_detected");
      },
      () => setStallTail(undefined),
    );
    let deferred = Promise.withResolvers();
    let unregisterCleanup = registerCleanup(async () => {
      record.cut({
        state: "killed",
        reason: "daemon_exit",
      });
      let store = this.#n;
      if (store !== undefined) {
        await deferred.promise;
        await store.store.settled(taskId);
      }
    });
    this.#e.set(taskId, record);
    this.#m(record);
    if (this.#n !== undefined)
      this.#d ??= setInterval(() => {
        let filtered = [...this.#e.values()].filter(({ ended, unwanted }) => !ended && !unwanted);
        if (filtered.length === 0) {
          clearInterval(this.#d);
          this.#d = undefined;
        }
        filtered.forEach((record) => this.#m(record));
      }, CALL_RECORD_TICK_MS).unref();
    task.result
      .then(async (result) => {
        await task.taskOutput.flush().catch((error) => logError(toError(error)));
        settle(toEndedHow(result), result);
      })
      .catch((error) => {
        logError(toError(error));
        settle({
          state: "killed",
        });
      });
    this.#o++;
    this.#s.emit();
    return taskId;
  }
  #m({ listed, startedAt, ended }) {
    if (this.#n === undefined) return;
    let { store, wallNow } = this.#n;
    let monotonicNow = this.#t();
    let wallNowMs = wallNow();
    let { taskId, output_path: outputPath, limit_ms: limitMs } = listed;
    store.write({
      listed: {
        taskId,
        output_path: outputPath,
        limit_ms: limitMs,
      },
      started_at: Math.round(wallNowMs - (monotonicNow - startedAt)),
      written_at: Math.round(wallNowMs),
      ...(ended && {
        ended: {
          how: ended.how,
          at: Math.round(wallNowMs - (monotonicNow - ended.at)),
        },
      }),
    });
  }
  #l() {
    let sliced = [...this.#e.values()].filter((record) => record.ended).slice(0, -MAX_FINISHED_RECORDS_KEPT);
    sliced.forEach((record) => {
      this.#e.delete(record.listed.taskId);
      this.#n?.store.remove(record.listed.taskId);
      this.#i = record.ended?.at;
    });
    return sliced;
  }
  async #p(store, wallNow) {
    try {
      let { commands, counted } = await store.readEarlier();
      let monotonicNow = this.#t();
      let wallNowMs = wallNow();
      let mapped = commands.map(({ listed, started_at: startedAt, ended }) => {
        let endedAt = monotonicNow - Math.max(0, wallNowMs - ended.at);
        return {
          listed,
          startedAt: Math.min(endedAt, monotonicNow - Math.max(0, wallNowMs - startedAt)),
          cut: () => false,
          ended: {
            how: ended.how,
            at: endedAt,
          },
        };
      });
      let existingRecords = [...this.#e.values()];
      this.#e.clear();
      [...mapped, ...existingRecords].forEach((record) => this.#e.set(record.listed.taskId, record));
      let dropped = this.#l();
      if (Object.values(counted).some((countedValue) => countedValue > 0))
        logEvent("tengu_mcp_serve_background_records_read", {
          ...counted,
          dropped_for_room: dropped.length,
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
//@ chunk-78qefq0z.js:12897-12923 placement
var backgroundCommands; // deferred: uses ReadCallsLog of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-78qefq0z.js:12897", () => {
  backgroundCommands = new HostScoped(() => new ReadCallsLog());
});
//@ chunk-78qefq0z.js:12923-13426 placement
function keepBackgroundCommandRecords(host, kind) {
  if (
    kind !== "tool-container" ||
    !isRemoteManagedEnvironment() ||
    env.CLAUDE_CODE_REMOTE_ENVIRONMENT_TYPE === "self_hosted" ||
    isBackgroundTasksDisabled()
  )
    return;
  let alreadyLogged = {
    said: false,
  };
  backgroundCommands.of(host).keepRecordsIn(
    new ContainerStartRecord({
      folder: () => join(sessionTempDirRealpath(), "background-commands"),
      failed: (error) => {
        logForDebugging(
          `mcp serve: could not save or delete a background command's record on disk, so after a restart that command may be missing, out of date, or listed again after it was acknowledged: ${errorMessage(error)}`,
          {
            level: "error",
          },
        );
        if (!alreadyLogged.said) {
          alreadyLogged.said = true;
          logFeatureSad("mcp_serve_background_command", "record_failed");
        }
      },
    }),
  );
}
//@ chunk-78qefq0z.js:13426-14688 placement
async function readCalls(input, signal, { session, callerGone }) {
  let { seen, life, hold_ms: holdMs, told, tool_use_ids: toolUseIds } = parseReadCallsInput(input ?? {});
  let [invalidId, ...otherInvalidIds] = (toolUseIds ?? []).filter(
    (toolUseId) => !toolUseIdSchema().safeParse(toolUseId).success,
  );
  if (invalidId !== undefined)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `ReadCalls: ${jsonStringify(invalidId)} is not a valid tool_use_id${otherInvalidIds.length > 0 ? ` (and ${otherInvalidIds.length} more)` : ""}. An id is 1 to 128 letters, digits or _ . : @ -, and not only dots.`,
      "ReadCalls: a tool_use_id is not valid",
    );
  let commandLog = backgroundCommands.of(session.host);
  await commandLog.restored;
  commandLog.forget(told ?? []);
  let hasCallFinished = () => toolUseIds?.some((toolUseId) => !isRunningRun(session, toolUseId)) ?? false;
  if (seen !== undefined && life === commandLog.life && holdMs !== undefined && !hasCallFinished()) {
    let abortController = new AbortController();
    let unsubscribe = onRunEnded(session, () => {
      if (hasCallFinished()) abortController.abort();
    });
    let combinedAbortSignal = createCombinedAbortSignal(signal, {
      signalB: callerGone,
      timeoutMs: holdMs,
      refTimer: true,
    });
    try {
      await commandLog.changedSince(
        seen,
        AbortSignal.any([combinedAbortSignal.signal, abortController.signal]),
      );
    } finally {
      combinedAbortSignal.cleanup();
      unsubscribe();
    }
  }
  let mapped = (toolUseIds ?? runningRunIds(session)).map((toolUseId) => {
    let taskId = commandLog.taskIdOf(toolUseId);
    return {
      tool_use_id: toolUseId,
      ...(taskId === undefined
        ? describeRunState(session, toolUseId)
        : {
            state: "background",
            taskId,
          }),
    };
  });
  if (toolUseIds !== undefined && toolUseIds.length > 0) {
    let countOfState = (state) => countWhere(mapped, (call) => call.state === state);
    logEvent("tengu_mcp_serve_calls_read_by_id", {
      background: countOfState("background"),
      running: countOfState("running"),
      finished: countOfState("finished"),
      unknown: countOfState("unknown"),
    });
  }
  let filtered = [commandLog.msSinceNewestDropped(), msSinceNewestDropped(session)].filter(
    (droppedMs) => droppedMs !== undefined,
  );
  let output = {
    ...commandLog.list(),
    calls: mapped,
    ...(filtered.length > 0 && {
      dropped_ended_ms_ago: Math.min(...filtered),
    }),
  };
  return {
    summary: `${output.commands.length} commands, ${output.calls.length} calls`,
    output,
  };
}
//@ chunk-78qefq0z.js:14688-14848 placement
async function moveRunningCommand(input, signal, { session }) {
  let { tool_use_id: toolUseId, because } = moveRunningCommandSchema().parse(input);
  let moved = backgroundCommands.of(session.host).moveRunning(toolUseId, because);
  return {
    summary: `moved: ${moved}`,
    output: {
      moved,
    },
  };
}
//@ chunk-78qefq0z.js:14848-14988 placement
async function stopBackgroundCommand(input, signal, { session }) {
  let { taskId } = stopBackgroundCommandSchema().parse(input);
  let stopped = backgroundCommands.of(session.host).stop(taskId);
  return {
    summary: `stopped: ${stopped}`,
    output: {
      stopped,
    },
  };
}
export {
  CALL_RECORD_EXT,
  MAX_CALL_RECORD_SCAN,
  MAX_CALL_RECORDS,
  MAX_CALL_RECORD_BATCH,
  MAX_CALL_RECORD_BYTES,
  callRecordSchema,
  CALL_RECORD_RETENTION_MS,
  keepBackgroundCommandRecords,
  isKnownRun,
  isCallRunBarred,
  backgroundCommands,
  READ_CALLS_CALL,
  readCalls,
  STOP_BACKGROUND_COMMAND_CALL,
  stopBackgroundCommand,
  MOVE_RUNNING_COMMAND_CALL,
  moveRunningCommand,
  keepsBackgroundCommandsCapability,
};
