/**
 * services/mcp/mcpTaskDrive.ts
 *
 * 2.1.316 新增。驱动一个 MCP 任务（com.anthropic/agent-task）：轮询 working/input_required/completed/failed 状态，处理输入请求，中止时发 tasks/cancel；能力丢失的 JSON-RPC 错误码按不可用处理。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-01rphnc1.js (13)
 * attribution: placement 13
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  looseObject,
  string,
  _enum,
  E,
  literal,
  M,
  record,
  unknown,
  discriminatedUnion,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { MCP_TASK_LABEL_MAX, LABEL_PATTERN } from "./mcpTaskCapability.js";
import { describeErrorBrief } from "./auth.js";
import { MCP_TASK_POLL_MS } from "./mcpTaskWorker.js";
import { sleep } from "../../utils/sleep.js";

//@ chunk-01rphnc1.js:429-1390 placement
/**
 * MCP 任务会话元数据的 schema。
 */
var MCP_NAME_HEADER = "Mcp-Name";
var MIN_TASK_POLL_MS = 250;
var MAX_TASK_POLL_MS = 30000;
var DEFAULT_TASK_POLL_MS = 2000;
var MAX_TASK_UPDATE_FAILURES = 5;
var MAX_INPUT_REQUEST_KEYS = 16;
var taskSchema = DoctorLazy(() =>
  looseObject({
    taskId: string().min(1).max(MCP_TASK_LABEL_MAX).regex(LABEL_PATTERN),
    status: _enum(["working", "input_required", "completed", "failed", "cancelled"]),
    statusMessage: string()
      .nullish()
      .transform((e) => e ?? undefined)
      .optional(),
    createdAt: string()
      .nullish()
      .transform((e) => e ?? undefined)
      .optional(),
    lastUpdatedAt: string()
      .nullish()
      .transform((e) => e ?? undefined)
      .optional(),
    ttlMs: E()
      .nullish()
      .transform((e) => e ?? undefined)
      .optional(),
    pollIntervalMs: E()
      .nullish()
      .transform((e) => e ?? undefined)
      .optional(),
  }),
);
var CreateTaskResultSchema = DoctorLazy(() =>
  taskSchema().extend({
    resultType: literal("task"),
  }),
);
var AGENT_TASK_META_KEY = "com.anthropic/agent-task";
var MAX_SESSION_MESSAGE_CHARS = 20000;
var MAX_TASK_MODEL_CHARS = 64;
var sessionMetaSchema = DoctorLazy(() =>
  looseObject({
    sessionId: string()
      .max(MCP_TASK_LABEL_MAX)
      .regex(LABEL_PATTERN)
      .nullish()
      .transform((e) => e ?? undefined)
      .optional(),
    modelImmediateResponse: string()
      .max(MAX_SESSION_MESSAGE_CHARS)
      .nullish()
      .transform((e) => e ?? undefined)
      .optional(),
    taskId: string()
      .max(MCP_TASK_LABEL_MAX)
      .regex(LABEL_PATTERN)
      .nullish()
      .transform((e) => e ?? undefined)
      .optional(),
    merged: M()
      .nullish()
      .transform((e) => e ?? undefined)
      .optional(),
    kind: string()
      .max(MAX_TASK_MODEL_CHARS)
      .regex(LABEL_PATTERN)
      .nullish()
      .transform((e) => e ?? undefined)
      .optional(),
  }),
);
//@ chunk-01rphnc1.js:1390-1659 placement
function sdkAgentTaskMeta(e) {
  let agentTaskMeta = parseAgentTaskMeta(e);
  if (agentTaskMeta === undefined) return;
  let a = {
    ...(agentTaskMeta.sessionId !== undefined && {
      sessionId: agentTaskMeta.sessionId,
    }),
    ...(agentTaskMeta.taskId !== undefined && {
      taskId: agentTaskMeta.taskId,
    }),
    ...(agentTaskMeta.kind !== undefined && {
      kind: agentTaskMeta.kind,
    }),
    ...(agentTaskMeta.merged !== undefined && {
      merged: agentTaskMeta.merged,
    }),
  };
  return Object.keys(a).length > 0
    ? {
        [AGENT_TASK_META_KEY]: a,
      }
    : undefined;
}
//@ chunk-01rphnc1.js:1659-1803 placement
function parseAgentTaskMeta(e) {
  if (typeof e !== "object" || e === null) return;
  let r = e[AGENT_TASK_META_KEY];
  if (r === undefined) return;
  let a = sessionMetaSchema().safeParse(r);
  return a.success ? a.data : undefined;
}
//@ chunk-01rphnc1.js:1803-2439 placement
/**
 * 任务状态回复的联合 schema。
 */
