/**
 * services/mcp/mcpTaskDrive.ts
 *
 * 2.1.316 新增。驱动一个 MCP 任务（com.anthropic/agent-task）：轮询 working/input_required/completed/failed 状态，处理输入请求，中止时发 tasks/cancel；能力丢失的 JSON-RPC 错误码按不可用处理。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-yyrn42td.js (13)
 * attribution: placement 13
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  looseObject,
  stringSchema,
  _enum,
  numberSchema,
  literal,
  booleanSchema,
  record,
  unknown,
  discriminatedUnion,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { MCP_TASK_LABEL_MAX, LABEL_PATTERN } from "./mcpTaskCapability.js";
import { describeErrorBrief } from "./auth.js";
import { MCP_TASK_POLL_MS } from "./mcpTaskWorker.js";
import { sleep } from "../../utils/sleep.js";
import { TASK_CANCEL_REQUESTED_CODE } from "./mcpCallConstants.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-yyrn42td.js:466-1427 placement
/**
 * MCP 任务会话元数据的 schema。
 */
var MCP_NAME_HEADER; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var MIN_TASK_POLL_MS;
var MAX_TASK_POLL_MS;
var DEFAULT_TASK_POLL_MS;
var MAX_TASK_UPDATE_FAILURES;
var MAX_INPUT_REQUEST_KEYS;
var taskSchema;
var CreateTaskResultSchema;
var AGENT_TASK_META_KEY;
var MAX_SESSION_MESSAGE_CHARS;
var MAX_TASK_MODEL_CHARS;
var sessionMetaSchema;
deferInit("chunk-yyrn42td.js:466", () => {
  MCP_NAME_HEADER = "Mcp-Name";
  MIN_TASK_POLL_MS = 250;
  MAX_TASK_POLL_MS = 30000;
  DEFAULT_TASK_POLL_MS = 2000;
  MAX_TASK_UPDATE_FAILURES = 5;
  MAX_INPUT_REQUEST_KEYS = 16;
  taskSchema = DoctorLazy(() =>
    looseObject({
      taskId: stringSchema().min(1).max(MCP_TASK_LABEL_MAX).regex(LABEL_PATTERN),
      status: _enum(["working", "input_required", "completed", "failed", "cancelled"]),
      statusMessage: stringSchema()
        .nullish()
        .transform((value) => value ?? undefined)
        .optional(),
      createdAt: stringSchema()
        .nullish()
        .transform((value) => value ?? undefined)
        .optional(),
      lastUpdatedAt: stringSchema()
        .nullish()
        .transform((value) => value ?? undefined)
        .optional(),
      ttlMs: numberSchema()
        .nullish()
        .transform((value) => value ?? undefined)
        .optional(),
      pollIntervalMs: numberSchema()
        .nullish()
        .transform((value) => value ?? undefined)
        .optional(),
    }),
  );
  CreateTaskResultSchema = DoctorLazy(() =>
    taskSchema().extend({
      resultType: literal("task"),
    }),
  );
  AGENT_TASK_META_KEY = "com.anthropic/agent-task";
  MAX_SESSION_MESSAGE_CHARS = 20000;
  MAX_TASK_MODEL_CHARS = 64;
  sessionMetaSchema = DoctorLazy(() =>
    looseObject({
      sessionId: stringSchema()
        .max(MCP_TASK_LABEL_MAX)
        .regex(LABEL_PATTERN)
        .nullish()
        .transform((value) => value ?? undefined)
        .optional(),
      modelImmediateResponse: stringSchema()
        .max(MAX_SESSION_MESSAGE_CHARS)
        .nullish()
        .transform((value) => value ?? undefined)
        .optional(),
      taskId: stringSchema()
        .max(MCP_TASK_LABEL_MAX)
        .regex(LABEL_PATTERN)
        .nullish()
        .transform((value) => value ?? undefined)
        .optional(),
      merged: booleanSchema()
        .nullish()
        .transform((value) => value ?? undefined)
        .optional(),
      kind: stringSchema()
        .max(MAX_TASK_MODEL_CHARS)
        .regex(LABEL_PATTERN)
        .nullish()
        .transform((value) => value ?? undefined)
        .optional(),
    }),
  );
});
//@ chunk-yyrn42td.js:1427-1696 placement
function sdkAgentTaskMeta(meta) {
  let agentTaskMeta = parseAgentTaskMeta(meta);
  if (agentTaskMeta === undefined) return;
  let fields = {
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
  return Object.keys(fields).length > 0
    ? {
        [AGENT_TASK_META_KEY]: fields,
      }
    : undefined;
}
//@ chunk-yyrn42td.js:1696-1840 placement
function parseAgentTaskMeta(meta) {
  if (typeof meta !== "object" || meta === null) return;
  let raw = meta[AGENT_TASK_META_KEY];
  if (raw === undefined) return;
  let parseResult = sessionMetaSchema().safeParse(raw);
  return parseResult.success ? parseResult.data : undefined;
}
//@ chunk-yyrn42td.js:1840-2476 placement
/**
 * 任务状态回复的联合 schema。
 */
var taskStatusSchemas; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var taskStatusReplySchema;
deferInit("chunk-yyrn42td.js:1840", () => {
  taskStatusSchemas = DoctorLazy(() =>
    looseObject({
      method: stringSchema().min(1).max(MCP_TASK_LABEL_MAX).regex(LABEL_PATTERN),
      params: record(stringSchema(), unknown())
        .nullish()
        .transform((value) => value ?? undefined)
        .optional(),
    }),
  );
  taskStatusReplySchema = DoctorLazy(() =>
    discriminatedUnion("status", [
      taskSchema().extend({
        status: literal("working"),
      }),
      taskSchema().extend({
        status: literal("input_required"),
        inputRequests: record(stringSchema().min(1).max(512), taskStatusSchemas())
          .nullish()
          .transform((value) => value ?? {}),
      }),
      taskSchema().extend({
        status: literal("completed"),
        result: record(stringSchema(), unknown())
          .nullish()
          .transform((value) => value ?? {}),
      }),
      taskSchema().extend({
        status: literal("failed"),
        error: looseObject({
          code: numberSchema()
            .nullish()
            .transform((value) => value ?? undefined)
            .optional(),
          message: stringSchema()
            .nullish()
            .transform((value) => value ?? undefined)
            .optional(),
          data: unknown().optional(),
        })
          .nullish()
          .transform((value) => value ?? {}),
      }),
      taskSchema().extend({
        status: literal("cancelled"),
      }),
    ]),
  );
});
//@ chunk-yyrn42td.js:2476-2562 placement
class TaskInputUnservableError extends Error {
  constructor(message) {
    super(message);
    this.name = "TaskInputUnservableError";
  }
}
//@ chunk-yyrn42td.js:2562-2614 placement
function clampPollInterval(pollIntervalMs) {
  return Math.min(MAX_TASK_POLL_MS, Math.max(MIN_TASK_POLL_MS, pollIntervalMs ?? DEFAULT_TASK_POLL_MS));
}
//@ chunk-yyrn42td.js:2614-2996 placement
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
//@ chunk-yyrn42td.js:2996-3119 placement
function isRetryableTaskPollError(error) {
  return (
    isTransientTransportError(error) ||
    (error instanceof Error &&
      (error.name === "UnauthorizedError" || ("status" in error && typeof error.status === "number")))
  );
}
//@ chunk-yyrn42td.js:3119-3202 placement
/**
 * 判断错误码是否属于服务端错误类。
 */
function isServerErrorCode(code) {
  if (isCapabilityLossCode(code)) return false;
  return code === -32603 || code === -32700 || (code >= -32099 && code <= -32000);
}
//@ chunk-yyrn42td.js:3202-3246 placement
/**
 * 判断错误码是否为能力缺失类（-32021、-32003）。
 */
function isCapabilityLossCode(code) {
  return code === -32021 || code === -32003;
}
//@ chunk-yyrn42td.js:3246-3286 placement
function isCapabilityLossJsonRpcCode(code) {
  return code === -32601 || isCapabilityLossCode(code);
}
//@ chunk-yyrn42td.js:3286-3326 placement
var TASK_DRIVE_QUIET_STOP; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-yyrn42td.js:3286", () => {
  TASK_DRIVE_QUIET_STOP = Symbol("TASK_DRIVE_QUIET_STOP");
});
//@ chunk-yyrn42td.js:3326-8231 placement
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
  let answered = answeredKeys ?? new Set();
  let rejectedKeys = new Set();
  let resolvedByKey = new Map();
  let keyBudget = outstandingInputKeys ?? {
    served: new Set(),
    capLogged: false,
  };
  let pollIntervalMs = clampPollInterval(task.pollIntervalMs);
  let nextDelayOverride;
  let pollFailures = 0;
  let updateFailures = 0;
  let cancelTask = () => {
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
  let firstIteration = true;
  for (;;) {
    if (firstIteration) firstIteration = false;
    else {
      let delayMs = nextDelayOverride ?? pollIntervalMs;
      nextDelayOverride = undefined;
      await sleep(delayMs, signal, {
        unref: holdsProcess === false,
      });
    }
    if (signal.aborted) {
      cancelTask();
      return {
        status: "error",
        error: {
          kind: "cancelled",
          message: "Task cancelled",
        },
      };
    }
    let status;
    try {
      let reply = await request(
        "tasks/get",
        {
          taskId,
        },
        {
          headers,
          signal,
        },
      );
      let parseResult = taskStatusReplySchema().safeParse(reply);
      if (!parseResult.success) {
        cancelTask();
        return {
          status: "error",
          error: {
            kind: "malformed",
            message: `Malformed tasks/get response for task ${taskId}: ${parseResult.error.message}`,
          },
        };
      }
      status = parseResult.data;
      pollFailures = 0;
    } catch (error) {
      if (signal.aborted) {
        cancelTask();
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
      let isOverflow = error instanceof Error && error.name === "HttpBodyOverflowError";
      if (isOverflow || isAnswerTooLarge?.(error) === true) {
        cancelTask();
        return {
          status: "error",
          error: {
            kind: "answer_too_large",
            message:
              "The answer to a status request for the task was too large, so it was not read. The tool may have run: check whether it did before running it again, and when you run it again, ask for less data.",
            ...(!isOverflow && {
              connectionClosed: true,
            }),
          },
        };
      }
      let signInRefused = await isSignInRefusal?.(error).catch((error) => {
        log?.(`task ${taskId}: could not tell whether the server asks for a sign-in: ${errorText(error)}`);
        return false;
      });
      if (signal.aborted) {
        cancelTask();
        return {
          status: "error",
          error: {
            kind: "cancelled",
            message: "Task cancelled",
          },
        };
      }
      if (signInRefused === true)
        return {
          status: "error",
          error: {
            kind: "poll_failed",
            message: `a poll of task ${taskId} was refused: ${errorText(error)}`,
            signInRefused: true,
          },
        };
      pollFailures += 1;
      let failureLimit = endsAtFirstFailedPoll?.() === true ? 1 : MAX_TASK_UPDATE_FAILURES;
      log?.(`task ${taskId}: poll failure ${pollFailures}/${failureLimit}: ${errorText(error)}`);
      if (pollFailures >= failureLimit) {
        if (isTransientTransportError(error) && error.code === TASK_CANCEL_REQUESTED_CODE) {
          cancelTask();
          return {
            status: "error",
            error: {
              kind: "poll_failed",
              message: `tasks/get failed for task ${taskId}: ${error.message} Claude Code asked the server to cancel the task.`,
              code: error.code,
            },
          };
        }
        return {
          status: "error",
          error: {
            kind: "poll_failed",
            ...(isRetryableTaskPollError(error)
              ? {
                  message: `${pollFailures} polls of task ${taskId} failed in a row, the last with an error answer: ${errorText(error)}`,
                  answered: true,
                }
              : {
                  message: `Lost contact with task ${taskId} after ${pollFailures} failed polls: ${errorText(error)}`,
                }),
          },
        };
      }
      continue;
    }
    onStatus?.(status);
    pollIntervalMs = clampPollInterval(status.pollIntervalMs ?? pollIntervalMs);
    if (status.status !== "input_required") updateFailures = 0;
    switch (status.status) {
      case "working":
        continue;
      case "completed":
        return {
          status: "completed",
          result: status.result,
        };
      case "failed":
        return {
          status: "error",
          error: {
            kind: "failed",
            message: status.error.message ?? status.statusMessage ?? "Task failed",
            code: status.error.code,
            data: status.error.data,
          },
        };
      case "cancelled":
        return {
          status: "error",
          error: {
            kind: "cancelled",
            message: status.statusMessage ?? "Task was cancelled by the server",
          },
        };
      case "input_required": {
        let filtered = Object.entries(status.inputRequests).filter(([key]) => !answered.has(key));
        if (filtered.length === 0) continue;
        let filtered_2 = filtered.filter(([key]) => !rejectedKeys.has(key));
        if (filtered_2.length === 0) {
          cancelTask();
          return {
            status: "error",
            error: {
              kind: "unsupported_input",
              message: `Task ${taskId}: the server rejected the submitted answer to ${filtered.map(([key]) => key).join(", ")} and still requires input`,
            },
          };
        }
        let filtered_3 = filtered_2.filter(([key]) => {
          if (keyBudget.served.has(key)) return true;
          if (keyBudget.served.size >= MAX_INPUT_REQUEST_KEYS) {
            if (!keyBudget.capLogged) {
              log?.(
                `task ${taskId}: reached ${MAX_INPUT_REQUEST_KEYS} distinct input-request keys; ignoring new keys`,
              );
              keyBudget.capLogged = true;
            }
            return false;
          }
          keyBudget.served.add(key);
          return true;
        });
        if (filtered_3.length === 0) continue;
        let inputResponses = {};
        for (let [key, requestSpec] of filtered_3) {
          if (signal.aborted) break;
          let response;
          if (resolvedByKey.has(key)) response = resolvedByKey.get(key);
          else {
            try {
              response = await resolveInputRequest(key, requestSpec);
            } catch (error) {
              if (error instanceof TaskInputUnservableError) {
                cancelTask();
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
            if (response === undefined) {
              cancelTask();
              return {
                status: "error",
                error: {
                  kind: "unsupported_input",
                  message: `Task ${taskId} asked for ${requestSpec.method}, which this client cannot serve`,
                },
              };
            }
            resolvedByKey.set(key, response);
          }
          inputResponses[key] = response;
        }
        if (signal.aborted) {
          cancelTask();
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
              inputResponses,
            },
            {
              headers,
              signal,
            },
          );
          updateFailures = 0;
          for (let key of Object.keys(inputResponses)) answered.add(key);
          log?.(`task ${taskId}: answered ${Object.keys(inputResponses).join(", ")}`);
        } catch (error) {
          if (signal.aborted) {
            cancelTask();
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
            for (let key of Object.keys(inputResponses)) rejectedKeys.add(key);
            log?.(
              `task ${taskId}: tasks/update JSON-RPC error ${error.code} (${error instanceof Error ? error.message : String(error)}); re-polling for real state`,
            );
            nextDelayOverride = MIN_TASK_POLL_MS;
            continue;
          }
          updateFailures += 1;
          log?.(
            `task ${taskId}: tasks/update failure ${updateFailures}/${MAX_TASK_UPDATE_FAILURES}: ${errorText(error)}`,
          );
          if (updateFailures >= MAX_TASK_UPDATE_FAILURES)
            return {
              status: "error",
              error: {
                kind: "poll_failed",
                message: `Lost contact with task ${taskId} after ${updateFailures} failed tasks/update attempts: ${errorText(error)}`,
                phase: "update",
              },
            };
          nextDelayOverride = MIN_TASK_POLL_MS;
          continue;
        }
        nextDelayOverride = MIN_TASK_POLL_MS;
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
  AGENT_TASK_META_KEY,
  CreateTaskResultSchema,
  TaskInputUnservableError,
  parseAgentTaskMeta,
  sdkAgentTaskMeta,
};