var taskStatusSchemas = DoctorLazy(() =>
  looseObject({
    method: string().min(1).max(MCP_TASK_LABEL_MAX).regex(LABEL_PATTERN),
    params: record(string(), unknown())
      .nullish()
      .transform((e) => e ?? undefined)
      .optional(),
  }),
);
var taskStatusReplySchema = DoctorLazy(() =>
  discriminatedUnion("status", [
    taskSchema().extend({
      status: literal("working"),
    }),
    taskSchema().extend({
      status: literal("input_required"),
      inputRequests: record(string().min(1).max(512), taskStatusSchemas())
        .nullish()
        .transform((e) => e ?? {}),
    }),
    taskSchema().extend({
      status: literal("completed"),
      result: record(string(), unknown())
        .nullish()
        .transform((e) => e ?? {}),
    }),
    taskSchema().extend({
      status: literal("failed"),
      error: looseObject({
        code: E()
          .nullish()
          .transform((e) => e ?? undefined)
          .optional(),
        message: string()
          .nullish()
          .transform((e) => e ?? undefined)
          .optional(),
        data: unknown().optional(),
      })
        .nullish()
        .transform((e) => e ?? {}),
    }),
    taskSchema().extend({
      status: literal("cancelled"),
    }),
  ]),
);
//@ chunk-01rphnc1.js:2439-2525 placement
class TaskInputUnservableError extends Error {
  constructor(message) {
    super(message);
    this.name = "TaskInputUnservableError";
  }
}
//@ chunk-01rphnc1.js:2525-2577 placement
function clampPollInterval(pollIntervalMs) {
  return Math.min(MAX_TASK_POLL_MS, Math.max(MIN_TASK_POLL_MS, pollIntervalMs ?? DEFAULT_TASK_POLL_MS));
}
//@ chunk-01rphnc1.js:2577-2959 placement
/**
 * 是否为可重试的传输错误
 */
function isTransientTransportError(error) {
  if (typeof error !== "object" || error === null) return false;
  if (Object.prototype.toString.call(error) === "[object DOMException]") return false;
  if (
    error instanceof Error &&
    (error.name === "AbortError" ||
      error.name === "TimeoutError" ||
      error.message.startsWith("SSE error: ") ||
      error.message.startsWith("Streamable HTTP error: "))
  )
    return false;
  return (
    "code" in error &&
    typeof error.code === "number" &&
    "message" in error &&
    typeof error.message === "string"
  );
}
//@ chunk-01rphnc1.js:2959-3082 placement
function isRetryableTaskPollError(error) {
  return (
    isTransientTransportError(error) ||
    (error instanceof Error &&
      (error.name === "UnauthorizedError" || ("status" in error && typeof error.status === "number")))
  );
}
//@ chunk-01rphnc1.js:3082-3165 placement
/**
 * 判断错误码是否属于服务端错误类。
 */
function isServerErrorCode(code) {
  if (isCapabilityLossCode(code)) return false;
  return code === -32603 || code === -32700 || (code >= -32099 && code <= -32000);
}
//@ chunk-01rphnc1.js:3165-3209 placement
/**
 * 判断错误码是否为能力缺失类（-32021、-32003）。
 */
function isCapabilityLossCode(e) {
  return e === -32021 || e === -32003;
}
//@ chunk-01rphnc1.js:3209-3249 placement
function isCapabilityLossJsonRpcCode(code) {
  return code === -32601 || isCapabilityLossCode(code);
}
//@ chunk-01rphnc1.js:3249-3289 placement
var TASK_DRIVE_QUIET_STOP = Symbol("TASK_DRIVE_QUIET_STOP");
//@ chunk-01rphnc1.js:3289-8000 placement
/**
 * 驱动一个 MCP 任务（com.anthropic/agent-task）：轮询 working/input_required/completed/failed 状态，处理输入请求，中止时发 tasks/cancel；能力丢失的 JSON-RPC 错误码按不可用处理。
 */
async function driveMcpTask({
  task,
  request,
  signal,
  onStatus,
  resolveInputRequest,
  log,
  errorText = describeErrorBrief,
  isSignInRefusal,
  answeredKeys,
  outstandingInputKeys,
  endsAtFirstFailedPoll,
  isAnswerTooLarge,
  holdsProcess,
}) {
  let { taskId } = task;
  let headers = {
    [MCP_NAME_HEADER]: taskId,
  };
  let v = answeredKeys ?? new Set();
  let C = new Set();
  let A = new Map();
  let h = outstandingInputKeys ?? {
    served: new Set(),
    capLogged: false,
  };
  let z = clampPollInterval(task.pollIntervalMs);
  let w;
  let m = 0;
  let k = 0;
  let u = () => {
    if (signal.reason === TASK_DRIVE_QUIET_STOP) return;
    request(
      "tasks/cancel",
      {
        taskId,
      },
      {
        headers,
        signal: AbortSignal.timeout(MCP_TASK_POLL_MS),
      },
    ).then(
      () => log?.(`task ${taskId}: cancel sent`),
      (error) => log?.(`task ${taskId}: cancel failed: ${errorText(error)}`),
    );
  };
  let O = true;
  for (;;) {
    if (O) O = false;
    else {
      let n = w ?? z;
      w = undefined;
      await sleep(n, signal, {
        unref: holdsProcess === false,
      });
    }
    if (signal.aborted) {
      u();
      return {
        status: "error",
        error: {
          kind: "cancelled",
          message: "Task cancelled",
        },
      };
    }
    let i;
    try {
      let n = await request(
        "tasks/get",
        {
          taskId,
        },
        {
          headers,
          signal,
        },
      );
      let d = taskStatusReplySchema().safeParse(n);
      if (!d.success) {
        u();
        return {
          status: "error",
          error: {
            kind: "malformed",
            message: `Malformed tasks/get response for task ${taskId}: ${d.error.message}`,
          },
        };
      }
      i = d.data;
      m = 0;
    } catch (error) {
      if (signal.aborted) {
        u();
        return {
          status: "error",
          error: {
            kind: "cancelled",
            message: "Task cancelled",
          },
        };
      }
      if (isTransientTransportError(error) && !isServerErrorCode(error.code))
        return {
          status: "error",
          error: {
            kind: "poll_failed",
            message: `tasks/get failed for task ${taskId}: ${error.message}`,
            code: error.code,
            data: error.data,
          },
        };
      let d = error instanceof Error && error.name === "HttpBodyOverflowError";
      if (d || isAnswerTooLarge?.(error) === true) {
        u();
        return {
          status: "error",
          error: {
            kind: "answer_too_large",
            message:
              "The answer to a status request for the task was too large, so it was not read. The tool may have run: check whether it did before running it again, and when you run it again, ask for less data.",
            ...(!d && {
              connectionClosed: true,
            }),
          },
        };
      }
      let R = await isSignInRefusal?.(error).catch((error) => {
        log?.(`task ${taskId}: could not tell whether the server asks for a sign-in: ${errorText(error)}`);
        return false;
      });
      if (signal.aborted) {
        u();
        return {
          status: "error",
          error: {
            kind: "cancelled",
            message: "Task cancelled",
          },
        };
      }
      if (R === true)
        return {
          status: "error",
          error: {
            kind: "poll_failed",
            message: `a poll of task ${taskId} was refused: ${errorText(error)}`,
            signInRefused: true,
          },
        };
      m += 1;
      let f = endsAtFirstFailedPoll?.() === true ? 1 : MAX_TASK_UPDATE_FAILURES;
      log?.(`task ${taskId}: poll failure ${m}/${f}: ${errorText(error)}`);
      if (m >= f)
        return {
          status: "error",
          error: {
            kind: "poll_failed",
            ...(isRetryableTaskPollError(error)
              ? {
                  message: `${m} polls of task ${taskId} failed in a row, the last with an error answer: ${errorText(error)}`,
                  answered: true,
                }
              : {
                  message: `Lost contact with task ${taskId} after ${m} failed polls: ${errorText(error)}`,
                }),
          },
        };
      continue;
    }
    onStatus?.(i);
    z = clampPollInterval(i.pollIntervalMs ?? z);
    if (i.status !== "input_required") k = 0;
    switch (i.status) {
      case "working":
        continue;
      case "completed":
        return {
          status: "completed",
          result: i.result,
        };
      case "failed":
        return {
          status: "error",
          error: {
            kind: "failed",
            message: i.error.message ?? i.statusMessage ?? "Task failed",
            code: i.error.code,
            data: i.error.data,
          },
        };
      case "cancelled":
        return {
          status: "error",
          error: {
            kind: "cancelled",
            message: i.statusMessage ?? "Task was cancelled by the server",
          },
        };
      case "input_required": {
        let filtered = Object.entries(i.inputRequests).filter(([key]) => !v.has(key));
        if (filtered.length === 0) continue;
        let filtered_2 = filtered.filter(([t]) => !C.has(t));
        if (filtered_2.length === 0) {
          u();
          return {
            status: "error",
            error: {
              kind: "unsupported_input",
              message: `Task ${taskId}: the server rejected the submitted answer to ${filtered.map(([t]) => t).join(", ")} and still requires input`,
            },
          };
        }
        let filtered_3 = filtered_2.filter(([t]) => {
          if (h.served.has(t)) return true;
          if (h.served.size >= MAX_INPUT_REQUEST_KEYS) {
            if (!h.capLogged) {
              log?.(
                `task ${taskId}: reached ${MAX_INPUT_REQUEST_KEYS} distinct input-request keys; ignoring new keys`,
              );
              h.capLogged = true;
            }
            return false;
          }
          h.served.add(t);
          return true;
        });
        if (filtered_3.length === 0) continue;
        let f = {};
        for (let [t, b] of filtered_3) {
          if (signal.aborted) break;
          let _;
          if (A.has(t)) _ = A.get(t);
          else {
            try {
              _ = await resolveInputRequest(t, b);
            } catch (error) {
              if (error instanceof TaskInputUnservableError) {
                u();
                return {
                  status: "error",
                  error: {
                    kind: "input_unservable",
                    message:
                      "the task asked the user a question that this session cannot show yet, so Claude Code asked the server to cancel it",
                  },
                };
              }
              throw error;
            }
            if (_ === undefined) {
              u();
              return {
                status: "error",
                error: {
                  kind: "unsupported_input",
                  message: `Task ${taskId} asked for ${b.method}, which this client cannot serve`,
                },
              };
            }
            A.set(t, _);
          }
          f[t] = _;
        }
        if (signal.aborted) {
          u();
          return {
            status: "error",
            error: {
              kind: "cancelled",
              message: "Task cancelled",
            },
          };
        }
        try {
          await request(
            "tasks/update",
            {
              taskId,
              inputResponses: f,
            },
            {
              headers,
              signal,
            },
          );
          k = 0;
          for (let key of Object.keys(f)) v.add(key);
          log?.(`task ${taskId}: answered ${Object.keys(f).join(", ")}`);
        } catch (error) {
          if (signal.aborted) {
            u();
            return {
              status: "error",
              error: {
                kind: "cancelled",
                message: "Task cancelled",
              },
            };
          }
          if (isTransientTransportError(error) && isCapabilityLossJsonRpcCode(error.code))
            return {
              status: "error",
              error: {
                kind: "poll_failed",
                message: `tasks/update failed for task ${taskId}: ${error.message}`,
                code: error.code,
                data: error.data,
              },
            };
          if (isTransientTransportError(error) && !isServerErrorCode(error.code)) {
            for (let key of Object.keys(f)) C.add(key);
            log?.(
              `task ${taskId}: tasks/update JSON-RPC error ${error.code} (${error instanceof Error ? error.message : String(error)}); re-polling for real state`,
            );
            w = MIN_TASK_POLL_MS;
            continue;
          }
          k += 1;
          log?.(`task ${taskId}: tasks/update failure ${k}/${MAX_TASK_UPDATE_FAILURES}: ${errorText(error)}`);
          if (k >= MAX_TASK_UPDATE_FAILURES)
            return {
              status: "error",
              error: {
                kind: "poll_failed",
                message: `Lost contact with task ${taskId} after ${k} failed tasks/update attempts: ${errorText(error)}`,
                phase: "update",
              },
            };
          w = MIN_TASK_POLL_MS;
          continue;
        }
        w = MIN_TASK_POLL_MS;
        continue;
      }
    }
  }
}
export {
  clampPollInterval,
  TASK_DRIVE_QUIET_STOP,
  MCP_NAME_HEADER,
  driveMcpTask,
  isCapabilityLossJsonRpcCode,
};
